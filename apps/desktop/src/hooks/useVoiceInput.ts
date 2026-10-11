import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Speech-to-text via the Web Speech API (Chromium/Electron ships it).
 * Single shared recognizer instance — App mounts one hook and passes
 * listening/handlers down to any UI (in-chat mic, floating mic button).
 * Auto-sends the transcript on final result via onTranscript.
 */

// Minimal typing for the webkit-prefixed SpeechRecognition implementation
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike { 0: SpeechRecognitionAlternativeLike; isFinal: boolean; length: number }
interface SpeechRecognitionEventLike extends Event { results: { length: number; [i: number]: SpeechRecognitionResultLike }; resultIndex: number }
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onerror: ((ev: Event & { error?: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

interface VoiceInputOptions {
  lang: string
  onTranscript: (text: string) => void
  onInterim?: (text: string) => void
}

export function useVoiceInput({ lang, onTranscript, onInterim }: VoiceInputOptions) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Hold mutable versions of callbacks so re-renders don't restart the recognizer
  const onTranscriptRef = useRef(onTranscript)
  const onInterimRef = useRef(onInterim)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  useEffect(() => { onInterimRef.current = onInterim }, [onInterim])
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const wantListenRef = useRef(false)

  const getRecognition = useCallback((): SpeechRecognitionLike | null => {
    if (recognitionRef.current) return recognitionRef.current
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return null
    const rec = new Ctor()
    rec.lang = langRef.current
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev) => {
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i]
        if (res.isFinal) {
          const text = res[0].transcript.trim()
          if (text) onTranscriptRef.current(text)
        } else {
          interim += res[0].transcript
        }
      }
      onInterimRef.current?.(interim)
    }
    rec.onerror = (ev) => {
      const code = (ev as { error?: string }).error
      if (code === 'no-speech' || code === 'aborted') return // benign
      setError(code === 'not-allowed' ? 'Microphone permission denied' : `Speech recognition error: ${code}`)
      wantListenRef.current = false
      setListening(false)
    }
    rec.onend = () => {
      // Chromium stops after each utterance in continuous mode sometimes;
      // restart if the user still wants to listen.
      if (wantListenRef.current) {
        try { rec.start(); return } catch { /* already started — fine */ }
      }
      setListening(false)
    }
    recognitionRef.current = rec
    return rec
  }, [])

  // Keep a ref of lang so the recognizer picks it up on next start
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
    if (recognitionRef.current) recognitionRef.current.lang = lang
  }, [lang])

  const start = useCallback(() => {
    const rec = getRecognition()
    if (!rec) { setError('Speech recognition is not available in this build of Electron'); return }
    setError(null)
    wantListenRef.current = true
    try { rec.start() } catch { /* AlreadyStarted — means it's already running */ }
    setListening(true)
  }, [getRecognition])

  const stop = useCallback(() => {
    wantListenRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (wantListenRef.current) stop()
    else start()
  }, [start, stop])

  useEffect(() => () => {
    wantListenRef.current = false
    try { recognitionRef.current?.abort() } catch {}
  }, [])

  return { listening, error, start, stop, toggle }
}
