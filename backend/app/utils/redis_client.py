import json
import logging
import time
from typing import Optional, Any
import redis

from app.config import settings

logger = logging.getLogger("safedrive.redis")

class ResilientRedis:
    def __init__(self):
        self._client: Optional[redis.Redis] = None
        self._memory_cache: dict = {}
        self._memory_cooldowns: dict = {}
        self._is_connected = False
        self._connect()

    def _connect(self):
        try:
            client = redis.Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2
            )
            client.ping()
            self._client = client
            self._is_connected = True
            logger.info("Connected to Redis instance successfully.")
        except Exception as e:
            logger.warning(f"Redis not available ({e}). Using resilient in-memory cache/cooldown store.")
            self._is_connected = False
            self._client = None

    def get(self, key: str) -> Optional[str]:
        if self._is_connected and self._client:
            try:
                return self._client.get(key)
            except Exception:
                pass
        item = self._memory_cache.get(key)
        if item:
            val, expiry = item
            if expiry is None or time.time() < expiry:
                return val
            del self._memory_cache[key]
        return None

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        if self._is_connected and self._client:
            try:
                self._client.set(key, value, ex=ex)
                return True
            except Exception:
                pass
        expiry = time.time() + ex if ex else None
        self._memory_cache[key] = (value, expiry)
        return True

    def check_cooldown(self, cooldown_key: str, cooldown_seconds: int) -> bool:
        """
        Returns True if cooldown is active (i.e. event should be SUPPRESSED).
        Returns False and sets cooldown if event can proceed.
        """
        now = time.time()
        if self._is_connected and self._client:
            try:
                exists = self._client.exists(cooldown_key)
                if exists:
                    return True
                self._client.set(cooldown_key, "active", ex=cooldown_seconds)
                return False
            except Exception:
                pass

        last_time = self._memory_cooldowns.get(cooldown_key)
        if last_time and (now - last_time < cooldown_seconds):
            return True
        self._memory_cooldowns[cooldown_key] = now
        return False

    def publish(self, channel: str, message: dict):
        msg_str = json.dumps(message)
        if self._is_connected and self._client:
            try:
                self._client.publish(channel, msg_str)
            except Exception:
                pass

redis_client = ResilientRedis()
