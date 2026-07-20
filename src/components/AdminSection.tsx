// The Captain's desk — admin tools inside Diogo's profile (Me tab).
// Manage BOTH academies (Ben's and his own): locks, bonus 🍇, question
// curation, AI-question review, Ben's official final tests, and settling
// prize purchases ("Paid").
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID, PARENT_ID } from '../store/storage'
import type { AppData, QuizQuestion } from '../types'
import { activeQuestions, correctAnswerText, lastOfficialAttempt, topicsFor, type QuizTopic } from '../logic/quiz'
import { QuizSession } from './QuizSession'
import { dayKey } from '../logic/dates'
import { sfx } from '../audio'

export function AdminSection() {
  const { data, kidData, quizBank } = useStore()
  const [session, setSession] = useState<{ kind: 'ben-official' | 'ben-preview'; topicId: string } | null>(null)
  const [managing, setManaging] = useState<string | null>(null)

  const pending = quizBank.filter((q) => q.status === 'pending')

  if (session && kidData) {
    return (
      <QuizSession
        mode={session.kind === 'ben-official' ? 'official' : 'training'}
        preview={session.kind === 'ben-preview'}
        topicId={session.topicId}
        targetId={KID_ID}
        stats={kidData.quiz.stats}
        onClose={() => setSession(null)}
      />
    )
  }
  if (managing) {
    return <QuestionManager topicId={managing} onClose={() => setManaging(null)} />
  }

  return (
    <>
      <div className="h2">🛠️ Captain’s desk (admin)</div>

      <FreezeDesk />

      {pending.length > 0 && <PendingReview pending={pending} />}

      <PendingPrizes />

      <div className="muted" style={{ fontSize: 12, margin: '10px 0 6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
        ⚔️ Ben’s academy
      </div>
      {!kidData && <p className="muted">Loading Ben’s log from the cloud…</p>}
      {topicsFor(KID_ID).map((t) => (
        <AdminTopicCard
          key={t.id}
          topic={t}
          targetId={KID_ID}
          targetData={kidData}
          onTest={() => setSession({ kind: 'ben-official', topicId: t.id })}
          onPreview={() => setSession({ kind: 'ben-preview', topicId: t.id })}
          onManage={() => setManaging(t.id)}
        />
      ))}

      <div className="muted" style={{ fontSize: 12, margin: '14px 0 6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
        🏴‍☠️ My academy
      </div>
      {topicsFor(PARENT_ID).map((t) => (
        <AdminTopicCard
          key={t.id}
          topic={t}
          targetId={PARENT_ID}
          targetData={data}
          onManage={() => setManaging(t.id)}
        />
      ))}
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Your own official final tests run from the Quiz tab. <b>npm run quiz:regen</b> refills removed questions;{' '}
        <b>npm run quiz:review</b> (weekly, sonnet) refreshes your AI topics — updated questions show a ✨ NEW badge.
      </p>
    </>
  )
}

/** Unpaid purchases from both crewmates, each with a "Paid" settle button. */
/**
 * Free Streak Freezes for Ben. Shows his pending asks (with his reason) and an
 * always-open form so Diogo can gift one unprompted — e.g. he already knows Ben
 * was away on a trip. Granting also revives a streak that already sank.
 */
function FreezeDesk() {
  const { kidData, freezeRequests, grantFreeze, declineFreezeRequest } = useStore()
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(1)
  const [open, setOpen] = useState(false)

  const asks = freezeRequests.filter((r) => r.status === 'pending' && r.fromId === KID_ID)
  const dead = kidData?.streak.deadStreak
  const stock = kidData?.economy.freezes ?? 0

  function send(requestId?: string) {
    sfx.gem()
    grantFreeze(count, message || 'Dad’s got your back. Go get ’em! 👒', requestId)
    setMessage('')
    setCount(1)
    setOpen(false)
  }

  const showForm = open || asks.length > 0
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: asks.length > 0 ? 'var(--red)' : undefined }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>
        🧊 Free freezes for Ben {asks.length > 0 && <span style={{ color: 'var(--red)' }}>· {asks.length} asking!</span>}
      </div>

      {asks.map((r) => (
        <div key={r.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>🆘 {r.fromName} is asking for a freeze</div>
          {r.reason && <div className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>“{r.reason}”</div>}
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            asked {new Date(r.createdAt).toLocaleString()}
          </div>
          <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => { sfx.click(); declineFreezeRequest(r.id) }}>
            ✕ Not this time
          </button>
        </div>
      ))}

      <div className="muted" style={{ fontSize: 12, borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 4 }}>
        Ben has 🧊{stock} stocked
        {dead ? ` · his ${dead.value}-day streak is DEAD — granting revives it free` : ' · streak is alive'}
      </div>

      {!showForm ? (
        <button className="btn btn--small" style={{ marginTop: 8 }} onClick={() => { sfx.click(); setOpen(true) }}>
          🎁 Give Ben a free freeze
        </button>
      ) : (
        <>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Message for Ben</label>
            <input
              type="text"
              value={message}
              maxLength={160}
              placeholder="Trips don’t break streaks. Proud of you!"
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>How many</span>
            <button className="btn btn--ghost btn--small" onClick={() => setCount((c) => Math.max(1, c - 1))}>−</button>
            <b style={{ minWidth: 18, textAlign: 'center' }}>{count}</b>
            <button className="btn btn--ghost btn--small" onClick={() => setCount((c) => Math.min(9, c + 1))}>+</button>
            <button
              className="btn btn--small"
              style={{ marginLeft: 'auto' }}
              disabled={!kidData}
              onClick={() => send(asks[0]?.id)}
            >
              🧊 Send {count} free
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function PendingPrizes() {
  const { data, kidData, markGiftCardPaid } = useStore()
  const rows = [
    ...(kidData?.giftcards.filter((p) => !p.paidAt).map((p) => ({ who: 'Ben', targetId: KID_ID, p })) ?? []),
    ...data.giftcards.filter((p) => !p.paidAt).map((p) => ({ who: 'Me', targetId: PARENT_ID, p })),
  ]
  if (rows.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: 'var(--yellow)' }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>🎁 Prizes to settle</div>
      {rows.map(({ who, targetId, p }) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--line)', padding: '8px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{who}: {p.label}</div>
            <div className="muted" style={{ fontSize: 11 }}>ordered {p.day}{p.cost ? ` · 🍇${p.cost}` : ''}</div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.gem(); markGiftCardPaid(targetId, p.id) }}>
            ✓ Paid
          </button>
        </div>
      ))}
    </div>
  )
}

function PendingReview({ pending }: { pending: QuizQuestion[] }) {
  const { approveQuizQuestion, removeQuizQuestion } = useStore()
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: 'var(--orange)' }}>
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

