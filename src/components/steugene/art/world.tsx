// 🏫 St. Eugene 7 (§24m) — the drawings that ARE his games.
//
// The F3 screen's Y levels, a thermometer in a Toronto January, a health bar
// of hearts, Fortnite's shield over health, the storm closing in, a pizza with
// slices coming out of it. Each one is the place the maths actually happens,
// so the picture explains the operation instead of decorating it.
import { useId } from 'react'
import type { SeArt } from '../../../steugene/types'
import { Sprite } from './sprites'
import { anim, colour, halo, niceStep, signed, stagger, ticksOf } from './anim'

type ArtOf<K extends SeArt['art']> = Extract<SeArt, { art: K }>

// --- Minecraft Y levels ------------------------------------------------------

/** The real layers, by Y. Sky above the grass, stone to 0, deepslate to bedrock. */
const LAYERS: { top: number; bottom: number; fill: string }[] = [
  { top: 999, bottom: 64, fill: '#7fbdf5' },
  { top: 64, bottom: 62, fill: '#5fa83a' },
  { top: 62, bottom: 57, fill: '#8b5a2b' },
  { top: 57, bottom: 0, fill: '#7a7a7a' },
  { top: 0, bottom: -60, fill: '#4a4a54' },
  { top: -60, bottom: -64, fill: '#262626' },
  { top: -64, bottom: -999, fill: '#0b0b0b' },
]

