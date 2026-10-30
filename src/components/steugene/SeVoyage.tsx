// 🏫 St. Eugene 7 (§24ac) — the Grand Line map that solves it in one line.
//
// §24ab's bar explains by CUTTING: one bar, and the spent parts collapse. This
// explains by TRAVELLING: the ship moves east one island per move, each island
// keeps a fraction of the hold, and the log pose at the bottom writes down the
// multiplication as it goes. By the last move the whole problem is on one line.
//
// Three strips, and only one of them changes much per move:
//
//   · the route — where in the SENTENCES you are. One island per sentence.
//   · the hold  — what you have right now, big, with the crates it is packed
//     into. Crates that are taken are thrown over the side and stay as
//     ghosts, so "2 of the 5 went" is still on screen.
//   · the log pose — the chain of keeps. This is the thing he has to WRITE.
//
// The level-4 problems sail back west, and that is the only difference: the
// ship turns round, the wake reverses, the chips go ↩. Working backwards is a
// direction here, not a second method to remember.
import { SpriteSvg } from './art/sprites'
import { stagger } from './art/anim'
import type { SeVoyLeg, SeVoyage } from '../../steugene/voyage'

/**
 * `= 300` is a result and `is 7 days` is a given — both land green. `↩ 190` is
 * the ship turning round. Everything else is a multiply.
 *
 * `is` rather than `=` on the givens is deliberate: "1/9 = 7 days" is a false
 * sentence, and he is the last reader who should be shown a wrong equals sign.
 */
const chipKind = (t: string) =>
  t.startsWith('=') || t.startsWith('is ') ? 'eq' : t.startsWith('↩') ? 'back' : 'mul'

export function SeVoyageMap({ voy, leg }: { voy: SeVoyage; leg: SeVoyLeg }) {
  // The dock counts as a stop, so the ship starts somewhere rather than
  // nowhere: stop 0 is home, stop i is island i.
  const stops = voy.ports.length + 1
  const at = Math.max(0, Math.min(leg.at, voy.ports.length))
  const shipAt = Math.round(((at + 0.5) / stops) * 10000) / 100
  const crateSize = leg.crates ? (leg.crates.n > 7 ? 19 : leg.crates.n > 4 ? 23 : 27) : 24

  return (
    <div className="voy">
      {/* --- the route: one island per sentence --- */}
      <div className="voy__maptag">
        <span aria-hidden>🏴‍☠️</span> the route — one island per sentence
      </div>
      <div className="voy__map">
        <div className="voy__stops">
          <div className={`voy__stop${at === 0 ? ' voy__stop--here' : ''}`}>
            <span className="voy__flag" aria-hidden>⚓</span>
            <span className="voy__sname">Home</span>
            <span className="voy__takes">the start</span>
          </div>
          {voy.ports.map((p, i) => (
            <div
              key={p.name}
              className={`voy__stop${at > i ? ' voy__stop--done' : ''}${at === i + 1 ? ' voy__stop--here' : ''}`}
            >
              <span className="voy__flag" aria-hidden>{p.flag}</span>
              <span className="voy__sname">{p.name}</span>
              <span className="voy__takes">{p.takes}</span>
              <span className="voy__keeps">{p.keeps}</span>
            </div>
          ))}
        </div>
        <div className={`voy__sea${leg.back ? ' voy__sea--back' : ''}`} role="img" aria-label={`the ship is at stop ${at + 1} of ${stops}`}>
          {/* Two elements on purpose: the outer one is PLACED (and turns
              round), the inner one bobs. One element cannot do both — the bob
              keyframe would overwrite the transform that centres it. */}
          <div className="voy__ship" style={{ left: `${shipAt}%`, transform: `translateX(-50%)${leg.back ? ' scaleX(-1)' : ''}` }} aria-hidden>
            <span className="voy__shipb">⛵</span>
          </div>
        </div>
      </div>

      {/* --- the hold: what you have, right now --- */}
      <div className="voy__hold">
        <span className="voy__holdtag">in the hold</span>
        <strong className="voy__holdn" key={leg.hold}>{leg.hold}</strong>
        {leg.holdNote && <span className="voy__holdnote" key={leg.holdNote}>{leg.holdNote}</span>}
        {leg.crates && (
          <div className="voy__crates" key={`${leg.crates.n}:${leg.crates.keep}:${leg.crates.each ?? ''}`} aria-hidden>
            {Array.from({ length: leg.crates.n }, (_, i) => {
              const kept = i < leg.crates!.keep
              // Two separate staggers, not one across the row: the crates that
              // stay land first, and the ones being taken all go over the side
              // just after, together-ish. One stagger put the last splash most
              // of a second late, which read as a bug rather than a move.
              const delay = kept ? stagger(i, 55, 420) : 300 + stagger(i - leg.crates!.keep, 70, 380)
              const how = kept ? '' : leg.crates!.spot ? ' voy__crate--rest' : ' voy__crate--over'
              return (
                <span
                  key={i}
                  className={`voy__crate${how}`}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <SpriteSvg icon={leg.crates!.icon} size={crateSize} dim={!kept} />
                  {kept && leg.crates!.each && <em>{leg.crates!.each}</em>}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* --- the log pose: the line he actually has to write --- */}
      <div className="voy__log">
        <span className="voy__logtag" aria-hidden>🧭 log pose</span>
        <div className="voy__chain">
          {(leg.chain ?? []).map((t, i) => (
            <span
              key={`${i}:${t}`}
              className={`voy__chip voy__chip--${chipKind(t)}`}
              style={{ animationDelay: `${stagger(i, 110, 600)}ms` }}
            >
              {t}
            </span>
          ))}
          {!leg.chain?.length && <span className="voy__chain--empty">nothing written down yet</span>}
        </div>
      </div>
    </div>
  )
}
