// 🏫 St. Eugene 7 (§24ab) — the bar that does the explaining.
//
// Not a drawing per step: ONE bar that changes. Every box keeps its id across
// the stages, so React updates the same element and a CSS transition on
// `flex-grow` does the rest — boxes that are spent shrink to nothing, and
// what is left stretches out to fill the bar.
//
// That one move is the whole point of this component. "The remaining becomes
// the new whole" is a sentence he can read ten times and still not use; a bar
// where the spent parts physically collapse and the rest takes over the
// screen is the same idea with nothing left to misread.
//
// Width is the only thing being animated, and it is animated with flex rather
// than SVG geometry so it behaves the same in every browser his tablet might
// be running.
import type { SeBarCell, SeWorkStage } from '../../steugene/worked'

export function SeBarModel({ stage, order }: { stage: SeWorkStage; order: string[] }) {
  // A box missing from this stage is a box at zero width — that is what makes
  // it slide away rather than disappear, and what lets it come BACK later
  // (the backwards examples rebuild the whole bar at the end).
  const by = new Map<string, SeBarCell>(stage.cells.map((c) => [c.id, c]))
  const widthOf = (id: string) => by.get(id)?.w ?? 0
  const total = order.reduce((n, id) => n + widthOf(id), 0) || 1

  // The bracket, measured in the same units as the bar, so it moves with it.
  const braceIds = stage.brace?.ids ?? []
  const before = order.filter((id) => !braceIds.includes(id) && order.indexOf(id) < Math.min(...braceIds.map((b) => order.indexOf(b))))
  const span = braceIds.reduce((n, id) => n + widthOf(id), 0)
  const lead = braceIds.length ? before.reduce((n, id) => n + widthOf(id), 0) : 0
  const trail = Math.max(0, total - lead - span)

  return (
    <div className="bm-wrap">
      {stage.whole && (
        <div className="bm__whole" key={stage.whole}>
          <span className="bm__wholetag">the whole bar</span>
          <strong>{stage.whole}</strong>
        </div>
      )}

      <div className="bm" role="img" aria-label={stage.whole ? `bar model: ${stage.whole}` : 'bar model'}>
        {order.map((id) => {
          const c = by.get(id)
          const w = widthOf(id)
          return (
            <div
              key={id}
              className={`bm__c bm__c--${c?.tone ?? 'plain'}${w ? '' : ' bm__c--out'}`}
              style={{ flexGrow: w }}
              aria-hidden={!w}
            >
              {!!w && c?.cap && <span className="bm__cap">{c.cap}</span>}
            </div>
          )
        })}
      </div>

      {/* Always rendered, so the bar never jumps when a bracket appears. */}
      <div className={`bm__brace${span ? ' bm__brace--on' : ''}`}>
        <div style={{ flexGrow: lead }} />
        <div className="bm__bracket" style={{ flexGrow: span || 0.0001 }}>
          {!!span && <span className="bm__bracelabel">{stage.brace?.label}</span>}
        </div>
        <div style={{ flexGrow: trail }} />
      </div>
    </div>
  )
}
