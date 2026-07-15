import { useState } from 'react'
import { useStore } from '../store/useStore'
import { hashPin } from '../store/storage'
import { Luffy } from './Luffy'
import { sfx } from '../audio'
import { crewSays } from '../logic/crewLines'

export function PinLock() {
  const { data, setSettings, setUnlocked } = useStore()
  const settingUp = !data.settings.pinHash
  const [entry, setEntry] = useState('')
  const [firstPin, setFirstPin] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [line] = useState(() => crewSays('pin'))

  async function submit(pin: string) {
    if (settingUp) {
      if (!firstPin) {
        setFirstPin(pin)
        setEntry('')
        return
      }
      if (firstPin !== pin) {
        setError(true)
        sfx.error()
        setFirstPin(null)
        setEntry('')
        window.setTimeout(() => setError(false), 500)
        return
      }
      setSettings({ pinHash: await hashPin(pin, data.settings.pinSalt) })
      sfx.fanfare()
      setUnlocked(true)
      return
    }
    const hash = await hashPin(pin, data.settings.pinSalt)
    if (hash === data.settings.pinHash) {
      sfx.gem()
      setUnlocked(true)
    } else {
      setError(true)
      sfx.error()
      setEntry('')
      window.setTimeout(() => setError(false), 500)
    }
  }

  function press(d: string) {
    sfx.click()
    const next = entry + d
    setEntry(next)
    if (next.length === 4) void submit(next)
  }

  return (
    <div className="app" style={{ justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div>
        <Luffy mood={error ? 'shocked' : 'idle'} size={130} className="float" />
        <h1 className="h1" style={{ marginTop: 8 }}>
          Wheels of Procrastination
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
      </div>
    </div>
  )
}
