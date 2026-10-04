import asyncio
import base64
import json
import logging
import time
from typing import Dict, Set, Optional, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import cv2
import numpy as np

from app.database import SessionLocal
from app.models.driver import Driver, DriverEmbedding
from app.models.session import DrivingSession, SessionStatus
from app.models.event import DetectionEvent, EventType, EventSeverity
from app.models.alert import Alert
from app.models.risk import RiskScore, RiskCategory
from app.ai.pipeline import FrameProcessingPipeline
from app.ai.demo_simulator import DemoSimulator

logger = logging.getLogger("safedrive.websocket")

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.disconnect(dc)

manager = ConnectionManager()

def load_registered_drivers_cache():
    db = SessionLocal()
    try:
        drivers = db.query(Driver).all()
        cache = []
        for d in drivers:
            embs = db.query(DriverEmbedding).filter(DriverEmbedding.driver_id == d.id).all()
            if embs:
                cache.append({
                    "id": d.id,
                    "full_name": d.full_name,
                    "driver_code": d.driver_code,
                    "embeddings": [e.embedding for e in embs],
                    "quality_score": embs[0].quality_score if embs else 0.95
                })
        return cache
    finally:
        db.close()

def build_telemetry_payload(output, mode_label: str = "LIVE"):
    return {
        "type": "TELEMETRY",
        "mode": mode_label,
        "timestamp": output.timestamp,
        "frame_index": output.frame_index,
        "driver": {
            "id": output.identity.driver_id,
            "name": output.identity.driver_name,
            "code": output.identity.driver_code,
            "confidence": round(output.identity.confidence * 100.0, 1),
            "stability": output.identity.stability,
            "face_quality": output.identity.face_quality,
            "quality_score": output.identity.quality_score,
            "status": output.identity.status,
            "is_authorized": output.identity.is_authorized
        },
        "attention": {
            "state": str(output.attention_result.attention_state.value if hasattr(output.attention_result.attention_state, 'value') else output.attention_result.attention_state),
            "score": output.attention_result.attention_score,
            "factors": output.attention_result.contributing_factors,
            "duration": output.attention_result.duration_seconds
        },
        "attention_state": str(output.attention_state.value if hasattr(output.attention_state, 'value') else output.attention_state),
        "drowsiness_state": str(output.drowsiness_state.value if hasattr(output.drowsiness_state, 'value') else output.drowsiness_state),
        "yawn_state": str(output.yawn_state.value if hasattr(output.yawn_state, 'value') else output.yawn_state),
        "phone_state": str(output.phone_state.value if hasattr(output.phone_state, 'value') else output.phone_state),
        "phone_interaction": {
            "probability": round(output.phone_interaction.interaction_probability * 100.0, 1),
            "proximity": output.phone_interaction.driver_proximity,
            "hand_proximity": output.phone_interaction.hand_proximity,
            "diverted": output.phone_interaction.attention_diverted,
            "severity": output.phone_interaction.severity
        },
        "vehicle_telemetry": {
            "speed": output.telemetry.speed,
            "acceleration": output.telemetry.acceleration,
            "hard_braking": output.telemetry.hard_braking,
            "steering": output.telemetry.steering_angle,
            "gps": {"lat": output.telemetry.gps_lat, "lng": output.telemetry.gps_lng},
            "trip_duration_sec": output.telemetry.trip_duration_sec,
            "is_night": output.telemetry.is_night
        },
        "risk": {
            "score": output.current_risk,
            "current_risk": output.current_risk,
            "session_risk": output.session_risk,
            "driver_risk": output.driver_risk,
            "fleet_percentile": output.fleet_percentile,
            "category": output.risk_category.upper(),
            "contributors": output.risk_contributors
        },
        "telemetry": {
            "ear": output.landmarks.ear_avg,
            "mar": output.landmarks.mar,
            "perclos": round(output.landmarks.perclos * 100.0, 1),
            "blink_rate": output.landmarks.blink_rate_bpm,
            "head_pose": {
                "pitch": round(output.head_pose.pitch, 1),
                "yaw": round(output.head_pose.yaw, 1),
                "roll": round(output.head_pose.roll, 1),
                "direction": output.head_pose.direction
            }
        },
        "boxes": {
            "face": {
                "x": output.landmarks.face_bbox.x,
                "y": output.landmarks.face_bbox.y,
                "w": output.landmarks.face_bbox.width,
                "h": output.landmarks.face_bbox.height
            } if output.landmarks.face_bbox else None,
            "phones": [
                {"x": p.x, "y": p.y, "w": p.width, "h": p.height, "conf": p.confidence}
                for p in output.phone_interaction.phones_detected
            ]
        },
        "evidence": {
            "captured": output.evidence_captured,
            "url": output.evidence_frame_url
        },
        "data_source": "LIVE" if mode_label == "LIVE" else "SIMULATED",
        "disclaimer": "Research and portfolio prototype. Not an automotive-certified safety system.",
        "model_health": output.model_health,
        "system": {
            "status": "LIVE",
            "data_source": "LIVE" if mode_label == "LIVE" else "SIMULATED",
            "fps": output.fps,
            "latency_ms": output.inference_latency_ms
        },
        "events": output.events_generated,
        "alerts": output.alerts_generated
    }

