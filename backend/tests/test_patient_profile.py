import os
import sys
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.patient import Patient
from app.models.user import User
from app.admin.router import generate_next_patient_id


@pytest.mark.asyncio
async def test_1_deterministic_patient_id_generator():
    mock_db = AsyncMock()
    mock_res = MagicMock()
    # Simulates existing patient IDs PAT-000001 and PAT-000002
    mock_res.scalars().all.return_value = ["PAT-000001", "PAT-000002"]
    mock_db.execute.return_value = mock_res

    next_pid = await generate_next_patient_id(mock_db)
    assert next_pid == "PAT-000003"


@pytest.mark.asyncio
async def test_2_first_patient_id_generator():
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars().all.return_value = []
    mock_db.execute.return_value = mock_res

    next_pid = await generate_next_patient_id(mock_db)
    assert next_pid == "PAT-000001"


@pytest.mark.asyncio
async def test_3_patient_profile_model_creation():
    patient = Patient(
        id=uuid.uuid4(),
        patient_id="PAT-000001",
        name="Rajesh Kumar",
        age=45,
        gender="Male",
        address="Bangalore, India",
        contact="+91-9876543210"
    )
    assert patient.patient_id == "PAT-000001"
    assert patient.name == "Rajesh Kumar"
    assert patient.user_id is None  # Patient profile independent of User account


@pytest.mark.asyncio
async def test_4_patient_linked_to_user_account():
    user_id = uuid.uuid4()
    patient = Patient(
        id=uuid.uuid4(),
        patient_id="PAT-000002",
        name="Anita Sharma",
        age=38,
        gender="Female",
        user_id=user_id
    )
    user = User(
        id=user_id,
        username="anita_s",
        email="anita@hospital.org",
        role="patient",
        clinical_patient_id="PAT-000002"
    )
    assert patient.user_id == user.id
    assert user.clinical_patient_id == patient.patient_id
