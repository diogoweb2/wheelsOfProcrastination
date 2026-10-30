// 🏫 St. Eugene 7 (§24ac) — the same explanation, drawn a second way.
//
// Not a second method. There is ONE method in this app and it is §24ab's:
// one whole, cut into equal parts, the spent parts leave, and the leftover
// becomes the new whole. Two methods would be the worst thing we could hand a
// boy who stalls at the paragraph — he would spend his attention choosing.
//
// So this component reads THE SAME DATA as the bar (`SeWorkStage`, straight
// out of worked.ts) and walks the same moves in the same words. Only the
// picture changes: the bar's measured boxes become counted crates on the deck
// of a ship, and the parts that get spent fall in the sea instead of
// collapsing to nothing.
//
// That is a real second picture of one idea, and it is the pair the textbook
// would use: an AREA model and a SET model. Some days a length makes it
// obvious; some days counting objects does. Nothing he has to choose between,
// because the answer, the moves and the ⭐ are identical either way.
//
// The beat lands harder here, if anything. At the ⭐ step the doomed crates go
// over the side and the survivors RENUMBER FROM 1 — "the leftover becomes the
// whole" is not a sentence any more, it is six crates that used to be 5…10 and
// are now 1…6.
import { SpriteSvg } from './art/sprites'
import { stagger } from './art/anim'
import { seBarOrder, type SeWorked as SeWorkedEx } from '../../steugene/worked'

export function SeCrates({ ex, at }: { ex: SeWorkedEx; at: number }) {
  const i = Math.max(0, Math.min(at, ex.stages.length - 1))
  const stage = ex.stages[i]
  const order = seBarOrder(ex)
  const by = new Map(stage.cells.map((c) => [c.id, c]))
  const widthOf = (id: string) => by.get(id)?.w ?? 0

  // A crate that was ever painted `gone` and is now off the bar went over the
  // side. One that leaves without ever being spent was REPACKED (the flour
  // gets re-cut into tenths) — that crate is simply not on deck any more, and
  // it must not look like it was thrown away.
  const everGone = new Set<string>()
  const caps = new Map<string, string>()
  for (let s = 0; s <= i; s++) {
    for (const c of ex.stages[s].cells) {
      if (c.tone === 'gone') everGone.add(c.id)
      if (c.cap) caps.set(c.id, c.cap)
    }
  }

  const live = order.filter((id) => widthOf(id) > 0)
  const sunk = order.filter((id) => widthOf(id) === 0 && everGone.has(id))
  const size = live.length <= 2 ? 44 : live.length <= 5 ? 34 : live.length <= 7 ? 28 : 22

  // The bracket, as a box round the crates it names. The ids a brace points at
  // are always next to each other on deck; if that ever stops being true the
  // label still shows, just without the box.
  const braceIds = stage.brace?.ids ?? []
  const from = live.findIndex((id) => braceIds.includes(id))
  const n = live.filter((id) => braceIds.includes(id)).length
  const boxed = n > 0 && from >= 0 && live.slice(from, from + n).every((id) => braceIds.includes(id))
  const lead = boxed ? live.slice(0, from) : live
  const mid = boxed ? live.slice(from, from + n) : []
  const tail = boxed ? live.slice(from + n) : []

  const crate = (id: string, k: number) => {
    const c = by.get(id)
    return (
      <span
        key={id}
        className={`dk__c dk__c--${c?.tone ?? 'plain'}`}
        style={{ animationDelay: `${stagger(k, 55, 420)}ms` }}
      >
        <span className="dk__n">{k + 1}</span>
        <SpriteSvg icon={ex.icon} size={size} dim={c?.tone === 'gone'} />
        {c?.cap && <em>{c.cap}</em>}
      </span>
    )
  }

  return (
    <div className="dk">
      {stage.whole && (
        <div className="dk__sign" key={stage.whole}>
          <span className="dk__signtag">on the deck</span>
          <strong>{stage.whole}</strong>
        </div>
      )}

      <div className="dk__deck" role="img" aria-label={`${live.length} crates on deck${sunk.length ? `, ${sunk.length} over the side` : ''}`}>
        <span className="dk__roger" aria-hidden>🏴‍☠️</span>
        <div className="dk__row">
          {lead.map((id, k) => crate(id, k))}
          {boxed && (
            <span className="dk__box">
              <span className="dk__boxrow">{mid.map((id, k) => crate(id, lead.length + k))}</span>
              <span className="dk__boxlabel">{stage.brace?.label}</span>
            </span>
          )}
          {tail.map((id, k) => crate(id, lead.length + mid.length + k))}
          {!boxed && stage.brace?.label && <span className="dk__boxlabel dk__boxlabel--loose">{stage.brace.label}</span>}
        </div>
      </div>

      {/* The sea is always drawn, so the deck never jumps when the first crate
          goes in. What sank stays visible: he can still count what was spent. */}
      <div className="dk__sea">
        <span className="dk__seatag">{sunk.length ? 'over the side — spent' : 'nothing spent yet'}</span>
        <div className="dk__sunk">
          {sunk.map((id, k) => (
            <span key={id} className="dk__s" style={{ animationDelay: `${stagger(k, 90, 500)}ms` }}>
              <SpriteSvg icon={ex.icon} size={19} dim />
              {caps.get(id) && <em>{caps.get(id)}</em>}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
