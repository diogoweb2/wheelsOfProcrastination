// 🎮 Roblox bank (§20) — the screen time Ben is owed, and what he pays back.
//
// Ben's side: how much time is banked, and a slider to say how long he
// actually played. Dad's side: give time with a
// reason, and read the same log.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID, PARENT_ID } from '../store/storage'
import {
  KIND_ICON,
  PLAY_STEP,
  formatDelta,
  formatMinutes,
  playedOn,
} from '../logic/roblox'
import type { RobloxEntry, RobloxState } from '../types'
import { prettyDay } from '../logic/dates'
import { sfx } from '../audio'

export function RobloxScreen({ tab }: { tab: string }) {
  const { data, kidData, activeProfileId } = useStore()
  const isAdmin = activeProfileId === PARENT_ID
  // Dad reads and writes BEN's bank; Ben reads his own
  const world: RobloxState | null = isAdmin ? (kidData?.roblox ?? null) : data.roblox

  return (
    <div className="screen">
      <div className="h1" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        🎮 Roblox bank
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {isAdmin
          ? 'Ben’s screen time: what he’s owed, what he’s played, and every row behind it.'
          : 'Time you’ve earned, waiting for you. Play it, then say how long you played.'}
      </p>

      {isAdmin && !kidData && <div className="card">Loading Ben’s bank from the cloud…</div>}

      {isAdmin && kidData && tab === 'grant' && <GrantTab state={kidData.roblox} />}
      {!isAdmin && tab === 'bank' && <BankTab state={data.roblox} />}
      {!isAdmin && tab === 'play' && <PlayTab state={data.roblox} />}
      {tab === 'log' && world && <LogTab state={world} />}
    </div>
  )
}

/** The headline number — banked time, big enough to read across the room. */
function Balance({ state }: { state: RobloxState }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>
        IN THE BANK
      </div>
      <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.1, margin: '4px 0' }}>
        {formatMinutes(state.minutes)}
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        Played today: {formatMinutes(playedOn(state))}
      </div>
    </div>
  )
}

function BankTab({ state }: { state: RobloxState }) {
  const recent = [...state.entries].reverse().slice(0, 5)
  return (
    <div>
      <Balance state={state} />

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>⏳ How to get more time</div>
        <ul className="muted" style={{ fontSize: 13, margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Buy hours in the Shop → Treasures with 🍇 (they land here straight away).</li>
          <li>Dad can add time with a reason — you’ll see it here and get a ping.</li>
          <li>Official Roblox top-ups Dad buys get banked here too.</li>
        </ul>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        When you stop playing, come back to the <strong>Play</strong> tab and pay the time back. Honest counting
        is the whole deal.
      </p>

      {recent.length > 0 && (
        <>
          <div className="h2" style={{ marginTop: 14 }}>🧾 Last moves</div>
          {recent.map((e) => <EntryRow key={e.id} entry={e} />)}
        </>
      )}
    </div>
  )
}

/** The pay-back slider: he played some of it, not all of it. */
function PlayTab({ state }: { state: RobloxState }) {
  const { logRobloxPlay } = useStore()
  const max = state.minutes
  const [mins, setMins] = useState(Math.min(30, max))
  const [msg, setMsg] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  function pay() {
    if (logRobloxPlay(mins) === 'broke') {
      sfx.error()
      setMsg('That’s more time than you have banked.')
      return
    }
    sfx.spend()
    setMsg(`Paid back ${formatMinutes(mins)}. Nice and honest.`)
    setConfirming(false)
    setMins(Math.min(30, Math.max(0, max - mins)))
  }

  if (max <= 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>🈳</div>
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          The bank is empty — nothing to pay back. Buy an hour in the Shop, or earn one.
        </p>
      </div>
    )
  }

  return (
    <div>
      <Balance state={state} />
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>🎮 How long did you play?</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          Slide to the real number. Only what you played comes off — the rest stays yours.
        </div>

        <div style={{ fontSize: 40, fontWeight: 900, textAlign: 'center', margin: '10px 0 2px' }}>
          {formatMinutes(mins)}
        </div>
        <input
          className="rbx-slider"
          type="range"
          min={0}
          max={max}
          step={PLAY_STEP}
          value={mins}
          aria-label="Minutes played"
          onChange={(e) => {
            setMins(Number(e.target.value))
            setConfirming(false)
            setMsg(null)
          }}
        />
        <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span>0m</span>
          <span>all of it — {formatMinutes(max)}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
          {[15, 30, 45, 60].filter((n) => n <= max).map((n) => (
            <button key={n} className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setMins(n); setConfirming(false) }}>
              {formatMinutes(n)}
            </button>
          ))}
          <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setMins(max); setConfirming(false) }}>
            All
          </button>
        </div>

        {confirming ? (
          <button className="btn btn--red" style={{ width: '100%' }} onClick={pay}>
            Confirm — pay back {formatMinutes(mins)}
          </button>
        ) : (
          <button
            className="btn"
            style={{ width: '100%' }}
            disabled={mins <= 0}
            onClick={() => {
              sfx.click()
              setConfirming(true)
              window.setTimeout(() => setConfirming(false), 4000)
            }}
          >
            ✅ I played {formatMinutes(mins)}
          </button>
        )}
        {msg && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{msg}</p>}
      </div>
    </div>
  )
}

