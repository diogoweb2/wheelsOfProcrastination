// Grand Line Academy — the quiz tab.
//  Ben:   train per topic (Berries), run final-test simulations.
//  Diogo: launch OFFICIAL final tests on the spot, lock/unlock topics, grant
//         bonus 🍇, review/remove questions, approve AI-regenerated ones.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import type { AppData, QuizQuestion } from '../types'
import { QUIZ_TOPICS, activeQuestions, correctAnswerText, lastOfficialAttempt, type QuizTopic } from '../logic/quiz'
import { QuizSession, type QuizMode } from '../components/QuizSession'
import { dayKey } from '../logic/dates'
import { sfx } from '../audio'

export function QuizScreen() {
  const { activeProfileId } = useStore()
  return activeProfileId === PARENT_ID ? <ParentQuiz /> : <KidQuiz />
}

// --- Ben -------------------------------------------------------------------

function KidQuiz() {
  const { data, quizBank, quizBankLoaded } = useStore()
  const [session, setSession] = useState<{ mode: QuizMode; topicId: string } | null>(null)

  if (session) {
    return <QuizSession mode={session.mode} topicId={session.topicId} stats={data.quiz.stats} onClose={() => setSession(null)} />
  }

  return (
    <div className="screen">
      <div className="h1">🏫 Grand Line Academy</div>
      <p className="muted" style={{ marginBottom: 6 }}>
        Train your brain, earn Berries. Pass Dad’s final test to win a Devil Fruit!
      </p>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 30 }}>🍇</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>{data.economy.devilFruits} Devil Fruit{data.economy.devilFruits === 1 ? '' : 's'}</div>
          <div className="muted" style={{ fontSize: 12 }}>3 🍇 buy a real gift card in the Store!</div>
        </div>
      </div>

      {!quizBankLoaded && <p className="muted">Loading the question chest…</p>}

      {QUIZ_TOPICS.map((t) => (
        <KidTopicCard key={t.id} topic={t} data={data} bank={quizBank} onStart={(mode) => setSession({ mode, topicId: t.id })} />
      ))}
    </div>
  )
}

function KidTopicCard({ topic, data, bank, onStart }: { topic: QuizTopic; data: AppData; bank: QuizQuestion[]; onStart: (mode: QuizMode) => void }) {
  const unlocked = data.quiz.unlockedTopics.includes(topic.id) && !topic.comingSoon
  const passed = data.quiz.passedTopics.includes(topic.id)
  const pool = activeQuestions(bank, topic.id)
  const mastered = pool.filter((q) => data.quiz.stats[q.id]?.everCorrect).length

  return (
    <div className="card quiz-topic" style={{ marginBottom: 12, opacity: unlocked ? 1 : 0.65 }}>
      {passed && <div className="quiz-stamp">⚓ CONQUERED ✔</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 34 }}>{topic.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{topic.title}</div>
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
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); onStart('training') }}>
              ⚔️ Train
            </button>
            <button className="btn btn--blue btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); onStart('simulation') }}>
              🧪 Final test practice
            </button>
          </div>
        </>
      )}
      {!unlocked && (
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          {topic.comingSoon ? '🚧 Coming soon — the crew is still writing these!' : '🔒 Locked — ask Dad to open this sea.'}
        </div>
      )}
    </div>
  )
}

// --- Diogo -----------------------------------------------------------------

function ParentQuiz() {
  const { kidData, quizBank, quizBankLoaded } = useStore()
  const [session, setSession] = useState<string | null>(null) // topicId of a running official test
  const [managing, setManaging] = useState<string | null>(null) // topicId of open question manager

  const pending = quizBank.filter((q) => q.status === 'pending')

  if (session && kidData) {
    return <QuizSession mode="official" topicId={session} stats={kidData.quiz.stats} onClose={() => setSession(null)} />
  }
  if (managing) {
    return <QuestionManager topicId={managing} onClose={() => setManaging(null)} />
  }

  return (
    <div className="screen">
      <div className="h1">🏫 Academy — Captain’s desk</div>
      <p className="muted" style={{ marginBottom: 14 }}>
        Launch official final tests, unlock topics, grant bonus 🍇 and curate questions.
      </p>

      {!kidData && <p className="muted">Loading Ben’s log from the cloud…</p>}

      {pending.length > 0 && <PendingReview pending={pending} />}

      {QUIZ_TOPICS.map((t) => (
        <ParentTopicCard
          key={t.id}
          topic={t}
          onTest={() => setSession(t.id)}
          onManage={() => setManaging(t.id)}
        />
      ))}
      {!quizBankLoaded && <p className="muted">Loading question bank…</p>}
    </div>
  )
}

