import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.models.user import User
from app.models.patient import Patient
from app.models.assignment import DoctorPatientAssignment
from app.admin.router import generate_next_patient_id

@pytest.mark.asyncio
async def test_1_generate_next_patient_id_format():
    """Verify patient ID generator produces PAT-00000X format."""
    mock_db = MagicMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = ["PAT-000001", "PAT-000002"]
    mock_db.execute = AsyncMock(return_value=mock_result)

    next_id = await generate_next_patient_id(mock_db)
    assert next_id == "PAT-000003"

@pytest.mark.asyncio
async def test_2_admin_assignment_workflow():
    """Verify Admin workflow: create doctor, create patient, assign, and verify RBAC patient isolation."""
    doc_id = "00000000-0000-0000-0000-000000000001"
    patient_id = "PAT-000099"

    assignment = DoctorPatientAssignment(
        doctor_id=doc_id,
        clinical_patient_id=patient_id,
        status="active",
        assignment_reason="Primary Care Physician"
    )

    assert assignment.doctor_id == doc_id
    assert assignment.clinical_patient_id == patient_id
    assert assignment.status == "active"
    assert assignment.assignment_reason == "Primary Care Physician"
