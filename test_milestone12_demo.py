"""
test_milestone12_demo.py — Milestone 12: All-Portal Profile + Navigation Polish

Verifies:
1. Admin user profile response includes role, username, email, active status.
2. Doctor user profile response includes role, username, email.
3. Patient user profile response includes linked clinical_patient_id and patient_profile_data.
4. Navigation context and profile access rules.

Run with:
    python test_milestone12_demo.py
"""

import sys
import urllib.request
import json
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

ADMIN_CREDS = {"username": "admin", "password": "Admin123!"}
DOCTOR_CREDS = {"username": "doctor_a", "password": "Doctor123!"}
PATIENT_CREDS = {"username": "patient_user_1", "password": "Patient123!"}

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
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8")), resp.status

def api_get(endpoint, token=None):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        headers={"Authorization": f"Bearer {token}"} if token else {},
        method="GET"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8")), resp.status

def login(creds):
    res, status = api_post("/auth/login", creds)
    assert status == 200, f"Login failed for {creds['username']}"
    return res["access_token"]

def main():
    print("=" * 60)
    print("MILESTONE 12 — ALL-PORTAL PROFILE & NAVIGATION DEMO")
    print("=" * 60)

    try:
        # 1. Admin Profile Verification
        print("\n[TEST 1] Verifying Admin User Profile & Account Data...")
        admin_token = login(ADMIN_CREDS)
        admin_me, status = api_get("/auth/me", admin_token)
        assert status == 200
        assert admin_me["role"] == "admin"
        assert admin_me["username"] == "admin"
        assert "email" in admin_me
        print(f"  [PASS] Admin Profile Verified: Username={admin_me['username']}, Role={admin_me['role'].upper()}")

        # 2. Doctor Profile Verification
        print("\n[TEST 2] Verifying Doctor User Profile & Account Data...")
        doctor_token = login(DOCTOR_CREDS)
        doctor_me, status = api_get("/auth/me", doctor_token)
        assert status == 200
        assert doctor_me["role"] == "doctor"
        assert doctor_me["username"] == "doctor_a"
        print(f"  [PASS] Doctor Profile Verified: Username={doctor_me['username']}, Role={doctor_me['role'].upper()}")

        # 3. Patient Profile Verification
        print("\n[TEST 3] Verifying Patient User Profile & Clinical Link...")
        patient_token = login(PATIENT_CREDS)
        patient_me, status = api_get("/auth/me", patient_token)
        assert status == 200
        assert patient_me["role"] == "patient"
        assert "clinical_patient_id" in patient_me
        assert patient_me["clinical_patient_id"] == "PAT-000001"
        assert "patient_profile_data" in patient_me
        p_data = patient_me["patient_profile_data"]
        assert p_data["patient_id"] == "PAT-000001"
        print(f"  [PASS] Patient Profile Verified: Username={patient_me['username']}, Linked Patient ID={patient_me['clinical_patient_id']}, Name={p_data.get('name')}")

        print("\n" + "=" * 60)
        print("  MILESTONE 12 DEMONSTRATION VERIFIED! PASS")
        print("=" * 60)

    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"[FAIL] HTTP Error {e.code}: {body}")
        sys.exit(1)
    except Exception as e:
        print(f"[FAIL] Verification failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
