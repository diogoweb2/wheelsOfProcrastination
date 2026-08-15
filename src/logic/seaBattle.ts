// Sea Battle — official Battleship (Milton Bradley / "Sink the Fleet"), painted
// as a Grand Line cannon duel.
//
// Same contract as logic/chess.ts and logic/checkers.ts: pure JSON-only
// functions, no React, no Firestore, `null` never `undefined`, and every board
// is a FLAT array because Firestore rejects nested arrays. That contract is
// what lets one engine drive a solo match held in React state and a live one
// running through a shared document.
//
// The official rules, no house edits:
//   1. **10×10 grid, five ships** — 5, 4, 3, 3, 2 squares.
//   2. Ships sit horizontally or vertically, never diagonally, never
//      overlapping. Touching is allowed — that is the real game.
//   3. **One shot per turn**, and the turn passes whether you hit or miss.
//      (The playground "hit = go again" rule is not in the box, and it turns
//      the game into a runaway.)
//   4. A hit is a hit; you are told only **hit or miss** until a ship's last
//      square goes, and then you are told **which ship sank**.
//   5. Sink all five and you win.
//
// The one thing kept honest about secrecy: a live match's whole state lives in
// one shared document, so the other phone physically holds your fleet — the UI
// simply never renders it. Same trade the card duel makes (§15c), for the same
// reason: this is a two-person family app, and real hidden information would
// need the state split server-side.

import type { Color } from './chess'

export type { Color }

/** The grid is 10 wide and 10 tall — the box's board, unchanged. */
export const SIZE = 10
export const CELLS = SIZE * SIZE

/** Berries the winner of a head-to-head takes, matching the other games' scale. */
export const SEA_REWARD = 25
/** Berries a win over the AI pays, for the first few of the day only. */
export const SEA_SOLO_REWARD = 8
export const SEA_SOLO_REWARD_LIMIT = 3

// --- the fleet ---------------------------------------------------------------

export interface ShipDef {
  id: string
  /** The real ship, from One Piece — the flavour rides on top of the real sizes. */
  name: string
  size: number
  emoji: string
  who: string
}

/** 5 / 4 / 3 / 3 / 2 — the box's fleet, crewed by ships off the Grand Line. */
export const FLEET: ShipDef[] = [
  { id: 'moby', name: 'Moby Dick', size: 5, emoji: '🐋', who: 'Whitebeard’s flagship — the biggest thing afloat' },
  { id: 'sunny', name: 'Thousand Sunny', size: 4, emoji: '☀️', who: 'the Straw Hats’ ship, built by Franky' },
  { id: 'red', name: 'Red Force', size: 3, emoji: '⛵', who: 'Shanks’ ship' },
  { id: 'merry', name: 'Going Merry', size: 3, emoji: '🐑', who: 'the crew’s first ship' },
  { id: 'baratie', name: 'Baratie', size: 2, emoji: '🍳', who: 'the sea restaurant Sanji cooked on' },
]

export const shipById = (id: string): ShipDef | undefined => FLEET.find((s) => s.id === id)

/** Total squares a full fleet covers — 17. Win when every one of them is hit. */
export const FLEET_SQUARES = FLEET.reduce((n, s) => n + s.size, 0)

// --- one side's waters -------------------------------------------------------

export interface SeaSide {
  /** 100 entries: `''` open water, or the id of the ship sitting on that square. */
  ships: string[]
  /** 100 entries: `''` not fired at yet, `'o'` a miss, `'x'` a hit. Shots RECEIVED. */
  shots: string[]
  /**
   * 100 entries: the sticker id drawn on that ship square, `''` on open water.
   * Pure decoration — every rule reads `ships`, never this. Matches saved before
   * the album art existed simply have none, hence every reader defaults it.
   */
  cards?: string[]
  /** The three special cards this captain buried. See logic/seaCards.ts. */
  traps?: SeaTrap[]
}

/** One buried special card: which card, which square, and whether it has gone off. */
export interface SeaTrap {
  /** A `SeaEffect` id from logic/seaCards.ts. */
  card: string
  at: number
  /** Sticker id used for its picture, so the card face is album art too. */
  art: string
  sprung: boolean
}

