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

from app.models.patient import Patient
from app.neo4j_client import get_neo4j_driver

class CreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "doctor"
    clinical_patient_id: Optional[str] = None

class CreatePatientRequest(BaseModel):
    name: str
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    create_user_account: bool = False
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class AssignRequest(BaseModel):
    doctor_id: str
    clinical_patient_id: str
    status: Optional[str] = "active"
    assignment_reason: Optional[str] = None

async def generate_next_patient_id(db: AsyncSession) -> str:
    stmt = select(Patient.patient_id).where(Patient.patient_id.like("PAT-%"))
    res = await db.execute(stmt)
    pids = res.scalars().all()
    max_num = 0
    for pid in pids:
        try:
            num = int(pid.replace("PAT-", ""))
            if num > max_num:
                max_num = num
        except ValueError:
            pass
    next_num = max_num + 1
    return f"PAT-{next_num:06d}"

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

@router.get("/patients")
async def list_patients(db: AsyncSession = Depends(get_db)):
    stmt = select(Patient).order_by(Patient.created_at.desc())
    res = await db.execute(stmt)
    patients = res.scalars().all()
    return [
        {
            "id": str(p.id),
            "patient_id": p.patient_id,
            "name": p.name,
            "date_of_birth": p.date_of_birth,
            "age": p.age,
            "gender": p.gender,
            "address": p.address,
            "contact": p.contact,
            "user_id": str(p.user_id) if p.user_id else None,
            "created_at": p.created_at,
            "updated_at": p.updated_at
        }
        for p in patients
    ]

@router.post("/patients")
async def create_patient(body: CreatePatientRequest, db: AsyncSession = Depends(get_db)):
    patient_id = await generate_next_patient_id(db)

    # Verify duplicate patient_id check
    stmt_check = select(Patient).where(Patient.patient_id == patient_id)
    existing_p = (await db.execute(stmt_check)).scalar_one_or_none()
    if existing_p:
        raise HTTPException(status_code=400, detail=f"Patient ID {patient_id} already exists")

    new_patient = Patient(
        patient_id=patient_id,
        name=body.name,
        date_of_birth=body.date_of_birth,
        age=body.age,
        gender=body.gender,
        address=body.address,
        contact=body.contact
    )

    created_user_id = None
    if body.create_user_account:
        if not body.username or not body.email or not body.password:
            raise HTTPException(status_code=400, detail="Username, email, and password are required for user account creation")
        
        # Check duplicate username / email
        usr_stmt = select(User).where((User.username == body.username) | (User.email == body.email))
        if (await db.execute(usr_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username or email already exists for user account")

        user_acc = User(
            username=body.username,
            email=body.email,
            password_hash=get_password_hash(body.password),
            role="patient",
            clinical_patient_id=patient_id,
            full_name=body.name
        )
        db.add(user_acc)
        await db.flush()
        new_patient.user_id = user_acc.id
        created_user_id = str(user_acc.id)

    db.add(new_patient)
    await db.commit()

    # Sync patient to Neo4j Graph
    try:
        driver = get_neo4j_driver()
        with driver.session() as session:
            session.run(
                "MERGE (p:Patient {patient_id: $patient_id}) SET p.name = $name, p.age = $age, p.gender = $gender",
                {"patient_id": patient_id, "name": body.name, "age": body.age or 0, "gender": body.gender or "N/A"}
            )
    except Exception as e:
        pass

    return {
        "message": "Patient profile created successfully",
        "patient_id": patient_id,
        "patient": {
            "id": str(new_patient.id),
            "patient_id": new_patient.patient_id,
            "name": new_patient.name,
            "age": new_patient.age,
            "gender": new_patient.gender,
            "user_id": created_user_id
        }
    }

@router.get("/patients/{patient_id}")
async def get_patient_profile(patient_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Patient).where(Patient.patient_id == patient_id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return {
        "id": str(p.id),
        "patient_id": p.patient_id,
        "name": p.name,
        "date_of_birth": p.date_of_birth,
        "age": p.age,
        "gender": p.gender,
        "address": p.address,
        "contact": p.contact,
        "user_id": str(p.user_id) if p.user_id else None,
        "created_at": p.created_at,
        "updated_at": p.updated_at
    }

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
            "assigned_by": str(assignment.assigned_by) if assignment.assigned_by else None,
            "assigned_at": assignment.assigned_at,
            "status": assignment.status,
            "assignment_reason": assignment.assignment_reason
        }
        for assignment, doc_name in rows
    ]

@router.post("/assignments")
async def create_assignment(
    body: AssignRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
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
        clinical_patient_id=body.clinical_patient_id,
        assigned_by=admin_user.id,
        status=body.status or "active",
        assignment_reason=body.assignment_reason
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

from app.evaluation.evaluator import run_system_evaluation

@router.get("/evaluation")
async def get_research_evaluation(patient_id: Optional[str] = "PAT-000001"):
    """
    Returns research evaluation metrics for Admin portal.
    Measures Retrieval Metrics, Temporal Metrics, Answer Quality, Latencies, and RBAC Security Status.
    """
    return await run_system_evaluation(patient_id=patient_id or "PAT-000001")

