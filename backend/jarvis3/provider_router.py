"""
Jarvis Mark III — Provider router.
Resolves a provider profile (base_url, model, api key) and streams
OpenAI-compatible chat completions with tool-calling support.
Provider metadata ports Mark II's ProviderProfile system (itself modelled
on Hermes' plugin system) — see provider_profiles.py.
"""

import json
import logging
import os
from typing import Any, AsyncIterator, Optional

import httpx

from .constants import DEFAULT_PROVIDER
from .provider_profiles import env_key_for, needs_api_key, overrides_for

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(120.0, connect=15.0)


def resolve_api_key(cfg: Optional[dict] = None, provider: str = "") -> Optional[str]:
    """Find an API key: explicit value > provider-declared env chain > legacy fallbacks."""
    if cfg:
        for p in cfg.get("providers", []):
            k = p.get("api_key")
            if k:
                return k
    # Provider-declared env-var chain (Mark II profile pattern)
    key = env_key_for(provider or (cfg or {}).get("provider", "")) if cfg else env_key_for(provider)
    if key:
        return key
    return None


def resolve_provider(keys_from_ui: Optional[dict] = None) -> dict:
    """
    Return the active provider profile dict (Mark II pattern: declarative
    profile + UI overrides + env-chain key resolution).
    keys_from_ui: {"api_key", "provider", "model", "base_url"}
    """
    prof = overrides_for(
        provider=(keys_from_ui or {}).get("provider") or DEFAULT_PROVIDER["provider"],
        base_url=(keys_from_ui or {}).get("base_url") or "",
        api_key=(keys_from_ui or {}).get("api_key") or "",
        model=(keys_from_ui or {}).get("model") or "",
    )
    profile = {
        "provider": prof.name,
        "label": prof.display_name,
        "base_url": prof.base_url or DEFAULT_PROVIDER["base_url"],
        "model": (keys_from_ui or {}).get("model") or DEFAULT_PROVIDER["model"],
        "auth_type": prof.auth_type,
    }
    if (keys_from_ui or {}).get("api_key"):
        profile["api_key"] = keys_from_ui["api_key"]
    else:
        env_key = resolve_api_key(provider=prof.name)
        if env_key:
            profile["api_key"] = env_key
        elif prof.auth_type == "api_key":
            # Last-resort legacy chain
            from .constants import FALLBACK_ENV_KEYS
            import os as _os
            for env in FALLBACK_ENV_KEYS:
                v = _os.environ.get(env)
                if v:
                    profile["api_key"] = v
                    break
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
        # OpenCode Zen upstreams require 'thinking' when tools are present
        # (ported from Mark II's opencode_zen.ProviderProfile quirk fix).
        if "opencode" in (base_url or ""):
            body["thinking"] = {"type": "enabled"}

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
