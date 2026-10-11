"""
Jarvis Mark III — State database (SQLite).
Mark II's proven schema, kept compatible in spirit with Hermes' state.db:
sessions, messages (incl. tool calls/results), kv store. WAL mode.
"""

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Optional

from .constants import STATE_DB

_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    created_at  REAL NOT NULL,
    updated_at  REAL NOT NULL,
    title       TEXT DEFAULT '',
    metadata    TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    tool_calls  TEXT,
    tool_results TEXT,
    created_at  REAL NOT NULL,
    token_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS kv_store (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
"""


class StateDB:
    """Thread-safe SQLite persistence (WAL)."""

    def __init__(self, db_path: Path = STATE_DB):
        self._path = db_path
        self._lock = threading.RLock()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(db_path), check_same_thread=False, isolation_level=None)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._conn.executescript(_SCHEMA)

    # ── Sessions ──
    def create_session(self, title: str = "", metadata: dict | None = None) -> str:
        now = time.time()
        sid = f"s_{int(now * 1000)}_{time.time_ns() % 10000}"
        with self._lock:
            self._conn.execute(
                "INSERT INTO sessions (id, created_at, updated_at, title, metadata) VALUES (?,?,?,?,?)",
                (sid, now, now, title, json.dumps(metadata or {})),
            )
        return sid

    def list_sessions(self, limit: int = 100) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT id, created_at, updated_at, title, metadata FROM sessions ORDER BY updated_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [
            {"id": r[0], "created_at": r[1], "updated_at": r[2], "title": r[3], "metadata": json.loads(r[4] or "{}")}
            for r in rows
        ]

    def rename_session(self, sid: str, title: str) -> bool:
        with self._lock:
            cur = self._conn.execute("UPDATE sessions SET title=? WHERE id=?", (title, sid))
        return cur.rowcount > 0

    def delete_session(self, sid: str) -> None:
        with self._lock:
            self._conn.execute("DELETE FROM messages WHERE session_id=?", (sid,))
            self._conn.execute("DELETE FROM sessions WHERE id=?", (sid,))

    def touch_session(self, sid: str) -> None:
        with self._lock:
            self._conn.execute("UPDATE sessions SET updated_at=? WHERE id=?", (time.time(), sid))

    # ── Messages ──
    def append_message(self, session_id: str, role: str, content: str,
                       tool_calls: Any = None, tool_results: Any = None) -> int:
        now = time.time()
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO messages (session_id, role, content, tool_calls, tool_results, created_at) VALUES (?,?,?,?,?,?)",
                (session_id, role, content,
                 json.dumps(tool_calls) if tool_calls else None,
                 json.dumps(tool_results) if tool_results else None,
                 now),
            )
            self._conn.execute("UPDATE sessions SET updated_at=? WHERE id=?", (now, session_id))
        return cur.lastrowid

    def get_history(self, session_id: str, limit: int = 1000) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT id, role, content, created_at FROM messages WHERE session_id=? ORDER BY id LIMIT ?",
                (session_id, limit),
            ).fetchall()
        return [{"id": r[0], "role": r[1], "content": r[2], "timestamp": r[3]} for r in rows]

    def get_recent_turns(self, session_id: str, max_turns: int) -> list[dict]:
        """Latest messages in chronological order, oldest kept bounded to max_turns*2 entries."""
        with self._lock:
            rows = self._conn.execute(
                "SELECT role, content FROM messages WHERE session_id=? ORDER BY id DESC LIMIT ?",
                (session_id, max_turns * 2),
            ).fetchall()
        rows.reverse()
        return [{"role": r[0], "content": r[1]} for r in rows if r[0] in ("user", "assistant")]

    # ── KV ──
    def kv_get(self, key: str) -> Any:
        with self._lock:
            row = self._conn.execute("SELECT value FROM kv_store WHERE key=?", (key,)).fetchone()
        return json.loads(row[0]) if row else None

    def kv_set(self, key: str, value: Any) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO kv_store (key, value, updated_at) VALUES (?,?,?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
                (key, json.dumps(value), time.time()),
            )


_db: Optional[StateDB] = None
_db_lock = threading.Lock()


def get_state_db() -> StateDB:
    global _db
    with _db_lock:
        if _db is None:
            _db = StateDB()
        return _db
