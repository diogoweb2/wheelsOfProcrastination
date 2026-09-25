// 🍿 Exercise snacks — ten minutes at lunch, on purpose. See §18ab.
//
// The idea is Huberman's: a short, hard, self-contained bout of one thing,
// taken between other things, rather than a workout you had to clear an hour
// for. It is not a mini training session and it must not turn into one — a
// snack is ONE THEME (abs, push-ups, the roman chair) done three or four ways,
// and it is over in ten to fifteen minutes.
//
// What it is NOT is a second engine. A snack builds the same `GymSession` the
// block does, runs through the same runner, pays the same Berries, feeds the
// same per-exercise memory and lands on the same Body map. That is the whole
// design: everything downstream — the animation, the YouTube link, the rest
// clock, the records, the grade, the watch (which reads `gym.active` and has no
// idea what a snack is) — keeps working because there is nothing new for it to
// know about. Only the PICKING is different, and the picking is this file.
//
// THREE RULES THE ROUTINES OBEY.
//
//   1. Bodyweight only, for now. So progression is REPS (§18d): `repPlanFor`
//      climbs the ask a rep at a time inside the written range and then spreads
//      it over more sets, exactly as it does for a block slot. A hold climbs in
//      seconds the same way.
//   2. The list is FIXED, like a block's. You can drop a slot today; you cannot
//      turn the abs snack into whatever the planner felt like.
//   3. The lower back rule is not a preference. A block slot bypasses
//      `avoidBackLoad` by design — the block was written by hand, so it is
//      assumed to have thought about it. A snack routine ships in code and
//      still filters `backRisk`, because a routine nobody edited is not a
//      decision anybody made.
import type { BlockExercise, BodyPart, GymCatalog, GymSession, GymState, Mood, SessionExercise } from '../types'
import { dayKey } from './dates'
import {
  daysSince,
  exerciseById,
  exerciseSeconds,
  planOne,
  progressesOnReps,
  repPlanFor,
  repShape,
  sessionSeconds,
} from './gym'
import { holdRange } from './gymBlock'
import { effortMix } from './gymEffort'
import { partRecovery, readyIn, type PartRecovery } from './gymBody'

/** One snack: a theme, and three or four ways of doing it. */
export interface SnackRoutine {
  id: string
  name: string
  emoji: string
  /** One line on the card — what this snack is for. */
  goal: string
  /** The note that rides on the built session, in the trainer's voice. */
  note: string
  /** The slots, in order. Same shape as a block's, so the same progression reads them. */
  slots: BlockExercise[]
}

/**
 * The ceiling. A snack that runs to twenty minutes is a workout you did not
 * plan for, and the next one is the one you skip — so the tail comes off
 * instead (`fitToSnack`). Fifteen is the published promise; the estimate on the
 * card is the honest one.
 */
export const SNACK_CAP_SEC = 15 * 60

/** Never trimmed below this: two movements is still a snack, one is an errand. */
const SNACK_MIN_MOVES = 2

/**
 * Rest is capped hard. Left alone, `restFor` hands back what you take in a real
 * session — 60, 75, 90 seconds — and four slots of that is the whole lunch
 * break spent standing still. A snack is meant to be dense.
 */
export const SNACK_REST_MAX = 45

const slot = (exId: string, sets: number, repLow: number, repHigh: number, note?: string): BlockExercise => ({
  exId,
  sets,
  repLow,
  repHigh,
  ...(note ? { note } : {}),
})

/**
 * The routines. Three, because three is what was asked for and because a menu
 * of nine is a menu nobody reads at 12:40. Adding a fourth is one entry here —
 * the tab, the recommendation, the planner and the report all read this list.
 */
