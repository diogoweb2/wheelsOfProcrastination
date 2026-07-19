import { stickerUrl, type StickerDef } from '../logic/album'

/**
 * One Panini-style card. White border = common, red = special.
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
  selected = false,
  badge,
}: {
  sticker: StickerDef
  state?: 'owned' | 'missing' | 'reveal'
  count?: number // copies owned; >1 shows the spare pill
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  selected?: boolean
  badge?: string // small corner label (e.g. "NEW", "×2")
}) {
  const cls = [
    'sticker',
    `sticker--${size}`,
    `sticker--${sticker.rarity}`,
    state === 'missing' ? 'sticker--missing' : '',
    state === 'reveal' ? 'sticker--reveal' : '',
    selected ? 'sticker--selected' : '',
    onClick ? 'sticker--tappable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Not a <button> when it isn't tappable: a disabled button swallows clicks,
  // which would block the tap-anywhere overlay during a pack reveal.
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag type={onClick ? 'button' : undefined} className={cls} onClick={onClick} title={sticker.name}>
      <div className="sticker-art">
        {state === 'missing' ? (
          <span className="sticker-ghost">?</span>
        ) : (
          <img src={stickerUrl(sticker.id)} alt={sticker.name} loading="lazy" draggable={false} />
        )}
      </div>
      <div className="sticker-name">{state === 'missing' ? '???' : sticker.name}</div>
      {sticker.rarity === 'special' && state !== 'missing' && <span className="sticker-star">★</span>}
      {badge && <span className="sticker-badge">{badge}</span>}
      {count > 1 && !badge && <span className="sticker-badge">×{count}</span>}
    </Tag>
  )
}
