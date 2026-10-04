import logging
from datetime import datetime, timedelta
import random
import json
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.driver import Driver, DriverStatus, DriverEmbedding
from app.models.organization import Organization, Fleet
from app.models.vehicle import Vehicle
from app.models.session import DrivingSession, SessionStatus
from app.models.event import DetectionEvent, EventType, EventSeverity
from app.models.alert import Alert
from app.models.risk import RiskScore, RiskCategory
from app.models.settings import SystemSettings
from app.models.audit import AuditLog
from app.models.model_registry import ModelRegistry
from app.utils.security import hash_password

logger = logging.getLogger("safedrive.seeder")

def seed_database(db: Session):
    # Check if already seeded
    if db.query(User).first():
        logger.info("Database already seeded. Skipping initial seeding.")
        return

    logger.info("Seeding database with SafeDrive AI 2.0 Enterprise demo fidelity data...")

    # 1. Organizations & Fleets
    org_apex = Organization(
        name="Apex Global Logistics",
        code="APEX-LOG",
        subscription_tier="ENTERPRISE_PREMIUM",
        contact_email="safety-command@apexlogistics.io"
    )
    db.add(org_apex)
    db.commit()
    db.refresh(org_apex)

    fleet_sf = Fleet(
        org_id=org_apex.id,
        name="San Francisco Metro Fleet",
        region="Northern California",
        description="Autonomous and line-haul distribution division operating in the SF Bay Area corridor."
    )
    fleet_pnw = Fleet(
        org_id=org_apex.id,
        name="Pacific Northwest Interstate Fleet",
        region="Washington / Oregon",
        description="Long-distance heavy transit freight operations along I-5."
    )
    db.add_all([fleet_sf, fleet_pnw])
    db.commit()
    db.refresh(fleet_sf)
    db.refresh(fleet_pnw)

    # 2. Enterprise Users with RBAC
    super_admin = User(
        email="superadmin@safedrive.ai",
        hashed_password=hash_password("SuperAdmin@123"),
        full_name="Chief Safety Architect (Super Admin)",
        role=UserRole.SUPER_ADMIN,
        is_active=True
    )
    admin_user = User(
        email="admin@safedrive.ai",
        hashed_password=hash_password("Admin@123"),
        full_name="Alexander Wright (Admin)",
        role=UserRole.ADMIN,
        is_active=True
    )
    safety_user = User(
        email="safety@safedrive.ai",
        hashed_password=hash_password("Safety@123"),
        full_name="Sarah Jenkins (Safety Officer)",
        role=UserRole.SAFETY_OFFICER,
        is_active=True
    )
    fleet_user = User(
        email="fleet@safedrive.ai",
        hashed_password=hash_password("Fleet@123"),
        full_name="David Miller (Fleet Manager)",
        role=UserRole.FLEET_MANAGER,
        is_active=True
    )
    viewer_user = User(
        email="viewer@safedrive.ai",
        hashed_password=hash_password("Viewer@123"),
        full_name="Auditor General (Viewer)",
        role=UserRole.VIEWER,
        is_active=True
    )
    db.add_all([super_admin, admin_user, safety_user, fleet_user, viewer_user])
    db.commit()

    # 3. Behavioral Driver Profiles
    history_john = [24, 26, 28, 30, 32, 28, 25, 29, 31, 35, 42, 38, 34, 30, 28, 26, 25, 27, 30, 34, 38, 41, 35, 30, 29, 28, 27, 26, 28, 31]
    drv_john = Driver(
        driver_code="DRV-1001",
        full_name="John Doe",
        license_number="DL-908234-CA",
        status=DriverStatus.ACTIVE,
        phone="+1 (555) 234-5678",
        email="john.doe@apexlogistics.io",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        safety_score=92.5,
        total_trips=148,
        total_hours=312.4,
        drowsiness_index="LOW",
        distraction_index="MODERATE",
        phone_usage_index="LOW",
        aggressive_driving_index="LOW",
        attention_level="GOOD",
        fleet_percentile=88.5,
        risk_history_30d=history_john,
        biometric_consent_given=True,
        privacy_status="COMPLIANT"
    )

    history_jane = [14, 15, 12, 16, 14, 18, 15, 12, 14, 15, 16, 14, 15, 12, 14, 16, 15, 14, 12, 15, 14, 12, 14, 15, 16, 14, 12, 14, 15, 14]
    drv_jane = Driver(
        driver_code="DRV-1002",
        full_name="Jane Smith",
        license_number="DL-481920-WA",
        status=DriverStatus.ACTIVE,
        phone="+1 (555) 987-6543",
        email="jane.smith@apexlogistics.io",
        avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
        safety_score=98.0,
        total_trips=210,
        total_hours=480.0,
        drowsiness_index="LOW",
        distraction_index="LOW",
        phone_usage_index="LOW",
        aggressive_driving_index="LOW",
        attention_level="EXCELLENT",
        fleet_percentile=98.0,
        risk_history_30d=history_jane,
        biometric_consent_given=True,
        privacy_status="COMPLIANT"
    )

    history_alex = [45, 48, 52, 58, 62, 65, 59, 54, 48, 52, 56, 61, 68, 72, 65, 58, 54, 48, 52, 55, 62, 67, 71, 64, 59, 53, 49, 55, 60, 64]
    drv_alex = Driver(
        driver_code="DRV-1003",
        full_name="Alex Rivera",
        license_number="DL-331049-OR",
        status=DriverStatus.ACTIVE,
        phone="+1 (555) 432-8765",
        email="alex.rivera@apexlogistics.io",
        avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        safety_score=78.2, # High risk driver
        total_trips=95,
        total_hours=190.5,
        drowsiness_index="HIGH",
        distraction_index="HIGH",
        phone_usage_index="MODERATE",
        aggressive_driving_index="MODERATE",
        attention_level="FAIR",
        fleet_percentile=54.0,
        risk_history_30d=history_alex,
        biometric_consent_given=True,
        privacy_status="COMPLIANT"
    )

    history_marcus = [22, 25, 24, 28, 26, 24, 25, 22, 24, 26, 28, 31, 29, 25, 24, 22, 25, 28, 26, 24, 25, 28, 26, 24, 22, 25, 28, 26, 24, 25]
    drv_marcus = Driver(
        driver_code="DRV-1004",
        full_name="Marcus Vance",
        license_number="DL-772910-NV",
        status=DriverStatus.ACTIVE,
        phone="+1 (555) 678-1234",
        email="marcus.vance@apexlogistics.io",
        avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        safety_score=89.0,
        total_trips=120,
        total_hours=245.0,
        drowsiness_index="LOW",
        distraction_index="MODERATE",
        phone_usage_index="LOW",
        aggressive_driving_index="LOW",
        attention_level="GOOD",
        fleet_percentile=82.0,
        risk_history_30d=history_marcus,
        biometric_consent_given=True,
        privacy_status="COMPLIANT"
    )
    db.add_all([drv_john, drv_jane, drv_alex, drv_marcus])
    db.commit()

    # Face embeddings for John Doe
    random.seed(42)
    for sample_idx in range(1, 4):
        emb_vector = [round(random.gauss(0, 1), 5) for _ in range(128)]
        norm = sum(x*x for x in emb_vector) ** 0.5
        emb_vector = [round(x / norm, 5) for x in emb_vector]
        db.add(DriverEmbedding(
            driver_id=drv_john.id,
            sample_index=sample_idx,
            embedding=emb_vector,
            quality_score=0.98,
            algorithm="safedrive-embed-v1"
        ))
    db.commit()

    # 4. Fleet Vehicles with Live Telemetry
    v1 = Vehicle(
        vehicle_code="VEH-101",
        vin="1FTYR2XG0MKA10101",
        license_plate="7XYZ890",
        make="Ford",
        model="Transit-350 Cargo",
        year=2023,
        status="active",
        fleet_id=fleet_sf.id,
        assigned_driver_id=drv_john.id,
        mileage=14250.0,
        current_risk_score=18.5,
        current_speed=68.0,
        acceleration=0.15,
        hard_braking=False,
        gps_lat=37.7749,
        gps_lng=-122.4194,
        heading=85.0
    )
    v2 = Vehicle(
        vehicle_code="VEH-102",
        vin="1FUJA6CK8NP987654",
        license_plate="3ABC456",
        make="Freightliner",
        model="Cascadia 126",
        year=2022,
        status="active", # High risk in telemetry
        fleet_id=fleet_sf.id,
        assigned_driver_id=drv_alex.id,
        mileage=68400.0,
        current_risk_score=68.5,
        current_speed=84.0,
        acceleration=0.35,
        hard_braking=True,
        gps_lat=37.7833,
        gps_lng=-122.4167,
        heading=120.0
    )
    v3 = Vehicle(
        vehicle_code="VEH-203",
        vin="4V4NC9EH5MN112233",
        license_plate="5KLM789",
        make="Volvo",
        model="VNL 860 Sleeper",
        year=2024,
        status="active",
        fleet_id=fleet_pnw.id,
        assigned_driver_id=drv_jane.id,
        mileage=32100.0,
        current_risk_score=12.0,
        current_speed=62.0,
        acceleration=0.10,
        hard_braking=False,
        gps_lat=37.7650,
        gps_lng=-122.4250,
        heading=45.0
    )
    v4 = Vehicle(
        vehicle_code="VEH-221",
        vin="1XP5DB9X6ND334455",
        license_plate="8QRS123",
        make="Peterbilt",
        model="Model 579 UltraLoft",
        year=2023,
        status="active",
        fleet_id=fleet_pnw.id,
        assigned_driver_id=drv_marcus.id,
        mileage=45800.0,
        current_risk_score=24.0,
        current_speed=59.0,
        acceleration=0.08,
        hard_braking=False,
        gps_lat=37.7900,
        gps_lng=-122.4000,
        heading=90.0
    )
    db.add_all([v1, v2, v3, v4])
    db.commit()

    # 5. Model Registry Records
    m1 = ModelRegistry(
        model_name="MediaPipe_FaceMesh",
        model_type="LANDMARK_POSE",
        version="v0.10.14",
        status="ACTIVE",
        latency_ms=11.8,
        fps=30.0,
        dropped_frames_pct=0.1,
        memory_mb=85.0,
        accuracy_metric="Mean Euclidean Error: 2.1px",
        confidence_distribution={"90-100%": 82, "80-89%": 14, "<80%": 4}
    )
    m2 = ModelRegistry(
        model_name="SafeDrive_Embedding_Net",
        model_type="FACE_RECOGNITION",
        version="v1.0.4",
        status="ACTIVE",
        latency_ms=28.2,
        fps=30.0,
        dropped_frames_pct=0.2,
        memory_mb=115.0,
        accuracy_metric="Cosine Rank-1: 98.4%",
        confidence_distribution={"95-100%": 91, "90-94%": 7, "<90%": 2}
    )
    m3 = ModelRegistry(
        model_name="YOLOv8n_Safety_Cockpit",
        model_type="OBJECT_DETECTION",
        version="v3.2.1",
        status="ACTIVE",
        latency_ms=34.6,
        fps=26.5,
        dropped_frames_pct=0.4,
        memory_mb=240.0,
        accuracy_metric="mAP@0.5: 0.942",
        confidence_distribution={"85-100%": 76, "70-84%": 18, "<70%": 6}
    )
    m4 = ModelRegistry(
        model_name="PERCLOS_Temporal_Engine",
        model_type="DROWSINESS_TEMPORAL",
        version="v2.1.0",
        status="ACTIVE",
        latency_ms=7.4,
        fps=30.0,
        dropped_frames_pct=0.0,
        memory_mb=42.0,
        accuracy_metric="ROC-AUC: 0.965",
        confidence_distribution={"90-100%": 88, "80-89%": 10, "<80%": 2}
    )
    db.add_all([m1, m2, m3, m4])
    db.commit()

    # 6. Canonical 42-Minute Demo Session with Evidence and Explainable AI
    now = datetime.utcnow()
    session_start = now - timedelta(minutes=42)

    demo_session = DrivingSession(
        session_id="SESS-DEMO-2026-42M",
        driver_id=drv_john.id,
        vehicle_id=v1.id,
        start_time=session_start,
        end_time=now,
        duration_seconds=2520,  # 42 mins
        total_events=16,
        high_risk_events=5,
        avg_risk_score=34.2,
        max_risk_score=82.0,
        safety_rating="B+",
        status=SessionStatus.COMPLETED,
        notes="SafeDrive 2.0 Canonical Highway Demo Mission. Experienced two prolonged microsleep episodes, off-road gaze diversion, and mobile phone operation."
    )
    db.add(demo_session)
    db.commit()
    db.refresh(demo_session)

    # 7. Detection Events with Evidence Frames and Explainability
    events_data = [
        {
            "offset_min": 2,
            "type": EventType.DRIVER_RECOGNIZED,
            "severity": EventSeverity.INFO,
            "confidence": 0.98,
            "duration": 0.0,
            "details": {"method": "128D_cosine_embedding", "driver": "John Doe", "quality": "EXCELLENT"},
            "evidence_factors": ["High facial sharpness (Laplacian > 180)", "Normalized embedding similarity: 0.982"],
            "risk_contribution": 0.0,
            "evidence_status": "VERIFIED"
        },
        {
            "offset_min": 7,
            "type": EventType.HEAD_DISTRACTION,
            "severity": EventSeverity.WARNING,
            "confidence": 0.88,
            "duration": 2.4,
            "details": {"direction": "LOOKING_RIGHT", "yaw": 28.5, "pitch": -2.1},
            "evidence_factors": ["Sustained head yaw deviation (28.5° > 25°)", "Driver gaze off roadway for 2.4s", "Highway speed: 68 km/h"],
            "risk_contribution": +22.0,
            "evidence_status": "REVIEWED"
        },
        {
            "offset_min": 11,
            "type": EventType.YAWNING,
            "severity": EventSeverity.WARNING,
            "confidence": 0.91,
            "duration": 3.8,
            "details": {"mar": 0.64, "peak_mar": 0.71},
            "evidence_factors": ["Mouth Aspect Ratio (MAR: 0.64) exceeded 0.58 threshold", "Yawn persistence sustained for 3.8s"],
            "risk_contribution": +14.0,
            "evidence_status": "FLAGGED"
        },
        {
            "offset_min": 17,
            "type": EventType.PHONE_USAGE,
            "severity": EventSeverity.HIGH,
            "confidence": 0.94,
            "duration": 4.5,
            "details": {"detection_conf": 0.91, "proximity": True, "hand_contact": True},
            "evidence_factors": [
                "Handheld cell phone detected in steering proximity",
                "Hand and lap interaction confirmed",
                "Downward gaze (pitch: -22.0°)",
                "Interaction sustained for 4.5s"
            ],
            "risk_contribution": +32.0,
            "evidence_status": "FLAGGED"
        },
        {
            "offset_min": 24,
            "type": EventType.PROLONGED_EYE_CLOSURE,
            "severity": EventSeverity.CRITICAL,
            "confidence": 0.96,
            "duration": 3.2,
            "details": {"ear": 0.12, "perclos": 0.58, "warning_issued": True},
            "evidence_factors": [
                "Eye Aspect Ratio collapsed (EAR: 0.12 < 0.22)",
                "Rolling PERCLOS reached 58%",
                "Microsleep episode sustained for 3.2s",
                "Sound alarm dispatched"
            ],
            "risk_contribution": +48.0,
            "evidence_status": "FLAGGED"
        },
        {
            "offset_min": 31,
            "type": EventType.DROWSINESS,
            "severity": EventSeverity.CRITICAL,
            "confidence": 0.97,
            "duration": 4.1,
            "details": {"ear": 0.09, "perclos": 0.72, "alert_level": "CRITICAL"},
            "evidence_factors": [
                "Severe prolonged eye closure (4.1s)",
                "Zero blink recovery detected",
                "Speed context 72 km/h triggered emergency in-cab audio buzzer"
            ],
            "risk_contribution": +54.0,
            "evidence_status": "FLAGGED"
        },
        {
            "offset_min": 36,
            "type": EventType.PHONE_USAGE,
            "severity": EventSeverity.HIGH,
            "confidence": 0.89,
            "duration": 3.0,
            "details": {"detection_conf": 0.88, "proximity": True},
            "evidence_factors": [
                "Second handheld phone interaction logged",
                "Off-road glance while holding device"
            ],
            "risk_contribution": +28.0,
            "evidence_status": "PENDING_REVIEW"
        },
        {
            "offset_min": 40,
            "type": EventType.ATTENTION_RESTORED,
            "severity": EventSeverity.INFO,
            "confidence": 1.0,
            "duration": 0.0,
            "details": {"status": "DRIVER_NOMINAL", "restored_at": now.strftime("%H:%M:%S")},
            "evidence_factors": ["Frontal gaze restored (yaw < 5°)", "EAR returned to nominal 0.32"],
            "risk_contribution": 0.0,
            "evidence_status": "RESOLVED"
        }
    ]

    for idx, ed in enumerate(events_data):
        ev_time = session_start + timedelta(minutes=ed["offset_min"])
        evidence_url = f"evidence://session/SESS-DEMO-2026-42M/event_{idx+1}_{ed['type'].value.lower()}.jpg" if ed["severity"] in (EventSeverity.HIGH, EventSeverity.CRITICAL) else None
        db_event = DetectionEvent(
            session_id=demo_session.id,
            driver_id=drv_john.id,
            event_type=ed["type"],
            severity=ed["severity"],
            confidence=ed["confidence"],
            duration_seconds=ed["duration"],
            start_time=ev_time,
            end_time=ev_time + timedelta(seconds=ed["duration"]) if ed["duration"] > 0 else None,
            details=ed["details"],
            evidence_frame_url=evidence_url,
            evidence_status=ed["evidence_status"],
            evidence_factors=ed["evidence_factors"],
            risk_contribution=ed["risk_contribution"],
            model_name="SafeDrive-Multimodal-Fusion",
            model_version="v2.0"
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        # Attach alerts to high and critical events
        if ed["severity"] in (EventSeverity.HIGH, EventSeverity.CRITICAL):
            db.add(Alert(
                session_id=demo_session.id,
                event_id=db_event.id,
                alert_type=ed["type"].value.upper(),
                severity=ed["severity"],
                title=f"Alert: {ed['type'].value.replace('_', ' ').title()}",
                message=f"Safety policy breach logged at {ev_time.strftime('%H:%M:%S')} UTC.",
                sound_alert=True,
                is_acknowledged=False
            ))
    db.commit()

    # 8. Sample Risk Score timeline points across the 42 minutes
    for m in range(0, 43, 2):
        t_stamp = session_start + timedelta(minutes=m)
        if 23 <= m <= 26 or 30 <= m <= 33:
            r_val = random.uniform(74.0, 82.0)
            cat = RiskCategory.CRITICAL
        elif 6 <= m <= 8 or 16 <= m <= 18 or 35 <= m <= 38:
            r_val = random.uniform(50.0, 68.0)
            cat = RiskCategory.HIGH if r_val > 60 else RiskCategory.MODERATE
        else:
            r_val = random.uniform(14.0, 28.0)
            cat = RiskCategory.LOW

        db.add(RiskScore(
            session_id=demo_session.id,
            overall_risk=round(r_val, 1),
            eye_risk=round(r_val * 0.45, 1),
            distraction_risk=round(r_val * 0.30, 1),
            phone_risk=round(r_val * 0.25, 1),
            category=cat,
            timestamp=t_stamp
        ))
    db.commit()

    # 9. Initial Audit Log
    AuditService.log(
        db,
        action="SYSTEM_INITIALIZE_SAFEDRIVE_2_0",
        user_id=super_admin.id,
        resource_type="SYSTEM",
        details={"version": "2.0.0", "status": "ENTERPRISE_READY"}
    )
    logger.info("SafeDrive AI 2.0 Enterprise seeding complete.")
