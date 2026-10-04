from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum

class AttentionState(str, Enum):
    FOCUSED = "FOCUSED"
    LEFT_DISTRACTED = "LEFT_DISTRACTED"
    RIGHT_DISTRACTED = "RIGHT_DISTRACTED"
    DOWNWARD_DISTRACTED = "DOWNWARD_DISTRACTED"
    UPWARD_DISTRACTED = "UPWARD_DISTRACTED"
    DISTRACTED_LEFT = "DISTRACTED_LEFT" # Backwards compatibility
    DISTRACTED_RIGHT = "DISTRACTED_RIGHT"
    DISTRACTED_DOWN = "DISTRACTED_DOWN"
    DISTRACTED_UP = "DISTRACTED_UP"
    EYES_CLOSED = "EYES_CLOSED"
    UNKNOWN = "UNKNOWN"

class DrowsinessState(str, Enum):
    EYES_OPEN = "EYES_OPEN"
    EYES_CLOSING = "EYES_CLOSING"
    POSSIBLE_DROWSINESS = "POSSIBLE_DROWSINESS"
    DROWSINESS = "DROWSINESS"
    ALERTED = "ALERTED"
    RECOVERED = "RECOVERED"
    # SafeDrive 2.0 aliases
    NORMAL = "EYES_OPEN"
    EARLY_FATIGUE = "EYES_CLOSING"
    SUSPECTED_DROWSINESS = "POSSIBLE_DROWSINESS"
    CONFIRMED_DROWSINESS = "DROWSINESS"
    CRITICAL_DROWSINESS = "ALERTED"

class YawnState(str, Enum):
    IDLE = "IDLE"
    YAWNING_STARTED = "YAWNING_STARTED"
    YAWNING_CONFIRMED = "YAWNING_CONFIRMED"
    YAWNING_ENDED = "YAWNING_ENDED"

class PhoneState(str, Enum):
    NOT_DETECTED = "NOT_DETECTED"
    PHONE_DETECTED = "PHONE_DETECTED"
    POSSIBLE_PHONE_USAGE = "POSSIBLE_PHONE_USAGE"
    CONFIRMED_PHONE_USAGE = "CONFIRMED_PHONE_USAGE"

@dataclass
class BoundingBox:
    x: float
    y: float
    width: float
    height: float
    confidence: float = 1.0

@dataclass
class HeadPoseResult:
    pitch: float = 0.0
    yaw: float = 0.0
    roll: float = 0.0
    direction: str = "FOCUSED"
    is_distracted: bool = False
    duration_frames: int = 0
    duration_seconds: float = 0.0

@dataclass
class LandmarkResult:
    landmarks_2d: List[Tuple[float, float]] = field(default_factory=list)
    ear_left: float = 0.30
    ear_right: float = 0.30
    ear_avg: float = 0.30
    mar: float = 0.20
    perclos: float = 0.05 # Percentage of eye closure over rolling window
    blink_rate_bpm: float = 16.0 # Blinks per minute
    face_bbox: Optional[BoundingBox] = None
    num_faces_detected: int = 0
    face_quality_score: float = 0.90 # 0.0 to 1.0
    face_quality_label: str = "GOOD" # EXCELLENT, GOOD, FAIR, POOR
    is_occluded: bool = False

@dataclass
class IdentityResult:
    driver_id: Optional[int] = None
    driver_name: str = "Unknown Driver"
    driver_code: Optional[str] = None
    confidence: float = 0.0
    is_authorized: bool = False
    stability: str = "HIGH" # HIGH, MODERATE, LOW
    face_quality: str = "GOOD" # EXCELLENT, GOOD, FAIR, POOR
    quality_score: float = 0.88
    status: str = "AUTHORIZED" # AUTHORIZED, UNAUTHORIZED, UNKNOWN, OCCLUDED
    embedding_similarity: float = 0.0
    temporal_consistency: float = 1.0

@dataclass
class AttentionResult:
    attention_state: AttentionState = AttentionState.FOCUSED
    attention_score: float = 88.0 # 0 to 100
    contributing_factors: List[str] = field(default_factory=lambda: [
        "Head aligned forward (yaw < 15°)",
        "Gaze centered on road ahead",
        "No device interaction detected",
        "Stable attentional persistence (42s)"
    ])
    duration_seconds: float = 0.0

@dataclass
class PhoneInteractionResult:
    phones_detected: List[BoundingBox] = field(default_factory=list)
    phone_state: PhoneState = PhoneState.NOT_DETECTED
    interaction_probability: float = 0.0 # 0.0 to 1.0 (0-100%)
    driver_proximity: bool = False
    hand_proximity: bool = False
    attention_diverted: bool = False
    duration_seconds: float = 0.0
    severity: str = "LOW"

@dataclass
class VehicleTelemetryData:
    speed: float = 68.5 # km/h
    acceleration: float = 0.15 # g
    hard_braking: bool = False
    steering_angle: float = 0.0 # degrees
    gps_lat: float = 37.7749
    gps_lng: float = -122.4194
    heading: float = 85.0
    trip_duration_sec: int = 1800
    is_night: bool = False

@dataclass
class ObjectDetectionResult:
    phones_detected: List[BoundingBox] = field(default_factory=list)
    phone_state: PhoneState = PhoneState.NOT_DETECTED
    phone_confidence: float = 0.0
    proximity_to_driver: bool = False
    interaction_probability: float = 0.0

@dataclass
class FusedFrameOutput:
    timestamp: float
    frame_index: int
    face_detected: bool
    num_faces: int
    identity: IdentityResult
    head_pose: HeadPoseResult
    landmarks: LandmarkResult
    drowsiness_state: DrowsinessState
    yawn_state: YawnState
    phone_state: PhoneState
    phone_interaction: PhoneInteractionResult
    attention_state: AttentionState
    attention_result: AttentionResult
    telemetry: VehicleTelemetryData
    perclos: float
    current_risk: float # 0 to 100
    session_risk: float # Rolling trip average
    driver_risk: float # Historical driver baseline
    fleet_percentile: float # Percentile vs fleet
    risk_score: float # Backwards compatibility alias for current_risk
    risk_category: str # LOW, MODERATE, HIGH, CRITICAL
    risk_contributors: List[Dict[str, Any]]
    events_generated: List[Dict[str, Any]]
    alerts_generated: List[Dict[str, Any]]
    evidence_captured: bool = False
    evidence_frame_url: Optional[str] = None
    model_health: Dict[str, Any] = field(default_factory=dict)
    fps: float = 0.0
    inference_latency_ms: float = 0.0
