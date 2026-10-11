# Jarvis Mark III — Project Summary & Tracker

> Created: 2026-10-10 by Buffy (Codebuff agent), for the user ("Sir").
> Location: `I:\Code Shit\OpenCode\Projects\Jarvis Mark III - Revised\`
> Purpose: single source of truth for what exists, what's missing, current bugs, and lessons learned during development. Update every session.

---

## 1. What Jarvis Mark III Is

A highly customizable, Electron-based desktop AI assistant ("J.A.R.V.I.S."). Design DNA comes from Mark 1 → Mark II → Mark III:

- **Dark UI, deep-space blue accents** — palette anchored on `#2763d1` (sphere blue), `#00d4ff` (HUD cyan), `#4a9eff` (glow) over `#0a0f1a` near-black.
- **Animated Three.js particle sphere** as the heart of the app: breathing/pulsing ring of particles, starfield background, slow rotation, audio-reactive pulse intended for TTS output.
- **Layered HUD:** title bar → tab bar → free-floating chat overlay (resizable height, per-tab open state) → left slide-in drawer (sessions, memory, skills, tools, personalities) → bottom info bar (model/provider/tools/version).
- **Backend = Hermes Agent (NousResearch) + Odysseus (odysseus-dev),** kept behind a local API so the UI never depends on their internals. Hermes provides agent loop, tools, MCP, memory, skills, subagent delegation; Odysseus adds sessions/workspace services (docs, email, notes, tasks, calendar, research).

## 2. Analysis of the Existing Projects

### Mark 1 (`..\Jarvis Mark 1`)
- Browser app served by a Python/FastAPI backend (port 9119). No Electron.
- `frontend/index.html` is one giant standalone file — JARVIS theme born here: two animated spheres, radial glow, subtitle bar above the sphere, chat input at bottom, "SYSTEM ONLINE" status badge.
- Backend already had Python backend + agent + tools + PC control (subset of later versions).
- Minimally useful for Mark III beyond confirmed visual lineage; superseded by Mark II.

### Mark II (`..\Jarvis Mark II`)
- **The most feature-complete ancestor** and the main logic reference.
- **Structure:** Python/FastAPI backend (`jarvis/`) on port 11711 + Electron+React+Vite+Tailwind frontend (`electron_frontend/`).
- **Backend modules (reuse/port targets):**
  - `agent/` — agent_loop (streaming turn loop, tool execution), llm_core (OpenAI-compatible async HTTP), model_discovery.
  - `providers/` — ProviderProfile dataclass + 11 built-in profiles (openai, anthropic, ollama, openrouter, google, lmstudio, custom, opencode-zen…), key management via XOR-encrypted keystore.
  - `tools/` — decorator-registry with schema generation; base tools (files/terminal/web), web_tools (DuckDuckGo search + fetch), pc_control (~15 Windows automation tools: apps, windows, keyboard, mouse, volume).
  - `speech/` — edge-tts engine. `memory/store.py` — file-based MEMORY.md + USER.md injection. `state/db.py` — SQLite sessions/messages/KV.
  - `skills/loader.py` — dynamic Python skill loading.
- **Frontend components (UI reference):** TopBar (frameless drag, centered connection dot), SphereScene.jsx (particle sphere, connection lines, audio reactive), ChatModule (glass panel, streaming, slash commands, reasoning effort), LeftDrawer (sessions/memory/skills + context menus), SettingsPanel (slide-in from right: providers/models/API keys/TTS/theme/tray), InfoBar (model|provider|tools|version), TodoSidebar (task steps from agent), subtitles during TTS playback.
- **Electron features to port:** system tray (`main.cjs`: Tray + icon, Hide-to-Tray on close, Show/Quit menu, double-click restore), auto-start on boot via registry key (`HKCU\...\Run`), startup console management. **Wake-word was NOT implemented in Mark II** — it's a Mark III goal.
- Config persisted to `~/.jarvis/config.yaml`, port 11711 isolated from other projects.

