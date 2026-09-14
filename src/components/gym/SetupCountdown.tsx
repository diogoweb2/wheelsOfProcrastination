// The gap between "rest is over" and "the set has started".
//
// Tapping NEXT used to start the clock on the next set immediately, which meant
// the walk to the rack, the plate change and the mat unrolling were all measured
// as work. This gives you a fixed 15s to get into position — the set clock only
// starts when the countdown hits zero (or the moment you tap GO).
//
// Same wall-clock discipline as RestTimer: never a tick counter, and the audio
// session is held open so the "GO" beep still fires on a hidden page.
import { useEffect, useRef, useState } from 'react'
import { gymSfx, holdAudioSession } from '../../audio'

/** How long you get to set up before the next set is timed. */
export const SETUP_SEC = 15

/** Seconds left when the "nearly" blip fires. */
const WARN_AT = 5

/**
 * The same countdown, shorter, between the two sides of a clocked per-side hold
 * — long enough to roll over and get set, short enough that the second side is
 * still the same set.
 */
export const SIDE_SEC = 5

export function SetupCountdown({
  seconds = SETUP_SEC,
  onDone,
  title = '🔧 Get set up',
  note = 'Walk over, load it, get in position. The set clock starts at zero — or the second you tap GO.',
}: {
  seconds?: number
  onDone: () => void
  title?: string
  note?: string
}) {
  const startedAt = useRef(Date.now())
  const [now, setNow] = useState(Date.now())
  const warned = useRef(false)
  const fired = useRef(false)

  const left = Math.max(0, seconds - Math.floor((now - startedAt.current) / 1000))

  useEffect(() => {
    holdAudioSession(true)
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => {
      window.clearInterval(id)
      holdAudioSession(false)
    }
  }, [])

  useEffect(() => {
    // a 5s side change is already inside the warning window — one beep at the
    // end of it is the whole signal, two is noise
    if (seconds > WARN_AT && left <= WARN_AT && left > 0 && !warned.current) {
      warned.current = true
      gymSfx.warn()
    }
    if (left <= 0 && !fired.current) {
      fired.current = true
      gymSfx.go()
      onDone()
    }
  }, [left, seconds, onDone])

  const pct = Math.max(0, Math.min(1, left / seconds))

  return (
    <div className="gym-setup" role="timer" aria-label={`${left} seconds to get set up`}>
      <div className="gym-setup-head">
        <span>{title}</span>
        <strong>{left}s</strong>
      </div>
      <div className="gym-setup-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="muted" style={{ fontSize: 11, margin: '6px 0 0' }}>{note}</p>
    </div>
  )
}
