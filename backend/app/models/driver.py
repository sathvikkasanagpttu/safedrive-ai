import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class DriverStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    driver_code = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    license_number = Column(String(100), unique=True, nullable=False)
    status = Column(Enum(DriverStatus), default=DriverStatus.ACTIVE, nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    safety_score = Column(Float, default=95.0)  # 0 to 100
    total_trips = Column(Integer, default=0)
    total_hours = Column(Float, default=0.0)

    # SafeDrive 2.0 Behavioral Profile attributes
    drowsiness_index = Column(String(50), default="LOW") # LOW, MODERATE, HIGH
    distraction_index = Column(String(50), default="LOW")
    phone_usage_index = Column(String(50), default="LOW")
    aggressive_driving_index = Column(String(50), default="LOW")
    attention_level = Column(String(50), default="GOOD") # EXCELLENT, GOOD, FAIR, POOR
    fleet_percentile = Column(Float, default=85.0) # Top 85% safest
    risk_history_30d = Column(JSON, default=list) # 30-day chronological risk trajectory

    # Privacy & Consent compliance
    biometric_consent_given = Column(Boolean, default=True)
    consent_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    privacy_status = Column(String(50), default="COMPLIANT") # COMPLIANT, CONSENT_PENDING, PURGE_REQUESTED

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    embeddings = relationship("DriverEmbedding", back_populates="driver", cascade="all, delete-orphan")
    sessions = relationship("DrivingSession", back_populates="driver")
    events = relationship("DetectionEvent", back_populates="driver")

class DriverEmbedding(Base):
    __tablename__ = "driver_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True)
    sample_index = Column(Integer, default=1, nullable=False)
    embedding = Column(JSON, nullable=False) # 128D normalized vector representation
    quality_score = Column(Float, default=1.0)
    algorithm = Column(String(50), default="safedrive-embed-v1")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    driver = relationship("Driver", back_populates="embeddings")
