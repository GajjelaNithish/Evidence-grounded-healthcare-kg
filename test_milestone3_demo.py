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
    print("  MILESTONE 3 — MANUAL DEMONSTRATION VERIFICATION")
    print("==================================================")

    # 1. Admin Login & User Setup
    print("\n--- Step 1: Admin Setup & Authentication ---")
    admin_login, status = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    assert status == 200, "Admin login failed"
    admin_token = admin_login["access_token"]

    # Ensure Doctor A & Doctor B exist
    api_post("/admin/users", {"username": "dr_a", "email": "dr_a@hospital.org", "password": "docpassword123", "role": "doctor"}, admin_token)
    api_post("/admin/users", {"username": "dr_b", "email": "dr_b@hospital.org", "password": "docpassword123", "role": "doctor"}, admin_token)

    users, _ = api_get("/admin/users", admin_token)
    dr_a_id = next(u["id"] for u in users if u["username"] == "dr_a")
    dr_b_id = next(u["id"] for u in users if u["username"] == "dr_b")

    # Create Patient 3
    pat3_res, pat3_status = api_post("/admin/patients", {
        "name": "Patient Three (Longitudinal)",
        "age": 60,
        "gender": "Male",
        "create_user_account": False
    }, admin_token)
    pid3 = pat3_res["patient_id"]
    print(f"Patient 3 Created: ID={pid3}")

    # Assign Doctor A -> Patient 3
    api_post("/admin/assignments", {"doctor_id": dr_a_id, "clinical_patient_id": pid3, "status": "active"}, admin_token)
    print(f"Admin Assigned Doctor A -> Patient 3 ({pid3})")

    # Log in as Doctor A and Doctor B
    doc_a_login, _ = api_post("/auth/login", {"username": "dr_a", "password": "docpassword123"})
    doc_b_login, _ = api_post("/auth/login", {"username": "dr_b", "password": "docpassword123"})
    token_a = doc_a_login["access_token"]
    token_b = doc_b_login["access_token"]

    # 2. Doctor A Appends 3 Longitudinal Encounters for Patient 3
    print("\n--- Step 2: Doctor A Records 3 Longitudinal Clinical Visits ---")

    # Visit 1 (2024-01-10)
    v1_res, v1_code = api_post("/encounters", {
        "patient_id": pid3,
        "visit_date": "2024-01-10",
        "reason_for_visit": "Routine cardiovascular checkup",
        "condition": "Hypertension",
        "diagnosis": "Primary Essential Hypertension",
        "medication": "Medication A",
        "clinical_notes": "BP 145/90 mmHg. Prescribed Medication A 5mg daily."
    }, token_a)
    assert v1_code == 201, f"Failed to record Visit 1: {v1_res}"
    print(f"  Visit 1 Recorded (2024-01-10): Encounter ID={v1_res['encounter_id']} Condition=Hypertension")

    # Visit 2 (2024-08-15)
    v2_res, v2_code = api_post("/encounters", {
        "patient_id": pid3,
        "visit_date": "2024-08-15",
        "reason_for_visit": "Endocrine evaluation",
        "condition": "Diabetes",
        "diagnosis": "Type 2 Diabetes Mellitus",
        "medication": "Medication B",
        "clinical_notes": "Fasting blood sugar 160 mg/dL. Prescribed Medication B."
    }, token_a)
    assert v2_code == 201, f"Failed to record Visit 2: {v2_res}"
    print(f"  Visit 2 Recorded (2024-08-15): Encounter ID={v2_res['encounter_id']} Condition=Diabetes")

    # Visit 3 (2025-02-04)
    v3_res, v3_code = api_post("/encounters", {
        "patient_id": pid3,
        "visit_date": "2025-02-04",
        "reason_for_visit": "Emergency trauma assessment",
        "condition": "Fractured Arm",
        "diagnosis": "Closed distal radius fracture",
        "treatment": "X-Ray + Splint",
        "medication": "Medication C",
        "clinical_notes": "Slipped on ice. X-Ray performed, splint applied."
    }, token_a)
    assert v3_code == 201, f"Failed to record Visit 3: {v3_res}"
    print(f"  Visit 3 Recorded (2025-02-04): Encounter ID={v3_res['encounter_id']} Condition=Fractured Arm")

    # 3. Verify Temporal Ordering & Non-Destructive Appending
    print("\n--- Step 3: Verify Temporal Chronological Ordering & Record Preservation ---")
    encounters_list, list_code = api_get(f"/encounters/patient/{pid3}", token_a)
    assert list_code == 200
    print(f"Total encounters retrieved for Patient {pid3}: {len(encounters_list)}")
    assert len(encounters_list) == 3, f"Expected 3 encounters, found {len(encounters_list)}"

    # Check temporal ordering: Latest (2025-02-04) -> Previous (2024-08-15) -> Older (2024-01-10)
    print("\nRetrieved Encounters (Temporal Timeline Order):")
    for idx, e in enumerate(encounters_list, 1):
        print(f"  [{idx}] Date: {e['visit_date']} | Condition: {e['condition']} | Med/Tx: {e['medication'] or e['treatment']} | ID: {e['encounter_id']}")

    assert encounters_list[0]["visit_date"] == "2025-02-04", "First encounter must be latest (2025-02-04)"
    assert encounters_list[0]["condition"] == "Fractured Arm"
    assert encounters_list[1]["visit_date"] == "2024-08-15", "Second encounter must be previous (2024-08-15)"
    assert encounters_list[1]["condition"] == "Diabetes"
    assert encounters_list[2]["visit_date"] == "2024-01-10", "Third encounter must be older (2024-01-10)"
    assert encounters_list[2]["condition"] == "Hypertension"

    # 4. Security Verification: Unassigned Doctor B Access Denied
    print("\n--- Step 4: Security Verification (Unassigned Doctor B Denied Access) ---")
    _, b_post_code = api_post("/encounters", {
        "patient_id": pid3,
        "visit_date": "2026-01-01",
        "condition": "Unauthorized Entry"
    }, token_b)
    print(f"Doctor B attempt to add encounter for unassigned Patient 3: HTTP {b_post_code} [{'DENIED (403 Forbidden)' if b_post_code == 403 else 'UNEXPECTED'}]")
    assert b_post_code == 403

    _, b_get_code = api_get(f"/encounters/patient/{pid3}", token_b)
    print(f"Doctor B attempt to view encounters for unassigned Patient 3: HTTP {b_get_code} [{'DENIED (403 Forbidden)' if b_get_code == 403 else 'UNEXPECTED'}]")
    assert b_get_code == 403

    print("\n==================================================")
    print("  MILESTONE 3 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
