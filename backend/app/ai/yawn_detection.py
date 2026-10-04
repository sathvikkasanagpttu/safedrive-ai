import time
from typing import Tuple, Optional
from app.ai.base import YawnState
from app.config import settings

class YawnDetectionService:
    def __init__(
        self,
        mar_threshold: float = settings.MAR_THRESHOLD,
        yawn_start_frames: int = settings.YAWN_START_FRAMES,
        yawn_confirm_frames: int = settings.YAWN_CONFIRM_FRAMES,
    ):
        self.mar_threshold = mar_threshold
        self.yawn_start_frames = yawn_start_frames
        self.yawn_confirm_frames = yawn_confirm_frames

        self.state = YawnState.IDLE
        self.open_frames = 0
        self.closed_frames = 0
        self.start_time: Optional[float] = None
        self.duration = 0.0
        self.max_mar = 0.0

    def update(self, current_mar: float, timestamp: Optional[float] = None) -> Tuple[YawnState, float, float, bool]:
        """
        Updates yawning temporal state machine.
        Returns: (state, duration_seconds, confidence, event_triggered)
        """
        now = timestamp if timestamp is not None else time.time()
        event_triggered = False
        confidence = 0.0

        if current_mar >= self.mar_threshold:
            if self.open_frames == 0:
                self.start_time = now
                self.max_mar = current_mar
            else:
                self.max_mar = max(self.max_mar, current_mar)

            self.open_frames += 1
            self.closed_frames = 0
            self.duration = (now - self.start_time) if self.start_time else 0.0

            # Temporal thresholds
            if self.open_frames >= self.yawn_confirm_frames:
                if self.state != YawnState.YAWNING_CONFIRMED:
                    self.state = YawnState.YAWNING_CONFIRMED
                    event_triggered = True
            elif self.open_frames >= self.yawn_start_frames:
                if self.state == YawnState.IDLE:
                    self.state = YawnState.YAWNING_STARTED
                    event_triggered = True

            confidence = min(1.0, float((self.max_mar / (self.mar_threshold * 1.5))))

        else:
            self.closed_frames += 1
            if self.closed_frames >= 4 and self.state in (YawnState.YAWNING_CONFIRMED, YawnState.YAWNING_STARTED):
                self.state = YawnState.YAWNING_ENDED
                event_triggered = True
                confidence = min(1.0, float((self.max_mar / (self.mar_threshold * 1.5))))
            elif self.closed_frames >= 12 and self.state == YawnState.YAWNING_ENDED:
                self.state = YawnState.IDLE
                self.open_frames = 0
                self.start_time = None
                self.duration = 0.0
                self.max_mar = 0.0

        return self.state, round(self.duration, 2), round(confidence, 2), event_triggered

    def reset(self):
        self.state = YawnState.IDLE
        self.open_frames = 0
        self.closed_frames = 0
        self.start_time = None
        self.duration = 0.0
        self.max_mar = 0.0
