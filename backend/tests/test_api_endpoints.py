import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_health_check_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["ai_engine"] == "ready"

def test_root_endpoint():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "SafeDrive AI" in data["name"]

def test_login_and_access_flow():
    with TestClient(app) as client:
        # Login as admin
        login_resp = client.post("/api/auth/login", json={
            "email": "admin@safedrive.ai",
            "password": "Admin@123"
        })
        assert login_resp.status_code == 200
        tokens = login_resp.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        access_token = tokens["access_token"]

        headers = {"Authorization": f"Bearer {access_token}"}

        # Fetch drivers
        drv_resp = client.get("/api/drivers", headers=headers)
        assert drv_resp.status_code == 200
        drivers = drv_resp.json()
        assert len(drivers) >= 1
        assert any(d["full_name"] == "John Doe" for d in drivers)

        # Fetch analytics
        an_resp = client.get("/api/analytics/overview", headers=headers)
        assert an_resp.status_code == 200
        an_data = an_resp.json()
        assert "overview" in an_data
        assert an_data["overview"]["total_drivers"] >= 1

        # Fetch sessions
        sess_resp = client.get("/api/sessions", headers=headers)
        assert sess_resp.status_code == 200
        sessions = sess_resp.json()
        assert len(sessions) >= 1

        # Fetch 42-minute demo session report
        demo_s = next((s for s in sessions if "DEMO" in s["session_id"]), sessions[0])
        rep_resp = client.get(f"/api/reports/{demo_s['id']}", headers=headers)
        assert rep_resp.status_code == 200
        rep_data = rep_resp.json()
        assert "executive_summary" in rep_data
        assert "risk_summary" in rep_data
        assert "recommendations" in rep_data

        # Download PDF report
        pdf_resp = client.get(f"/api/reports/{demo_s['id']}/pdf", headers=headers)
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert len(pdf_resp.content) > 1000  # valid PDF binary generated
