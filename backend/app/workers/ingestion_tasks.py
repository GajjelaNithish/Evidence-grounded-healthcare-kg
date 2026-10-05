import os
import asyncio
import logging
from uuid import UUID
from celery import Task
from sqlalchemy import select, update
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.job import ProcessingJob
from app.documents.extractor import extract_text_from_file
from app.documents.chunker import chunk_text
from app.documents.entity_extractor import extract_clinical_entities
from app.documents.kg_builder import ingest_document_chunks_to_kg
from app.embedding_model import encode_batch
from app.faiss_manager import add_chunks_to_patient_index

logger = logging.getLogger(__name__)

async def _update_job_status(job_id_str: str, **kwargs):
    job_uuid = UUID(job_id_str)
    async with async_session_factory() as session:
        stmt = update(ProcessingJob).where(ProcessingJob.id == job_uuid).values(**kwargs)
        await session.execute(stmt)
        await session.commit()

async def _process_document_async(job_id_str: str):
    job_uuid = UUID(job_id_str)
    async with async_session_factory() as session:
        stmt = select(ProcessingJob).where(ProcessingJob.id == job_uuid)
        result = await session.execute(stmt)
        job = result.scalar_one_or_none()

    if not job:
        logger.error(f"Job {job_id_str} not found in database.")
        return

    patient_id = job.clinical_patient_id
    encounter_id = job.encounter_id  # May be None for legacy documents
    file_path = job.file_path
    filename = job.filename

    await _update_job_status(job_id_str, status="processing", progress_message="Extracting document text...")

    try:
        # 1. Text Extraction
        extracted_text, method = extract_text_from_file(file_path)
        if not extracted_text:
            raise ValueError(f"No text could be extracted from {filename} ({method})")

        await _update_job_status(job_id_str, progress_message="Chunking document...")

        # 2. Chunking
        chunks = chunk_text(extracted_text, chunk_size=500, chunk_overlap=50)
        if not chunks:
            raise ValueError("Document yielded 0 chunks.")

        await _update_job_status(job_id_str, progress_message="Extracting biomedical entities...")

        # 3. Entity Extraction per chunk
        chunk_entities_map = {}
        for chunk in chunks:
            idx = chunk["chunk_index"]
            c_text = chunk["text"]
            ents = extract_clinical_entities(c_text)
            chunk_entities_map[idx] = ents

        await _update_job_status(job_id_str, progress_message="Generating embeddings & indexing in FAISS...")

        # 4. Embeddings & FAISS indexing
        # Include encounter_id in FAISS metadata for provenance-aware retrieval
        texts_to_embed = [c["text"] for c in chunks]
        embeddings = encode_batch(texts_to_embed)

        meta_chunks = []
        for c in chunks:
            meta_chunks.append({
                "text": c["text"],
                "source_filename": filename,
                "chunk_index": c["chunk_index"],
                "patient_id": patient_id,
                "encounter_id": encounter_id,  # Provenance: which encounter generated this chunk
                "document_id": job_id_str,
            })

        add_chunks_to_patient_index(patient_id, meta_chunks, embeddings)

        await _update_job_status(job_id_str, progress_message="Building Knowledge Graph relationships...")

        # 5. Neo4j Knowledge Graph Ingestion
        # Pass encounter_id so DocumentChunk nodes link to the correct Encounter node
        kg_stats = ingest_document_chunks_to_kg(
            patient_id=patient_id,
            filename=filename,
            chunks=chunks,
            chunk_entities_map=chunk_entities_map,
            encounter_id=encounter_id,
            document_id=job_id_str,
        )

        # 6. Complete Job
        await _update_job_status(
            job_id_str,
            status="completed",
            progress_message="Document processed and ingested successfully.",
            chunks_indexed=len(chunks),
            entities_extracted=kg_stats["entities_extracted"],
            nodes_created=kg_stats["nodes_created"],
            relationships_created=kg_stats["relationships_created"]
        )
        logger.info(f"Job {job_id_str} completed successfully for patient {patient_id} (encounter: {encounter_id}).")

    except Exception as e:
        logger.error(f"Job {job_id_str} failed: {e}", exc_info=True)
        await _update_job_status(
            job_id_str,
            status="failed",
            progress_message="Document ingestion failed.",
            error_message=str(e)
        )

@celery_app.task(bind=True, name="process_clinical_document")
def process_clinical_document(self, job_id_str: str):
    """Celery task entry point."""
    logger.info(f"Starting Celery task for job: {job_id_str}")
    asyncio.run(_process_document_async(job_id_str))