/**
 * The banner a sprung card puts on both screens. Lives on the state (not in
 * React) for the same reason the log does: the other phone never sees the shot,
 * only the position that followed it.
 */
export interface SeaFlash {
  /** The `SeaEffect` that fired. */
  card: string
  /** The square it was buried on. */
  at: number
  /** Whose card it was, and who set it off. */
  owner: Color
  by: Color
  /** What it actually did, in words — written fresh each time it fires. */
  note: string
  /** Squares to light up for two seconds, and whose waters they are in. */
  show: number[]
  showOn: Color | null
  /** The `seq` this fired on, so a screen shows one flash exactly once. */
  seq: number
}

/** Card art on a side, defaulted — matches predate it. */
export const sideCards = (s: SeaSide): string[] => s.cards ?? []
/** Buried cards on a side, defaulted. */
export const sideTraps = (s: SeaSide): SeaTrap[] => s.traps ?? []
/** Cards this captain still has in the water. */
export const liveTraps = (s: SeaSide): SeaTrap[] => sideTraps(s).filter((t) => !t.sprung)

export type SeaResult = 'sunk' | 'resign'

export interface SeaLogEntry {
  by: Color
  text: string
}

export interface SeaState {
  kind: 'seabattle'
  w: SeaSide
  b: SeaSide
  turn: Color
  /** The square just fired at, so the board can flash it. Null before the first shot. */
  last: number | null
  over: boolean
  winner: Color | null
  result: SeaResult | null
  log: SeaLogEntry[]
  seq: number
  /**
   * Extra consecutive shots each captain has banked. A card that says "they
   * lose their next turn" is the same thing as "you shoot again", so one
   * counter does both directions and the turn rule stays a single `if`.
   */
  owed?: { w: number; b: number }
  /** Shots each captain must still fire blind, courtesy of a Smoke Screen. */
  fogged?: { w: number; b: number }
  /** The special card that just went off, or null. */
  flash?: SeaFlash | null
}

const zero = () => ({ w: 0, b: 0 })
const owedOf = (s: SeaState) => s.owed ?? zero()
const foggedOf = (s: SeaState) => s.fogged ?? zero()

const blankShots = (): string[] => Array(CELLS).fill('')
export const emptyWaters = (): string[] => Array(CELLS).fill('')

/** A side with nothing on it — what the accepter's waters look like until they answer. */
export const emptySide = (): SeaSide => ({
  ships: emptyWaters(),
  shots: blankShots(),
  cards: emptyWaters(),
  traps: [],
})

/**
 * Paint the fleet with album art: every ship square gets a sticker id off
 * `pool`, so a 4-square ship is four different pirates lined up. Purely
 * cosmetic — if the pool is empty the squares stay blank and the board falls
 * back to the ship's emoji, which is what a brand-new album gets.
 */
export type FleetArt = Record<string, string[]>

/**
 * Give every ship its own row of faces, once. Held per SHIP rather than per
 * square so that dragging a ship around the setup board carries its crew with
 * it instead of reshuffling under your thumb.
 */
export function dealFleetArt(pool: string[]): FleetArt {
  const art: FleetArt = {}
  if (pool.length === 0) return art
  const bag = [...pool]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  let n = 0
  for (const ship of FLEET) {
    art[ship.id] = Array.from({ length: ship.size }, () => bag[n++ % bag.length])
  }
  return art
}

/** Lay that art out over the board — the 100-entry `cards` array a side carries. */
export function paintFleet(waters: string[], art: FleetArt): string[] {
  const out = emptyWaters()
  const used: Record<string, number> = {}
  for (let i = 0; i < CELLS; i++) {
    const id = waters[i]
    if (!id) continue
    const row = art[id]
    if (!row?.length) continue
    const n = used[id] ?? 0
    out[i] = row[n % row.length]
    used[id] = n + 1
  }
  return out
}

export const dealShipCards = (waters: string[], pool: string[]): string[] =>
  paintFleet(waters, dealFleetArt(pool))

