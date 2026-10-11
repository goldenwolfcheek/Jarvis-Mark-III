"""
Jarvis Mark III — Agent loop.
Hermes-style: assemble system prompt (personality + memory snapshot + skills
index), run model turns, execute tool calls (bounded turns), stream deltas.
"""

import asyncio
import logging
import time
from typing import AsyncIterator, Optional

from .constants import CONTEXT_WINDOW_TURNS, MAX_TOOL_TURNS, TOOL_OUTPUT_MAX_CHARS
from .memory_store import MemoryStore
from .provider_router import stream_chat, ProviderError, resolve_provider
from .skills_loader import TOOL_SCHEMAS, SkillLoader, execute_tool, skills_index_prompt
from .state_db import StateDB

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = """You are **Jarvis**, an intelligent AI desktop assistant (Jarvis Mark III).

You can:
- Answer questions and have natural conversations
- Remember durable facts about the user and their environment in MEMORY.md
- Load named skills for specialized procedures when they match the task
- Update your notes about the user with the provided tools

Style: concise, capable, friendly. Prefer answering directly; use tools only
when they clearly help."""


def build_system_prompt(personality: str, memory: MemoryStore, skill_loader: SkillLoader) -> str:
    parts = [personality.strip() or DEFAULT_SYSTEM_PROMPT]
    mem = memory.get_memory()
    user = memory.get_user()
    if mem:
        parts.append(f"\n## Memory\n{mem}")
    if user:
        parts.append(f"\n## User\n{user}")
    idx = skills_index_prompt(skill_loader)
    if idx:
        parts.append(f"\n## Skills\n{idx}")
    return "\n".join(parts)


class AgentLoop:
    def __init__(self, db: StateDB, memory: MemoryStore, skill_loader: SkillLoader):
        self.db = db
        self.memory = memory
        self.skill_loader = skill_loader

    async def run_turn(
        self,
        session_id: str,
        user_text: str,
        personality: str,
        provider_ui: Optional[dict],
        agent_params: Optional[dict] = None,
    ) -> AsyncIterator[dict]:
        """
        Full turn: persist user message, stream the model (with bounded tool
        rounds), execute tools, persist the assistant reply.
        Yields WS-bound events:
          {"type": "thinking"}                                        (turn start)
          {"type": "delta", "content": str}                           (text deltas)
          {"type": "tool", "name": str, "status": "start"|"done", "result"?: str}
          {"type": "done", "content": str, "session_id": str}
          {"type": "error", "message": str}
        """
        params = agent_params or {}
        temperature = float(params.get("temperature", 0.7))
        top_p = float(params.get("top_p", 0.9))
        max_tokens = int(params.get("max_tokens", 4096))
        if not self.db.kv_get("anchor_session") or session_id != self.db.kv_get("anchor_session"):
            pass  # sessions are stateless from the loop's perspective; db tracks history

        self.db.append_message(session_id, "user", user_text)
        history = self.db.get_recent_turns(session_id, CONTEXT_WINDOW_TURNS)
        # The last entry is the just-persisted user message already
        system_prompt = build_system_prompt(personality, self.memory, self.skill_loader)
        messages = [{"role": "system", "content": system_prompt}] + history

        profile = resolve_provider(provider_ui)
        if not profile.get("api_key"):
            yield {"type": "thinking"}
            msg = ("I need an API key before I can think. Open Settings and add a provider "
                   "(OpenCode Zen has free models - get a key at https://opencode.ai/auth), "
                   "or set OPENCODE_API_KEY in the environment.")
            self.db.append_message(session_id, "assistant", msg)
            yield {"type": "delta", "content": msg}
            yield {"type": "done", "content": msg, "session_id": session_id}
            return

        yield {"type": "thinking"}
        full_parts: list[str] = []
        t0 = time.time()

        for tool_round in range(MAX_TOOL_TURNS + 1):
            round_text_parts: list[str] = []
            pending_calls: list[dict] = []
            finish = "stop"
            try:
                async for ev in stream_chat(
                    messages,
                    model=profile["model"],
                    api_key=profile.get("api_key"),
                    base_url=profile["base_url"],
                    tools=TOOL_SCHEMAS,
                    temperature=temperature,
                    top_p=top_p,
                    max_tokens=max_tokens,
                ):
                    if ev["type"] == "content":
                        round_text_parts.append(ev["text"])
                        full_parts.append(ev["text"])
                        yield {"type": "delta", "content": ev["text"]}
                    elif ev["type"] == "tool_calls":
                        pending_calls = ev["calls"]
                    elif ev["type"] == "done":
                        finish = ev.get("finish_reason") or "stop"
            except ProviderError as e:
                err = f"Provider error: {e}"
                logger.warning(err)
                yield {"type": "error", "message": err}
                return

            if not pending_calls or tool_round == MAX_TOOL_TURNS:
                break

            # Execute tools (sequentially; they're all local + fast)
            assistant_tool_msg = {
                "role": "assistant",
                "content": "".join(round_text_parts) or None,
                "tool_calls": [
                    {"id": c["id"] or f"call_{i}_{int(time.time())}", "type": "function",
                     "function": {"name": c["name"], "arguments": c["arguments"] or "{}"}}
                    for i, c in enumerate(pending_calls)
                ],
            }
            messages.append(assistant_tool_msg)
            for i, call in enumerate(pending_calls):
                call_id = assistant_tool_msg["tool_calls"][i]["id"]
                yield {"type": "tool", "name": call["name"], "status": "start"}
                try:
                    result = execute_tool(self.skill_loader, self.memory, call["name"], call.get("parsed_arguments") or {})
                except Exception as e:
                    result = f"Tool error: {e}"
                if len(result) > TOOL_OUTPUT_MAX_CHARS:
                    result = result[:TOOL_OUTPUT_MAX_CHARS] + "\n...[truncated]"
                messages.append({"role": "tool", "tool_call_id": call_id, "content": result})
                yield {"type": "tool", "name": call["name"], "status": "done", "result": result}

        reply = "".join(full_parts)
        self.db.append_message(session_id, "assistant", reply)
        logger.info("turn done session=%s chars=%d %.1fs", session_id, len(reply), time.time() - t0)
        yield {"type": "done", "content": reply, "session_id": session_id}
