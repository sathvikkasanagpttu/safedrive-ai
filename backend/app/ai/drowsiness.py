import time
from collections import deque
from typing import Tuple, Optional, Dict, Any
from app.ai.base import DrowsinessState
from app.config import settings

class DrowsinessService:
    def __init__(
        self,
        ear_threshold: float = settings.EAR_THRESHOLD,
        eyes_closing_frames: int = settings.EYES_CLOSING_FRAMES,
        possible_drowsy_frames: int = settings.POSSIBLE_DROWSINESS_FRAMES,
        confirmed_drowsy_frames: int = settings.CONFIRMED_DROWSINESS_FRAMES,
        alert_drowsy_frames: int = settings.ALERT_DROWSINESS_FRAMES,
        rolling_window_frames: int = 150, # 5-second rolling window at 30fps
    ):
        self.ear_threshold = ear_threshold
        self.eyes_closing_frames = eyes_closing_frames
        self.possible_drowsy_frames = possible_drowsy_frames
        self.confirmed_drowsy_frames = confirmed_drowsy_frames
        self.alert_drowsy_frames = alert_drowsy_frames
        self.rolling_window_frames = rolling_window_frames

        # State tracking
        self.state = DrowsinessState.EYES_OPEN
        self.closed_frames = 0
        self.open_frames = 0
        self.total_blinks = 0
        self.last_blink_time = time.time()
        self.closure_start_time: Optional[float] = None
        self.current_closure_duration = 0.0

        # SafeDrive 2.0 PERCLOS & Blink Pattern tracking
        self.ear_history = deque(maxlen=rolling_window_frames)
        self.blink_timestamps = deque(maxlen=60) # Last 60 blinks
        self.slow_blink_count = 0
        self.perclos_score = 0.0
        self.current_blink_rate = 16.0 # blinks/min

    def update(
        self,
        current_ear: float,
        timestamp: Optional[float] = None,
        is_yawning: bool = False
    ) -> Tuple[DrowsinessState, float, bool]:
        """
        Updates SafeDrive 2.0 Drowsiness Intelligence Engine.
        Combines:
          - Instantaneous EAR persistence
          - Rolling-window PERCLOS analysis
          - Abnormal blink duration (slow blinks)
          - Yawning co-occurrence
        Returns: (state, closure_duration_sec, event_triggered)
        """
        now = timestamp if timestamp is not None else time.time()
        event_triggered = False

        # Track rolling EAR for PERCLOS
        is_closed = current_ear < self.ear_threshold
        self.ear_history.append(1 if is_closed else 0)

        # Compute PERCLOS only when minimum sample history is reached (>= 15 frames)
        if len(self.ear_history) >= 15:
            self.perclos_score = round(sum(self.ear_history) / len(self.ear_history), 3)
        else:
            self.perclos_score = 0.0

        if is_closed:
            if self.closed_frames == 0:
                self.closure_start_time = now
            self.closed_frames += 1
            self.open_frames = 0
            self.current_closure_duration = (now - self.closure_start_time) if self.closure_start_time else 0.0

            # 5-Stage State Transitions based on configurable temporal evidence
            if self.closed_frames >= self.alert_drowsy_frames:
                if self.state != DrowsinessState.ALERTED:
                    self.state = DrowsinessState.ALERTED
                    event_triggered = True
            elif self.closed_frames >= self.confirmed_drowsy_frames:
                if self.state not in (DrowsinessState.DROWSINESS, DrowsinessState.ALERTED):
                    self.state = DrowsinessState.DROWSINESS
                    event_triggered = True
            elif self.closed_frames >= self.possible_drowsy_frames or self.perclos_score >= 0.25 or is_yawning:
                if self.state in (DrowsinessState.EYES_CLOSING, DrowsinessState.EYES_OPEN):
                    self.state = DrowsinessState.POSSIBLE_DROWSINESS
            elif self.closed_frames >= self.eyes_closing_frames:
                if self.state == DrowsinessState.EYES_OPEN:
                    self.state = DrowsinessState.EYES_CLOSING

        else:
            # Eyes open
            if self.closed_frames > 0:
                if 2 <= self.closed_frames < self.possible_drowsy_frames:
                    self.total_blinks += 1
                    self.blink_timestamps.append(now)
                    if self.closed_frames >= (self.possible_drowsy_frames - 2):
                        self.slow_blink_count += 1

                if len(self.blink_timestamps) >= 2:
                    span_sec = max(1.0, self.blink_timestamps[-1] - self.blink_timestamps[0])
                    self.current_blink_rate = round((len(self.blink_timestamps) / span_sec) * 60.0, 1)

            self.open_frames += 1
            if self.open_frames >= 5:
                # Recovery transitions
                if self.state in (DrowsinessState.ALERTED, DrowsinessState.DROWSINESS, DrowsinessState.POSSIBLE_DROWSINESS):
                    self.state = DrowsinessState.RECOVERED
                    event_triggered = True
                elif self.state == DrowsinessState.RECOVERED and self.open_frames >= 15:
                    self.state = DrowsinessState.EYES_OPEN
                elif self.state == DrowsinessState.EYES_CLOSING:
                    self.state = DrowsinessState.EYES_OPEN

                self.closed_frames = 0
                self.closure_start_time = None
                self.current_closure_duration = 0.0

        return self.state, round(self.current_closure_duration, 2), event_triggered

    def get_perclos(self) -> float:
        return self.perclos_score

    def get_blink_rate(self) -> float:
        return self.current_blink_rate

    def reset(self):
        self.state = DrowsinessState.EYES_OPEN
        self.closed_frames = 0
        self.open_frames = 0
        self.closure_start_time = None
        self.current_closure_duration = 0.0
        self.ear_history.clear()
