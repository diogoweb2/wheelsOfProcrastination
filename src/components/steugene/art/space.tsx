// 🏫 St. Eugene 7 (§24b) — the drawings for space: floors, boxes, the plane,
// angles and shapes.
//
// One block is one metre in Minecraft, exactly, which makes a build the best
// measuring tape he owns: an area is blocks you can count, a volume is a box
// of them, and the F3 screen is already a Cartesian plane with X and Z.
import { useId, type ReactNode } from 'react'
import type { SeArt, SeTile } from '../../../steugene/types'
import { Sprite, TileRect } from './sprites'
import { TILES } from './tiles'
import { anim, colour, halo, stagger, ticksOf } from './anim'

type ArtOf<K extends SeArt['art']> = Extract<SeArt, { art: K }>

// --- a floor of blocks ------------------------------------------------------------

export function Blocks({ art }: { art: ArtOf<'blocks'> }) {
  const { w, h, holes = [], paint = [] } = art
  const tile = art.tile ?? 'grass'
  const side = art.hLabel ? 70 : 0
  const s = Math.min(24, (304 - side) / w, 176 / h)
  const gw = s * w
  const gh = s * h
  const ox = (320 - side - gw) / 2
  const oy = art.wLabel ? 30 : 10
  const H = oy + gh + 12 + (art.label ? 22 : 0)

  const inHole = (x: number, y: number) => holes.some(([hx, hy, hw, hh]) => x >= hx && x < hx + hw && y >= hy && y < hy + hh)
  const tileAt = (x: number, y: number): SeTile => paint.find((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)?.tile ?? tile
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !inHole(x, y)

  // The outline is every cell edge that has no neighbour on its far side, so
  // an L-shaped base gets an L-shaped perimeter for free.
  let edge = ''
  if (art.edge) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!filled(x, y)) continue
        const X = ox + x * s
        const Y = oy + y * s
        if (!filled(x, y - 1)) edge += `M${X},${Y}h${s}`
        if (!filled(x, y + 1)) edge += `M${X},${Y + s}h${s}`
        if (!filled(x - 1, y)) edge += `M${X},${Y}v${s}`
        if (!filled(x + 1, y)) edge += `M${X + s},${Y}v${s}`
      }
  }

  const cells = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!filled(x, y)) continue
      cells.push(
        <g key={`${x}-${y}`} {...anim('drop', stagger(y * w + x, 14, 750))}>
          <TileRect tile={tileAt(x, y)} x={ox + x * s} y={oy + y * s} s={s} />
        </g>,
      )
    }

  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label={`${w} by ${h} blocks`}>
      {cells}
      {art.edge && <path d={edge} fill="none" stroke="var(--yellow)" strokeWidth={3.5} strokeLinecap="square" {...anim('march')} />}
      {art.wLabel && (
        <g {...anim('fade', 500)}>
          <path d={`M${ox},${oy - 6}v-6h${gw}v6`} fill="none" stroke="var(--text)" strokeWidth={1.5} />
          <text x={ox + gw / 2} y={oy - 16} textAnchor="middle" fontSize={14} fontWeight={900} fill="var(--text)">
            {art.wLabel}
          </text>
        </g>
      )}
      {art.hLabel && (
        <g {...anim('fade', 650)}>
          <path d={`M${ox + gw + 6},${oy}h6v${gh}h-6`} fill="none" stroke="var(--text)" strokeWidth={1.5} />
          <text x={ox + gw + 18} y={oy + gh / 2 + 5} fontSize={14} fontWeight={900} fill="var(--text)">
            {art.hLabel}
          </text>
        </g>
      )}
      {art.label && (
        <text x={160} y={H - 6} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {art.label}
        </text>
      )}
    </svg>
  )
}

// --- solids ----------------------------------------------------------------------

type P3 = [number, number, number]

/** Isometric: x runs down-right, z down-left, y straight up. */
const iso = ([x, y, z]: P3): [number, number] => [(x - z) * 0.866, (x + z) * 0.5 - y]

