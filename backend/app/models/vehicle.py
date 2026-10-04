from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_code = Column(String(50), unique=True, index=True, nullable=False, default="VEH-101")
    vin = Column(String(50), unique=True, index=True, nullable=False)
    license_plate = Column(String(50), unique=True, index=True, nullable=False)
    make = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(String(50), default="active") # active, maintenance, idle, high_risk
    fleet_id = Column(Integer, ForeignKey("fleets.id", ondelete="SET NULL"), nullable=True)
    assigned_driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True)
    
    # Telemetry & Enterprise Risk stats
    mileage = Column(Float, default=14500.0)
    current_risk_score = Column(Float, default=18.5)
    last_session_id = Column(String(100), nullable=True)
    current_speed = Column(Float, default=65.0) # km/h
    acceleration = Column(Float, default=0.2)
    hard_braking = Column(Boolean, default=False)
    gps_lat = Column(Float, default=37.7749)
    gps_lng = Column(Float, default=-122.4194)
    heading = Column(Float, default=85.0) # degrees
    is_telemetry_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    fleet = relationship("Fleet", back_populates="vehicles")
    assigned_driver = relationship("Driver", foreign_keys=[assigned_driver_id])
    sessions = relationship("DrivingSession", back_populates="vehicle")