### Mark III (`..\Jarvis Mark III`) — the near-final UI, but backend is mock
- **This is the base Mark III - Revised will be built from.** Its `apps/desktop` (~3,100 lines) is the closest thing to the target UI.
- **Structure:** `apps/desktop` (Electron + React + TS + Vite + Tailwind, three on ^0.170), `server/` (FastAPI on 11711 — but chat is **mock responses**), `hermes-base/` (vendored Hermes v0.19 source, for reference/future integration), `hermes-ui-reference/` (archived Hermes UI for parity checking).
- **What the UI has (mostly good, keep it):**
  - `TitleBar` — frameless, drag region, JARVIS label + centered connection status + settings gear + window controls.
  - `TabBar` — centered text tabs, active tab underlined with glowing cyan bar; tabs defined in settings (Chat/Code/News/Stocks), with closable + custom-tab support built into the data model.
  - `SphereScene.tsx` — TypeScript port of Mark II sphere: 5000-star field sphere, 1500-particle main sphere, connection lines, breathing pulse, colors from settings, WebGL fallback.
  - `ChatOverlay` — floating chat panel over the sphere, per-tab visibility, resizable height, message bubbles (user right/blue, Jarvis left/dark w/ cyan name), simple markdown-in-mentions code blocks, streaming indicator dots, model/provider pickers, file attachment slot.
  - `Sidebar` — left slide-in drawer: sessions list (rename/delete context menu), personality presets (Jarvis/Engineer/Kawaii/etc + custom), skills/tools lists (empty placeholders), memory editor.
  - `SettingsPage` — full-page settings with 10 sections (General, Model & Provider, Tabs & Layout, Voice, Appearance, Memory, MCP, Webhooks, Notifications, Advanced). Settings model covers: model/provider/apiKey/baseUrl/contextLength/maxTokens/savedProviders, tabs, pageLayouts (widgets per page), voice (enabled, wake word "Hey Jarvis", tts/stt providers), theme (sphere intensity, particle count, glow color, uiScale), chat (height, timestamps, streaming speed), memory (personality, userProfile, vaultPath), notifications, backendUrl/wsUrl.
  - `WidgetPanel` — per-page widget system (Clock, Notes, Tasks; page layout stored in settings). News/Stocks tabs currently show placeholders.
  - `FileBrowser` + `TextEditor` (CodeMirror 6) + `CodeEditor` (Monaco) — wired to Electron IPC for folder pick/read/write.
- **What it's missing (the wall the previous attempt hit):**
  - `server/routes/chat.py` returns canned mock responses — no LLM at all.
  - No real Hermes/Odysseus integration; hermes-base is vendored but unused.
  - No voice at all (no STT, no TTS, no wake word) — only settings placeholders.
  - No system tray, no auto-start, no screen-awareness tools.
  - Sessions/users do not persist to the backend (in-memory store).
  - Sidebar skills/tools lists render nothing.
  - News/Stocks are placeholder pages; widget system exists but sparse.
- Git history: clean, on `main`, last commits are Electron/Vite launch fixes. Previous agent got stuck here with a weak model; UI was declared "more or less there".

### Pain points inherited from previous attempts (avoid repeating)
1. Backend was built as mocks, then never replaced — this time, Hermes/Odysseus integration is the plan from day one.
2. Config duplication in Mark II (frontend wrote `active_provider`, backend read `provider`) — single settings schema, written from one place.
3. Frameless Electron + dev server race (Mark III commits show repeated ERR_CONNECTION_REFUSED whack-a-mole) — solve once with a documented dev/boot order and wait-on, then stop touching it.
4. localStorage-only state in Mark III renderer lost data across machines/tray restarts — persist session state on the backend (Hermes sessions / SQLite).

## 3. Target Architecture (Hermes + Odysseus)

```
┌────────────────────────────────────────────────────────────┐
│  Electron app (apps/desktop)                               │
│  React + TS + Tailwind + Three.js sphere                   │
│  Jarvis HUD: TitleBar · TabBar · ChatOverlay · Sidebar ·   │
│  Settings · WidgetPanel · Voice HUD (wake/STT/TTS)         │
└─────────────┬──────────────────────────────┬───────────────┘
              │ REST + WebSocket (localhost) │ Electron IPC (fs, tray, screen)
┌─────────────▼──────────────────┐  ┌────────▼────────────────────┐
│  Jarvis bridge server (Python) │  │  Electron main process      │
│  • chat WS → Hermes agent loop │  │  • frameless window, tray   │
│  • providers via Hermes        │  │  • wake word (mic monitor)  │
│  • ~/.jarvis/config.yaml       │  │  • screen capture IPC       │
│  • voice: wake word + STT +    │  │  • auto-start (registry)    │
│    edge-tts                    │  └─────────────────────────────┘
│  • news/stocks feeds           │
└─────────────┬──────────────────┘
   ┌──────────┴─────────────┐
   ▼                        ▼
┌───────────────┐   ┌───────────────────────────────┐
│ Hermes Agent  │   │ Odysseus services             │
│ (MIT, Python) │   │ (AGPL-3.0, Python/FastAPI)    │
│ agent loop,   │   │ sessions, memory, docs, email,│
│ tools, MCP,   │   │ notes, tasks, calendar,       │
│ memory, skills│   │ research                      │
│ subagents     │   │                               │
└───────────────┘   └───────────────────────────────┘
```

