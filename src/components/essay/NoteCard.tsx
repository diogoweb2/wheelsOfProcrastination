// One note on an essay, drawn the same way on both sides of the desk: the
// reviewer sees it with buttons, the writer sees it plain. Same card either way,
// so what Dad approves is literally what Ben reads.
import type { ReactNode } from 'react'
import type { EssayComment } from '../../types'
import { ISSUE_EMOJI, ISSUE_LABEL, issueTint } from '../../logic/essay'

export function NoteCard({ note, children }: { note: EssayComment; children?: ReactNode }) {
  const done = note.status === 'fixed'
  return (
    <div className="essay-note" style={{ '--mark': issueTint(note.issue), opacity: done ? 0.62 : 1 } as React.CSSProperties}>
      <div className="essay-note-head">
        <span className="chip" style={{ background: issueTint(note.issue), color: '#10230a' }}>
          {ISSUE_EMOJI[note.issue]} {ISSUE_LABEL[note.issue]}
        </span>
        {note.source === 'parent' && <span className="chip">👨‍👦 Dad</span>}
        {note.edited && <span className="chip">✏️ edited</span>}
        {done && <span className="chip" style={{ background: 'var(--green)', color: '#0c2338' }}>✓ sorted</span>}
      </div>
      {note.quote && <div className="essay-note-quote">“{note.quote}”</div>}
      <div className="essay-note-text">{note.text}</div>
      {note.aiVerdict && !done && (
        <div className="essay-note-verdict">
          {note.aiVerdict === 'fixed' ? '🤖 looks fixed' : '🤖 still not fixed'}
          {note.aiNote ? ` — ${note.aiNote}` : ''}
        </div>
      )}
      {children && <div className="essay-note-actions">{children}</div>}
    </div>
  )
}
