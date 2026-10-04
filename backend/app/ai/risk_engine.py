from typing import Dict, Any, List, Tuple, Optional
from collections import deque
from app.config import settings

class RiskEngine:
    def __init__(
        self,
        weight_eye_closure: float = settings.RISK_WEIGHT_EYE_CLOSURE,
        weight_head_distraction: float = settings.RISK_WEIGHT_HEAD_DISTRACTION,
        weight_phone_usage: float = settings.RISK_WEIGHT_PHONE_USAGE,
        weight_yawning: float = settings.RISK_WEIGHT_YAWNING,
        weight_unknown_driver: float = settings.RISK_WEIGHT_UNKNOWN_DRIVER,
        session_window_size: int = 300,
    ):
        self.w_eye = weight_eye_closure
        self.w_head = weight_head_distraction
        self.w_phone = weight_phone_usage
        self.w_yawn = weight_yawning
        self.w_unknown = weight_unknown_driver

        # SafeDrive 2.0 Session & Fleet Tracking
        self.session_risk_history = deque(maxlen=session_window_size)
        self.current_session_avg = 15.0
        self.driver_baseline_risk = 28.0

    def calculate_risk(
        self,
        eye_closure_severity: float,       # 0.0 to 1.0 (based on closure duration)
        head_distraction_severity: float,  # 0.0 to 1.0 (based on pose & duration)
        phone_usage_severity: float,       # 0.0 to 1.0 (based on detection & proximity)
        yawn_severity: float,              # 0.0 to 1.0 (based on MAR & duration)
        is_unknown_driver: bool = False,   # 1.0 if unknown, 0.0 if authorized
        vehicle_speed: float = 0.0,        # km/h (telemetry context)
        hard_braking: bool = False,        # CAN-bus braking event
        trip_duration_hours: float = 0.5,  # Hours driven
        is_night: bool = False,            # Low ambient lighting
    ) -> Tuple[float, str, List[Dict[str, Any]]]:
        """
        SafeDrive 2.0 Context-Aware Compounding Risk Engine.
        Combines:
          - Multi-sensor computer vision hazard severities
          - Non-linear compounding multi-hazard penalty
          - Vehicle speed & dynamic context amplification
          - Circadian & fatigue duration multipliers
        Returns: (risk_score_0_100, category, contributors_list)
        """
        unknown_val = 1.0 if is_unknown_driver else 0.0

        # Base vision hazard components
        raw_components = [
            ("prolonged_eye_closure", self.w_eye, eye_closure_severity),
            ("head_distraction", self.w_head, head_distraction_severity),
            ("phone_usage", self.w_phone, phone_usage_severity),
            ("yawning", self.w_yawn, yawn_severity),
            ("unknown_driver", self.w_unknown, unknown_val),
        ]

        total_weighted_sum = sum(w * val for _, w, val in raw_components)

        # 1. Multi-hazard compounding penalty
        active_hazards = sum(1 for _, _, val in raw_components if val > 0.4)
        compounding_multiplier = 1.0
        if active_hazards >= 2:
            compounding_multiplier = 1.0 + (0.25 * (active_hazards - 1))

        base_score = total_weighted_sum * 100.0 * compounding_multiplier

        # 2. Context-Aware Modifiers (Speed, Night, Duration, Braking)
        context_points = 0.0
        context_contributors = []

        # High speed + distraction or phone
        is_inattentive = (head_distraction_severity > 0.3) or (phone_usage_severity > 0.3) or (eye_closure_severity > 0.3)
        if vehicle_speed > 70.0 and is_inattentive:
            speed_mult = min(18.0, (vehicle_speed - 70.0) * 0.35)
            context_points += speed_mult
            context_contributors.append({
                "type": "vehicle_speed_amplification",
                "points": round(speed_mult, 1),
                "detail": f"Speed {vehicle_speed:.0f} km/h amplifies inattention risk"
            })

        # Hard braking while inattentive
        if hard_braking and is_inattentive:
            context_points += 22.0
            context_contributors.append({
                "type": "emergency_braking_conflict",
                "points": 22.0,
                "detail": "Sudden deceleration while driver attention compromised"
            })

        # Prolonged night trip fatigue
        if (is_night or trip_duration_hours > 2.0) and (yawn_severity > 0.3 or eye_closure_severity > 0.3):
            fatigue_points = 12.0
            context_points += fatigue_points
            context_contributors.append({
                "type": "circadian_fatigue_context",
                "points": fatigue_points,
                "detail": f"Night/Duration context ({trip_duration_hours:.1f}h) accelerates fatigue"
            })

        # Final Instantaneous Risk Score (0 to 100)
        final_score = min(100.0, max(0.0, base_score + context_points))
        risk_score = round(final_score, 1)

        # Categorization
        if risk_score <= settings.RISK_LOW_MAX:
            category = "low"
        elif risk_score <= settings.RISK_MODERATE_MAX:
            category = "moderate"
        elif risk_score <= settings.RISK_HIGH_MAX:
            category = "high"
        else:
            category = "critical"

        # Explainable Additive Contributor Breakdown
        contributors = []
        for name, weight, val in raw_components:
            if val > 0.05:
                # Calculate absolute point contribution
                pts = round(weight * val * 100.0 * compounding_multiplier, 1)
                contributors.append({
                    "type": name,
                    "weight": weight,
                    "severity": round(val, 2),
                    "points": pts,
                    "contribution_points": pts,
                    "contribution_pct": round((pts / max(1.0, risk_score)) * 100.0, 1)
                })

        # Add context contributors
        contributors.extend(context_contributors)

        # Update rolling session tracking
        self.session_risk_history.append(risk_score)
        if len(self.session_risk_history) > 0:
            self.current_session_avg = round(sum(self.session_risk_history) / len(self.session_risk_history), 1)

        return risk_score, category, contributors

    def get_multi_level_risk(
        self,
        current_risk: float,
        driver_historical_score: float = 92.0
    ) -> Dict[str, float]:
        """
        Computes 4-tier risk metrics: Current, Session, Driver, Fleet Percentile.
        """
        driver_risk = round(max(5.0, 100.0 - driver_historical_score), 1)
        # Fleet percentile (higher means safer than X% of fleet)
        percentile = round(max(10.0, min(99.0, 100.0 - (0.5 * current_risk + 0.5 * self.current_session_avg))), 1)

        return {
            "current_risk": current_risk,
            "session_risk": self.current_session_avg,
            "driver_risk": driver_risk,
            "fleet_percentile": percentile
        }

    def reset(self):
        self.session_risk_history.clear()
        self.current_session_avg = 15.0
