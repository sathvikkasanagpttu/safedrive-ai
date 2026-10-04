from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.driver import Driver, DriverEmbedding
from app.models.event import DetectionEvent
from app.models.settings import SystemSettings
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/privacy", tags=["Privacy & Compliance"])

class PrivacySettingsUpdate(BaseModel):
    video_retention_days: int = 7
    evidence_retention_days: int = 30
    biometric_storage_enabled: bool = True
    automatic_deletion_enabled: bool = True
    driver_consent_required: bool = True

@router.get("/settings")
def get_privacy_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting = db.query(SystemSettings).filter(SystemSettings.key == "privacy_policy").first()
    if setting and setting.value:
        return setting.value

    # Defaults
    defaults = {
        "video_retention_days": 7,
        "evidence_retention_days": 30,
        "biometric_storage_enabled": True,
        "automatic_deletion_enabled": True,
        "driver_consent_required": True,
        "compliance_standard": "GDPR / CCPA / Transport Safety Data Governance",
        "last_policy_audit": datetime.utcnow().strftime("%Y-%m-%d"),
    }
    return defaults

@router.put("/settings")
def update_privacy_settings(
    payload: PrivacySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Only Admins can modify enterprise privacy policies.")

    setting = db.query(SystemSettings).filter(SystemSettings.key == "privacy_policy").first()
    new_val = payload.model_dump()
    new_val["updated_at"] = datetime.utcnow().isoformat()
    new_val["updated_by"] = current_user.email

    if not setting:
        setting = SystemSettings(
            key="privacy_policy",
            value=new_val,
            description="Enterprise biometric retention and privacy governance configuration",
            updated_by=current_user.id
        )
        db.add(setting)
    else:
        setting.value = new_val
        setting.updated_by = current_user.id

    db.commit()

    AuditService.log(
        db,
        action="UPDATE_PRIVACY_POLICY",
        user_id=current_user.id,
        resource_type="PRIVACY_SETTINGS",
        details=payload.model_dump()
    )
    return {"status": "SUCCESS", "settings": new_val}

@router.post("/drivers/{driver_id}/consent")
def update_driver_consent(
    driver_id: int,
    consent_given: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    driver.biometric_consent_given = consent_given
    driver.consent_timestamp = datetime.utcnow()
    driver.privacy_status = "COMPLIANT" if consent_given else "CONSENT_REVOKED"
    db.commit()

    AuditService.log(
        db,
        action="UPDATE_DRIVER_CONSENT",
        user_id=current_user.id,
        resource_type="DRIVER",
        resource_id=str(driver_id),
        details={"consent": consent_given}
    )
    return {"status": "SUCCESS", "driver_id": driver_id, "consent_given": consent_given}

@router.post("/drivers/{driver_id}/purge")
def purge_driver_biometrics(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Right to be forgotten requires Admin clearance.")

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    # Delete biometric face embeddings permanently
    embeddings_deleted = db.query(DriverEmbedding).filter(DriverEmbedding.driver_id == driver_id).delete()
    driver.biometric_consent_given = False
    driver.privacy_status = "PURGED_GDPR_ARTICLE_17"
    db.commit()

    AuditService.log(
        db,
        action="PURGE_BIOMETRICS_RIGHT_TO_FORGOTTEN",
        user_id=current_user.id,
        resource_type="DRIVER",
        resource_id=str(driver_id),
        details={"embeddings_removed": embeddings_deleted}
    )
    return {
        "status": "PURGED",
        "message": f"Purged {embeddings_deleted} biometric embedding vectors in compliance with GDPR Article 17.",
        "driver_id": driver_id
    }
