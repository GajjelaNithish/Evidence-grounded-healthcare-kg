import uuid
from sqlalchemy import Column, String, Date, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(String(50), unique=True, nullable=False, index=True)
    patient_id = Column(String(50), nullable=False, index=True)
    visit_date = Column(String(20), nullable=False, index=True)
    reason_for_visit = Column(String(500), nullable=True)
    condition = Column(String(255), nullable=True)
    diagnosis = Column(String(500), nullable=True)
    treatment = Column(String(500), nullable=True)
    medication = Column(String(500), nullable=True)
    clinical_notes = Column(Text, nullable=True)
    admission_date = Column(String(20), nullable=True)
    discharge_date = Column(String(20), nullable=True)
    outcome = Column(String(255), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_encounters_patient", "patient_id"),
        Index("idx_encounters_visit_date", "visit_date"),
        Index("idx_encounters_created_by", "created_by"),
    )

    creator = relationship("User", foreign_keys=[created_by])
