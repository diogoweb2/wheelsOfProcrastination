// 🧱 Training blocks — the fixed rotation that replaced "build me something".
//
// See BUSINESS_REQUIREMENTS.md §18m. The short version:
//
//   Session 1 → 2 → 3 → 4 → 5 → 6 → back to 1, for eight to twelve weeks.
//
// You never ask "what should I do today?", you ask "what's next?". Nothing here
// looks at the day of the week, because the number of sessions in a week is
// unpredictable (2 to 5) and every calendar programme breaks on that. Train
// twice this week and you do S1 and S2; the next week picks up at S3.
//
// Two things this buys that the old planner structurally could not:
//   • PROGRESSION. The same exercise comes back under the same conditions, so
//     "last time you did 3 × 10 at 30 lb" is a fact you can act on.
//   • A REP RANGE instead of a number. 8–12 means: the low end is what has to
//     be there for the set to count, the high end is what you chase, and
//     reaching the top on every set is the signal to add load.
//
// The block is per profile (it lives in `AppData.gym`), not in the shared
// catalog — the catalog is the basement, this is one person's programme.
import type {
  BlockExercise,
  BlockSession,
  ExerciseDef,
  GymCatalog,
  GymSession,
  GymState,
  Mood,
  SessionExercise,
  TrainingBlock,
} from '../types'
import { dayKey } from './dates'
import { allExercises, exerciseById, exerciseSeconds, holdFor, planOne, sessionSeconds } from './gym'

// --- block 1 ----------------------------------------------------------------
//
// Six sessions, each about 30 minutes. Written for Diogo: 43, pickleball is the
// sport, lower back and core are the priority, and the basement is the catalog
// in scripts/data/gym-catalog.json. Exercise ids come straight from it — a slot
// pointing at an exercise that no longer exists is shown as a gap rather than
// silently dropped, so a bad edit is visible instead of quiet.

const ex = (exId: string, sets: number, repLow: number, repHigh: number, extra?: Partial<BlockExercise>): BlockExercise => ({
  exId,
  sets,
  repLow,
  repHigh,
  ...extra,
})

/**
 * Bumped when the code's copy of block 1 changes. A seeded block nobody has
 * trained against yet is replaced on the next login; one with sessions logged
 * against it is left alone forever — that is your training history's programme,
 * not ours to rewrite.
 */
export const SEED_VERSION = 3

/**
 * Four full rotations before the app suggests a new block, seven before it
 * pushes. Counted in finished sessions (see `TrainingBlock`), so a fortnight off
 * costs the block nothing and a heavy month gets you there sooner.
 */
const REVIEW_SESSIONS = 24
const RETIRE_SESSIONS = 42

