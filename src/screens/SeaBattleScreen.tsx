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
  buryAtRandom,
  canPlace,
  cellName,
  dealFleetArt,
  emptyWaters,
  fire as fireAt,
  fleetReady,
  foeOf,
  levelDef,
  liveTraps,
  newSea,
  paintFleet,
  placeShip,
  placedIds,
  randomFleet,
  randomShot,
  randomSide,
  seaScore,
  seaStatus,
  shipById,
  sideCards,
  sideTraps,
  sunkIds,
  type Color,
  type SeaLevel,
  type SeaSide,
  type SeaState,
  type SeaTrap,
} from '../logic/seaBattle'
import { SEA_CARDS, TRAPS_PER_SIDE, cardBadge, dealSeaCards, seaCardById } from '../logic/seaCards'
import { ALL_STICKER_IDS, ownedIds, stickerUrl } from '../logic/album'
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
  /** A sprung card is on screen. The Marines wait — you can't read past a banner. */
  const [cardUp, setCardUp] = useState(false)

  // Your ships are crewed by cards you actually own. An empty album falls back
  // to the whole catalog, so a brand-new captain still gets a painted fleet.
  const pool = useMemo(() => {
    const owned = ownedIds(data.album)
    return owned.length > 0 ? owned : ALL_STICKER_IDS
  }, [data.album])

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
    if (!solo || solo.state.over || solo.state.turn !== 'b' || cardUp) return
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
  }, [solo?.state.seq, solo?.state.turn, solo?.state.over, cardUp])

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
        pool={pool}
        onCancel={() => { sfx.click(); setSetup(null) }}
        onReady={(side) => {
          sfx.click()
          if (setup.for === 'solo') {
            bankedSolo.current = null
            setPaid(null)
            // the Marines paint their fleet from the whole catalog and bury
            // three cards of their own — the AI plays by the identical rules
            setSolo({ level: setup.level, state: newSea(side, randomSide(ALL_STICKER_IDS, dealSeaCards())) })
          } else if (setup.for === 'accept') {
            answerSeaChallenge(setup.matchId, side)
          } else {
            const r = challengeSeaBattle(side)
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
        onCardOpen={setCardUp}
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
 *
 * Moving a ship is two taps, and both of them are ON the ship or ON the sea —
 * there is no mode to remember and nothing to set before you start:
 *
 *   1. **Tap the ship.** ↔️ / ↕️ pop up right beside it, the current lie marked.
 *   2. **Tap one.** The popover closes, every square that ship could legally
 *      start on lights up, and the next tap drops it there.
 *
 * An orientation toggle parked in a toolbar (which is what this was) reads as a
 * setting rather than as a step, so you turn it and nothing happens.
 */
function Placement({
  title,
  note,
  readyLabel,
  pool,
  onReady,
  onCancel,
}: {
  title: string
  note: string
  readyLabel: string
  /** Sticker ids this captain's ships are painted with. */
  pool: string[]
  onReady: (side: SeaSide) => void
  onCancel: () => void
}) {
  const [waters, setWaters] = useState<string[]>(() => randomFleet())
  /** Which faces crew which ship. Fixed at the start so a ship keeps its crew. */
  const [art] = useState(() => dealFleetArt(pool))
  const painted = useMemo(() => paintFleet(waters, art), [waters, art])

  /** Setup runs in two acts: hide the fleet, then bury the three cards. */
  const [phase, setPhase] = useState<'ships' | 'cards'>('ships')
  const [hand] = useState<string[]>(() => dealSeaCards())
  const [traps, setTraps] = useState<SeaTrap[]>([])
  /** The card in hand, as an index into `hand`. */
  const [inHand, setInHand] = useState(0)
  /** Step 1: the ship tapped, and the square the ↔️/↕️ popover hangs off. */
  const [picking, setPicking] = useState<{ id: string; at: number } | null>(null)
  /** Step 2: the ship in hand, turned the way it's about to be laid down. */
  const [holding, setHolding] = useState<{ id: string; horiz: boolean } | null>(null)

  const held = holding ? shipById(holding.id) : undefined
  const picked = picking ? shipById(picking.id) : undefined
  const placed = new Set(placedIds(waters))

  /** The squares one ship covers right now — what "this one" means on the board. */
  const cellsOf = (id: string) => waters.reduce<number[]>((out, c, i) => (c === id ? [...out, i] : out), [])

  // Every square the held ship could legally start on, so "where does it go?" is
  // answered by the board rather than by trial and error.
  const legal = useMemo(() => {
    if (!held || !holding) return []
    const bare = waters.map((c) => (c === held.id ? '' : c))
    const out: number[] = []
    for (let i = 0; i < bare.length; i++) if (canPlace(bare, held.size, i, holding.horiz)) out.push(i)
    return out
  }, [waters, held, holding])

  /** Tap a ship — anywhere along it — to start moving it. */
  function grab(id: string, at: number) {
    if (at < 0) return // never happens: setup always starts with a full fleet on the water
    sfx.click()
    setHolding(null)
    setPicking({ id, at })
  }

  function tap(i: number) {
    // step 2: drop it
    if (held && holding) {
      const next = placeShip(waters, held, i, holding.horiz)
      if (!next) {
        seaSfx.nope()
        return
      }
      seaSfx.fire()
      setWaters(next)
      setHolding(null)
      return
    }
    const id = waters[i]
    // tapping another ship moves the popover to it; tapping open water puts it away
    if (!id) {
      if (picking) setPicking(null)
      else seaSfx.nope()
      return
    }
    grab(id, i)
  }

  /** ↔️ or ↕️ was tapped: the ship comes off the board and the sea lights up. */
  function turn(horiz: boolean) {
    if (!picking) return
    sfx.click()
    setHolding({ id: picking.id, horiz })
    setPicking(null)
  }

  const lyingAcross = picking ? waters[waters.indexOf(picking.id) + 1] === picking.id : true
  const col = picking ? picking.at % SIZE : 0
  const row = picking ? Math.floor(picking.at / SIZE) : 0

  // --- act two: burying the three cards ---

  const buriedIds = new Set(traps.map((t) => t.card))
  const inHandCard = hand[inHand] && !buriedIds.has(hand[inHand]) ? hand[inHand] : null
  const artFor = () => (pool.length ? pool[Math.floor(Math.random() * pool.length)] : '')

  function bury(i: number) {
    const already = traps.find((t) => t.at === i)
    if (already) {
      // tapping a buried card digs it back up, so nothing here is a one-way door
      sfx.click()
      setTraps(traps.filter((t) => t.at !== i))
      setInHand(hand.indexOf(already.card))
      return
    }
    if (!inHandCard) return
    seaSfx.bury()
    const next = [...traps, { card: inHandCard, at: i, art: artFor(), sprung: false }]
    setTraps(next)
    const buried = new Set(next.map((t) => t.card))
    const nextUp = hand.findIndex((c) => !buried.has(c))
    setInHand(nextUp >= 0 ? nextUp : inHand)
  }

  const side = (): SeaSide => ({ ships: waters, shots: emptyWaters(), cards: painted, traps })

  if (phase === 'cards') {
    const done = traps.length >= hand.length
    const card = inHandCard ? seaCardById(inHandCard) : undefined
    return (
      <>
        <div className="board-status">
          <div className="board-status-line">🃏 Bury your three cards</div>
          <div className="muted" style={{ fontSize: 11 }}>
            Nothing happens until they fire on the square. 💀 hurts you, 🛡️ hurts them.
          </div>
        </div>

        <div className="sea-hint">
          {card
            ? `${card.emoji} ${card.name} in hand — tap any square to bury it.`
            : done
              ? 'All three are down. Tap one to dig it back up, or set sail.'
              : 'Pick a card below.'}
        </div>

        <SeaGrid
          mode="place"
          ships={waters}
          shots={emptyWaters()}
          cards={painted}
          traps={traps}
          bury={inHandCard}
          onTap={bury}
        />

        <div className="board-tools">
          <button
            className="chip"
            onClick={() => { sfx.click(); setTraps(buryAtRandom(hand, pool, [])); setInHand(0) }}
          >
            🎲 Bury them for me
          </button>
          {traps.length > 0 && (
            <button className="chip" onClick={() => { sfx.click(); setTraps([]); setInHand(0) }}>
              ✕ Dig them all up
            </button>
          )}
          <button className="chip" onClick={() => { sfx.click(); setPhase('ships') }}>◀ Back to the fleet</button>
        </div>

        <div className="sea-hand">
          {hand.map((id, n) => {
            const c = seaCardById(id)
            if (!c) return null
            const at = traps.find((t) => t.card === id)
            return (
              <button
                key={id}
                className={`sea-card${at ? ' is-buried' : ''}${inHand === n && !at ? ' is-held' : ''} sea-card--${c.side}`}
                onClick={() => { sfx.click(); setInHand(n) }}
              >
                <span className="sea-card-top">
                  <span className="sea-card-emoji">{c.emoji}</span>
                  <span className="sea-card-badge">{cardBadge(c)}</span>
                </span>
                <span className="sea-card-name">{c.name}</span>
                <span className="sea-card-text">{c.text}</span>
                <span className="sea-card-foot">{at ? `buried at ${cellName(at.at)}` : 'not buried yet'}</span>
              </button>
            )
          })}
        </div>

        <button className="btn" style={{ marginTop: 12 }} disabled={!done} onClick={() => onReady(side())}>
          {done ? readyLabel : `Bury ${hand.length - traps.length} more`}
        </button>
      </>
    )
  }

  return (
    <>
      <div className="board-status">
        <div className="board-status-line">{title}</div>
        <div className="muted" style={{ fontSize: 11 }}>{note}</div>
      </div>

      <div className="sea-hint">
        {held
          ? `${held.emoji} ${held.name} in hand — tap any glowing square to drop it there.`
          : picked
            ? `${picked.emoji} ${picked.name} — across ↔️ or down ↕️?`
            : 'Tap a ship to move it. 🎲 Scatter re-hides the whole fleet.'}
      </div>

      <SeaGrid
        mode="place"
        ships={waters}
        shots={emptyWaters()}
        cards={painted}
        hint={legal}
        focus={picking ? cellsOf(picking.id) : held ? cellsOf(held.id) : []}
        overlayAt={picking?.at ?? null}
        overlay={
          picking && (
            <div
              className={`sea-turn${row === 0 ? ' is-below' : ''}${col <= 1 ? ' is-left' : col >= SIZE - 2 ? ' is-right' : ''}`}
            >
              <button className={`sea-turn-btn${lyingAcross ? ' is-on' : ''}`} onClick={() => turn(true)}>
                ↔️ Across
              </button>
              <button className={`sea-turn-btn${lyingAcross ? '' : ' is-on'}`} onClick={() => turn(false)}>
                ↕️ Down
              </button>
            </div>
          )
        }
        onTap={tap}
      />

      <div className="board-tools">
        <button
          className="chip"
          onClick={() => { sfx.click(); setPicking(null); setHolding(null); setWaters(randomFleet()) }}
        >
          🎲 Scatter
        </button>
        {(picking || holding) && (
          <button className="chip" onClick={() => { sfx.click(); setPicking(null); setHolding(null) }}>
            ✕ Never mind
          </button>
        )}
        <button className="chip" onClick={onCancel}>◀ Back</button>
      </div>

      <div className="sea-strip" style={{ marginTop: 10 }}>
        {FLEET.map((s) => (
          <button
            key={s.id}
            className={`sea-ship${picking?.id === s.id || holding?.id === s.id ? ' is-held' : ''}${placed.has(s.id) ? '' : ' is-off'}`}
            onClick={() => grab(s.id, waters.indexOf(s.id))}
          >
            <span className="sea-ship-emoji">{s.emoji}</span>
            <span className="sea-ship-name">{s.name}</span>
            <span className="sea-ship-size">{'▪'.repeat(s.size)}</span>
          </button>
        ))}
      </div>

      <button
        className="btn"
        style={{ marginTop: 12 }}
        disabled={!fleetReady(waters)}
        onClick={() => { sfx.click(); setPicking(null); setHolding(null); setPhase('cards') }}
      >
        Next: bury your {TRAPS_PER_SIDE} cards 🃏
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
  onCardOpen,
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
  /** Told whenever a sprung-card banner opens or closes, so the AI can hold fire. */
  onCardOpen?: (open: boolean) => void
  onFire: (at: number) => void
  onResign?: () => void
  onClose: () => void
}) {
  const [aim, setAim] = useState<number | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  /** The sprung card's `seq`, once this device has read and dismissed it. */
  const [readCard, setReadCard] = useState<number | null>(null)
  /** Squares a card gave away, lit for two seconds after the banner is closed. */
  const [spy, setSpy] = useState<{ on: Color; at: number[] } | null>(null)

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

  // A card that went off. Both captains get the same banner — the whole point
  // is that neither is left guessing why the board changed under them.
  const sprung = state.flash && state.flash.seq !== readCard ? state.flash : null
  const sprungCard = sprung ? seaCardById(sprung.card) : undefined
  const sprungArt = sprung ? (sideTraps(state[sprung.owner]).find((t) => t.at === sprung.at)?.art ?? '') : ''

  /**
   * A sprung card is opened like a pack, not shown like a dialog: the sealed
   * foil rattles for a beat first. The beat is the whole point — it is where
   * "what is it?" happens, and a rare pays it off with a fanfare and rays.
   */
  const rare = sprungCard?.rarity === 'rare'
  const [opened, setOpened] = useState(false)
  useEffect(() => {
    onCardOpen?.(Boolean(sprung))
    setOpened(false)
    if (!sprung) return
    seaSfx.card()
    const t = window.setTimeout(() => {
      setOpened(true)
      seaSfx.rip()
      window.setTimeout(() => (rare ? seaSfx.rare() : seaSfx.common()), 190)
    }, 950)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprung?.seq, Boolean(sprung)])

  // The reveal starts when the banner closes, not while it is covering the board.
  useEffect(() => {
    if (!spy) return
    const t = window.setTimeout(() => setSpy(null), 2000)
    return () => window.clearTimeout(t)
  }, [spy])

  function dismissCard() {
    if (!sprung) return
    sfx.click()
    setReadCard(sprung.seq)
    if (sprung.show.length > 0 && sprung.showOn) {
      seaSfx.reveal()
      setSpy({ on: sprung.showOn, at: sprung.show })
    }
  }

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

      <div className="sea-label">
        🎯 Enemy waters — {nameOf(theirSide)}
        {liveTraps(them).length > 0 && (
          <span className="sea-buried-count"> · 🃏 {liveTraps(them).length} of their cards still buried</span>
        )}
      </div>
      <SeaGrid
        mode="target"
        ships={them.ships}
        shots={them.shots}
        cards={sideCards(them)}
        traps={sideTraps(them)}
        spy={spy?.on === theirSide ? spy.at : []}
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

      <div className="sea-label" style={{ marginTop: 14 }}>
        ⛵ Your waters — {nameOf(mySide)}
        {liveTraps(me).length > 0 && (
          <span className="sea-buried-count"> · 🃏 {liveTraps(me).length} of yours still buried</span>
        )}
      </div>
      <div className="sea-own">
        <SeaGrid
          mode="own"
          ships={me.ships}
          shots={me.shots}
          cards={sideCards(me)}
          traps={sideTraps(me)}
          spy={spy?.on === mySide ? spy.at : []}
          last={struck === mySide ? state.last : null}
        />
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
          <div className="sea-verdict">{state.winner === mySide ? '🏆' : '😤'}</div>
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

      {sprung && sprungCard && (
        <div className={`sea-pop${rare && opened ? ' is-rare' : ''}`} role="dialog" aria-modal="true">
          {!opened ? (
            <div className="sea-pack">
              <div className="sea-pack-foil">
                <span className="sea-pack-mark">🏴‍☠️</span>
                <span className="sea-pack-shine" aria-hidden />
              </div>
              <div className="sea-pack-where">
                💥 {nameOf(sprung.by)} hit something buried at {cellName(sprung.at)}…
              </div>
            </div>
          ) : (
          <>
          {rare && <span className="sea-rays" aria-hidden />}
          <div className={`sea-pop-card sea-pop-card--${sprungCard.side}${rare ? ' is-rare' : ''}`}>
            {rare && <span className="sea-pop-rare">★ RARE ★</span>}
            <div className="sea-pop-where">
              💥 {nameOf(sprung.by)} hit a card buried at {cellName(sprung.at)}
            </div>
            <div className="sea-pop-art">
              {sprungArt ? <img src={stickerUrl(sprungArt)} alt="" /> : null}
              <span className="sea-pop-emoji">{sprungCard.emoji}</span>
            </div>
            <div className="sea-pop-name">{sprungCard.name}</div>
            <div className="sea-pop-side">
              {cardBadge(sprungCard)} {sprungCard.side === 'bad' ? 'Bad news for whoever buried it' : 'It backfires on whoever found it'}
            </div>
            <div className="sea-pop-text">{sprungCard.text}</div>
            <div className="sea-pop-note">{sprung.note}</div>
            <div className="sea-pop-who">{sprungCard.who}</div>
            <button className="btn btn--small" onClick={dismissCard}>
              {sprung.show.length > 0 ? 'Show me 👀' : 'Dismiss'}
            </button>
          </div>
          </>
          )}
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
        <h3>🃏 The three buried cards</h3>
        <p>
          This is the one thing the box does not have. Once your fleet is hidden you are dealt{' '}
          <strong>{TRAPS_PER_SIDE} special cards</strong> — you do not pick them — and you bury each one on a square of
          your own sea. Nothing happens until <strong>the enemy fires at that exact square</strong>. Then it springs,
          both captains are shown the card, and the board changes.
        </p>
        <ul>
          <li><strong>💀 cards hurt you</strong>, the captain who buried them. Bury those where nobody would bother shooting.</li>
          <li><strong>🛡️ cards backfire on them</strong>, the captain who found them. Those are bait — bury them somewhere obvious.</li>
          <li>A card can sit <strong>on a ship square or on open water</strong>. Two cards never share a square.</li>
          <li>A card is spent the moment it goes off, and cards can <strong>sink the last ship</strong> or <strong>raise one back up</strong>, so the game is never over until the board says so.</li>
        </ul>
        <div className="sea-hand sea-hand--sheet">
          {SEA_CARDS.map((c) => (
            <div key={c.id} className={`sea-card sea-card--${c.side}`}>
              <span className="sea-card-top">
                <span className="sea-card-emoji">{c.emoji}</span>
                <span className="sea-card-badge">{cardBadge(c)}</span>
              </span>
              <span className="sea-card-name">{c.name}</span>
              <span className="sea-card-text">{c.text}</span>
              <span className="sea-card-foot">{c.rarity === 'rare' ? '★ rare' : 'common'}</span>
            </div>
          ))}
        </div>
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
