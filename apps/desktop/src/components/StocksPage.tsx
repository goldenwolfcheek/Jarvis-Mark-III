import { useState, useEffect, useCallback } from 'react'

interface Watch {
  symbol: string
}

interface Quote {
  symbol: string
  price: number | null
  changePct: number | null
  error?: string
}

const WATCH_KEY = 'jarvis-mark-iii-stocks-watchlist'
const DEFAULT_WATCHLIST: Watch[] = [
  { symbol: 'AAPL' },
  { symbol: 'MSFT' },
  { symbol: 'NVDA' },
]

export default function StocksPage() {
  const [watchlist, setWatchlist] = useState<Watch[]>(() => {
    try {
      const saved = localStorage.getItem(WATCH_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_WATCHLIST
  })
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')

  useEffect(() => {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(watchlist)) } catch {}
  }, [watchlist])

  // Pricing requires a market-data backend (planned bridge phase).
  // This page is watchlist-first: add/remove symbols, and show live quotes
  // only when a data source exists. Until then, values render as em-dashes.
  const refresh = useCallback(async () => {
    setLoading(true)
    // No market-data provider yet: quotes stay empty instead of showing
    // fabricated numbers. When the bridge backend lands (Phase B), this
    // will call its /api/stocks endpoint via ws/REST.
    setTimeout(() => setLoading(false), 400)
  }, [])

  const addSymbol = () => {
    const s = input.trim().toUpperCase()
    if (!s || watchlist.some(w => w.symbol === s)) return
    setWatchlist(prev => [...prev, { symbol: s }])
    setInput('')
  }

  const removeSymbol = (symbol: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== symbol))
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-jarvis-border/30 bg-jarvis-surface/40 flex items-center gap-3 shrink-0">
        <span className="text-lg">📈</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-jarvis-text">Stocks</div>
          <div className="text-[10px] text-jarvis-muted">Watchlist — live quotes arrive with the backend phase</div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded-md border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors disabled:opacity-40 shrink-0"
          title="Refresh quotes"
        >{loading ? '…' : '↻'}</button>
      </div>

      {/* Add symbol */}
      <div className="px-5 py-2.5 border-b border-jarvis-border/30 bg-jarvis-bg/30 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSymbol()}
          placeholder="Add ticker (e.g. TSLA)"
          className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-jarvis-bg/60 border border-jarvis-border rounded-md text-jarvis-text placeholder:text-jarvis-muted/50 outline-none focus:border-jarvis-cyan/40 uppercase"
        />
        <button onClick={addSymbol} className="px-3 py-1.5 text-xs bg-jarvis-blue/20 text-jarvis-cyan rounded-md border border-jarvis-blue/20 hover:bg-jarvis-blue/30 transition-colors">Add</button>
      </div>

      {/* Quote rows */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="space-y-1">
          {watchlist.map(w => {
            const q = quotes[w.symbol]
            return (
              <div key={w.symbol} className="flex items-center px-3 py-2.5 rounded-lg border border-transparent hover:border-jarvis-border/40 hover:bg-white/[0.03] transition-colors group">
                <span className="flex-1 text-sm font-mono text-jarvis-text">{w.symbol}</span>
                <span className="text-sm font-mono text-jarvis-muted/60 tabular-nums">{q?.price ?? '—'}</span>
                <span className={`text-xs font-mono tabular-nums w-16 text-right ${typeof q?.changePct === 'number' && q.changePct >= 0 ? 'text-jarvis-green' : 'text-jarvis-error'}`}>
                  {typeof q?.changePct === 'number' ? `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%` : '—'}
                </span>
                <button
                  onClick={() => removeSymbol(w.symbol)}
                  className="ml-3 text-jarvis-muted/0 group-hover:text-jarvis-muted hover:!text-jarvis-error text-xs transition-opacity shrink-0"
                  title={`Remove ${w.symbol}`}
                >✕</button>
              </div>
            )
          })}
        </div>
        {watchlist.length === 0 && (
          <div className="text-jarvis-muted/50 text-sm text-center py-8">Watchlist empty — add a ticker above.</div>
        )}
        <div className="mt-6 px-3 py-2.5 rounded-lg border border-jarvis-border/30 bg-jarvis-bg/40 text-[11px] text-jarvis-muted/70">
          ℹ️ Live prices need a market-data source. This is planned for the backend bridge (Phase B) — Jarvis will fetch quotes via its server so no API key ever touches the renderer.
        </div>
      </div>
    </div>
  )
}
