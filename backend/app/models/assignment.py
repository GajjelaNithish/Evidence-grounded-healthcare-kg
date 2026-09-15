import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class DoctorPatientAssignment(Base):
    __tablename__ = "doctor_patient_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    clinical_patient_id = Column(String(50), nullable=False, index=True)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("doctor_id", "clinical_patient_id", name="uq_doctor_patient_assignment"),
        Index("idx_assignments_doctor", "doctor_id"),
        Index("idx_assignments_patient", "clinical_patient_id"),
    )

    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])
