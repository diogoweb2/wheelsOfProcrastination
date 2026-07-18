import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { PARENT_ID, KID_ID } from './store/storage'
import { PinLock } from './components/PinLock'
import { EventModal } from './components/EventModal'
import { SpinScreen } from './screens/SpinScreen'
import { StoreScreen } from './screens/StoreScreen'
import { TasksScreen } from './screens/TasksScreen'
import { QuizScreen } from './screens/QuizScreen'
import { BadgesScreen } from './screens/BadgesScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { scheduleDailyReminder } from './notifications'
import { backgroundUrl } from './logic/backgrounds'
import { BerryCoin } from './components/BerryCoin'
import { sfx } from './audio'

type Tab = 'spin' | 'store' | 'quiz' | 'badges' | 'me'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'spin', icon: '', label: 'Spin' }, // icon is the spinning Luffy head img, special-cased in the tabbar
  { id: 'store', icon: '', label: 'Store' }, // icon is the <BerryCoin /> svg, special-cased in the tabbar
  { id: 'quiz', icon: '🧭', label: 'Quiz' },
  { id: 'badges', icon: '🏅', label: 'Badges' },
  { id: 'me', icon: '👒', label: 'Me' },
]

export default function App() {
  const { data, activeProfileId, ready, cloudError, rollover, activeProfile, kidData, markGiftCardPaid } = useStore()
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
        {/* Devil Fruits sit right next to the Berries; the parent sees Ben's count */}
        {(activeProfileId === KID_ID || kidData) && (
          <div className="stat stat--fruit" title="Ben's Devil Fruits (3 = gift card)">
            🍇 <span className="num">{activeProfileId === KID_ID ? data.economy.devilFruits : (kidData?.economy.devilFruits ?? 0)}</span>
          </div>
        )}
        <div className="stat stat--gem" title="Berries">
          🪙 <span className="num">{data.economy.gems}</span>
        </div>
      </header>

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
      {tab === 'quiz' && <QuizScreen />}
      {tab === 'badges' && <BadgesScreen />}
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
    </div>
  )
}
