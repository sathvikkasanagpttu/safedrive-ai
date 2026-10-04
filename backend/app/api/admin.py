from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.settings import SystemSettings
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse, UserRegister
from app.utils.security import hash_password
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/admin", tags=["Admin"])

class SettingUpdatePayload(BaseModel):
    value: Any

class UserRoleUpdatePayload(BaseModel):
    role: UserRole
    is_active: Optional[bool] = None

@router.get("/settings")
def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings_records = db.query(SystemSettings).all()
    return [{
        "key": s.key,
        "value": s.value.get("val") if isinstance(s.value, dict) and "val" in s.value else s.value,
        "description": s.description,
        "updated_at": s.updated_at.isoformat()
    } for s in settings_records]

@router.put("/settings/{key}")
def update_setting(
    key: str,
    payload: SettingUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
    if not setting:
        setting = SystemSettings(key=key, value={"val": payload.value}, description=f"Custom setting {key}", updated_by=current_user.id)
        db.add(setting)
    else:
        setting.value = {"val": payload.value}
        setting.updated_by = current_user.id

    db.commit()
    log_audit_event(db, current_user.id, "UPDATE_SYSTEM_SETTING", "system_settings", key, {"new_value": payload.value})
    return {"key": key, "value": payload.value, "status": "updated"}

@router.get("/users", response_model=List[UserResponse])
def list_system_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)

    log_audit_event(db, current_user.id, "UPDATE_USER_ROLE", "users", str(user.id), {"role": user.role.value})
    return user
