import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { DayScope, Effort, Priority, Task } from '../types'
import { REQUIRED_REWARD, isEffectivelyUrgent, manualPickCost, rewardFor } from '../logic/economy'
import { sfx } from '../audio'
import { crewSays } from '../logic/crewLines'
import { dayKey, daysUntil } from '../logic/dates'
import { isAvailableOn } from '../logic/wheel'

export function TasksScreen({ goSpin }: { goSpin: () => void }) {
  const { data, addTask, updateTask, deleteTask, manualPick, completedTodayIds } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const today = dayKey()
  const doneIds = completedTodayIds()
  const pendingIds = new Set(data.daily.pendingPicks.map((p) => p.taskId))
  const active = data.tasks.filter((t) => !t.archived)
  const urgentFirst = [...active].sort((a, b) => {
    const ua = isEffectivelyUrgent(a) ? 0 : 1
    const ub = isEffectivelyUrgent(b) ? 0 : 1
    return ua - ub || a.name.localeCompare(b.name)
  })

  function pick(task: Task) {
    const cost = manualPickCost(task)
    const result = manualPick(task.id)
    if (result !== 'ok') {
      sfx.error()
      setToast(
        result === 'full'
          ? 'Your plate already has 3 quests. Finish one before grabbing more, greedy-guts!'
          : `You need 🪙${cost} to hand-pick that. Spinning the wheel is free, just saying!`,
      )
      window.setTimeout(() => setToast(null), 3000)
      return
    }
    sfx[cost > 0 ? 'spend' : 'click']()
    goSpin()
  }

  return (
    <div className="screen">
      <div className="h1">Your quest log</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {active.length === 0 ? 'No quests yet. The sea is calling — add one!' : crewToneForCount(active.length)}
      </p>

      <button
        className="btn"
        onClick={() => {
          sfx.click()
          setEditing(null)
          setFormOpen(true)
        }}
      >
        + Add task
      </button>

      <div className="h2">Active ({active.length})</div>
      {urgentFirst.map((t) => {
        const urgent = isEffectivelyUrgent(t)
        const cost = manualPickCost(t)
        const doneToday = doneIds.has(t.id)
        const due = t.dueDate ? daysUntil(t.dueDate) : null
        const notStarted = t.startDate ? daysUntil(t.startDate) > 0 : false
        const available = isAvailableOn(t, today)
        return (
          <div key={t.id} className={`task-row effort-${t.effort}`} style={urgent ? { borderColor: 'var(--orange)' } : undefined}>
            <div className="dot" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="name">{t.name}</div>
              <div className="meta">
                <span className="chip chip--effort">{t.effort}</span>
                {t.required && <span className="chip chip--required">✅ must-do</span>}
                {t.required && t.requiredUntil && <span className="chip">🏁 until {t.requiredUntil}</span>}
                {urgent && <span className="chip chip--urgent">⚡ urgent</span>}
                {t.repeats && <span className="chip">🔁</span>}
                {t.dayScope === 'weekdays' && <span className="chip">💼 weekdays</span>}
                {t.dayScope === 'weekends' && <span className="chip">🏖️ weekends</span>}
                {notStarted && <span className="chip">🕒 starts {t.startDate}</span>}
                {due !== null && (
                  <span className="chip" style={due <= 2 ? { color: 'var(--orange)' } : undefined}>
                    📅 {due < 0 ? `${-due}d overdue!` : due === 0 ? 'today!' : `${due}d left`}
                  </span>
                )}
              </div>
            </div>
            {doneToday ? (
              <span className="chip" style={{ background: 'var(--green)', color: '#10230a' }}>
                ✓ done
              </span>
            ) : pendingIds.has(t.id) ? (
              <span className="chip" style={{ background: 'var(--purple)', color: '#fff' }}>
                🎯 on plate
              </span>
            ) : t.required ? (
              // must-dos are ticked off in the checklist beside the wheel, never picked
              <span className="chip chip--required">✅ checklist</span>
            ) : !available ? (
              <span className="chip" title="Not on today's wheel">
                💤 not today
              </span>
            ) : (
              <button className="btn btn--small" style={urgent ? undefined : { background: 'var(--blue)', boxShadow: '0 3px 0 var(--blue-dark)' }} onClick={() => pick(t)}>
                {urgent ? 'Do it! FREE' : `Pick 🪙${cost}`}
              </button>
            )}
            <button
              className="btn--ghost btn btn--small"
              style={{ padding: '8px 10px' }}
              onClick={() => {
                setEditing(t)
                setFormOpen(true)
              }}
            >
              ✎
            </button>
          </div>
        )
      })}

      {active.some((t) => isEffectivelyUrgent(t) && !doneIds.has(t.id)) && (
        <p className="muted" style={{ marginTop: 4 }}>
          ⚡ {crewSays('urgentPick')}
        </p>
      )}

      {toast && (
        <div className="bubble bubble--above" style={{ position: 'fixed', bottom: 96, left: 16, right: 16, zIndex: 60 }}>
          {toast}
        </div>
      )}

      {formOpen && (
        <TaskForm
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSave={(v) => {
            if (editing) updateTask(editing.id, v)
            else addTask(v)
            sfx.gem()
            setFormOpen(false)
          }}
          onDelete={
            editing
              ? () => {
                  deleteTask(editing.id)
                  setFormOpen(false)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function crewToneForCount(n: number): string {
  if (n <= 3) return `${n} quest${n > 1 ? 's' : ''} ready. Small crew, big dreams!`
  if (n <= 8) return 'A solid lineup of adventures. Let\'s go!'
  return 'Whoa, that\'s a LOT of quests. The wheel will pick — trust it!'
}

function TaskForm(props: {
  initial: Task | null
  onSave: (v: {
    name: string
    repeats: boolean
    effort: Effort
    priority: Priority
    dueDate?: string
    startDate?: string
    dayScope: DayScope
    required?: boolean
    requiredFrom?: string
    requiredUntil?: string
  }) => void
  onClose: () => void
  onDelete?: () => void
}) {
  const { initial, onSave, onClose, onDelete } = props
  const [name, setName] = useState(initial?.name ?? '')
  const [repeats, setRepeats] = useState(initial?.repeats ?? false)
  const [effort, setEffort] = useState<Effort>(initial?.effort ?? 'low')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'normal')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [dayScope, setDayScope] = useState<DayScope>(initial?.dayScope ?? 'all')
  const [required, setRequired] = useState(initial?.required ?? false)
  const [requiredFrom, setRequiredFrom] = useState(initial?.requiredFrom ?? '')
  const [requiredUntil, setRequiredUntil] = useState(initial?.requiredUntil ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Dates are the advanced corner of this form — folded away by default so the
  // everyday "name + must-do + effort" path stays short enough for a kid.
  const [datesOpen, setDatesOpen] = useState(
    Boolean(initial?.dueDate || initial?.startDate || initial?.requiredFrom || initial?.requiredUntil),
  )

  const preview = rewardFor(
    {
      id: '',
      name,
      repeats,
      effort,
      priority,
      dueDate: dueDate || undefined,
      dayScope,
      createdAt: '',
      archived: false,
      spinsSinceLastPicked: 0,
      timesPicked: 0,
    },
    false,
  )

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="h1" style={{ marginBottom: 14 }}>
          {initial ? 'Edit quest' : 'New quest'}
        </div>

        <div className="field">
          <label>What must be done?</label>
          <input type="text" value={name} maxLength={60} placeholder='e.g. "Read for 10 min"' onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label>Required every day? (skips the wheel)</label>
          <div className="seg">
            <button className={!required ? 'on' : ''} onClick={() => setRequired(false)}>
              🎡 On the wheel
            </button>
            <button className={required ? 'on' : ''} onClick={() => setRequired(true)}>
              ✅ Must-do
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {required
              ? `Lives in the must-do checklist beside the wheel. Pays 🪙${REQUIRED_REWARD[effort]} per tick — and costs 🪙${REQUIRED_REWARD[effort]} for every day you skip it.`
              : 'Normal quest — the wheel can land on it.'}
          </p>
        </div>

        <div className="field">
          <label>Repeats? (habit)</label>
          <div className="seg">
            <button className={!repeats ? 'on' : ''} onClick={() => setRepeats(false)}>
              One-shot 💨
            </button>
            <button className={repeats ? 'on' : ''} onClick={() => setRepeats(true)}>
              Every day 🔁
            </button>
          </div>
        </div>

        <div className="field">
          <label>Effort</label>
          <div className="seg">
            {(['low', 'medium', 'high'] as Effort[]).map((e) => (
              <button key={e} className={effort === e ? 'on' : ''} onClick={() => setEffort(e)}>
                {e === 'low' ? '🔵 low' : e === 'medium' ? '🟡 med' : '🔴 high'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Priority (everything here is important)</label>
          <div className="seg">
            <button className={priority === 'normal' ? 'on' : ''} onClick={() => setPriority('normal')}>
              Normal
            </button>
            <button className={priority === 'urgent' ? 'on' : ''} onClick={() => setPriority('urgent')}>
              ⚡ High
            </button>
          </div>
        </div>

        {/* One dates drawer. Only ever two dates: a start and an end — the pair
            shown depends on whether this is a must-do or a wheel quest. */}
        <div className="field">
          <button className="dates-toggle" onClick={() => setDatesOpen((o) => !o)}>
            <span>📅 Dates (optional)</span>
            <span className="muted">{datesOpen ? '▲' : '▼'}</span>
          </button>

          {datesOpen && (
            <div className="dates-body">
              {required ? (
                <>
                  <label>Starts on — ignored until this day</label>
                  <input type="date" value={requiredFrom} onChange={(e) => setRequiredFrom(e.target.value)} />
                  {requiredFrom && (
                    <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => setRequiredFrom('')}>
                      Clear
                    </button>
                  )}

                  <label style={{ marginTop: 12 }}>Last day — required every day up to here</label>
                  <input type="date" value={requiredUntil} onChange={(e) => setRequiredUntil(e.target.value)} />
                  {requiredUntil ? (
                    <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => setRequiredUntil('')}>
                      Clear (require it forever)
                    </button>
                  ) : (
                    <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      No last day — required every day, indefinitely.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <label>Starts on — hidden from the wheel until this day</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  {startDate && (
                    <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => setStartDate('')}>
                      Clear
                    </button>
                  )}

                  <label style={{ marginTop: 12 }}>Deadline — it gets scarier as it nears</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  {dueDate && (
                    <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => setDueDate('')}>
                      Clear
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="field">
          <label>Which days? (the wheel obeys)</label>
          <div className="seg">
            <button className={dayScope === 'all' ? 'on' : ''} onClick={() => setDayScope('all')}>
              All days
            </button>
            <button className={dayScope === 'weekdays' ? 'on' : ''} onClick={() => setDayScope('weekdays')}>
              💼 Weekdays
            </button>
            <button className={dayScope === 'weekends' ? 'on' : ''} onClick={() => setDayScope('weekends')}>
              🏖️ Weekends
            </button>
          </div>
        </div>

        <p className="muted" style={{ marginBottom: 12 }}>
          {required
            ? `Pays 🪙${REQUIRED_REWARD[effort]} per tick, −🪙${REQUIRED_REWARD[effort]} per skipped day.`
            : `Pays 🪙${preview} per completion${priority === 'urgent' ? ' (urgency bonus included)' : ''}.`}
        </p>

        <button
          className="btn"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              name,
              repeats,
              effort,
              priority,
              dueDate: dueDate || undefined,
              startDate: startDate || undefined,
              dayScope,
              required,
              // the window only means anything for a requirement
              requiredFrom: required ? requiredFrom || undefined : undefined,
              requiredUntil: required ? requiredUntil || undefined : undefined,
            })
          }
        >
          {initial ? 'Save' : required ? 'Add to must-dos' : 'Add to the wheel'}
        </button>
        {onDelete &&
          (confirmDelete ? (
            <button className="btn btn--red" style={{ marginTop: 8 }} onClick={onDelete}>
              Yes, delete forever (history stays)
            </button>
          ) : (
            <button className="btn btn--ghost" style={{ marginTop: 8, color: 'var(--red)' }} onClick={() => setConfirmDelete(true)}>
              Delete task
            </button>
          ))}
        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
