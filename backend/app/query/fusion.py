import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.config import settings
from app.neo4j_client import get_neo4j_driver
from app.embedding_model import encode_text
from app.faiss_manager import search_patient_index
from app.query.temporal import extract_temporal_filter
from app.query.schemas import DocumentEvidence, GraphEvidence

logger = logging.getLogger(__name__)

MEDICATION_KEYWORDS = {"medication", "medications", "drug", "drugs", "prescribed", "prescription", "pharmacy", "medicine", "medicines", "pill", "pills", "dose", "dosage"}
CONDITION_KEYWORDS = {"condition", "conditions", "diagnosis", "diagnoses", "disease", "diseases", "illness", "disorder", "syndrome"}
TREATMENT_KEYWORDS = {"treatment", "treatments", "procedure", "procedures", "surgery", "operation", "therapy", "intervention", "pci", "stent", "angioplasty"}
ADMISSION_KEYWORDS = {"admission", "admitted", "hospital", "stay", "discharge", "discharged", "readmission", "length of stay"}
LAB_KEYWORDS = {"lab", "labs", "laboratory", "test", "tests", "investigation", "investigations", "troponin", "blood sugar", "creatinine", "ecg", "echo", "hba1c", "cholesterol", "platelets", "wbc", "cbc", "vitals", "bp"}
PROCEDURE_KEYWORDS = {"procedure", "procedures", "surgery", "operation", "intervention", "pci", "stent", "angioplasty", "biopsy"}

def _contains_kw(text: str, keywords: set) -> bool:
    if not text:
        return False
    t_lower = text.lower()
    for kw in keywords:
        if re.search(r"\b" + re.escape(kw) + r"\b", t_lower):
            return True
    return False

