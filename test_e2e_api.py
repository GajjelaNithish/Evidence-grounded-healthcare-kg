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
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def api_get(endpoint, token=None):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {})
        },
        method="GET"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test():
    print("--- 1. Health Check ---")
    health = api_get("/health")
    print("Health:", health)
    assert health["status"] == "ok", "System health degraded"

    print("\n--- 2. Authentication: Admin Login ---")
    admin_login = api_post("/auth/login", {"username": "admin", "password": "admin123"})
    admin_token = admin_login["access_token"]
    print("Admin token obtained. Role:", admin_login["user"]["role"])
    assert admin_login["user"]["role"] == "admin"

    print("\n--- 3. Authentication: Doctor Login ---")
    doc_login = api_post("/auth/login", {"username": "dr_smith", "password": "doctor123"})
    doc_token = doc_login["access_token"]
    print("Doctor token obtained. Role:", doc_login["user"]["role"])
    assert doc_login["user"]["role"] == "doctor"

    print("\n--- 4. Authentication: Patient Login ---")
    pat_login = api_post("/auth/login", {"username": "patient_rajesh", "password": "patient123"})
    pat_token = pat_login["access_token"]
    print("Patient token obtained. PID:", pat_login["user"]["clinical_patient_id"])
    assert pat_login["user"]["role"] == "patient"

    print("\n--- 5. Admin API: Metrics & Users ---")
    metrics = api_get("/admin/metrics", admin_token)
    print("Admin Metrics:", metrics)
    users = api_get("/admin/users", admin_token)
    print("Users count:", len(users))
    assignments = api_get("/admin/assignments", admin_token)
    print("Assignments count:", len(assignments))

    print("\n--- 6. Doctor API: Patient list ---")
    doc_patients = api_get("/kg/patients", doc_token)
    print("Doctor assigned patients:", doc_patients)

    print("\n--- 7. Doctor RBAC Guard Test ---")
    # Doctor trying to access /admin/users should get 403
    try:
        api_get("/admin/users", doc_token)
        raise AssertionError("Doctor should not be able to access /admin/users")
    except urllib.error.HTTPError as e:
        print(f"Doctor blocked from admin endpoint: HTTP {e.code} (Expected 403)")
        assert e.code == 403

    print("\n--- 8. Patient Access Test ---")
    pat_info = api_get("/kg/patients", pat_token)
    print("Patient self-roster:", pat_info)

    print("\nALL API TESTS PASSED!")

if __name__ == "__main__":
    test()
