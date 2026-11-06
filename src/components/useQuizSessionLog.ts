// §14e — writes one sitting of Ben's to `quizSessions/{id}` as it happens. A
// sitting starts at its first question, so opening a quiz and backing straight
// out leaves nothing behind. An official run is two sittings: the warm-up round
// closes when it is graded, and the final test opens a fresh one.
import { useEffect, useRef } from 'react'
import { deleteQuizSession, saveQuizSession } from '../store/cloud'
import { correctAnswerText } from '../logic/quiz'
import type { QuizLogKind, QuizQuestion, QuizSessionLog, QuizTestRecord } from '../types'
import type { Given } from './QuizSession'

interface Options {
  enabled: boolean
  targetId: string
  topicId: string
  kind: QuizLogKind
  total: number
}

export function useQuizSessionLog(options: Options) {
  const opts = useRef(options)
  opts.current = options
  const open = useRef<QuizSessionLog | null>(null)

  function push(log: QuizSessionLog) {
    log.updatedAt = new Date().toISOString()
    saveQuizSession(log)
  }

  function showing(q: QuizQuestion) {
    const { enabled, targetId, topicId, kind, total } = opts.current
    if (!enabled) return
    const now = new Date().toISOString()
    const log = (open.current ??= {
      id: crypto.randomUUID(),
      targetId,
      topicId,
      kind,
      total,
      startedAt: now,
      updatedAt: now,
      current: null,
      answers: [],
    })
    log.current = { qid: q.id, prompt: q.prompt, rightAnswer: correctAnswerText(q), shownAt: now }
    push(log)
  }

  function answered(q: QuizQuestion, correct: boolean, given: Given, timeMs: number) {
    const log = open.current
    if (!log) return
    log.answers.push({
      qid: q.id,
      prompt: q.prompt,
      rightAnswer: correctAnswerText(q),
      given: given.text ?? given.logged,
      correct,
      nearMiss: given.nearMiss || undefined,
      timeMs,
      at: new Date().toISOString(),
    })
    log.current = null
    push(log)
  }

  function finish(record: QuizTestRecord) {
    const log = open.current
    if (!log) return
    open.current = null
    log.endedAt = new Date().toISOString()
    log.outcome = 'finished'
    log.scorePct = record.scorePct
    log.passed = record.passed
    log.current = null
    push(log)
  }

  // Leaving is how training ends — it has no last question. A test left early
  // stays on the record, marked as left.
  useEffect(
    () => () => {
      const log = open.current
      if (!log) return
      open.current = null
      if (log.answers.length === 0) {
        deleteQuizSession(log.id)
        return
      }
      log.endedAt = new Date().toISOString()
      log.outcome = log.kind === 'training' ? 'finished' : 'left'
      log.current = null
      push(log)
    },
    [],
  )

  return { showing, answered, finish }
}
