// Grand Line Academy — quiz rules. Keep in sync with BUSINESS_REQUIREMENTS.md §14–15.
import type { AppData, QuizQuestion, QuizStat } from '../types'
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
}

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
    comingSoon: true,
  },
  {
    id: 'critical-thinking-6',
    owner: 'ben',
    title: 'Critical Thinking',
    emoji: '🧠',
    description: 'Spot scams, fake news and tricky ads. Think like a detective.',
    targetCount: 50,
    comingSoon: true,
  },
  {
    id: 'logic-6',
    owner: 'ben',
    title: 'Logic',
    emoji: '🧩',
    description: 'Riddles, patterns and puzzles. No math calculations, promise.',
    targetCount: 50,
    comingSoon: true,
  },
  // --- Diogo (senior frontend dev going deep on AI-assisted development) ---
  {
    id: 'ai-software-dev',
    owner: 'diogo',
    title: 'AI in Software Dev',
    emoji: '🤖',
    description: 'Tokens, context, prompting, agents, orchestration, MCP — the practical craft.',
    targetCount: 50,
  },
  {
    id: 'copilot-ai',
    owner: 'diogo',
    title: 'GitHub Copilot',
    emoji: '🧑‍✈️',
    description: 'Chat participants, slash commands, custom instructions, agent mode, Copilot at work.',
    targetCount: 50,
  },
  {
    id: 'claude-code-ai',
    owner: 'diogo',
    title: 'Claude Code',
    emoji: '🟠',
    description: 'CLAUDE.md, plan mode, subagents, hooks, MCP, headless -p, token-efficient workflows.',
    targetCount: 50,
  },
]

export function topicById(id: string): QuizTopic | undefined {
  return QUIZ_TOPICS.find((t) => t.id === id)
}

export function topicsFor(ownerId: string): QuizTopic[] {
  return QUIZ_TOPICS.filter((t) => t.owner === ownerId)
}

// --- economy ---------------------------------------------------------------

export const REPEAT_FACTOR = 0.5 // reward halves once a question has ever been answered correctly
export const PASS_PCT = 80
export const GIFT_CARD_COOLDOWN_DAYS = 30 // 1 prize per month (per profile)
export const TEST_TIME_BUDGET_MS = 13 * 60_000 // keep the whole test under ~15 min
export const TEST_MIN_QUESTIONS = 10
export const TEST_MAX_QUESTIONS = 14
export const DEFAULT_ANSWER_TIME_MS = 45_000 // assumed pace for questions he's never trained on

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

export function checkWrite(q: QuizQuestion, input: string): boolean {
  const got = normalizeAnswer(input)
  return got.length > 0 && (q.accept ?? []).some((a) => normalizeAnswer(a) === got)
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

export function updatedStat(stat: QuizStat | undefined, correct: boolean, timeMs: number): QuizStat {
  const s: QuizStat = stat ? { ...s0(stat) } : { seen: 0, correct: 0, wrong: 0, everCorrect: false, lastRewardDay: null, avgTimeMs: 0 }
  s.seen += 1
  s.lastSeenAt = new Date().toISOString() // clears any "NEW" badge for this question
  if (correct) {
    s.correct += 1
    s.everCorrect = true
  } else {
    s.wrong += 1
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
  }
}

// --- training question picker ----------------------------------------------

/**
 * Pick the next training question: unseen first-ish, then the ones he struggles
 * with, core (weight 2) material favoured. Avoids the last few shown.
 */
export function pickTraining(
  pool: QuizQuestion[],
  stats: Record<string, QuizStat>,
  recentIds: string[],
): QuizQuestion | null {
  if (pool.length === 0) return null
  const recent = new Set(recentIds.slice(-6))
  let candidates = pool.filter((q) => !recent.has(q.id))
  if (candidates.length === 0) candidates = pool
  const weights = candidates.map((q) => {
    const stat = stats[q.id]
    const novelty = !stat || stat.seen === 0 ? 2.5 : 1
    const struggle = 1.6 - successRate(stat) // weak questions come back more often
    const fresh = isFresh(q, stat) ? 3 : 1 // weekly-review additions/updates jump the queue
    return q.weight * novelty * struggle * fresh
  })
  return weightedPick(candidates, weights)
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
 * Every unlocked topic is also a daily habit on the owner's wheel: medium
 * effort, high priority. Locking a topic archives its habit (history survives).
 * Runs against the owner's data on login and whenever a lock is toggled.
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
          createdAt: new Date().toISOString(),
          archived: false,
          spinsSinceLastPicked: 0,
          timesPicked: 0,
        })
      } else if (task.archived) {
        task.archived = false
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
    if (t.official && t.topicId === topicId) return t
  }
  return null
}
