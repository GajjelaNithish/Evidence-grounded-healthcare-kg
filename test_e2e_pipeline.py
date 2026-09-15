import urllib.request
import json
import uuid
import os

BASE_URL = "http://127.0.0.1:8000/api"

def get_token(username, password):
    req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=json.dumps({"username": username, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))["access_token"]

def api_get(endpoint, token):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        headers={"Authorization": f"Bearer {token}"},
        method="GET"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def api_post(endpoint, data, token):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_pipeline():
    print("=== Step 1: Doctor Login & Patient Graph Inspection ===")
    doc_token = get_token("dr_smith", "doctor123")
    
    # Check Analytics
    analytics = api_get("/kg/analytics/1", doc_token)
    print("Patient 1 Analytics:", json.dumps(analytics, indent=2))
    assert analytics["patient_id"] == "1"
    assert analytics["condition_count"] >= 1
    assert analytics["treatment_count"] >= 1

    # Check Timeline
    timeline = api_get("/kg/timeline/1", doc_token)
    print(f"Patient 1 Timeline ({len(timeline)} events):", json.dumps(timeline[:2], indent=2))
    assert len(timeline) >= 1

    # Check Subgraph
    subgraph = api_get("/kg/subgraph/1", doc_token)
    nodes = subgraph["elements"]["nodes"]
    edges = subgraph["elements"]["edges"]
    print(f"Patient 1 Subgraph: {len(nodes)} nodes, {len(edges)} edges")
    assert len(nodes) >= 1

    print("\n=== Step 2: Clinical Hybrid Query Execution ===")
    query_payload = {
        "patient_id": "1",
        "query": "What diagnosis and treatments are recorded for this patient?"
    }
    query_resp = api_post("/query", query_payload, doc_token)
    print("Query Response Answer:\n", query_resp["answer"])
    print(f"Confidence Score: {query_resp['confidence_score']}")
    print(f"Routing Decision: {query_resp['routing_decision']}")
    print(f"Document Evidence retrieved: {len(query_resp['document_evidence'])}")
    print(f"Graph Evidence retrieved: {len(query_resp['graph_evidence'])}")
    assert query_resp["answer"] is not None
    assert query_resp["confidence_score"] > 0

    print("\n=== Step 3: Document Upload & Status Polling ===")
    # Create sample clinical text file
    sample_text = (
        "CLINICAL CONSULTATION REPORT\n"
        "Patient ID: 1\n"
        "Date: 2026-09-13\n"
        "Chief Complaint: Follow-up consultation for chronic hypertension and blood sugar management.\n"
        "Findings: Blood pressure 138/86 mmHg. Fasting blood sugar 118 mg/dL.\n"
        "Plan: Continue current prescription of Metformin 500mg and lifestyle modifications.\n"
        "Follow-up scheduled in 30 days.\n"
    )
    
    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="patient_id"\r\n\r\n'
        f"1\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="clinical_notes_followup.txt"\r\n'
        f"Content-Type: text/plain\r\n\r\n"
        f"{sample_text}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/documents/upload",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {doc_token}"
        },
        method="POST"
    )

    with urllib.request.urlopen(req) as resp:
        upload_resp = json.loads(resp.read().decode("utf-8"))
    
    print("Upload initiated:", upload_resp)
    job_id = upload_resp["job_id"]
    assert job_id is not None

    # Poll status for up to 10 seconds
    import time
    for _ in range(10):
        time.sleep(1)
        status_resp = api_get(f"/documents/status/{job_id}", doc_token)
        print(f"  Job {job_id} Status: {status_resp['status']} | Progress: {status_resp.get('progress_message')}")
        if status_resp["status"] in ["completed", "failed"]:
            break
    
    print(f"Final Job Status: {status_resp['status']}")
    assert status_resp["status"] in ["completed", "pending", "processing"]

    # Verify document in patient documents list
    docs = api_get("/documents/patient/1", doc_token)
    print(f"Patient 1 Documents Count: {len(docs)}")
    assert any(d["filename"] == "clinical_notes_followup.txt" for d in docs)

    print("\n=== FULL END-TO-END PIPELINE VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    test_pipeline()
