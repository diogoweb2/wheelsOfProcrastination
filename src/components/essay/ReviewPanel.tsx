// The reviewer's desk.
//
// The AI proofreads — spelling, punctuation, capital letters, and nothing else.
// Whether the writing is any GOOD is the parent's call, made by hand: tap the
// first word, tap the last, say what's wrong. And the parent has the last word
// on the machine's notes too — keep it, reword it, or bin it.
//
// The loop: mark it → send it back → he fixes → check the fixes → agree or send
// it round again → grade. Spelling and capitals close themselves, because both
// have a right answer and nobody should tick off thirty of those by hand.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Essay, EssayComment, EssayIssue } from '../../types'
import { ISSUE_LABEL, essayWords, hasMark, isMachineNote, openComments, readyToGrade } from '../../logic/essay'
import { MarkedEssay } from './MarkedEssay'
import { NoteCard } from './NoteCard'
import { AiWaiting } from './AiWaiting'
import { WordPicker, type WordPick } from './WordPicker'
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
    essayAutoResolve,
    essayProofread,
  } = useStore()

  const [picked, setPicked] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  // Two steps: point at the words, then say what's wrong with them.
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState<WordPick | null>(null)
  // "It found nothing" and "it never ran" look identical on screen otherwise.
  const [ranReview, setRanReview] = useState(false)
  const [showSorted, setShowSorted] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  /**
   * "Where is it?" — scroll the essay back into view and light the mark up for a
   * few seconds. A note that names a word is useless if finding that word in
   * three paragraphs is the reader's problem.
   */
  function goToMark(id: string) {
    sfx.click()
    setPicked(id)
    setFlash(id)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 3000)
    // after this render, so the mark carrying the anchor exists
    requestAnimationFrame(() =>
      document.querySelector(`[data-note="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  // Free and local: anything he visibly fixed closes the moment this opens, so
  // the list is never a pile of things already dealt with.
  useEffect(() => {
    essayAutoResolve(essay.id)
    essayProofread(essay.id) // the rules that need no model, applied on sight
  }, [essay.id, essay.round, essayAutoResolve, essayProofread])

  const open = openComments(essay)
  const canGrade = readyToGrade(essay)
  const reviewed = essay.comments.some((c) => c.round === essay.round)

  // The machine's marks are not the parent's job: spelling, punctuation and
  // capitals are found by the AI and closed by the app. What's left — the
  // writing itself — is the only list worth a person's attention.
  const machine = essay.comments.filter(isMachineNote)
  const machineOpen = machine.filter((c) => c.status === 'open')
  const mine = essay.comments.filter((c) => !isMachineNote(c))

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
        <MarkedEssay essay={essay} comments={essay.comments} selectedId={picked} flashId={flash} onSelect={setPicked} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className="btn btn--blue btn--small"
          style={{ flex: 1 }}
          disabled={!!essayBusy}
          onClick={async () => { sfx.click(); await essayAiReview(essay.id); setRanReview(true) }}
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

      <div className="h2">✍️ My notes — {mine.filter((c) => c.status === 'open').length} open</div>
      {mine.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          Nothing from you yet. Tap words below to say what needs saying about the writing itself.
        </p>
      )}
      {mine.map((c) => (
        <div key={c.id} style={{ marginBottom: 10 }}>
          {editing?.id === c.id ? (
            <EditNote
              text={editing.text}
              onText={(text) => setEditing({ id: c.id, text })}
              onSave={() => { sfx.click(); essayEditComment(essay.id, c.id, editing.text); setEditing(null) }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <NoteCard note={c}>
              {hasMark(essay, c) && (
                <button className="btn btn--ghost btn--small" onClick={() => goToMark(c.id)}>
                  🔎 Go to it
                </button>
              )}
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setEditing({ id: c.id, text: c.text }) }}>
                ✏️ Edit
              </button>
              <button
                className="btn btn--ghost btn--small"
                style={{ color: 'var(--red)' }}
                onClick={() => { sfx.click(); essayDeleteComment(essay.id, c.id) }}
              >
                ✕ Delete
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

      {picking && (
        <WordPicker
          essay={essay}
          onCancel={() => setPicking(false)}
          onPick={(p) => { setPicking(false); setAdding(p) }}
        />
      )}
      {adding && (
        <AddNote
          pick={adding}
          onRepick={() => { setAdding(null); setPicking(true) }}
          onDone={() => setAdding(null)}
          onAdd={(n) => essayAddComment(essay.id, n)}
        />
      )}
      {!picking && !adding && (
        <button className="btn btn--ghost" onClick={() => { sfx.click(); setPicking(true) }}>
          ➕ Add my own note
        </button>
      )}

      {/* Not a to-do list. These are found by the machine and closed by the app
          the moment his text stops containing the problem — the parent never
          ticks off spelling. They're here to be read, or binned if one is wrong. */}
      <div className="h2">🤖 The machine’s marks — {machineOpen.length} still open</div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 10, lineHeight: 1.4 }}>
        Spelling, punctuation and capitals — some from the AI, some from the app’s own rules. They tick themselves off
        as he fixes them; nothing here needs you unless one of them is plain wrong.
      </p>
      {machine.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          {ranReview ? '✅ Nothing misspelled — his mechanics are clean.' : 'Not marked up yet.'}
        </p>
      )}
      {(showSorted ? machine : machineOpen).map((c) => (
        <div key={c.id} style={{ marginBottom: 10 }}>
          {editing?.id === c.id ? (
            <EditNote
              text={editing.text}
              onText={(text) => setEditing({ id: c.id, text })}
              onSave={() => { sfx.click(); essayEditComment(essay.id, c.id, editing.text); setEditing(null) }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <NoteCard note={c}>
              {hasMark(essay, c) && (
                <button className="btn btn--ghost btn--small" onClick={() => goToMark(c.id)}>
                  🔎 Go to it
                </button>
              )}
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
            </NoteCard>
          )}
        </div>
      ))}
      {machine.length > machineOpen.length && (
        <button className="btn btn--ghost btn--small" onClick={() => setShowSorted(!showSorted)}>
          {showSorted ? 'Hide' : 'Show'} the {machine.length - machineOpen.length} he already sorted
        </button>
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

/**
 * The parent's own note. The words are already chosen — copied straight out of
 * his text by the picker, so the quote always matches and always gets marked.
 * All that's left is what kind of problem it is and what to say about it.
 */
function AddNote({
  pick,
  onAdd,
  onDone,
  onRepick,
}: {
  pick: WordPick
  onAdd: (n: Omit<EssayComment, 'id' | 'round' | 'source' | 'status'>) => void
  onDone: () => void
  onRepick: () => void
}) {
  const [issue, setIssue] = useState<EssayIssue>('clarity')
  const [text, setText] = useState('')
  const issues: EssayIssue[] = ['clarity', 'idea', 'praise', 'spelling', 'punctuation', 'case']

  return (
    <div className="card">
      <div className="essay-para-head">
        <span>{pick.para === -1 ? 'Title' : `Paragraph ${pick.para + 1}`}</span>
        <button className="btn btn--ghost btn--small essay-para-x" style={{ color: 'var(--text)' }} onClick={onRepick}>
          ↺ Pick again
        </button>
      </div>
      <div className="essay-note-quote" style={{ marginBottom: 10 }}>
        {pick.quote ? `“${pick.quote}”` : '(the whole thing)'}
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
            onAdd({ para: pick.para, issue, text: text.trim(), ...(pick.quote ? { quote: pick.quote } : {}) })
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

/** Reword a note in place — Ben reads exactly what ends up here. */
function EditNote({
  text,
  onText,
  onSave,
  onCancel,
}: {
  text: string
  onText: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="card">
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Say it your way</label>
        <textarea value={text} onChange={(e) => onText(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn--small" style={{ flex: 1 }} onClick={onSave}>✓ Save</button>
        <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
