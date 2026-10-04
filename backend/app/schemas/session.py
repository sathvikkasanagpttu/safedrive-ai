from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict
from app.models.session import SessionStatus
from app.schemas.driver import DriverResponse

class SessionCreate(BaseModel):
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    notes: Optional[str] = None

class SessionStopRequest(BaseModel):
    notes: Optional[str] = None

class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    driver_id: Optional[int]
    vehicle_id: Optional[int]
    start_time: datetime
    end_time: Optional[datetime]
    duration_seconds: int
    total_events: int
    high_risk_events: int
    avg_risk_score: float
    max_risk_score: float
    safety_rating: str
    status: SessionStatus
    notes: Optional[str]
    driver: Optional[DriverResponse] = None

class SessionDetailResponse(SessionResponse):
    events: List[Any] = []
    alerts: List[Any] = []
    risk_scores: List[Any] = []
