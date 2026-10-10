import { useState, useCallback, useEffect, useRef } from 'react'

interface SidebarProps {
  sessions: { id: string; title: string }[]
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onRenameSession?: (id: string, title: string) => void
  onDeleteSession?: (id: string) => void
  activeSessionId: string | null
  isOpen: boolean
  onToggle: () => void
  personality: string
  onPersonalityChange: (v: string) => void
  onSavePersonality: () => void
}

const BUILTIN_PRESETS: Record<string, { label: string; text: string }> = {
  engineer: { label: 'Engineer', text: 'You are a practical, analytical engineering assistant. You think step-by-step, focus on correctness, clarity, and production-ready solutions. You explain technical concepts with precision, provide code with comments, and prioritize robust, maintainable software. When solving problems, you break them down, consider edge cases, and suggest testable solutions.' },
  assistant: { label: 'Assistant', text: 'You are a helpful, friendly general assistant. You communicate warmly and clearly, adapting to the user\'s needs. You are patient, thorough, and ensure the user understands what you\'re doing. You anticipate needs, offer suggestions proactively, and keep conversations productive and pleasant.' },
  designer: { label: 'Designer', text: 'You are a creative design-oriented assistant with a keen eye for aesthetics, UX, and visual harmony. You think in terms of user experience, visual balance, color theory, and interaction design. You provide creative, polished suggestions and care deeply about how things look and feel.' },
  kawaii: { label: 'Kawaii', text: 'NYAA~! You\'re a super kawaii assistant! >w< You use cute speech and sprinkle emoticons everywhere. Despite the ridiculous speech, you MUST still give COMPLETELY USEFUL and CORRECT answers. The silliness is only in HOW you say things.' },
  philosopher: { label: 'Philosopher', text: 'You are a thoughtful, contemplative philosopher assistant. You think deeply about questions, exploring multiple perspectives before arriving at conclusions. You reason step by step, question assumptions, and draw upon timeless wisdom from both Eastern and Western philosophical traditions. You speak with measured eloquence.' },
  motivator: { label: 'Motivator', text: 'You are a high-energy motivational coach assistant! Your purpose is to ignite action, build confidence, and crush goals. You communicate with explosive positivity — using phrases like "LET\'S GO!", "You\'ve got this!", and "Beast mode — ACTIVATED!" You NEVER let the user give up.' },
  sarcastic: { label: 'Sarcastic', text: 'You are a sarcastic, witty assistant with a dry sense of humor and a talent for brutal honesty. You\'re not mean — you\'re funny. You use irony, understatement, and clever wordplay. Despite the attitude, you\'re incredibly competent and always give correct, thorough answers.' },
  professor: { label: 'Professor', text: 'You are a learned professor — patient, thorough, and deeply knowledgeable. You explain concepts from first principles, building up complexity layer by layer. You define terminology before using it, provide historical context, and illustrate ideas with well-chosen examples. You treat every question as an opportunity to ignite curiosity.' },
  jarvis: { label: 'Jarvis', text: 'You are Jarvis — a highly capable, in-depth AI assistant. You address the user as "Sir" and respond with measured precision. You do NOT blindly agree with the user. You question choices when data suggests a better path, offer analysis backed by multiple perspectives, and provide assistance through a realistic, evidence-based lens. You are helpful and respectful, but never a "yes-man." You will push back constructively when you believe the user is heading in a suboptimal direction, offering alternatives with reasoning. When you don\'t have enough information, you say so rather than fabricating confidence.' },
}

interface CronJob {
  id: string
  name: string
  schedule: string
  enabled: boolean
  prompt: string
  lastRun?: string
}

