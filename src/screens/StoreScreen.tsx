import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID } from '../store/storage'
import { BACKGROUND_CATALOG, backgroundUrl } from '../logic/backgrounds'
import { BACKGROUND_COST } from '../logic/economy'
import { giftCardDaysLeft, prizesFor } from '../logic/quiz'
import { BerryCoin } from '../components/BerryCoin'
import { DevilFruit } from '../components/DevilFruit'
import { sfx } from '../audio'

const FLASHES = 26 // how many backgrounds flash by before the reveal

export function StoreScreen() {
  const [tab, setTab] = useState<'backgrounds' | 'treasures'>('backgrounds')
  return (
    <div className="screen">
      <div className="h1" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BerryCoin size={26} /> Nami’s Black Market
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Rare goods, non-negotiable prices. All sales final.
      </p>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={tab === 'backgrounds' ? 'on' : ''} onClick={() => { sfx.click(); setTab('backgrounds') }}>
          🖼️ Backgrounds
        </button>
        <button className={tab === 'treasures' ? 'on' : ''} onClick={() => { sfx.click(); setTab('treasures') }}>
          🏴‍☠️ Treasures
        </button>
      </div>
      {tab === 'backgrounds' ? <BackgroundsTab /> : <TreasuresTab />}
    </div>
  )
}

function BackgroundsTab() {
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
    <div>
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

// --- treasures (real prizes paid with Devil Fruits from final tests) --------

function TreasuresTab() {
  const { data, activeProfileId, buyGiftCard } = useStore()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // each profile shops from its own catalog with its own 🍇
  const catalog = prizesFor(activeProfileId ?? '')
  const fruits = data.economy.devilFruits
  const unpaidCount = data.giftcards.filter((p) => !p.paidAt).length
  const daysLeft = giftCardDaysLeft(data)
  const history = [...data.giftcards].reverse()
  const isAdmin = activeProfileId !== KID_ID

  function buy(itemId: string, cost: number) {
    const result = buyGiftCard(itemId)
    setConfirming(null)
    if (result === 'ok') {
      sfx.bigWin()
      setMsg(isAdmin ? 'Ordered! It’s on your Captain’s desk to settle. 🏴‍☠️' : 'Ordered! Dad got the signal — he’ll sort out the real prize. 🏴‍☠️')
    } else {
      sfx.error()
      setMsg(
        result === 'broke'
          ? `You need ${cost} 🍇 for that — pass official final tests at the Academy!`
          : `The merchant ship returns in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. One treasure per month!`,
      )
    }
  }

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <DevilFruit size={34} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>{fruits} Devil Fruit{fruits === 1 ? '' : 's'}</div>
          <div className="muted" style={{ fontSize: 12 }}>Win them by passing official final tests at the Academy.</div>
        </div>
        {daysLeft > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--orange)' }}>{daysLeft}</div>
            <div className="muted" style={{ fontSize: 10 }}>days until next<br />treasure</div>
          </div>
        )}
      </div>

      {unpaidCount > 0 && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--yellow)' }}>
          <div style={{ fontWeight: 900 }}>⏳ {unpaidCount} treasure{unpaidCount > 1 ? 's' : ''} waiting to be handed over</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {isAdmin ? 'Settle them from your Captain’s desk (Me tab).' : 'Dad has a big warning on his profile — he’ll mark it “paid” when it’s in your hands.'}
            {' '}They stack up if more arrive — nothing is lost.
          </div>
        </div>
      )}

      {catalog.map((g) => (
        <div key={g.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={g.logo} alt={g.label} width={46} height={46} draggable={false} className="spin-loop prize-logo" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>{g.emoji} {g.label}</div>
            <div className="muted" style={{ fontSize: 12 }}>A real treasure. Limit: 1 purchase per month.</div>
          </div>
          {confirming === g.id ? (
            <button className="btn btn--red btn--small" onClick={() => buy(g.id, g.cost)}>
              Confirm 🍇{g.cost}
            </button>
          ) : (
            <button
              className="btn btn--small"
              disabled={fruits < g.cost || daysLeft > 0}
              onClick={() => {
                sfx.click()
                setConfirming(g.id)
                window.setTimeout(() => setConfirming((c) => (c === g.id ? null : c)), 3000)
              }}
            >
              🍇{g.cost}
            </button>
          )}
        </div>
      ))}
      {msg && (
        <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          {msg}
        </p>
      )}

      {history.length > 0 && (
        <>
          <div className="h2">🧾 Past treasures</div>
          {history.map((p) => (
            <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{p.label}</div>
              <div className="muted" style={{ fontSize: 12 }}>{p.day}</div>
              <span className="chip" style={p.paidAt ? { background: 'var(--green)', color: '#10230a' } : { background: 'var(--orange)', color: '#3a2000' }}>
                {p.paidAt ? '✓ paid' : '⏳ pending'}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
