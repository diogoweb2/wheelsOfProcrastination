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
}

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
}

const blankShots = (): string[] => Array(CELLS).fill('')
export const emptyWaters = (): string[] => Array(CELLS).fill('')

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

export function newSea(wShips: string[], bShips: string[]): SeaState {
  return {
    kind: 'seabattle',
    w: { ships: wShips, shots: blankShots() },
    b: { ships: bShips, shots: blankShots() },
    turn: 'w', // the challenger fires first
    last: null,
    over: false,
    winner: null,
    result: null,
    log: [],
    seq: 0,
  }
}

/**
 * One shot. Returns the position that follows, or `null` if the shot wasn't
 * legal — a square already fired at, or a finished game. The turn passes on a
 * hit exactly as it does on a miss: that is the printed rule.
 */
export function fire(state: SeaState, at: number): SeaState | null {
  if (!canFire(state, at)) return null

  const shooter = state.turn
  const defender = foeOf(shooter)
  const side = state[defender]
  const shipId = side.ships[at]
  const shots = [...side.shots]
  shots[at] = shipId ? 'x' : 'o'
  const nextSide: SeaSide = { ships: side.ships, shots }

  const down = new Set(sunkIds(nextSide))
  const justSank = shipId && down.has(shipId) ? shipById(shipId) : undefined
  const allDown = hitsTaken(nextSide) >= FLEET_SQUARES

  const text = justSank
    ? `${cellName(at)} — ${justSank.emoji} the ${justSank.name} goes down!`
    : shipId
      ? `${cellName(at)} — 💥 a hit!`
      : `${cellName(at)} — 🌊 nothing but sea.`

  const log = [...state.log, { by: shooter, text }]
  if (allDown) log.push({ by: shooter, text: '⚓ The last ship is gone — the sea is yours!' })

  const next: SeaState = {
    ...state,
    turn: allDown ? shooter : defender,
    last: at,
    over: allDown,
    winner: allDown ? shooter : null,
    result: allDown ? 'sunk' : null,
    log: log.slice(-40),
    seq: state.seq + 1,
  }
  if (defender === 'w') next.w = nextSide
  else next.b = nextSide
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
  }
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
