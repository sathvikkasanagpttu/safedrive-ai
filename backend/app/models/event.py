import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base

class EventSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    HIGH = "high"
    CRITICAL = "critical"

class EventType(str, enum.Enum):
    DRIVER_RECOGNIZED = "driver_recognized"
    UNKNOWN_DRIVER = "unknown_driver"
    FACE_LOST = "face_lost"
    MULTIPLE_FACES = "multiple_faces"
    EYES_CLOSING = "eyes_closing"
    PROLONGED_EYE_CLOSURE = "prolonged_eye_closure"
    DROWSINESS = "drowsiness"
    YAWNING = "yawning"
    HEAD_DISTRACTION = "head_distraction"
    PHONE_DETECTED = "phone_detected"
    PHONE_USAGE = "phone_usage"
    ATTENTION_RESTORED = "attention_restored"
    AGGRESSIVE_MANEUVER = "aggressive_maneuver"

class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("driving_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(Enum(EventType), nullable=False, index=True)
    severity = Column(Enum(EventSeverity), default=EventSeverity.INFO, nullable=False, index=True)
    confidence = Column(Float, default=1.0)
    duration_seconds = Column(Float, default=0.0)
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True)
    details = Column(JSON, nullable=True)  # Direction, EAR, MAR, bounding box, contributor weights

    # SafeDrive 2.0 Evidence & Explainable AI fields
    evidence_frame_url = Column(Text, nullable=True) # Thumbnail or data URI
    evidence_status = Column(String(50), default="PENDING_REVIEW") # PENDING_REVIEW, REVIEWED, FLAGGED, DISMISSED
    evidence_factors = Column(JSON, default=list) # e.g. ["Prolonged eye closure", "Reduced blink recovery"]
    risk_contribution = Column(Float, default=0.0) # e.g. +31.0
    reviewed_by = Column(Integer, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)

    # Model Versioning & Provenance
    model_name = Column(String(100), default="SafeDrive-Multimodal-Fusion")
    model_version = Column(String(50), default="v2.0")

    session = relationship("DrivingSession", back_populates="events")
    driver = relationship("Driver", back_populates="events")
    alerts = relationship("Alert", back_populates="event")
