import { useState, useEffect } from 'react'
import type { Settings } from '@/hooks/useSettings'

interface SettingsPageProps {
  settings: Settings
  onUpdate: (partial: Partial<Settings>) => void
  onReset: () => void
}

type SettingsSection = 'general' | 'model' | 'agent' | 'integrations' | 'tabs' | 'voice' | 'appearance' | 'memory' | 'mcp' | 'webhooks' | 'notifications' | 'advanced'

const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'model', label: 'Model & Provider', icon: '🧠' },
  { id: 'agent', label: 'Agent (Hermes)', icon: '🤖' },
  { id: 'integrations', label: 'Integrations (Odysseus)', icon: '🧩' },
  { id: 'tabs', label: 'Tabs & Layout', icon: '📑' },
  { id: 'voice', label: 'Voice', icon: '🎙️' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'memory', label: 'Memory', icon: '🗃️' },
  { id: 'mcp', label: 'MCP Servers', icon: '🔌' },
  { id: 'webhooks', label: 'Webhooks', icon: '🪝' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'advanced', label: 'Advanced', icon: '🔧' },
]

export default function SettingsPage({ settings, onUpdate, onReset }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  const renderSection = () => {
    switch (activeSection) {
      case 'general': return <GeneralSection settings={settings} onUpdate={onUpdate} />
      case 'model': return <ModelSection settings={settings} onUpdate={onUpdate} />
      case 'agent': return <AgentSection settings={settings} onUpdate={onUpdate} />
      case 'integrations': return <IntegrationsSection settings={settings} onUpdate={onUpdate} />
      case 'tabs': return <TabsSection settings={settings} onUpdate={onUpdate} />
      case 'voice': return <VoiceSection settings={settings} onUpdate={onUpdate} />
      case 'appearance': return <AppearanceSection settings={settings} onUpdate={onUpdate} />
      case 'memory': return <MemorySection settings={settings} onUpdate={onUpdate} />
      case 'mcp': return <MCPSection />
      case 'webhooks': return <WebhooksSection />
      case 'notifications': return <NotificationsSection settings={settings} onUpdate={onUpdate} />
      case 'advanced': return <AdvancedSection settings={settings} onUpdate={onUpdate} onReset={onReset} />
    }
  }

  return (
    <div className="h-full flex bg-jarvis-bg/80 backdrop-blur-sm">
      <div className="w-56 border-r border-jarvis-border/30 p-3 space-y-1">
        <div className="text-[10px] font-semibold text-jarvis-muted uppercase tracking-wider px-3 py-2">Settings</div>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === s.id ? 'bg-jarvis-blue/20 text-jarvis-cyan' : 'text-jarvis-text hover:bg-white/5'
            }`}
          >
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">{renderSection()}</div>
    </div>
  )
}

// ── Shared UI primitives ─────────────────────────────────────────────────
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (<div className="mb-6"><h2 className="text-lg font-semibold text-jarvis-text">{title}</h2><p className="text-sm text-jarvis-muted mt-1">{description}</p></div>)
}
function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (<div className="flex items-center justify-between py-3 border-b border-jarvis-border/50 last:border-0"><div className="flex-1 mr-4"><div className="text-sm font-medium text-jarvis-text">{label}</div>{description && <div className="text-xs text-jarvis-muted mt-0.5">{description}</div>}</div><div className="flex-shrink-0">{children}</div></div>)
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (<button onClick={() => onChange(!value)} className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-jarvis-blue' : 'bg-jarvis-surface border border-jarvis-border'}`}><span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: value ? '22px' : '2px' }} /></button>)
}
function TextInput({ value, onChange, placeholder, type = 'text', className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (<input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`w-64 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none transition-colors ${className}`} />)
}
function TextArea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (<textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full px-3 py-2 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none transition-colors resize-none font-mono leading-relaxed" />)
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (<select value={value} onChange={e => onChange(e.target.value)} className="w-64 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text focus:border-jarvis-cyan/50 outline-none transition-colors appearance-none cursor-pointer">{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>)
}
function Slider({ value, onChange, min, max, step, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string }) {
  return (<div className="flex items-center gap-3"><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-48 h-1 bg-jarvis-border rounded-full appearance-none cursor-pointer accent-jarvis-blue" /><span className="text-xs text-jarvis-muted w-12 text-right">{value}{unit || ''}</span></div>)
}

// ── General ──────────────────────────────────────────────────────────────
function GeneralSection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  const [version, setVersion] = useState('…')
  useEffect(() => {
    window.electronAPI?.getAppInfo()
      .then(info => setVersion(`v${info?.version || '3.0.0'} · Electron ${info?.electron || ''}`))
      .catch(() => setVersion('v3.0.0'))
  }, [])
  const testNotification = () => {
    if (!settings.notifications.desktopEnabled) return
    try { new Notification('Jarvis Mark III', { body: 'Notifications are working, Sir.' }) } catch {}
  }
  return (<div><SectionHeader title="General" description="Basic application settings" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4">
      <SettingRow label="App Name"><span className="text-sm text-jarvis-cyan font-medium">Jarvis Mark III — Revised</span></SettingRow>
      <SettingRow label="Version"><span className="text-sm text-jarvis-muted font-mono">{version}</span></SettingRow>
      <SettingRow label="Show Timestamps" description="Display time on chat messages"><Toggle value={settings.showTimestamps} onChange={v => onUpdate({ showTimestamps: v })} /></SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mt-4">
      <div className="text-sm font-medium text-jarvis-text mb-1">Quick Check</div>
      <p className="text-xs text-jarvis-muted mb-3">Fire a test notification to confirm OS integration.</p>
      <button onClick={testNotification} className="px-4 py-1.5 text-sm bg-jarvis-blue/20 text-jarvis-cyan rounded-lg hover:bg-jarvis-blue/30 transition-colors border border-jarvis-blue/20">Send Test Notification</button>
    </div></div>)
}

// ── Model & Provider ─────────────────────────────────────────────────────
// Known provider presets — Base URL auto-fills when the provider changes.
const PROVIDER_PRESETS: Record<string, { baseUrl: string; needsKey: boolean; note?: string }> = {
  'lmstudio': { baseUrl: 'http://localhost:1234/v1', needsKey: false, note: 'Local. Start the server in LM Studio, no API key needed.' },
  'ollama': { baseUrl: 'http://localhost:11434/v1', needsKey: false, note: 'Local Ollama with an OpenAI-compatible endpoint active.' },
  'opencode-zen': { baseUrl: 'https://opencode.ai/zen/v1', needsKey: true, note: 'Free models are now restricted to OpenCode\'s own app and reject direct API use — use LM Studio or another provider instead.' },
  'openrouter': { baseUrl: 'https://openrouter.ai/api/v1', needsKey: true, note: 'API key required even for :free models. Model IDs look like meta/model:free.' },
  'openai': { baseUrl: 'https://api.openai.com/v1', needsKey: true },
  'anthropic': { baseUrl: 'https://api.anthropic.com/v1', needsKey: true },
  'custom': { baseUrl: '', needsKey: false },
}

function ModelSection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  const [newLabel, setNewLabel] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [modelsState, setModelsState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [modelsError, setModelsError] = useState('')
  const apiKey = settings.apiKey
  const baseUrl = settings.baseUrl || PROVIDER_PRESETS[settings.provider]?.baseUrl || ''
  const needsKey = PROVIDER_PRESETS[settings.provider]?.needsKey ?? false

  const fetchModels = () => {
    setModelsState('loading'); setModelsError('')
    fetch(`${'http://127.0.0.1:11711'}/api/models?base_url=${encodeURIComponent(baseUrl)}&api_key=${encodeURIComponent(apiKey || '')}`)
      .then(r => r.json())
      .then(res => {
        if (res.ok) { setModels(res.models); setModelsState('idle') }
        else { setModelsState('error'); setModelsError(res.error || 'Failed to list models') }
      })
      .catch(e => { setModelsState('error'); setModelsError(String(e)) })
  }

  const saveProvider = () => {
    if (!settings.provider || !settings.model) return
    const label = newLabel.trim() || `${settings.provider}/${settings.model}`
    const exists = settings.savedProviders.some(p => p.provider === settings.provider && p.model === settings.model)
    if (exists) return
    onUpdate({ savedProviders: [...settings.savedProviders, { provider: settings.provider, model: settings.model, apiKey: settings.apiKey, label }] })
    setNewLabel('')
  }

  const loadProvider = (p: { provider: string; model: string; apiKey: string }) => {
    onUpdate({ provider: p.provider, model: p.model, apiKey: p.apiKey })
  }

  const removeProvider = (i: number) => {
    onUpdate({ savedProviders: settings.savedProviders.filter((_, idx) => idx !== i) })
  }

  return (<div><SectionHeader title="Model & Provider" description="Configure which AI model to use — mirrors Hermes cli-config.yaml" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1">
      <SettingRow label="Provider" description="Base URL and notes fill in automatically"><Select value={settings.provider} onChange={v => {
        const preset = PROVIDER_PRESETS[v]
        onUpdate({ provider: v, baseUrl: preset ? preset.baseUrl : settings.baseUrl })
        setModels([]); setModelsState('idle')
      }} options={[
        { value: 'lmstudio', label: 'LM Studio (Local)' },
        { value: 'ollama', label: 'Ollama (Local)' },
        { value: 'opencode-zen', label: 'OpenCode Zen' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'custom', label: 'Custom (OpenAI-compatible)' },
      ]} /></SettingRow>
      {PROVIDER_PRESETS[settings.provider]?.note && (
        <p className="text-xs text-jarvis-muted/80 px-3 pb-1">{PROVIDER_PRESETS[settings.provider].note}</p>
      )}
      <SettingRow label="Base URL" description="Auto-filled per provider; override for self-hosted"><TextInput value={settings.baseUrl} onChange={v => onUpdate({ baseUrl: v })} placeholder="http://localhost:1234/v1" className="w-full font-mono" /></SettingRow>
      <SettingRow label="Model" description="Type an ID, or list models from the provider">
        <div className="flex items-center gap-2">
          <TextInput value={settings.model} onChange={v => onUpdate({ model: v })} placeholder="e.g. big-pickle or qwen2.5-7b-instruct" className="flex-1 min-w-0" />
          <button onClick={fetchModels} disabled={modelsState === 'loading' || !baseUrl} className="px-2.5 py-1.5 text-xs whitespace-nowrap bg-jarvis-blue/20 text-jarvis-cyan rounded-lg hover:bg-jarvis-blue/30 border border-jarvis-blue/20 disabled:opacity-40">{modelsState === 'loading' ? '…' : 'List models'}</button>
        </div>
      </SettingRow>
      {models.length > 0 && (
        <SettingRow label="Pick a model" description={`${models.length} available`}>
          <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
            {models.map(m => (
              <button key={m} onClick={() => onUpdate({ model: m })}
                className={`px-2 py-1 rounded-md text-xs font-mono transition-colors border ${
                  settings.model === m ? 'bg-jarvis-cyan/20 border-jarvis-cyan/50 text-jarvis-cyan' : 'bg-jarvis-surface/60 border-jarvis-border/50 text-jarvis-muted hover:border-jarvis-cyan/30 hover:text-jarvis-text'}`}
              >{m}</button>
            ))}
          </div>
        </SettingRow>
      )}
      {modelsState === 'error' && (<p className="text-xs text-jarvis-error/90 px-3 pb-1">{modelsError}</p>)}
      <SettingRow label="API Key" description="Leave empty to use .env / system env var"><TextInput type="password" value={settings.apiKey} onChange={v => onUpdate({ apiKey: v })} placeholder="Optional" /></SettingRow>
      <SettingRow label="Base URL" description="Override API endpoint (for custom/self-hosted)"><TextInput value={settings.baseUrl} onChange={v => onUpdate({ baseUrl: v })} placeholder="https://openrouter.ai/api/v1" className="w-full font-mono" /></SettingRow>
      <SettingRow label="Context Length" description="Total context window (input + output tokens)"><TextInput value={settings.contextLength?.toString() ?? ''} onChange={v => onUpdate({ contextLength: parseInt(v) || undefined })} placeholder="e.g. 200000" /></SettingRow>
      <SettingRow label="Max Tokens" description="Output cap per response"><TextInput value={settings.maxTokens?.toString() ?? ''} onChange={v => onUpdate({ maxTokens: parseInt(v) || undefined })} placeholder="Leave empty = model default" /></SettingRow>
      <SettingRow label="Nickname" description="Optional label for this config"><TextInput value={newLabel} onChange={setNewLabel} placeholder="e.g. Main model" className="w-48" /></SettingRow>
      <div className="pt-2"><button onClick={saveProvider} disabled={!settings.provider || !settings.model} className="px-4 py-1.5 text-sm bg-jarvis-blue/20 text-jarvis-cyan rounded-lg hover:bg-jarvis-blue/30 transition-colors disabled:opacity-40 border border-jarvis-blue/20">Save as Provider</button></div>
    </div>

    {/* Saved providers list */}
    {settings.savedProviders.length > 0 && (<div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mt-4">
      <div className="text-sm font-medium text-jarvis-text mb-3">Saved Providers</div>
      <div className="space-y-2">
        {settings.savedProviders.map((p, i) => (
          <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
            p.provider === settings.provider && p.model === settings.model
              ? 'bg-jarvis-blue/10 border-jarvis-blue/30' : 'bg-jarvis-bg/30 border-jarvis-border/50 hover:bg-jarvis-bg/50'
          }`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-jarvis-text font-medium truncate">{p.label}</div>
              <div className="text-xs text-jarvis-muted font-mono">{p.provider}/{p.model}</div>
            </div>
            <button onClick={() => loadProvider(p)} className="px-3 py-1 text-xs text-jarvis-cyan hover:bg-jarvis-cyan/10 rounded-md transition-colors">Load</button>
            <button onClick={() => removeProvider(i)} className="px-2 py-1 text-xs text-jarvis-muted hover:text-jarvis-error hover:bg-jarvis-error/10 rounded-md transition-colors">✕</button>
          </div>
        ))}
      </div>
    </div>)}
  </div>)
}

// ── Agent (Hermes) ──────────────────────────────────────────────────────
function AgentSection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  return (<div><SectionHeader title="Agent (Hermes)" description="Agent-loop behavior — these map onto Hermes agent parameters once the backend bridge is live." />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mb-4">
      <div className="text-sm font-medium text-jarvis-text">Generation</div>
      <SettingRow label="Temperature" description="0 = deterministic, 1 = creative"><Slider value={settings.agentTemperature} onChange={v => onUpdate({ agentTemperature: v })} min={0} max={1} step={0.05} /></SettingRow>
      <SettingRow label="Top P" description="Nucleus sampling cutoff"><Slider value={settings.agentTopP} onChange={v => onUpdate({ agentTopP: v })} min={0.1} max={1} step={0.05} /></SettingRow>
      <SettingRow label="Max Response Length" description="Output cap per agent response (tokens)"><TextInput value={settings.agentMaxLength.toString()} onChange={v => onUpdate({ agentMaxLength: parseInt(v) || 0 })} /></SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mb-4">
      <div className="text-sm font-medium text-jarvis-text">Context & Memory</div>
      <SettingRow label="Conversation Turns Kept" description="How many recent turns stay in full context"><Slider value={settings.agentTurnsContext} onChange={v => onUpdate({ agentTurnsContext: v })} min={10} max={200} step={5} /></SettingRow>
      <SettingRow label="Context Compression" description="Summarize older history instead of dropping it"><Toggle value={settings.agentContextCompression} onChange={v => onUpdate({ agentContextCompression: v })} /></SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mb-4">
      <div className="text-sm font-medium text-jarvis-text">Skills & Subagents</div>
      <SettingRow label="Auto-Create Skills" description="Hermes may create reusable skills from repeated workflows"><Toggle value={settings.agentAutoSkills} onChange={v => onUpdate({ agentAutoSkills: v })} /></SettingRow>
      <SettingRow label="Subagents (Delegation)" description="Allow Jarvis to spawn child agents for parallel work"><Toggle value={settings.agentSubagentsEnabled} onChange={v => onUpdate({ agentSubagentsEnabled: v })} /></SettingRow>
      <SettingRow label="Max Parallel Subagents"><Slider value={settings.agentMaxParallelSubagents} onChange={v => onUpdate({ agentMaxParallelSubagents: v })} min={1} max={8} step={1} /></SettingRow>
      <SettingRow label="Terminal Backend" description="Where agent terminal tools execute"><Select value={settings.agentTerminalBackend} onChange={v => onUpdate({ agentTerminalBackend: v })} options={[
        { value: 'local', label: 'Local machine' },
        { value: 'docker', label: 'Docker container' },
        { value: 'remote', label: 'Remote sandbox' },
      ]} /></SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border/50 p-3 mt-2">
      <p className="text-xs text-jarvis-muted">These preferences are stored now and apply to the Hermes agent once the backend bridge lands.</p>
    </div>
  </div>)
}

// ── Integrations (Odysseus) ─────────────────────────────────────────────
function IntegrationsSection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  const od = settings.odysseusFeatures
  const updateFeature = (key: string, v: boolean) => onUpdate({ odysseusFeatures: { ...od, [key]: v } })
  return (<div><SectionHeader title="Integrations (Odysseus)" description="Built-in capabilities modeled on Odysseus's logic — the code lives inside Jarvis itself, nothing routes through a separate service." />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mb-4">
      <div className="text-sm font-medium text-jarvis-text">Feature switches</div>
      <SettingRow label="Documents" description="Read/create documents with Jarvis's own tooling (Odysseus-style)"><Toggle value={od.docs !== false} onChange={v => updateFeature('docs', v)} /></SettingRow>
      <SettingRow label="Email" description="IMAP/SMTP handling built in (Odysseus's logic, ported)"><Toggle value={od.email !== false} onChange={v => updateFeature('email', v)} /></SettingRow>
      <SettingRow label="Calendar" description="Calendar/CalDAV handling built in"><Toggle value={od.calendar !== false} onChange={v => updateFeature('calendar', v)} /></SettingRow>
      <SettingRow label="Notes"><Toggle value={od.notes !== false} onChange={v => updateFeature('notes', v)} /></SettingRow>
      <SettingRow label="Tasks"><Toggle value={od.tasks !== false} onChange={v => updateFeature('tasks', v)} /></SettingRow>
      <SettingRow label="Research"><Toggle value={od.research !== false} onChange={v => updateFeature('research', v)} /></SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border/50 p-3 mt-2">
      <p className="text-xs text-jarvis-muted">These features run inside Jarvis's backend (port 11711) using ported Odysseus logic — no separate service URL or API key is needed. The legacy connection fields below are kept only for future optional external deployments.</p>
    </div>
    <details className="mt-2 text-xs text-jarvis-muted">
      <summary className="cursor-pointer hover:text-jarvis-text">Advanced: external Odysseus service (optional)</summary>
      <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mt-2">
        <SettingRow label="Enable external service" description="Only if you run an external Odysseus deployment"><Toggle value={settings.odysseusEnabled} onChange={v => onUpdate({ odysseusEnabled: v })} /></SettingRow>
        <SettingRow label="Service URL" description="External Odysseus FastAPI endpoint (Docker :7011, native :7000)"><TextInput value={settings.odysseusUrl} onChange={v => onUpdate({ odysseusUrl: v })} className="w-full font-mono" /></SettingRow>
        <SettingRow label="API Key" description="Leave empty if the external instance needs no auth"><TextInput type="password" value={settings.odysseusApiKey} onChange={v => onUpdate({ odysseusApiKey: v })} placeholder="Optional" /></SettingRow>
      </div>
    </details>
  </div>)
}

// ── Tabs & Layout ────────────────────────────────────────────────────────
function TabsSection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  const [newTabName, setNewTabName] = useState('')
  const [newTabIcon, setNewTabIcon] = useState('')
  const [editingLayout, setEditingLayout] = useState<string | null>(null)

  const addTab = () => {
    if (!newTabName.trim()) return
    const id = newTabName.toLowerCase().replace(/\s+/g, '-')
    if (settings.tabs.some(t => t.id === id)) return
    onUpdate({ tabs: [...settings.tabs, { id, label: newTabName.trim(), icon: newTabIcon, closable: true }] })
    setNewTabName(''); setNewTabIcon('')
  }
  const removeTab = (id: string) => { onUpdate({ tabs: settings.tabs.filter(t => t.id !== id) }) }
  const moveTab = (from: number, to: number) => {
    const next = [...settings.tabs]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved)
    onUpdate({ tabs: next })
  }

  const WIDGET_OPTIONS = ['clock', 'weather', 'calendar', 'tasks', 'notes', 'system-stats', 'file-browser']
  const currentLayout = editingLayout ? (settings.pageLayouts[editingLayout]?.widgets || []) : []

  const sphereFor = (id: string) => settings.sphereTabs[id] !== false
  const toggleSphere = (id: string) => {
    onUpdate({ sphereTabs: { ...settings.sphereTabs, [id]: !sphereFor(id) } })
  }

  const toggleWidget = (widget: string) => {
    if (!editingLayout) return
    const current = settings.pageLayouts[editingLayout]?.widgets || []
    const next = current.includes(widget) ? current.filter(w => w !== widget) : [...current, widget]
    onUpdate({ pageLayouts: { ...settings.pageLayouts, [editingLayout]: { widgets: next } } })
  }

  return (<div><SectionHeader title="Tabs & Layout" description="Configure tabs and page layouts" />
    {/* Active tabs */}
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mb-4">
      <div className="text-sm font-medium text-jarvis-text mb-3">Active Tabs</div>
      <div className="space-y-2">
        {settings.tabs.map((tab, i) => (
          <div key={tab.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
            editingLayout === tab.id ? 'bg-jarvis-blue/10 border border-jarvis-blue/30' : 'bg-jarvis-bg/40 border border-transparent'
          }`}>
            <span className="text-lg w-8 text-center">{tab.icon || '—'}</span>
            <span className="text-sm text-jarvis-text flex-1">{tab.label}</span>
            <span className="text-xs text-jarvis-muted font-mono">{tab.id}</span>
            <button
              onClick={() => toggleSphere(tab.id)}
              className={`text-xs px-2 py-0.5 rounded transition-colors flex items-center gap-1.5 ${
                sphereFor(tab.id) ? 'text-jarvis-cyan bg-jarvis-cyan/10' : 'text-jarvis-muted hover:text-jarvis-text'}
              `}
              title="Toggle the animated sphere background on this tab"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sphereFor(tab.id) ? 'var(--tw-shadow-color, #00d4ff)' : 'rgba(255,255,255,0.15)' }} />
              Sphere {sphereFor(tab.id) ? 'on' : 'off'}
            </button>
            {i > 0 && <button onClick={() => moveTab(i, i - 1)} className="text-jarvis-muted hover:text-jarvis-text text-xs px-1" title="Move left">↑</button>}
            {i < settings.tabs.length - 1 && <button onClick={() => moveTab(i, i + 1)} className="text-jarvis-muted hover:text-jarvis-text text-xs px-1" title="Move right">↓</button>}
            {tab.id !== 'chat' && <button onClick={() => setEditingLayout(editingLayout === tab.id ? null : tab.id)} className={`text-xs px-2 py-0.5 rounded transition-colors ${editingLayout === tab.id ? 'text-jarvis-cyan bg-jarvis-cyan/10' : 'text-jarvis-muted hover:text-jarvis-text'}`}>Layout</button>}
            {tab.closable && <button onClick={() => removeTab(tab.id)} className="text-jarvis-muted hover:text-jarvis-error text-xs px-1" title="Remove">✕</button>}
          </div>
        ))}
      </div>
    </div>

    {/* Page layout editor */}
    {editingLayout && (<div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mb-4">
      <div className="text-sm font-medium text-jarvis-text mb-1">Layout: {settings.tabs.find(t => t.id === editingLayout)?.label}</div>
      <div className="text-xs text-jarvis-muted mb-3">Select widgets to display on this page. Chat is excluded.</div>
      <div className="grid grid-cols-2 gap-2">
        {WIDGET_OPTIONS.map(w => (
          <button key={w} onClick={() => toggleWidget(w)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
            currentLayout.includes(w) ? 'bg-jarvis-blue/15 text-jarvis-cyan border-jarvis-blue/30' : 'bg-jarvis-bg/30 text-jarvis-muted border-jarvis-border/50 hover:bg-jarvis-bg/50'
          }`}>
            <span className={`w-3 h-3 rounded border ${currentLayout.includes(w) ? 'bg-jarvis-cyan border-jarvis-cyan' : 'border-jarvis-border'}`} />
            {w.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
    </div>)}

    {/* Add new tab */}
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4">
      <div className="text-sm font-medium text-jarvis-text mb-3">Add Custom Tab</div>
      <div className="flex items-center gap-3">
        <input type="text" value={newTabIcon} onChange={e => setNewTabIcon(e.target.value)} placeholder="🎨" className="w-12 px-2 py-1.5 text-sm text-center bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text focus:border-jarvis-cyan/50 outline-none" maxLength={4} />
        <input type="text" value={newTabName} onChange={e => setNewTabName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTab()} placeholder="Tab name..." className="flex-1 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none" />
        <button onClick={addTab} disabled={!newTabName.trim()} className="px-4 py-1.5 text-sm font-medium bg-jarvis-blue text-white rounded-lg hover:bg-jarvis-blue/80 transition-colors disabled:opacity-40">Add</button>
      </div>
    </div>
  </div>)
}

// ── Voice ────────────────────────────────────────────────────────────────
function VoiceSection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  return (<div><SectionHeader title="Voice" description="Configure voice input and output" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1">
      <SettingRow label="Enable Voice"><Toggle value={settings.voiceEnabled} onChange={v => onUpdate({ voiceEnabled: v })} /></SettingRow>
      <SettingRow label="Wake Word"><TextInput value={settings.wakeWord} onChange={v => onUpdate({ wakeWord: v })} placeholder="Hey Jarvis" /></SettingRow>
      <SettingRow label="TTS Provider"><Select value={settings.ttsProvider} onChange={v => onUpdate({ ttsProvider: v })} options={[
        { value: 'edge', label: 'Edge TTS (Free)' }, { value: 'openai', label: 'OpenAI TTS' }, { value: 'elevenlabs', label: 'ElevenLabs' }, { value: 'local', label: 'Local (Piper)' },
      ]} /></SettingRow>
      <SettingRow label="STT Provider"><Select value={settings.sttProvider} onChange={v => onUpdate({ sttProvider: v })} options={[
        { value: 'local', label: 'Local (Whisper)' }, { value: 'openai', label: 'OpenAI Whisper' }, { value: 'google', label: 'Google STT' },
      ]} /></SettingRow>
    </div></div>)
}

// ── Appearance ───────────────────────────────────────────────────────────
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (<div className="flex items-center gap-2"><input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded-lg border border-jarvis-border cursor-pointer bg-transparent" /><span className="text-xs text-jarvis-muted font-mono">{value}</span></div>)
}

function AppearanceSection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  const SPHERE_STYLES = [
    { id: 'classic', label: 'Classic', desc: 'Wireframe lines, HUD rings, starfield' },
    { id: 'fluid', label: 'Fluid', desc: 'Organic blob, two-color gradient dots, no rings' },
    { id: 'geodesic', label: 'Geodesic', desc: 'Dense structured dome, brighter lines' },
    { id: 'swarm', label: 'Swarm', desc: 'Orbiting comet particles around the core' },
  ] as const
  return (<div><SectionHeader title="Appearance" description="Customize the look and feel" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mb-4">
      <div className="text-sm font-medium text-jarvis-text">Sphere</div>
      <SettingRow label="Style" description="Overall look of the animated sphere">
        <div className="flex flex-wrap gap-1.5">
          {SPHERE_STYLES.map(s => (
            <button key={s.id} title={s.desc}
              onClick={() => onUpdate({ sphereStyle: s.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                (settings.sphereStyle || 'classic') === s.id
                  ? 'bg-jarvis-cyan/20 border-jarvis-cyan/50 text-jarvis-cyan'
                  : 'bg-jarvis-surface/60 border-jarvis-border/50 text-jarvis-muted hover:text-jarvis-text hover:border-jarvis-cyan/30'}`}
            >{s.label}</button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Sphere Intensity" description="Breathing amplitude"><Slider value={settings.sphereIntensity} onChange={v => onUpdate({ sphereIntensity: v })} min={0} max={2} step={0.1} unit="x" /></SettingRow>
      <SettingRow label="Particle Count"><Slider value={settings.particleCount} onChange={v => onUpdate({ particleCount: Math.round(v / 100) * 100 })} min={500} max={10000} step={100} /></SettingRow>
      <SettingRow label="Rotation Speed" description="How fast the sphere spins"><Slider value={settings.sphereRotationSpeed} onChange={v => onUpdate({ sphereRotationSpeed: v })} min={0} max={3} step={0.1} unit="x" /></SettingRow>
      <SettingRow label="Pulse Speed" description="Breathing rhythm"><Slider value={settings.spherePulseSpeed} onChange={v => onUpdate({ spherePulseSpeed: v })} min={0} max={3} step={0.1} unit="x" /></SettingRow>
      <SettingRow label="Sphere Color" description="Wire size for Classic/Geodesic/Swarm"><ColorInput value={settings.glowColor} onChange={v => onUpdate({ glowColor: v })} /></SettingRow>
      {(settings.sphereStyle || 'classic') === 'fluid' && (<>
        <SettingRow label="Fluid Gradient — Dark" description="Color at one end of the blob"><ColorInput value={settings.fluidColorA || '#0a2540'} onChange={v => onUpdate({ fluidColorA: v })} /></SettingRow>
        <SettingRow label="Fluid Gradient — Light" description="Color at the other end"><ColorInput value={settings.fluidColorB || '#4a9eff'} onChange={v => onUpdate({ fluidColorB: v })} /></SettingRow>
      </>)}
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mb-4">
      <div className="text-sm font-medium text-jarvis-text">Background</div>
      <SettingRow label="Starfield" description="Distant particle field behind the sphere">
        <Toggle value={settings.showStarfield !== false} onChange={v => onUpdate({ showStarfield: v })} />
      </SettingRow>
      <SettingRow label="Starfield Color"><ColorInput value={settings.sphereBgColor} onChange={v => onUpdate({ sphereBgColor: v })} /></SettingRow>
      <SettingRow label="HUD Rings" description="Orbiting rings (Classic & Geodesic styles only)">
        <Toggle value={settings.showRings !== false} onChange={v => onUpdate({ showRings: v })} />
      </SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mb-4">
      <div className="text-sm font-medium text-jarvis-text">Widgets & Cards</div>
      <SettingRow label="Card Opacity" description="100% = fully opaque, easiest to read"><Slider value={settings.widgetOpacity} onChange={v => onUpdate({ widgetOpacity: v })} min={0.5} max={1} step={0.05} /></SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1">
      <div className="text-sm font-medium text-jarvis-text">Chat</div>
      <SettingRow label="Chat Height"><Slider value={settings.chatHeight} onChange={v => onUpdate({ chatHeight: v })} min={30} max={90} step={5} unit="vh" /></SettingRow>
    </div></div>)
}

// ── Memory ───────────────────────────────────────────────────────────────
function MemorySection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  return (<div><SectionHeader title="Memory" description="Edit Jarvis's personality and user information" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mb-4">
      <div className="text-sm font-medium text-jarvis-text mb-1">Personality</div>
      <div className="text-xs text-jarvis-muted mb-3">Define how Jarvis behaves and responds. This is injected into every conversation.</div>
      <TextArea value={settings.personality} onChange={v => onUpdate({ personality: v })} placeholder="You are Jarvis, a helpful AI assistant..." rows={6} />
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mb-4">
      <div className="text-sm font-medium text-jarvis-text mb-1">User Profile</div>
      <div className="text-xs text-jarvis-muted mb-3">Information about you — preferences, context, background. Helps Jarvis personalize responses.</div>
      <TextArea value={settings.userProfile} onChange={v => onUpdate({ userProfile: v })} placeholder="Your name, interests, preferred language..." rows={4} />
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4">
      <div className="text-sm font-medium text-jarvis-text mb-1">Vault Path</div>
      <div className="text-xs text-jarvis-muted mb-3">Optional path to an Obsidian vault for extended memory.</div>
      <TextInput value={settings.vaultPath} onChange={v => onUpdate({ vaultPath: v })} placeholder="C:\Users\...\ObsidianVault" className="w-full" />
    </div>
  </div>)
}

// ── Advanced ─────────────────────────────────────────────────────────────
function AdvancedSection({ settings, onUpdate, onReset }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void; onReset: () => void }) {
  const [showReset, setShowReset] = useState(false)
  const [trayEnabled, setTrayEnabled] = useState<boolean | null>(null)
  const [bootEnabled, setBootEnabled] = useState<boolean | null>(null)
  const api = window.electronAPI
  useEffect(() => {
    api?.getTrayEnabled?.().then((v: boolean) => setTrayEnabled(v)).catch(() => setTrayEnabled(false))
    api?.getBootEnabled?.().then((v: boolean) => setBootEnabled(v)).catch(() => setBootEnabled(false))
  }, [])
  return (<div><SectionHeader title="Advanced" description="Backend connection and system settings" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1 mb-4">
      <div className="text-sm font-medium text-jarvis-text">App Behavior</div>
      <SettingRow label="Minimize to System Tray" description="Closing the window keeps Jarvis running in the tray">
        <Toggle value={trayEnabled ?? false} onChange={v => { setTrayEnabled(v); api?.setTrayEnabled?.(v).then(() => api?.getTrayEnabled?.().then((real: boolean) => setTrayEnabled(real))) }} />
      </SettingRow>
      <SettingRow label="Start on System Boot" description="Launch Jarvis automatically when Windows starts (hidden in tray if tray is on)">
        <Toggle value={bootEnabled ?? false} onChange={v => { setBootEnabled(v); api?.setBootEnabled?.(v).then(() => api?.getBootEnabled?.().then((real: boolean) => setBootEnabled(real))) }} />
      </SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1">
      <SettingRow label="Backend URL"><TextInput value={settings.backendUrl} onChange={v => onUpdate({ backendUrl: v })} className="w-full" /></SettingRow>
      <SettingRow label="WebSocket URL"><TextInput value={settings.wsUrl} onChange={v => onUpdate({ wsUrl: v })} className="w-full" /></SettingRow>
      <SettingRow label="Streaming Speed"><Slider value={settings.streamingSpeed} onChange={v => onUpdate({ streamingSpeed: v })} min={10} max={200} step={10} unit="ms" /></SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border/50 p-4 mt-4">
      <div className="text-sm font-medium text-jarvis-text mb-2">Reset Settings</div>
      <p className="text-xs text-jarvis-muted mb-3">Restore all settings to defaults.</p>
      {showReset ? (<div className="flex items-center gap-3">
        <span className="text-sm text-jarvis-warning">Are you sure?</span>
        <button onClick={() => { onReset(); setShowReset(false) }} className="px-3 py-1 text-sm bg-jarvis-error/20 text-jarvis-error rounded-lg hover:bg-jarvis-error/30">Yes, reset</button>
        <button onClick={() => setShowReset(false)} className="px-3 py-1 text-sm text-jarvis-muted hover:text-jarvis-text">Cancel</button>
      </div>) : (
        <button onClick={() => setShowReset(true)} className="px-4 py-1.5 text-sm text-jarvis-error hover:bg-jarvis-error/10 rounded-lg border border-jarvis-error/30 transition-colors">Reset to Defaults</button>
      )}
    </div>
  </div>)
}

// ── MCP Servers ──────────────────────────────────────────────────────────
function MCPSection() {
  const STORAGE_KEY = 'jarvis-mark-iii-mcp'
  const [servers, setServers] = useState<{ id: string; name: string; command: string; args: string; env: string; url: string; headers: string; timeout: string; enabled: boolean }[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [name, setName] = useState('')
  const [command, setCommand] = useState('npx')
  const [args, setArgs] = useState('')
  const [env, setEnv] = useState('')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState('')
  const [timeout, setTimeoutSec] = useState('120')

  const save = (next: typeof servers) => { setServers(next); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {} }

  const add = () => {
    if (!name.trim()) return
    if (!command.trim() && !url.trim()) return
    save([...servers, { id: crypto.randomUUID(), name: name.trim(), command: command.trim(), args: args.trim(), env: env.trim(), url: url.trim(), headers: headers.trim(), timeout: timeout.trim(), enabled: true }])
    setName(''); setCommand('npx'); setArgs(''); setEnv(''); setUrl(''); setHeaders(''); setTimeoutSec('120')
  }

  const toggle = (id: string) => save(servers.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  const remove = (id: string) => save(servers.filter(s => s.id !== id))

  return (<div><SectionHeader title="MCP Servers" description="Connect external MCP servers — mirrors Hermes mcp_servers config" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1">
      {servers.length === 0 && <div className="text-sm text-jarvis-muted py-2">No MCP servers configured.</div>}
      {servers.map(s => (
        <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
          s.enabled ? 'bg-jarvis-blue/10 border-jarvis-blue/30' : 'bg-jarvis-bg/30 border-jarvis-border/50 opacity-60'
        }`}>
          <button onClick={() => toggle(s.id)} className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${s.enabled ? 'bg-jarvis-blue' : 'bg-jarvis-surface border border-jarvis-border'}`}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: s.enabled ? '22px' : '2px' }} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-jarvis-text font-medium truncate">{s.name}</div>
            <div className="text-xs text-jarvis-muted font-mono truncate">{s.url || `${s.command} ${s.args}`}</div>
          </div>
          <button onClick={() => remove(s.id)} className="text-jarvis-muted hover:text-jarvis-error text-xs px-1" title="Remove">✕</button>
        </div>
      ))}
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mt-4">
      <div className="text-sm font-medium text-jarvis-text mb-3">Add MCP Server</div>
      <div className="text-xs text-jarvis-muted mb-3">Stdio servers spawn a subprocess (command + args). HTTP servers connect to a URL. Fill one or the other.</div>
      <div className="space-y-3">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Server name (e.g. filesystem)" className="w-full px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none" />
        <div className="text-[10px] text-jarvis-muted uppercase tracking-wider font-semibold">Stdio (subprocess)</div>
        <div className="flex items-center gap-3">
          <input type="text" value={command} onChange={e => setCommand(e.target.value)} placeholder="Command (e.g. npx, uvx)" className="w-40 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
          <input type="text" value={args} onChange={e => setArgs(e.target.value)} placeholder="Args, space-separated (e.g. -y @modelcontextprotocol/server-filesystem)" className="flex-1 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
        </div>
        <input type="text" value={env} onChange={e => setEnv(e.target.value)} placeholder="Env vars — KEY=value, KEY2=value2" className="w-full px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
        <div className="text-[10px] text-jarvis-muted uppercase tracking-wider font-semibold">HTTP (URL)</div>
        <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (e.g. https://mcp.notion.com/mcp)" className="w-full px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
        <input type="text" value={headers} onChange={e => setHeaders(e.target.value)} placeholder="Headers — Key: value, Key2: value2 (for auth)" className="w-full px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
        <div className="flex items-center gap-3">
          <input type="text" value={timeout} onChange={e => setTimeoutSec(e.target.value)} placeholder="120" className="w-24 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
          <span className="text-xs text-jarvis-muted">timeout (seconds, default 120)</span>
        </div>
        <button onClick={add} disabled={!name.trim() || (!command.trim() && !url.trim())} className="px-4 py-1.5 text-sm font-medium bg-jarvis-blue text-white rounded-lg hover:bg-jarvis-blue/80 transition-colors disabled:opacity-40">Add Server</button>
      </div>
    </div>
  </div>)
}

