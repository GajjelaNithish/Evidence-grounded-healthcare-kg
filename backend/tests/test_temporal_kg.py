import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.query.temporal import extract_temporal_filter
from app.query.schemas import GraphEvidence
from app.query.fusion import retrieve_graph_evidence


def test_1_extract_temporal_filter_patterns():
    # Latest
    tag_latest, desc_latest = extract_temporal_filter("What is the patient's latest condition?")
    assert tag_latest == "LATEST"

    # In / During year
    tag_year, desc_year = extract_temporal_filter("What condition did the patient have in 2024?")
    assert tag_year == "YEAR:2024"

    # Before
    tag_before, desc_before = extract_temporal_filter("What treatment was given before 2025-01-01?")
    assert tag_before == "BEFORE:2025-01-01"

    # After
    tag_after, desc_after = extract_temporal_filter("What happened after 2024-01-10?")
    assert tag_after == "AFTER:2024-01-10"

    # As of
    tag_asof, desc_asof = extract_temporal_filter("What was the diagnosis as of 2024-05-18?")
    assert tag_asof == "AS_OF:2024-05-18"

    # Previous / Historical
    tag_prev, desc_prev = extract_temporal_filter("What medication was prescribed during the previous visit?")
    assert tag_prev == "PREVIOUS"


def test_2_latest_temporal_evidence_selection():
    evidence_list = [
        GraphEvidence(node_type="Encounter", name="Visit 1", relationship="HAD_ENCOUNTER", valid_from="2024-01-10"),
        GraphEvidence(node_type="Encounter", name="Visit 2", relationship="HAD_ENCOUNTER", valid_from="2024-08-15"),
        GraphEvidence(node_type="Encounter", name="Visit 3", relationship="HAD_ENCOUNTER", valid_from="2025-02-04"),
    ]

    # Sort and filter latest
    dated = [e for e in evidence_list if e.valid_from]
    dated.sort(key=lambda x: x.valid_from, reverse=True)
    latest_date = dated[0].valid_from
    latest_items = [e for e in evidence_list if e.valid_from == latest_date]

    assert len(latest_items) == 1
    assert latest_items[0].valid_from == "2025-02-04"
    assert latest_items[0].name == "Visit 3"


def test_3_before_after_date_filtering():
    evidence_list = [
        GraphEvidence(node_type="Encounter", name="Visit 1", relationship="HAD_ENCOUNTER", valid_from="2024-01-10"),
        GraphEvidence(node_type="Encounter", name="Visit 2", relationship="HAD_ENCOUNTER", valid_from="2024-08-15"),
        GraphEvidence(node_type="Encounter", name="Visit 3", relationship="HAD_ENCOUNTER", valid_from="2025-02-04"),
    ]

    # Before 2025-01-01
    before_items = [e for e in evidence_list if e.valid_from and e.valid_from < "2025-01-01"]
    assert len(before_items) == 2
    assert [e.name for e in before_items] == ["Visit 1", "Visit 2"]

    # After 2024-05-01
    after_items = [e for e in evidence_list if e.valid_from and e.valid_from > "2024-05-01"]
    assert len(after_items) == 2
    assert [e.name for e in after_items] == ["Visit 2", "Visit 3"]


def test_4_year_filtering():
    evidence_list = [
        GraphEvidence(node_type="Encounter", name="Visit 1", relationship="HAD_ENCOUNTER", valid_from="2024-01-10"),
        GraphEvidence(node_type="Encounter", name="Visit 2", relationship="HAD_ENCOUNTER", valid_from="2024-08-15"),
        GraphEvidence(node_type="Encounter", name="Visit 3", relationship="HAD_ENCOUNTER", valid_from="2025-02-04"),
    ]

    items_2024 = [e for e in evidence_list if e.valid_from and e.valid_from.startswith("2024")]
    assert len(items_2024) == 2
    assert [e.name for e in items_2024] == ["Visit 1", "Visit 2"]
