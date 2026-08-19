// One card face, and the press-and-hold that makes it readable.
//
// Two things force the design here:
//   1. The art is hotlinked, never stored (see logic/optcg.ts). The publisher's
//      own host refuses cross-origin embedding, so we point at a public mirror
//      and keep a second in reserve; `onError` swaps once, and after that the
//      box falls back to the printed name so a dead link is never a hole.
//   2. **The mirrored scans are the official SAMPLE images: their text box is
//      EMPTY.** So zooming the picture would not let anyone read a card. Press
//      and hold instead opens a sheet that prints the card's real numbers and
//      effect text out of our own catalog — the picture is only the picture.
import { useEffect, useRef, useState } from 'react'
import { artFallbackUrl, artUrl, card } from '../../logic/optcg'

/** How long a press has to be to mean "let me read this" rather than "play this". */
const HOLD_MS = 280

export type OptcgCardSize = 'xs' | 'sm' | 'md' | 'lg'

export function OptcgCardImg({
  code,
  size = 'sm',
  rested = false,
  onClick,
  className = '',
  title,
}: {
  code: string
  size?: OptcgCardSize
  rested?: boolean
  onClick?: () => void
  className?: string
  title?: string
}) {
  const [step, setStep] = useState(0)
  const [peek, setPeek] = useState(false)
  const timer = useRef<number | null>(null)
  const held = useRef(false)

  // A new card in the same slot starts its own fallback chain.
  useEffect(() => setStep(0), [code])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const c = card(code)

  const startHold = () => {
    held.current = false
    timer.current = window.setTimeout(() => {
      held.current = true
      setPeek(true)
    }, HOLD_MS)
  }
  const endHold = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }
  // A hold is a read, not a play: the tap that ends it must not also move the game.
  const tap = () => {
    if (held.current) { held.current = false; return }
    onClick?.()
  }

  const cls = `optcg-card optcg-card--${size}${rested ? ' optcg-card--rested' : ''}${onClick ? ' optcg-card--live' : ''} ${className}`
  const hold = {
    onPointerDown: startHold,
    onPointerUp: endHold,
    onPointerLeave: endHold,
    onPointerCancel: endHold,
    onClick: tap,
    // hold-to-read must not raise the phone's own text-selection menu
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }

  return (
    <>
      {step > 1 ? (
        <div className={`${cls} optcg-card--blank`} title={title ?? c.name} {...hold}>
          <span>{c.name}</span>
          <small>{c.code}</small>
        </div>
      ) : (
        <img
          className={cls}
          src={step === 0 ? artUrl(code) : artFallbackUrl(code)}
          alt={c.name}
          title={title ?? `${c.name} — hold to read`}
          loading="lazy"
          draggable={false}
          onError={() => setStep((s) => s + 1)}
          {...hold}
        />
      )}
      {peek && <OptcgCardSheet code={code} onClose={() => setPeek(false)} />}
    </>
  )
}

/**
 * The card, readable: big art plus the printed numbers and text, which the
 * scans themselves do not carry. Closes on any tap — it is a peek, not a dialog.
 */
export function OptcgCardSheet({ code, onClose }: { code: string; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const c = card(code)
  const kind = c.kind === 'leader' ? 'Leader' : c.kind === 'character' ? 'Character' : c.kind === 'event' ? 'Event' : 'Stage'

  return (
    <div className="optcg-peek" onPointerUp={onClose} onClick={onClose}>
      <div className="optcg-peek-box" onClick={(e) => e.stopPropagation()}>
        {step > 1 ? (
          <div className="optcg-peek-art optcg-card--blank">{c.name}</div>
        ) : (
          <img
            className="optcg-peek-art"
            src={step === 0 ? artUrl(code) : artFallbackUrl(code)}
            alt={c.name}
            onError={() => setStep((s) => s + 1)}
          />
        )}
        <div className="optcg-peek-text">
          <h3>{c.name}</h3>
          <div className="optcg-peek-line">
            <span className="chip">{kind}</span>
            {c.colors.map((col) => (
              <span key={col} className={`chip optcg-color optcg-color--${col}`}>{col}</span>
            ))}
            {c.attribute && <span className="chip">{c.attribute}</span>}
          </div>
          <div className="optcg-peek-line">
            {c.kind === 'leader' ? (
              <b>❤️ {c.life} Life</b>
            ) : (
              <b>Cost {c.cost}</b>
            )}
            {c.power > 0 && <b>⚔️ {c.power}</b>}
            {c.counter > 0 && <b className="optcg-counter">Counter +{c.counter}</b>}
          </div>
          {c.types.length > 0 && <p className="muted">{c.types.join(' / ')}</p>}
          <p className="optcg-peek-effect">{c.effect || 'No effect.'}</p>
          {c.trigger && <p className="optcg-peek-effect optcg-peek-trigger">{c.trigger}</p>}
          <p className="muted">{c.code}</p>
          <button className="btn btn--small" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/** The back of a card: hands and Life stacks that must stay face down. */
export function OptcgCardBack({ size = 'sm', label }: { size?: OptcgCardSize; label?: string }) {
  return (
    <div className={`optcg-card optcg-card--${size} optcg-card--back`}>
      <span>{label ?? '🏴‍☠️'}</span>
    </div>
  )
}
