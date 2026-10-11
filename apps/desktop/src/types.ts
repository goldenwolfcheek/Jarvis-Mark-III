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

export type WSMessageType = 'message' | 'delta' | 'done' | 'error' | 'set_session' | 'session_created' | 'session_changed' | 'thinking' | 'user_echo' | 'settings' | 'tool'

export interface WSMessage {
  type: WSMessageType
  content?: string
  session_id?: string
  message?: string
  message_id?: string
  // Optional chatter the backend tolerates; forwarded on 'message' sends
  personality?: string
  provider?: string
  model?: string
  api_key?: string
  base_url?: string
  temperature?: number
  top_p?: number
  max_tokens?: number
}
