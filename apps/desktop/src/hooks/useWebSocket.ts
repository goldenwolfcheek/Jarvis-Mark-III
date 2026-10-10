import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus, WSMessage } from '@/types'

const RECONNECT_BASE = 1000
const RECONNECT_MAX = 10000

export function useWebSocket(wsUrl = 'ws://localhost:11711/ws/chat') {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()
  const attemptRef = useRef(0)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setStatus('connecting')

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('connected')
        attemptRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data)
          setLastMessage(data)
        } catch { /* ignore malformed */ }
      }

      ws.onclose = () => {
        setStatus('disconnected')
        scheduleReconnect()
      }

      ws.onerror = () => {
        // Only close if still connecting (suppresses console noise)
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
      }
    } catch {
      scheduleReconnect()
    }
  }, [wsUrl])

  const scheduleReconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current)
    const delay = Math.min(RECONNECT_BASE * Math.pow(1.5, attemptRef.current), RECONNECT_MAX)
    attemptRef.current++
    reconnectRef.current = setTimeout(connect, delay)
  }, [connect])

  const sendMessage = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { status, lastMessage, sendMessage }
}
