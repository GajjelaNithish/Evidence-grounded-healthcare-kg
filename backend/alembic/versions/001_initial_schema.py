"""Initial schema with users, assignments, jobs, and audit_log

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-08 08:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("clinical_patient_id", sa.String(length=50), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role IN ('admin', 'doctor', 'patient')", name="check_user_role")
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_clinical_patient_id", "users", ["clinical_patient_id"], unique=True)

    # 2. doctor_patient_assignments table
    op.create_table(
        "doctor_patient_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("clinical_patient_id", sa.String(length=50), nullable=False),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("doctor_id", "clinical_patient_id", name="uq_doctor_patient_assignment")
    )
    op.create_index("idx_assignments_doctor", "doctor_patient_assignments", ["doctor_id"])
    op.create_index("idx_assignments_patient", "doctor_patient_assignments", ["clinical_patient_id"])

    # 3. processing_jobs table
    op.create_table(
        "processing_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("clinical_patient_id", sa.String(length=50), nullable=False),
        sa.Column("filename", sa.String(length=500), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("progress_message", sa.String(length=500), server_default=sa.text("'Waiting in queue...'"), nullable=True),
        sa.Column("entities_extracted", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("nodes_created", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("relationships_created", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("chunks_indexed", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'processing', 'completed', 'failed')", name="check_job_status")
    )
    op.create_index("idx_jobs_patient", "processing_jobs", ["clinical_patient_id"])
    op.create_index("idx_jobs_status", "processing_jobs", ["status"])

    # 4. audit_log table
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("clinical_patient_id", sa.String(length=50), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index("idx_audit_user", "audit_log", ["user_id"])
    op.create_index("idx_audit_patient", "audit_log", ["clinical_patient_id"])
    op.create_index("idx_audit_created", "audit_log", [sa.text("created_at DESC")])

def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("processing_jobs")
    op.drop_table("doctor_patient_assignments")
    op.drop_table("users")