export function YLevel({ art }: { art: ArtOf<'ylevel'> }) {
  const { from, to, marks = [], dig } = art
  const step = art.step ?? niceStep(to - from, 8)
  const W = 320
  const H = 236
  const top = 14
  const bottom = H - 14
  const x0 = 64
  const x1 = 176
  const py = (v: number) => top + ((to - v) / (to - from)) * (bottom - top)
  const clamp = (v: number) => Math.max(top, Math.min(bottom, v))

  // Ore speckles: fixed positions, so the drawing never jitters between renders.
  const speckles: { x: number; y: number; c: string }[] = []
  for (let i = 0; i < 26; i++) {
    const v = from + (0.03 + (((i * 37) % 100) / 100) * 0.94) * (to - from)
    const x = x0 + 8 + ((i * 53) % 92)
    const c = v < 0 ? (i % 5 === 0 ? '#5df2e0' : '#3a3a42') : v < 57 ? (i % 4 === 0 ? '#1f1f1f' : '#686868') : ''
    if (c) speckles.push({ x, y: py(v), c })
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="se-art" role="img" aria-label={`Minecraft Y levels from ${from} to ${to}`}>
      {LAYERS.map((l, i) => {
        const y0 = clamp(py(Math.min(l.top, to)))
        const y1 = clamp(py(Math.max(l.bottom, from)))
        if (y1 <= y0) return null
        return <rect key={i} x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={l.fill} />
      })}
      {speckles.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={5} height={5} fill={s.c} shapeRendering="crispEdges" />
      ))}
      <rect x={x0} y={top} width={x1 - x0} height={bottom - top} fill="none" stroke="var(--line)" strokeWidth={2} rx={3} />

      {dig && (
        <rect
          x={(x0 + x1) / 2 - 11}
          y={py(Math.max(...dig))}
          width={22}
          height={Math.abs(py(dig[0]) - py(dig[1]))}
          fill="rgba(0,0,0,0.55)"
          stroke="var(--yellow)"
          strokeWidth={2}
          {...anim('march')}
        />
      )}

      {ticksOf(from, to, step).map((v) => (
        <g key={v}>
          <line x1={x0 - 6} y1={py(v)} x2={x0} y2={py(v)} stroke={v === 0 ? 'var(--text)' : 'var(--muted)'} strokeWidth={v === 0 ? 2.5 : 1.5} />
          <text x={x0 - 9} y={py(v) + 4} textAnchor="end" fontSize={11} fontWeight={v === 0 ? 900 : 800} fill={v === 0 ? 'var(--text)' : 'var(--muted)'}>
            Y {signed(v)}
          </text>
        </g>
      ))}

      {marks.map((m, i) => {
        const y = py(m.at)
        return (
          <g key={i} {...anim('pop', 250 + i * 220)}>
            <line x1={x0} y1={y} x2={x1 + 12} y2={y} stroke={colour(m.tone)} strokeWidth={2} strokeDasharray="4 3" />
            <g {...(m.icon === 'player' ? anim('bob', 0) : {})}>
              <Sprite icon={m.icon ?? 'player'} x={x1 + 14} y={y - 9} size={18} />
            </g>
            {m.label && (
              <text x={x1 + 37} y={y + 5} fontSize={14} fontWeight={900} fill={colour(m.tone)} style={halo}>
                {m.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// --- the thermometer ---------------------------------------------------------

export function Thermo({ art }: { art: ArtOf<'thermo'> }) {
  const { from, to, at, marks = [], label } = art
  const step = art.step ?? niceStep(to - from, 7)
  const W = 320
  const H = 226
  const top = 14
  const bottom = 178
  const tx = 104
  const py = (v: number) => top + ((to - v) / (to - from)) * (bottom - top)
  const zero = from < 0 && to > 0 ? py(0) : null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="se-art" role="img" aria-label={`thermometer at ${at} degrees`}>
      <rect x={tx - 9} y={top - 6} width={18} height={bottom - top + 14} rx={9} fill="var(--card2)" stroke="var(--line)" strokeWidth={2} />
      {zero !== null && <rect x={tx - 7} y={zero} width={14} height={bottom - zero + 6} fill="rgba(96,191,245,0.25)" />}
      <rect x={tx - 5} y={py(at)} width={10} height={bottom - py(at) + 12} rx={4} fill="#e8312a" {...anim('growy', 150)} />
      <circle cx={tx} cy={bottom + 20} r={16} fill="#e8312a" stroke="var(--line)" strokeWidth={2} />
      {ticksOf(from, to, step).map((v) => (
        <g key={v}>
          <line x1={tx - 16} y1={py(v)} x2={tx - 9} y2={py(v)} stroke={v === 0 ? 'var(--text)' : 'var(--muted)'} strokeWidth={v === 0 ? 2.5 : 1.5} />
          <text x={tx - 20} y={py(v) + 4} textAnchor="end" fontSize={11} fontWeight={800} fill={v === 0 ? 'var(--text)' : 'var(--muted)'}>
            {signed(v)}°C
          </text>
        </g>
      ))}
      {marks.map((m, i) => (
        <g key={i} {...anim('pop', 500 + i * 220)}>
          <line x1={tx + 10} y1={py(m.at)} x2={tx + 34} y2={py(m.at)} stroke="var(--yellow)" strokeWidth={2} />
          <text x={tx + 40} y={py(m.at) + 5} fontSize={14} fontWeight={900} fill="var(--yellow)" style={halo}>
            {m.label ?? `${signed(m.at)}°C`}
          </text>
        </g>
      ))}
      {label && (
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {label}
        </text>
      )}
    </svg>
  )
}

// --- hearts and hunger ---------------------------------------------------------

export function Hearts({ art }: { art: ArtOf<'hearts'> }) {
  const max = art.max ?? 10
  const icon = art.kind ?? 'heart'
  const fullH = Math.round(art.full * 2)
  const lostH = Math.round((art.lost ?? 0) * 2)
  const size = Math.min(26, (300 - (max - 1) * 3) / max)
  const gap = 3
  const W = 320
  const x0 = (W - (max * size + (max - 1) * gap)) / 2
  const H = art.label ? 64 : 42
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="se-art" role="img" aria-label={`${art.full} of ${max} ${icon}s`}>
      {Array.from({ length: max }, (_, i) => {
        const x = x0 + i * (size + gap)
        const have = Math.max(0, Math.min(2, fullH - 2 * i))
        const gone = Math.max(0, Math.min(2, fullH + lostH - 2 * i)) - have
        return (
          <g key={i} {...anim('pop', stagger(i, 55))}>
            <Sprite icon={icon} x={x} y={8} size={size} dim />
            {have > 0 && <Sprite icon={icon} x={x} y={8} size={size} upto={have / 2} />}
            {gone > 0 && (
              <g {...anim('break', 700 + i * 90)}>
                <Sprite icon={icon} x={x} y={8} size={size} from={have / 2} upto={(have + gone) / 2} />
              </g>
            )}
          </g>
        )
      })}
      {art.label && (
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {art.label}
        </text>
      )}
    </svg>
  )
}

// --- Fortnite: shield over health ------------------------------------------------

export function Hp({ art }: { art: ArtOf<'hp'> }) {
  const max = art.max ?? 100
  const W = 320
  const bx = 44
  const bw = 214
  const rows: { y: number; h: number; v: number; fill: string; icon: 'potion' | 'heart' }[] = []
  if (art.shield !== undefined) rows.push({ y: 12, h: 16, v: art.shield, fill: '#3aa0ff', icon: 'potion' })
  rows.push({ y: art.shield !== undefined ? 38 : 14, h: 22, v: art.health, fill: '#57d65a', icon: 'heart' })
  const H = (art.shield !== undefined ? 70 : 46) + (art.label ? 20 : 0)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="se-art" role="img" aria-label={`health ${art.health}${art.shield !== undefined ? `, shield ${art.shield}` : ''}`}>
      {rows.map((r, i) => (
        <g key={i}>
          <Sprite icon={r.icon} x={14} y={r.y + r.h / 2 - 10} size={20} />
          <rect x={bx} y={r.y} width={bw} height={r.h} rx={4} fill="rgba(0,0,0,0.45)" stroke="var(--line)" strokeWidth={1.5} />
          <rect
            x={bx + 2}
            y={r.y + 2}
            width={Math.max(0, ((bw - 4) * Math.min(r.v, max)) / max)}
            height={r.h - 4}
            rx={3}
            fill={r.fill}
            {...anim('growx', 150 + i * 200)}
          />
          {/* the segment ticks Fortnite draws every 25 */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={bx + bw * f} y1={r.y + 2} x2={bx + bw * f} y2={r.y + r.h - 2} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
          ))}
          <text x={bx + bw + 10} y={r.y + r.h / 2 + 6} fontSize={17} fontWeight={900} fill="var(--text)">
            {r.v}
          </text>
        </g>
      ))}
      {art.label && (
        <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {art.label}
        </text>
      )}
    </svg>
  )
}

// --- the storm circle -----------------------------------------------------------

export function Storm({ art }: { art: ArtOf<'storm'> }) {
  const id = useId().replace(/:/g, '')
  const W = 320
  const H = art.label ? 250 : 232
  const cx = 160
  const cy = 112
  const R = 92
  const nr = art.next ? R * art.next : 0
  const ncx = cx + (R - nr) * 0.35
  const ncy = cy - (R - nr) * 0.2
  const both = !!art.r && !!art.d
  const ra = both ? (-58 * Math.PI) / 180 : (-32 * Math.PI) / 180
  const rx = cx + R * Math.cos(ra)
  const ry = cy + R * Math.sin(ra)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="se-art" role="img" aria-label="storm circle">
      <defs>
        <radialGradient id={`storm-${id}`}>
          <stop offset="55%" stopColor="#7b3fe4" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#4a1a8c" stopOpacity={0.95} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={W} height={232} rx={14} fill="#3a1670" />
      <rect x={0} y={0} width={W} height={232} rx={14} fill={`url(#storm-${id})`} {...anim('pulse')} />
      {/* the safe zone: grass, trees, a lake */}
      <circle cx={cx} cy={cy} r={R} fill="#3f8f4c" {...anim('pop', 0)} />
      <circle cx={cx - 40} cy={cy - 30} r={14} fill="#2f6e3a" />
      <circle cx={cx + 30} cy={cy + 38} r={18} fill="#2f6e3a" />
      <circle cx={cx - 52} cy={cy + 26} r={10} fill="#2f6e3a" />
      <ellipse cx={cx + 44} cy={cy - 40} rx={20} ry={11} fill="#3f76e4" />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#ffffff" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={R + 7} fill="none" stroke="#c78bff" strokeWidth={10} opacity={0.5} {...anim('pulse', 400)} />

      {art.next && (
        <circle cx={ncx} cy={ncy} r={nr} fill="rgba(255,255,255,0.08)" stroke="#ffffff" strokeWidth={2} strokeDasharray="6 5" {...anim('march')} />
      )}

      {art.ring && (
        <>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--yellow)" strokeWidth={4} strokeDasharray="10 7" {...anim('march')} />
          <g {...anim('orbit', 0, { transformOrigin: `${cx}px ${cy}px` })}>
            <Sprite icon="player" x={cx - 9} y={cy - R - 9} size={18} />
          </g>
          <text x={cx} y={cy + R + 22} textAnchor="middle" fontSize={15} fontWeight={900} fill="var(--yellow)" style={halo}>
            around the edge: {art.ring}
          </text>
        </>
      )}

      {art.d && (
        <g {...anim('fade', 300)}>
          <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="var(--yellow)" strokeWidth={3} pathLength={1} {...anim('draw', 300)} />
          <text x={cx - R / 2} y={cy + 20} textAnchor="middle" fontSize={15} fontWeight={900} fill="var(--yellow)" style={halo}>
            d = {art.d}
          </text>
        </g>
      )}
      {art.r && (
        <g {...anim('fade', 500)}>
          <line x1={cx} y1={cy} x2={rx} y2={ry} stroke="#ffffff" strokeWidth={3} pathLength={1} {...anim('draw', 500)} />
          <text x={(cx + rx) / 2 + 10} y={(cy + ry) / 2 + 2} fontSize={15} fontWeight={900} fill="#ffffff" style={halo}>
            r = {art.r}
          </text>
        </g>
      )}
      <circle cx={cx} cy={cy} r={4} fill="#ffffff" />
      {art.label && (
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {art.label}
        </text>
      )}
    </svg>
  )
}

