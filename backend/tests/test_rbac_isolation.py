import os
import sys
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.user import User
from app.models.assignment import DoctorPatientAssignment
from app.auth.dependencies import verify_patient_access


@pytest.mark.asyncio
async def test_1_admin_accesses_patient():
    admin_user = User(id=uuid.uuid4(), username="admin_user", role="admin")
    mock_db = AsyncMock()

    # Admin should have access to any patient ID
    has_access_1 = await verify_patient_access("PAT-000001", admin_user, mock_db)
    has_access_2 = await verify_patient_access("PAT-999999", admin_user, mock_db)
    assert has_access_1 is True
    assert has_access_2 is True


@pytest.mark.asyncio
async def test_2_doctor_accesses_assigned_patient():
    doc_id = uuid.uuid4()
    doctor_user = User(id=doc_id, username="dr_assigned", role="doctor")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_assignment = DoctorPatientAssignment(doctor_id=doc_id, clinical_patient_id="PAT-000001", status="active")
    mock_result.scalar_one_or_none.return_value = mock_assignment
    mock_db.execute.return_value = mock_result

    has_access = await verify_patient_access("PAT-000001", doctor_user, mock_db)
    assert has_access is True


@pytest.mark.asyncio
async def test_3_doctor_cannot_access_unassigned_patient():
    doc_id = uuid.uuid4()
    doctor_user = User(id=doc_id, username="dr_unassigned", role="doctor")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    has_access = await verify_patient_access("PAT-000002", doctor_user, mock_db)
    assert has_access is False


@pytest.mark.asyncio
async def test_4_patient_accesses_own_patient_record():
    patient_user = User(
        id=uuid.uuid4(),
        username="patient_user",
        role="patient",
        clinical_patient_id="PAT-000001"
    )
    mock_db = AsyncMock()

    has_access = await verify_patient_access("PAT-000001", patient_user, mock_db)
    assert has_access is True


@pytest.mark.asyncio
async def test_5_patient_cannot_access_another_patient():
    patient_user = User(
        id=uuid.uuid4(),
        username="patient_user",
        role="patient",
        clinical_patient_id="PAT-000001"
    )
    mock_db = AsyncMock()

    has_access = await verify_patient_access("PAT-000002", patient_user, mock_db)
    assert has_access is False


@pytest.mark.asyncio
async def test_6_changing_url_patient_id_does_not_bypass_authorization():
    # Simulates changing URL path parameter e.g., /kg/subgraph/PAT-000002 for doctor assigned only to PAT-000001
    doc_id = uuid.uuid4()
    doctor_user = User(id=doc_id, username="dr_test", role="doctor")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None  # No assignment for PAT-000002
    mock_db.execute.return_value = mock_result

    # Doctor attempts to tamper with URL path patient_id to PAT-000002
    tampered_url_patient_id = "PAT-000002"
    has_access = await verify_patient_access(tampered_url_patient_id, doctor_user, mock_db)
    assert has_access is False


@pytest.mark.asyncio
async def test_7_changing_api_patient_id_does_not_bypass_authorization():
    # Simulates altering payload body patient_id field in API POST request
    patient_user = User(
        id=uuid.uuid4(),
        username="patient_attacker",
        role="patient",
        clinical_patient_id="PAT-000001"
    )
    mock_db = AsyncMock()

    # Tampered API request body specifies target patient_id = PAT-000009
    payload_patient_id = "PAT-000009"
    has_access = await verify_patient_access(payload_patient_id, patient_user, mock_db)
    assert has_access is False


@pytest.mark.asyncio
async def test_8_document_retrieval_respects_patient_ownership():
    # Doctor B attempting to view documents of Patient 1 (assigned to Doctor A)
    doc_b_id = uuid.uuid4()
    doctor_b = User(id=doc_b_id, username="dr_b", role="doctor")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None  # Doctor B has no assignment for Patient 1
    mock_db.execute.return_value = mock_result

    has_access = await verify_patient_access("PAT-000001", doctor_b, mock_db)
    assert has_access is False


@pytest.mark.asyncio
async def test_9_qa_retrieval_respects_patient_ownership():
    # Patient 1 attempting to run Q&A query on Patient 2's record
    patient_1 = User(
        id=uuid.uuid4(),
        username="pat_1",
        role="patient",
        clinical_patient_id="PAT-000001"
    )
    mock_db = AsyncMock()

    has_access = await verify_patient_access("PAT-000002", patient_1, mock_db)
    assert has_access is False


@pytest.mark.asyncio
async def test_10_kg_retrieval_respects_patient_ownership():
    # Doctor B attempting to query KG subgraph/timeline/analytics for unassigned Patient 3
    doc_b_id = uuid.uuid4()
    doctor_b = User(id=doc_b_id, username="dr_b", role="doctor")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None  # Not assigned to Patient 3
    mock_db.execute.return_value = mock_result

    subgraph_access = await verify_patient_access("PAT-000003", doctor_b, mock_db)
    timeline_access = await verify_patient_access("PAT-000003", doctor_b, mock_db)
    analytics_access = await verify_patient_access("PAT-000003", doctor_b, mock_db)

    assert subgraph_access is False
    assert timeline_access is False
    assert analytics_access is False
