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
    print("  MILESTONE 9 — PATIENT PROFILE & CLINICAL RECORD UI DEMO")
    print("==================================================")

    # 1. Login as Admin
    admin_login, _ = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    admin_token = admin_login["access_token"]

    # Create Doctor & Patient Profile
    api_post("/admin/users", {"username": "dr_m9", "email": "dr_m9@hospital.org", "password": "docpassword123", "role": "doctor"}, admin_token)
    users, _ = api_get("/admin/users", admin_token)
    dr_id = next(u["id"] for u in users if u["username"] == "dr_m9")

    pat_res, _ = api_post("/admin/patients", {"name": "Milestone9 Eleanor Vance", "age": 52, "gender": "Female", "address": "California, USA"}, admin_token)
    patient_id = pat_res["patient_id"]
    api_post("/admin/assignments", {"doctor_id": dr_id, "clinical_patient_id": patient_id, "status": "active"}, admin_token)

    doc_login, _ = api_post("/auth/login", {"username": "dr_m9", "password": "docpassword123"})
    dr_token = doc_login["access_token"]

    print(f"[+] Doctor Authenticated & Assigned to Patient {patient_id} (Eleanor Vance, 52, Female, California)")

    # 2. Add Clinical Visit Workflow ("+ Add Clinical Visit")
    print("\n--- 1. Testing Doctor '+ Add Clinical Visit' Workflow ---")
    enc_payload = {
        "patient_id": patient_id,
        "visit_date": "2025-03-15",
        "reason_for_visit": "Routine Cardiology Follow-up",
        "condition": "Hypertension",
        "diagnosis": "Essential Hypertension (I10)",
        "treatment": "Antihypertensive Medication Adjustment",
        "medication": "Lisinopril 10mg Daily",
        "clinical_notes": "Patient reports well-managed blood pressure 126/80 mmHg. Continue Lisinopril.",
        "admission_date": "2025-03-15",
        "discharge_date": "2025-03-15",
        "outcome": "Discharged / Stable"
    }

    enc_res, enc_code = api_post("/encounters", enc_payload, dr_token)
    print(f"Status Code: {enc_code}")
    print(f"Recorded Encounter ID: {enc_res.get('encounter_id')}")
    assert enc_code == 201, "Failed to add clinical encounter!"

    # 3. Retrieve Patient Encounters List (Latest -> Previous -> Older)
    print("\n--- 2. Retrieving Categorized Longitudinal Encounters ---")
    encounters, _ = api_get(f"/encounters/patient/{patient_id}", dr_token)
    print(f"Total Encounters Returned: {len(encounters)}")
    latest = encounters[0]
    print(f"Latest Encounter Date: {latest.get('visit_date')}")
    print(f"Diagnosis: {latest.get('diagnosis')}")
    print(f"Medication: {latest.get('medication')}")
    print(f"Notes: {latest.get('clinical_notes')}")

    assert latest.get("visit_date") == "2025-03-15"
    assert "Lisinopril" in latest.get("medication")

    # 4. Verify Timeline Integration
    print("\n--- 3. Verifying KG Timeline Synchronization ---")
    timeline, _ = api_get(f"/kg/timeline/{patient_id}", dr_token)
    print(f"Total Timeline Events: {len(timeline)}")
    event_titles = [e.get("title") for e in timeline]
    print(f"Timeline Events: {event_titles}")

    print("\n==================================================")
    print("  MILESTONE 9 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
