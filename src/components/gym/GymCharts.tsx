// The Stats tab's charts. Hand-rolled inline SVG, like every other drawing in
// this app.
//
// All of them are SINGLE-SERIES on purpose. The app's palette is a brand palette,
// not a categorical one — running the dataviz validator over it, gold↔orange
// separate by only ΔE 13.4 (below the 15 floor for normal vision) and bronze
// misses 3:1 contrast on the card surface — so no chart here asks colour to
// carry identity. Identity comes from the body-part filter and from labels
// printed on the marks. Grid and axes stay recessive; every value is also
// readable as text, so the charts are decoration on top of legible numbers
// rather than the only way to read the data.
import { useState } from 'react'

const INK = 'var(--text)'
const MUTED = 'var(--muted)'
const LINE = 'var(--line)'
const ACCENT = 'var(--blue)'

export interface LinePoint {
  label: string
  value: number
  caption?: string
}

/**
 * One exercise's progression. Tap a marker for its detail — that tap IS the
 * tooltip; a hover layer would be dead weight on a phone.
 */
export function ProgressLine({ points, unit, height = 120 }: { points: LinePoint[]; unit: string; height?: number }) {
  const [sel, setSel] = useState<number | null>(null)

  if (points.length === 0) {
    return <p className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '18px 0' }}>Nothing logged yet.</p>
  }
  if (points.length === 1) {
    return (
      <div style={{ textAlign: 'center', padding: '14px 0' }}>
        <div style={{ fontSize: 32, fontWeight: 900 }}>{fmt(points[0].value)}<span className="widget-of"> {unit}</span></div>
        <p className="muted" style={{ fontSize: 12 }}>{points[0].label} · one session so far — the line starts next time</p>
      </div>
    )
  }

  const w = 300
  const padX = 14
  const padY = 16
  const values = points.map((p) => p.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || Math.max(1, hi * 0.2)
  const x = (i: number) => padX + (i * (w - padX * 2)) / (points.length - 1)
  const y = (v: number) => padY + (1 - (v - (lo - span * 0.15)) / (span * 1.3)) * (height - padY * 2)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${path} L${x(points.length - 1).toFixed(1)},${height - padY} L${x(0).toFixed(1)},${height - padY} Z`
  const shown = sel ?? points.length - 1
  const first = points[0].value
  const last = points[points.length - 1].value
  const delta = last - first

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label={`Progression: ${points.map((p) => `${p.label} ${p.value}${unit}`).join(', ')}`}>
        <defs>
          <linearGradient id="gym-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={height - padY} x2={w - padX} y2={height - padY} stroke={LINE} strokeWidth="1" />
        <path d={area} fill="url(#gym-line-fill)" />
        <path d={path} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.label + i} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
            {/* the visible marker is 8px; the hit target around it is 24px */}
            <circle cx={x(i)} cy={y(p.value)} r="12" fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={i === shown ? 5 : 4}
              fill={i === shown ? 'var(--gold)' : ACCENT}
              stroke="var(--card)"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>
          {points[shown].label}: {fmt(points[shown].value)} {unit}
          {points[shown].caption ? <span className="muted" style={{ fontWeight: 600 }}> · {points[shown].caption}</span> : null}
        </span>
        <span style={{ fontSize: 12, fontWeight: 900, color: delta > 0 ? 'var(--gold)' : MUTED }}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {fmt(Math.abs(delta))} {unit}
        </span>
      </div>
    </div>
  )
}

export interface BarItem {
  label: string
  value: number
  caption?: string
}

/** Weekly totals. Bars are 4px-rounded at the data end and sit on the baseline. */
export function WeekBars({ items, unit, height = 110 }: { items: BarItem[]; unit: string; height?: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const max = Math.max(1, ...items.map((i) => i.value))
  const shown = sel ?? items.length - 1

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, marginBottom: 6 }} role="img" aria-label={items.map((i) => `${i.label}: ${i.value} ${unit}`).join(', ')}>
        {items.map((it, i) => (
          <button
            key={it.label + i}
            onClick={() => setSel(i)}
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
            aria-label={`${it.label}: ${it.value} ${unit}`}
          >
            <span
              style={{
                display: 'block',
                height: `${Math.max(it.value > 0 ? 6 : 2, (it.value / max) * (height - 18))}px`,
                background: i === shown ? 'var(--gold)' : it.value > 0 ? ACCENT : LINE,
                borderRadius: '4px 4px 0 0',
                opacity: it.value > 0 ? 1 : 0.5,
              }}
            />
          </button>
        ))}
      </div>
      <div style={{ height: 1, background: LINE, marginBottom: 6 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800 }}>
        <span>
          {items[shown]?.label} — {fmt(items[shown]?.value ?? 0)} {unit}
          {items[shown]?.caption ? <span className="muted" style={{ fontWeight: 600 }}> · {items[shown].caption}</span> : null}
        </span>
        <span className="muted">tap a bar</span>
      </div>
    </div>
  )
}

export interface SplitItem {
  label: string
  emoji?: string
  value: number
  pct: number
  caption?: string
}

/**
 * Where the work went, by body part. Horizontal bars with the label ON the row —
 * a pie would need nine colours the palette can't legally provide, and the
 * labels would be unreadable at this size anyway.
 */
export function SplitBars({ items, unit }: { items: SplitItem[]; unit: string }) {
  if (items.length === 0) return <p className="muted" style={{ fontSize: 13 }}>Nothing logged in this window yet.</p>
  const max = Math.max(...items.map((i) => i.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, marginBottom: 3 }}>
            <span>{it.emoji} {it.label}</span>
            <span className="muted">
              {fmt(it.value)} {unit} · {Math.round(it.pct)}%
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--bg2)', borderRadius: 999, overflow: 'hidden' }}>
            <span
              style={{
                display: 'block',
                height: '100%',
                // one hue, magnitude by lightness — a legal sequential encoding
                width: `${Math.max(4, (it.value / max) * 100)}%`,
                background: ACCENT,
                opacity: 0.45 + 0.55 * (it.value / max),
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Four weeks of "did I show up" — the same dot language the streak widget uses. */
export function ActivityDots({ days }: { days: { day: string; on: boolean; minutes: number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 5 }}>
      {days.map((d) => (
        <span
          key={d.day}
          title={`${d.day}${d.on ? ` · ${d.minutes} min` : ''}`}
          style={{
            aspectRatio: '1',
            borderRadius: 5,
            background: d.on ? ACCENT : 'var(--bg2)',
            border: `1px solid ${d.on ? ACCENT : LINE}`,
            opacity: d.on ? Math.min(1, 0.55 + d.minutes / 60) : 1,
          }}
        />
      ))}
    </div>
  )
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 10000) return `${Math.round(n / 1000)}k`
  return Math.round(n * 10) / 10 === Math.round(n) ? String(Math.round(n)) : (Math.round(n * 10) / 10).toFixed(1)
}
