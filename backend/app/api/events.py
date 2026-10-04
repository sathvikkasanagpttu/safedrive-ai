from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.event import DetectionEvent, EventType, EventSeverity
from app.models.user import User
from app.schemas.event import EventResponse, EventReviewRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[EventResponse])
def list_events(
    session_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    event_type: Optional[EventType] = None,
    severity: Optional[EventSeverity] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DetectionEvent)
    if session_id:
        query = query.filter(DetectionEvent.session_id == session_id)
    if driver_id:
        query = query.filter(DetectionEvent.driver_id == driver_id)
    if event_type:
        query = query.filter(DetectionEvent.event_type == event_type)
    if severity:
        query = query.filter(DetectionEvent.severity == severity)

    events = query.order_by(DetectionEvent.start_time.desc()).offset(skip).limit(limit).all()
    return events

@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(DetectionEvent).filter(DetectionEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    return event

@router.post("/{event_id}/review", response_model=EventResponse)
def review_event_evidence(
    event_id: int,
    req: EventReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(DetectionEvent).filter(DetectionEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    event.evidence_status = req.evidence_status.upper()
    event.reviewed_by = current_user.id
    event.reviewed_at = datetime.utcnow()
    event.review_notes = req.review_notes

    db.commit()
    db.refresh(event)
    return event
