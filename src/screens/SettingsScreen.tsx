// ⚙️ Settings — who's sailing this device, how the app pings you, sound, and
// the about/reset corner.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import { Luffy } from '../components/Luffy'
import { sfx } from '../audio'
import { ensurePermission, scheduleDailyReminder } from '../notifications'

export function SettingsScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      {tab === 'profile' && <ProfileTab />}
      {tab === 'alerts' && <AlertsTab />}
      {tab === 'sound' && <SoundTab />}
      {tab === 'about' && <AboutTab />}
    </div>
  )
}

function ProfileTab() {
  const { activeProfile, profiles, logout } = useStore()
  const me = activeProfile()
  return (
    <>
      <div className="h2">👤 This device</div>
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

      <div className="h2">🏴‍☠️ The crew</div>
      {profiles.map((p) => (
        <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 26 }}>{p.emoji}</div>
          <div style={{ flex: 1, fontWeight: 800 }}>{p.name}</div>
          {p.id === me?.id && <span className="chip" style={{ background: 'var(--green)', color: '#06121f' }}>you</span>}
          {!p.pinHash && <span className="chip">no code yet</span>}
        </div>
      ))}
    </>
  )
}

function AlertsTab() {
  const { data, setSettings, registerPushDevice } = useStore()
  const [notifState, setNotifState] = useState<string | null>(null)
  const [pushState, setPushState] = useState<string | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const registered = data.pushTokens.length > 0

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

  return (
    <>
      <div className="h2">🔔 Reminders</div>
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
        {notifState && <p className="muted" style={{ marginTop: 8 }}>{notifState}</p>}
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
          {pushState && <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>{pushState}</p>}
        </div>
      </div>
    </>
  )
}

function SoundTab() {
  const { data, setSettings } = useStore()
  const on = data.settings.soundOn
  return (
    <>
      <div className="h2">🔊 Sound</div>
      <div className="card">
        <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
          Clicks, coin drops, the wheel tick and Luffy’s fanfare. Turn it off in class.
        </p>
        <button
          className={on ? 'btn' : 'btn btn--ghost'}
          onClick={() => {
            setSettings({ soundOn: !on })
            sfx.click()
          }}
        >
          {on ? '🔊 Sound is ON — tap to mute' : '🔇 Sound is OFF — tap to unmute'}
        </button>
        <button className="btn btn--blue" style={{ marginTop: 10 }} onClick={() => sfx.fanfare()}>
          🎺 Play a test sound
        </button>
      </div>
    </>
  )
}

/**
 * The OpenRouter key, which is shared by everything in the app that talks to a
 * model: Essays' proofreader, FC Lock's news summariser and the Gear tab's
 * equipment camera. It used to live in Gym → Coach; when the AI trainer was
 * removed that tab went with it, and this is its new home — the Gym was never
 * the right place for a key three other features depend on.
 *
 * Parent-only, because it spends real money.
 */
function ApiKeyBox() {
  const { aiConfig, setAiConfig } = useStore()
  const [key, setKey] = useState('')
  const hasKey = !!aiConfig?.openrouterKey?.trim()

  return (
    <>
      <div className="h2">🔑 OpenRouter key</div>
      <div className="card">
        <div className="field" style={{ marginBottom: 10 }}>
          <label>API key {hasKey ? '(set)' : ''}</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={hasKey ? '\u2022\u2022\u2022\u2022\u2022\u2022 \u2014 type a new one to replace it' : 'sk-or-v1-\u2026'}
            autoComplete="off"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn--small"
            style={{ flex: 1 }}
            disabled={!key.trim()}
            onClick={() => {
              sfx.gem()
              setAiConfig({ openrouterKey: key.trim() })
              setKey('')
            }}
          >
            Save key
          </button>
          {hasKey && (
            <button
              className="btn btn--ghost btn--small"
              onClick={() => {
                sfx.click()
                setAiConfig({ openrouterKey: '' })
              }}
            >
              Remove
            </button>
          )}
        </div>
        <p className="muted" style={{ fontSize: 11, lineHeight: 1.5, marginTop: 10 }}>
          Used by the essay proofreader, the football news summary and the Gear tab\u2019s equipment camera. Stored in Firestore,
          never in the app bundle or the repo, so it can be rotated without a rebuild \u2014 but anyone who can sign into this
          Firebase project can read it, so put a spend limit on it in the OpenRouter dashboard.
        </p>
      </div>
    </>
  )
}

function AboutTab() {
  const { activeProfile, activeProfileId, setSettings } = useStore()
  const me = activeProfile()
  const [reset, setReset] = useState(false)
  return (
    <>
      {activeProfileId === PARENT_ID && <ApiKeyBox />}
      <div className="h2">ℹ️ About</div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 4 }}>🏠 Home screen</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Hold any icon on the main screen to drag it somewhere else. Lost the plot? Put them back in
          factory order.
        </p>
        <button
          className="btn btn--ghost btn--small"
          onClick={() => {
            sfx.click()
            setSettings({ homeOrder: [] })
            setReset(true)
          }}
        >
          ↩︎ Reset icon layout
        </button>
        {reset && <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>Done — the icons are back in their original order.</p>}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Luffy mood="cool" size={110} />
        <p className="muted" style={{ fontSize: 12 }}>
          Wheels of Procrastination v2 · {me ? `sailing as ${me.name}` : 'no servers'}
        </p>
      </div>
    </>
  )
}
