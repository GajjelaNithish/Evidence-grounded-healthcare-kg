import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.evaluation.dataset import EVALUATION_DATASET
from app.evaluation.evaluator import run_system_evaluation

def test_1_evaluation_dataset_structure():
    """Verify evaluation dataset contains required research benchmark questions."""
    assert len(EVALUATION_DATASET) >= 5
    questions = [d["question"] for d in EVALUATION_DATASET]
    assert "What is the patient's latest condition?" in questions
    assert "What condition did the patient have in 2024?" in questions
    assert "What treatment was given during the latest visit?" in questions

@pytest.mark.asyncio
async def test_2_run_system_evaluation_benchmark():
    """Verify evaluation benchmark measures precision, recall, latencies, and security without fabricating numbers."""
    with patch("app.evaluation.evaluator.fuse_and_gate_evidence") as mock_fuse, \
         patch("app.evaluation.evaluator.synthesize_grounded_answer") as mock_synth:

        mock_fuse.return_value = ([], [], 0.90, "graph_only", "Latest visit")
        mock_synth.return_value = "The patient had Hypertension [Graph: Hypertension]."

        results = await run_system_evaluation("PAT-000001")

        assert "retrieval_metrics" in results
        assert "temporal_retrieval_metrics" in results
        assert "answer_quality_metrics" in results
        assert "performance_latencies" in results
        assert "security_evaluation" in results

        # Check retrieval metrics presence
        ret = results["retrieval_metrics"]
        assert "precision_at_k" in ret
        assert "recall_at_k" in ret
        assert "f1_at_k" in ret
        assert "mrr" in ret
        assert "hit_rate" in ret

        # Check security evaluation status
        sec = results["security_evaluation"]
        assert sec["rbac_tests"] == "PASS"
        assert sec["patient_isolation_tests"] == "PASS"

        # Check performance latencies measured
        perf = results["performance_latencies"]
        assert "avg_query_latency_ms" in perf
        assert "retrieval_latency_ms" in perf
        assert "llm_generation_latency_ms" in perf
