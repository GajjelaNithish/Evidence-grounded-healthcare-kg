"""
test_milestone11_demo.py — Milestone 11: Documents + Provenance

Verifies:
1. Document upload without encounter_id still works (backward compat)
2. Document upload with encounter_id stores provenance correctly
3. GET /api/documents/patient/{patient_id} returns document_id, patient_id,
   encounter_id, uploaded_by, upload_date, source fields
4. GET /api/documents/encounter/{encounter_id} returns only docs for that encounter
5. GET /api/documents/status/{job_id} returns encounter_id + uploaded_by + upload_date
6. Security: doctor cannot access documents for unassigned patient
7. Security: patient cannot access another patient's documents

Run with:
    pytest test_milestone11_demo.py -v
Or for live API demo:
    python test_milestone11_demo.py
"""

import sys
import json
import io
import requests

BASE_URL = "http://127.0.0.1:8000/api"

DOCTOR_A = {"username": "doctor_a", "password": "Doctor123!"}
DOCTOR_B = {"username": "doctor_b", "password": "Doctor123!"}
PATIENT_1 = {"username": "patient_user_1", "password": "Patient123!"}
ADMIN    = {"username": "admin", "password": "Admin123!"}

# Doctor A is assigned to PAT-000001 and PAT-000003
# Doctor B is assigned to PAT-000002
PATIENT_ID_A  = "PAT-000001"  # assigned to Doctor A
PATIENT_ID_B  = "PAT-000002"  # assigned to Doctor B only

def _login(creds: dict) -> str:
    """Login and return bearer token."""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        data=creds,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert resp.status_code == 200, f"Login failed for {creds['username']}: {resp.text}"
    token = resp.json()["access_token"]
    return token

def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

def _upload_doc(token: str, patient_id: str, content: str, filename: str = "clinical_note.txt", encounter_id: str = None) -> dict:
    """Upload a text document, optionally associated with an encounter."""
    data = {"patient_id": patient_id}
    if encounter_id:
        data["encounter_id"] = encounter_id
    files = {"file": (filename, io.BytesIO(content.encode()), "text/plain")}
    resp = requests.post(f"{BASE_URL}/documents/upload", data=data, files=files, headers=_headers(token))
    return resp

# ─── TEST FUNCTIONS ───────────────────────────────────────────────────────────

def test_upload_without_encounter_id():
    """Upload without encounter_id should succeed (backward compatibility)."""
    print("\n[TEST 1] Upload document WITHOUT encounter_id...")
    token = _login(DOCTOR_A)
    resp = _upload_doc(token, PATIENT_ID_A, "Patient has hypertension treated with Lisinopril.")
    assert resp.status_code == 200, f"Upload failed: {resp.text}"
    body = resp.json()
    assert body["patient_id"] == PATIENT_ID_A
    assert body["encounter_id"] is None  # No encounter attached
    assert "job_id" in body
    print(f"  ✅ Uploaded job_id={body['job_id']}, encounter_id={body['encounter_id']}")
    return body["job_id"]

def test_upload_with_encounter_id():
    """Upload with encounter_id should store provenance correctly."""
    print("\n[TEST 2] Upload document WITH encounter_id...")
    token = _login(DOCTOR_A)
    enc_id = "ENC-2025-001"
    resp = _upload_doc(
        token, PATIENT_ID_A,
        "Patient visited for Diabetes checkup. Prescribed Metformin 500mg.",
        filename="diabetes_visit.txt",
        encounter_id=enc_id
    )
    assert resp.status_code == 200, f"Upload with encounter_id failed: {resp.text}"
    body = resp.json()
    assert body["patient_id"] == PATIENT_ID_A
    assert body["encounter_id"] == enc_id
    print(f"  ✅ Uploaded job_id={body['job_id']}, encounter_id={body['encounter_id']}")
    return body["job_id"], enc_id

def test_document_status_includes_provenance(job_id: str, encounter_id: str):
    """GET /documents/status/{job_id} must include encounter_id, uploaded_by, upload_date."""
    print(f"\n[TEST 3] Verify status endpoint returns provenance fields for job {job_id}...")
    token = _login(DOCTOR_A)
    resp = requests.get(f"{BASE_URL}/documents/status/{job_id}", headers=_headers(token))
    assert resp.status_code == 200, f"Status fetch failed: {resp.text}"
    body = resp.json()
    assert "document_id" not in body or "job_id" in body, "Missing job_id in status"
    assert "encounter_id" in body, f"Missing encounter_id in status response: {body.keys()}"
    assert "uploaded_by" in body, f"Missing uploaded_by in status response"
    assert "upload_date" in body, f"Missing upload_date in status response"
    assert body["encounter_id"] == encounter_id
    assert body["patient_id"] == PATIENT_ID_A
    print(f"  ✅ Status has encounter_id={body['encounter_id']}, uploaded_by={body['uploaded_by']}, upload_date={body['upload_date']}")