export function Prism({ art }: { art: ArtOf<'prism'> }) {
  if (art.base === 'circle') return <Cylinder art={art} />
  const { l, w, h, labels = {} } = art
  const tile = art.tile ?? (art.base === 'tri' ? 'plank' : 'stone')
  const [base, dark, light] = TILES[tile]
  const glass = tile === 'glass'

  const corners: P3[] =
    art.base === 'rect'
      ? [[0, 0, 0], [l, 0, 0], [l, 0, w], [0, 0, w], [0, h, 0], [l, h, 0], [l, h, w], [0, h, w]]
      : [[0, 0, 0], [l, 0, 0], [l, 0, w], [0, 0, w], [0, h, w / 2], [l, h, w / 2]]
  const flat = corners.map(iso)
  const minX = Math.min(...flat.map((p) => p[0]))
  const maxX = Math.max(...flat.map((p) => p[0]))
  const minY = Math.min(...flat.map((p) => p[1]))
  const maxY = Math.max(...flat.map((p) => p[1]))
  const k = Math.min(250 / (maxX - minX), 170 / (maxY - minY))
  const H = 170 + 50 + (art.label ? 20 : 0)
  const ox = 160 - ((minX + maxX) / 2) * k
  const oy = 26 - minY * k
  const P = (p: P3) => {
    const [x, y] = iso(p)
    return [ox + x * k, oy + y * k] as [number, number]
  }
  const poly = (pts: P3[]) => pts.map((p) => P(p).join(',')).join(' ')
  const line = (a: P3, b: P3, key: string, stroke = 'rgba(0,0,0,0.3)') => {
    const [x1, y1] = P(a)
    const [x2, y2] = P(b)
    return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={1} />
  }

  const faces: { pts: P3[]; fill: string; grid?: ReactNode[] }[] = []
  if (art.base === 'rect') {
    const grid = l <= 16 && w <= 16 && h <= 16
    const g = (fn: () => ReactNode[]) => (grid ? fn() : [])
    faces.push({
      pts: [[0, h, 0], [l, h, 0], [l, h, w], [0, h, w]],
      fill: light,
      grid: g(() => [
        ...Array.from({ length: l - 1 }, (_, i) => line([i + 1, h, 0], [i + 1, h, w], `t${i}`)),
        ...Array.from({ length: w - 1 }, (_, j) => line([0, h, j + 1], [l, h, j + 1], `u${j}`)),
      ]),
    })
    faces.push({
      pts: [[l, 0, 0], [l, h, 0], [l, h, w], [l, 0, w]],
      fill: dark,
      grid: g(() => [
        ...Array.from({ length: h - 1 }, (_, i) => line([l, i + 1, 0], [l, i + 1, w], `r${i}`)),
        ...Array.from({ length: w - 1 }, (_, j) => line([l, 0, j + 1], [l, h, j + 1], `s${j}`)),
      ]),
    })
    faces.push({
      pts: [[0, 0, w], [l, 0, w], [l, h, w], [0, h, w]],
      fill: base,
      grid: g(() => [
        ...Array.from({ length: h - 1 }, (_, i) => line([0, i + 1, w], [l, i + 1, w], `f${i}`)),
        ...Array.from({ length: l - 1 }, (_, j) => line([j + 1, 0, w], [j + 1, h, w], `g${j}`)),
      ]),
    })
  } else {
    // Only the faces that point at the viewer — a convex solid needs no sorting.
    if (w / 2 > h) faces.push({ pts: [[0, 0, 0], [l, 0, 0], [l, h, w / 2], [0, h, w / 2]], fill: light })
    faces.push({ pts: [[0, h, w / 2], [l, h, w / 2], [l, 0, w], [0, 0, w]], fill: base })
    faces.push({ pts: [[l, 0, 0], [l, 0, w], [l, h, w / 2]], fill: dark })
  }

  const water = art.base === 'rect' && art.water ? Math.min(art.water, h) : 0
  const lab = (a: P3, b: P3, text: string | undefined, dx: number, dy: number, key: string) => {
    if (!text) return null
    const [x1, y1] = P(a)
    const [x2, y2] = P(b)
    return (
      <text key={key} x={(x1 + x2) / 2 + dx} y={(y1 + y2) / 2 + dy} textAnchor="middle" fontSize={14} fontWeight={900} fill="var(--text)" style={halo}>
        {text}
      </text>
    )
  }

  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label={art.label ?? `${art.base} prism`}>
      <g {...anim('pop')}>
        {water > 0 && (
          <g {...anim('growy', 500)}>
            <polygon points={poly([[l, 0, 0], [l, water, 0], [l, water, w], [l, 0, w]])} fill="#2c58b8" />
            <polygon points={poly([[0, 0, w], [l, 0, w], [l, water, w], [0, water, w]])} fill="#3f76e4" />
            <polygon points={poly([[0, water, 0], [l, water, 0], [l, water, w], [0, water, w]])} fill="#6f9cf0" {...anim('wave', 1200)} />
          </g>
        )}
        {faces.map((f, i) => (
          <g key={i}>
            <polygon points={poly(f.pts)} fill={f.fill} opacity={glass ? 0.35 : 1} stroke="rgba(0,0,0,0.45)" strokeWidth={1.5} strokeLinejoin="round" />
            {f.grid}
          </g>
        ))}
        {art.base === 'tri' && labels.h && (
          <line
            x1={P([l, 0, w / 2])[0]}
            y1={P([l, 0, w / 2])[1]}
            x2={P([l, h, w / 2])[0]}
            y2={P([l, h, w / 2])[1]}
            stroke="var(--yellow)"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )}
      </g>
      <g {...anim('fade', 600)}>
        {lab([0, 0, w], [l, 0, w], labels.l, -14, 18, 'l')}
        {lab([l, 0, w], [l, 0, 0], labels.w, 22, 16, 'w')}
        {art.base === 'rect'
          ? lab([0, 0, w], [0, h, w], labels.h, -26, 4, 'h')
          : lab([l, 0, w / 2], [l, h, w / 2], labels.h, 18, 8, 'h')}
      </g>
      {art.label && (
        <text x={160} y={H - 6} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {art.label}
        </text>
      )}
    </svg>
  )
}

