import { useState, useEffect, useCallback, useMemo } from 'react'

interface NewsItem {
  title: string
  link: string
  source: string
  published?: string
}

interface FeedPickerProps {
  feeds: { name: string; url: string }[]
  selected: string
  onSelect: (name: string) => void
  onAddFeed: (name: string, url: string) => void
  onRemoveFeed: (name: string) => void
}

const DEFAULT_FEEDS: { name: string; url: string }[] = [
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
]

const FEEDS_KEY = 'jarvis-mark-iii-news-feeds'

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#\d+;/g, '').trim()
}

function parseRss(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = []
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    // RSS 2.0 <item> or Atom <entry>
    const nodes = Array.from(doc.querySelectorAll('item, entry')).slice(0, 50)
    for (const n of nodes) {
      const title = stripHtml(n.querySelector('title')?.textContent || '')
      const link = n.querySelector('link')?.textContent?.trim() || n.querySelector('link')?.getAttribute('href') || ''
      const published = n.querySelector('pubDate, published, updated')?.textContent || undefined
      if (title && link) items.push({ title, link, source: sourceName, published })
    }
  } catch { /* fallthrough */ }
  return items
}

export default function NewsPage() {
  const [feeds, setFeeds] = useState<{ name: string; url: string }[]>(() => {
    try {
      const saved = localStorage.getItem(FEEDS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_FEEDS
  })
  const [selected, setSelected] = useState<string>(() => {
    try { return localStorage.getItem(FEEDS_KEY + ':selected') || DEFAULT_FEEDS[0].name } catch { return DEFAULT_FEEDS[0].name }
  })
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const feed = useMemo(() => feeds.find(f => f.name === selected) || feeds[0], [feeds, selected])

  useEffect(() => {
    try { localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds)) } catch {}
  }, [feeds])
  useEffect(() => {
    try { localStorage.setItem(FEEDS_KEY + ':selected', selected) } catch {}
  }, [selected])

  const load = useCallback(async (url: string, name: string) => {
    setLoading(true)
    setError('')
    try {
      const api = window.electronAPI
      if (!api?.fetchText) {
        setError('News feed requires the desktop app (no direct network access in this view).')
        setLoading(false)
        return
      }
      const res = await api.fetchText(url)
      if (!res.ok || !res.text) {
        setError(res.error || 'Failed to fetch feed')
        setLoading(false)
        return
      }
      const parsed = parseRss(res.text, name)
      if (parsed.length === 0) setError('Feed returned no items (may not be an RSS/Atom feed).')
      setItems(parsed)
      setLastUpdated(Date.now())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load feed')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (feed) load(feed.url, feed.name)
  }, [feed?.url, feed?.name, load])

  const addFeed = () => {
    if (!newName.trim() || !newUrl.trim() || !/^https?:\/\//i.test(newUrl.trim())) return
    if (feeds.some(f => f.name === newName.trim())) { setShowAdd(false); return }
    setFeeds(prev => [...prev, { name: newName.trim(), url: newUrl.trim() }])
    setSelected(newName.trim())
    setNewName(''); setNewUrl(''); setShowAdd(false)
  }

  const removeFeed = (name: string) => {
    setFeeds(prev => {
      const next = prev.filter(f => f.name !== name)
      if (next.length === 0) return prev // keep at least one feed
      if (selected === name) setSelected(next[0].name)
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden px-5 py-4">
        <div className="rounded-xl bg-[#0d1420]/95 border border-jarvis-border/40 shadow-[0_4px_20px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col h-full">

      {/* Header */}
      <div className="px-5 py-3 border-b border-jarvis-border/30 bg-jarvis-surface/40 flex items-center gap-3 shrink-0">
        <span className="text-lg">📰</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-jarvis-text">News</div>
          <div className="text-[10px] text-jarvis-muted">
            {lastUpdated && `Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
            {items.length > 0 && ` · ${items.length} stories`}
          </div>
        </div>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="bg-jarvis-bg/60 border border-jarvis-border/50 rounded-md px-2 py-1 text-xs text-jarvis-text outline-none cursor-pointer appearance-none max-w-[180px]"
        >
          {feeds.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <button
          onClick={() => load(feed.url, feed.name)}
          className="text-xs px-2.5 py-1 rounded-md border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors shrink-0"
          title="Refresh feed"
        >↻</button>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs px-2.5 py-1 rounded-md border border-jarvis-border/40 text-jarvis-muted hover:text-jarvis-text hover:bg-white/5 transition-colors shrink-0"
          title="Manage feeds"
        >+</button>
      </div>

      {/* Add feed form */}
      {showAdd && (
        <div className="px-5 py-3 border-b border-jarvis-border/30 bg-jarvis-bg/40 space-y-2 shrink-0">
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Feed name"
              className="flex-1 px-2.5 py-1.5 text-xs bg-jarvis-bg/60 border border-jarvis-border rounded-md text-jarvis-text placeholder:text-jarvis-muted/50 outline-none focus:border-jarvis-cyan/40" />
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://site.com/rss.xml"
              onKeyDown={e => e.key === 'Enter' && addFeed()}
              className="flex-[2] px-2.5 py-1.5 text-xs font-mono bg-jarvis-bg/60 border border-jarvis-border rounded-md text-jarvis-text placeholder:text-jarvis-muted/50 outline-none focus:border-jarvis-cyan/40" />
            <button onClick={addFeed} className="px-3 py-1.5 text-xs bg-jarvis-blue/20 text-jarvis-cyan rounded-md border border-jarvis-blue/20 hover:bg-jarvis-blue/30 transition-colors">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-jarvis-muted hover:text-jarvis-text transition-colors">Cancel</button>
          </div>
          {feeds.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {feeds.filter(f => f.name !== DEFAULT_FEEDS[0].name && f.name !== DEFAULT_FEEDS[1].name).map(f => (
                <button key={f.name} onClick={() => removeFeed(f.name)}
                  className="text-[10px] px-2 py-0.5 rounded border border-jarvis-border/40 text-jarvis-muted hover:text-jarvis-error hover:border-jarvis-error/30 transition-colors"
                  title="Remove this feed">
                  {f.name} ✕
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && <div className="text-jarvis-muted text-sm py-6 text-center">Loading feed…</div>}
        {!loading && error && (
          <div className="text-jarvis-warning text-sm py-3 text-center px-4 rounded-lg border border-jarvis-warning/20 bg-jarvis-warning/5">
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className="space-y-1">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => window.electronAPI?.openExternal(item.link)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-jarvis-border/40 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-[10px] text-jarvis-muted/60 font-mono mt-0.5 shrink-0">{item.source}</span>
                  <span className="text-sm text-jarvis-text group-hover:text-jarvis-cyan transition-colors leading-snug">{item.title}</span>
                </div>
                {item.published && (
                  <div className="text-[10px] text-jarvis-muted/50 mt-1 ml-[calc(10px+0.625rem)]">
                    {new Date(item.published).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </button>
            ))}
            {items.length === 0 && <div className="text-jarvis-muted/50 text-sm text-center py-6">No stories.</div>}
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  )
}
