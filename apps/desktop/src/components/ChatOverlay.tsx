import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { Message } from '@/types'

interface ChatOverlayProps {
  isOpen: boolean
  onToggle: () => void
  messages: Message[]
  onSendMessage: (content: string) => void
  isStreaming: boolean
  onStop?: () => void
  modelName?: string
  providerName?: string
  contentInset?: { left: number; right: number }
  chatHeight?: number
  onModelChange?: (model: string) => void
  onProviderChange?: (provider: string) => void
  savedProviders?: { label: string; provider: string; apiKey: string; model: string }[]
  sessionName?: string
}

// ── Simple markdown renderer ─────────────────────────────────────────────
function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines = part.slice(3, -3)
      const firstNewline = lines.indexOf('\n')
      const lang = firstNewline > 0 ? lines.slice(0, firstNewline).trim() : ''
      const code = firstNewline > 0 ? lines.slice(firstNewline + 1) : lines
      return (
        <div key={i} className="my-2 rounded-lg overflow-hidden border border-jarvis-border/50">
          {lang && <div className="px-3 py-1 bg-jarvis-surface/80 text-xs text-jarvis-muted font-mono border-b border-jarvis-border/50">{lang}</div>}
          <pre className="p-3 bg-jarvis-bg/80 overflow-x-auto">
            <code className="text-xs font-mono text-jarvis-text leading-relaxed">{code}</code>
          </pre>
        </div>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ── Message Bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const time = useMemo(() => new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [msg.timestamp])
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {!isUser && (
        <div className="flex items-center gap-1.5 mb-1 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan" />
          <span className="text-xs font-medium text-jarvis-cyan">Jarvis</span>
        </div>
      )}
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isUser ? 'bg-jarvis-blue/80 text-white rounded-br-md' : 'bg-jarvis-surface/60 text-jarvis-text rounded-bl-md border border-jarvis-border/30'
      }`}>
        {isUser ? <div className="whitespace-pre-wrap">{msg.content}</div> : <div className="space-y-1">{renderContent(msg.content)}</div>}
        {msg.streaming && (
          <div className="flex items-center gap-1 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan animate-pulse" style={{ animationDelay: '200ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        )}
      </div>
      <span className="text-[10px] text-jarvis-muted mt-1 ml-1">{time}</span>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────
export default function ChatOverlay({ isOpen, onToggle, messages, onSendMessage, isStreaming, onStop, modelName, providerName, contentInset = { left: 0, right: 0 }, chatHeight = 60, onModelChange, onProviderChange, savedProviders, sessionName }: ChatOverlayProps) {
  const [input, setInput] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [sttActive, setSttActive] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  // Build provider/model lists from saved providers (only those with valid API keys)
  const validProviders = useMemo(() => {
    if (!savedProviders || savedProviders.length === 0) return []
    return savedProviders.filter(p => p.apiKey && p.apiKey.trim() !== '')
  }, [savedProviders])

  const PROVIDERS = validProviders.length > 0 ? validProviders : [{ provider: providerName || 'opencode-zen', model: modelName || 'big-pickle', apiKey: '', label: providerName || 'opencode-zen' }]

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 150)
  }, [isOpen])

  // Textarea: match button height by default, expand on input
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = '32px' // matches w-8 h-8 buttons
      el.style.height = Math.min(Math.max(el.scrollHeight, 32), 120) + 'px'
    }
  }, [input])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return
    onSendMessage(text)
    setInput('')
    setAttachedFiles([])
    if (textareaRef.current) textareaRef.current.style.height = '32px'
  }, [input, isStreaming, onSendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (idx: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))

  return (
    <div
      className="fixed bottom-0 z-30 pointer-events-none transition-all duration-150"
      style={{ left: contentInset.left, right: contentInset.right }}
    >
      {/* Toggle button */}
      <div className="flex justify-center pb-3 pointer-events-auto">
        <button
          onClick={onToggle}
          className="group flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-jarvis-cyan/80 hover:text-jarvis-cyan bg-jarvis-surface/70 backdrop-blur-md border border-jarvis-border/40 rounded-xl transition-all duration-200 hover:bg-jarvis-surface/90 hover:border-jarvis-cyan/30 hover:shadow-[0_0_12px_rgba(0,212,255,0.15)]"
        >
          <span className={`inline-block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 8l4-4 4 4" /></svg>
          </span>
          Chat
        </button>
      </div>

      {/* Chat panel */}
      <div
        className={`pointer-events-auto transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        style={{ height: isOpen ? `${Math.max(35, Math.min(chatHeight, 90))}vh` : '0' }}
      >
        <div className="h-full flex flex-col bg-black/50 backdrop-blur-xl rounded-t-2xl border-t border-jarvis-border/30 overflow-hidden">
          {/* Header — provider + model selectors */}
          <div className="relative flex items-center justify-between px-5 py-2.5 border-b border-jarvis-border/30 bg-jarvis-surface/30">
            {/* Left: providers */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-jarvis-cyan animate-pulse-glow" />
              {/* Provider selector — from saved providers with API keys */}
              <select
                value={providerName || 'opencode-zen'}
                onChange={e => {
                  const p = PROVIDERS.find(x => x.provider === e.target.value)
                  if (p) { onProviderChange?.(p.provider); onModelChange?.(p.model) }
                }}
                className="bg-jarvis-bg/60 border border-jarvis-border/50 rounded-md px-2 py-1 text-xs text-jarvis-text focus:border-jarvis-cyan/50 outline-none cursor-pointer appearance-none"
              >
                {PROVIDERS.map(p => (
                  <option key={`${p.provider}-${p.model}`} value={p.provider}>{p.label}</option>
                ))}
              </select>
              <span className="text-jarvis-muted">/</span>
              {/* Model selector — from saved providers */}
              <select
                value={modelName || 'big-pickle'}
                onChange={e => onModelChange?.(e.target.value)}
                className="bg-jarvis-bg/60 border border-jarvis-border/50 rounded-md px-2 py-1 text-xs text-jarvis-text font-mono focus:border-jarvis-cyan/50 outline-none cursor-pointer appearance-none"
              >
                {PROVIDERS.map(p => (
                  <option key={p.model} value={p.model}>{p.model}</option>
                ))}
              </select>
            </div>
            {/* Center: session name */}
            {sessionName && (
              <span className="absolute left-1/2 -translate-x-1/2 text-xs text-jarvis-text font-medium truncate max-w-[200px]">
                {sessionName}
              </span>
            )}
            {/* Right: status */}
            <span className="text-xs text-jarvis-muted">{messages.length} messages</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-jarvis-muted">
                <div className="text-3xl mb-3 opacity-50">💬</div>
                <div className="text-sm">Chat with Jarvis</div>
                <div className="text-xs mt-1 opacity-60">Ask me anything — I'm here to help.</div>
              </div>
            )}
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-jarvis-border/30 bg-jarvis-surface/30">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-jarvis-bg/60 border border-jarvis-border/40 rounded-lg text-xs text-jarvis-text shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-jarvis-muted">
                    <path d="M6.5 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V4.5L6.5 1z" />
                    <path d="M6.5 1v3.5H9" />
                  </svg>
                  <span className="max-w-[100px] truncate">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="text-jarvis-muted hover:text-jarvis-error ml-1">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="px-4 py-3 bg-jarvis-surface/40 border-t border-jarvis-border/30">
            <div className="flex items-center gap-2 bg-jarvis-bg/50 rounded-xl px-3 py-2 border border-jarvis-border/40 focus-within:border-jarvis-cyan/30 transition-colors">
              {/* File attach */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-jarvis-muted hover:text-jarvis-text hover:bg-white/5 transition-colors shrink-0"
                title="Attach file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

              {/* Textarea — h-8 default, expands on input */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Jarvis..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-jarvis-text placeholder:text-jarvis-muted outline-none resize-none leading-relaxed"
                style={{ height: '32px', maxHeight: '120px' }}
                disabled={isStreaming}
              />

              {/* STT mic */}
              <button
                onClick={() => setSttActive(!sttActive)}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 ${
                  sttActive ? 'text-jarvis-error bg-jarvis-error/15 animate-pulse' : 'text-jarvis-muted hover:text-jarvis-text hover:bg-white/5'
                }`}
                title={sttActive ? 'Stop listening' : 'Voice input'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>

              {/* TTS toggle */}
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 ${
                  ttsEnabled ? 'text-jarvis-cyan bg-jarvis-cyan/15' : 'text-jarvis-muted hover:text-jarvis-text hover:bg-white/5'
                }`}
                title={ttsEnabled ? 'TTS on' : 'TTS off'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  {ttsEnabled && <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />}
                  {!ttsEnabled && <path d="M15.54 8.46a5 5 0 010 7.07" />}
                </svg>
              </button>

              {/* Send / Stop */}
              {isStreaming ? (
                <button onClick={onStop} className="flex items-center justify-center w-8 h-8 rounded-lg bg-jarvis-error/20 text-jarvis-error hover:bg-jarvis-error/30 transition-colors shrink-0" title="Stop generation">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="10" height="10" rx="2" /></svg>
                </button>
              ) : (
                <button onClick={handleSend} disabled={!input.trim() && attachedFiles.length === 0} className="flex items-center justify-center w-8 h-8 rounded-lg bg-jarvis-blue text-white hover:bg-jarvis-blue/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0" title="Send message">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 7h12M8 2l5 5-5 5" /></svg>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-[10px] text-jarvis-muted/50">Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
