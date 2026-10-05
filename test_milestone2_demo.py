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
    print("  MILESTONE 2 — MANUAL DEMONSTRATION VERIFICATION")
    print("==================================================")

    # 1. Admin Login
    print("\n--- Step 1: Admin Login ---")
    admin_login, status = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    assert status == 200, "Admin login failed"
    admin_token = admin_login["access_token"]
    print("Admin logged in successfully.")

    # 2. Admin creates Patient Profile WITHOUT User Account
    print("\n--- Step 2: Create Patient Profile (Standalone Clinical Identity) ---")
    pat1_res, pat1_status = api_post("/admin/patients", {
        "name": "Suresh Gupta",
        "date_of_birth": "1972-05-14",
        "age": 52,
        "gender": "Male",
        "address": "Delhi, India",
        "contact": "+91-9811122233",
        "create_user_account": False
    }, admin_token)
    assert pat1_status == 200, f"Failed to create patient: {pat1_res}"
    pid1 = pat1_res["patient_id"]
    print(f"Standalone Patient Created: ID={pid1} Name={pat1_res['patient']['name']} UserAccount=None")
    assert pid1.startswith("PAT-"), f"Invalid Patient ID format: {pid1}"

    # 3. Admin creates Patient Profile WITH Linked User Account
    print("\n--- Step 3: Create Patient Profile WITH Linked User Account ---")
    import uuid
    unique_user = f"pat_priya_{uuid.uuid4().hex[:6]}"
    unique_email = f"priya_{uuid.uuid4().hex[:6]}@hospital.org"

    pat2_res, pat2_status = api_post("/admin/patients", {
        "name": "Priya Nair",
        "date_of_birth": "1995-11-20",
        "age": 29,
        "gender": "Female",
        "address": "Kochi, Kerala",
        "contact": "+91-9447001122",
        "create_user_account": True,
        "username": unique_user,
        "email": unique_email,
        "password": "patientpassword123"
    }, admin_token)
    assert pat2_status == 200, f"Failed to create patient with user account: {pat2_res}"
    pid2 = pat2_res["patient_id"]
    print(f"Patient with User Account Created: ID={pid2} Name={pat2_res['patient']['name']} UserID={pat2_res['patient']['user_id']}")
    assert pid2.startswith("PAT-"), f"Invalid Patient ID format: {pid2}"
    assert pid1 != pid2, "Patient IDs must be unique and distinct"

    # 4. Duplicate Protection Verification
    print("\n--- Step 4: Duplicate Protection Verification ---")
    dup_res, dup_status = api_post("/admin/patients", {
        "name": "Priya Duplicate",
        "create_user_account": True,
        "username": unique_user,
        "email": unique_email,
        "password": "password123"
    }, admin_token)
    print(f"Duplicate username creation attempt: HTTP {dup_status} [{'REJECTED (400 Bad Request)' if dup_status == 400 else 'UNEXPECTED'}]")
    assert dup_status == 400, f"Expected HTTP 400 Bad Request, got {dup_status}"

    # 5. List Patients
    print("\n--- Step 5: Admin Lists Clinical Patient Profiles ---")
    patients_list, list_status = api_get("/admin/patients", admin_token)
    assert list_status == 200
    print(f"Total Patient Profiles in Database: {len(patients_list)}")
    assert any(p["patient_id"] == pid1 for p in patients_list)
    assert any(p["patient_id"] == pid2 for p in patients_list)

    # 6. Patient Login & Profile Verification
    print("\n--- Step 6: Patient Login & Profile Area Verification ---")
    pat_login, login_status = api_post("/auth/login", {"username": unique_user, "password": "patientpassword123"})
    assert login_status == 200
    pat_token = pat_login["access_token"]
    
    me_resp, me_status = api_get("/auth/me", pat_token)
    assert me_status == 200
    print("Patient /auth/me user profile response:")
    print(f"  User ID: {me_resp['id']}")
    print(f"  Username: {me_resp['username']}")
    print(f"  Role: {me_resp['role']}")
    print(f"  Clinical Patient ID: {me_resp['clinical_patient_id']}")
    print(f"  Linked Patient Profile: {json.dumps(me_resp.get('patient_profile_data'), indent=4)}")
    
    assert me_resp["role"] == "patient"
    assert me_resp["clinical_patient_id"] == pid2
    assert me_resp["patient_profile_data"] is not None
    assert me_resp["patient_profile_data"]["patient_id"] == pid2
    assert me_resp["patient_profile_data"]["name"] == "Priya Nair"

    print("\n==================================================")
    print("  MILESTONE 2 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
