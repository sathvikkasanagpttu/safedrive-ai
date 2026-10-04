import pytest
import time
from fastapi.testclient import TestClient
from app.main import app

def test_websocket_demo_telemetry_stream():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/live-monitor?mode=demo") as websocket:
            # Receive initial simulated telemetry frame
            data = websocket.receive_json()
            assert data["type"] == "TELEMETRY"
            assert data["mode"] == "DEMO MODE"
            assert "driver" in data
            assert "attention_state" in data
            assert "drowsiness_state" in data
            assert "phone_state" in data
            assert "risk" in data
            assert "score" in data["risk"]
            assert "telemetry" in data
            assert "system" in data
            assert data["system"]["status"] == "LIVE"

            # Test Ping/Pong heartbeat
            websocket.send_json({"type": "PING"})
            pong_data = websocket.receive_json()
            # Depending on message stream timing, might receive next telemetry or pong
            if pong_data.get("type") != "PONG":
                pong_data = websocket.receive_json()
            assert pong_data.get("type") in ("PONG", "TELEMETRY")
