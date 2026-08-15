// Sea Battle — Battleship on the Grand Line.
//
// The rules live in logic/seaBattle.ts, so the identical engine drives a match
// against the AI held in React state and a live one running through the shared
// app/seaBattles document. What is different here from Chess and Checkers is
// that this game HIDES things, and hiding is a UI job: the enemy grid is handed
// the enemy's fleet (it has to be, to draw a wreck) and must draw a ship only
// once it has sunk. That rule lives in <SeaGrid mode="target">, once, so no
// screen can leak a fleet by forgetting it.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID, KID_ID } from '../store/storage'
import { BOARD_MOVE_SECONDS } from '../logic/boardGames'
import { dayKey } from '../logic/dates'
import {
  FLEET,
  SEA_LEVELS,
  SEA_REWARD,
  SEA_SOLO_REWARD,
  SEA_SOLO_REWARD_LIMIT,
  SIZE,
  aiShot,
  canPlace,
  cellName,
  emptyWaters,
  fire as fireAt,
  fleetReady,
  foeOf,
  levelDef,
  newSea,
  placeShip,
  placedIds,
  randomFleet,
  randomShot,
  seaScore,
  seaStatus,
  shipById,
  sunkIds,
  type Color,
  type SeaLevel,
  type SeaSide,
  type SeaState,
} from '../logic/seaBattle'
import { SeaGrid } from '../components/SeaGrid'
import { MoveTimer } from '../components/MoveTimer'
import { BerryCoin } from '../components/BerryCoin'
import { boardSfx, seaSfx, sfx } from '../audio'

/** Which finished battles this device has already read. Per-device on purpose. */
const seenKey = (viewer: string | null, id: string) => `wop-sea-seen:${viewer ?? 'guest'}:${id}`
const seaSeen = (viewer: string | null, id: string) => Boolean(localStorage.getItem(seenKey(viewer, id)))
const markSeen = (viewer: string | null, id: string) => localStorage.setItem(seenKey(viewer, id), '1')

const CREW: Record<Color, { name: string; emoji: string }> = {
  w: { name: 'Straw Hats', emoji: '👒' },
  b: { name: 'Marines', emoji: '⚓' },
}

export function SeaBattleScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      <div className="h1">🚢 Sea Battle</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Hide five ships in your waters. Find all five of theirs first and the sea is yours.
      </p>
      {tab === 'play' && <PlayTab />}
      {tab === 'fleet' && <FleetTab />}
      {tab === 'rules' && <RulesTab />}
    </div>
  )
}

// --- play -------------------------------------------------------------------

/** What the placement screen is being opened for. */
type Setup =
  | { for: 'challenge' }
  | { for: 'accept'; matchId: string }
  | { for: 'solo'; level: SeaLevel }

