import { useState, useCallback, useEffect } from 'react'

interface FileEntry {
  name: string
  isDirectory: boolean
}

interface FileBrowserProps {
  isOpen: boolean
  onToggle: () => void
  projectPath?: string
  onProjectPathChange?: (path: string) => void
  onFileOpen?: (filePath: string, fileName: string) => void
}

const FOLDER_ICONS: Record<string, string> = {
  '.git': '📦', node_modules: '📦', src: '📁', apps: '📁', server: '📁',
  docs: '📄', assets: '🎨', public: '🌐', test: '🧪', tests: '🧪',
}

const FILE_ICONS: Record<string, string> = {
  '.gitignore': '📦', '.env': '🔐', '.env.local': '🔐',
  'package.json': '📋', 'tsconfig.json': '📋', 'vite.config.ts': '⚙️',
  'README.md': '📝', 'LICENSE': '📜', 'PLAN.md': '📋', 'PLAN': '📋',
}

function getIcon(entry: FileEntry): string {
  if (entry.isDirectory) return FOLDER_ICONS[entry.name] || '📁'
  if (FILE_ICONS[entry.name]) return FILE_ICONS[entry.name]
  const ext = entry.name.split('.').pop()?.toLowerCase() || ''
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) return '📜'
  if (['py'].includes(ext)) return '🐍'
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return '⚙️'
  if (['md', 'txt'].includes(ext)) return '📝'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'].includes(ext)) return '🖼️'
  if (['css', 'scss'].includes(ext)) return '🎨'
  if (['bat', 'sh', 'cmd'].includes(ext)) return '⚡'
  return '📄'
}

export default function FileBrowser({ isOpen, onToggle, projectPath, onProjectPathChange, onFileOpen }: FileBrowserProps) {
  const [directory, setDirectory] = useState('')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<string[]>([])

  // Auto-load when projectPath changes from parent (per-session)
  useEffect(() => {
    if (projectPath && projectPath !== directory) {
      setHistory([])
      loadDirectory(projectPath)
    }
  }, [projectPath])

  const loadDirectory = useCallback(async (dirPath: string) => {
    const api = (window as any).electronAPI
    setLoading(true)
    setError('')
    try {
      if (api?.readDirectory) {
        const result = await api.readDirectory(dirPath)
        if (result?.error) { setError(result.error); setEntries([]) }
        else { setEntries(result || []); setDirectory(dirPath) }
      } else {
        // Fallback: use backend API
        const res = await fetch(`http://localhost:11711/api/files?path=${encodeURIComponent(dirPath)}`)
        if (!res.ok) { setError(`Could not read directory (status ${res.status})`); setEntries([]); return }
        const data = await res.json()
        if (data?.error) { setError(data.error); setEntries([]) }
        else { setEntries(data || []); setDirectory(dirPath) }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to read directory')
      setEntries([])
    }
    setLoading(false)
  }, [])

  const handleSelectFolder = useCallback(async () => {
    const api = (window as any).electronAPI
    if (!api?.selectFolder) {
      // Fallback for browser dev mode — prompt for path
      const path = prompt('Enter folder path to browse:')
      if (path) { setHistory([]); loadDirectory(path); onProjectPathChange?.(path) }
      return
    }
    try {
      const folder = await api.selectFolder()
      if (folder) {
        setHistory([])
        loadDirectory(folder)
        onProjectPathChange?.(folder)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to select folder')
    }
  }, [loadDirectory])

  const handleEntryClick = useCallback((entry: FileEntry) => {
    if (entry.isDirectory) {
      const nextPath = directory + '\\' + entry.name
      setHistory(prev => [...prev, directory])
      loadDirectory(nextPath)
    } else {
      const filePath = directory + '\\' + entry.name
      onFileOpen?.(filePath, entry.name)
    }
  }, [directory, loadDirectory, onFileOpen])

  const handleBack = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    loadDirectory(prev)
  }, [history, loadDirectory])

  const dirName = directory.split(/[\\/]/).pop() || ''

  return (
    <>
      {/* Toggle button — top-right, mirrors sidebar toggle */}
      <div
        className="fixed top-12 z-50 pointer-events-auto transition-all duration-150"
        style={{ right: isOpen ? '260px' : '12px' }}
      >
        <button onClick={onToggle}
          className={`flex items-center justify-center w-9 h-9 text-xs font-medium transition-all duration-200 rounded-xl border backdrop-blur-md ${
            isOpen ? 'text-jarvis-cyan bg-jarvis-surface/90 border-jarvis-cyan/30 shadow-[0_0_12px_rgba(0,212,255,0.15)]'
                   : 'text-jarvis-cyan/80 hover:text-jarvis-cyan bg-jarvis-surface/70 border-jarvis-border/40 hover:bg-jarvis-surface/90 hover:border-jarvis-cyan/30'
          }`}
          title={isOpen ? 'Close file browser' : 'Open file browser'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {isOpen
              ? <><path d="M3 3l8 8M11 3l-8 8" /></>
              : <><path d="M2 4h4l1-1h5v8H2V4z" /></>
            }
          </svg>
        </button>
      </div>

      {/* Panel */}
      <div className={`fixed right-0 top-9 bottom-0 w-64 z-40 bg-jarvis-surface/95 backdrop-blur-xl border-l border-jarvis-border/30 transform transition-transform duration-150 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-jarvis-border/30 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-jarvis-muted uppercase tracking-wider">Files</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setHistory([]); loadDirectory('.'); onProjectPathChange?.('.') }}
              title="Reset to default working directory"
              className="text-[10px] px-2 py-0.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors">
              Reset
            </button>
            <button onClick={handleSelectFolder}
              className="text-[10px] px-2 py-0.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors">
              Select Folder
            </button>
          </div>
        </div>

        {/* Current path */}
        {directory && (
          <div className="px-3 py-1.5 border-b border-jarvis-border/30 flex items-center gap-1">
            {history.length > 0 && (
              <button onClick={handleBack} className="text-jarvis-cyan/60 hover:text-jarvis-cyan text-xs mr-1">←</button>
            )}
            <span className="text-[10px] text-jarvis-text truncate" title={directory}>
              {dirName || directory}
            </span>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-2">
          {!directory && !loading && (
            <div className="flex items-center justify-center h-full text-jarvis-muted/50 text-xs text-center px-4">
              Select a project folder to browse files
            </div>
          )}
          {loading && (
            <div className="text-jarvis-muted text-xs italic py-4 text-center">Loading...</div>
          )}
          {error && (
            <div className="text-jarvis-error text-xs py-2 px-2">{error}</div>
          )}
          {entries.map(entry => (
            <div key={entry.name}
              onClick={() => handleEntryClick(entry)}
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                entry.isDirectory
                  ? 'text-jarvis-text hover:bg-white/5 cursor-pointer'
                  : 'text-jarvis-muted hover:bg-white/5 cursor-pointer hover:text-jarvis-text'
              }`}>
              <span className="shrink-0 w-4 text-center">{getIcon(entry)}</span>
              <span className="truncate">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
