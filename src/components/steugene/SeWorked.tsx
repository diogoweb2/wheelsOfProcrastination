// 🏫 St. Eugene 7 (§24ab, §24ac) — watch it being solved.
//
// He asked to be shown, not told. So this is a player, not a page: the
// question sits at the top the whole time, and underneath it the problem gets
// solved, one move per tap.
//
// ONE method. The moves, the words, the arithmetic and the ⭐ are the same
// whichever picture is on screen — two methods would be the worst thing to
// hand a boy who already stalls at the paragraph, because he would spend his
// attention choosing instead of solving.
//
// What he can change is the PICTURE:
//
//  · ▦ bars (§24ab) — one bar, cut into parts. The spent parts collapse and
//    the leftover stretches out to fill the bar.
//  · 🏴‍☠️ crates (§24ac) — the same parts as counted crates on a deck. The
//    spent ones fall in the sea and the survivors renumber from 1.
//
// Switching keeps the move he is on, because it is the same move: "draw me
// THIS bit the other way" is the whole point of having the second picture.
//
// Four deliberate choices, both pictures:
//
//  · He taps. No autoplay by default, because a picture that moves on before
//    he has finished reading teaches him that he is too slow. ▶️ is there for
//    when he wants it to run itself.
//  · The question sentence is marked, every time, in yellow. Finding it is
//    move 2 of the plan and it is the move he skips.
//  · The ⭐ and 🔑 beats are drawn identically in every example. The point is
//    never this question; the point is that it is always the same question.
//  · Nothing is marked, scored or recorded beyond a tick. It is a
//    demonstration, and the moment it enters the report it becomes a test.
import { useEffect, useState } from 'react'
import { duelSfx, sfx } from '../../audio'
import { speak, canSpeak } from '../../lib/speak'
import { SpriteSvg } from './art/sprites'
import { SeBarModel } from './SeBarModel'
import { SeCrates } from './SeCrates'
import { MARK_TEXT, seBarOrder, type SeWorked as SeWorkedEx } from '../../steugene/worked'

const STEP_MS = 4200

/** Which picture of the one method is on screen. */
export type SeTake = 'bar' | 'crates'

export function SeWorkedPlayer({
  ex,
  open = 'bar',
  onTake,
  onDone,
  onClose,
  next,
}: {
  ex: SeWorkedEx
  /** Which picture to open on — the ladder's 🏴‍☠️ button comes straight here. */
  open?: SeTake
  /** He switched picture. The ladder remembers it for the next problem. */
  onTake?: (t: SeTake) => void
  /** He reached the end — the ladder ticks it off. `id` or `id:crates`. */
  onDone: (id: string) => void
  onClose: () => void
  next?: { label: string; go: () => void }
}) {
  const [take, setTake] = useState<SeTake>(open)
  const [raw, setI] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Clamped rather than trusted: one render with an index past the end is a
  // blank screen mid-lesson.
  const i = Math.max(0, Math.min(raw, ex.stages.length - 1))
  const stage = ex.stages[i]
  const last = i >= ex.stages.length - 1
  const crates = take === 'crates'

  const doneId = crates ? `${ex.id}:crates` : ex.id
  useEffect(() => {
    if (last) onDone(doneId)
  }, [last, doneId, onDone])

  // The One Piece clips the duel already ships (§13) — no new files. Two
  // moments only, and only on the deck, where there is something to hear: the
  // crates hitting the water, and the treasure landing.
  useEffect(() => {
    if (!crates) return
    if (stage.mark === 'same') duelSfx.chest()
    else if (last) duelSfx.treasure('legendary')
  }, [crates, stage, last])

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

  // The move is kept. It is the same move, drawn the other way.
  const swap = (to: SeTake) => {
    if (to === take) return
    sfx.click()
    setTake(to)
    onTake?.(to)
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

      {/* Same moves, same words, same answer. Only the drawing changes. */}
      <div className="se-wk__ways" role="tablist" aria-label="which picture to watch it in">
        <button
          role="tab"
          aria-selected={!crates}
          className={`se-wk__wayb${!crates ? ' se-wk__wayb--on' : ''}`}
          onClick={() => swap('bar')}
        >
          <strong>▦ Bars</strong>
          <span>one bar, cut up</span>
        </button>
        <button
          role="tab"
          aria-selected={crates}
          className={`se-wk__wayb se-wk__wayb--v2${crates ? ' se-wk__wayb--on' : ''}`}
          onClick={() => swap('crates')}
        >
          <strong>🏴‍☠️ Crates</strong>
          <span>the same parts, counted</span>
        </button>
      </div>
      <div className="se-wk__idea">
        Same question, same moves, same answer — this just draws it a different way.
      </div>

      {crates ? <SeCrates ex={ex} at={i} /> : <SeBarModel stage={stage} order={seBarOrder(ex)} />}

      <div className="se-wk__say" key={`${take}${i}`}>
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
              🔁 Again
            </button>
            {crates ? (
              next && (
                <button className="btn btn--blue" style={{ flex: 1 }} onClick={() => { sfx.click(); next.go() }}>
                  {next.label} →
                </button>
              )
            ) : (
              <button className="btn btn--blue" style={{ flex: 1 }} onClick={() => swap('crates')}>
                🏴‍☠️ Crates →
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
