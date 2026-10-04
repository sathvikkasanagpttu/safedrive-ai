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

        # Crop & align face patch
        face_patch = face_rec_service.extract_and_align_face(frame, lm_result.face_bbox)
        if face_patch is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to extract normalized face patch."
            )

        # Generate 128D normalized embedding
        embedding_vector = face_rec_service.generate_embedding(face_patch)

        # Store embedding in DB
        sample_idx = enroll_in.sample_index or 1
        # Remove previous sample with same index if exists
        db.query(DriverEmbedding).filter(
            DriverEmbedding.driver_id == driver.id,
            DriverEmbedding.sample_index == sample_idx
        ).delete()

        emb_entry = DriverEmbedding(
            driver_id=driver.id,
            sample_index=sample_idx,
            embedding=embedding_vector,
            quality_score=0.96,
            algorithm="safedrive-embed-v1"
        )
        db.add(emb_entry)
        db.commit()

        log_audit_event(db, current_user.id, "ENROLL_FACE", "driver_embeddings", str(driver.id), {
            "sample_index": sample_idx,
            "quality_score": 0.96
        })

        return FaceEnrollmentResponse(
            success=True,
            driver_id=driver.id,
            sample_index=sample_idx,
            quality_score=0.96,
            message="Face embedding vector calculated and secured successfully."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face enrollment processing failed: {str(e)}"
        )