**Integration facts learned (from research, verify against vendored source at build time):**
- Hermes Agent: MIT, Python, current releases ~v0.21.x (vendored copy in Mark III is 0.19). Official integration path for third-party UIs is its **OpenAI-compatible HTTP API** (`/v1/chat/completions`, SSE, default port 8642, `API_SERVER_ENABLED=true`). Also supports MCP (local stdio + remote HTTP with per-server tool filtering), MEMORY.md/USER.md, SQLite FTS5 sessions, agentskills.io skills, provider adapters (Nous, OpenAI, Anthropic, OpenRouter, Google, custom endpoints, local models), and `delegate_task` subagents. Docs: https://hermes-agent.nousresearch.com/docs/
- Odysseus: AGPL-3.0-or-later, Python/FastAPI workspace (sessions, memory, skills, MCP, docs, IMAP/SMTP email, CalDAV calendar, notes/tasks/research, STT/TTS services). Deployed as its own service (Docker default port 7011 / native 7000). Not a documented embeddable library — treat as a service behind the bridge, pin to specific routes you depend on. Repo: https://github.com/odysseus-dev/odysseus
- **License note:** AGPL applies if Jarvis ever serves Odysseus to network users unmodified. For a personal-use desktop app this is acceptable; flag it if the user ever wants to redistribute. Hermes (MIT) is unproblematic.
- User's plan: copy their existing Hermes skills directory into Jarvis so those capabilities come along.

**Bridge strategy (why a middle layer):** neither Hermes' UI nor Odysseus' UI fits the Jarvis HUD, and their APIs differ (OpenAI-compatible vs ad-hoc routes). A thin FastAPI bridge on port 11711 gives one stable WS + REST surface to the Electron app and lets Hermes/Odysseus versions move without breaking the UI.

## 4. Feature Master Plan (acceptance-checked)

