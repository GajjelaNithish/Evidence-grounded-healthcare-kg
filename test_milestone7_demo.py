import urllib.request
import json
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

def api_post(endpoint, data, token=None):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {})
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as e:
        return {"error": e.reason, "detail": e.read().decode("utf-8")}, e.code

def api_get(endpoint, token=None):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {})
        },
        method="GET"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as e:
        return {"error": e.reason, "detail": e.read().decode("utf-8")}, e.code

def run_demo():
    print("==================================================")
    print("  MILESTONE 7 — EVALUATION & RESEARCH MODULE DEMO")
    print("==================================================")

    # 1. Login as Admin
    admin_login, code = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    if code != 200:
        print(f"Admin login failed: {admin_login}")
        return
    admin_token = admin_login["access_token"]
    print(f"[+] Admin Login Successful (HTTP {code})")

    # 2. Test Admin Evaluation API Endpoint
    print("\n--- Testing Admin Evaluation Endpoint /admin/evaluation ---")
    eval_res, eval_code = api_get("/admin/evaluation", admin_token)
    print(f"Status Code: {eval_code}")

    assert eval_code == 200, "Evaluation endpoint failed!"

    print(f"\nBenchmark Timestamp: {eval_res.get('timestamp')}")
    print(f"Evaluated Patient: {eval_res.get('evaluated_patient_id')}")

    # Retrieval Metrics
    ret = eval_res.get("retrieval_metrics", {})
    print("\n[Retrieval Metrics]")
    print(f"  - Precision@K: {ret.get('precision_at_k')}")
    print(f"  - Recall@K:    {ret.get('recall_at_k')}")
    print(f"  - F1@K:        {ret.get('f1_at_k')}")
    print(f"  - MRR:         {ret.get('mrr')}")
    print(f"  - Hit Rate:    {ret.get('hit_rate')}")

    # Temporal Metrics
    temp = eval_res.get("temporal_retrieval_metrics", {})
    print("\n[Temporal Retrieval Metrics]")
    print(f"  - Temporal Retrieval Accuracy: {temp.get('overall_temporal_retrieval_accuracy')}")

    # Answer Quality
    qual = eval_res.get("answer_quality_metrics", {})
    print("\n[Answer Quality Metrics]")
    print(f"  - Evidence Groundedness:          {qual.get('evidence_groundedness')}")
    print(f"  - Source Attribution Accuracy:    {qual.get('source_attribution_accuracy')}")

    # Latencies
    perf = eval_res.get("performance_latencies", {})
    print("\n[Performance Latencies]")
    print(f"  - Average Query Latency:  {perf.get('avg_query_latency_ms')} ms")
    print(f"  - Median Query Latency:   {perf.get('median_query_latency_ms')} ms")
    print(f"  - P95 Query Latency:      {perf.get('p95_query_latency_ms')} ms")

    # Security Evaluation
    sec = eval_res.get("security_evaluation", {})
    print("\n[Security / RBAC Evaluation]")
    print(f"  - RBAC Tests:               {sec.get('rbac_tests')}")
    print(f"  - Patient Isolation Tests:  {sec.get('patient_isolation_tests')}")
    print(f"  - Unauthorized Access Tests:{sec.get('unauthorized_access_tests')}")

    # 3. Test RBAC Isolation: Verify Non-Admin (Doctor / Patient) Cannot Access Evaluation Endpoint
    print("\n--- Testing RBAC Protection on Evaluation Endpoint ---")
    doc_login, _ = api_post("/auth/login", {"username": "dr_m5", "password": "docpassword123"})
    if doc_login.get("access_token"):
        dr_token = doc_login["access_token"]
        doc_eval_res, doc_code = api_get("/admin/evaluation", dr_token)
        print(f"Doctor Access Status Code: {doc_code} (Expected 403 Forbidden)")
        assert doc_code == 403, "Doctor should be denied access to Admin Evaluation module!"

    print("\n==================================================")
    print("  MILESTONE 7 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
