// The body, front and back, with every muscle group coloured by how rested it is.
//
// Drawn as SVG rather than shipped as a photo on purpose: a picture of a body
// can't be tinted per muscle, and the whole point is that CHEST is a different
// colour from LEGS. It also costs nothing to store and reads at any size.
//
// The figure is deliberately stylised. It is a map, not an anatomy plate: the
// only thing it has to do is let you find a body part in half a second.
import type { BodyPart } from '../../types'
import { PART_LABEL } from '../../logic/gym'
import { TONE_COLOR, toneFor, type PartRecovery } from '../../logic/gymBody'

/** One tintable muscle region: which body part it belongs to, and its outline. */
interface Region {
  part: BodyPart
  d: string
}

/** Bones, skin and joints — everything that isn't a muscle you can train. */
const NEUTRAL = '#1b4470'
const OUTLINE = 'rgba(234,244,255,0.28)'

const VIEW = '0 0 128 300'

/** Head, hands, feet, hips. The same on both figures. */
const FRAME: string[] = [
  'M49 20 a15 17 0 1 0 30 0 a15 17 0 1 0 -30 0 Z', // head
  'M56 34 h16 v9 h-16 Z', // neck
  'M50 120 Q64 131 78 120 L80 141 Q64 149 48 141 Z', // hips
  'M10 141 a6 8 0 1 0 12 0 a6 8 0 1 0 -12 0 Z', // left hand
  'M106 141 a6 8 0 1 0 12 0 a6 8 0 1 0 -12 0 Z', // right hand
  'M44 256 q7 5 14 0 l1 10 h-16 Z', // left foot
  'M70 256 q7 5 14 0 l1 10 h-16 Z', // right foot
]

/** Mirror a path's x coordinates about the centre line, so both sides stay identical. */
function mirror(d: string): string {
  return d.replace(/(-?\d+(?:\.\d+)?)(\s+)(-?\d+(?:\.\d+)?)/g, (_m, x: string, gap: string, y: string) => `${128 - Number(x)}${gap}${y}`)
}

const ARM_UPPER = 'M23 58 Q34 57 36 68 L34 100 Q26 105 21 98 Q18 76 23 58 Z'
const FOREARM = 'M21 102 Q30 100 34 107 L32 140 Q24 145 19 138 Q17 118 21 102 Z'

const FRONT: Region[] = [
  { part: 'shoulders', d: 'M22 58 Q26 44 40 45 Q46 47 45 58 Q36 66 22 58 Z' },
  { part: 'shoulders', d: mirror('M22 58 Q26 44 40 45 Q46 47 45 58 Q36 66 22 58 Z') },
  { part: 'chest', d: 'M45 48 Q62 45 62 53 L62 75 Q49 79 44 70 Q41 58 45 48 Z' },
  { part: 'chest', d: mirror('M45 48 Q62 45 62 53 L62 75 Q49 79 44 70 Q41 58 45 48 Z') },
  { part: 'core', d: 'M48 77 Q64 82 80 77 L78 117 Q64 127 50 117 Z' },
  { part: 'arms', d: ARM_UPPER },
  { part: 'arms', d: mirror(ARM_UPPER) },
  { part: 'forearms', d: FOREARM },
  { part: 'forearms', d: mirror(FOREARM) },
  { part: 'legs', d: 'M48 142 Q57 147 61 142 L61 200 Q52 207 46 198 Q43 168 48 142 Z' },
  { part: 'legs', d: mirror('M48 142 Q57 147 61 142 L61 200 Q52 207 46 198 Q43 168 48 142 Z') },
  { part: 'legs', d: 'M48 205 Q56 210 60 205 L58 252 Q50 257 46 250 Q44 226 48 205 Z' },
  { part: 'legs', d: mirror('M48 205 Q56 210 60 205 L58 252 Q50 257 46 250 Q44 226 48 205 Z') },
]

