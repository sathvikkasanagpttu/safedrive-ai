import pytest
import numpy as np
import torch
from datetime import datetime

from app.ai.face_embedding import FaceQualityService, FaceEmbeddingService, FaceAlignmentService
from app.services.evidence_service import EvidenceHashService, EvidenceStorageService
from app.ai.model_monitor import model_monitor
from app.ai.copilot import AISafetyCopilot
from app.services.digital_twin_service import DigitalTwinService
from app.services.event_graph_service import EventGraphService
from app.database import SessionLocal, Base, engine
from app.models.driver import Driver
from app.models.session import DrivingSession, SessionStatus
from app.models.event import DetectionEvent, EventType, EventSeverity

def test_face_quality_evaluator():
    # Synthetic clean image
    clean_img = np.full((120, 120, 3), 128, dtype=np.uint8)
    # Add high-frequency noise for texture
    clean_img[::2, ::2] = 200
    q = FaceQualityService.evaluate(clean_img, yaw=5.0, pitch=-3.0)
    assert "quality_score" in q
    assert "is_acceptable" in q
    assert 0.0 <= q["quality_score"] <= 1.0

def test_face_embedding_neural_network():
    # Instantiate neural MobileFaceNet service
    service = FaceEmbeddingService()
    dummy_face = np.full((112, 112, 3), 120, dtype=np.uint8)
    emb = service.extract_embedding(dummy_face)
    assert len(emb) == 128
    # Test L2 normalization on unit hypersphere
    norm = np.linalg.norm(emb)
    assert abs(norm - 1.0) < 1e-4

def test_evidence_hash_cryptography(tmp_path):
    data = b"SafeDrive-AI-3.0-Evidence-Frame-Integrity-Test"
    expected_hash = EvidenceHashService.compute_sha256(data)
    assert len(expected_hash) == 64
    assert EvidenceHashService.verify_sha256(data, expected_hash) is True
    assert EvidenceHashService.verify_sha256(data + b"tamper", expected_hash) is False

def test_mlops_truthfulness_no_fabrication():
    # Before processing any frames, MLOps monitor should not fabricate 28.5 FPS
    telemetry = model_monitor.get_full_telemetry()
    assert telemetry["overall_status"] in ("NOT_MEASURED", "OPTIMAL")
    # In standby without frames, pipeline_fps is None, not a hardcoded 28.5 FPS
    if not telemetry["has_runtime_telemetry"]:
        assert telemetry["pipeline_fps"] is None

def test_digital_twin_minimum_sessions_truthfulness():
    db = SessionLocal()
    try:
        # Create a test driver
        driver = Driver(
            driver_code="TEST-TWIN-001",
            full_name="Truthful Baseline Driver",
            license_number="LIC-TEST-001"
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)

        # Query with 0 sessions
        twin_0 = DigitalTwinService.calculate_driver_digital_twin(db, driver.id)
        assert twin_0["status"] == "INSUFFICIENT_HISTORICAL_DATA"
        assert twin_0["sessions_found"] == 0
        assert twin_0["baseline"] is None

        # Add 1 session
        s1 = DrivingSession(
            session_id="SESS-TEST-001",
            driver_id=driver.id,
            start_time=datetime.utcnow(),
            duration_seconds=1200,
            avg_risk_score=22.0,
            status=SessionStatus.COMPLETED
        )
        db.add(s1)
        db.commit()

        twin_1 = DigitalTwinService.calculate_driver_digital_twin(db, driver.id)
        assert twin_1["status"] == "INSUFFICIENT_HISTORICAL_DATA"
        assert twin_1["sessions_found"] == 1

        # Add 2 more sessions to reach minimum 3
        s2 = DrivingSession(
            session_id="SESS-TEST-002",
            driver_id=driver.id,
            start_time=datetime.utcnow(),
            duration_seconds=1800,
            avg_risk_score=25.0,
            status=SessionStatus.COMPLETED
        )
        s3 = DrivingSession(
            session_id="SESS-TEST-003",
            driver_id=driver.id,
            start_time=datetime.utcnow(),
            duration_seconds=2400,
            avg_risk_score=19.0,
            status=SessionStatus.COMPLETED
        )
        db.add_all([s2, s3])
        db.commit()

        twin_3 = DigitalTwinService.calculate_driver_digital_twin(db, driver.id)
        assert twin_3["status"] == "CALIBRATED"
        assert twin_3["sessions_analyzed"] == 3
        assert twin_3["baseline"] is not None
        assert "mean_risk_score" in twin_3["baseline"]
        assert "rates_per_hour" in twin_3["baseline"]

        # Clean up
        db.delete(s1)
        db.delete(s2)
        db.delete(s3)
        db.delete(driver)
        db.commit()
    finally:
        db.close()

def test_event_graph_generation():
    import uuid
    sess_uid = f"SESS-GRAPH-{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    try:
        s = DrivingSession(
            session_id=sess_uid,
            start_time=datetime.utcnow(),
            duration_seconds=600,
            status=SessionStatus.COMPLETED
        )
        db.add(s)
        db.commit()
        db.refresh(s)

        e1 = DetectionEvent(
            session_id=s.id,
            event_type=EventType.PHONE_USAGE,
            severity=EventSeverity.HIGH,
            start_time=datetime.utcnow(),
            confidence=0.92
        )
        e2 = DetectionEvent(
            session_id=s.id,
            event_type=EventType.HEAD_DISTRACTION,
            severity=EventSeverity.CRITICAL,
            start_time=datetime.utcnow(),
            confidence=0.88
        )
        db.add_all([e1, e2])
        db.commit()

        graph = EventGraphService.build_or_get_session_graph(db, s.session_id)
        assert graph["session_id"] == sess_uid
        assert len(graph["nodes"]) == 2
        assert len(graph["edges"]) >= 1
        assert graph["edges"][0]["relationship"] in ("CONTRIBUTED_TO", "CO_OCCURRED", "PRECEDED", "ESCALATED")

        # Clean up
        from app.models.event_graph import EventGraphNode, EventGraphEdge
        db.query(EventGraphEdge).filter(EventGraphEdge.session_id == s.id).delete()
        db.query(EventGraphNode).filter(EventGraphNode.session_id == s.id).delete()
        db.delete(e1)
        db.delete(e2)
        db.delete(s)
        db.commit()
    finally:
        db.close()
