// The Dashboard — a home screen of app icons plus widgets that carry every
// number the old always-on top bar used to show.
//
// Reordering icons: tap "Arrange" (or press and hold any icon) to enter edit
// mode, where the grid jiggles and a plain drag moves an icon. The order is
// saved per profile in settings.homeOrder.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID } from '../store/storage'
import { homeTiles, type AppDef, type Gates, type HomeTile } from '../apps/registry'
import { albumProgress } from '../logic/album'
import { converterActive, fmt$, totalTreasure } from '../logic/bank'
import { activeQuestions, duePool, topicsFor } from '../logic/quiz'
import { isAvailableOn } from '../logic/wheel'
import { heldStreak } from '../logic/economy'
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

  const tiles = useMemo(
    () => homeTiles(activeProfileId, data.settings.homeOrder, gates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProfileId, data.settings.homeOrder, gates.converter],
  )

  // which folder is open, if any — a folder tile shows its apps on their own
  // full page rather than opening one directly
  const [folder, setFolder] = useState<HomeTile | null>(null)

  if (folder) {
    return (
      <FolderPage
        folder={folder}
        badges={badges}
        onClose={() => setFolder(null)}
        onOpen={(id) => {
          setFolder(null)
          onOpen(id)
        }}
      />
    )
  }

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
        tiles={tiles}
        badges={badges}
        onOpen={(id) => {
          const tile = tiles.find((t) => t.id === id)
          if (tile?.apps) setFolder(tile)
          else onOpen(id)
        }}
        onReorder={(order) => setSettings({ homeOrder: order })}
      />
    </div>
  )
}

/** A folder tapped open: a full page of the apps inside it, with its own way back. */
function FolderPage({
  folder,
  badges,
  onOpen,
  onClose,
}: {
  folder: HomeTile
  badges?: Record<string, number>
  onOpen: (appId: string) => void
  onClose: () => void
}) {
  return (
    <div className="screen folder-page">
      <div className="app-head">
        <button
          className="app-head-back"
          aria-label="Back to main"
          onClick={() => {
            sfx.click()
            onClose()
          }}
        >
          <span aria-hidden>⌂</span> Main
        </button>
        <div className="app-head-title">
          {folder.icon} {folder.name}
        </div>
      </div>
      <div className="icon-grid">
        {(folder.apps ?? []).map((app) => (
          <button
            key={app.id}
            className="app-icon"
            onClick={() => {
              sfx.click()
              onOpen(app.id)
            }}
          >
            <span className="app-icon-tile" style={{ background: `linear-gradient(150deg, ${app.tint[0]}, ${app.tint[1]})` }}>
              {app.img ? <img src={app.img} alt="" draggable={false} /> : <span className="app-icon-emoji">{app.icon}</span>}
              {!!badges?.[app.id] && <span className="app-icon-badge">{badges[app.id]}</span>}
            </span>
            <span className="app-icon-label">{app.name}</span>
          </button>
        ))}
      </div>
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
  const { data, activeProfileId, kidData, quizBank, completedTodayIds, freezeRequests } = useStore()
  // a dead streak waiting on Dad's answer still reads as alive
  const held = heldStreak(data.streak.deadStreak, freezeRequests, activeProfileId)
  const streakShown = held ?? data.streak.current
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
        <div className="widget-head">🔥 Streak{held !== null ? ' ⏳' : ''}</div>
        <div className="widget-big" style={{ color: streakShown > 0 ? 'var(--orange)' : 'var(--muted)' }}>
          {streakShown}
        </div>
        <div className="widget-sub">
          {held !== null
            ? 'on hold — waiting for Dad'
            : `best ${data.streak.best} · 🧊 ${data.economy.freezes} freeze${data.economy.freezes === 1 ? '' : 's'}`}
        </div>
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
        <div className="widget-sub">to spend in the Shop</div>
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
        <div className="widget-head">🖼️ Stickers</div>
        <div className="widget-big">{album.owned}<span className="widget-of">/{album.total}</span></div>
        <div className="widget-sub">pirates collected</div>
        <div className="widget-bar"><span style={{ width: `${album.pct}%` }} /></div>
      </button>

      <button className="widget" onClick={() => { sfx.click(); onOpen('academy', 'topics') }}>
        <div className="widget-head">🎓 Quiz</div>
        <div className="widget-big" style={{ color: due > 0 ? 'var(--blue)' : 'var(--muted)' }}>{due}</div>
        <div className="widget-sub">{due === 0 ? 'all caught up today 😴' : 'questions to practise'}</div>
        <div className="widget-foot">{data.quiz.passedTopics.length} topics conquered</div>
      </button>
    </div>
  )
}

// --- draggable icon grid ---------------------------------------------------

function IconGrid({
  tiles,
  badges,
  onOpen,
  onReorder,
}: {
  tiles: HomeTile[]
  /** app id → count. A folder tile shows the sum of the apps inside it. */
  badges?: Record<string, number>
  onOpen: (tileId: string) => void
  onReorder: (order: string[]) => void
}) {
  const ids = tiles.map((a) => a.id)
  const byId = new Map(tiles.map((a) => [a.id, a]))
  /** A folder wears one badge for everything waiting inside it. */
  const badgeFor = (tile: HomeTile) =>
    tile.apps ? tile.apps.reduce((n, a) => n + (badges?.[a.id] ?? 0), 0) : (badges?.[tile.id] ?? 0)
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
          const badge = badgeFor(app)
          return (
            <button
              key={id}
              data-app={id}
              className={`app-icon${dragId === id ? ' is-held' : ''}${app.apps ? ' app-icon--folder' : ''}`}
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
                {/* a folder shows a strip of what's inside, the way a phone does */}
                {app.apps && (
                  <span className="app-icon-mini">
                    {app.apps.slice(0, 4).map((a) => (
                      <span key={a.id}>{a.icon}</span>
                    ))}
                  </span>
                )}
                {!arrange && !!badge && <span className="app-icon-badge">{badge}</span>}
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

function tileStyle(app: HomeTile | AppDef) {
  return { background: `linear-gradient(150deg, ${app.tint[0]}, ${app.tint[1]})` }
}
