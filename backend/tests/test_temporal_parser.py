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
    """
    'historical' / 'resolved' maps to PREVIOUS tag in the current
    tag-based implementation; fusion.py interprets PREVIOUS to filter
    non-latest / resolved records.
    """
    clause, desc = extract_temporal_filter("List all historical and resolved treatments.")
    assert clause == "PREVIOUS"
    assert "Previous" in desc or "Historical" in desc

def test_temporal_year_extraction():
    """
    Year queries return compact YEAR:<yyyy> tag.
    The date-range expansion (startswith filter) happens inside fusion.py.
    """
    clause, desc = extract_temporal_filter("What was the diagnosis in 2024?")
    assert clause == "YEAR:2024"
    assert "2024" in desc

def test_temporal_past_30_days():
    """
    'past 30 days' returns AFTER:<cutoff-date> tag (not a raw SQL clause).
    """
    clause, desc = extract_temporal_filter("Any admissions during the past 30 days?")
    assert clause is not None and clause.startswith("AFTER:")
    assert "30" in desc or "Past" in desc

def test_temporal_none():
    clause, desc = extract_temporal_filter("What treatments did the patient receive?")
    assert clause is None
    assert desc is None
