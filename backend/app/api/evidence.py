from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.evidence import EvidenceRecord
from app.services.evidence_service import (
    EvidenceStorageService,
    EvidenceHashService,
    EvidenceRetentionService,
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/evidence", tags=["Forensic Evidence Storage"])

storage_service = EvidenceStorageService()
hash_service = EvidenceHashService()
retention_service = EvidenceRetentionService(storage_service)


@router.get("/{evidence_id}")
def get_evidence_image(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Secure forensic evidence retrieval endpoint.
    Verifies caller authentication, streams actual binary JPEG payload,
    and returns cryptographic SHA-256 integrity header.
    Never exposes raw server filesystem paths.
    """
    rec = db.query(EvidenceRecord).filter(
        EvidenceRecord.id == evidence_id,
        EvidenceRecord.deleted_at == None
    ).first()

    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence record not found or has expired according to retention policy."
        )

    file_bytes = storage_service.read_bytes(rec.storage_key)
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence media payload is unavailable on storage volume."
        )

    # Forensic cryptographic integrity verification
    if not hash_service.verify_integrity(file_bytes, rec.sha256):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Forensic integrity violation: stored file hash does not match registered cryptographic digest."
        )

    # Audit log access to evidentiary records
    log_audit_event(
        db,
        current_user.id,
        "ACCESS_EVIDENCE",
        "evidence_records",
        str(rec.id),
        {"event_id": rec.event_id, "session_id": rec.session_id, "sha256": rec.sha256}
    )

    return Response(
        content=file_bytes,
        media_type=rec.mime_type or "image/jpeg",
        headers={
            "Content-Disposition": f"inline; filename={rec.storage_key}",
            "X-Evidence-ID": str(rec.id),
            "X-Evidence-SHA256": rec.sha256,
            "X-Retention-Expires": rec.retention_expires_at.isoformat(),
            "Cache-Control": "private, max-age=3600"
        }
    )


@router.get("")
def list_evidence_records(
    session_id: Optional[int] = None,
    event_id: Optional[int] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists forensic evidence records with retention expiration and review metadata."""
    query = db.query(EvidenceRecord).filter(EvidenceRecord.deleted_at == None)
    if session_id:
        query = query.filter(EvidenceRecord.session_id == session_id)
    if event_id:
        query = query.filter(EvidenceRecord.event_id == event_id)

    records = query.order_by(EvidenceRecord.created_at.desc()).offset(offset).limit(limit).all()

    return [
        {
            "id": r.id,
            "event_id": r.event_id,
            "session_id": r.session_id,
            "storage_key": r.storage_key,
            "sha256": r.sha256,
            "mime_type": r.mime_type,
            "file_size": r.file_size,
            "created_at": r.created_at.isoformat(),
            "retention_expires_at": r.retention_expires_at.isoformat(),
            "review_status": r.review_status,
            "download_url": f"/api/evidence/{r.id}"
        }
        for r in records
    ]


@router.delete("/{evidence_id}", status_code=status.HTTP_200_OK)
def delete_evidence_record(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    """Soft-deletes an evidentiary frame and purges the file from disk with audit trail."""
    rec = db.query(EvidenceRecord).filter(EvidenceRecord.id == evidence_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence record not found.")

    storage_service.delete_file(rec.storage_key)
    rec.deleted_at = datetime.utcnow()
    db.commit()

    log_audit_event(
        db,
        current_user.id,
        "PURGE_EVIDENCE",
        "evidence_records",
        str(rec.id),
        {"event_id": rec.event_id, "sha256": rec.sha256}
    )

    return {"success": True, "message": f"Evidence #{evidence_id} purged successfully."}


@router.post("/purge-expired", status_code=status.HTTP_200_OK)
def purge_expired_evidence_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    """Triggers retention policy worker to purge expired forensic evidence files."""
    purged_count = retention_service.purge_expired_evidence(db)
    log_audit_event(
        db,
        current_user.id,
        "PURGE_EXPIRED_EVIDENCE_BATCH",
        "evidence_records",
        "batch",
        {"purged_count": purged_count}
    )
    return {"success": True, "purged_count": purged_count}
