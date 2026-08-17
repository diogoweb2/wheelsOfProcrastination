// The AI personal trainer, over OpenRouter. Optional by design.
//
// Everything here is a bonus layer on top of src/logic/gym.ts: it reads the same
// memory, answers in the same shape, and is validated against the same catalog.
// Every failure path — no key, no network, bad JSON, invented exercise ids —
// ends in `planSession`, so a session ALWAYS gets built. Switching the coach off
// in Coach → Settings is a supported end state, not a degraded one: once the
// per-exercise memory is full enough the offline planner is genuinely good.
//
// The key lives in Firestore (`app/aiConfig`), never in the repo or the bundle —
// same arrangement as the Smart Price project. Put a spend cap on the
// OpenRouter dashboard; one session plan costs a fraction of a cent.
import type { AiConfig, ExerciseDef, GearMode, GymCatalog, GymSession, GymState, Mood, SessionExercise } from '../types'
import { dayKey } from './dates'
import {
  REST_MAX,
  REST_MIN,
  daysSince,
  exerciseSeconds,
  ladderIsTest,
  ladderReps,
  learnedSetSeconds,
  partFatigue,
  pickReplacement,
  planOne,
  planSession,
  restFor,
  romanChairMove,
  snapLoad,
  usableExercises,
  weightFor,
} from './gym'

import { DEFAULT_MODEL, askOpenRouter, shortAiError, sliceJson } from './openrouter'

/** Cheap, fast and reliably good at small structured JSON — the right default for one call a day. */
export { DEFAULT_MODEL }

