// The Training Deck's brain. Everything here is deterministic and offline —
// no network, no AI. Keep in sync with BUSINESS_REQUIREMENTS.md §18.
//
// This was written as the AI coach's failure path — the thing that had to work
// when the model was off, slow, wrong or out of credits. The coach is gone now
// (BUSINESS_REQUIREMENTS §18) and this is simply the planner: no network, no
// key, no credits, no fallback state to explain to anyone.
import type {
  BodyPart,
  Equipment,
  ExerciseDef,
  ExerciseKind,
  ExerciseMemory,
  ExerciseRating,
  GearMode,
  GymBrief,
  GymCatalog,
  GymSession,
  GymState,
  LadderState,
  LoggedSet,
  Mood,
  SessionExercise,
} from '../types'
import { dayKey, parseDay } from './dates'
import starters from './gymStarters.json'

// --- constants --------------------------------------------------------------

/** Session lengths the setup screen offers, in minutes. */
export const SESSION_MINUTES = [5, 10, 15, 20, 25, 30, 45, 60] as const

/** How many finished sessions stay in the profile doc. The per-exercise memory is what matters long-term. */
export const GYM_LOG_CAP = 220

/** Rest is clamped to this band no matter what the coach or the history says. */
export const REST_MIN = 15
export const REST_MAX = 240

/**
 * The adjustable dumbbell's real notches, in pounds — the TruLap 90 lb pair in
 * the basement. It cannot be set to 20 lb, so the app never asks for 20 lb:
 * every suggested weight is snapped onto this ladder, and + / − in the runner
 * walk it one notch at a time instead of stepping by 2.5.
 *
 * Only meaningful in pounds. A profile on kg keeps the old free 2.5 steps.
 */
export const DUMBBELL_LB = [
  8.5, 12, 15.5, 18.5, 22, 25, 28.5, 32, 35.5, 38.5, 42, 45.5, 48.5, 52, 55.5, 58.5, 62, 65, 68.5, 72, 75, 78.5, 82, 85.5,
  88.5, 92,
] as const

/** The notches available for a given unit — empty when there is no ladder to follow. */
export function loadSteps(unit: 'lb' | 'kg' | undefined): readonly number[] {
  return (unit ?? 'lb') === 'lb' ? DUMBBELL_LB : []
}

/** The closest notch to `w`. Values outside the ladder clamp to its ends. */
export function snapLoad(w: number, unit: 'lb' | 'kg' | undefined = 'lb'): number {
  const steps = loadSteps(unit)
  if (steps.length === 0 || !Number.isFinite(w)) return round(w)
  return steps.reduce((best, s) => (Math.abs(s - w) < Math.abs(best - w) ? s : best), steps[0])
}

/** One notch up (`dir` 1) or down (−1) from `w`. Off a ladder, a 5% step of at least 2.5. */
export function stepLoad(w: number, dir: 1 | -1, unit: 'lb' | 'kg' | undefined = 'lb'): number {
  const steps = loadSteps(unit)
  if (steps.length === 0) {
    const step = Math.max(2.5, Math.round(w * 0.05))
    return round(Math.max(step, w + dir * step))
  }
  const i = steps.indexOf(snapLoad(w, unit))
  return steps[clamp(i + dir, 0, steps.length - 1)]
}

/** Max exercises in a session, by minute budget. */
const MAX_MOVES: Record<number, number> = { 5: 3, 10: 4, 15: 5, 20: 6, 25: 7, 30: 8, 45: 10, 60: 12 }

/** Hours a muscle group wants before it is asked again. Core and cardio bounce back fast. */
const RECOVERY_HOURS: Record<BodyPart, number> = {
  chest: 48,
  back: 48,
  shoulders: 40,
  arms: 40,
  forearms: 24,
  legs: 48,
  glutes: 48,
  core: 24,
  fullBody: 40,
  power: 48,
  cardio: 12,
}

export const RATING_LABEL: Record<ExerciseRating, string> = {
  hate: '🤢 Hate it',
  dislike: '😕 Don’t like',
  ok: '😐 OK',
  like: '🙂 Like it',
  love: '🤩 Great',
}

/** How a rating moves an exercise's chance of being picked. `hate` is a hard filter, not a score. */
const RATING_SCORE: Record<ExerciseRating, number> = { hate: -9999, dislike: -40, ok: 0, like: 25, love: 45 }

export const PART_LABEL: Record<BodyPart, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  forearms: 'Forearms',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
  fullBody: 'Full body',
  power: 'Power',
  cardio: 'Cardio',
}

export const PART_EMOJI: Record<BodyPart, string> = {
  chest: '🫀',
  back: '🔙',
  shoulders: '🎯',
  arms: '💪',
  forearms: '🤝',
  legs: '🦵',
  glutes: '🍑',
  core: '🧱',
  fullBody: '🌀',
  power: '⚡',
  cardio: '🏃',
}

export const ALL_PARTS: BodyPart[] = [
  'chest', 'back', 'shoulders', 'arms', 'forearms', 'legs', 'glutes', 'core', 'fullBody', 'power', 'cardio',
]

export const GEAR_MODES: { id: GearMode; label: string; emoji: string }[] = [
  { id: 'mixed', label: 'Mixed', emoji: '🔀' },
  { id: 'weights', label: 'Weights', emoji: '🏋️' },
  { id: 'bodyweight', label: 'Body only', emoji: '🤸' },
]

export const GEAR_MODE_LABEL: Record<GearMode, string> = {
  mixed: '🔀 Weights + bodyweight',
  weights: '🏋️ Weights only',
  bodyweight: '🤸 Bodyweight only',
}

