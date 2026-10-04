import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABORTED = "aborted"

class DrivingSession(Base):
    __tablename__ = "driving_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    total_events = Column(Integer, default=0)
    high_risk_events = Column(Integer, default=0)
    avg_risk_score = Column(Float, default=0.0)
    max_risk_score = Column(Float, default=0.0)
    safety_rating = Column(String(50), default="A")  # A, B, C, D, F
    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False)
    notes = Column(String(500), nullable=True)

    driver = relationship("Driver", back_populates="sessions")
    vehicle = relationship("Vehicle", back_populates="sessions")
    events = relationship("DetectionEvent", back_populates="session", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="session", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="session", cascade="all, delete-orphan")
