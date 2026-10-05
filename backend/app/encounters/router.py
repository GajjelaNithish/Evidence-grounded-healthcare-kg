import logging
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.user import User
from app.models.encounter import Encounter
from app.auth.dependencies import get_current_user, verify_patient_access, require_doctor_or_admin
from app.neo4j_client import get_neo4j_driver

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/encounters", tags=["Clinical Encounters"])

class CreateEncounterRequest(BaseModel):
    patient_id: str
    visit_date: str
    reason_for_visit: Optional[str] = None
    condition: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    medication: Optional[str] = None
    clinical_notes: Optional[str] = None
    admission_date: Optional[str] = None
    discharge_date: Optional[str] = None
    outcome: Optional[str] = None

class EncounterOut(BaseModel):
    id: UUID
    encounter_id: str
    patient_id: str
    visit_date: str
    reason_for_visit: Optional[str] = None
    condition: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    medication: Optional[str] = None
    clinical_notes: Optional[str] = None
    admission_date: Optional[str] = None
    discharge_date: Optional[str] = None
    outcome: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: str
    updated_at: str

async def generate_next_encounter_id(db: AsyncSession) -> str:
    stmt = select(Encounter.encounter_id).where(Encounter.encounter_id.like("ENC-%"))
    res = await db.execute(stmt)
    eids = res.scalars().all()
    max_num = 0
    for eid in eids:
        try:
            num = int(eid.replace("ENC-", ""))
            if num > max_num:
                max_num = num
        except ValueError:
            pass
    next_num = max_num + 1
    return f"ENC-{next_num:06d}"

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_encounter(
    body: CreateEncounterRequest,
    current_user: User = Depends(require_doctor_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new temporal clinical encounter record for a patient."""
    has_access = await verify_patient_access(body.patient_id, current_user, db)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to add encounters for patient {body.patient_id}"
        )

    encounter_id = await generate_next_encounter_id(db)

    encounter = Encounter(
        encounter_id=encounter_id,
        patient_id=body.patient_id,
        visit_date=body.visit_date,
        reason_for_visit=body.reason_for_visit,
        condition=body.condition,
        diagnosis=body.diagnosis,
        treatment=body.treatment,
        medication=body.medication,
        clinical_notes=body.clinical_notes,
        admission_date=body.admission_date,
        discharge_date=body.discharge_date,
        outcome=body.outcome,
        created_by=current_user.id
    )

    db.add(encounter)
    await db.commit()

    # Sync Encounter to Neo4j Knowledge Graph
    try:
        driver = get_neo4j_driver()
        with driver.session() as session:
            session.run("""
            MERGE (p:Patient {patient_id: $patient_id})
            MERGE (e:Encounter {encounter_id: $encounter_id})
            ON CREATE SET
                e.visit_date = $visit_date,
                e.condition = $condition,
                e.diagnosis = $diagnosis,
                e.treatment = $treatment,
                e.medication = $medication
            MERGE (p)-[:HAD_ENCOUNTER]->(e)
            """, {
                "patient_id": body.patient_id,
                "encounter_id": encounter_id,
                "visit_date": body.visit_date,
                "condition": body.condition or "",
                "diagnosis": body.diagnosis or "",
                "treatment": body.treatment or "",
                "medication": body.medication or ""
            })

            if body.condition or body.diagnosis:
                cond_name = body.diagnosis or body.condition
                session.run("""
                MATCH (p:Patient {patient_id: $patient_id})
                MERGE (c:Condition {normalized_name: toLower($cond_name)})
                ON CREATE SET c.name = $cond_name
                MERGE (p)-[r:HAS_CONDITION {valid_from: $visit_date}]->(c)
                """, {"patient_id": body.patient_id, "cond_name": cond_name, "visit_date": body.visit_date})

            if body.treatment or body.medication:
                treat_name = body.treatment or body.medication
                session.run("""
                MATCH (p:Patient {patient_id: $patient_id})
                MERGE (t:Treatment {normalized_name: toLower($treat_name)})
                ON CREATE SET t.name = $treat_name
                MERGE (p)-[r:RECEIVED_TREATMENT {valid_from: $visit_date}]->(t)
                """, {"patient_id": body.patient_id, "treat_name": treat_name, "visit_date": body.visit_date})
    except Exception as e:
        logger.warning(f"Neo4j encounter sync warning: {e}")

    return {
        "message": "Clinical encounter recorded successfully",
        "encounter_id": encounter_id,
        "encounter": {
            "id": str(encounter.id),
            "encounter_id": encounter.encounter_id,
            "patient_id": encounter.patient_id,
            "visit_date": encounter.visit_date,
            "condition": encounter.condition,
            "diagnosis": encounter.diagnosis,
            "treatment": encounter.treatment,
            "medication": encounter.medication
        }
    }

@router.get("/patient/{patient_id}")
async def get_patient_encounters(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns all clinical encounters for a patient, ordered temporally (Latest -> Previous -> Older)."""
    has_access = await verify_patient_access(patient_id, current_user, db)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have access to patient {patient_id}"
        )

    stmt = select(Encounter).where(
        Encounter.patient_id == patient_id
    ).order_by(desc(Encounter.visit_date), desc(Encounter.created_at))

    res = await db.execute(stmt)
    encounters = res.scalars().all()

    return [
        {
            "id": str(e.id),
            "encounter_id": e.encounter_id,
            "patient_id": e.patient_id,
            "visit_date": e.visit_date,
            "reason_for_visit": e.reason_for_visit,
            "condition": e.condition,
            "diagnosis": e.diagnosis,
            "treatment": e.treatment,
            "medication": e.medication,
            "clinical_notes": e.clinical_notes,
            "admission_date": e.admission_date,
            "discharge_date": e.discharge_date,
            "outcome": e.outcome,
            "created_by": str(e.created_by) if e.created_by else None,
            "created_at": e.created_at,
            "updated_at": e.updated_at
        }
        for e in encounters
    ]

@router.get("/{encounter_id}")
async def get_encounter_detail(
    encounter_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Encounter).where(Encounter.encounter_id == encounter_id)
    res = await db.execute(stmt)
    encounter = res.scalar_one_or_none()
    if not encounter:
        raise HTTPException(status_code=404, detail="Clinical encounter not found")

    has_access = await verify_patient_access(encounter.patient_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "id": str(encounter.id),
        "encounter_id": encounter.encounter_id,
        "patient_id": encounter.patient_id,
        "visit_date": encounter.visit_date,
        "reason_for_visit": encounter.reason_for_visit,
        "condition": encounter.condition,
        "diagnosis": encounter.diagnosis,
        "treatment": encounter.treatment,
        "medication": encounter.medication,
        "clinical_notes": encounter.clinical_notes,
        "admission_date": encounter.admission_date,
        "discharge_date": encounter.discharge_date,
        "outcome": encounter.outcome,
        "created_by": str(encounter.created_by) if encounter.created_by else None,
        "created_at": encounter.created_at,
        "updated_at": encounter.updated_at
    }
