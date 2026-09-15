import uuid
from sqlalchemy import Column, String, Boolean, DateTime, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    clinical_patient_id = Column(String(50), unique=True, nullable=True, index=True)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'doctor', 'patient')", name="check_user_role"),
    )

    # Relationships
    assignments = relationship("DoctorPatientAssignment", back_populates="doctor", foreign_keys="DoctorPatientAssignment.doctor_id")
    jobs = relationship("ProcessingJob", back_populates="uploader", foreign_keys="ProcessingJob.uploaded_by")
    audit_logs = relationship("AuditLog", back_populates="user", foreign_keys="AuditLog.user_id")
