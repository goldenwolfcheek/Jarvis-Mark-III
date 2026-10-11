"""
Jarvis Mark III — Memory store.
File-based long-term MEMORY.md and user profile USER.md, Hermes Agent pattern:
bounded files, snapshotted into the system prompt at session start.
"""

import threading
from pathlib import Path
from typing import Optional

from .constants import MEMORY_DIR, MEMORY_FILE, USER_FILE, MEMORY_CHAR_LIMIT, USER_CHAR_LIMIT

_DEFAULT_MEMORY = (
    "# Jarvis's Long-Term Memory\n\n"
    "_This file persists across sessions. Update it as you learn about the user "
    "and their environment. Keep it concise - it is included in every system prompt._\n"
)

_DEFAULT_USER = (
    "# User Profile\n\n"
    "_Information about the user (preferences, facts, context). "
    "Update as you learn about them._\n"
)


class MemoryStore:
    """Thread-safe MEMORY.md / USER.md manager with read caching."""

    def __init__(self, mem_path: Path = MEMORY_FILE, user_path: Path = USER_FILE):
        self._mem_path = mem_path
        self._user_path = user_path
        self._lock = threading.RLock()
        self._mem_cache: Optional[str] = None
        self._user_cache: Optional[str] = None
        self._ensure_files()

    def _ensure_files(self):
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        if not self._mem_path.exists():
            self._mem_path.write_text(_DEFAULT_MEMORY, encoding="utf-8")
        if not self._user_path.exists():
            self._user_path.write_text(_DEFAULT_USER, encoding="utf-8")

    @staticmethod
    def _read_file(p: Path) -> str:
        try:
            return p.read_text(encoding="utf-8")
        except Exception:
            return ""

    @staticmethod
    def _write_file(p: Path, content: str) -> None:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")

    # ── Memory (Jarvis's durable knowledge) ──
    def get_memory(self) -> str:
        with self._lock:
            if self._mem_cache is None:
                self._mem_cache = self._read_file(self._mem_path)
            return self._mem_cache

    def set_memory(self, content: str) -> None:
        with self._lock:
            truncated = content[:MEMORY_CHAR_LIMIT]
            self._write_file(self._mem_path, truncated)
            self._mem_cache = truncated

    def get_user(self) -> str:
        with self._lock:
            if self._user_cache is None:
                self._user_cache = self._read_file(self._user_path)
            return self._user_cache

    def set_user(self, content: str) -> None:
        with self._lock:
            truncated = content[:USER_CHAR_LIMIT]
            self._write_file(self._user_path, truncated)
            self._user_cache = truncated

    def reset_caches(self) -> None:
        with self._lock:
            self._mem_cache = None
            self._user_cache = None


_memory: Optional[MemoryStore] = None
_memory_lock = threading.Lock()


def get_memory_store() -> MemoryStore:
    global _memory
    with _memory_lock:
        if _memory is None:
            _memory = MemoryStore()
        return _memory
