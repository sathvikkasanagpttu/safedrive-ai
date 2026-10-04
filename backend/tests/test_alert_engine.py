import pytest
from app.ai.alert_engine import AlertEngine

def test_alert_engine_cooldown_deduplication():
    engine = AlertEngine()
    session_id = "test-sess-001"

    # First occurrence should trigger
    trigger1 = engine.should_trigger_alert("drowsiness", session_id)
    assert trigger1 is True

    # Immediate second occurrence must be suppressed by cooldown
    trigger2 = engine.should_trigger_alert("drowsiness", session_id)
    assert trigger2 is False

def test_alert_payload_generation():
    engine = AlertEngine()
    payload = engine.create_alert_payload(
        alert_type="PHONE_USAGE",
        severity="critical",
        title="Distracted Phone Operation",
        message="Driver interacting with mobile device",
        session_id="test-sess-002"
    )
    assert payload["alert_type"] == "PHONE_USAGE"
    assert payload["severity"] == "critical"
    assert payload["sound_alert"] is True
    assert "timestamp" in payload
