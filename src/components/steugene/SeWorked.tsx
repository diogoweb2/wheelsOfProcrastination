// 🏫 St. Eugene 7 (§24ab) — watch it being solved.
//
// He asked to be shown, not told. So this is a player, not a page: the
// question sits at the top the whole time, and underneath it one bar works
// its way through the problem, one move per tap.
//
// Three deliberate choices:
//
//  · He taps. No autoplay by default, because a picture that moves on before
//    he has finished reading teaches him that he is too slow. ▶️ is there for
//    when he wants it to run itself.
//  · The question sentence is marked, every time, in yellow. Finding it is
//    move 2 of the plan and it is the move he skips.
//  · The ⭐ and 🔑 beats are drawn identically in every example. The point is
//    never this question; the point is that it is always the same question.
//
// Nothing here is marked, scored or recorded. It is a demonstration, and the
// moment it goes in the report it becomes a test.
import { useEffect, useState } from 'react'
import { sfx } from '../../audio'
import { speak, canSpeak } from '../../lib/speak'
import { SpriteSvg } from './art/sprites'
import { SeBarModel } from './SeBarModel'
import { MARK_TEXT, seBarOrder, type SeWorked as SeWorkedEx } from '../../steugene/worked'

const STEP_MS = 4200

export function SeWorkedPlayer({
  ex,
  onDone,
  onClose,
  next,
}: {
  ex: SeWorkedEx
  /** He reached the end — the ladder ticks it off. */
  onDone: (id: string) => void
  onClose: () => void
  next?: { label: string; go: () => void }
}) {
  const [raw, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const order = seBarOrder(ex)
  // Clamped rather than trusted: the examples are different lengths, and one
  // render with an index past the end is a blank screen mid-lesson.
  const i = Math.max(0, Math.min(raw, ex.stages.length - 1))
  const stage = ex.stages[i]
  const last = i >= ex.stages.length - 1

  useEffect(() => {
    if (last) onDone(ex.id)
  }, [last, ex.id, onDone])

  useEffect(() => {
    if (!playing || last) return
    const t = setTimeout(() => setI((n) => Math.min(n + 1, ex.stages.length - 1)), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, i, last, ex.stages.length])

  const go = (to: number) => {
    sfx.tick()
    setPlaying(false)
    setI(Math.max(0, Math.min(to, ex.stages.length - 1)))
  }

  return (
    <div className="card se-wk">
      <div className="se-wk__top">
        <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); onClose() }}>
          ← All of them
        </button>
        <span className="se-wk__name">
          <SpriteSvg icon={ex.icon} size={20} />
          {ex.title}
        </span>
      </div>

      {/* The problem, one sentence per line, and the question in yellow. */}
      <div className="se-wk__q">
        {ex.lines.map((line, n) => (
          <p key={n}>{line}</p>
        ))}
        <p className="se-wk__ask">❓ {ex.ask}</p>
        {canSpeak() && (
          <button
            className="btn btn--ghost btn--small se-wk__speak"
            onClick={() => { sfx.click(); speak([...ex.lines, ex.ask].join(' '), 1) }}
          >
            🔊 Read the question to me
          </button>
        )}
      </div>

      <SeBarModel stage={stage} order={order} />

      <div className="se-wk__say" key={i}>
        <span className="se-wk__step">{i + 1}</span>
        <div>
          <strong>{stage.say}</strong>
          {stage.maths && <span className="se-wk__maths">{stage.maths}</span>}
        </div>
      </div>

      {stage.mark && <div className={`se-wk__mark se-wk__mark--${stage.mark}`}>{MARK_TEXT[stage.mark]}</div>}

      {last && (
        <div className="se-wk__answer">
          <span className="se-wk__answertag">the answer</span>
          <strong>{ex.answer}</strong>
        </div>
      )}

      <div className="se-wk__dots" aria-hidden>
        {ex.stages.map((_, n) => (
          <button
            key={n}
            className={`se-wk__dot${n === i ? ' se-wk__dot--on' : ''}${n < i ? ' se-wk__dot--done' : ''}`}
            onClick={() => go(n)}
            aria-label={`Move ${n + 1}`}
          />
        ))}
      </div>

      <div className="se-wk__bar">
        <button className="btn btn--ghost btn--small" disabled={i === 0} onClick={() => go(i - 1)}>
          ←
        </button>
        {!last && (
          <button
            className={`btn btn--small ${playing ? 'btn--blue' : 'btn--ghost'}`}
            onClick={() => { sfx.click(); setPlaying(!playing) }}
            title={playing ? 'Stop it running itself' : 'Let it run itself'}
          >
            {playing ? '⏸' : '▶️'}
          </button>
        )}
        {last ? (
          <>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => go(0)}>
              🔁 Watch it again
            </button>
            {next && (
              <button className="btn btn--blue" style={{ flex: 1 }} onClick={() => { sfx.click(); next.go() }}>
                {next.label} →
              </button>
            )}
          </>
        ) : (
          <button className="btn btn--blue" style={{ flex: 1 }} onClick={() => go(i + 1)}>
            Next move →
          </button>
        )}
      </div>
    </div>
  )
}
