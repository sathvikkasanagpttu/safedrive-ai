import pytest
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.ai.face_recognition import FaceRecognitionService
from app.ai.head_pose import HeadPoseService
from app.ai.base import HeadPoseResult
from app.ai.object_detection import ObjectDetectionService
from app.ai.base import ObjectDetectionResult, BoundingBox
from app.ai.risk_engine import RiskEngine
from app.ai.copilot import AISafetyCopilot

def test_driver_identity_confidence_engine():
    service = FaceRecognitionService(embedding_dim=128)
    dummy_patch = (np.random.rand(64, 64, 3) * 255).astype(np.uint8)

    # 1. Quality assessment
    q_score, q_label, details = service.assess_face_quality(dummy_patch, head_yaw=5.0, head_pitch=2.0)
    assert 0.0 <= q_score <= 1.0
    assert q_label in ("EXCELLENT", "GOOD", "FAIR", "POOR")
    assert "laplacian_var" in details

    # 2. Advanced matching with confidence formula
    emb = service.generate_embedding(dummy_patch)
    gallery = [{
        "id": 1,
        "full_name": "John Doe",
        "driver_code": "DRV-1001",
        "embeddings": [emb],
        "quality_score": 0.95
    }]
    identity = service.match_driver_advanced(
        current_embedding=emb,
        raw_face_patch=dummy_patch,
        registered_drivers=gallery,
        head_yaw=0.0,
        head_pitch=0.0
    )
    assert identity.is_authorized is True
    assert identity.driver_id == 1
    assert identity.confidence >= 0.85
    assert identity.stability in ("HIGH", "MODERATE", "LOW")
    assert identity.status in ("AUTHORIZED", "OCCLUDED_VERIFIED")

def test_attention_score_and_explainability():
    service = HeadPoseService()

    # Frontal alignment
    frontal_pose = HeadPoseResult(pitch=0.0, yaw=0.0, roll=0.0, direction="FOCUSED", is_distracted=False)
    res_frontal = service.update(frontal_pose, timestamp=1.0)
    attn_frontal = res_frontal.attention_result
    assert attn_frontal.attention_score >= 85.0
    assert any("Head aligned" in f for f in attn_frontal.contributing_factors)

    # Distracted pose
    distracted_pose = HeadPoseResult(pitch=-25.0, yaw=35.0, roll=0.0, direction="LOOKING_RIGHT", is_distracted=True)
    res_distracted = service.update(distracted_pose, timestamp=2.0, phone_active=True)
    attn_distracted = res_distracted.attention_result
    assert attn_distracted.attention_score < attn_frontal.attention_score
    assert any("turned" in f.lower() or "diversion" in f.lower() for f in attn_distracted.contributing_factors)

def test_smart_phone_interaction_probability():
    service = ObjectDetectionService()
    phone_box = BoundingBox(x=320, y=280, width=50, height=90, confidence=0.92)
    driver_box = BoundingBox(x=250, y=100, width=150, height=180, confidence=0.98)

    detection = ObjectDetectionResult(
        phones_detected=[phone_box],
        phone_confidence=0.92,
        proximity_to_driver=True
    )

    state, triggered, details, interaction = service.update_phone_interaction(
        detection=detection,
        driver_is_distracted=True,
        driver_bbox=driver_box,
        timestamp=1.0
    )
    assert interaction.interaction_probability > 0.40
    assert interaction.driver_proximity is True
    assert interaction.attention_diverted is True

def test_context_aware_risk_compounding():
    engine = RiskEngine()

    # Base risk without speed context
    risk_base, cat_base, contrib_base = engine.calculate_risk(
        eye_closure_severity=0.0,
        head_distraction_severity=0.8,
        phone_usage_severity=0.0,
        yawn_severity=0.0,
        vehicle_speed=0.0
    )

    # Risk with high highway speed context (85 km/h)
    risk_speed, cat_speed, contrib_speed = engine.calculate_risk(
        eye_closure_severity=0.0,
        head_distraction_severity=0.8,
        phone_usage_severity=0.0,
        yawn_severity=0.0,
        vehicle_speed=85.0
    )
    assert risk_speed > risk_base
    assert any(c["type"] == "vehicle_speed_amplification" for c in contrib_speed)

    # Multi-level risk calculation
    multi = engine.get_multi_level_risk(current_risk=risk_speed, driver_historical_score=90.0)
    assert "current_risk" in multi
    assert "session_risk" in multi
    assert "driver_risk" in multi
    assert "fleet_percentile" in multi

def test_ai_safety_copilot_query():
    db = SessionLocal()
    try:
        copilot = AISafetyCopilot(db=db)
        # Test intent: high risk drivers
        res1 = copilot.query("Which drivers have the highest risk this week?")
        assert res1["intent"] == "HIGH_RISK_DRIVERS"
        assert "Top High-Risk Drivers" in res1["grounded_summary"]

        # Test intent: vehicle investigation
        res2 = copilot.query("Investigate Vehicle 101 safety records")
        assert res2["intent"] == "VEHICLE_INVESTIGATION"

        # Test intent: driver investigation
        res3 = copilot.query("What is the status of driver John Doe?")
        assert res3["intent"] == "DRIVER_INVESTIGATION"
        assert "John Doe" in res3["grounded_summary"]
    finally:
        db.close()

def test_enterprise_fleet_and_privacy_apis():
    with TestClient(app) as client:
        # Login as Admin
        resp = client.post("/api/auth/login", json={
            "email": "admin@safedrive.ai",
            "password": "Admin@123"
        })
        assert resp.status_code == 200
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Copilot API
        cp_resp = client.post("/api/copilot/query", json={"query": "Who are our highest risk drivers?"}, headers=headers)
        assert cp_resp.status_code == 200
        assert cp_resp.json()["intent"] == "HIGH_RISK_DRIVERS"

        # 2. Fleet Overview API
        fl_resp = client.get("/api/fleet/overview", headers=headers)
        assert fl_resp.status_code == 200
        assert fl_resp.json()["total_vehicles"] >= 4

        # 3. Privacy Settings API
        pr_resp = client.get("/api/privacy/settings", headers=headers)
        assert pr_resp.status_code == 200
        assert pr_resp.json()["video_retention_days"] >= 1

        # 4. MLOps Models API
        ml_resp = client.get("/api/mlops/models", headers=headers)
        assert ml_resp.status_code == 200
        assert len(ml_resp.json()) >= 4
