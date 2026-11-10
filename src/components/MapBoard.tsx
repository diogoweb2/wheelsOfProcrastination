// §14f — the map under a Where Is This? question. No names on it: he finds the
// place by its shape and its neighbours. Names only appear on the answer.
//
// Crowded corners have 🔍 close-ups: PEI is a few pixels wide on a phone, and a
// question he cannot physically tap tests his finger, not his geography.
import { useEffect, useRef, useState } from 'react'
import type { QuizMapSpec } from '../types'
import type { MapDrawing, MapFeature, MapId, MapPick } from '../quiz/maps/types'
import { MAP_NAMES } from '../quiz/maps/names'
import { sfx } from '../audio'

const LOADERS: Record<MapId, () => Promise<{ MAP: MapDrawing }>> = {
  canada: () => import('../quiz/maps/canada.generated'),
  usa: () => import('../quiz/maps/usa.generated'),
  europe: () => import('../quiz/maps/europe.generated'),
  gta: () => import('../quiz/maps/gta.generated'),
  toronto: () => import('../quiz/maps/toronto.generated'),
  samerica: () => import('../quiz/maps/samerica.generated'),
  africa: () => import('../quiz/maps/africa.generated'),
  asia: () => import('../quiz/maps/asia.generated'),
  oceania: () => import('../quiz/maps/oceania.generated'),
  world: () => import('../quiz/maps/world.generated'),
  ttc: () => import('../quiz/maps/ttc.generated'),
  organs: () => import('../quiz/maps/organs.generated'),
  skeleton: () => import('../quiz/maps/skeleton.generated'),
}

/**
 * §14f — hand-tuned close-ups, overriding the builder's boxes by label.
 *
 * The builder crops tight to the places it is about, and a crop that tight
 * takes away the only thing he has to navigate by: the neighbours. The East
 * coast box put the Maritimes on screen with nothing around them, so "where is
 * New Brunswick" became "guess which of these four blobs" (2026-11-08, Ben on
 * a phone). 1.5x wider (226 -> 340 units across) gets the Gulf, eastern Quebec
 * and the island of Newfoundland back in the frame -- the old box cut the
 * island off at the top -- and PEI still lands at about 39x29 CSS px in
 * portrait and 84x62 in landscape, well past a fingertip.
 *
 * This lives here and not in `*.generated.ts` because the map builder is not in
 * the repo: a regenerated file would silently take the fix back.
 */
const ZOOM_FIX: Partial<Record<MapId, Record<string, string>>> = {
  canada: { 'East coast': '700 368 340 274' },
}

const loaded = new Map<MapId, MapDrawing>()

function useDrawing(id: MapId): MapDrawing | null {
  const [drawing, setDrawing] = useState<MapDrawing | null>(() => loaded.get(id) ?? null)
  useEffect(() => {
    const ready = loaded.get(id)
    if (ready) {
      setDrawing(ready)
      return
    }
    let alive = true
    void LOADERS[id]().then(({ MAP }) => {
      loaded.set(id, MAP)
      if (alive) setDrawing(MAP)
    })
    return () => {
      alive = false
    }
  }, [id])
  return drawing
}

interface Props {
  spec: QuizMapSpec
  /** What he has tapped so far. */
  selected?: string[]
  /** Show the answer: the right places in green with their names. */
  reveal?: boolean
  /** With `reveal`, what he tapped instead, in red. */
  wrong?: string[]
  /** Leave out to make the map a picture. */
  onTap?: (id: string) => void
}

