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
    print("  MILESTONE 5 — Q&A RETRIEVAL CORRECTNESS DEMO")
    print("==================================================")

    # 1. Login as Admin & Doctor
    admin_login, _ = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    admin_token = admin_login["access_token"]

    # Ensure Doctor A & Patient Profile
    api_post("/admin/users", {"username": "dr_m5", "email": "dr_m5@hospital.org", "password": "docpassword123", "role": "doctor"}, admin_token)
    users, _ = api_get("/admin/users", admin_token)
    dr_id = next(u["id"] for u in users if u["username"] == "dr_m5")

    pat_res, _ = api_post("/admin/patients", {"name": "Milestone 5 QA Patient", "age": 55, "gender": "Female"}, admin_token)
    patient_id = pat_res["patient_id"]
    api_post("/admin/assignments", {"doctor_id": dr_id, "clinical_patient_id": patient_id, "status": "active"}, admin_token)

    doc_login, _ = api_post("/auth/login", {"username": "dr_m5", "password": "docpassword123"})
    dr_token = doc_login["access_token"]

    # 2. Populate longitudinal patient encounters
    enc1, _ = api_post("/encounters", {
        "patient_id": patient_id,
        "visit_date": "2024-01-10",
        "condition": "Hypertension",
        "diagnosis": "Essential Hypertension",
        "treatment": "Cardiovascular Therapy",
        "medication": "Aspirin 81mg Daily"
    }, dr_token)

    enc2, _ = api_post("/encounters", {
        "patient_id": patient_id,
        "visit_date": "2024-05-18",
        "condition": "Diabetes",
        "diagnosis": "Type 2 Diabetes",
        "treatment": "Glycemic Control",
        "medication": "Metformin 500mg Twice Daily"
    }, dr_token)

    enc3, _ = api_post("/encounters", {
        "patient_id": patient_id,
        "visit_date": "2025-02-04",
        "condition": "Fractured Arm",
        "diagnosis": "Left Radius Fracture",
        "treatment": "X-Ray and Arm Splint",
        "medication": "None"
    }, dr_token)

    print(f"\n[+] Created patient {patient_id} with 3 distinct encounters:")
    print(f"    - 2024-01-10: Hypertension (Medication: Aspirin 81mg Daily)")
    print(f"    - 2024-05-18: Diabetes (Medication: Metformin 500mg Twice Daily)")
    print(f"    - 2025-02-04: Fractured Arm (Treatment: X-Ray + Splint, No medication)")

    # 3. Test Query 1: Domain-specific Query for Medications
    print("\n--- TEST 1: Specific Query for Prescribed Medications ---")
    q1 = "What medications was this patient prescribed?"
    res1, code1 = api_post("/query", {"patient_id": patient_id, "query": q1}, dr_token)
    
    print(f"Status Code: {code1}")
    print(f"Routing Decision: {res1.get('routing_decision')}")
    print(f"Confidence Score: {res1.get('confidence_score')}")
    print(f"Retrieved Graph Facts Count: {len(res1.get('graph_evidence', []))}")
    print("\nAnswer Output:\n" + res1.get("answer", ""))

    # Verify domain filtering excluded unrelated fracture
    graph_facts = [g.get("name") for g in res1.get("graph_evidence", [])]
    assert any("Aspirin" in f or "2024" in f for f in graph_facts), "Medication evidence missing"
    assert not any("Fractured Arm" in f for f in graph_facts), "Unrelated condition was not filtered!"

    # 4. Test Query 2: Temporal Query for 2024 Conditions
    print("\n--- TEST 2: Temporal Query for 2024 Conditions ---")
    q2 = "What condition did the patient have in 2024?"
    res2, code2 = api_post("/query", {"patient_id": patient_id, "query": q2}, dr_token)
    
    print(f"Status Code: {code2}")
    print(f"Temporal Filter Applied: {res2.get('temporal_filter_applied')}")
    print("\nAnswer Output:\n" + res2.get("answer", ""))

    # 5. Test Query 3: Missing Domain / Unsupported Query (Sufficiency Gating)
    print("\n--- TEST 3: Out-of-Scope Query (Sufficiency Gating) ---")
    q3 = "What is the patient's blood type and eye color?"
    res3, code3 = api_post("/query", {"patient_id": patient_id, "query": q3}, dr_token)
    
    print(f"Status Code: {code3}")
    print(f"Routing Decision: {res3.get('routing_decision')}")
    print("\nAnswer Output:\n" + res3.get("answer", ""))
    assert res3.get("routing_decision") == "insufficient_evidence", "Sufficiency gate failed!"

    print("\n==================================================")
    print("  MILESTONE 5 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
