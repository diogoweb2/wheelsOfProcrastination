// ⚖️ Effort — how much of a set actually landed on each muscle, and how hard
// that set was. See BUSINESS_REQUIREMENTS.md §18t.
//
// THE BUG THIS FIXES. The app used to treat `ExerciseDef.parts` as a flat list:
// a push-up was "chest, arms, core" and each of the three got credit, the first
// at full and the rest at half. So thirty push-ups made your core look as
// trained as thirty planks did, the Body map went red on a muscle that had
// barely been asked for anything, and "where the work went" said core when the
// honest answer was chest. A list of parts says WHICH muscles are involved. It
// has never said HOW MUCH, and the app was reading it as if it did.
//
// So every exercise now carries a MIX: a share of the work per body part,
// summing to 1. A plank is core 0.88 / shoulders 0.12. A push-up is chest 0.55
// / arms 0.30 / core 0.15. Same three parts on the push-up, a fifth of the core
// credit. A mix may also name a part the catalog's `parts` list doesn't — a
// pull-up is graded on the forearms it quietly destroys — because `parts` is
// about what the exercise is FOR and the mix is about where the work goes.
//
// TWO THINGS THEN MULTIPLY IT.
//
//   • HOW HARD the movement is (`intensity`) and how long the set ran.
//   • OVERLOAD. Lifting more than your own normal is harder than lifting your
//     normal, and it should read as harder. Your "normal" is the heaviest top
//     set of your last three sessions on that exercise; go above it and the
//     effort is scaled by how far above. Do it again and that weight IS the
//     normal, so the bonus is gone — which is the honest answer: the second
//     time at 40 lb is not the achievement the first time was.
//
// Everything downstream reads this one model — the Body map, the planner's
// recovery scoring and the Stats split — so they cannot disagree with each
// other. That was the point of §18q and it is still the point here.
import type { BodyPart, GymSession, SessionExercise } from '../types'
import { parseDay } from './dates'

/**
 * Kept here rather than imported from `gym.ts` on purpose: this module is a
 * LEAF. `gym.ts` and `gymStats.ts` both read from it, so it must not read back
 * from them — and `loggedReps` lives here for the same reason, re-exported by
 * `gym.ts` so every caller still finds it where it has always been.
 */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * How many reps a logged exercise is worth. A per-side COUNTED movement is
 * logged once and done twice, so it counts double; a per-side HOLD is already
 * logged as the total of both sides and is not doubled again.
 */
export function loggedReps(se: Pick<SessionExercise, 'kind' | 'perSide' | 'sets'>): number {
  const raw = se.sets.reduce((n, x) => n + x.reps, 0)
  const clocked = se.kind === 'timed' || se.kind === 'cardio'
  return se.perSide && !clocked ? raw * 2 : raw
}

/** A share of one exercise's work per body part. Values sum to 1. */
export type EffortMix = Partial<Record<BodyPart, number>>

// --- the mixes, written by hand, one per exercise in the catalog --------------
// Read them as "out of every ten units of work this movement costs you, how
// many land here". They are judgement calls, not measurements, and they are
// written down rather than derived precisely because a derivation is what got
// this wrong in the first place.