/** `A1` … `J10` — letters across, numbers down, exactly like the plastic board. */
export function cellName(i: number): string {
  return `${String.fromCharCode(65 + (i % SIZE))}${Math.floor(i / SIZE) + 1}`
}

// --- placing the fleet -------------------------------------------------------

/**
 * Can `ship` sit at `at`, running right (`horiz`) or down? A ship may not run
 * off the edge, wrap a row, or land on another ship. Touching is fine.
 */
export function canPlace(waters: string[], size: number, at: number, horiz: boolean): boolean {
  const row = Math.floor(at / SIZE)
  const col = at % SIZE
  if (horiz ? col + size > SIZE : row + size > SIZE) return false
  for (let k = 0; k < size; k++) {
    if (waters[horiz ? at + k : at + k * SIZE] !== '') return false
  }
  return true
}

/** A copy of `waters` with `ship` laid down, or null if it doesn't fit. */
export function placeShip(waters: string[], ship: ShipDef, at: number, horiz: boolean): string[] | null {
  const cleared = removeShip(waters, ship.id)
  if (!canPlace(cleared, ship.size, at, horiz)) return null
  const next = [...cleared]
  for (let k = 0; k < ship.size; k++) next[horiz ? at + k : at + k * SIZE] = ship.id
  return next
}

/** A copy of `waters` with one ship lifted back off the board. */
export function removeShip(waters: string[], shipId: string): string[] {
  return waters.map((c) => (c === shipId ? '' : c))
}

/** Which ships are already on the board. */
export function placedIds(waters: string[]): string[] {
  return FLEET.filter((s) => waters.includes(s.id)).map((s) => s.id)
}

export const fleetReady = (waters: string[]): boolean => placedIds(waters).length === FLEET.length

/** A legal random fleet — what "🎲 Scatter" gives you, and what the AI sails. */
export function randomFleet(): string[] {
  // Big ships first: they're the hardest to fit, so placing them last is what
  // makes a naive scatter loop stall.
  for (let attempt = 0; attempt < 200; attempt++) {
    let waters = emptyWaters()
    let ok = true
    for (const ship of [...FLEET].sort((a, b) => b.size - a.size)) {
      let placed = false
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const horiz = Math.random() < 0.5
        const at = Math.floor(Math.random() * CELLS)
        const next = placeShip(waters, ship, at, horiz)
        if (next) {
          waters = next
          placed = true
        }
      }
      if (!placed) {
        ok = false
        break
      }
    }
    if (ok) return waters
  }
  return emptyWaters() // unreachable on a 10×10 with 17 squares of ship
}

// --- reading a board ---------------------------------------------------------

/** Ship ids on this side with every square hit. */
export function sunkIds(side: SeaSide): string[] {
  return FLEET.filter((s) => {
    let seen = false
    for (let i = 0; i < CELLS; i++) {
      if (side.ships[i] !== s.id) continue
      seen = true
      if (side.shots[i] !== 'x') return false
    }
    return seen
  }).map((s) => s.id)
}

/** Ships still afloat on this side. */
export function afloat(side: SeaSide): ShipDef[] {
  const down = new Set(sunkIds(side))
  return FLEET.filter((s) => !down.has(s.id))
}

/** Every ship square hit — the whole fleet is down at [FLEET_SQUARES]. */
export function hitsTaken(side: SeaSide): number {
  let n = 0
  for (let i = 0; i < CELLS; i++) if (side.shots[i] === 'x') n += 1
  return n
}

export function shotsFired(side: SeaSide): number {
  let n = 0
  for (let i = 0; i < CELLS; i++) if (side.shots[i] !== '') n += 1
  return n
}

/** Squares on this side nobody has fired at yet. */
export function openSquares(side: SeaSide): number[] {
  const open: number[] = []
  for (let i = 0; i < CELLS; i++) if (side.shots[i] === '') open.push(i)
  return open
}

export const foeOf = (c: Color): Color => (c === 'w' ? 'b' : 'w')

/** The waters the side to move is firing INTO. */
export const targetSide = (state: SeaState): SeaSide => state[foeOf(state.turn)]

