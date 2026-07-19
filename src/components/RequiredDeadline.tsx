import { useState } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'
import { dayKey, daysUntil } from '../logic/dates'
import { requiredToday } from '../logic/wheel'
import { POSTPONE_OPTIONS, requiredReward } from '../logic/economy'

/**
 * The last-day reckoning. When a dated requirement reaches (or passes) its final
 * day and still isn't done, this modal blocks the app until a decision is made:
 * do it now, postpone the deadline, or drop the requirement for good.
 * One task at a time — decisions stack up rather than blur together.
 */
export function RequiredDeadline() {
  const { data, completeRequired, postponeRequired, dropRequired, completedTodayIds } = useStore()
  const [days, setDays] = useState(POSTPONE_OPTIONS[1])
  const [confirmDrop, setConfirmDrop] = useState(false)

  const today = dayKey()
  const doneIds = completedTodayIds()
  const task = requiredToday(data.tasks, today).find(
    (t) => t.requiredUntil !== undefined && daysUntil(t.requiredUntil, today) <= 0 && !doneIds.has(t.id),
  )
  if (!task) return null

  const left = daysUntil(task.requiredUntil!, today)
  const reward = requiredReward(task)

  function reset() {
    setConfirmDrop(false)
    setDays(POSTPONE_OPTIONS[1])
  }

  return (
    // no click-to-dismiss backdrop: a decision is mandatory
    <div className="overlay overlay--center">
      <div className="sheet" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 46 }}>⏰</div>
        <div className="h1" style={{ marginTop: 6 }}>
          {left < 0 ? `${-left} day${left === -1 ? '' : 's'} overdue!` : 'Last day!'}
        </div>
        <p className="muted" style={{ margin: '8px 0 4px' }}>
          This one runs out {left < 0 ? 'already' : 'today'}. No more putting it off — decide now.
        </p>
        <div className="h2" style={{ margin: '10px 0 16px' }}>
          {task.name}
        </div>

        <button
          className="btn"
          onClick={() => {
            sfx.bigWin()
            completeRequired(task.id)
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } })
            reset()
          }}
        >
          ✓ Done it! (+{reward} 🪙)
        </button>

        <div className="field" style={{ marginTop: 16, textAlign: 'left' }}>
          <label>Need more time? Push the deadline:</label>
          <div className="seg">
            {POSTPONE_OPTIONS.map((d) => (
              <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn--blue"
          onClick={() => {
            sfx.click()
            postponeRequired(task.id, days)
            reset()
          }}
        >
          ⏳ Postpone {days} day{days === 1 ? '' : 's'}
        </button>

        {confirmDrop ? (
          <button
            className="btn btn--red"
            style={{ marginTop: 8 }}
            onClick={() => {
              sfx.error()
              dropRequired(task.id)
              reset()
            }}
          >
            Yes — stop requiring it (stays a normal quest)
          </button>
        ) : (
          <button
            className="btn btn--ghost"
            style={{ marginTop: 8, color: 'var(--red)' }}
            onClick={() => setConfirmDrop(true)}
          >
            ✕ Drop this requirement
          </button>
        )}
      </div>
    </div>
  )
}
