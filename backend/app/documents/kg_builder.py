import logging
from typing import List, Dict, Any
from app.neo4j_client import get_neo4j_driver

logger = logging.getLogger(__name__)

def ingest_document_chunks_to_kg(
    patient_id: str,
    filename: str,
    chunks: List[Dict[str, Any]],
    chunk_entities_map: Dict[int, List[Dict[str, Any]]]
) -> Dict[str, int]:
    """
    Ingests document chunks and extracted entities into Neo4j graph with provenance links.
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

            # Create DocumentChunk node and link to Patient
            session.run("""
                MATCH (p:Patient {patient_id: $patient_id})
                MERGE (d:DocumentChunk {chunk_id: $chunk_id})
                ON CREATE SET d.text = $text,
                              d.source_filename = $filename,
                              d.chunk_index = $idx,
                              d.patient_id = $patient_id,
                              d.created_at = datetime()
                MERGE (p)-[:HAS_DOCUMENT_CHUNK]->(d)
            """, {
                "patient_id": patient_id,
                "chunk_id": chunk_id,
                "text": text,
                "filename": filename,
                "idx": idx
            })
            nodes_created += 1
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