const BLOCK_1_SESSIONS: BlockSession[] = [
  {
    id: 's1',
    name: 'Lower strength + core',
    emoji: '🦵',
    exercises: [
      ex('mv-dumbbell-bulgarian-split-squat', 3, 8, 12),
      ex('mv-bench-hip-thrust', 3, 10, 15),
      ex('bw-side-plank', 2, 30, 45),
      ex('bw-calf-raise', 3, 15, 20),
      ex('mv-back-extension', 2, 10, 15, {
        note: 'Finisher, not a lift. Stop level with the body — never arch past straight.',
      }),
    ],
  },
  {
    id: 's2',
    name: 'Upper push + pull',
    emoji: '🫸',
    exercises: [
      ex('mv-dumbbell-bench-press', 3, 8, 12),
      ex('mv-chest-supported-dumbbell-row', 3, 8, 12),
      ex('bw-pullup', 3, 4, 8, { note: 'Chin-ups instead are fine — same slot, easier line of pull.' }),
      ex('mv-dips', 3, 6, 10, { note: 'Stop at parallel. Deeper than that is the shoulder paying for the rep.' }),
      ex('mv-dumbbell-lateral-raise', 2, 15, 20),
      ex('mv-chest-supported-dumbbell-reverse-fly', 2, 15, 20),
    ],
  },
  {
    id: 's3',
    name: 'Pickleball power + stability',
    emoji: '⚡',
    exercises: [
      ex('mv-split-squat-jump', 3, 5, 8, { quality: true, note: 'Stop the set the moment height or landing quality drops.' }),
      ex('mv-lateral-shuffle', 4, 15, 20, { quality: true, note: 'Short, sharp efforts. This is not a cardio circuit.' }),
      ex('mv-kettlebell-swing', 3, 8, 12, {
        quality: true,
        note: 'Explosive, not a rep count. Full rest between sets, and stop the moment the hinge gets sloppy.',
      }),
      ex('mv-copenhagen-plank', 2, 20, 30),
      ex('mv-band-pallof-press', 3, 8, 12),
    ],
  },
  {
    id: 's4',
    name: 'Lower unilateral + posterior chain',
    emoji: '🦿',
    exercises: [
      ex('mv-dumbbell-reverse-lunge', 3, 8, 12),
      ex('mv-goblet-squat', 3, 10, 15),
      ex('mv-single-leg-glute-bridge', 3, 10, 15),
      ex('mv-band-leg-curl', 3, 12, 20),
      ex('mv-single-leg-calf-raise', 3, 15, 20),
    ],
  },
  {
    id: 's5',
    name: 'Upper pull + shoulder health',
    emoji: '🧗',
    exercises: [
      ex('bw-pullup', 3, 4, 8, { note: 'Chin-ups instead are fine — same slot.' }),
      ex('mv-one-arm-dumbbell-row', 3, 8, 12),
      ex('mv-seated-dumbbell-shoulder-press', 3, 8, 12),
      ex('mv-band-external-rotation', 2, 12, 20),
      ex('mv-dumbbell-reverse-wrist-curl', 2, 15, 20),
      ex('mv-dumbbell-wrist-curl', 2, 15, 20),
    ],
  },
  {
    id: 's6',
    name: 'Full body + pickleball',
    emoji: '🏓',
    exercises: [
      ex('mv-dumbbell-step-up', 3, 8, 12),
      ex('mv-incline-dumbbell-bench-press', 3, 8, 12),
      ex('mv-chin-up', 3, 5, 10),
      ex('mv-band-rotational-press', 3, 8, 12),
      ex('mv-farmer-s-walk', 3, 30, 45),
      ex('mv-medicine-ball-chest-pass', 3, 4, 6, { quality: true, note: 'Explosive throws. Reset between reps.' }),
    ],
  },
]

// --- moves that left the basement -------------------------------------------

/**
 * Exercises DELETED from the catalog, and the slot that replaced them in the
 * code's copy of block 1.
 *
 * A block you have trained against is never rewritten (see the login seeding in
 * the store) — that is your training history's programme. But a slot pointing at
 * a move that no longer exists is not history, it is a hole: the Train card
 * shows "❓", the runner skips it, and the session is quietly one exercise
 * shorter every single round. So exactly these swaps are applied to any stored
 * block, seeded or edited, and nothing else about it is touched.
 *
 * Both of these went when the loop bands turned out to have nothing to anchor
 * to down there (755fb42). The replacement carries its own sets and reps — a
 * chin-up is not asked for ten to fifteen times just because a pulldown was.
 */
const RETIRED_MOVES: Record<string, BlockExercise> = {
  'mv-band-face-pull': ex('mv-chest-supported-dumbbell-reverse-fly', 2, 15, 20),
  'mv-band-lat-pulldown': ex('mv-chin-up', 3, 5, 10),
}

/**
 * Swap every dead slot in a block for the move that replaced it. Returns the
 * repaired copy, or `null` when there was nothing to fix — the caller only
 * writes to Firestore when something actually changed.
 *
 * A dead slot with no known replacement is left exactly as it is: that is the
 * visible gap the Plan tab warns about, and guessing a substitute is worse.
 */