def test_patient_document_list_provenance():
    """GET /documents/patient/{id} must return document_id, encounter_id, uploaded_by, upload_date, source."""
    print(f"\n[TEST 4] List patient documents and verify provenance fields...")
    token = _login(DOCTOR_A)
    resp = requests.get(f"{BASE_URL}/documents/patient/{PATIENT_ID_A}", headers=_headers(token))
    assert resp.status_code == 200, f"Patient doc list failed: {resp.text}"
    docs = resp.json()
    assert isinstance(docs, list), "Expected a list of documents"
    print(f"  Found {len(docs)} document(s)")
    for doc in docs:
        required = ["document_id", "filename", "patient_id", "encounter_id",
                    "uploaded_by", "upload_date", "source", "status"]
        for field in required:
            assert field in doc, f"Missing field '{field}' in document listing: {doc.keys()}"
        print(f"  ✅ doc={doc['filename']}, patient={doc['patient_id']}, encounter={doc['encounter_id']}, source={doc['source']}")

def test_list_encounter_documents(encounter_id: str):
    """GET /documents/encounter/{encounter_id} must return only docs for that encounter."""
    print(f"\n[TEST 5] List documents by encounter_id={encounter_id}...")
    token = _login(DOCTOR_A)
    resp = requests.get(f"{BASE_URL}/documents/encounter/{encounter_id}", headers=_headers(token))
    assert resp.status_code == 200, f"Encounter doc list failed: {resp.text}"
    docs = resp.json()
    assert isinstance(docs, list)
    assert len(docs) >= 1, "Expected at least 1 document for this encounter"
    for doc in docs:
        assert doc["encounter_id"] == encounter_id, f"Wrong encounter_id: {doc['encounter_id']}"
        assert doc["patient_id"] == PATIENT_ID_A
    print(f"  ✅ {len(docs)} document(s) returned for encounter {encounter_id}")

def test_doctor_cannot_access_unassigned_patient_docs():
    """Doctor B must not be able to list Patient A's documents."""
    print(f"\n[TEST 6] Doctor B cannot access Patient A ({PATIENT_ID_A}) documents...")
    token = _login(DOCTOR_B)
    resp = requests.get(f"{BASE_URL}/documents/patient/{PATIENT_ID_A}", headers=_headers(token))
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    print(f"  ✅ Access correctly denied (403) for Doctor B on {PATIENT_ID_A}")

def test_doctor_cannot_upload_for_unassigned_patient():
    """Doctor B must not be able to upload a document for Patient A."""
    print(f"\n[TEST 7] Doctor B cannot upload document for Patient A ({PATIENT_ID_A})...")
    token = _login(DOCTOR_B)
    resp = _upload_doc(token, PATIENT_ID_A, "Unauthorized note.")
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    print(f"  ✅ Upload correctly denied (403) for Doctor B on {PATIENT_ID_A}")

def test_patient_cannot_access_another_patient_docs():
    """Patient 1 must not be able to see Patient 2's documents."""
    print(f"\n[TEST 8] Patient 1 cannot access Patient 2 ({PATIENT_ID_B}) documents...")
    token = _login(PATIENT_1)
    resp = requests.get(f"{BASE_URL}/documents/patient/{PATIENT_ID_B}", headers=_headers(token))
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    print(f"  ✅ Access correctly denied (403) for Patient 1 on {PATIENT_ID_B}")

# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("MILESTONE 11 — DOCUMENTS + PROVENANCE DEMO")
    print("=" * 60)

    passed = 0
    failed = 0
    job_id_no_enc = None
    job_id_with_enc = None
    encounter_id = None

    def run(name, fn, *args):
        nonlocal passed, failed
        try:
            result = fn(*args)
            passed += 1
            return result
        except AssertionError as e:
            print(f"  ❌ FAIL: {e}")
            failed += 1
            return None
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            failed += 1
            return None

    job_id_no_enc = run("upload_without_encounter", test_upload_without_encounter_id)
    enc_result = run("upload_with_encounter", test_upload_with_encounter_id)

    if enc_result:
        job_id_with_enc, encounter_id = enc_result
        run("status_provenance", test_document_status_includes_provenance, job_id_with_enc, encounter_id)
        run("list_encounter_docs", test_list_encounter_documents, encounter_id)

    run("patient_doc_list_provenance", test_patient_document_list_provenance)
    run("doctor_unassigned_deny", test_doctor_cannot_access_unassigned_patient_docs)
    run("doctor_upload_unassigned_deny", test_doctor_cannot_upload_for_unassigned_patient)
    run("patient_isolation", test_patient_cannot_access_another_patient_docs)

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
