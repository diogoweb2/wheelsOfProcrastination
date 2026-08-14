// Point at the words instead of retyping them.
//
// Writing a note used to mean copying his sentence into a text field character
// for character, and a quote that doesn't match exactly never gets circled — so
// the fiddliest part of reviewing was also the part most likely to silently
// fail. Here you tap the first word and then the last one; the same word twice
// is a single-word note.
import { useMemo, useState } from 'react'
import type { Essay } from '../../types'
import { sfx } from '../../audio'

export interface WordPick {
  para: number // -1 = the title
  quote: string
}

interface Token {
  text: string
  start: number
  end: number
}

function tokenize(text: string): Token[] {
  return [...text.matchAll(/\S+/g)].map((m) => ({ text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
}

export function WordPicker({ essay, onPick, onCancel }: { essay: Essay; onPick: (p: WordPick) => void; onCancel: () => void }) {
  const [anchor, setAnchor] = useState<{ para: number; index: number } | null>(null)
  const parts = useMemo(
    () => [{ para: -1, text: essay.title, label: 'Title' }, ...essay.paragraphs.map((p, i) => ({ para: i, text: p, label: `Paragraph ${i + 1}` }))],
    [essay],
  )

  function tap(para: number, tokens: Token[], index: number) {
    sfx.click()
    // A tap in a different paragraph starts over — a note can't straddle two.
    if (!anchor || anchor.para !== para) {
      setAnchor({ para, index })
      return
    }
    const from = Math.min(anchor.index, index)
    const to = Math.max(anchor.index, index)
    const text = parts.find((p) => p.para === para)!.text
    setAnchor(null)
    onPick({ para, quote: text.slice(tokens[from].start, tokens[to].end) })
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 900, fontSize: 14 }}>
        {anchor ? '👉 Now tap the LAST word (same word = just that one)' : '👉 Tap the first word of the bit you mean'}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Or take the whole paragraph with the 📌 button.
      </p>

      {parts.map((part) => {
        const tokens = tokenize(part.text)
        return (
          <div key={part.para} style={{ marginTop: 12 }}>
            <div className="essay-para-head">
              <span>{part.label}</span>
              <button
                className="btn btn--ghost btn--small essay-para-x"
                style={{ color: 'var(--text)' }}
                onClick={() => { sfx.click(); onPick({ para: part.para, quote: '' }) }}
              >
                📌 Whole thing
              </button>
            </div>
            <p className={part.para === -1 ? 'essay-read-title' : 'essay-read-para'}>
              {tokens.length === 0 && <span className="muted">(empty)</span>}
              {tokens.map((t, i) => (
                <span
                  key={i}
                  className={`wp-word${anchor?.para === part.para && anchor.index === i ? ' is-anchor' : ''}`}
                  onClick={() => tap(part.para, tokens, i)}
                >
                  {t.text}{' '}
                </span>
              ))}
            </p>
          </div>
        )
      })}

      <button className="btn btn--ghost btn--small" style={{ marginTop: 12 }} onClick={() => { sfx.click(); onCancel() }}>
        Cancel
      </button>
    </div>
  )
}
