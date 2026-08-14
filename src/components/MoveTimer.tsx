// The move clock, shared by all three games.
//
// One rule, deliberately simple: the clock belongs to whoever is holding the
// phone. It only ever runs on YOUR turn, on YOUR device — which is also the
// only device allowed to write that move — so two phones can never disagree
// about whose time is burning, and there is no server keeping score. A clock
// that expired while the app was closed simply expires the moment it is looked
// at again, which is what a clock means.
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../audio'

/** The last few seconds tick out loud — the panic is the point. */
const TICK_FROM = 5

export function MoveTimer({
  seconds,
  running,
  resetKey,
  onExpire,
  note,
}: {
  /** Total time for one move. 0 or less means no clock — render nothing. */
  seconds: number
  /** False while it isn't your move, an animation is playing, or a sheet is open. */
  running: boolean
  /** Changing this restarts the clock — pass the position's `seq` plus whose turn it is. */
  resetKey: string | number
  onExpire: () => void
  /** Small line under the bar, e.g. "random move at 0". */
  note?: string
}) {
  const [left, setLeft] = useState(seconds)
  // held in a ref so a re-rendered parent can't restart the clock just by
  // handing over a fresh closure
  const expire = useRef(onExpire)
  expire.current = onExpire

  useEffect(() => {
    setLeft(seconds)
    if (!running || seconds <= 0) return
    const deadline = Date.now() + seconds * 1000
    let lastWhole = seconds
    const id = window.setInterval(() => {
      const ms = deadline - Date.now()
      setLeft(Math.max(0, ms / 1000))
      const whole = Math.ceil(Math.max(0, ms / 1000))
      if (whole < lastWhole) {
        lastWhole = whole
        if (whole > 0 && whole <= TICK_FROM) sfx.tick()
      }
      if (ms <= 0) {
        window.clearInterval(id)
        expire.current()
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [running, seconds, resetKey])

  if (seconds <= 0) return null
  const frac = Math.max(0, Math.min(1, left / seconds))
  const shown = Math.ceil(left)
  const state = !running ? 'is-idle' : shown <= 3 ? 'is-panic' : frac <= 0.5 ? 'is-low' : ''

  return (
    <div className={`move-clock ${state}`}>
      <div className="move-clock-bar">
        <div className="move-clock-fill" style={{ width: `${frac * 100}%` }} />
      </div>
      <span className="move-clock-num">{running ? `${shown}s` : `${seconds}s`}</span>
      {note && <span className="move-clock-note">{note}</span>}
    </div>
  )
}
