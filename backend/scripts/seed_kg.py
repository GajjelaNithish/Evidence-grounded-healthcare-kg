import os
import sys
import csv
import argparse
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.neo4j_client import get_neo4j_driver, init_neo4j_constraints
from app.embedding_model import encode_text
from app.faiss_manager import add_chunks_to_patient_index
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_kg")

SYNTHETIC_NOTE_TEMPLATE = """CLINICAL DISCHARGE SUMMARY — SYNTHETIC RECORD
Patient ID: {patient_id} | Age: {age} | Gender: {gender} | State: {state}
Admission Date: {admission_date} | Discharge Date: {discharge_date}
Primary Diagnosis: {condition}
Treatment Administered: {treatment}
Length of Stay: {length_of_stay} days
Clinical Outcome: {outcome}
Readmission within 30 days: {readmission}
Patient Satisfaction Score: {satisfaction}/5
Total Treatment Cost: INR {total_cost}
Insurance Claimed: {insurance_claimed}
Note: This is a synthetic clinical record generated from an EHR dataset for research purposes."""

PROCEDURE_KEYWORDS = [
    "appendectomy", "surgery", "catheterization", "angioplasty",
    "lithotripsy", "x-ray", "ct scan", "radiation", "epinephrine",
    "injection", "delivery"
]

THERAPY_KEYWORDS = [
    "physical therapy", "insulin therapy", "antibiotics",
    "chemotherapy", "counseling", "postnatal care"
]

def infer_treatment_type(treatment_name: str) -> str:
    name_lower = treatment_name.lower()
    for kw in PROCEDURE_KEYWORDS:
        if kw in name_lower:
            return "procedure"
    for kw in THERAPY_KEYWORDS:
        if kw in name_lower:
            return "therapy"
    return "treatment"

def parse_date_to_iso(date_str: str) -> Optional[str]:
    """Parse 'DD-MM-YYYY' into ISO 'YYYY-MM-DD' string for Neo4j date()."""
    if not date_str or not date_str.strip():
        return None
    cleaned = date_str.strip()
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def seed_primary_dataset(csv_path: str) -> Dict[str, Any]:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV dataset not found at: {csv_path}")

    logger.info(f"Initializing Neo4j schema constraints...")
    try:
        init_neo4j_constraints()
    except Exception as e:
        logger.warning(f"Constraint init warning (database might not be running): {e}")

    driver = get_neo4j_driver()

    patients_seeded = 0
    nodes_created = 0
    relationships_created = 0
    errors = 0

    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        # Strip header names (removes trailing space in 'Medication ')
        reader.fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []

        with driver.session() as session:
            for row in reader:
                try:
                    patient_id = str(row.get("Patient_ID", "")).strip()
                    if not patient_id:
                        continue

                    age = int(row.get("Age", 0))
                    gender = str(row.get("Gender", "")).strip()
                    state = str(row.get("Patient_State", "")).strip()
                    condition_raw = str(row.get("Condition", "")).strip()
                    # Mislabeled Medication column represents Treatment
                    treatment_raw = str(row.get("Medication", "")).strip()
                    
                    admission_date_iso = parse_date_to_iso(row.get("Admission_Date", ""))
                    discharge_date_iso = parse_date_to_iso(row.get("Discharge_Date", ""))
                    
                    length_of_stay = int(row.get("Length_of_Stay", 0) or 0)
                    readmission_raw = str(row.get("Readmission", "No")).strip()
                    readmission_bool = (readmission_raw.lower() == "yes")
                    outcome = str(row.get("Outcome", "Stable")).strip()
                    
                    satisfaction_val = row.get("Satisfaction", "3").strip()
                    satisfaction = int(satisfaction_val) if satisfaction_val.isdigit() else 3
                    
                    insurance_claimed = (str(row.get("Insurance_Claimed", "No")).strip().lower() == "yes")
                    total_cost = int(row.get("Total_Cost", 0) or 0)

                    c_norm = condition_raw.lower().strip()
                    t_norm = treatment_raw.lower().strip()
                    treatment_type = infer_treatment_type(treatment_raw)
                    event_id = f"{patient_id}_admission_{admission_date_iso or 'unknown'}"

                    # 1. Parameterized Cypher query to merge nodes and relationships
                    cypher_query = """
                    MERGE (p:Patient {patient_id: $patient_id})
                    ON CREATE SET p.age = $age, p.gender = $gender, p.state = $state, p.created_at = datetime()

                    MERGE (c:Condition {normalized_name: $c_norm})
                    ON CREATE SET c.name = $condition_raw, c.source = 'primary_dataset'

                    MERGE (t:Treatment {normalized_name: $t_norm})
                    ON CREATE SET t.name = $treatment_raw, t.treatment_type = $treatment_type

                    MERGE (ae:AdmissionEvent {event_id: $event_id})
                    ON CREATE SET
                        ae.admission_date = CASE WHEN $admission_date_iso IS NOT NULL THEN date($admission_date_iso) ELSE null END,
                        ae.discharge_date = CASE WHEN $discharge_date_iso IS NOT NULL THEN date($discharge_date_iso) ELSE null END,
                        ae.length_of_stay = $length_of_stay,
                        ae.outcome = $outcome,
                        ae.readmission = $readmission_bool,
                        ae.satisfaction_score = $satisfaction,
                        ae.insurance_claimed = $insurance_claimed,
                        ae.total_cost_inr = $total_cost,
                        ae.source = 'primary_dataset'

                    MERGE (p)-[r1:HAS_CONDITION]->(c)
                    SET r1.valid_from = CASE WHEN $admission_date_iso IS NOT NULL THEN date($admission_date_iso) ELSE null END,
                        r1.valid_to = CASE WHEN $discharge_date_iso IS NOT NULL THEN date($discharge_date_iso) ELSE null END,
                        r1.confidence = 1.0,
                        r1.source = 'primary_dataset'

                    MERGE (p)-[r2:RECEIVED_TREATMENT]->(t)
                    SET r2.valid_from = CASE WHEN $admission_date_iso IS NOT NULL THEN date($admission_date_iso) ELSE null END,
                        r2.valid_to = CASE WHEN $discharge_date_iso IS NOT NULL THEN date($discharge_date_iso) ELSE null END,
                        r2.confidence = 1.0,
                        r2.source = 'primary_dataset'

                    MERGE (p)-[:HAD_ADMISSION]->(ae)
                    MERGE (ae)-[:DIAGNOSED_WITH]->(c)
                    MERGE (ae)-[:TREATED_WITH]->(t)
                    """

                    params = {
                        "patient_id": patient_id,
                        "age": age,
                        "gender": gender,
                        "state": state,
                        "c_norm": c_norm,
                        "condition_raw": condition_raw,
                        "t_norm": t_norm,
                        "treatment_raw": treatment_raw,
                        "treatment_type": treatment_type,
                        "event_id": event_id,
                        "admission_date_iso": admission_date_iso,
                        "discharge_date_iso": discharge_date_iso,
                        "length_of_stay": length_of_stay,
                        "outcome": outcome,
                        "readmission_bool": readmission_bool,
                        "satisfaction": satisfaction,
                        "insurance_claimed": insurance_claimed,
                        "total_cost": total_cost,
                    }

                    session.run(cypher_query, params)

                    # Readmission edge (Pre-execution correction: no fabricated days_between)
                    if readmission_bool:
                        readmit_cypher = """
                        MATCH (p:Patient {patient_id: $patient_id})
                        MATCH (ae:AdmissionEvent {event_id: $event_id})
                        MERGE (p)-[r:READMITTED_AFTER]->(ae)
                        SET r.source = 'primary_dataset',
                            r.readmission_flag = true,
                            r.confidence = 1.0
                        """
                        session.run(readmit_cypher, {"patient_id": patient_id, "event_id": event_id})

                    # 2. Generate synthetic clinical note and embed into patient FAISS namespace
                    synthetic_note = SYNTHETIC_NOTE_TEMPLATE.format(
                        patient_id=patient_id,
                        age=age,
                        gender=gender,
                        state=state,
                        admission_date=row.get("Admission_Date", "N/A"),
                        discharge_date=row.get("Discharge_Date", "N/A"),
                        condition=condition_raw,
                        treatment=treatment_raw,
                        length_of_stay=length_of_stay,
                        outcome=outcome,
                        readmission=readmission_raw,
                        satisfaction=satisfaction,
                        total_cost=total_cost,
                        insurance_claimed=row.get("Insurance_Claimed", "No")
                    )

                    emb = encode_text(synthetic_note)
                    chunk_meta = [{
                        "text": synthetic_note,
                        "source_filename": "primary_dataset_record",
                        "chunk_index": 0,
                        "patient_id": patient_id
                    }]
                    add_chunks_to_patient_index(patient_id, chunk_meta, emb.reshape(1, -1))

                    patients_seeded += 1
                    if patients_seeded % 100 == 0:
                        logger.info(f"Progress: {patients_seeded} patients seeded...")

                except Exception as ex:
                    logger.error(f"Error seeding row {row}: {ex}")
                    errors += 1

    logger.info(f"Seeding completed: {patients_seeded} patients seeded, {errors} errors.")
    return {
        "status": "completed" if errors == 0 else "completed_with_errors",
        "patients_seeded": patients_seeded,
        "errors": errors
    }

