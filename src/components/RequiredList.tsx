import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Task } from '../types'
import { sfx } from '../audio'
import { dayKey, daysUntil } from '../logic/dates'
import { dormantReason, dormantRequired, isStudyTask, requiredToday } from '../logic/wheel'
import { QUIZ_TASK_PREFIX } from '../logic/quiz'
import { REQUIRED_WARN_DAYS, requiredReward } from '../logic/economy'

/**
 * Today's non-negotiables, sitting beside the wheel. One tap marks an item done —
 * no ceremony, no wheel. Dated requirements shout louder as their last day nears.
 */
export function RequiredList({ onTrain }: { onTrain?: (topicId: string) => void } = {}) {
  const { data, completeRequired, completedTodayIds, setDoToday } = useStore()
  const today = dayKey()
  const doneIds = completedTodayIds()
  const items = useMemo(() => requiredToday(data.tasks, today, data.completions), [data.tasks, today, data.completions])
  const dormant = useMemo(() => dormantRequired(data.tasks, today, data.completions), [data.tasks, today, data.completions])
  const [picking, setPicking] = useState(false)
  // A done item STAYS on the list all day, ticked and struck through — the whole
  // point of a checklist is seeing what you already cleared, and a vanishing row
  // makes the "3/5" count disagree with what's on screen. `justDone` only holds
  // the little green celebration for a beat before the row settles.
  const [justDone, setJustDone] = useState<Set<string>>(new Set())

  const remaining = items.filter((t) => !doneIds.has(t.id)).length

  function complete(id: string) {
    sfx.gem()
    completeRequired(id)
    setJustDone((s) => new Set(s).add(id))
    window.setTimeout(() => {
      setJustDone((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
    }, 1300)
  }

  function pullIn(id: string) {
    sfx.click()
    setDoToday(id, true)
    setPicking(false)
  }

  // "Do it today anyway" — pulls a resting/out-of-window must-do onto the list.
  const extras =
    dormant.length === 0 ? null : (
      <div className="required-extra">
        <button className="required-extra-open" onClick={() => { sfx.click(); setPicking((p) => !p) }}>
          {picking ? '✕ Never mind' : `＋ Do one of the other ${dormant.length} today`}
        </button>
        {picking && (
          <div className="required-extra-list">
            {dormant.map((t) => (
              <button key={t.id} className="required-extra-row" onClick={() => pullIn(t.id)}>
                <span className="required-name">{t.name}</span>
                <span className="muted">{dormantReason(t, today, data.completions)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )

  if (items.length === 0) {
    return (
      <div className="required-panel">
        <div className="required-head">
          <span>✅ Must-dos</span>
        </div>
        <p className="muted" style={{ fontSize: 12, padding: '10px 2px' }}>
          Nothing required today. Mark a task “required” in the quest log to pin it here.
        </p>
        {extras}
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
        {items.map((t) => (
          <RequiredRow
            key={t.id}
            task={t}
            done={doneIds.has(t.id)}
            celebrating={justDone.has(t.id)}
            today={today}
            onToggle={() => {
              if (doneIds.has(t.id)) return
              complete(t.id)
            }}
            onTrain={
              onTrain && isStudyTask(t)
                ? () => {
                    // Tapping 🏫 IS doing the study must-do: tick it on the way
                    // into the training round, so the row isn't left unchecked.
                    if (doneIds.has(t.id)) sfx.click()
                    else complete(t.id)
                    onTrain(t.id.slice(QUIZ_TASK_PREFIX.length))
                  }
                : undefined
            }
            onRemove={
              t.doTodayDay === today
                ? () => {
                    sfx.click()
                    setDoToday(t.id, false)
                  }
                : undefined
            }
          />
        ))}
      </div>

      {remaining === 0 && (
        <div className="required-clear">🎉 All must-dos cleared!</div>
      )}
      {extras}
    </div>
  )
}

function RequiredRow(props: {
  task: Task
  done: boolean
  celebrating: boolean
  today: string
  onToggle: () => void
  onTrain?: () => void
  onRemove?: () => void
}) {
  const { task, done, celebrating, today, onToggle, onTrain, onRemove } = props
  const left = task.requiredUntil ? daysUntil(task.requiredUntil, today) : null
  const warning = left !== null && left <= REQUIRED_WARN_DAYS

  // Study must-dos get a shortcut straight into the topic's training round —
  // the checkbox still belongs to the user, the button just saves two taps.
  const row = (
    <button
      className={`required-row${done ? ' required-row--done' : ''}${celebrating ? ' required-row--celebrate' : ''}${warning && !done ? ' required-row--warn' : ''}`}
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

  // A done study row keeps its 🏫 shortcut (more training is always allowed) so
  // it doesn't change width the moment it's ticked. ↩ goes: you can't un-do it.
  const showRemove = onRemove && !done
  if (!onTrain && !showRemove) return row
  return (
    <div className="required-row-wrap">
      {row}
      {onTrain && (
        <button className="required-train" onClick={onTrain} aria-label="Start training">
          🏫
        </button>
      )}
      {showRemove && (
        <button className="required-train" onClick={onRemove} aria-label="Take back off today's list">
          ↩
        </button>
      )}
    </div>
  )
}
