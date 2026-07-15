import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import type { Completion, Task } from '../types'
import { addDays, dayKey, parseDay } from '../logic/dates'
import { Zoro } from '../components/Crew'

interface HabitStats {
  task: Task
  total: number
  currentStreak: number
  bestStreak: number
  last30: { day: string; done: boolean }[]
  weekly: { label: string; count: number }[]
}

function computeStats(task: Task, completions: Completion[]): HabitStats {
  const days = new Set(completions.filter((c) => c.taskId === task.id).map((c) => c.day))
  const today = dayKey()

  // current streak: consecutive days ending today or yesterday
  let cur = 0
  let cursor = days.has(today) ? today : addDays(today, -1)
  while (days.has(cursor)) {
    cur += 1
    cursor = addDays(cursor, -1)
  }

  // best streak
  const sorted = [...days].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(today, i - 29)
    return { day, done: days.has(day) }
  })

  // last 8 ISO-ish weeks (Mon-start), oldest first
  const weekly: { label: string; count: number }[] = []
  const now = parseDay(today)
  const monday = new Date(now)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  for (let w = 7; w >= 0; w--) {
    const start = new Date(monday)
    start.setDate(start.getDate() - w * 7)
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      if (days.has(dayKey(d))) count++
    }
    weekly.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, count })
  }

  return { task, total: days.size, currentStreak: cur, bestStreak: best, last30, weekly }
}

export function ReportsScreen() {
  const { data } = useStore()
  const habits = useMemo(
    () => data.tasks.filter((t) => t.repeats).map((t) => computeStats(t, data.completions)),
    [data.tasks, data.completions],
  )

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="h1" style={{ flex: 1 }}>Training log</div>
        <Zoro size={46} />
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Only repeating quests (habits) show up here. One-shot quests sail off once done.
      </p>

      {habits.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Zoro size={150} />
          <p className="muted" style={{ marginTop: 10 }}>
            No habits yet. Real strength is built one rep at a time — add a repeating quest.
          </p>
        </div>
      )}

      {habits.map((h) => (
        <div key={h.task.id} className={`card effort-${h.task.effort}`} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--effort)' }} />
            <div style={{ fontWeight: 900, fontSize: 17, flex: 1 }}>{h.task.name}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <StatTile label="total" value={h.total} />
            <StatTile label="streak" value={h.currentStreak} suffix="🔥" />
            <StatTile label="best" value={h.bestStreak} suffix="🏆" />
          </div>

          {/* last 30 days heatmap strip */}
          <div className="muted" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Last 30 days
          </div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
            {h.last30.map((c) => (
              <div
                key={c.day}
                title={`${c.day}: ${c.done ? 'done ✓' : 'nope'}`}
                style={{
                  flex: 1,
                  height: 22,
                  borderRadius: 4,
                  background: c.done ? 'var(--green)' : 'transparent',
                  border: c.done ? 'none' : '1.5px solid var(--line)',
                }}
              />
            ))}
          </div>

          {/* completions per week, last 8 weeks */}
          <div className="muted" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Per week
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 84 }}>
            {h.weekly.map((w) => (
              <div key={w.label} title={`week of ${w.label}: ${w.count}/7`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                {w.count > 0 && <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)' }}>{w.count}</div>}
                <div
                  style={{
                    width: '70%',
                    maxWidth: 22,
                    height: `${Math.max((w.count / 7) * 56, w.count > 0 ? 6 : 2)}px`,
                    borderRadius: '4px 4px 0 0',
                    background: w.count > 0 ? 'var(--blue)' : 'var(--line)',
                  }}
                />
                <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700 }}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatTile({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--bg2)', border: '2px solid var(--line)', borderRadius: 12, padding: '8px 6px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>
        {value}
        {suffix && <span style={{ fontSize: 14 }}> {suffix}</span>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  )
}
