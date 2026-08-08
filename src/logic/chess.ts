// Chess — the full official (FIDE) rules, as pure JSON-only functions.
//
// Same shape as logic/cardGame.ts on purpose: no React, no Firestore. That is
// what lets one engine drive a pass-and-play match in React state and a live
// one through a shared Firestore doc.
//
// Board layout: `squares` is a FLAT 64-entry array (Firestore rejects nested
// arrays, so a row-of-rows board would never sync). Index 0 is a8 — the
// top-left corner from White's chair — and index 63 is h1. White moves toward
// index 0; Black toward 63.
//
// Pieces are two-character codes: colour + type, e.g. 'wK', 'bP'. '' is empty.
// Everything the position needs to be judged legally lives in ChessState, so
// two devices holding the same state always agree on what is legal: castling
// rights, the en-passant target, the fifty-move clock and the repetition list.

export type Color = 'w' | 'b'
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'
/** What a Pawn may become. Never a King, never another Pawn. */
export type PromoType = 'Q' | 'R' | 'B' | 'N'

export interface ChessMove {
  from: number
  to: number
  /** Set only when a pawn reaches the far rank. */
  promo?: PromoType
}

/** Why a finished game finished — printed as-is under the board. */
export type ChessResult =
  | 'checkmate'
  | 'stalemate'
  | 'fifty'
  | 'threefold'
  | 'material'
  | 'resign'

export interface ChessLogEntry {
  by: Color
  /** Standard algebraic notation, e.g. "Nf3", "exd5+", "O-O". */
  san: string
  /** The same move in words a nine-year-old can read. */
  text: string
}

export interface ChessState {
  kind: 'chess'
  squares: string[] // 64
  turn: Color
  /** Castling rights still alive, a subset of "KQkq" (upper = White). */
  castle: string
  /** Square a pawn may capture onto en passant, or null. */
  ep: number | null
  /** Half-moves since the last capture or pawn move — the fifty-move rule. */
  half: number
  /** Move number, incremented after Black plays. */
  full: number
  /**
   * Position keys seen since the last irreversible move (capture, pawn move,
   * castling-right change). Cleared on those, which bounds it naturally — a
   * repetition can never span one anyway.
   */
  reps: string[]
  last: { from: number; to: number } | null
  /** Set while the side to move is in check — the board draws a red king. */
  check: boolean
  over: boolean
  /** Winner, or null if the game is still on OR ended in a draw (see result). */
  winner: Color | null
  result: ChessResult | null
  log: ChessLogEntry[]
  /** Bumped on every position, so the arena can tell "new move" from "resync". */
  seq: number
}

// --- One Piece identities ---------------------------------------------------
//
// The glyph is always the real chess glyph and the name is always the real
// chess name — a kid learning the game has to be learning THE game. The One
// Piece character rides alongside as flavour, never instead.

export interface PieceIdentity {
  type: PieceType
  /** The real name of the piece. This is the thing being taught. */
  name: string
  /** Standard Unicode chess glyph for this colour. */
  glyph: string
  /** SAN letter (pawns have none in notation, but the UI still labels them P). */
  letter: string
  /** Who this piece is in the One Piece reskin. */
  who: string
  emoji: string
  /** One line: how it moves. Printed on the piece sheet and the How-to page. */
  moves: string
  /** Rough trade value, shown as pips so a kid can see what's worth what. */
  value: number
}

export const CREW_NAME: Record<Color, string> = { w: 'Straw Hat Crew', b: 'Marines' }
export const CREW_EMOJI: Record<Color, string> = { w: '👒', b: '⚓' }

const WHITE_GLYPH: Record<PieceType, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' }
const BLACK_GLYPH: Record<PieceType, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }

const WHO: Record<Color, Record<PieceType, { who: string; emoji: string }>> = {
  w: {
    K: { who: 'Luffy, the Captain', emoji: '👒' },
    Q: { who: 'Zoro, the First Mate', emoji: '⚔️' },
    R: { who: 'the Thousand Sunny', emoji: '🚢' },
    B: { who: 'Nami, the Navigator', emoji: '🧭' },
    N: { who: 'Chopper', emoji: '🦌' },
    P: { who: 'a Straw Hat crewmate', emoji: '🏴‍☠️' },
  },
  b: {
    K: { who: 'Akainu, the Fleet Admiral', emoji: '🌋' },
    Q: { who: 'Kizaru, the Admiral', emoji: '⭐' },
    R: { who: 'a Marine warship', emoji: '⛴️' },
    B: { who: 'Tsuru, the Vice Admiral', emoji: '🕊️' },
    N: { who: 'Smoker', emoji: '💨' },
    P: { who: 'a Marine recruit', emoji: '🎽' },
  },
}