// ── Webhooks ─────────────────────────────────────────────────────────────
function WebhooksSection() {
  const STORAGE_KEY = 'jarvis-mark-iii-webhooks'
  const [webhooks, setWebhooks] = useState<{ id: string; name: string; url: string; events: string; secret: string; enabled: boolean }[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('message')
  const [secret, setSecret] = useState('')

  const save = (next: typeof webhooks) => { setWebhooks(next); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {} }

  const add = () => {
    if (!name.trim() || !url.trim()) return
    save([...webhooks, { id: crypto.randomUUID(), name: name.trim(), url: url.trim(), events: events.trim(), secret: secret.trim(), enabled: true }])
    setName(''); setUrl(''); setEvents('message'); setSecret('')
  }

  const toggle = (id: string) => save(webhooks.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w))
  const remove = (id: string) => save(webhooks.filter(w => w.id !== id))

  return (<div><SectionHeader title="Webhooks" description="Configure webhook endpoints for event notifications" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1">
      {webhooks.length === 0 && <div className="text-sm text-jarvis-muted py-2">No webhooks configured.</div>}
      {webhooks.map(w => (
        <div key={w.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
          w.enabled ? 'bg-jarvis-blue/10 border-jarvis-blue/30' : 'bg-jarvis-bg/30 border-jarvis-border/50 opacity-60'
        }`}>
          <button onClick={() => toggle(w.id)} className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${w.enabled ? 'bg-jarvis-blue' : 'bg-jarvis-surface border border-jarvis-border'}`}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: w.enabled ? '22px' : '2px' }} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-jarvis-text font-medium truncate">{w.name}</div>
            <div className="text-xs text-jarvis-muted font-mono truncate">{w.url}</div>
            <div className="text-xs text-jarvis-muted">Events: {w.events}</div>
          </div>
          <button onClick={() => remove(w.id)} className="text-jarvis-muted hover:text-jarvis-error text-xs px-1" title="Remove">✕</button>
        </div>
      ))}
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mt-4">
      <div className="text-sm font-medium text-jarvis-text mb-3">Add Webhook</div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Webhook name" className="flex-1 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none" />
          <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/webhook" className="flex-1 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
        </div>
        <div className="flex items-center gap-3">
          <input type="text" value={events} onChange={e => setEvents(e.target.value)} placeholder="Events (message, error, task_complete)" className="flex-1 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
          <input type="text" value={secret} onChange={e => setSecret(e.target.value)} placeholder="HMAC secret (optional)" className="w-48 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none font-mono" />
        </div>
        <button onClick={add} disabled={!name.trim() || !url.trim()} className="px-4 py-1.5 text-sm font-medium bg-jarvis-blue text-white rounded-lg hover:bg-jarvis-blue/80 transition-colors disabled:opacity-40">Add Webhook</button>
      </div>
    </div>
  </div>)
}

