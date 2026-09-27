// 📌 Today — one task, one day, and an end to it. Rules in §2b.
//
// The whole screen is one card. There is no list on it, no counter, no red, no
// "N late", and no way to lose Berries. It asks for one thing, says in one line
// why that thing, and once it is done it says so and stops asking — which is
// the part the wheel never had.
//
// The shape is lifted from the gym runner (§18c-1, §18y), because that is the
// screen in this app that actually gets used: a name you can read standing up,
// one button, everything else hidden.
import { useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { Luffy } from '../components/Luffy'
import { sfx } from '../audio'
import { dayKey } from '../logic/dates'
import { MAX_PASSES, planIsCurrent, rankTask } from '../logic/today'
import { START_BONUS, rewardFor } from '../logic/economy'

/** mm:ss since the set began. */
function elapsed(since: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function TodayScreen({ goWeek }: { goWeek: () => void }) {
  const { data, ensureToday, startToday, passToday, oneMoreToday, completeTask, pushEvent } = useStore()
  const [now, setNow] = useState(() => Date.now())
  const today = dayKey()

  // Pick today's task if the card is empty or the one it held went stale.
  useEffect(() => {
    ensureToday()
  }, [ensureToday, data.tasks, data.completions.length, data.today.day])

  // The clock only ticks while something is running.
  useEffect(() => {
    if (!data.today.startedAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [data.today.startedAt])

  const task = data.today.taskId ? data.tasks.find((t) => t.id === data.today.taskId) : undefined
  const pick = useMemo(
    () => (task ? rankTask(task, data.completions, data.week, today) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task?.id, data.completions.length, data.week, today],
  )
  const closed = data.today.day === today && data.today.closed
  const running = !!data.today.startedAt
  const passesLeft = MAX_PASSES - data.today.passed.length

  function onStart() {
    sfx.click()
    const paid = startToday()
    if (paid > 0) sfx.gem()
  }

  function onDone() {
    if (!task) return
    const earned = completeTask(task.id)
    sfx.bigWin()
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } })
    pushEvent({
      type: 'goal',
      emoji: '🪙',
      title: `+${earned} Berries!`,
      description: 'That was the day. Nothing else is asked of you.',
    })
  }

  return (
    <div className="screen">
      {closed ? (
        <DayClosed onMore={() => { sfx.click(); oneMoreToday() }} />
      ) : !task ? (
        <NothingToday />
      ) : (
        <div className="today-card">
          <div className="today-eyebrow">Today</div>
          <div className="today-name">{task.name}</div>
          <div className="today-why">{pick?.reason}</div>

          {running ? (
            <>
              <div className="today-clock">{elapsed(data.today.startedAt!, now)}</div>
              <button className="btn btn--blue today-btn" onClick={onDone}>
                ✓ Done
              </button>
            </>
          ) : (
            <>
              <button className="btn today-btn" onClick={onStart}>
                ▶️ Start
              </button>
              <div className="today-pay">
                starting pays {START_BONUS} 🪙 · finishing pays {rewardFor(task, data.daily.completionsToday === 0)} 🪙
              </div>
            </>
          )}

          {!running && passesLeft > 0 && (
            <button className="today-pass" onClick={() => { sfx.click(); passToday() }}>
              not today →
            </button>
          )}
        </div>
      )}

      <button className="today-week" onClick={() => { sfx.click(); goWeek() }}>
        <span aria-hidden>🗓️</span>
        <span style={{ flex: 1, textAlign: 'left' }}>
          {planIsCurrent(data.week, today)
            ? `This week: ${data.week!.taskIds.length} picked`
            : 'Pick what this week is for'}
        </span>
        <span style={{ fontWeight: 900 }}>▸</span>
      </button>
    </div>
  )
}

/** The day is over. This screen's entire job is to say so and mean it. */
function DayClosed({ onMore }: { onMore: () => void }) {
  return (
    <div className="today-card today-card--done">
      <Luffy state="default" mood="happy" size={120} />
      <div className="today-done-title">That's the day</div>
      <div className="today-done-sub">Nothing else is asked of you.</div>
      <button className="today-more" onClick={onMore}>
        ＋ one more
      </button>
    </div>
  )
}

function NothingToday() {
  return (
    <div className="today-card today-card--done">
      <Luffy state="default" mood="idle" size={120} />
      <div className="today-done-title">Nothing to ask for</div>
      <div className="today-done-sub">
        Everything available is done or resting. Add something on the Quests page when you want to.
      </div>
    </div>
  )
}
