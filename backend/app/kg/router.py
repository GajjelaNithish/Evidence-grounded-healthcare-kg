import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.assignment import DoctorPatientAssignment
from app.neo4j_client import get_neo4j_driver
from app.auth.dependencies import get_current_user, verify_patient_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kg", tags=["Knowledge Graph"])

@router.get("/patients")
async def list_patients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns list of patients visible to the authenticated user."""
    driver = get_neo4j_driver()

    if current_user.role == "patient":
        pid = current_user.clinical_patient_id
        if not pid:
            return []
        return [{"patient_id": pid, "label": f"Patient #{pid}"}]

    elif current_user.role == "doctor":
        # Fetch assigned patient IDs
        stmt = select(DoctorPatientAssignment.clinical_patient_id).where(
            DoctorPatientAssignment.doctor_id == current_user.id
        )
        res = await db.execute(stmt)
        assigned_pids = [r[0] for r in res.fetchall()]
        return [{"patient_id": pid, "label": f"Patient #{pid}"} for pid in assigned_pids]

    else:
        # Admin can see all patients in Neo4j
        with driver.session() as session:
            result = session.run("MATCH (p:Patient) RETURN p.patient_id AS pid, p.age AS age, p.gender AS gender ORDER BY p.patient_id LIMIT 200")
            patients = []
            for r in result:
                pid = r["pid"]
                patients.append({
                    "patient_id": pid,
                    "label": f"Patient #{pid} (Age {r.get('age', 'N/A')}, {r.get('gender', 'N/A')})"
                })
            return patients

@router.get("/subgraph/{patient_id}")
async def get_patient_subgraph(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns patient subgraph in Cytoscape.js format."""
    has_access = await verify_patient_access(patient_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Forbidden")

    driver = get_neo4j_driver()
    nodes = []
    edges = []
    seen_nodes = set()
    seen_edges = set()

    def _add_node(n_id: str, label: str, n_type: str, props: Dict[str, Any]):
        if n_id not in seen_nodes:
            seen_nodes.add(n_id)
            nodes.append({
                "data": {
                    "id": n_id,
                    "label": label,
                    "type": n_type,
                    "properties": props
                }
            })

    def _add_edge(e_id: str, src: str, tgt: str, label: str, props: Dict[str, Any]):
        if e_id not in seen_edges:
            seen_edges.add(e_id)
            edges.append({
                "data": {
                    "id": e_id,
                    "source": src,
                    "target": tgt,
                    "label": label,
                    "properties": props
                }
            })

    cypher = """
    MATCH (p:Patient {patient_id: $patient_id})
    OPTIONAL MATCH (p)-[r_cond:HAS_CONDITION]->(c:Condition)
    OPTIONAL MATCH (p)-[r_treat:RECEIVED_TREATMENT]->(t:Treatment)
    OPTIONAL MATCH (p)-[r_adm:HAD_ADMISSION]->(ae:AdmissionEvent)
    OPTIONAL MATCH (ae)-[r_diag:DIAGNOSED_WITH]->(c_adm:Condition)
    OPTIONAL MATCH (ae)-[r_tx:TREATED_WITH]->(t_adm:Treatment)
    OPTIONAL MATCH (p)-[r_readmit:READMITTED_AFTER]->(ae_readmit:AdmissionEvent)
    OPTIONAL MATCH (p)-[:HAS_DOCUMENT_CHUNK]->(d:DocumentChunk)
    OPTIONAL MATCH (d)-[r_men:MENTIONS]->(m_ent)
    RETURN p,
           collect(DISTINCT {r: r_cond, node: c}) AS conds,
           collect(DISTINCT {r: r_treat, node: t}) AS treats,
           collect(DISTINCT {r: r_adm, node: ae}) AS adms,
           collect(DISTINCT {ae: ae, r: r_diag, c: c_adm}) AS ae_conds,
           collect(DISTINCT {ae: ae, r: r_tx, t: t_adm}) AS ae_treats,
           collect(DISTINCT {r: r_readmit, ae: ae_readmit}) AS readmits,
           collect(DISTINCT {d: d, r: r_men, target: m_ent}) AS doc_links
    """

    with driver.session() as session:
        result = session.run(cypher, {"patient_id": patient_id})
        record = result.single()

        if not record or not record["p"]:
            raise HTTPException(status_code=404, detail="Patient node not found in Knowledge Graph")

        p_node = record["p"]
        p_id = f"Patient_{patient_id}"
        _add_node(p_id, f"Patient #{patient_id}", "Patient", dict(p_node))

        # Conditions
        for item in record["conds"]:
            c = item.get("node")
            r = item.get("r")
            if c:
                c_id = f"Condition_{c.get('normalized_name')}"
                _add_node(c_id, c.get("name", "Condition"), "Condition", dict(c))
                if r:
                    _add_edge(f"{p_id}_HAS_{c_id}", p_id, c_id, "HAS_CONDITION", dict(r))

        # Treatments
        for item in record["treats"]:
            t = item.get("node")
            r = item.get("r")
            if t:
                t_id = f"Treatment_{t.get('normalized_name')}"
                _add_node(t_id, t.get("name", "Treatment"), "Treatment", dict(t))
                if r:
                    _add_edge(f"{p_id}_RECEIVED_{t_id}", p_id, t_id, "RECEIVED_TREATMENT", dict(r))

        # Admissions
        for item in record["adms"]:
            ae = item.get("node")
            r = item.get("r")
            if ae:
                ae_id = f"Admission_{ae.get('event_id')}"
                _add_node(ae_id, f"Admission ({ae.get('admission_date')})", "AdmissionEvent", dict(ae))
                if r:
                    _add_edge(f"{p_id}_HAD_{ae_id}", p_id, ae_id, "HAD_ADMISSION", dict(r))

        # Admission relations
        for item in record["ae_conds"]:
            ae = item.get("ae")
            c = item.get("c")
            if ae and c:
                ae_id = f"Admission_{ae.get('event_id')}"
                c_id = f"Condition_{c.get('normalized_name')}"
                _add_edge(f"{ae_id}_DIAG_{c_id}", ae_id, c_id, "DIAGNOSED_WITH", {})

        for item in record["ae_treats"]:
            ae = item.get("ae")
            t = item.get("t")
            if ae and t:
                ae_id = f"Admission_{ae.get('event_id')}"
                t_id = f"Treatment_{t.get('normalized_name')}"
                _add_edge(f"{ae_id}_TX_{t_id}", ae_id, t_id, "TREATED_WITH", {})

        # Readmission edges
        for item in record["readmits"]:
            ae = item.get("ae")
            r = item.get("r")
            if ae and r:
                ae_id = f"Admission_{ae.get('event_id')}"
                _add_edge(f"{p_id}_READMIT_{ae_id}", p_id, ae_id, "READMITTED_AFTER", dict(r))

        # Document Chunks
        for item in record["doc_links"]:
            d = item.get("d")
            m = item.get("target")
            if d:
                d_id = f"Chunk_{d.get('chunk_id')}"
                _add_node(d_id, f"Doc Chunk {d.get('chunk_index')}", "DocumentChunk", dict(d))
                _add_edge(f"{p_id}_DOC_{d_id}", p_id, d_id, "HAS_DOCUMENT_CHUNK", {})
                if m:
                    target_id = f"Condition_{m.get('normalized_name')}" if "normalized_name" in m else f"Entity_{m.get('name')}"
                    _add_edge(f"{d_id}_MEN_{target_id}", d_id, target_id, "MENTIONS", {})

    return {
        "elements": {
            "nodes": nodes,
            "edges": edges
        }
    }

@router.get("/timeline/{patient_id}")
async def get_patient_timeline(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns chronological timeline events for a patient."""
    has_access = await verify_patient_access(patient_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Forbidden")

    driver = get_neo4j_driver()
    timeline = []

    cypher = """
    MATCH (p:Patient {patient_id: $patient_id})
    OPTIONAL MATCH (p)-[r1:HAS_CONDITION]->(c:Condition)
    OPTIONAL MATCH (p)-[r2:RECEIVED_TREATMENT]->(t:Treatment)
    OPTIONAL MATCH (p)-[:HAD_ADMISSION]->(ae:AdmissionEvent)
    RETURN collect(DISTINCT {r: r1, c: c}) AS conds,
           collect(DISTINCT {r: r2, t: t}) AS treats,
           collect(DISTINCT ae) AS adms
    """

    with driver.session() as session:
        result = session.run(cypher, {"patient_id": patient_id})
        record = result.single()

        if record:
            for item in record["conds"]:
                c = item.get("c")
                r = item.get("r")
                if c and r and r.get("valid_from"):
                    timeline.append({
                        "event_type": "Condition Diagnosis",
                        "title": c.get("name"),
                        "date": str(r.get("valid_from")),
                        "end_date": str(r.get("valid_to")) if r.get("valid_to") else None,
                        "status": "Active" if not r.get("valid_to") else "Resolved",
                        "details": f"Diagnosed with {c.get('name')}"
                    })

            for item in record["treats"]:
                t = item.get("t")
                r = item.get("r")
                if t and r and r.get("valid_from"):
                    timeline.append({
                        "event_type": "Treatment Course",
                        "title": t.get("name"),
                        "date": str(r.get("valid_from")),
                        "end_date": str(r.get("valid_to")) if r.get("valid_to") else None,
                        "status": "Ongoing" if not r.get("valid_to") else "Completed",
                        "details": f"Administered {t.get('name')} ({t.get('treatment_type')})"
                    })

            for ae in record["adms"]:
                if ae and ae.get("admission_date"):
                    timeline.append({
                        "event_type": "Hospital Admission",
                        "title": f"Admission ({ae.get('outcome', 'Stable')})",
                        "date": str(ae.get("admission_date")),
                        "end_date": str(ae.get("discharge_date")) if ae.get("discharge_date") else None,
                        "status": "Discharged" if ae.get("discharge_date") else "Admitted",
                        "details": (
                            f"Length of Stay: {ae.get('length_of_stay')} days | "
                            f"Cost: INR {ae.get('total_cost_inr')} | "
                            f"Readmission: {'Yes' if ae.get('readmission') else 'No'}"
                        )
                    })

    # Sort chronological
    timeline.sort(key=lambda x: x["date"] or "", reverse=True)
    return timeline

@router.get("/analytics/{patient_id}")
async def get_patient_analytics(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns summary clinical analytics for a patient."""
    has_access = await verify_patient_access(patient_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Forbidden")

    driver = get_neo4j_driver()

    cypher = """
    MATCH (p:Patient {patient_id: $patient_id})
    OPTIONAL MATCH (p)-[:HAS_CONDITION]->(c:Condition)
    OPTIONAL MATCH (p)-[:RECEIVED_TREATMENT]->(t:Treatment)
    OPTIONAL MATCH (p)-[:HAD_ADMISSION]->(ae:AdmissionEvent)
    OPTIONAL MATCH (p)-[:HAS_DOCUMENT_CHUNK]->(d:DocumentChunk)
    RETURN p,
           count(DISTINCT c) AS condition_count,
           count(DISTINCT t) AS treatment_count,
           count(DISTINCT ae) AS admission_count,
           sum(ae.total_cost_inr) AS total_cost,
           sum(ae.length_of_stay) AS total_los,
           count(DISTINCT d) AS chunk_count
    """

    with driver.session() as session:
        result = session.run(cypher, {"patient_id": patient_id})
        record = result.single()

        if not record or not record["p"]:
            raise HTTPException(status_code=404, detail="Patient not found")

        p = dict(record["p"])
        return {
            "patient_id": patient_id,
            "age": p.get("age", 0),
            "gender": p.get("gender", "N/A"),
            "state": p.get("state", "N/A"),
            "condition_count": record["condition_count"],
            "treatment_count": record["treatment_count"],
            "admission_count": record["admission_count"],
            "total_treatment_cost_inr": record["total_cost"] or 0,
            "total_length_of_stay_days": record["total_los"] or 0,
            "indexed_document_chunks": record["chunk_count"]
        }
