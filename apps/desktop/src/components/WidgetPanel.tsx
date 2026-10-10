import { useState, useEffect } from 'react'

interface WidgetPanelProps {
  widgets: string[]
  widgetOpacity?: number
  onFileOpen?: (filePath: string, fileName: string) => void
}

// ── Individual widgets ─────────────────────────────────────────────────

function ClockWidget() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const s = now.getSeconds().toString().padStart(2, '0')
  const date = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="font-mono text-4xl text-jarvis-cyan tabular-nums tracking-wide">{h}:{m}:<span className="text-jarvis-muted">{s}</span></div>
      <div className="text-xs text-jarvis-muted mt-2">{date}</div>
    </div>
  )
}

function NotesWidget() {
  const [text, setText] = useState(() => {
    try { return localStorage.getItem('jarvis-widget-notes') || '' } catch { return '' }
  })
  const save = (v: string) => {
    setText(v)
    try { localStorage.setItem('jarvis-widget-notes', v) } catch {}
  }
  return (
    <div className="flex flex-col h-full">
      <textarea
        value={text}
        onChange={e => save(e.target.value)}
        placeholder="Write notes here... (auto-saved)"
        className="flex-1 w-full bg-transparent resize-none outline-none text-sm text-jarvis-text placeholder:text-jarvis-muted/50 p-4 leading-relaxed"
      />
    </div>
  )
}

