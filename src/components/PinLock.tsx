import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Luffy } from './Luffy'
import { sfx } from '../audio'
import { crewSays } from '../logic/crewLines'

export function PinLock() {
  const { profiles, login, setupPin } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [entry, setEntry] = useState('')
  const [firstPin, setFirstPin] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [line] = useState(() => crewSays('pin'))

  const selected = profiles.find((p) => p.id === selectedId) ?? null
  const settingUp = selected ? !selected.pinHash : false

  function reset() {
    setEntry('')
    setFirstPin(null)
  }

  function fail() {
    setError(true)
    sfx.error()
    reset()
    window.setTimeout(() => setError(false), 500)
  }

  async function submit(pin: string) {
    if (!selected) return
    if (settingUp) {
      if (!firstPin) {
        setFirstPin(pin)
        setEntry('')
        return
      }
      if (firstPin !== pin) {
        fail()
        return
      }
      await setupPin(selected.id, pin)
      sfx.fanfare()
      return
    }
    const ok = await login(selected.id, pin)
    if (ok) {
      sfx.gem()
    } else {
      fail()
    }
  }

  function press(d: string) {
    sfx.click()
    const next = entry + d
    setEntry(next)
    if (next.length === 4) void submit(next)
  }

  // Step 1: pick a profile.
  if (!selected) {
    return (
      <div className="app" style={{ justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <Luffy mood="cool" size={130} className="float" />
          <h1 className="h1" style={{ marginTop: 8 }}>
            Wheels of Procrastination
          </h1>
          <p className="muted">Who's setting sail? 👒</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            {profiles.map((p) => (
              <button
                key={p.id}
                className="card"
                style={{ width: 120, padding: 18, cursor: 'pointer', textAlign: 'center', border: 'none' }}
                onClick={() => {
                  sfx.click()
                  reset()
                  setSelectedId(p.id)
                }}
              >
                <div style={{ fontSize: 44, lineHeight: 1 }}>{p.emoji}</div>
                <div style={{ fontWeight: 900, marginTop: 8 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  {p.pinHash ? 'tap to log in' : 'new — set a code'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Step 2: set or enter the 4-digit PIN.
  return (
    <div className="app" style={{ justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div>
        <Luffy mood={error ? 'shocked' : 'idle'} size={120} className="float" />
        <h1 className="h1" style={{ marginTop: 8 }}>
          {selected.emoji} {selected.name}
        </h1>
        <p className="muted">
          {settingUp ? (firstPin ? 'Say it again — pirate’s honor!' : 'Pick a 4-digit code to guard your treasure.') : line}
        </p>
        <div className={`pin-dots ${error ? 'shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot ${i < entry.length ? 'on' : ''}`} />
          ))}
        </div>
        <div className="pinpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
            k === '' ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() => (k === '⌫' ? setEntry(entry.slice(0, -1)) : entry.length < 4 && press(k))}
              >
                {k}
              </button>
            ),
          )}
        </div>
        <button
          className="btn btn--ghost btn--small"
          style={{ marginTop: 16 }}
          onClick={() => {
            sfx.click()
            reset()
            setSelectedId(null)
          }}
        >
          ← Not you? Switch crewmate
        </button>
      </div>
    </div>
  )
}