/** Offered in Coach → Settings. Any OpenRouter model id can be typed in instead. */
export const MODEL_PRESETS: { id: string; label: string; note: string }[] = [
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini Flash Lite', note: 'cheapest — fine once your history is rich' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini Flash', note: 'cheap, fast, good judgement' },
  { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash', note: 'the default: cheapest of the capable ones' },
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', note: 'sharper on your written brief' },
  { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', note: 'the best trainer, ~20× the cost' },
]

export function coachReady(ai: AiConfig | null): boolean {
  return !!ai?.openrouterKey?.trim()
}

/** What the coach did, so the UI can be honest about it instead of pretending. */
export interface CoachOutcome {
  session: GymSession
  /** null when the coach built it; otherwise why we fell back to the offline planner. */
  fellBackBecause: string | null
}

export interface CoachInput {
  catalog: GymCatalog | null
  gym: GymState
  minutes: number
  mood: Mood
  /** Weights only / bodyweight only / both. Filters the pool before the coach ever sees it. */
  gearMode?: GearMode
  /** The session this is a "do more" continuation of — the coach must not repeat it. */
  followUp?: GymSession | null
  ai: AiConfig | null
  name: string
  day?: string
}

/**
 * Plan today's session. Never throws and never returns nothing: on any problem
 * it hands back the offline plan with the reason attached.
 */
export async function coachPlan(input: CoachInput): Promise<CoachOutcome> {
  const day = input.day ?? dayKey()
  const local = () =>
    planSession({
      catalog: input.catalog,
      gym: input.gym,
      minutes: input.minutes,
      mood: input.mood,
      gearMode: input.gearMode,
      followUp: input.followUp,
      day,
    })

  if (!input.gym.aiOn) return { session: local(), fellBackBecause: null }
  if (!coachReady(input.ai)) return { session: local(), fellBackBecause: 'no OpenRouter key set (Coach → Settings)' }

  const justDid = new Set((input.followUp?.exercises ?? []).map((e) => e.exId))
  const pool = usableExercises(input.catalog, input.gym.brief, input.gym.ex, input.gearMode).filter((e) => !justDid.has(e.id))
  if (pool.length < 3) return { session: local(), fellBackBecause: 'not enough exercises to choose from' }

  try {
    const model = input.ai?.model?.trim() || DEFAULT_MODEL
    const reply = await ask(input.ai!.openrouterKey!.trim(), model, buildPrompt(input, pool, day))
    const parsed = parseReply(reply)
    const exercises = parsed.exercises
      .map((row) => materialise(row, pool, input.gym))
      .filter((e): e is SessionExercise => e !== null)

    if (exercises.length === 0) return { session: local(), fellBackBecause: 'the coach picked nothing we own' }

    return {
      session: {
        id: crypto.randomUUID(),
        day,
        status: 'preview',
        minutes: input.minutes,
        mood: input.mood,
        gearMode: input.gearMode ?? 'mixed',
        source: 'ai',
        model,
        note: parsed.note?.slice(0, 300),
        exercises: withOpener(topUpToBudget(trimToBudget(exercises, input.minutes), input, day), input),
        coins: 0,
        followUp: input.followUp ? true : undefined,
      },
      fellBackBecause: null,
    }
  } catch (e) {
    return { session: local(), fellBackBecause: shortError(e) }
  }
}

/**
 * "Not that one today." Asks the coach for a single replacement; falls back to
 * the offline picker, which is instant and free, so a swap never leaves you stuck.
 */
export async function coachSwap(
  input: CoachInput,
  replacing: SessionExercise,
  keep: SessionExercise[],
  reason: string,
  /** Told why the coach was skipped, so a swap can be as honest as a plan. */
  onFallback?: (why: string) => void,
): Promise<SessionExercise | null> {
  const day = input.day ?? dayKey()
  const offline = () =>
    pickReplacement(
      {
        catalog: input.catalog,
        gym: input.gym,
        minutes: input.minutes,
        mood: input.mood,
        gearMode: input.gearMode,
        day,
        exclude: keep.map((k) => k.exId),
      },
      replacing,
      keep,
    )

  if (!input.gym.aiOn || !coachReady(input.ai)) return offline()

  const pool = usableExercises(input.catalog, input.gym.brief, input.gym.ex, input.gearMode).filter(
    (e) => e.id !== replacing.exId && !keep.some((k) => k.exId === e.id),
  )
  if (pool.length === 0) return null

  try {
    const model = input.ai?.model?.trim() || DEFAULT_MODEL
    const prompt = `${briefBlock(input, false)}
Today's session, already agreed:
${keep.map((k, i) => `${i + 1}. ${k.name} (${k.parts.join('/')})`).join('\n') || '(nothing else yet)'}

They do NOT want to do "${replacing.name}" today${reason ? `, because: ${reason}` : ''}.
Pick ONE replacement from the list below that keeps the session balanced.

${catalogBlock(pool, input.gym)}

Answer with ONLY this JSON object, no prose and no markdown fence:
{"id": "<exercise id>", "sets": [<reps per set>], "weight": <number or null>, "restSec": <seconds>, "why": "<max 12 words>"}`

    const reply = await ask(input.ai!.openrouterKey!.trim(), model, prompt)
    const obj = JSON.parse(sliceJson(reply, '{', '}')) as CoachRow
    const picked = materialise(obj, pool, input.gym)
    if (!picked) onFallback?.('the coach picked something we don’t own — swapped offline')
    return picked ?? offline()
  } catch (e) {
    onFallback?.(shortError(e))
    return offline()
  }
}

// --- request ----------------------------------------------------------------

function ask(key: string, model: string, prompt: string): Promise<string> {
  return askOpenRouter({
    key,
    model,
    prompt,
    title: 'Wheels of Procrastination Gym',
    system:
      'You are a careful, encouraging personal trainer. You only ever prescribe exercises from the list you are given, you respect stated injuries absolutely, and you answer with raw JSON and nothing else.',
  })
}

// --- prompt -----------------------------------------------------------------

function briefBlock(input: CoachInput, withOpener = true): string {
  const b = input.gym.brief
  // only worth saying when the bench actually exists in the catalog — and the
  // app bolts it on afterwards either way, so this is a hint, not a dependency.
  // A swap never hears about it: it is replacing one move, not rebuilding the
  // session, and the opener is not up for negotiation.
  const opener = withOpener && !input.followUp ? romanChairMove(input.catalog, b, input.gym.ex) : undefined
  const rules = [
    b.avoidBackLoad && 'HARD RULE: nothing that loads the lower back or spine heavily.',
    b.kidMode && 'HARD RULE: this is a child — bodyweight first, nothing heavy, keep it fun and short.',
    b.noWarmup && 'They refuse to do a warm-up block. Make the first one or two moves light or bodyweight so the warm-up happens naturally.',
    opener &&
      `HARD RULE: the session ALWAYS opens with "${opener.name}" (id=${opener.id}) as the warm-up — it wakes the lower back up before anything else loads it. Make it the FIRST entry in your list, easy reps, and plan the rest of the session around it.`,
  ].filter(Boolean)
  return `Athlete: ${input.name}${b.age ? `, ${b.age} years old` : ''}.
Their own words:
"""
${b.text.trim() || '(nothing written yet)'}
"""
${rules.join('\n')}`
}

function catalogBlock(pool: ExerciseDef[], gym: GymState): string {
  const rows = pool.map((e) => {
    const m = gym.ex[e.id]
    const bits = [
      `id=${e.id}`,
      `"${e.name}"`,
      `parts=${e.parts.join('/')}`,
      `kind=${e.kind}`,
      `intensity=${e.intensity}`,
      `typical=${e.defaultSets}x${e.defaultReps}`,
      `baseRest=${e.restSec}s`,
    ]
    if (e.perSide) bits.push('PER-SIDE (one limb at a time — your number is per side)')
    if (m?.rating) bits.push(`FEELS=${m.rating}`)
    if (m?.timesDone) bits.push(`done=${m.timesDone}x`)
    if (m?.lastDay) bits.push(`lastDone=${daysSince(m.lastDay)}d ago`)
    if (m?.suggestedWeight) bits.push(`weight=${m.suggestedWeight}`)
    if (m?.lastAdjust && m.lastAdjust !== 'same') bits.push(`lastTimeTooLight/Heavy=${m.lastAdjust === 'up' ? 'too light' : 'too heavy'}`)
    if (m?.restLearned) bits.push(`theirRealRest=${m.restLearned}s`)
    // measured, not guessed: what a set of this actually costs THEM
    const pace = learnedSetSeconds(m, e.kind, e.defaultReps)
    if (pace) bits.push(`theirRealSetTime=${pace}s@${e.defaultReps}reps`)
    if (m?.bestReps) bits.push(`best=${m.bestReps}`)
    if (m?.notes) bits.push(`note="${m.notes.slice(0, 80)}"`)
    return `- ${bits.join(' ')}`
  })
  return `Available exercises (you may ONLY use these ids):\n${rows.join('\n')}`
}

function historyBlock(gym: GymState): string {
  const recent = gym.sessions.slice(-8).reverse()
  if (recent.length === 0) return 'No sessions logged yet — this is their first one. Start gently and make it enjoyable.'
  const lines = recent.map((s) => {
    const done = s.exercises.filter((e) => !e.skipped && e.sets.length > 0)
    return `- ${s.day} (${daysSince(s.day)}d ago, ${s.minutes}min, felt ${s.mood}${s.rating ? `, rated ${s.rating}/5` : ''}): ${
      done.map((e) => e.name).join(', ') || 'abandoned'
    }`
  })
  const fatigue = partFatigue(gym.sessions)
  const sore = Object.entries(fatigue)
    .filter(([, h]) => h < 48)
    .map(([p, h]) => `${p} ${Math.round(h)}h ago`)
  return `Recent sessions:\n${lines.join('\n')}\n\nLast trained: ${sore.length ? sore.join(', ') : 'nothing in the last 2 days'}.`
}

function buildPrompt(input: CoachInput, pool: ExerciseDef[], day: string): string {
  const moodLine = {
    lazy: 'They feel LAZY today. Make it short, easy to start and genuinely doable — getting them to show up is the win.',
    normal: 'They feel NORMAL today. Solid, honest work.',
    motivated: 'They feel MOTIVATED today. Push harder than usual, but stay inside the hard rules.',
  }[input.mood]

  const gearLine =
    input.gearMode === 'weights'
      ? 'They asked for LOADED work only today — every exercise in the list below is one you can put weight on.'
      : input.gearMode === 'bodyweight'
        ? 'They asked for BODYWEIGHT only today — no external load at all.'
        : ''

  // "Do more" — a bonus block bolted onto a session that just ended. The muscles
  // it hit are minutes old, so this one has to complement it, not repeat it.
  const followUpBlock = input.followUp
    ? `\nThey JUST finished a ${input.followUp.minutes}-minute session, minutes ago, and asked for MORE. It contained: ${
        input.followUp.exercises
          .filter((e) => !e.skipped && e.sets.length > 0)
          .map((e) => `${e.name} (${e.parts.join('/')})`)
          .join(', ') || 'nothing logged'
      }.
This block is an EXTENSION of that session, not a fresh one: none of those exercises may come back, and the muscles they hit are already fatigued. Complement the work they just did — different body parts, or lighter finishing work on the same ones — and keep it realistic for someone who has already been training.\n`
    : ''

  return `${briefBlock(input)}
${historyBlock(input.gym)}
${followUpBlock}
Today is ${day}. They have ${input.minutes} minutes, INCLUDING rest between sets. ${moodLine}
${gearLine}

${catalogBlock(pool, input.gym)}

Build today's session:
- The numbers in "sets" carry the exercise's own unit: reps for kind=bodyweight/weight, SECONDS OF HOLD for kind=timed (a plank is [40, 40, 30], never [12, 12]), MINUTES for kind=cardio. "typical" in the list is already in that unit — stay near it.
- On a PER-SIDE exercise the number is what they do on ONE side, and they then repeat it on the other — so it costs twice the time. Do not double the number yourself.
- Respect recovery: do not hammer a muscle group trained in the last ~48 hours (core and cardio recover faster).
- Order it well: light/ramp-in moves first, the hardest work while they are fresh, core and holds last.
- Prescribe rest from what they ACTUALLY take (theirRealRest) when it is known, not from the base value.
- Budget with THEIR measured numbers: where theirRealSetTime is given, the app has clocked them doing it — one set costs that, scaled to the reps you prescribe, plus theirRealRest between sets. Where it is missing, assume ~3.5s per rep.
- When a weight is known, prescribe it — and account for the last-time-too-light/too-heavy signal.
- Favour what they like, avoid what they dislike, and every few sessions slip in ONE exercise they have never tried.
- FILL THE TIME. One exercise (3 sets plus rest) costs roughly 5 minutes, so ${input.minutes} minutes needs about ${targetMoves(
    input.minutes,
  )} exercises. A plan that only fills half the session is wrong — they asked for ${input.minutes} minutes and want to train for ${input.minutes} minutes.
- The total (work + rest) must land between ${Math.round(input.minutes * 0.85)} and ${input.minutes} minutes. Add sets or another exercise rather than finishing early.

Answer with ONLY this JSON object, no prose and no markdown fence:
{
  "note": "<one short motivating line about today's plan, max 20 words>",
  "exercises": [
    {"id": "<exercise id from the list>", "sets": [<reps for set 1>, <set 2>, ...], "weight": <number or null>, "restSec": <seconds>, "why": "<max 12 words on why this one today>"}
  ]
}`
}

// --- reply validation -------------------------------------------------------

interface CoachRow {
  id?: string
  sets?: unknown
  weight?: unknown
  restSec?: unknown
  why?: unknown
}

function parseReply(text: string): { note?: string; exercises: CoachRow[] } {
  const obj = JSON.parse(sliceJson(text, '{', '}')) as { note?: unknown; exercises?: unknown }
  if (!Array.isArray(obj.exercises)) throw new Error('reply had no exercises array')
  return { note: typeof obj.note === 'string' ? obj.note : undefined, exercises: obj.exercises as CoachRow[] }
}

/**
 * Turn one row from the model into a real SessionExercise — or drop it. The
 * model is never trusted with an id, a rep count or a rest time; anything
 * unknown or out of range is replaced with what the offline planner would use.
 */
function materialise(row: CoachRow, pool: ExerciseDef[], gym: GymState): SessionExercise | null {
  const def = pool.find((e) => e.id === row.id)
  if (!def) return null

  const mem = gym.ex[def.id]
  const ladder = def.ladder ? gym.ladders[def.id] : undefined

  let reps: number[]
  let ladderTest = false
  if (ladder && ladderIsTest(ladder)) {
    reps = [ladder.max + 1]
    ladderTest = true
  } else if (ladder) {
    reps = ladderReps(ladder) // the ladder owns its own progression; the coach doesn't get a vote
  } else {
    const raw = Array.isArray(row.sets) ? row.sets : []
    reps = raw
      .map((r) => Math.round(Number(r)))
      .filter((r) => Number.isFinite(r) && r > 0)
      .slice(0, 6)
      .map((r) => Math.min(r, def.kind === 'cardio' ? 30 : def.kind === 'timed' ? 300 : 100))
    if (reps.length === 0) reps = Array.from({ length: def.defaultSets }, () => def.defaultReps)
  }

  const restRaw = Number(row.restSec)
  const restSec = Number.isFinite(restRaw) && restRaw > 0 ? Math.min(REST_MAX, Math.max(REST_MIN, Math.round(restRaw))) : restFor(def, mem)

  // the dumbbell has holes, not a dial: whatever the model says is snapped onto
  // a real notch, exactly like the offline planner's suggestion
  const unit = gym.brief.weightUnit ?? 'lb'
  const wRaw = Number(row.weight)
  const weight = def.kind === 'weight' && Number.isFinite(wRaw) && wRaw > 0 ? snapLoad(wRaw, unit) : weightFor(def, mem, unit)

  return {
    exId: def.id,
    name: def.name,
    emoji: def.emoji,
    kind: def.kind,
    parts: def.parts,
    intensity: def.intensity,
    how: def.how,
    plan: { reps, weight, restSec },
    sets: [],
    paceSec: learnedSetSeconds(mem, def.kind, reps[0]) ?? undefined,
    perSide: def.perSide,
    ladder: !!ladder,
    ladderTest,
    why: typeof row.why === 'string' ? row.why.slice(0, 90) : undefined,
    coins: 0,
  }
}

/**
 * The roman-chair warm-up is a setting, not a suggestion (§18e). The model is
 * told about it, but the app never depends on it having listened: if the opener
 * isn't first in the answer, it is moved there — and if it isn't in the answer
 * at all, it is built offline and pushed onto the front.
 */
function withOpener(list: SessionExercise[], input: CoachInput): SessionExercise[] {
  if (input.followUp) return list // a bonus block continues a session, it doesn't restart it
  const opener = romanChairMove(input.catalog, input.gym.brief, input.gym.ex)
  if (!opener) return list
  if (list[0]?.exId === opener.id) return list

  const already = list.find((e) => e.exId === opener.id)
  if (already) return [already, ...list.filter((e) => e !== already)]

  const built = planOne(opener, {
    catalog: input.catalog,
    gym: input.gym,
    minutes: input.minutes,
    mood: input.mood,
    gearMode: input.gearMode,
    day: input.day,
  })
  return [{ ...built, why: 'lower-back warm-up — always first' }, ...list]
}

/** ~5 minutes per exercise, sets and rest included. Used to brief the model and to sanity-check it. */
function targetMoves(minutes: number): number {
  return Math.max(2, Math.round(minutes / 5))
}

/**
 * Models under-fill: ask for 60 minutes and you get a tidy 30-minute plan. Top the
 * session up from the offline picker until it uses at least 85% of the budget, so
 * the number on the button is the session you actually get.
 */
function topUpToBudget(list: SessionExercise[], input: CoachInput, day: string): SessionExercise[] {
  const budget = input.minutes * 60
  const out = [...list]
  let spent = out.reduce((s, e) => s + exerciseSeconds(e), 0)
  let guard = 0

  while (spent < budget * 0.85 && guard++ < 12) {
    const extra = pickReplacement(
      {
        catalog: input.catalog,
        gym: input.gym,
        minutes: input.minutes,
        mood: input.mood,
        gearMode: input.gearMode,
        followUp: input.followUp,
        day,
        exclude: out.map((e) => e.exId),
      },
      out[out.length - 1],
      out,
    )
    if (!extra) break
    const cost = exerciseSeconds(extra)
    if (spent + cost > budget * 1.05) break
    // say where it came from — the coach didn't pick this one, the app did
    out.push({ ...extra, why: `added to fill your ${input.minutes} minutes` })
    spent += cost
  }
  return out
}

/** Models are optimists about time. Drop trailing exercises until the plan fits. */
function trimToBudget(list: SessionExercise[], minutes: number): SessionExercise[] {
  const budget = minutes * 60 * 1.1
  const out: SessionExercise[] = []
  let spent = 0
  for (const e of list) {
    const cost = exerciseSeconds(e)
    if (out.length >= 2 && spent + cost > budget) break
    out.push(e)
    spent += cost
  }
  return out
}

/** Kept verbatim wherever possible — a vague reason is worse than a long one. */
function shortError(e: unknown): string {
  return shortAiError(e)
}
