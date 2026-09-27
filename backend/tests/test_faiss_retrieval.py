import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import numpy as np
import tempfile
import shutil
from app.faiss_manager import add_chunks_to_patient_index, search_patient_index
from app.embedding_model import encode_text

def test_faiss_patient_namespace_isolation(tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.FAISS_DIR", str(tmp_path))

    # Add chunk for Patient 999
    text_999 = "Patient 999 was diagnosed with acute appendicitis."
    emb_999 = encode_text(text_999).reshape(1, -1)
    add_chunks_to_patient_index("999", [{"text": text_999, "source_filename": "notes999.txt", "chunk_index": 0}], emb_999)

    # Add chunk for Patient 888
    text_888 = "Patient 888 was treated for myocardial infarction."
    emb_888 = encode_text(text_888).reshape(1, -1)
    add_chunks_to_patient_index("888", [{"text": text_888, "source_filename": "notes888.txt", "chunk_index": 0}], emb_888)

    # Search Patient 999 index with 999 query
    q_emb = encode_text("appendicitis")
    res_999 = search_patient_index("999", q_emb, top_k=2)
    assert len(res_999) == 1
    assert "appendicitis" in res_999[0]["text"]
    assert res_999[0]["score"] > 0.5

    # Verify Patient 888 data does NOT leak into Patient 999
    res_cross = search_patient_index("999", encode_text("myocardial infarction"), top_k=2)
    assert not any("888" in r.get("text", "") for r in res_cross)

    # Search non-existent patient returns empty list
    res_empty = search_patient_index("non_existent", q_emb, top_k=2)
    assert res_empty == []