const MOVES: Record<PieceType, string> = {
  K: 'One square in any direction. Lose him and you lose the game — so he never walks into danger.',
  Q: 'Any distance, straight or diagonal. The strongest piece on the board.',
  R: 'Any distance, but only straight lines — up, down, left, right.',
  B: 'Any distance, but only diagonals. Each one is stuck on its own colour forever.',
  N: 'An L: two squares one way, then one across. The only piece that jumps over others.',
  P: 'One square forward (two on its very first move), and captures only diagonally. Reach the far side and it becomes a Queen.',
}

const VALUE: Record<PieceType, number> = { K: 0, Q: 9, R: 5, B: 3, N: 3, P: 1 }

const NAME: Record<PieceType, string> = {
  K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn',
}

export function identity(piece: string): PieceIdentity | null {
  if (!piece) return null
  const color = piece[0] as Color
  const type = piece[1] as PieceType
  if (!NAME[type]) return null
  const w = WHO[color][type]
  return {
    type,
    name: NAME[type],
    glyph: (color === 'w' ? WHITE_GLYPH : BLACK_GLYPH)[type],
    letter: type,
    who: w.who,
    emoji: w.emoji,
    moves: MOVES[type],
    value: VALUE[type],
  }
}

/** The six identities of one crew, King first — the app's piece sheet. */
export const crewSheet = (color: Color): PieceIdentity[] =>
  (['K', 'Q', 'R', 'B', 'N', 'P'] as PieceType[]).map((t) => identity(color + t)!)

// --- board helpers ----------------------------------------------------------

const FILES = 'abcdefgh'

export const squareName = (i: number): string => `${FILES[i & 7]}${8 - (i >> 3)}`
const row = (i: number) => i >> 3
const col = (i: number) => i & 7
const idx = (r: number, c: number) => r * 8 + c
const on = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8
const colorOf = (p: string): Color | null => (p ? (p[0] as Color) : null)
const typeOf = (p: string): PieceType | null => (p ? (p[1] as PieceType) : null)
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w')

const KNIGHT: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const ORTHO: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const ALL8 = [...DIAG, ...ORTHO]

export function newChess(): ChessState {
  const squares = Array<string>(64).fill('')
  const back: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  for (let c = 0; c < 8; c++) {
    squares[idx(0, c)] = `b${back[c]}`
    squares[idx(1, c)] = 'bP'
    squares[idx(6, c)] = 'wP'
    squares[idx(7, c)] = `w${back[c]}`
  }
  return {
    kind: 'chess',
    squares,
    turn: 'w',
    castle: 'KQkq',
    ep: null,
    half: 0,
    full: 1,
    reps: [],
    last: null,
    check: false,
    over: false,
    winner: null,
    result: null,
    log: [],
    seq: 0,
  }
}

// --- attacks ----------------------------------------------------------------

/** Is square `target` attacked by any piece of `by`? Ignores pins and turn. */
export function attacked(squares: string[], target: number, by: Color): boolean {
  const tr = row(target)
  const tc = col(target)

  // pawns: a `by` pawn attacks the square it could capture onto
  const pawnRow = by === 'w' ? tr + 1 : tr - 1
  for (const dc of [-1, 1]) {
    if (on(pawnRow, tc + dc) && squares[idx(pawnRow, tc + dc)] === `${by}P`) return true
  }
  for (const [dr, dc] of KNIGHT) {
    if (on(tr + dr, tc + dc) && squares[idx(tr + dr, tc + dc)] === `${by}N`) return true
  }
  for (const [dr, dc] of ALL8) {
    if (on(tr + dr, tc + dc) && squares[idx(tr + dr, tc + dc)] === `${by}K`) return true
  }
  const ray = (dirs: [number, number][], types: PieceType[]) => {
    for (const [dr, dc] of dirs) {
      let r = tr + dr
      let c = tc + dc
      while (on(r, c)) {
        const p = squares[idx(r, c)]
        if (p) {
          if (colorOf(p) === by && types.includes(typeOf(p)!)) return true
          break
        }
        r += dr
        c += dc
      }
    }
    return false
  }
  return ray(DIAG, ['B', 'Q']) || ray(ORTHO, ['R', 'Q'])
}

