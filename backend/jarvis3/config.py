"""
Jarvis Mark III — Configuration.
Layered YAML config (defaults -> user file), Mark II pattern.
Provider selection follows the Hermes principle: any OpenAI-compatible endpoint.
"""

import logging
import threading
from typing import Any, Dict, Optional

import yaml

from .constants import CONFIG_FILE, DEFAULT_CONFIG_YAML

logger = logging.getLogger(__name__)


def _deep_merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


class Config:
    """Thread-safe config loader with deep-merge defaults."""

    def __init__(self):
        self._lock = threading.RLock()
        self._data: Dict[str, Any] = {}

    def load(self) -> Dict[str, Any]:
        with self._lock:
            defaults = yaml.safe_load(DEFAULT_CONFIG_YAML) or {}
            user: Dict[str, Any] = {}
            if CONFIG_FILE.exists():
                try:
                    user = yaml.safe_load(CONFIG_FILE.read_text(encoding="utf-8")) or {}
                except Exception as e:
                    logger.warning("Corrupt config at %s, using defaults (%s)", CONFIG_FILE, e)
            self._data = _deep_merge(defaults, user)
            return self._data

    def get(self, path: str, default: Any = None) -> Any:
        data = self._data
        for part in path.split("."):
            if not isinstance(data, dict) or part not in data:
                return default
            data = data[part]
        return data


_config: Optional[Config] = None
_config_lock = threading.Lock()


def get_config() -> Config:
    global _config
    with _config_lock:
        if _config is None:
            _config = Config()
            _config.load()
        return _config
