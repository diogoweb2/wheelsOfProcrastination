// The Dashboard — a home screen of app icons, nothing else. It is not where the
// app opens any more: the quest list is, and the header's "Apps" button comes
// back here.
//
// Reordering icons: tap "Arrange" (or press and hold any icon) to enter edit
// mode, where the grid jiggles and a plain drag moves an icon. The order is
// saved per profile in settings.homeOrder.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID } from '../store/storage'
import { homeTiles, type AppDef, type Gates, type HomeTile } from '../apps/registry'
import { converterActive } from '../logic/bank'
import { sfx } from '../audio'

const HOLD_MS = 320 // press-and-hold before the grid enters arrange mode
const SLOP = 12 // px of movement that means "this is a scroll, not a hold"

/**
 * Eat the one click a touch tap fires after pointerup, so it can't reach the
 * screen that just replaced the icon grid under the finger.
 */
function swallowNextClick() {
  const kill = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    window.clearTimeout(timer)
  }
  window.addEventListener('click', kill, { capture: true, once: true })
  // no click came (mouse, or the browser skipped it) — stop listening
  const timer = window.setTimeout(() => window.removeEventListener('click', kill, { capture: true }), 700)
}

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
          aria-label="Back to the apps"
          onClick={() => {
            sfx.click()
            onClose()
          }}
        >
          <span aria-hidden>⌂</span> Apps
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
      // The tap opens the app on pointerup, but the browser still fires its
      // synthesized click afterwards — and by then the app's screen is under
      // the finger. Without this it would tap right through (it was ticking
      // off must-dos on the spin page). Swallow that one stray click.
      swallowNextClick()
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
