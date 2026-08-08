// The 8×8 board both Chess and Checkers are played on.
//
// Everything about it is aimed at the youngest player at the table: the squares
// are big enough for a thumb, the piece a kid taps lights up, and every square
// it may legally go to is marked — a dot for a quiet move, a ring for a
// capture, a ⚠️ when the square is one the other side attacks. It never *makes*
// the move for anyone; it only ever shows what the rules already allow.
import type { BoardState, CellPiece, Color, GameKit } from '../logic/boardGames'
import { squareName } from '../logic/boardGames'

export interface BoardTarget {
  to: number
  capture: boolean
  /** The other side attacks this square — drawn with a warning ring. */
  risky: boolean
}

export function GameBoard({
  kit,
  state,
  view,
  selected,
  targets,
  danger,
  movable,
  checkSquare,
  hints,
  labels,
  disabled,
  onTap,
}: {
  kit: GameKit
  state: BoardState
  /** Which crew sits at the bottom of the screen. */
  view: Color
  selected: number | null
  targets: BoardTarget[]
  /** Own pieces the opponent is attacking right now. */
  danger: number[]
  /** Squares holding a piece that has somewhere to go. */
  movable: number[]
  /** Square of a king in check, or null. */
  checkSquare: number | null
  hints: boolean
  /** Print the piece's letter (K/Q/R/B/N/P) under it — the name-learning aid. */
  labels: boolean
  disabled: boolean
  onTap: (i: number) => void
}) {
  // black at the bottom means walking the board backwards; nothing else changes
  const order = view === 'w' ? Array.from({ length: 64 }, (_, i) => i) : Array.from({ length: 64 }, (_, i) => 63 - i)
  const targetBy = new Map(targets.map((t) => [t.to, t]))
  const dangerSet = new Set(danger)
  const movableSet = new Set(movable)
  const last = state.last

  return (
    <div className={`board${disabled ? ' is-waiting' : ''}`} aria-label="game board">
      {order.map((i) => {
        const dark = ((i >> 3) + (i & 7)) % 2 === 1
        const piece = kit.cell(state, i)
        const target = targetBy.get(i)
        const usable = kit.usable(i)
        const cls = [
          'sq',
          dark ? 'sq--dark' : 'sq--light',
          !usable ? 'sq--dead' : '',
          selected === i ? 'is-selected' : '',
          last && (last.from === i || last.to === i) ? 'is-last' : '',
          checkSquare === i ? 'is-check' : '',
          hints && dangerSet.has(i) ? 'is-danger' : '',
          hints && selected === null && movableSet.has(i) ? 'is-ready' : '',
        ]
          .filter(Boolean)
          .join(' ')

        // edge labels ride inside the border squares, so the board stays square
        const file = i & 7
        const rank = i >> 3
        const showFile = view === 'w' ? rank === 7 : rank === 0
        const showRank = view === 'w' ? file === 0 : file === 7

        return (
          <button key={i} className={cls} onClick={() => onTap(i)} aria-label={squareName(i)}>
            {showRank && <span className="sq-coord sq-coord--rank">{squareName(i)[1]}</span>}
            {showFile && <span className="sq-coord sq-coord--file">{squareName(i)[0]}</span>}
            {piece && <Piece piece={piece} labels={labels} kind={kit.kind} />}
            {target && (
              <span
                className={`sq-target${target.capture ? ' sq-target--take' : ''}${
                  hints && target.risky ? ' sq-target--risky' : ''
                }`}
              >
                {hints && target.risky && <span className="sq-warn">⚠️</span>}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Piece({ piece, labels, kind }: { piece: CellPiece; labels: boolean; kind: string }) {
  return (
    <span className={`pc pc--${piece.color} pc--${kind}${piece.king ? ' pc--king' : ''}`}>
      <span className="pc-glyph">{piece.glyph}</span>
      {labels && piece.letter && <span className="pc-letter">{piece.letter}</span>}
    </span>
  )
}
