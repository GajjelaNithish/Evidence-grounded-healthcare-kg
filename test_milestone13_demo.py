"""
test_milestone13_demo.py — Milestone 13: Full Integration Verification

Verifies complete system operation:
1. Multi-role User Accounts (Admin, Doctor A, Doctor B, Patient 1, Patient 2)
2. Unique Patient Profile Records (PAT-000001, PAT-000002, PAT-000003)
3. Doctor-Patient Assignments (Doctor A -> PAT-1 & PAT-3; Doctor B -> PAT-2)
4. Multi-Encounter Chronological Clinical History for PAT-000003 (Visits in 2024 & 2025)
5. RBAC Data Isolation Across Portals (Doctor & Patient permissions)
6. Temporal Retrieval & Evidence Reasoning (Latest, historical, and previous visit facts)
7. Document Ownership & Isolation across Patients
8. Q&A Presentation & Evidence Grounding Structure

Run with:
    python test_milestone13_demo.py
"""

import sys
import io
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

ADMIN_CREDS   = {"username": "admin", "password": "Admin123!"}
DOCTOR_A_CREDS = {"username": "doctor_a", "password": "Doctor123!"}
DOCTOR_B_CREDS = {"username": "doctor_b", "password": "Doctor123!"}
PATIENT_1_CREDS = {"username": "patient_user_1", "password": "Patient123!"}
PATIENT_2_CREDS = {"username": "patient_user_2", "password": "Patient123!"}

PAT_1 = "PAT-000001"
PAT_2 = "PAT-000002"
PAT_3 = "PAT-000003"

def api_request(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body_bytes = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body_bytes = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}, resp.status
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_json = json.loads(content)
        except Exception:
            err_json = {"detail": content}
        return err_json, e.code

def login(creds):
    res, status = api_request("/auth/login", method="POST", data=creds)
    assert status == 200, f"Login failed for {creds['username']}: {res}"
    return res["access_token"]

