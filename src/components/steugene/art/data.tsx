// 🏫 St. Eugene 7 (§24b) — the drawings for counting, chance, money and code.
//
// The text-heavy ones (code, tables, shop cards, receipts) are HTML rather
// than SVG: they wrap on a narrow phone, and the device's own font renders
// them sharper than SVG text ever does.
import type { ReactNode } from 'react'
import type { SeArt } from '../../../steugene/types'
import { SpriteSvg } from './sprites'
import { anim, colour, halo, niceStep, stagger, ticksOf } from './anim'

type ArtOf<K extends SeArt['art']> = Extract<SeArt, { art: K }>

/** Slice and bar colours — Fortnite's rarity ladder, then a few more. */
const PALETTE = ['#49acf2', '#b15be2', '#60aa3a', '#d37841', '#ffd83d', '#e8312a', '#b1b1b1', '#3fd1c4']

// --- code ---------------------------------------------------------------------

/** Which Scratch colour a line wears, from its first word. */
function blockKind(text: string): string {
  const w = text.toLowerCase().split(/[\s(]/)[0]
  if (['when', 'on'].includes(w)) return 'event'
  if (['repeat', 'forever', 'if', 'else', 'wait', 'until', 'while', 'for', 'end', 'stop'].includes(w)) return 'control'
  if (['say', 'think', 'show', 'hide', 'print', 'display'].includes(w)) return 'looks'
  if (['set', 'change', 'add', 'ask'].includes(w)) return 'var'
  return 'motion'
}

const LUA = /(--.*$)|("[^"]*")|\b(local|for|do|end|if|then|else|elseif|while|repeat|until|function|return|and|or|not|true|false|nil|in)\b|\b(\d+(?:\.\d+)?)\b|\b(print|wait|task\.wait)\b/g

function luaSpans(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  LUA.lastIndex = 0
  while ((m = LUA.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : 'f'
    out.push(
      <span key={m.index} className={`se-code__${cls}`}>
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Code({ art }: { art: ArtOf<'code'> }) {
  const style = art.style ?? 'text'
  const hl = art.hl ?? []
  return (
    <div className={`se-art se-code se-code--${style}`}>
      {art.lines.map((line, i) => {
        const depth = Math.floor((line.length - line.trimStart().length) / 2)
        const text = line.trimStart()
        const order = hl.indexOf(i + 1)
        return (
          <div
            key={i}
            className={`se-code__line${order >= 0 ? ' se-code__line--hl' : ''}`}
            style={{ paddingLeft: style === 'blocks' ? depth * 20 : undefined, animationDelay: order >= 0 ? `${450 + order * 420}ms` : undefined }}
          >
            {style === 'text' ? (
              <>
                <span className="se-code__ln">{i + 1}</span>
                <span className="se-code__src" style={{ paddingLeft: depth * 14 }}>
                  {luaSpans(text)}
                </span>
              </>
            ) : (
              <span {...anim('drop', stagger(i, 90), undefined, `se-block se-block--${blockKind(text)}`)}>
                {text}
              </span>
            )}
          </div>
        )
      })}
      {art.out && (
        <div className="se-code__out">
          <div className="se-code__outlabel">Output</div>
          {art.out.map((o, i) => (
            <div key={i} {...anim('fade', 600 + hl.length * 420 + i * 260)}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- a table ------------------------------------------------------------------------

export function Table({ art }: { art: ArtOf<'table'> }) {
  const { r, c } = art.hl ?? {}
  return (
    <div className="se-art se-table-wrap">
      <table className="se-table">
        <thead>
          <tr>
            {art.head.map((h, j) => (
              <th key={j} className={j === c ? 'se-table__hl' : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {art.rows.map((row, i) => (
            <tr key={i} {...anim('fade', 150 + i * 120, undefined, i === r ? 'se-table__row--hl' : undefined)}>
              {row.map((v, j) => (
                <td key={j} className={j === c ? 'se-table__hl' : undefined}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- things to count -------------------------------------------------------------------

export function Items({ art }: { art: ArtOf<'items'> }) {
  let k = 0
  return (
    <div className="se-art se-items">
      {art.rows.map((row, ri) => (
        <div key={ri} className="se-items__row">
          {row.label && <div className="se-items__label">{row.label}</div>}
          <div className="se-items__set">
            {Array.from({ length: row.n }, (_, i) => {
              const dim = i >= row.n - (row.dim ?? 0)
              const gap = row.per && i > 0 && i % row.per === 0
              return (
                <span key={i} {...anim('pop', stagger(k++, 35, 1200), undefined, `se-items__it${gap ? ' se-items__it--gap' : ''}`)}>
                  {row.icon ? (
                    <SpriteSvg icon={row.icon} size={22} dim={dim} />
                  ) : (
                    <span className="se-items__emoji" style={{ opacity: dim ? 0.28 : 1, filter: dim ? 'grayscale(1)' : undefined }}>
                      {row.emoji ?? '⬛'}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Slots({ art }: { art: ArtOf<'slots'> }) {
  const cols = art.cols ?? Math.min(9, art.slots.length)
  return (
    <div className="se-art">
      <div className="se-inv" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 40px))` }}>
        {art.slots.map((s, i) => (
          <div key={i} {...anim('pop', stagger(i, 45), undefined, 'se-inv__slot')}>
            {s && <SpriteSvg icon={s.icon} size={26} />}
            {s && s.n !== undefined && s.n > 1 && <span className="se-inv__n">{s.n}</span>}
          </div>
        ))}
      </div>
      {art.label && <div className="se-art__caption">{art.label}</div>}
    </div>
  )
}

// --- chance ----------------------------------------------------------------------------

export function Spinner({ art }: { art: ArtOf<'spinner'> }) {
  const total = art.parts.reduce((n, p) => n + (p.n ?? 1), 0)
  const [cx, cy, R] = [160, 104, 92]
  // Where the arrow comes to rest: fixed per spinner, so a re-render never moves it.
  const seed = art.parts.reduce((n, p) => n + p.label.length * 37 + (p.n ?? 1) * 11, 0)
  const rest = 1080 + (seed % 360)
  let acc = 0
  return (
    <svg viewBox="0 0 320 208" className="se-art" role="img" aria-label="spinner">
      {art.parts.map((p, i) => {
        const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2
        acc += p.n ?? 1
        const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2
        const mid = (a0 + a1) / 2
        const big = a1 - a0 > Math.PI ? 1 : 0
        const fill = p.tone ? colour(p.tone) : PALETTE[i % PALETTE.length]
        const d =
          art.parts.length === 1
            ? `M${cx - R},${cy} a${R},${R} 0 1 1 ${2 * R},0 a${R},${R} 0 1 1 ${-2 * R},0`
            : `M${cx},${cy} L${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 ${big} 1 ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)} Z`
        return (
          <g key={i}>
            <path d={d} fill={fill} stroke="#0c2338" strokeWidth={2.5} />
            <text x={cx + Math.cos(mid) * R * 0.62} y={cy + Math.sin(mid) * R * 0.62 + 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#ffffff" style={halo}>
              {p.label}
            </text>
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeWidth={3} />
      <g transform={`rotate(${rest % 360} ${cx} ${cy})`} {...anim('spin', 200, { '--end': `${rest}deg`, transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' })}>
        <path d={`M${cx - 6},${cy} L${cx},${cy - R + 14} L${cx + 6},${cy} Z`} fill="#ffffff" stroke="#0c2338" strokeWidth={2} />
      </g>
      <circle cx={cx} cy={cy} r={9} fill="#ffffff" stroke="#0c2338" strokeWidth={2.5} />
    </svg>
  )
}

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
}

export function Dice({ art }: { art: ArtOf<'dice'> }) {
  const n = art.faces.length
  const s = Math.min(64, 280 / n - 12)
  const gap = 12
  const x0 = (320 - (n * s + (n - 1) * gap)) / 2
  return (
    <svg viewBox={`0 0 320 ${s + 20}`} className="se-art" role="img" aria-label={`dice showing ${art.faces.join(', ')}`}>
      {art.faces.map((f, i) => {
        const x = x0 + i * (s + gap)
        return (
          <g key={i} {...anim('roll', i * 160)}>
            <rect x={x} y={10} width={s} height={s} rx={s * 0.18} fill="#f4f4f4" stroke="#0c2338" strokeWidth={2.5} />
            {(PIPS[f] ?? []).map(([px, py], j) => (
              <circle key={j} cx={x + s * (0.25 + px * 0.25)} cy={10 + s * (0.25 + py * 0.25)} r={s * 0.085} fill="#d70000" />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// --- money ----------------------------------------------------------------------------------

export function Shop({ art }: { art: ArtOf<'shop'> }) {
  return (
    <div className="se-art se-shop">
      {art.offers.map((o, i) => (
        <div key={i} {...anim('drop', i * 160, undefined, 'se-shop__card')}>
          {o.tag && <span className="se-shop__tag">{o.tag}</span>}
          <div className="se-shop__icon">{o.icon ? <SpriteSvg icon={o.icon} size={34} /> : <span>{o.emoji ?? '🛒'}</span>}</div>
          <div className="se-shop__qty">{o.qty.replace(/-/g, '\u2011')}</div>
          <div className="se-shop__price">
            {o.was && <s>{o.was}</s>} {o.price}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Receipt({ art }: { art: ArtOf<'receipt'> }) {
  return (
    <div {...anim('drop', 0, undefined, 'se-art se-receipt')}>
      <div className="se-receipt__head">🧾 RECEIPT</div>
      {art.lines.map((l, i) => (
        <div key={i} className="se-receipt__row">
          <span>{l.item}</span>
          <span>{l.price}</span>
        </div>
      ))}
      {art.total && (
        <div className="se-receipt__row se-receipt__total">
          <span>TOTAL</span>
          <span>{art.total}</span>
        </div>
      )}
      {art.note && <div className="se-receipt__note">{art.note}</div>}
    </div>
  )
}

// --- graphs ---------------------------------------------------------------------------------

export function Chart({ art }: { art: ArtOf<'chart'> }) {
  const top = art.title ? 30 : 14
  const [left, right, bottom] = [40, 312, top + 150]
  const H = bottom + 30
  const lo = art.min ?? 0
  const peak = Math.max(...art.values, lo + 1)
  const step = niceStep((art.max ?? peak) - lo, 4)
  const max = art.max ?? lo + Math.ceil((peak - lo) / step) * step
  const n = art.values.length
  const band = (right - left) / n
  const X = (i: number) => left + band * i + band / 2
  const Y = (v: number) => bottom - ((v - lo) / (max - lo)) * (bottom - top)
  const unit = art.unit ?? ''
  const line = art.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label={art.title ?? `${art.type} graph`}>
      {art.title && (
        <text x={160} y={16} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--text)">
          {art.title}
        </text>
      )}
      {ticksOf(lo, max, step).map((v) => (
        <g key={v}>
          <line x1={left} y1={Y(v)} x2={right} y2={Y(v)} stroke="var(--line)" strokeWidth={v === lo ? 2 : 0.8} opacity={v === lo ? 1 : 0.6} />
          <text x={left - 5} y={Y(v) + 4} textAnchor="end" fontSize={10} fontWeight={800} fill="var(--muted)">
            {v}
          </text>
        </g>
      ))}
      {art.type === 'bar' &&
        art.values.map((v, i) => (
          <g key={i}>
            <rect x={X(i) - band * 0.32} y={Y(v)} width={band * 0.64} height={bottom - Y(v)} rx={4} fill={PALETTE[i % PALETTE.length]} {...anim('growy', 150 + i * 110)} />
            <text x={X(i)} y={Y(v) - 5} textAnchor="middle" fontSize={11} fontWeight={900} fill="var(--text)" {...anim('fade', 600 + i * 110)}>
              {v}
              {unit}
            </text>
          </g>
        ))}
      {art.type === 'line' && (
        <>
          <polyline points={line} fill="none" stroke="var(--yellow)" strokeWidth={3} strokeLinejoin="round" pathLength={1} {...anim('draw', 150)} />
          {art.values.map((v, i) => (
            <g key={i} {...anim('pop', 250 + i * 120)}>
              <circle cx={X(i)} cy={Y(v)} r={5} fill="var(--yellow)" stroke="#0c2338" strokeWidth={2} />
              <text x={X(i)} y={Y(v) - 9} textAnchor="middle" fontSize={11} fontWeight={900} fill="var(--text)" style={halo}>
                {v}
                {unit}
              </text>
            </g>
          ))}
        </>
      )}
      {art.labels.map((l, i) => (
        <text key={i} x={X(i)} y={bottom + 16} textAnchor="middle" fontSize={n > 7 ? 9 : 11} fontWeight={800} fill="var(--muted)">
          {l}
        </text>
      ))}
    </svg>
  )
}

export function CircleGraph({ art }: { art: ArtOf<'circlegraph'> }) {
  const total = art.slices.reduce((n, s) => n + s.value, 0) || 1
  const [cx, cy, R] = [82, 86, 72]
  const H = Math.max(176, art.slices.length * 26 + 20)
  let acc = 0
  return (
    <svg viewBox={`0 0 320 ${H}`} className="se-art" role="img" aria-label="circle graph">
      {art.slices.map((s, i) => {
        const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2
        acc += s.value
        const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2
        const big = a1 - a0 > Math.PI ? 1 : 0
        const d =
          art.slices.length === 1
            ? `M${cx - R},${cy} a${R},${R} 0 1 1 ${2 * R},0 a${R},${R} 0 1 1 ${-2 * R},0`
            : `M${cx},${cy} L${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 ${big} 1 ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)} Z`
        return (
          <g key={i}>
            <path d={d} fill={PALETTE[i % PALETTE.length]} stroke="#0c2338" strokeWidth={2} {...anim('pop', i * 160, { transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' })} />
            <g {...anim('fade', 200 + i * 160)}>
              <rect x={176} y={14 + i * 26} width={14} height={14} rx={3} fill={PALETTE[i % PALETTE.length]} />
              <text x={196} y={26 + i * 26} fontSize={12} fontWeight={800} fill="var(--text)">
                {s.label} — {s.value}
                {art.unit ?? ''}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

