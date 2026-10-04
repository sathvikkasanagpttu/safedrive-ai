from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("driving_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    storage_key = Column(String(255), nullable=False, unique=True)
    sha256 = Column(String(64), nullable=False, index=True)
    mime_type = Column(String(50), default="image/jpeg", nullable=False)
    file_size = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    retention_expires_at = Column(DateTime, nullable=False, index=True)
    review_status = Column(String(50), default="UNREVIEWED", nullable=False) # UNREVIEWED, VERIFIED, DISMISSED
    deleted_at = Column(DateTime, nullable=True)

    event = relationship("DetectionEvent", backref="evidence_records")
    session = relationship("DrivingSession", backref="evidence_records")
