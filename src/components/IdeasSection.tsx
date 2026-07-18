import { useState } from 'react'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'

/**
 * The crew's shared idea board (Firestore app/ideas). Both crewmates see and
 * edit the same list, so every idea carries the name of whoever wrote it.
 */
export function IdeasSection() {
  const { ideas, addIdea, toggleIdea, deleteIdea, activeProfile } = useStore()
  const [draft, setDraft] = useState('')
  const me = activeProfile()

  // open ideas first (newest at the top), done ones sink to the bottom
  const open = ideas.filter((i) => !i.done).reverse()
  const done = ideas.filter((i) => i.done).reverse()

  function submit() {
    if (!draft.trim()) {
      sfx.error()
      return
    }
    addIdea(draft)
    setDraft('')
    sfx.gem()
  }

  return (
    <>
      <div className="h2">💡 Idea board — {open.length} open</div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>New idea{me ? ` — as ${me.name}` : ''}</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What should we build? The more detail the better — what it does, why it's cool, how it should look…"
          />
        </div>
        <button className="btn btn--blue" disabled={!me || !draft.trim()} onClick={submit}>
          ➕ Add idea
        </button>
      </div>

      {ideas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>🗒️</div>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            No ideas yet. Someone has to go first!
          </p>
        </div>
      ) : (
        [...open, ...done].map((idea) => (
          <div
            key={idea.id}
            className="card"
            style={{ marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start', opacity: idea.done ? 0.55 : 1 }}
          >
            <button
              className="btn btn--ghost btn--small"
              style={{ flexShrink: 0, minWidth: 40 }}
              onClick={() => {
                sfx.click()
                toggleIdea(idea.id)
              }}
              aria-label={idea.done ? 'Mark as not done' : 'Mark as done'}
            >
              {idea.done ? '✅' : '⬜'}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  textDecoration: idea.done ? 'line-through' : 'none',
                }}
              >
                {idea.text}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {idea.authorName} · {new Date(idea.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <button
              className="btn btn--ghost btn--small"
              style={{ flexShrink: 0, color: 'var(--red)' }}
              onClick={() => {
                sfx.click()
                deleteIdea(idea.id)
              }}
              aria-label="Delete idea"
            >
              ✕
            </button>
          </div>
        ))
      )}
    </>
  )
}
