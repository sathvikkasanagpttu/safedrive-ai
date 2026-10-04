from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert
from app.models.event import EventSeverity
from app.models.user import User, UserRole
from app.schemas.alert import AlertResponse, AlertAcknowledgeRequest
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    session_id: Optional[int] = None,
    unacknowledged_only: bool = False,
    severity: Optional[EventSeverity] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert)
    if session_id:
        query = query.filter(Alert.session_id == session_id)
    if unacknowledged_only:
        query = query.filter(Alert.is_acknowledged == False)
    if severity:
        query = query.filter(Alert.severity == severity)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
    return alerts

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int,
    body: Optional[AlertAcknowledgeRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER, UserRole.FLEET_MANAGER]))
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

    alert.is_acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = current_user.id
    if body and body.notes:
        meta = alert.metadata_json or {}
        meta["ack_notes"] = body.notes
        alert.metadata_json = meta

    db.commit()
    db.refresh(alert)

    log_audit_event(db, current_user.id, "ACKNOWLEDGE_ALERT", "alerts", str(alert.id))
    return alert
