// One special card, opened like a pack — the same three beats wherever a card
// is shown, so a card you were DEALT and a card you SET OFF look and sound like
// the same object:
//
//   1. sealed foil, rattling and catching the light (~0.95s)
//   2. the rip, and the card bursting out
//   3. the face, sitting there until it is dismissed
//
// A rare is deliberately a bigger event: the room flashes, golden rays spin up
// behind it and the sting becomes a five-note fanfare.
import { useEffect, useState } from 'react'
import { cardBadge, type SeaCardDef } from '../logic/seaCards'
import { stickerUrl } from '../logic/album'
import { seaSfx, sfx } from '../audio'

export function SeaCardReveal({
  card,
  art = '',
  top,
  note = null,
  counter = null,
  buttonLabel,
  onDone,
}: {
  card: SeaCardDef
  /** Sticker id for the picture, if this card has one. */
  art?: string
  /** The line above the card — where it was found, or which of three this is. */
  top: string
  /** What it actually did. Only a card that has GONE OFF has this. */
  note?: string | null
  /** "2 of 3" while dealing a hand. */
  counter?: string | null
  buttonLabel: string
  onDone: () => void
}) {
  const rare = card.rarity === 'rare'
  const [opened, setOpened] = useState(false)

  // The pause before the rip is the point: it is where "what is it?" happens.
  // Without it a card is a dialog box.
  useEffect(() => {
    setOpened(false)
    seaSfx.card()
    const t = window.setTimeout(() => {
      setOpened(true)
      seaSfx.rip()
      window.setTimeout(() => (rare ? seaSfx.rare() : seaSfx.common()), 190)
    }, 950)
    return () => window.clearTimeout(t)
  }, [card.id, top, rare])

  return (
    <div className={`sea-pop${rare && opened ? ' is-rare' : ''}`} role="dialog" aria-modal="true">
      {!opened ? (
        <div className="sea-pack">
          <div className="sea-pack-foil">
            <span className="sea-pack-mark">🏴‍☠️</span>
            <span className="sea-pack-shine" aria-hidden />
          </div>
          <div className="sea-pack-where">{top}…</div>
        </div>
      ) : (
        <>
          {rare && <span className="sea-rays" aria-hidden />}
          <div className={`sea-pop-card sea-pop-card--${card.side}${rare ? ' is-rare' : ''}`}>
            {counter && <div className="sea-pop-count">{counter}</div>}
            {rare && <span className="sea-pop-rare">★ RARE ★</span>}
            <div className="sea-pop-where">{top}</div>
            <div className="sea-pop-art">
              {art ? <img src={stickerUrl(art)} alt="" /> : null}
              <span className="sea-pop-emoji">{card.emoji}</span>
            </div>
            <div className="sea-pop-name">{card.name}</div>
            {/* The effect, on its own, in the biggest type on the card — it is
                the only line that changes what you do next. */}
            <div className="sea-pop-effect">{card.text}</div>
            <div className="sea-pop-side">
              {cardBadge(card)} {card.side === 'bad' ? 'Bad for whoever buried it' : 'Backfires on whoever found it'}
            </div>
            {note && <div className="sea-pop-note">{note}</div>}
            <div className="sea-pop-who">{card.who}</div>
            <button className="btn btn--small" onClick={() => { sfx.click(); onDone() }}>
              {buttonLabel}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
