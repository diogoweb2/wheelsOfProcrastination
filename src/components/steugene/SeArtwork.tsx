// 🏫 St. Eugene 7 (§24) — the drawings.
//
// He reads slowly, so nearly every block in a lesson carries a picture. The
// classic six (number line, fraction bar and circle, counters, balance scale,
// comparison bars) live here; the ones from his own games — Y levels, hearts,
// the storm, pizzas, block floors, code — live in `./art/`. Each one is a
// single line to author in a pack, which is the only reason packs end up with
// pictures on every card instead of a wall of text.
//
// All inline SVG or plain HTML, all theme colours, no files in `public/`
// (CLAUDE.md). Every drawing animates in when its card opens (§24b).
import type { SeArt } from '../../steugene/types'
import { anim, colour, halo } from './art/anim'
import { Hearts, Hp, Pizza, Storm, Thermo, YLevel } from './art/world'
import { Angle, Blocks, Plane, Prism, Shape } from './art/space'
import { Chart, CircleGraph, Code, Dice, Items, Receipt, Shop, Slots, Spinner, Table } from './art/data'

export function SeArtwork({ art }: { art: SeArt }) {
  switch (art.art) {
    case 'numberline':
      return <NumberLine art={art} />
    case 'bar':
      return <FractionBar art={art} />
    case 'pie':
      return <FractionPie art={art} />
    case 'counters':
      return <Counters art={art} />
    case 'scale':
      return <Scale art={art} />
    case 'bars':
      return <Bars art={art} />
    case 'ylevel':
      return <YLevel art={art} />
    case 'thermo':
      return <Thermo art={art} />
    case 'hearts':
      return <Hearts art={art} />
    case 'hp':
      return <Hp art={art} />
    case 'storm':
      return <Storm art={art} />
    case 'pizza':
      return <Pizza art={art} />
    case 'blocks':
      return <Blocks art={art} />
    case 'prism':
      return <Prism art={art} />
    case 'plane':
      return <Plane art={art} />
    case 'angle':
      return <Angle art={art} />
    case 'shape':
      return <Shape art={art} />
    case 'code':
      return <Code art={art} />
    case 'table':
      return <Table art={art} />
    case 'items':
      return <Items art={art} />
    case 'slots':
      return <Slots art={art} />
    case 'spinner':
      return <Spinner art={art} />
    case 'dice':
      return <Dice art={art} />
    case 'shop':
      return <Shop art={art} />
    case 'receipt':
      return <Receipt art={art} />
    case 'chart':
      return <Chart art={art} />
    case 'circlegraph':
      return <CircleGraph art={art} />
  }
}

// --- The number line ---------------------------------------------------------

