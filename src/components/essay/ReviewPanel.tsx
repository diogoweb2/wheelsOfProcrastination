// The reviewer's desk. The AI does the reading; the parent has the last word on
// every single note — keep it, reword it, bin it, or write one of their own.
//
// The loop: mark it → send it back → he fixes → check the fixes → agree or send
// it round again → grade. Spelling is the only thing that closes itself, because
// a word is either spelled right or it isn't and nobody should have to tick off
// thirty of those by hand.
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Essay, EssayComment, EssayIssue } from '../../types'
import { ISSUE_LABEL, essayWords, openComments, readyToGrade } from '../../logic/essay'
import { MarkedEssay } from './MarkedEssay'
import { NoteCard } from './NoteCard'
import { AiWaiting } from './AiWaiting'
import { sfx } from '../../audio'

export function ReviewPanel() {
  const { essays } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const open = essays.find((e) => e.id === openId)
  if (open) return <ReviewOne essay={open} onClose={() => setOpenId(null)} />

  const waiting = essays.filter((e) => e.status === 'submitted').reverse()
  const withHim = essays.filter((e) => e.status === 'returned' || e.status === 'writing').reverse()

  return (
    <>
      <div className="h2">📥 Waiting on you — {waiting.length}</div>
      {waiting.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nothing handed in right now.</p>}
      {waiting.map((e) => (
        <div className="card" key={e.id} style={{ marginBottom: 10 }} onClick={() => { sfx.click(); setOpenId(e.id) }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{e.title || '(no title)'}</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 800, marginTop: 3 }}>
            {e.authorName} · round {e.round} · {essayWords(e)} words · {e.topicTitle}
          </div>
          <button className="btn btn--small" style={{ marginTop: 10 }}>
            {e.comments.length === 0 ? '🔍 Review it' : '🔁 Check his fixes'}
          </button>
        </div>
      ))}

      <div className="h2">✍️ With him — {withHim.length}</div>
      {withHim.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nothing in progress.</p>}
      {withHim.map((e) => (
        <div className="card" key={e.id} style={{ marginBottom: 10, opacity: 0.8 }} onClick={() => { sfx.click(); setOpenId(e.id) }}>
          <div style={{ fontWeight: 900 }}>{e.title || e.topicTitle}</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 800, marginTop: 3 }}>
            {e.authorName} ·{' '}
            {e.status === 'writing'
              ? 'writing the first draft'
              : `fixing ${openComments(e).length} note${openComments(e).length === 1 ? '' : 's'} (round ${e.round})`}
          </div>
        </div>
      ))}
    </>
  )
}

