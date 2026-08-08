import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { RARITY_RANK, treasureById, type TreasureRarity } from '../logic/treasures'
import { duelSfx, sfx } from '../audio'

/** Gap between cards flying out of the chest. */
const DEAL_MS = 700

/** Rarer pulls throw more colour. Commons throw none — that's what makes rare feel rare. */
function rarityBurst(rarity: TreasureRarity) {
  if (rarity === 'common') return
  const colors =
    rarity === 'legendary'
      ? ['#d70000', '#ffce00', '#fff', '#ff6b35']
      : rarity === 'epic'
        ? ['#a06bd8', '#d6b6ff', '#fff']
        : ['#ffce00', '#fff']
  void confetti({
    particleCount: rarity === 'legendary' ? 110 : rarity === 'epic' ? 60 : 35,
    spread: rarity === 'legendary' ? 120 : 70,
    startVelocity: rarity === 'legendary' ? 60 : 38,
    origin: { y: 0.55 },
    colors,
    scalar: rarity === 'legendary' ? 1.3 : 1,
  })
}

/**
 * The chest you crack open at the start of every duel.
 *
 * This is the loot-box moment, and it exists for one reason: a kid who lost the
 * last three matches still gets a jolt of "what did I get?" before this one
 * starts, and a Legendary in the opening hand means the match is genuinely
 * winnable no matter who has the better cards.
 *
 * Cards deal themselves out one at a time — no tapping through — so the whole
 * ceremony is over in about two seconds.
 */
export function TreasureChest({ cards, onDone }: { cards: string[]; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(0)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  function crack() {
    if (open) return
    setOpen(true)
    duelSfx.chest()
    cards.forEach((id, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setShown(i + 1)
          const rarity = treasureById(id)?.rarity ?? 'common'
          duelSfx.treasure(rarity)
          rarityBurst(rarity)
        }, 320 + i * DEAL_MS),
      )
    })
  }

  const best = cards.reduce<TreasureRarity>((top, id) => {
    const r = treasureById(id)?.rarity ?? 'common'
    return RARITY_RANK[r] > RARITY_RANK[top] ? r : top
  }, 'common')
  const allShown = shown >= cards.length

  return (
    <div className="chest-overlay">
      {!open ? (
        <button className="chest-shell" onClick={crack}>
          <span className="chest-lid">🧰</span>
          <span className="chest-title">Treasure Chest</span>
          <span className="chest-sub">Tap to crack it open</span>
        </button>
      ) : (
        <div className="chest-open">
          <div className={`chest-title is-open rarity-${best}`}>
            {allShown ? 'Your treasure!' : 'Cracking it open…'}
          </div>
          <div className="chest-cards">
            {cards.slice(0, shown).map((id, i) => {
              const t = treasureById(id)
              if (!t) return null
              return (
                <div key={`${id}-${i}`} className={`tcard tcard--big rarity-${t.rarity}`}>
                  <span className="tcard-rarity">{t.rarity === 'legendary' ? '★ LEGENDARY ★' : t.rarity}</span>
                  <span className="tcard-icon">{t.icon}</span>
                  <span className="tcard-name">{t.name}</span>
                  <span className="tcard-text">{t.text}</span>
                </div>
              )
            })}
          </div>
          <p className="chest-note">
            Play one for FREE on any turn — it doesn’t use your move. {cards.length > 1 ? 'They’re' : 'It’s'} secret:
            your opponent can’t see them.
          </p>
          {allShown && (
            <button className="btn" style={{ width: '100%' }} onClick={() => { sfx.click(); onDone() }}>
              ⚔️ Set sail →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