export const SNACKS: SnackRoutine[] = [
  {
    id: 'abs',
    name: 'Abs',
    emoji: '🧱',
    goal: 'The core, four ways: two that move and two that don’t.',
    note: 'Abs snack. Quality over count — the moment the lower back lifts off the floor, that set is finished.',
    slots: [
      slot('bw-dead-bug', 3, 10, 16, 'Lower back stays pressed into the floor. That is the whole exercise.'),
      slot('bw-reverse-crunch', 3, 10, 16, 'Curl the hips up, don’t swing the legs. Slow on the way down.'),
      slot('bw-hollow-hold', 3, 20, 40, 'Legs higher if the back starts to arch — a smaller hollow held properly wins.'),
      slot('bw-side-plank', 2, 25, 40, 'Both sides, and the second one has to match the first.'),
    ],
  },
  {
    id: 'pushup',
    name: 'Push-ups',
    emoji: '🫸',
    goal: 'One movement, three hand positions and a hold.',
    note: 'Push-up snack. Same movement moved around the chest — normal, wide, narrow, then hold what is left.',
    slots: [
      slot('bw-pushup', 3, 8, 15),
      slot('bw-wide-pushup', 3, 8, 14, 'Wider hands — outer chest, less triceps. Stop if the front of the shoulder complains.'),
      slot('bw-diamond-pushup', 2, 5, 12, 'Expect about half the reps of a normal push-up. That is correct, not a bad day.'),
      slot('bw-pushup-hold', 2, 15, 30, 'Halfway down and stay there. The finisher — nothing left to count.'),
    ],
  },
  {
    id: 'roman',
    name: 'Roman chair',
    emoji: '🐍',
    goal: 'Ten minutes of lower back and glutes, the thing that keeps you on court.',
    note: 'Roman chair snack. Endurance work for the lower back — stop level with the body, never arch past straight.',
    slots: [
      slot('mv-back-extension', 3, 10, 16, 'Finisher, not a lift. Squeeze the glutes to come up.'),
      slot('mv-back-extension-hold', 2, 20, 40, 'Same position, held. One straight line, chin tucked.'),
      slot('bw-glute-bridge', 3, 15, 25, 'Drive through the heels; the glutes do it, not the lower back.'),
      slot('bw-bird-dog', 2, 8, 14, 'Slow. Hips stay square to the floor — no rolling to reach further.'),
    ],
  },
]

export function snackById(id: string | null | undefined): SnackRoutine | undefined {
  return id ? SNACKS.find((s) => s.id === id) : undefined
}

// --- building one -----------------------------------------------------------

export interface SnackPlanInput {
  catalog: GymCatalog | null
  gym: GymState
  snackId: string
  day?: string
  /** Filed with the session so a 🥱 day and a 🔥 day can be told apart later. Never changes the work. */
  mood?: Mood
}

/**
 * Pop the tail until it fits inside the cap — the same rule a 20-minute block
 * session uses (`fitToLength`). The routines are written most-important-first,
 * so what comes off is the finisher, never the movement the snack is named for.
 */
function fitToSnack(list: SessionExercise[]): SessionExercise[] {
  const out = [...list]
  while (out.length > SNACK_MIN_MOVES && out.reduce((n, e) => n + exerciseSeconds(e), 0) > SNACK_CAP_SEC) out.pop()
  return out
}

/**
 * Build the workout for one snack. Everything personal still comes from the
 * per-exercise memory (`planOne` inside `buildSnackExercise`): the reps you
 * have earned, the rest you actually take, how long a set of this takes YOU.
 * The routine only decides which movements, in what order, over what range.
 *
 * Returns null for an unknown id, and a session with fewer slots than the
 * routine has when the basement is missing the gear for one — a roman-chair
 * snack in a room with no hyperextension bench is three movements, not an error.
 */
export function planSnackSession(input: SnackPlanInput): GymSession | null {
  const { gym, catalog } = input
  const routine = snackById(input.snackId)
  if (!routine) return null
  const day = input.day ?? dayKey()
  const mood = input.mood ?? 'normal'

  const built: SessionExercise[] = []
  for (const s of routine.slots) {
    const one = buildSnackExercise(s, { catalog, gym, day, mood })
    if (one) built.push(one)
  }
  const exercises = fitToSnack(built)
  const trimmed = built.length - exercises.length

  return {
    id: crypto.randomUUID(),
    day,
    status: 'preview',
    minutes: Math.max(5, Math.round(sessionSeconds({ exercises } as GymSession) / 60)),
    mood,
    gearMode: 'bodyweight',
    source: 'local',
    note: trimmed > 0 ? `${routine.note} Short on time — the last ${trimmed === 1 ? 'move is' : `${trimmed} moves are`} off.` : routine.note,
    exercises,
    coins: 0,
    snack: routine.id,
    snackName: routine.name,
  }
}