const MIX: Record<string, EffortMix> = {
  'mv-dumbbell-bench-press': { chest: 0.6, arms: 0.25, shoulders: 0.15 },
  'mv-incline-dumbbell-bench-press': { chest: 0.5, shoulders: 0.3, arms: 0.2 },
  'mv-decline-dumbbell-bench-press': { chest: 0.7, arms: 0.3 },
  'mv-dips': { chest: 0.45, arms: 0.4, shoulders: 0.15 },
  'bw-pushup': { chest: 0.55, arms: 0.3, core: 0.15 },
  // the push-up snack (§18ab): the same movement moved around the chest. Wide
  // hands take work off the triceps and give it to the outer chest; a diamond
  // does the opposite; the hold is the same tension with the reps taken out.
  'bw-wide-pushup': { chest: 0.65, shoulders: 0.2, arms: 0.15 },
  'bw-diamond-pushup': { arms: 0.55, chest: 0.32, core: 0.13 },
  'bw-pushup-hold': { chest: 0.45, arms: 0.35, core: 0.2 },
  'bw-pullup': { back: 0.6, arms: 0.28, forearms: 0.12 },
  'mv-chin-up': { back: 0.5, arms: 0.38, forearms: 0.12 },
  'mv-negative-pull-up': { back: 0.55, arms: 0.33, forearms: 0.12 },
  'mv-chest-supported-dumbbell-row': { back: 0.65, arms: 0.25, shoulders: 0.1 },
  'mv-one-arm-dumbbell-row': { back: 0.6, arms: 0.25, forearms: 0.08, core: 0.07 },
  'mv-seated-dumbbell-shoulder-press': { shoulders: 0.65, arms: 0.35 },
  'mv-dumbbell-lateral-raise': { shoulders: 1 },
  'mv-chest-supported-dumbbell-reverse-fly': { shoulders: 0.6, back: 0.4 },
  'mv-prone-dumbbell-y-raise': { shoulders: 0.55, back: 0.45 },
  'mv-dumbbell-biceps-curl': { arms: 0.85, forearms: 0.15 },
  'mv-dumbbell-hammer-curl': { arms: 0.6, forearms: 0.4 },
  'mv-incline-dumbbell-curl': { arms: 0.88, forearms: 0.12 },
  'mv-lying-dumbbell-triceps-extension': { arms: 1 },
  'mv-seated-overhead-dumbbell-triceps-extensi': { arms: 0.85, shoulders: 0.15 },
  'mv-dumbbell-bulgarian-split-squat': { legs: 0.55, glutes: 0.35, core: 0.1 },
  'mv-dumbbell-reverse-lunge': { legs: 0.45, glutes: 0.45, core: 0.1 },
  'mv-dumbbell-romanian-deadlift': { legs: 0.45, glutes: 0.4, back: 0.15 },
  'mv-goblet-squat': { legs: 0.55, glutes: 0.3, core: 0.15 },
  'mv-dumbbell-lateral-lunge': { legs: 0.6, glutes: 0.4 },
  'mv-dumbbell-step-up': { legs: 0.5, glutes: 0.45, core: 0.05 },
  'bw-calf-raise': { legs: 1 },
  'mv-single-leg-calf-raise': { legs: 1 },
  'mv-bench-hip-thrust': { glutes: 0.7, legs: 0.22, core: 0.08 },
  'bw-glute-bridge': { glutes: 0.8, legs: 0.12, core: 0.08 },
  'mv-single-leg-glute-bridge': { glutes: 0.72, legs: 0.13, core: 0.15 },
  'mv-kettlebell-swing': { glutes: 0.45, power: 0.25, back: 0.2, legs: 0.1 },
  'bw-bird-dog': { core: 0.75, back: 0.25 },
  'bw-dead-bug': { core: 1 },
  'bw-hollow-hold': { core: 1 },
  'bw-reverse-crunch': { core: 1 },
  'bw-side-plank': { core: 1 },
  'mv-copenhagen-plank': { core: 0.55, legs: 0.45 },
  'bw-plank': { core: 0.88, shoulders: 0.12 },
  'mv-l-sit-hold': { core: 0.6, shoulders: 0.22, arms: 0.18 },
  'mv-dip-bar-knee-raise': { core: 0.82, shoulders: 0.1, arms: 0.08 },
  'mv-kettlebell-farmer-s-hold': { core: 0.45, forearms: 0.4, back: 0.15 },
  'mv-farmer-s-walk': { forearms: 0.45, core: 0.35, legs: 0.12, back: 0.08 },
  'mv-dumbbell-wrist-curl': { forearms: 1 },
  'mv-dumbbell-reverse-wrist-curl': { forearms: 1 },
  'mv-dumbbell-farmer-s-carry-hold': { forearms: 0.6, core: 0.28, back: 0.12 },
  'mv-flexbar-tyler-twist': { forearms: 0.9, arms: 0.1 },
  'mv-flexbar-reverse-tyler-twist': { forearms: 0.9, arms: 0.1 },
  'mv-flexbar-supination': { forearms: 0.88, arms: 0.12 },
  'mv-split-squat-jump': { power: 0.45, legs: 0.35, glutes: 0.2 },
  'mv-squat-jump': { power: 0.45, legs: 0.35, glutes: 0.2 },
  'mv-tuck-jump': { power: 0.45, legs: 0.35, core: 0.2 },
  'mv-lateral-shuffle': { legs: 0.4, power: 0.35, cardio: 0.25 },
  'mv-medicine-ball-chest-pass': { power: 0.45, chest: 0.3, arms: 0.15, core: 0.1 },
  'mv-band-external-rotation': { shoulders: 1 },
  'mv-band-scaption': { shoulders: 1 },
  'mv-band-leg-curl': { legs: 1 },
  'mv-nordic-curl-band-assisted': { legs: 0.7, glutes: 0.18, core: 0.12 },
  'mv-nordic-curl-negative': { legs: 0.7, glutes: 0.18, core: 0.12 },
  'mv-nordic-curl': { legs: 0.7, glutes: 0.18, core: 0.12 },
  'mv-band-leg-extension': { legs: 1 },
  'mv-band-pallof-press': { core: 0.88, shoulders: 0.12 },
  'mv-band-rotational-press': { core: 0.45, power: 0.3, shoulders: 0.25 },
  'mv-back-extension': { back: 0.5, glutes: 0.35, core: 0.15 },
  // the hold is the same muscles doing the same job without the movement, so
  // the split is the movement's — a touch more core for standing still in it
  'mv-back-extension-hold': { back: 0.48, glutes: 0.32, core: 0.2 },
  'mv-band-pull-through': { glutes: 0.55, legs: 0.25, power: 0.2 },
}