function PendingReview({ pending }: { pending: QuizQuestion[] }) {
  const { approveQuizQuestion, removeQuizQuestion } = useStore()
  return (
    <div className="card" style={{ marginBottom: 14, borderColor: 'var(--orange)' }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>🔎 {pending.length} new AI question{pending.length > 1 ? 's' : ''} to review</div>
      {pending.map((q) => (
        <div key={q.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{q.emoji} {q.prompt}</div>
          <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>Answer: {correctAnswerText(q)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--small" onClick={() => { sfx.gem(); approveQuizQuestion(q.id) }}>✓ Approve</button>
            <button className="btn btn--ghost btn--small" style={{ color: 'var(--red)' }} onClick={() => { sfx.click(); removeQuizQuestion(q.id) }}>
              ✕ Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ParentTopicCard({ topic, onTest, onManage }: { topic: QuizTopic; onTest: () => void; onManage: () => void }) {
  const { kidData, quizBank, setTopicUnlocked, grantDevilFruit, pushEvent } = useStore()
  const pool = activeQuestions(quizBank, topic.id)
  const unlocked = kidData?.quiz.unlockedTopics.includes(topic.id) ?? false
  const passed = kidData?.quiz.passedTopics.includes(topic.id) ?? false
  const last = kidData ? lastOfficialAttempt(kidData, topic.id) : null
  const failedToday = !!last && !last.passed && last.day === dayKey() // retries only on a later day
  const mastered = kidData ? pool.filter((q) => kidData.quiz.stats[q.id]?.everCorrect).length : 0

  return (
    <div className="card quiz-topic" style={{ marginBottom: 12 }}>
      {passed && <div className="quiz-stamp">⚓ CONQUERED ✔</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 34 }}>{topic.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{topic.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {pool.length} questions · Ben mastered {mastered}
            {last && <> · last official: {last.scorePct}% {last.passed ? '✓' : '✗'} ({last.day})</>}
          </div>
        </div>
        <button
          className={`btn btn--small ${unlocked ? 'btn--ghost' : 'btn--blue'}`}
          disabled={!kidData || topic.comingSoon}
          onClick={() => { sfx.click(); setTopicUnlocked(topic.id, !unlocked) }}
        >
          {unlocked ? '🔓 Open' : '🔒 Locked'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {!passed && (
          <button className="btn btn--small" style={{ flex: 2 }} disabled={!kidData || pool.length === 0 || failedToday} onClick={() => { sfx.click(); onTest() }}>
            🎓 {failedToday ? 'Retry tomorrow' : 'Final Test (hand Ben the phone)'}
          </button>
        )}
        <button
          className="btn btn--blue btn--small"
          style={{ flex: 1 }}
          disabled={!kidData}
          onClick={() => {
            sfx.gem()
            grantDevilFruit(topic.id)
            pushEvent({ type: 'goal', emoji: '🍇', title: 'Bonus Devil Fruit granted', description: `Ben gets +1 🍇 for ${topic.title}. Captain’s orders.` })
          }}
        >
          +1 🍇 bonus
        </button>
        <button className="btn btn--ghost btn--small" disabled={pool.length === 0} onClick={() => { sfx.click(); onManage() }}>
          📋 Questions
        </button>
      </div>
    </div>
  )
}

function QuestionManager({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const { quizBank, removeQuizQuestion } = useStore()
  const topic = QUIZ_TOPICS.find((t) => t.id === topicId)
  const visible = quizBank.filter((q) => q.topicId === topicId && q.status !== 'removed')
  const removed = quizBank.filter((q) => q.topicId === topicId && q.status === 'removed')

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div className="h1" style={{ flex: 1, marginBottom: 0 }}>{topic?.emoji} Question bank</div>
        <button className="btn btn--ghost btn--small" onClick={onClose}>✕ Close</button>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {visible.length} in play · {removed.length} removed. Removing flags the question in the DB so the AI won’t regenerate it.
        Run <b>npm run quiz:regen</b> to refill the bank; new questions land here as “pending review”.
      </p>
      {visible.map((q) => (
        <div key={q.id} className="card" style={{ marginBottom: 8, borderColor: q.status === 'pending' ? 'var(--orange)' : 'var(--line)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {q.emoji} {q.prompt} {q.status === 'pending' && <span className="chip chip--urgent">pending</span>}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {q.type} · weight {q.weight} · 🪙{q.points} — <b>{correctAnswerText(q)}</b>
              </div>
            </div>
            <button className="btn btn--ghost btn--small" style={{ color: 'var(--red)', alignSelf: 'center' }} onClick={() => { sfx.click(); removeQuizQuestion(q.id) }}>
              🗑
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