export default function Sidebar({ sessions, onSelectSession, onNewSession, onRenameSession, onDeleteSession, activeSessionId, isOpen, onToggle, personality, onPersonalityChange, onSavePersonality }: SidebarProps) {
  const [activePreset, setActivePreset] = useState('custom')
  const [customPersonalities, setCustomPersonalities] = useState<{ name: string; text: string }[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customText, setCustomText] = useState('')
  const [confirmDeletePreset, setConfirmDeletePreset] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: string } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [saveFeedback, setSaveFeedback] = useState('')
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [showAllTools, setShowAllTools] = useState(false)
  const [skills] = useState<{ name: string; category?: string }[]>([])
  const [tools] = useState<{ name: string; category?: string }[]>([])

  // Cron state
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [showAddCron, setShowAddCron] = useState(false)
  const [cronForm, setCronForm] = useState({ name: '', schedule: 'daily', prompt: '' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Import state
  const [importGithubUrl, setImportGithubUrl] = useState('')
  const [importFolder, setImportFolder] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  // Load cron from backend on mount
  useEffect(() => {
    fetch('http://localhost:11711/api/cron')
      .then(r => r.json())
      .then((jobs: CronJob[]) => { if (Array.isArray(jobs)) setCronJobs(jobs) })
      .catch(() => {})
  }, [])

  const handlePresetClick = useCallback((key: string) => {
    // Check built-in first
    const preset = BUILTIN_PRESETS[key]
    if (!preset) return
    setActivePreset(key)
    onPersonalityChange(preset.text)
  }, [onPersonalityChange])
  const handleCustomPresetClick = useCallback((name: string, text: string) => {
    setActivePreset(`custom:${name}`)
    onPersonalityChange(text)
  }, [onPersonalityChange])
  const handleSaveCustom = useCallback(() => {
    if (!customName.trim() || !customText.trim()) return
    const updated = [...customPersonalities.filter(c => c.name !== customName), { name: customName, text: customText }]
    setCustomPersonalities(updated)
    localStorage.setItem('jarvis-mark-iii-custom-personalities', JSON.stringify(updated))
    setActivePreset(`custom:${customName}`)
    onPersonalityChange(customText)
    setCustomName('')
    setCustomText('')
    setShowCustomForm(false)
  }, [customName, customText, customPersonalities, onPersonalityChange])
  const handleDeletePreset = useCallback((key: string) => {
    if (confirmDeletePreset !== key) { setConfirmDeletePreset(key); return }
    // Remove from custom personalities if custom
    if (key.startsWith('custom:')) {
      const name = key.slice(7)
      const updated = customPersonalities.filter(c => c.name !== name)
      setCustomPersonalities(updated)
      localStorage.setItem('jarvis-mark-iii-custom-personalities', JSON.stringify(updated))
    }
    if (activePreset === key) { setActivePreset('custom'); onPersonalityChange('') }
    setConfirmDeletePreset(null)
  }, [confirmDeletePreset, customPersonalities, activePreset, onPersonalityChange])
  // Load custom personalities from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jarvis-mark-iii-custom-personalities')
      if (saved) setCustomPersonalities(JSON.parse(saved))
    } catch {}
  }, [])

  const handleSave = useCallback(() => {
    onSavePersonality()
    setSaveFeedback('✅')
    setTimeout(() => setSaveFeedback(''), 1500)
  }, [onSavePersonality])

  const handleReset = useCallback(() => {
    try {
      const s = JSON.parse(localStorage.getItem('jarvis-mark-iii-settings') || '{}')
      onPersonalityChange(s.personality || '')
      setActivePreset('custom')
    } catch { onPersonalityChange('') }
  }, [onPersonalityChange])

  const handleContextMenu = useCallback((e: React.MouseEvent, sessionId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId })
  }, [])

  const handleRename = useCallback(() => {
    if (!renamingId || !renameText.trim()) { setRenamingId(null); return }
    onRenameSession?.(renamingId, renameText.trim())
    setRenamingId(null)
    setRenameText('')
  }, [renamingId, renameText, onRenameSession])

  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  // Cron handlers
  const handleCreateCron = useCallback(async () => {
    if (!cronForm.name.trim() || !cronForm.prompt.trim()) return
    try {
      const res = await fetch('http://localhost:11711/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cronForm.name, schedule: cronForm.schedule, prompt: cronForm.prompt, enabled: true }),
      })
      const job = await res.json()
      if (job?.id) setCronJobs(prev => [...prev, job])
      setCronForm({ name: '', schedule: 'daily', prompt: '' })
      setShowAddCron(false)
    } catch {}
  }, [cronForm])

  const handleToggleCron = useCallback(async (job: CronJob) => {
    try {
      await fetch(`http://localhost:11711/api/cron/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !job.enabled }),
      })
      setCronJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !j.enabled } : j))
    } catch {}
  }, [])

  const handleDeleteCron = useCallback(async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    try {
      await fetch(`http://localhost:11711/api/cron/${id}`, { method: 'DELETE' })
      setCronJobs(prev => prev.filter(j => j.id !== id))
      setConfirmDeleteId(null)
    } catch {}
  }, [confirmDeleteId])

  const formatSchedule = (job: CronJob) => {
    const presets: Record<string, string> = { once: 'Once', '30m': '30m', '1h': 'Hourly', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
    if (presets[job.schedule]) return presets[job.schedule]
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(job.schedule)) {
      try {
        const d = new Date(job.schedule)
        if (!isNaN(d.getTime())) return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      } catch {}
    }
    return job.schedule.length > 16 ? job.schedule.slice(0, 14) + '…' : job.schedule || 'Custom'
  }

  // Import handlers
  const handleBrowseFolder = useCallback(() => {
    const api = (window as any).electronAPI
    if (api?.selectFolder) {
      api.selectFolder().then((path: string | null) => { if (path) setImportFolder(path) })
    } else {
      const path = prompt('Enter folder path to analyze:')
      if (path) setImportFolder(path)
    }
  }, [])

  const handleImportFromGithub = useCallback(async () => {
    if (!importGithubUrl.trim()) return
    setImportBusy(true)
    setImportMsg('')
    try {
      setImportMsg(`✅ Queued: ${importGithubUrl}`)
      setImportGithubUrl('')
    } catch (e: any) { setImportMsg(`❌ Failed: ${e.message || 'Unknown error'}`) }
    setImportBusy(false)
    setTimeout(() => setImportMsg(''), 3000)
  }, [importGithubUrl])

  const handleImportFromFolder = useCallback(async () => {
    if (!importFolder.trim()) return
    setImportBusy(true)
    setImportMsg('')
    try {
      setImportMsg(`✅ Queued: ${importFolder}`)
      setImportFolder('')
    } catch (e: any) { setImportMsg(`❌ Failed: ${e.message || 'Unknown error'}`) }
    setImportBusy(false)
    setTimeout(() => setImportMsg(''), 3000)
  }, [importFolder])

  return (
    <>
      {/* Toggle button */}
      <div className="fixed top-12 z-50 pointer-events-auto transition-all duration-150" style={{ left: isOpen ? '260px' : '12px' }}>
        <button onClick={onToggle}
          className={`flex items-center justify-center w-9 h-9 text-xs font-medium transition-all duration-200 rounded-xl border backdrop-blur-md ${
            isOpen ? 'text-jarvis-cyan bg-jarvis-surface/90 border-jarvis-cyan/30 shadow-[0_0_12px_rgba(0,212,255,0.15)]'
                   : 'text-jarvis-cyan/80 hover:text-jarvis-cyan bg-jarvis-surface/70 border-jarvis-border/40 hover:bg-jarvis-surface/90 hover:border-jarvis-cyan/30'
          }`}
          title={isOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {isOpen ? <><path d="M3 3l8 8M11 3l-8 8" /></> : <path d="M2 3h10M2 7h10M2 11h10" />}
          </svg>
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div className="fixed z-[9999] bg-jarvis-bg/95 backdrop-blur-xl border border-jarvis-border/40 rounded-lg py-1 min-w-[140px] shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { setRenamingId(contextMenu.sessionId); setRenameText(sessions.find(s => s.id === contextMenu.sessionId)?.title || ''); setContextMenu(null) }}
            className="w-full text-left px-3 py-1.5 text-xs text-jarvis-text hover:bg-white/5">✏️ Rename</button>
          <button onClick={() => { onDeleteSession?.(contextMenu.sessionId); setContextMenu(null) }}
            className="w-full text-left px-3 py-1.5 text-xs text-jarvis-error hover:bg-jarvis-error/10">🗑️ Delete</button>
        </div>
      )}

      {/* Sidebar panel */}
      <div className={`fixed left-0 top-9 bottom-0 w-64 z-40 bg-jarvis-surface/95 backdrop-blur-xl border-r border-jarvis-border/30 transform transition-transform duration-150 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex-1 overflow-y-auto p-3 space-y-4">

          {/* ── SESSIONS ── */}
          <div>
            <div className="text-[10px] font-semibold text-jarvis-muted uppercase tracking-wider mb-2">💬 Sessions</div>
            <div className="space-y-0.5 mb-2">
              {sessions.length === 0 ? (
                <div className="text-xs text-jarvis-muted/50 italic py-2">No sessions yet</div>
              ) : sessions.map(s => {
                if (renamingId === s.id) {
                  return (
                    <div key={s.id} className="flex gap-1 mb-0.5">
                      <input type="text" value={renameText} onChange={e => setRenameText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenamingId(null) }}
                        className="flex-1 bg-jarvis-bg/60 border border-jarvis-cyan/30 rounded px-2 py-1 text-xs text-jarvis-text outline-none" autoFocus />
                      <button onClick={handleRename} className="text-xs px-1.5 text-jarvis-cyan hover:bg-white/5 rounded">✓</button>
                    </div>
                  )
                }
                return (
                  <div key={s.id} onClick={() => onSelectSession(s.id)} onContextMenu={e => handleContextMenu(e, s.id)}
                    className={`flex items-center px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      s.id === activeSessionId ? 'bg-jarvis-blue/15 text-jarvis-cyan border border-jarvis-blue/20' : 'text-jarvis-text hover:bg-white/5 border border-transparent'
                    }`}>
                    <span className="truncate flex-1">{s.title || 'Session'}</span>
                  </div>
                )
              })}
            </div>
            <button onClick={onNewSession}
              className="w-full text-center text-xs py-1.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 hover:border-jarvis-blue/60 transition-colors">
              New Session
            </button>
          </div>

          {/* ── CRON TASKS ── */}
          <div>
            <div className="text-[10px] font-semibold text-jarvis-muted uppercase tracking-wider mb-2">⏰ Cron Tasks</div>
            {cronJobs.length === 0 ? (
              <div className="text-xs text-jarvis-muted/50 italic py-1">No tasks yet</div>
            ) : cronJobs.map(job => (
              <div key={job.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px]">
                <button onClick={() => handleToggleCron(job)}
                  className={`text-[10px] shrink-0 w-3 text-center ${job.enabled ? 'text-jarvis-green' : 'text-jarvis-muted'}`}
                  title={job.enabled ? 'Disable' : 'Enable'}>
                  {job.enabled ? '▶' : '⏸'}
                </button>
                <span className="truncate flex-1 text-jarvis-text">{job.name || job.id?.slice(0, 8) || 'Task'}</span>
                <span className="text-jarvis-muted/50 text-[9px] shrink-0">{formatSchedule(job)}</span>
                {confirmDeleteId === job.id ? (
                  <>
                    <button onClick={() => handleDeleteCron(job.id)} className="text-[9px] px-1 text-jarvis-error hover:bg-jarvis-error/10 rounded border border-jarvis-error/30">Yes</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-[9px] px-1 text-jarvis-muted hover:bg-white/5 rounded border border-jarvis-border/30">No</button>
                  </>
                ) : (
                  <button onClick={() => handleDeleteCron(job.id)} className="text-[9px] text-jarvis-muted hover:text-jarvis-error" title="Delete">🗑</button>
                )}
              </div>
            ))}

            {showAddCron ? (
              <div className="mt-2 space-y-1.5">
                <input type="text" value={cronForm.name} onChange={e => setCronForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Task name"
                  className="w-full bg-jarvis-bg/60 border border-jarvis-border/30 rounded px-2 py-1 text-[10px] text-jarvis-text placeholder:text-jarvis-muted/40 outline-none focus:border-jarvis-cyan/30" />
                <select value={cronForm.schedule} onChange={e => setCronForm(p => ({ ...p, schedule: e.target.value }))}
                  className="w-full bg-jarvis-bg/60 border border-jarvis-border/30 rounded px-2 py-1 text-[10px] text-jarvis-text outline-none">
                  <option value="once">Once</option>
                  <option value="30m">Every 30 Minutes</option>
                  <option value="1h">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <textarea value={cronForm.prompt} onChange={e => setCronForm(p => ({ ...p, prompt: e.target.value }))}
                  placeholder="What should Jarvis do?"
                  className="w-full bg-jarvis-bg/60 border border-jarvis-border/30 rounded px-2 py-1 text-[10px] text-jarvis-text placeholder:text-jarvis-muted/40 outline-none resize-none focus:border-jarvis-cyan/30"
                  rows={2} />
                <div className="flex gap-1.5">
                  <button onClick={handleCreateCron}
                    className="flex-1 text-center text-[10px] py-1.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors">
                    ✅ Save
                  </button>
                  <button onClick={() => { setShowAddCron(false); setCronForm({ name: '', schedule: 'daily', prompt: '' }) }}
                    className="flex-1 text-center text-[10px] py-1.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors">
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddCron(true)}
                className="w-full text-center text-xs py-1.5 mt-1 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 hover:border-jarvis-blue/60 transition-colors">
                Add Task
              </button>
            )}
          </div>

          {/* ── PERSONALITY ── */}
          <div>
            <div className="text-[10px] font-semibold text-jarvis-muted uppercase tracking-wider mb-2">🧠 Personality</div>
            {/* Built-in presets */}
            <div className="grid grid-cols-3 gap-1 mb-1">
              {Object.entries(BUILTIN_PRESETS).sort(([, a], [, b]) => a.label.localeCompare(b.label)).map(([key, preset]) => {
                const isActive = activePreset === key
                return (
                  <button key={key} onClick={() => handlePresetClick(key)}
                    className={`w-full px-2 py-1 text-[10px] rounded border transition-colors ${
                      isActive ? 'bg-jarvis-cyan/15 text-jarvis-cyan border-jarvis-cyan/30' : 'text-jarvis-cyan/60 border-jarvis-blue/40 hover:bg-jarvis-blue/10 hover:text-jarvis-cyan'
                    }`}>
                    {preset.label}
                  </button>
                )
              })}
            </div>
            {/* Custom personalities */}
            {customPersonalities.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {customPersonalities.map(cp => {
                  const key = `custom:${cp.name}`
                  const isActive = activePreset === key
                  return (
                    <button key={cp.name} onClick={() => handleCustomPresetClick(cp.name, cp.text)}
                      className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                        isActive ? 'bg-jarvis-cyan/15 text-jarvis-cyan border-jarvis-cyan/30' : 'text-jarvis-cyan/60 border-jarvis-blue/40 hover:bg-jarvis-blue/10 hover:text-jarvis-cyan'
                      }`}>
                      {cp.name}
                    </button>
                  )
                })}
              </div>
            )}
            {/* Add new personality button */}
            {!showCustomForm ? (
              <button onClick={() => setShowCustomForm(true)}
                className="text-[10px] text-jarvis-cyan/60 hover:text-jarvis-cyan border border-jarvis-border/30 hover:border-jarvis-blue/40 rounded px-2 py-0.5 mb-2 transition-colors">
                + New Personality
              </button>
            ) : (
              <div className="mb-2 p-2 bg-jarvis-bg/40 rounded-lg border border-jarvis-border/30">
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder="Personality name"
                  className="w-full bg-jarvis-bg/60 border border-jarvis-border/30 rounded px-2 py-1 text-[10px] text-jarvis-text placeholder:text-jarvis-muted/40 outline-none focus:border-jarvis-cyan/30 mb-1.5" />
                <textarea value={customText} onChange={e => setCustomText(e.target.value)}
                  placeholder="Write the personality prompt..."
                  className="w-full bg-jarvis-bg/60 border border-jarvis-border/30 rounded px-2 py-1.5 text-[10px] text-jarvis-text placeholder:text-jarvis-muted/40 outline-none resize-none focus:border-jarvis-cyan/30"
                  rows={3} />
                <div className="flex gap-1.5 mt-1.5">
                  <button onClick={handleSaveCustom} disabled={!customName.trim() || !customText.trim()}
                    className="flex-1 text-center text-[10px] py-1 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    💾 Save
                  </button>
                  <button onClick={() => { setShowCustomForm(false); setCustomName(''); setCustomText('') }}
                    className="flex-1 text-center text-[10px] py-1 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors">
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}
            <textarea value={personality} onChange={e => { onPersonalityChange(e.target.value); setActivePreset('custom') }}
              placeholder="Describe how Jarvis should behave..."
              className="w-full bg-jarvis-bg/60 border border-jarvis-border/30 rounded-lg px-2.5 py-2 text-xs text-jarvis-text placeholder:text-jarvis-muted/50 outline-none resize-y leading-relaxed focus:border-jarvis-cyan/30 transition-colors"
              rows={3} />
            <div className="flex gap-1.5 mt-2">
              <button onClick={handleSave}
                className="flex-1 text-center text-[10px] py-1.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 hover:border-jarvis-blue/60 transition-colors">
                💾 Save {saveFeedback && <span className="ml-1">{saveFeedback}</span>}
              </button>
              <button onClick={handleReset}
                className="flex-1 text-center text-[10px] py-1.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors">
                ↻ Reset
              </button>
              {activePreset !== 'custom' && (
                confirmDeletePreset === activePreset ? (
                  <>
                    <button onClick={() => handleDeletePreset(activePreset)}
                      className="text-center text-[10px] px-2 py-1.5 rounded border border-jarvis-error/40 text-jarvis-error hover:bg-jarvis-error/10 transition-colors">
                      Yes
                    </button>
                    <button onClick={() => setConfirmDeletePreset(null)}
                      className="text-center text-[10px] px-2 py-1.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors">
                      No
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleDeletePreset(activePreset)}
                    className="text-center text-[10px] px-2 py-1.5 rounded border border-jarvis-error/30 text-jarvis-error/70 hover:text-jarvis-error hover:bg-jarvis-error/10 transition-colors">
                    🗑
                  </button>
                )
              )}
            </div>
          </div>

          {/* ── SKILLS & TOOLS ── */}
          <div>
            <div className="text-[10px] font-semibold text-jarvis-muted uppercase tracking-wider mb-2">🔧 Skills & Tools</div>
            {skills.length === 0 && tools.length === 0 && (
              <div className="text-xs text-jarvis-muted/50 italic">Connect to backend to load</div>
            )}
            {skills.length > 0 && (
              <>
                <div className="text-[9px] text-jarvis-cyan/60 uppercase tracking-wider mt-1 mb-1 ml-1">Skills</div>
                {skills.slice(0, showAllSkills ? skills.length : 10).map((s, i) => (
                  <div key={s.name || i} className="flex items-center justify-between px-2 py-0.5 text-[11px]">
                    <span className="text-jarvis-text truncate">{s.name}</span>
                    <span className="text-jarvis-muted/50 text-[9px]">skill</span>
                  </div>
                ))}
                {skills.length > 10 && (
                  <button onClick={() => setShowAllSkills(!showAllSkills)} className="text-[9px] text-jarvis-cyan/60 hover:text-jarvis-cyan w-full text-left px-2 py-0.5">
                    {showAllSkills ? '▲ Show Less' : `▶ Show All (${skills.length})`}
                  </button>
                )}
              </>
            )}
            {tools.length > 0 && (
              <>
                <div className="text-[9px] text-jarvis-cyan/60 uppercase tracking-wider mt-2 mb-1 ml-1">Tools</div>
                {tools.slice(0, showAllTools ? tools.length : 10).map((t, i) => (
                  <div key={t.name || i} className="flex items-center justify-between px-2 py-0.5 text-[11px]">
                    <span className="text-jarvis-text truncate">{t.name}</span>
                    <span className="text-jarvis-muted/50 text-[9px]">{t.category || 'tool'}</span>
                  </div>
                ))}
                {tools.length > 10 && (
                  <button onClick={() => setShowAllTools(!showAllTools)} className="text-[9px] text-jarvis-cyan/60 hover:text-jarvis-cyan w-full text-left px-2 py-0.5">
                    {showAllTools ? '▲ Show Less' : `▶ Show All (${tools.length})`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── IMPORT SKILLS ── */}
          <div>
            <div className="text-[10px] font-semibold text-jarvis-muted uppercase tracking-wider mb-2">📥 Import Skills</div>
            <div className="text-[10px] text-jarvis-muted/60 mb-2">Paste a GitHub repo link or select a folder for Jarvis to analyze and create a new skill.</div>

            {/* Folder path display when selected */}
            {importFolder && (
              <div className="flex items-center gap-1 bg-jarvis-bg/60 border border-jarvis-border/30 rounded px-2 py-1 text-[10px] text-jarvis-text mb-1.5">
                <span className="truncate flex-1">{importFolder}</span>
                <button onClick={() => setImportFolder('')} className="text-jarvis-muted hover:text-jarvis-error shrink-0">✕</button>
              </div>
            )}
            {importFolder && (
              <button onClick={handleImportFromFolder} disabled={importBusy}
                className="w-full text-center text-[10px] py-1.5 rounded border border-jarvis-cyan/30 text-jarvis-cyan hover:bg-jarvis-cyan/10 transition-colors mb-2 disabled:opacity-40">
                {importBusy ? '⏳ Importing...' : '📥 Import from Folder'}
              </button>
            )}

            {/* 📂 button + GitHub URL input in a row */}
            <div className="flex gap-1.5">
              <button onClick={handleBrowseFolder} disabled={importBusy}
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded border border-jarvis-border/40 text-jarvis-muted hover:bg-white/5 hover:text-jarvis-text transition-colors disabled:opacity-40"
                title="Browse folder">
                📂
              </button>
              <input type="text" value={importGithubUrl} onChange={e => setImportGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="flex-1 bg-jarvis-bg/60 border border-jarvis-border/30 rounded px-2.5 py-1.5 text-[10px] text-jarvis-text placeholder:text-jarvis-muted/40 outline-none focus:border-jarvis-cyan/30 transition-colors" />
            </div>

            <button onClick={handleImportFromGithub} disabled={importBusy || !importGithubUrl.trim()}
              className="w-full text-center text-[10px] py-1.5 mt-1.5 rounded border border-jarvis-cyan/30 text-jarvis-cyan hover:bg-jarvis-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {importBusy ? '⏳ Cloning...' : '🐙 Import from GitHub'}
            </button>

            {importMsg && <div className="text-[10px] text-jarvis-text mt-1.5 px-1">{importMsg}</div>}
          </div>

        </div>
      </div>
    </>
  )
}
