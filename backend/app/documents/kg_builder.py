import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.neo4j_client import get_neo4j_driver

logger = logging.getLogger(__name__)

def ingest_document_chunks_to_kg(
    patient_id: str,
    filename: str,
    chunks: List[Dict[str, Any]],
    chunk_entities_map: Dict[int, List[Dict[str, Any]]],
    encounter_id: Optional[str] = None,
    document_id: Optional[str] = None,
    document_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, int]:
    """
    Ingests document chunks, extracted entities, temporal dates, and clinical events
    into Neo4j with full provenance links and idempotent merging.

    Provenance chain created:
        Patient -[:HAS_DOCUMENT_CHUNK]-> DocumentChunk
        DocumentChunk -[:BELONGS_TO_ENCOUNTER]-> Encounter (if encounter_id provided)
        DocumentChunk -[:MENTIONS]-> Condition/Treatment/Observation
        Patient -[:HAS_CONDITION {valid_from, ...}]-> Condition
        Patient -[:RECEIVED_TREATMENT {valid_from, dosage, ...}]-> Treatment
        Patient -[:HAD_OBSERVATION]-> Observation
        Patient -[:HAD_ADMISSION]-> AdmissionEvent (if admission details extracted)
        AdmissionEvent -[:DIAGNOSED_WITH]-> Condition
        AdmissionEvent -[:TREATED_WITH]-> Treatment

    Returns { "nodes_created": int, "relationships_created": int, "entities_extracted": int }.
    """
    driver = get_neo4j_driver()
    nodes_created = 0
    relationships_created = 0
    total_entities = 0

    meta = document_metadata or {}
    default_date = meta.get("admission_date") or meta.get("document_date") or datetime.now().strftime("%Y-%m-%d")

    with driver.session() as session:
        # 1. Ensure Patient node exists with any extracted demographics
        session.run("""
            MERGE (p:Patient {patient_id: $patient_id})
            ON CREATE SET p.created_at = datetime(),
                          p.full_name = $full_name,
                          p.age = $age,
                          p.gender = $gender,
                          p.state = $state
            ON MATCH SET p.full_name = coalesce(p.full_name, $full_name),
                         p.age = coalesce(p.age, $age),
                         p.gender = coalesce(p.gender, $gender),
                         p.state = coalesce(p.state, $state)
        """, {
            "patient_id": patient_id,
            "full_name": meta.get("full_name"),
            "age": meta.get("age"),
            "gender": meta.get("gender"),
            "state": meta.get("state")
        })

        # 2. If Admission details exist, create AdmissionEvent node
        adm_id = None
        if meta.get("admission_date"):
            adm_date = meta["admission_date"]
            adm_id = f"{patient_id}_adm_{adm_date}"
            session.run("""
                MATCH (p:Patient {patient_id: $patient_id})
                MERGE (ae:AdmissionEvent {event_id: $adm_id})
                ON CREATE SET ae.admission_date = $adm_date,
                              ae.discharge_date = $dis_date,
                              ae.length_of_stay = $los,
                              ae.source = $filename,
                              ae.created_at = datetime()
                ON MATCH SET ae.discharge_date = coalesce($dis_date, ae.discharge_date),
                             ae.length_of_stay = coalesce($los, ae.length_of_stay),
                             ae.updated_at = datetime()
                MERGE (p)-[:HAD_ADMISSION]->(ae)
            """, {
                "patient_id": patient_id,
                "adm_id": adm_id,
                "adm_date": adm_date,
                "dis_date": meta.get("discharge_date"),
                "los": meta.get("length_of_stay"),
                "filename": filename
            })
            nodes_created += 1
            relationships_created += 1

        # 3. Ingest Document Chunks and Entities
        for chunk in chunks:
            idx = chunk["chunk_index"]
            text = chunk["text"]
            chunk_id = f"{patient_id}_{filename}_chunk_{idx}"
            entities = chunk_entities_map.get(idx, [])
            total_entities += len(entities)

            # Create or update DocumentChunk node
            session.run("""
                MATCH (p:Patient {patient_id: $patient_id})
                MERGE (d:DocumentChunk {chunk_id: $chunk_id})
                ON CREATE SET d.text = $text,
                              d.source_filename = $filename,
                              d.chunk_index = $idx,
                              d.patient_id = $patient_id,
                              d.encounter_id = $encounter_id,
                              d.document_id = $document_id,
                              d.created_at = datetime()
                ON MATCH SET d.text = $text,
                             d.document_id = $document_id,
                             d.updated_at = datetime()
                MERGE (p)-[:HAS_DOCUMENT_CHUNK]->(d)
            """, {
                "patient_id": patient_id,
                "chunk_id": chunk_id,
                "text": text,
                "filename": filename,
                "idx": idx,
                "encounter_id": encounter_id,
                "document_id": document_id,
            })
            nodes_created += 1
            relationships_created += 1

            # If encounter_id provided, link DocumentChunk -> Encounter
            if encounter_id:
                session.run("""
                    MATCH (d:DocumentChunk {chunk_id: $chunk_id})
                    MERGE (e:Encounter {encounter_id: $encounter_id})
                    ON CREATE SET e.patient_id = $patient_id, e.created_at = datetime()
                    MERGE (d)-[:BELONGS_TO_ENCOUNTER]->(e)
                """, {
                    "chunk_id": chunk_id,
                    "encounter_id": encounter_id,
                    "patient_id": patient_id,
                })
                relationships_created += 1

            # Link entities
            for ent in entities:
                category = ent.get("category", "Condition")
                norm = ent["normalized_name"]
                name = ent["text"]
                conf = ent.get("confidence", 0.9)
                ent_date = ent.get("valid_from") or default_date
                ent_end_date = ent.get("valid_to") or meta.get("discharge_date")
                ent_status = ent.get("status", "active")

                if category == "Condition":
                    session.run("""
                        MATCH (d:DocumentChunk {chunk_id: $chunk_id})
                        MATCH (p:Patient {patient_id: $patient_id})
                        MERGE (c:Condition {normalized_name: $norm})
                        ON CREATE SET c.name = $name, c.source = $filename, c.created_at = datetime()
                        MERGE (d)-[r_men:MENTIONS]->(c)
                        SET r_men.confidence = $conf
                        MERGE (p)-[r_has:HAS_CONDITION]->(c)
                        ON CREATE SET r_has.confidence = $conf,
                                      r_has.source = $filename,
                                      r_has.valid_from = $valid_from,
                                      r_has.valid_to = $valid_to,
                                      r_has.status = $status,
                                      r_has.created_at = datetime()
                        ON MATCH SET r_has.valid_from = coalesce(r_has.valid_from, $valid_from),
                                     r_has.source = $filename,
                                     r_has.updated_at = datetime()
                    """, {
                        "chunk_id": chunk_id,
                        "patient_id": patient_id,
                        "norm": norm,
                        "name": name,
                        "conf": conf,
                        "filename": filename,
                        "valid_from": ent_date,
                        "valid_to": ent_end_date,
                        "status": ent_status
                    })
                    nodes_created += 1
                    relationships_created += 2

                    if adm_id:
                        session.run("""
                            MATCH (ae:AdmissionEvent {event_id: $adm_id})
                            MATCH (c:Condition {normalized_name: $norm})
                            MERGE (ae)-[:DIAGNOSED_WITH]->(c)
                        """, {"adm_id": adm_id, "norm": norm})
                        relationships_created += 1

                elif category == "Treatment":
                    treatment_type = ent.get("treatment_type", "treatment")
                    dosage = ent.get("dosage")
                    frequency = ent.get("frequency")

                    session.run("""
                        MATCH (d:DocumentChunk {chunk_id: $chunk_id})
                        MATCH (p:Patient {patient_id: $patient_id})
                        MERGE (t:Treatment {normalized_name: $norm})
                        ON CREATE SET t.name = $name,
                                      t.treatment_type = $treatment_type,
                                      t.dosage = $dosage,
                                      t.frequency = $frequency,
                                      t.source = $filename,
                                      t.created_at = datetime()
                        ON MATCH SET t.dosage = coalesce($dosage, t.dosage),
                                     t.frequency = coalesce($frequency, t.frequency),
                                     t.updated_at = datetime()
                        MERGE (d)-[r_men:MENTIONS]->(t)
                        SET r_men.confidence = $conf
                        MERGE (p)-[r_rec:RECEIVED_TREATMENT]->(t)
                        ON CREATE SET r_rec.confidence = $conf,
                                      r_rec.source = $filename,
                                      r_rec.valid_from = $valid_from,
                                      r_rec.valid_to = $valid_to,
                                      r_rec.dosage = $dosage,
                                      r_rec.frequency = $frequency,
                                      r_rec.status = $status,
                                      r_rec.created_at = datetime()
                        ON MATCH SET r_rec.valid_from = coalesce(r_rec.valid_from, $valid_from),
                                     r_rec.dosage = coalesce($dosage, r_rec.dosage),
                                     r_rec.source = $filename,
                                     r_rec.updated_at = datetime()
                    """, {
                        "chunk_id": chunk_id,
                        "patient_id": patient_id,
                        "norm": norm,
                        "name": name,
                        "treatment_type": treatment_type,
                        "dosage": dosage,
                        "frequency": frequency,
                        "conf": conf,
                        "filename": filename,
                        "valid_from": ent_date,
                        "valid_to": ent_end_date,
                        "status": ent_status
                    })
                    nodes_created += 1
                    relationships_created += 2

                    if adm_id:
                        session.run("""
                            MATCH (ae:AdmissionEvent {event_id: $adm_id})
                            MATCH (t:Treatment {normalized_name: $norm})
                            MERGE (ae)-[:TREATED_WITH]->(t)
                        """, {"adm_id": adm_id, "norm": norm})
                        relationships_created += 1

                elif category == "Observation":
                    obs_id = f"{patient_id}_{norm}_{ent_date}"
                    session.run("""
                        MATCH (d:DocumentChunk {chunk_id: $chunk_id})
                        MATCH (p:Patient {patient_id: $patient_id})
                        MERGE (o:Observation {obs_id: $obs_id})
                        ON CREATE SET o.name = $name,
                                      o.value = $value,
                                      o.unit = $unit,
                                      o.test_date = $valid_from,
                                      o.source = $filename,
                                      o.created_at = datetime()
                        MERGE (d)-[:MENTIONS]->(o)
                        MERGE (p)-[r_obs:HAD_OBSERVATION]->(o)
                        ON CREATE SET r_obs.date = $valid_from, r_obs.source = $filename
                    """, {
                        "chunk_id": chunk_id,
                        "patient_id": patient_id,
                        "obs_id": obs_id,
                        "name": ent.get("test_name", name),
                        "value": ent.get("value", ""),
                        "unit": ent.get("unit", ""),
                        "valid_from": ent_date,
                        "filename": filename
                    })
                    nodes_created += 1
                    relationships_created += 2

    return {
        "nodes_created": nodes_created,
        "relationships_created": relationships_created,
        "entities_extracted": total_entities
    }