// ── Notifications ────────────────────────────────────────────────────────
function NotificationsSection({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  const n = settings.notifications
  const update = (partial: Partial<typeof n>) => onUpdate({ notifications: { ...n, ...partial } })

  return (<div><SectionHeader title="Notifications" description="Configure desktop and in-app notification preferences" />
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 space-y-1">
      <SettingRow label="Desktop Notifications" description="Show OS-level notifications"><Toggle value={n.desktopEnabled} onChange={v => update({ desktopEnabled: v })} /></SettingRow>
      <SettingRow label="Sound" description="Play a sound on notifications"><Toggle value={n.soundEnabled} onChange={v => update({ soundEnabled: v })} /></SettingRow>
    </div>
    <div className="bg-jarvis-surface/50 rounded-xl border border-jarvis-border p-4 mt-4 space-y-1">
      <div className="text-sm font-medium text-jarvis-text mb-1">Event Triggers</div>
      <SettingRow label="Message" description="Notify on new messages"><Toggle value={n.onMessage} onChange={v => update({ onMessage: v })} /></SettingRow>
      <SettingRow label="Error" description="Notify on errors"><Toggle value={n.onError} onChange={v => update({ onError: v })} /></SettingRow>
      <SettingRow label="Task Complete" description="Notify when tasks finish"><Toggle value={n.onTaskComplete} onChange={v => update({ onTaskComplete: v })} /></SettingRow>
      <SettingRow label="Cron" description="Notify on scheduled job events"><Toggle value={n.onCron} onChange={v => update({ onCron: v })} /></SettingRow>
    </div>
  </div>)
}
