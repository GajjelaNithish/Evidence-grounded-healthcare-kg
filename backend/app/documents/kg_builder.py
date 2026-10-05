import logging
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
) -> Dict[str, int]:
    """
    Ingests document chunks and extracted entities into Neo4j with full provenance links.

    Provenance chain created:
        Patient -[:HAS_DOCUMENT_CHUNK]-> DocumentChunk
        DocumentChunk -[:BELONGS_TO_ENCOUNTER]-> Encounter  (if encounter_id is provided)
        DocumentChunk -[:MENTIONS]-> Condition/Treatment
        Patient -[:HAS_CONDITION]-> Condition
        Patient -[:RECEIVED_TREATMENT]-> Treatment

    Returns { "nodes_created": int, "relationships_created": int, "entities_extracted": int }.
    """
    driver = get_neo4j_driver()
    nodes_created = 0
    relationships_created = 0
    total_entities = 0

    with driver.session() as session:
        # Ensure Patient node exists
        session.run("""
            MERGE (p:Patient {patient_id: $patient_id})
            ON CREATE SET p.created_at = datetime()
        """, {"patient_id": patient_id})

        for chunk in chunks:
            idx = chunk["chunk_index"]
            text = chunk["text"]
            chunk_id = f"{patient_id}_{filename}_chunk_{idx}"
            entities = chunk_entities_map.get(idx, [])
            total_entities += len(entities)

            # Create DocumentChunk node with full provenance fields
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

            # If encounter_id provided, link DocumentChunk -> Encounter for provenance
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

            # Link entities to DocumentChunk and Patient
            for ent in entities:
                category = ent.get("category", "Condition")
                norm = ent["normalized_name"]
                name = ent["text"]
                conf = ent.get("confidence", 0.9)

                if category == "Condition":
                    session.run("""
                        MATCH (d:DocumentChunk {chunk_id: $chunk_id})
                        MATCH (p:Patient {patient_id: $patient_id})
                        MERGE (c:Condition {normalized_name: $norm})
                        ON CREATE SET c.name = $name, c.source = $filename
                        MERGE (d)-[r_men:MENTIONS]->(c)
                        SET r_men.confidence = $conf
                        MERGE (p)-[r_has:HAS_CONDITION]->(c)
                        ON CREATE SET r_has.confidence = $conf,
                                      r_has.source = $filename,
                                      r_has.created_at = datetime()
                    """, {
                        "chunk_id": chunk_id,
                        "patient_id": patient_id,
                        "norm": norm,
                        "name": name,
                        "conf": conf,
                        "filename": filename
                    })
                    nodes_created += 1
                    relationships_created += 2

                elif category == "Treatment":
                    session.run("""
                        MATCH (d:DocumentChunk {chunk_id: $chunk_id})
                        MATCH (p:Patient {patient_id: $patient_id})
                        MERGE (t:Treatment {normalized_name: $norm})
                        ON CREATE SET t.name = $name, t.treatment_type = 'treatment', t.source = $filename
                        MERGE (d)-[r_men:MENTIONS]->(t)
                        SET r_men.confidence = $conf
                        MERGE (p)-[r_rec:RECEIVED_TREATMENT]->(t)
                        ON CREATE SET r_rec.confidence = $conf,
                                      r_rec.source = $filename,
                                      r_rec.created_at = datetime()
                    """, {
                        "chunk_id": chunk_id,
                        "patient_id": patient_id,
                        "norm": norm,
                        "name": name,
                        "conf": conf,
                        "filename": filename
                    })
                    nodes_created += 1
                    relationships_created += 2

    return {
        "nodes_created": nodes_created,
        "relationships_created": relationships_created,
        "entities_extracted": total_entities
    }
