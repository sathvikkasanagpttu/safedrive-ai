import time
from typing import Optional, Dict, Any, List
from app.utils.redis_client import redis_client
from app.config import settings

class AlertEngine:
    def __init__(self):
        self._local_cooldowns: Dict[str, float] = {}

    def should_trigger_alert(self, alert_type: str, session_id: Optional[str] = None) -> bool:
        """
        Deduplication and cooldown check using Redis / local fallback.
        Returns True if alert SHOULD be dispatched, False if suppressed by cooldown.
        """
        cooldown_seconds = {
            "drowsiness": settings.ALERT_COOLDOWN_DROWSINESS,
            "distraction": settings.ALERT_COOLDOWN_DISTRACTION,
            "phone_usage": settings.ALERT_COOLDOWN_PHONE,
        }.get(alert_type.lower(), settings.ALERT_COOLDOWN_GENERAL)

        key = f"alert_cooldown:{session_id or 'default'}:{alert_type}"
        # redis_client.check_cooldown returns True if active (suppressed)
        is_suppressed = redis_client.check_cooldown(key, cooldown_seconds)
        return not is_suppressed

    def create_alert_payload(
        self,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        session_id: Optional[str] = None,
        sound_alert: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates standard alert payload.
        """
        return {
            "alert_type": alert_type,
            "severity": severity,  # info, warning, high, critical
            "title": title,
            "message": message,
            "sound_alert": sound_alert and (severity in ("high", "critical", "warning")),
            "session_id": session_id,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