export function repairBlock(block: TrainingBlock, catalog: GymCatalog | null): TrainingBlock | null {
  if (!catalog) return null // basement not loaded yet — nothing is "missing" until it is
  const live = new Set(allExercises(catalog).filter((e) => !e.retired).map((e) => e.id))
  let changed = false
  const sessions = block.sessions.map((s) => ({
    ...s,
    exercises: s.exercises.map((slot) => {
      if (live.has(slot.exId)) return slot
      const swap = RETIRED_MOVES[slot.exId]
      if (!swap || !live.has(swap.exId)) return slot
      changed = true
      return { ...swap }
    }),
  }))
  return changed ? { ...block, sessions } : null
}

/** The block a profile starts on. Only Diogo has one written; anyone else trains free. */
export function seedBlock(profileId: string | null, now: Date = new Date()): TrainingBlock | null {
  if (profileId !== 'diogo') return null
  return {
    id: 'block-1',
    name: 'Block 1',
    source: 'seed',
    seedVersion: SEED_VERSION,
    goal: 'Strength and pickleball durability — lower back and core first.',
    startedAt: now.toISOString(),
    reviewSessions: REVIEW_SESSIONS,
    retireSessions: RETIRE_SESSIONS,
    sessions: BLOCK_1_SESSIONS.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e })) })),
  }
}

