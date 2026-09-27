import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app.query.temporal import extract_temporal_filter

def test_temporal_active_filter():
    clause, desc = extract_temporal_filter("What are the active conditions currently?")
    assert clause == "AND (r.valid_to IS NULL)"
    assert "Active / Current" in desc

def test_temporal_historical_filter():
    clause, desc = extract_temporal_filter("List all historical and resolved treatments.")
    assert clause == "AND (r.valid_to IS NOT NULL)"
    assert "Historical / Resolved" in desc

def test_temporal_year_extraction():
    clause, desc = extract_temporal_filter("What was the diagnosis in 2024?")
    assert "2024-01-01" in clause
    assert "2024-12-31" in clause
    assert desc == "Year 2024"

def test_temporal_past_30_days():
    clause, desc = extract_temporal_filter("Any admissions during the past 30 days?")
    assert "valid_from >=" in clause or "admission_date >=" in clause
    assert desc == "Past 30 days"

def test_temporal_none():
    clause, desc = extract_temporal_filter("What treatments did the patient receive?")
    assert clause is None
    assert desc is None
