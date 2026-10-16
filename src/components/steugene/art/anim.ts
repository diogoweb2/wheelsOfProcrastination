// 🏫 St. Eugene 7 (§24b) — the motion every drawing shares.
//
// Animations live in CSS (`.se-a-*` in global.css), not in JS: they run once
// when the card mounts, cost nothing after that, and one media query turns
// every one of them off for reduced motion. Everything is drawn at its FINAL
// position, so a drawing with the animation stripped out is still complete.
import type { CSSProperties } from 'react'
import type { SeTone } from '../../../steugene/types'

export type SeAnim =
  | 'pop'
  | 'drop'
  | 'fade'
  | 'draw'
  | 'growx'
  | 'growy'
  | 'march'
  | 'pulse'
  | 'bob'
  | 'break'
  | 'slide'
  | 'spin'
  | 'orbit'
  | 'sweep'
  | 'roll'
  | 'flash'
  | 'wave'

/**
 * `{...anim('pop', 120)}` on any element: the class and its delay. Pass the
 * element's own style and class through here rather than beside the spread,
 * or one silently overwrites the other.
 */
export function anim(name: SeAnim, delay = 0, style?: CSSProperties | Record<string, string | number>, base?: string) {
  return {
    className: base ? `${base} se-a-${name}` : `se-a-${name}`,
    style: { animationDelay: `${Math.round(delay)}ms`, ...style } as CSSProperties,
  }
}

/** Never let a long row take forever to arrive: the stagger is capped. */
export const stagger = (i: number, each = 60, cap = 900) => Math.min(i * each, cap)

export const TONE: Record<SeTone, string> = {
  good: 'var(--profit)',
  bad: 'var(--red)',
  focus: 'var(--yellow)',
  calm: 'var(--blue)',
}

export const colour = (tone?: SeTone) => (tone ? TONE[tone] : 'var(--blue)')

/** Text that stays readable on top of any drawing: a dark halo behind it. */
export const halo: CSSProperties = { paintOrder: 'stroke', stroke: '#0c2338', strokeWidth: 3.5, strokeLinejoin: 'round' }

/** A tick spacing that lands on round numbers — about `want` ticks across the span. */
export function niceStep(span: number, want = 8): number {
  const raw = span / want
  const mag = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * mag) return m * mag
  return 10 * mag
}

/** Every multiple of `step` from `from` to `to`, without floating-point drift. */
export function ticksOf(from: number, to: number, step: number): number[] {
  const out: number[] = []
  const start = Math.ceil(from / step - 1e-9)
  for (let i = start; i * step <= to + 1e-9; i++) out.push(Number((i * step).toFixed(6)))
  return out
}

/** "−12", not "-12": the minus he sees in the book. */
export const signed = (v: number) => (v < 0 ? `−${Math.abs(v)}` : String(v))
