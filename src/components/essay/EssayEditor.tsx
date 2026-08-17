// The writing surface: a title, one box per paragraph, and our own keyboard.
//
// Every field is `inputMode="none"` with spellcheck, autocorrect and
// autocapitalise all off, so no phone keyboard opens and nothing is fixed
// behind his back. `<PenKeyboard>` edits the focused field directly through the
// DOM (value + caret), which is what keeps typing feeling instant even though
// the text lives in React state above.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { PenKeyboard, type KeyPress } from './PenKeyboard'
import { wordCount } from '../../logic/essay'
import { sfx } from '../../audio'

export function EssayEditor({
  title,
  paragraphs,
  minWords,
  onTitle,
  onParagraph,
  onAddParagraph,
  onRemoveParagraph,
  renderNotes,
}: {
  title: string
  paragraphs: string[]
  minWords: number
  onTitle: (v: string) => void
  onParagraph: (index: number, v: string) => void
  onAddParagraph: () => void
  onRemoveParagraph: (index: number) => void
  /** Fix phase: the notes for one part, drawn right under the box he has to change (-1 = title). */
  renderNotes?: (part: number) => ReactNode
}) {
  const fields = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({})
  const [focused, setFocused] = useState<string | null>(null)
  // where the caret has to land once React has re-rendered the new value
  const caretAfterRender = useRef<{ key: string; at: number } | null>(null)
  // the text each box was last measured at, so we only re-measure what changed
  const measured = useRef<Record<string, string>>({})

  // Each paragraph box grows to fit its text. Measuring means collapsing it to
  // `auto` first, and that shrinks the page for an instant — long enough for the
  // browser to clamp the scroll position, which left the whole screen nudged up
  // and down on every single keypress. So: never measure a box whose text
  // hasn't changed, and put the scroll back where it was afterwards.
  useLayoutEffect(() => {
    const boxes = Object.entries(fields.current).filter(
      ([key, el]) => el instanceof HTMLTextAreaElement && (measured.current[key] !== el.value || !el.style.height),
    ) as [string, HTMLTextAreaElement][]
    if (!boxes.length) return

    const y = window.scrollY
    for (const [key, el] of boxes) {
      measured.current[key] = el.value
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    if (window.scrollY !== y) window.scrollTo(0, y)
  })

  useLayoutEffect(() => {
    const pending = caretAfterRender.current
    if (!pending) return
    caretAfterRender.current = null
    const el = fields.current[pending.key]
    if (!el) return
    // Some browsers hand focus to the key that was tapped; take it back so the
    // caret stays visible where he is actually typing.
    el.focus({ preventScroll: true })
    el.setSelectionRange(pending.at, pending.at)
  })

  const words = paragraphs.reduce((n, p) => n + wordCount(p), 0)
  const pct = Math.min(100, Math.round((words / Math.max(1, minWords)) * 100))

  function push(key: string, value: string) {
    if (key === 'title') onTitle(value)
    else onParagraph(Number(key.slice(1)), value)
  }

  /** Apply one keypress to whichever field has the caret. */
  function handleKey(k: KeyPress) {
    const key = focused
    const el = key ? fields.current[key] : null
    if (!key || !el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start

    if (k.kind === 'backspace') {
      // a selection is deleted whole; otherwise one character back
      const from = start === end ? Math.max(0, start - 1) : start
      if (from === end) return
      push(key, el.value.slice(0, from) + el.value.slice(end))
      caretAfterRender.current = { key, at: from }
      return
    }

    // The title is one line: Enter jumps down into the writing instead of
    // stuffing a newline into it. Inside a paragraph it's a plain line break —
    // a NEW paragraph is a deliberate button press, not an accident of Enter.
    if (k.kind === 'enter' && key === 'title') {
      fields.current.p0?.focus()
      return
    }
    const text = k.kind === 'enter' ? '\n' : k.value
    push(key, el.value.slice(0, start) + text + el.value.slice(end))
    caretAfterRender.current = { key, at: start + text.length }
  }

  /** Shared props: no OS keyboard, no autocorrect, no spellcheck underlines. */
  const noHelp = {
    inputMode: 'none' as const,
    spellCheck: false,
    autoCorrect: 'off',
    autoCapitalize: 'off',
    autoComplete: 'off',
    'data-gramm': 'false',
  }

  return (
    <>
      <div className="field">
        <label>Title</label>
        <input
          {...noHelp}
          type="text"
          ref={(el) => { fields.current.title = el }}
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          onFocus={() => setFocused('title')}
          placeholder="Give your essay a title"
        />
        {renderNotes?.(-1)}
      </div>

      {paragraphs.map((p, i) => (
        <div className="essay-para" key={i}>
          <div className="essay-para-head">
            <span>Paragraph {i + 1}</span>
            <span className="muted" style={{ fontSize: 11 }}>{wordCount(p)} words</span>
            {paragraphs.length > 1 && (
              <button
                className="btn btn--ghost btn--small essay-para-x"
                onClick={() => { sfx.click(); onRemoveParagraph(i) }}
                aria-label={`Delete paragraph ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
          <textarea
            {...noHelp}
            ref={(el) => { fields.current[`p${i}`] = el }}
            value={p}
            onChange={(e) => onParagraph(i, e.target.value)}
            onFocus={() => setFocused(`p${i}`)}
            placeholder={i === 0 ? 'Start writing here…' : 'Keep going…'}
            rows={4}
          />
          {renderNotes?.(i)}
        </div>
      ))}

      <button className="btn btn--ghost" onClick={() => { sfx.click(); onAddParagraph() }} style={{ marginTop: 4 }}>
        ➕ Add paragraph
      </button>

      <div className="essay-meter">
        <div className="essay-meter-bar"><span style={{ width: `${pct}%` }} /></div>
        <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
          {words} / {minWords} words
        </div>
      </div>

      {focused && <PenKeyboard onKey={handleKey} onHide={() => { fields.current[focused]?.blur(); setFocused(null) }} />}
      {/* room under the last field so the keyboard never covers what he's typing */}
      {focused && <div style={{ height: 300 }} />}
    </>
  )
}