/** Is this square a legal shot right now? */
export function canFire(state: SeaState, i: number): boolean {
  return !state.over && i >= 0 && i < CELLS && targetSide(state).shots[i] === ''
}

// --- playing -----------------------------------------------------------------

export function newSea(w: SeaSide, b: SeaSide): SeaState {
  return {
    kind: 'seabattle',
    w: { ...w, shots: blankShots() },
    b: { ...b, shots: blankShots() },
    turn: 'w', // the challenger fires first
    last: null,
    over: false,
    winner: null,
    result: null,
    log: [],
    seq: 0,
    owed: zero(),
    fogged: zero(),
    flash: null,
  }
}

/** A deep-enough copy to edit inside one shot without touching the old position. */
const copySide = (s: SeaSide): SeaSide => ({
  ships: [...s.ships],
  shots: [...s.shots],
  cards: [...sideCards(s)],
  traps: sideTraps(s).map((t) => ({ ...t })),
})

/** Ships on this side that nothing has touched yet — the only ones that can move. */
function untouched(side: SeaSide): ShipDef[] {
  return FLEET.filter((s) => {
    let seen = false
    for (let i = 0; i < CELLS; i++) {
      if (side.ships[i] !== s.id) continue
      seen = true
      if (side.shots[i] !== '') return false
    }
    return seen
  })
}

/**
 * Pick up one untouched ship and hide it somewhere else, art and all. The new
 * berth must be clear of *every* shot, not just of other ships — otherwise the
 * ship would land under a square already crossed off and simply vanish.
 * Returns the ship that moved, or null if none could.
 */
function relocate(side: SeaSide): ShipDef | null {
  const movable = untouched(side)
  if (movable.length === 0) return null
  const ship = pick(movable)
  const from: number[] = []
  for (let i = 0; i < CELLS; i++) if (side.ships[i] === ship.id) from.push(i)
  const art = from.map((i) => sideCards(side)[i] ?? '')

  const bare = removeShip(side.ships, ship.id)
  const spots: { at: number; horiz: boolean }[] = []
  for (let at = 0; at < CELLS; at++) {
    for (const horiz of [true, false]) {
      if (!canPlace(bare, ship.size, at, horiz)) continue
      let clean = true
      for (let k = 0; k < ship.size; k++) {
        if (side.shots[horiz ? at + k : at + k * SIZE] !== '') {
          clean = false
          break
        }
      }
      if (clean) spots.push({ at, horiz })
    }
  }
  if (spots.length === 0) return null
  const spot = pick(spots)
  const next = placeShip(bare, ship, spot.at, spot.horiz)
  if (!next) return null

  side.ships = next
  const cards = [...sideCards(side)]
  for (const i of from) cards[i] = ''
  let n = 0
  for (let i = 0; i < CELLS; i++) {
    if (next[i] !== ship.id) continue
    cards[i] = art[n] ?? ''
    n += 1
  }
  side.cards = cards
  return ship
}

/** Wipe the hits off one sunk ship, putting it back in the water. */
function raise(side: SeaSide): ShipDef | null {
  const down = sunkIds(side)
  if (down.length === 0) return null
  const ship = shipById(pick(down))!
  const shots = [...side.shots]
  for (let i = 0; i < CELLS; i++) if (side.ships[i] === ship.id) shots[i] = ''
  side.shots = shots
  return ship
}

/** Blow one more square off a ship that is still afloat. */
function scuttle(side: SeaSide): { ship: ShipDef; at: number } | null {
  const down = new Set(sunkIds(side))
  const spots: { ship: ShipDef; at: number }[] = []
  for (let i = 0; i < CELLS; i++) {
    const id = side.ships[i]
    if (!id || down.has(id) || side.shots[i] === 'x') continue
    spots.push({ ship: shipById(id)!, at: i })
  }
  if (spots.length === 0) return null
  const hit = pick(spots)
  const shots = [...side.shots]
  shots[hit.at] = 'x'
  side.shots = shots
  return hit
}