const BACK: Region[] = [
  { part: 'back', d: 'M44 42 Q64 35 84 42 L79 66 Q64 72 49 66 Z' }, // traps
  { part: 'shoulders', d: 'M22 58 Q26 44 40 45 Q46 47 45 58 Q36 66 22 58 Z' },
  { part: 'shoulders', d: mirror('M22 58 Q26 44 40 45 Q46 47 45 58 Q36 66 22 58 Z') },
  { part: 'back', d: 'M47 66 Q64 76 81 66 L84 103 Q64 114 44 103 Z' }, // lats
  { part: 'back', d: 'M50 105 Q64 113 78 105 L77 123 Q64 129 51 123 Z' }, // lower back
  { part: 'arms', d: ARM_UPPER },
  { part: 'arms', d: mirror(ARM_UPPER) },
  { part: 'forearms', d: FOREARM },
  { part: 'forearms', d: mirror(FOREARM) },
  { part: 'glutes', d: 'M46 126 Q64 135 82 126 L84 152 Q64 165 44 152 Z' },
  { part: 'legs', d: 'M48 156 Q57 161 61 156 L61 205 Q52 212 46 203 Q43 176 48 156 Z' },
  { part: 'legs', d: mirror('M48 156 Q57 161 61 156 L61 205 Q52 212 46 203 Q43 176 48 156 Z') },
  { part: 'legs', d: 'M47 209 Q56 214 60 209 L58 253 Q50 258 46 251 Q44 230 47 209 Z' },
  { part: 'legs', d: mirror('M47 209 Q56 214 60 209 L58 253 Q50 258 46 251 Q44 230 47 209 Z') },
]

/**
 * Stroke-only lines drawn OVER the tinted regions: the ab dividers, the spine,
 * the line down a quad. They carry no data and take no taps — they are there so
 * the shapes read as a body rather than as coloured slabs.
 */
const FRONT_DETAIL: string[] = [
  'M64 78 V117', // linea alba
  'M50 92 H78', 'M51 105 H77', // ab dividers
  'M54 150 V196', 'M74 150 V196', // quad sweep
]
const BACK_DETAIL: string[] = [
  'M64 40 V124', // spine
  'M64 128 V160', // glute split
  'M54 162 V202', 'M74 162 V202', // hamstring split
]

/** Parts with no place on the drawing — they are efforts, not muscles. */
export const OFF_BODY: BodyPart[] = ['fullBody', 'power', 'cardio']

/** How one region should be drawn. Recovery colours it one way, a muscle map another. */
interface Paint {
  fill: string
  opacity: number
  /** Draw the bright outline — the recovery map uses it for the muscle you tapped. */
  ringed?: boolean
  /** Tooltip text, for the pointer users who get one. */
  title?: string
}

function Figure({
  title,
  regions,
  detail,
  paint,
  onPick,
}: {
  title: string
  regions: Region[]
  detail: string[]
  paint: (part: BodyPart) => Paint
  onPick?: (p: BodyPart) => void
}) {
  return (
    <figure className="gym-body-fig">
      <svg viewBox={VIEW} role="img" aria-label={`${title} view`}>
        {FRAME.map((d, i) => (
          <path key={`f${i}`} d={d} fill={NEUTRAL} stroke={OUTLINE} strokeWidth={1.2} />
        ))}
        {regions.map((r, i) => {
          const p = paint(r.part)
          return (
            <path
              key={i}
              d={r.d}
              fill={p.fill}
              fillOpacity={p.opacity}
              stroke={p.ringed ? '#eaf4ff' : OUTLINE}
              strokeWidth={p.ringed ? 2.2 : 1.2}
              onClick={onPick ? () => onPick(r.part) : undefined}
              style={onPick ? { cursor: 'pointer' } : undefined}
            >
              {p.title && <title>{p.title}</title>}
            </path>
          )
        })}
        <g fill="none" stroke="rgba(12,35,56,0.45)" strokeWidth={1.1} strokeLinecap="round" pointerEvents="none">
          {detail.map((d, i) => (
            <path key={`d${i}`} d={d} />
          ))}
        </g>
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  )
}

