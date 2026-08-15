// The 10×10 chart, drawn three ways from one component:
//
//   'place'  — your own waters while you hide the fleet (ships visible, a ghost
//              under the ship you're holding)
//   'own'    — your waters during the fight (your ships, plus their shots on you)
//   'target' — the enemy's waters (your shots only; a ship appears ONLY once it
//              has sunk, which is the exact moment the rules say you're told)
//
// The secrecy of the target view lives here and nowhere else: it is handed the
// enemy's ship layout so it can draw a wreck, and it must never draw a ship
// that is still afloat. Every other screen just passes `mode`.
import type { ReactNode } from 'react'
import { CELLS, SIZE, cellName, shipById, sunkIds } from '../logic/seaBattle'

export type SeaGridMode = 'place' | 'own' | 'target'

export function SeaGrid({
  ships,
  shots,
  mode,
  last = null,
  aim = null,
  hint = [],
  disabled = false,
  reveal = false,
  onTap,
}: {
  /** 100 entries: '' or a ship id. */
  ships: string[]
  /** 100 entries: '' | 'o' | 'x' — shots that landed HERE. */
  shots: string[]
  mode: SeaGridMode
  /** The square just fired at, flashed so an arriving shot is never silent. */
  last?: number | null
  /** The square the player has lined up but not fired at yet. */
  aim?: number | null
  /** Squares worth pointing at — while placing, every legal spot for the held ship. */
  hint?: number[]
  disabled?: boolean
  /** Game over: show everything, including the ships that were never found. */
  reveal?: boolean
  onTap?: (i: number) => void
}) {
  const down = new Set(sunkIds({ ships, shots }))
  const hintSet = new Set(hint)
  // the emoji sits on a ship's first square only — one badge per ship, not ten
  const badge = new Map<number, string>()
  for (const id of new Set(ships.filter(Boolean))) {
    const at = ships.indexOf(id)
    if (at >= 0) badge.set(at, shipById(id)?.emoji ?? '⛵')
  }

  const cells: ReactNode[] = []
  for (let i = 0; i < CELLS; i++) {
    const shipId = ships[i]
    const shot = shots[i]
    const sunk = Boolean(shipId) && down.has(shipId)
    // A ship is drawn on your own boards always, and on the enemy's board only
    // once it is a wreck (or once the game is over and nothing is secret).
    const showShip = Boolean(shipId) && (mode !== 'target' || sunk || reveal)

    const classes = ['sea-cell']
    if (showShip) classes.push('sea-cell--ship')
    if (sunk && (mode !== 'target' || showShip)) classes.push('sea-cell--sunk')
    if (shot === 'x') classes.push('sea-cell--hit')
    if (shot === 'o') classes.push('sea-cell--miss')
    if (i === last) classes.push('is-last')
    if (i === aim) classes.push('is-aim')
    if (hintSet.has(i)) classes.push('is-hint')

    cells.push(
      <button
        key={i}
        type="button"
        className={classes.join(' ')}
        disabled={disabled || !onTap}
        aria-label={cellName(i)}
        onClick={() => onTap?.(i)}
      >
        {shot === 'x' ? (
          <span className="sea-mark">{sunk ? '🔥' : '💥'}</span>
        ) : shot === 'o' ? (
          <span className="sea-miss" aria-hidden />
        ) : showShip && badge.has(i) ? (
          <span className="sea-mark sea-mark--ship">{badge.get(i)}</span>
        ) : null}
      </button>,
    )
  }

  return (
    <div className={`sea-board sea-board--${mode}${disabled ? ' is-waiting' : ''}`}>
      <span className="sea-axis" />
      {Array.from({ length: SIZE }, (_, c) => (
        <span className="sea-axis" key={`c${c}`}>
          {String.fromCharCode(65 + c)}
        </span>
      ))}
      {Array.from({ length: SIZE }, (_, r) => (
        <Row key={`r${r}`} row={r} cells={cells} />
      ))}
    </div>
  )
}

/** One rank: its number, then its ten squares. A fragment so the grid stays flat. */
function Row({ row, cells }: { row: number; cells: ReactNode[] }) {
  return (
    <>
      <span className="sea-axis">{row + 1}</span>
      {cells.slice(row * SIZE, row * SIZE + SIZE)}
    </>
  )
}