// --- the crew's starting briefs ---------------------------------------------
// Seeded the first time a profile opens the Gym; fully editable afterwards in
// Plan → Your brief. The planner reads it before building every session.

const DIOGO_BRIEF: GymBrief = {
  age: 43,
  avoidBackLoad: true,
  noWarmup: true,
  romanChairWarmup: true,
  weightUnit: 'lb',
  text: `43 years old. Plays pickleball regularly — that IS my cardio, don't add extra cardio work.
Goals, in order: (1) a bulletproof core and lower back so I can play pickleball for decades, (2) a good-looking chest, (3) stay consistent.
Lower back history: rare flare-ups, and they stopped once I started training core + lower back properly. So: train the core hard, but nothing that loads the spine heavily (no heavy deadlifts, no loaded twisting, no heavy overhead pressing while standing).
I do NOT like warming up. Start the session with the first one or two moves light or bodyweight so the warm-up happens by itself.
I like dynamic, high-rep sets — 20x lateral raise, 20x squat, 20x front raise, 20x forearm curl. That rhythm keeps me motivated far more than long heavy singles.
I also love rep ladders on pushups/pullups (2 2 2 2 2 → 2 3 2 3 2 → 3 4 2 4 2, then re-test my max).
Keep it moving. If the session drags, I quit.`,
}

const BEN_BRIEF: GymBrief = {
  age: 12,
  noWarmup: false,
  weightUnit: 'lb',
  text: `12 years old. Brand new to training — the whole goal right now is to ENJOY it and build the habit, not to get strong fast.
Bodyweight first. No heavy weights, nothing that loads the spine, no grinding sets to failure.
Short sessions, lots of variety, fun-sounding moves. Mix in something playful (animal walks, jumps, holds you can beat next time).
Celebrate small wins — beating his own number last time is the whole game.`,
}

const SEED_BRIEFS: Record<string, GymBrief> = { diogo: DIOGO_BRIEF, ben: BEN_BRIEF }

/** The brief a profile starts with. Unknown crewmates get a blank one they can fill in. */
export function seedBrief(profileId: string | null): GymBrief {
  const seed = profileId ? SEED_BRIEFS[profileId] : undefined
  return seed ? { ...seed } : { text: '', weightUnit: 'lb' }
}

export function defaultGymState(): GymState {
  return {
    brief: { text: '', weightUnit: 'lb' },
    blocks: [],
    activeBlockId: null,
    blockPos: 0,
    ex: {},
    ladders: {},
    sessions: [],
    active: null,
    streak: { current: 0, best: 0, lastDay: null },
    totals: { sessions: 0, minutes: 0, reps: 0, coins: 0 },
    soundOn: true,
    keepAwake: true,
  }
}

// --- the starter catalog ----------------------------------------------------

/**
 * Gear-free exercises every profile always has, so the app is usable the minute
 * it is installed — before a single equipment photo is processed.
 * `npm run gym:equipment` ADDS to this; it never replaces it.
 *
 * They live in a JSON file rather than in this module because
 * `scripts/gym-demos.mjs` needs the exact same list to find an animation for
 * each one, and plain node can't import TypeScript. One file, two consumers, no
 * drift. Ids are prefixed `bw-` so a generated exercise can never collide.
 */
export const STARTER_EXERCISES: ExerciseDef[] = starters as ExerciseDef[]

// --- small helpers ----------------------------------------------------------

