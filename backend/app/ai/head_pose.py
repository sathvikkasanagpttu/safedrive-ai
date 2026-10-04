import time
from collections import deque
from typing import Tuple, Optional, Dict, Any, List
from app.ai.base import HeadPoseResult, AttentionState, AttentionResult
from app.config import settings

class HeadPoseUpdateResult(tuple):
    def __new__(cls, event_triggered: bool, payload: Dict[str, Any], attention_result: Optional[AttentionResult] = None):
        return super().__new__(cls, (event_triggered, payload))

    def __init__(self, event_triggered: bool, payload: Dict[str, Any], attention_result: Optional[AttentionResult] = None):
        self.event_triggered = event_triggered
        self.payload = payload
        self.attention_result = attention_result

class HeadPoseService:
    def __init__(
        self,
        persistence_frames: int = settings.DISTRACTION_PERSISTENCE_FRAMES,
        history_frames: int = 150, # 5-second window
    ):
        self.persistence_frames = persistence_frames
        self.history_frames = history_frames
        self.current_direction = "FOCUSED"
        self.persisting_direction = "FOCUSED"
        self.distraction_frame_count = 0
        self.distraction_start_time: Optional[float] = None
        self.is_distraction_confirmed = False

        # SafeDrive 2.0 Attention History & Stability
        self.direction_history = deque(maxlen=history_frames)
        self.focused_streak_start: Optional[float] = None
        self.current_attention_score = 90.0

    def update(
        self,
        pose: HeadPoseResult,
        timestamp: Optional[float] = None,
        phone_active: bool = False
    ) -> Tuple[bool, Dict[str, Any], AttentionResult]:
        """
        SafeDrive 2.0 Attention & Distraction Intelligence Engine.
        Combines:
          Head Pose (Yaw, Pitch, Roll)
          + Direction Classification
          + Duration Persistence
          + Attention History Tracking
        Returns: (event_triggered, event_payload, attention_result)
        """
        now = timestamp if timestamp is not None else time.time()
        self.current_direction = pose.direction
        event_triggered = False
        payload = {}

        # Standardize attention state enum
        if not pose.is_distracted:
            state = AttentionState.FOCUSED
        elif "LEFT" in pose.direction:
            state = AttentionState.LEFT_DISTRACTED
        elif "RIGHT" in pose.direction:
            state = AttentionState.RIGHT_DISTRACTED
        elif "DOWN" in pose.direction:
            state = AttentionState.DOWNWARD_DISTRACTED
        elif "UP" in pose.direction:
            state = AttentionState.UPWARD_DISTRACTED
        else:
            state = AttentionState.UNKNOWN

        self.direction_history.append(state)

        # 1. Distraction Persistence Evaluation
        if pose.is_distracted:
            self.focused_streak_start = None
            if self.distraction_frame_count == 0:
                self.distraction_start_time = now
                self.persisting_direction = pose.direction

            self.distraction_frame_count += 1
            duration = (now - self.distraction_start_time) if self.distraction_start_time else 0.0

            if self.distraction_frame_count >= self.persistence_frames:
                if not self.is_distraction_confirmed:
                    self.is_distraction_confirmed = True
                    event_triggered = True

                    severity = "warning"
                    if duration > 3.0:
                        severity = "high"
                    if duration > 5.0 or state == AttentionState.DOWNWARD_DISTRACTED:
                        severity = "critical"

                    confidence = min(1.0, 0.75 + (self.distraction_frame_count / 100.0))
                    payload = {
                        "direction": self.persisting_direction,
                        "attention_state": state.value,
                        "pitch": round(pose.pitch, 1),
                        "yaw": round(pose.yaw, 1),
                        "roll": round(pose.roll, 1),
                        "duration_seconds": round(duration, 2),
                        "start_time": self.distraction_start_time,
                        "severity": severity,
                        "confidence": round(confidence, 2),
                    }
        else:
            if self.focused_streak_start is None:
                self.focused_streak_start = now
            if self.is_distraction_confirmed:
                self.is_distraction_confirmed = False
            self.distraction_frame_count = 0
            self.distraction_start_time = None

        # 2. Attention Score Calculation (0 to 100)
        # Base score from frontal alignment
        yaw_dev = abs(pose.yaw)
        pitch_dev = abs(pose.pitch)

        penalty = 0.0
        if yaw_dev > 15.0:
            penalty += min(40.0, (yaw_dev - 15.0) * 1.5)
        if pitch_dev > 12.0:
            penalty += min(45.0, (pitch_dev - 12.0) * 2.0)
        if phone_active:
            penalty += 35.0
        if self.distraction_frame_count > 0:
            penalty += min(25.0, self.distraction_frame_count * 0.8)

        raw_score = max(5.0, min(100.0, 100.0 - penalty))
        # Exponential smoothing
        self.current_attention_score = round(0.75 * self.current_attention_score + 0.25 * raw_score, 1)

        # 3. Contributing factors explainability checklist
        factors: List[str] = []
        if yaw_dev <= 15.0:
            factors.append("Head aligned forward (|yaw| < 15°)")
        else:
            factors.append(f"Head turned {self.current_direction} ({yaw_dev:.1f}°)")

        if pitch_dev <= 15.0:
            factors.append("Gaze forward centered on roadway")
        elif pose.pitch < -12.0:
            factors.append(f"Downward gaze diversion ({abs(pose.pitch):.1f}° pitch)")
        else:
            factors.append(f"Upward gaze diversion ({pose.pitch:.1f}° pitch)")

        if not phone_active:
            factors.append("No mobile device interaction detected")
        else:
            factors.append("Handheld device detected in proximity")

        focused_time = round(now - self.focused_streak_start, 1) if self.focused_streak_start else 0.0
        if focused_time > 10.0:
            factors.append(f"Stable attention sustained for {focused_time}s")
        elif self.distraction_frame_count > 0:
            distr_time = round(now - self.distraction_start_time, 1) if self.distraction_start_time else 0.0
            factors.append(f"Distraction sustained for {distr_time}s")

        attention_result = AttentionResult(
            attention_state=state,
            attention_score=self.current_attention_score,
            contributing_factors=factors,
            duration_seconds=round(focused_time if not pose.is_distracted else (now - (self.distraction_start_time or now)), 2)
        )

        return HeadPoseUpdateResult(event_triggered, payload, attention_result)

    def reset(self):
        self.current_direction = "FOCUSED"
        self.persisting_direction = "FOCUSED"
        self.distraction_frame_count = 0
        self.distraction_start_time = None
        self.is_distraction_confirmed = False
        self.focused_streak_start = None
        self.current_attention_score = 90.0
        self.direction_history.clear()
