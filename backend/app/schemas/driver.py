from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict
from app.models.driver import DriverStatus

class DriverBase(BaseModel):
    driver_code: str
    full_name: str
    license_number: str
    status: Optional[DriverStatus] = DriverStatus.ACTIVE
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None

class DriverCreate(DriverBase):
    pass

class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    license_number: Optional[str] = None
    status: Optional[DriverStatus] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    safety_score: Optional[float] = None
    drowsiness_index: Optional[str] = None
    distraction_index: Optional[str] = None
    phone_usage_index: Optional[str] = None
    attention_level: Optional[str] = None

class DriverEmbeddingItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sample_index: int
    quality_score: float
    created_at: datetime

class DriverResponse(DriverBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    safety_score: float
    total_trips: int
    total_hours: float
    created_at: datetime
    updated_at: datetime
    embeddings_count: Optional[int] = 0

    # SafeDrive 2.0 Behavioral Profile & Privacy fields
    drowsiness_index: Optional[str] = "LOW"
    distraction_index: Optional[str] = "LOW"
    phone_usage_index: Optional[str] = "LOW"
    aggressive_driving_index: Optional[str] = "LOW"
    attention_level: Optional[str] = "GOOD"
    fleet_percentile: Optional[float] = 85.0
    risk_history_30d: Optional[List[Any]] = []
    biometric_consent_given: Optional[bool] = True
    privacy_status: Optional[str] = "COMPLIANT"

class FaceEnrollmentRequest(BaseModel):
    image_base64: str
    sample_index: Optional[int] = 1

class FaceEnrollmentResponse(BaseModel):
    success: bool
    driver_id: int
    sample_index: int
    quality_score: float
    message: str
