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
    print("  MILESTONE 8 — ADMIN USER & ASSIGNMENT WORKFLOW")
    print("==================================================")

    # 1. Login as Admin
    admin_login, code = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    if code != 200:
        print(f"Admin login failed: {admin_login}")
        return
    admin_token = admin_login["access_token"]
    print(f"[+] Admin Authenticated (HTTP {code})")

    # 2. Admin Creates Doctor A & Doctor B
    print("\n--- 1. Admin Creating Doctors ---")
    api_post("/admin/users", {"username": "dr_m8_a", "email": "dr_m8_a@hospital.org", "password": "docpassword123", "role": "doctor"}, admin_token)
    api_post("/admin/users", {"username": "dr_m8_b", "email": "dr_m8_b@hospital.org", "password": "docpassword123", "role": "doctor"}, admin_token)

    users, _ = api_get("/admin/users", admin_token)
    dr_a_id = next(u["id"] for u in users if u["username"] == "dr_m8_a")
    dr_b_id = next(u["id"] for u in users if u["username"] == "dr_m8_b")
    print(f"    - Doctor A Created (ID: {dr_a_id})")
    print(f"    - Doctor B Created (ID: {dr_b_id})")

    # 3. Admin Creates Patient Records
    print("\n--- 2. Admin Creating Patient Profiles ---")
    p1_res, _ = api_post("/admin/patients", {"name": "Milestone8 Patient 1", "age": 48, "gender": "Female"}, admin_token)
    p2_res, _ = api_post("/admin/patients", {"name": "Milestone8 Patient 2", "age": 62, "gender": "Male"}, admin_token)

    p1_id = p1_res["patient_id"]
    p2_id = p2_res["patient_id"]
    print(f"    - Patient 1 Record Created: {p1_id}")
    print(f"    - Patient 2 Record Created: {p2_id}")

    # 4. Admin Assigns Doctor A -> Patient 1 and Doctor B -> Patient 2
    print("\n--- 3. Admin Storing Doctor-Patient Assignments ---")
    assign1, code1 = api_post("/admin/assignments", {
        "doctor_id": dr_a_id,
        "clinical_patient_id": p1_id,
        "status": "active",
        "assignment_reason": "Primary Cardiology Care"
    }, admin_token)
    print(f"    - Doctor A -> Patient 1 ({p1_id}): HTTP {code1}")

    assign2, code2 = api_post("/admin/assignments", {
        "doctor_id": dr_b_id,
        "clinical_patient_id": p2_id,
        "status": "active",
        "assignment_reason": "Endocrinology Consultation"
    }, admin_token)
    print(f"    - Doctor B -> Patient 2 ({p2_id}): HTTP {code2}")

    # 5. Verify Doctor A Patient Access List
    print("\n--- 4. Verifying Doctor A Assigned Patients List ---")
    doc_a_login, _ = api_post("/auth/login", {"username": "dr_m8_a", "password": "docpassword123"})
    token_a = doc_a_login["access_token"]
    patients_a, _ = api_get("/kg/patients", token_a)

    pids_a = [p["patient_id"] for p in patients_a]
    print(f"    Doctor A Visible Patients: {pids_a}")
    assert p1_id in pids_a, "Doctor A should see assigned Patient 1"
    assert p2_id not in pids_a, "Doctor A must NOT see unassigned Patient 2!"

    # 6. Verify Doctor B Patient Access List
    print("\n--- 5. Verifying Doctor B Assigned Patients List ---")
    doc_b_login, _ = api_post("/auth/login", {"username": "dr_m8_b", "password": "docpassword123"})
    token_b = doc_b_login["access_token"]
    patients_b, _ = api_get("/kg/patients", token_b)

    pids_b = [p["patient_id"] for p in patients_b]
    print(f"    Doctor B Visible Patients: {pids_b}")
    assert p2_id in pids_b, "Doctor B should see assigned Patient 2"
    assert p1_id not in pids_b, "Doctor B must NOT see unassigned Patient 1!"

    # 7. Test Cross-Doctor Access Enforcement (HTTP 403 Forbidden)
    print("\n--- 6. Verifying Cross-Doctor Unauthorized Access Protection ---")
    _, err_code_a = api_get(f"/kg/timeline/{p2_id}", token_a)
    print(f"    Doctor A attempting to access Patient 2 ({p2_id}): HTTP {err_code_a} (Expected 403 Forbidden)")
    assert err_code_a == 403, "Doctor A should be denied access to unassigned Patient 2!"

    _, err_code_b = api_get(f"/kg/timeline/{p1_id}", token_b)
    print(f"    Doctor B attempting to access Patient 1 ({p1_id}): HTTP {err_code_b} (Expected 403 Forbidden)")
    assert err_code_b == 403, "Doctor B should be denied access to unassigned Patient 1!"

    print("\n==================================================")
    print("  MILESTONE 8 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
