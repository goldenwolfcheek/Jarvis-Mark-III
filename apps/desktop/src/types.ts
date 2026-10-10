export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  streaming?: boolean
  toolCalls?: { name: string; status: 'running' | 'done' | 'error' }[]
}

export interface Tab {
  id: string
  label: string
  icon: string
  closable: boolean
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

export type WSMessageType = 'message' | 'delta' | 'done' | 'error' | 'set_session' | 'session_created' | 'session_changed' | 'thinking' | 'user_echo'

export interface WSMessage {
  type: WSMessageType
  content?: string
  session_id?: string
  message?: string
  message_id?: string
}
