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
    print("  MILESTONE 1 — MANUAL DEMONSTRATION VERIFICATION")
    print("==================================================")

    # 1. Login as Admin
    print("\n--- Step 1: Admin Login ---")
    admin_login, status = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    assert status == 200, "Admin login failed"
    admin_token = admin_login["access_token"]
    print("Admin logged in successfully.")

    # 2. Create Doctor A & Doctor B
    print("\n--- Step 2: Create Doctor A & Doctor B ---")
    try:
        doc_a_res, _ = api_post("/admin/users", {
            "username": "dr_a",
            "email": "dr_a@hospital.org",
            "password": "docpassword123",
            "role": "doctor"
        }, admin_token)
        print("Doctor A created:", doc_a_res)
    except Exception as e:
        print("Doctor A already exists or created:", e)

    try:
        doc_b_res, _ = api_post("/admin/users", {
            "username": "dr_b",
            "email": "dr_b@hospital.org",
            "password": "docpassword123",
            "role": "doctor"
        }, admin_token)
        print("Doctor B created:", doc_b_res)
    except Exception as e:
        print("Doctor B already exists or created:", e)

    # 3. Get Doctor UUIDs
    users, _ = api_get("/admin/users", admin_token)
    dr_a_id = next(u["id"] for u in users if u["username"] == "dr_a")
    dr_b_id = next(u["id"] for u in users if u["username"] == "dr_b")
    print(f"Doctor A ID: {dr_a_id} | Doctor B ID: {dr_b_id}")

    # 4. Assign Doctor A -> Patient 1 (PAT-000001) & Patient 3 (PAT-000003)
    #               Doctor B -> Patient 2 (PAT-000002)
    print("\n--- Step 3: Admin Creates Assignments ---")
    api_post("/admin/assignments", {"doctor_id": dr_a_id, "clinical_patient_id": "PAT-000001", "status": "active"}, admin_token)
    api_post("/admin/assignments", {"doctor_id": dr_a_id, "clinical_patient_id": "PAT-000003", "status": "active"}, admin_token)
    api_post("/admin/assignments", {"doctor_id": dr_b_id, "clinical_patient_id": "PAT-000002", "status": "active"}, admin_token)
    print("Assignments created successfully:")
    print("  - Doctor A -> PAT-000001, PAT-000003")
    print("  - Doctor B -> PAT-000002")

    # Also support numerical patient IDs if needed
    api_post("/admin/assignments", {"doctor_id": dr_a_id, "clinical_patient_id": "1", "status": "active"}, admin_token)
    api_post("/admin/assignments", {"doctor_id": dr_a_id, "clinical_patient_id": "3", "status": "active"}, admin_token)
    api_post("/admin/assignments", {"doctor_id": dr_b_id, "clinical_patient_id": "2", "status": "active"}, admin_token)

    # 5. Login as Doctor A and Doctor B
    print("\n--- Step 4: Login as Doctor A & Doctor B ---")
    doc_a_login, _ = api_post("/auth/login", {"username": "dr_a", "password": "docpassword123"})
    doc_b_login, _ = api_post("/auth/login", {"username": "dr_b", "password": "docpassword123"})
    token_a = doc_a_login["access_token"]
    token_b = doc_b_login["access_token"]

    # 6. Direct API RBAC Access Verification
    print("\n--- Step 5: Direct API Authorization Verification ---")

    # Doctor A -> Patient 1 (Allowed)
    _, code1 = api_get("/kg/subgraph/PAT-000001", token_a)
    print(f"Doctor A -> Patient 1 (PAT-000001): HTTP {code1} [{'ALLOWED' if code1 in (200, 404) else 'DENIED'}]")
    assert code1 in (200, 404), f"Expected HTTP 200 or 404, got {code1}"

    # Doctor A -> Patient 3 (Allowed)
    _, code3 = api_get("/kg/subgraph/PAT-000003", token_a)
    print(f"Doctor A -> Patient 3 (PAT-000003): HTTP {code3} [{'ALLOWED' if code3 in (200, 404) else 'DENIED'}]")
    assert code3 in (200, 404), f"Expected HTTP 200 or 404, got {code3}"

    # Doctor A -> Patient 2 (Denied - Unassigned)
    _, code2_a = api_get("/kg/subgraph/PAT-000002", token_a)
    print(f"Doctor A -> Patient 2 (PAT-000002): HTTP {code2_a} [{'DENIED (403 Forbidden)' if code2_a == 403 else 'UNEXPECTED'}]")
    assert code2_a == 403, f"Expected HTTP 403 Forbidden, got {code2_a}"

    # Doctor B -> Patient 2 (Allowed)
    _, code2_b = api_get("/kg/subgraph/PAT-000002", token_b)
    print(f"Doctor B -> Patient 2 (PAT-000002): HTTP {code2_b} [{'ALLOWED' if code2_b in (200, 404) else 'DENIED'}]")
    assert code2_b in (200, 404), f"Expected HTTP 200 or 404, got {code2_b}"

    # Doctor B -> Patient 1 (Denied - Unassigned)
    _, code1_b = api_get("/kg/subgraph/PAT-000001", token_b)
    print(f"Doctor B -> Patient 1 (PAT-000001): HTTP {code1_b} [{'DENIED (403 Forbidden)' if code1_b == 403 else 'UNEXPECTED'}]")
    assert code1_b == 403, f"Expected HTTP 403 Forbidden, got {code1_b}"

    # 7. Q&A API Patient Data Isolation Verification
    print("\n--- Step 6: Q&A Endpoint Patient Data Isolation ---")
    query_data_a_unassigned = {"patient_id": "PAT-000002", "query": "What are the patient's conditions?"}
    _, q_code_a = api_post("/query", query_data_a_unassigned, token_a)
    print(f"Doctor A Q&A query on unassigned Patient 2: HTTP {q_code_a} [{'DENIED (403 Forbidden)' if q_code_a == 403 else 'UNEXPECTED'}]")
    assert q_code_a == 403, f"Expected HTTP 403 Forbidden, got {q_code_a}"

    # 8. Document Endpoint Patient Data Isolation Verification
    print("\n--- Step 7: Document Endpoint Patient Data Isolation ---")
    _, doc_code_b = api_get("/documents/patient/PAT-000001", token_b)
    print(f"Doctor B document list query on Patient 1: HTTP {doc_code_b} [{'DENIED (403 Forbidden)' if doc_code_b == 403 else 'UNEXPECTED'}]")
    assert doc_code_b == 403, f"Expected HTTP 403 Forbidden, got {doc_code_b}"

    print("\n==================================================")
    print("  MILESTONE 1 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