export function kingSquare(squares: string[], color: Color): number {
  return squares.indexOf(`${color}K`)
}

export function inCheck(squares: string[], color: Color): boolean {
  const k = kingSquare(squares, color)
  return k >= 0 && attacked(squares, k, other(color))
}

// --- move generation --------------------------------------------------------

/** Moves ignoring whether they leave your own king in check. */
function pseudoMoves(state: ChessState, from: number): ChessMove[] {
  const piece = state.squares[from]
  const me = colorOf(piece)
  if (!me) return []
  const type = typeOf(piece)!
  const r = row(from)
  const c = col(from)
  const out: ChessMove[] = []
  const empty = (i: number) => state.squares[i] === ''
  const enemy = (i: number) => state.squares[i] !== '' && colorOf(state.squares[i]) !== me

  const push = (to: number) => {
    // a pawn landing on the far rank must say what it becomes
    if (type === 'P' && (row(to) === 0 || row(to) === 7)) {
      for (const promo of ['Q', 'R', 'B', 'N'] as PromoType[]) out.push({ from, to, promo })
    } else {
      out.push({ from, to })
    }
  }

  if (type === 'P') {
    const dir = me === 'w' ? -1 : 1
    const startRow = me === 'w' ? 6 : 1
    if (on(r + dir, c) && empty(idx(r + dir, c))) {
      push(idx(r + dir, c))
      if (r === startRow && empty(idx(r + 2 * dir, c))) out.push({ from, to: idx(r + 2 * dir, c) })
    }
    for (const dc of [-1, 1]) {
      if (!on(r + dir, c + dc)) continue
      const to = idx(r + dir, c + dc)
      if (enemy(to) || (state.ep !== null && to === state.ep)) push(to)
    }
    return out
  }

  if (type === 'N') {
    for (const [dr, dc] of KNIGHT) {
      if (!on(r + dr, c + dc)) continue
      const to = idx(r + dr, c + dc)
      if (empty(to) || enemy(to)) out.push({ from, to })
    }
    return out
  }

  if (type === 'K') {
    for (const [dr, dc] of ALL8) {
      if (!on(r + dr, c + dc)) continue
      const to = idx(r + dr, c + dc)
      if (empty(to) || enemy(to)) out.push({ from, to })
    }
    // castling: rights alive, squares between empty, and the king may not start
    // in check, pass through an attacked square, or land on one
    const homeRow = me === 'w' ? 7 : 0
    if (r === homeRow && c === 4 && !inCheck(state.squares, me)) {
      const kingSide = me === 'w' ? 'K' : 'k'
      const queenSide = me === 'w' ? 'Q' : 'q'
      if (
        state.castle.includes(kingSide) &&
        empty(idx(homeRow, 5)) &&
        empty(idx(homeRow, 6)) &&
        state.squares[idx(homeRow, 7)] === `${me}R` &&
        !attacked(state.squares, idx(homeRow, 5), other(me)) &&
        !attacked(state.squares, idx(homeRow, 6), other(me))
      ) {
        out.push({ from, to: idx(homeRow, 6) })
      }
      if (
        state.castle.includes(queenSide) &&
        empty(idx(homeRow, 3)) &&
        empty(idx(homeRow, 2)) &&
        empty(idx(homeRow, 1)) &&
        state.squares[idx(homeRow, 0)] === `${me}R` &&
        !attacked(state.squares, idx(homeRow, 3), other(me)) &&
        !attacked(state.squares, idx(homeRow, 2), other(me))
      ) {
        out.push({ from, to: idx(homeRow, 2) })
      }
    }
    return out
  }

  const dirs = type === 'B' ? DIAG : type === 'R' ? ORTHO : ALL8
  for (const [dr, dc] of dirs) {
    let rr = r + dr
    let cc = c + dc
    while (on(rr, cc)) {
      const to = idx(rr, cc)
      if (empty(to)) out.push({ from, to })
      else {
        if (enemy(to)) out.push({ from, to })
        break
      }
      rr += dr
      cc += dc
    }
  }
  return out
}