/** A ship square nobody has found yet — what the peeking cards give away. */
function hiddenSquare(side: SeaSide): number | null {
  const spots: number[] = []
  for (let i = 0; i < CELLS; i++) if (side.ships[i] && side.shots[i] === '') spots.push(i)
  return spots.length ? pick(spots) : null
}

/** Destroy one card still buried on this side, and say which. */
function defuse(side: SeaSide, except: number): string | null {
  const live = sideTraps(side).filter((t) => !t.sprung && t.at !== except)
  if (live.length === 0) return null
  const gone = pick(live)
  side.traps = sideTraps(side).map((t) => (t.at === gone.at ? { ...t, sprung: true } : t))
  return gone.card
}

/**
 * Spring one buried card. `mine` is the captain who FIRED the shot and `theirs`
 * the captain who buried it; both are already private copies, so this mutates
 * them freely. Returns the words for the banner and any squares to reveal.
 */
function springCard(
  card: string,
  at: number,
  mine: SeaSide,
  theirs: SeaSide,
  shooter: Color,
  owed: { w: number; b: number },
  fogged: { w: number; b: number },
): { note: string; show: number[]; showOn: Color | null } {
  const defender = foeOf(shooter)
  const none = (why: string) => ({ note: why, show: [] as number[], showOn: null })

  switch (card) {
    case 'skip':
      owed[shooter] += 1
      return none('Their captain is frozen mid-order — you fire again.')
    case 'barrage':
      owed[shooter] += 2
      return none('The guns do not stop — you take two more shots, right now.')
    case 'mine':
      owed[defender] += 1
      return none('It goes off in your face — you lose your next turn.')
    case 'fog':
      fogged[shooter] += 1
      return none('You cannot see the water any more. Your next shot lands wherever it lands.')
    case 'wreck': {
      const hit = scuttle(theirs)
      return hit
        ? none(`The call goes out and ${cellName(hit.at)} on the ${hit.ship.name} is gone.`)
        : none('The signal goes out — but there is nothing left of that fleet to answer it.')
    }
    case 'burn': {
      const gone = defuse(theirs, at)
      return none(gone ? `They lost a buried card in the fire: ${nameOfCard(gone)}.` : 'Nothing left below decks to burn.')
    }
    case 'steal': {
      const gone = defuse(mine, at)
      return none(gone ? `She lifted one of YOUR buried cards: ${nameOfCard(gone)}.` : 'Your hold was already empty.')
    }
    case 'revive': {
      const up = raise(mine)
      return none(up ? `Your ${up.name} is patched up and back in the water!` : 'Nothing of yours is down — no work for the doctor.')
    }
    case 'mend': {
      const up = raise(theirs)
      return none(up ? `THEIR ${up.name} is back in the water.` : 'Nothing of theirs is down — the card does nothing.')
    }
    case 'jump': {
      const moved = relocate(mine)
      return none(moved ? `Your ${moved.name} was blasted somewhere else on the map.` : 'Every ship of yours is already under fire — nothing can move.')
    }
    case 'swap': {
      const moved = relocate(theirs)
      return none(moved ? 'One of their ships just slipped away to a new square.' : 'Nothing of theirs was free to move.')
    }
    case 'peek': {
      const spot = hiddenSquare(theirs)
      return spot === null
        ? none('You look — and there is nothing left to find.')
        : { note: `There is a ship on ${cellName(spot)}. Two seconds — look now.`, show: [spot], showOn: defender }
    }
    case 'haki': {
      const spot = hiddenSquare(mine)
      return spot === null
        ? none('They look at your waters and find nothing left hidden.')
        : { note: `They saw one of YOUR squares: ${cellName(spot)}.`, show: [spot], showOn: shooter }
    }
    case 'chart': {
      let best = -1
      let bestRow = 0
      for (let r = 0; r < SIZE; r++) {
        let n = 0
        for (let c = 0; c < SIZE; c++) {
          const i = r * SIZE + c
          if (theirs.ships[i] && theirs.shots[i] === '') n += 1
        }
        if (n > best) {
          best = n
          bestRow = r
        }
      }
      const row = Array.from({ length: SIZE }, (_, c) => bestRow * SIZE + c)
      return best <= 0
        ? none('The needle spins. Nothing left hidden to point at.')
        : { note: `The needle settles on row ${bestRow + 1} — more of their fleet is there than anywhere else.`, show: row, showOn: defender }
    }
    default:
      return none('Nothing but lunch. Everyone is fed.')
  }
}

