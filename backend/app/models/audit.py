import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False)
    clinical_patient_id = Column(String(50), nullable=True, index=True)
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_patient", "clinical_patient_id"),
        Index("idx_audit_created", created_at.desc()),
    )

    user = relationship("User", foreign_keys=[user_id], back_populates="audit_logs")
