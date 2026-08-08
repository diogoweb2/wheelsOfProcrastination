// The two board games, behind one interface.
//
// Chess and Checkers share everything except their rules: the same lobby, the
// same challenge → accept → alternate-moves flow over the same shared Firestore
// doc, the same board renderer, the same coaching highlights. So the engines
// stay completely separate (logic/chess.ts, logic/checkers.ts) and meet here in
// a `GameKit` the UI and the store both talk to. Adding a third board game is
// one kit, one registry entry and one route.

import {
  allMoves as chessAll,
  applyChessMove,
  capturedBy,
  chessStatus,
  crewSheet,
  identity as chessIdentity,
  legalMoves as chessLegal,
  materialLead,
  movableSquares as chessMovable,
  moveRisky as chessRisky,
  newChess,
  resignChess,
  squareName,
  threatened as chessThreatened,
  type ChessState,
  type Color,
} from './chess'
import {
  allMoves as checkersAll,
  applyCheckersMove,
  checkersStatus,
  countPieces,
  identity as checkersIdentity,
  legalMoves as checkersLegal,
  movableSquares as checkersMovable,
  moveRisky as checkersRisky,
  newCheckers,
  playable,
  resignCheckers,
  threatened as checkersThreatened,
  type CheckersState,
} from './checkers'

export type { Color }
export { squareName }

export type BoardKind = 'chess' | 'checkers'
export type BoardState = ChessState | CheckersState
export interface BoardMove {
  from: number
  to: number
  /** Chess promotion only; the engines ignore it otherwise. */
  promo?: 'Q' | 'R' | 'B' | 'N'
}

/** Berries the winner of a head-to-head takes, matching the duel's payout scale. */
export const BOARD_REWARD = 25

/** How one square should be drawn. `null` for an empty square. */
export interface CellPiece {
  color: Color
  /** Unicode chess glyph, or a checker disc. The piece a kid actually sees. */
  glyph: string
  /** K/Q/R/B/N/P for chess, K for a crowned checker — the name-tag overlay. */
  letter: string
  /** The real chess/draughts name: "Queen", "Man", "King". */
  name: string
  /** Who they are in the reskin: "Zoro, the First Mate". */
  who: string
  king: boolean
}

export interface GameKit {
  kind: BoardKind
  /** App-facing name and flavour. */
  title: string
  icon: string
  blurb: string
  create(): BoardState
  legalMoves(state: BoardState, from: number): BoardMove[]
  allMoves(state: BoardState): BoardMove[]
  movable(state: BoardState): number[]
  apply(state: BoardState, move: BoardMove): BoardState | null
  resign(state: BoardState, loser: Color): BoardState
  threatened(state: BoardState, color: Color): number[]
  risky(state: BoardState, move: BoardMove): boolean
  cell(state: BoardState, i: number): CellPiece | null
  /**
   * Does this move take a piece? Not the same as "the target square is
   * occupied": a checkers jump and an en-passant capture both land on an EMPTY
   * square, and both have to draw as captures.
   */
  isCapture(state: BoardState, move: BoardMove): boolean
  /** Is this square part of the playing area at all? (Checkers uses dark only.) */
  usable(i: number): boolean
  status(state: BoardState, nameOf: (c: Color) => string): string
  /** Short score line above the board, e.g. "+3 material" or "9 v 7". */
  score(state: BoardState, color: Color): string
  /** True when this move needs the promotion picker before it can be played. */
  needsPromo(state: BoardState, move: BoardMove): boolean
  /** Last N log lines, newest last. */
  log(state: BoardState): { by: Color; text: string }[]
}

const asChess = (s: BoardState) => s as ChessState
const asCheckers = (s: BoardState) => s as CheckersState

