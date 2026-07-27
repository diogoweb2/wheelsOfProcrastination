// Thin wrapper over the browser's Web Speech API. Chrome on Android (our PWA
// target) and Safari 14.5+ have it; everywhere else `supported` is false and the
// caller should simply not render a mic.
import { useCallback, useEffect, useRef, useState } from 'react'

// TS's DOM lib doesn't ship these, and we don't want a dependency just for types.
type SpeechResult = { isFinal: boolean; 0: { transcript: string } }
type SpeechEvent = { resultIndex: number; results: { length: number } & Record<number, SpeechResult> }
type SpeechErrorEvent = { error: string }
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechEvent) => void) | null
  onerror: ((e: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function friendlyError(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Mic permission denied — allow it in the browser settings.'
  if (code === 'no-speech') return 'Didn\'t catch that. Try again!'
  if (code === 'audio-capture') return 'No microphone found.'
  if (code === 'network') return 'Speech needs the internet — you seem offline.'
  return 'Mic hiccup. Try again!'
}

export function useSpeechRecognition(opts: {
  lang?: string
  onResult: (transcript: string, isFinal: boolean) => void
}) {
  const { lang = 'en-GB', onResult } = opts
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<Recognition | null>(null)
  // Keep the latest callback without re-creating the recogniser on every render.
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const supported = getCtor() !== null

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor || recRef.current) return
    setError(null)
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      let transcript = ''
      let isFinal = false
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
        if (e.results[i].isFinal) isFinal = true
      }
      onResultRef.current(transcript.trim(), isFinal)
    }
    rec.onerror = (e) => setError(friendlyError(e.error))
    rec.onend = () => {
      recRef.current = null
      setListening(false)
    }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      recRef.current = null
      setError(friendlyError('unknown'))
    }
  }, [lang])

  // Never leave the mic open when the sheet closes.
  useEffect(() => {
    return () => {
      const rec = recRef.current
      if (!rec) return
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      rec.abort()
      recRef.current = null
    }
  }, [])

  return { supported, listening, error, start, stop }
}