def enrich_condition_vocabulary(csv_path: str) -> int:
    """Enriches Condition nodes using unique medical conditions from secondary dataset."""
    if not os.path.exists(csv_path):
        logger.warning(f"Secondary dataset not found at: {csv_path}")
        return 0

    driver = get_neo4j_driver()
    conditions = set()

    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        reader.fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []
        for row in reader:
            cond = row.get("Medical Condition", "").strip()
            if cond:
                conditions.add(cond)

    logger.info(f"Found {len(conditions)} conditions from secondary dataset: {conditions}")

    with driver.session() as session:
        for cond in conditions:
            c_norm = cond.lower().strip()
            session.run("""
                MERGE (c:Condition {normalized_name: $c_norm})
                ON CREATE SET c.name = $name, c.source = 'secondary_dataset'
            """, {"c_norm": c_norm, "name": cond})

    logger.info(f"Secondary dataset condition vocabulary enriched ({len(conditions)} unique conditions).")
    return len(conditions)

def main():
    parser = argparse.ArgumentParser(description="Seed Neo4j and FAISS from datasets.")
    parser.add_argument("--csv", default="data/datasets/Hospital_Patient_.csv", help="Primary dataset path")
    parser.add_argument("--secondary", default="data/datasets/modified_healthcare_dataset.csv", help="Secondary dataset path")
    parser.add_argument("--skip-secondary", action="store_true", help="Skip secondary enrichment")

    args = parser.parse_args()
    stats = seed_primary_dataset(args.csv)
    print(f"Primary Seed Result: {stats}")

    if not args.skip_secondary and os.path.exists(args.secondary):
        enriched_count = enrich_condition_vocabulary(args.secondary)
        print(f"Secondary Vocabulary Enriched: {enriched_count} conditions")

if __name__ == "__main__":
    main()