/** Card names live in seaCards.ts; this keeps the engine from importing the UI. */
const CARD_NAMES: Record<string, string> = {
  skip: 'Ope Ope Room',
  wreck: 'Buster Call',
  peek: 'Observation Haki',
  burn: 'Marine Raid',
  revive: 'Rumble Ball',
  jump: 'Coup de Burst',
  barrage: 'Gum-Gum Gatling',
  chart: 'Log Pose',
  mine: 'Nose Fancy Cannon',
  fog: 'Smoke Screen',
  mend: 'Doctor’s Orders',
  steal: 'Nami’s Thievery',
  swap: 'Merry’s Escape',
  haki: 'Conqueror’s Haki',
  dud: 'Sanji’s Bento',
}
const nameOfCard = (id: string) => CARD_NAMES[id] ?? 'a card'

/**
 * One shot. Returns the position that follows, or `null` if the shot wasn't
 * legal — a square already fired at, or a finished game. The turn passes on a
 * hit exactly as it does on a miss: that is the printed rule.
 */
export function fire(state: SeaState, aimedAt: number): SeaState | null {
  if (!canFire(state, aimedAt)) return null

  const shooter = state.turn
  const defender = foeOf(shooter)
  const owed = { ...owedOf(state) }
  const fogged = { ...foggedOf(state) }
  const log = [...state.log]

  const mine = copySide(state[shooter])
  const theirs = copySide(state[defender])

  // A Smoke Screen spends itself here, before anything else: the shot still
  // happens, it just happens somewhere the gunner did not choose.
  let at = aimedAt
  if (fogged[shooter] > 0) {
    fogged[shooter] -= 1
    const open = openSquares(theirs)
    if (open.length > 0) at = pick(open)
    if (at !== aimedAt) log.push({ by: shooter, text: `🌫️ Blind in the smoke — the shot goes wide, to ${cellName(at)}.` })
  }

  const shipId = theirs.ships[at]
  theirs.shots = theirs.shots.map((s, i) => (i === at ? (shipId ? 'x' : 'o') : s))

  const sankNow = shipId && new Set(sunkIds(theirs)).has(shipId) ? shipById(shipId) : undefined
  log.push({
    by: shooter,
    text: sankNow
      ? `${cellName(at)} — ${sankNow.emoji} the ${sankNow.name} goes down!`
      : shipId
        ? `${cellName(at)} — 💥 a hit!`
        : `${cellName(at)} — 🌊 nothing but sea.`,
  })

  // Now the buried card, if the shot found one. It resolves AFTER the shot, so
  // a Buster Call can finish the ship the shot just wounded.
  let flash: SeaFlash | null = null
  const trap = sideTraps(theirs).find((t) => t.at === at && !t.sprung)
  if (trap) {
    theirs.traps = sideTraps(theirs).map((t) => (t.at === at ? { ...t, sprung: true } : t))
    const out = springCard(trap.card, at, mine, theirs, shooter, owed, fogged)
    flash = {
      card: trap.card,
      at,
      owner: defender,
      by: shooter,
      note: out.note,
      show: out.show,
      showOn: out.showOn,
      seq: state.seq + 1,
    }
    log.push({ by: shooter, text: `✨ ${nameOfCard(trap.card)} — ${out.note}` })
  }

  // Everything is settled: only now is it fair to ask whether a fleet is gone.
  // A card can sink the last ship, and a card can raise one back up.
  const allDown = hitsTaken(theirs) >= FLEET_SQUARES
  if (allDown) log.push({ by: shooter, text: '⚓ The last ship is gone — the sea is yours!' })

  // One counter, both directions: "you lose a turn" and "I shoot again" are the
  // same sentence read from opposite ends of the table.
  let turn = defender
  if (!allDown && owed[shooter] > 0) {
    owed[shooter] -= 1
    turn = shooter
  }

  const next: SeaState = {
    ...state,
    turn: allDown ? shooter : turn,
    last: at,
    over: allDown,
    winner: allDown ? shooter : null,
    result: allDown ? 'sunk' : null,
    log: log.slice(-40),
    seq: state.seq + 1,
    owed,
    fogged,
    flash,
  }
  if (shooter === 'w') {
    next.w = mine
    next.b = theirs
  } else {
    next.b = mine
    next.w = theirs
  }
  return next
}

