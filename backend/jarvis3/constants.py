"""
Jarvis Mark III — Backend constants.
Storage locations, limits, defaults. Single source of truth for paths.
"""

from pathlib import Path
import os

# ── Storage root: ~/.jarvis3 (isolated from Mark II's ~/.jarvis) ──
JARVIS_DIR = Path(os.environ.get("JARVIS3_HOME", str(Path.home() / ".jarvis3")))
CONFIG_FILE = JARVIS_DIR / "config.yaml"
STATE_DIR = JARVIS_DIR / "state"
STATE_DB = STATE_DIR / "state.db"
MEMORY_DIR = JARVIS_DIR / "memories"
MEMORY_FILE = MEMORY_DIR / "MEMORY.md"
USER_FILE = MEMORY_DIR / "USER.md"
SKILLS_DIR = JARVIS_DIR / "skills"

# ── Server ──
HOST = "127.0.0.1"
PORT = 11711
WS_PATH = "/ws/chat"

# ── Memory limits (mirrors Hermes Agent) ──
MEMORY_CHAR_LIMIT = 2200
USER_CHAR_LIMIT = 1375

# ── Agent loop limits (Hermes pattern) ──
MAX_TOOL_TURNS = 8           # max consecutive tool-call rounds per user turn
TOOL_OUTPUT_MAX_CHARS = 8000 # truncate tool output fed back to the model
CONTEXT_WINDOW_TURNS = 40    # recent turns sent to the model

# ── Provider defaults: OpenCode Zen free tier first ──
DEFAULT_PROVIDER = {
    "provider": "opencode-zen",
    "label": "OpenCode Zen",
    "base_url": "https://opencode.ai/zen/v1",
    "model": "big-pickle",
    "api_key_env": ["OPENCODE_API_KEY"],
    "requires_key": True,
}

FALLBACK_ENV_KEYS = [
    "OPENCODE_API_KEY",     # opencode zen
    "OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
]

DEFAULT_CONFIG_YAML = """
# Jarvis Mark III backend config (~/.jarvis3/config.yaml)
server:
  host: 127.0.0.1
  port: 11711

agent:
  temperature: 0.7
  top_p: 0.9
  max_tokens: 4096
  max_tool_turns: 8

providers:
  # First entry with a resolvable API key is used.
  - provider: opencode-zen
    label: OpenCode Zen
    base_url: https://opencode.ai/zen/v1
    model: big-pickle
    requires_key: true

memory:
  char_limit: 2200
  user_char_limit: 1375

skills:
  dir: ~/.jarvis3/skills
"""
