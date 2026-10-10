import { useState, useEffect, useCallback } from 'react'

interface TextEditorProps {
  filePath: string
  fileName: string
  onClose: () => void
}

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt',
  'json', 'yaml', 'yml', 'toml', 'xml',
  'html', 'css', 'scss', 'less',
  'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1',
  'sql', 'graphql', 'gql',
  'dockerfile', 'docker-compose',
  'env', 'gitignore', 'editorconfig',
  'vue', 'svelte',
])

const TEXT_EXTENSIONS = new Set(['md', 'txt', 'log', 'cfg', 'ini', 'conf', 'csv'])

export function isCodeFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return CODE_EXTENSIONS.has(ext)
}

export function isTextFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return TEXT_EXTENSIONS.has(ext)
}

export default function TextEditor({ filePath, fileName, onClose }: TextEditorProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      const api = (window as any).electronAPI
      try {
        if (api?.readFile) {
          const result = await api.readFile(filePath)
          if (cancelled) return
          if (result?.error) setError(result.error)
          else { setContent(result.content || ''); setSaved(true) }
        } else {
          const res = await fetch(`http://localhost:11711/api/file?path=${encodeURIComponent(filePath)}`)
          if (!res.ok) throw new Error(`Status ${res.status}`)
          const data = await res.json()
          if (cancelled) return
          if (data?.error) setError(data.error)
          else { setContent(data.content || ''); setSaved(true) }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to read file')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [filePath])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const api = (window as any).electronAPI
    try {
      if (api?.writeFile) {
        const result = await api.writeFile(filePath, content)
        if (result?.error) { setError(result.error); setSaving(false); return }
      } else {
        const res = await fetch(`http://localhost:11711/api/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath, content }),
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
      }
      setSaved(true)
      setSaveFlash(true)
      setTimeout(() => setSaveFlash(false), 1500)
    } catch (e: any) {
      setError(e.message || 'Failed to save file')
    }
    setSaving(false)
  }, [filePath, content])

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setSaved(false)
  }, [])

  const lineCount = content.split('\n').length

  return (
    <div className="flex-1 flex flex-col h-full bg-jarvis-bg overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center h-9 bg-jarvis-surface/80 border-b border-jarvis-border/30 shrink-0">
        <div className="flex items-center h-full px-3 gap-2 bg-jarvis-bg/60 border-r border-jarvis-border/30">
          <span className="text-[10px]">📝</span>
          <span className="text-xs text-jarvis-text font-medium">{fileName}</span>
          {!saved && <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan" />}
          <button onClick={onClose}
            className="ml-1 text-jarvis-muted hover:text-jarvis-error transition-colors text-xs leading-none">
            ✕
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3">
          {saveFlash && (
            <span className="text-[10px] text-jarvis-success animate-fade-in">✓ Saved</span>
          )}
          <button onClick={handleSave} disabled={saving || saved}
            className="text-[10px] px-2 py-0.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor area */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-jarvis-muted text-sm">
          Loading...
        </div>
      )}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center text-jarvis-error text-sm px-8 text-center">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="flex-1 flex overflow-hidden">
          {/* Line numbers */}
          <div className="w-12 bg-jarvis-surface/30 border-r border-jarvis-border/20 overflow-hidden shrink-0 pt-2 pb-4 select-none">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="text-right pr-2 text-[11px] leading-[20px] text-jarvis-muted/40 font-mono">
                {i + 1}
              </div>
            ))}
          </div>
          {/* Textarea */}
          <textarea
            value={content}
            onChange={handleContentChange}
            className="flex-1 bg-transparent text-jarvis-text text-[13px] leading-[20px] font-mono p-2 resize-none outline-none placeholder:text-jarvis-muted/30"
            placeholder="Empty file"
            spellCheck={false}
            autoFocus
          />
        </div>
      )}

      {/* Status bar */}
      <div className="h-6 bg-jarvis-surface/60 border-t border-jarvis-border/30 flex items-center px-3 text-[10px] text-jarvis-muted shrink-0">
        <span>{lineCount} lines</span>
        <span className="mx-2">·</span>
        <span>{content.length} chars</span>
        <span className="mx-2">·</span>
        <span>Text</span>
        <div className="flex-1" />
        <span title={filePath} className="truncate max-w-[300px]">{filePath}</span>
      </div>
    </div>
  )
}
