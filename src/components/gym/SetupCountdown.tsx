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

export function SetupCountdown({ seconds = SETUP_SEC, onDone }: { seconds?: number; onDone: () => void }) {
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
    if (left <= WARN_AT && left > 0 && !warned.current) {
      warned.current = true
      gymSfx.warn()
    }
    if (left <= 0 && !fired.current) {
      fired.current = true
      gymSfx.go()
      onDone()
    }
  }, [left, onDone])

  const pct = Math.max(0, Math.min(1, left / seconds))

  return (
    <div className="gym-setup" role="timer" aria-label={`${left} seconds to get set up`}>
      <div className="gym-setup-head">
        <span>🔧 Get set up</span>
        <strong>{left}s</strong>
      </div>
      <div className="gym-setup-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="muted" style={{ fontSize: 11, margin: '6px 0 0' }}>
        Walk over, load it, get in position. The set clock starts at zero — or the second you tap GO.
      </p>
    </div>
  )
}
