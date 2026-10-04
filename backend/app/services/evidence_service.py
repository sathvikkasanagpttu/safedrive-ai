"""
SafeDrive AI 3.0 — Real Evidence Storage, Integrity Hashing, Capture & Retention Services.

Replaces simulated evidence URLs with actual file persistence, cryptographic SHA-256
integrity verification, and compliant retention policies.
"""

import os
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any, List
import cv2
import numpy as np
from sqlalchemy.orm import Session

from app.models.evidence import EvidenceRecord
from app.models.event import DetectionEvent
from app.config import settings


# =====================================================================
# 1. EVIDENCE HASH SERVICE
# =====================================================================

class EvidenceHashService:
    """Computes and validates cryptographic SHA-256 digests for forensic non-repudiation."""

    @staticmethod
    def compute_sha256(data_bytes: bytes) -> str:
        h = hashlib.sha256()
        h.update(data_bytes)
        return h.hexdigest()

    @staticmethod
    def verify_integrity(data_bytes: bytes, expected_hash: str) -> bool:
        actual_hash = EvidenceHashService.compute_sha256(data_bytes)
        return actual_hash.lower() == expected_hash.lower()

    verify_sha256 = verify_integrity


# =====================================================================
# 2. EVIDENCE STORAGE SERVICE
# =====================================================================

class EvidenceStorageService:
    """
    Abstracted evidence storage interface supporting local filesystem storage
    with pluggable architecture for S3 / Cloud Object Storage.
    """

    def __init__(self, base_dir: Optional[str] = None):
        if base_dir is None:
            # Absolute path to backend/storage/evidence
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.base_dir = os.path.join(backend_dir, "storage", "evidence")
        else:
            self.base_dir = base_dir

        os.makedirs(self.base_dir, exist_ok=True)

    def save_bytes(self, data_bytes: bytes, extension: str = "jpg") -> str:
        """
        Persists raw bytes with a secure random UUID filename.
        Returns the relative storage_key (e.g. 'ev_a1b2c3d4...jpg').
        """
        filename = f"ev_{uuid.uuid4().hex}.{extension}"
        file_path = os.path.join(self.base_dir, filename)
        with open(file_path, "wb") as f:
            f.write(data_bytes)
        return filename

    def read_bytes(self, storage_key: str) -> Optional[bytes]:
        """
        Retrieves raw bytes by storage_key.
        Prevents directory traversal attacks by validating filename.
        """
        safe_filename = os.path.basename(storage_key)
        file_path = os.path.join(self.base_dir, safe_filename)
        if not os.path.exists(file_path):
            return None
        with open(file_path, "rb") as f:
            return f.read()

    def delete_file(self, storage_key: str) -> bool:
        """Deletes file from storage disk."""
        safe_filename = os.path.basename(storage_key)
        file_path = os.path.join(self.base_dir, safe_filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return True
            except OSError:
                return False
        return False


# =====================================================================
# 3. EVIDENCE CAPTURE SERVICE
# =====================================================================

class EvidenceCaptureService:
    """
    Encodes video frames, registers cryptographic hash, persists evidence to disk,
    and binds the evidence record to the safety event.
    """

    def __init__(self, storage_service: Optional[EvidenceStorageService] = None):
        self.storage = storage_service or EvidenceStorageService()
        self.hasher = EvidenceHashService()

    def capture_and_store_frame(
        self,
        db: Session,
        event_id: int,
        session_id: int,
        frame_bgr: np.ndarray,
        retention_days: int = 30,
        jpeg_quality: int = 85
    ) -> EvidenceRecord:
        """
        Encodes BGR numpy frame into JPEG, hashes it, saves it to disk,
        and creates an EvidenceRecord in the database.
        """
        # Encode image to JPEG
        success, encoded = cv2.imencode(".jpg", frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])
        if not success:
            raise ValueError("Failed to encode evidence frame to JPEG format.")

        data_bytes = encoded.tobytes()
        file_size = len(data_bytes)
        sha256_hash = self.hasher.compute_sha256(data_bytes)

        # Store file on disk
        storage_key = self.storage.save_bytes(data_bytes, extension="jpg")

        now = datetime.utcnow()
        retention_expires = now + timedelta(days=retention_days)

        evidence_rec = EvidenceRecord(
            event_id=event_id,
            session_id=session_id,
            storage_key=storage_key,
            sha256=sha256_hash,
            mime_type="image/jpeg",
            file_size=file_size,
            created_at=now,
            retention_expires_at=retention_expires,
            review_status="UNREVIEWED",
        )
        db.add(evidence_rec)
        db.commit()
        db.refresh(evidence_rec)

        # Update detection event record to reference secure API endpoint
        event = db.query(DetectionEvent).filter(DetectionEvent.id == event_id).first()
        if event:
            event.evidence_frame_url = f"/api/evidence/{evidence_rec.id}"
            db.commit()

        return evidence_rec


# =====================================================================
# 4. EVIDENCE RETENTION SERVICE
# =====================================================================

class EvidenceRetentionService:
    """
    Enforces data retention policies by purging expired evidence files and marking
    records as deleted.
    """

    def __init__(self, storage_service: Optional[EvidenceStorageService] = None):
        self.storage = storage_service or EvidenceStorageService()

    def purge_expired_evidence(self, db: Session) -> int:
        """
        Finds all evidence records where retention_expires_at <= now and deleted_at is null.
        Removes physical file and soft-deletes DB record.
        """
        now = datetime.utcnow()
        expired_records = db.query(EvidenceRecord).filter(
            EvidenceRecord.retention_expires_at <= now,
            EvidenceRecord.deleted_at == None
        ).all()

        purged_count = 0
        for rec in expired_records:
            # Remove physical file
            self.storage.delete_file(rec.storage_key)
            rec.deleted_at = now
            purged_count += 1

        db.commit()
        return purged_count
