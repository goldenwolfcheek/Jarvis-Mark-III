import type { ConnectionStatus } from '@/types'

interface TitleBarProps {
  status: ConnectionStatus
  onOpenSettings?: () => void
}

export default function TitleBar({ status, onOpenSettings }: TitleBarProps) {
  const statusColor =
    status === 'connected' ? 'bg-jarvis-success' :
    status === 'connecting' ? 'bg-jarvis-warning' :
    'bg-jarvis-error'

  const statusText =
    status === 'connected' ? 'Connected' :
    status === 'connecting' ? 'Connecting...' :
    'Disconnected'

  const handleMinimize = () => (window as any).electronAPI?.minimize()
  const handleMaximize = () => (window as any).electronAPI?.maximize()
  const handleClose = () => (window as any).electronAPI?.close()

  return (
    <div className="titlebar-drag h-9 flex items-center z-50 bg-jarvis-surface/90 backdrop-blur-md border-b border-jarvis-border/30 select-none">
      {/* App title */}
      <div className="titlebar-no-drag flex items-center gap-2 px-3 text-sm font-semibold tracking-wider">
        <span className={`w-2 h-2 rounded-full ${statusColor} shadow-[0_0_6px_rgba(0,212,255,0.6)]`} />
        <span className="text-jarvis-cyan">JARVIS</span>
        <span className="text-jarvis-muted font-normal">Mark III</span>
      </div>

      <div className="flex-1" />

      {/* Connection status — centered */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-jarvis-muted">
        <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        <span>{statusText}</span>
      </div>

      {/* Settings + window controls */}
      <div className="titlebar-no-drag flex h-full items-center">
        {/* Settings gear */}
        <button
          onClick={onOpenSettings}
          className="px-2.5 h-full hover:bg-white/10 transition-colors text-jarvis-muted hover:text-jarvis-text"
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Window controls */}
        <div className="flex h-full">
          <button onClick={handleMinimize} className="px-3 h-full hover:bg-white/10 transition-colors text-jarvis-muted hover:text-jarvis-text" title="Minimize">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="currentColor" rx="0.75" /></svg>
          </button>
          <button onClick={handleMaximize} className="px-3 h-full hover:bg-white/10 transition-colors text-jarvis-muted hover:text-jarvis-text" title="Maximize">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
          <button onClick={handleClose} className="px-3 h-full hover:bg-red-500/20 hover:text-red-400 transition-colors text-jarvis-muted" title="Close">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
