"""
Jarvis Mark III — Provider profiles.
Ported from Mark II's providers/base.py + profiles.py (itself modelled on
Hermes Agent's provider plugin system). Pure data: every provider Jarvis
knows is declared declaratively — auth type, endpoint, env-var chain,
capability flags, and a curated fallback-model list for the UI picker.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any, Optional


@dataclass
class ProviderProfile:
    """Declarative description of an LLM inference provider (Mark II pattern)."""

    name: str
    api_mode: str = "chat_completions"

    # Auth & endpoints
    env_vars: tuple[str, ...] = field(default_factory=tuple)
    base_url: str = ""
    auth_type: str = "api_key"  # "api_key" | "none"

    # Capabilities
    supports_vision: bool = False
    fallback_models: tuple[str, ...] = field(default_factory=tuple)

    # Human-readable metadata
    display_name: str = ""
    description: str = ""


_BUILTIN: dict[str, ProviderProfile] = {}

_BUILTIN["lmstudio"] = ProviderProfile(
    name="lmstudio",
    display_name="LM Studio (Local)",
    description="Local models via LM Studio's OpenAI-compatible server (port 1234). If auth is enabled in LM Studio's server settings, paste its API token.",
    base_url="http://localhost:1234/v1",
    env_vars=("LMSTUDIO_API_KEY", "LM_STUDIO_API_KEY"),
    auth_type="none",  # works key-less unless the user enables auth in LM Studio
    supports_vision=True,
    fallback_models=(),  # filled live from /v1/models
)

_BUILTIN["ollama"] = ProviderProfile(
    name="ollama",
    display_name="Ollama (Local)",
    description="Local Ollama models via its OpenAI-compatible endpoint (port 11434)",
    base_url="http://localhost:11434/v1",
    env_vars=(),
    auth_type="none",
    supports_vision=True,
    fallback_models=("llama3.2", "qwen2.5-coder:7b"),
)

_BUILTIN["opencode-zen"] = ProviderProfile(
    name="opencode-zen",
    display_name="OpenCode Zen",
    description="Curated gateway by OpenCode — NOTE: free models are now restricted to OpenCode's own app and reject direct API use",
    base_url="https://opencode.ai/zen/v1",
    env_vars=("OPENCODE_API_KEY",),
    auth_type="api_key",
    supports_vision=False,
    fallback_models=(),  # free models no longer callable directly (2026-10, user-confirmed)
)

_BUILTIN["openrouter"] = ProviderProfile(
    name="openrouter",
    display_name="OpenRouter",
    description="400+ models behind one API (key required even for :free models)",
    base_url="https://openrouter.ai/api/v1",
    env_vars=("OPENROUTER_API_KEY",),
    auth_type="api_key",
    supports_vision=True,
    fallback_models=("meta-llama/llama-3.3-70b-instruct:free", "google/gemini-2.0-flash-exp:free"),
)

_BUILTIN["openai"] = ProviderProfile(
    name="openai",
    display_name="OpenAI",
    description="GPT-4o, o-series via OpenAI API",
    base_url="https://api.openai.com/v1",
    env_vars=("OPENAI_API_KEY", "OPENAI_KEY"),
    auth_type="api_key",
    supports_vision=True,
    fallback_models=("gpt-4o", "gpt-4o-mini", "o4-mini"),
)

_BUILTIN["anthropic"] = ProviderProfile(
    name="anthropic",
    display_name="Anthropic",
    description="Claude models via Anthropic API",
    base_url="https://api.anthropic.com/v1",
    env_vars=("ANTHROPIC_API_KEY",),
    auth_type="api_key",
    supports_vision=True,
    fallback_models=("claude-sonnet-4-5", "claude-haiku-4-5"),
)

_BUILTIN["custom"] = ProviderProfile(
    name="custom",
    display_name="Custom (OpenAI-compatible)",
    description="Any self-hosted or third-party OpenAI-compatible endpoint",
    base_url="",
    env_vars=(),
    auth_type="api_key",
    supports_vision=False,
    fallback_models=(),
)


def get_provider_profile(name: str) -> Optional[ProviderProfile]:
    """Return the built-in profile for a provider name (case-insensitive)."""
    if not name:
        return None
    key = name.lower().strip()
    profile = _BUILTIN.get(key)
    if profile:
        return profile
    # Common aliases seen in older configs
    aliases = {
        "lm_studio": "lmstudio",
        "lm-studio": "lmstudio",
        "ollama-local": "ollama",
        "ollama-cloud": None,  # cloud Ollama needs its own handling; treat as custom
        "zen": "opencode-zen",
        "opencode_zen": "opencode-zen",
    }
    mapped = aliases.get(key)
    return _BUILTIN.get(mapped) if mapped else None


def all_profiles() -> list[ProviderProfile]:
    """All built-in profiles, in UI-recommended display order."""
    order = ("lmstudio", "ollama", "opencode-zen", "openrouter", "openai", "anthropic", "custom")
    return [_BUILTIN[k] for k in order if k in _BUILTIN]


def overrides_for(provider: str, base_url: str = "", api_key: str = "", model: str = "") -> ProviderProfile:
    """
    Return a ProviderProfile with user-supplied values applied over the
    built-in profile (Mark II's registry._merge_into pattern).
    Unknown providers become a de-facto custom profile.
    """
    base = get_provider_profile(provider)
    if not base:
        base = get_provider_profile("custom")
        base = replace(base, name=(provider or "custom"))

    kw: dict[str, Any] = {}
    if base_url:
        kw["base_url"] = base_url
    if api_key:
        kw["auth_type"] = "api_key"
    if model:
        pass  # model rides alongside, not part of the profile
    return replace(base, **kw) if kw else base


def env_key_for(provider: str) -> str | None:
    """First declared env var with a non-empty value, else None."""
    import os

    profile = get_provider_profile(provider)
    if not profile:
        return None
    for var in profile.env_vars:
        v = os.environ.get(var)
        if v:
            return v
    return None


def needs_api_key(profile: ProviderProfile) -> bool:
    """Local servers work without a key; hosted providers generally need one."""
    if profile.auth_type == "none":
        return False
    u = (profile.base_url or "").lower()
    return not ("localhost" in u or "127.0.0.1" in u)
