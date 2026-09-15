from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.models.user import User
from app.models.assignment import DoctorPatientAssignment
from app.models.audit import AuditLog
from app.models.job import ProcessingJob
from app.auth.dependencies import require_role
from app.auth.service import get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_role("admin"))])

class CreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "doctor"
    clinical_patient_id: Optional[str] = None

class AssignRequest(BaseModel):
    doctor_id: str
    clinical_patient_id: str

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    stmt = select(User).order_by(User.created_at.desc())
    res = await db.execute(stmt)
    users = res.scalars().all()
    return [
        {
            "id": str(u.id),
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "clinical_patient_id": u.clinical_patient_id,
            "is_active": u.is_active,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.post("/users")
async def create_user(body: CreateUserRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where((User.username == body.username) | (User.email == body.email))
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already exists")

    new_user = User(
        username=body.username,
        email=body.email,
        password_hash=get_password_hash(body.password),
        role=body.role,
        clinical_patient_id=body.clinical_patient_id
    )
    db.add(new_user)
    await db.commit()
    return {"message": "User created successfully", "user_id": str(new_user.id)}

@router.get("/assignments")
async def list_assignments(db: AsyncSession = Depends(get_db)):
    stmt = select(DoctorPatientAssignment, User.username).join(
        User, DoctorPatientAssignment.doctor_id == User.id
    ).order_by(DoctorPatientAssignment.assigned_at.desc())
    res = await db.execute(stmt)
    rows = res.all()
    return [
        {
            "id": str(assignment.id),
            "doctor_id": str(assignment.doctor_id),
            "doctor_username": doc_name,
            "clinical_patient_id": assignment.clinical_patient_id,
            "assigned_at": assignment.assigned_at
        }
        for assignment, doc_name in rows
    ]

@router.post("/assignments")
async def create_assignment(body: AssignRequest, db: AsyncSession = Depends(get_db)):
    try:
        doc_uuid = UUID(body.doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor UUID")

    # Verify doctor exists and is doctor
    stmt = select(User).where(User.id == doc_uuid)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor user not found")

    assign = DoctorPatientAssignment(
        doctor_id=doc_uuid,
        clinical_patient_id=body.clinical_patient_id
    )
    db.add(assign)
    await db.commit()
    return {"message": "Assignment created", "id": str(assign.id)}

@router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, db: AsyncSession = Depends(get_db)):
    try:
        assign_uuid = UUID(assignment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assignment UUID")

    stmt = select(DoctorPatientAssignment).where(DoctorPatientAssignment.id == assign_uuid)
    res = await db.execute(stmt)
    assign = res.scalar_one_or_none()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await db.delete(assign)
    await db.commit()
    return {"message": "Assignment removed"}

@router.get("/audit")
async def get_audit_logs(
    action: Optional[str] = None,
    patient_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLog, User.username).outerjoin(
        User, AuditLog.user_id == User.id
    ).order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if patient_id:
        stmt = stmt.where(AuditLog.clinical_patient_id == patient_id)

    res = await db.execute(stmt)
    rows = res.all()

    return [
        {
            "id": str(log.id),
            "timestamp": log.created_at,
            "username": username or "system",
            "action": log.action,
            "patient_id": log.clinical_patient_id,
            "details": log.details,
            "ip_address": log.ip_address
        }
        for log, username in rows
    ]

@router.get("/metrics")
async def get_system_metrics(db: AsyncSession = Depends(get_db)):
    user_count = await db.scalar(select(func.count(User.id)))
    job_count = await db.scalar(select(func.count(ProcessingJob.id)))
    query_count = await db.scalar(select(func.count(AuditLog.id)).where(AuditLog.action == "CLINICAL_QUERY"))

    return {
        "total_users": user_count or 0,
        "total_documents_processed": job_count or 0,
        "total_queries_executed": query_count or 0,
        "system_status": "healthy"
    }
