import os
import uuid
import logging
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.job import ProcessingJob
from app.models.audit import AuditLog
from app.auth.dependencies import get_current_user, verify_patient_access
from app.workers.ingestion_tasks import process_clinical_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".png", ".jpg", ".jpeg"}

@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check patient access permission
    has_access = await verify_patient_access(patient_id, current_user, db)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have access to patient {patient_id}"
        )

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: '{ext}'. Allowed types: {list(ALLOWED_EXTENSIONS)}"
        )

    # Read content and check file size
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    job_id = uuid.uuid4()
    safe_filename = os.path.basename(file.filename).replace(" ", "_")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    saved_path = os.path.join(settings.UPLOAD_DIR, f"{job_id}_{safe_filename}")

    with open(saved_path, "wb") as f:
        f.write(content)

    # Create job in database
    job = ProcessingJob(
        id=job_id,
        uploaded_by=current_user.id,
        clinical_patient_id=patient_id,
        filename=file.filename,
        file_path=saved_path,
        status="pending",
        progress_message="Queued for processing"
    )
    db.add(job)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_UPLOAD",
        clinical_patient_id=patient_id,
        details={"filename": file.filename, "size_bytes": len(content), "job_id": str(job_id)},
        ip_address=request.client.host if request.client else None
    )
    db.add(audit)
    await db.commit()

    # Enqueue Celery task (or fallback to synchronous run if Celery not active)
    try:
        process_clinical_document.delay(str(job_id))
    except Exception as e:
        logger.warning(f"Celery dispatch failed: {e}. Running ingestion synchronously in background...")
        import asyncio
        from app.workers.ingestion_tasks import _process_document_async
        asyncio.create_task(_process_document_async(str(job_id)))

    return {
        "job_id": str(job_id),
        "filename": file.filename,
        "patient_id": patient_id,
        "status": "pending",
        "message": "Document uploaded successfully. Processing initiated."
    }

@router.get("/status/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        job_uuid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    stmt = select(ProcessingJob).where(ProcessingJob.id == job_uuid)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    has_access = await verify_patient_access(job.clinical_patient_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "job_id": str(job.id),
        "status": job.status,
        "progress_message": job.progress_message,
        "filename": job.filename,
        "patient_id": job.clinical_patient_id,
        "chunks_indexed": job.chunks_indexed,
        "entities_extracted": job.entities_extracted,
        "nodes_created": job.nodes_created,
        "relationships_created": job.relationships_created,
        "error_message": job.error_message,
        "created_at": job.created_at,
        "updated_at": job.updated_at
    }

@router.get("/patient/{patient_id}")
async def list_patient_documents(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    has_access = await verify_patient_access(patient_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Forbidden")

    stmt = select(ProcessingJob).where(
        ProcessingJob.clinical_patient_id == patient_id
    ).order_by(desc(ProcessingJob.created_at))
    
    result = await db.execute(stmt)
    jobs = result.scalars().all()

    return [
        {
            "job_id": str(j.id),
            "filename": j.filename,
            "status": j.status,
            "created_at": j.created_at,
            "chunks_indexed": j.chunks_indexed,
            "entities_extracted": j.entities_extracted,
            "error_message": j.error_message
        }
        for j in jobs
    ]
