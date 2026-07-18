import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { BACKGROUND_CATALOG, backgroundUrl } from '../logic/backgrounds'
import { BACKGROUND_COST } from '../logic/economy'
import { BerryCoin } from '../components/BerryCoin'
import { sfx } from '../audio'

const FLASHES = 26 // how many backgrounds flash by before the reveal

export function StoreScreen() {
  const { data, buyBackground, equipBackground } = useStore()
  const [rolling, setRolling] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [justWon, setJustWon] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const owned = data.backgrounds.owned
  const allOwned = owned.length >= BACKGROUND_CATALOG.length

  // preload the whole catalog so the flash animation doesn't stutter
  useEffect(() => {
    for (const id of BACKGROUND_CATALOG) {
      const img = new Image()
      img.src = backgroundUrl(id)
    }
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  function roll(won: string) {
    setRolling(true)
    setJustWon(null)
    setMsg(null)
    const start = BACKGROUND_CATALOG.indexOf(won) + 1 // so the sequence lands on the prize
    let step = 0
    const tick = () => {
      if (step < FLASHES) {
        setPreview(BACKGROUND_CATALOG[(start + step) % BACKGROUND_CATALOG.length])
        sfx.tick()
        // starts frantic, eases to a crawl — same feel as the wheel
        const t = step / FLASHES
        timer.current = window.setTimeout(tick, 55 + 420 * t * t)
        step += 1
      } else {
        setPreview(won)
        setRolling(false)
        setJustWon(won)
        sfx.fanfare()
      }
    }
    tick()
  }

  function onBuy() {
    if (rolling) return
    const result = buyBackground()
    if (result === 'broke') {
      sfx.error()
      setMsg(`Nami checked your pockets. Come back with ${BACKGROUND_COST} 🪙.`)
    } else if (result === 'complete') {
      sfx.error()
      setMsg('You own every background on the Grand Line. Legendary.')
    } else {
      sfx.spend()
      roll(result)
    }
  }

  return (
    <div className="screen">
      <div className="h1" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BerryCoin size={26} /> Nami’s Black Market
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Rare goods, non-negotiable prices. All sales final.
      </p>

      {/* mystery background gacha */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>✨ Mystery Background</div>
            <div className="muted" style={{ fontSize: 13 }}>
              A random ship wallpaper. You get what the sea gives you. Tap one in your collection to equip it.
            </div>
          </div>
          <img src="/nami.png" width={48} height={48} alt="Nami" draggable={false} style={{ objectFit: 'contain', flexShrink: 0 }} />
        </div>

        <div
          style={{
            height: 300,
            borderRadius: 12,
            border: '2px solid var(--line)',
            background: preview
              ? `url(${backgroundUrl(preview)}) center / cover no-repeat`
              : 'var(--bg2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            overflow: 'hidden',
          }}
        >
          {!preview && <div style={{ fontSize: 64, opacity: 0.5 }}>❓</div>}
          {justWon && !rolling && (
            <div
              style={{
                background: 'rgb(0 0 0 / 60%)',
                padding: '8px 16px',
                borderRadius: 12,
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              🎉 It’s yours!
            </div>
          )}
        </div>

        <button className="btn" disabled={rolling || allOwned} onClick={onBuy}>
          {rolling ? 'The sea decides…' : allOwned ? 'Sold out — you own them all!' : `Buy Mystery Background · 🪙${BACKGROUND_COST}`}
        </button>
        {msg && (
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            {msg}
          </p>
        )}
      </div>

      {/* collection */}
      <div className="h2">🖼️ Collection ({owned.length}/{BACKGROUND_CATALOG.length})</div>
      <div
        className="card"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}
      >
        {BACKGROUND_CATALOG.map((id) => {
          const has = owned.includes(id)
          const equipped = data.backgrounds.active === id
          return (
            <button
              key={id}
              disabled={!has}
              onClick={() => {
                sfx.click()
                equipBackground(equipped ? null : id) // tap again to go back to plain
              }}
              style={{
                aspectRatio: '9 / 16',
                borderRadius: 8,
                border: `2px solid ${equipped ? 'var(--green)' : has ? 'var(--yellow)' : 'var(--line)'}`,
                background: has ? `url(${backgroundUrl(id)}) center / cover no-repeat` : 'var(--bg2)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                color: 'var(--muted)',
                fontWeight: 900,
                padding: 0,
              }}
            >
              {!has && <span style={{ alignSelf: 'center' }}>?</span>}
              {equipped && (
                <span
                  style={{
                    background: 'var(--green)',
                    color: '#0c2338',
                    fontSize: 10,
                    borderRadius: 6,
                    padding: '1px 5px',
                    marginBottom: 4,
                  }}
                >
                  ON
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
