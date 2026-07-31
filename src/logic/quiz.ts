// Grand Line Academy — quiz rules. Keep in sync with BUSINESS_REQUIREMENTS.md §14–15.
import type { AppData, QuizQuestion, QuizState, QuizStat } from '../types'
import { dayKey, daysUntil } from './dates'

// --- topics ----------------------------------------------------------------

export interface QuizTopic {
  id: string
  owner: 'ben' | 'diogo' // whose academy this topic belongs to (KID_ID / PARENT_ID)
  title: string
  emoji: string
  description: string
  targetCount: number // how many active questions the bank should hold
  comingSoon?: boolean // registered but no questions generated yet
  /**
   * Curriculum ladder: this topic stays locked until `unlockAfter` is PASSED
   * officially. Topics without it are entry points and unlock themselves.
   */
  unlockAfter?: string
  track?: string // groups topics into a section on the Academy screen
  level?: number // position in the ladder, shown as "LEVEL n"
  /** One-line promise of what you can do once this level is conquered. */
  outcome?: string
}

/** Sections on the Academy screen, in display order. */
export const QUIZ_TRACKS: { id: string; title: string; blurb: string }[] = [
  {
    id: 'agent-path',
    title: '🛠️ The Agent Engineer Path',
    blurb: 'Six levels, vendor-neutral. Pass a level’s final test to unlock the next one.',
  },
  { id: 'tooling', title: '🧰 Tooling & day job', blurb: 'The specific tools you actually type into.' },
]

export const QUIZ_TOPICS: QuizTopic[] = [
  // --- Ben (grade 6, born Feb 2014) ---
  {
    id: 'canada-geography',
    owner: 'ben',
    title: 'Canada Geography',
    emoji: '🍁',
    description: 'Provinces, capitals, languages, flags and famous places of Canada.',
    targetCount: 50,
  },
  {
    id: 'science-6',
    owner: 'ben',
    title: 'Science',
    emoji: '🔬',
    description: 'Grade 6 science: space, electricity, flight, biodiversity.',
    targetCount: 50,
  },
  {
    id: 'critical-thinking-6',
    owner: 'ben',
    title: 'Critical Thinking',
    emoji: '🧠',
    description: 'Spot scams, fake news and tricky ads. Think like a detective.',
    targetCount: 50,
  },
  {
    id: 'logic-6',
    owner: 'ben',
    title: 'Logic',
    emoji: '🧩',
    description: 'Riddles, patterns and puzzles. No math calculations, promise.',
    targetCount: 50,
  },
  // --- Diogo: the Agent Engineer path (vendor-neutral, six levels) ---
  // Deliberately free of provider names: model APIs churn every few months, the
  // ideas underneath them don't. Every level assumes a frontend/React brain.
  {
    id: 'agents-1-foundations',
    owner: 'diogo',
    title: 'L1 · What a model actually is',
    emoji: '🧱',
    description: 'Next-token prediction, tokens, context windows, temperature, embeddings, statelessness.',
    outcome: 'You can explain, precisely, why an LLM does the weird things it does.',
    track: 'agent-path',
    level: 1,
    targetCount: 40,
  },
  {
    id: 'agents-2-prompting',
    owner: 'diogo',
    title: 'L2 · Talking to models on purpose',
    emoji: '🎯',
    description: 'System vs user roles, few-shot, chain of thought, structured JSON output, schemas, first evals.',
    outcome: 'You can get reliable, machine-parseable output instead of vibes.',
    track: 'agent-path',
    level: 2,
    unlockAfter: 'agents-1-foundations',
    targetCount: 40,
  },
  {
    id: 'agents-3-tools',
    owner: 'diogo',
    title: 'L3 · Tools & the agent loop',
    emoji: '🔧',
    description: 'Function calling, the think→act→observe loop, tool schemas, errors, parallel calls, ReAct.',
    outcome: 'You can build a real agent from scratch on any provider.',
    track: 'agent-path',
    level: 3,
    unlockAfter: 'agents-2-prompting',
    targetCount: 40,
  },
  {
    id: 'agents-4-context',
    owner: 'diogo',
    title: 'L4 · Context engineering & memory',
    emoji: '🧠',
    description: 'RAG, chunking, vector vs keyword search, reranking, compaction, context rot, agent memory.',
    outcome: 'You can feed an agent the right 5% of your data instead of all of it.',
    track: 'agent-path',
    level: 4,
    unlockAfter: 'agents-3-tools',
    targetCount: 40,
  },
  {
    id: 'agents-5-architecture',
    owner: 'diogo',
    title: 'L5 · Agent architectures',
    emoji: '🏗️',
    description: 'Workflows vs agents, routing, chaining, orchestrator–worker, evaluator loops, human-in-the-loop.',
    outcome: 'You can pick the simplest architecture that solves the problem — and defend it.',
    track: 'agent-path',
    level: 5,
    unlockAfter: 'agents-4-context',
    targetCount: 40,
  },
  {
    id: 'agents-6-production',
    owner: 'diogo',
    title: 'L6 · Shipping agents for real',
    emoji: '🚢',
    description: 'Evals, tracing, cost & latency, caching, prompt injection, sandboxing, permissions, rollout.',
    outcome: 'You can put an agent in front of real users without it becoming an incident.',
    track: 'agent-path',
    level: 6,
    unlockAfter: 'agents-5-architecture',
    targetCount: 40,
  },
  // --- Diogo: the specific tools (these DO churn — retrain as they change) ---
  {
    id: 'ai-software-dev',
    owner: 'diogo',
    title: 'AI in Software Dev',
    emoji: '🤖',
    description: 'Tokens, context, prompting, agents, orchestration, MCP — the practical craft.',
    track: 'tooling',
    targetCount: 50,
  },
  {
    id: 'copilot-ai',
    owner: 'diogo',
    title: 'GitHub Copilot',
    emoji: '🧑‍✈️',
    description: 'Chat participants, slash commands, custom instructions, agent mode, Copilot at work.',
    track: 'tooling',
    targetCount: 50,
  },
  {
    id: 'claude-code-ai',
    owner: 'diogo',
    title: 'Claude Code',
    emoji: '🟠',
    description: 'CLAUDE.md, plan mode, subagents, hooks, MCP, headless -p, token-efficient workflows.',
    track: 'tooling',
    targetCount: 50,
  },
]