/**
 * Apply a move to a bare board. Handles the three moves that touch more than
 * two squares: en passant (the captured pawn isn't on the target square),
 * castling (the rook comes along) and promotion.
 */
function movedBoard(state: ChessState, m: ChessMove): string[] {
  const sq = [...state.squares]
  const piece = sq[m.from]
  const type = typeOf(piece)
  const me = colorOf(piece)!
  sq[m.from] = ''
  if (type === 'P' && state.ep !== null && m.to === state.ep) {
    sq[idx(row(m.from), col(m.to))] = '' // the pawn captured en passant sits beside us, not under us
  }
  if (type === 'K' && Math.abs(col(m.to) - col(m.from)) === 2) {
    const homeRow = row(m.from)
    if (col(m.to) === 6) {
      sq[idx(homeRow, 5)] = sq[idx(homeRow, 7)]
      sq[idx(homeRow, 7)] = ''
    } else {
      sq[idx(homeRow, 3)] = sq[idx(homeRow, 0)]
      sq[idx(homeRow, 0)] = ''
    }
  }
  sq[m.to] = m.promo ? `${me}${m.promo}` : piece
  return sq
}

/** Every legal move for the piece on `from`, for the side to move. */
export function legalMoves(state: ChessState, from: number): ChessMove[] {
  if (state.over) return []
  const piece = state.squares[from]
  if (!piece || colorOf(piece) !== state.turn) return []
  return pseudoMoves(state, from).filter((m) => !inCheck(movedBoard(state, m), state.turn))
}

/** Every legal move on the board for the side to move. */
export function allMoves(state: ChessState): ChessMove[] {
  const out: ChessMove[] = []
  for (let i = 0; i < 64; i++) {
    if (colorOf(state.squares[i]) === state.turn) out.push(...legalMoves(state, i))
  }
  return out
}

/** Squares holding a piece that actually has somewhere to go. */
export function movableSquares(state: ChessState): number[] {
  const out: number[] = []
  for (let i = 0; i < 64; i++) {
    if (colorOf(state.squares[i]) === state.turn && legalMoves(state, i).length > 0) out.push(i)
  }
  return out
}

// --- kid coaching -----------------------------------------------------------

/**
 * Own pieces the opponent is attacking right now. Drawn as a ⚠️ ring so "your
 * Queen is about to be taken" is visible instead of being something you had to
 * already know to look for.
 */
export function threatened(state: ChessState, color: Color): number[] {
  const out: number[] = []
  for (let i = 0; i < 64; i++) {
    if (colorOf(state.squares[i]) === color && attacked(state.squares, i, other(color))) out.push(i)
  }
  return out
}

/**
 * Would this move drop the piece onto a square the enemy attacks? A blunt but
 * honest warning: it doesn't count defenders, so it flags trades too — which is
 * the right bias for a beginner, who should at least *notice* the trade.
 */
export function moveRisky(state: ChessState, m: ChessMove): boolean {
  if (typeOf(state.squares[m.from]) === 'K') return false // the king can never move into attack anyway
  const after = movedBoard(state, m)
  return attacked(after, m.to, other(state.turn))
}

// --- draws ------------------------------------------------------------------

/** K vs K, K+minor vs K, and K+B vs K+B on the same colour: nobody can ever mate. */
function insufficientMaterial(squares: string[]): boolean {
  const minors: { color: Color; type: PieceType; light: boolean }[] = []
  for (let i = 0; i < 64; i++) {
    const p = squares[i]
    if (!p) continue
    const t = typeOf(p)!
    if (t === 'K') continue
    if (t === 'P' || t === 'Q' || t === 'R') return false
    minors.push({ color: colorOf(p)!, type: t, light: ((row(i) + col(i)) & 1) === 0 })
  }
  if (minors.length <= 1) return true
  if (minors.length === 2) {
    const [a, b] = minors
    if (a.type === 'B' && b.type === 'B' && a.color !== b.color && a.light === b.light) return true
  }
  return false
}

const positionKey = (squares: string[], turn: Color, castle: string, ep: number | null) =>
  `${squares.join('')}|${turn}|${castle}|${ep ?? '-'}`

