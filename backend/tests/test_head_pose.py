import pytest
from app.ai.head_pose import HeadPoseService
from app.ai.base import HeadPoseResult

def test_head_pose_glance_does_not_trigger():
    # Transient glances (< persistence_frames) should NOT trigger an event
    service = HeadPoseService(persistence_frames=10)
    pose = HeadPoseResult(pitch=0.0, yaw=30.0, roll=0.0, direction="LOOKING_RIGHT", is_distracted=True)

    for i in range(5):
        triggered, payload = service.update(pose, timestamp=1.0 + i*0.05)
        assert triggered is False
        assert payload == {}

def test_head_pose_sustained_distraction_triggers():
    service = HeadPoseService(persistence_frames=5)
    pose = HeadPoseResult(pitch=0.0, yaw=-32.0, roll=0.0, direction="LOOKING_LEFT", is_distracted=True)

    triggered_flag = False
    final_payload = {}
    for i in range(7):
        triggered, payload = service.update(pose, timestamp=1.0 + i*0.1)
        if triggered:
            triggered_flag = True
            final_payload = payload

    assert triggered_flag is True
    assert final_payload["direction"] == "LOOKING_LEFT"
    assert "severity" in final_payload
    assert "confidence" in final_payload