export function topicById(id: string): QuizTopic | undefined {
  return QUIZ_TOPICS.find((t) => t.id === id)
}

export function topicsFor(ownerId: string): QuizTopic[] {
  return QUIZ_TOPICS.filter((t) => t.owner === ownerId)
}

// --- curriculum ladder ------------------------------------------------------

/**
 * Auto-unlocking, done idempotently.
 *
 * A topic opens itself when it's an entry point (no `unlockAfter`) or when its
 * prerequisite has been officially passed. We remember every id we've ever
 * auto-opened in `quiz.autoUnlocked` so that (a) adding a new topic to the
 * catalog opens it exactly once, and (b) a topic the admin deliberately
 * re-locks stays locked instead of springing back open on the next login.
 *
 * Returns true if anything changed (callers only save when it did).
 */
export function syncTopicUnlocks(d: AppData, ownerId: string): boolean {
  const q = d.quiz
  let changed = false
  if (!q.autoUnlocked) {
    // Migration: everything already open counts as "we've offered this before".
    q.autoUnlocked = [...q.unlockedTopics]
    changed = true
  }
  // A conquered topic locks itself and drops off the wheel — retroactively too,
  // for profiles that passed before this rule existed.
  for (const id of q.passedTopics) {
    if (!q.unlockedTopics.includes(id)) continue
    q.unlockedTopics = q.unlockedTopics.filter((x) => x !== id)
    if (!q.autoUnlocked.includes(id)) q.autoUnlocked.push(id)
    changed = true
  }
  for (const t of topicsFor(ownerId)) {
    if (t.comingSoon || q.autoUnlocked.includes(t.id)) continue
    const ready = !t.unlockAfter || q.passedTopics.includes(t.unlockAfter)
    if (!ready) continue
    q.autoUnlocked.push(t.id)
    if (!q.unlockedTopics.includes(t.id)) q.unlockedTopics.push(t.id)
    changed = true
  }
  return changed
}

/** The topic this one opens up, if any — used for the "next level unlocked!" celebration. */
export function nextLevelAfter(topicId: string): QuizTopic | undefined {
  return QUIZ_TOPICS.find((t) => t.unlockAfter === topicId)
}

