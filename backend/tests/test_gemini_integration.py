import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from app.config import settings
from app.llm.client import LLMClient
from app.query.synthesizer import synthesize_grounded_answer
from app.query.schemas import GraphEvidence, DocumentEvidence

@pytest.mark.asyncio
async def test_llm_client_initialization():
    client = LLMClient()
    assert client.backend in ["gemini", "ollama"]
    assert client.gemini_model == "gemini-2.5-flash"

@pytest.mark.asyncio
async def test_gemini_missing_key_graceful_handling():
    with patch("app.config.settings.GEMINI_API_KEY", ""):
        client = LLMClient()
        client._gemini_client = None
        resp = await client.generate_response("Test clinical prompt")
        assert "GEMINI_API_KEY is not configured" in resp

@pytest.mark.asyncio
async def test_gemini_mocked_synthesis():
    mock_genai_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Patient 1 was treated for Heart Disease with Angioplasty [Graph: Heart Disease]."
    
    mock_genai_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

    client = LLMClient()
    client._gemini_client = mock_genai_client

    resp = await client.generate_response("Summarize clinical findings")
    assert resp == "Patient 1 was treated for Heart Disease with Angioplasty [Graph: Heart Disease]."
    mock_genai_client.aio.models.generate_content.assert_called_once()

@pytest.mark.asyncio
async def test_grounded_answer_synthesizer_evidence_gating():
    # Test insufficient evidence threshold
    answer = await synthesize_grounded_answer(
        query="What is the patient's blood type?",
        patient_id="1",
        graph_evidence=[],
        doc_evidence=[],
        fused_score=0.20,
        routing_decision="insufficient_evidence"
    )
    assert "Insufficient Evidence Notice" in answer
    assert "confidence score: 0.20" in answer

@pytest.mark.asyncio
async def test_grounded_answer_synthesizer_success():
    graph_ev = [
        GraphEvidence(
            node_type="Condition",
            name="Heart Disease",
            relationship="HAS_CONDITION",
            details={"normalized_name": "heart disease", "source": "primary_dataset"},
            valid_from="2024-02-07",
            valid_to="2024-02-12",
            temporal_status="resolved",
            confidence=1.0,
            score=1.0
        ),
        GraphEvidence(
            node_type="Treatment",
            name="Angioplasty",
            relationship="RECEIVED_TREATMENT",
            details={"normalized_name": "angioplasty", "treatment_type": "procedure"},
            valid_from="2024-02-07",
            valid_to="2024-02-12",
            temporal_status="completed",
            confidence=1.0,
            score=1.0
        )
    ]
    doc_ev = [
        DocumentEvidence(
            chunk_text="Patient admitted on 07 Feb 2024 for Angioplasty. Recovered successfully.",
            source_filename="discharge_summary.pdf",
            chunk_index=0,
            score=0.88
        )
    ]

    mock_genai_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = "Patient was admitted on 07 Feb 2024 for Heart Disease and received Angioplasty [Graph: Heart Disease] [Doc: discharge_summary.pdf, Chunk: 0]."
    mock_genai_client.aio.models.generate_content = AsyncMock(return_value=mock_resp)

    with patch("app.query.synthesizer.get_llm_client") as mock_get_llm:
        mock_llm_instance = LLMClient()
        mock_llm_instance._gemini_client = mock_genai_client
        mock_get_llm.return_value = mock_llm_instance

        answer = await synthesize_grounded_answer(
            query="What treatment did the patient receive?",
            patient_id="1",
            graph_evidence=graph_ev,
            doc_evidence=doc_ev,
            fused_score=0.92,
            routing_decision="hybrid"
        )

        assert "Angioplasty" in answer
        assert "[Graph: Heart Disease]" in answer

@pytest.mark.asyncio
async def test_synthesizer_error_fallback():
    # If LLM throws error, evidence must not be fabricated
    mock_genai_client = MagicMock()
    mock_genai_client.aio.models.generate_content = AsyncMock(side_effect=Exception("API quota exceeded"))

    with patch("app.query.synthesizer.get_llm_client") as mock_get_llm:
        mock_llm_instance = LLMClient()
        mock_llm_instance._gemini_client = mock_genai_client
        mock_get_llm.return_value = mock_llm_instance

        answer = await synthesize_grounded_answer(
            query="What is the treatment?",
            patient_id="1",
            graph_evidence=[],
            doc_evidence=[],
            fused_score=0.80,
            routing_decision="graph_only"
        )

        assert "Clinical synthesis error" in answer
        assert "evidence remain available below" in answer
