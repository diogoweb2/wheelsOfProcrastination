// Everything already graded: the letter, the Berries, the feedback, and — one
// tap away — the essay itself with every mark still on it. This is the tab that
// makes the work feel like it added up to something.
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Essay } from '../../types'
import { GRADE_COINS, essayWords, gradeTint } from '../../logic/essay'
import { MarkedEssay } from './MarkedEssay'
import { sfx } from '../../audio'

export function HistoryPanel({ authorId }: { authorId?: string }) {
  const { essays } = useStore()
  const done = essays
    .filter((e) => e.status === 'graded' && (!authorId || e.authorId === authorId))
    .slice()
    .reverse()

  const coins = done.reduce((n, e) => n + (e.coins ?? 0), 0)

  if (done.length === 0) {
    return (
      <>
        <div className="h2">📚 Finished essays</div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>📖</div>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>Nothing graded yet. The first one goes here.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="h2">📚 Finished — {done.length}</div>
      <div className="card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{done.length}</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 800 }}>ESSAYS</div>
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--gold)' }}>🪙 {coins}</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 800 }}>BERRIES EARNED</div>
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: gradeTint(done[0].grade!) }}>{done[0].grade}</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 800 }}>LATEST</div>
        </div>
      </div>
      {done.map((e) => (
        <Row key={e.id} essay={e} />
      ))}
    </>
  )
}

function Row({ essay }: { essay: Essay }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => { sfx.click(); setOpen(!open) }}>
        <div className="essay-grade essay-grade--small" style={{ color: gradeTint(essay.grade!) }}>{essay.grade}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>{essay.title}</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 800, marginTop: 2 }}>
            {essay.gradedAt?.slice(0, 10)} · {essayWords(essay)} words · {essay.round} round{essay.round === 1 ? '' : 's'} ·
            🪙 {essay.coins ?? GRADE_COINS[essay.grade!]}
          </div>
        </div>
        <span className="muted">{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <>
          {essay.gradeGood && <p style={{ fontSize: 13, marginTop: 10 }}><strong>⭐ Well done:</strong> {essay.gradeGood}</p>}
          {essay.gradeImprove && <p style={{ fontSize: 13, marginTop: 6 }}><strong>🎯 Next time:</strong> {essay.gradeImprove}</p>}
          <div style={{ marginTop: 10, borderTop: '2px solid var(--line)', paddingTop: 10 }}>
            <MarkedEssay essay={essay} comments={essay.comments} />
          </div>
        </>
      )}
    </div>
  )
}