/**
 * The reward for passing a final test: the next topic to open in the owner's
 * academy. The ladder wins when there is one (Diogo's levels); otherwise — Ben's
 * topics have no prerequisites, Dad just opens them one at a time — it's the
 * first topic of his still sitting locked, in catalog order.
 *
 * The fallback must never jump the ladder: passing an off-ladder topic (say
 * Claude Code) can't hand out L2 while L1 is still unconquered.
 */
export function nextTopicToUnlock(d: AppData, ownerId: string, passedTopicId: string): QuizTopic | undefined {
  const ladder = nextLevelAfter(passedTopicId)
  if (ladder) return ladder
  return topicsFor(ownerId).find(
    (t) =>
      !t.comingSoon &&
      t.id !== passedTopicId &&
      !d.quiz.unlockedTopics.includes(t.id) &&
      (!t.unlockAfter || d.quiz.passedTopics.includes(t.unlockAfter)),
  )
}

/** The prerequisite topic, for the "🔒 pass L2 first" hint on a locked card. */
export function prerequisiteOf(topic: QuizTopic): QuizTopic | undefined {
  return topic.unlockAfter ? topicById(topic.unlockAfter) : undefined
}

// --- economy ---------------------------------------------------------------

export const REPEAT_FACTOR = 0.5 // reward halves once a question has ever been answered correctly
export const PASS_PCT = 80
export const GIFT_CARD_COOLDOWN_DAYS = 30 // 1 prize per month (per profile)
export const TEST_TIME_BUDGET_MS = 13 * 60_000 // keep the whole test under ~15 min
export const TEST_MIN_QUESTIONS = 10
export const TEST_MAX_QUESTIONS = 14
export const DEFAULT_ANSWER_TIME_MS = 45_000 // assumed pace for questions he's never trained on
export const REVIEW_PASS_PCT = 70 // the warm-up round is meant to be passed
export const REVIEW_BASE_QUESTIONS = 10 // one old topic to keep fresh = 10 questions; each extra topic adds half of the previous

export interface Prize {
  id: string
  label: string
  emoji: string
  cost: number // Devil Fruits 🍇
  logo: string // /prizes/*.png — spins like the Luffy tab icon
}

/** Each profile shops from its own catalog. Duplicates accumulate as separate purchases. */
export const PRIZES: Record<string, Prize[]> = {
  ben: [
    { id: 'roblox10', label: 'Roblox $10', emoji: '🎮', cost: 3, logo: '/prizes/roblox.png' },
    { id: 'dollarama-candy', label: 'Dollarama candy', emoji: '🍬', cost: 2, logo: '/prizes/dollarama.png' },
    { id: 'costco-sushi', label: 'Costco Sushi', emoji: '🍣', cost: 6, logo: '/prizes/costco.png' },
  ],
  diogo: [{ id: 'lcbo10', label: 'LCBO $10', emoji: '🍷', cost: 3, logo: '/prizes/lcbo.png' }],
}

export function prizesFor(ownerId: string): Prize[] {
  return PRIZES[ownerId] ?? []
}

/** Berries a training answer pays right now (0 if already rewarded today). */
export function trainingReward(q: QuizQuestion, stat: QuizStat | undefined, today: string = dayKey()): number {
  if (stat?.lastRewardDay === today) return 0
  return stat?.everCorrect ? Math.ceil(q.points * REPEAT_FACTOR) : q.points
}

/** Days until the kid may buy another gift card (0 = can buy now). */
export function giftCardDaysLeft(data: AppData, today: string = dayKey()): number {
  const last = data.giftcards.reduce<string | null>((acc, p) => (acc === null || p.day > acc ? p.day : acc), null)
  if (!last) return 0
  return Math.max(0, GIFT_CARD_COOLDOWN_DAYS + daysUntil(last, today))
}

// --- answer checking -------------------------------------------------------

/** Forgiving compare for written answers: case, accents, punctuation and extra spaces don't count. */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Edit distance, capped-cheap enough for short answers. */
function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** How many typos we forgive: longer words get a little more slack. */
function typoBudget(len: number): number {
  if (len <= 3) return 0
  if (len <= 7) return 1
  return 2
}

export type WriteVerdict = 'exact' | 'close' | 'wrong'

/**
 * Grade a typed answer. "Tornto" counts as Toronto — a near miss scores the
 * full points, we just tell him the correct spelling.
 */
