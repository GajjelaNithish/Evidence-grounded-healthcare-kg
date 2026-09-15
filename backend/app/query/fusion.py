import logging
from typing import List, Dict, Any, Tuple, Optional
from app.config import settings
from app.neo4j_client import get_neo4j_driver
from app.embedding_model import encode_text
from app.faiss_manager import search_patient_index
from app.query.temporal import extract_temporal_filter
from app.query.schemas import DocumentEvidence, GraphEvidence

logger = logging.getLogger(__name__)

def retrieve_graph_evidence(patient_id: str, query: str, temporal_clause: Optional[str]) -> List[GraphEvidence]:
    """Retrieves structured graph facts for the patient with temporal filtering."""
    driver = get_neo4j_driver()
    evidence: List[GraphEvidence] = []

    # Cypher query with optional temporal filter
    where_extra = temporal_clause if temporal_clause else ""

    cypher = f"""
    MATCH (p:Patient {{patient_id: $patient_id}})
    OPTIONAL MATCH (p)-[r1:HAS_CONDITION]->(c:Condition)
    WHERE 1=1 {where_extra.replace('r.', 'r1.').replace('ae.', 'ae_dummy.') if 'ae.' not in where_extra else ''}
    OPTIONAL MATCH (p)-[r2:RECEIVED_TREATMENT]->(t:Treatment)
    WHERE 1=1 {where_extra.replace('r.', 'r2.').replace('ae.', 'ae_dummy.') if 'ae.' not in where_extra else ''}
    OPTIONAL MATCH (p)-[:HAD_ADMISSION]->(ae:AdmissionEvent)
    RETURN p, collect(DISTINCT {{c: c, r: r1}}) AS conditions,
              collect(DISTINCT {{t: t, r: r2}}) AS treatments,
              collect(DISTINCT ae) AS admissions
    """

    try:
        with driver.session() as session:
            result = session.run(cypher, {"patient_id": patient_id})
            record = result.single()
            if not record:
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
                        details={"normalized_name": c.get("normalized_name"), "source": c.get("source")},
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
                            "treatment_type": t.get("treatment_type", "treatment")
                        },
                        valid_from=str(v_from) if v_from else None,
                        valid_to=str(v_to) if v_to else None,
                        temporal_status=status,
                        confidence=float(r.get("confidence", 1.0)),
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
                            "total_cost_inr": ae.get("total_cost_inr"),
                            "satisfaction_score": ae.get("satisfaction_score")
                        },
                        valid_from=str(ae.get("admission_date")),
                        valid_to=str(ae.get("discharge_date")),
                        temporal_status="historical",
                        confidence=1.0,
                        score=1.0
                    ))
    except Exception as e:
        logger.error(f"Error querying graph evidence: {e}")

    return evidence

def retrieve_document_evidence(patient_id: str, query: str, top_k: int = 3) -> List[DocumentEvidence]:
    """Retrieves document chunks from patient's FAISS namespace."""
    query_emb = encode_text(query)
    raw_chunks = search_patient_index(patient_id, query_emb, top_k=top_k)

    doc_evidence = []
    for c in raw_chunks:
        doc_evidence.append(DocumentEvidence(
            chunk_text=c.get("text", ""),
            source_filename=c.get("source_filename", "unknown"),
            chunk_index=c.get("chunk_index", 0),
            score=float(c.get("score", 0.0))
        ))

    return doc_evidence

def fuse_and_gate_evidence(
    patient_id: str,
    query: str
) -> Tuple[List[GraphEvidence], List[DocumentEvidence], float, str, Optional[str]]:
    """
    Executes hybrid retrieval, score fusion, and deterministic sufficiency gating.
    Returns (graph_evidence, doc_evidence, fused_score, routing_decision, temporal_filter_desc).
    """
    # 1. Temporal filter extraction
    temporal_clause, filter_desc = extract_temporal_filter(query)

    # 2. Retrieve from Graph and Vector
    graph_evidence = retrieve_graph_evidence(patient_id, query, temporal_clause)
    doc_evidence = retrieve_document_evidence(patient_id, query, top_k=3)

    # 3. Calculate Scores
    graph_score = 0.0
    if graph_evidence:
        # Check if query keywords overlap with retrieved graph facts
        q_lower = query.lower()
        matched = any(
            g.name.lower() in q_lower or (g.details.get("normalized_name") and g.details["normalized_name"] in q_lower)
            for g in graph_evidence
        )
        graph_score = 1.0 if matched else 0.75

    doc_score = max([d.score for d in doc_evidence]) if doc_evidence else 0.0

    # 4. Score Fusion: alpha * graph + (1 - alpha) * doc
    alpha = settings.GRAPH_WEIGHT  # Default 0.6
    fused_score = (alpha * graph_score) + ((1.0 - alpha) * doc_score)

    # 5. Deterministic Sufficiency Gate
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