Ordered so UI is finished first (user's explicit preference), then backends, then feature systems.

### A. UI (current focus — finish before backend)
- [x] Dark theme, blue-cyan accents, Tailwind `jarvis` palette (from Mark III).
- [x] Animated sphere (stars, breathing particles, connection lines, WebGL fallback).
- [x] Frameless title bar with connection status + window controls.
- [ ] **Polish pass on Mark III UI before backend integration (IN PROGRESS):** fix layout bugs from Mark III, unify palette tokens, consistent glow/shadow language, animated tab transitions, reduced-motion support.
- [ ] Tab system final: add/disable/rename/close tabs from settings; built-in pages: Chat, Code, News (RSS/API feed), Stocks (later), plus user-created custom pages.
- [ ] Each tab page customizable with widget grid (Clock, Notes, Tasks, then News/Stocks/System widgets).
- [ ] Sidebar: sessions (real persistence once Hermes lands), memory view, skills browser, tools list, custom personalities.
- [ ] Settings menu full pass: General/Model & Provider/Tabs/Voice/Appearance/Memory/MCP/Webhooks/Notifications/Advanced — every item actually wired to config that the backend reads later.
- [ ] Voice HUD: mic indicator, wake-word listening state ("Hey Jarvis"), TTS toggle.
- [ ] System tray behavior + tray icon menu (port from Mark II Electron).

### B. Backend core (Hermes integration)
- [ ] Decide Hermes usage mode: vendor (like `hermes-base`) vs pinned release vs API-server subprocess. Preference: run Hermes in-process from venv? → confirm with user when we get here.
- [ ] Bridge server: WS chat endpoint proxying Hermes agent loop with streaming deltas; tool-call pill events; session persistence to Hermes SQLite.
- [ ] Provider config: single `~/.jarvis/config.yaml` (model, provider, api keys, providers list) written once from renderer settings.
- [ ] Skills: wire user's Hermes skills dir; sidebar browser lists real skills with enable/disable.

### C. Odysseus integration (memory + workspace)
- [ ] Odysseus as sidecar service; bridge exposes memory/docs/calendar/email/search from it.
- [ ] Memory UI (sidebar) reads/writes Odysseus memory; Hermes memory remains the agent-facing store initially.

### D. Voice
- [ ] Wake word "Hey Jarvis" listening (openWakeWord recommended, per Mark III VOICE-ENGINE.md; fallback: whisper-transcribe-and-match).
- [ ] STT (faster-whisper local) → send message; TTS (edge-tts) with audio-reactive sphere pulse + subtitles (port Mark II subtitle animation).
- [ ] Works while window hidden to tray (Python process keeps mic loop alive).

### E. System capabilities
- [ ] Screen awareness: Electron `desktopCapturer` screenshots on demand (IPC), plus window/monitor listing; passed to vision-capable model.
- [ ] Built-in MCP: ship presets for "rea" and Ghidra-MCP (enabled by default, listed in settings MCP section).
- [ ] PC control tools port (Mark II pc_control) as Hermes MCP/tool integration.
- [ ] News/Stocks data feeds in bridge (news first).

### F. Distribution
- [ ] Installer/launcher parity with earlier marks: start batch + silent launcher, auto-start registry option.

## 5. Current Status (update every session)

- **Phase:** UI build — first full pass complete and committed to git (repo initialized on `main`).
- **This session's work (commits bf9c940…final):**
  - Ported Mark III `apps/desktop` (dropped unused Monaco dep), `tsc --noEmit` clean, `vite build` green.
  - Windows launchers: `Run Jarvis III UI.bat` (production), `Run Jarvis III UI (Dev).bat` (hot-reload), `Launch Jarvis III UI (Silent).vbs`.
  - **Fixed the blank-window bug chain** (user-reported + debugged):
    1. `main.mjs` used `app.isPackaged` for dev detection — always false when running from `node_modules`, so production loaded the (dead) Vite URL → chrome-error blank. Dev is now opt-in via `JARVIS_DEV=1` (set by the Dev bat).
    2. Vite emitted absolute asset paths → added `base: './'` + `vite-plugin-singlefile` (ES modules don't load over `file://` at all).
    3. CSP `script-src` lacked `'unsafe-inline'` → the inlined module bundle was CSP-blocked → DOM stayed empty (matched user's empty-Elements devtools screenshot). Fixed CSP (also allows https/file connect & img for feeds/avatars).
    4. Inlined module script carried `crossorigin` → treated as CORS request on `file://`; launcher strips it post-build (and a node one-liner patched the already-built dist).
      - Overlap fixes: ChatOverlay now takes computed `contentInset` (sidebar 256px left / file panel 256px right) instead of hardcoded `ml-64`, z-ordered under side panels, chatHeight clamped 35–90vh.
  - Launcher patch hardened: the post-build `crossorigin` strip is a quote-free Node one-liner (PowerShell quoting was fragile in cmd).
  - Tab icons real (💬⚡📰📈 with saved-settings migration), `jarvis-green` token added.
  - News tab: real RSS/Atom reader via main-process fetch (user-manageable feeds, persisted, safe shell.openExternal links). Stocks tab: watchlist-first with honest em-dash placeholders until backend phase; custom tabs show an actionable empty state. Code tab explains how to open files.
  - Electron IPC added: `fetch:text` (http/https only, 15s timeout), `openExternal`, `getSystemStats` (real CPU/RAM deltas — SystemStats widget now works), `getAppInfo`. Typed in `src/types/electron.ts`.
  - Settings: live app version (via IPC), test-notification button; Webhooks/MCP/Notifications sections were already implemented in the port.
  - Persistence: active tab, sidebar/chat-open state ride the settings blob; sessions list persisted with working rename/delete through new Sidebar props; `useWebSocket` takes `settings.wsUrl`.
  - Final build verified in the real production launcher run (Electron processes alive, UI confirmed visible by user).
- **Live-verified by user:** UI renders and looks good (2026-10-10). User-reported follow-up bugs fixed in the second build: file-browser toggle was visible on every tab (now Code-tab only), and the Chat tab wrongly showed the custom-tab "Add widgets" empty state (now sphere-only; sphere also kept behind News/Stocks/custom pages for the starfield backdrop). Third build: open-file editor is scoped to the Code tab — switching tabs leaves the file behind on Code (returning shows it still open) instead of pinning the editor over every tab; two residual leaks fixed in the same pass (Chat-with-openFile fallthrough to the empty state, and FileBrowser's stale `|| openFile` mount clause). Fourth build: chat panel inset for the file browser was keyed on the open-flag alone, so on Chat (and other non-Code tabs) the panel shifted left for a file panel that isn't rendered there — the right inset now also requires the Code tab to be active. Fifth build (launcher + readability + sphere toggle):
  - **Launcher root cause found:** cmd.exe on this machine cannot resolve a bare relative bat name (even `cmd /c _t.bat` with correct cwd says "not recognized") — the only working invocation is `cmd /c .\name.bat` via a PowerShell `Set-Location` wrapper. The production bat was rewritten defensively regardless: always-rebuild (no staleness PowerShell), `pause` on every failure path so errors are readable, plain `start` with `/d` so Electron outlives the console. Dry-run of the bat content executed end-to-end (build + spawn verified). **User should now verify a real double-click of the bat and the vbs — pending.**
  - **Widget readability:** widget cards and the News card are now almost opaque (`#0d1420` @ 95%) with a drop shadow instead of `surface/50`; sphere particles no longer bleed through the text.
  - **Per-tab sphere toggle:** Settings → Tabs & Layout → "Sphere on/off" button per tab (`settings.sphereTabs` record, default chat/code on, news/stocks off).
  - **Sixth build (settings expansion + readability round 2):** user reported cards STILL hard to read — root cause realized: the SphereScene canvas is `fixed z-0` but non-positioned widget content paints below positioned siblings; cards now stack correctly AND opacity is user-tunable (Settings → Appearance → Card Opacity 50–100%, default 95%).
  - **Sphere is now fully tunable in Appearance:** Rotation Speed (0–3x), Pulse Speed (0–3x), Sphere Color + Starfield Color pickers. SphereScene reads settings via refs so sliders apply live without scene rebuild.
  - **New settings sections mirroring Hermes + Odysseus:** 'Agent (Hermes)' — temperature, top_p, max response length, context turns, context compression, auto-create skills, subagents enabled + parallel cap, terminal backend (local/docker/remote). 'Integrations (Odysseus)' — enable toggle, service URL (:7011 Docker / :7000 native), API key, feature toggles (docs, email, calendar, notes, tasks, research). All persist in the settings blob and take effect when the backend bridge lands.
  - **GitHub initialized:** repo pushed to https://github.com/goldenwolfcheek/Jarvis-Mark-III (remote `origin`, branch `main`, PAT-based auth embedded in the local remote URL). Earlier push attempt 403'd because Windows credential manager was signed in as `Modded-Waffles` (no write access); fixed via a scoped PAT for goldenwolfcheek. Future note: if git push starts 403ing again, re-embed a fresh token in `git remote set-url origin https://goldenwolfcheek:<TOKEN>@github.com/...`.
  - **Seventh build (sphere style system + launcher final fix):**
    - **4 sphere styles** (Settings → Appearance → Style): **Classic** (previous default — wireframe + rings + starfield), **Fluid** (from the user's Zoey video reference, `docs/reference/sphere_ref_*.png` — dense tiny dots, organic irregular blob silhouette via a stable multi-wave radial distortion, warm orange→magenta vertex-color gradient, no lines/rings, hard-coded warm gradient ignoring Sphere Color), **Geodesic** (denser structured dome, brighter lines), **Swarm** (240 comet particles on tilted elliptical orbits around the core). Style switch is live (no scene rebuild) via `styleRef` inside `applyStyle()`.
    - **Background customization:** Starfield on/off toggle, HUD Rings on/off toggle (rings only render in Classic/Geodesic), plus existing Starfield Color picker. Flows as `showStarfield`/`showRings` props to SphereScene, animated via `visible` toggles not object teardown.
    - **Launcher root cause round 2 (REAL one found and verified):** the .bat and .vbs had LF-only line endings — `file` confirmed `Run Jarvis III UI.bat: HTML document, ... file` because most bytes were ASCII text; cmd.exe misparses multi-line block parens with bare LF. All 3 launchers rewritten in-place then `sed -i 's/$/\r/'` to spool CRLF (`file` now confirms `with CRLF line terminators` on all 3). .vbs rewritten to the proven Mark II boot-launcher pattern (standalone `Option Explicit` + `shell.Run "cmd /c ..."` driving everything, with `%TEMP%\jarvis3-boot.log` timestamped rows). Production bat now also uses plain `cmd /c "npx electron ."` (no `start` wrapping) and pauses on exit.
    - **End-to-end verified:** vbs path run via `cscript //nologo` → boot log shows build+patch+launch, 4 electron.exe processes alive. Visible bat path run via `cmd /c start ""` → 4 electron.exe processes alive. `tsc --noEmit` exit 0, `vite build` green, `crossorigin` attr stripped from fresh dist (count 1→0 happily handled post-hoc).
    - **Still needs user double-click test** (Explorer's `ShellExecute` context differs from my `cmd /c start ""` proxy) but both LF→CRLF and known `cmd /c npx` decode bugs are both now addressed.
- **Settings options:** Fluid/Geodesic/Swarm styles + Starfield/Rings toggles are all live in Settings → Appearance. Sphere Color note: Fluid's look is driven by vertex colors and now takes TWO user colors — Fluid Gradient Dark (`fluidColorA`, default `#0a2540`) and Light (`fluidColorB`, default `#4a9eff`) — interpolated across the blob; the pickers appear only when Fluid is the active style.
- **Eighth build (gradient + mic + tray/boot):** user confirmed the launchers now work from real double-clicks.
  - **Fluid two-color gradient:** per-vertex interpolation on the (x+y+z)/3 axis between `fluidColorA` and `fluidColorB`, re-tinted live when either color changes (no rebuild).
  - **Floating mic button** (Chat tab, stacked above the Chat pill): new `src/hooks/useVoiceInput.ts` — shared Web Speech recognizer (continuous, auto-restart, `en-US`, benign no-speech/aborted error handling) whose final transcripts go straight through `handleSendMessage` so Jarvis answers without the chat overlay being open. In-chat mic and floating mic share the same pipeline via `micActive`/`onMicToggle` props.
  - **Tray + boot (ported from Mark II):** `electron/main.mjs` now has `createTray()` (Show/Quit menu, double-click restore), close-to-tray when the setting is on, and `setBootEnabled` writing the `HKCU\...\Run` registry key (`reg add/delete JarvisMarkIII`), with `--hidden` argv honored at boot. State persists in `userData/window-prefs.json` (not the renderer's localStorage — main-process owned). Settings → Advanced → App Behavior has both toggles, queried/synced through 4 new IPC channels (`get/setTrayEnabled`, `get/setBootEnabled`) typed in `src/types/electron.ts`. Tray icon is currently `nativeImage.createEmpty()` — Windows shows a default icon; a real .ico is a TODO when packaging.

## 6. Current Bugs / Known Issues

- None yet (no code written in this workspace). Bugs found in Mark III source worth pre-empting:
  - Chat render of markdown is ad-hoc (only code blocks); no bold/lists/links — include a proper markdown renderer in the polish pass.
  - `useWebSocket` reconnect noise (Mark III had a fix suppressing error spam when backend is down — keep that behavior).
  - TypeScript any-types sprinkled in App.tsx message handling (`(history: any[])`) — type them when backend schema exists.

## 7. Lessons Learned

- **Electron production blank-window trap (the big one this session):** `app.isPackaged` is not a Dev/Prod signal when running Electron from `node_modules` — it is always `false`, so any "if dev, load vite URL" branch silently ships to production. Use an explicit env flag (`JARVIS_DEV=1`). Related chain: ES module bundles don't execute over `file://` (needs inlining via vite-plugin-singlefile), inline scripts need CSP `'unsafe-inline'`, and the inlined `<script type="module" crossorigin>` freezes on `file://` CORS — the launcher strips the attribute post-build. A blank window + empty DevTools Elements tab means "no page ever loaded" (check the chrome-error:// URL in devtools) rather than "JS crashed".
- Analysis revealed the active workspace (`Jarvis Mark III - Revised`) was empty except `.freebuff/` before this session; Mark III's codebase was ported by direct copy excluding node_modules/dist.
- Hermes integration via its documented OpenAI-compatible HTTP API is the most stable contract; deeper in-process integration should be a deliberate, isolated decision (Hermes 0.19 vendored copy differs from current 0.21.x).
- Odysseus is service-shaped, not library-shaped. Its AGPL license is fine for personal use; if the user redistribute Jarvis, this needs revisiting.
- The Mark II Electron main process is a solid, working reference for tray + auto-start-on-boot on Windows; prefer porting it over writing new.
- Port 11711 is the established Jarvis backends port across marks; keep it.
- Wake word was never implemented in any prior mark — treat as novel work, prototype early with a spike before committing.

## 8. Open Questions for the User

1. Hermes usage mode: run Hermes' API server as a subprocess and talk HTTP (stable, documented), vendored in-process (like Mark III's hermes-base), or pinned-release venv import? (Preference stated above in §4B; confirmation needed when backend phase starts.)
2. Odysseus deployment: Docker sidecar vs native Python service on this Windows machine?
3. Should the widget/News/Stocks feeds be live-API-backed from the start of their phase, or mock-first then wire?
4. Git init in this workspace — user preference on history/remote before scaffolding?