export function BodyMap({
  recovery,
  selected,
  onPick,
}: {
  recovery: PartRecovery[]
  selected: BodyPart | null
  onPick: (p: BodyPart) => void
}) {
  const by = new Map(recovery.map((r) => [r.part, r]))
  const paint = (part: BodyPart): Paint => {
    const rec = by.get(part)
    return {
      fill: TONE_COLOR[toneFor(rec?.pct ?? 1)],
      // one muscle picked dims every other one, so the answer to "which is that
      // red one?" is the drawing itself rather than a legend lookup
      opacity: selected && selected !== part ? 0.3 : 0.92,
      ringed: selected === part,
      title: `${PART_LABEL[part]} — ${Math.round((rec?.pct ?? 1) * 100)}% recovered`,
    }
  }
  return (
    <div className="gym-body-map">
      <Figure title="Front" regions={FRONT} detail={FRONT_DETAIL} paint={paint} onPick={onPick} />
      <Figure title="Back" regions={BACK} detail={BACK_DETAIL} paint={paint} onPick={onPick} />
    </div>
  )
}

// --- the same body, answering a different question ---------------------------
//
// "What does THIS exercise work?" A row of body-part chips is a list you have to
// already know how to read; a lit-up figure is an answer you can take in while
// you are still walking to the bench. Same drawing, so a muscle you learned on
// the recovery map is in the same place here.

/** Parts that aren't a place on the body, spread over the places they actually reach. */
const SPREAD: Partial<Record<BodyPart, BodyPart[]>> = {
  fullBody: ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core'],
  power: ['back', 'shoulders', 'legs', 'glutes', 'core'],
  cardio: ['legs', 'glutes', 'core'],
}

const PRIME = '#ffce00'
const HELPER = '#ff9600'

export function MuscleMap({ parts, className = '' }: { parts: BodyPart[]; className?: string }) {
  // The catalog writes the parts most-important-first, which is the same order
  // the block planner trusts to decide what a movement is "for" — so the first
  // one is drawn as the target and the rest as the muscles that help.
  const prime = new Set<BodyPart>()
  const helper = new Set<BodyPart>()
  // "Full body" is not a target, so it never takes the gold — on a farmer's
  // carry the forearms are what you are actually training, and they are listed
  // second only because the effort is listed first.
  const target = parts.find((p) => !SPREAD[p])
  for (const p of parts) {
    const spread = SPREAD[p]
    if (spread) spread.forEach((q) => helper.add(q))
    else if (p === target) prime.add(p)
    else helper.add(p)
  }
  for (const p of prime) helper.delete(p)

  const paint = (part: BodyPart): Paint =>
    prime.has(part)
      ? { fill: PRIME, opacity: 0.95, title: `${PART_LABEL[part]} — the target` }
      : helper.has(part)
        ? { fill: HELPER, opacity: 0.8, title: `${PART_LABEL[part]} — helps out` }
        : { fill: NEUTRAL, opacity: 1 }

  const lit = [...prime, ...helper]
  return (
    <div className={`gym-muscle ${className}`}>
      <div className="gym-muscle-figs">
        <Figure title="Front" regions={FRONT} detail={FRONT_DETAIL} paint={paint} />
        <Figure title="Back" regions={BACK} detail={BACK_DETAIL} paint={paint} />
      </div>
      <div className="gym-muscle-key">
        <div className="gym-muscle-head">🫁 What this works</div>
        {lit.length === 0 ? (
          <p className="muted" style={{ fontSize: 11 }}>Nothing the drawing can point at — it is an effort, not a muscle.</p>
        ) : (
          <ul>
            {[...prime].map((p) => (
              <li key={p}>
                <i style={{ background: PRIME }} />
                <strong>{PART_LABEL[p]}</strong>
              </li>
            ))}
            {[...helper].map((p) => (
              <li key={p}>
                <i style={{ background: HELPER }} />
                {PART_LABEL[p]}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
