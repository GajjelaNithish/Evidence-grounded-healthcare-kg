import os
import sys
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.encounter import Encounter
from app.models.user import User
from app.encounters.router import generate_next_encounter_id


@pytest.mark.asyncio
async def test_1_deterministic_encounter_id_generator():
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars().all.return_value = ["ENC-000001", "ENC-000002"]
    mock_db.execute.return_value = mock_res

    next_eid = await generate_next_encounter_id(mock_db)
    assert next_eid == "ENC-000003"


@pytest.mark.asyncio
async def test_2_first_encounter_id_generator():
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars().all.return_value = []
    mock_db.execute.return_value = mock_res

    next_eid = await generate_next_encounter_id(mock_db)
    assert next_eid == "ENC-000001"


@pytest.mark.asyncio
async def test_3_encounter_model_fields():
    enc = Encounter(
        id=uuid.uuid4(),
        encounter_id="ENC-000001",
        patient_id="PAT-000003",
        visit_date="2024-01-10",
        reason_for_visit="Routine checkup",
        condition="Hypertension",
        diagnosis="Essential Hypertension",
        medication="Medication A"
    )
    assert enc.encounter_id == "ENC-000001"
    assert enc.patient_id == "PAT-000003"
    assert enc.visit_date == "2024-01-10"
    assert enc.condition == "Hypertension"
    assert enc.medication == "Medication A"


@pytest.mark.asyncio
async def test_4_longitudinal_encounters_temporal_sorting():
    enc1 = Encounter(
        id=uuid.uuid4(),
        encounter_id="ENC-000001",
        patient_id="PAT-000003",
        visit_date="2024-01-10",
        condition="Hypertension",
        medication="Medication A"
    )
    enc2 = Encounter(
        id=uuid.uuid4(),
        encounter_id="ENC-000002",
        patient_id="PAT-000003",
        visit_date="2024-08-15",
        condition="Diabetes",
        medication="Medication B"
    )
    enc3 = Encounter(
        id=uuid.uuid4(),
        encounter_id="ENC-000003",
        patient_id="PAT-000003",
        visit_date="2025-02-04",
        condition="Fractured Arm",
        treatment="X-Ray + Splint",
        medication="Medication C"
    )

    all_encounters = [enc1, enc2, enc3]
    # Sort latest first (reverse chronological)
    sorted_encounters = sorted(all_encounters, key=lambda e: e.visit_date, reverse=True)

    assert len(sorted_encounters) == 3
    assert sorted_encounters[0].encounter_id == "ENC-000003"  # 2025-02-04 (Latest)
    assert sorted_encounters[1].encounter_id == "ENC-000002"  # 2024-08-15 (Previous)
    assert sorted_encounters[2].encounter_id == "ENC-000001"  # 2024-01-10 (Older)

    # Verify previous encounters were not destroyed
    assert sorted_encounters[2].condition == "Hypertension"
    assert sorted_encounters[1].condition == "Diabetes"
    assert sorted_encounters[0].condition == "Fractured Arm"
