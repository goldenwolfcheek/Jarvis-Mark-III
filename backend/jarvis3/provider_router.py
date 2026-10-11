"""
Jarvis Mark III — Provider router.
Resolves a provider profile (base_url, model, api key) and streams
OpenAI-compatible chat completions with tool-calling support.
Default: OpenCode Zen (https://opencode.ai/zen/v1, free tier, big-pickle).
"""

import json
import logging
import os
from typing import Any, AsyncIterator, Optional

import httpx

from .constants import DEFAULT_PROVIDER, FALLBACK_ENV_KEYS

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(120.0, connect=15.0)


def resolve_api_key(cfg: Optional[dict] = None) -> Optional[str]:
    """Find an API key: config.providers[].api_key, then env vars."""
    if cfg:
        for p in cfg.get("providers", []):
            k = p.get("api_key")
            if k:
                return k
    for env in FALLBACK_ENV_KEYS:
        v = os.environ.get(env)
        if v:
            return v
    return None


def resolve_provider(keys_from_ui: Optional[dict] = None) -> dict:
    """
    Return the active provider profile dict.
    Priority: UI-saved credentials > default profile (OpenCode Zen).
    keys_from_ui: {"api_key": str, "provider": str, "model": str, "base_url": str}
    """
    profile = dict(DEFAULT_PROVIDER)
    if keys_from_ui:
        if keys_from_ui.get("base_url"):
            profile["base_url"] = keys_from_ui["base_url"]
        if keys_from_ui.get("provider"):
            profile["provider"] = keys_from_ui["provider"]
        if keys_from_ui.get("model"):
            profile["model"] = keys_from_ui["model"]
        if keys_from_ui.get("api_key"):
            profile["api_key"] = keys_from_ui["api_key"]
    if not profile.get("api_key"):
        key = resolve_api_key()
        if key:
            profile["api_key"] = key
    return profile


def requires_api_key(base_url: str) -> bool:
    """Local servers (LM Studio, Ollama) work with no key at all."""
    u = (base_url or "").lower()
    return not ("localhost" in u or "127.0.0.1" in u or ":1234" in u or ":11434" in u)


class ProviderError(Exception):
    pass


async def stream_chat(
    messages: list[dict],
    model: str,
    api_key: Optional[str],
    base_url: str,
    tools: Optional[list[dict]] = None,
    temperature: float = 0.7,
    top_p: float = 0.9,
    max_tokens: int = 4096,
) -> AsyncIterator[dict]:
    """
    Stream OpenAI-compatible chat completions.

    Yields dicts:
      {"type": "content", "text": str}
      {"type": "tool_calls", "calls": [ {"id","name","arguments"} ]}   (buffered at end)
      {"type": "usage", "prompt_tokens": int, "completion_tokens": int}
      {"type": "done", "finish_reason": str}
    Raises ProviderError on auth/rate-limit/connection errors.
    """
    if not api_key and requires_api_key(base_url):
        raise ProviderError(
            "No API key available for this provider. Add it in Settings → Chat Providers "
            "(OpenCode Zen free keys: https://opencode.ai/auth) or use a local provider "
            "like LM Studio (http://localhost:1234/v1) which needs no key."
        )
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    url = base_url.rstrip("/") + "/chat/completions"
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "top_p": top_p,
        "max_tokens": max_tokens,
        "stream": True,
    }
    if tools:
        body["tools"] = tools

    content_parts: list[str] = []
    tool_calls_acc: dict[int, dict] = {}
    finish_reason = None
    usage = None

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            async with client.stream("POST", url, headers=headers, json=body) as resp:
                if resp.status_code in (401, 403):
                    detail = (await resp.aread()).decode(errors="replace")[:300]
                    raise ProviderError(f"Auth failed ({resp.status_code}): {detail}")
                if resp.status_code == 429:
                    raise ProviderError("Rate limited (429) by the provider — try again shortly.")
                if resp.status_code != 200:
                    detail = (await resp.aread()).decode(errors="replace")[:300]
                    extra = ""
                    if "not supported" in detail.lower() and "model" in detail.lower():
                        extra = (" — this model is not available on this provider/endpoint. "
                                 "Check the model list for this provider or pick another model.")
                    raise ProviderError(f"Provider error {resp.status_code}: {detail}{extra}")

                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    choice = (chunk.get("choices") or [{}])[0]
                    delta = choice.get("delta") or {}
                    if delta.get("content"):
                        content_parts.append(delta["content"])
                        yield {"type": "content", "text": delta["content"]}
                    for tc in delta.get("tool_calls") or []:
                        idx = tc.get("index", 0)
                        acc = tool_calls_acc.setdefault(idx, {"id": "", "name": "", "arguments": ""})
                        if tc.get("id"):
                            acc["id"] = tc["id"]
                        fn = tc.get("function") or {}
                        if fn.get("name"):
                            acc["name"] += fn["name"]
                        if fn.get("arguments"):
                            acc["arguments"] += fn["arguments"]
                    if choice.get("finish_reason"):
                        finish_reason = choice["finish_reason"]
                    if chunk.get("usage"):
                        usage = chunk["usage"]
    except httpx.ConnectError as e:
        raise ProviderError(f"Cannot reach provider at {url}: {e}")

    if tool_calls_acc:
        calls = [tool_calls_acc[i] for i in sorted(tool_calls_acc)]
        for c in calls:
            if c["name"]:
                try:
                    c["parsed_arguments"] = json.loads(c["arguments"] or "{}")
                except json.JSONDecodeError:
                    c["parsed_arguments"] = {"_raw": c["arguments"]}
        yield {"type": "tool_calls", "calls": calls}
    if usage:
        yield {"type": "usage", "usage": usage}
    yield {"type": "done", "finish_reason": finish_reason or ("tool_calls" if tool_calls_acc else "stop")}
