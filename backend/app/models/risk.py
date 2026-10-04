import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class RiskCategory(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("driving_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    overall_risk = Column(Float, nullable=False)  # 0 to 100
    category = Column(Enum(RiskCategory), default=RiskCategory.LOW, nullable=False)
    contributors = Column(JSON, nullable=False)  # List of {type, weight, value}

    session = relationship("DrivingSession", back_populates="risk_scores")
