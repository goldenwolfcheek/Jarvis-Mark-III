import { useState, useCallback, useEffect } from 'react'

// ── Default Settings ─────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  // Model
  model: 'big-pickle',
  provider: 'opencode-zen',
  apiKey: '',
  baseUrl: '',
  contextLength: undefined as number | undefined,
  maxTokens: undefined as number | undefined,
  savedProviders: [] as { provider: string; model: string; apiKey: string; label: string }[],

  // Tabs
  tabs: [
    { id: 'chat', label: 'Chat', icon: '💬', closable: false },
    { id: 'code', label: 'Code', icon: '⚡', closable: true },
    { id: 'news', label: 'News', icon: '📰', closable: true },
    { id: 'stocks', label: 'Stocks', icon: '📈', closable: true },
  ] as { id: string; label: string; icon: string; closable: boolean }[],

  // Page layouts (keyed by tab id — defines what widgets are on each page)
  pageLayouts: {} as Record<string, { widgets: string[] }>,

  // Per-tab animated-sphere visibility (default: on everywhere)
  sphereTabs: { chat: true, code: true, news: false, stocks: false } as Record<string, boolean>,

  // Voice
  voiceEnabled: false,
  wakeWord: 'Hey Jarvis',
  ttsProvider: 'edge',
  sttProvider: 'local',

  // Theme
  sphereIntensity: 1.0,
  particleCount: 1500,
  glowColor: '#2763d1',
  uiScale: 1.0,

  // Chat
  chatHeight: 60,
  showTimestamps: true,
  streamingSpeed: 50,

  // Memory
  personality: 'You are Jarvis, a helpful AI assistant.',
  userProfile: '',
  vaultPath: '',

  // Notifications
  notifications: {
    desktopEnabled: true,
    soundEnabled: true,
    onMessage: true,
    onError: true,
    onTaskComplete: true,
    onCron: false,
  } as { desktopEnabled: boolean; soundEnabled: boolean; onMessage: boolean; onError: boolean; onTaskComplete: boolean; onCron: boolean },

  // UI state (persisted so panels/tabs survive restarts)
  activeTab: 'chat',
  sidebarOpen: false,
  chatOpenPerTab: {} as Record<string, boolean>,

  // Advanced
  backendUrl: 'http://localhost:11711',
  wsUrl: 'ws://localhost:11711/ws/chat',
}

export type Settings = typeof DEFAULT_SETTINGS

const STORAGE_KEY = 'jarvis-mark-iii-settings'

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Repair pre-icon tabs so built-in tabs always show their emoji
      const iconDefaults: Record<string, string> = { chat: '💬', code: '⚡', news: '📰', stocks: '📈' }
      if (Array.isArray(parsed.tabs)) {
        parsed.tabs = parsed.tabs.map((t: { id: string; icon: string }) =>
          (!t.icon && iconDefaults[t.id]) ? { ...t, icon: iconDefaults[t.id] } : t)
      }
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(settings: Settings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch {}
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings)

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial }
      saveSettings(next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    const fresh = { ...DEFAULT_SETTINGS }
    saveSettings(fresh)
    setSettingsState(fresh)
  }, [])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) }) } catch {}
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return { settings, updateSettings, resetSettings }
}
