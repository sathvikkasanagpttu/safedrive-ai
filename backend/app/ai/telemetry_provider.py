import time
import math
from typing import Dict, Any, Optional
from app.ai.base import VehicleTelemetryData

class VehicleTelemetryProvider:
    """
    SafeDrive 2.0 CAN-bus & GPS Vehicle Telemetry Provider.
    Supports either live telemetry feed from onboard gateway / OBD-II or
    high-fidelity simulated vehicle dynamics for demo/testing.
    """
    def __init__(
        self,
        base_speed: float = 68.0,
        start_lat: float = 37.7749,
        start_lng: float = -122.4194
    ):
        self.base_speed = base_speed
        self.current_speed = base_speed
        self.acceleration = 0.1
        self.hard_braking = False
        self.steering_angle = 0.0
        self.lat = start_lat
        self.lng = start_lng
        self.heading = 85.0
        self.start_time = time.time()
        self.is_night = False

    def get_telemetry(self, timestamp: Optional[float] = None, phase_hint: Optional[str] = None) -> VehicleTelemetryData:
        now = timestamp if timestamp is not None else time.time()
        elapsed = now - self.start_time

        # Calculate smooth realistic driving dynamics
        speed_oscillation = 6.0 * math.sin(elapsed / 15.0) + 2.5 * math.cos(elapsed / 5.0)
        self.current_speed = max(0.0, min(120.0, self.base_speed + speed_oscillation))

        # Steering variation
        self.steering_angle = round(4.5 * math.sin(elapsed / 8.0), 1)

        # Acceleration in g's
        self.acceleration = round(0.05 * math.cos(elapsed / 10.0), 2)

        # Hard braking check or phase hint
        if phase_hint == "HARD_BRAKING" or (int(elapsed) % 65 == 45):
            self.hard_braking = True
            self.current_speed = max(20.0, self.current_speed - 25.0)
            self.acceleration = -0.55
        else:
            self.hard_braking = False

        # Simulate vehicle GPS translation along route
        speed_mps = (self.current_speed * 1000.0) / 3600.0
        dt = 0.033 # ~30 fps step
        dist_m = speed_mps * dt
        # ~111,111 meters per degree latitude
        self.lat += (dist_m * math.cos(math.radians(self.heading))) / 111111.0
        self.lng += (dist_m * math.sin(math.radians(self.heading))) / (111111.0 * math.cos(math.radians(self.lat)))

        return VehicleTelemetryData(
            speed=round(self.current_speed, 1),
            acceleration=round(self.acceleration, 2),
            hard_braking=self.hard_braking,
            steering_angle=self.steering_angle,
            gps_lat=round(self.lat, 6),
            gps_lng=round(self.lng, 6),
            heading=self.heading,
            trip_duration_sec=int(elapsed),
            is_night=self.is_night
        )

    def set_live_telemetry(self, data: Dict[str, Any]):
        """Inject real CAN-bus / OBD-II packet"""
        if "speed" in data:
            self.current_speed = float(data["speed"])
        if "acceleration" in data:
            self.acceleration = float(data["acceleration"])
        if "hard_braking" in data:
            self.hard_braking = bool(data["hard_braking"])
        if "steering_angle" in data:
            self.steering_angle = float(data["steering_angle"])
        if "gps" in data and isinstance(data["gps"], dict):
            self.lat = float(data["gps"].get("lat", self.lat))
            self.lng = float(data["gps"].get("lng", self.lng))
