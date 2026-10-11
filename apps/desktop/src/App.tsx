import { useState, useCallback, useRef, useEffect } from 'react'
import TitleBar from '@/components/TitleBar'
import TabBar from '@/components/TabBar'
import Sidebar from '@/components/Sidebar'
import SphereScene from '@/components/SphereScene'
import ChatOverlay from '@/components/ChatOverlay'
import SettingsPage from '@/components/SettingsPage'
import FileBrowser from '@/components/FileBrowser'
import WidgetPanel from '@/components/WidgetPanel'
import NewsPage from '@/components/NewsPage'
import StocksPage from '@/components/StocksPage'
import TextEditor, { isCodeFile } from '@/components/TextEditor'
import CodeEditor from '@/components/CodeEditor'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useSettings } from '@/hooks/useSettings'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import type { Message } from '@/types'

let msgIdCounter = 0
function nextMsgId() { return `ui_${++msgIdCounter}_${Date.now()}` }

export default function App() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const [activeTab, setActiveTabRaw] = useState(settings.activeTab)
  const [chatOpenPerTab, setChatOpenPerTab] = useState<Map<string, boolean>>(new Map(Object.entries(settings.chatOpenPerTab)))
  const [sidebarOpen, setSidebarOpenRaw] = useState(settings.sidebarOpen)
  const [sessions, setSessions] = useState<{ id: string; title: string; projectPath?: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('jarvis-mark-iii-sessions') || '[]') } catch { return [] }
  })
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionProjectPaths, setSessionProjectPaths] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('jarvis-mark-iii-session-paths') || '{}') } catch { return {} }
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false)
  const [openFile, setOpenFile] = useState<{ path: string; name: string } | null>(null)

  // Persist tab/panel state whenever it changes
  const setActiveTab = useCallback((id: string) => { setActiveTabRaw(id); updateSettings({ activeTab: id }) }, [updateSettings])
  const setSidebarOpen = useCallback((open: boolean) => { setSidebarOpenRaw(open); updateSettings({ sidebarOpen: open }) }, [updateSettings])

  // Persist sessions list
  useEffect(() => {
    try { localStorage.setItem('jarvis-mark-iii-sessions', JSON.stringify(sessions)) } catch {}
  }, [sessions])

  // Personality — synced with settings
  const [personality, setPersonality] = useState(settings.personality)

  const { status, lastMessage, sendMessage } = useWebSocket(settings.wsUrl)
  const streamingMsgIdRef = useRef<string | null>(null)

  const isChatOpen = chatOpenPerTab.get(activeTab) ?? false
  const isSettingsOpen = activeTab === 'settings'
  const showSidebar = activeTab === 'chat' && !isSettingsOpen

  const toggleChat = useCallback(() => {
    setChatOpenPerTab(prev => {
      const next = new Map(prev)
      next.set(activeTab, !next.get(activeTab))
      updateSettings({ chatOpenPerTab: Object.fromEntries(next) })
      return next
    })
  }, [activeTab, updateSettings])

  const toggleSidebar = useCallback(() => { setSidebarOpen(!sidebarOpen) }, [sidebarOpen, setSidebarOpen])
  const openSettings = useCallback(() => setActiveTab('settings'), [])

  const setSessionProjectPath = useCallback((sessionId: string, path: string) => {
    setSessionProjectPaths(prev => {
      const next = { ...prev, [sessionId]: path }
      localStorage.setItem('jarvis-mark-iii-session-paths', JSON.stringify(next))
      return next
    })
  }, [])

  const activeProjectPath = activeSessionId ? sessionProjectPaths[activeSessionId] || '' : ''

  const handleFileOpen = useCallback((filePath: string, fileName: string) => {
    setOpenFile({ path: filePath, name: fileName })
    // Switch to the code tab so the editor is shown in its own page
    setActiveTab('code')
  }, [])

  const handleFileClose = useCallback(() => {
    setOpenFile(null)
  }, [])

  const savePersonality = useCallback(() => {
    updateSettings({ personality })
  }, [personality, updateSettings])

  useEffect(() => {
    if (!lastMessage) return
    switch (lastMessage.type) {
      case 'session_created':
        if (lastMessage.session_id) {
          setActiveSessionId(lastMessage.session_id)
          setSessions(prev => [...prev, { id: lastMessage.session_id!, title: 'New Conversation' }])
        }
        break
      case 'session_changed':
        if (lastMessage.session_id) setActiveSessionId(lastMessage.session_id)
        break
      case 'thinking':
        setIsStreaming(true)
        const streamId = nextMsgId()
        streamingMsgIdRef.current = streamId
        setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: '', timestamp: Date.now(), streaming: true }])
        break
      case 'delta':
        if (lastMessage.content && streamingMsgIdRef.current) {
          setMessages(prev => prev.map(m =>
            m.id === streamingMsgIdRef.current ? { ...m, content: m.content + lastMessage.content } : m
          ))
        }
        break
      case 'done':
        if (streamingMsgIdRef.current) {
          setMessages(prev => prev.map(m =>
            m.id === streamingMsgIdRef.current ? { ...m, streaming: false } : m
          ))
        }
        streamingMsgIdRef.current = null
        setIsStreaming(false)
        break
      case 'error':
        setIsStreaming(false)
        streamingMsgIdRef.current = null
        break
    }
  }, [lastMessage])

  const handleSendMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { id: nextMsgId(), role: 'user', content, timestamp: Date.now() }])
    sendMessage({ type: 'message', content, session_id: activeSessionId ?? undefined })
  }, [sendMessage, activeSessionId])

  // Floating mic — voice input without opening the chat overlay.
  // Transcripts go straight through the normal send path.
  const { listening: micActive, error: micError, toggle: toggleMic } = useVoiceInput({
    lang: 'en-US',
    onTranscript: handleSendMessage,
  })
  const toggleVoiceButton = activeTab === 'chat' && !isSettingsOpen

  const handleNewSession = useCallback(() => {
    setMessages([])
    setActiveSessionId(null)
    setChatOpenPerTab(prev => { const next = new Map(prev); next.set('chat', true); return next })
    setActiveTab('chat')
  }, [])

  const handleRenameSession = useCallback((id: string, title: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s))
  }, [])

  const handleDeleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    setActiveSessionId(prev => (prev === id ? null : prev))
    setMessages([])
  }, [])

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id)
    setMessages([])
    fetch(`${settings.backendUrl}/api/sessions/${id}/history`)
      .then(r => r.json())
      .then((history: any[]) => setMessages(history.map(m => ({ id: m.id, role: m.role, content: m.content, timestamp: new Date(m.timestamp).getTime() }))))
      .catch(() => {})
  }, [settings.backendUrl])

  const renderTabContent = () => {
    if (isSettingsOpen) return <SettingsPage settings={settings} onUpdate={updateSettings} onReset={resetSettings} />

    // Chat tab: sphere is the page; chat UI lives in the floating overlay.
    // (Unconditional now — the editor only ever renders on the Code tab.)
    if (activeTab === 'chat') return null

    // Editors live on the Code tab: an open file only renders there.
    // Other tabs leave it behind (returning to Code brings it back).
    if (openFile && activeTab === 'code') {
      if (isCodeFile(openFile.name)) {
        return <CodeEditor filePath={openFile.path} fileName={openFile.name} onClose={handleFileClose} />
      }
      return <TextEditor filePath={openFile.path} fileName={openFile.name} onClose={handleFileClose} />
    }

    if (activeTab === 'news') {
      // Widgets configured for this page override the default news view
      const pageWidgets = settings.pageLayouts[activeTab]?.widgets
      return pageWidgets && pageWidgets.length > 0 ? <WidgetPanel widgets={pageWidgets} widgetOpacity={settings.widgetOpacity} /> : <NewsPage widgetOpacity={settings.widgetOpacity} />
    }
    if (activeTab === 'stocks') {
      const pageWidgets = settings.pageLayouts[activeTab]?.widgets
      return pageWidgets && pageWidgets.length > 0 ? <WidgetPanel widgets={pageWidgets} widgetOpacity={settings.widgetOpacity} /> : <StocksPage />
    }

    if (activeTab === 'code') {
      const pageWidgets = settings.pageLayouts[activeTab]?.widgets
      if (pageWidgets && pageWidgets.length > 0) return <WidgetPanel widgets={pageWidgets} widgetOpacity={settings.widgetOpacity} />
      return (
        <div className="flex-1 flex items-center justify-center text-jarvis-muted pointer-events-none">
          <div className="text-center space-y-3">
            <div className="text-5xl opacity-40">⌨️</div>
            <div className="text-lg font-medium">Code Editor</div>
            <div className="text-sm opacity-60">Open a file from the file browser, or ask Jarvis to write something.</div>
          </div>
        </div>
      )
    }

    // Custom tabs — widgets if configured, otherwise an actionable empty state
    const pageWidgets = settings.pageLayouts[activeTab]?.widgets
    if (pageWidgets && pageWidgets.length > 0) {
      return <WidgetPanel widgets={pageWidgets} widgetOpacity={settings.widgetOpacity} />
    }
    const customTab = settings.tabs.find(t => t.id === activeTab)
    return (
      <div className="flex-1 flex items-center justify-center text-jarvis-muted pointer-events-none">
        <div className="text-center space-y-3">
          <div className="text-5xl opacity-40">{customTab?.icon || '🧩'}</div>
          <div className="text-lg font-medium">{customTab?.label || 'Page'}</div>
          <div className="text-sm opacity-60 max-w-xs">Add widgets in Settings → Tabs &amp; Layout to build this page.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-jarvis-bg overflow-hidden">
      <TitleBar status={status} onOpenSettings={openSettings} />
      <TabBar tabs={settings.tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {!isSettingsOpen && !(openFile && activeTab === 'code') && settings.sphereTabs[activeTab] !== false && (
          <SphereScene
            audioLevel={0}
            intensity={settings.sphereIntensity}
            particleCount={settings.particleCount}
            glowColor={settings.glowColor}
            bgColor={settings.sphereBgColor}
            rotationSpeed={settings.sphereRotationSpeed}
            pulseSpeedMult={settings.spherePulseSpeed}
            style={settings.sphereStyle}
            fluidColorA={settings.fluidColorA || '#0a2540'}
            fluidColorB={settings.fluidColorB || '#4a9eff'}
            showStarfield={settings.showStarfield !== false}
            showRings={settings.showRings !== false}
          />
        )}
        {/* Sidebar — toggle only on chat tab, not settings */}
        {showSidebar && (
          <Sidebar
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onRenameSession={handleRenameSession}
            onDeleteSession={handleDeleteSession}
            activeSessionId={activeSessionId}
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            personality={personality}
            onPersonalityChange={setPersonality}
            onSavePersonality={savePersonality}
          />
        )}
        {renderTabContent()}
        {activeTab === 'code' && (
          <FileBrowser isOpen={fileBrowserOpen} onToggle={() => setFileBrowserOpen(p => !p)} projectPath={activeProjectPath} onProjectPathChange={activeSessionId ? (p) => setSessionProjectPath(activeSessionId, p) : undefined} onFileOpen={handleFileOpen} />
        )}
        {/* Floating file-browser toggle button (top-right, avoids titlebar) */}
        <ChatOverlay
          isOpen={isChatOpen}
          onToggle={toggleChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          modelName={settings.model}
          providerName={settings.provider}
          contentInset={{
            left: showSidebar && sidebarOpen ? 256 : 0,
            // File panel only exists on the Code tab — don't inset the chat
            // on other tabs even if its open-state flag survived a tab switch.
            right: activeTab === 'code' && fileBrowserOpen ? 256 : 0,
          }}
          chatHeight={settings.chatHeight}
          onModelChange={(m) => updateSettings({ model: m })}
          onProviderChange={(p) => updateSettings({ provider: p })}
          savedProviders={settings.savedProviders}
          sessionName={sessions.find(s => s.id === activeSessionId)?.title}
          {...(toggleVoiceButton && { onMicToggle: toggleMic, micActive: micActive })}
        />
      </div>
    </div>
  )
}