// --- SAN + plain English ----------------------------------------------------

function sanOf(state: ChessState, m: ChessMove, gives: { check: boolean; mate: boolean }): string {
  const piece = state.squares[m.from]
  const type = typeOf(piece)!
  const target = state.squares[m.to]
  const isEp = type === 'P' && state.ep !== null && m.to === state.ep
  const captures = target !== '' || isEp
  const suffix = gives.mate ? '#' : gives.check ? '+' : ''

  if (type === 'K' && Math.abs(col(m.to) - col(m.from)) === 2) {
    return (col(m.to) === 6 ? 'O-O' : 'O-O-O') + suffix
  }
  if (type === 'P') {
    const body = captures ? `${FILES[col(m.from)]}x${squareName(m.to)}` : squareName(m.to)
    return body + (m.promo ? `=${m.promo}` : '') + suffix
  }
  // disambiguate against every other same-type piece that could also go there
  const rivals: number[] = []
  for (let i = 0; i < 64; i++) {
    if (i === m.from || state.squares[i] !== piece) continue
    if (legalMoves(state, i).some((x) => x.to === m.to)) rivals.push(i)
  }
  let mark = ''
  if (rivals.length > 0) {
    mark = rivals.every((i) => col(i) !== col(m.from))
      ? FILES[col(m.from)]
      : rivals.every((i) => row(i) !== row(m.from))
        ? String(8 - row(m.from))
        : squareName(m.from)
  }
  return `${type}${mark}${captures ? 'x' : ''}${squareName(m.to)}${suffix}`
}

function plainText(state: ChessState, m: ChessMove, gives: { check: boolean; mate: boolean }): string {
  const me = identity(state.squares[m.from])!
  const target = state.squares[m.to]
  const isEp = typeOf(state.squares[m.from]) === 'P' && state.ep !== null && m.to === state.ep
  const took = target ? identity(target) : isEp ? identity(`${other(state.turn)}P`) : null

  let text: string
  if (me.type === 'K' && Math.abs(col(m.to) - col(m.from)) === 2) {
    text = `${me.glyph} ${me.name} castles ${col(m.to) === 6 ? 'kingside' : 'queenside'} — tucked safe behind the Rook.`
  } else if (took) {
    text = `${me.glyph} ${me.name} takes the ${took.name} on ${squareName(m.to)}!`
  } else {
    text = `${me.glyph} ${me.name} ${squareName(m.from)} → ${squareName(m.to)}.`
  }
  if (m.promo) text += ` The Pawn becomes a ${NAME[m.promo]}!`
  if (gives.mate) text += ' Checkmate!'
  else if (gives.check) text += ' Check!'
  return text
}

// --- applying a move --------------------------------------------------------

/**
 * Play a move. Returns the new position, or **null** if the move isn't legal —
 * callers treat null as "leave the board exactly as it was", which is what
 * makes a stale tap arriving from the other phone harmless.
 */
