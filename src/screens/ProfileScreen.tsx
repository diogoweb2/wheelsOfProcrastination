import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import { FREEZE_COST, MAX_FREEZES, STREAK_GOAL_OPTIONS } from '../logic/economy'
import { addDays, dayKey } from '../logic/dates'
import { AdminSection } from '../components/AdminSection'
import { Luffy } from '../components/Luffy'
import { HabitsSection } from '../components/HabitsSection'
import { MapSection } from '../components/MapSection'
import { sfx } from '../audio'
import { ensurePermission, scheduleDailyReminder } from '../notifications'

export function ProfileScreen({ goSpin }: { goSpin: () => void }) {
  const { data, buyFreeze, setStreakGoal, setSettings, pushEvent, activeProfile, logout } = useStore()
  const [notifState, setNotifState] = useState<string | null>(null)
  const [section, setSection] = useState<'me' | 'voyage' | 'settings' | 'admin'>('me')
  const me = activeProfile()

  const today = dayKey()
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6)
    const done = data.completions.some((c) => c.day === day)
    const frozen = data.frozenDays.some((f) => f.day === day)
    return { day, done, frozen, isToday: day === today }
  })

  function onBuyFreeze() {
    if (buyFreeze()) {
      sfx.freeze()
      pushEvent({
        type: 'frozen',
        emoji: '🧊',
        title: 'Freeze acquired',
        description: 'One skipped day, pre-forgiven. Chopper\'s got your back!',
      })
    } else {
      sfx.error()
    }
  }

  async function enableNotifications() {
    const ok = await ensurePermission()
    setNotifState(ok ? 'Reminders on! I\'ll call you for adventure every day! 👒' : 'Blocked. No worries — spin whenever you\'re ready!')
    if (ok) await scheduleDailyReminder(data)
  }

  const streakAlive = data.streak.current > 0
  const isAdmin = me?.id === PARENT_ID

  return (
    <div className="screen">
      {/* who's logged in */}
      {me && (
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 36, lineHeight: 1 }}>{me.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{me.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>logged in on this device</div>
          </div>
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              sfx.click()
              logout()
            }}
          >
            Switch crewmate
          </button>
        </div>
      )}

      {/* sub-sections keep this screen sane: daily stuff first, admin last */}
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={section === 'me' ? 'on' : ''} onClick={() => { sfx.click(); setSection('me') }}>
          👤 Me
        </button>
        <button className={section === 'voyage' ? 'on' : ''} onClick={() => { sfx.click(); setSection('voyage') }}>
          🗺️ Voyage
        </button>
        <button className={section === 'settings' ? 'on' : ''} onClick={() => { sfx.click(); setSection('settings') }}>
          ⚙️ Settings
        </button>
        {isAdmin && (
          <button className={section === 'admin' ? 'on' : ''} onClick={() => { sfx.click(); setSection('admin') }}>
            🛠️ Admin
          </button>
        )}
      </div>

      {section === 'admin' && isAdmin && <AdminSection />}

      {section === 'me' && (
        <>
          {/* streak hero */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>{streakAlive ? '🔥' : '🪦'}</div>
        <div style={{ fontSize: 44, fontWeight: 900, color: streakAlive ? 'var(--orange)' : 'var(--muted)' }}>
          {data.streak.current}
        </div>
        <div className="muted" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
          day streak · best {data.streak.best}
        </div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
          {week.map((d) => (
            <div key={d.day} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                {new Date(d.day + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
              </div>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  marginTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 14,
                  background: d.done ? 'var(--orange)' : d.frozen ? 'var(--ice)' : 'var(--bg2)',
                  color: d.done || d.frozen ? '#3a2000' : 'var(--muted)',
                  border: d.isToday ? '2px solid var(--text)' : '2px solid var(--line)',
                }}
              >
                {d.done ? '✓' : d.frozen ? '🧊' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* streak goal */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontWeight: 900, flex: 1 }}>🎯 Streak goal — +50 🪙 when you hit it</div>
          <img src="/nami.png" width={48} height={48} alt="Nami" draggable={false} style={{ objectFit: 'contain', flexShrink: 0 }} />
        </div>
        <div className="seg">
          {STREAK_GOAL_OPTIONS.map((g) => (
            <button
              key={g}
              className={data.settings.streakGoal === g ? 'on' : ''}
              style={data.settings.goalsReached.includes(g) ? { color: 'var(--green)' } : undefined}
              onClick={() => {
                sfx.click()
                setStreakGoal(g)
              }}
            >
              {data.settings.goalsReached.includes(g) ? `${g}✓` : g}
            </button>
          ))}
        </div>
      </div>

      {/* freeze shop */}
      <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        <img src="/chopper.webp" width={54} height={66} alt="Chopper" draggable={false} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>Streak Freeze ({data.economy.freezes}/{MAX_FREEZES})</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Auto-saves your streak when you miss a day. Stock up BEFORE the storm, not after.
          </div>
        </div>
        <button
          className="btn btn--blue btn--small"
          disabled={data.economy.freezes >= MAX_FREEZES || data.economy.gems < FREEZE_COST}
          onClick={onBuyFreeze}
        >
          🪙{FREEZE_COST}
        </button>
      </div>
        </>
      )}

      {section === 'voyage' && (
        <>
      {/* stats */}
      <div className="h2">📈 Lifetime</div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>{data.completions.length}</div>
          <div className="muted" style={{ fontSize: 11 }}>tasks done</div>
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--blue)' }}>{data.economy.totalGemsEarned}</div>
          <div className="muted" style={{ fontSize: 11 }}>Berries earned</div>
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--orange)' }}>{data.streak.best}</div>
          <div className="muted" style={{ fontSize: 11 }}>best streak</div>
        </div>
      </div>

      {/* voyage map (used to be its own tab) */}
      <MapSection goSpin={goSpin} />

      {/* habits training log */}
      <HabitsSection />
        </>
      )}

      {section === 'settings' && (
        <>
      <div className="h2">⚙️ Settings</div>
      <div className="card">
        <div className="field">
          <label>Daily reminder hour</label>
          <select
            value={data.settings.reminderHour}
            onChange={(e) => {
              setSettings({ reminderHour: Number(e.target.value) })
              void scheduleDailyReminder({ ...data, settings: { ...data.settings, reminderHour: Number(e.target.value) } })
            }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn--blue" onClick={enableNotifications}>
          🔔 Enable daily reminders
        </button>
        {notifState && (
          <p className="muted" style={{ marginTop: 8 }}>
            {notifState}
          </p>
        )}
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Note: until Firebase push is wired up, reminders fire best-effort while the app is installed/open.
        </p>
        <button
          className="btn btn--ghost"
          style={{ marginTop: 10 }}
          onClick={() => {
            setSettings({ soundOn: !data.settings.soundOn })
            sfx.click()
          }}
        >
          {data.settings.soundOn ? '🔊 Sound on' : '🔇 Sound off'}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Luffy mood="cool" size={110} />
        <p className="muted" style={{ fontSize: 12 }}>Wheels of Procrastination v1 · {me ? `sailing as ${me.name}` : 'no servers'}</p>
      </div>
        </>
      )}
    </div>
  )
}
