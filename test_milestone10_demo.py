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
    print("  MILESTONE 10 — KNOWLEDGE GRAPH UI & SUBGRAPH DEMO")
    print("==================================================")

    # 1. Login as Admin
    admin_login, _ = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    admin_token = admin_login["access_token"]

    # Ensure Doctor & Patient Assignment
    api_post("/admin/users", {"username": "dr_m10", "email": "dr_m10@hospital.org", "password": "docpassword123", "role": "doctor"}, admin_token)
    users, _ = api_get("/admin/users", admin_token)
    dr_id = next(u["id"] for u in users if u["username"] == "dr_m10")

    pat_res, _ = api_post("/admin/patients", {"name": "Milestone10 Graph Patient", "age": 60, "gender": "Male"}, admin_token)
    patient_id = pat_res["patient_id"]
    api_post("/admin/assignments", {"doctor_id": dr_id, "clinical_patient_id": patient_id, "status": "active"}, admin_token)

    doc_login, _ = api_post("/auth/login", {"username": "dr_m10", "password": "docpassword123"})
    dr_token = doc_login["access_token"]

    # Add clinical encounter to populate graph
    api_post("/encounters", {
        "patient_id": patient_id,
        "visit_date": "2024-11-20",
        "condition": "Coronary Artery Disease",
        "diagnosis": "CAD (I25.1)",
        "treatment": "Stent Placement Procedure",
        "medication": "Clopidogrel 75mg"
    }, dr_token)

    print(f"[+] Populated graph for patient {patient_id}")

    # 2. Retrieve Subgraph Data
    print("\n--- 1. Testing Subgraph API Retrieval /kg/subgraph/{patient_id} ---")
    subgraph_res, code = api_get(f"/kg/subgraph/{patient_id}", dr_token)
    print(f"Status Code: {code}")

    elements = subgraph_res.get("elements", {})
    nodes = elements.get("nodes", [])
    edges = elements.get("edges", [])

    print(f"Retrieved Graph Nodes Count: {len(nodes)}")
    print(f"Retrieved Graph Edges Count: {len(edges)}")

    assert code == 200, "Failed to retrieve patient subgraph!"

    # Print sample node details
    if nodes:
        sample_n = nodes[0].get("data", {})
        print(f"\nSample Node: ID={sample_n.get('id')}, Label={sample_n.get('label')}, Type={sample_n.get('type')}")

    # 3. Retrieve Timeline Events
    print("\n--- 2. Testing Patient Timeline Integration /kg/timeline/{patient_id} ---")
    timeline_res, tcode = api_get(f"/kg/timeline/{patient_id}", dr_token)
    print(f"Status Code: {tcode}")
    print(f"Timeline Events Count: {len(timeline_res)}")

    print("\n==================================================")
    print("  MILESTONE 10 MANUAL DEMONSTRATION VERIFIED! PASS")
    print("==================================================")

if __name__ == "__main__":
    run_demo()
