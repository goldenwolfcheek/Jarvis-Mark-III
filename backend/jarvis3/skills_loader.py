"""
Jarvis Mark III — Skills + tools.

Skills follow the Hermes/OpenCode pattern: a directory per skill containing
SKILL.md with YAML frontmatter (name, description). The prompt carries a
compact index; Jarvis can load full skill content on demand via load_skill.
Built-in tools are OpenAI function-calling schemas the agent loop executes.
"""

import logging
import re
from pathlib import Path
from typing import Optional

from .constants import SKILLS_DIR

logger = logging.getLogger(__name__)

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

# ── Skill loader (Hermes SKILL.md pattern) ──

class Skill:
    def __init__(self, name: str, description: str, path: Path, body: str):
        self.name = name
        self.description = description
        self.path = path
        self.body = body


def _parse_skill_md(path: Path) -> Optional[Skill]:
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return None
    fm = {}
    m = _FRONTMATTER_RE.match(text)
    if m:
        raw = m.group(1)
        # minimal YAML frontmatter: key: value lines
        for line in raw.splitlines():
            if ":" in line:
                k, _, v = line.partition(":")
                fm[k.strip()] = v.strip().strip("'\"")
        text = text[m.end():]
    name = fm.get("name") or path.parent.name
    desc = fm.get("description") or ""
    return Skill(name=name, description=desc, path=path, body=text)


class SkillLoader:
    """Discovers ~/.jarvis3/skills/*\/SKILL.md entries."""

    def __init__(self, skills_dir: Path = SKILLS_DIR):
        self._dir = skills_dir
        self._cache: dict[str, Skill] = {}

    def discover(self) -> list[Skill]:
        self._cache.clear()
        if not self._dir.exists():
            self._dir.mkdir(parents=True, exist_ok=True)
        for md in sorted(self._dir.glob("*/SKILL.md")):
            skill = _parse_skill_md(md)
            if skill:
                self._cache[skill.name] = skill
        return list(self._cache.values())

    def load(self, name: str) -> Optional[Skill]:
        if not self._cache:
            self.discover()
        return self._cache.get(name)


def skills_index_prompt(loader: SkillLoader) -> str:
    skills = loader.discover()
    if not skills:
        return ""
    lines = ["Available skills (load with load_skill when relevant):"]
    for s in skills:
        lines.append(f"- {s.name}: {s.description}")
    return "\n".join(lines)


# ── Built-in tool schemas (OpenAI function calling) ──

TOOL_SCHEMAS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "load_skill",
            "description": "Load the full instructions of a named skill. Use when a skill matches the task.",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string", "description": "Skill name from the skills index"}},
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_memory",
            "description": "Re-read the current MEMORY.md and USER.md contents.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_memory",
            "description": "Append or update a durable fact in MEMORY.md (keep it concise; hard char limit applies).",
            "parameters": {
                "type": "object",
                "properties": {"fact": {"type": "string", "description": "A short, durable fact worth remembering"}},
                "required": ["fact"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_user_profile",
            "description": "Append or update information about the user in USER.md.",
            "parameters": {
                "type": "object",
                "properties": {"fact": {"type": "string", "description": "A short fact about the user"}},
                "required": ["fact"],
            },
        },
    },
]


def execute_tool(skill_loader: SkillLoader, memory, name: str, args: dict) -> str:
    """Execute a built-in tool synchronously; returns the tool result string."""
    if name == "load_skill":
        skill = skill_loader.load(args.get("name", ""))
        if not skill:
            return f"Skill '{args.get('name')}' not found."
        return skill.body
    if name == "read_memory":
        return f"MEMORY.md:\n{memory.get_memory()}\n\nUSER.md:\n{memory.get_user()}"
    if name == "update_memory":
        fact = str(args.get("fact", "")).strip()
        if not fact:
            return "No fact given."
        current = memory.get_memory()
        new = (current.rstrip() + f"\n- {fact}")[:2200]
        memory.set_memory(new)
        return "Memory updated."
    if name == "update_user_profile":
        fact = str(args.get("fact", "")).strip()
        if not fact:
            return "No fact given."
        current = memory.get_user()
        new = (current.rstrip() + f"\n- {fact}")[:1375]
        memory.set_user(new)
        return "User profile updated."
    return f"Unknown tool: {name}"
