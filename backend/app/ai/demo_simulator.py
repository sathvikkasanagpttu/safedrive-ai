import time
import math
from typing import Dict, Any, List
from app.ai.base import (
    FusedFrameOutput, IdentityResult, LandmarkResult, HeadPoseResult,
    BoundingBox, AttentionState, DrowsinessState, YawnState, PhoneState,
    ObjectDetectionResult, AttentionResult, PhoneInteractionResult, VehicleTelemetryData
)

class DemoSimulator:
    """
    SafeDrive 2.0 High-Fidelity Multi-Signal Telemetry Simulator for DEMO MODE.
    Provides realistic driving scenarios:
    - Normal driving periods (EAR ~0.31, MAR ~0.18, Focused, Risk ~15, Speed 68 km/h)
    - Yawning fatigue at t=8s to 14s
    - Looking right / mirror check distraction at t=18s to 26s
    - Phone interaction phase at t=32s to 42s (Prob: 92%, speed 74 km/h)
    - Prolonged eye closure & critical drowsiness hazard at t=48s to 58s (Emergency braking)
    - Nominal recovery at t=60s to 75s
    """
    def __init__(self):
        self.start_time = time.time()
        self.frame_index = 0
        self.lat = 37.7749
        self.lng = -122.4194

    def generate_next_frame(self, driver_name: str = "John Doe (Demo)") -> FusedFrameOutput:
        self.frame_index += 1
        now = time.time()
        elapsed = (now - self.start_time) % 75.0  # 75s cycle

        # Defaults
        ear_avg = 0.31 + 0.02 * math.sin(self.frame_index * 0.1)
        mar = 0.18 + 0.02 * math.cos(self.frame_index * 0.08)
        yaw = 1.5 * math.sin(self.frame_index * 0.05)
        pitch = -2.0 + 1.0 * math.cos(self.frame_index * 0.05)
        roll = 0.0
        direction = "FOCUSED"
        attention = AttentionState.FOCUSED
        attention_score = 92.0
        drowsiness = DrowsinessState.NORMAL
        yawn = YawnState.IDLE
        phone = PhoneState.NOT_DETECTED
        phone_prob = 0.0
        phone_boxes = []
        is_distracted = False
        speed = 68.0 + 3.0 * math.sin(elapsed / 10.0)
        hard_braking = False
        perclos = 0.04
        events: List[Dict[str, Any]] = []
        alerts: List[Dict[str, Any]] = []
        evidence_captured = False
        evidence_url = None

        vib_x = 2.0 * math.sin(self.frame_index * 0.3)
        vib_y = 1.5 * math.cos(self.frame_index * 0.25)
        face_bbox = BoundingBox(
            x=round(240 + vib_x, 1),
            y=round(110 + vib_y, 1),
            width=160.0,
            height=190.0,
            confidence=0.98
        )

        factors = [
            "Head aligned forward (|yaw| < 15°)",
            "Gaze centered on road ahead",
            "No device interaction detected",
            f"Stable attention sustained ({int(elapsed % 45)}s)"
        ]

        # Scenarios along 75-second timeline:
        if 8.0 <= elapsed <= 14.0:
            # Yawning phase
            progress = (elapsed - 8.0) / 6.0
            mar = 0.20 + 0.50 * math.sin(progress * math.pi)
            if mar > 0.55:
                yawn = YawnState.YAWNING_CONFIRMED
                drowsiness = DrowsinessState.EARLY_FATIGUE
                perclos = 0.14
                attention_score = 78.0
                factors = ["Mouth opening exceeds threshold (MAR > 0.58)", "Circadian yawn persistence confirmed", "Mild eye drooping"]
                if int(elapsed * 10) % 20 == 0:
                    events.append({
                        "event_type": "YAWNING",
                        "severity": "warning",
                        "confidence": 0.92,
                        "duration_seconds": round(elapsed - 8.0, 1),
                        "details": {"mar": round(mar, 2), "evidence_factors": factors, "risk_contribution": 14.0}
                    })
            else:
                yawn = YawnState.YAWNING_STARTED

        elif 18.0 <= elapsed <= 26.0:
            # Head Distraction Looking Right
            yaw = 32.0 + 4.0 * math.sin(elapsed * 2)
            direction = "LOOKING_RIGHT"
            is_distracted = True
            attention = AttentionState.RIGHT_DISTRACTED
            attention_score = 48.0
            factors = [f"Head turned right (yaw: {yaw:.1f}°)", "Driver gaze off roadway for >2.0s", "Speed context amplifies hazard"]
            if elapsed > 21.0:
                evidence_captured = True
                evidence_url = f"evidence://session/demo/frame_{self.frame_index}_distraction.jpg"
                if int(elapsed * 10) % 30 == 0:
                    alerts.append({
                        "alert_type": "HEAD_DISTRACTION",
                        "severity": "warning",
                        "title": "Head Turn Distraction",
                        "message": "Driver gaze diverted from roadway (>2.5s)",
                        "sound_alert": True
                    })

        elif 32.0 <= elapsed <= 42.0:
            # Phone usage phase
            phone = PhoneState.CONFIRMED_PHONE_USAGE
            phone_prob = 0.92
            phone_boxes.append(BoundingBox(x=340, y=280, width=55, height=95, confidence=0.88))
            pitch = 24.0  # looking down at phone
            direction = "LOOKING_DOWN"
            is_distracted = True
            attention = AttentionState.DOWNWARD_DISTRACTED
            attention_score = 31.0
            speed = 74.5
            factors = [
                "Handheld cell phone detected (prob: 92%)",
                "Hand and lap proximity confirmed",
                "Downward gaze (pitch: -24.0°)",
                f"Interaction sustained for {elapsed - 32.0:.1f}s"
            ]
            if elapsed > 35.0:
                evidence_captured = True
                evidence_url = f"evidence://session/demo/frame_{self.frame_index}_phone.jpg"
                if int(elapsed * 10) % 30 == 0:
                    alerts.append({
                        "alert_type": "PHONE_USAGE",
                        "severity": "critical",
                        "title": "Confirmed Phone Interaction",
                        "message": "Driver operating mobile device while vehicle in motion",
                        "sound_alert": True
                    })

        elif 48.0 <= elapsed <= 58.0:
            # Severe Drowsiness / Microsleep
            ear_avg = 0.12 - 0.03 * min(1.0, (elapsed - 48.0) / 5.0)
            perclos = 0.62
            drowsiness = DrowsinessState.CRITICAL_DROWSINESS if elapsed > 52.0 else DrowsinessState.CONFIRMED_DROWSINESS
            attention = AttentionState.EYES_CLOSED
            attention_score = 15.0
            pitch = 15.0  # head nod down
            hard_braking = elapsed > 53.0
            speed = max(25.0, speed - 15.0) if hard_braking else speed
            factors = [
                "Prolonged eye closure (EAR < 0.15)",
                "PERCLOS elevated at 62% in rolling window",
                "Abnormal blink pattern / zero recovery",
                "Emergency deceleration conflict" if hard_braking else "Circadian fatigue"
            ]
            if elapsed > 51.0:
                evidence_captured = True
                evidence_url = f"evidence://session/demo/frame_{self.frame_index}_drowsiness.jpg"
                if int(elapsed * 10) % 25 == 0:
                    alerts.append({
                        "alert_type": "DROWSINESS",
                        "severity": "critical",
                        "title": "Critical Drowsiness Alert",
                        "message": "Prolonged eye closure detected (>3.0s). Immediate intervention recommended!",
                        "sound_alert": True
                    })

        # Calculate simulated risk score with context
        base_risk = 16.0
        contributors = []
        if drowsiness in (DrowsinessState.CONFIRMED_DROWSINESS, DrowsinessState.CRITICAL_DROWSINESS):
            contrib = 52.0 if drowsiness == DrowsinessState.CRITICAL_DROWSINESS else 38.0
            base_risk += contrib
            contributors.append({"type": "prolonged_eye_closure", "points": contrib, "weight": 0.40, "contribution_pct": 55.0})
        if is_distracted:
            contrib = 26.0
            base_risk += contrib
            contributors.append({"type": "head_distraction", "points": contrib, "weight": 0.25, "contribution_pct": 30.0})
        if phone == PhoneState.CONFIRMED_PHONE_USAGE:
            contrib = 28.0
            base_risk += contrib
            contributors.append({"type": "phone_usage", "points": contrib, "weight": 0.25, "contribution_pct": 32.0})
        if hard_braking:
            base_risk += 18.0
            contributors.append({"type": "hard_braking_conflict", "points": 18.0, "weight": 0.20, "contribution_pct": 20.0})

        final_risk = min(100.0, round(base_risk, 1))
        if final_risk <= 30.0:
            category = "low"
        elif final_risk <= 60.0:
            category = "moderate"
        elif final_risk <= 80.0:
            category = "high"
        else:
            category = "critical"

        # Telemetry translation
        dist_m = (speed * 1000.0 / 3600.0) * 0.033
        self.lat += (dist_m * math.cos(math.radians(85.0))) / 111111.0
        self.lng += (dist_m * math.sin(math.radians(85.0))) / (111111.0 * math.cos(math.radians(self.lat)))

        telemetry_data = VehicleTelemetryData(
            speed=round(speed, 1),
            acceleration=-0.45 if hard_braking else 0.15,
            hard_braking=hard_braking,
            steering_angle=round(4.0 * math.sin(elapsed / 5.0), 1),
            gps_lat=round(self.lat, 6),
            gps_lng=round(self.lng, 6),
            heading=85.0,
            trip_duration_sec=2520 + int(elapsed),
            is_night=False
        )

        identity_res = IdentityResult(
            driver_id=1,
            driver_name=driver_name,
            driver_code="DRV-1001",
            confidence=0.968,
            is_authorized=True,
            stability="HIGH",
            face_quality="GOOD",
            quality_score=0.88,
            status="AUTHORIZED",
            embedding_similarity=0.972,
            temporal_consistency=0.98
        )

        attn_res = AttentionResult(
            attention_state=attention,
            attention_score=attention_score,
            contributing_factors=factors,
            duration_seconds=round(elapsed % 30, 1)
        )

        phone_res = PhoneInteractionResult(
            phones_detected=phone_boxes,
            phone_state=phone,
            interaction_probability=phone_prob,
            driver_proximity=len(phone_boxes) > 0,
            hand_proximity=len(phone_boxes) > 0,
            attention_diverted=is_distracted,
            duration_seconds=round(max(0.0, elapsed - 32.0), 1) if phone != PhoneState.NOT_DETECTED else 0.0,
            severity="critical" if phone_prob > 0.8 else ("high" if phone_prob > 0.5 else "low")
        )

        model_health = {
            "Face_Embedding": {"version": "v1.0.4", "status": "ACTIVE", "avg_latency_ms": 28.2, "fps": 30.0, "memory_mb": 115.0},
            "YOLO_Object_Detection": {"version": "v3.2.1", "status": "ACTIVE", "avg_latency_ms": 34.6, "fps": 26.5, "memory_mb": 240.0},
            "HeadPose_SolvePnP": {"version": "v1.4.0", "status": "ACTIVE", "avg_latency_ms": 11.8, "fps": 30.0, "memory_mb": 85.0},
            "Drowsiness_PERCLOS": {"version": "v2.1.0", "status": "ACTIVE", "avg_latency_ms": 7.4, "fps": 30.0, "memory_mb": 42.0},
        }

        return FusedFrameOutput(
            timestamp=now,
            frame_index=self.frame_index,
            face_detected=True,
            num_faces=1,
            identity=identity_res,
            head_pose=HeadPoseResult(pitch=pitch, yaw=yaw, roll=roll, direction=direction, is_distracted=is_distracted),
            landmarks=LandmarkResult(
                landmarks_2d=[(float(250 + i * 5), float(150 + i * 4)) for i in range(10)],
                ear_left=ear_avg,
                ear_right=ear_avg,
                ear_avg=round(ear_avg, 3),
                mar=round(mar, 3),
                perclos=perclos,
                blink_rate_bpm=14.5,
                face_bbox=face_bbox,
                num_faces_detected=1,
                face_quality_score=0.88,
                face_quality_label="GOOD"
            ),
            drowsiness_state=drowsiness,
            yawn_state=yawn,
            phone_state=phone,
            phone_interaction=phone_res,
            attention_state=attention,
            attention_result=attn_res,
            telemetry=telemetry_data,
            perclos=perclos,
            current_risk=final_risk,
            session_risk=32.4,
            driver_risk=28.0,
            fleet_percentile=84.5,
            risk_score=final_risk,
            risk_category=category,
            risk_contributors=contributors,
            events_generated=events,
            alerts_generated=alerts,
            evidence_captured=evidence_captured,
            evidence_frame_url=evidence_url,
            model_health=model_health,
            fps=30.0,
            inference_latency_ms=31.5
        )
