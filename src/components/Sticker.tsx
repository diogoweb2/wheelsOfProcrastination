import { useRef, useState } from 'react'
import { stickerUrl } from '../logic/album'
import type { CollectRarity } from '../logic/collections'

/**
 * The least a thing needs to be drawable as a card: an id, a name and a rarity.
 * A `CollectItem` out of either collection satisfies it, and so does a
 * `StickerDef` straight out of the album catalog (whose picture is derived from
 * its id).
 */
export interface CardFace {
  id: string
  name: string
  rarity: CollectRarity
  img?: string
  imgFallback?: string
}

/**
 * One Panini-style card, in either collection. White border = common, red =
 * special.
 *
 * The picture comes from the item itself when it has one (the One Piece Album's are
 * hotlinked off a public mirror, with a second mirror to fall back on) and from
 * our own `public/stickers/` when it does not — which is what every sticker in
 * the Grand Line album does.
 * `state`:
 *   'owned'   — full colour, glued in
 *   'missing' — silhouetted placeholder slot in the album
 *   'reveal'  — pack-opening presentation (bigger, glowing)
 */
export function Sticker({
  sticker,
  state = 'owned',
  count = 0,
  size = 'md',
  onClick,
  onLongPress,
  selected = false,
  badge,
  wanted = false,
}: {
  sticker: CardFace
  state?: 'owned' | 'missing' | 'reveal'
  count?: number // copies owned; >1 shows the spare pill
  size?: 'sm' | 'md' | 'lg'
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
  /** Hold to peek at the full-size card, where a plain tap already means something else (trade picking). */
  onLongPress?: (e: React.MouseEvent<HTMLElement>) => void
  selected?: boolean
  badge?: string // small corner label (e.g. "NEW", "×2")
  wanted?: boolean // the other crewmate is missing this one — the whole card lights up
}) {
  const cls = [
    'sticker',
    `sticker--${size}`,
    `sticker--${sticker.rarity}`,
    state === 'missing' ? 'sticker--missing' : '',
    state === 'reveal' ? 'sticker--reveal' : '',
    wanted ? 'sticker--wanted' : '',
    selected ? 'sticker--selected' : '',
    onClick ? 'sticker--tappable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Not a <button> when it isn't tappable: a disabled button swallows clicks,
  // which would block the tap-anywhere overlay during a pack reveal.
  const Tag = onClick || onLongPress ? 'button' : 'div'

  // Long-press to peek. Held presses suppress the click that follows, so a peek
  // on the trade screen doesn't also toggle the card into the offer.
  // Hotlinked art can 404: try the item's fallback mirror, then give up and
  // show the name, so a dead link is never an empty hole in the album.
  const [imgStep, setImgStep] = useState(0)
  const src = imgStep === 0 ? (sticker.img ?? stickerUrl(sticker.id)) : sticker.imgFallback
  const held = useRef(false)
  const timer = useRef<number | null>(null)
  const clearHold = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }
  const startHold = (e: React.MouseEvent<HTMLElement>) => {
    if (!onLongPress) return
    held.current = false
    const el = e.currentTarget
    clearHold()
    timer.current = window.setTimeout(() => {
      held.current = true
      onLongPress({ ...e, currentTarget: el } as React.MouseEvent<HTMLElement>)
    }, 380)
  }

  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      className={cls}
      title={sticker.name}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        if (held.current) {
          held.current = false // this press was a peek, not a pick
          return
        }
        onClick?.(e)
      }}
      onPointerDown={startHold}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onContextMenu={(e: React.MouseEvent) => onLongPress && e.preventDefault()}
    >
      <div className="sticker-art">
        {state === 'missing' ? (
          <span className="sticker-ghost">?</span>
        ) : src ? (
          <img
            src={src}
            alt={sticker.name}
            loading="lazy"
            draggable={false}
            onError={() => setImgStep((n) => n + 1)}
          />
        ) : (
          <span className="sticker-ghost">{sticker.name}</span>
        )}
      </div>
      <div className="sticker-name">{state === 'missing' ? '???' : sticker.name}</div>
      {sticker.rarity === 'special' && state !== 'missing' && <span className="sticker-star">★</span>}
      {/* count sits on the left so a badge never hides how many spares you hold */}
      {count > 1 && <span className="sticker-count">×{count}</span>}
      {badge && <span className="sticker-badge">{badge}</span>}
      {wanted && <span className="sticker-wanted">WANTS IT</span>}
    </Tag>
  )
}
