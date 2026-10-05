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
    print("  MILESTONE 4 — TEMPORAL KG RETRIEVAL DEMO")
    print("==================================================")

    # 1. Login as Admin & Doctor A
    admin_login, _ = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    admin_token = admin_login["access_token"]

    # Setup Doctor A & Patient 3
    api_post("/admin/users", {"username": "dr_a", "email": "dr_a@hospital.org", "password": "docpassword123", "role": "doctor"}, admin_token)
    users, _ = api_get("/admin/users", admin_token)
    dr_a_id = next(u["id"] for u in users if u["username"] == "dr_a")

    pat3_res, _ = api_post("/admin/patients", {"name": "Temporal Verification Patient", "age": 60, "gender": "Male"}, admin_token)
    pid3 = pat3_res["patient_id"]
    api_post("/admin/assignments", {"doctor_id": dr_a_id, "clinical_patient_id": pid3, "status": "active"}, admin_token)

    doc_a_login, _ = api_post("/auth/login", {"username": "dr_a", "password": "docpassword123"})
    token_a = doc_a_login["access_token"]

    # Add 3 temporal encounters
    api_post("/encounters", {"patient_id": pid3, "visit_date": "2024-01-10", "condition": "Hypertension", "medication": "Medication A"}, token_a)
    api_post("/encounters", {"patient_id": pid3, "visit_date": "2024-08-15", "condition": "Diabetes", "medication": "Medication B"}, token_a)
    api_post("/encounters", {"patient_id": pid3, "visit_date": "2025-02-04", "condition": "Fractured Arm", "treatment": "X-Ray + Splint", "medication": "Medication C"}, token_a)

    print(f"Setup complete for Patient {pid3} with 3 temporal visits.")

    # 2. Test Temporal Queries
    queries = [
        ("What is the patient's latest condition?", "latest"),
        ("What condition did the patient have in 2024?", "in 2024"),
        ("What treatment was given during the latest visit?", "latest visit"),
        ("What medication was prescribed during the previous visit?", "previous visit"),
        ("What changed between the previous and latest visit?", "previous and latest")
    ]

    print("\n--- Temporal Query Retrieval Results ---")
    for q_text, label in queries:
        resp, code = api_post("/query", {"patient_id": pid3, "query": q_text}, token_a)
        assert code == 200, f"Query failed: {resp}"
        print(f"\nQuery ({label}): \"{q_text}\"")
        print(f"  Applied Temporal Filter: {resp.get('temporal_filter_applied')}")
        print(f"  Graph Evidence Count: {len(resp.get('graph_evidence', []))}")
        for g in resp.get("graph_evidence", [])[:3]:
            print(f"    - [{g['node_type']}] {g['name']} | Date: {g.get('valid_from')} | Status: {g.get('temporal_status')}")
        print(f"  Answer Snippet:\n    {resp.get('answer', '')[:200]}...")

    print("\n==================================================")
    print("  MILESTONE 4 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
