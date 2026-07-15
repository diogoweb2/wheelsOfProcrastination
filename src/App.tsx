import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { PinLock } from './components/PinLock'
import { EventModal } from './components/EventModal'
import { SpinScreen } from './screens/SpinScreen'
import { MapScreen } from './screens/MapScreen'
import { TasksScreen } from './screens/TasksScreen'
import { ReportsScreen } from './screens/ReportsScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { scheduleDailyReminder } from './notifications'
import { sfx } from './audio'

type Tab = 'spin' | 'map' | 'tasks' | 'reports' | 'me'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'spin', icon: '🎡', label: 'Spin' },
  { id: 'map', icon: '🗺️', label: 'Map' },
  { id: 'tasks', icon: '📋', label: 'Tasks' },
  { id: 'reports', icon: '📊', label: 'Habits' },
  { id: 'me', icon: '👒', label: 'Me' },
]

export default function App() {
  const { data, activeProfileId, ready, cloudError, rollover } = useStore()
  const [tab, setTab] = useState<Tab>('spin')
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

  return (
    <div className="app">
      <header className="topbar">
        <div className={`stat stat--flame ${streakAlive ? '' : 'dead'}`} title="streak">
          🔥 <span className="num">{data.streak.current}</span>
        </div>
        <div className="stat stat--ice" title="streak freezes">
          🧊 <span className="num">{data.economy.freezes}</span>
        </div>
        <div className="stat stat--gem" title="Berries">
          🪙 <span className="num">{data.economy.gems}</span>
        </div>
      </header>

      {tab === 'spin' && <SpinScreen />}
      {tab === 'map' && <MapScreen goSpin={() => setTab('spin')} />}
      {tab === 'tasks' && <TasksScreen goSpin={() => setTab('spin')} />}
      {tab === 'reports' && <ReportsScreen />}
      {tab === 'me' && <ProfileScreen />}

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
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <EventModal />
    </div>
  )
}
