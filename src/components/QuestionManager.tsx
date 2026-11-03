// The question bank browser — every question in one topic, with the 🗑 that
// takes a bad one out of circulation (and the ↩ that puts it back).
//
// Reachable from BOTH sides of the app: Diogo's Captain's desk (Parent →
// Academies → 📋 Questions) and, for the admin only, the Quiz app's own topic
// cards — so wherever he is reviewing a subject, he can cut a question there.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID, PARENT_ID } from '../store/storage'
import type { QuizQuestion } from '../types'
import { correctAnswerText, topicsFor } from '../logic/quiz'
import { variantsOf } from '../logic/quizVariants'
import { sfx } from '../audio'

/** The answer(s) as the reviewer needs to see them — choices listed, correct one starred. */
function QuestionBody({ q }: { q: QuizQuestion }) {
  return (
    <>
      {q.type === 'choice' && (q.choices?.length ?? 0) > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>
          {q.choices!.map((c, i) => (
            <li key={i} style={{ color: c === q.answer ? 'var(--green)' : 'var(--muted)', fontWeight: c === q.answer ? 800 : 400 }}>
              {c === q.answer ? '✔ ' : ''}{c}
            </li>
          ))}
        </ul>
      )}
      {q.type !== 'choice' && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          ✔ <b>{correctAnswerText(q)}</b>
        </div>
      )}
      <Wordings q={q} />
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        {q.type} · weight {q.weight} · 🪙{q.points}
      </div>
    </>
  )
}

/** The other wordings this question rotates through (§14 variants), so a bad one can be spotted. */
function Wordings({ q }: { q: QuizQuestion }) {
  const { prompts, answers } = variantsOf(q)
  if (prompts.length < 2 && answers.length < 2) return null
  return (
    <details style={{ fontSize: 12, marginTop: 4 }}>
      <summary className="muted">🔁 {prompts.length} wordings{answers.length > 1 ? ` · ${answers.length} ways to say the answer` : ''}</summary>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
        {prompts.slice(1).map((p) => <li key={p}>{p}</li>)}
        {answers.slice(1).map((a) => <li key={a} style={{ color: 'var(--green)' }}>✔ {a}</li>)}
      </ul>
    </details>
  )
}

export function QuestionManager({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const { quizBank, removeQuizQuestion, approveQuizQuestion } = useStore()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const topic = topicsFor(KID_ID).concat(topicsFor(PARENT_ID)).find((t) => t.id === topicId)
  const visible = quizBank.filter((q) => q.topicId === topicId && q.status !== 'removed')
  const removed = quizBank.filter((q) => q.topicId === topicId && q.status === 'removed')

  return (
    <div className="quiz-full">
      <div className="quiz-full-head">
        <div style={{ fontWeight: 900, flex: 1, fontSize: 15 }}>{topic?.emoji} {topic?.title} — question bank</div>
        <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); onClose() }}>✕ Close</button>
      </div>
      <div className="quiz-full-body">
        <p className="muted" style={{ marginBottom: 12 }}>
          {visible.length} in play · {removed.length} removed. Removing flags the question in the DB so the AI won’t regenerate it.
        </p>
        {visible.length === 0 && removed.length === 0 && (
          <p className="muted">No questions for this topic yet — they’ll appear here once generated.</p>
        )}
        {visible.map((q, i) => (
          <div key={q.id} className="card" style={{ marginBottom: 8, borderColor: q.status === 'pending' ? 'var(--orange)' : 'var(--line)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  <span className="muted">{i + 1}.</span> {q.emoji} {q.prompt}{' '}
                  {q.status === 'pending' && <span className="chip chip--urgent">pending</span>}
                </div>
                <QuestionBody q={q} />
              </div>
              {confirmId === q.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'center' }}>
                  <button
                    className="btn btn--small"
                    style={{ background: 'var(--red)' }}
                    onClick={() => { sfx.click(); removeQuizQuestion(q.id); setConfirmId(null) }}
                  >
                    Remove
                  </button>
                  <button className="btn btn--ghost btn--small" onClick={() => setConfirmId(null)}>Keep</button>
                </div>
              ) : (
                <button
                  className="btn btn--ghost btn--small"
                  style={{ color: 'var(--red)', alignSelf: 'center' }}
                  title="Take this question out of circulation"
                  onClick={() => { sfx.click(); setConfirmId(q.id) }}
                >
                  🗑
                </button>
              )}
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
