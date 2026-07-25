// The lesson library — deep explanations offered after a wrong training answer,
// and browsable per topic from the Academy screen.
//
// These live in code rather than in the Firestore quiz bank on purpose: they're
// long, several questions share one lesson, and the whole bank is a single
// Firestore document with a 1MB ceiling.
import type { QuizLesson } from '../../types'
import { L1_LESSONS } from './l1'
import { L2_LESSONS } from './l2'
import { L3_LESSONS } from './l3'
import { L4_LESSONS } from './l4'
import { L5_LESSONS } from './l5'
import { L6_LESSONS } from './l6'

export const LESSONS: QuizLesson[] = [
  ...L1_LESSONS,
  ...L2_LESSONS,
  ...L3_LESSONS,
  ...L4_LESSONS,
  ...L5_LESSONS,
  ...L6_LESSONS,
]

const BY_ID = new Map(LESSONS.map((l) => [l.id, l]))

export function lessonById(id: string | undefined): QuizLesson | undefined {
  return id ? BY_ID.get(id) : undefined
}

/**
 * Lessons reachable from a topic's questions, in the order the questions first
 * mention them — that's the topic's reading list for the Study screen.
 */
export function lessonsForTopic(questions: { topicId: string; lessonId?: string }[], topicId: string): QuizLesson[] {
  const seen = new Set<string>()
  const out: QuizLesson[] = []
  for (const q of questions) {
    if (q.topicId !== topicId || !q.lessonId || seen.has(q.lessonId)) continue
    seen.add(q.lessonId)
    const l = BY_ID.get(q.lessonId)
    if (l) out.push(l)
  }
  return out
}
