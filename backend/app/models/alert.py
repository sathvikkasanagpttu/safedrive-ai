from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.event import EventSeverity

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("driving_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("detection_events.id", ondelete="SET NULL"), nullable=True, index=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(Enum(EventSeverity), default=EventSeverity.WARNING, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(String(500), nullable=False)
    sound_alert = Column(Boolean, default=True)
    is_acknowledged = Column(Boolean, default=False, nullable=False, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    session = relationship("DrivingSession", back_populates="alerts")
    event = relationship("DetectionEvent", back_populates="alerts")
    acknowledged_user = relationship("User", foreign_keys=[acknowledged_by])
