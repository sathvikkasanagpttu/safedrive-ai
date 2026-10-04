import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.session import DrivingSession, SessionStatus
from app.models.driver import Driver
from app.models.event import DetectionEvent, EventSeverity
from app.models.alert import Alert
from app.models.risk import RiskScore
from app.models.user import User, UserRole
from app.schemas.session import SessionCreate, SessionStopRequest, SessionResponse, SessionDetailResponse
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.get("", response_model=List[SessionResponse])
def list_sessions(
    driver_id: Optional[int] = None,
    status_filter: Optional[SessionStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DrivingSession).options(joinedload(DrivingSession.driver))
    if driver_id:
        query = query.filter(DrivingSession.driver_id == driver_id)
    if status_filter:
        query = query.filter(DrivingSession.status == status_filter)

    sessions = query.order_by(DrivingSession.start_time.desc()).offset(skip).limit(limit).all()
    return sessions

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check driver if supplied
    if session_in.driver_id:
        driver = db.query(Driver).filter(Driver.id == session_in.driver_id).first()
        if not driver:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned driver not found.")

    sess_uuid = f"SESS-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    new_sess = DrivingSession(
        session_id=sess_uuid,
        driver_id=session_in.driver_id,
        vehicle_id=session_in.vehicle_id,
        start_time=datetime.utcnow(),
        status=SessionStatus.ACTIVE,
        notes=session_in.notes
    )
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)

    log_audit_event(db, current_user.id, "START_SESSION", "driving_sessions", str(new_sess.id))
    return new_sess

@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session_detail(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(DrivingSession).options(
        joinedload(DrivingSession.driver),
        joinedload(DrivingSession.events),
        joinedload(DrivingSession.alerts),
        joinedload(DrivingSession.risk_scores)
    ).filter(DrivingSession.id == session_id).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    return session

@router.post("/{session_id}/stop", response_model=SessionResponse)
def stop_session(
    session_id: int,
    body: Optional[SessionStopRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(DrivingSession).filter(DrivingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    if session.status != SessionStatus.ACTIVE:
        return session

    now = datetime.utcnow()
    duration = int((now - session.start_time).total_seconds())
    session.end_time = now
    session.duration_seconds = max(0, duration)
    session.status = SessionStatus.COMPLETED
    if body and body.notes:
        session.notes = body.notes

    # Compute summary aggregates from events and risk scores
    total_ev = db.query(DetectionEvent).filter(DetectionEvent.session_id == session.id).count()
    high_ev = db.query(DetectionEvent).filter(
        DetectionEvent.session_id == session.id,
        DetectionEvent.severity.in_([EventSeverity.HIGH, EventSeverity.CRITICAL])
    ).count()

    risk_records = db.query(RiskScore).filter(RiskScore.session_id == session.id).all()
    if risk_records:
        avg_risk = round(sum(r.overall_risk for r in risk_records) / len(risk_records), 1)
        max_risk = round(max(r.overall_risk for r in risk_records), 1)
    else:
        avg_risk = session.avg_risk_score or 20.0
        max_risk = session.max_risk_score or 35.0

    session.total_events = total_ev
    session.high_risk_events = high_ev
    session.avg_risk_score = avg_risk
    session.max_risk_score = max_risk

    # Compute safety rating
    if max_risk > 80 or high_ev >= 3:
        session.safety_rating = "D"
    elif max_risk > 60 or high_ev >= 1:
        session.safety_rating = "C"
    elif avg_risk > 35:
        session.safety_rating = "B"
    else:
        session.safety_rating = "A"

    db.commit()
    db.refresh(session)

    log_audit_event(db, current_user.id, "STOP_SESSION", "driving_sessions", str(session.id), {
        "duration": duration,
        "avg_risk": avg_risk
    })
    return session