export function resignSea(state: SeaState, loser: Color): SeaState {
  if (state.over) return state
  return {
    ...state,
    over: true,
    winner: foeOf(loser),
    result: 'resign',
    log: [...state.log, { by: loser, text: '🏳️ Struck the colours — the fight is over.' }].slice(-40),
    seq: state.seq + 1,
    flash: null,
  }
}

/**
 * A whole side, ready to fight: a legal scattered fleet painted with album art
 * and three cards buried at random. This is what the Marines sail, and what
 * "🎲 Scatter" hands a captain before they start rearranging it.
 */
export function randomSide(artPool: string[], hand: string[]): SeaSide {
  const ships = randomFleet()
  return {
    ships,
    shots: blankShots(),
    cards: dealShipCards(ships, artPool),
    traps: buryAtRandom(hand, artPool, []),
  }
}

/**
 * Drop a hand of cards on free squares. Two cards never share a square (one
 * shot would spring both and the banner could only show one), and a card may
 * sit on a ship square — burying one in the hull is a real choice.
 */
export function buryAtRandom(hand: string[], artPool: string[], taken: number[]): SeaTrap[] {
  const used = new Set(taken)
  const out: SeaTrap[] = []
  for (const card of hand) {
    let at = -1
    for (let tries = 0; tries < 400 && at < 0; tries++) {
      const i = Math.floor(Math.random() * CELLS)
      if (!used.has(i)) at = i
    }
    if (at < 0) continue
    used.add(at)
    out.push({ card, at, art: artPool.length ? pick(artPool) : '', sprung: false })
  }
  return out
}

export function seaStatus(state: SeaState, nameOf: (c: Color) => string): string {
  if (!state.over) return `${nameOf(state.turn)} to fire`
  if (state.result === 'resign') return `${nameOf(state.winner!)} wins — the other captain struck their colours.`
  return `${nameOf(state.winner!)} wins — the whole fleet is on the seabed!`
}

/** "3 afloat · 11 shots fired" — the one line above the board. */
export function seaScore(state: SeaState, me: Color): string {
  const mine = afloat(state[me]).length
  const theirs = afloat(state[foeOf(me)]).length
  return `⛵ ${mine} afloat · 🎯 ${theirs} of theirs left · ${shotsFired(state[foeOf(me)])} shots fired`
}

// --- the Marines' gunner (the AI) --------------------------------------------

export type SeaLevel = 'rookie' | 'marine' | 'admiral'

export interface SeaLevelDef {
  id: SeaLevel
  name: string
  emoji: string
  blurb: string
}

export const SEA_LEVELS: SeaLevelDef[] = [
  {
    id: 'rookie',
    name: 'Coby',
    emoji: '🐣',
    blurb: 'Fires wherever he likes and hopes. You should beat him.',
  },
  {
    id: 'marine',
    name: 'Smoker',
    emoji: '🚬',
    blurb: 'Fires on every second square until he finds you — then he hunts along the ship until it sinks.',
  },
  {
    id: 'admiral',
    name: 'Akainu',
    emoji: '🌋',
    blurb: 'Works out every place your ships could still be hiding and fires where most of them fit. Brutal.',
  },
]

export const levelDef = (id: SeaLevel): SeaLevelDef => SEA_LEVELS.find((l) => l.id === id) ?? SEA_LEVELS[1]

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]

/** The up/down/left/right squares, without wrapping a row. */
function neighbours(i: number): number[] {
  const out: number[] = []
  const col = i % SIZE
  if (col > 0) out.push(i - 1)
  if (col < SIZE - 1) out.push(i + 1)
  if (i - SIZE >= 0) out.push(i - SIZE)
  if (i + SIZE < CELLS) out.push(i + SIZE)
  return out
}

