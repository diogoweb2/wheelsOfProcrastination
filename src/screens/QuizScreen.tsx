// Grand Line Academy — the quiz tab. Each profile sees ITS OWN academy
// (Ben: school topics · Diogo: AI-for-dev topics). Training and test practice
// for everyone; Diogo, being admin, can also launch his own OFFICIAL final
// test here. Ben's official tests are launched from Diogo's profile → Admin.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import type { AppData, QuizQuestion } from '../types'
import { activeQuestions, isFresh, lastOfficialAttempt, topicsFor, type QuizTopic } from '../logic/quiz'
import { QuizSession, type QuizMode } from '../components/QuizSession'
import { dayKey } from '../logic/dates'
import { sfx } from '../audio'

export function QuizScreen() {
  const { data, activeProfileId, quizBank, quizBankLoaded } = useStore()
  const [session, setSession] = useState<{ mode: QuizMode; topicId: string } | null>(null)

  if (!activeProfileId) return null
  const topics = topicsFor(activeProfileId)
  const isAdmin = activeProfileId === PARENT_ID

  if (session) {
    return (
      <QuizSession
        mode={session.mode}
        topicId={session.topicId}
        targetId={activeProfileId}
        stats={data.quiz.stats}
        onClose={() => setSession(null)}
      />
    )
  }

  return (
    <div className="screen">
      <div className="h1">🏫 Grand Line Academy</div>
      <p className="muted" style={{ marginBottom: 6 }}>
        {isAdmin
          ? 'Train your AI-dev skills, earn Berries, pass your own final tests for Devil Fruits.'
          : 'Train your brain, earn Berries. Pass Dad’s final test to win a Devil Fruit!'}
      </p>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 30 }}>🍇</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>{data.economy.devilFruits} Devil Fruit{data.economy.devilFruits === 1 ? '' : 's'}</div>
          <div className="muted" style={{ fontSize: 12 }}>Spend them on real treasures in the Store!</div>
        </div>
      </div>

      {!quizBankLoaded && <p className="muted">Loading the question chest…</p>}

      {topics.map((t) => (
        <TopicCard
          key={t.id}
          topic={t}
          data={data}
          bank={quizBank}
          selfOfficial={isAdmin}
          onStart={(mode) => setSession({ mode, topicId: t.id })}
        />
      ))}
    </div>
  )
}

function TopicCard({
  topic,
  data,
  bank,
  selfOfficial,
  onStart,
}: {
  topic: QuizTopic
  data: AppData
  bank: QuizQuestion[]
  selfOfficial: boolean // admin may run his own official final test
  onStart: (mode: QuizMode) => void
}) {
  const unlocked = data.quiz.unlockedTopics.includes(topic.id)
  const passed = data.quiz.passedTopics.includes(topic.id)
  const pool = activeQuestions(bank, topic.id)
  const mastered = pool.filter((q) => data.quiz.stats[q.id]?.everCorrect).length
  const freshCount = pool.filter((q) => isFresh(q, data.quiz.stats[q.id])).length
  const last = lastOfficialAttempt(data, topic.id)
  const failedToday = !!last && !last.passed && last.day === dayKey()

  return (
    <div className="card quiz-topic" style={{ marginBottom: 12, opacity: unlocked ? 1 : 0.65 }}>
      {passed && <div className="quiz-stamp">⚓ CONQUERED ✔</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 34 }}>{topic.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {topic.title}
            {freshCount > 0 && (
              <span className="chip" style={{ background: 'var(--green)', color: '#06121f', marginLeft: 6 }}>
                ✨ {freshCount} new
              </span>
            )}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>{topic.description}</div>
        </div>
      </div>

      {unlocked && pool.length > 0 && (
        <>
          <div className="quiz-bar" title={`${mastered}/${pool.length} mastered`}>
            <div className="quiz-bar-fill" style={{ width: `${Math.round((mastered / pool.length) * 100)}%` }} />
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
            {mastered}/{pool.length} questions mastered
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); onStart('training') }}>
              ⚔️ Train
            </button>
            <button className="btn btn--blue btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); onStart('simulation') }}>
              🧪 Mock Final Test
            </button>
            {selfOfficial && !passed && (
              <button
                className="btn btn--small"
                style={{ flexBasis: '100%' }}
                disabled={failedToday}
                onClick={() => { sfx.click(); onStart('official') }}
              >
                🎓 {failedToday ? 'Failed today — retry tomorrow' : 'Official Final Test (for the 🍇)'}
              </button>
            )}
          </div>
        </>
      )}
      {unlocked && pool.length === 0 && (
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          🚧 Unlocked, but the crew is still writing the questions!
        </div>
      )}
      {!unlocked && (
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          🔒 Locked — {selfOfficial ? 'open it from your Admin desk (Me tab).' : 'ask Dad to open this sea.'}
        </div>
      )}
    </div>
  )
}