/**
 * The share each slot of `parts` gets when nothing is written down — steeply
 * front-loaded, because "primary muscle first" is the one thing `parts` has
 * always promised. Renormalised to the number of parts the exercise has.
 *
 * This is a fallback, not the model. `npm run gym:effort` asks Claude for a
 * real mix for anything landing here (§18t).
 */
const POSITIONAL = [0.55, 0.25, 0.12, 0.05, 0.03]

/** Both shapes that carry an exercise: the catalog's def (`id`) and a session's snapshot (`exId`). */
export interface MixInput {
  id?: string
  exId?: string
  parts: BodyPart[]
}

/** Where this exercise's work goes. Written by hand where we know it, positional where we don't. */
export function effortMix(e: MixInput): EffortMix {
  const written = MIX[e.id ?? e.exId ?? '']
  if (written) return written
  const parts = e.parts.length > 0 ? e.parts : (['fullBody'] as BodyPart[])
  const raw = parts.map((_, i) => POSITIONAL[i] ?? 0.02)
  const total = raw.reduce((n, v) => n + v, 0) || 1
  const out: EffortMix = {}
  parts.forEach((p, i) => {
    out[p] = (out[p] ?? 0) + raw[i] / total
  })
  return out
}

/** Is this mix written by hand, or guessed from the order of `parts`? Used by the audit and the script. */
export function hasWrittenMix(id: string): boolean {
  return id in MIX
}

/** Every exercise id with a hand-written mix — the script diffs the catalog against this. */
export function writtenMixIds(): string[] {
  return Object.keys(MIX)
}

// --- how hard one exercise was ------------------------------------------------

/** A heavy movement costs more than a light one for the same number of sets. */
const INTENSITY_COST: Record<1 | 2 | 3, number> = { 1: 0.7, 2: 1, 3: 1.35 }

/**
 * The same exchange rate the session grade uses: six seconds of a hold is about
 * a rep, and a minute of cardio is about eight. Without it a 45-second plank
 * would read as forty-five reps and bury an entire pressing session.
 */
function repEquivalents(e: Pick<SessionExercise, 'kind' | 'perSide' | 'sets'>): number {
  const raw = loggedReps(e)
  if (e.kind === 'timed') return raw / 6
  if (e.kind === 'cardio') return raw * 8
  return raw
}

/**
 * How much a set is worth relative to a normal working set of ten. Deliberately
 * flat — a set of twenty is more work than a set of five, but it is nowhere near
 * four times more, and treating it that way is how a rep-ladder session drowns
 * out a heavy one.
 */
function repCost(avgReps: number): number {
  return clamp(Math.sqrt(Math.max(0.5, avgReps) / 10), 0.65, 1.5)
}

/** The ceiling on the overload bonus: half as much again, never more. */
export const MAX_OVERLOAD = 1.5

/** How many past sessions of an exercise your "normal" is measured over. */
export const NORM_WINDOW = 3

/**
 * Effort units for one logged exercise, before it is split across the body.
 * Roughly "hard working sets": three normal sets of ten at normal intensity is
 * about 3.
 */
export function exerciseEffort(e: SessionExercise, overload = 1): number {
  const sets = e.sets.length
  if (sets === 0 || e.skipped) return 0
  const avg = repEquivalents(e) / sets
  const cost = INTENSITY_COST[(e.intensity ?? 2) as 1 | 2 | 3] ?? 1
  return sets * repCost(avg) * cost * overload
}

// --- the overload bonus -------------------------------------------------------

/**
 * The number the overload bonus is measured on. Loaded work progresses on the
 * dumbbells, so it is the heaviest set. Bodyweight work has no dumbbells to add
 * and progresses on the reps instead (§18d), so it is the best set — which is
 * exactly what the rep ladder is already climbing.
 */
function topOf(e: SessionExercise): number {
  const weight = Math.max(0, ...e.sets.map((s) => s.weight ?? 0))
  if (weight > 0) return weight
  return Math.max(0, ...e.sets.map((s) => s.reps))
}