export const CHESS_KIT: GameKit = {
  kind: 'chess',
  title: 'Grand Line Chess',
  icon: '♟️',
  blurb: 'Official chess rules, crewed by the Straw Hats. Trap the enemy King and the sea is yours.',
  create: () => newChess(),
  legalMoves: (s, from) => chessLegal(asChess(s), from),
  allMoves: (s) => chessAll(asChess(s)),
  movable: (s) => chessMovable(asChess(s)),
  apply: (s, m) => applyChessMove(asChess(s), m),
  resign: (s, loser) => resignChess(asChess(s), loser),
  threatened: (s, color) => chessThreatened(asChess(s), color),
  risky: (s, m) => chessRisky(asChess(s), m),
  cell: (s, i) => {
    const id = chessIdentity(asChess(s).squares[i])
    if (!id) return null
    return {
      color: asChess(s).squares[i][0] as Color,
      glyph: id.glyph,
      letter: id.letter,
      name: id.name,
      who: id.who,
      king: id.type === 'K',
    }
  },
  isCapture: (s, m) => {
    const st = asChess(s)
    if (st.squares[m.to] !== '') return true
    return st.squares[m.from]?.[1] === 'P' && st.ep === m.to // en passant lands on an empty square
  },
  usable: () => true,
  status: (s, nameOf) => chessStatus(asChess(s), nameOf),
  score: (s, color) => {
    const lead = materialLead(asChess(s), color)
    const taken = capturedBy(asChess(s), color === 'w' ? 'b' : 'w').length
    return `${lead > 0 ? `+${lead}` : lead} · ${taken} captured`
  },
  needsPromo: (s, m) => {
    const st = asChess(s)
    const p = st.squares[m.from]
    return p?.[1] === 'P' && (m.to >> 3) === (p[0] === 'w' ? 0 : 7)
  },
  log: (s) => asChess(s).log.map((l) => ({ by: l.by, text: l.text })),
}

export const CHECKERS_KIT: GameKit = {
  kind: 'checkers',
  title: 'Davy Back Checkers',
  icon: '🔴',
  blurb: 'Official 8×8 checkers. Jumping is compulsory — reach the far side and you’re crowned.',
  create: () => newCheckers(),
  legalMoves: (s, from) => checkersLegal(asCheckers(s), from),
  allMoves: (s) => checkersAll(asCheckers(s)),
  movable: (s) => checkersMovable(asCheckers(s)),
  apply: (s, m) => applyCheckersMove(asCheckers(s), m),
  resign: (s, loser) => resignCheckers(asCheckers(s), loser),
  threatened: (s, color) => checkersThreatened(asCheckers(s), color),
  risky: (s, m) => checkersRisky(asCheckers(s), m),
  cell: (s, i) => {
    const piece = asCheckers(s).squares[i]
    const id = checkersIdentity(piece)
    if (!id) return null
    // Always the disc: a crowned piece is the SAME colour as its crew, and a
    // bare 👑 for both sides would be unreadable. The crown is stamped on top
    // by CSS (`.pc--king`), so colour still says whose piece it is.
    return {
      color: id.color,
      glyph: '⬤',
      letter: '',
      name: id.name,
      who: id.who,
      king: id.king,
    }
  },
  // a jump is the only move that travels two rows; the landing square is empty
  isCapture: (_s, m) => Math.abs((m.to >> 3) - (m.from >> 3)) === 2,
  usable: playable,
  status: (s, nameOf) => checkersStatus(asCheckers(s), nameOf),
  score: (s, color) => {
    const me = countPieces(asCheckers(s), color)
    const them = countPieces(asCheckers(s), color === 'w' ? 'b' : 'w')
    return `${me.men + me.kings} v ${them.men + them.kings} · 👑 ${me.kings}`
  },
  needsPromo: () => false,
  log: (s) => asCheckers(s).log.map((l) => ({ by: l.by, text: l.text })),
}

export const KITS: Record<BoardKind, GameKit> = { chess: CHESS_KIT, checkers: CHECKERS_KIT }
export const kitFor = (kind: BoardKind): GameKit => KITS[kind]

export { crewSheet }

/** The pieces page for whichever game — chess gets six, checkers gets two. */
export interface PieceLesson {
  glyph: string
  name: string
  who: string
  moves: string
  value?: number
}

export function lessonsFor(kind: BoardKind, color: Color): PieceLesson[] {
  if (kind === 'chess') {
    return crewSheet(color).map((p) => ({
      glyph: p.glyph,
      name: p.name,
      who: `${p.emoji} ${p.who}`,
      moves: p.moves,
      value: p.value,
    }))
  }
  const crew = color === 'w' ? ['Straw Hat crewmate', 'Pirate King'] : ['Marine recruit', 'Fleet Admiral']
  return [
    {
      glyph: '⬤',
      name: 'Man',
      who: `${color === 'w' ? '👒' : '⚓'} ${crew[0]}`,
      moves: 'One square diagonally FORWARD. Jumps forward only. Reach the far row and it is crowned.',
    },
    {
      glyph: '⬤', // the crown is stamped on by `.pc--king`, same as on the board
      name: 'King',
      who: `${color === 'w' ? '👒' : '⚓'} ${crew[1]}`,
      moves: 'One square diagonally in ANY direction, and it jumps backwards too. Worth about two Men.',
    },
  ]
}