function NumberLine({ art }: { art: Extract<SeArt, { art: 'numberline' }> }) {
  const { from, to, step = 1, points = [], span, hops = [] } = art
  const W = 320
  const lift = hops.length ? 44 : 0
  const below = hops.length > 0 && points.some((p) => p.label)
  const H = (points.some((p) => p.label) ? 92 : 64) + lift + (below ? 18 : 0)
  const pad = 16
  const y = 44 + lift
  const x = (v: number) => pad + ((v - from) / (to - from)) * (W - pad * 2)

  const ticks: number[] = []
  // Walk in integer multiples of `step` so a fractional step never drifts.
  for (let i = 0; from + i * step <= to + 1e-9; i++) ticks.push(Number((from + i * step).toFixed(6)))
  // A long line labels every other tick, or the numbers collide.
  const every = ticks.length > 21 ? 2 : 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="se-art" role="img" aria-label="number line">
      {span && (
        <rect
          x={x(Math.min(...span))}
          y={y - 11}
          width={Math.abs(x(span[1]) - x(span[0]))}
          height={22}
          rx={6}
          fill="var(--yellow)"
          opacity={0.22}
          {...anim('growx', 200)}
        />
      )}
      <line x1={pad - 8} y1={y} x2={W - pad + 8} y2={y} stroke="var(--muted)" strokeWidth={2} />
      {/* arrowheads: the line does not stop, and that is the point of it */}
      <path d={`M${pad - 8},${y} l7,-5 v10 z`} fill="var(--muted)" />
      <path d={`M${W - pad + 8},${y} l-7,-5 v10 z`} fill="var(--muted)" />

      {ticks.map((v, i) => (
        <g key={v}>
          <line
            x1={x(v)}
            y1={y - (v === 0 ? 10 : 6)}
            x2={x(v)}
            y2={y + (v === 0 ? 10 : 6)}
            stroke={v === 0 ? 'var(--text)' : 'var(--line)'}
            strokeWidth={v === 0 ? 2.5 : 1.5}
          />
          {(i % every === 0 || v === 0) && (
            <text x={x(v)} y={y + 24} textAnchor="middle" fontSize={11} fontWeight={800} fill="var(--muted)">
              {v < 0 ? `−${-v}` : v}
            </text>
          )}
        </g>
      ))}

      {hops.map((h, i) => {
        const x1 = x(h.from)
        const x2 = x(h.to)
        const mx = (x1 + x2) / 2
        const lift2 = Math.min(38, 14 + Math.abs(x2 - x1) * 0.22)
        const y0 = y - 5
        const cy = y0 - 2 * lift2
        const ang = Math.atan2(y0 - cy, x2 - mx)
        const tip = (d: number) => `${x2 - 10 * Math.cos(ang + d)},${y0 - 10 * Math.sin(ang + d)}`
        const delay = 300 + i * 650
        return (
          <g key={`h${i}`}>
            <path d={`M${x1},${y0} Q${mx},${cy} ${x2},${y0}`} fill="none" stroke={colour(h.tone ?? 'focus')} strokeWidth={3} pathLength={1} {...anim('draw', delay)} />
            <polygon points={`${x2},${y0} ${tip(0.45)} ${tip(-0.45)}`} fill={colour(h.tone ?? 'focus')} {...anim('pop', delay + 500)} />
            {h.label && (
              <text x={mx} y={y0 - lift2 - 8} textAnchor="middle" fontSize={14} fontWeight={900} fill={colour(h.tone ?? 'focus')} {...anim('fade', delay + 300, halo)}>
                {h.label}
              </text>
            )}
          </g>
        )
      })}

      {points.map((p, i) => (
        <g key={i} {...anim('pop', 120 + i * 160)}>
          <circle cx={x(p.at)} cy={y} r={7} fill={colour(p.tone)} stroke="var(--bg)" strokeWidth={2} />
          {p.label && (
            <text x={x(p.at)} y={below ? y + 44 : y - 16} textAnchor="middle" fontSize={13} fontWeight={900} fill={colour(p.tone)} style={halo}>
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// --- Fractions ---------------------------------------------------------------

function FractionBar({ art }: { art: Extract<SeArt, { art: 'bar' }> }) {
  const { parts, filled, label, tone } = art
  const W = 320
  const w = (W - 20) / parts
  return (
    <svg viewBox={`0 0 ${W} ${label ? 74 : 54}`} className="se-art" role="img" aria-label={label ?? 'fraction bar'}>
      {Array.from({ length: parts }, (_, i) => (
        <rect
          key={i}
          x={10 + i * w}
          y={10}
          width={w - 2}
          height={34}
          rx={4}
          fill={i < filled ? colour(tone) : 'var(--card2)'}
          stroke="var(--line)"
          strokeWidth={1.5}
          {...anim('pop', i < filled ? 150 + i * 90 : 0)}
        />
      ))}
      {label && (
        <text x={W / 2} y={66} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {label}
        </text>
      )}
    </svg>
  )
}

function FractionPie({ art }: { art: Extract<SeArt, { art: 'pie' }> }) {
  const { parts, filled, label, tone } = art
  const r = 42
  const c = 50
  const slice = (i: number) => {
    const a0 = (i / parts) * Math.PI * 2 - Math.PI / 2
    const a1 = ((i + 1) / parts) * Math.PI * 2 - Math.PI / 2
    const big = a1 - a0 > Math.PI ? 1 : 0
    return `M${c},${c} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 ${big} 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} Z`
  }
  return (
    <svg viewBox={`0 0 100 ${label ? 118 : 100}`} className="se-art se-art--small" role="img" aria-label={label ?? 'fraction circle'}>
      {Array.from({ length: parts }, (_, i) => (
        <path
          key={i}
          d={slice(i)}
          fill={i < filled ? colour(tone) : 'var(--card2)'}
          stroke="var(--line)"
          strokeWidth={1.5}
          {...anim('pop', i < filled ? 150 + i * 110 : 0, { transformOrigin: `${c}px ${c}px`, transformBox: 'view-box' })}
        />
      ))}
      {label && (
        <text x={50} y={112} textAnchor="middle" fontSize={12} fontWeight={900} fill="var(--text)">
          {label}
        </text>
      )}
    </svg>
  )
}

// --- Integer counters --------------------------------------------------------

/**
 * The picture that makes "−7 + 12" obvious: twelve green discs, seven red ones,
 * and the pairs that cancel struck through. Nothing here is a metaphor — this
 * is literally how the textbook does it, which is the point.
 */
function Counters({ art }: { art: Extract<SeArt, { art: 'counters' }> }) {
  const { pos, neg, cancel } = art
  const per = 10
  const rows = Math.max(Math.ceil(pos / per), Math.ceil(neg / per))
  const H = rows * 60 + 14
  const zeroPairs = cancel ? Math.min(pos, neg) : 0
  const disc = (i: number, kind: 'pos' | 'neg') => {
    const x = 18 + (i % per) * 29
    const y = 18 + Math.floor(i / per) * 30 + (kind === 'neg' ? rows * 30 + 4 : 0)
    const dead = i < zeroPairs
    return (
      <g key={`${kind}${i}`} opacity={dead ? 0.35 : 1} {...anim('pop', Math.min(900, i * 45 + (kind === 'neg' ? 120 : 0)))}>
        <circle cx={x} cy={y} r={11} fill={kind === 'pos' ? 'var(--profit)' : 'var(--red)'} />
        <text x={x} y={y + 5} textAnchor="middle" fontSize={15} fontWeight={900} fill="#0c2338">
          {kind === 'pos' ? '+' : '−'}
        </text>
        {dead && <line x1={x - 13} y1={y + 13} x2={x + 13} y2={y - 13} stroke="var(--text)" strokeWidth={2} pathLength={1} {...anim('draw', 900 + i * 80)} />}
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label={`${pos} positive and ${neg} negative counters`}>
      {Array.from({ length: pos }, (_, i) => disc(i, 'pos'))}
      {Array.from({ length: neg }, (_, i) => disc(i, 'neg'))}
    </svg>
  )
}

// --- The balance scale -------------------------------------------------------

function Scale({ art }: { art: Extract<SeArt, { art: 'scale' }> }) {
  const tilt = art.tilt ?? 0
  const dy = tilt * 12
  return (
    <svg viewBox="0 0 320 110" className="se-art" role="img" aria-label="balance scale">
      <line x1={160} y1={28} x2={160} y2={92} stroke="var(--muted)" strokeWidth={4} />
      <path d="M130,96 h60 l-8,-8 h-44 z" fill="var(--muted)" />
      <line x1={60} y1={28 + dy} x2={260} y2={28 - dy} stroke="var(--text)" strokeWidth={4} strokeLinecap="round" />
      {([
        [60, 28 + dy, art.left],
        [260, 28 - dy, art.right],
      ] as const).map(([x, y, label], i) => (
        <g key={i} {...anim('drop', 150 + i * 200)}>
          <line x1={x} y1={y} x2={x} y2={y + 20} stroke="var(--muted)" strokeWidth={2} />
          <rect x={x - 56} y={y + 20} width={112} height={32} rx={8} fill="var(--card2)" stroke="var(--line)" strokeWidth={2} />
          <text x={x} y={y + 41} textAnchor="middle" fontSize={15} fontWeight={900} fill="var(--text)">
            {label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// --- Proportional bars -------------------------------------------------------

function Bars({ art }: { art: Extract<SeArt, { art: 'bars' }> }) {
  const max = Math.max(...art.rows.map((r) => Math.abs(r.value)), 1)
  const H = art.rows.length * 30 + 8
  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label="comparison bars">
      {art.rows.map((r, i) => (
        <g key={i}>
          <text x={0} y={i * 30 + 24} fontSize={12} fontWeight={800} fill="var(--muted)">
            {r.label}
          </text>
          <rect
            x={86}
            y={i * 30 + 10}
            width={Math.max(3, (Math.abs(r.value) / max) * 180)}
            height={18}
            rx={5}
            fill={colour(r.tone)}
            {...anim('growx', 120 + i * 140)}
          />
          <text x={274} y={i * 30 + 24} fontSize={12} fontWeight={900} fill="var(--text)">
            {r.value}
            {art.unit ?? ''}
          </text>
        </g>
      ))}
    </svg>
  )
}
