// The "teach me properly" layer. When a training answer goes wrong, the
// correction card offers a full-screen lesson: a 2–5 minute read built out of
// typed blocks so it can draw diagrams instead of only talking.
//
// Lessons live in code (src/quiz/lessons.ts), not in the Firestore bank — they
// are long, several questions share one, and the bank is a single document.
import { useEffect, useRef } from 'react'
import type { LessonBlock, LessonNote, QuizLesson } from '../types'
import { sfx } from '../audio'

/** Tiny inline markup so lesson prose can emphasise without a markdown dep: `**bold**` and `` `code` ``. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <b key={i}>{p.slice(2, -2)}</b>
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="lsn-code-inline">{p.slice(1, -1)}</code>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

const NOTE_META: Record<LessonNote, { icon: string; label: string; color: string }> = {
  imagine: { icon: '🌊', label: 'Imagine that…', color: 'var(--blue)' },
  react: { icon: '⚛️', label: 'You already know this (React)', color: 'var(--bronze)' },
  warn: { icon: '⚠️', label: 'Where people get burned', color: 'var(--orange)' },
  key: { icon: '🗝️', label: 'The one thing to remember', color: 'var(--gold)' },
}

function Block({ b }: { b: LessonBlock }) {
  switch (b.kind) {
    case 'p':
      return <p className="lsn-p"><Rich text={b.text} /></p>

    case 'h':
      return <div className="lsn-h">{b.text}</div>

    case 'note': {
      const m = NOTE_META[b.note]
      return (
        <div className="lsn-note" style={{ borderColor: m.color }}>
          <div className="lsn-note-label" style={{ color: m.color }}>
            {m.icon} {m.label}
          </div>
          <div className="lsn-note-body"><Rich text={b.text} /></div>
        </div>
      )
    }

    case 'list':
      return b.ordered ? (
        <ol className="lsn-list">{b.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}</ol>
      ) : (
        <ul className="lsn-list">{b.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}</ul>
      )

    // boxes joined by arrows — the workhorse diagram, wraps on a phone
    case 'flow':
      return (
        <figure className="lsn-fig">
          <div className="lsn-flow">
            {b.steps.map((s, i) => (
              <div key={i} className="lsn-flow-item">
                <div className={`lsn-box lsn-box--${s.tone ?? 'accent'}`}>
                  {s.emoji && <div className="lsn-box-emoji">{s.emoji}</div>}
                  <div className="lsn-box-label">{s.label}</div>
                  {s.sub && <div className="lsn-box-sub">{s.sub}</div>}
                </div>
                {i < b.steps.length - 1 && <div className="lsn-arrow">➜</div>}
              </div>
            ))}
          </div>
          {b.loop && <div className="lsn-loop">↺ {b.loop}</div>}
          {b.caption && <figcaption className="lsn-cap">{b.caption}</figcaption>}
        </figure>
      )

    case 'compare':
      return (
        <figure className="lsn-fig">
          <div className="lsn-compare">
            {[b.left, b.right].map((pane, i) => (
              <div key={i} className={`lsn-pane lsn-pane--${pane.tone ?? 'neutral'}`}>
                <div className="lsn-pane-title">
                  {pane.emoji && <span>{pane.emoji} </span>}
                  {pane.title}
                </div>
                <ul>{pane.items.map((it, j) => <li key={j}><Rich text={it} /></li>)}</ul>
              </div>
            ))}
          </div>
          {b.caption && <figcaption className="lsn-cap">{b.caption}</figcaption>}
        </figure>
      )

    // layered architecture, drawn top-down
    case 'stack':
      return (
        <figure className="lsn-fig">
          <div className="lsn-stack">
            {b.layers.map((l, i) => (
              <div key={i} className="lsn-layer" style={{ opacity: 1 - i * 0.08 }}>
                <div className="lsn-layer-label">{l.label}</div>
                {l.sub && <div className="lsn-layer-sub">{l.sub}</div>}
              </div>
            ))}
          </div>
          {b.caption && <figcaption className="lsn-cap">{b.caption}</figcaption>}
        </figure>
      )

    // proportional bars — for "where the tokens/time/money actually go"
    case 'bars':
      return (
        <figure className="lsn-fig">
          <div className="lsn-bars">
            {b.items.map((it, i) => (
              <div key={i} className="lsn-bar-row">
                <div className="lsn-bar-label">{it.label}</div>
                <div className="lsn-bar-track">
                  <div className="lsn-bar-fill" style={{ width: `${Math.max(2, Math.min(100, it.pct))}%` }} />
                </div>
                <div className="lsn-bar-note">{it.note ?? `${it.pct}%`}</div>
              </div>
            ))}
          </div>
          {b.caption && <figcaption className="lsn-cap">{b.caption}</figcaption>}
        </figure>
      )

    case 'code':
      return (
        <figure className="lsn-fig">
          <pre className="lsn-pre"><code>{b.code}</code></pre>
          {b.caption && <figcaption className="lsn-cap">{b.caption}</figcaption>}
        </figure>
      )

    case 'table':
      return (
        <figure className="lsn-fig">
          <div className="lsn-table-wrap">
            <table className="lsn-table">
              <thead>
                <tr>{b.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.caption && <figcaption className="lsn-cap">{b.caption}</figcaption>}
        </figure>
      )
  }
}

/**
 * Full-screen lesson reader. `onDone` is the "got it" exit — the caller decides
 * whether that means "next question" or "back to the list".
 */
export function LessonView({ lesson, onDone, doneLabel = 'Got it — next question ➜' }: {
  lesson: QuizLesson
  onDone: () => void
  doneLabel?: string
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [lesson.id])

  return (
    <div className="quiz-full">
      <div className="quiz-full-head">
        <div style={{ fontWeight: 900, flex: 1, fontSize: 15 }}>
          {lesson.emoji} {lesson.title}
        </div>
        <button className="btn btn--ghost btn--small" style={{ whiteSpace: 'nowrap' }} onClick={() => { sfx.click(); onDone() }}>
          ✕ Close
        </button>
      </div>
      <div className="quiz-full-body lsn-body" ref={bodyRef}>
        <div className="lsn-meta">📖 about {lesson.minutes} min read</div>
        {lesson.blocks.map((b, i) => <Block key={i} b={b} />)}
        <button className="btn" style={{ marginTop: 18 }} onClick={() => { sfx.click(); onDone() }}>
          {doneLabel}
        </button>
      </div>
    </div>
  )
}
