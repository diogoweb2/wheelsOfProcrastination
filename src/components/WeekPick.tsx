// 🗓️ The Sunday pick — §2c. The only list this mode ever shows.
//
// The decision about what matters is made ONCE, while calm, for the whole week.
// Daily-you then never chooses: the Today card just asks for the next one off
// this shortlist. Five is the cap on purpose — a week that asks for eight things
// is the list that killed the last app.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'
import { dayKey } from '../logic/dates'
import { backlog, planIsCurrent, WEEK_PICK_MAX } from '../logic/today'

export function WeekPick({ onClose }: { onClose: () => void }) {
  const { data, setWeekPlan, setTodayTask } = useStore()
  const today = dayKey()
  const current = planIsCurrent(data.week, today) ? data.week!.taskIds : []
  const [chosen, setChosen] = useState<string[]>(current)
  const rows = backlog(data.tasks, data.completions, today)

  function toggle(id: string) {
    sfx.click()
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= WEEK_PICK_MAX ? c : [...c, id]))
  }

  function save() {
    sfx.fanfare()
    setWeekPlan(chosen)
    onClose()
  }

  return (
    <div className="screen">
      <div className="h1">This week</div>
      <p className="muted" style={{ marginBottom: 14 }}>
        Pick up to {WEEK_PICK_MAX}. They're what the Today card will ask for first — everything else waits, quietly,
        until you come back here.
      </p>

      <div className="week-count">
        {chosen.length} / {WEEK_PICK_MAX} picked
      </div>

      <div className="week-list">
        {rows.length === 0 && <p className="muted">No quests yet. Add some on the Quests page.</p>}
        {rows.map(({ task, reason }) => {
          const on = chosen.includes(task.id)
          const full = !on && chosen.length >= WEEK_PICK_MAX
          return (
            <div key={task.id} className={`week-row${on ? ' week-row--on' : ''}${full ? ' week-row--full' : ''}`}>
              {/* two separate buttons, not one inside the other: "pick it for the
                  week" and "do it right now" are different decisions */}
              <button className="week-choose" onClick={() => toggle(task.id)} disabled={full}>
                <span className="week-tick" aria-hidden>{on ? '✓' : ''}</span>
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <span className="week-name">{task.name}</span>
                  <span className="week-why">{reason}</span>
                </span>
              </button>
              <button
                className="week-now"
                title="Put this on today's card"
                onClick={() => {
                  sfx.click()
                  setTodayTask(task.id)
                  onClose()
                }}
              >
                today
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn--ghost" onClick={() => { sfx.click(); onClose() }}>
          Back
        </button>
        <button className="btn" onClick={save}>
          Save the week
        </button>
      </div>
    </div>
  )
}
