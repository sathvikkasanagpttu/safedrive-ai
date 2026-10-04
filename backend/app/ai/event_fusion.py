import time
from typing import Dict, Any, List, Optional
from app.ai.base import (
    AttentionState, DrowsinessState, YawnState, PhoneState,
    LandmarkResult, HeadPoseResult, IdentityResult, ObjectDetectionResult,
    FusedFrameOutput, AttentionResult, PhoneInteractionResult, VehicleTelemetryData
)
from app.ai.risk_engine import RiskEngine
from app.ai.alert_engine import AlertEngine

class EventFusionService:
    def __init__(self, risk_engine: Optional[RiskEngine] = None, alert_engine: Optional[AlertEngine] = None):
        self.risk_engine = risk_engine or RiskEngine()
        self.alert_engine = alert_engine or AlertEngine()

        # Exponential moving average for overall risk score to eliminate single-frame spikes
        self.smoothed_risk_score = 0.0
        self.smoothing_alpha = 0.35  # Weight of new instant measurement

        # History buffer
        self.recent_events: List[Dict[str, Any]] = []

    def fuse_signals(
        self,
        frame_index: int,
        timestamp: float,
        landmarks: LandmarkResult,
        head_pose: HeadPoseResult,
        identity: IdentityResult,
        drowsiness_state: DrowsinessState,
        closure_duration: float,
        yawn_state: YawnState,
        yawn_duration: float,
        phone_state: PhoneState,
        phone_detection: ObjectDetectionResult,
        tracking_event: Optional[Dict[str, Any]],
        session_id: Optional[str] = None,
        telemetry: Optional[VehicleTelemetryData] = None,
        attention_result: Optional[AttentionResult] = None,
        phone_interaction: Optional[PhoneInteractionResult] = None,
        model_health: Optional[Dict[str, Any]] = None,
    ) -> FusedFrameOutput:
        """
        SafeDrive 2.0 Multimodal Event Fusion Engine.
        Fuses:
          1. Face Quality & Identity Verification
          2. Eye State & PERCLOS Rolling Analysis
          3. 3D Head Pose & Gaze Attention Score
          4. Smart Phone Interaction Probability
          5. Vehicle Dynamic Telemetry (Speed, Braking, Night context)
        """
        if telemetry is None:
            telemetry = VehicleTelemetryData()

        # 1. Attention State Mapping
        if attention_result:
            attention_state = attention_result.attention_state
        elif landmarks.num_faces_detected == 0:
            attention_state = AttentionState.UNKNOWN
        elif drowsiness_state in (DrowsinessState.CRITICAL_DROWSINESS, DrowsinessState.CONFIRMED_DROWSINESS):
            attention_state = AttentionState.EYES_CLOSED
        elif head_pose.is_distracted:
            dir_map = {
                "LOOKING_LEFT": AttentionState.LEFT_DISTRACTED,
                "LOOKING_RIGHT": AttentionState.RIGHT_DISTRACTED,
                "LOOKING_DOWN": AttentionState.DOWNWARD_DISTRACTED,
                "LOOKING_UP": AttentionState.UPWARD_DISTRACTED,
            }
            attention_state = dir_map.get(head_pose.direction, AttentionState.FOCUSED)
        else:
            attention_state = AttentionState.FOCUSED

        # 2. Compute Normalized Severities
        eye_severity = 0.0
        if drowsiness_state == DrowsinessState.CRITICAL_DROWSINESS:
            eye_severity = 1.0
        elif drowsiness_state == DrowsinessState.CONFIRMED_DROWSINESS:
            eye_severity = 0.8
        elif drowsiness_state == DrowsinessState.SUSPECTED_DROWSINESS:
            eye_severity = 0.4
        elif drowsiness_state == DrowsinessState.EARLY_FATIGUE:
            eye_severity = 0.2

        head_severity = 0.0
        if head_pose.is_distracted:
            if "DOWN" in head_pose.direction:
                head_severity = 0.95
            else:
                head_severity = 0.70

        phone_severity = 0.0
        if phone_interaction:
            phone_severity = phone_interaction.interaction_probability
        elif phone_state == PhoneState.CONFIRMED_PHONE_USAGE:
            phone_severity = 1.0
        elif phone_state == PhoneState.POSSIBLE_PHONE_USAGE:
            phone_severity = 0.6
        elif phone_state == PhoneState.PHONE_DETECTED:
            phone_severity = 0.25

        yawn_severity = 0.0
        if yawn_state == YawnState.YAWNING_CONFIRMED:
            yawn_severity = 0.75
        elif yawn_state == YawnState.YAWNING_STARTED:
            yawn_severity = 0.35

        is_unknown = (landmarks.num_faces_detected > 0) and (not identity.is_authorized)

        # 3. Context-Aware Risk Calculation
        instant_risk, category, contributors = self.risk_engine.calculate_risk(
            eye_closure_severity=eye_severity,
            head_distraction_severity=head_severity,
            phone_usage_severity=phone_severity,
            yawn_severity=yawn_severity,
            is_unknown_driver=is_unknown,
            vehicle_speed=telemetry.speed,
            hard_braking=telemetry.hard_braking,
            trip_duration_hours=telemetry.trip_duration_sec / 3600.0,
            is_night=telemetry.is_night
        )

        # Temporal smoothing
        self.smoothed_risk_score = (
            self.smoothing_alpha * instant_risk + (1.0 - self.smoothing_alpha) * self.smoothed_risk_score
        )
        final_risk = round(self.smoothed_risk_score, 1)

        # 4-Tier Risk Metrics
        multi_risk = self.risk_engine.get_multi_level_risk(current_risk=final_risk)

        # 4. Generate Events, Deduplicated Alerts & Evidence Triggers
        events_generated: List[Dict[str, Any]] = []
        alerts_generated: List[Dict[str, Any]] = []
        evidence_captured = False
        evidence_url = None

        # Helper for evidence generation
        def create_evidence_payload(ev_type: str, factors: List[str], pts: float):
            nonlocal evidence_captured, evidence_url
            evidence_captured = True
            evidence_url = f"/api/evidence/pending_{frame_index}_{ev_type.lower()}"
            return {
                "evidence_url": evidence_url,
                "evidence_status": "PENDING_CAPTURE",
                "evidence_factors": factors,
                "risk_contribution": pts
            }

        # Drowsiness event & alert check
        if drowsiness_state in (DrowsinessState.CONFIRMED_DROWSINESS, DrowsinessState.CRITICAL_DROWSINESS):
            if self.alert_engine.should_trigger_alert("drowsiness", session_id):
                sev = "critical" if drowsiness_state == DrowsinessState.CRITICAL_DROWSINESS else "high"
                msg = f"Prolonged eye closure detected ({closure_duration}s, PERCLOS {landmarks.perclos*100:.0f}%) — High drowsiness hazard!"
                alert = self.alert_engine.create_alert_payload(
                    alert_type="DROWSINESS",
                    severity=sev,
                    title="Drowsiness Warning",
                    message=msg,
                    session_id=session_id,
                    metadata={"duration": closure_duration, "ear": landmarks.ear_avg, "perclos": landmarks.perclos}
                )
                alerts_generated.append(alert)

                ev_meta = create_evidence_payload(
                    "DROWSINESS",
                    [
                        f"Prolonged eye closure ({closure_duration:.1f}s)",
                        f"Elevated PERCLOS ({landmarks.perclos*100:.1f}%)",
                        f"Blink rate: {landmarks.blink_rate_bpm:.1f} bpm"
                    ],
                    pts=+34.0
                )
                events_generated.append({
                    "event_type": "DROWSINESS",
                    "severity": sev,
                    "confidence": 0.96,
                    "duration_seconds": closure_duration,
                    "details": {"ear": landmarks.ear_avg, "perclos": landmarks.perclos, **ev_meta}
                })

        # Head distraction alert check
        if head_pose.is_distracted and head_severity >= 0.7:
            if self.alert_engine.should_trigger_alert("head_distraction", session_id):
                sev = "critical" if head_pose.direction == "LOOKING_DOWN" else "high"
                msg = f"Driver head diverted {head_pose.direction} for {head_pose.duration_seconds}s at {telemetry.speed} km/h!"
                alert = self.alert_engine.create_alert_payload(
                    alert_type="HEAD_DISTRACTION",
                    severity=sev,
                    title="Distraction Warning",
                    message=msg,
                    session_id=session_id,
                    metadata={"direction": head_pose.direction, "duration": head_pose.duration_seconds, "speed": telemetry.speed}
                )
                alerts_generated.append(alert)

                ev_meta = create_evidence_payload(
                    "DISTRACTION",
                    [
                        f"Head turned {head_pose.direction} (yaw {head_pose.yaw:.1f}°)",
                        f"Distraction sustained for {head_pose.duration_seconds:.1f}s",
                        f"Vehicle travelling at {telemetry.speed:.0f} km/h"
                    ],
                    pts=+24.0
                )
                events_generated.append({
                    "event_type": "HEAD_DISTRACTION",
                    "severity": sev,
                    "confidence": 0.92,
                    "duration_seconds": head_pose.duration_seconds,
                    "details": {"direction": head_pose.direction, "yaw": head_pose.yaw, "pitch": head_pose.pitch, **ev_meta}
                })

        # Phone usage alert check
        if phone_severity >= 0.6:
            if self.alert_engine.should_trigger_alert("phone_usage", session_id):
                sev = "critical" if head_pose.is_distracted else "high"
                msg = f"Mobile phone interaction confirmed in driver cockpit (prob: {phone_severity*100:.0f}%)!"
                alert = self.alert_engine.create_alert_payload(
                    alert_type="PHONE_USAGE",
                    severity=sev,
                    title="Phone Usage Alert",
                    message=msg,
                    session_id=session_id,
                    metadata={"probability": phone_severity}
                )
                alerts_generated.append(alert)

                ev_meta = create_evidence_payload(
                    "PHONE_USAGE",
                    [
                        f"Handheld cell phone detected with {phone_severity*100:.0f}% interaction probability",
                        "Device located in driver proximity zone",
                        "Driver gaze diverted from roadway" if head_pose.is_distracted else "Single-hand device holding"
                    ],
                    pts=+28.0
                )
                events_generated.append({
                    "event_type": "PHONE_USAGE",
                    "severity": sev,
                    "confidence": phone_severity,
                    "duration_seconds": phone_interaction.duration_seconds if phone_interaction else 2.5,
                    "details": {"phone_state": "CONFIRMED_PHONE_USAGE", **ev_meta}
                })

        # Yawn alert check
        if yawn_state == YawnState.YAWNING_CONFIRMED:
            if self.alert_engine.should_trigger_alert("yawning", session_id):
                alert = self.alert_engine.create_alert_payload(
                    alert_type="YAWNING",
                    severity="warning",
                    title="Yawn Detected",
                    message=f"Driver yawn sustained ({yawn_duration}s) — Fatigue warning",
                    session_id=session_id,
                    metadata={"duration": yawn_duration, "mar": landmarks.mar}
                )
                alerts_generated.append(alert)
                events_generated.append({
                    "event_type": "YAWNING",
                    "severity": "warning",
                    "confidence": 0.88,
                    "duration_seconds": yawn_duration,
                    "details": {"mar": landmarks.mar}
                })

        # Tracking events
        if tracking_event:
            ev_type = tracking_event.get("event_type")
            if ev_type and self.alert_engine.should_trigger_alert(ev_type.lower(), session_id):
                alerts_generated.append(self.alert_engine.create_alert_payload(
                    alert_type=ev_type,
                    severity=tracking_event.get("severity", "warning"),
                    title=f"Tracking Alert: {ev_type}",
                    message=tracking_event.get("message", "Occupancy change detected"),
                    session_id=session_id
                ))
                events_generated.append(tracking_event)

        if attention_result is None:
            attention_result = AttentionResult(attention_state=attention_state)
        if phone_interaction is None:
            phone_interaction = PhoneInteractionResult(phone_state=phone_state)

        return FusedFrameOutput(
            timestamp=timestamp,
            frame_index=frame_index,
            face_detected=landmarks.num_faces_detected > 0,
            num_faces=landmarks.num_faces_detected,
            identity=identity,
            head_pose=head_pose,
            landmarks=landmarks,
            drowsiness_state=drowsiness_state,
            yawn_state=yawn_state,
            phone_state=phone_state,
            phone_interaction=phone_interaction,
            attention_state=attention_state,
            attention_result=attention_result,
            telemetry=telemetry,
            perclos=landmarks.perclos,
            current_risk=final_risk,
            session_risk=multi_risk["session_risk"],
            driver_risk=multi_risk["driver_risk"],
            fleet_percentile=multi_risk["fleet_percentile"],
            risk_score=final_risk,
            risk_category=category,
            risk_contributors=contributors,
            events_generated=events_generated,
            alerts_generated=alerts_generated,
            evidence_captured=evidence_captured,
            evidence_frame_url=evidence_url,
            model_health=model_health or {},
            fps=28.5,
            inference_latency_ms=32.0
        )
