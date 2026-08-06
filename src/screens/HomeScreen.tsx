// The Dashboard — a home screen of app icons plus widgets that carry every
// number the old always-on top bar used to show.
//
// Reordering icons: tap "Arrange" (or press and hold any icon) to enter edit
// mode, where the grid jiggles and a plain drag moves an icon. The order is
// saved per profile in settings.homeOrder.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID } from '../store/storage'
import { appsFor, type AppDef, type Gates } from '../apps/registry'
import { albumProgress } from '../logic/album'
import { converterActive, fmt$, totalTreasure } from '../logic/bank'
import { activeQuestions, duePool, topicsFor } from '../logic/quiz'
import { isAvailableOn } from '../logic/wheel'
import { addDays, dayKey } from '../logic/dates'
import { Beli } from '../components/Beli'
import { DevilFruit } from '../components/DevilFruit'
import { sfx } from '../audio'

const HOLD_MS = 320 // press-and-hold before the grid enters arrange mode
const SLOP = 12 // px of movement that means "this is a scroll, not a hold"

export function HomeScreen({
  onOpen,
  badges,
}: {
  onOpen: (appId: string, tabId?: string) => void
  /** app id → count shown as a red badge on its icon */
  badges?: Record<string, number>
}) {
  const { data, activeProfileId, activeProfile, kidData, setSettings } = useStore()
  const me = activeProfile()

  // trip mode lives on Ben's bank; Diogo watches the same switch
  const watchedBank = activeProfileId === KID_ID ? data.bank : kidData?.bank
  const gates: Gates = { converter: !!watchedBank && converterActive(watchedBank) }

  const apps = useMemo(
    () => appsFor(activeProfileId, data.settings.homeOrder, gates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProfileId, data.settings.homeOrder, gates.converter],
  )

  return (
    <div className="screen home">
      <div className="home-hello">
        <span className="home-hello-emoji">{me?.emoji ?? '👒'}</span>
        <div>
          <div className="home-hello-name">{me?.name ?? 'Crewmate'}</div>
          <div className="muted" style={{ fontSize: 12 }}>{greeting()} — pick an island.</div>
        </div>
      </div>

      <Widgets onOpen={onOpen} />

      <IconGrid
        apps={apps}
        badges={badges}
        onOpen={onOpen}
        onReorder={(order) => setSettings({ homeOrder: order })}
      />
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Night watch'
  if (h < 12) return 'Morning, captain'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Counts up/down to its new value, so an earned reward is visible. */
function AnimatedNum({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    const start = performance.now()
    const dur = 700
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      setShown(Math.round(from + (value - from) * p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{shown}</>
}

// --- widgets ---------------------------------------------------------------

function Widgets({ onOpen }: { onOpen: (appId: string, tabId?: string) => void }) {
  const { data, activeProfileId, kidData, quizBank, completedTodayIds } = useStore()
  const today = dayKey()

  const plate = data.daily.pendingPicks
    .map((p) => data.tasks.find((t) => t.id === p.taskId))
    .filter((t): t is NonNullable<typeof t> => !!t && !t.archived && isAvailableOn(t, today, data.completions, data.tasks))
  const doneToday = completedTodayIds().size

  // Parent has no bank of his own — his widget watches Ben's chests.
  const watchedBank = activeProfileId === KID_ID ? data.bank : kidData?.bank
  const album = albumProgress(data.album)

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6)
    return {
      day,
      done: data.completions.some((c) => c.day === day),
      frozen: data.frozenDays.some((f) => f.day === day),
    }
  })

  // questions waiting to be practised today, across every unlocked topic
  const due = activeProfileId
    ? topicsFor(activeProfileId)
        .filter((t) => data.quiz.unlockedTopics.includes(t.id) || data.quiz.passedTopics.includes(t.id))
        .reduce((n, t) => n + duePool(activeQuestions(quizBank, t.id), data.quiz.stats).length, 0)
    : 0

  return (
    <div className="widget-grid">
      <button className="widget" onClick={() => { sfx.click(); onOpen('wheel', plate.length ? 'spin' : 'quests') }}>
        <div className="widget-head">📋 Today</div>
        <div className="widget-big">{plate.length}</div>
        <div className="widget-sub">
          {plate.length === 0 ? 'nothing picked — spin!' : plate.length === 1 ? 'quest on your plate' : 'quests on your plate'}
        </div>
        <div className="widget-foot">{doneToday} done today</div>
      </button>

      <button className="widget" onClick={() => { sfx.click(); onOpen('wheel', 'streak') }}>
        <div className="widget-head">🔥 Streak</div>
        <div className="widget-big" style={{ color: data.streak.current > 0 ? 'var(--orange)' : 'var(--muted)' }}>
          {data.streak.current}
        </div>
        <div className="widget-sub">best {data.streak.best} · 🧊 {data.economy.freezes} freeze{data.economy.freezes === 1 ? '' : 's'}</div>
        <div className="widget-dots">
          {week.map((d) => (
            <span key={d.day} className={`widget-dot${d.done ? ' on' : d.frozen ? ' frozen' : ''}`} />
          ))}
        </div>
      </button>

      <button className="widget" onClick={() => { sfx.click(); onOpen('store', 'walls') }}>
        <div className="widget-head">🪙 Berries</div>
        {/* stat--gem: where earned coins fly to on this screen (logic/fx.ts) */}
        <div className="widget-big stat--gem" style={{ color: 'var(--gold)' }}><AnimatedNum value={data.economy.gems} /></div>
        <div className="widget-sub">to spend at Nami’s</div>
        <div className="widget-foot widget-inline">
          <DevilFruit size={14} /> <AnimatedNum value={data.economy.devilFruits} /> Devil Fruit{data.economy.devilFruits === 1 ? '' : 's'}
        </div>
      </button>

      <button className="widget" onClick={() => { sfx.click(); onOpen('bank') }}>
        <div className="widget-head widget-inline">
          <Beli size={13} /> Treasure
        </div>
        <div className="widget-big" style={{ color: 'var(--gold)', fontSize: 26 }}>
          {watchedBank ? fmt$(totalTreasure(watchedBank)) : '—'}
        </div>
        <div className="widget-sub">{activeProfileId === KID_ID ? 'yours to cash out' : '⚔️ Ben’s chests'}</div>
      </button>

      <button className="widget" onClick={() => { sfx.click(); onOpen('album', 'album') }}>
        <div className="widget-head">📖 Log Book</div>
        <div className="widget-big">{album.owned}<span className="widget-of">/{album.total}</span></div>
        <div className="widget-sub">pirates collected</div>
        <div className="widget-bar"><span style={{ width: `${album.pct}%` }} /></div>
      </button>

      <button className="widget" onClick={() => { sfx.click(); onOpen('academy', 'topics') }}>
        <div className="widget-head">🏫 Academy</div>
        <div className="widget-big" style={{ color: due > 0 ? 'var(--blue)' : 'var(--muted)' }}>{due}</div>
        <div className="widget-sub">{due === 0 ? 'all caught up today 😴' : 'questions to practise'}</div>
        <div className="widget-foot">{data.quiz.passedTopics.length} topics conquered</div>
      </button>
    </div>
  )
}

// --- draggable icon grid ---------------------------------------------------

function IconGrid({
  apps,
  badges,
  onOpen,
  onReorder,
}: {
  apps: AppDef[]
  badges?: Record<string, number>
  onOpen: (appId: string) => void
  onReorder: (order: string[]) => void
}) {
  const ids = apps.map((a) => a.id)
  const byId = new Map(apps.map((a) => [a.id, a]))
  const [order, setOrder] = useState<string[]>(ids)
  const [arrange, setArrange] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const hold = useRef<{ timer: number; id: string; x: number; y: number; moved: boolean } | null>(null)
  // live order during a drag — read by the move handler, which can fire faster than React re-renders
  const orderRef = useRef(order)
  orderRef.current = order

  // roster changed (profile switch, trip mode toggled, a new app shipped) → adopt it
  const key = ids.join(',')
  useEffect(() => {
    setOrder((prev) => {
      const kept = prev.filter((id) => ids.includes(id))
      return [...kept, ...ids.filter((id) => !kept.includes(id))]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // while dragging, swallow touch scrolling so the icon follows the finger
  useEffect(() => {
    if (!dragId) return
    const block = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', block, { passive: false })
    return () => document.removeEventListener('touchmove', block)
  }, [dragId])

  function cancelHold() {
    if (hold.current) window.clearTimeout(hold.current.timer)
    hold.current = null
  }

  /** Which slot is under the pointer right now? Nearest tile centre wins. */
  function slotAt(x: number, y: number): number {
    const tiles = Array.from(gridRef.current?.querySelectorAll<HTMLElement>('[data-app]') ?? [])
    let best = -1
    let bestD = Infinity
    for (const el of tiles) {
      const r = el.getBoundingClientRect()
      const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y)
      if (d < bestD) {
        bestD = d
        best = orderRef.current.indexOf(el.dataset.app!)
      }
    }
    return best
  }

  function beginDrag(el: HTMLElement, pointerId: number, id: string, x: number, y: number) {
    if (el.isConnected) {
      // keeps the moves coming even once the finger leaves this tile
      try {
        el.setPointerCapture(pointerId)
      } catch {
        /* some browsers refuse capture on an already-released pointer; drag still works */
      }
    }
    sfx.click()
    setArrange(true)
    setDragId(id)
    setGhost({ x, y })
  }

  function onDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    const el = e.currentTarget
    const { clientX: x, clientY: y, pointerId } = e
    cancelHold()
    // already arranging → a plain drag moves the icon, no hold needed
    if (arrange) {
      beginDrag(el, pointerId, id, x, y)
      return
    }
    hold.current = {
      id,
      x,
      y,
      moved: false,
      timer: window.setTimeout(() => beginDrag(el, pointerId, id, x, y), HOLD_MS),
    }
  }

  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    const h = hold.current
    if (dragId) {
      setGhost({ x: e.clientX, y: e.clientY })
      const to = slotAt(e.clientX, e.clientY)
      const from = orderRef.current.indexOf(dragId)
      if (to >= 0 && from >= 0 && to !== from) {
        const next = [...orderRef.current]
        next.splice(to, 0, next.splice(from, 1)[0])
        orderRef.current = next
        setOrder(next)
      }
      return
    }
    if (!h) return
    if (Math.hypot(e.clientX - h.x, e.clientY - h.y) > SLOP) {
      h.moved = true
      cancelHold()
    }
  }

  function endDrag() {
    onReorder(orderRef.current)
    setDragId(null)
    setGhost(null)
    cancelHold()
  }

  function onUp(id: string) {
    if (dragId) {
      endDrag()
      return
    }
    const h = hold.current
    cancelHold()
    if (arrange) return // in edit mode a tap does nothing — tap Done to leave
    if (h && !h.moved) {
      sfx.click()
      onOpen(id)
    }
  }

  const dragged = dragId ? byId.get(dragId) : undefined

  return (
    <>
      <div className="icon-grid-head">
        <div className="icon-grid-title">{arrange ? 'Drag the icons around' : 'Apps'}</div>
        <button
          className={`arrange-btn${arrange ? ' on' : ''}`}
          onClick={() => {
            sfx.click()
            setArrange((a) => !a)
          }}
        >
          {arrange ? '✓ Done' : '✥ Arrange'}
        </button>
      </div>

      <div className={`icon-grid${arrange ? ' is-arranging' : ''}`} ref={gridRef}>
        {order.map((id) => {
          const app = byId.get(id)
          if (!app) return null
          return (
            <button
              key={id}
              data-app={id}
              className={`app-icon${dragId === id ? ' is-held' : ''}`}
              onPointerDown={(e) => onDown(e, id)}
              onPointerMove={onMove}
              onPointerUp={() => onUp(id)}
              onPointerCancel={() => {
                cancelHold()
                if (dragId) endDrag()
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="app-icon-tile" style={tileStyle(app)}>
                {app.img ? <img src={app.img} alt="" draggable={false} /> : <span className="app-icon-emoji">{app.icon}</span>}
                {!arrange && !!badges?.[id] && <span className="app-icon-badge">{badges[id]}</span>}
              </span>
              <span className="app-icon-label">{app.name}</span>
            </button>
          )
        })}
      </div>

      {/* the tile riding the finger */}
      {dragged && ghost && (
        <div className="app-icon app-icon--ghost" style={{ left: ghost.x, top: ghost.y }}>
          <span className="app-icon-tile" style={tileStyle(dragged)}>
            {dragged.img ? <img src={dragged.img} alt="" /> : <span className="app-icon-emoji">{dragged.icon}</span>}
          </span>
          <span className="app-icon-label">{dragged.name}</span>
        </div>
      )}

      <p className="muted home-tip">
        {arrange ? 'Tap ✓ Done when the layout looks right.' : 'Hold an icon — or tap ✥ Arrange — to move things around.'}
      </p>
    </>
  )
}

function tileStyle(app: AppDef) {
  return { background: `linear-gradient(150deg, ${app.tint[0]}, ${app.tint[1]})` }
}
