import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Task } from '../types'
import { sfx } from '../audio'
import { dayKey, daysUntil } from '../logic/dates'
import { requiredToday } from '../logic/wheel'
import { REQUIRED_WARN_DAYS, requiredReward } from '../logic/economy'

/**
 * Today's non-negotiables, sitting beside the wheel. One tap marks an item done —
 * no ceremony, no wheel. Dated requirements shout louder as their last day nears.
 */
export function RequiredList() {
  const { data, completeRequired, completedTodayIds } = useStore()
  const today = dayKey()
  const doneIds = completedTodayIds()
  const items = useMemo(() => requiredToday(data.tasks, today), [data.tasks, today])
  // Done items leave the list, but only after a little exit ceremony: the row
  // flips green, shows its berries, then slides away. `leaving` keeps it
  // rendered for exactly that long.
  const [leaving, setLeaving] = useState<Set<string>>(new Set())

  const remaining = items.filter((t) => !doneIds.has(t.id)).length
  const visible = items.filter((t) => !doneIds.has(t.id) || leaving.has(t.id))

  function complete(id: string) {
    sfx.gem()
    completeRequired(id)
    setLeaving((s) => new Set(s).add(id))
    window.setTimeout(() => {
      setLeaving((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
    }, 1300)
  }

  if (items.length === 0) {
    return (
      <div className="required-panel">
        <div className="required-head">
          <span>✅ Must-dos</span>
        </div>
        <p className="muted" style={{ fontSize: 12, padding: '10px 2px' }}>
          Nothing required today. Mark a task “required” in the quest log to pin it here.
        </p>
      </div>
    )
  }

  return (
    <div className="required-panel">
      <div className="required-head">
        <span>✅ Must-dos</span>
        <span className={`required-count${remaining === 0 ? ' required-count--done' : ''}`}>
          {items.length - remaining}/{items.length}
        </span>
      </div>

      <div className="required-scroll">
        {visible.map((t) => (
          <RequiredRow
            key={t.id}
            task={t}
            done={doneIds.has(t.id)}
            leaving={leaving.has(t.id)}
            today={today}
            onToggle={() => {
              if (doneIds.has(t.id)) return
              complete(t.id)
            }}
          />
        ))}
      </div>

      {remaining === 0 && (
        <div className="required-clear">🎉 All must-dos cleared!</div>
      )}
    </div>
  )
}

function RequiredRow(props: { task: Task; done: boolean; leaving: boolean; today: string; onToggle: () => void }) {
  const { task, done, leaving, today, onToggle } = props
  const left = task.requiredUntil ? daysUntil(task.requiredUntil, today) : null
  const warning = left !== null && left <= REQUIRED_WARN_DAYS

  return (
    <button
      className={`required-row${done ? ' required-row--done' : ''}${leaving ? ' required-row--leaving' : ''}${warning && !done ? ' required-row--warn' : ''}`}
      onClick={onToggle}
      disabled={done}
    >
      <span className={`required-box${done ? ' required-box--on' : ''}`}>{done ? '✓' : ''}</span>
      <span className="required-body">
        {/* wraps to as many lines as it needs — the title must always be readable */}
        <span className="required-name">{task.name}</span>
        <span className="required-meta">
          {done ? (
            <span className="required-earned">+{requiredReward(task)} 🪙</span>
          ) : (
            <span className="muted">+{requiredReward(task)} 🪙 · miss = −{requiredReward(task)}</span>
          )}
          {left !== null && (
            <span className={warning ? 'required-deadline required-deadline--warn' : 'required-deadline'}>
              {left < 0 ? 'overdue!' : left === 0 ? '⏰ last day!' : `${left}d left`}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