@router.websocket("/ws/live-monitor")
async def live_monitor_websocket(
    websocket: WebSocket,
    session_id: Optional[str] = Query(None),
    demo: Optional[bool] = Query(True),
    token: Optional[str] = Query(None)
):
    from app.config import settings
    from app.utils.security import decode_token

    # Authenticate token if provided, or enforce in production
    authenticated_user = None
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            authenticated_user = payload.get("sub")
            logger.info(f"WebSocket client authenticated as user {authenticated_user}")
        elif settings.ENVIRONMENT == "production":
            await websocket.close(code=1008, reason="Invalid or expired authentication token")
            return
    elif settings.ENVIRONMENT == "production" and not demo:
        await websocket.close(code=1008, reason="Authentication required for production telemetry stream")
        return

    await manager.connect(websocket)

    # Initialize frame pipeline and simulator
    registered_drivers = load_registered_drivers_cache()
    pipeline = FrameProcessingPipeline(registered_drivers=registered_drivers)
    simulator = DemoSimulator()

    is_simulating = demo if demo is not None else True
    simulation_task: Optional[asyncio.Task] = None
    telemetry_override: Optional[Dict[str, Any]] = None

    active_db_session_id = None
    if session_id:
        db = SessionLocal()
        try:
            db_session = db.query(DrivingSession).filter(DrivingSession.session_id == session_id).first()
            if db_session:
                active_db_session_id = db_session.id
        finally:
            db.close()

    async def run_simulation_loop():
        try:
            while True:
                output = simulator.generate_next_frame()
                payload = build_telemetry_payload(output, mode_label="DEMO MODE")
                await websocket.send_json(payload)
                await asyncio.sleep(0.08)  # ~12.5 Hz telemetry rate
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Simulation loop error: {e}")

    try:
        if is_simulating:
            simulation_task = asyncio.create_task(run_simulation_loop())

        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            msg_type = data.get("type", "").upper()

            if msg_type == "PING":
                await websocket.send_json({"type": "PONG", "timestamp": time.time()})

            elif msg_type == "START_DEMO":
                if simulation_task and not simulation_task.done():
                    simulation_task.cancel()
                simulation_task = asyncio.create_task(run_simulation_loop())
                await websocket.send_json({"type": "MODE_CHANGED", "mode": "DEMO"})

            elif msg_type == "STOP_DEMO":
                if simulation_task and not simulation_task.done():
                    simulation_task.cancel()
                await websocket.send_json({"type": "MODE_CHANGED", "mode": "CAMERA"})

            elif msg_type == "INJECT_TELEMETRY":
                telemetry_override = data.get("telemetry", {})
                await websocket.send_json({"type": "TELEMETRY_INJECTED", "status": "ACK"})

            elif msg_type == "FRAME":
                if simulation_task and not simulation_task.done():
                    simulation_task.cancel()

                img_b64 = data.get("data", "")
                if "," in img_b64:
                    img_b64 = img_b64.split(",")[1]

                try:
                    img_bytes = base64.b64decode(img_b64)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    if frame is not None:
                        output = pipeline.process_frame(
                            frame,
                            session_id=session_id,
                            telemetry_override=telemetry_override
                        )

                        # Persist events to DB if tied to active session
                        if active_db_session_id and (output.events_generated or output.alerts_generated):
                            db = SessionLocal()
                            try:
                                for ev in output.events_generated:
                                    ev_type_str = ev.get("event_type", "driver_recognized").lower()
                                    sev_str = ev.get("severity", "info").lower()
                                    db_ev = DetectionEvent(
                                        session_id=active_db_session_id,
                                        driver_id=output.identity.driver_id,
                                        event_type=EventType(ev_type_str) if ev_type_str in [e.value for e in EventType] else EventType.DRIVER_RECOGNIZED,
                                        severity=EventSeverity(sev_str) if sev_str in [s.value for s in EventSeverity] else EventSeverity.INFO,
                                        confidence=ev.get("confidence", 1.0),
                                        duration_seconds=ev.get("duration_seconds", 0.0),
                                        details=ev.get("details", {}),
                                        evidence_frame_url=output.evidence_frame_url,
                                        evidence_status="PENDING_REVIEW" if output.evidence_captured else "NO_EVIDENCE",
                                        evidence_factors=ev.get("details", {}).get("evidence_factors", []),
                                        risk_contribution=ev.get("details", {}).get("risk_contribution", 0.0)
                                    )
                                    db.add(db_ev)
                                    db.flush()

                                    # Capture real cryptographic evidence frame
                                    if output.evidence_captured and frame_bgr is not None:
                                        try:
                                            from app.services.evidence_service import EvidenceCaptureService
                                            cap_service = EvidenceCaptureService()
                                            ev_rec = cap_service.capture_and_store_frame(
                                                db=db,
                                                event_id=db_ev.id,
                                                session_id=active_db_session_id,
                                                frame_bgr=frame_bgr,
                                                retention_days=30
                                            )
                                            output.evidence_frame_url = f"/api/evidence/{ev_rec.id}"
                                        except Exception as ce:
                                            logger.warning(f"Real evidence frame capture error: {ce}")

                                for al in output.alerts_generated:
                                    db.add(Alert(
                                        session_id=active_db_session_id,
                                        alert_type=al["alert_type"],
                                        severity=EventSeverity(al["severity"].lower()),
                                        title=al["title"],
                                        message=al["message"],
                                        sound_alert=al.get("sound_alert", True)
                                    ))
                                db.commit()
                            except Exception as ex:
                                db.rollback()
                                logger.error(f"Failed to persist live events: {ex}")
                            finally:
                                db.close()

                        payload = build_telemetry_payload(output, mode_label="LIVE CAMERA")
                        await websocket.send_json(payload)
                except Exception as e:
                    logger.error(f"Error processing webcam frame: {e}")
                    await websocket.send_json({"type": "ERROR", "message": f"Frame decoding error: {str(e)}"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
    except Exception as e:
        logger.error(f"WebSocket unhandled error: {e}")
        manager.disconnect(websocket)
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
