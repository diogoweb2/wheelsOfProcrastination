import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore'
import { PARENT_ID, KID_ID } from './store/storage'
import { PinLock } from './components/PinLock'
import { EventModal } from './components/EventModal'
import { StreakPrompts } from './components/StreakPrompts'
import { SpinScreen } from './screens/SpinScreen'
import { StoreScreen } from './screens/StoreScreen'
import { AlbumScreen } from './screens/AlbumScreen'
import { TasksScreen } from './screens/TasksScreen'
import { QuizScreen } from './screens/QuizScreen'
import { BankScreen } from './screens/BankScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { scheduleDailyReminder } from './notifications'
import { backgroundUrl } from './logic/backgrounds'
import { BerryCoin } from './components/BerryCoin'
import { DevilFruit } from './components/DevilFruit'
import { Beli } from './components/Beli'
import { fmt$, totalTreasure } from './logic/bank'
import { sfx } from './audio'

type Tab = 'spin' | 'store' | 'album' | 'quiz' | 'bank' | 'me'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'spin', icon: '', label: 'Spin' }, // icon is the spinning Luffy head img, special-cased in the tabbar
  { id: 'store', icon: '', label: 'Store' }, // icon is the <BerryCoin /> svg, special-cased in the tabbar
  { id: 'album', icon: '📖', label: 'Album' },
  { id: 'quiz', icon: '🧭', label: 'Quiz' },
  { id: 'bank', icon: '🏦', label: 'Bank' }, // real-dollar Grand Line Bank (badges moved to Me → Voyage)
  { id: 'me', icon: '👒', label: 'Me' },
]

