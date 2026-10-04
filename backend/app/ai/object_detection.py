import time
import os
import numpy as np
from typing import List, Optional, Tuple, Dict, Any
from app.ai.base import ObjectDetectionResult, PhoneState, BoundingBox, PhoneInteractionResult
from app.config import settings

# Disable ultralytics telemetry and checks
os.environ["YOLO_VERBOSE"] = "False"

class ObjectDetectionService:
    def __init__(self):
        self.model = None
        self._model_loaded = False
        self.phone_persistence_count = 0
        self.phone_detected_time: Optional[float] = None
        self.current_state = PhoneState.NOT_DETECTED

    def _load_model(self):
        if self._model_loaded:
            return
        self._model_loaded = True
        try:
            from ultralytics import YOLO
            self.model = YOLO("yolov8n.pt")
        except Exception:
            self.model = None

    def detect_objects(self, frame_bgr: np.ndarray, driver_bbox: Optional[BoundingBox] = None) -> ObjectDetectionResult:
        self._load_model()
        if self.model is None:
            return ObjectDetectionResult()

        try:
            # Run inference targeting cell phone (COCO class 67)
            results = self.model.predict(
                source=frame_bgr,
                classes=[67],
                conf=settings.PHONE_CONFIDENCE_THRESHOLD,
                verbose=False
            )
            detected_boxes: List[BoundingBox] = []
            max_conf = 0.0

            for r in results:
                for box in r.boxes:
                    conf = float(box.conf[0])
                    xywh = box.xywh[0].tolist()
                    x, y, w, h = xywh
                    detected_boxes.append(BoundingBox(
                        x=round(x - w / 2, 1),
                        y=round(y - h / 2, 1),
                        width=round(w, 1),
                        height=round(h, 1),
                        confidence=round(conf, 2)
                    ))
                    max_conf = max(max_conf, conf)

            # Determine proximity to driver
            proximity = False
            if detected_boxes and driver_bbox:
                for p_box in detected_boxes:
                    head_cx = driver_bbox.x + driver_bbox.width / 2
                    head_cy = driver_bbox.y + driver_bbox.height / 2
                    phone_cx = p_box.x + p_box.width / 2
                    phone_cy = p_box.y + p_box.height / 2

                    dx = abs(head_cx - phone_cx)
                    dy = abs(head_cy - phone_cy)
                    if dx < (driver_bbox.width * 1.8) and dy < (driver_bbox.height * 2.5):
                        proximity = True
                        break

            return ObjectDetectionResult(
                phones_detected=detected_boxes,
                phone_confidence=round(max_conf, 2),
                proximity_to_driver=proximity
            )
        except Exception:
            return ObjectDetectionResult()

    def update_phone_interaction(
        self,
        detection: ObjectDetectionResult,
        driver_is_distracted: bool = False,
        driver_bbox: Optional[BoundingBox] = None,
        timestamp: Optional[float] = None
    ) -> Tuple[PhoneState, bool, Dict[str, Any], PhoneInteractionResult]:
        """
        SafeDrive 2.0 Smart Phone Interaction Engine.
        Combines:
          Phone Detection
          + Hand / Steering Region Proximity
          + Driver Position Proximity
          + Head / Gaze Diversion
          + Temporal Persistence
        """
        now = timestamp if timestamp is not None else time.time()
        event_triggered = False
        details = {}

        has_phone = len(detection.phones_detected) > 0
        driver_prox = detection.proximity_to_driver
        hand_prox = False

        if has_phone and driver_bbox and detection.phones_detected:
            # Check hand/lap region (below facial bbox)
            p_box = detection.phones_detected[0]
            if p_box.y > (driver_bbox.y + driver_bbox.height * 0.7):
                hand_prox = True

        if has_phone:
            if self.phone_persistence_count == 0:
                self.phone_detected_time = now

            self.phone_persistence_count += 1
            duration = (now - self.phone_detected_time) if self.phone_detected_time else 0.0

            # Calculate multi-factor interaction probability
            base_prob = 0.35 * (detection.phone_confidence or 0.8)
            if driver_prox:
                base_prob += 0.25
            if hand_prox:
                base_prob += 0.20
            if driver_is_distracted:
                base_prob += 0.20

            time_factor = min(1.0, self.phone_persistence_count / 15.0)
            interaction_prob = round(float(min(0.98, max(0.20, base_prob * (0.5 + 0.5 * time_factor)))), 2)

            # Determine state & severity
            if driver_prox and (self.phone_persistence_count >= settings.PHONE_PERSISTENCE_FRAMES or driver_is_distracted):
                if self.current_state != PhoneState.CONFIRMED_PHONE_USAGE:
                    self.current_state = PhoneState.CONFIRMED_PHONE_USAGE
                    event_triggered = True
                    severity = "critical" if driver_is_distracted else "high"
                    details = {
                        "phone_state": "CONFIRMED_PHONE_USAGE",
                        "confidence": detection.phone_confidence,
                        "interaction_probability": interaction_prob,
                        "duration_seconds": round(duration, 2),
                        "driver_proximity": True,
                        "hand_proximity": hand_prox,
                        "attention_diverted": driver_is_distracted,
                        "severity": severity
                    }
            elif driver_prox and self.phone_persistence_count >= 3:
                if self.current_state not in (PhoneState.POSSIBLE_PHONE_USAGE, PhoneState.CONFIRMED_PHONE_USAGE):
                    self.current_state = PhoneState.POSSIBLE_PHONE_USAGE
                    event_triggered = True
                    severity = "warning"
                    details = {
                        "phone_state": "POSSIBLE_PHONE_USAGE",
                        "confidence": detection.phone_confidence,
                        "interaction_probability": interaction_prob,
                        "duration_seconds": round(duration, 2),
                        "driver_proximity": True,
                        "hand_proximity": hand_prox,
                        "attention_diverted": driver_is_distracted,
                        "severity": severity
                    }
            else:
                self.current_state = PhoneState.PHONE_DETECTED
                severity = "info"
        else:
            self.current_state = PhoneState.NOT_DETECTED
            self.phone_persistence_count = 0
            self.phone_detected_time = None
            duration = 0.0
            interaction_prob = 0.0
            severity = "low"

        interaction_result = PhoneInteractionResult(
            phones_detected=detection.phones_detected,
            phone_state=self.current_state,
            interaction_probability=interaction_prob,
            driver_proximity=driver_prox,
            hand_proximity=hand_prox,
            attention_diverted=driver_is_distracted,
            duration_seconds=round(duration, 2),
            severity=severity
        )

        return self.current_state, event_triggered, details, interaction_result

    # Legacy method wrapper for backwards compatibility
    def update_phone_state(
        self,
        detection: ObjectDetectionResult,
        driver_is_distracted: bool = False,
        timestamp: Optional[float] = None
    ) -> Tuple[PhoneState, bool, Dict[str, Any]]:
        state, triggered, details, _ = self.update_phone_interaction(
            detection=detection,
            driver_is_distracted=driver_is_distracted,
            timestamp=timestamp
        )
        return state, triggered, details

    def reset(self):
        self.phone_persistence_count = 0
        self.phone_detected_time = None
        self.current_state = PhoneState.NOT_DETECTED