export function gradeWrite(q: QuizQuestion, input: string): WriteVerdict {
  const got = normalizeAnswer(input)
  if (!got) return 'wrong'
  const accepted = (q.accept ?? []).map(normalizeAnswer)
  if (accepted.some((a) => a === got)) return 'exact'
  // same first letter required: "Nome" for "Rome" is a wrong answer, not a typo
  const close = accepted.some(
    (a) => a[0] === got[0] && editDistance(a, got) <= typoBudget(Math.max(a.length, got.length)),
  )
  return close ? 'close' : 'wrong'
}

export function checkWrite(q: QuizQuestion, input: string): boolean {
  return gradeWrite(q, input) !== 'wrong'
}

/** The canonical correct answer, for feedback and review screens. */
export function correctAnswerText(q: QuizQuestion): string {
  switch (q.type) {
    case 'choice':
      return q.answer ?? ''
    case 'write':
      return q.accept?.[0] ?? ''
    case 'match':
      return (q.pairs ?? []).map((p) => `${p.left} → ${p.right}`).join(' · ')
    case 'order':
      return (q.sequence ?? []).join(' → ')
  }
}

// --- stats helpers ---------------------------------------------------------

export function activeQuestions(bank: QuizQuestion[], topicId: string): QuizQuestion[] {
  return bank.filter((q) => q.topicId === topicId && q.status === 'active')
}

/** 0..1 success estimate with a mild prior so unseen ≠ hopeless. */
export function successRate(stat: QuizStat | undefined): number {
  if (!stat || stat.seen === 0) return 0.5
  return (stat.correct + 1) / (stat.seen + 2)
}

/** True while a question added/updated by the weekly AI review hasn't been seen since — drives the "NEW" badge + training priority. */
export function isFresh(q: QuizQuestion, stat: QuizStat | undefined): boolean {
  if (!q.freshAt) return false
  return !stat?.lastSeenAt || stat.lastSeenAt < q.freshAt
}

/**
 * Spaced repetition ladder: how many days a question rests after N consecutive
 * correct answers. Get it right and it fades out; get it wrong and it's back
 * tomorrow, so training loops on the mistakes.
 */
const REST_DAYS = [2, 5, 14, 30]

function restDaysFor(streak: number): number {
  return REST_DAYS[Math.min(streak, REST_DAYS.length) - 1] ?? REST_DAYS[0]
}

/** True when training may show this question today (never answered right, or its rest is over). */
export function isDue(stat: QuizStat | undefined, today: string = dayKey()): boolean {
  if (!stat?.dueDay) return true
  return stat.dueDay <= today
}

export function updatedStat(stat: QuizStat | undefined, correct: boolean, timeMs: number): QuizStat {
  const s: QuizStat = stat ? { ...s0(stat) } : { seen: 0, correct: 0, wrong: 0, everCorrect: false, lastRewardDay: null, avgTimeMs: 0 }
  s.seen += 1
  s.lastSeenAt = new Date().toISOString() // clears any "NEW" badge for this question
  if (correct) {
    s.correct += 1
    s.everCorrect = true
    s.streak = (s.streak ?? 0) + 1
    const rest = new Date()
    rest.setDate(rest.getDate() + restDaysFor(s.streak))
    s.dueDay = dayKey(rest)
  } else {
    s.wrong += 1
    s.streak = 0
    s.dueDay = null // missed → straight back into the rotation
  }
  // rolling average, clamped so one bathroom break doesn't wreck the estimate
  const t = Math.min(Math.max(timeMs, 1000), 4 * 60_000)
  s.avgTimeMs = s.avgTimeMs === 0 ? t : Math.round(s.avgTimeMs * 0.7 + t * 0.3)
  return s
}

function s0(stat: QuizStat): QuizStat {
  // older blobs may miss fields; normalize before mutating
  return {
    seen: stat.seen ?? 0,
    correct: stat.correct ?? 0,
    wrong: stat.wrong ?? 0,
    everCorrect: stat.everCorrect ?? false,
    lastRewardDay: stat.lastRewardDay ?? null,
    avgTimeMs: stat.avgTimeMs ?? 0,
    lastSeenAt: stat.lastSeenAt,
    streak: stat.streak ?? 0,
    dueDay: stat.dueDay ?? null,
  }
}

// --- training question picker ----------------------------------------------

