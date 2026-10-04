from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON
from app.database import Base

class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), unique=True, index=True, nullable=False)
    model_type = Column(String(50), nullable=False) # FACE_RECOGNITION, OBJECT_DETECTION, POSE_LANDMARKS, DROWSINESS_TEMPORAL
    version = Column(String(50), nullable=False) # e.g. v1.0, v3.2, v2.1
    status = Column(String(50), default="ACTIVE") # ACTIVE, CANDIDATE, DEPRECATED
    latency_ms = Column(Float, default=24.5)
    fps = Column(Float, default=30.0)
    dropped_frames_pct = Column(Float, default=0.2)
    memory_mb = Column(Float, default=180.0)
    accuracy_metric = Column(String(50), default="mAP@0.5: 0.942")
    confidence_distribution = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
