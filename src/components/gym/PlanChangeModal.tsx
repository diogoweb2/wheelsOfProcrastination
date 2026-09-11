// "What does 40 minutes actually do to today's session?" — answered before you
// commit to it, not discovered on the preview screen afterwards.
//
// The one rule here: this modal never DESCRIBES the length/mood policy, it
// SHOWS the result. `diffBlockPlans` builds the session both ways and compares,
// so a change to `fitToLength` shows up here for free and can never drift out
// of sync with a paragraph someone wrote once. See BUSINESS_REQUIREMENTS.md §18m.
import { useMemo } from 'react'
import type { GymSession } from '../../types'
import { diffBlockPlans } from '../../logic/gymBlock'
import { sfx } from '../../audio'

interface Props {
  /** The chip for the setting being tried — "⏱ 40 min", "🔥 Fired up". */
  label: string
  /** Today's session as it stands, and as it would be. */
  before: GymSession
  after: GymSession
  /** Said when the two builds come out identical — the honest "nothing moves". */
  emptyNote: string
  onConfirm: () => void
  onCancel: () => void
}

export function PlanChangeModal({ label, before, after, emptyNote, onConfirm, onCancel }: Props) {
  const diff = useMemo(() => diffBlockPlans(before, after), [before, after])
  const same = diff.changes.length === 0

  return (
    <div className="overlay overlay--center" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="gym-note-head">
          <span className="chip chip--test">{label}</span>
          {!same && diff.fromMin !== diff.toMin && (
            <span className="chip">
              ⏱ ~{diff.fromMin} → ~{diff.toMin} min
            </span>
          )}
        </div>

        <div className="h2" style={{ marginTop: 10 }}>{same ? 'Nothing changes' : 'What this changes'}</div>

        {same ? (
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{emptyNote}</p>
        ) : (
          <ul className="gym-diff">
            {diff.changes.map((c) => (
              <li key={`${c.exId}-${c.kind}`} className={`gym-diff-${c.kind}`}>
                <div className="gym-diff-name">
                  <span>{c.emoji}</span>
                  <b>{c.name}</b>
                </div>
                <div className="gym-diff-move">
                  {c.kind === 'changed' ? (
                    <>
                      <s>{c.from}</s> <span aria-hidden>→</span> <b>{c.to}</b>
                    </>
                  ) : c.kind === 'dropped' ? (
                    <s>{c.from}</s>
                  ) : (
                    <b>{c.to}</b>
                  )}
                  <span className="muted"> · {c.note}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          className="btn"
          style={{ marginTop: 14 }}
          onClick={() => {
            sfx.click()
            onConfirm()
          }}
        >
          {same ? '👍 Got it' : '✓ Do it this way'}
        </button>
        <button className="btn btn--ghost btn--small" style={{ width: '100%', marginTop: 8 }} onClick={onCancel}>
          ← Leave it as it was
        </button>
      </div>
    </div>
  )
}
