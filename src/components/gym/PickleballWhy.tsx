// 🏓 "Why am I doing this?", answered where the question actually gets asked:
// standing in a basement between two sets, with ninety seconds and nothing to
// do. See BUSINESS_REQUIREMENTS.md §18s.
//
// The paddle is inline SVG like everything else the app draws (§14) — no asset,
// no request, and it recolours with the theme. It is not decoration: it is the
// label. One glance says "this block is about pickleball" without a heading
// having to say it.
import type { WhyInput } from '../../logic/gymPickleball'
import { pickleballWhy } from '../../logic/gymPickleball'

/** The paddle and ball, drawn at whatever size the card gives it. */
function Paddle({ size = 58 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="gym-why-paddle" role="img" aria-label="pickleball paddle">
      {/* handle */}
      <rect x="27.5" y="38" width="9" height="21" rx="4" fill="var(--bronze)" />
      <rect x="26" y="45" width="12" height="4" rx="2" fill="#0006" />
      <rect x="26" y="51" width="12" height="4" rx="2" fill="#0006" />
      {/* face */}
      <rect x="12" y="4" width="40" height="38" rx="12" fill="var(--gold)" stroke="var(--bronze)" strokeWidth="2.5" />
      {/* the drilled holes that make it a pickleball paddle and not a ping-pong bat */}
      <g fill="#0000001f">
        <circle cx="24" cy="16" r="2.1" />
        <circle cx="32" cy="14" r="2.1" />
        <circle cx="40" cy="16" r="2.1" />
        <circle cx="24" cy="25" r="2.1" />
        <circle cx="32" cy="23" r="2.1" />
        <circle cx="40" cy="25" r="2.1" />
        <circle cx="28" cy="33" r="2.1" />
        <circle cx="36" cy="33" r="2.1" />
      </g>
      {/* the ball, mid-flight */}
      <circle cx="52" cy="47" r="8" fill="var(--ice)" stroke="var(--blue-dark)" strokeWidth="1.5" />
      <g fill="var(--blue-dark)" opacity="0.55">
        <circle cx="49" cy="44" r="1.2" />
        <circle cx="54.5" cy="44.5" r="1.2" />
        <circle cx="51" cy="49.5" r="1.2" />
        <circle cx="55.5" cy="49" r="1.2" />
      </g>
    </svg>
  )
}

/**
 * Two answers, never one — they are different questions. "What does this do for
 * the pickleball I play this month" and "what does it do for the pickleball I
 * am still playing at sixty" pull in different directions, and an exercise that
 * is a weak answer to one is often the strongest answer to the other.
 */
export function PickleballWhy({ ex, compact = false }: { ex: WhyInput & { name: string }; compact?: boolean }) {
  const why = pickleballWhy(ex)
  return (
    <div className={`gym-why${compact ? ' gym-why--compact' : ''}`}>
      <div className="gym-why-head">
        <Paddle size={compact ? 40 : 58} />
        <div>
          <div className="gym-why-kicker">Why you’re doing this</div>
          <div className="gym-why-name">{ex.name}</div>
        </div>
      </div>
      <div className="gym-why-block">
        <div className="gym-why-label">🏓 Your game</div>
        <p>{why.game}</p>
      </div>
      <div className="gym-why-block">
        <div className="gym-why-label">🛡 Your next twenty years</div>
        <p>{why.longevity}</p>
      </div>
    </div>
  )
}
