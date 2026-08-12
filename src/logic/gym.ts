// The Training Deck's brain. Everything here is deterministic and offline —
// no network, no AI. Keep in sync with BUSINESS_REQUIREMENTS.md §18.
//
// This file exists so the AI coach can be switched OFF and nothing breaks. The
// coach (src/logic/gymCoach.ts) reads the same memory, answers in the same
// shape, and is validated against the same catalog; when it is off, slow, wrong
// or out of credits, `planSession` here builds the workout instead.
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

/** Max exercises in a session, by minute budget. */
const MAX_MOVES: Record<number, number> = { 5: 3, 10: 4, 15: 5, 20: 6, 25: 7, 30: 8, 45: 10, 60: 12 }

/** Hours a muscle group wants before it is asked again. Core and cardio bounce back fast. */
const RECOVERY_HOURS: Record<BodyPart, number> = {
  chest: 48,
  back: 48,
  shoulders: 40,
  arms: 40,
  legs: 48,
  glutes: 48,
  core: 24,
  fullBody: 40,
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
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
  fullBody: 'Full body',
  cardio: 'Cardio',
}

export const PART_EMOJI: Record<BodyPart, string> = {
  chest: '🫀',
  back: '🔙',
  shoulders: '🎯',
  arms: '💪',
  legs: '🦵',
  glutes: '🍑',
  core: '🧱',
  fullBody: '🌀',
  cardio: '🏃',
}

export const ALL_PARTS: BodyPart[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'fullBody', 'cardio']

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
// Coach → Your brief. The coach reads `text` verbatim every single session.

const DIOGO_BRIEF: GymBrief = {
  age: 43,
  avoidBackLoad: true,
  noWarmup: true,
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
  kidMode: true,
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
    ex: {},
    ladders: {},
    sessions: [],
    active: null,
    streak: { current: 0, best: 0, lastDay: null },
    totals: { sessions: 0, minutes: 0, reps: 0, coins: 0 },
    aiOn: true,
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
    if (brief.kidMode && !e.kidSafe) return false
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
 */
export function weightFor(e: ExerciseDef, mem: ExerciseMemory | undefined): number | undefined {
  if (e.kind !== 'weight') return undefined
  const last = mem?.suggestedWeight ?? mem?.lastWeight
  if (!last) return undefined
  const step = Math.max(2.5, Math.round(last * 0.05))
  if (mem?.lastAdjust === 'up') return round(last + step)
  if (mem?.lastAdjust === 'down') return round(Math.max(step, last - step))
  return round(last)
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

      // a kid's session leans playful and light
      if (gym.brief.kidMode) score += (4 - e.intensity) * 8

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
    const target = Math.max(1, Math.round(e.defaultReps * repMult))
    reps = Array.from({ length: sets }, () => target)
  }

  // the ramp-in: the first two moves of the session run light, so no separate
  // warm-up block is ever needed (see the "I don't like to warm up" brief)
  let weight = weightFor(e, mem)
  if (weight != null && index < 2) weight = round(Math.max(2.5, weight * (index === 0 ? 0.5 : 0.75)))

  return {
    exId: e.id,
    name: e.name,
    emoji: e.emoji,
    kind: e.kind,
    parts: e.parts,
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
// Two honest comparisons — how long the work took vs how long it was supposed
// to take, and how long you rested vs what was offered — plus one letter.
//
// The targets are accumulated PER SET as you do it (see the store), never from
// the whole plan, so walking out after two exercises grades those two exercises
// and nothing else. You can't buy an A+ by skipping.

export type SessionGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface SessionReport {
  grade: SessionGrade
  /** Total time taken ÷ total time asked for. Under 1 = quicker than target. */
  ratio: number
  workSec: number
  workTargetSec: number
  restSec: number
  restTargetSec: number
  totalSec: number
  totalTargetSec: number
  /** One line explaining the letter. */
  blurb: string
}

const GRADE_BANDS: { max: number; grade: SessionGrade; blurb: string }[] = [
  { max: 0.8, grade: 'A+', blurb: 'Way quicker than the plan. Relentless.' },
  { max: 0.95, grade: 'A', blurb: 'Ahead of the plan — exactly the pace it was built for.' },
  { max: 1.1, grade: 'B', blurb: 'Right around target. Solid, honest session.' },
  { max: 1.3, grade: 'C', blurb: 'A bit slower than planned. Cut the standing around.' },
  { max: 1.6, grade: 'D', blurb: 'A lot of the session was spent not training.' },
  { max: Infinity, grade: 'F', blurb: 'More time resting than working. Shorter rests next time.' },
]

/** The report for a finished session, or null when nothing was logged to grade. */
export function sessionReport(s: GymSession): SessionReport | null {
  const workTargetSec = Math.round(s.workTargetSec ?? 0)
  const restTargetSec = Math.round(s.restTargetSec ?? 0)
  const totalTargetSec = workTargetSec + restTargetSec
  if (totalTargetSec <= 0) return null

  const workSec = Math.round(s.workSec ?? 0)
  const restSec = Math.round(s.restTotalSec ?? 0)
  const totalSec = workSec + restSec
  const ratio = totalSec / totalTargetSec
  const band = GRADE_BANDS.find((b) => ratio < b.max) ?? GRADE_BANDS[GRADE_BANDS.length - 1]

  return { grade: band.grade, ratio, workSec, workTargetSec, restSec, restTargetSec, totalSec, totalTargetSec, blurb: band.blurb }
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
