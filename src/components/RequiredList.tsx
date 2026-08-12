import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Task } from '../types'
import { sfx } from '../audio'
import { addDays, dayKey, daysUntil, prettyDay } from '../logic/dates'
import { carriedRequired, dormantReason, dormantRequired, isEveryDayRequired, isStudyTask, missedSince, requiredToday } from '../logic/wheel'
import { QUIZ_TASK_PREFIX } from '../logic/quiz'
import { POSTPONE_OPTIONS, REQUIRED_WARN_DAYS, requiredReward } from '../logic/economy'

/**
 * Today's non-negotiables, sitting beside the wheel. One tap marks an item done —
 * no ceremony, no wheel. Dated requirements shout louder as their last day nears.
 */
export function RequiredList({ onTrain }: { onTrain?: (topicId: string) => void } = {}) {
  const { data, completeRequired, completedTodayIds, setDoToday, delayRequired, skipRequired } = useStore()
  const today = dayKey()
  const doneIds = completedTodayIds()
  const items = useMemo(() => requiredToday(data.tasks, today, data.completions), [data.tasks, today, data.completions])
  // Scheduled must-dos whose day slipped by unticked: they keep their place on
  // the checklist, in red, until they're actually done.
  const carried = useMemo(
    () => carriedRequired(data.tasks, today, data.completions),
    [data.tasks, today, data.completions],
  )
  const dormant = useMemo(() => dormantRequired(data.tasks, today, data.completions), [data.tasks, today, data.completions])
  const [picking, setPicking] = useState(false)
  // The open decision sheet, if any: which scheduled must-do is being settled.
  const [deciding, setDeciding] = useState<string | null>(null)
  // A ticked item leaves the list — what's left on screen is what's left to do.
  // `justDone` keeps the row up for the green celebration beat before it goes,
  // and the "3/5" header still counts today's done items, so nothing is lost.
  const [justDone, setJustDone] = useState<Set<string>>(new Set())

  // Everything the checklist is responsible for today: what's due, plus what was
  // due earlier and never got ticked.
  const all = useMemo(() => [...items, ...carried], [items, carried])
  // How late each scheduled must-do is, if at all (null = up to date).
  const missed = useMemo(
    () => new Map(all.map((t) => [t.id, missedSince(t, today, data.completions, data.tasks)])),
    [all, today, data.completions, data.tasks],
  )
  const remaining = all.filter((t) => !doneIds.has(t.id)).length
  const shown = all.filter((t) => !doneIds.has(t.id) || justDone.has(t.id))
  // Two lists, because a daily habit and a "the 11th of every month" chore need
  // different attention: the scheduled one is the one you can actually miss.
  const scheduled = shown
    .filter((t) => !isEveryDayRequired(t))
    .sort((a, b) => (missed.get(a.id) ?? '9999').localeCompare(missed.get(b.id) ?? '9999')) // most overdue first
  const daily = shown.filter(isEveryDayRequired)
  const scheduledTotal = all.filter((t) => !isEveryDayRequired(t)).length
  const dailyTotal = all.length - scheduledTotal
  const scheduledDone = scheduledTotal - scheduled.filter((t) => !doneIds.has(t.id)).length
  const dailyDone = dailyTotal - daily.filter((t) => !doneIds.has(t.id)).length
  const lateCount = all.filter((t) => !doneIds.has(t.id) && missed.get(t.id)).length
  const decidingTask = all.find((t) => t.id === deciding) ?? null

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

  if (all.length === 0) {
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

  function renderRow(t: Task) {
    return (
      <RequiredRow
        key={t.id}
        task={t}
        done={doneIds.has(t.id)}
        celebrating={justDone.has(t.id)}
        lateSince={doneIds.has(t.id) ? null : (missed.get(t.id) ?? null)}
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
        // A scheduled must-do can't just be ignored: done, delayed, or written
        // off. Daily habits have no decision to take — tomorrow brings a new one.
        onDecide={
          isEveryDayRequired(t) || isStudyTask(t)
            ? undefined
            : () => {
                sfx.click()
                setDeciding(t.id)
              }
        }
      />
    )
  }

  return (
    <div className="required-stack">
      {/* Scheduled first: these are the ones a day can swallow whole. An emptied
          panel disappears completely — only what's left to do stays on screen. */}
      {scheduled.length > 0 && (
        <div className={`required-panel${lateCount > 0 ? ' required-panel--late' : ''}`}>
          <div className="required-head">
            <span>🗓️ Scheduled must-dos</span>
            <span className={`required-count${scheduledDone === scheduledTotal ? ' required-count--done' : ''}`}>
              {scheduledDone}/{scheduledTotal}
            </span>
          </div>
          {lateCount > 0 && (
            <div className="required-alarm">
              ⚠️ {lateCount === 1 ? '1 scheduled must-do is LATE' : `${lateCount} scheduled must-dos are LATE`} — they stay
              here until they're done.
            </div>
          )}
          <div className="required-scroll">{scheduled.map(renderRow)}</div>
        </div>
      )}

      {daily.length > 0 && (
        <div className="required-panel">
          <div className="required-head">
            <span>🔁 Every day</span>
            <span className={`required-count${dailyDone === dailyTotal ? ' required-count--done' : ''}`}>
              {dailyDone}/{dailyTotal}
            </span>
          </div>
          <div className="required-scroll">{daily.map(renderRow)}</div>
        </div>
      )}

      {decidingTask && (
        <DecisionSheet
          task={decidingTask}
          lateSince={missed.get(decidingTask.id) ?? null}
          today={today}
          onClose={() => setDeciding(null)}
          onDone={() => {
            complete(decidingTask.id)
            setDeciding(null)
          }}
          onDelay={(days) => {
            sfx.click()
            delayRequired(decidingTask.id, days)
            setDeciding(null)
          }}
          onSkip={() => {
            sfx.click()
            skipRequired(decidingTask.id)
            setDeciding(null)
          }}
        />
      )}

      {remaining === 0 && (
        <div className="required-panel">
          <div className="required-clear">🎉 All must-dos cleared!</div>
        </div>
      )}
      {extras}
    </div>
  )
}

/** Nicely-worded delay lengths, so "3d" isn't the only thing on offer. */
const DELAY_LABEL: Record<number, string> = { 1: 'Tomorrow', 3: '3 days', 7: 'A week', 14: '2 weeks' }

/**
 * The reckoning for one scheduled must-do: did it, pushing it, or not doing it.
 * A missed quest keeps nagging in red until one of these three is chosen — which
 * is the point: ignoring it isn't a decision, and the app won't let it become one.
 */
function DecisionSheet(props: {
  task: Task
  lateSince: string | null
  today: string
  onClose: () => void
  onDone: () => void
  onDelay: (days: number) => void
  onSkip: () => void
}) {
  const { task, lateSince, today, onClose, onDone, onDelay, onSkip } = props
  const [delaying, setDelaying] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const lateBy = lateSince ? -daysUntil(lateSince, today) : 0

  return (
    <div className="overlay overlay--center" onClick={onClose}>
      <div className="sheet" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 40 }}>{lateSince ? '⚠️' : '🗓️'}</div>
        <div className="h2" style={{ margin: '8px 0 2px' }}>{task.name}</div>
        <p className="muted" style={{ margin: '0 0 14px', fontSize: 12 }}>
          {lateSince
            ? `Due ${prettyDay(lateSince)} — ${lateBy === 1 ? '1 day late' : `${lateBy} days late`}. Pick one, it won't go away by itself.`
            : 'Due today. Pick one, it won’t go away by itself.'}
        </p>

        <button className="btn" onClick={onDone}>
          ✓ Done it! (+{requiredReward(task)} 🪙)
        </button>

        {delaying ? (
          <div className="field" style={{ marginTop: 14, textAlign: 'left' }}>
            <label>Back on the list in:</label>
            <div className="seg seg--act">
              {POSTPONE_OPTIONS.map((d) => (
                <button key={d} onClick={() => onDelay(d)}>
                  {DELAY_LABEL[d] ?? `${d}d`}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 11, margin: '6px 2px 0' }}>
              It comes back {prettyDay(addDays(today, POSTPONE_OPTIONS[0]))} at the earliest, still just as late. No fine while it waits.
            </p>
          </div>
        ) : (
          <button className="btn btn--blue" style={{ marginTop: 8 }} onClick={() => setDelaying(true)}>
            ⏳ Delay it
          </button>
        )}

        {confirmSkip ? (
          <button className="btn btn--red" style={{ marginTop: 8 }} onClick={onSkip}>
            {task.repeats ? 'Yes — skip this one (it returns next time)' : 'Yes — drop it for good'}
          </button>
        ) : (
          <button className="btn btn--ghost" style={{ marginTop: 8, color: 'var(--red)' }} onClick={() => setConfirmSkip(true)}>
            ✕ Won't do it
          </button>
        )}

        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  )
}