function Cylinder({ art }: { art: ArtOf<'prism'> }) {
  const r = art.l
  const h = art.h
  const labels = art.labels ?? {}
  const k = Math.min(100 / r, 160 / (h + 0.7 * r))
  const R = r * k
  const ry = R * 0.32
  const hh = h * k
  const cx = 150
  const top = 20 + ry
  const H = top + hh + ry + 24 + (art.label ? 20 : 0)
  const [base, dark, light] = TILES[art.tile ?? 'plank']
  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label={art.label ?? 'cylinder'}>
      <g {...anim('pop')}>
        <path d={`M${cx - R},${top} v${hh} a${R},${ry} 0 0 0 ${2 * R},0 v${-hh} z`} fill={base} stroke="rgba(0,0,0,0.45)" strokeWidth={1.5} />
        <path d={`M${cx + R * 0.35},${top + ry * 0.94} v${hh}`} stroke={dark} strokeWidth={R * 0.5} opacity={0.5} />
        <ellipse cx={cx} cy={top} rx={R} ry={ry} fill={light} stroke="rgba(0,0,0,0.45)" strokeWidth={1.5} />
      </g>
      <g {...anim('fade', 500)}>
        {labels.l && (
          <>
            <line x1={cx} y1={top} x2={cx + R} y2={top} stroke="var(--yellow)" strokeWidth={2.5} />
            <circle cx={cx} cy={top} r={3} fill="var(--yellow)" />
            <text x={cx + R / 2} y={top - 6} textAnchor="middle" fontSize={14} fontWeight={900} fill="var(--yellow)" style={halo}>
              {labels.l}
            </text>
          </>
        )}
        {labels.h && (
          <>
            <path d={`M${cx + R + 8},${top}h6v${hh}h-6`} fill="none" stroke="var(--text)" strokeWidth={1.5} />
            <text x={cx + R + 20} y={top + hh / 2 + 5} fontSize={14} fontWeight={900} fill="var(--text)">
              {labels.h}
            </text>
          </>
        )}
      </g>
      {art.label && (
        <text x={160} y={H - 6} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {art.label}
        </text>
      )}
    </svg>
  )
}

// --- the Cartesian plane ---------------------------------------------------------------

