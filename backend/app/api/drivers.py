import base64
import numpy as np
import cv2
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.driver import Driver, DriverStatus, DriverEmbedding
from app.models.user import User, UserRole
from app.schemas.driver import (
    DriverCreate, DriverUpdate, DriverResponse,
    FaceEnrollmentRequest, FaceEnrollmentResponse
)
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import log_audit_event
from app.ai.face_recognition import FaceRecognitionService
from app.ai.face_landmark import FaceLandmarkService

router = APIRouter(prefix="/drivers", tags=["Drivers"])
face_rec_service = FaceRecognitionService()
landmark_service = FaceLandmarkService()

@router.get("", response_model=List[DriverResponse])
def list_drivers(
    status_filter: Optional[DriverStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Driver)
    if status_filter:
        query = query.filter(Driver.status == status_filter)
    if search:
        query = query.filter(
            (Driver.full_name.ilike(f"%{search}%")) |
            (Driver.driver_code.ilike(f"%{search}%")) |
            (Driver.license_number.ilike(f"%{search}%"))
        )

    drivers = query.order_by(Driver.full_name.asc()).all()
    results = []
    for d in drivers:
        emb_count = db.query(DriverEmbedding).filter(DriverEmbedding.driver_id == d.id).count()
        resp = DriverResponse.model_validate(d)
        resp.embeddings_count = emb_count
        results.append(resp)
    return results

@router.post("", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
    driver_in: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER, UserRole.FLEET_MANAGER]))
):
    existing = db.query(Driver).filter(
        (Driver.driver_code == driver_in.driver_code) |
        (Driver.license_number == driver_in.license_number)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver code or license number is already registered."
        )

    driver = Driver(
        driver_code=driver_in.driver_code,
        full_name=driver_in.full_name,
        license_number=driver_in.license_number,
        status=driver_in.status or DriverStatus.ACTIVE,
        phone=driver_in.phone,
        email=driver_in.email,
        avatar_url=driver_in.avatar_url,
        safety_score=95.0,
        total_trips=0,
        total_hours=0.0
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)

    log_audit_event(db, current_user.id, "CREATE_DRIVER", "drivers", str(driver.id), {"code": driver.driver_code})

    resp = DriverResponse.model_validate(driver)
    resp.embeddings_count = 0
    return resp

@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")

    emb_count = db.query(DriverEmbedding).filter(DriverEmbedding.driver_id == driver.id).count()
    resp = DriverResponse.model_validate(driver)
    resp.embeddings_count = emb_count
    return resp

@router.put("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: int,
    driver_update: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER, UserRole.FLEET_MANAGER]))
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")

    update_data = driver_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(driver, field, val)

    db.commit()
    db.refresh(driver)

    log_audit_event(db, current_user.id, "UPDATE_DRIVER", "drivers", str(driver.id), update_data)

    emb_count = db.query(DriverEmbedding).filter(DriverEmbedding.driver_id == driver.id).count()
    resp = DriverResponse.model_validate(driver)
    resp.embeddings_count = emb_count
    return resp

@router.delete("/{driver_id}", status_code=status.HTTP_200_OK)
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")

    db.delete(driver)
    db.commit()

    log_audit_event(db, current_user.id, "DELETE_DRIVER", "drivers", str(driver_id))
    return {"message": f"Driver {driver_id} deleted successfully."}

@router.post("/{driver_id}/enroll-face", response_model=FaceEnrollmentResponse)
def enroll_driver_face(
    driver_id: int,
    enroll_in: FaceEnrollmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    """
    Captures face image, aligns/crops face patch, generates 128D mathematical embedding vector,
    and stores securely in database without retaining raw biometric imagery.
    """
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")

    try:
        # Decode base64 image
        img_b64 = enroll_in.image_base64
        if "," in img_b64:
            img_b64 = img_b64.split(",")[1]
        img_bytes = base64.b64decode(img_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image payload.")

        # Detect face & landmarks
        lm_result = landmark_service.process_frame(frame)
        if lm_result.num_faces_detected == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No facial profile detected. Ensure direct lighting and center framing."
            )
        if lm_result.num_faces_detected > 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Multiple faces detected in enrollment frame. Ensure only the driver is in frame."
            )

        # Extract face crop and evaluate quality
        crop = face_rec_service.extract_and_align_face(frame, lm_result.face_bbox)
        if crop is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to crop face region from frame."
            )

        q_eval = face_rec_service.quality_service.evaluate_quality(
            crop,
            head_yaw=lm_result.head_yaw if hasattr(lm_result, "head_yaw") else 0.0,
            head_pitch=lm_result.head_pitch if hasattr(lm_result, "head_pitch") else 0.0,
        )

        if not q_eval["is_acceptable"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Face quality insufficient ({q_eval['quality_label']}, score: {q_eval['quality_score']}). Please capture in brighter, frontal lighting without motion blur."
            )

        # Align to canonical 112x112 ArcFace patch
        aligned_patch = face_rec_service.alignment_service.align_face_5points(
            frame,
            bbox=lm_result.face_bbox,
            target_size=(112, 112)
        )

        # Generate 128D normalized neural embedding
        embedding_vector = face_rec_service.generate_embedding(aligned_patch)

        # Store embedding in DB
        sample_idx = enroll_in.sample_index or 1
        db.query(DriverEmbedding).filter(
            DriverEmbedding.driver_id == driver.id,
            DriverEmbedding.sample_index == sample_idx
        ).delete()

        emb_entry = DriverEmbedding(
            driver_id=driver.id,
            sample_index=sample_idx,
            embedding=embedding_vector,
            quality_score=q_eval["quality_score"],
            algorithm="MobileFaceNet-ArcFace-128D"
        )
        db.add(emb_entry)
        db.commit()

        log_audit_event(db, current_user.id, "ENROLL_FACE", "driver_embeddings", str(driver.id), {
            "sample_index": sample_idx,
            "quality_score": q_eval["quality_score"],
            "quality_label": q_eval["quality_label"],
            "algorithm": "MobileFaceNet-ArcFace-128D"
        })

        return FaceEnrollmentResponse(
            success=True,
            driver_id=driver.id,
            sample_index=sample_idx,
            quality_score=q_eval["quality_score"],
            message=f"Neural face embedding sample #{sample_idx} enrolled with {q_eval['quality_label']} quality ({q_eval['quality_score']})."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face enrollment processing failed: {str(e)}"
        )

@router.delete("/{driver_id}/face-data", status_code=status.HTTP_200_OK)
def delete_driver_face_data(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    """
    Biometric erasure endpoint (GDPR / CCPA compliance).
    Permanently deletes all mathematical face embeddings associated with the specified driver.
    """
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")

    deleted_count = db.query(DriverEmbedding).filter(DriverEmbedding.driver_id == driver_id).delete()
    db.commit()

    log_audit_event(db, current_user.id, "PURGE_BIOMETRICS", "driver_embeddings", str(driver_id), {
        "deleted_embeddings_count": deleted_count
    })

    return {
        "success": True,
        "driver_id": driver_id,
        "deleted_count": deleted_count,
        "message": f"Successfully purged {deleted_count} biometric embedding record(s) for driver {driver.full_name}."
    }

@router.get("/{driver_id}/digital-twin")
def get_driver_digital_twin(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes statistical behavioral digital twin baseline for driver across completed trips.
    Returns INSUFFICIENT_HISTORICAL_DATA if fewer than 3 sessions are available.
    """
    from app.services.digital_twin_service import DigitalTwinService
    twin_data = DigitalTwinService.calculate_driver_digital_twin(db, driver_id)
    if not twin_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")
    return twin_data