def retrieve_graph_evidence(patient_id: str, query: str, temporal_clause: Optional[str]) -> List[GraphEvidence]:
    """Retrieves structured graph facts for the patient with enhanced temporal filtering."""
    driver = get_neo4j_driver()
    evidence: List[GraphEvidence] = []

    cypher = """
    MATCH (p:Patient {patient_id: $patient_id})
    OPTIONAL MATCH (p)-[r1:HAS_CONDITION]->(c:Condition)
    OPTIONAL MATCH (p)-[r2:RECEIVED_TREATMENT]->(t:Treatment)
    OPTIONAL MATCH (p)-[:HAD_ADMISSION]->(ae:AdmissionEvent)
    OPTIONAL MATCH (p)-[:HAD_ENCOUNTER]->(e:Encounter)
    OPTIONAL MATCH (p)-[r3:HAD_OBSERVATION]->(o:Observation)
    RETURN p, collect(DISTINCT {c: c, r: r1}) AS conditions,
              collect(DISTINCT {t: t, r: r2}) AS treatments,
              collect(DISTINCT ae) AS admissions,
              collect(DISTINCT e) AS encounters,
              collect(DISTINCT {o: o, r: r3}) AS observations
    """

    try:
        with driver.session() as session:
            result = session.run(cypher, {"patient_id": patient_id})
            record = result.single()
            if not record or not record["p"]:
                return []

            # Conditions
            for item in record["conditions"]:
                c = item.get("c")
                r = item.get("r")
                if c and r:
                    v_to = r.get("valid_to")
                    v_from = r.get("valid_from")
                    status = "active" if v_to is None else "resolved"
                    evidence.append(GraphEvidence(
                        node_type="Condition",
                        name=c.get("name", "Unknown"),
                        relationship="HAS_CONDITION",
                        details={"normalized_name": c.get("normalized_name"), "source": c.get("source", "EHR")},
                        valid_from=str(v_from) if v_from else None,
                        valid_to=str(v_to) if v_to else None,
                        temporal_status=status,
                        confidence=float(r.get("confidence", 1.0)),
                        score=1.0
                    ))

            # Treatments
            for item in record["treatments"]:
                t = item.get("t")
                r = item.get("r")
                if t and r:
                    v_to = r.get("valid_to")
                    v_from = r.get("valid_from")
                    status = "active" if v_to is None else "completed"
                    evidence.append(GraphEvidence(
                        node_type="Treatment",
                        name=t.get("name", "Unknown"),
                        relationship="RECEIVED_TREATMENT",
                        details={
                            "normalized_name": t.get("normalized_name"),
                            "treatment_type": t.get("treatment_type", "treatment"),
                            "dosage": t.get("dosage") or r.get("dosage"),
                            "frequency": t.get("frequency") or r.get("frequency")
                        },
                        valid_from=str(v_from) if v_from else None,
                        valid_to=str(v_to) if v_to else None,
                        temporal_status=status,
                        confidence=float(r.get("confidence", 1.0)),
                        score=1.0
                    ))

            # Encounters
            for enc in record["encounters"]:
                if enc:
                    evidence.append(GraphEvidence(
                        node_type="Encounter",
                        name=f"Clinical Visit ({enc.get('visit_date')})",
                        relationship="HAD_ENCOUNTER",
                        details={
                            "encounter_id": enc.get("encounter_id"),
                            "visit_date": str(enc.get("visit_date")),
                            "condition": enc.get("condition"),
                            "diagnosis": enc.get("diagnosis"),
                            "treatment": enc.get("treatment"),
                            "medication": enc.get("medication")
                        },
                        valid_from=str(enc.get("visit_date")),
                        valid_to=None,
                        temporal_status="encounter",
                        confidence=1.0,
                        score=1.0
                    ))

            # Admissions
            for ae in record["admissions"]:
                if ae:
                    evidence.append(GraphEvidence(
                        node_type="AdmissionEvent",
                        name=f"Admission ({ae.get('admission_date')})",
                        relationship="HAD_ADMISSION",
                        details={
                            "admission_date": str(ae.get("admission_date")),
                            "discharge_date": str(ae.get("discharge_date")),
                            "length_of_stay": ae.get("length_of_stay"),
                            "outcome": ae.get("outcome"),
                            "readmission": ae.get("readmission"),
                            "total_cost_inr": ae.get("total_cost_inr")
                        },
                        valid_from=str(ae.get("admission_date")),
                        valid_to=str(ae.get("discharge_date")),
                        temporal_status="historical",
                        confidence=1.0,
                        score=1.0
                    ))

            # Observations (Lab Results, Vitals, Investigations)
            if "observations" in record:
                for item in record["observations"]:
                    obs = item.get("o")
                    r = item.get("r")
                    if obs:
                        obs_name = obs.get("name", "Lab Test")
                        obs_val = obs.get("value", "")
                        obs_unit = obs.get("unit", "")
                        obs_date = str(obs.get("test_date") or (r.get("date") if r else "") or "")
                        evidence.append(GraphEvidence(
                            node_type="Observation",
                            name=f"{obs_name}: {obs_val} {obs_unit}".strip(),
                            relationship="HAD_OBSERVATION",
                            details={
                                "test_name": obs_name,
                                "value": obs_val,
                                "unit": obs_unit,
                                "test_date": obs_date,
                                "source": obs.get("source", "EHR")
                            },
                            valid_from=obs_date or None,
                            valid_to=None,
                            temporal_status="recorded",
                            confidence=1.0,
                            score=1.0
                        ))
    except Exception as e:
        logger.error(f"Error querying graph evidence: {e}")

    # Apply Temporal Filtering logic
    if not temporal_clause:
        return evidence

    if temporal_clause == "LATEST":
        dated_evidence = [e for e in evidence if e.valid_from]
        if dated_evidence:
            dated_evidence.sort(key=lambda x: x.valid_from or "", reverse=True)
            latest_date = dated_evidence[0].valid_from
            return [e for e in evidence if e.valid_from == latest_date or e.temporal_status == "active"]
        return evidence

    elif temporal_clause.startswith("AS_OF:"):
        as_of_date = temporal_clause.split(":")[1]
        return [
            e for e in evidence
            if not e.valid_from or e.valid_from <= as_of_date
        ]

    elif temporal_clause.startswith("BEFORE:"):
        before_date = temporal_clause.split(":")[1]
        return [
            e for e in evidence
            if e.valid_from and e.valid_from < before_date
        ]

    elif temporal_clause.startswith("AFTER:"):
        after_date = temporal_clause.split(":")[1]
        return [
            e for e in evidence
            if e.valid_from and e.valid_from > after_date
        ]

    elif temporal_clause.startswith("YEAR:"):
        year = temporal_clause.split(":")[1]
        return [
            e for e in evidence
            if e.valid_from and e.valid_from.startswith(year)
        ]

    elif temporal_clause.startswith("YEAR_MONTH:"):
        ym = temporal_clause.split(":")[1]
        return [
            e for e in evidence
            if e.valid_from and e.valid_from.startswith(ym)
        ]

    elif temporal_clause.startswith("ON_DATE:"):
        target_date = temporal_clause.split(":")[1]
        return [
            e for e in evidence
            if (e.valid_from and e.valid_from == target_date) or
               (e.valid_from and e.valid_to and e.valid_from <= target_date <= e.valid_to)
        ]

    elif temporal_clause == "PREVIOUS":
        dated_evidence = [e for e in evidence if e.valid_from]
        if dated_evidence:
            dated_evidence.sort(key=lambda x: x.valid_from or "", reverse=True)
            latest_date = dated_evidence[0].valid_from
            return [e for e in evidence if e.valid_from and e.valid_from < latest_date]
        return evidence

    return evidence