function RequiredRow(props: {
  task: Task
  done: boolean
  celebrating: boolean
  /** Day it was first missed (YYYY-MM-DD), or null if it isn't running late. */
  lateSince: string | null
  today: string
  onToggle: () => void
  onTrain?: () => void
  onRemove?: () => void
  /** Opens the done / delay / won't-do sheet (scheduled must-dos only). */
  onDecide?: () => void
}) {
  const { task, done, celebrating, lateSince, today, onToggle, onTrain, onRemove, onDecide } = props
  const left = task.requiredUntil ? daysUntil(task.requiredUntil, today) : null
  const warning = left !== null && left <= REQUIRED_WARN_DAYS
  const lateBy = lateSince ? -daysUntil(lateSince, today) : 0

  // Study must-dos get a shortcut straight into the topic's training round —
  // the checkbox still belongs to the user, the button just saves two taps.
  const row = (
    <button
      className={`required-row${done ? ' required-row--done' : ''}${celebrating ? ' required-row--celebrate' : ''}${warning && !done ? ' required-row--warn' : ''}${lateSince && !done ? ' required-row--late' : ''}`}
      onClick={onToggle}
      disabled={done}
    >
      <span className={`required-box${done ? ' required-box--on' : ''}${lateSince && !done ? ' required-box--late' : ''}`}>
        {done ? '✓' : lateSince ? '!' : ''}
      </span>
      <span className="required-body">
        {/* wraps to as many lines as it needs — the title must always be readable */}
        <span className="required-name">{task.name}</span>
        {lateSince && !done && (
          <span className="required-late">
            ⚠️ MISSED — due {prettyDay(lateSince)}, {lateBy === 1 ? '1 day late' : `${lateBy} days late`}
          </span>
        )}
        <span className="required-meta">
          {done ? (
            <span className="required-earned">+{requiredReward(task)} 🪙</span>
          ) : task.untilDone ? (
            // no fine for these — they stay until they're ticked, that's the whole deal
            <span className="muted">+{requiredReward(task)} 🪙 · stays until done</span>
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
  const showDecide = onDecide && !done
  if (!onTrain && !showRemove && !showDecide) return row
  return (
    <div className="required-row-wrap">
      {row}
      {showDecide && (
        <button
          className={`required-train${lateSince ? ' required-train--late' : ''}`}
          onClick={onDecide}
          aria-label="Decide: done, delay, or won't do it"
        >
          ⋯
        </button>
      )}
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