/** One slot → one prescribed exercise, or null when the basement or the back rules say no. */
function buildSnackExercise(
  s: BlockExercise,
  ctx: { catalog: GymCatalog | null; gym: GymState; day: string; mood: Mood },
): SessionExercise | null {
  const { catalog, gym, day, mood } = ctx
  const def = exerciseById(catalog, s.exId)
  if (!def || def.retired) return null
  // see rule 3 at the top of this file: a routine nobody edited is not a
  // decision anybody made, so it obeys the brief the way the planner's pool does
  if (gym.brief.avoidBackLoad && def.backRisk) return null
  // the gear has to actually be in the basement, same test the planner applies
  const owned = new Set((catalog?.equipment ?? []).filter((e) => !e.retired).map((e) => e.id))
  if (!def.equipmentIds.every((id) => owned.has(id))) return null

  // index 2 = "this is not the opening move of a workout", so no whole-exercise
  // de-load. A snack has no ramp: it is ten minutes of bodyweight, and half a
  // push-up is not a warm-up, it is a push-up.
  const one = planOne(def, { catalog, gym, minutes: 15, mood, gearMode: 'mixed', day }, 2)

  const [low, high] = holdRange(s, def, gym)
  const ladder = progressesOnReps(def) ? repPlanFor(s, gym.ex[def.id]) : null
  const reps = ladder ? repShape(ladder.sets, ladder.total) : Array.from({ length: s.sets }, () => low)

  return {
    ...one,
    plan: { ...one.plan, reps, restSec: Math.min(one.plan.restSec, SNACK_REST_MAX) },
    repRange: [low, high],
    // the rep-ladder GAME and its max test belong to the free planner (§18f).
    // Inside a snack the slot IS the prescription, same as inside a block.
    ladder: undefined,
    ladderTest: undefined,
    why: s.note,
  }
}

// --- which one should I do? --------------------------------------------------
//
// The Body tab already knows the answer and until now kept it to itself: it is
// the same `partRecovery` rows, read through the same effort mixes the planner
// scores on. So the Snack tab cannot recommend something the Body map calls red
// — they are literally the same number — and the recommendation is a LABEL, not
// a gate. You can tap any of them.

/** One routine, ranked. */
export interface SnackPick {
  routine: SnackRoutine
  /** 0–1 — how recovered the muscles this routine actually works are. */
  ready: number
  /** The part carrying most of the work, and its row off the Body map. */
  driver: PartRecovery | null
  /**
   * The part costing this routine the most readiness right now — `share × how
   * tired it is`. Null when nothing is meaningfully in the way. It is NOT the
   * same question as `driver`: a fried core is 15 % of a push-up and 100 % of a
   * plank, and the sentence has to be about whichever one the reader is
   * actually being held up by.
   */
  blocker: PartRecovery | null
  /** Days since you last did this snack. 999 = never. */
  since: number
  score: number
  /** The top-ranked runnable one wears the ⭐. */
  recommended: boolean
  /** Why, in one sentence — always a real reason, never a shrug. */
  why: string
  /** How many of the routine's slots the basement can actually supply. 0 = can't run it. */
  moves: number
}

/**
 * Where a routine's work lands, as one mix summing to 1 — the routine's own
 * version of `effortMix`. Slots that can't be built are left out, so a
 * roman-chair snack in a benchless room is scored on what is left of it.
 */
function routineMix(routine: SnackRoutine, catalog: GymCatalog | null): { mix: Partial<Record<BodyPart, number>>; moves: number } {
  const mix: Partial<Record<BodyPart, number>> = {}
  let moves = 0
  for (const s of routine.slots) {
    const def = exerciseById(catalog, s.exId)
    if (!def || def.retired) continue
    moves += 1
    for (const [part, share] of Object.entries(effortMix(def))) {
      mix[part as BodyPart] = (mix[part as BodyPart] ?? 0) + share
    }
  }
  const total = Object.values(mix).reduce((n, v) => n + v, 0)
  if (total > 0) for (const k of Object.keys(mix)) mix[k as BodyPart] = (mix[k as BodyPart] as number) / total
  return { mix, moves }
}

/** The day you last did this snack, off the session log. */
export function lastSnackDay(gym: GymState, snackId: string): string | undefined {
  for (let i = gym.sessions.length - 1; i >= 0; i--) {
    if (gym.sessions[i].snack === snackId) return gym.sessions[i].day
  }
  return undefined
}

