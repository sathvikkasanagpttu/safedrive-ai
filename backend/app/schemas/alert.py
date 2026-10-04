from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.event import EventSeverity

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    event_id: Optional[int]
    alert_type: str
    severity: EventSeverity
    title: str
    message: str
    sound_alert: bool
    is_acknowledged: bool
    acknowledged_at: Optional[datetime]
    acknowledged_by: Optional[int]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime

class AlertAcknowledgeRequest(BaseModel):
    notes: Optional[str] = None