/** "Block 1" → "Block 2". Anything else just gains a "(again)". */
export function nextBlockName(name: string): string {
  const m = /^(.*?)(\d+)\s*$/.exec(name)
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${name} (again)`
}

// --- the library, and where you are in it ------------------------------------

/** The block the Train tab is walking through, if any. */
export function activeBlock(gym: GymState): TrainingBlock | null {
  if (!gym.activeBlockId) return null
  return gym.blocks.find((b) => b.id === gym.activeBlockId) ?? null
}

/** The index of the session you do next, wrapped into range whatever the stored value is. */
export function blockPos(gym: GymState): number {
  const n = activeBlock(gym)?.sessions.length ?? 0
  if (n === 0) return 0
  return ((gym.blockPos % n) + n) % n
}

/** The session you do next. */
export function nextBlockSession(gym: GymState): BlockSession | null {
  return activeBlock(gym)?.sessions[blockPos(gym)] ?? null
}

/** A fresh id for a block, session or slot — short, readable in the JSON, unique enough. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}

/** An empty block to start editing from. */
export function emptyBlock(name = 'New block'): TrainingBlock {
  return {
    id: newId('block'),
    name,
    source: 'manual',
    startedAt: new Date().toISOString(),
    reviewSessions: REVIEW_SESSIONS,
    retireSessions: RETIRE_SESSIONS,
    sessions: [],
  }
}

/** A deep copy under a new id — "carry on with these", or "block 2 starts from block 1". */
export function copyBlock(block: TrainingBlock, name?: string): TrainingBlock {
  return {
    ...block,
    id: newId('block'),
    seedVersion: undefined,
    name: name ?? nextBlockName(block.name),
    source: 'manual',
    startedAt: new Date().toISOString(),
    sessions: block.sessions.map((s) => ({ ...s, id: newId('s'), exercises: s.exercises.map((e) => ({ ...e })) })),
  }
}

/** An empty session to start editing from. */
export function emptySession(name = 'New session'): BlockSession {
  return { id: newId('s'), name, emoji: '💪', exercises: [] }
}

/** The one after a given position — what the "then" line on the card shows. */
export function sessionAfter(block: TrainingBlock, pos: number): BlockSession | null {
  if (block.sessions.length === 0) return null
  return block.sessions[(pos + 1) % block.sessions.length]
}

// --- age and the "time for a new block" warning ------------------------------

export type BlockAge = 'fresh' | 'due' | 'overdue'

/** Whole weeks since the block started. */
export function blockWeeks(block: TrainingBlock, now: Date = new Date()): number {
  const ms = now.getTime() - Date.parse(block.startedAt)
  return Math.max(0, Math.floor(ms / (7 * 86_400_000)))
}

/**
 * How worn out a block is, measured in **sessions you actually finished**, not
 * weeks owned.
 *
 * This used to run on the calendar and that was wrong: at two sessions a week,
 * "eight weeks" is sixteen sessions — barely three trips round a six-session
 * rotation, and nowhere near enough exposure to have finished progressing on
 * anything. The calendar measures how long the programme has been sitting
 * there; the counter measures how much of it you have done. A fortnight off now
 * costs the block nothing.
 *
 * It is a SUGGESTION either way. A block still progressing well is worth
 * keeping past `retireSessions`, and "🔄 carry on with these" is a real answer.
 */
export function blockAge(block: TrainingBlock, done: number): BlockAge {
  if (done >= block.retireSessions) return 'overdue'
  if (done >= block.reviewSessions) return 'due'
  return 'fresh'
}

/** How many of this block's sessions you have actually finished. */
export function blockSessionsDone(gym: GymState, block: TrainingBlock | null = activeBlock(gym)): number {
  const id = block?.id
  if (!id) return 0
  return gym.sessions.filter((s) => s.blockId === id).length
}

// --- turning a block session into a workout ---------------------------------

/**
 * The three honest answers to "how long have you got?". A block session is
 * written for 30; the other two are the same session run short or run properly,
 * never a different session. See `fitToLength`.
 */
export const SESSION_LENGTHS = [20, 30, 40] as const
export type SessionLength = (typeof SESSION_LENGTHS)[number]

export interface BlockPlanInput {
  catalog: GymCatalog | null
  gym: GymState
  mood: Mood
  day?: string
  /** Which session of the rotation. Defaults to wherever the cursor is. */
  pos?: number
  /** 20 · 30 · 40 minutes. Default 30, which is what the sessions are written for. */
  length?: SessionLength
}

/**
 * Make a session fit the time you have — WITHOUT changing what it is.
 *
 * The order of a block session is deliberate: main strength movement, second
 * major movement, the goal-specific one, then accessories and core. So:
 *
 *   20 min — drop from the BACK. The accessories go first, the main lift never.
 *            A short session is a whole session minus its tail, not five
 *            exercises squeezed into fewer sets each.
 *   30 min — as written.
 *   40 min — a set onto each of the first two movements. NOT more exercises:
 *            extra time buys more work on what already matters (and longer
 *            rests, which the runner lets you take anyway). This matters most
 *            on the power sessions, where more exercises would be actively
 *            wrong.
 */
export function fitToLength(list: SessionExercise[], length: SessionLength): SessionExercise[] {
  if (length === 30 || list.length === 0) return list

  if (length === 40) {
    return list.map((e, i) =>
      i < 2 && !e.quality // a power slot's volume is capped by quality, not by minutes
        ? { ...e, plan: { ...e.plan, reps: [...e.plan.reps, e.plan.reps[e.plan.reps.length - 1]] } }
        : e,
    )
  }

  // 20: pop the tail until it fits, never below three movements
  const out = [...list]
  const budget = 20 * 60 * 1.06
  while (out.length > 3 && out.reduce((n, e) => n + exerciseSeconds(e), 0) > budget) out.pop()
  return out
}

/**
 * Build the workout for one session of the block.
 *
 * Everything personal — the weight to put in front of you, the rest you
 * actually take, how long a set of this takes YOU — still comes from the same
 * per-exercise memory the old planner used (`planOne`). What the block decides
 * is only WHICH exercises, in WHAT ORDER, for how many sets and reps. That
 * split is the point: the programme is fixed, the loading is learned.
 *
 * No warm-up de-load here. The free planner runs its first two moves light
 * because it can't know what it just picked; a block session's first exercise
 * is the main lift of the day and gets its working weight, with the first set
 * as the ramp-in.
 */
export function planBlockSession(input: BlockPlanInput): GymSession | null {
  const { gym, catalog, mood } = input
  const block = activeBlock(gym)
  if (!block || block.sessions.length === 0) return null
  const pos = input.pos ?? blockPos(gym)
  const template = block.sessions[((pos % block.sessions.length) + block.sessions.length) % block.sessions.length]
  if (!template) return null

  const day = input.day ?? dayKey()
  const planInput = { catalog, gym, minutes: 30, mood, gearMode: 'mixed' as const, day }

  const built: SessionExercise[] = []
  for (const slot of template.exercises) {
    const def = exerciseById(catalog, slot.exId)
    if (!def || def.retired) continue // shown as a gap on the Plan tab, never silently substituted
    // index 2 = "no ramp-in de-load"; see the note above
    const one = planOne(def, planInput, 2)
    // A hold progresses in seconds the way a lift progresses in pounds: hold the
    // top of the range on every set and the whole range slides up, keeping its
    // width, and stays there. Written slots are the floor, never the ceiling —
    // the block says what the movement is, your own history says how long.
    const [low, high] = holdRange(slot, def, gym)
    built.push({
      ...one,
      plan: { ...one.plan, reps: Array.from({ length: slot.sets }, () => low) },
      repRange: [low, high],
      quality: slot.quality,
      why: slot.note,
    })
  }

  const length = input.length ?? 30
  const exercises = fitToLength(built, length)
  const trimmed = built.length - exercises.length
  const minutes = Math.max(5, Math.round(sessionSeconds({ exercises } as GymSession) / 60))
  return {
    id: crypto.randomUUID(),
    day,
    status: 'preview',
    minutes,
    mood,
    gearMode: 'mixed',
    source: 'local',
    note: `${template.name}. ${trimmed > 0 ? `Short on time — the last ${trimmed === 1 ? 'exercise is' : `${trimmed} exercises are`} off, the main work is not.` : sessionNote(exercises.length, template)}`,
    exercises,
    coins: 0,
    blockId: block.id,
    blockSessionId: template.id,
    blockSessionName: template.name,
  }
}

/** The slot's range, moved up by whatever you have already proved on a hold. */
function holdRange(slot: BlockExercise, def: ExerciseDef, gym: GymState): [number, number] {
  if (def.kind !== 'timed' && def.kind !== 'cardio') return [slot.repLow, slot.repHigh]
  const learned = holdFor({ kind: def.kind, defaultReps: 0 }, gym.ex[def.id])
  const low = Math.max(slot.repLow, learned)
  return [low, low + (slot.repHigh - slot.repLow)]
}

function sessionNote(count: number, template: BlockSession): string {
  if (count === 0) return 'Nothing in this session is in the catalog any more — check Plan.'
  if (template.exercises.some((e) => e.quality)) return 'Quality first: the fast work stops when the speed goes, not when the count says so.'
  return 'Same session as last time round — beat the top of a rep range and the weight goes up.'
}

/** Which slots of a session point at an exercise that is no longer in the catalog. */
export function missingSlots(block: TrainingBlock, catalog: GymCatalog | null): { session: BlockSession; slot: BlockExercise }[] {
  const known = new Set(allExercises(catalog).filter((e) => !e.retired).map((e) => e.id))
  return block.sessions.flatMap((session) =>
    session.exercises.filter((slot) => !known.has(slot.exId)).map((slot) => ({ session, slot })),
  )
}

/** "3 × 8–12", "2 × 30–45s" — the ask, before any of your own numbers are known. */
export function slotLine(slot: BlockExercise, catalog: GymCatalog | null): string {
  const def = exerciseById(catalog, slot.exId)
  const unit = def?.kind === 'timed' ? 's' : def?.kind === 'cardio' ? ' min' : ''
  const range = slot.repLow === slot.repHigh ? `${slot.repLow}${unit}` : `${slot.repLow}–${slot.repHigh}${unit}`
  return `${slot.sets} × ${range}${def?.perSide ? ' /side' : ''}`
}
