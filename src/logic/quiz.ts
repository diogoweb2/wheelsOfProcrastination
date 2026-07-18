// Grand Line Academy — quiz rules. Keep in sync with BUSINESS_REQUIREMENTS.md §14–15.
import type { AppData, QuizQuestion, QuizStat } from '../types'
import { dayKey, daysUntil } from './dates'

// --- topics ----------------------------------------------------------------

export interface QuizTopic {
  id: string
  title: string
  emoji: string
  description: string
  targetCount: number // how many active questions the bank should hold
  comingSoon?: boolean // registered but no questions generated yet
}

export const QUIZ_TOPICS: QuizTopic[] = [
  {
    id: 'canada-geography',
    title: 'Canada Geography',
    emoji: '🍁',
    description: 'Provinces, capitals, languages, flags and famous places of Canada.',
    targetCount: 50,
  },
  {
    id: 'science-6',
    title: 'Science',
    emoji: '🔬',
    description: 'Grade 6 science: space, electricity, flight, biodiversity.',
    targetCount: 50,
    comingSoon: true,
  },
  {
    id: 'critical-thinking-6',
    title: 'Critical Thinking',
    emoji: '🧠',
    description: 'Spot scams, fake news and tricky ads. Think like a detective.',
    targetCount: 50,
    comingSoon: true,
  },
  {
    id: 'logic-6',
    title: 'Logic',
    emoji: '🧩',
    description: 'Riddles, patterns and puzzles. No math calculations, promise.',
    targetCount: 50,
    comingSoon: true,
  },
]

export function topicById(id: string): QuizTopic | undefined {
  return QUIZ_TOPICS.find((t) => t.id === id)
}

// --- economy ---------------------------------------------------------------

export const REPEAT_FACTOR = 0.5 // reward halves once a question has ever been answered correctly
export const PASS_PCT = 80
export const GIFT_CARD_COST = 3 // Devil Fruits 🍇
export const GIFT_CARD_COOLDOWN_DAYS = 30 // 1 gift card per month
export const TEST_TIME_BUDGET_MS = 13 * 60_000 // keep the whole test under ~15 min
export const TEST_MIN_QUESTIONS = 10
export const TEST_MAX_QUESTIONS = 14
export const DEFAULT_ANSWER_TIME_MS = 45_000 // assumed pace for questions he's never trained on

export const GIFT_CARDS = [
  { id: 'roblox10', label: 'Roblox $10', emoji: '🎮' },
  { id: 'aliexpress10', label: 'AliExpress $10', emoji: '📦' },
  { id: 'amazon10', label: 'Amazon $10', emoji: '🛒' },
] as const

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

export function updatedStat(stat: QuizStat | undefined, correct: boolean, timeMs: number): QuizStat {
  const s: QuizStat = stat ? { ...s0(stat) } : { seen: 0, correct: 0, wrong: 0, everCorrect: false, lastRewardDay: null, avgTimeMs: 0 }
  s.seen += 1
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
    return q.weight * novelty * struggle
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

/** The most recent official attempt for a topic (drives the retry-next-day rule). */
export function lastOfficialAttempt(data: AppData, topicId: string) {
  for (let i = data.quiz.tests.length - 1; i >= 0; i--) {
    const t = data.quiz.tests[i]
    if (t.official && t.topicId === topicId) return t
  }
  return null
}
