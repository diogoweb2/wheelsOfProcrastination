// 🖍️ The red pen — marking by hand, and nothing else.
//
// The desk is a list of things to decide. This is the opposite: his text fills
// the screen and never leaves it, every tap does one thing, and nothing here
// navigates anywhere. Tap a word to start a note, tap the last word to end it,
// write it, done — the text is still there underneath with the new mark on it,
// ready for the next one.
//
// Every mark already on the essay is visible while marking, because the whole
// point of seeing the machine's marks is not writing the same note twice: tap
// one and it opens as a popup with the reviewer's usual last word — reword it,
// or bin it.
//
// And round five looks like round four unless the app says otherwise: the words
// he changed since the last hand-in are painted red, and the rounds before this
// one can be read back, so "he fixed two things and I can't see where" stops
// being the reviewer's problem.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Essay, EssayComment, EssayIssue } from '../../types'
import {
  ISSUE_DEFAULT_NOTE,
  ISSUE_EMOJI,
  ISSUE_LABEL,
  essayWords,
  isMachineNote,
  issueTint,
  markSpans,
  openComments,
  partText,
} from '../../logic/essay'
import {
  changedCount,
  changedParts,
  draftAt,
  draftBefore,
  draftParts,
  revisions,
  tokenize,
  type Token,
} from '../../logic/essayDiff'
import { sfx } from '../../audio'

/**
 * The words picked out for a new note: which part they're in, the exact text,
 * and where in that part he tapped. The offsets matter: a short quote like "i"
 * occurs all over a paragraph, so looking the text up again would land on the
 * wrong one (the "i" inside "friends") and blame a note somewhere else.
 */
interface Pick {
  para: number // -1 = the title
  quote: string // '' = the whole part
  start: number
  end: number
}

export function FocusReview({ onDesk }: { onDesk: () => void }) {
  const { essays, essayDeskId, essaySetDeskEssay } = useStore()
  const essay = essays.find((e) => e.id === essayDeskId)
  if (essay) return <Focus key={essay.id} essay={essay} onDesk={onDesk} />

  // Nothing picked yet (a bookmark straight to /essay/pen, or he came back after
  // sending one off). Same two lists as the desk, one tap in.
  const waiting = essays.filter((e) => e.status === 'submitted').reverse()
  const rest = essays.filter((e) => e.status === 'returned' || e.status === 'writing').reverse()

  return (
    <>
      <div className="h2">🖍️ Which one are you marking?</div>
      {waiting.length === 0 && rest.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>Nothing handed in right now.</p>
      )}
      {[...waiting, ...rest].map((e) => (
        <div
          className="card"
          key={e.id}
          style={{ marginBottom: 10, opacity: e.status === 'submitted' ? 1 : 0.75 }}
          onClick={() => { sfx.click(); essaySetDeskEssay(e.id) }}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>{e.title || '(no title)'}</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 800, marginTop: 3 }}>
            {e.authorName} · round {e.round} · {essayWords(e)} words ·{' '}
            {e.status === 'submitted' ? 'waiting on you' : e.status}
          </div>
        </div>
      ))}
    </>
  )
}

