// The rest countdown between sets. It ends itself.
//
// The default is ONE CLICK FOR THE WHOLE EXERCISE: you tap DONE on a set and
// the app carries you through rest, through setup, and into the next set
// without asking. So rest fires NEXT itself the moment it hits zero.
//
// Two escapes, both of them honest:
//
// - SKIP ends rest early, and the short rest is what gets learned.
// - PAUSE stops the auto-advance. Paused time is NOT a hole in the session:
//   it counts as extra rest, exactly as if you had sat there with the timer
//   running, and the next session is planned from the longer number.
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
import type { ExerciseDemo as Demo } from '../../types'
import { REST_MIN } from '../../logic/gym'
import { gymSfx, holdAudioSession } from '../../audio'
import { ExerciseDemo } from './ExerciseDemo'

/** Seconds left when the "get ready" double blip fires. */
const WARN_AT = 10

/** What one tap of +TIME buys — long enough to finish reading a brief. */
const ADD_SEC = 30

/**
 * The next movement, drawn big. Rest is exactly when you should be walking over
 * and loading the thing, and a sentence can't tell you which bench that is —
 * the animation can, from across the room.
 */
const NEXT_ART = 170

export function RestTimer({
  seconds,
  upNext,
  nextBrief,
  nextDemo,
  nextEmoji,
  footNote,
  onNext,
}: {
  seconds: number
  /** What NEXT will start — shown so you never tap it blind. */
  upNext?: ReactNode
  /**
   * The brief for the movement that is coming: how to do it, the rep range, why
   * it's there. Rest is the only stretch of a session where you have the hands
   * and the attention to read it, so it is here rather than only on the card
   * that appears once rest is already over. If it runs long, +TIME buys you
   * more of it — and the extra seconds are real rest, not a fudge.
   */
  nextBrief?: ReactNode
  /** The animation for what's coming, played big while you rest. */
  nextDemo?: Demo
  nextEmoji?: string
  /** Rides above NEXT in the foot bar — the runner puts the session countdown here. */
  footNote?: ReactNode
  /**
   * Rest is over. The argument is how long you ACTUALLY rested — wall-clock
   * time including anything spent paused — and it is the number the app learns
   * from. Fired automatically at zero, or early when you tap SKIP.
   */
  onNext: (actualSeconds: number) => void
}) {
  const startedAt = useRef(Date.now())
  /**
   * Seconds added by hand with +TIME, usually because the brief for the next
   * movement is still being read. It moves the target, so the countdown really
   * does wait — and since the number handed back is wall clock, the longer rest
   * is what the next session is planned from. Nothing is pretended away.
   */
  const [addedSec, setAddedSec] = useState(0)
  const target = Math.max(REST_MIN, seconds) + addedSec
  const [now, setNow] = useState(Date.now())
  const warned = useRef(false)
  const rang = useRef(false)
  const fired = useRef(false)

  // Paused time is still rest. `pausedMs` is the total already banked from
  // earlier pauses; `pausedAt` is the start of the one in progress. The
  // countdown runs on time NOT paused, so it waits for you — but `elapsed`,
  // the number handed back, is plain wall clock and so includes it all.
  const [pausedMs, setPausedMs] = useState(0)
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const paused = pausedAt !== null

  const elapsed = Math.floor((now - startedAt.current) / 1000)
  const pausedSoFar = pausedMs + (pausedAt === null ? 0 : now - pausedAt)
  const counted = Math.floor((now - startedAt.current - pausedSoFar) / 1000)
  const left = target - counted

  // the whole point of the screen: at zero it moves on by itself
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext
  useEffect(() => {
    if (paused || left > 0 || fired.current) return
    fired.current = true
    onNextRef.current(elapsed)
  }, [left, paused, elapsed])

  useEffect(() => {
    holdAudioSession(true)
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => {
      window.clearInterval(id)
      holdAudioSession(false)
    }
  }, [])

  useEffect(() => {
    if (paused) return
    if (left <= WARN_AT && left > 0 && !warned.current) {
      warned.current = true
      gymSfx.warn()
    }
    if (left <= 0 && !rang.current) {
      rang.current = true
      gymSfx.go()
    }
  }, [left, paused])

  const pct = Math.max(0, Math.min(1, counted / target))
  const over = left <= 0
  const r = 54
  const circumference = 2 * Math.PI * r

  return (
    <>
      <div className="card gym-rest">
        <div className="h2" style={{ margin: '0 0 6px' }}>
          {paused ? '⏸️ Paused' : over ? '⏱️ Rest is over' : '⏱️ Resting'}
        </div>

        {/* the clock and what's coming, side by side — rest is when you walk
            over and load the next thing, so the next thing is on screen */}
        <div className="gym-rest-row">
          <svg
            viewBox="0 0 130 130"
            width="140"
            height="140"
            style={{ display: 'block', flex: 'none' }}
            role="img"
            aria-label={`${Math.abs(left)} seconds ${over ? 'over' : 'left'}`}
          >
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
              {Math.max(0, left)}
            </text>
            <text x="65" y="80" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--muted)">
              {paused ? 'HELD' : 'SECONDS'}
            </text>
          </svg>

          {nextEmoji && (
            <div className="gym-next-art">
              <ExerciseDemo demo={nextDemo} emoji={nextEmoji} size={NEXT_ART} autoPlay />
            </div>
          )}
        </div>

        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {paused
            ? `Held for ${Math.round(pausedSoFar / 1000)}s — it all counts as rest. Resume when you're ready.`
            : addedSec > 0
              ? `${target}s — the ${target - addedSec}s asked for plus ${addedSec}s you added. It all counts as rest.`
              : `Asked for ${target}s, based on your own history. The next set starts on its own.`}
        </p>

        {upNext && <div className="gym-upnext">{upNext}</div>}

        {/* left-aligned on purpose: the card above is centred numbers, this is
            prose, and centred prose is unreadable at a glance */}
        {nextBrief && <div className="gym-rest-brief">{nextBrief}</div>}

        <div className="gym-rest-actions">
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              gymSfx.logged()
              if (pausedAt === null) setPausedAt(Date.now())
              else {
                setPausedMs(pausedMs + (Date.now() - pausedAt))
                setPausedAt(null)
              }
            }}
          >
            {paused ? '▶️ Resume rest' : '⏸️ Pause (counts as rest)'}
          </button>
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              gymSfx.logged()
              // the bells belong to the new zero, not the old one
              warned.current = false
              rang.current = false
              setAddedSec((n) => n + ADD_SEC)
            }}
          >
            +{ADD_SEC}s to read
          </button>
        </div>
      </div>
      <Foot
        elapsed={elapsed}
        footNote={footNote}
        onNext={(s) => {
          if (fired.current) return
          fired.current = true
          onNext(s)
        }}
      />
    </>
  )
}

/**
 * SKIP REST, in the pinned foot bar (§18c-1) — big enough to hit with a foot,
 * and always on screen however far the card above it has been scrolled. It is
 * no longer the way forward (rest ends itself); it is the way to go early.
 */
function Foot({ elapsed, footNote, onNext }: { elapsed: number; footNote?: ReactNode; onNext: (s: number) => void }) {
  return (
    <div className="gym-foot">
      {footNote}
      <button className="btn btn--blue" onClick={() => onNext(elapsed)}>
        ⏭ Skip rest — start now
      </button>
    </div>
  )
}
