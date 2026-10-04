import os
from typing import List, Dict, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="allow")

    PROJECT_NAME: str = "SafeDrive AI"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security & Authentication
    SECRET_KEY: str = Field(default="safedrive-super-secret-jwt-key-change-in-production-2026-xyz")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for dev/portfolio convenience
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            if self.DEBUG:
                raise ValueError("CRITICAL SECURITY ERROR: Production deployment must have DEBUG=False.")
            if "change-in-production" in self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError("CRITICAL SECURITY ERROR: Production deployment requires a secure, non-default SECRET_KEY of at least 32 characters.")
        return self

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Database & Cache
    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/safedrive"
    )
    # Fallback SQLite DB for offline/local standalone mode
    FALLBACK_SQLITE_URL: str = Field(
        default=f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'safedrive_local.db')}"
    )
    USE_SQLITE_FALLBACK: bool = True

    REDIS_URL: str = Field(
        default="redis://localhost:6379/0"
    )

    # Storage paths
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 100

    # Privacy & Biometrics Policy
    ENABLE_BIOMETRIC_RAW_STORAGE: bool = False
    DATA_RETENTION_DAYS: int = 30
    AUDIT_LOGGING_ENABLED: bool = True

    # AI Detection Thresholds (Configurable)
    # Eye Aspect Ratio (EAR)
    EAR_THRESHOLD: float = 0.22
    EYES_CLOSING_FRAMES: int = 5
    POSSIBLE_DROWSINESS_FRAMES: int = 12
    CONFIRMED_DROWSINESS_FRAMES: int = 24
    ALERT_DROWSINESS_FRAMES: int = 36

    # Mouth Aspect Ratio (MAR)
    MAR_THRESHOLD: float = 0.58
    YAWN_START_FRAMES: int = 8
    YAWN_CONFIRM_FRAMES: int = 20

    # Head Pose Distraction (Pitch / Yaw / Roll in degrees)
    HEAD_YAW_THRESHOLD: float = 25.0       # Left/Right
    HEAD_PITCH_DOWN_THRESHOLD: float = 18.0  # Looking down
    HEAD_PITCH_UP_THRESHOLD: float = 22.0    # Looking up
    DISTRACTION_PERSISTENCE_FRAMES: int = 15 # ~0.5 - 1.0 sec depending on FPS

    # Phone Detection
    PHONE_CONFIDENCE_THRESHOLD: float = 0.50
    PHONE_PROXIMITY_IOU_THRESHOLD: float = 0.15
    PHONE_PERSISTENCE_FRAMES: int = 10

    # Identity Recognition
    IDENTITY_CONFIDENCE_THRESHOLD: float = 0.65

    # Risk Engine Default Weights (Summing to 1.0)
    RISK_WEIGHT_EYE_CLOSURE: float = 0.40
    RISK_WEIGHT_HEAD_DISTRACTION: float = 0.25
    RISK_WEIGHT_PHONE_USAGE: float = 0.20
    RISK_WEIGHT_YAWNING: float = 0.10
    RISK_WEIGHT_UNKNOWN_DRIVER: float = 0.05

    # Risk Score Categories
    RISK_LOW_MAX: int = 30
    RISK_MODERATE_MAX: int = 60
    RISK_HIGH_MAX: int = 80
    RISK_CRITICAL_MAX: int = 100

    # Alert Cooldowns (seconds)
    ALERT_COOLDOWN_DROWSINESS: int = 15
    ALERT_COOLDOWN_DISTRACTION: int = 10
    ALERT_COOLDOWN_PHONE: int = 12
    ALERT_COOLDOWN_GENERAL: int = 8

    # Demo Mode
    DEMO_MODE_DEFAULT: bool = True

settings = Settings()
