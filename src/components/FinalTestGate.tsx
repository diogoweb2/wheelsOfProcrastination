// §14 — the door in front of Ben's official final test: every question of the
// topic must be RIGHT in training first. Missing ones are served as a training
// round; when it ends the door is checked again, and loops until none are left.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { activeQuestions, finalTestGaps, topicById } from '../logic/quiz'
import type { QuizStat } from '../types'
import { sfx } from '../audio'
import { QuizSession } from './QuizSession'

export function FinalTestGate({
  topicId,
  stats,
  targetId,
  onCancel,
  children,
}: {
  topicId: string
  stats: Record<string, QuizStat>
  targetId: string
  onCancel: () => void
  /** What the door opens onto (the code pad, or the test itself). */
  children: React.ReactNode
}) {
  const quizBank = useStore((s) => s.quizBank)
  const pool = useMemo(() => activeQuestions(quizBank, topicId), [quizBank, topicId])
  const gaps = finalTestGaps(pool, stats)
  const [training, setTraining] = useState<string[] | null>(null)
  // latched: once he is through, a miss during the test itself must not pull him back out
  const [cleared, setCleared] = useState(false)
  const topic = topicById(topicId)

  useEffect(() => {
    if (!training && pool.length > 0 && gaps.length === 0) setCleared(true)
    if (pool.length === 0) setCleared(true)
  }, [training, pool.length, gaps.length])

  if (cleared) return <>{children}</>

  if (training) {
    return (
      <QuizSession
        mode="training"
        topicId={topicId}
        targetId={targetId}
        stats={stats}
        onlyIds={training}
        onClose={() => setTraining(null)}
      />
    )
  }

  if (pool.length === 0 || gaps.length === 0) return null

  return (
    <div className="overlay overlay--center">
      <div className="sheet" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>📚</div>
        <div className="h1">Train first</div>
        <p style={{ margin: '8px 0', fontWeight: 800 }}>
          {topic?.emoji} {topic?.title}
        </p>
        <p className="muted" style={{ margin: '0 0 16px' }}>
          To sit the final test you need to get <b>every</b> question right in training. You have{' '}
          <b>{gaps.length}</b> to complete. When you finish them you can start the test. If some are still wrong,
          they come back until you get them all.
        </p>
        <button className="btn" onClick={() => { sfx.click(); setTraining(gaps.map((q) => q.id)) }}>
          🏋️ Train these {gaps.length} questions
        </button>
        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => { sfx.click(); onCancel() }}>
          Not now
        </button>
      </div>
    </div>
  )
}