export function MapBoard({ spec, selected = [], reveal = false, wrong = [], onTap }: Props) {
  const drawing = useDrawing(spec.id)
  // the window onto the drawing: a preset close-up, or wherever he has pinched / dragged to
  const [box, setBox] = useState<number[] | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const down = useRef({ x: 0, y: 0 })
  const moved = useRef(false) // a drag must never count as a tap
  const boxRef = useRef<number[] | null>(null)
  const limits = useRef<number[]>([0, 0, 1, 1])

  // `at` is where on screen (px) the zoom is centred, so that spot stays under his fingers
  const zoomBy = (factor: number, cx: number, cy: number) => {
    const el = svgRef.current
    const b = boxRef.current
    if (!el || !b) return
    const r = el.getBoundingClientRect()
    const [lx, ly, lw, lh] = limits.current
    const upp = Math.max(b[2] / r.width, b[3] / r.height)
    const w = Math.min(lw, Math.max(lw / 40, b[2] / factor))
    const k = w / b[2]
    // the svg is letter-boxed (meet), so measure from the middle of the element
    const ux = b[0] + b[2] / 2 + (cx - r.left - r.width / 2) * upp
    const uy = b[1] + b[3] / 2 + (cy - r.top - r.height / 2) * upp
    const h = b[3] * k
    const x = Math.min(lx + lw - w * 0.2, Math.max(lx - w * 0.8, ux - (ux - b[0]) * k))
    const y = Math.min(ly + lh - h * 0.2, Math.max(ly - h * 0.8, uy - (uy - b[1]) * k))
    setBox([x, y, w, h])
  }
  const zoomByRef = useRef(zoomBy)
  zoomByRef.current = zoomBy
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomByRef.current(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [drawing])

  if (!drawing) return <div className="map-board map-board--loading" />

  const pick = spec.pick ?? 'area'
  const right = spec.targets ?? (spec.show ? [spec.show] : [])
  const whole = `0 0 ${drawing.width} ${drawing.height}`
  const view = box ? box.join(' ') : whole
  limits.current = [0, 0, drawing.width, drawing.height]
  boxRef.current = box ?? [0, 0, drawing.width, drawing.height]
  const span = boxRef.current[2] // labels and rings keep their size on screen when zoomed
  const areas = drawing.features.filter((f) => f.kind === 'area')
  // only what the question is about is drawn: a map of every river and range at once is noise
  const asked = (...kinds: MapPick[]) => drawing.features.filter((f) => kinds.includes(f.kind) && (f.kind === pick || (f.kind === 'subway' && pick === 'stop')))
  const oceans = asked('ocean')
  const patches = asked('range', 'desert')
  const lines = asked('river', 'highway', 'subway')
  const stops = asked('stop')
  const canTap = (f: MapFeature) => !!onTap && f.kind === pick
  const zooms = drawing.zooms.map((z) => ({ ...z, viewBox: ZOOM_FIX[spec.id]?.[z.label] ?? z.viewBox }))

  const state = (f: MapFeature) => {
    if (reveal && right.includes(f.id)) return 'right'
    if (reveal && wrong.includes(f.id)) return 'wrong'
    if (selected.includes(f.id)) return 'on'
    if (!reveal && spec.show === f.id) return 'show'
    return ''
  }
  const cls = (base: string, f: MapFeature) =>
    [base, canTap(f) && `${base}--tap`, state(f) && `${base}--${state(f)}`].filter(Boolean).join(' ')
  const tap = (f: MapFeature) => (canTap(f) ? () => onTap?.(f.id) : undefined)
  // a place too small to see gets a ring whenever it is the point of the picture
  const ringed = drawing.features.filter((f) => f.at && (f.small || f.ring) && (f.ring || state(f)))
  const named = reveal ? drawing.features.filter((f) => f.at && (right.includes(f.id) || wrong.includes(f.id))) : []

  return (
    <div className="map-wrap">
      {/* §26 — one "map tap" per tap: the usage log never reads the answer */}
      <svg
        className={`map-board ${spec.id === 'organs' || spec.id === 'skeleton' ? 'map-board--body' : ''}`}
        ref={svgRef}
        viewBox={view}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (pointers.current.size === 0) {
            moved.current = false
            down.current = { x: e.clientX, y: e.clientY }
          }
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId)
          const b = boxRef.current
          if (!prev || !b || !svgRef.current) return
          const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, v]) => v)
          const now = { x: e.clientX, y: e.clientY }
          if (others.length === 0) {
            const r = svgRef.current.getBoundingClientRect()
            // small jitters under a finger are still a tap
            if (!moved.current && Math.hypot(now.x - down.current.x, now.y - down.current.y) < 8) return
            moved.current = true
            const upp = Math.max(b[2] / r.width, b[3] / r.height)
            const [lx, ly, lw, lh] = limits.current
            const x = Math.min(lx + lw - b[2] * 0.2, Math.max(lx - b[2] * 0.8, b[0] - (now.x - prev.x) * upp))
            const y = Math.min(ly + lh - b[3] * 0.2, Math.max(ly - b[3] * 0.8, b[1] - (now.y - prev.y) * upp))
            setBox([x, y, b[2], b[3]])
            pointers.current.set(e.pointerId, now)
          } else {
            moved.current = true
            const o = others[0]
            const before = Math.hypot(prev.x - o.x, prev.y - o.y)
            const after = Math.hypot(now.x - o.x, now.y - o.y)
            pointers.current.set(e.pointerId, now)
            if (before > 0 && after > 0) zoomBy(after / before, (now.x + o.x) / 2, (now.y + o.y) / 2)
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId)
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId)
        }}
        onClickCapture={(e) => {
          if (moved.current) {
            e.stopPropagation()
            moved.current = false
          }
        }}
        role="img"
        aria-label="Map with no names on it"
        data-usage="map tap"
      >
        <path className="map-land" d={drawing.backdrop} />
        {drawing.water && <path className="map-water" d={drawing.water} />}
        {oceans.map((f) => (
          <path key={f.id} className={cls('map-ocean', f)} d={f.d} onClick={tap(f)} />
        ))}
        {areas.map((f) => (
          <path key={f.id} className={cls('map-area', f)} d={f.d} fillRule="evenodd" onClick={tap(f)} />
        ))}
        {patches.map((f) => (
          <g key={f.id}>
            <path className={cls('map-patch', f) + ` map-patch--${f.kind}`} d={f.d} onClick={tap(f)} />
            {f.small && canTap(f) && <path className="map-hit" d={f.d} onClick={tap(f)} />}
          </g>
        ))}
        {areas
          .filter((f) => f.small && canTap(f))
          .map((f) => (
            <path key={f.id} className="map-hit" d={f.d} onClick={tap(f)} />
          ))}
        {lines.map((f) => (
          <g key={f.id}>
            <path
              className={cls('map-line', f) + ` map-line--${f.kind}`}
              d={f.d}
              style={f.color && !state(f) ? { stroke: f.color } : undefined}
            />
            {canTap(f) && <path className="map-hit map-hit--line" d={f.d} onClick={tap(f)} />}
          </g>
        ))}
        {stops.map((f) => (
          <circle key={f.id} className={cls('map-stop', f)} cx={f.at![0]} cy={f.at![1]} r={span * 0.011} onClick={tap(f)} />
        ))}
        {ringed.map((f) => (
          <circle
            key={f.id}
            className={cls('map-ring', f)}
            cx={f.at![0]}
            cy={f.at![1]}
            r={span * 0.022}
            onClick={tap(f)}
          />
        ))}
        {named.map((f) => (
          <text key={f.id} className="map-label" x={f.at![0]} y={f.at![1]} fontSize={span * 0.034}>
            {MAP_NAMES[spec.id][f.id]}
          </text>
        ))}
      </svg>
      {zooms.length > 0 && (pick === 'area' || pick === 'stop') && (
        <div className="map-zooms">
          {zooms.map((z) => (
            <button
              key={z.label}
              type="button"
              className={`btn btn--ghost btn--small ${view === z.viewBox ? 'map-zoom--on' : ''}`}
              onClick={() => {
                sfx.click()
                setBox(view === z.viewBox ? null : z.viewBox.split(' ').map(Number))
              }}
            >
              🔍 {z.label}
            </button>
          ))}
          {box && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setBox(null) }}>
              🗺️ Whole map
            </button>
          )}
        </div>
      )}
    </div>
  )
}
