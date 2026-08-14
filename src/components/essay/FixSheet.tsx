// Fixing one mark, in a sheet over his own essay (§19e-5).
//
// The whole editor used to come back for round two, which meant a 12-year-old
// looking at four paragraphs and a list of notes, hunting for the word each one
// was about. Here he taps the circled word and gets exactly that word — plus, for
// anything that isn't spelling, the sentence around it, because "hard to follow"
// is almost never fixable inside the three words that were marked.
//
// Before and after sit one above the other, so he can see what he changed before
// he commits to it.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { EssayComment } from '../../types'
import { ISSUE_EMOJI, ISSUE_LABEL, editWindow, issueTint, markSpans } from '../../logic/essay'
import { PenKeyboard, type KeyPress } from './PenKeyboard'
import { sfx } from '../../audio'

export function FixSheet({
  note,
  part,
  onSave,
  onClose,
}: {
  note: EssayComment
  /** The paragraph (or title) this note points at, as it reads right now. */
  part: string
  /** The whole part back again, with his fix spliced in. */
  onSave: (nextPart: string) => void
  onClose: () => void
}) {
  // Where the mark is, and how much room around it he gets. A note whose quote
  // has drifted out of the text (he already rewrote that bit) opens the lot —
  // there's nothing left to point at, so narrowing it would only hide things.
  const win = useMemo(() => {
    const span = markSpans(part, [note])[0]
    if (!span) return { start: 0, end: part.length, mark: null as null | { start: number; end: number } }
    return { ...editWindow(part, span, note.issue), mark: { start: span.start, end: span.end } }
  }, [part, note])

  const before = part.slice(win.start, win.end)
  const [text, setText] = useState(before)
  const [typing, setTyping] = useState(false)
  const box = useRef<HTMLTextAreaElement | null>(null)
  const caretAfterRender = useRef<number | null>(null)

  useLayoutEffect(() => {
    const at = caretAfterRender.current
    if (at === null) return
    caretAfterRender.current = null
    box.current?.focus({ preventScroll: true })
    box.current?.setSelectionRange(at, at)
  })

  /** Same keyboard as the editor — no autocorrect, ever (§19d). */
  function handleKey(k: KeyPress) {
    const el = box.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    if (k.kind === 'backspace') {
      const from = start === end ? Math.max(0, start - 1) : start
      if (from === end) return
      setText(el.value.slice(0, from) + el.value.slice(end))
      caretAfterRender.current = from
      return
    }
    // A line break inside one sentence is never what he meant here.
    const ch = k.kind === 'enter' ? ' ' : k.value
    setText(el.value.slice(0, start) + ch + el.value.slice(end))
    caretAfterRender.current = start + ch.length
  }

  const changed = text !== before
  const tint = issueTint(note.issue)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="essay-note-head">
          <span className="chip" style={{ background: tint, color: '#10230a' }}>
            {ISSUE_EMOJI[note.issue]} {ISSUE_LABEL[note.issue]}
          </span>
          <span className="chip">{note.para === -1 ? 'Title' : `Paragraph ${note.para + 1}`}</span>
          {note.source === 'parent' && <span className="chip">👨‍👦 Dad</span>}
          {note.source === 'app' && <span className="chip">📏 rule</span>}
        </div>

        <div className="essay-note" style={{ '--mark': tint } as React.CSSProperties}>
          <div className="essay-note-text">{note.text}</div>
          {note.aiVerdict === 'unfixed' && (
            <div className="essay-note-verdict">🤖 still not fixed{note.aiNote ? ` — ${note.aiNote}` : ''}</div>
          )}
        </div>

        <div className="fix-label">Before</div>
        <div className="fix-before">
          {win.mark ? (
            <>
              {part.slice(win.start, win.mark.start)}
              <mark className="essay-mark" style={{ '--mark': tint } as React.CSSProperties}>
                {part.slice(win.mark.start, win.mark.end)}
              </mark>
              {part.slice(win.mark.end, win.end)}
            </>
          ) : (
            before
          )}
        </div>

        <div className="fix-label">
          Your fix
          <span className="muted" style={{ fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>
            {' '}
            — change only this bit
          </span>
        </div>
        <textarea
          ref={(el) => {
            box.current = el
            if (el) {
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }
          }}
          className="fix-box"
          inputMode="none"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          data-gramm="false"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setTyping(true)}
        />

        <div className="fix-label">After</div>
        <div className={`fix-after${changed ? ' is-changed' : ''}`}>
          {text.trim() ? text : <span className="muted">(nothing there yet)</span>}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            className="btn btn--small"
            style={{ flex: 1 }}
            disabled={!changed}
            onClick={() => {
              sfx.gem()
              onSave(part.slice(0, win.start) + text + part.slice(win.end))
              onClose()
            }}
          >
            ✅ Save this fix
          </button>
          <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); onClose() }}>
            Cancel
          </button>
        </div>

        {typing && (
          <>
            <PenKeyboard onKey={handleKey} onHide={() => { box.current?.blur(); setTyping(false) }} />
            {/* room under the buttons so the keyboard never covers them */}
            <div style={{ height: 300 }} />
          </>
        )}
      </div>
    </div>
  )
}
