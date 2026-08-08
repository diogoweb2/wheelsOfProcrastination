// Checkers — the official 8×8 English draughts rules (the game Checkers Canada
// plays, and the board everyone actually owns), as pure JSON-only functions.
//
// Same contract as logic/chess.ts: flat 64-entry board (Firestore rejects
// nested arrays), no React, no Firestore, `null` never `undefined`.
//
// The four rules that make this the official game rather than a toy:
//   1. **Capturing is compulsory.** If a jump exists anywhere, only jumps are
//      legal. Which jump you take is your choice (English rules do not force
//      the longest one).
//   2. **A jump chains.** After landing, if the same piece can jump again it
//      must, and the turn does not pass — `chain` holds that piece.
//   3. **Men move and jump forward only.** Only a King goes backwards.
//   4. **Crowning ends the turn**, even if more jumps were available.
// A player with no legal move loses — being blocked is a real way to lose.

import type { Color } from './chess'

export type { Color }

export interface CheckersMove {
  from: number
  to: number
}

export type CheckersResult = 'captured' | 'blocked' | 'resign' | 'stalled'

export interface CheckersLogEntry {
  by: Color
  text: string
}

export interface CheckersState {
  kind: 'checkers'
  /** 64 entries: 'wm' | 'wk' | 'bm' | 'bk' | ''. Only dark squares are ever used. */
  squares: string[]
  turn: Color
  /** Mid-multi-jump: the square of the piece that must keep jumping, else null. */
  chain: number | null
  /** Plies since the last capture — the 40-move draw. */
  since: number
  last: { from: number; to: number } | null
  /** Set while the side to move is forced to capture — the board says so out loud. */
  mustJump: boolean
  over: boolean
  winner: Color | null
  result: CheckersResult | null
  log: CheckersLogEntry[]
  seq: number
}

/** Plies (half-moves) without a capture before the game is called a draw. */
const STALL_LIMIT = 80

// --- One Piece identities ---------------------------------------------------

export const CREW_NAME: Record<Color, string> = { w: 'Straw Hat Crew', b: 'Marines' }

export interface CheckerIdentity {
  /** The real name of the piece — this is what's being taught. */
  name: 'Man' | 'King'
  who: string
  emoji: string
  king: boolean
  color: Color
}

export function identity(piece: string): CheckerIdentity | null {
  if (!piece) return null
  const color = piece[0] as Color
  const king = piece[1] === 'k'
  const who = color === 'w' ? (king ? 'Pirate King' : 'Straw Hat crewmate') : king ? 'Fleet Admiral' : 'Marine recruit'
  return { name: king ? 'King' : 'Man', who, emoji: color === 'w' ? '👒' : '⚓', king, color }
}

// --- board helpers ----------------------------------------------------------

const FILES = 'abcdefgh'
export const squareName = (i: number): string => `${FILES[i & 7]}${8 - (i >> 3)}`
const row = (i: number) => i >> 3
const col = (i: number) => i & 7
const idx = (r: number, c: number) => r * 8 + c
const on = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w')
const colorOf = (p: string): Color | null => (p ? (p[0] as Color) : null)
const isKing = (p: string) => p[1] === 'k'

/** Playable squares are the dark ones — the same colouring the chess board uses. */
export const playable = (i: number): boolean => ((row(i) + col(i)) & 1) === 1

export function newCheckers(): CheckersState {
  const squares = Array<string>(64).fill('')
  for (let i = 0; i < 64; i++) {
    if (!playable(i)) continue
    if (row(i) <= 2) squares[i] = 'bm'
    if (row(i) >= 5) squares[i] = 'wm'
  }
  return {
    kind: 'checkers',
    squares,
    turn: 'w',
    chain: null,
    since: 0,
    last: null,
    mustJump: false,
    over: false,
    winner: null,
    result: null,
    log: [],
    seq: 0,
  }
}

