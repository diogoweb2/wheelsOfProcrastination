import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import { FREEZE_COST, MAX_FREEZES, STREAK_GOAL_OPTIONS, streakGoalBonus } from '../logic/economy'
import { addDays, dayKey } from '../logic/dates'
import { AdminSection } from '../components/AdminSection'
import { Luffy } from '../components/Luffy'
import { HabitsSection } from '../components/HabitsSection'
import { MapSection } from '../components/MapSection'
import { IdeasSection } from '../components/IdeasSection'
import { TimeZoneSection } from '../components/TimeZoneSection'
import { sfx } from '../audio'
import { ensurePermission, scheduleDailyReminder } from '../notifications'

export function ProfileScreen({ goSpin }: { goSpin: () => void }) {
  const { data, buyFreeze, setStreakGoal, setSettings, pushEvent, activeProfile, logout, freezeRequests, askForFreeze, cancelFreezeRequest, activeProfileId, registerPushDevice } = useStore()
  const [notifState, setNotifState] = useState<string | null>(null)
  const [freezeReason, setFreezeReason] = useState('')
  const [pushState, setPushState] = useState<string | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const registered = data.pushTokens.length > 0
  const askedFreeze = freezeRequests.some((r) => r.status === 'pending' && r.fromId === activeProfileId)
  const [section, setSection] = useState<'me' | 'voyage' | 'ideas' | 'timezone' | 'settings' | 'admin'>('me')
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

  async function onEnablePush() {
    setPushBusy(true)
    const err = await registerPushDevice()
    setPushBusy(false)
    setPushState(err ?? 'Push is on for this device! 📲 Even with the app closed.')
    if (err) sfx.error()
    else sfx.gem()
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
          👤 {me?.name}
        </button>
        <button className={section === 'voyage' ? 'on' : ''} onClick={() => { sfx.click(); setSection('voyage') }}>
          🗺️ Voyage
        </button>
        <button className={section === 'ideas' ? 'on' : ''} onClick={() => { sfx.click(); setSection('ideas') }}>
          💡 Ideas
        </button>
        <button className={section === 'timezone' ? 'on' : ''} onClick={() => { sfx.click(); setSection('timezone') }}>
          🕐 Time Zone
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
          <div style={{ fontWeight: 900, flex: 1 }}>🎯 Streak goal — +🪙{streakGoalBonus(data.settings.streakGoal)} when you hit it</div>
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

      {/* the kid can always ask Dad to cover a day he couldn't be here for */}
      {me?.id !== PARENT_ID && (
        <div className="card" style={{ marginBottom: 14 }}>
          {askedFreeze ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 26 }}>📨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900 }}>Dad got your message</div>
                <div className="muted" style={{ fontSize: 13 }}>He’ll send a freeze if it’s fair. Hang tight!</div>
              </div>
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); cancelFreezeRequest() }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="field">
              <label>Couldn’t be here? Ask Dad</label>
              <input
                type="text"
                value={freezeReason}
                maxLength={120}
                placeholder="I was on a trip and had no wifi…"
                onChange={(e) => setFreezeReason(e.target.value)}
                style={{ marginTop: 4 }}
              />
              <button
                className="btn btn--blue btn--small"
                style={{ marginTop: 8, alignSelf: 'flex-start' }}
                onClick={() => {
                  sfx.click()
                  askForFreeze(freezeReason)
                  setFreezeReason('')
                }}
              >
                🆘 Ask for a free freeze
              </button>
            </div>
          )}
        </div>
      )}
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

      {/* trophy shelf (used to be the Badges tab — the tabbar spot went to the Bank) */}
      <div className="h2">🏅 Trophy shelf — {data.badges.length} collected</div>
      {data.badges.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>🏝️</div>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Empty shelf. Very minimalist. Very sad. Go earn some badges!
          </p>
        </div>
      ) : (
        <div className="badge-shelf">
          {[...data.badges].reverse().map((b) => (
            <div key={b.id} className="badge-tile" title={b.description}>
              <div className="e">{b.emoji}</div>
              <div className="t">{b.title}</div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {section === 'ideas' && <IdeasSection />}

      {section === 'timezone' && <TimeZoneSection />}

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
          Daily reminders fire while the app is installed/open. For pings that reach you with the app CLOSED
          (freeze asks, trades), turn on push below.
        </p>

        {/* web push — the only thing that reaches a closed app */}
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 12, paddingTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 4 }}>📲 Push to this device</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            {registered
              ? `On for ${data.pushTokens.length} device${data.pushTokens.length === 1 ? '' : 's'}. Turn it on once per device you use.`
              : 'Get pinged even when the app is closed. On iPhone, add the app to your Home Screen first.'}
          </p>
          <button className="btn btn--blue" disabled={pushBusy} onClick={onEnablePush}>
            {pushBusy ? 'Asking…' : registered ? '➕ Register this device too' : '📲 Turn on push'}
          </button>
          {pushState && (
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              {pushState}
            </p>
          )}
        </div>
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
