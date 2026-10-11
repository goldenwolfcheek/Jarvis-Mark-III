"""
Jarvis Mark III — Backend server.
FastAPI + websockets on 127.0.0.1:11711. Wire contract matches the UI:
  WS /ws/chat  : {"type":"message","content","session_id"} in
                 session_created | thinking | delta | tool | done | error out
  GET /api/sessions, /api/sessions/{id}/history, rename/delete
  POST /api/memory, /api/skills/reload
  GET /api/health
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

# Make `jarvis3` importable when run as a script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from jarvis3.constants import HOST, PORT
from jarvis3.state_db import get_state_db
from jarvis3.memory_store import get_memory_store
from jarvis3.skills_loader import SkillLoader
from jarvis3.agent_loop import AgentLoop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [JARVIS3] %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("jarvis3.server")

app = FastAPI(title="Jarvis Mark III")

db = None
memory = None
skill_loader = None
agent: AgentLoop | None = None


@app.on_event("startup")
def _startup():
    global db, memory, skill_loader, agent
    db = get_state_db()
    memory = get_memory_store()
    skill_loader = SkillLoader()
    agent = AgentLoop(db, memory, skill_loader)
    n_sessions = len(db.list_sessions(limit=1000))
    logger.info("backend ready on %s:%s (%d sessions)", HOST, PORT, n_sessions)


# ── Health ──
@app.get("/api/health")
def health():
    return {"ok": True, "service": "jarvis3", "port": PORT}


# ── Sessions (UI contract) ──
@app.get("/api/sessions")
def list_sessions():
    return db.list_sessions()


@app.get("/api/sessions/{sid}/history")
def session_history(sid: str):
    rows = db.get_history(sid)
    return [
        {"id": str(r["id"]), "role": r["role"], "content": r["content"], "timestamp": r["timestamp"]}
        for r in rows
    ]


@app.post("/api/sessions/{sid}/rename")
def rename_session(sid: str, title: str):
    ok = db.rename_session(sid, title)
    return {"ok": ok}


@app.delete("/api/sessions/{sid}")
def delete_session(sid: str):
    db.delete_session(sid)
    return {"ok": True}


# ── Memory ──
@app.get("/api/memory")
def get_memory():
    return {"memory": memory.get_memory(), "user": memory.get_user()}


@app.post("/api/memory")
def set_memory(body: dict):
    if "memory" in body:
        memory.set_memory(body["memory"])
    if "user" in body:
        memory.set_user(body["user"])
    return {"ok": True}


# ── Skills ──
@app.get("/api/skills")
def list_skills():
    return [{"name": s.name, "description": s.description, "path": str(s.path)} for s in skill_loader.discover()]


@app.post("/api/skills/reload")
def reload_skills():
    skill_loader.discover()
    return {"ok": True, "count": len(skill_loader.discover())}


# ── Chat WS ──
@app.websocket("/ws/chat")
async def ws_chat(ws: WebSocket):
    await ws.accept()
    logger.info("ws client connected")
    session_id: str | None = None
    current_personality = ""
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Malformed JSON"})
                continue

            mtype = msg.get("type")

            if mtype == "settings":
                # {"type":"settings","personality":str,...}
                current_personality = msg.get("personality") or ""
                continue

            if mtype != "message":
                await ws.send_json({"type": "error", "message": f"Unknown type: {mtype}"})
                continue

            content = (msg.get("content") or "").strip()
            if not content:
                continue

            session_id = msg.get("session_id")
            if not session_id:
                session_id = db.create_session(title="New Conversation")
                await ws.send_json({"type": "session_created", "session_id": session_id})

            # Allow per-message personality/prams from the UI
            ui_provider = {
                "api_key": msg.get("api_key"),
                "provider": msg.get("provider"),
                "model": msg.get("model"),
                "base_url": msg.get("base_url") or "https://opencode.ai/zen/v1",
            }
            agent_params = {
                "temperature": msg.get("temperature", 0.7),
                "top_p": msg.get("top_p", 0.9),
                "max_tokens": msg.get("max_tokens", 4096),
            }
            personality = msg.get("personality") or current_personality

            async for ev in agent.run_turn(session_id, content, personality, ui_provider, agent_params):
                await ws.send_json(ev)
    except WebSocketDisconnect:
        logger.info("ws client disconnected")
    except Exception as e:
        logger.exception("ws handler failed")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
        try:
            await ws.close()
        except Exception:
            pass


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
