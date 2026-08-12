// The rest countdown between sets. One button: NEXT.
//
// There is no "+30s more" any more, because there doesn't need to be — the timer
// keeps counting past zero and what the app learns is the moment you actually
// tapped NEXT. Sitting there longer IS asking for more rest, and the next
// session is planned from it.
//
// Two things make this more than a `setInterval`:
//
// 1. It is driven by wall-clock time, never by a tick counter. A backgrounded
//    tab gets its timers throttled hard, so counting ticks would drift by
//    minutes over a session.
// 2. The alerts come from `gymSfx` (pre-rendered WAV played through an <audio>
//    element), not from the WebAudio `sfx` the rest of the app uses — WebAudio
//    is suspended the moment the page is hidden, which is exactly when you need
//    the beep. `holdAudioSession` keeps a silent loop running for the length of
//    the rest so a hidden page is still allowed to make noise.
//
// What the app can honestly promise: with the screen ON (the Wake Lock in
// src/logic/wakeLock.ts keeps it on during a session) the alerts are exact. With
// the screen OFF, the beeps still fire, but a heavily throttled browser may run
// them a few seconds late.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { REST_MIN } from '../../logic/gym'
import { gymSfx, holdAudioSession } from '../../audio'

/** Seconds left when the "get ready" double blip fires. */
const WARN_AT = 10

export function RestTimer({
  seconds,
  upNext,
  onNext,
}: {
  seconds: number
  /** What NEXT will start — shown so you never tap it blind. */
  upNext?: ReactNode
  /** Tapped NEXT. The argument is how long you ACTUALLY rested — the number the app learns from. */
  onNext: (actualSeconds: number) => void
}) {
  const startedAt = useRef(Date.now())
  const target = Math.max(REST_MIN, seconds)
  const [now, setNow] = useState(Date.now())
  const warned = useRef(false)
  const rang = useRef(false)

  const elapsed = Math.floor((now - startedAt.current) / 1000)
  const left = target - elapsed

  useEffect(() => {
    holdAudioSession(true)
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => {
      window.clearInterval(id)
      holdAudioSession(false)
    }
  }, [])

  useEffect(() => {
    if (left <= WARN_AT && left > 0 && !warned.current) {
      warned.current = true
      gymSfx.warn()
    }
    if (left <= 0 && !rang.current) {
      rang.current = true
      gymSfx.go()
    }
  }, [left])

  const pct = Math.max(0, Math.min(1, elapsed / target))
  const over = left <= 0
  const r = 54
  const circumference = 2 * Math.PI * r

  return (
    <div className="card gym-rest">
      <div className="h2" style={{ margin: '0 0 6px' }}>{over ? '⏱️ Rest is over' : '⏱️ Resting'}</div>

      <svg viewBox="0 0 130 130" width="150" height="150" style={{ margin: '0 auto', display: 'block' }} role="img" aria-label={`${Math.abs(left)} seconds ${over ? 'over' : 'left'}`}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--bg2)" strokeWidth="9" />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke={over ? 'var(--gold)' : 'var(--blue)'}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
        <text x="65" y="60" textAnchor="middle" fontSize="30" fontWeight="900" fill="var(--text)">
          {over ? `+${Math.abs(left)}` : left}
        </text>
        <text x="65" y="80" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--muted)">
          {over ? 'SECONDS OVER' : 'SECONDS'}
        </text>
      </svg>

      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        {over ? 'Take longer if you need it — every extra second is being learned.' : `Asked for ${target}s, based on your own history.`}
      </p>

      {upNext && <div className="gym-upnext">{upNext}</div>}

      <button className="btn btn--blue" style={{ marginTop: 12 }} onClick={() => onNext(elapsed)}>
        ▶️ NEXT
      </button>
    </div>
  )
}