/** One exercise, one session — everything the Body map and the Stats split are built from. */
export interface EffortRow {
  day: string
  /** When it happened, ms. A session still running is stamped `now`. */
  at: number
  exId: string
  name: string
  sets: number
  /** The top set — pounds on a loaded movement, reps on a bodyweight one. */
  top: number
  /** What that number had been: the heaviest of your last `NORM_WINDOW` sessions. 0 = first time. */
  norm: number
  /** 1 = your normal. 1.33 = a third more than normal, and the effort is scaled to match. */
  overload: number
  /** Total effort units. */
  effort: number
  /** Those units, split across the body. */
  mix: Partial<Record<BodyPart, number>>
}

function sessionAt(s: GymSession, now: number): number {
  if (s.status !== 'done' && !s.finishedAt) return now // still on the bench: it counts from right now
  const at = s.finishedAt ? Date.parse(s.finishedAt) : parseDay(s.day).getTime()
  return Number.isFinite(at) ? at : now
}

/**
 * Every logged exercise in the log, oldest first, with its effort worked out.
 *
 * The walk has to be chronological because the overload bonus is a comparison
 * with your own past: what counted as "more than normal" in March is not what
 * counts now, and replaying the log in order is the only way to get that right.
 */
export function effortRows(
  sessions: GymSession[],
  opts: { live?: GymSession | null; now?: number } = {},
): EffortRow[] {
  const now = opts.now ?? Date.now()
  const live = opts.live && opts.live.status !== 'preview' ? opts.live : null
  const all = [...sessions, ...(live ? [live] : [])]
    .map((s) => ({ s, at: sessionAt(s, now) }))
    .sort((a, b) => a.at - b.at)

  /** Top sets per exercise, in order — the memory the "normal" is read out of. */
  const history = new Map<string, number[]>()
  const rows: EffortRow[] = []

  for (const { s, at } of all) {
    for (const e of s.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      const past = history.get(e.exId) ?? []
      const norm = past.length > 0 ? Math.max(...past.slice(-NORM_WINDOW)) : 0
      const top = topOf(e)
      // No history means no normal to beat — a first attempt is not an overload,
      // it is a baseline. Same for anything the runner never got a number for.
      const overload = norm > 0 && top > norm ? Math.min(MAX_OVERLOAD, top / norm) : 1
      const effort = exerciseEffort(e, overload)
      const share = effortMix(e)
      const mix: EffortMix = {}
      for (const [part, frac] of Object.entries(share)) mix[part as BodyPart] = effort * frac
      rows.push({ day: s.day, at, exId: e.exId, name: e.name, sets: e.sets.length, top, norm, overload, effort, mix })
      if (top > 0) history.set(e.exId, [...past, top])
    }
  }
  return rows
}

// --- turning effort into recovery ---------------------------------------------

/**
 * The effort a body part has to take before it counts as a full session's work
 * — about three dedicated hard sets. Below it, recovery is proportionally
 * shorter: the core does not need a day off because you did push-ups.
 */
export const FULL_DOSE = 3

/**
 * Under this many units, a part was not trained — it was brushed. The 0.07 core
 * share of a one-arm row is real arithmetic and zero stimulus, and letting it
 * open a recovery window is how the Body map ended up red on a core that had
 * done nothing all day.
 */
export const IGNORE_DOSE = 0.25

/** The shortest a recovery window can be scaled to, for a dose that clears `IGNORE_DOSE`. */
const MIN_DOSE_FACTOR = 0.1

/**
 * What share of a part's full recovery window this much work bought — and, just
 * as importantly, HOW DEEP the hole is.
 *
 * Both, from the same number, because a light dose is shallow as well as short.
 * Scaling only the window was the first version and it was wrong: a 0.3-unit
 * brush got a 7-hour window, and for the first three of those hours the part sat
 * at "just worked" red — the same colour a real session earns. Depth fixes that.
 * A part can only be driven as far into the red as the work actually put it, so
 * red now means "you genuinely trained this", which is the only thing the colour
 * was ever supposed to say.
 */
export function doseFactor(dose: number): number {
  if (dose < IGNORE_DOSE) return 0
  return clamp(dose / FULL_DOSE, MIN_DOSE_FACTOR, 1)
}

/**
 * How fatigued ONE hit leaves a part right now: 0 = done with it, 1 = flattened.
 * Depth from the dose, decay from the clock.
 */
export function hitFatigue(dose: number, hoursAgo: number, fullNeed: number): number {
  const factor = doseFactor(dose)
  if (factor <= 0) return 0
  const need = fullNeed * factor
  return factor * clamp(1 - hoursAgo / need, 0, 1)
}