def retrieve_document_evidence(patient_id: str, query: str, top_k: int = 3) -> List[DocumentEvidence]:
    """
    Retrieves document chunks from patient's FAISS namespace.
    For multi-part/complex queries, decomposes into sub-questions and aggregates results.
    """
    # Decompose compound queries if multiple distinct questions/clauses exist
    sub_queries = [query]
    parts = re.split(r"[?\n;]|\band\s+what\b|\balso\b", query, flags=re.IGNORECASE)
    cleaned_parts = [p.strip() for p in parts if len(p.strip()) > 8]
    if len(cleaned_parts) > 1:
        sub_queries = cleaned_parts

    chunk_dict: Dict[Tuple[str, int], DocumentEvidence] = {}

    for sq in sub_queries:
        query_emb = encode_text(sq)
        raw_chunks = search_patient_index(patient_id, query_emb, top_k=top_k)
        for c in raw_chunks:
            key = (c.get("source_filename", "unknown"), c.get("chunk_index", 0))
            score = float(c.get("score", 0.0))
            if key not in chunk_dict or score > chunk_dict[key].score:
                chunk_dict[key] = DocumentEvidence(
                    chunk_text=c.get("text", ""),
                    source_filename=key[0],
                    chunk_index=key[1],
                    score=score
                )

    # Sort descending by relevance score
    all_chunks = sorted(chunk_dict.values(), key=lambda d: d.score, reverse=True)
    limit = max(top_k, min(len(sub_queries) * 2, 6))
    return all_chunks[:limit]

