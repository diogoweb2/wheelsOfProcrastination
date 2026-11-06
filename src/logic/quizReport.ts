// §14e — the arithmetic behind Quiz Watch. Pure: sittings and stats in, rows out.
import { WARMUP_TOPIC_ID, topicById } from './quiz'
import type { QuizLogKind, QuizQuestion, QuizSessionLog, QuizStat } from '../types'

/**
 * How long a sitting with no `endedAt` still counts as running. A killed app
 * never says goodbye, so silence has to end it — and long enough that a child
 * stuck on one hard question is not reported as gone.
 */
export const LIVE_WINDOW_MS = 10 * 60_000

export function isLive(s: QuizSessionLog, now: number): boolean {
  return !s.endedAt && now - Date.parse(s.updatedAt) < LIVE_WINDOW_MS
}

export const KIND_LABEL: Record<QuizLogKind, string> = {
  training: 'Training',
  simulation: 'Mock test',
  official: 'Final test',
  warmup: 'Mock warm-up',
  review: 'Warm-up round',
}

export function sessionTitle(s: QuizSessionLog): string {
  if (s.topicId === WARMUP_TOPIC_ID) return 'Every conquered sea'
  const t = topicById(s.topicId)
  const title = t ? `${t.emoji} ${t.title}` : s.topicId
  return s.kind === 'review' ? `Before ${title}` : title
}

export function sessionTally(s: QuizSessionLog): { right: number; wrong: number; pct: number } {
  const right = s.answers.filter((a) => a.correct).length
  const wrong = s.answers.length - right
  return { right, wrong, pct: s.answers.length === 0 ? 0 : Math.round((right / s.answers.length) * 100) }
}

export interface MissRow {
  q: QuizQuestion
  tries: number
  wrong: number
  pct: number // share of tries he got wrong
}

export interface QuizMissRow {
  topicId: string
  tries: number
  wrong: number
  pct: number
  questions: number // questions he has actually been asked
}

const pctOf = (wrong: number, tries: number) => (tries === 0 ? 0 : Math.round((wrong / tries) * 100))

/** Worst first; between equal percentages, the one missed more often is the surer problem. */
const worstFirst = (a: { pct: number; wrong: number }, b: { pct: number; wrong: number }) => b.pct - a.pct || b.wrong - a.wrong

/**
 * Every live question he has been asked, from his lifetime stats — so this
 * covers all he has ever answered, not just what has been logged since §14e.
 */
export function missRows(bank: QuizQuestion[], stats: Record<string, QuizStat>): MissRow[] {
  const rows: MissRow[] = []
  for (const q of bank) {
    if (q.status !== 'active') continue
    const s = stats[q.id]
    if (!s) continue
    const wrong = s.wrong ?? 0
    const tries = (s.correct ?? 0) + wrong
    if (tries > 0) rows.push({ q, tries, wrong, pct: pctOf(wrong, tries) })
  }
  return rows.sort(worstFirst)
}

export function quizMissRows(rows: MissRow[]): QuizMissRow[] {
  const byTopic = new Map<string, QuizMissRow>()
  for (const r of rows) {
    const t = byTopic.get(r.q.topicId) ?? { topicId: r.q.topicId, tries: 0, wrong: 0, pct: 0, questions: 0 }
    t.tries += r.tries
    t.wrong += r.wrong
    t.questions += 1
    t.pct = pctOf(t.wrong, t.tries)
    byTopic.set(r.q.topicId, t)
  }
  return [...byTopic.values()].sort(worstFirst)
}

export function overallMiss(rows: MissRow[]): { tries: number; wrong: number; pct: number } {
  const tries = rows.reduce((n, r) => n + r.tries, 0)
  const wrong = rows.reduce((n, r) => n + r.wrong, 0)
  return { tries, wrong, pct: pctOf(wrong, tries) }
}
