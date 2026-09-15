import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    clinical_patient_id = Column(String(50), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    file_path = Column(String(500), nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    progress_message = Column(String(500), default="Waiting in queue...", nullable=True)
    entities_extracted = Column(Integer, default=0, nullable=False)
    nodes_created = Column(Integer, default=0, nullable=False)
    relationships_created = Column(Integer, default=0, nullable=False)
    chunks_indexed = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'processing', 'completed', 'failed')", name="check_job_status"),
        Index("idx_jobs_patient", "clinical_patient_id"),
        Index("idx_jobs_status", "status"),
    )

    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="jobs")
