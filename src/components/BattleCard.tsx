import { useRef } from 'react'
import { stickerById, stickerUrl } from '../logic/album'
import { elementInfo, statsFor, weaknessOf, type DuelCard } from '../logic/cardGame'

/**
 * One card as it appears in a duel. Three sizes, one component, because the
 * board, the bench and the deck builder all need the same face and it must be
 * impossible for the numbers to disagree between them:
 *   'bench' — thumbnail with a health bar
 *   'board' — the front line: health bar, energy element, big art
 *   'full'  — the whole card, attacks and all (deck builder, card peek)
 */
export function BattleCard({
  id,
  hp,
  max,
  size = 'board',
  state,
  selected = false,
  index,
  onClick,
  onLongPress,
  footer,
}: {
  id: string
  /** Current HP; omit outside a match and the card shows full health. */
  hp?: number
  max?: number
  size?: 'bench' | 'board' | 'full'
  /** Battle presentation: the attacker lunges, the defender flinches, the loser falls away. */
  state?: 'striking' | 'hurt' | 'ko' | 'stunned'
  selected?: boolean
  /** Position in the line-up, shown in the deck builder. */
  index?: number
  onClick?: () => void
  onLongPress?: () => void
  footer?: React.ReactNode
}) {
  const sticker = stickerById(id)
  const card = statsFor(id)
  const el = elementInfo(card.element)
  const weak = elementInfo(weaknessOf(card.element))
  const maxHp = max ?? card.hp
  const cur = hp ?? maxHp
  const pct = Math.max(0, Math.min(100, (cur / maxHp) * 100))
  const health = pct > 55 ? 'is-good' : pct > 25 ? 'is-warn' : 'is-low'

  const cls = [
    'bcard',
    `bcard--${size}`,
    `bcard--${card.element}`,
    sticker?.rarity === 'special' ? 'bcard--rare' : '',
    state ? `is-${state}` : '',
    selected ? 'is-selected' : '',
    onClick ? 'is-tappable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const Tag = onClick || onLongPress ? 'button' : 'div'

  // Hold to read the card. A held press swallows the click that follows it, so
  // reading a card in the deck builder doesn't also drop it from the crew.
  const held = useRef(false)
  const timer = useRef<number | null>(null)
  const clearHold = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }
  const startHold = () => {
    if (!onLongPress) return
    held.current = false
    clearHold()
    timer.current = window.setTimeout(() => {
      held.current = true
      onLongPress()
    }, 380)
  }

  return (
    <Tag
      type={onClick || onLongPress ? 'button' : undefined}
      className={cls}
      onClick={() => {
        if (held.current) {
          held.current = false
          return
        }
        onClick?.()
      }}
      onPointerDown={startHold}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onContextMenu={(e: React.MouseEvent) => onLongPress && e.preventDefault()}
      title={sticker?.name}
    >
      <div className="bcard-art">
        <img src={stickerUrl(id)} alt="" loading="lazy" draggable={false} />
        <span className="bcard-el" title={el.name}>
          {el.icon}
        </span>
        {index !== undefined && <span className="bcard-slot">{index === 0 ? 'FRONT' : index + 1}</span>}
        {state === 'stunned' && <span className="bcard-stun">💫</span>}
      </div>

      <div className="bcard-name">{sticker?.name ?? 'Unknown'}</div>

      <div className="bcard-hp">
        <div className={`bcard-hp-fill ${health}`} style={{ width: `${pct}%` }} />
        <span className="bcard-hp-text">
          {cur}/{maxHp}
        </span>
      </div>

      {size === 'full' && (
        <div className="bcard-body">
          <div className="bcard-tags">
            <span className="bcard-tag">
              {el.icon} {el.name}
            </span>
            <span className="bcard-tag">{card.archetype}</span>
            <span className="bcard-tag bcard-tag--weak" title={`Takes double damage from ${weak.name}`}>
              weak {weak.icon}
            </span>
          </div>
          {card.attacks.map((a, i) => (
            <div className="bcard-move" key={i}>
              <span className="bcard-cost">{'⚡'.repeat(a.cost)}</span>
              <span className="bcard-move-name">
                {a.name}
                {a.text && <em className="bcard-move-fx">{a.text}</em>}
              </span>
              <span className="bcard-dmg">{a.damage}</span>
            </div>
          ))}
          <div className="bcard-retreat">Swap out: {'⚡'.repeat(card.retreat)}</div>
        </div>
      )}

      {footer}
    </Tag>
  )
}

/** The board's version, taking the live card straight off a duel side. */
export function BoardCard(props: { card: DuelCard } & Omit<Parameters<typeof BattleCard>[0], 'id' | 'hp' | 'max'>) {
  const { card, ...rest } = props
  return <BattleCard {...rest} id={card.id} hp={card.hp} max={card.max} />
}
