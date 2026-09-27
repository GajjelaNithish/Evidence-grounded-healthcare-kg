import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app.documents.entity_extractor import extract_clinical_entities

def test_extract_condition_regex():
    text = "Patient was diagnosed with Hypertension and history of Type 2 Diabetes."
    entities = extract_clinical_entities(text)
    names = [e["normalized_name"] for e in entities]
    assert any("hypertension" in n for n in names)
    assert any("diabetes" in n for n in names)

def test_extract_treatment_regex():
    text = "The patient was prescribed Metformin 500mg and underwent Angioplasty."
    entities = extract_clinical_entities(text)
    names = [e["normalized_name"] for e in entities]
    assert any("metformin" in n for n in names) or any("angioplasty" in n for n in names)