function ReviewOne({ essay, onClose }: { essay: Essay; onClose: () => void }) {
  const {
    essayBusy,
    essayError,
    essayClearError,
    essayAiReview,
    essayAiCheckFixes,
    essayAddComment,
    essayEditComment,
    essayDeleteComment,
    essayResolveComment,
    essayReturn,
    essayGrade,
  } = useStore()

  const [picked, setPicked] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [adding, setAdding] = useState(false)

  const open = openComments(essay)
  const canGrade = readyToGrade(essay)
  const reviewed = essay.comments.some((c) => c.round === essay.round)

  return (
    <>
      <button className="btn btn--ghost btn--small" style={{ marginBottom: 10 }} onClick={() => { sfx.click(); onClose() }}>
        ← Back to the desk
      </button>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{essay.title || '(no title)'}</div>
        <div className="muted" style={{ fontSize: 11, fontWeight: 800, marginTop: 3 }}>
          {essay.authorName} · round {essay.round} · {essayWords(essay)} words · {essay.status}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Topic: {essay.topicTitle}</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <MarkedEssay essay={essay} comments={essay.comments} selectedId={picked} onSelect={setPicked} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className="btn btn--blue btn--small"
          style={{ flex: 1 }}
          disabled={!!essayBusy}
          onClick={() => { sfx.click(); void essayAiReview(essay.id) }}
        >
          {essayBusy === 'review' ? '🤖 Reading…' : reviewed ? '🤖 Mark it again' : '🤖 Mark it up'}
        </button>
        {essay.round > 1 && open.length > 0 && (
          <button
            className="btn btn--small"
            style={{ flex: 1 }}
            disabled={!!essayBusy}
            onClick={() => { sfx.click(); void essayAiCheckFixes(essay.id) }}
          >
            {essayBusy === 'fixes' ? '🤖 Checking…' : '🔁 Check his fixes'}
          </button>
        )}
      </div>

      {essayBusy && (
        <div style={{ marginBottom: 12 }}>
          <AiWaiting
            label={essayBusy === 'review' ? 'Reading his essay' : essayBusy === 'fixes' ? 'Checking his fixes' : 'Grading it'}
          />
        </div>
      )}

      {essayError && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--red)' }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>🤖 That didn’t work</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{essayError}</p>
          <button className="btn btn--ghost btn--small" style={{ marginTop: 8 }} onClick={essayClearError}>Dismiss</button>
        </div>
      )}

      <div className="h2">📝 Notes — {open.length} open</div>
      {essay.comments.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>No notes yet. Mark it up, or write your own below.</p>
      )}
      {essay.comments.map((c) => (
        <div key={c.id} style={{ marginBottom: 10 }}>
          {editing?.id === c.id ? (
            <div className="card">
              <div className="field" style={{ marginBottom: 8 }}>
                <label>Say it your way</label>
                <textarea value={editing.text} onChange={(e) => setEditing({ id: c.id, text: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn--small"
                  style={{ flex: 1 }}
                  onClick={() => { sfx.click(); essayEditComment(essay.id, c.id, editing.text); setEditing(null) }}
                >
                  ✓ Save
                </button>
                <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <NoteCard note={c}>
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setEditing({ id: c.id, text: c.text }) }}>
                ✏️ Edit
              </button>
              <button
                className="btn btn--ghost btn--small"
                style={{ color: 'var(--red)' }}
                onClick={() => { sfx.click(); essayDeleteComment(essay.id, c.id) }}
              >
                ✕ Disagree
              </button>
              {c.issue !== 'praise' && (
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => { sfx.click(); essayResolveComment(essay.id, c.id, c.status !== 'fixed') }}
                >
                  {c.status === 'fixed' ? '↩︎ Reopen' : '✓ He fixed it'}
                </button>
              )}
            </NoteCard>
          )}
        </div>
      ))}

      {adding ? (
        <AddNote essay={essay} onDone={() => setAdding(false)} onAdd={(n) => essayAddComment(essay.id, n)} />
      ) : (
        <button className="btn btn--ghost" onClick={() => { sfx.click(); setAdding(true) }}>➕ Add my own note</button>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          className="btn"
          disabled={essay.comments.length === 0 || essay.status !== 'submitted'}
          onClick={() => { sfx.gem(); essayReturn(essay.id); onClose() }}
        >
          📬 Send the notes back to {essay.authorName}
        </button>
        <button
          className="btn btn--blue"
          style={{ marginTop: 10 }}
          disabled={!canGrade || !!essayBusy || essay.status === 'graded'}
          onClick={() => { sfx.gem(); void essayGrade(essay.id) }}
        >
          {essayBusy === 'grade' ? '🤖 Grading…' : '🏅 Everything’s fixed — grade it'}
        </button>
        {!canGrade && (
          <p className="muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>
            {essay.comments.length === 0
              ? 'Mark it up first.'
              : `${open.length} note${open.length === 1 ? '' : 's'} still open — agree they’re fixed, or send it round again.`}
          </p>
        )}
      </div>
    </>
  )
}

/** The parent's own note: point at a paragraph, quote the bit, say what's wrong. */
function AddNote({
  essay,
  onAdd,
  onDone,
}: {
  essay: Essay
  onAdd: (n: Omit<EssayComment, 'id' | 'round' | 'source' | 'status'>) => void
  onDone: () => void
}) {
  const [para, setPara] = useState(0)
  const [quote, setQuote] = useState('')
  const [issue, setIssue] = useState<EssayIssue>('clarity')
  const [text, setText] = useState('')
  const issues: EssayIssue[] = ['spelling', 'punctuation', 'clarity', 'idea', 'praise']

  return (
    <div className="card">
      <div className="field">
        <label>Where</label>
        <select value={para} onChange={(e) => setPara(Number(e.target.value))}>
          <option value={-1}>The title</option>
          {essay.paragraphs.map((_, i) => (
            <option key={i} value={i}>Paragraph {i + 1}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Circle this bit (optional — must match his text exactly)</label>
        <input type="text" value={quote} onChange={(e) => setQuote(e.target.value)} />
      </div>
      <div className="field">
        <label>Kind</label>
        <select value={issue} onChange={(e) => setIssue(e.target.value as EssayIssue)}>
          {issues.map((i) => (
            <option key={i} value={i}>{ISSUE_LABEL[i]}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>The note (he reads this exactly as written)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Say what’s wrong — don’t write the fix." />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn--small"
          style={{ flex: 1 }}
          disabled={!text.trim()}
          onClick={() => {
            sfx.click()
            onAdd({ para, issue, text: text.trim(), ...(quote.trim() ? { quote: quote.trim() } : {}) })
            onDone()
          }}
        >
          ➕ Add note
        </button>
        <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}