export function daysSince(day: string | undefined | null, today: string = dayKey()): number {
  if (!day) return 999
  const ms = parseDay(today).getTime() - parseDay(day).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

/**
 * The whole catalog: the built-in bodyweight moves plus whatever the basement
 * adds. A stored entry with a starter's id WINS — that is how editing or
 * retiring a built-in move sticks (the Gear tab writes a copy into the shared
 * doc rather than trying to patch code).
 */
export function allExercises(catalog: GymCatalog | null): ExerciseDef[] {
  const stored = catalog?.exercises ?? []
  const overrides = new Map(stored.map((e) => [e.id, e]))
  const base = STARTER_EXERCISES.map((s) => overrides.get(s.id) ?? s)
  const extra = stored.filter((e) => !STARTER_EXERCISES.some((s) => s.id === e.id))
  return [...base, ...extra]
}

export function equipmentById(catalog: GymCatalog | null, id: string): Equipment | undefined {
  return catalog?.equipment.find((e) => e.id === id)
}

export function exerciseById(catalog: GymCatalog | null, id: string): ExerciseDef | undefined {
  return allExercises(catalog).find((e) => e.id === id)
}

/** Exercises this person could actually be given today: gear present, body safe, not hated. */
export function usableExercises(
  catalog: GymCatalog | null,
  brief: GymBrief,
  memory: Record<string, ExerciseMemory>,
  gearMode: GearMode = 'mixed',
): ExerciseDef[] {
  const gear = new Set((catalog?.equipment ?? []).filter((e) => !e.retired).map((e) => e.id))
  const pool = allExercises(catalog).filter((e) => {
    if (e.retired) return false
    if (!e.equipmentIds.every((id) => gear.has(id))) return false
    if (brief.avoidBackLoad && e.backRisk) return false
    if (memory[e.id]?.rating === 'hate') return false
    return true
  })
  if (gearMode === 'mixed') return pool
  // `weight` is the only kind you load — a pull-up on a bar is still bodyweight.
  const wanted = pool.filter((e) => (gearMode === 'weights' ? e.kind === 'weight' : e.kind !== 'weight'))
  // Asking for weights-only in a basement with no gear catalogued yet would
  // leave nothing to prescribe. A real session beats an empty one, so fall back.
  return wanted.length >= 3 ? wanted : pool
}

// --- the roman-chair opener -------------------------------------------------
// A back extension before anything else is Diogo's standing instruction: it
// wakes the lower back up before the session asks anything of it. It is a
// SETTING (Plan → "Roman chair first, always", ON by default), enforced by the
// planner as a hard rule rather than a preference — the ordering pass
// gets told about it, but the app doesn't rely on it obeying.

/** Names that mean "the back-extension bench". Matched against the catalog, id included. */
const ROMAN_CHAIR = /roman[\s-]?chair|back\s?extension|hyper[\s-]?extension|hyperext/i

export function wantsRomanChair(brief: GymBrief): boolean {
  return brief.romanChairWarmup !== false
}

/**
 * The exercise that opens the session when the setting is on, or undefined when
 * the basement has no such bench catalogued. Gear mode is deliberately ignored:
 * a back extension is bodyweight, and the warm-up happens on a weights day too.
 */
export function romanChairMove(
  catalog: GymCatalog | null,
  brief: GymBrief,
  memory: Record<string, ExerciseMemory>,
): ExerciseDef | undefined {
  if (!wantsRomanChair(brief)) return undefined
  return usableExercises(catalog, brief, memory, 'mixed').find((e) => ROMAN_CHAIR.test(e.name) || ROMAN_CHAIR.test(e.id))
}

/** Seconds of rest to offer: what you actually take, blended with the exercise's own default. */
export function restFor(e: ExerciseDef, mem: ExerciseMemory | undefined): number {
  const learned = mem?.restLearned
  const base = learned ? Math.round(learned * 0.75 + e.restSec * 0.25) : e.restSec
  return clamp(base, REST_MIN, REST_MAX)
}

/**
 * The weight to put in front of you. Starts from what you lifted last time and
 * moves with how you corrected the last suggestion: you loaded MORE than asked
 * (it was too easy) → nudge up; you loaded LESS (too hard) → nudge down.
 *
 * The answer always lands on a real notch of the dumbbell (see `DUMBBELL_LB`),
 * so "nudge up" means the next hole, not an arithmetic 5%.
 */
export function weightFor(e: ExerciseDef, mem: ExerciseMemory | undefined, unit: 'lb' | 'kg' = 'lb'): number | undefined {
  if (e.kind !== 'weight') return undefined
  const last = mem?.suggestedWeight ?? mem?.lastWeight
  if (!last) return undefined
  if (mem?.lastAdjust === 'up') return stepLoad(last, 1, unit)
  if (mem?.lastAdjust === 'down') return stepLoad(last, -1, unit)
  return snapLoad(last, unit)
}

function round(n: number): number {
  return Math.round(n * 2) / 2
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

// --- the rep ladder ---------------------------------------------------------
// The motivating pattern from Diogo's old pushup app: five sets that creep up
// one rep at a time, then a max test that reseeds the whole thing higher.

/** Test the max again every N cycles. */
export const LADDER_TEST_EVERY = 6

export function defaultLadder(max: number): LadderState {
  return { max: Math.max(1, max), level: 0, cyclesSinceTest: 0 }
}

/**
 * The five sets for this rung. Built from your tested max so the ladder scales
 * with you: rung 0 of a 10-rep max is `4 4 4 4 4`, and each rung adds a rep to
 * the middle sets first, then to the outer ones.
 */
export function ladderReps(l: LadderState): number[] {
  const base = Math.max(1, Math.round(l.max * 0.4))
  const step = l.level
  // pattern of extra reps added per set as the level climbs: middle sets grow first
  const shape = [
    [0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [1, 1, 0, 1, 0],
    [1, 2, 0, 2, 0],
    [1, 2, 1, 2, 1],
    [2, 3, 1, 3, 1],
  ]
  const row = shape[Math.min(step, shape.length - 1)]
  const overflow = Math.max(0, step - (shape.length - 1))
  return row.map((add) => base + add + overflow)
}

/** True when this rung should be a max-rep test instead of the normal five sets. */
export function ladderIsTest(l: LadderState): boolean {
  return l.cyclesSinceTest >= LADDER_TEST_EVERY
}

/** Move the ladder on after a completed session. A test result reseeds `max` and restarts the climb. */
export function advanceLadder(l: LadderState, testedMax: number | null, today: string): LadderState {
  if (testedMax != null) {
    return { max: Math.max(1, testedMax), level: 0, cyclesSinceTest: 0, lastTestDay: today }
  }
  const level = l.level + 1
  return { ...l, level: level > 5 ? 0 : level, cyclesSinceTest: l.cyclesSinceTest + 1 }
}

// --- time budgeting ---------------------------------------------------------

/** Seconds one set of this exercise takes to perform (rest excluded). */
export function setSeconds(kind: ExerciseKind, reps: number): number {
  if (kind === 'timed') return reps
  if (kind === 'cardio') return reps * 60
  return Math.round(reps * 3.5)
}

/**
 * Reps actually performed, counting BOTH sides for a one-limb-at-a-time move.
 *
 * The doubling only applies to exercises you count yourself. A clocked one
 * (plank, run) is measured by the app across the whole set — left and right
 * together — so its logged number already covers both sides.
 */
export function loggedReps(se: Pick<SessionExercise, 'kind' | 'perSide' | 'sets'>): number {
  const raw = se.sets.reduce((n, x) => n + x.reps, 0)
  const clocked = se.kind === 'timed' || se.kind === 'cardio'
  return se.perSide && !clocked ? raw * 2 : raw
}

/**
 * What ONE SIDE of a clocked set was worth. A per-side hold is logged as the
 * total of both sides, so the honest per-side number is the weaker of the two
 * when the runner recorded them and half the total when it didn't (old sets,
 * before the switch-sides button existed).
 */
export function sideValue(se: Pick<SessionExercise, 'perSide'>, set: LoggedSet): number {
  if (!se.perSide) return set.reps
  if (set.sides && set.sides.length > 0) return Math.min(...set.sides)
  return set.reps / 2
}

/**
 * What to ask for on a hold or a run, per side. The twin of `weightFor`: the
 * default from the catalog until you have done it, then whatever you actually
 * sustained. It only ever asks for something you have already proved you can do.
 */
export function holdFor(e: Pick<ExerciseDef, 'kind' | 'defaultReps'>, mem: ExerciseMemory | undefined): number {
  if (e.kind !== 'timed' && e.kind !== 'cardio') return e.defaultReps
  return Math.max(e.defaultReps, mem?.suggestedHold ?? 0)
}

/** Holds round to 5 s, runs to the whole minute — nobody chases 43 seconds. */
function roundHold(kind: ExerciseKind, value: number): number {
  return kind === 'timed' ? Math.max(5, Math.round(value / 5) * 5) : Math.max(1, Math.round(value))
}

/**
 * The new hold suggestion after a session, or the old one if nothing changed.
 *
 * The rule is the rep-range rule applied to a clock: the number that counts is
 * the one you managed on EVERY set (and on both sides), because a single heroic
 * first set isn't a prescription. Beat what was asked and the ask becomes what
 * you did. Fall a long way short of it and the ask comes back down, so a bad
 * guess can never sit there being unreachable forever.
 */
function holdSuggestion(base: ExerciseMemory, se: SessionExercise): number | undefined {
  if (se.kind !== 'timed' && se.kind !== 'cardio') return base.suggestedHold
  const held = Math.min(...se.sets.map((set) => sideValue(se, set)))
  if (!Number.isFinite(held) || held <= 0) return base.suggestedHold
  // the top of a block's range is the thing you are chasing; a free session
  // prescribes one number, and that number is the bar
  const asked = se.repRange ? se.repRange[1] : se.plan.reps[0]
  if (held >= asked) return Math.max(base.suggestedHold ?? 0, roundHold(se.kind, held))
  if (held < asked * 0.7) return roundHold(se.kind, held)
  return base.suggestedHold
}

/**
 * How long ONE set of `reps` really takes YOU, from the sets the app has clocked.
 * Null until there is enough evidence — three measured sets — to beat the formula.
 *
 * This is the whole point of logging `sec` on every set: after a couple of weeks
 * the time budget stops being a guess about a generic person and becomes yours.
 */
export function learnedSetSeconds(mem: ExerciseMemory | undefined, kind: ExerciseKind, reps: number): number | null {
  if (!mem || (mem.timedSets ?? 0) < 3) return null
  // seconds-per-rep generalises across prescriptions, so 12 reps can be predicted from 8
  if ((kind === 'weight' || kind === 'bodyweight') && mem.repSecLearned) return Math.round(mem.repSecLearned * reps)
  // a clocked move IS its own duration; the learned average only adds the setup drag
  if (kind === 'timed' || kind === 'cardio') {
    const nominal = setSeconds(kind, reps)
    return mem.setSecLearned ? Math.round(Math.max(nominal, mem.setSecLearned * 0.5 + nominal * 0.5)) : null
  }
  return mem.setSecLearned ?? null
}

/** Seconds this planned exercise will eat, rest and the walk-over included. */
export function exerciseSeconds(se: SessionExercise): number {
  // a per-side move is prescribed per side, so every set is performed twice —
  // but a measured pace already covers both sides, it was clocked end to end
  const perSet = se.perSide ? 2 : 1
  const work = se.paceSec
    ? se.paceSec * se.plan.reps.length
    : se.plan.reps.reduce((sum, r) => sum + setSeconds(se.kind, r) * perSet, 0)
  const rests = Math.max(0, se.plan.reps.length - 1) * se.plan.restSec
  return work + rests + 20 // 20s to walk over and set up
}

export function sessionSeconds(s: GymSession): number {
  return s.exercises.reduce((sum, e) => sum + exerciseSeconds(e), 0)
}

// --- recovery ---------------------------------------------------------------

/** Hours since each body part was last trained, from the session log. `Infinity` = never / long ago. */
export function partFatigue(sessions: GymSession[], now = Date.now()): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of sessions) {
    const at = s.finishedAt ? Date.parse(s.finishedAt) : parseDay(s.day).getTime()
    if (!Number.isFinite(at)) continue
    const hours = (now - at) / 3_600_000
    for (const e of s.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      for (const p of e.parts) out[p] = Math.min(out[p] ?? Infinity, hours)
    }
  }
  return out
}

/** 0 = fully recovered, 1 = trained minutes ago. */
function fatigueFactor(parts: BodyPart[], fatigue: Record<string, number>): number {
  let worst = 0
  for (const p of parts) {
    const hours = fatigue[p]
    if (hours == null || !Number.isFinite(hours)) continue
    const need = RECOVERY_HOURS[p] ?? 40
    worst = Math.max(worst, clamp(1 - hours / need, 0, 1))
  }
  return worst
}

// --- the planner ------------------------------------------------------------

export interface PlanInput {
  catalog: GymCatalog | null
  gym: GymState
  minutes: number
  mood: Mood
  /** Weights only / bodyweight only / both. Defaults to 'mixed'. */
  gearMode?: GearMode
  day?: string
  /** Exercise ids to keep out — a "give me another one" swap passes what it just rejected. */
  exclude?: string[]
  /** The session this one is a "do more" continuation of, if any. */
  followUp?: GymSession | null
  /** Deterministic ordering for tests; leave undefined in the app. */
  seed?: number
}

/**
 * Build a whole workout with no network call. This is the fallback whenever the
 * coach is off or fails, and it is also the thing the coach is graded against.
 */
export function planSession(input: PlanInput): GymSession {
  const day = input.day ?? dayKey()
  const picks = pickExercises(input, day)
  const exercises = picks.map((p, i) => buildSessionExercise(p, input, i))
  return {
    id: crypto.randomUUID(),
    day,
    status: 'preview',
    minutes: input.minutes,
    mood: input.mood,
    gearMode: input.gearMode ?? 'mixed',
    source: 'local',
    note: localNote(input.mood, exercises),
    exercises,
    coins: 0,
    followUp: input.followUp ? true : undefined,
  }
}

/**
 * Prescribe ONE named exercise — same reps, weight, rest and pace logic as a
 * planned session, just for a single move. The coach layer uses it to bolt the
 * roman-chair opener onto a plan the model built.
 */
export function planOne(e: ExerciseDef, input: PlanInput, index = 0): SessionExercise {
  return buildSessionExercise(e, input, index)
}

/** Pick ONE replacement for an exercise you don't feel like doing today. */
export function pickReplacement(input: PlanInput, replacing: SessionExercise, keep: SessionExercise[]): SessionExercise | null {
  const day = input.day ?? dayKey()
  const used = new Set([...keep.map((e) => e.exId), replacing.exId, ...(input.exclude ?? [])])
  const scored = scoreCandidates(input, day, keep.flatMap((e) => e.parts)).filter((c) => !used.has(c.e.id))
  if (scored.length === 0) return null
  // prefer something that hits roughly the same body parts, so the session stays balanced
  const sameArea = scored.filter((c) => c.e.parts.some((p) => replacing.parts.includes(p)))
  const from = sameArea.length > 0 ? sameArea : scored
  return buildSessionExercise(from[0].e, input, keep.length)
}

interface Scored {
  e: ExerciseDef
  score: number
}

function scoreCandidates(input: PlanInput, day: string, partsUsed: BodyPart[]): Scored[] {
  const { gym, mood } = input
  const pool = usableExercises(input.catalog, gym.brief, gym.ex, input.gearMode)
  const fatigue = partFatigue(gym.sessions)
  // a "do more" block never repeats what you just did — the memory's lastDay
  // covers it once the session is filed, this covers it even if it isn't
  const excluded = new Set([...(input.exclude ?? []), ...(input.followUp?.exercises ?? []).map((e) => e.exId)])
  const rnd = mulberry(input.seed ?? Date.now())

  const scored = pool
    .filter((e) => !excluded.has(e.id) && gym.ex[e.id]?.lastDay !== day)
    .map((e) => {
      const mem = gym.ex[e.id]
      let score = 100

      if (mem?.rating) score += RATING_SCORE[mem.rating]

      // rediscovery: the longer since you did it, the more it wants a turn (an
      // exercise you have never done gets the full bonus — that is how new gear
      // makes its way into a session)
      score += Math.min(daysSince(mem?.lastDay, day), 21) * 3

      // recovery: a part trained a few hours ago is heavily discouraged
      score -= fatigueFactor(e.parts, fatigue) * 140

      // balance within THIS session
      const overlap = e.parts.filter((p) => partsUsed.includes(p)).length
      score -= overlap * 45

      // mood pushes towards (or away from) the hard stuff
      if (mood === 'motivated') score += e.intensity * 14
      if (mood === 'lazy') score += (4 - e.intensity) * 16

      score += (rnd() - 0.5) * 26 // never the exact same workout twice
      return { e, score }
    })

  return scored.sort((a, b) => b.score - a.score)
}

function pickExercises(input: PlanInput, day: string): ExerciseDef[] {
  const budget = input.minutes * 60
  const maxMoves = MAX_MOVES[input.minutes] ?? Math.max(2, Math.round(input.minutes / 4))
  const chosen: ExerciseDef[] = []
  const partsUsed: BodyPart[] = []
  let seconds = 0

  // the standing instruction: the lower back gets woken up before anything else
  // asks it for a favour. A "do more" block is a continuation, so it doesn't
  // start over with the warm-up.
  const opener = input.followUp ? undefined : romanChairMove(input.catalog, input.gym.brief, input.gym.ex)
  if (opener && !(input.exclude ?? []).includes(opener.id)) {
    chosen.push(opener)
    partsUsed.push(...opener.parts)
    seconds += exerciseSeconds(buildSessionExercise(opener, input, 0))
  }

  while (chosen.length < maxMoves) {
    const ranked = scoreCandidates(input, day, partsUsed).filter((c) => !chosen.some((x) => x.id === c.e.id))
    if (ranked.length === 0) break
    // the first two moves are the natural warm-up: force something light
    const wantLight = chosen.length < 2
    const pick = (wantLight && ranked.find((c) => c.e.intensity === 1)) || ranked[0]
    const provisional = buildSessionExercise(pick.e, input, chosen.length)
    const cost = exerciseSeconds(provisional)
    // always take at least two moves, then stop once the budget is spent
    if (chosen.length >= 2 && seconds + cost > budget * 1.06) break
    chosen.push(pick.e)
    partsUsed.push(...pick.e.parts)
    seconds += cost
  }

  // the opener stays the opener — ordering only shuffles what comes after it
  if (chosen[0] === opener) return [chosen[0], ...orderSession(chosen.slice(1))]
  return orderSession(chosen)
}

/**
 * Light first (that IS the warm-up), heavy compound work while you are fresh,
 * core and holds last so a shaky midsection can't wreck the real lifting.
 */
function orderSession(list: ExerciseDef[]): ExerciseDef[] {
  const rank = (e: ExerciseDef) => {
    if (e.intensity === 1) return 0
    if (e.parts[0] === 'core') return 3
    if (e.parts[0] === 'cardio') return 4
    return e.intensity === 3 ? 1 : 2
  }
  return [...list].sort((a, b) => rank(a) - rank(b))
}

function buildSessionExercise(e: ExerciseDef, input: PlanInput, index: number): SessionExercise {
  const { gym, mood } = input
  const mem = gym.ex[e.id]
  const ladder = e.ladder ? gym.ladders[e.id] : undefined

  let reps: number[]
  let isTest = false

  if (ladder && ladderIsTest(ladder)) {
    reps = [ladder.max + 1] // "beat this"
    isTest = true
  } else if (ladder) {
    reps = ladderReps(ladder)
  } else {
    const sets = clamp(e.defaultSets + (mood === 'motivated' ? 1 : mood === 'lazy' ? -1 : 0), 1, 5)
    const repMult = mood === 'lazy' ? 0.8 : mood === 'motivated' ? 1.1 : 1
    // a hold asks for what you last sustained, not what the catalog guessed
    const target = Math.max(1, Math.round(holdFor(e, mem) * repMult))
    reps = Array.from({ length: sets }, () => target)
  }

  // the ramp-in: the first two moves of the session run light, so no separate
  // warm-up block is ever needed (see the "I don't like to warm up" brief)
  const unit = gym.brief.weightUnit ?? 'lb'
  let weight = weightFor(e, mem, unit)
  if (weight != null && index < 2) weight = snapLoad(Math.max(2.5, weight * (index === 0 ? 0.5 : 0.75)), unit)

  return {
    exId: e.id,
    name: e.name,
    emoji: e.emoji,
    kind: e.kind,
    parts: e.parts,
    intensity: e.intensity,
    how: e.how,
    plan: { reps, weight, restSec: restFor(e, mem) },
    sets: [],
    paceSec: learnedSetSeconds(mem, e.kind, reps[0]) ?? undefined,
    perSide: e.perSide,
    ladder: !!ladder,
    ladderTest: isTest,
    coins: 0,
  }
}

function localNote(mood: Mood, list: SessionExercise[]): string {
  const parts = [...new Set(list.flatMap((e) => e.parts))].slice(0, 3).map((p) => PART_LABEL[p].toLowerCase())
  if (list.length === 0) return 'Nothing to do — add some gear or exercises first.'
  if (mood === 'lazy') return `Short and honest: ${parts.join(', ')}. Showing up is the whole win today.`
  if (mood === 'motivated') return `You asked for it — ${parts.join(', ')}. Go get it.`
  return `Today: ${parts.join(', ')}. Steady work, clean form.`
}

/** Tiny seeded PRNG so a session can be reproduced in a test. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- coins ------------------------------------------------------------------
// Calibrated against §5: one exercise is worth about half a low-effort quest,
// and a full 30-minute session lands north of a high-effort one. Real work,
// real treasure — but a workout can't out-earn a whole day of quests.

export const GYM_PR_BONUS = 15
export const GYM_TEST_BONUS = 20

/** Berries for one finished exercise. Nothing logged = nothing paid. */
export function coinsForExercise(se: SessionExercise, pr: boolean): number {
  if (se.skipped || se.sets.length === 0) return 0
  const intensity = se.plan.reps.length > 0 ? Math.max(1, Math.round(se.plan.reps.length / 2)) : 1
  let coins = 3 + intensity * 2 + se.sets.length
  if (se.ladderTest) coins += GYM_TEST_BONUS
  if (pr) coins += GYM_PR_BONUS
  return coins
}

/** Closing bonus: paid for finishing, scaled by how long you signed up for. */
export function sessionBonus(s: GymSession, doneCount: number): number {
  if (doneCount === 0) return 0
  const base = Math.round(s.minutes / 5) * 2
  const complete = doneCount >= s.exercises.length ? 6 : 0
  const stars = s.rating ? s.rating * 2 : 0
  return base + complete + stars
}

// --- the end-of-session report ----------------------------------------------
// The grade is about the TRAINING, not the clock.
//
// The old one was a stopwatch: total time taken ÷ total time planned. That
// punished the honest version of a good session — grinding a set slowly, going
// heavier than asked, adding a rep — because all of those take longer. So the
// letter is now three things, worth 100 points between them:
//
//   💪 Work (60)      — the reps you actually did, weighted by load and by how
//                       hard the movement is, against what the plan asked for.
//   🔥 Effort (20)    — how heavy the session itself was: the intensity of the
//                       moves, going above the prescribed weight, max tests.
//   😮‍💨 Rest (20)      — the ONLY place the clock still counts. Resting as long
//                       as offered is full marks; doubling it is zero.
//
// Time spent working is reported (it is interesting) but never graded. Targets
// are still accumulated PER SET as you do it, so walking out after two
// exercises grades those two exercises and nothing else — you can't buy an A+
// by skipping.

export type SessionGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface SessionReport {
  grade: SessionGrade
  /** 0–100, the three components below added up. */
  score: number
  /** Reps × load × difficulty, done vs asked for. 1 = exactly the prescription. */
  workRatio: number
  workPoints: number
  /** Average movement intensity of what you did, 1–3. */
  intensity: number
  effortPoints: number
  /** Rest taken ÷ rest offered. Under 1 = you got back to work early. */
  restRatio: number
  restPoints: number
  /** How much heavier than prescribed you loaded, as a share (0.1 = 10% up). */
  loadOverPlan: number
  workSec: number
  workTargetSec: number
  restSec: number
  restTargetSec: number
  totalSec: number
  totalTargetSec: number
  /** One line explaining the letter. */
  blurb: string
}

const GRADE_BANDS: { min: number; grade: SessionGrade }[] = [
  { min: 92, grade: 'A+' },
  { min: 82, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 57, grade: 'C' },
  { min: 44, grade: 'D' },
  { min: -Infinity, grade: 'F' },
]

/**
 * What one set is worth. Reps carry the load with them: 10 reps at 40 lb is
 * more work than 10 at 20, and 10 of something heavy is more work than 10 of
 * something light. A hold is counted at roughly six seconds to the rep, a
 * cardio minute at eight — the exchange rates only have to be consistent,
 * because every number here is a ratio of done ÷ asked.
 */
function setEffort(
  se: Pick<SessionExercise, 'kind' | 'perSide' | 'intensity'>,
  reps: number,
  weight: number | undefined,
): number {
  const clocked = se.kind === 'timed' || se.kind === 'cardio'
  const total = se.perSide && !clocked ? reps * 2 : reps
  const units = se.kind === 'timed' ? total / 6 : se.kind === 'cardio' ? total * 8 : total
  const load = weight && weight > 0 ? 1 + weight / 40 : 1
  const hard = 0.7 + (se.intensity ?? 2) * 0.3 // 1 → 1.0, 2 → 1.3, 3 → 1.6
  return units * load * hard
}

/** The report for a finished session, or null when nothing was logged to grade. */
export function sessionReport(s: GymSession): SessionReport | null {
  let done = 0
  let asked = 0
  let intensitySum = 0
  let intensityN = 0
  let loadDone = 0
  let loadAsked = 0

  // An exercise you STARTED is graded against its whole prescription — stopping
  // at one set of three is a third of the work, and the letter says so. An
  // exercise you never touched isn't counted at all, which is what stops a short
  // honest session from being graded as a failed long one.
  for (const se of s.exercises) {
    if (se.skipped || se.sets.length === 0) continue

    for (const set of se.sets) {
      done += setEffort(se, set.reps, set.weight)
      // load is compared set-for-set, so "heavier than asked" means the same
      // thing whether you did one set or all five
      if (se.plan.weight && se.plan.weight > 0) {
        loadDone += set.weight ?? 0
        loadAsked += se.plan.weight
      }
    }
    for (const planned of se.plan.reps) asked += setEffort(se, planned, se.plan.weight)
    intensitySum += se.intensity ?? 2
    intensityN += 1
  }

  if (asked <= 0 || intensityN === 0) return null

  const workSec = Math.round(s.workSec ?? 0)
  const workTargetSec = Math.round(s.workTargetSec ?? 0)
  const restSec = Math.round(s.restTotalSec ?? 0)
  const restTargetSec = Math.round(s.restTargetSec ?? 0)

  // 💪 work — full marks for doing the prescription, and up to a fifth again on
  // top for beating it (more reps, heavier, an extra set)
  const workRatio = done / asked
  const workPoints = clamp(Math.min(workRatio, 1) * 60 + Math.max(0, Math.min(workRatio - 1, 0.25)) * 40, 0, 70)

  // 🔥 effort — how heavy the session itself was. Light day, light score: this is
  // the part you move by choosing "fired up" and by loading more than asked.
  const intensity = intensitySum / intensityN
  const loadOverPlan = loadAsked > 0 ? loadDone / loadAsked - 1 : 0
  const tests = s.exercises.filter((e) => e.ladderTest && e.sets.length > 0).length
  const effortPoints = clamp(
    ((intensity - 1) / 2) * 14 + 4 + clamp(loadOverPlan, 0, 0.25) * 24 + tests * 2,
    0,
    20,
  )

  // 😮‍💨 rest — the only stopwatch left. At or under the offered rest is full
  // marks; twice the offered rest is none of them.
  const restRatio = restTargetSec > 0 ? restSec / restTargetSec : 1
  const restPoints = restTargetSec > 0 ? clamp(2 - restRatio, 0, 1) * 20 : 20

  const score = Math.round(clamp(workPoints + effortPoints + restPoints, 0, 100))
  const grade = (GRADE_BANDS.find((b) => score >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1]).grade

  return {
    grade,
    score,
    workRatio,
    workPoints: Math.round(workPoints),
    intensity,
    effortPoints: Math.round(effortPoints),
    restRatio,
    restPoints: Math.round(restPoints),
    loadOverPlan,
    workSec,
    workTargetSec,
    restSec,
    restTargetSec,
    totalSec: workSec + restSec,
    totalTargetSec: workTargetSec + restTargetSec,
    blurb: gradeBlurb(grade, workRatio, restRatio, loadOverPlan),
  }
}

/** Says which of the three things earned (or cost) the letter — never just "good job". */
function gradeBlurb(grade: SessionGrade, workRatio: number, restRatio: number, loadOverPlan: number): string {
  if (workRatio >= 1.1 && loadOverPlan > 0.05) return 'More reps AND more weight than the plan asked for. That is a great session.'
  if (workRatio >= 1.1) return 'You did more than the plan asked for. Take the win.'
  if (loadOverPlan > 0.05) return 'You went heavier than prescribed — the next plan will ask for more.'
  if (restRatio > 1.6) return 'The work was fine; the rests were nearly double what was offered.'
  if (restRatio > 1.2) return 'Solid work, a bit long between sets.'
  if (workRatio >= 0.95) return 'The whole prescription, done properly. Exactly what was asked.'
  if (workRatio >= 0.75) return 'Most of the session landed. Slow reps are fine — missing ones aren’t.'
  if (grade === 'F') return 'Barely any of the plan got done. Come back and finish it.'
  return 'A chunk of the plan didn’t get done. Shorter session next time, fully finished, beats this.'
}

/** `m:ss`, for the report and the live timers. */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// --- learning ---------------------------------------------------------------

/** Fold one finished exercise back into the permanent memory. */
export function learnFromExercise(mem: ExerciseMemory | undefined, se: SessionExercise, day: string): ExerciseMemory {
  const base: ExerciseMemory = mem ?? { timesDone: 0, totalReps: 0 }
  if (se.skipped || se.sets.length === 0) {
    return se.rating ? { ...base, rating: se.rating, ratedAt: new Date().toISOString() } : base
  }

  const reps = loggedReps(se)
  // best stays PER SIDE — it is compared against past sets of the same exercise
  const bestReps = Math.max(base.bestReps ?? 0, ...se.sets.map((x) => x.reps))
  const weights = se.sets.map((x) => x.weight ?? 0).filter((w) => w > 0)
  const lastWeight = weights.length > 0 ? Math.max(...weights) : base.lastWeight

  // did you correct the suggestion? that is the honest signal about the load
  let lastAdjust = base.lastAdjust
  let suggested = base.suggestedWeight
  if (se.plan.weight != null && lastWeight != null) {
    if (lastWeight > se.plan.weight + 0.4) lastAdjust = 'up'
    else if (lastWeight < se.plan.weight - 0.4) lastAdjust = 'down'
    else lastAdjust = 'same'
    suggested = lastWeight
  } else if (lastWeight != null) {
    suggested = lastWeight
  }

  // rest is a rolling average of what you ACTUALLY took, not what we offered
  const restLearned =
    se.restSec != null
      ? clamp(Math.round(base.restLearned ? base.restLearned * 0.6 + se.restSec * 0.4 : se.restSec), REST_MIN, REST_MAX)
      : base.restLearned

  // how long a set of this REALLY takes you. Sets the runner clocked (`sec`) are
  // the only honest source; each one nudges the average by 30%, so a single slow
  // day drifts it rather than rewriting it.
  const timed = se.sets.filter((x) => (x.sec ?? 0) > 3 && (x.sec ?? 0) < 1800)
  let setSecLearned = base.setSecLearned
  let repSecLearned = base.repSecLearned
  for (const s of timed) {
    setSecLearned = Math.round(setSecLearned ? setSecLearned * 0.7 + s.sec! * 0.3 : s.sec!)
    // `reps` is logged per side, and the clock ran across both — so seconds-per-rep
    // here is per PRESCRIBED rep, which is exactly what a plan asks for
    if ((se.kind === 'weight' || se.kind === 'bodyweight') && s.reps > 0) {
      const perRep = s.sec! / s.reps
      repSecLearned = round(repSecLearned ? repSecLearned * 0.7 + perRep * 0.3 : perRep)
    }
  }

  return {
    ...base,
    setSecLearned,
    repSecLearned,
    timedSets: (base.timedSets ?? 0) + timed.length,
    rating: se.rating ?? base.rating,
    ratedAt: se.rating ? new Date().toISOString() : base.ratedAt,
    timesDone: base.timesDone + 1,
    totalReps: base.totalReps + reps,
    lastDay: day,
    lastWeight,
    suggestedWeight: suggested,
    lastAdjust,
    restLearned,
    suggestedHold: holdSuggestion(base, se),
    bestReps,
    bestWeight: lastWeight != null ? Math.max(base.bestWeight ?? 0, lastWeight) : base.bestWeight,
  }
}

/** Did this exercise beat its own record? Drives the PR bonus and the confetti. */
export function isPersonalRecord(mem: ExerciseMemory | undefined, se: SessionExercise): boolean {
  if (se.skipped || se.sets.length === 0) return false
  const bestReps = Math.max(...se.sets.map((x) => x.reps))
  const weights = se.sets.map((x) => x.weight ?? 0)
  const bestWeight = Math.max(0, ...weights)
  if (bestWeight > 0 && bestWeight > (mem?.bestWeight ?? 0)) return true
  if (bestWeight === 0 && bestReps > (mem?.bestReps ?? 0)) return true
  return false
}

/** Streak bookkeeping: a session today extends it, a gap of more than one day resets it. */
export function bumpStreak(streak: GymState['streak'], day: string): GymState['streak'] {
  if (streak.lastDay === day) return streak
  const gap = daysSince(streak.lastDay, day)
  const current = streak.lastDay && gap === 1 ? streak.current + 1 : 1
  return { current, best: Math.max(streak.best, current), lastDay: day }
}