/** The questions training may serve today: unmastered, or past their spaced-repetition rest. */
export function duePool(pool: QuizQuestion[], stats: Record<string, QuizStat>): QuizQuestion[] {
  const today = dayKey()
  return pool.filter((q) => isDue(stats[q.id], today))
}

/**
 * Pick the next training question: unseen first-ish, then the ones he struggles
 * with, core (weight 2) material favoured. Avoids the last few shown.
 * Questions resting after a correct answer are skipped unless `ignoreRest`.
 */
export function pickTraining(
  pool: QuizQuestion[],
  stats: Record<string, QuizStat>,
  recentIds: string[],
  ignoreRest = false,
): QuizQuestion | null {
  if (pool.length === 0) return null
  const due = ignoreRest ? pool : duePool(pool, stats)
  if (due.length === 0) return null
  const recent = new Set(recentIds.slice(-6))
  let candidates = due.filter((q) => !recent.has(q.id))
  if (candidates.length === 0) candidates = due
  const weights = candidates.map((q) => {
    const stat = stats[q.id]
    const novelty = !stat || stat.seen === 0 ? 2.5 : 1
    const struggle = 1.6 - successRate(stat) // weak questions come back more often
    const fresh = isFresh(q, stat) ? 3 : 1 // weekly-review additions/updates jump the queue
    return q.weight * novelty * struggle * fresh
  })
  return weightedPick(candidates, weights)
}

// --- Question of the Day ----------------------------------------------------

/** Berries a correct Question-of-the-Day answer wins. */
export function qotdReward(q: QuizQuestion): number {
  return q.points
}

/** Berries lost for a wrong Question-of-the-Day answer — or for ignoring it all day. */
export function qotdPenalty(q: QuizQuestion): number {
  return Math.max(1, Math.ceil(q.points * 0.5))
}

/**
 * Choose the day's review question. It's drawn ONLY from questions this profile
 * has ALREADY answered correctly at least once (`everCorrect`) in an unlocked,
 * active topic — the whole point is keeping mastered material fresh (a passed
 * topic still counts; passing doesn't lock it). Older + harder questions are
 * favoured: the weight climbs with how long since it was last seen and how weak
 * the success rate is. Returns null if nothing's been mastered yet.
 */
