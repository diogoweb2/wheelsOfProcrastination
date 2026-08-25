// Quiz ("Grand Line Academy") — the 🎓 Quiz app. Each profile sees ITS OWN set of topics
// (Ben: school topics · Diogo: the Agent Engineer path + tooling). Training and
// test practice for everyone; Diogo, being admin, can also launch his own
// OFFICIAL final test here. Ben's official tests are launched from Diogo's
// Parent app → Quizzes.
import { useEffect, useState } from 'react'
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
import { QuestionManager } from '../components/QuestionManager'
import { DevilFruit } from '../components/DevilFruit'
import { dayKey } from '../logic/dates'
import { sfx } from '../audio'

/**
 * `trainTopicId` is a deep link from elsewhere in the app (the "Start training"
 * button on a quiz quest card): it drops straight into that topic's training
 * round. `onTrainOpened` clears it so closing the session lands on the topic
 * list instead of bouncing back in.
 */
export function QuizScreen({
  tab = 'topics',
  trainTopicId,
  onTrainOpened,
}: { tab?: string; trainTopicId?: string | null; onTrainOpened?: () => void } = {}) {
  const { data, activeProfileId, quizBank, quizBankLoaded } = useStore()
  const [session, setSession] = useState<{ mode: QuizMode; topicId: string } | null>(null)
  const [study, setStudy] = useState<string | null>(null) // topicId whose reading list is open
  const [manage, setManage] = useState<string | null>(null) // admin: topicId whose question bank is open

  useEffect(() => {
    if (!trainTopicId) return
    setSession({ mode: 'training', topicId: trainTopicId })
    setStudy(null)
    onTrainOpened?.()
  }, [trainTopicId, onTrainOpened])

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

  // Admin only: the whole bank for one topic, with the 🗑 that drops a bad question.
  if (manage) {
    return <QuestionManager topicId={manage} onClose={() => setManage(null)} />
  }

  // topics grouped into their tracks, with anything untracked falling through last
  const sections = [
    ...QUIZ_TRACKS.map((tr) => ({ ...tr, items: topics.filter((t) => t.track === tr.id) })),
    { id: '', title: '', blurb: '', items: topics.filter((t) => !t.track) },
  ].filter((s) => s.items.length > 0)

  return (
    <div className="screen">
      <div className="h1">🎓 Quiz</div>
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

      {tab === 'topics' &&
        sections.map((s) => (
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
                onManage={isAdmin ? () => setManage(t.id) : undefined}
              />
            ))}
          </div>
        ))}

      {tab === 'study' && <StudyShelf topics={topics} bank={quizBank} onOpen={setStudy} />}

      {tab === 'progress' && <ProgressBoard topics={topics} data={data} bank={quizBank} />}
    </div>
  )
}

// --- Study tab: every topic that has written lessons -------------------------

function StudyShelf({
  topics,
  bank,
  onOpen,
}: {
  topics: QuizTopic[]
  bank: QuizQuestion[]
  onOpen: (topicId: string) => void
}) {
  const shelves = topics
    .map((t) => ({ topic: t, count: lessonsForTopic(bank, t.id).length }))
    .filter((s) => s.count > 0)

  if (shelves.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>📚</div>
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          No written lessons yet — the crew is still inking them.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="h2">📖 Reading room</div>
      {shelves.map(({ topic, count }) => (
        <button
          key={topic.id}
          className="quiz-opt"
          style={{ marginBottom: 8 }}
          onClick={() => { sfx.click(); onOpen(topic.id) }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 26 }}>{topic.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14 }}>{topic.title}</div>
              <div className="muted" style={{ fontSize: 11 }}>{count} lesson{count === 1 ? '' : 's'}</div>
            </div>
            <div style={{ color: 'var(--gold)' }}>➜</div>
          </div>
        </button>
      ))}
    </div>
  )
}

// --- Progress tab: mastery per topic + the official test record --------------