export function Plane({ art }: { art: ArtOf<'plane'> }) {
  const [x0, x1] = art.x
  const [y0, y1] = art.y
  const step = art.step ?? 1
  const ystep = art.ystep ?? step
  // Same units on both axes → square cells. A real-world graph (Robux against
  // weeks) gets its own y scale instead, or it would be a sliver.
  const free = art.ystep !== undefined
  const cx = free ? 270 / (x1 - x0) : Math.min(296 / (x1 - x0), 236 / (y1 - y0))
  const cy = free ? 200 / (y1 - y0) : cx
  const gw = cx * (x1 - x0)
  const gh = cy * (y1 - y0)
  const ox = free ? 36 : (320 - gw) / 2
  const oy = 22
  const H = oy + gh + 14
  const X = (v: number) => ox + (v - x0) * cx
  const Y = (v: number) => oy + (y1 - v) * cy
  const every = cx * step < 15 ? 2 : 1
  const everyY = cy * ystep < 15 ? 2 : 1
  const xs = ticksOf(x0, x1, step)
  const ys = ticksOf(y0, y1, ystep)

  // y = mx + b, cut to the window.
  const clip = (m: number, b: number) => {
    const pts: [number, number][] = []
    for (const x of [x0, x1]) {
      const y = m * x + b
      if (y >= y0 - 1e-9 && y <= y1 + 1e-9) pts.push([x, y])
    }
    if (m !== 0)
      for (const y of [y0, y1]) {
        const x = (y - b) / m
        if (x > x0 && x < x1) pts.push([x, y])
      }
    return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null
  }

  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label="coordinate grid">
      <rect x={ox} y={oy} width={gw} height={gh} fill="rgba(0,0,0,0.18)" rx={4} />
      {xs.map((v) => (
        <line key={`gx${v}`} x1={X(v)} y1={oy} x2={X(v)} y2={oy + gh} stroke="var(--line)" strokeWidth={v === 0 ? 0 : 0.8} opacity={0.6} />
      ))}
      {ys.map((v) => (
        <line key={`gy${v}`} x1={ox} y1={Y(v)} x2={ox + gw} y2={Y(v)} stroke="var(--line)" strokeWidth={v === 0 ? 0 : 0.8} opacity={0.6} />
      ))}
      {y0 <= 0 && y1 >= 0 && <line x1={ox} y1={Y(0)} x2={ox + gw} y2={Y(0)} stroke="var(--text)" strokeWidth={2} />}
      {x0 <= 0 && x1 >= 0 && <line x1={X(0)} y1={oy} x2={X(0)} y2={oy + gh} stroke="var(--text)" strokeWidth={2} />}
      {xs.map((v, i) =>
        v !== 0 && i % every === 0 ? (
          <text key={`tx${v}`} x={X(v)} y={(y0 <= 0 && y1 >= 0 ? Y(0) : oy + gh) + 13} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--muted)">
            {v < 0 ? `−${-v}` : v}
          </text>
        ) : null,
      )}
      {ys.map((v, i) =>
        v !== 0 && i % everyY === 0 ? (
          <text key={`ty${v}`} x={(x0 <= 0 && x1 >= 0 ? X(0) : ox) - 4} y={Y(v) + 4} textAnchor="end" fontSize={10} fontWeight={800} fill="var(--muted)">
            {v < 0 ? `−${-v}` : v}
          </text>
        ) : null,
      )}
      {x0 <= 0 && x1 >= 0 && y0 <= 0 && y1 >= 0 && (
        <text x={X(0) - 4} y={Y(0) + 13} textAnchor="end" fontSize={10} fontWeight={800} fill="var(--muted)">
          0
        </text>
      )}
      <text x={ox + gw - 2} y={(y0 <= 0 && y1 >= 0 ? Y(0) : oy + gh) - 6} textAnchor="end" fontSize={13} fontWeight={900} fill="var(--yellow)">
        {art.xName ?? 'x'}
      </text>
      <text x={x0 <= 0 && x1 >= 0 ? X(0) : ox} y={oy - 7} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--yellow)">
        {art.yName ?? 'y'}
      </text>

      {(art.polys ?? []).map((p, i) => {
        const pts = p.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')
        const mx = p.pts.reduce((n, q) => n + q[0], 0) / p.pts.length
        const my = p.pts.reduce((n, q) => n + q[1], 0) / p.pts.length
        return (
          <g key={`p${i}`} {...anim('fade', 200 + i * 450)}>
            <polygon points={pts} fill={colour(p.tone)} fillOpacity={0.25} stroke={colour(p.tone)} strokeWidth={2.5} strokeDasharray={p.dash ? '5 4' : undefined} strokeLinejoin="round" />
            {p.label && (
              <text x={X(mx)} y={Y(my) + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="var(--text)" style={halo}>
                {p.label}
              </text>
            )}
          </g>
        )
      })}
      {(art.lines ?? []).map((ln, i) => {
        const seg = clip(ln.m, ln.b)
        if (!seg) return null
        const [[ax, ay], [bx, by]] = seg
        return (
          <g key={`l${i}`}>
            <line x1={X(ax)} y1={Y(ay)} x2={X(bx)} y2={Y(by)} stroke={colour(ln.tone)} strokeWidth={3} strokeLinecap="round" pathLength={1} {...anim('draw', 200 + i * 400)} />
            {ln.label && (
              <text x={X(bx) - 4} y={Y(by) + (by >= y1 - 1e-9 ? 16 : -8)} textAnchor="end" fontSize={13} fontWeight={900} fill={colour(ln.tone)} style={halo}>
                {ln.label}
              </text>
            )}
          </g>
        )
      })}
      {(art.segs ?? []).map((sg, i) => (
        <line
          key={`s${i}`}
          x1={X(sg.from[0])}
          y1={Y(sg.from[1])}
          x2={X(sg.to[0])}
          y2={Y(sg.to[1])}
          stroke={colour(sg.tone)}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={sg.dash ? '5 5' : undefined}
          pathLength={sg.dash ? undefined : 1}
          {...anim(sg.dash ? 'fade' : 'draw', 300 + i * 300)}
        />
      ))}
      {(art.points ?? []).map((p, i) => (
        <g key={`pt${i}`} {...anim('pop', 350 + i * 200)}>
          {p.icon ? (
            <Sprite icon={p.icon} x={X(p.x) - 10} y={Y(p.y) - 10} size={20} />
          ) : (
            <circle cx={X(p.x)} cy={Y(p.y)} r={6} fill={colour(p.tone)} stroke="#0c2338" strokeWidth={2} />
          )}
          {p.label && (
            <text
              x={X(p.x) + (X(p.x) > 250 ? -12 : 12)}
              y={Y(p.y) + (Y(p.y) < 30 ? 18 : -9)}
              textAnchor={X(p.x) > 250 ? 'end' : 'start'}
              fontSize={13}
              fontWeight={900}
              fill={colour(p.tone)}
              style={halo}
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// --- angles ---------------------------------------------------------------------

const rad = (d: number) => (d * Math.PI) / 180

export function Angle({ art }: { art: ArtOf<'angle'> }) {
  if (art.cross) return <CrossAngles deg={art.deg} labels={art.cross} />
  const deg = art.deg
  const wide = deg > 180
  const [vx, vy, L, H] = wide ? [160, 122, 100, 244] : deg <= 90 ? [86, 190, 160, 214] : [160, 190, 136, 214]
  const end = (d: number, len = L) => [vx + len * Math.cos(rad(d)), vy - len * Math.sin(rad(d))] as const
  const arc = (a: number, b: number, r: number) => {
    const [sx, sy] = end(a, r)
    const [ex, ey] = end(b, r)
    return `M${sx},${sy} A${r},${r} 0 ${b - a > 180 ? 1 : 0} 0 ${ex},${ey}`
  }
  const square = (a: number) => {
    const [px, py] = end(a, 14)
    const [qx, qy] = end(a + 90, 14)
    const [cx, cy] = [px + qx - vx, py + qy - vy]
    return `M${px},${py} L${cx},${cy} L${qx},${qy}`
  }
  const parts: { a: number; b: number; label?: string; r: number }[] = art.split
    ? [
        { a: 0, b: art.split, label: art.labels?.[0], r: 38 },
        { a: art.split, b: deg, label: art.labels?.[1], r: 52 },
      ]
    : [{ a: 0, b: deg, label: art.label, r: 42 }]
  const [ex, ey] = end(deg)
  const [bx] = end(0)
  // Crop the empty sky above the highest ray, so a 30° angle is not a postage stamp.
  const highest = wide ? 0 : Math.min(vy - 20, ey - 16, art.split !== undefined ? end(art.split)[1] - 16 : vy, ...parts.map((p) => end((p.a + p.b) / 2, p.r + 26)[1] - 16))
  const vb0 = Math.max(0, Math.floor(highest))
  return (
    <svg viewBox={`0 ${vb0} 320 ${H - vb0}`} className="se-art" role="img" aria-label={`angle of ${deg} degrees`}>
      <line x1={vx} y1={vy} x2={bx} y2={vy} stroke="var(--text)" strokeWidth={3.5} strokeLinecap="round" />
      {deg === 180 && <line x1={vx} y1={vy} x2={vx - L} y2={vy} stroke="var(--text)" strokeWidth={3.5} strokeLinecap="round" />}
      {art.split !== undefined && (
        <g {...anim('sweep', 0, { transformOrigin: `${vx}px ${vy}px`, '--from': `${art.split}deg` })}>
          <line x1={vx} y1={vy} x2={end(art.split)[0]} y2={end(art.split)[1]} stroke="var(--blue)" strokeWidth={3} strokeLinecap="round" />
        </g>
      )}
      {deg !== 180 && (
        <g {...anim('sweep', 0, { transformOrigin: `${vx}px ${vy}px`, '--from': `${deg}deg` })}>
          <line x1={vx} y1={vy} x2={ex} y2={ey} stroke="var(--text)" strokeWidth={3.5} strokeLinecap="round" />
        </g>
      )}
      {parts.map((p, i) => {
        const mid = (p.a + p.b) / 2
        const [lx, ly] = end(mid, p.r + 26)
        const right = Math.abs(p.b - p.a - 90) < 1e-9
        return (
          <g key={i}>
            <path
              d={right ? square(p.a) : arc(p.a, p.b, p.r)}
              fill="none"
              stroke={i === 0 ? 'var(--yellow)' : 'var(--profit)'}
              strokeWidth={3}
              pathLength={1}
              {...anim('draw', 650 + i * 250)}
            />
            {p.label && (
              <text x={lx} y={ly + 5} textAnchor="middle" fontSize={16} fontWeight={900} fill={i === 0 ? 'var(--yellow)' : 'var(--profit)'} {...anim('fade', 900 + i * 250, halo)}>
                {p.label}
              </text>
            )}
          </g>
        )
      })}
      <circle cx={vx} cy={vy} r={4} fill="var(--text)" />
    </svg>
  )
}

function CrossAngles({ deg, labels }: { deg: number; labels: [string, string, string, string] }) {
  const [cx, cy, L] = [160, 106, 120]
  const at = (d: number, len: number) => [cx + len * Math.cos(rad(d)), cy - len * Math.sin(rad(d))] as const
  const mids = [deg / 2, (deg + 180) / 2, deg / 2 + 180, (deg + 180) / 2 + 180]
  const spans = [
    [0, deg],
    [deg, 180],
    [180, 180 + deg],
    [180 + deg, 360],
  ]
  const tones = ['var(--yellow)', 'var(--profit)', 'var(--yellow)', 'var(--profit)']
  return (
    <svg viewBox="0 0 320 212" className="se-art" role="img" aria-label="two crossing lines">
      <line x1={at(180, L)[0]} y1={at(180, L)[1]} x2={at(0, L)[0]} y2={at(0, L)[1]} stroke="var(--text)" strokeWidth={3.5} strokeLinecap="round" />
      <g {...anim('sweep', 0, { transformOrigin: `${cx}px ${cy}px`, '--from': `${deg}deg` })}>
        <line x1={at(deg + 180, L)[0]} y1={at(deg + 180, L)[1]} x2={at(deg, L)[0]} y2={at(deg, L)[1]} stroke="var(--text)" strokeWidth={3.5} strokeLinecap="round" />
      </g>
      {labels.map((label, i) => {
        if (!label) return null
        const [a, b] = spans[i]
        const r = 30
        const [sx, sy] = at(a, r)
        const [ex, ey] = at(b, r)
        const [lx, ly] = at(mids[i], 56)
        return (
          <g key={i} {...anim('fade', 600 + i * 150)}>
            <path d={`M${sx},${sy} A${r},${r} 0 0 0 ${ex},${ey}`} fill="none" stroke={tones[i]} strokeWidth={3} />
            <text x={lx} y={ly + 5} textAnchor="middle" fontSize={16} fontWeight={900} fill={tones[i]} style={halo}>
              {label}
            </text>
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r={4} fill="var(--text)" />
    </svg>
  )
}

// --- polygons ----------------------------------------------------------------------

export function Shape({ art }: { art: ArtOf<'shape'> }) {
  const id = useId()
  const shapes = [
    { pts: art.pts, sides: art.sides, angles: art.angles, tone: art.tone, label: art.label, main: true },
    ...(art.also ?? []).map((s) => ({ ...s, main: false })),
  ]
  const all = shapes.flatMap((s) => s.pts)
  const minX = Math.min(...all.map((p) => p[0]))
  const maxX = Math.max(...all.map((p) => p[0]))
  const minY = Math.min(...all.map((p) => p[1]))
  const maxY = Math.max(...all.map((p) => p[1]))
  const k = Math.min(250 / Math.max(1e-6, maxX - minX), 150 / Math.max(1e-6, maxY - minY))
  const anyLabel = shapes.some((s) => s.label)
  const H = (maxY - minY) * k + 60 + (anyLabel ? 22 : 0)
  const ox = 160 - ((minX + maxX) / 2) * k
  const oy = 30 + maxY * k
  const P = ([x, y]: [number, number]) => [ox + x * k, oy - y * k] as [number, number]

  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label={art.label ?? 'shape'}>
      {shapes.map((s, si) => {
        const pts = s.pts.map(P)
        const n = pts.length
        const gx = pts.reduce((a, p) => a + p[0], 0) / n
        const gy = pts.reduce((a, p) => a + p[1], 0) / n
        const bottom = Math.max(...pts.map((p) => p[1]))
        return (
          <g key={`${id}-${si}`} {...anim('fade', si * 350)}>
            <polygon
              points={pts.map((p) => p.join(',')).join(' ')}
              fill={colour(s.tone)}
              fillOpacity={0.22}
              stroke={colour(s.tone)}
              strokeWidth={3}
              strokeLinejoin="round"
              pathLength={1}
              {...anim('draw', si * 350)}
            />
            {pts.map((a, i) => {
              const b = pts[(i + 1) % n]
              const mx = (a[0] + b[0]) / 2
              const my = (a[1] + b[1]) / 2
              const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
              let nx = -(b[1] - a[1]) / len
              let ny = (b[0] - a[0]) / len
              if ((mx + nx - gx) ** 2 + (my + ny - gy) ** 2 < (mx - gx) ** 2 + (my - gy) ** 2) {
                nx = -nx
                ny = -ny
              }
              const label = s.sides?.[i]
              const ticks = s.main ? (art.ticks?.[i] ?? 0) : 0
              const tx = (b[0] - a[0]) / len
              const ty = (b[1] - a[1]) / len
              return (
                <g key={i}>
                  {Array.from({ length: ticks }, (_, t) => {
                    const off = (t - (ticks - 1) / 2) * 5
                    const cx = mx + tx * off
                    const cy = my + ty * off
                    return <line key={t} x1={cx - nx * 6} y1={cy - ny * 6} x2={cx + nx * 6} y2={cy + ny * 6} stroke="var(--text)" strokeWidth={2} />
                  })}
                  {label && (
                    <text x={mx + nx * 16} y={my + ny * 16 + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="var(--text)" {...anim('fade', 500 + si * 350, halo)}>
                      {label}
                    </text>
                  )}
                </g>
              )
            })}
            {pts.map((v, i) => {
              const prev = pts[(i - 1 + n) % n]
              const next = pts[(i + 1) % n]
              const u1 = [prev[0] - v[0], prev[1] - v[1]]
              const u2 = [next[0] - v[0], next[1] - v[1]]
              const l1 = Math.hypot(u1[0], u1[1]) || 1
              const l2 = Math.hypot(u2[0], u2[1]) || 1
              const box = s.main && art.right?.includes(i)
              const label = s.angles?.[i]
              let bxv = u1[0] / l1 + u2[0] / l2
              let byv = u1[1] / l1 + u2[1] / l2
              const bl = Math.hypot(bxv, byv) || 1
              bxv /= bl
              byv /= bl
              return (
                <g key={`a${i}`}>
                  {box && (
                    <path
                      d={`M${v[0] + (u1[0] / l1) * 12},${v[1] + (u1[1] / l1) * 12} l${(u2[0] / l2) * 12},${(u2[1] / l2) * 12} l${(-u1[0] / l1) * 12},${(-u1[1] / l1) * 12}`}
                      fill="none"
                      stroke="var(--text)"
                      strokeWidth={2}
                    />
                  )}
                  {label && (
                    <text x={v[0] + bxv * 26} y={v[1] + byv * 26 + 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--yellow)" {...anim('fade', 700 + si * 350, halo)}>
                      {label}
                    </text>
                  )}
                </g>
              )
            })}
            {s.label && (
              <text x={gx} y={bottom + 34} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
                {s.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