/** Which diagonals this piece may travel: men forward only, kings both ways. */
function dirsFor(piece: string): [number, number][] {
  const forward = colorOf(piece) === 'w' ? -1 : 1
  if (isKing(piece)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  return [[forward, -1], [forward, 1]]
}

/** Jumps available to the piece on `from`, with the square it hops over. */
function jumpsFrom(squares: string[], from: number): { to: number; over: number }[] {
  const piece = squares[from]
  if (!piece) return []
  const me = colorOf(piece)!
  const out: { to: number; over: number }[] = []
  for (const [dr, dc] of dirsFor(piece)) {
    const mr = row(from) + dr
    const mc = col(from) + dc
    const lr = row(from) + 2 * dr
    const lc = col(from) + 2 * dc
    if (!on(lr, lc)) continue
    const mid = squares[idx(mr, mc)]
    if (mid && colorOf(mid) !== me && squares[idx(lr, lc)] === '') out.push({ to: idx(lr, lc), over: idx(mr, mc) })
  }
  return out
}

function stepsFrom(squares: string[], from: number): number[] {
  const piece = squares[from]
  if (!piece) return []
  const out: number[] = []
  for (const [dr, dc] of dirsFor(piece)) {
    const r = row(from) + dr
    const c = col(from) + dc
    if (on(r, c) && squares[idx(r, c)] === '') out.push(idx(r, c))
  }
  return out
}

/** Does this side have any capture at all? Compulsory-capture turns on this. */
function anyJump(state: CheckersState): boolean {
  if (state.chain !== null) return jumpsFrom(state.squares, state.chain).length > 0
  for (let i = 0; i < 64; i++) {
    if (colorOf(state.squares[i]) === state.turn && jumpsFrom(state.squares, i).length > 0) return true
  }
  return false
}

/** Every legal destination for the piece on `from`, for the side to move. */
export function legalMoves(state: CheckersState, from: number): CheckersMove[] {
  if (state.over) return []
  const piece = state.squares[from]
  if (!piece || colorOf(piece) !== state.turn) return []
  // mid-chain, only the jumping piece may move — and only by jumping
  if (state.chain !== null && state.chain !== from) return []
  const jumps = jumpsFrom(state.squares, from)
  if (state.chain !== null) return jumps.map((j) => ({ from, to: j.to }))
  if (anyJump(state)) return jumps.map((j) => ({ from, to: j.to }))
  return stepsFrom(state.squares, from).map((to) => ({ from, to }))
}

export function allMoves(state: CheckersState): CheckersMove[] {
  const out: CheckersMove[] = []
  for (let i = 0; i < 64; i++) {
    if (colorOf(state.squares[i]) === state.turn) out.push(...legalMoves(state, i))
  }
  return out
}

export function movableSquares(state: CheckersState): number[] {
  const out: number[] = []
  for (let i = 0; i < 64; i++) {
    if (colorOf(state.squares[i]) === state.turn && legalMoves(state, i).length > 0) out.push(i)
  }
  return out
}

// --- kid coaching -----------------------------------------------------------

/** Own pieces the opponent could jump right now — drawn with a ⚠️ ring. */
export function threatened(state: CheckersState, color: Color): number[] {
  const out = new Set<number>()
  for (let i = 0; i < 64; i++) {
    if (colorOf(state.squares[i]) !== other(color)) continue
    for (const j of jumpsFrom(state.squares, i)) out.add(j.over)
  }
  return [...out]
}

/**
 * Would this move hand the opponent a jump on the piece that just moved? Only
 * checked for the final landing square of a plain move — mid-chain everything
 * is forced anyway, so a warning there would be noise.
 */
export function moveRisky(state: CheckersState, m: CheckersMove): boolean {
  const after = applyCheckersMove(state, m)
  if (!after || after.turn === state.turn) return false // still our turn (a chain) — nothing to fear yet
  for (let i = 0; i < 64; i++) {
    if (colorOf(after.squares[i]) !== after.turn) continue
    if (jumpsFrom(after.squares, i).some((j) => j.over === m.to)) return true
  }
  return false
}

/** How many pieces each side has left, kings counted separately — the score line. */
export function countPieces(state: CheckersState, color: Color): { men: number; kings: number } {
  let men = 0
  let kings = 0
  for (const p of state.squares) {
    if (colorOf(p) !== color) continue
    if (isKing(p)) kings++
    else men++
  }
  return { men, kings }
}

// --- applying a move --------------------------------------------------------

/**
 * Play a move. Returns the new position, or **null** when the move isn't legal.
 * A jump that can continue leaves `turn` alone and sets `chain`, so the caller
 * never has to know the multi-jump rule — it just keeps getting handed the same
 * player.
 */
export function applyCheckersMove(state: CheckersState, m: CheckersMove): CheckersState | null {
  if (state.over) return null
  if (!legalMoves(state, m.from).some((x) => x.to === m.to)) return null

  const squares = [...state.squares]
  const piece = squares[m.from]
  const me = state.turn
  const jump = jumpsFrom(state.squares, m.from).find((j) => j.to === m.to)
  const took = jump ? identity(squares[jump.over]) : null

  squares[m.from] = ''
  if (jump) squares[jump.over] = ''

  // crowning: reaching the far rank makes a King — and ends the turn on the spot
  const crownRow = me === 'w' ? 0 : 7
  const crowned = !isKing(piece) && row(m.to) === crownRow
  squares[m.to] = crowned ? `${me}k` : piece

  const canChain = !!jump && !crowned && jumpsFrom(squares, m.to).length > 0
  const foe = other(me)
  const next: CheckersState = {
    ...state,
    squares,
    turn: canChain ? me : foe,
    chain: canChain ? m.to : null,
    since: jump ? 0 : state.since + 1,
    last: { from: m.from, to: m.to },
    mustJump: false,
    seq: state.seq + 1,
  }

  const who = identity(piece)!
  let text = jump
    ? `${who.king ? '👑' : '⚫'} ${who.name} jumps the ${took?.name ?? 'piece'} on ${squareName(jump.over)}!`
    : `${who.king ? '👑' : '⚫'} ${who.name} ${squareName(m.from)} → ${squareName(m.to)}.`
  if (crowned) text += ' Crowned — it’s a King now! 👑'
  if (canChain) text += ' And it can jump again…'
  next.log = [...state.log, { by: me, text }]

  // the game ends the moment the side to move has nothing legal — whether that's
  // because they have no pieces or because they're completely blocked
  const foeLeft = countPieces(next, next.turn)
  if (foeLeft.men + foeLeft.kings === 0) {
    next.over = true
    next.winner = other(next.turn)
    next.result = 'captured'
  } else if (allMoves(next).length === 0) {
    next.over = true
    next.winner = other(next.turn)
    next.result = 'blocked'
  } else if (next.since >= STALL_LIMIT) {
    next.over = true
    next.winner = null
    next.result = 'stalled'
  } else {
    next.mustJump = anyJump(next)
  }
  return next
}

export function resignCheckers(state: CheckersState, loser: Color): CheckersState {
  return {
    ...state,
    over: true,
    winner: other(loser),
    result: 'resign',
    seq: state.seq + 1,
    log: [...state.log, { by: loser, text: '🏳️ Resigned — the other captain sailed off.' }],
  }
}

export function checkersStatus(state: CheckersState, nameOf: (c: Color) => string): string {
  if (state.over) {
    switch (state.result) {
      case 'captured':
        return `${nameOf(state.winner!)} wins — every piece captured!`
      case 'blocked':
        return `${nameOf(state.winner!)} wins — the other side had no move left.`
      case 'resign':
        return `${nameOf(state.winner!)} wins — the other captain resigned.`
      case 'stalled':
        return 'Draw — forty moves went by with nothing captured.'
      default:
        return 'Game over.'
    }
  }
  if (state.chain !== null) return `${nameOf(state.turn)} must keep jumping with the same piece!`
  if (state.mustJump) return `${nameOf(state.turn)} MUST capture — jumping is compulsory.`
  return `${nameOf(state.turn)} to move.`
}