/** Renders a number that visibly counts up/down to its new value (topbar currencies). */
function AnimatedNum({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    const start = performance.now()
    const dur = 700
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      setShown(Math.round(from + (value - from) * p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{shown}</>
}

export default function App() {
  const { data, activeProfileId, ready, cloudError, rollover, activeProfile, kidData, markGiftCardPaid, ackBankPayback, market, trades } = useStore()
  const [tab, setTab] = useState<Tab>('spin')
  const [tasksOpen, setTasksOpen] = useState(false) // quest log lives behind the floating "+" now
  const unlocked = activeProfileId !== null

  // process missed days on open and whenever the app regains focus (day may have flipped)
  useEffect(() => {
    rollover()
    const onVis = () => document.visibilityState === 'visible' && rollover()
    document.addEventListener('visibilitychange', onVis)
    const interval = window.setInterval(rollover, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (unlocked && 'Notification' in window && Notification.permission === 'granted') {
      void scheduleDailyReminder(data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, data.settings.reminderHour, data.completions.length])

  // best-effort local ping when a new payback from Ben lands while Diogo's app is open
  const paybackCount =
    activeProfileId === PARENT_ID ? (kidData?.bank.txns.filter((t) => t.type === 'payback' && !t.ackAt).length ?? 0) : 0
  const prevPaybacks = useRef(paybackCount)
  useEffect(() => {
    if (paybackCount > prevPaybacks.current && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('📨 Ben paid you back!', { body: 'Open the Bank tab to see it and tap “Got it”.' })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevPaybacks.current = paybackCount
  }, [paybackCount])

  // ping when a sticker swap offer lands while the app is open
  const openTrades = trades.filter((t) => t.status === 'pending' && t.toId === activeProfileId)
  const prevTrades = useRef(openTrades.length)
  useEffect(() => {
    if (openTrades.length > prevTrades.current && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🤝 A trade offer!', { body: 'Someone wants to swap stickers. Open the Album tab.' })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevTrades.current = openTrades.length
  }, [openTrades.length])

  if (cloudError) {
    return (
      <div className="app" style={{ justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 48 }}>🌊🚫</div>
          <h1 className="h1" style={{ marginTop: 8 }}>Can’t reach the crew’s log</h1>
          <p className="muted" style={{ maxWidth: 320, margin: '8px auto' }}>
            Couldn’t connect to Firebase. Check your connection — and that the Firebase config, Firestore, and
            Anonymous sign-in are set up.
          </p>
          <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>{cloudError}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="app" style={{ justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <div className="float" style={{ fontSize: 56 }}>👒</div>
          <p className="muted" style={{ marginTop: 12 }}>Hoisting the sails…</p>
        </div>
      </div>
    )
  }

  if (!unlocked) return <PinLock />

  const streakAlive = data.streak.current > 0
  const meIcon = activeProfile()?.emoji ?? '👒'

  // whichever background the user equipped in the Store; none = plain solid color
  const bg = data.backgrounds.active

  // admin-only: Ben's Interac-style paybacks waiting for a "Got it"
  const pendingPaybacks =
    activeProfileId === PARENT_ID ? (kidData?.bank.txns.filter((t) => t.type === 'payback' && !t.ackAt) ?? []) : []

  // admin-only persistent warning: unsettled prize purchases (Ben's and Diogo's own)
  const unpaidGifts =
    activeProfileId === PARENT_ID
      ? [
          ...(kidData?.giftcards.filter((p) => !p.paidAt).map((p) => ({ who: 'Ben', targetId: KID_ID, p })) ?? []),
          ...data.giftcards.filter((p) => !p.paidAt).map((p) => ({ who: 'You', targetId: PARENT_ID, p })),
        ]
      : []

  return (
    <div
      className="app"
      style={
        bg
          ? {
              background: `linear-gradient(rgb(12 35 56 / 35%), rgb(12 35 56 / 50%)), url(${backgroundUrl(bg)}) center / cover no-repeat var(--bg)`,
            }
          : undefined
      }
    >
      <header className="topbar">
        <div className={`stat stat--flame ${streakAlive ? '' : 'dead'}`} title="streak">
          🔥 <span className="num">{data.streak.current}</span>
        </div>
        <div className="stat stat--ice" title="streak freezes">
          🧊 <span className="num">{data.economy.freezes}</span>
        </div>
        {/* Ben's own bank money — chests he can cash out, never Dad's RESP */}
        {(activeProfileId === KID_ID || kidData) && (
          <div className="stat stat--beli" title="Ben's money (his chests — not Dad's RESP)">
            <Beli size={18} />{' '}
            <span className="num">
              {fmt$(totalTreasure(activeProfileId === KID_ID ? data.bank : kidData!.bank))}
            </span>
          </div>
        )}
        {/* Devil Fruits sit right next to the Berries; the parent sees Ben's count */}
        {(activeProfileId === KID_ID || kidData) && (
          <div className="stat stat--fruit" title="Ben's Devil Fruits (3 = gift card)">
            <DevilFruit size={18} /> <span className="num"><AnimatedNum value={activeProfileId === KID_ID ? data.economy.devilFruits : (kidData?.economy.devilFruits ?? 0)} /></span>
          </div>
        )}
        <div className="stat stat--gem" title="Berries">
          🪙 <span className="num"><AnimatedNum value={data.economy.gems} /></span>
        </div>
      </header>

      {activeProfileId === PARENT_ID && market?.status === 'failed' && (
        <div className="banner" style={{ background: 'var(--red)' }}>
          <span style={{ fontSize: 20 }}>📉</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>Market feed update failed</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              last try {market.lastAttemptDay ?? '—'} · retries daily · sim uses fallback rates meanwhile
            </div>
          </div>
        </div>
      )}

      {openTrades.map((t) => (
        <div className="banner" key={t.id} style={{ background: 'var(--red)' }}>
          <span style={{ fontSize: 20 }}>🤝</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{t.fromName} wants to trade stickers!</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {t.give.length} for {t.want.length} · tap to see the deal
            </div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.click(); setTab('album') }}>
            See it
          </button>
        </div>
      ))}

      {pendingPaybacks.map((t) => (
        <div className="banner" key={t.id}>
          <span style={{ fontSize: 20 }}>📨</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>Ben paid you ${t.amount.toFixed(2)}{t.note ? ` — ${t.note}` : ''}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>sent {t.day} · straight from his Pocket Chest</div>
          </div>
          <button
            className="btn btn--small"
            onClick={() => {
              sfx.gem()
              ackBankPayback(t.id)
            }}
          >
            ✓ Got it
          </button>
        </div>
      ))}

      {unpaidGifts.map(({ who, targetId, p }) => (
        <div className="banner" key={p.id}>
          <span style={{ fontSize: 20 }}>🎁</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{who === 'You' ? 'You bought' : `${who} bought`}: {p.label}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>ordered {p.day} · get the real prize, then tap Paid</div>
          </div>
          <button
            className="btn btn--small"
            onClick={() => {
              sfx.gem()
              markGiftCardPaid(targetId, p.id)
            }}
          >
            ✓ Paid
          </button>
        </div>
      ))}

      {tab === 'spin' && <SpinScreen />}
      {tab === 'store' && <StoreScreen />}
      {tab === 'album' && <AlbumScreen />}
      {tab === 'quiz' && <QuizScreen />}
      {tab === 'bank' && <BankScreen />}
      {tab === 'me' && <ProfileScreen goSpin={() => setTab('spin')} />}

      {/* the quest log moved behind a Material-style floating "+" */}
      {!tasksOpen && (
        <button
          className="fab"
          title="Quest log"
          onClick={() => {
            sfx.click()
            setTasksOpen(true)
          }}
        >
          +
        </button>
      )}
      {tasksOpen && (
        <div className="tasks-overlay">
          <div className="quiz-full-head">
            <div style={{ fontWeight: 900, flex: 1, fontSize: 15 }}>📋 Quest log</div>
            <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setTasksOpen(false) }}>
              ✕
            </button>
          </div>
          <div className="tasks-overlay-body">
            <TasksScreen
              goSpin={() => {
                setTasksOpen(false)
                setTab('spin')
              }}
            />
          </div>
        </div>
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => {
              sfx.click()
              setTab(t.id)
            }}
          >
            <span className="tab-icon">
              {t.id === 'me' ? (
                meIcon
              ) : t.id === 'store' ? (
                <BerryCoin size={23} />
              ) : t.id === 'spin' ? (
                <img src="/luffy-spin-icon.png" className="spin-loop" width={26} alt="" draggable={false} style={{ display: 'block' }} />
              ) : (
                t.icon
              )}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <EventModal />
      <StreakPrompts />
    </div>
  )
}
