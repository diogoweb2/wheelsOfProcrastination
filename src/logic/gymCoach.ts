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
import type { AiConfig, ExerciseDef, GymCatalog, GymSession, GymState, Mood, SessionExercise } from '../types'
import { dayKey } from './dates'
import {
  REST_MAX,
  REST_MIN,
  daysSince,
  exerciseSeconds,
  ladderIsTest,
  ladderReps,
  partFatigue,
  pickReplacement,
  planSession,
  restFor,
  usableExercises,
  weightFor,
} from './gym'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

/** Cheap, fast and reliably good at small structured JSON — the right default for one call a day. */
export const DEFAULT_MODEL = 'google/gemini-2.5-flash'

/** Offered in Coach → Settings. Any OpenRouter model id can be typed in instead. */
export const MODEL_PRESETS: { id: string; label: string; note: string }[] = [
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini Flash Lite', note: 'cheapest — fine once your history is rich' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini Flash', note: 'the default: cheap, fast, good judgement' },
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
  const local = () => planSession({ catalog: input.catalog, gym: input.gym, minutes: input.minutes, mood: input.mood, day })

  if (!input.gym.aiOn) return { session: local(), fellBackBecause: null }
  if (!coachReady(input.ai)) return { session: local(), fellBackBecause: 'no OpenRouter key set (Coach → Settings)' }

  const pool = usableExercises(input.catalog, input.gym.brief, input.gym.ex)
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
        source: 'ai',
        model,
        note: parsed.note?.slice(0, 300),
        exercises: trimToBudget(exercises, input.minutes),
        coins: 0,
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
): Promise<SessionExercise | null> {
  const day = input.day ?? dayKey()
  const offline = () =>
    pickReplacement(
      { catalog: input.catalog, gym: input.gym, minutes: input.minutes, mood: input.mood, day, exclude: keep.map((k) => k.exId) },
      replacing,
      keep,
    )

  if (!input.gym.aiOn || !coachReady(input.ai)) return offline()

  const pool = usableExercises(input.catalog, input.gym.brief, input.gym.ex).filter(
    (e) => e.id !== replacing.exId && !keep.some((k) => k.exId === e.id),
  )
  if (pool.length === 0) return null

  try {
    const model = input.ai?.model?.trim() || DEFAULT_MODEL
    const prompt = `${briefBlock(input)}
Today's session, already agreed:
${keep.map((k, i) => `${i + 1}. ${k.name} (${k.parts.join('/')})`).join('\n') || '(nothing else yet)'}

They do NOT want to do "${replacing.name}" today${reason ? `, because: ${reason}` : ''}.
Pick ONE replacement from the list below that keeps the session balanced.

${catalogBlock(pool, input.gym)}

Answer with ONLY this JSON object, no prose and no markdown fence:
{"id": "<exercise id>", "sets": [<reps per set>], "weight": <number or null>, "restSec": <seconds>, "why": "<max 12 words>"}`

    const reply = await ask(input.ai!.openrouterKey!.trim(), model, prompt)
    const obj = JSON.parse(sliceJson(reply, '{', '}')) as CoachRow
    return materialise(obj, pool, input.gym) ?? offline()
  } catch {
    return offline()
  }
}

// --- request ----------------------------------------------------------------

async function ask(key: string, model: string, prompt: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30_000)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': location.origin,
        'X-Title': 'Wheels of Procrastination Gym',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'You are a careful, encouraging personal trainer. You only ever prescribe exercises from the list you are given, you respect stated injuries absolutely, and you answer with raw JSON and nothing else.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 160)}`)
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const text = json.choices?.[0]?.message?.content
    if (!text) throw new Error('empty reply')
    return text
  } finally {
    clearTimeout(timer)
  }
}

// --- prompt -----------------------------------------------------------------

function briefBlock(input: CoachInput): string {
  const b = input.gym.brief
  const rules = [
    b.avoidBackLoad && 'HARD RULE: nothing that loads the lower back or spine heavily.',
    b.kidMode && 'HARD RULE: this is a child — bodyweight first, nothing heavy, keep it fun and short.',
    b.noWarmup && 'They refuse to do a warm-up block. Make the first one or two moves light or bodyweight so the warm-up happens naturally.',
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
    if (m?.rating) bits.push(`FEELS=${m.rating}`)
    if (m?.timesDone) bits.push(`done=${m.timesDone}x`)
    if (m?.lastDay) bits.push(`lastDone=${daysSince(m.lastDay)}d ago`)
    if (m?.suggestedWeight) bits.push(`weight=${m.suggestedWeight}`)
    if (m?.lastAdjust && m.lastAdjust !== 'same') bits.push(`lastTimeTooLight/Heavy=${m.lastAdjust === 'up' ? 'too light' : 'too heavy'}`)
    if (m?.restLearned) bits.push(`theirRealRest=${m.restLearned}s`)
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

  return `${briefBlock(input)}
${historyBlock(input.gym)}

Today is ${day}. They have ${input.minutes} minutes, INCLUDING rest between sets. ${moodLine}

${catalogBlock(pool, input.gym)}

Build today's session:
- Respect recovery: do not hammer a muscle group trained in the last ~48 hours (core and cardio recover faster).
- Order it well: light/ramp-in moves first, the hardest work while they are fresh, core and holds last.
- Prescribe rest from what they ACTUALLY take (theirRealRest) when it is known, not from the base value.
- When a weight is known, prescribe it — and account for the last-time-too-light/too-heavy signal.
- Favour what they like, avoid what they dislike, and every few sessions slip in ONE exercise they have never tried.
- The total time (work + rest) must fit ${input.minutes} minutes. Fewer, better exercises beat a rushed list.

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

function sliceJson(text: string, open: string, close: string): string {
  const a = text.indexOf(open)
  const b = text.lastIndexOf(close)
  if (a === -1 || b === -1 || b < a) throw new Error('no JSON in the reply')
  return text.slice(a, b + 1)
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

  const wRaw = Number(row.weight)
  const weight = def.kind === 'weight' && Number.isFinite(wRaw) && wRaw > 0 ? Math.round(wRaw * 2) / 2 : weightFor(def, mem)

  return {
    exId: def.id,
    name: def.name,
    emoji: def.emoji,
    kind: def.kind,
    parts: def.parts,
    how: def.how,
    plan: { reps, weight, restSec },
    sets: [],
    ladder: !!ladder,
    ladderTest,
    why: typeof row.why === 'string' ? row.why.slice(0, 90) : undefined,
    coins: 0,
  }
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

function shortError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('abort')) return 'the coach took too long'
  return msg.slice(0, 120)
}