function TasksWidget() {
  const [tasks, setTasks] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('jarvis-widget-tasks') || '[]') } catch { return [] }
  })
  const [done, setDone] = useState<boolean[]>(() => {
    try { return JSON.parse(localStorage.getItem('jarvis-widget-tasks-done') || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')

  const addTask = () => {
    if (!input.trim()) return
    setTasks([...tasks, input.trim()])
    setDone([...done, false])
    setInput('')
    try {
      localStorage.setItem('jarvis-widget-tasks', JSON.stringify([...tasks, input.trim()]))
      localStorage.setItem('jarvis-widget-tasks-done', JSON.stringify([...done, false]))
    } catch {}
  }
  const toggleTask = (i: number) => {
    const nd = [...done]; nd[i] = !nd[i]
    setDone(nd)
    try { localStorage.setItem('jarvis-widget-tasks-done', JSON.stringify(nd)) } catch {}
  }
  const removeTask = (i: number) => {
    const nt = tasks.filter((_, idx) => idx !== i)
    const nd = done.filter((_, idx) => idx !== i)
    setTasks(nt); setDone(nd)
    try {
      localStorage.setItem('jarvis-widget-tasks', JSON.stringify(nt))
      localStorage.setItem('jarvis-widget-tasks-done', JSON.stringify(nd))
    } catch {}
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="text-xs font-semibold text-jarvis-muted uppercase tracking-wider mb-3">Tasks</div>
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task..."
          className="flex-1 px-3 py-1.5 text-sm bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text placeholder:text-jarvis-muted focus:border-jarvis-cyan/50 outline-none"
        />
        <button onClick={addTask} className="px-3 py-1.5 text-sm bg-jarvis-blue/20 text-jarvis-cyan rounded-lg hover:bg-jarvis-blue/30 border border-jarvis-blue/20 transition-colors">Add</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {tasks.length === 0 && <div className="text-xs text-jarvis-muted/50 italic">No tasks yet.</div>}
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-jarvis-bg/40 border border-jarvis-border/50 group">
            <button onClick={() => toggleTask(i)} className={`w-4 h-4 rounded border flex items-center justify-center text-[9px] shrink-0 transition-colors ${done[i] ? 'bg-jarvis-cyan border-jarvis-cyan text-jarvis-bg' : 'border-jarvis-border hover:border-jarvis-cyan/50'}`}>
              {done[i] ? '✓' : ''}
            </button>
            <span className={`flex-1 text-sm truncate ${done[i] ? 'line-through text-jarvis-muted' : 'text-jarvis-text'}`}>{t}</span>
            <button onClick={() => removeTask(i)} className="text-jarvis-muted hover:text-jarvis-error text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeatherWidget() {
  const [city, setCity] = useState(() => {
    try { return localStorage.getItem('jarvis-widget-city') || 'New York' } catch { return 'New York' }
  })
  const [temp, setTemp] = useState<number | null>(null)
  const [condition, setCondition] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const cur = data.current_condition?.[0]
        if (cur) {
          setTemp(parseInt(cur.temp_C, 10))
          setCondition(cur.weatherDesc?.[0]?.value || '')
        }
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [city])

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="text-xs text-jarvis-muted mb-1">Weather</div>
      <input
        value={city}
        onChange={e => {
          setCity(e.target.value)
          try { localStorage.setItem('jarvis-widget-city', e.target.value) } catch {}
        }}
        placeholder="City"
        className="w-40 text-center px-2 py-1 text-xs bg-jarvis-bg/60 border border-jarvis-border rounded-lg text-jarvis-text outline-none focus:border-jarvis-cyan/50 mb-2"
      />
      {temp !== null && (
        <div className="text-3xl font-mono text-jarvis-cyan">{temp}°C</div>
      )}
      {condition && <div className="text-sm text-jarvis-muted mt-1">{condition}</div>}
    </div>
  )
}

function CalendarWidget() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="p-4">
      <div className="text-xs font-semibold text-jarvis-muted uppercase tracking-wider mb-3">{monthName}</div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[9px] text-jarvis-muted/50 py-1">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className={`text-xs py-1.5 rounded ${d === today.getDate() ? 'bg-jarvis-cyan/20 text-jarvis-cyan font-bold border border-jarvis-cyan/30' : d ? 'text-jarvis-text hover:bg-white/5' : ''}`}>
            {d ?? ''}
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemStatsWidget() {
  const [stats, setStats] = useState<{ cpu: number; mem: number } | null>(null)
  useEffect(() => {
    const api = (window as any).electronAPI
    const load = async () => {
      try {
        if (api?.getSystemStats) {
          setStats(await api.getSystemStats())
        }
      } catch {}
    }
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [])
  const cpu = stats?.cpu ?? 0
  const mem = stats?.mem ?? 0
  return (
    <div className="p-4 space-y-3">
      <div className="text-xs font-semibold text-jarvis-muted uppercase tracking-wider">System</div>
      <div>
        <div className="flex justify-between text-xs mb-1"><span className="text-jarvis-muted">CPU</span><span className="text-jarvis-text font-mono">{cpu.toFixed(0)}%</span></div>
        <div className="h-1.5 bg-jarvis-bg rounded-full overflow-hidden"><div className="h-full bg-jarvis-cyan rounded-full transition-all" style={{ width: `${cpu}%` }} /></div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1"><span className="text-jarvis-muted">Memory</span><span className="text-jarvis-text font-mono">{mem.toFixed(0)}%</span></div>
        <div className="h-1.5 bg-jarvis-bg rounded-full overflow-hidden"><div className="h-full bg-jarvis-blue rounded-full transition-all" style={{ width: `${mem}%` }} /></div>
      </div>
    </div>
  )
}

// ── Panel wrapper ───────────────────────────────────────────────────────

const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  clock: ClockWidget,
  notes: NotesWidget,
  tasks: TasksWidget,
  weather: WeatherWidget,
  calendar: CalendarWidget,
  'system-stats': SystemStatsWidget,
}

export default function WidgetPanel({ widgets, widgetOpacity = 0.95 }: WidgetPanelProps) {
  if (!widgets || widgets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-jarvis-muted/50 text-sm">
        No widgets configured for this page. Go to Settings → Tabs & Layout to add some.
      </div>
    )
  }
  return (
    <div className="flex-1 h-full overflow-y-auto p-4 relative">
      <div className="grid grid-cols-2 gap-4 h-full">
        {widgets.map(w => {
          const Comp = WIDGET_COMPONENTS[w]
          if (!Comp) return null
          return (
            <div
              key={w}
              className="rounded-xl border border-jarvis-border/50 shadow-[0_4px_20px_rgba(0,0,0,0.55)] overflow-hidden relative"
              style={{ backgroundColor: `rgba(11, 17, 28, ${widgetOpacity})` }}
            >
              <Comp />
            </div>
          )
        })}
      </div>
    </div>
  )
}
