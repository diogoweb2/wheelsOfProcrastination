// Grand Line Academy — the quiz tab. Each profile sees ITS OWN academy
// (Ben: school topics · Diogo: the Agent Engineer path + tooling). Training and
// test practice for everyone; Diogo, being admin, can also launch his own
// OFFICIAL final test here. Ben's official tests are launched from Diogo's
// profile → Admin.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import type { AppData, QuizLesson, QuizQuestion } from '../types'
import {
  QUIZ_TRACKS,
  activeQuestions,
  duePool,
  isFresh,
  lastOfficialAttempt,
  prerequisiteOf,
  topicsFor,
  type QuizTopic,
} from '../logic/quiz'
import { lessonsForTopic } from '../quiz/lessons'
import { QuizSession, type QuizMode } from '../components/QuizSession'
import { LessonView } from '../components/Lesson'
import { DevilFruit } from '../components/DevilFruit'
import { dayKey } from '../logic/dates'
import { sfx } from '../audio'

export function QuizScreen() {
  const { data, activeProfileId, quizBank, quizBankLoaded } = useStore()
  const [session, setSession] = useState<{ mode: QuizMode; topicId: string } | null>(null)
  const [study, setStudy] = useState<string | null>(null) // topicId whose reading list is open

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

  if (study) {
    return <StudyList topicId={study} bank={quizBank} onClose={() => setStudy(null)} />
  }

  // topics grouped into their tracks, with anything untracked falling through last
  const sections = [
    ...QUIZ_TRACKS.map((tr) => ({ ...tr, items: topics.filter((t) => t.track === tr.id) })),
    { id: '', title: '', blurb: '', items: topics.filter((t) => !t.track) },
  ].filter((s) => s.items.length > 0)

  return (
    <div className="screen">
      <div className="h1">🏫 Grand Line Academy</div>
      <p className="muted" style={{ marginBottom: 6 }}>
        {isAdmin
          ? 'Train your AI-dev skills, earn Berries, pass your own final tests for Devil Fruits.'
          : 'Train your brain, earn Berries. Pass Dad’s final test to win a Devil Fruit!'}
      </p>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <DevilFruit size={34} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>{data.economy.devilFruits} Devil Fruit{data.economy.devilFruits === 1 ? '' : 's'}</div>
          <div className="muted" style={{ fontSize: 12 }}>Spend them on real treasures in the Store!</div>
        </div>
      </div>

      {!quizBankLoaded && <p className="muted">Loading the question chest…</p>}

      {sections.map((s) => (
        <div key={s.id || 'other'}>
          {s.title && (
            <>
              <div className="h2" style={{ marginBottom: 2 }}>{s.title}</div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{s.blurb}</p>
            </>
          )}
          {s.items.map((t) => (
            <TopicCard
              key={t.id}
              topic={t}
              data={data}
              bank={quizBank}
              selfOfficial={isAdmin}
              onStart={(mode) => setSession({ mode, topicId: t.id })}
              onStudy={() => setStudy(t.id)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// --- the reading list: every lesson a topic's questions can teach ------------

function StudyList({ topicId, bank, onClose }: { topicId: string; bank: QuizQuestion[]; onClose: () => void }) {
  const [open, setOpen] = useState<QuizLesson | null>(null)
  const lessons = lessonsForTopic(bank, topicId)

  if (open) return <LessonView lesson={open} doneLabel="⬅ Back to the reading list" onDone={() => setOpen(null)} />

  return (
    <div className="quiz-full">
      <div className="quiz-full-head">
        <div style={{ fontWeight: 900, flex: 1, fontSize: 15 }}>📖 Study — {lessons.length} lessons</div>
        <button className="btn btn--ghost btn--small" style={{ whiteSpace: 'nowrap' }} onClick={onClose}>
          ⚓ Back to the ship
        </button>
      </div>
      <div className="quiz-full-body">
        {lessons.length === 0 && <p className="muted">No written lessons for this topic yet.</p>}
        {lessons.map((l) => (
          <button key={l.id} className="quiz-opt" style={{ marginBottom: 8 }} onClick={() => { sfx.click(); setOpen(l) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 24 }}>{l.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>{l.title}</div>
                <div className="muted" style={{ fontSize: 11 }}>about {l.minutes} min read</div>
              </div>
              <div style={{ color: 'var(--gold)' }}>➜</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TopicCard({
  topic,
  data,
  bank,
  selfOfficial,
  onStart,
  onStudy,
}: {
  topic: QuizTopic
  data: AppData
  bank: QuizQuestion[]
  selfOfficial: boolean // admin may run his own official final test
  onStart: (mode: QuizMode) => void
  onStudy: () => void
}) {
  const unlocked = data.quiz.unlockedTopics.includes(topic.id)
  const passed = data.quiz.passedTopics.includes(topic.id)
  const pool = activeQuestions(bank, topic.id)
  const mastered = pool.filter((q) => data.quiz.stats[q.id]?.everCorrect).length
  const freshCount = pool.filter((q) => isFresh(q, data.quiz.stats[q.id])).length
  const dueCount = duePool(pool, data.quiz.stats).length
  const last = lastOfficialAttempt(data, topic.id)
  const failedToday = !!last && !last.passed && last.day === dayKey()
  const prereq = prerequisiteOf(topic)
  const hasLessons = lessonsForTopic(bank, topic.id).length > 0

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
      {topic.outcome && (
        <div style={{ fontSize: 12, marginTop: 8, fontWeight: 800, color: 'var(--gold)' }}>🎯 {topic.outcome}</div>
      )}

      {unlocked && pool.length > 0 && (
        <>
          <div className="quiz-bar" title={`${mastered}/${pool.length} mastered`}>
            <div className="quiz-bar-fill" style={{ width: `${Math.round((mastered / pool.length) * 100)}%` }} />
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
            {mastered}/{pool.length} questions mastered
            {dueCount > 0 ? ` · ${dueCount} to practise today` : ' · all caught up today 😴'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); onStart('training') }}>
              ⚔️ Train
            </button>
            <button className="btn btn--blue btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); onStart('simulation') }}>
              🧪 Mock Final Test
            </button>
            {hasLessons && (
              <button className="btn btn--ghost btn--small" style={{ flexBasis: '100%' }} onClick={() => { sfx.click(); onStudy() }}>
                📖 Study the lessons
              </button>
            )}
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
          🔒 {prereq
            ? `Locked — pass the ${prereq.title} final test to open this level.`
            : `Locked — ${selfOfficial ? 'open it from your Admin desk (Me tab).' : 'ask Dad to open this sea.'}`}
        </div>
      )}
    </div>
  )
}
