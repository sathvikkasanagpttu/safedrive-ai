from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.driver import Driver
from app.models.session import DrivingSession, SessionStatus
from app.models.event import DetectionEvent, EventType, EventSeverity
from app.models.risk import RiskScore

class DigitalTwinService:
    @staticmethod
    def calculate_driver_digital_twin(db: Session, driver_id: int) -> Dict[str, Any]:
        """
        Calculates a statistical behavioral digital twin baseline for a driver.
        Requires at least 3 historical driving sessions to avoid statistical hallucination.
        Never fabricates unrecorded metrics.
        """
        driver = db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            return None

        # Fetch all completed sessions for this driver
        sessions = (
            db.query(DrivingSession)
            .filter(DrivingSession.driver_id == driver_id)
            .order_by(DrivingSession.start_time.asc())
            .all()
        )

        min_sessions_required = 3
        if len(sessions) < min_sessions_required:
            return {
                "driver_id": driver.id,
                "driver_name": driver.full_name,
                "driver_code": driver.driver_code,
                "status": "INSUFFICIENT_HISTORICAL_DATA",
                "minimum_sessions_required": min_sessions_required,
                "sessions_found": len(sessions),
                "notice": (
                    f"Insufficient historical driving sessions to calibrate personal behavioral baseline. "
                    f"A minimum of {min_sessions_required} recorded sessions is required. "
                    f"Currently {len(sessions)} session(s) recorded."
                ),
                "calibrated_at": None,
                "data_source": "LIVE_DATABASE",
                "baseline": None
            }

        # Calculate session aggregations
        total_sessions = len(sessions)
        total_duration_sec = sum(s.duration_seconds for s in sessions if s.duration_seconds)
        total_driving_hours = max(total_duration_sec / 3600.0, 0.1)

        avg_risk_scores = [s.avg_risk_score for s in sessions if s.avg_risk_score is not None]
        mean_risk = sum(avg_risk_scores) / len(avg_risk_scores) if avg_risk_scores else 0.0

        # Query all events for this driver across their sessions
        events = (
            db.query(DetectionEvent)
            .filter(DetectionEvent.driver_id == driver_id)
            .all()
        )

        drowsiness_types = {EventType.DROWSINESS, EventType.PROLONGED_EYE_CLOSURE, EventType.EYES_CLOSING}
        phone_types = {EventType.PHONE_DETECTED, EventType.PHONE_USAGE}
        distraction_types = {EventType.HEAD_DISTRACTION}
        yawn_types = {EventType.YAWNING}

        drowsiness_events = [e for e in events if e.event_type in drowsiness_types]
        phone_events = [e for e in events if e.event_type in phone_types]
        distraction_events = [e for e in events if e.event_type in distraction_types]
        yawn_events = [e for e in events if e.event_type in yawn_types]

        drowsiness_rate_per_hr = round(len(drowsiness_events) / total_driving_hours, 2)
        distraction_rate_per_hr = round(len(distraction_events) / total_driving_hours, 2)
        phone_rate_per_hr = round(len(phone_events) / total_driving_hours, 2)
        yawn_rate_per_hr = round(len(yawn_events) / total_driving_hours, 2)

        # Circadian fatigue distribution (24-hour histogram)
        hourly_distribution = [0] * 24
        day_events_count = 0
        night_events_count = 0

        for e in events:
            if e.start_time:
                hour = e.start_time.hour
                hourly_distribution[hour] += 1
                if 22 <= hour or hour <= 5:
                    night_events_count += 1
                else:
                    day_events_count += 1

        night_risk_multiplier = round(
            (night_events_count / max(1, len(events))) / 0.33, 2
        ) if len(events) > 0 else 1.0

        # Trend analysis (first half vs second half)
        mid = total_sessions // 2
        first_half = avg_risk_scores[:mid]
        second_half = avg_risk_scores[mid:]
        mean_first = sum(first_half) / len(first_half) if first_half else mean_risk
        mean_second = sum(second_half) / len(second_half) if second_half else mean_risk
        trend_diff = mean_second - mean_first

        if trend_diff < -4.0:
            trend = "IMPROVING"
        elif trend_diff > 4.0:
            trend = "DEGRADING"
        else:
            trend = "STABLE"

        # Propensity ratings
        fatigue_propensity = "LOW" if drowsiness_rate_per_hr < 1.0 else ("MODERATE" if drowsiness_rate_per_hr < 3.0 else "HIGH")
        distraction_susceptibility = "LOW" if distraction_rate_per_hr < 2.0 else ("MODERATE" if distraction_rate_per_hr < 5.0 else "HIGH")
        phone_usage_risk = "LOW" if phone_rate_per_hr == 0 else ("MODERATE" if phone_rate_per_hr < 1.5 else "HIGH")

        return {
            "driver_id": driver.id,
            "driver_name": driver.full_name,
            "driver_code": driver.driver_code,
            "status": "CALIBRATED",
            "calibrated_at": datetime.utcnow().isoformat(),
            "data_source": "LIVE_DATABASE",
            "minimum_sessions_required": min_sessions_required,
            "sessions_analyzed": total_sessions,
            "total_driving_hours": round(total_driving_hours, 2),
            "baseline": {
                "mean_risk_score": round(mean_risk, 1),
                "baseline_attention_score": round(max(0, 100 - mean_risk), 1),
                "trend": trend,
                "trend_delta": round(trend_diff, 1),
                "rates_per_hour": {
                    "drowsiness": drowsiness_rate_per_hr,
                    "distraction": distraction_rate_per_hr,
                    "phone_interaction": phone_rate_per_hr,
                    "yawning": yawn_rate_per_hr
                },
                "propensities": {
                    "fatigue": fatigue_propensity,
                    "distraction": distraction_susceptibility,
                    "phone": phone_usage_risk
                },
                "circadian_profile": {
                    "hourly_event_histogram": hourly_distribution,
                    "peak_vulnerability_hours": [h for h, count in enumerate(hourly_distribution) if count == max(hourly_distribution) and count > 0],
                    "night_risk_multiplier": night_risk_multiplier
                }
            }
        }