function Focus({ essay, onDesk }: { essay: Essay; onDesk: () => void }) {
  const { essayAddComment, essayEditComment, essayDeleteComment, essayResolveComment, essayAutoResolve, essayProofread } =
    useStore()

  // Two taps make a note: the first word, then the last one.
  const [anchor, setAnchor] = useState<{ para: number; index: number } | null>(null)
  const [pick, setPick] = useState<Pick | null>(null)
  // Where the tap landed as well as which note it hit: a second problem can sit
  // on the same words, so the popup has to be able to hand the word back.
  const [peek, setPeek] = useState<{ id: string; para: number; index: number } | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)
  // Which round is on screen (null = the text as it stands now) and whether his
  // changes are painted. Both stay on by default: the whole reason to open this
  // on round five is to see the two words that moved.
  const [viewRound, setViewRound] = useState<number | null>(null)
  const [showDiff, setShowDiff] = useState(true)

  // Same free housekeeping the desk does on open: close what he visibly fixed,
  // re-run the rules. Marking a stale list is worse than not marking at all.
  useEffect(() => {
    essayAutoResolve(essay.id)
    essayProofread(essay.id)
  }, [essay.id, essay.round, essayAutoResolve, essayProofread])

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  // Every round there's a snapshot for, plus the one he's on now.
  const rounds = useMemo(
    () => [...new Set([...revisions(essay).map((v) => v.round), essay.round])].sort((a, b) => a - b),
    [essay],
  )
  const round = viewRound ?? essay.round
  const past = round < essay.round // an old round is read-only: it's history
  const draft = draftAt(essay, round)
  const previous = draftBefore(essay, round)

  const parts = useMemo(() => draftParts(draft), [draft])
  const diff = useMemo(() => changedParts(draft, previous), [draft, previous])
  const newWords = changedCount(diff)
  const paint = showDiff && newWords > 0
  const at = rounds.indexOf(round)

  // Reading an old round while half a note is in progress makes no sense — the
  // words being marked are on a different page.
  function goRound(r: number | null) {
    sfx.click()
    setAnchor(null)
    setPeek(null)
    setViewRound(r)
    window.scrollTo({ top: 0 })
  }

  /** Straight to the first word he changed — the whole point of the red. */
  function goToChange() {
    sfx.click()
    setShowDiff(true)
    requestAnimationFrame(() =>
      document.querySelector('[data-new="1"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  const peeked = essay.comments.find((c) => c.id === peek?.id)
  const open = openComments(essay)
  const mine = essay.comments.filter((c) => !isMachineNote(c))
  const machineOpen = essay.comments.filter((c) => isMachineNote(c) && c.status === 'open')

  /** A tap on a word: open what's already there, or start / finish a selection. */
  function tapWord(para: number, tokens: Token[], index: number, comment?: EssayComment) {
    sfx.click()
    if (!anchor) {
      // Something is already flagged here — say what it is first, rather than
      // letting the same problem get a second note by accident. The popup still
      // offers "new note here" for when it's a different problem on the same
      // words, or when that mark is already sorted.
      if (comment) {
        setPeek({ id: comment.id, para, index })
        return
      }
      setAnchor({ para, index })
      return
    }
    if (anchor.para !== para) {
      setAnchor({ para, index }) // a note can't straddle two paragraphs
      return
    }
    const from = Math.min(anchor.index, index)
    const to = Math.max(anchor.index, index)
    const text = parts.find((p) => p.para === para)!.text
    setAnchor(null)
    setPick({
      para,
      quote: text.slice(tokens[from].start, tokens[to].end),
      start: tokens[from].start,
      end: tokens[to].end,
    })
  }

  function goToMark(id: string) {
    setPeek(null)
    setFlash(id)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 3000)
    requestAnimationFrame(() =>
      document.querySelector(`[data-note="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  return (
    <>
      <div className="card fw-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {essay.title || '(no title)'}
            </div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 800, marginTop: 2 }}>
              {essay.authorName} · round {essay.round} · ✍️ {mine.length} yours · 🤖 {machineOpen.length} machine ·{' '}
              {open.length} open
            </div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.click(); onDesk() }}>
            ✓ Done
          </button>
        </div>

        {/* Which draft is on screen, and what he changed to get to it. One row,
            in the sticky header, because it answers "where did he fix it?" —
            the question the reviewer arrives with. */}
        {rounds.length > 1 && (
          <div className="fw-rounds">
            <button
              className="btn btn--ghost btn--small"
              disabled={at <= 0}
              onClick={() => goRound(rounds[at - 1])}
            >
              ◀ round {rounds[Math.max(at - 1, 0)]}
            </button>
            <span className={past ? 'fw-rounds-at is-past' : 'fw-rounds-at'}>
              {past ? `round ${round} · read-only` : `round ${round} · now`}
            </span>
            <button
              className="btn btn--ghost btn--small"
              disabled={at < 0 || at >= rounds.length - 1}
              onClick={() => goRound(rounds[at + 1] === essay.round ? null : rounds[at + 1])}
            >
              round {rounds[Math.min(at + 1, rounds.length - 1)]} ▶
            </button>
          </div>
        )}

        {previous && (
          <div className="fw-rounds">
            {newWords === 0 ? (
              <span className="fw-rounds-at">nothing changed since round {round - 1}</span>
            ) : (
              <>
                <button className={`fw-diff-toggle${paint ? ' is-on' : ''}`} onClick={() => { sfx.click(); setShowDiff(!showDiff) }}>
                  🔴 {newWords} word{newWords === 1 ? '' : 's'} changed
                </button>
                <button className="btn btn--ghost btn--small" onClick={goToChange}>🔎 Find it</button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="muted fw-hint">
        {past ? (
          <>
            This is round {round} as he handed it in, with the notes it got — nothing here can be changed.{' '}
            <button className="btn btn--ghost btn--small" onClick={() => goRound(null)}>↩︎ Back to now</button>
          </>
        ) : (
          <>
            Tap the first word of the bit you mean, then the last one — same word twice is just that word. Tap something
            already marked to read it, reword it, bin it — or start a new note right there.
          </>
        )}
      </p>

      <div className="card fw-text">
        {parts.map((part) => {
          const tokens = tokenize(part.text)
          // An old round shows the notes IT got; now shows every note there is.
          const onPart = essay.comments.filter((c) => c.para === part.para && (!past || c.round === round))
          const spans = markSpans(part.text, onPart)
          const commentAt = (t: Token) => spans.find((s) => s.start < t.end && t.start < s.end)?.comment
          const isNew = diff.get(part.para) ?? []
          return (
            <div key={part.para} style={{ marginBottom: 14 }}>
              <div className="essay-para-head">
                <span>{part.label}</span>
                {!past && (
                  <button
                    className="btn btn--ghost btn--small essay-para-x"
                    style={{ color: 'var(--text)' }}
                    onClick={() => {
                      sfx.click()
                      setAnchor(null)
                      // no quote: the note is about the whole part, so the span it
                      // "covers" for the already-marked check is all of it
                      setPick({ para: part.para, quote: '', start: 0, end: part.text.length })
                    }}
                  >
                    📌 Whole thing
                  </button>
                )}
              </div>
              <p className={part.para === -1 ? 'fw-part fw-part--title' : 'fw-part'}>
                {tokens.length === 0 && <span className="muted">(empty)</span>}
                {tokens[0] && part.text.slice(0, tokens[0].start)}
                {tokens.map((t, i) => {
                  const c = commentAt(t)
                  const after = tokens[i + 1]
                  // the emoji goes on the last word the note covers, once
                  const last = c && (!after || commentAt(after) !== c)
                  const picked = anchor?.para === part.para && anchor.index === i
                  return (
                    <Fragment key={i}>
                      <span
                        className={[
                          'fw-word',
                          past ? 'fw-word--read' : '',
                          c ? 'fw-word--marked' : '',
                          c?.status === 'fixed' ? 'fw-word--done' : '',
                          paint && isNew[i] ? 'fw-word--new' : '',
                          picked ? 'is-anchor' : '',
                          flash && c?.id === flash ? 'is-flash' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={c ? ({ '--mark': issueTint(c.issue) } as React.CSSProperties) : undefined}
                        {...(c ? { 'data-note': c.id } : {})}
                        {...(paint && isNew[i] ? { 'data-new': '1' } : {})}
                        onClick={past ? undefined : () => tapWord(part.para, tokens, i, c)}
                      >
                        {t.text}
                        {c && last && <sup>{ISSUE_EMOJI[c.issue]}</sup>}
                      </span>
                      {part.text.slice(t.end, tokens[i + 1]?.start ?? part.text.length)}
                    </Fragment>
                  )
                })}
              </p>
            </div>
          )
        })}
      </div>

      {/* Half a note in progress. It sits above the tab bar, in reach of a thumb,
          and it's the only way out of a mis-tap. */}
      {anchor && (
        <div className="fw-bar">
          <span>👉 Now tap the LAST word</span>
          <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setAnchor(null) }}>
            Cancel
          </button>
        </div>
      )}

      {pick && (
        <AddNoteSheet
          essay={essay}
          pick={pick}
          onClose={() => setPick(null)}
          onAdd={(n) => essayAddComment(essay.id, n)}
        />
      )}

      {peeked && (
        <NoteSheet
          note={peeked}
          onClose={() => setPeek(null)}
          onEdit={(text) => essayEditComment(essay.id, peeked.id, text)}
          onDelete={() => { essayDeleteComment(essay.id, peeked.id); setPeek(null) }}
          onResolve={(fixed) => essayResolveComment(essay.id, peeked.id, fixed)}
          onFind={() => goToMark(peeked.id)}
          onMarkAnyway={() => {
            // hand the tapped word back as the first word of a fresh selection
            if (peek) setAnchor({ para: peek.para, index: peek.index })
            setPeek(null)
          }}
        />
      )}
    </>
  )
}

/**
 * The note itself. The words are already chosen — sliced straight out of his
 * text, so the quote always matches and always gets marked — which leaves two
 * taps and a sentence.
 *
 * It opens from the bottom on purpose: his text stays on screen above it, which
 * is what you are actually looking at while deciding what to say.
 */
function AddNoteSheet({
  essay,
  pick,
  onAdd,
  onClose,
}: {
  essay: Essay
  pick: Pick
  onAdd: (n: Omit<EssayComment, 'id' | 'round' | 'source' | 'status'>) => void
  onClose: () => void
}) {
  const [issue, setIssue] = useState<EssayIssue>('clarity')
  const [text, setText] = useState('')
  const issues: EssayIssue[] = ['clarity', 'idea', 'praise', 'spelling', 'punctuation', 'case']

  // Anything the AI or the rules already said about these exact words. Two notes
  // on one problem is how a reviewer wastes his own evening.
  const already = useMemo(() => {
    if (!pick.quote) return essay.comments.filter((c) => c.para === pick.para && c.status === 'open')
    const part = partText(essay, pick.para)
    return markSpans(part, essay.comments.filter((c) => c.para === pick.para))
      .filter((s) => s.start < pick.end && pick.start < s.end)
      .map((s) => s.comment)
  }, [essay, pick])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="essay-para-head" style={{ marginBottom: 8 }}>
          <span>{pick.para === -1 ? 'Title' : `Paragraph ${pick.para + 1}`}</span>
        </div>
        <div className="essay-note-quote" style={{ fontSize: 15 }}>
          {pick.quote ? `“${pick.quote}”` : '(the whole paragraph)'}
        </div>

        {already.length > 0 && (
          <div className="fw-already">
            <strong>⚠️ Already marked here:</strong>
            {already.map((c) => (
              <div key={c.id} style={{ marginTop: 4 }}>
                {c.source === 'app' ? '📏' : c.source === 'ai' ? '🤖' : '👨‍👦'} {c.text}
              </div>
            ))}
          </div>
        )}

        <div className="fw-kinds">
          {issues.map((i) => (
            <button
              key={i}
              className={`fw-kind${issue === i ? ' is-on' : ''}`}
              style={{ '--mark': issueTint(i) } as React.CSSProperties}
              onClick={() => { sfx.click(); setIssue(i) }}
            >
              {ISSUE_EMOJI[i]} {ISSUE_LABEL[i]}
            </button>
          ))}
        </div>

        <div className="field">
          <label>The note — optional (he reads this exactly as written)</label>
          <textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ISSUE_DEFAULT_NOTE[issue]}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn--small"
            style={{ flex: 1 }}
            onClick={() => {
              sfx.click()
              // Nothing typed: the kind of mark says it on its own.
              const note = text.trim() || ISSUE_DEFAULT_NOTE[issue]
              onAdd({
                para: pick.para,
                issue,
                text: note,
                // the offset goes with the quote, so "a" means the "a" he tapped
                ...(pick.quote ? { quote: pick.quote, at: pick.start } : {}),
              })
              onClose()
            }}
          >
            ➕ Add it
          </button>
          <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * A mark that's already there, opened by tapping it. The reviewer has the last
 * word on the machine's notes as well as his own: keep it, say it his way, or
 * bin it so Ben never sees it.
 */
function NoteSheet({
  note,
  onClose,
  onEdit,
  onDelete,
  onResolve,
  onFind,
  onMarkAnyway,
}: {
  note: EssayComment
  onClose: () => void
  onEdit: (text: string) => void
  onDelete: () => void
  onResolve: (fixed: boolean) => void
  onFind: () => void
  onMarkAnyway: () => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const machine = isMachineNote(note)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="essay-note-head">
          <span className="chip" style={{ background: issueTint(note.issue), color: '#10230a' }}>
            {ISSUE_EMOJI[note.issue]} {ISSUE_LABEL[note.issue]}
          </span>
          {note.source === 'parent' && <span className="chip">👨‍👦 Yours</span>}
          {note.source === 'ai' && <span className="chip">🤖 AI</span>}
          {note.source === 'app' && <span className="chip">📏 rule</span>}
          {note.edited && <span className="chip">✏️ edited</span>}
          {note.status === 'fixed' && (
            <span className="chip" style={{ background: 'var(--green)', color: '#0c2338' }}>✓ sorted</span>
          )}
        </div>
        {note.quote && <div className="essay-note-quote" style={{ fontSize: 15 }}>“{note.quote}”</div>}

        {editing === null ? (
          <div className="essay-note-text">{note.text}</div>
        ) : (
          <div className="field" style={{ marginTop: 8 }}>
            <label>Say it your way</label>
            <textarea autoFocus rows={3} value={editing} onChange={(e) => setEditing(e.target.value)} />
          </div>
        )}

        {note.aiVerdict && note.status === 'open' && (
          <div className="essay-note-verdict">
            {note.aiVerdict === 'fixed' ? '🤖 looks fixed' : '🤖 still not fixed'}
            {note.aiNote ? ` — ${note.aiNote}` : ''}
          </div>
        )}

        <div className="essay-note-actions" style={{ marginTop: 12 }}>
          {editing === null ? (
            <>
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setEditing(note.text) }}>
                ✏️ Edit
              </button>
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); onFind() }}>
                🔎 Find it
              </button>
              {/* One set of words can have two things wrong with it, and a
                  sorted mark shouldn't lock the words up for good. */}
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); onMarkAnyway() }}>
                ✍️ New note here
              </button>
              {note.issue !== 'praise' && (
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => { sfx.click(); onResolve(note.status !== 'fixed'); onClose() }}
                >
                  {note.status === 'fixed' ? '↩︎ Reopen' : '✓ He fixed it'}
                </button>
              )}
              <button
                className="btn btn--ghost btn--small"
                style={{ color: 'var(--red)' }}
                onClick={() => { sfx.click(); onDelete() }}
              >
                {machine ? '✕ Disagree' : '✕ Delete'}
              </button>
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); onClose() }}>
                Close
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn--small"
                onClick={() => { sfx.click(); onEdit(editing); setEditing(null) }}
                disabled={!editing.trim()}
              >
                ✓ Save
              </button>
              <button className="btn btn--ghost btn--small" onClick={() => setEditing(null)}>Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