function PlayTab() {
  const {
    data, seaBattles, activeProfileId, profiles,
    challengeSeaBattle, answerSeaChallenge, playSeaShot, resignSeaBattle, cancelSeaBattle, recordSeaSolo,
  } = useStore()

  const [setup, setSetup] = useState<Setup | null>(null)
  const [solo, setSolo] = useState<{ level: SeaLevel; state: SeaState } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [paid, setPaid] = useState<number | null>(null)

  const mateId = activeProfileId === PARENT_ID ? KID_ID : PARENT_ID
  const mateName = profiles.find((p) => p.id === mateId)?.name ?? 'your crewmate'

  const mine = seaBattles.filter((m) => m.fromId === activeProfileId || m.toId === activeProfileId)
  // a finished battle stays up until it's been read — the shot that sank the
  // last ship is the one moment you actually want to look at the board
  const match = mine.find(
    (m) =>
      m.status === 'active' ||
      (m.status === 'finished' && !dismissed.includes(m.id) && !seaSeen(activeProfileId, m.id)),
  )
  const incoming = seaBattles.find((m) => m.status === 'pending' && m.toId === activeProfileId)
  const outgoing = seaBattles.find((m) => m.status === 'pending' && m.fromId === activeProfileId)
  const recent = mine.filter((m) => m.status === 'finished').slice(-3).reverse()

  // The Marines fire back on their own, a beat late so a shot can be watched
  // landing rather than appearing. Re-checked inside the setter because the
  // timeout can outlive the position that scheduled it.
  useEffect(() => {
    if (!solo || solo.state.over || solo.state.turn !== 'b') return
    const t = window.setTimeout(() => {
      setSolo((cur) => {
        if (!cur || cur.state.over || cur.state.turn !== 'b') return cur
        const at = aiShot(cur.state, cur.level)
        const next = at >= 0 ? fireAt(cur.state, at) : null
        return next ? { ...cur, state: next } : cur
      })
    }, 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo?.state.seq, solo?.state.turn, solo?.state.over])

  // Bank the solo result exactly once, the moment the board is over.
  const bankedSolo = useRef<string | null>(null)
  useEffect(() => {
    if (!solo?.state.over) return
    const key = `${solo.level}-${solo.state.seq}`
    if (bankedSolo.current === key) return
    bankedSolo.current = key
    setPaid(recordSeaSolo(solo.state.winner === 'w'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo?.state.over])

  // --- the placement screen ---
  if (setup) {
    const level = setup.for === 'solo' ? levelDef(setup.level) : null
    return (
      <Placement
        title={
          setup.for === 'solo'
            ? `${level!.emoji} Battle stations — ${level!.name} is coming`
            : setup.for === 'accept'
              ? '⚓ Hide your fleet, then answer the call'
              : `⚔️ Hide your fleet, then call out ${mateName}`
        }
        note={
          setup.for === 'challenge'
            ? `${mateName} gets a ping. You fire first. Winner takes ${SEA_REWARD} Berries.`
            : setup.for === 'accept'
              ? `They fire first. Winner takes ${SEA_REWARD} Berries.`
              : 'You fire first. Nobody can see your waters but you.'
        }
        readyLabel={setup.for === 'solo' ? '🎯 Open fire!' : setup.for === 'accept' ? '✓ Accept & fight' : '📞 Send the challenge'}
        onCancel={() => { sfx.click(); setSetup(null) }}
        onReady={(ships) => {
          sfx.click()
          if (setup.for === 'solo') {
            bankedSolo.current = null
            setPaid(null)
            setSolo({ level: setup.level, state: newSea(ships, randomFleet()) })
          } else if (setup.for === 'accept') {
            answerSeaChallenge(setup.matchId, ships)
          } else {
            const r = challengeSeaBattle(ships)
            setMsg(r === 'ok' ? `Challenge sent to ${mateName}! 📞` : 'There’s already a battle on the water.')
          }
          setSetup(null)
        }}
      />
    )
  }

  // --- a live board (solo or online) ---
  if (solo) {
    const level = levelDef(solo.level)
    return (
      <Battle
        state={solo.state}
        mySide="w"
        online={false}
        clock={data.settings.boardMoveSeconds ?? BOARD_MOVE_SECONDS}
        nameOf={(c) => (c === 'w' ? '👒 You' : `${level.emoji} ${level.name}`)}
        paid={paid}
        onFire={(at) => {
          const next = fireAt(solo.state, at)
          if (next) setSolo({ ...solo, state: next })
        }}
        onClose={() => { setSolo(null); setPaid(null) }}
      />
    )
  }

  if (match) {
    const mySide: Color = match.fromId === activeProfileId ? 'w' : 'b'
    return (
      <Battle
        state={match.state}
        mySide={mySide}
        online
        clock={match.moveSeconds ?? BOARD_MOVE_SECONDS}
        nameOf={(c) => `${CREW[c].emoji} ${c === 'w' ? match.fromName : match.toName}`}
        paid={null}
        onFire={(at) => playSeaShot(match.id, at)}
        onResign={() => resignSeaBattle(match.id)}
        onClose={() => {
          markSeen(activeProfileId, match.id)
          setDismissed((d) => [...d, match.id])
        }}
      />
    )
  }

  // --- no board: the lobby ---
  const soloWonToday = data.games.seaDay === dayKey() ? data.games.seaWins : 0
  const payLeft = Math.max(0, SEA_SOLO_REWARD_LIMIT - soloWonToday)

  return (
    <>
      {msg && <div className="card" style={{ marginBottom: 10 }}>{msg}</div>}

      {incoming && (
        <div className="card" style={{ marginBottom: 10, borderColor: 'var(--red)' }}>
          <div style={{ fontWeight: 900, marginBottom: 4 }}>
            {incoming.fromEmoji} {incoming.fromName} calls you out to Sea Battle!
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Their fleet is already hidden and they fire first. Winner takes {SEA_REWARD} Berries.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn--small"
              onClick={() => { sfx.click(); setSetup({ for: 'accept', matchId: incoming.id }) }}
            >
              ✓ Hide my fleet
            </button>
            <button
              className="btn btn--small btn--ghost"
              onClick={() => { sfx.click(); answerSeaChallenge(incoming.id, null) }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {outgoing && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 900, marginBottom: 4 }}>⏳ Waiting for {outgoing.toName}…</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Your fleet is hidden and the call is out. You fire first when they answer.
          </p>
          <button className="btn btn--small btn--ghost" onClick={() => { sfx.click(); cancelSeaBattle(outgoing.id) }}>
            Take it back
          </button>
        </div>
      )}

      {!incoming && !outgoing && (
        <button className="btn" style={{ marginBottom: 12 }} onClick={() => { sfx.click(); setSetup({ for: 'challenge' }) }}>
          ⚔️ Challenge {mateName}
        </button>
      )}

      <div className="h2" style={{ marginTop: 4 }}>🌋 Or take on the Marines</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        {payLeft > 0
          ? `A win pays ${SEA_SOLO_REWARD} Berries — ${payLeft} more paying win${payLeft === 1 ? '' : 's'} today.`
          : 'Today’s paying wins are used up. Still worth playing — practice is free.'}
      </p>
      {SEA_LEVELS.map((l) => (
        <button
          key={l.id}
          className="card sea-level"
          onClick={() => { sfx.click(); setSetup({ for: 'solo', level: l.id }) }}
        >
          <span className="sea-level-emoji">{l.emoji}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 900, display: 'block' }}>{l.name}</span>
            <span className="muted" style={{ fontSize: 12 }}>{l.blurb}</span>
          </span>
        </button>
      ))}

      <Record />

      {recent.length > 0 && (
        <>
          <div className="h2" style={{ marginTop: 16 }}>Last battles</div>
          {recent.map((m) => (
            <div className="card" key={m.id} style={{ marginTop: 8, padding: '10px 12px' }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>
                {m.winnerId === activeProfileId ? '🏆 You won' : `😤 ${m.winnerId === m.fromId ? m.fromName : m.toName} won`}
                {' '}vs {m.fromId === activeProfileId ? m.toName : m.fromName}
              </div>
              <div className="muted" style={{ fontSize: 11 }}>
                {m.state.log.length} shots · {(m.resolvedAt ?? m.createdAt).slice(0, 10)}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

// --- hiding the fleet -------------------------------------------------------

/**
 * Setup. It opens with a legal random fleet already on the water, because "roll
 * again" is a much better first move than an empty grid and a manual: nothing
 * here can be left half-done, and the Ready button is never a trap.
 */
function Placement({
  title,
  note,
  readyLabel,
  onReady,
  onCancel,
}: {
  title: string
  note: string
  readyLabel: string
  onReady: (ships: string[]) => void
  onCancel: () => void
}) {
  const [waters, setWaters] = useState<string[]>(() => randomFleet())
  const [holding, setHolding] = useState<string | null>(null)
  const [horiz, setHoriz] = useState(true)

  const held = holding ? shipById(holding) : undefined
  const placed = new Set(placedIds(waters))

  // Every square the held ship could legally start on, so "where does it go?"
  // is answered by the board rather than by trial and error.
  const legal = useMemo(() => {
    if (!held) return []
    const bare = waters.map((c) => (c === held.id ? '' : c))
    const out: number[] = []
    for (let i = 0; i < bare.length; i++) if (canPlace(bare, held.size, i, horiz)) out.push(i)
    return out
  }, [waters, held, horiz])

  function tap(i: number) {
    if (held) {
      const next = placeShip(waters, held, i, horiz)
      if (!next) {
        seaSfx.nope()
        return
      }
      seaSfx.fire()
      setWaters(next)
      setHolding(null)
      return
    }
    // tapping a ship on the board picks it up, keeping the way it's already lying
    const id = waters[i]
    if (!id) {
      seaSfx.nope()
      return
    }
    const first = waters.indexOf(id)
    setHoriz(waters[first + 1] === id)
    setHolding(id)
    sfx.click()
  }

  return (
    <>
      <div className="board-status">
        <div className="board-status-line">{title}</div>
        <div className="muted" style={{ fontSize: 11 }}>{note}</div>
      </div>

      <div className="sea-hint">
        {held
          ? `Holding the ${held.emoji} ${held.name} (${held.size} long) — tap a glowing square to drop its ${horiz ? 'left end' : 'top end'} there.`
          : 'Tap any ship to pick it up and move it. 🎲 Scatter re-hides the whole fleet.'}
      </div>

      <SeaGrid mode="place" ships={waters} shots={emptyWaters()} hint={legal} onTap={tap} />

      <div className="board-tools">
        <button className={`chip${horiz ? ' chip--on' : ''}`} onClick={() => { sfx.click(); setHoriz(true) }}>
          ↔️ Across
        </button>
        <button className={`chip${horiz ? '' : ' chip--on'}`} onClick={() => { sfx.click(); setHoriz(false) }}>
          ↕️ Down
        </button>
        <button className="chip" onClick={() => { sfx.click(); setHolding(null); setWaters(randomFleet()) }}>
          🎲 Scatter
        </button>
        <button className="chip" onClick={onCancel}>✕ Back</button>
      </div>

      <div className="sea-strip" style={{ marginTop: 10 }}>
        {FLEET.map((s) => (
          <button
            key={s.id}
            className={`sea-ship${holding === s.id ? ' is-held' : ''}${placed.has(s.id) ? '' : ' is-off'}`}
            onClick={() => { sfx.click(); setHolding(holding === s.id ? null : s.id) }}
          >
            <span className="sea-ship-emoji">{s.emoji}</span>
            <span className="sea-ship-name">{s.name}</span>
            <span className="sea-ship-size">{'▪'.repeat(s.size)}</span>
          </button>
        ))}
      </div>

      <button className="btn" style={{ marginTop: 12 }} disabled={!fleetReady(waters)} onClick={() => onReady(waters)}>
        {readyLabel}
      </button>
    </>
  )
}

// --- the fight --------------------------------------------------------------

function Battle({
  state,
  mySide,
  online,
  clock,
  nameOf,
  paid,
  onFire,
  onResign,
  onClose,
}: {
  state: SeaState
  mySide: Color
  online: boolean
  clock: number
  nameOf: (c: Color) => string
  /** Berries a finished solo battle paid, or null (online pays through the store). */
  paid: number | null
  onFire: (at: number) => void
  onResign?: () => void
  onClose: () => void
}) {
  const [aim, setAim] = useState<number | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const theirSide = foeOf(mySide)
  const me = state[mySide]
  const them = state[theirSide]
  const myTurn = !state.over && state.turn === mySide

  useSeaSounds(state, mySide)

  // a new position can never leave a stale crosshair sitting on the board
  useEffect(() => setAim(null), [state.seq])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 2600)
    return () => window.clearTimeout(t)
  }, [flash])

  // The square just fired at sits on the grid of whoever was SHOT AT — which is
  // whoever is now to move, unless the shot ended the game.
  const struck: Color = state.over && state.winner ? foeOf(state.winner) : state.turn

  function tapTarget(i: number) {
    if (!myTurn) return
    if (them.shots[i] !== '') {
      seaSfx.nope()
      return
    }
    if (aim === i) {
      shoot(i)
      return
    }
    sfx.click()
    setAim(i)
  }

  function shoot(at: number) {
    setAim(null)
    seaSfx.fire()
    onFire(at)
  }

  /** The clock ran out. You can't pass in Battleship, so a shot goes somewhere. */
  function timeUp() {
    if (!myTurn) return
    const at = randomShot(state)
    if (at < 0) return
    setFlash('⏰ Out of time — the gunner fired blind.')
    shoot(at)
  }

  return (
    <>
      <div className="board-status">
        <div className={`board-status-line${state.over ? ' is-over' : ''}`}>
          {state.over
            ? seaStatus(state, nameOf)
            : myTurn
              ? `Your shot — you’re ${nameOf(mySide)}`
              : `Waiting for ${nameOf(state.turn)}…`}
        </div>
        {!state.over && <div className="muted" style={{ fontSize: 11 }}>{seaScore(state, mySide)}</div>}
        {!state.over && (
          <MoveTimer
            seconds={clock}
            running={myTurn}
            resetKey={`${state.seq}-${state.turn}`}
            onExpire={timeUp}
            note={myTurn ? 'a blind shot at 0' : undefined}
          />
        )}
        {flash && <div className="move-clock-flash">{flash}</div>}
      </div>

      <div className="sea-label">🎯 Enemy waters — {nameOf(theirSide)}</div>
      <SeaGrid
        mode="target"
        ships={them.ships}
        shots={them.shots}
        last={struck === theirSide ? state.last : null}
        aim={aim}
        disabled={!myTurn}
        reveal={state.over}
        onTap={tapTarget}
      />
      {!state.over && (
        <button className="btn" style={{ marginTop: 8 }} disabled={aim === null} onClick={() => aim !== null && shoot(aim)}>
          {aim === null ? (myTurn ? 'Tap a square to take aim' : 'Not your shot') : `🔥 Fire at ${cellName(aim)}`}
        </button>
      )}
      <FleetStrip side={them} theirs />

      <div className="sea-label" style={{ marginTop: 14 }}>⛵ Your waters — {nameOf(mySide)}</div>
      <div className="sea-own">
        <SeaGrid mode="own" ships={me.ships} shots={me.shots} last={struck === mySide ? state.last : null} />
      </div>
      <FleetStrip side={me} />

      <div className="board-tools">
        {online && !state.over && onResign && (
          <button
            className="chip"
            onClick={() => {
              if (!confirm('Strike the colours? The other captain takes the win.')) return
              sfx.click()
              onResign()
            }}
          >
            🏳️ Surrender
          </button>
        )}
        {!online && !state.over && (
          <button className="chip" onClick={() => { sfx.click(); onClose() }}>✕ Leave the fight</button>
        )}
      </div>

      {state.over && (
        <div className="card" style={{ marginTop: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>{state.winner === mySide ? '🏆' : '😤'}</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{seaStatus(state, nameOf)}</div>
          {state.winner === mySide && (online || (paid ?? 0) > 0) && (
            <div
              className="muted"
              style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center' }}
            >
              <BerryCoin size={13} /> +{online ? SEA_REWARD : paid} Berries
            </div>
          )}
          {!online && state.winner === mySide && (paid ?? 0) === 0 && (
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              No Berries — today’s {SEA_SOLO_REWARD_LIMIT} paying wins are spent.
            </div>
          )}
          <button className="btn btn--small" style={{ marginTop: 10 }} onClick={() => { sfx.click(); onClose() }}>
            Done
          </button>
        </div>
      )}

      {state.log.length > 0 && (
        <div className="board-log">
          {state.log.slice(-4).map((l, i) => (
            <div key={state.log.length - 4 + i} className={`board-log-line board-log-line--${l.by}`}>
              {l.text}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/**
 * The five ships and what's left of them. On your own side it shows the damage,
 * because you can see your own decks burning; on theirs it shows only which
 * ships have gone down, which is exactly what the rules tell you.
 */
function FleetStrip({ side, theirs = false }: { side: SeaSide; theirs?: boolean }) {
  const down = new Set(sunkIds(side))
  return (
    <div className="sea-strip">
      {FLEET.map((s) => {
        const sunk = down.has(s.id)
        let hit = 0
        if (!theirs) for (let i = 0; i < side.ships.length; i++) if (side.ships[i] === s.id && side.shots[i] === 'x') hit += 1
        return (
          <div key={s.id} className={`sea-ship${sunk ? ' is-sunk' : ''}`}>
            <span className="sea-ship-emoji">{sunk ? '🔥' : s.emoji}</span>
            <span className="sea-ship-name">{s.name}</span>
            <span className="sea-ship-size">
              {sunk ? 'sunk' : theirs ? '▪'.repeat(s.size) : '▪'.repeat(s.size - hit) + '✖'.repeat(hit)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Record() {
  const r = useStore((s) => s.data.games.seabattle)
  const played = r.wins + r.losses
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>🏅 Your record vs the crew</div>
      <div className="board-record">
        <div><span className="board-record-num" style={{ color: 'var(--green)' }}>{r.wins}</span><span className="muted">won</span></div>
        <div><span className="board-record-num" style={{ color: 'var(--red)' }}>{r.losses}</span><span className="muted">lost</span></div>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
        {played === 0 ? 'No battles yet — send a challenge.' : `${played} battle${played === 1 ? '' : 's'} · winner takes ${SEA_REWARD} 🪙`}
      </div>
    </div>
  )
}

// --- fleet ------------------------------------------------------------------

function FleetTab() {
  return (
    <>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        The <strong>sizes are the real Battleship sizes</strong> — 5, 4, 3, 3 and 2 squares. The ships are real too,
        just from a different sea. Both captains sail the identical fleet, so nobody starts ahead.
      </p>
      {FLEET.map((s) => (
        <div className="card piece-sheet" key={s.id} style={{ marginBottom: 8 }}>
          <span className="sea-ship-emoji" style={{ fontSize: 34 }}>{s.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>
              {s.name}
              <span className="muted" style={{ fontWeight: 700, fontSize: 12 }}> · {s.size} squares</span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{s.who}</div>
            <div style={{ fontSize: 18, letterSpacing: 2, marginTop: 4 }}>{'▪'.repeat(s.size)}</div>
          </div>
        </div>
      ))}
    </>
  )
}

// --- how to -----------------------------------------------------------------

function RulesTab() {
  const secs = useStore((s) => s.data.settings.boardMoveSeconds) ?? BOARD_MOVE_SECONDS
  return (
    <>
      <div className="rules">
        <h3>How you win</h3>
        <p>
          Sink all <strong>five</strong> of the other captain’s ships. They are hiding somewhere in a{' '}
          <strong>{SIZE} × {SIZE}</strong> patch of sea, and you cannot see them — you can only fire at a square and be
          told what happened.
        </p>
        <h3>Hiding your fleet</h3>
        <ul>
          <li>Five ships: <strong>5, 4, 3, 3 and 2</strong> squares long.</li>
          <li>Each one lies <strong>across or down</strong> — never diagonally, never off the edge.</li>
          <li>Ships may <strong>touch</strong>, but they may never <strong>overlap</strong>.</li>
          <li>The app opens with a legal fleet already scattered. Tap any ship to move it, or 🎲 for a whole new layout.</li>
        </ul>
        <h3>Firing</h3>
        <ul>
          <li><strong>One shot per turn</strong>, and the turn passes whether you hit or miss. Hitting does not buy you another shot — that is a playground rule, not the game.</li>
          <li>Tap a square to <strong>take aim</strong> 🎯, then tap it again (or press Fire) to shoot. Two taps, so a fat thumb never wastes a turn.</li>
          <li>💥 means you hit <em>something</em>. You are <strong>not</strong> told which ship — not until its very last square goes, and then you are told its name: 🔥 <em>the Going Merry goes down!</em></li>
          <li>🌊 means open water. Squares you have already fired at stay marked, and you cannot fire at one twice.</li>
        </ul>
        <h3>How to actually win</h3>
        <p>
          The smallest ship is <strong>2 squares</strong> long, so it must cover one square of each colour on a
          checkerboard — which means firing on <strong>every second square</strong> finds every ship in half the shots.
          Once you land a hit, stop hunting and <strong>work outwards from it</strong> until the ship sinks.
        </p>
        <h3>Playing the Marines</h3>
        <p>
          🐣 <strong>Coby</strong> fires at random. 🚬 <strong>Smoker</strong> searches on every second square and hunts
          along a ship once he finds one. 🌋 <strong>Akainu</strong> works out every place your ships could still be
          hiding and fires where the most of them fit — he plays it properly, and he only knows what you have told him
          by answering his shots. A win pays <strong>{SEA_SOLO_REWARD} Berries</strong>, for the first{' '}
          {SEA_SOLO_REWARD_LIMIT} wins each day.
        </p>
        <h3>Playing your crewmate</h3>
        <p>
          Challenge them and your fleet goes out hidden with the call; they hide theirs as they accept. The challenger
          fires first. <strong>Winner takes {SEA_REWARD} Berries.</strong> Surrendering hands them the win.
        </p>
      </div>
      {secs > 0 && (
        <div className="rules">
          <h3>⏱️ The clock</h3>
          <p>
            You get <strong>{secs} seconds</strong> to take your shot. Run out and{' '}
            <strong>the gunner fires blind</strong> — a random square you haven’t tried yet. It will probably be a
            waste. The captain sets the time, and can switch the clock off.
          </p>
        </div>
      )}
    </>
  )
}

// --- plumbing ---------------------------------------------------------------

/**
 * Every shot gets its sound, whether it was fired here or arrived from the other
 * phone. Read off the position's own last log line rather than off the shot,
 * which is what makes the online case work at all: the receiving device never
 * sees the shot, only the water that followed it.
 */
function useSeaSounds(state: SeaState, mySide: Color) {
  const lastSeq = useRef<number | null>(null)
  const announced = useRef<number | null>(null)
  useEffect(() => {
    const first = lastSeq.current === null
    const moved = !first && state.seq !== lastSeq.current
    lastSeq.current = state.seq

    if (moved) {
      const text = state.log.at(-1)?.text ?? ''
      if (/goes down/.test(text)) seaSfx.sink()
      else if (/a hit/.test(text)) seaSfx.hit()
      else if (/nothing but sea/.test(text)) seaSfx.splash()
    }

    if (state.over && announced.current !== state.seq) {
      announced.current = state.seq
      window.setTimeout(() => {
        if (state.winner === mySide) boardSfx.win()
        else boardSfx.lose()
      }, moved ? 700 : 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.seq, state.over])
}
