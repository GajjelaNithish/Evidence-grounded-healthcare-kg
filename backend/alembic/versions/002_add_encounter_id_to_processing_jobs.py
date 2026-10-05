"""Add encounter_id to processing_jobs for document provenance

Revision ID: 002_add_encounter_id
Revises: 001_initial_schema
Create Date: 2026-09-30 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_add_encounter_id"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add optional encounter_id to processing_jobs
    op.add_column(
        "processing_jobs",
        sa.Column("encounter_id", sa.String(length=50), nullable=True)
    )
    op.create_index("idx_jobs_encounter", "processing_jobs", ["encounter_id"])


def downgrade() -> None:
    op.drop_index("idx_jobs_encounter", table_name="processing_jobs")
    op.drop_column("processing_jobs", "encounter_id")