/** Dad's side: put time in, with a reason Ben reads verbatim. */
function GrantTab({ state }: { state: RobloxState }) {
  const { grantRobloxTime } = useStore()
  const [mins, setMins] = useState(60)
  const [note, setNote] = useState('')
  const [kind, setKind] = useState<'grant' | 'official'>('grant')
  const [msg, setMsg] = useState<string | null>(null)

  function give() {
    if (mins <= 0) return
    grantRobloxTime(KID_ID, mins, note.trim() || (kind === 'official' ? 'Official Roblox top-up' : 'From Dad'), kind)
    sfx.gem()
    setMsg(`Added ${formatMinutes(mins)} to Ben’s bank.`)
    setNote('')
  }

  return (
    <div>
      <Balance state={state} />
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🎁 Give screen time</div>

        <div style={{ fontSize: 34, fontWeight: 900, textAlign: 'center' }}>{formatMinutes(mins)}</div>
        <input
          className="rbx-slider"
          type="range"
          min={0}
          max={240}
          step={PLAY_STEP}
          value={mins}
          aria-label="Minutes to give"
          onChange={(e) => { setMins(Number(e.target.value)); setMsg(null) }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 10px' }}>
          {[30, 60, 90, 120].map((n) => (
            <button key={n} className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setMins(n) }}>
              {formatMinutes(n)}
            </button>
          ))}
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label>Why (Ben reads this word for word)</label>
          <input
            type="text"
            value={note}
            maxLength={80}
            placeholder="Cleaned the whole kitchen without being asked"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button
            className={`btn btn--small ${kind === 'grant' ? '' : 'btn--ghost'}`}
            onClick={() => { sfx.click(); setKind('grant') }}
          >
            🎁 From me
          </button>
          <button
            className={`btn btn--small ${kind === 'official' ? '' : 'btn--ghost'}`}
            onClick={() => { sfx.click(); setKind('official') }}
          >
            🔗 Official top-up
          </button>
        </div>

        <button className="btn btn--red" style={{ width: '100%' }} disabled={mins <= 0} onClick={give}>
          Add {formatMinutes(mins)} to the bank
        </button>
        {msg && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{msg}</p>}
      </div>
    </div>
  )
}

function LogTab({ state }: { state: RobloxState }) {
  const history = [...state.entries].reverse()
  const banked = history.filter((e) => e.minutes > 0).reduce((s, e) => s + e.minutes, 0)
  const played = history.filter((e) => e.minutes < 0).reduce((s, e) => s - e.minutes, 0)

  if (history.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>🧾</div>
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>Nothing yet. No time in, no time out.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="h2">
        🧾 Every move —{' '}
        <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>
          {formatMinutes(banked)} in · {formatMinutes(played)} played
        </span>
      </div>
      {history.map((e) => <EntryRow key={e.id} entry={e} />)}
    </div>
  )
}

function EntryRow({ entry }: { entry: RobloxEntry }) {
  const gain = entry.minutes > 0
  return (
    <div className="card" style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={{ fontSize: 22 }}>{KIND_ICON[entry.kind]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{entry.note}</div>
        <div className="muted" style={{ fontSize: 11 }}>
          {prettyDay(entry.day)} · {entry.by}
        </div>
      </div>
      <div style={{ fontWeight: 900, color: gain ? 'var(--green)' : 'var(--orange)' }}>
        {formatDelta(entry.minutes)}
      </div>
    </div>
  )
}
