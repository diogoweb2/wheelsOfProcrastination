// How long a session REALLY takes you — §18z.
//
// The planner has always been able to add up a session: learned seconds per
// set, the rest it prescribes, twenty seconds to walk over. Every one of those
// numbers is defensible and the total was still wrong by a third, every time.
//
// It is wrong for three reasons, and only the first is the planner's fault:
//
//   1. the pace it learns is the pace of a SET, and it lags a heavy day;
//   2. the rest it plans is the rest it OFFERS you (`restFor`), not the rest
//      you take — and you take about 30 % more of it;
//   3. nothing at all is budgeted for the minute between finishing a set and
//      the rest timer starting: reading the card, changing the dumbbell,
//      watching the demo, finding the bench angle. 20 s per exercise is
//      allowed. The measured number is a minute, and on a long session two.
//
// None of those are fixable by making the model cleverer, because two of them
// are not about exercises at all. So the model stays exactly as it is and the
// answer is measured instead: wall clock ÷ what the model predicted, over the
// sessions you actually FINISHED, median of the recent ones. One number, from
// your own history, on the front of every estimate in the app.
//
// One number and not three on purpose. There are ~20 finished sessions to learn
// from; fitting a per-exercise overhead, a rest multiplier and a work
// multiplier to twenty noisy points is fitting the noise. A scalar is what that
// much evidence can actually support.
import type { GymSession, GymState } from '../types'
import { sessionSeconds } from './gym'

/** How many recent finished sessions the factor is learned from. */
export const PACE_WINDOW = 10

/**
 * Below this many usable sessions there is no correction at all — the raw model
 * is shown and the app says nothing about your history, because it hasn't got
 * one yet. Three is the same bar `learnedSetSeconds` uses for a single set.
 */
export const PACE_MIN_SAMPLES = 3

/** A sanity band, not a thumb on the scale. The data decides inside it. */
export const PACE_FLOOR = 0.75
export const PACE_CEIL = 2.5

export interface PaceCalibration {
  /** Multiply any raw estimate by this. Exactly 1 until there is evidence. */
  factor: number
  /** How many finished sessions it was learned from. */
  samples: number
  /** False → `factor` is 1 because there isn't enough history yet. */
  learned: boolean
  /**
   * The middle half of those sessions (p25 → p75), as multipliers. This is the
   * honest answer to "but could it be an hour?" — a median promises that half
   * the time you run over, and saying so is cheaper than being wrong.
   */
  low: number
  high: number
}

const NONE: PaceCalibration = { factor: 1, samples: 0, learned: false, low: 1, high: 1 }

/**
 * Did you actually do it? Every planned set logged, nothing skipped.
 *
 * A session you walked out of halfway ran short of its estimate for a reason
 * that has nothing to do with how long the work takes, and letting those in
 * would teach the app that its estimates are generous.
 */
export function fullyLogged(s: GymSession): boolean {
  if (s.exercises.length === 0) return false
  return s.exercises.every((e) => e.sets.length >= e.plan.reps.length)
}

/**
 * The sessions the factor is allowed to learn from: finished, fully logged,
 * clocked, and big enough to be a session rather than a ➕ bonus move (whose
 * ratio is all walk-over and no work).
 */
export function paceSamples(gym: GymState): { session: GymSession; ratio: number }[] {
  const out: { session: GymSession; ratio: number }[] = []
  for (const s of gym.sessions) {
    if (s.status !== 'done' || s.exercises.length < 2) continue
    if (!fullyLogged(s)) continue
    const active = s.activeSec ?? 0
    const predicted = sessionSeconds(s)
    // 4 h is not a session, 1 min is not either, and a 5-minute plan has too
    // little in it for the ratio to mean anything
    if (active < 60 || active > 14_400 || predicted < 300) continue
    out.push({ session: s, ratio: active / predicted })
  }
  return out
}

const quantile = (sorted: number[], q: number): number => {
  if (sorted.length === 0) return 1
  const i = (sorted.length - 1) * q
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

const clamp = (n: number) => Math.min(PACE_CEIL, Math.max(PACE_FLOOR, n))

/**
 * Your personal correction on every time estimate in the app.
 *
 * MEDIAN, not mean: one session with a phone call in the middle of it should
 * drift this, not rewrite it, and there is one of those in every ten. Over a
 * window of the recent ones, because the number that matters is how long
 * sessions take you NOW — the block gets heavier, and so does the correction.
 */
export function paceCalibration(gym: GymState): PaceCalibration {
  const samples = paceSamples(gym).slice(-PACE_WINDOW)
  if (samples.length < PACE_MIN_SAMPLES) return { ...NONE, samples: samples.length }
  const ratios = samples.map((s) => s.ratio).sort((a, b) => a - b)
  return {
    factor: clamp(quantile(ratios, 0.5)),
    samples: samples.length,
    learned: true,
    low: clamp(quantile(ratios, 0.25)),
    high: clamp(quantile(ratios, 0.75)),
  }
}

/** The honest length of a session, in minutes, with your correction applied. */
export function honestMinutes(s: GymSession, cal: PaceCalibration): number {
  return Math.max(1, Math.round((sessionSeconds(s) * cal.factor) / 60))
}

/** "usually 44–56 min" — the middle half, for when one number isn't enough. */
export function honestRange(s: GymSession, cal: PaceCalibration): [number, number] | null {
  if (!cal.learned) return null
  const raw = sessionSeconds(s)
  const lo = Math.round((raw * cal.low) / 60)
  const hi = Math.round((raw * cal.high) / 60)
  return hi > lo ? [lo, hi] : null
}
