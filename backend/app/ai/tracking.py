import time
from typing import Optional, Tuple, Dict, Any
from app.ai.base import BoundingBox

class TrackingService:
    def __init__(self, face_lost_threshold_frames: int = 20):
        self.face_lost_threshold_frames = face_lost_threshold_frames
        self.consecutive_lost_frames = 0
        self.is_face_lost_alerted = False
        self.last_known_bbox: Optional[BoundingBox] = None
        self.smoothing_factor = 0.7  # Exponential moving average for bbox jitter

    def update_tracking(
        self,
        num_faces: int,
        primary_bbox: Optional[BoundingBox],
        timestamp: Optional[float] = None
    ) -> Tuple[bool, Optional[str], Dict[str, Any], Optional[BoundingBox]]:
        """
        Updates tracking state.
        Returns: (event_triggered, event_type, details, smoothed_bbox)
        """
        event_triggered = False
        event_type = None
        details = {}
        smoothed_bbox = None

        if num_faces == 0:
            self.consecutive_lost_frames += 1
            if self.consecutive_lost_frames >= self.face_lost_threshold_frames and not self.is_face_lost_alerted:
                self.is_face_lost_alerted = True
                event_triggered = True
                event_type = "face_lost"
                details = {
                    "lost_frames": self.consecutive_lost_frames,
                    "severity": "warning",
                    "message": "Driver face not detected in camera frame"
                }
            smoothed_bbox = None

        elif num_faces > 1:
            # Multiple persons detected
            event_triggered = True
            event_type = "multiple_faces"
            details = {
                "num_faces": num_faces,
                "severity": "info",
                "message": f"Multiple occupants detected in vehicle cabin ({num_faces} faces)"
            }
            if primary_bbox:
                smoothed_bbox = self._smooth_bbox(primary_bbox)
            self.consecutive_lost_frames = 0
            self.is_face_lost_alerted = False

        else:
            # Exactly 1 driver face detected
            if self.is_face_lost_alerted:
                event_triggered = True
                event_type = "face_recovered"
                details = {"message": "Driver face re-acquired in frame"}
                self.is_face_lost_alerted = False

            self.consecutive_lost_frames = 0
            if primary_bbox:
                smoothed_bbox = self._smooth_bbox(primary_bbox)

        return event_triggered, event_type, details, smoothed_bbox

    def _smooth_bbox(self, current: BoundingBox) -> BoundingBox:
        if self.last_known_bbox is None:
            self.last_known_bbox = current
            return current

        alpha = self.smoothing_factor
        smoothed = BoundingBox(
            x=round(alpha * self.last_known_bbox.x + (1 - alpha) * current.x, 1),
            y=round(alpha * self.last_known_bbox.y + (1 - alpha) * current.y, 1),
            width=round(alpha * self.last_known_bbox.width + (1 - alpha) * current.width, 1),
            height=round(alpha * self.last_known_bbox.height + (1 - alpha) * current.height, 1),
            confidence=current.confidence
        )
        self.last_known_bbox = smoothed
        return smoothed

    def reset(self):
        self.consecutive_lost_frames = 0
        self.is_face_lost_alerted = False
        self.last_known_bbox = None
