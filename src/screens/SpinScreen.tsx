import { useMemo, useRef, useState, type CSSProperties } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import type { Effort, EffortFilter, Task } from '../types'
import { Wheel } from '../components/Wheel'
import { Luffy, type LuffyMood, type LuffyState } from '../components/Luffy'
import { sfx } from '../audio'
import { crewSays } from '../logic/crewLines'
import { eligibleTasks } from '../logic/wheel'
import { ABANDON_PENALTY, MAX_PENDING, isEffectivelyUrgent, respinCost, rewardFor } from '../logic/economy'

const FILTERS: { id: Effort; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
]

export function SpinScreen() {
  const { data, spin, respin, completeTask, completedTodayIds, pushEvent } = useStore()
  const [filter, setFilter] = useState<EffortFilter>([])

  function toggleEffort(effort: Effort) {
    setFilter((f) => {
      const next = f.includes(effort) ? f.filter((e) => e !== effort) : [...f, effort]
      return next.length === FILTERS.length ? [] : next // all three ticked = "All"
    })
  }
  const [targetId, setTargetId] = useState<string | null>(null)
  const [spinToken, setSpinToken] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [line, setLine] = useState(() => crewSays('greeting'))
  const [mood, setMood] = useState<LuffyMood>('idle')
  const [justEarned, setJustEarned] = useState<number | null>(null)

  const doneIds = completedTodayIds()
  const pendingTasks = useMemo(
    () =>
      data.daily.pendingPicks
        .map((p) => ({ task: data.tasks.find((t) => t.id === p.taskId), via: p.via }))
        .filter((x): x is { task: Task; via: 'wheel' | 'manual' } => !!x.task),
    [data.daily.pendingPicks, data.tasks],
  )
  const pendingIds = new Set(pendingTasks.map((p) => p.task.id))
  // The task being spun stays visible on the wheel (it's pending the moment it's picked,
  // and removing its segment mid-animation would break the spin).
  const pool = useMemo(
    () => {
      const excluded = new Set([...doneIds, ...pendingIds])
      if (targetId) excluded.delete(targetId)
      return eligibleTasks(data.tasks, filter, excluded)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.tasks, filter, data.completions.length, data.daily.day, data.daily.pendingPicks, targetId],
  )

  const resultTask = targetId ? data.tasks.find((t) => t.id === targetId) : undefined

  function startSpin() {
    if (spinning) return
    sfx.click()
    const picked = spin(filter)
    if (picked === 'full') {
      setLine(crewSays('stackFull'))
      setMood('judging')
      sfx.error()
      return
    }
    if (!picked) {
      setLine(crewSays('emptyWheel'))
      setMood('judging')
      sfx.error()
      return
    }
    setLine(crewSays('spinning'))
    setMood('shocked')
    setShowResult(false)
    setTargetId(picked.id)
    setSpinning(true)
    setSpinToken((x) => x + 1)
  }

  function onWheelDone() {
    setSpinning(false)
    setShowResult(true)
    setLine(crewSays(resultTask?.effort === 'high' ? 'landedHard' : 'landedEasy'))
    setMood('cool')
    sfx.fanfare()
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 }, scalar: 0.9 })
  }

  function onRespin(replaceTask: Task) {
    const cost = respinCost(data.daily.respinsToday, data.daily.completionsToday)
    const result = respin(filter, replaceTask.id)
    if (result === 'broke') {
      sfx.error()
      setLine(`That re-spin costs 🪙${cost} and you've only got 🪙${data.economy.gems}. Nami says no.`)
      setMood('judging')
      return
    }
    sfx.spend()
    setLine(crewSays('respin'))
    setShowResult(false)
    if (result && result !== 'full') {
      setMood('shocked')
      setTargetId(result.id)
      setSpinning(true)
      setSpinToken((x) => x + 1)
    } else {
      setTargetId(null)
    }
  }

  function onComplete(task: Task) {
    const earned = completeTask(task.id)
    setJustEarned(earned)
    setShowResult(false)
    setTargetId(null)
    setLine(crewSays('completed'))
    setMood('happy')
    sfx.bigWin()
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } })
    window.setTimeout(() => setJustEarned(null), 1400)
    pushEvent({
      type: 'goal',
      emoji: '🪙',
      title: `+${earned} Berries!`,
      description: task.repeats ? 'Habit leveled up — you\'re getting stronger!' : 'Quest cleared! On to the next island.',
    })
  }

  const respinPrice = respinCost(data.daily.respinsToday, data.daily.completionsToday)
  const doneToday = data.daily.completionsToday > 0
  // which Luffy shows: nervous gif mid-spin, effort-based reaction once the wheel lands
  const luffyState: LuffyState = spinning
    ? 'spinning'
    : showResult && resultTask
      ? resultTask.effort === 'high'
        ? 'hard'
        : 'easy'
      : 'default'
  const plateFull = pendingTasks.length >= MAX_PENDING
  // Nothing left to spin (and no animation in flight) — hide the wheel entirely.
  const nothingToSpin = pool.length === 0 && !spinning

  return (
    <div className="screen">
      {/* Luffy + bubble */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
        <Luffy state={luffyState} mood={doneToday && !spinning ? 'happy' : mood} size={104} />
        <div className="bubble" style={{ flex: 1, marginBottom: 26 }}>
          {line}
        </div>
      </div>

      {/* pending pick stack */}
      {pendingTasks.length > 0 && !spinning && (
        <PendingStack
          items={pendingTasks}
          isFirst={data.daily.completionsToday === 0}
          respinPrice={respinPrice}
          gems={data.economy.gems}
          onComplete={onComplete}
          onRespin={onRespin}
        />
      )}

      <div className="seg" style={{ marginBottom: 10 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={filter.includes(f.id) ? 'on' : ''}
            onClick={() => {
              sfx.click()
              toggleEffort(f.id)
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          className={filter.length === 0 ? 'on' : ''}
          onClick={() => {
            sfx.click()
            setFilter([])
          }}
        >
          All
        </button>
      </div>

      {!nothingToSpin && <Wheel tasks={pool} targetId={targetId} spinToken={spinToken} onDone={onWheelDone} />}

      {justEarned !== null && (
        <div className="gem-fly" style={{ left: '50%', top: '45%' }}>
          +{justEarned} 🪙
        </div>
      )}

      {!nothingToSpin && (
        <button
          className="btn"
          style={{ marginTop: 10 }}
          disabled={spinning || (plateFull && !spinning)}
          onClick={startSpin}
        >
          {spinning ? 'Spinning…' : plateFull ? 'Plate full — finish one 👒' : 'SPIN THE WHEEL'}
        </button>
      )}
      {nothingToSpin && (
        <p className="muted" style={{ textAlign: 'center', marginTop: 10 }}>
          {data.tasks.filter((t) => !t.archived).length === 0
            ? 'Add quests in the Tasks tab. Adventure needs a destination!'
            : pendingTasks.length > 0
              ? 'Everything left is already on your plate. Deal with the cards above.'
              : 'Everything matching this filter is done today. SUGEEE!'}
        </p>
      )}

      {/* result sheet right after a spin */}
      {showResult && resultTask && (
        <div
          className="overlay"
          onClick={() => {
            setShowResult(false)
            setTargetId(null)
            setLine(crewSays('greeting')) // back to default Luffy → back to default chatter
          }}
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <TaskCard
              task={resultTask}
              isFirst={data.daily.completionsToday === 0}
              banner="The wheel has chosen your quest"
              respinPrice={respinPrice}
              gems={data.economy.gems}
              onComplete={() => onComplete(resultTask)}
              onRespin={() => onRespin(resultTask)}
              laterLabel="Later 👒"
              onLater={() => {
                setShowResult(false)
                setTargetId(null) // card moves to the plate; its wheel segment retires
                setLine(crewSays('greeting'))
              }}
              showRespin
            />
            <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
              “Later” keeps it on today’s plate. Unfinished picks cost 🪙{ABANDON_PENALTY[resultTask.effort]} at midnight.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/** Swipeable stack of today's pending picks. Swipe or "Next" cycles cards. */
function PendingStack(props: {
  items: { task: Task; via: 'wheel' | 'manual' }[]
  isFirst: boolean
  respinPrice: number
  gems: number
  onComplete: (t: Task) => void
  onRespin: (t: Task) => void
}) {
  const { items, isFirst, respinPrice, gems, onComplete, onRespin } = props
  const [top, setTop] = useState(0)
  const [dx, setDx] = useState(0)
  const [flying, setFlying] = useState<1 | -1 | null>(null)
  // Reset each app-open: the swipe tip replays until the user swipes once this session,
  // rather than being suppressed forever after the very first swipe.
  const [hasSwiped, setHasSwiped] = useState(false)
  const dragFrom = useRef<number | null>(null)
  const moved = useRef(false) // a real drag happened → swallow the trailing click
  const dragging = dragFrom.current !== null
  const n = items.length
  const topIdx = ((top % n) + n) % n
  // gentle looping swipe tip, shown until the user swipes for the first time ever
  const showHint = n > 1 && !hasSwiped && !dragging && !flying

  function markSwiped() {
    if (hasSwiped) return
    setHasSwiped(true)
  }

  function fling(dir: 1 | -1) {
    if (n < 2) {
      setDx(0)
      return
    }
    sfx.click()
    markSwiped()
    setFlying(dir)
    window.setTimeout(() => {
      setTop((t) => t + dir)
      setDx(0)
      setFlying(null)
    }, 200)
  }

  const ordered = Array.from({ length: n }, (_, i) => items[(topIdx + i) % n])

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="stack"
        style={{ ['--stack-extra' as string]: `${Math.min(n - 1, 2) * 13 + 8}px` }}
        onPointerDown={(e) => {
          if (flying) return
          moved.current = false
          dragFrom.current = e.clientX
        }}
        onPointerMove={(e) => {
          if (dragFrom.current === null || n < 2) return
          const d = e.clientX - dragFrom.current
          if (Math.abs(d) > 6) moved.current = true
          setDx(d)
        }}
        onPointerUp={() => {
          if (Math.abs(dx) > 64) fling(dx < 0 ? 1 : -1)
          else setDx(0)
          dragFrom.current = null
        }}
        onPointerCancel={() => {
          setDx(0)
          dragFrom.current = null
        }}
        onClickCapture={(e) => {
          // a drag ends with a click on whatever was under the finger — don't let it
          // trigger Complete/Re-spin/Next
          if (moved.current) {
            e.stopPropagation()
            e.preventDefault()
            moved.current = false
          }
        }}
      >
        {ordered.map(({ task, via }, i) => {
          const isTop = i === 0
          // back cards fan out with alternating tilt + depth
          const sign = i % 2 === 1 ? -1 : 1
          const topTransform = flying
            ? `translateX(${flying > 0 ? -135 : 135}%) rotate(${flying > 0 ? -18 : 18}deg)`
            : `translateX(${dx}px) rotate(${dx / 20}deg)`
          const style: CSSProperties = isTop
            ? {
                transform: topTransform,
                opacity: flying ? 0 : 1,
                zIndex: 20,
                touchAction: n > 1 ? 'pan-y' : 'auto',
                transition: dragging ? 'none' : 'transform 0.24s cubic-bezier(0.2,0.8,0.3,1.1), opacity 0.2s ease',
              }
            : {
                transform: `translateY(${i * 11}px) rotate(${sign * (2 + i * 1.6)}deg) scale(${1 - i * 0.04})`,
                zIndex: 20 - i,
                pointerEvents: 'none',
              }
          return (
            <div key={task.id} className={`stack-card${isTop && showHint ? ' stack-card--hint' : ''}`} style={style}>
              <TaskCard
                task={task}
                isFirst={isFirst}
                banner={n > 1 ? `Today's plate · ${((topIdx + i) % n) + 1}/${n}` : "Today's quest"}
                respinPrice={respinPrice}
                gems={gems}
                onComplete={() => onComplete(task)}
                onRespin={() => onRespin(task)}
                showRespin={via === 'wheel'}
                laterLabel={n > 1 ? 'Next ▸' : undefined}
                onLater={n > 1 ? () => fling(1) : undefined}
              />
            </div>
          )
        })}
      </div>
      {n > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 10 }}>
          {items.map((it, i) => (
            <div
              key={it.task.id}
              style={{
                width: i === topIdx ? 18 : 8,
                height: 8,
                borderRadius: 999,
                transition: 'width 0.2s',
                background: i === topIdx ? 'var(--green)' : 'var(--line)',
              }}
            />
          ))}
          <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>swipe ↔</span>
        </div>
      )}
    </div>
  )
}

function TaskCard(props: {
  task: Task
  isFirst: boolean
  banner: string
  respinPrice: number
  gems: number
  onComplete: () => void
  onRespin: () => void
  showRespin: boolean
  laterLabel?: string
  onLater?: () => void
}) {
  const { task, isFirst, banner, respinPrice, gems, onComplete, onRespin, showRespin, laterLabel, onLater } = props
  const urgent = isEffectivelyUrgent(task)
  const reward = rewardFor(task, isFirst)
  return (
    <div
      className={`card effort-${task.effort}`}
      style={{
        borderColor: 'var(--effort)',
        // faint wash of the border/effort color over the card surface
        background: 'color-mix(in srgb, var(--effort) 9%, var(--card))',
      }}
    >
      <div className="muted" style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>
        {banner}
      </div>
      <div className="h1" style={{ margin: '6px 0' }}>
        {task.name}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="chip chip--effort">{task.effort}</span>
        {urgent && <span className="chip chip--urgent">⚡ urgent</span>}
        {task.repeats && <span className="chip">🔁 habit</span>}
        {task.dueDate && <span className="chip">📅 {task.dueDate}</span>}
        <span className="chip" style={{ background: 'var(--blue)', color: '#06222e' }}>
          🪙 +{reward}
        </span>
      </div>
      <button className="btn" onClick={onComplete}>
        ✓ Quest complete (+{reward} 🪙)
      </button>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {showRespin && (
          <button className="btn btn--blue btn--small" style={{ flex: 1 }} onClick={onRespin} disabled={gems < respinPrice}>
            🎡 Re-spin (🪙{respinPrice})
          </button>
        )}
        {laterLabel && onLater && (
          <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={onLater}>
            {laterLabel}
          </button>
        )}
      </div>
    </div>
  )
}
