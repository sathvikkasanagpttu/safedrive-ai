from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from app.models.event import EventType, EventSeverity

class EventCreate(BaseModel):
    session_id: int
    driver_id: Optional[int] = None
    event_type: EventType
    severity: EventSeverity
    confidence: float = 1.0
    duration_seconds: float = 0.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    details: Optional[Dict[str, Any]] = None

class EventReviewRequest(BaseModel):
    evidence_status: str # REVIEWED, FLAGGED, DISMISSED
    review_notes: Optional[str] = None

class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    driver_id: Optional[int]
    event_type: EventType
    severity: EventSeverity
    confidence: float
    duration_seconds: float
    start_time: datetime
    end_time: Optional[datetime]
    details: Optional[Dict[str, Any]]

    # SafeDrive 2.0 Evidence & Explainable AI fields
    evidence_frame_url: Optional[str] = None
    evidence_status: Optional[str] = "PENDING_REVIEW"
    evidence_factors: Optional[List[str]] = []
    risk_contribution: Optional[float] = 0.0
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    model_name: Optional[str] = "SafeDrive-Multimodal-Fusion"
    model_version: Optional[str] = "v2.0"