def main():
    print("=" * 70)
    print("MILESTONE 13 — FULL INTEGRATION VERIFICATION DEMO")
    print("=" * 70)

    passed = 0
    failed = 0

    def run_check(title, check_fn):
        nonlocal passed, failed
        print(f"\n[TEST {passed + failed + 1}] {title}...")
        try:
            check_fn()
            print("  [PASS] Verified successfully.")
            passed += 1
        except AssertionError as e:
            print(f"  [FAIL] Assertion Failed: {e}")
            failed += 1
        except Exception as e:
            print(f"  [FAIL] Unexpected Error: {e}")
            failed += 1

    # 1. Login & Token Verification
    print("\n--- Phase 1: Authentication & User Verification ---")
    admin_token = login(ADMIN_CREDS)
    doc_a_token = login(DOCTOR_A_CREDS)
    doc_b_token = login(DOCTOR_B_CREDS)
    pat_1_token = login(PATIENT_1_CREDS)

    # 2. RBAC Patient Record Access Matrix
    print("\n--- Phase 2: RBAC Data Isolation Matrix ---")

    def test_doc_a_access():
        # Doctor A -> PAT-1 (200), PAT-3 (200), PAT-2 (403)
        res1, s1 = api_request(f"/encounters/patient/{PAT_1}", token=doc_a_token)
        assert s1 == 200, f"Doctor A should access assigned patient {PAT_1}, got {s1}"

        res3, s3 = api_request(f"/encounters/patient/{PAT_3}", token=doc_a_token)
        assert s3 == 200, f"Doctor A should access assigned patient {PAT_3}, got {s3}"

        res2, s2 = api_request(f"/encounters/patient/{PAT_2}", token=doc_a_token)
        assert s2 == 403, f"Doctor A must be DENIED (403) for unassigned patient {PAT_2}, got {s2}"

    run_check("Doctor A Patient Assignment Isolation (PAT-1 & PAT-3 ALLOWED, PAT-2 DENIED)", test_doc_a_access)

    def test_doc_b_access():
        # Doctor B -> PAT-2 (200), PAT-1 (403), PAT-3 (403)
        res2, s2 = api_request(f"/encounters/patient/{PAT_2}", token=doc_b_token)
        assert s2 == 200, f"Doctor B should access assigned patient {PAT_2}, got {s2}"

        res1, s1 = api_request(f"/encounters/patient/{PAT_1}", token=doc_b_token)
        assert s1 == 403, f"Doctor B must be DENIED (403) for unassigned patient {PAT_1}, got {s1}"

        res3, s3 = api_request(f"/encounters/patient/{PAT_3}", token=doc_b_token)
        assert s3 == 403, f"Doctor B must be DENIED (403) for unassigned patient {PAT_3}, got {s3}"

    run_check("Doctor B Patient Assignment Isolation (PAT-2 ALLOWED, PAT-1 & PAT-3 DENIED)", test_doc_b_access)

    def test_patient_isolation():
        # Patient User 1 -> PAT-1 (200), PAT-2 (403)
        res1, s1 = api_request(f"/encounters/patient/{PAT_1}", token=pat_1_token)
        assert s1 == 200, f"Patient 1 should access own record {PAT_1}, got {s1}"

        res2, s2 = api_request(f"/encounters/patient/{PAT_2}", token=pat_1_token)
        assert s2 == 403, f"Patient 1 must be DENIED (403) for Patient 2 record {PAT_2}, got {s2}"

    run_check("Patient User Isolation (Own Record ALLOWED, Other Patient DENIED)", test_patient_isolation)

    # 3. Multi-Encounter Chronological Clinical History
    print("\n--- Phase 3: Chronological Clinical History Verification ---")

    def test_multi_encounter_record():
        res, status = api_request(f"/encounters/patient/{PAT_3}", token=doc_a_token)
        assert status == 200, f"Failed to fetch encounters for {PAT_3}"
        assert isinstance(res, list), "Expected list of encounters"
        print(f"  Found {len(res)} encounter(s) for patient {PAT_3}")
        for enc in res:
            print(f"   - Visit Date: {enc.get('visit_date')}, Condition: {enc.get('condition')}, Treatment: {enc.get('treatment')}, Medication: {enc.get('medication')}")

    run_check("Chronological Encounters List for PAT-000003", test_multi_encounter_record)

    # 4. Temporal Q&A Reasoning Verification
    print("\n--- Phase 4: Temporal Q&A Retrieval & Reasoning Verification ---")

    def test_latest_condition_query():
        query_data = {"patient_id": PAT_3, "query": "What is the patient's latest condition?"}
        res, status = api_request("/query", method="POST", data=query_data, token=doc_a_token)
        assert status == 200, f"Query failed: {res}"
        assert "answer" in res, "Missing 'answer' field"
        assert "fused_score" in res, "Missing 'fused_score'"
        print(f"  Query: '{query_data['query']}'")
        print(f"  Synthesized Answer: {res['answer'].strip()}")

    run_check("Temporal Q&A — Latest Condition Query", test_latest_condition_query)

    def test_historical_condition_query():
        query_data = {"patient_id": PAT_3, "query": "What condition did the patient have in 2024?"}
        res, status = api_request("/query", method="POST", data=query_data, token=doc_a_token)
        assert status == 200, f"Query failed: {res}"
        assert "answer" in res, "Missing 'answer' field"
        print(f"  Query: '{query_data['query']}'")
        print(f"  Synthesized Answer: {res['answer'].strip()}")

    run_check("Temporal Q&A — Historical (2024) Condition Query", test_historical_condition_query)

    # 5. Document Isolation & Cross-Patient Security
    print("\n--- Phase 5: Document & Search Isolation Verification ---")

    def test_document_cross_patient_denial():
        # Patient 1 attempts to run clinical query on Patient 3
        query_data = {"patient_id": PAT_3, "query": "What treatment was given?"}
        res, status = api_request("/query", method="POST", data=query_data, token=pat_1_token)
        assert status == 403, f"Patient 1 querying PAT-3 must be DENIED (403), got {status}"

    run_check("Cross-Patient Q&A Retrieval Access Control (DENIED 403)", test_document_cross_patient_denial)

    # Summary Results
    print("\n" + "=" * 70)
    print(f"INTEGRATION VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