/** Under this much lost readiness, a tired part is not what is holding you up. */
const BLOCKER_FLOOR = 0.05

/**
 * Every routine, best first.
 *
 * Two things move a snack up the list and they are the two things that matter
 * at lunchtime: **is it recovered** (weighted by where the work really goes,
 * which is why a push-up snack isn't buried by a sore core) and **how long
 * since you last did it**. Novelty is capped at ten days so a snack you have
 * never done can't outrank a fully-rested one forever.
 */
export function rankSnacks(gym: GymState, catalog: GymCatalog | null, now = Date.now(), today = dayKey()): SnackPick[] {
  const recovery = partRecovery(gym, now)
  const byPart = new Map(recovery.map((r) => [r.part, r]))

  const picks = SNACKS.map((routine): SnackPick => {
    const { mix, moves } = routineMix(routine, catalog)
    const entries = Object.entries(mix) as [BodyPart, number][]
    const ready = entries.reduce((n, [part, share]) => n + (byPart.get(part)?.pct ?? 1) * share, 0)
    // the part doing most of the work…
    const top = [...entries].sort((a, b) => b[1] - a[1])[0]
    // …and the part costing the most readiness, which is rarely the same one
    const worst = [...entries]
      .map(([part, share]) => ({ part, loss: share * (1 - (byPart.get(part)?.pct ?? 1)) }))
      .sort((a, b) => b.loss - a.loss)[0]
    const since = daysSince(lastSnackDay(gym, routine.id), today)
    return {
      routine,
      ready,
      driver: top ? byPart.get(top[0]) ?? null : null,
      blocker: worst && worst.loss >= BLOCKER_FLOOR ? byPart.get(worst.part) ?? null : null,
      since,
      score: moves === 0 ? -1 : ready * 100 + Math.min(since, 10) * 5,
      moves,
      recommended: false,
      why: '',
    }
  }).sort((a, b) => b.score - a.score)

  const best = picks.find((p) => p.moves > 0)
  for (const p of picks) {
    p.recommended = p === best
    p.why = snackWhy(p)
  }
  return picks
}

function snackWhy(p: SnackPick): string {
  if (p.moves === 0) return 'Nothing in this one is in the catalog — add the gear in the Gear tab.'
  const last =
    p.since >= 999
      ? 'You have never done this one.'
      : p.since === 0
        ? 'You already did it today.'
        : p.since === 1
          ? 'You last did it yesterday.'
          : `It has been ${p.since} days.`

  // nothing meaningfully sore: say what it works, and when you last did it
  if (!p.blocker) {
    const w = partWord(p.driver?.part)
    return `${cap(w.name)} ${w.is} fresh. ${last}`
  }

  const b = partWord(p.blocker.part)
  const pct = Math.round(p.blocker.pct * 100)
  if (p.ready >= 0.85)
    return `${cap(b.name)} ${b.is} only ${pct}% back, but it is a small part of this one — fine to do. ${last}`
  if (p.ready >= 0.6)
    return `${cap(b.name)} ${b.is} ${pct}% back and does a fair share of this — fully clear in ${readyIn(p.blocker.left)}. ${last}`
  return `${cap(b.name)} ${b.was} worked ${readyIn(p.blocker.since)} ago and ${b.is} still flat — this one is ready in ${readyIn(p.blocker.left)}.`
}

/** The part, in words, with the verbs that agree with it. "Your glutes is" was not fine. */
function partWord(part: BodyPart | undefined): { name: string; is: string; was: string } {
  const plural: Partial<Record<BodyPart, string>> = {
    glutes: 'your glutes',
    arms: 'your arms',
    shoulders: 'your shoulders',
    legs: 'your legs',
    forearms: 'your forearms',
  }
  const single: Partial<Record<BodyPart, string>> = {
    core: 'your core',
    chest: 'your chest',
    back: 'your lower back',
    cardio: 'your engine',
    power: 'your power work',
    fullBody: 'everything this uses',
  }
  if (part && plural[part]) return { name: plural[part] as string, is: 'are', was: 'were' }
  return { name: (part && single[part]) || 'what this works', is: 'is', was: 'was' }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