def score_and_filter_domain_relevance(
    evidence: List[GraphEvidence],
    query: str
) -> Tuple[List[GraphEvidence], bool]:
    """
    Scores graph evidence items based on query domain intent.
    If specific domain keywords are present in the query (e.g. medications),
    ranks/filters evidence so domain-relevant items are prioritized and unrelated ones are filtered out.
    Supports complex multi-domain queries.
    Returns (scored_and_filtered_evidence, has_domain_filter).
    """
    if not evidence:
        return [], False

    q_lower = query.lower()
    
    is_med_query = _contains_kw(q_lower, MEDICATION_KEYWORDS)
    is_cond_query = _contains_kw(q_lower, CONDITION_KEYWORDS)
    is_treat_query = _contains_kw(q_lower, TREATMENT_KEYWORDS)
    is_adm_query = _contains_kw(q_lower, ADMISSION_KEYWORDS)
    is_lab_query = _contains_kw(q_lower, LAB_KEYWORDS)
    is_proc_query = _contains_kw(q_lower, PROCEDURE_KEYWORDS)

    has_specific_domain = is_med_query or is_cond_query or is_treat_query or is_adm_query or is_lab_query or is_proc_query

    if not has_specific_domain:
        for item in evidence:
            item.score = 1.0
        return evidence, False

    domain_matched: List[GraphEvidence] = []
    
    for item in evidence:
        is_match = False
        
        # Check medication query match
        if is_med_query:
            if item.node_type == "Treatment" and item.details.get("treatment_type") in ("medication", "drug", "treatment"):
                is_match = True
            elif item.node_type == "Encounter" and item.details.get("medication"):
                is_match = True
            elif _contains_kw(item.name, MEDICATION_KEYWORDS) or _contains_kw(str(item.details), MEDICATION_KEYWORDS):
                is_match = True

        # Check condition query match
        if is_cond_query:
            if item.node_type == "Condition":
                is_match = True
            elif item.node_type == "Encounter" and (item.details.get("condition") or item.details.get("diagnosis")):
                is_match = True
            elif _contains_kw(item.name, CONDITION_KEYWORDS) or _contains_kw(str(item.details), CONDITION_KEYWORDS):
                is_match = True

        # Check treatment/procedure query match
        if is_treat_query or is_proc_query:
            if item.node_type == "Treatment":
                is_match = True
            elif item.node_type == "Encounter" and item.details.get("treatment"):
                is_match = True
            elif _contains_kw(item.name, TREATMENT_KEYWORDS) or _contains_kw(str(item.details), TREATMENT_KEYWORDS):
                is_match = True

        # Check admission query match
        if is_adm_query:
            if item.node_type == "AdmissionEvent":
                is_match = True
            elif _contains_kw(item.name, ADMISSION_KEYWORDS) or _contains_kw(str(item.details), ADMISSION_KEYWORDS):
                is_match = True

        # Check lab/observation query match
        if is_lab_query:
            if item.node_type == "Observation":
                is_match = True
            elif _contains_kw(item.name, LAB_KEYWORDS) or _contains_kw(str(item.details), LAB_KEYWORDS):
                is_match = True

        if is_match:
            item.score = 1.0
            domain_matched.append(item)
        else:
            item.score = 0.2

    if domain_matched:
        return domain_matched, True
    else:
        return evidence, True

def fuse_and_gate_evidence(
    patient_id: str,
    query: str
) -> Tuple[List[GraphEvidence], List[DocumentEvidence], float, str, Optional[str]]:
    """
    Executes hybrid retrieval, domain relevance scoring, score fusion, and deterministic sufficiency gating.
    Returns (graph_evidence, doc_evidence, fused_score, routing_decision, temporal_filter_desc).
    """
    # 1. Temporal filter extraction
    temporal_clause, filter_desc = extract_temporal_filter(query)

    # 2. Retrieve from Graph and Vector
    raw_graph_evidence = retrieve_graph_evidence(patient_id, query, temporal_clause)
    doc_evidence = retrieve_document_evidence(patient_id, query, top_k=3)

    # 3. Domain relevance scoring and filtering for Graph Evidence
    graph_evidence, has_domain_filter = score_and_filter_domain_relevance(raw_graph_evidence, query)

    # 4. Calculate Graph Score
    graph_score = 0.0
    if graph_evidence:
        if has_domain_filter:
            matched_items = [g for g in graph_evidence if g.score >= 0.7]
            graph_score = 1.0 if matched_items else 0.0
        else:
            graph_score = 1.0

    # 5. Calculate Document Score
    doc_score = max([d.score for d in doc_evidence]) if doc_evidence else 0.0

    # 6. Score Fusion: alpha * graph + (1 - alpha) * doc
    alpha = settings.GRAPH_WEIGHT  # Default 0.6
    fused_score = (alpha * graph_score) + ((1.0 - alpha) * doc_score)

    # 7. Deterministic Sufficiency Gate
    if fused_score < settings.EVIDENCE_MIN_SCORE:
        routing_decision = "insufficient_evidence"
    elif graph_score > 0 and doc_score > 0:
        routing_decision = "hybrid"
    elif graph_score > 0:
        routing_decision = "graph_only"
    else:
        routing_decision = "vector_only"

    logger.info(
        f"Query Fusion for Patient {patient_id}: GraphScore={graph_score:.2f}, "
        f"DocScore={doc_score:.2f}, Fused={fused_score:.2f} -> Decision={routing_decision}"
    )

    return graph_evidence, doc_evidence, round(fused_score, 3), routing_decision, filter_desc
