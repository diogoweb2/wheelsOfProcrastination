// The Dashboard — a home screen of app icons plus a few at-a-glance widgets.
// Icons are drag-and-droppable: press and hold one until the grid jiggles, then
// drag it where you want. The order is saved per profile in settings.homeOrder.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID } from '../store/storage'
import { appsFor, type AppDef } from '../apps/registry'
import { albumProgress } from '../logic/album'
import { fmt$, totalTreasure } from '../logic/bank'
import { isAvailableOn } from '../logic/wheel'
import { addDays, dayKey } from '../logic/dates'
import { sfx } from '../audio'

const HOLD_MS = 320 // press-and-hold before the grid enters drag mode
const SLOP = 12 // px of movement that means "this is a scroll, not a hold"

export function HomeScreen({
  onOpen,
  badges,
}: {
  onOpen: (appId: string, tabId?: string) => void
  /** app id → count shown as a red badge on its icon */
  badges?: Record<string, number>
}) {
  const { data, activeProfileId, activeProfile, setSettings } = useStore()
  const me = activeProfile()

  const apps = useMemo(
    () => appsFor(activeProfileId, data.settings.homeOrder),
    [activeProfileId, data.settings.homeOrder],
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

      <p className="muted home-tip">Hold an icon to move it around.</p>
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

// --- widgets ---------------------------------------------------------------

function Widgets({ onOpen }: { onOpen: (appId: string, tabId?: string) => void }) {
  const { data, activeProfileId, kidData, completedTodayIds } = useStore()
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

      <button className="widget" onClick={() => { sfx.click(); onOpen('voyage', 'streak') }}>
        <div className="widget-head">🔥 Streak</div>
        <div className="widget-big" style={{ color: data.streak.current > 0 ? 'var(--orange)' : 'var(--muted)' }}>
          {data.streak.current}
        </div>
        <div className="widget-sub">best {data.streak.best}</div>
        <div className="widget-dots">
          {week.map((d) => (
            <span
              key={d.day}
              className={`widget-dot${d.done ? ' on' : d.frozen ? ' frozen' : ''}`}
            />
          ))}
        </div>
      </button>

      <button className="widget" onClick={() => { sfx.click(); onOpen('bank') }}>
        <div className="widget-head">🏦 Treasure</div>
        <div className="widget-big" style={{ color: 'var(--gold)', fontSize: 26 }}>
          {watchedBank ? fmt$(totalTreasure(watchedBank)) : '—'}
        </div>
        <div className="widget-sub">{activeProfileId === KID_ID ? 'yours to cash out' : "Ben's chests"}</div>
        <div className="widget-foot">🪙 {data.economy.gems} Berries</div>
      </button>

      <button className="widget" onClick={() => { sfx.click(); onOpen('album', 'album') }}>
        <div className="widget-head">📖 Log Book</div>
        <div className="widget-big">{album.owned}<span className="widget-of">/{album.total}</span></div>
        <div className="widget-sub">pirates collected</div>
        <div className="widget-bar"><span style={{ width: `${album.pct}%` }} /></div>
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
  const [dragId, setDragId] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const hold = useRef<{ timer: number; id: string; x: number; y: number; moved: boolean } | null>(null)

  // roster changed (profile switch, a new app shipped) → adopt it, keeping saved order
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
    tiles.forEach((el) => {
      const r = el.getBoundingClientRect()
      const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y)
      if (d < bestD) {
        bestD = d
        best = order.indexOf(el.dataset.app!)
      }
    })
    return best
  }

  function onDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    const el = e.currentTarget
    const { clientX: x, clientY: y, pointerId } = e
    cancelHold()
    hold.current = {
      id,
      x,
      y,
      moved: false,
      timer: window.setTimeout(() => {
        // keeps the moves coming even once the finger leaves this tile
        if (el.isConnected) el.setPointerCapture(pointerId)
        sfx.click()
        setDragId(id)
        setGhost({ x, y })
      }, HOLD_MS),
    }
  }

  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    const h = hold.current
    if (dragId) {
      setGhost({ x: e.clientX, y: e.clientY })
      const to = slotAt(e.clientX, e.clientY)
      const from = order.indexOf(dragId)
      if (to >= 0 && to !== from) {
        setOrder((o) => {
          const next = [...o]
          next.splice(to, 0, next.splice(from, 1)[0])
          return next
        })
      }
      return
    }
    if (!h) return
    if (Math.hypot(e.clientX - h.x, e.clientY - h.y) > SLOP) {
      h.moved = true
      cancelHold()
    }
  }

  function onUp(id: string) {
    if (dragId) {
      onReorder(order)
      setDragId(null)
      setGhost(null)
      cancelHold()
      return
    }
    const h = hold.current
    cancelHold()
    if (h && !h.moved) {
      sfx.click()
      onOpen(id)
    }
  }

  const dragged = dragId ? byId.get(dragId) : undefined

  return (
    <>
      <div className={`icon-grid${dragId ? ' is-dragging' : ''}`} ref={gridRef}>
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
                if (dragId) {
                  onReorder(order)
                  setDragId(null)
                  setGhost(null)
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="app-icon-tile" style={tileStyle(app)}>
                {app.img ? <img src={app.img} alt="" draggable={false} /> : <span className="app-icon-emoji">{app.icon}</span>}
                {!!badges?.[id] && <span className="app-icon-badge">{badges[id]}</span>}
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
    </>
  )
}

function tileStyle(app: AppDef) {
  return { background: `linear-gradient(150deg, ${app.tint[0]}, ${app.tint[1]})` }
}
