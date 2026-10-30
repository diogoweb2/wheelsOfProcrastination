// 🏫 St. Eugene 7 (§24ab, §24ac) — watch it being solved. Two ways.
//
// He asked to be shown, not told. So this is a player, not a page: the
// question sits at the top the whole time, and underneath it the problem gets
// solved, one move per tap.
//
// There are TWO takes on every problem, and they are different ideas, not a
// reskin:
//
//  · ▦ the bar (§24ab) — one bar, cut into parts, and the spent parts
//    collapse so the leftover physically becomes the new whole. Slow, safe,
//    and the right first way.
//  · 🏴‍☠️ the Grand Line (§24ac) — each sentence is an island that KEEPS a
//    fraction, and the keeps multiply. Harder, faster, and it is the line he
//    will be expected to write by the end of the year.
//
// The bar is always what opens. The pirate way is a second tap, never the
// default: a boy who stalls at the paragraph does not need two methods thrown
// at him at once, he needs the same one twice and then a reason to speed up.
//
// Four deliberate choices, both takes:
//
//  · He taps. No autoplay by default, because a picture that moves on before
//    he has finished reading teaches him that he is too slow. ▶️ is there for
//    when he wants it to run itself.
//  · The question sentence is marked, every time, in yellow. Finding it is
//    move 2 of the plan and it is the move he skips.
//  · The marks (⭐ 🔑 · 🧭 ⚓ 🔙) are drawn identically in every example. The
//    point is never this question; the point is that it is always the same
//    question.
//  · Nothing is marked, scored or recorded beyond a tick. It is a
//    demonstration, and the moment it goes in the report it becomes a test.
import { useEffect, useState } from 'react'
import { duelSfx, sfx } from '../../audio'
import { speak, canSpeak } from '../../lib/speak'
import { SpriteSvg } from './art/sprites'
import { SeBarModel } from './SeBarModel'
import { SeVoyageMap } from './SeVoyage'
import { MARK_TEXT, seBarOrder, type SeWorked as SeWorkedEx } from '../../steugene/worked'
import { VOY_MARK, type SeVoyage } from '../../steugene/voyage'

const STEP_MS = 4200

export type SeTake = 'bar' | 'voy'

export function SeWorkedPlayer({
  ex,
  v2,
  open = 'bar',
  onTake,
  onDone,
  onClose,
  next,
}: {
  ex: SeWorkedEx
  /** The pirate take on the same problem, when there is one. */
  v2?: SeVoyage | null
  /** Which way to open on — the ladder's 🏴‍☠️ button comes straight here. */
  open?: SeTake
  /** He switched ways. The ladder remembers, so "next one" stays in this one. */
  onTake?: (t: SeTake) => void
  /** He reached the end — the ladder ticks it off. `id` or `id:v2`. */
  onDone: (id: string) => void
  onClose: () => void
  next?: { label: string; go: () => void }
}) {
  const [take, setTake] = useState<SeTake>(v2 && open === 'voy' ? 'voy' : 'bar')
  const [raw, setI] = useState(0)
  const [playing, setPlaying] = useState(false)

  const voy = take === 'voy' ? v2 : null
  const count = voy ? voy.legs.length : ex.stages.length
  // Clamped rather than trusted: the two takes are different lengths, and one
  // render with an index past the end is a blank screen mid-lesson.
  const i = Math.max(0, Math.min(raw, count - 1))
  const last = i >= count - 1

  const stage = ex.stages[Math.min(i, ex.stages.length - 1)]
  const leg = voy?.legs[i]
  const step = voy ? { say: leg!.say, maths: leg!.maths } : { say: stage.say, maths: stage.maths }
  const mark = voy
    ? leg!.mark && { cls: leg!.mark, text: VOY_MARK[leg!.mark] }
    : stage.mark && { cls: stage.mark, text: MARK_TEXT[stage.mark] }

  const doneId = voy ? `${ex.id}:v2` : ex.id
  useEffect(() => {
    if (last) onDone(doneId)
  }, [last, doneId, onDone])

  // The One Piece clips the duel already ships (no new files — CLAUDE.md).
  // Two moments only: the ship turning round, and the treasure landing.
  useEffect(() => {
    if (!voy || !leg) return
    if (leg.mark === 'back') duelSfx.chest()
    else if (last) duelSfx.treasure('legendary')
  }, [voy, leg, last])

  useEffect(() => {
    if (!playing || last) return
    const t = setTimeout(() => setI((n) => Math.min(n + 1, count - 1)), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, i, last, count])

  const go = (to: number) => {
    sfx.tick()
    setPlaying(false)
    setI(Math.max(0, Math.min(to, count - 1)))
  }

  const swap = (to: SeTake) => {
    if (to === take) return
    sfx.click()
    setPlaying(false)
    setTake(to)
    setI(0)
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

      {/* Two ways to solve the same thing. The bar is always what opens. */}
      {v2 && (
        <>
          <div className="se-wk__ways" role="tablist" aria-label="which way to watch">
            <button
              role="tab"
              aria-selected={take === 'bar'}
              className={`se-wk__wayb${take === 'bar' ? ' se-wk__wayb--on' : ''}`}
              onClick={() => swap('bar')}
            >
              <strong>▦ One bar</strong>
              <span>cut it up, slow and safe</span>
            </button>
            <button
              role="tab"
              aria-selected={take === 'voy'}
              className={`se-wk__wayb se-wk__wayb--v2${take === 'voy' ? ' se-wk__wayb--on' : ''}`}
              onClick={() => swap('voy')}
            >
              <strong>🏴‍☠️ Grand Line</strong>
              <span>one line, the fast way</span>
            </button>
          </div>
          {voy && <div className="se-wk__idea">🧭 {voy.idea}</div>}
        </>
      )}

      {voy && leg ? <SeVoyageMap voy={voy} leg={leg} /> : <SeBarModel stage={stage} order={seBarOrder(ex)} />}

      <div className="se-wk__say" key={`${take}${i}`}>
        <span className="se-wk__step">{i + 1}</span>
        <div>
          <strong>{step.say}</strong>
          {step.maths && <span className="se-wk__maths">{step.maths}</span>}
        </div>
      </div>

      {mark && <div className={`se-wk__mark se-wk__mark--${mark.cls}`}>{mark.text}</div>}

      {last && (
        <div className="se-wk__answer">
          <span className="se-wk__answertag">the answer</span>
          <strong>{ex.answer}</strong>
          {voy && <span className="se-wk__oneline">{voy.oneline}</span>}
        </div>
      )}

      <div className="se-wk__dots" aria-hidden>
        {Array.from({ length: count }, (_, n) => (
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
            {v2 && take === 'bar' ? (
              <button className="btn btn--blue" style={{ flex: 1 }} onClick={() => swap('voy')}>
                🏴‍☠️ Fast way →
              </button>
            ) : (
              next && (
                <button className="btn btn--blue" style={{ flex: 1 }} onClick={() => { sfx.click(); next.go() }}>
                  {next.label} →
                </button>
              )
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
