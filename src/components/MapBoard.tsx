// §14f — the map under a Where Is This? question. No names on it: he finds the
// place by its shape and its neighbours. Names only appear on the answer.
//
// Crowded corners have 🔍 close-ups: PEI is a few pixels wide on a phone, and a
// question he cannot physically tap tests his finger, not his geography.
import { useEffect, useState } from 'react'
import type { QuizMapSpec } from '../types'
import type { MapDrawing, MapFeature, MapId } from '../quiz/maps/types'
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
  const [zoom, setZoom] = useState<string | null>(null)
  if (!drawing) return <div className="map-board map-board--loading" />

  const pick = spec.pick ?? 'area'
  const right = spec.targets ?? (spec.show ? [spec.show] : [])
  const whole = `0 0 ${drawing.width} ${drawing.height}`
  const view = zoom ?? whole
  const span = Number(view.split(' ')[2]) // labels and rings keep their size on screen when zoomed
  const areas = drawing.features.filter((f) => f.kind === 'area')
  const lines = pick === 'area' ? [] : drawing.features.filter((f) => f.kind === pick)
  const canTap = (f: MapFeature) => !!onTap && f.kind === pick

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
        className="map-board"
        viewBox={view}
        role="img"
        aria-label="Map with no names on it"
        data-usage="map tap"
      >
        <path className="map-land" d={drawing.backdrop} />
        {drawing.water && <path className="map-water" d={drawing.water} />}
        {areas.map((f) => (
          <path key={f.id} className={cls('map-area', f)} d={f.d} fillRule="evenodd" onClick={tap(f)} />
        ))}
        {areas
          .filter((f) => f.small && canTap(f))
          .map((f) => (
            <path key={f.id} className="map-hit" d={f.d} onClick={tap(f)} />
          ))}
        {lines.map((f) => (
          <g key={f.id}>
            <path className={cls('map-line', f) + ` map-line--${f.kind}`} d={f.d} />
            {canTap(f) && <path className="map-hit map-hit--line" d={f.d} onClick={tap(f)} />}
          </g>
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
      {drawing.zooms.length > 0 && pick === 'area' && (
        <div className="map-zooms">
          {drawing.zooms.map((z) => (
            <button
              key={z.label}
              type="button"
              className={`btn btn--ghost btn--small ${zoom === z.viewBox ? 'map-zoom--on' : ''}`}
              onClick={() => {
                sfx.click()
                setZoom(zoom === z.viewBox ? null : z.viewBox)
              }}
            >
              🔍 {z.label}
            </button>
          ))}
          {zoom && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setZoom(null) }}>
              🗺️ Whole map
            </button>
          )}
        </div>
      )}
    </div>
  )
}
