import time
import numpy as np
import cv2
from typing import List, Dict, Any, Optional

from app.ai.base import FusedFrameOutput, IdentityResult, VehicleTelemetryData
from app.ai.face_landmark import FaceLandmarkService
from app.ai.face_recognition import FaceRecognitionService
from app.ai.drowsiness import DrowsinessService
from app.ai.yawn_detection import YawnDetectionService
from app.ai.head_pose import HeadPoseService
from app.ai.object_detection import ObjectDetectionService
from app.ai.tracking import TrackingService
from app.ai.event_fusion import EventFusionService
from app.ai.risk_engine import RiskEngine
from app.ai.alert_engine import AlertEngine
from app.ai.telemetry_provider import VehicleTelemetryProvider
from app.ai.model_monitor import AIModelMonitor

class FrameProcessingPipeline:
    def __init__(self, registered_drivers: Optional[List[Dict[str, Any]]] = None):
        self.face_landmark_service = FaceLandmarkService()
        self.face_recognition_service = FaceRecognitionService()
        self.drowsiness_service = DrowsinessService()
        self.yawn_service = YawnDetectionService()
        self.head_pose_service = HeadPoseService()
        self.object_detection_service = ObjectDetectionService()
        self.tracking_service = TrackingService()
        self.risk_engine = RiskEngine()
        self.alert_engine = AlertEngine()
        self.event_fusion_service = EventFusionService(
            risk_engine=self.risk_engine, alert_engine=self.alert_engine
        )
        self.telemetry_provider = VehicleTelemetryProvider()
        self.model_monitor = AIModelMonitor()

        self.registered_drivers: List[Dict[str, Any]] = registered_drivers or []
        self.frame_count = 0
        self.start_time = time.time()
        self.last_frame_time = time.time()
        self.current_fps = 30.0

        # Identity cache to avoid recomputing expensive embeddings every frame
        self.cached_identity = IdentityResult()
        self.identity_check_interval = 25  # re-check every 25 frames (~0.8 sec)

    def set_registered_drivers(self, drivers: List[Dict[str, Any]]):
        self.registered_drivers = drivers

    def process_frame(
        self,
        frame_bgr: np.ndarray,
        session_id: Optional[str] = None,
        custom_timestamp: Optional[float] = None,
        telemetry_override: Optional[Dict[str, Any]] = None
    ) -> FusedFrameOutput:
        """
        SafeDrive 2.0 Full Multimodal Perception Pipeline execution:
        Frame -> Preprocessing -> Face Mesh & Landmarks -> 3D Pose PnP -> Identity Confidence ->
        Object Detection -> Tracking -> PERCLOS Drowsiness -> Attention Score -> Telemetry Fusion -> Output
        """
        t0 = time.time()
        self.frame_count += 1
        now = custom_timestamp if custom_timestamp is not None else t0

        dt = t0 - self.last_frame_time
        self.last_frame_time = t0
        if dt > 0:
            self.current_fps = round(0.9 * self.current_fps + 0.1 * (1.0 / dt), 1)

        h, w = frame_bgr.shape[:2]

        # 1. Face & Landmarks
        t_lm = time.time()
        landmarks = self.face_landmark_service.process_frame(frame_bgr)
        self.model_monitor.record_inference("Landmarks", (time.time() - t_lm) * 1000.0)

        # 2. 3D Head Pose Estimation (SolvePnP)
        t_pose = time.time()
        if landmarks.landmarks_2d:
            head_pose = self.face_landmark_service.estimate_head_pose(landmarks.landmarks_2d, w, h)
        else:
            head_pose = self.face_landmark_service.estimate_head_pose([], w, h)
        self.model_monitor.record_inference("HeadPose_SolvePnP", (time.time() - t_pose) * 1000.0)

        # 3. Driver Identity Verification (Driver Identity Confidence Engine)
        raw_face = None
        if landmarks.num_faces_detected > 0:
            if (self.frame_count % self.identity_check_interval == 1) or not self.cached_identity.is_authorized:
                t_face = time.time()
                face_patch = self.face_recognition_service.extract_and_align_face(frame_bgr, landmarks.face_bbox)
                if face_patch is not None:
                    emb = self.face_recognition_service.generate_embedding(face_patch)
                    self.cached_identity = self.face_recognition_service.match_driver_advanced(
                        current_embedding=emb,
                        raw_face_patch=face_patch,
                        registered_drivers=self.registered_drivers,
                        head_yaw=head_pose.yaw,
                        head_pitch=head_pose.pitch
                    )
                self.model_monitor.record_inference("Face_Embedding", (time.time() - t_face) * 1000.0)
        else:
            self.cached_identity = IdentityResult()

        # 4. Object Detection (YOLOv8 Cell Phone & Device Interaction)
        t_obj = time.time()
        phone_detection = self.object_detection_service.detect_objects(frame_bgr, landmarks.face_bbox)
        phone_state, phone_triggered, phone_details, phone_interaction = self.object_detection_service.update_phone_interaction(
            phone_detection,
            driver_is_distracted=head_pose.is_distracted,
            driver_bbox=landmarks.face_bbox,
            timestamp=now
        )
        self.model_monitor.record_inference("YOLO_Object_Detection", (time.time() - t_obj) * 1000.0)

        # 5. Attention & Distraction Intelligence
        dist_res = self.head_pose_service.update(
            head_pose, timestamp=now, phone_active=phone_interaction.phone_state != "NOT_DETECTED"
        )
        distraction_triggered, dist_details = dist_res[0], dist_res[1]
        attention_result = getattr(dist_res, "attention_result", None)

        # 6. Tracking & Occupancy
        trk_triggered, trk_type, trk_details, smoothed_bbox = self.tracking_service.update_tracking(
            landmarks.num_faces_detected, landmarks.face_bbox, timestamp=now
        )
        if smoothed_bbox:
            landmarks.face_bbox = smoothed_bbox

        tracking_event = None
        if trk_triggered and trk_type:
            tracking_event = {
                "event_type": trk_type.upper(),
                "severity": trk_details.get("severity", "info"),
                "confidence": 1.0,
                "duration_seconds": 0.0,
                "details": trk_details
            }

        # 7. Drowsiness & Yawning State Machines
        yawn_state, yawn_duration, yawn_conf, yawn_triggered = self.yawn_service.update(
            landmarks.mar, timestamp=now
        )
        is_yawn_active = yawn_state in ("YAWNING_STARTED", "YAWNING_CONFIRMED")

        t_drowsy = time.time()
        drowsiness_state, closure_duration, drowsy_triggered = self.drowsiness_service.update(
            landmarks.ear_avg, timestamp=now, is_yawning=is_yawn_active
        )
        landmarks.perclos = self.drowsiness_service.get_perclos()
        landmarks.blink_rate_bpm = self.drowsiness_service.get_blink_rate()
        self.model_monitor.record_inference("Drowsiness_PERCLOS", (time.time() - t_drowsy) * 1000.0)

        # 8. Vehicle CAN-bus & GPS Telemetry
        if telemetry_override:
            self.telemetry_provider.set_live_telemetry(telemetry_override)
        vehicle_telemetry = self.telemetry_provider.get_telemetry(timestamp=now)

        # 9. Multimodal Event Fusion
        model_health = self.model_monitor.get_health_metrics()
        output = self.event_fusion_service.fuse_signals(
            frame_index=self.frame_count,
            timestamp=now,
            landmarks=landmarks,
            head_pose=head_pose,
            identity=self.cached_identity,
            drowsiness_state=drowsiness_state,
            closure_duration=closure_duration,
            yawn_state=yawn_state,
            yawn_duration=yawn_duration,
            phone_state=phone_state,
            phone_detection=phone_detection,
            tracking_event=tracking_event,
            session_id=session_id,
            telemetry=vehicle_telemetry,
            attention_result=attention_result,
            phone_interaction=phone_interaction,
            model_health=model_health
        )

        inference_latency_ms = round((time.time() - t0) * 1000.0, 1)
        output.fps = self.current_fps
        output.inference_latency_ms = inference_latency_ms
        self.model_monitor.record_frame()

        return output

    def reset(self):
        self.frame_count = 0
        self.drowsiness_service.reset()
        self.yawn_service.reset()
        self.head_pose_service.reset()
        self.object_detection_service.reset()
        self.tracking_service.reset()
        self.event_fusion_service.reset()
        self.cached_identity = IdentityResult()