// --- pizza -------------------------------------------------------------------------

export function Pizza({ art }: { art: ArtOf<'pizza'> }) {
  const n = art.pies.length
  const W = 320
  const slot = W / n
  const Rmax = Math.min(slot / 2 - 10, 64)
  const cy = Rmax + 12
  const anyLabel = art.pies.some((p) => p.label)
  const H = cy + Rmax + (anyLabel ? 30 : 12) + (art.label ? 20 : 0)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="se-art" role="img" aria-label={art.label ?? 'pizza'}>
      {art.pies.map((p, k) => {
        const R = Rmax * Math.max(0.35, Math.min(1, p.size ?? 1))
        const cx = slot * k + slot / 2
        const take = p.take ?? 0
        const gone = p.gone ?? 0
        const sector = (i: number, r: number) => {
          const a0 = (i / p.slices) * Math.PI * 2 - Math.PI / 2
          const a1 = ((i + 1) / p.slices) * Math.PI * 2 - Math.PI / 2
          const big = a1 - a0 > Math.PI ? 1 : 0
          if (p.slices === 1) return `M${cx - r},${cy} a${r},${r} 0 1 1 ${2 * r},0 a${r},${r} 0 1 1 ${-2 * r},0`
          return `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${big} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`
        }
        return (
          <g key={k} {...anim('pop', k * 180)}>
            <circle cx={cx} cy={cy} r={R + 2} fill="rgba(0,0,0,0.25)" />
            {Array.from({ length: p.slices }, (_, i) => {
              const mid = ((i + 0.5) / p.slices) * Math.PI * 2 - Math.PI / 2
              const out = i < take
              const eaten = !out && i < take + gone
              if (eaten) {
                return <path key={i} d={sector(i, R)} fill="rgba(255,255,255,0.05)" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 3" {...anim('fade', 300)} />
              }
              const dx = out ? Math.cos(mid) * 8 : 0
              const dy = out ? Math.sin(mid) * 8 : 0
              const pep = (f: number, twist: number) => ({
                cx: cx + Math.cos(mid + twist) * R * f,
                cy: cy + Math.sin(mid + twist) * R * f,
              })
              const many = p.slices > 10
              return (
                <g
                  key={i}
                  transform={out ? `translate(${dx} ${dy})` : undefined}
                  {...(out ? anim('slide', 450 + i * 120, { '--dx': `${dx}px`, '--dy': `${dy}px` }) : {})}
                >
                  <path d={sector(i, R)} fill="#c98a3a" />
                  <path d={sector(i, R - 6)} fill="#ffcf4a" />
                  <circle {...pep(0.52, 0)} r={many ? 3.2 : 4.5} fill="#d1351b" />
                  {!many && <circle {...pep(0.78, 0.12)} r={3.6} fill="#d1351b" />}
                  <path d={sector(i, R)} fill="none" stroke={out ? 'var(--yellow)' : '#8a5a1f'} strokeWidth={out ? 2.5 : 1.2} />
                </g>
              )
            })}
            {p.label && (
              <text x={cx} y={cy + Rmax + 22} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
                {p.label}
              </text>
            )}
          </g>
        )
      })}
      {art.label && (
        <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {art.label}
        </text>
      )}
    </svg>
  )
}