function ProgressBoard({ topics, data, bank }: { topics: QuizTopic[]; data: AppData; bank: QuizQuestion[] }) {
  const rows = topics
    .map((t) => {
      const pool = activeQuestions(bank, t.id)
      return {
        topic: t,
        total: pool.length,
        mastered: pool.filter((q) => data.quiz.stats[q.id]?.everCorrect).length,
        passed: data.quiz.passedTopics.includes(t.id),
        last: lastOfficialAttempt(data, t.id),
      }
    })
    .filter((r) => r.total > 0)

  const answered = Object.keys(data.quiz.stats).length
  const officials = data.quiz.tests.filter((t) => t.official && !t.review)
  const totalMastered = rows.reduce((s, r) => s + r.mastered, 0)
  const totalQuestions = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>{totalMastered}<span className="muted" style={{ fontSize: 13 }}>/{totalQuestions}</span></div>
          <div className="muted" style={{ fontSize: 11 }}>mastered</div>
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--blue)' }}>{answered}</div>
          <div className="muted" style={{ fontSize: 11 }}>seen</div>
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--gold)' }}>{data.quiz.passedTopics.length}</div>
          <div className="muted" style={{ fontSize: 11 }}>conquered</div>
        </div>
      </div>

      <div className="h2">📊 Topic by topic</div>
      {rows.map(({ topic, total, mastered, passed, last }) => (
        <div key={topic.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>{topic.emoji}</span>
            <div style={{ fontWeight: 900, flex: 1, minWidth: 0 }}>{topic.title}</div>
            {passed && <span className="chip" style={{ background: 'var(--green)', color: '#06121f' }}>⚓ conquered</span>}
          </div>
          <div className="quiz-bar" title={`${mastered}/${total} mastered`}>
            <div className="quiz-bar-fill" style={{ width: `${Math.round((mastered / total) * 100)}%` }} />
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
            {mastered}/{total} mastered
            {last ? ` · last final test ${last.day}: ${last.scorePct}% ${last.passed ? '✅' : '❌'}` : ' · no final test yet'}
          </div>
        </div>
      ))}

      {officials.length > 0 && (
        <>
          <div className="h2">🎓 Final test record</div>
          {[...officials].reverse().map((t) => (
            <div key={t.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{topics.find((x) => x.id === t.topicId)?.title ?? t.topicId}</div>
              <div className="muted" style={{ fontSize: 12 }}>{t.day}</div>
              <span className="chip" style={t.passed ? { background: 'var(--green)', color: '#10230a' } : { background: 'var(--red)', color: '#fff' }}>
                {t.scorePct}%
              </span>
            </div>
          ))}
        </>
      )}
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
  onManage,
}: {
  topic: QuizTopic
  data: AppData
  bank: QuizQuestion[]
  selfOfficial: boolean // admin may run his own official final test
  onStart: (mode: QuizMode) => void
  onStudy: () => void
  onManage?: () => void // admin only: open the topic's question bank to review/remove
}) {
  const passed = data.quiz.passedTopics.includes(topic.id)
  // A conquered topic drops off the wheel, but stays open in the Quiz app: every
  // later official test opens with a warm-up round on this material.
  const unlocked = data.quiz.unlockedTopics.includes(topic.id) || passed
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
            {passed && ' · keep it fresh — it comes back in every warm-up review'}
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
            {onManage && (
              <button className="btn btn--ghost btn--small" style={{ flexBasis: '100%' }} onClick={() => { sfx.click(); onManage() }}>
                📋 Review the {pool.length} questions
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
        <>
          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            🚧 Unlocked, but the crew is still writing the questions!
          </div>
          {onManage && (
            <button className="btn btn--ghost btn--small" style={{ width: '100%', marginTop: 8 }} onClick={() => { sfx.click(); onManage() }}>
              📋 Open the question bank
            </button>
          )}
        </>
      )}
      {!unlocked && (
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          🔒 {prereq
            ? `Locked — pass the ${prereq.title} final test to open this level.`
            : `Locked — ${selfOfficial ? 'open it from the Parent app → Quizzes.' : 'ask Dad to open this topic.'}`}
        </div>
      )}
    </div>
  )
}