/** Any square the AI is allowed to fire at — used for the move clock too. */
export function randomShot(state: SeaState): number {
  const open = openSquares(targetSide(state))
  return open.length ? pick(open) : -1
}

/**
 * Where the AI fires. Every level works from what a human sitting opposite
 * would also know: the shots it has already fired, and which ships those shots
 * sank. It never reads a square it has not hit.
 */
export function aiShot(state: SeaState, level: SeaLevel): number {
  const foe = targetSide(state)
  const open = openSquares(foe)
  if (open.length === 0) return -1
  if (level === 'rookie') return pick(open)

  const down = new Set(sunkIds(foe))
  // A hit whose ship hasn't sunk yet: something is still afloat under it. Which
  // hits belong to a SUNK ship is fair game — you're told the ship's name when
  // it goes, and a human crosses those squares off too.
  const wounded: number[] = []
  for (let i = 0; i < CELLS; i++) {
    if (foe.shots[i] === 'x' && !down.has(foe.ships[i])) wounded.push(i)
  }

  if (level === 'marine') return marineShot(foe, open, wounded)
  return admiralShot(foe, open, down)
}

/** Hunt on a checkerboard, then walk the length of whatever you found. */
function marineShot(foe: SeaSide, open: number[], wounded: number[]): number {
  if (wounded.length > 0) {
    const scored: { at: number; weight: number }[] = []
    for (const hit of wounded) {
      for (const n of neighbours(hit)) {
        if (foe.shots[n] !== '') continue
        // Two hits in a line say which way the ship runs, so keep going that
        // way: the square directly OPPOSITE this one, past the hit, is another
        // hit. (Sideways steps stay on the same row — that's the row check.)
        const back = 2 * hit - n
        const sameRow = Math.abs(n - hit) === 1 ? Math.floor(back / SIZE) === Math.floor(hit / SIZE) : true
        const inLine = back >= 0 && back < CELLS && sameRow && foe.shots[back] === 'x'
        scored.push({ at: n, weight: inLine ? 8 : 1 })
      }
    }
    if (scored.length > 0) {
      const best = Math.max(...scored.map((s) => s.weight))
      return pick(scored.filter((s) => s.weight === best).map((s) => s.at))
    }
  }
  // The smallest ship is 2 long, so it must cover a square of one colour —
  // firing on every second square halves the search and can't miss a ship.
  const parity = open.filter((i) => ((i % SIZE) + Math.floor(i / SIZE)) % 2 === 0)
  return pick(parity.length ? parity : open)
}

/**
 * Count, for every square, how many ways a still-afloat ship could cover it,
 * weighting placements that explain a hit nobody has sunk yet. That single
 * count does the hunting AND the finishing, and it is genuinely hard to beat.
 */
function admiralShot(foe: SeaSide, open: number[], down: Set<string>): number {
  const score = new Array<number>(CELLS).fill(0)
  for (const ship of FLEET) {
    if (down.has(ship.id)) continue
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        for (const horiz of [true, false]) {
          if (horiz ? col + ship.size > SIZE : row + ship.size > SIZE) continue
          const cells: number[] = []
          let fits = true
          let explains = 0
          for (let k = 0; k < ship.size; k++) {
            const i = horiz ? row * SIZE + col + k : (row + k) * SIZE + col
            const shot = foe.shots[i]
            // a miss rules the placement out; so does a square belonging to a
            // ship already named and sunk
            if (shot === 'o' || (shot === 'x' && down.has(foe.ships[i]))) {
              fits = false
              break
            }
            if (shot === 'x') explains += 1
            cells.push(i)
          }
          if (!fits) continue
          const weight = 1 + explains * explains * 24
          for (const i of cells) if (foe.shots[i] === '') score[i] += weight
        }
      }
    }
  }
  const best = Math.max(...open.map((i) => score[i]))
  if (best <= 0) return pick(open) // nothing left to deduce — shouldn't happen
  return pick(open.filter((i) => score[i] === best))
}