export function pickDailyQuestion(bank: QuizQuestion[], quiz: QuizState, today: string = dayKey()): string | null {
  const candidates = bank.filter(
    (q) => q.status === 'active' && quiz.unlockedTopics.includes(q.topicId) && quiz.stats[q.id]?.everCorrect,
  )
  if (candidates.length === 0) return null
  const weights = candidates.map((q) => {
    const stat = quiz.stats[q.id]
    const struggle = Math.max(0.15, 1.7 - successRate(stat)) // weak (~1.2) beats strong (~0.7)
    const lastSeen = stat?.lastSeenAt ? stat.lastSeenAt.slice(0, 10) : today
    const age = Math.max(0, -daysUntil(lastSeen, today)) // days since last seen
    const staleness = 1 + Math.min(age, 60) / 15 // up to ×5 for questions untouched for ~2 months
    return struggle * staleness
  })
  return weightedPick(candidates, weights).id
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

// --- final test builder ----------------------------------------------------

export interface FinalTestPlan {
  questions: QuizQuestion[]
  estimatedMs: number
}

function estTime(q: QuizQuestion, stats: Record<string, QuizStat>): number {
  const s = stats[q.id]
  return s && s.avgTimeMs > 0 ? s.avgTimeMs : DEFAULT_ANSWER_TIME_MS
}

/**
 * Build an official/simulated final test:
 *  - sized by his real answering pace so the whole thing fits the time budget
 *  - ~60% questions he's strong at, ~40% weak/unseen → lands near the 80% pass
 *    line ("possible to fail, but don't fail too hard")
 *  - strong/weak interleaved so he never faces a wall of hard ones
 *  - `excludeIds` = the previous failed attempt's questions (a retry must differ)
 */
export function buildFinalTest(
  pool: QuizQuestion[],
  stats: Record<string, QuizStat>,
  excludeIds: string[] = [],
): FinalTestPlan {
  const excluded = new Set(excludeIds)
  let candidates = pool.filter((q) => !excluded.has(q.id))
  if (candidates.length < TEST_MIN_QUESTIONS) candidates = pool // small bank: allow repeats from last attempt

  const sorted = [...candidates].sort((a, b) => successRate(stats[b.id]) - successRate(stats[a.id]))
  const strong = sorted.filter((q) => successRate(stats[q.id]) >= 0.6)
  const weak = sorted.filter((q) => successRate(stats[q.id]) < 0.6)

  // decide how many questions fit the budget at his pace
  let est = 0
  const byPlan: QuizQuestion[] = []
  const takeStrong = shuffle(strong)
  const takeWeak = shuffle(weak)
  // interleave S S W S W … (~60/40), topping from whichever side still has questions
  while (byPlan.length < TEST_MAX_QUESTIONS && (takeStrong.length > 0 || takeWeak.length > 0)) {
    const wantStrong = byPlan.length % 5 !== 2 && byPlan.length % 5 !== 4 // 3 of every 5
    const next = (wantStrong ? takeStrong.shift() ?? takeWeak.shift() : takeWeak.shift() ?? takeStrong.shift())!
    const t = estTime(next, stats)
    if (byPlan.length >= TEST_MIN_QUESTIONS && est + t > TEST_TIME_BUDGET_MS) break
    byPlan.push(next)
    est += t
  }
  return { questions: byPlan, estimatedMs: est }
}

// --- warm-up review round (before every official final test) ----------------

/**
 * The already-conquered topics an official test must warm up on: every topic
 * this profile has officially passed (minus the one he's about to sit) that
 * still has questions in the bank.
 */
export function reviewTopicIds(data: AppData, ownerId: string, aboutToSit: string): string[] {
  const owned = new Set(topicsFor(ownerId).map((t) => t.id))
  return data.quiz.passedTopics.filter((id) => id !== aboutToSit && owned.has(id))
}

/**
 * How long the warm-up is: 10 questions for the first old topic, then half again
 * for each extra one (10 + 5 + 2.5 + …), rounded up. It keeps growing far more
 * slowly than the pile of conquered topics does.
 */
export function reviewSize(topicCount: number): number {
  let total = 0
  for (let i = 0; i < topicCount; i++) total += REVIEW_BASE_QUESTIONS / 2 ** i
  return Math.ceil(total)
}

/** Per-topic tally of a review round, for the "what to study" report. */
export interface ReviewTopicScore {
  topicId: string
  right: number
  total: number
}

/**
 * Build the warm-up round: `reviewSize(n)` questions split as evenly as the
 * banks allow across the conquered topics, and interleaved so he hops between
 * seas instead of grinding one.
 *
 * The pass mark is only 70% and the point is to keep old material fresh, so the
 * mix leans on things he has answered right before (~75%) with a few of his
 * weak ones mixed in to make it a real check.
 */
export function buildReviewTest(
  bank: QuizQuestion[],
  stats: Record<string, QuizStat>,
  topicIds: string[],
  excludeIds: string[] = [],
): QuizQuestion[] {
  if (topicIds.length === 0) return []
  const target = reviewSize(topicIds.length)
  const excluded = new Set(excludeIds)

  // fair share each, remainder handed out from the front
  const base = Math.floor(target / topicIds.length)
  const extra = target % topicIds.length
  const order = shuffle(topicIds)

  const perTopic = order.map((topicId, i) => {
    const want = base + (i < extra ? 1 : 0)
    let pool = activeQuestions(bank, topicId).filter((q) => !excluded.has(q.id))
    if (pool.length < want) pool = activeQuestions(bank, topicId) // small bank: allow last attempt's questions back
    const strong = shuffle(pool.filter((q) => successRate(stats[q.id]) >= 0.6))
    const weak = shuffle(pool.filter((q) => successRate(stats[q.id]) < 0.6))
    const hard = Math.min(weak.length, Math.round(want * 0.25)) // "some hard questions, but he should pass"
    const picked = [...weak.slice(0, hard), ...strong.slice(0, want - hard)]
    // one side ran dry — top up from whatever is left
    if (picked.length < want) {
      const rest = [...strong.slice(want - hard), ...weak.slice(hard)]
      picked.push(...rest.slice(0, want - picked.length))
    }
    return shuffle(picked)
  })

  // interleave: one from each topic, round after round
  const out: QuizQuestion[] = []
  for (let round = 0; out.length < target; round++) {
    const before = out.length
    for (const list of perTopic) if (list[round]) out.push(list[round])
    if (out.length === before) break // every topic exhausted
  }
  return out.slice(0, target)
}

/** Tally a finished review round per topic — the only thing a failed round reveals. */
export function reviewBreakdown(bank: QuizQuestion[], results: { qid: string; correct: boolean }[]): ReviewTopicScore[] {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const acc = new Map<string, ReviewTopicScore>()
  for (const r of results) {
    const topicId = byId.get(r.qid)?.topicId
    if (!topicId) continue
    const row = acc.get(topicId) ?? { topicId, right: 0, total: 0 }
    row.total += 1
    if (r.correct) row.right += 1
    acc.set(topicId, row)
  }
  // weakest first: that's the study order
  return [...acc.values()].sort((a, b) => a.right / a.total - b.right / b.total)
}

/**
 * Live mercy rule: with 2+ wrong in a row, serve the remaining question he's
 * strongest at next; otherwise follow the plan. Never 3 misses in a row if we
 * can help it.
 */
export function nextTestQuestion(
  remaining: QuizQuestion[],
  stats: Record<string, QuizStat>,
  lastTwoWrong: boolean,
): QuizQuestion {
  if (!lastTwoWrong || remaining.length === 1) return remaining[0]
  return [...remaining].sort((a, b) => successRate(stats[b.id]) - successRate(stats[a.id]))[0]
}

/** How many options a choice question shows on screen, however big its distractor pool is. */
export const CHOICE_OPTIONS_SHOWN = 4

/**
 * Pick the options for one showing of a choice question.
 *
 * `q.choices` is a *pool* — it may hold far more wrong answers than fit on
 * screen. We keep the correct answer, sample the rest at random and shuffle, so
 * both the position AND the set of distractors change every time. That's what
 * stops "the answer is the 3rd button" memorisation.
 */
export function pickChoiceOptions(q: QuizQuestion, shown: number = CHOICE_OPTIONS_SHOWN): string[] {
  const pool = q.choices ?? []
  const answer = q.answer
  if (!answer) return shuffle(pool).slice(0, shown)
  const distractors = shuffle(pool.filter((c) => c !== answer)).slice(0, Math.max(0, shown - 1))
  return shuffle([answer, ...distractors])
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- quiz habits on the wheel ----------------------------------------------

export const QUIZ_TASK_PREFIX = 'quiz-'

/**
 * Every unlocked topic is also a daily **must-do**: medium effort, high
 * priority, ticked off in the checklist beside the wheel (never spun for —
 * studying isn't left to luck). Locking a topic archives its habit (history
 * survives). Runs against the owner's data on login and whenever a lock is
 * toggled; older wheel-era quiz habits are promoted to must-dos on the way.
 */
export function syncQuizTasks(d: AppData, ownerId: string): void {
  for (const t of topicsFor(ownerId)) {
    const id = QUIZ_TASK_PREFIX + t.id
    const unlocked = d.quiz.unlockedTopics.includes(t.id)
    const task = d.tasks.find((x) => x.id === id)
    if (unlocked) {
      if (!task) {
        d.tasks.push({
          id,
          name: `${t.emoji} ${t.title} quiz training`,
          repeats: true,
          effort: 'medium',
          priority: 'urgent',
          dayScope: 'all',
          required: true,
          createdAt: new Date().toISOString(),
          archived: false,
          spinsSinceLastPicked: 0,
          timesPicked: 0,
        })
      } else {
        if (task.archived) task.archived = false
        // migration: quiz training used to live on the wheel
        if (!task.required) {
          task.required = true
          delete task.onWheel
        }
      }
    } else if (task && !task.archived) {
      task.archived = true
    }
  }
}

/** The most recent official attempt for a topic (drives the retry-next-day rule). */
export function lastOfficialAttempt(data: AppData, topicId: string) {
  for (let i = data.quiz.tests.length - 1; i >= 0; i--) {
    const t = data.quiz.tests[i]
    if (t.official && t.topicId === topicId && !t.review) return t
  }
  return null
}

/** The warm-up round of the previous attempt — its questions don't come back. */
export function lastReviewAttempt(data: AppData, topicId: string) {
  for (let i = data.quiz.tests.length - 1; i >= 0; i--) {
    const t = data.quiz.tests[i]
    if (t.review && t.topicId === topicId) return t
  }
  return null
}
