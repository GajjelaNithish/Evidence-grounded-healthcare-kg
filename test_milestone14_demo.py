"""
test_milestone14_demo.py — Milestone 14: Research Verification + Paper Data

Runs the system research evaluation suite and collects empirical measured metrics:
1. Dataset & Benchmark Statistics (Patients, Encounters, Evaluation Question Set)
2. Retrieval Metrics (Precision@K, Recall@K, F1@K, MRR, Hit Rate)
3. Temporal Retrieval Metrics (Latest, Historical, Relative Visit Accuracy)
4. Answer Quality Metrics (Answer Accuracy, Evidence Groundedness, Source Attribution)
5. Measured System Latencies (Retrieval MS, Generation MS, P95 Query MS)
6. Security Verification Results (RBAC, Patient Isolation, Unauthorized Access)

Run with:
    python test_milestone14_demo.py
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"
ADMIN_CREDS = {"username": "admin", "password": "Admin123!"}

def login(creds):
    req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=json.dumps(creds).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))["access_token"]

def get_evaluation(token, patient_id="PAT-000001"):
    req = urllib.request.Request(
        f"{BASE_URL}/admin/evaluation?patient_id={patient_id}",
        headers={"Authorization": f"Bearer {token}"},
        method="GET"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 75)
    print("MILESTONE 14 — RESEARCH VERIFICATION & PAPER DATA REPORTING")
    print("=" * 75)

    try:
        token = login(ADMIN_CREDS)
        data = get_evaluation(token, patient_id="PAT-000001")

        print("\n--- 1. BENCHMARK & DATASET STATISTICS ---")
        print(f"  Target Patient ID:              {data.get('evaluated_patient_id')}")
        print(f"  Benchmark Questions Evaluated:  {data.get('sample_size')}")
        print(f"  Timestamp of Run:               {data.get('timestamp')}")

        rm = data.get("retrieval_metrics", {})
        print("\n--- 2. RETRIEVAL METRICS (MEASURED) ---")
        print(f"  Precision@K:                    {rm.get('precision_at_k')}")
        print(f"  Recall@K:                       {rm.get('recall_at_k')}")
        print(f"  F1@K:                           {rm.get('f1_at_k')}")
        print(f"  Mean Reciprocal Rank (MRR):     {rm.get('mrr')}")
        print(f"  Hit Rate:                       {rm.get('hit_rate')}")

        trm = data.get("temporal_retrieval_metrics", {})
        print("\n--- 3. TEMPORAL RETRIEVAL ACCURACY (MEASURED) ---")
        print(f"  Latest Event Retrieval Acc:     {trm.get('latest_event_retrieval_accuracy')}")
        print(f"  As-Of-Date Retrieval Acc:       {trm.get('as_of_date_retrieval_accuracy')}")
        print(f"  Historical Retrieval Acc:       {trm.get('historical_retrieval_accuracy')}")
        print(f"  Before/After Retrieval Acc:     {trm.get('before_after_retrieval_accuracy')}")
        print(f"  Temporal Ordering Correctness:  {trm.get('temporal_ordering_correctness')}")
        print(f"  Overall Temporal Retrieval Acc: {trm.get('overall_temporal_retrieval_accuracy')}")

        aqm = data.get("answer_quality_metrics", {})
        print("\n--- 4. ANSWER QUALITY & GROUNDEDNESS (MEASURED) ---")
        print(f"  Answer Accuracy:                {aqm.get('answer_accuracy')}")
        print(f"  Answer Correctness:             {aqm.get('answer_correctness')}")
        print(f"  Evidence Groundedness:          {aqm.get('evidence_groundedness')}")
        print(f"  Source Attribution Accuracy:    {aqm.get('source_attribution_accuracy')}")

        lat = data.get("performance_latencies", {})
        print("\n--- 5. SYSTEM LATENCIES (MEASURED IN MS) ---")
        print(f"  Average Query Latency:          {lat.get('avg_query_latency_ms')} ms")
        print(f"  Median Query Latency:           {lat.get('median_query_latency_ms')} ms")
        print(f"  P95 Query Latency:              {lat.get('p95_query_latency_ms')} ms")
        print(f"  Retrieval Step Latency:         {lat.get('retrieval_latency_ms')} ms")
        print(f"  LLM Generation Latency:         {lat.get('llm_generation_latency_ms')} ms")
        print(f"  Document Processing Latency:    {lat.get('document_processing_latency_ms')} ms")

        sec = data.get("security_evaluation", {})
        print("\n--- 6. SECURITY & ISOLATION EVALUATION ---")
        print(f"  RBAC Server Enforce Tests:      {sec.get('rbac_tests')}")
        print(f"  Patient Data Isolation Tests:   {sec.get('patient_isolation_tests')}")
        print(f"  Unauthorized Access Tests:      {sec.get('unauthorized_access_tests')}")

        print("\n" + "=" * 75)
        print("  MILESTONE 14 RESEARCH EVALUATION SUCCESSFULLY COLLECTED!")
        print("=" * 75)

    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"[FAIL] HTTP Error {e.code}: {body}")
        sys.exit(1)
    except Exception as e:
        print(f"[FAIL] Evaluation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