function AdminTopicCard({
  topic,
  targetId,
  targetData,
  onTest,
  onPreview,
  onManage,
}: {
  topic: QuizTopic
  targetId: string
  targetData: AppData | null
  onTest?: () => void // Ben only: launch his official test from here
  onPreview?: () => void // Ben only: try his training without recording
  onManage: () => void
}) {
  const { quizBank, setTopicUnlocked, grantDevilFruit, pushEvent } = useStore()
  const pool = activeQuestions(quizBank, topic.id)
  const unlocked = targetData?.quiz.unlockedTopics.includes(topic.id) ?? false
  const passed = targetData?.quiz.passedTopics.includes(topic.id) ?? false
  const last = targetData ? lastOfficialAttempt(targetData, topic.id) : null
  const failedToday = !!last && !last.passed && last.day === dayKey()
  const mastered = targetData ? pool.filter((q) => targetData.quiz.stats[q.id]?.everCorrect).length : 0

  return (
    <div className="card quiz-topic" style={{ marginBottom: 10 }}>
      {passed && <div className="quiz-stamp">⚓ CONQUERED ✔</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 30 }}>{topic.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>{topic.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {pool.length} questions · mastered {mastered}
            {last && <> · last official: {last.scorePct}% {last.passed ? '✓' : '✗'} ({last.day})</>}
          </div>
        </div>
        <button
          className={`btn btn--small ${unlocked ? 'btn--ghost' : 'btn--blue'}`}
          disabled={!targetData}
          onClick={() => { sfx.click(); setTopicUnlocked(targetId, topic.id, !unlocked) }}
        >
          {unlocked ? '🔓 Open' : '🔒 Locked'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {onTest && !passed && (
          <button className="btn btn--small" style={{ flex: 2 }} disabled={!targetData || pool.length === 0 || failedToday} onClick={() => { sfx.click(); onTest() }}>
            🎓 {failedToday ? 'Retry tomorrow' : 'Final Test (hand Ben the phone)'}
          </button>
        )}
        {onPreview && (
          <button className="btn btn--ghost btn--small" disabled={!targetData || pool.length === 0} onClick={() => { sfx.click(); onPreview() }}>
            ⚔️ Preview
          </button>
        )}
        <button
          className="btn btn--blue btn--small"
          style={{ flex: 1 }}
          disabled={!targetData}
          onClick={() => {
            sfx.gem()
            grantDevilFruit(targetId, topic.id)
            pushEvent({
              type: 'goal',
              emoji: '🍇',
              title: 'Bonus Devil Fruit granted',
              description: `${targetId === KID_ID ? 'Ben gets' : 'You get'} +1 🍇 for ${topic.title}. Captain’s orders.`,
            })
          }}
        >
          +1 🍇
        </button>
        <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); onManage() }}>
          📋 Questions
        </button>
      </div>
    </div>
  )
}

function QuestionManager({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const { quizBank, removeQuizQuestion, approveQuizQuestion } = useStore()
  const topic = topicsFor(KID_ID).concat(topicsFor(PARENT_ID)).find((t) => t.id === topicId)
  const visible = quizBank.filter((q) => q.topicId === topicId && q.status !== 'removed')
  const removed = quizBank.filter((q) => q.topicId === topicId && q.status === 'removed')

  return (
    <div className="quiz-full">
      <div className="quiz-full-head">
        <div style={{ fontWeight: 900, flex: 1, fontSize: 15 }}>{topic?.emoji} {topic?.title} — question bank</div>
        <button className="btn btn--ghost btn--small" onClick={onClose}>✕ Close</button>
      </div>
      <div className="quiz-full-body">
        <p className="muted" style={{ marginBottom: 12 }}>
          {visible.length} in play · {removed.length} removed. Removing flags the question in the DB so the AI won’t regenerate it.
        </p>
        {visible.length === 0 && removed.length === 0 && (
          <p className="muted">No questions for this topic yet — they’ll appear here once generated.</p>
        )}
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

        {removed.length > 0 && (
          <>
            <div className="h2">🗑 Removed ({removed.length}) — the AI won’t recreate these</div>
            {removed.map((q) => (
              <div key={q.id} className="card" style={{ marginBottom: 8, opacity: 0.6 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{q.emoji} {q.prompt}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {q.type} · weight {q.weight} — <b>{correctAnswerText(q)}</b>
                    </div>
                  </div>
                  <button className="btn btn--ghost btn--small" style={{ alignSelf: 'center' }} onClick={() => { sfx.click(); approveQuizQuestion(q.id) }}>
                    ↩ Restore
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