export function applyChessMove(state: ChessState, m: ChessMove): ChessState | null {
  if (state.over) return null
  const legal = legalMoves(state, m.from)
  // a pawn promotion with no piece named defaults to a Queen, which is what a
  // tap on the board means 99 times out of 100
  const chosen =
    legal.find((x) => x.to === m.to && x.promo === m.promo) ??
    (m.promo ? undefined : legal.find((x) => x.to === m.to && x.promo === 'Q'))
  if (!chosen) return null

  const piece = state.squares[chosen.from]
  const type = typeOf(piece)!
  const me = state.turn
  const captured = state.squares[chosen.to] !== '' || (type === 'P' && state.ep !== null && chosen.to === state.ep)
  const squares = movedBoard(state, chosen)

  // castling rights die when the king or a rook leaves home, or a rook is taken
  let castle = state.castle
  const drop = (chars: string) => {
    castle = [...castle].filter((ch) => !chars.includes(ch)).join('')
  }
  if (type === 'K') drop(me === 'w' ? 'KQ' : 'kq')
  if (type === 'R') {
    if (chosen.from === 63) drop('K')
    if (chosen.from === 56) drop('Q')
    if (chosen.from === 7) drop('k')
    if (chosen.from === 0) drop('q')
  }
  if (chosen.to === 63) drop('K')
  if (chosen.to === 56) drop('Q')
  if (chosen.to === 7) drop('k')
  if (chosen.to === 0) drop('q')

  const ep =
    type === 'P' && Math.abs(row(chosen.to) - row(chosen.from)) === 2
      ? idx((row(chosen.from) + row(chosen.to)) / 2, col(chosen.from))
      : null

  const foe = other(me)
  const next: ChessState = {
    ...state,
    squares,
    turn: foe,
    castle,
    ep,
    half: captured || type === 'P' ? 0 : state.half + 1,
    full: me === 'b' ? state.full + 1 : state.full,
    reps: [],
    last: { from: chosen.from, to: chosen.to },
    check: false,
    seq: state.seq + 1,
  }

  const foeInCheck = inCheck(squares, foe)
  const foeHasMoves = allMoves(next).length > 0
  next.check = foeInCheck

  // repetition only counts across reversible moves, so an irreversible one
  // clears the list rather than growing it forever
  const irreversible = captured || type === 'P' || castle !== state.castle
  next.reps = irreversible ? [] : [...state.reps, positionKey(squares, foe, castle, ep)]
  const repeats = next.reps.filter((k) => k === next.reps[next.reps.length - 1]).length

  const gives = { check: foeInCheck, mate: foeInCheck && !foeHasMoves }
  next.log = [...state.log, { by: me, san: sanOf(state, chosen, gives), text: plainText(state, chosen, gives) }]

  if (!foeHasMoves) {
    next.over = true
    next.winner = foeInCheck ? me : null
    next.result = foeInCheck ? 'checkmate' : 'stalemate'
  } else if (insufficientMaterial(squares)) {
    next.over = true
    next.winner = null
    next.result = 'material'
  } else if (next.half >= 100) {
    next.over = true
    next.winner = null
    next.result = 'fifty'
  } else if (repeats >= 3) {
    next.over = true
    next.winner = null
    next.result = 'threefold'
  }
  return next
}

/** End the game because someone sailed off. */
export function resignChess(state: ChessState, loser: Color): ChessState {
  return {
    ...state,
    over: true,
    winner: other(loser),
    result: 'resign',
    seq: state.seq + 1,
    log: [...state.log, { by: loser, san: '1-0', text: '🏳️ Resigned — the other captain sailed off.' }],
  }
}

/** Pieces of `color` that have been taken, as identities, for the captured tray. */
export function capturedBy(state: ChessState, color: Color): PieceIdentity[] {
  const start: Record<PieceType, number> = { K: 1, Q: 1, R: 2, B: 2, N: 2, P: 8 }
  const left: Record<string, number> = {}
  for (const p of state.squares) if (p && colorOf(p) === color) left[typeOf(p)!] = (left[typeOf(p)!] ?? 0) + 1
  const out: PieceIdentity[] = []
  for (const t of ['Q', 'R', 'B', 'N', 'P'] as PieceType[]) {
    // a promoted pawn can push a count ABOVE its start, so clamp at zero
    const gone = Math.max(0, start[t] - (left[t] ?? 0))
    for (let i = 0; i < gone; i++) out.push(identity(color + t)!)
  }
  return out
}

/** How far ahead `color` is in material — the score line above the board. */
export function materialLead(state: ChessState, color: Color): number {
  let sum = 0
  for (const p of state.squares) {
    if (!p) continue
    sum += (colorOf(p) === color ? 1 : -1) * VALUE[typeOf(p)!]
  }
  return sum
}

/** One line describing where the game stands, printed under the board. */
export function chessStatus(state: ChessState, nameOf: (c: Color) => string): string {
  if (state.over) {
    switch (state.result) {
      case 'checkmate':
        return `Checkmate — ${nameOf(state.winner!)} wins!`
      case 'resign':
        return `${nameOf(state.winner!)} wins — the other captain resigned.`
      case 'stalemate':
        return 'Stalemate — no legal move, but no check. It’s a draw.'
      case 'fifty':
        return 'Draw — fifty moves with no capture and no pawn move.'
      case 'threefold':
        return 'Draw — the same position came up three times.'
      case 'material':
        return 'Draw — nobody has enough pieces left to checkmate.'
      default:
        return 'Game over.'
    }
  }
  if (state.check) return `${nameOf(state.turn)} is in CHECK — get the King out of it!`
  return `${nameOf(state.turn)} to move.`
}
