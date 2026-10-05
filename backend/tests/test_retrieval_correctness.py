import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.query.schemas import GraphEvidence, DocumentEvidence
from app.query.fusion import (
    score_and_filter_domain_relevance,
    fuse_and_gate_evidence,
    MEDICATION_KEYWORDS,
    CONDITION_KEYWORDS
)
from app.query.synthesizer import synthesize_grounded_answer

@pytest.fixture
def sample_mixed_evidence():
    return [
        GraphEvidence(
            node_type="Condition",
            name="Fractured Arm",
            relationship="HAS_CONDITION",
            details={"normalized_name": "fractured arm", "source": "EHR"},
            valid_from="2025-02-04",
            temporal_status="active",
            confidence=1.0,
            score=1.0
        ),
        GraphEvidence(
            node_type="Treatment",
            name="Aspirin 81mg Daily",
            relationship="RECEIVED_TREATMENT",
            details={"normalized_name": "aspirin", "treatment_type": "medication"},
            valid_from="2024-01-10",
            temporal_status="active",
            confidence=1.0,
            score=1.0
        ),
        GraphEvidence(
            node_type="Encounter",
            name="Clinical Visit (2024-05-18)",
            relationship="HAD_ENCOUNTER",
            details={
                "encounter_id": "ENC-000001",
                "visit_date": "2024-05-18",
                "condition": "Type 2 Diabetes",
                "diagnosis": "Type 2 Diabetes",
                "treatment": "Metformin 500mg",
                "medication": "Metformin 500mg twice daily"
            },
            valid_from="2024-05-18",
            temporal_status="encounter",
            confidence=1.0,
            score=1.0
        )
    ]

def test_1_medication_query_domain_filtering(sample_mixed_evidence):
    """Verify that a medication query prioritizes medication/treatment evidence and filters out unrelated conditions."""
    query = "What medications was this patient prescribed?"
    filtered, has_domain_filter = score_and_filter_domain_relevance(sample_mixed_evidence, query)
    
    assert has_domain_filter is True
    # Should include Aspirin and Metformin encounter, but exclude Fractured Arm
    names = [e.name for e in filtered]
    assert "Aspirin 81mg Daily" in names
    assert "Clinical Visit (2024-05-18)" in names
    assert "Fractured Arm" not in names

def test_2_condition_query_domain_filtering(sample_mixed_evidence):
    """Verify that a condition query prioritizes condition evidence."""
    query = "What conditions does the patient have?"
    filtered, has_domain_filter = score_and_filter_domain_relevance(sample_mixed_evidence, query)
    
    assert has_domain_filter is True
    names = [e.name for e in filtered]
    assert "Fractured Arm" in names
    assert "Clinical Visit (2024-05-18)" in names # has condition in details

def test_3_broad_query_keeps_all_evidence(sample_mixed_evidence):
    """Verify that a general/broad query retains all graph evidence without aggressive filtering."""
    query = "Give me a summary of patient records."
    filtered, has_domain_filter = score_and_filter_domain_relevance(sample_mixed_evidence, query)
    
    assert has_domain_filter is False
    assert len(filtered) == 3

def test_4_insufficient_evidence_when_requested_domain_missing():
    """Verify sufficiency gating returns insufficient_evidence when requested domain is not present in record."""
    only_fracture = [
        GraphEvidence(
            node_type="Condition",
            name="Fractured Arm",
            relationship="HAS_CONDITION",
            details={"normalized_name": "fractured arm"},
            valid_from="2025-02-04",
            temporal_status="active",
            confidence=1.0,
            score=1.0
        )
    ]
    query = "What medications was the patient prescribed?"
    
    with patch("app.query.fusion.retrieve_graph_evidence", return_value=only_fracture), \
         patch("app.query.fusion.retrieve_document_evidence", return_value=[]):
        
        graph_ev, doc_ev, fused_score, decision, temp_filter = fuse_and_gate_evidence("PAT-001", query)
        
        # Since patient has only a fracture and no medication record, request for medications should gate as insufficient_evidence
        assert decision == "insufficient_evidence"

@pytest.mark.asyncio
async def test_5_synthesizer_specificity_prompt():
    """Verify synthesizer passes formatted prompt and handles LLM synthesis grounding."""
    graph_ev = [
        GraphEvidence(
            node_type="Treatment",
            name="Aspirin 81mg",
            relationship="RECEIVED_TREATMENT",
            details={"treatment_type": "medication"},
            valid_from="2024-01-10",
            temporal_status="active",
            confidence=1.0,
            score=1.0
        )
    ]
    
    mock_genai_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = "The patient was prescribed:\n- Aspirin 81mg [Graph: Aspirin 81mg]\n\nReason: Prescribed for cardiovascular prophylaxis."
    mock_genai_client.aio.models.generate_content = AsyncMock(return_value=mock_resp)

    with patch("app.query.synthesizer.get_llm_client") as mock_get_llm:
        mock_llm_instance = MagicMock()
        mock_llm_instance.generate_response = AsyncMock(return_value=mock_resp.text)
        mock_get_llm.return_value = mock_llm_instance

        answer = await synthesize_grounded_answer(
            query="What medications was this patient prescribed?",
            patient_id="PAT-001",
            graph_evidence=graph_ev,
            doc_evidence=[],
            fused_score=0.90,
            routing_decision="graph_only"
        )

        assert "Aspirin 81mg" in answer
        assert "Reason:" in answer
