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
import { CELLS, SIZE, cellName, shipById, sunkIds, type SeaTrap } from '../logic/seaBattle'
import { seaCardById } from '../logic/seaCards'
import { stickerUrl } from '../logic/album'

export type SeaGridMode = 'place' | 'own' | 'target'

export function SeaGrid({
  ships,
  shots,
  cards = [],
  traps = [],
  mode,
  last = null,
  aim = null,
  hint = [],
  focus = [],
  spy = [],
  bury = null,
  overlay = null,
  overlayAt = null,
  disabled = false,
  reveal = false,
  onTap,
}: {
  /** 100 entries: '' or a ship id. */
  ships: string[]
  /** 100 entries: '' | 'o' | 'x' — shots that landed HERE. */
  shots: string[]
  /** 100 entries: the sticker drawn on that ship square. Decoration only. */
  cards?: string[]
  /**
   * Buried special cards. Drawn ONLY on your own boards ('place' / 'own') — a
   * target board is handed them so a sprung one can be marked, and must never
   * show one that is still waiting.
   */
  traps?: SeaTrap[]
  /** Squares a card just gave away, lit for two seconds. Shows the ship under them. */
  spy?: number[]
  /** While burying: the card in hand, drawn as a ghost under the cursor. */
  bury?: string | null
  mode: SeaGridMode
  /** The square just fired at, flashed so an arriving shot is never silent. */
  last?: number | null
  /** The square the player has lined up but not fired at yet. */
  aim?: number | null
  /** Squares worth pointing at — while placing, every legal spot for the held ship. */
  hint?: number[]
  /** Squares that ARE the thing being talked about — the ship you just tapped. */
  focus?: number[]
  /**
   * A small control pinned over one square — the ↔️/↕️ popover on the ship you
   * tapped. Placed as its own grid item so it lands exactly on the square
   * without a single measured pixel, and so it is never a button inside a
   * button (which the cells are).
   */
  overlay?: ReactNode
  overlayAt?: number | null
  disabled?: boolean
  /** Game over: show everything, including the ships that were never found. */
  reveal?: boolean
  onTap?: (i: number) => void
}) {
  const down = new Set(sunkIds({ ships, shots }))
  const hintSet = new Set(hint)
  const focusSet = new Set(focus)
  const spySet = new Set(spy)
  // the emoji sits on a ship's first square only — one badge per ship, not ten
  const badge = new Map<number, string>()
  for (const id of new Set(ships.filter(Boolean))) {
    const at = ships.indexOf(id)
    if (at >= 0) badge.set(at, shipById(id)?.emoji ?? '⛵')
  }
  // A card you buried is yours to see. On the enemy's board only a card that
  // has already gone off is drawn — one that is still waiting stays invisible.
  const buried = new Map<number, SeaTrap>()
  for (const t of traps) {
    if (mode === 'target' && !t.sprung && !reveal) continue
    buried.set(t.at, t)
  }

  const cells: ReactNode[] = []
  for (let i = 0; i < CELLS; i++) {
    const shipId = ships[i]
    const shot = shots[i]
    const sunk = Boolean(shipId) && down.has(shipId)
    // A ship is drawn on your own boards always, and on the enemy's board only
    // once it is a wreck (or once the game is over and nothing is secret) — or
    // for the two seconds a card sold it out.
    const showShip = Boolean(shipId) && (mode !== 'target' || sunk || reveal || spySet.has(i))
    const art = showShip ? (cards[i] ?? '') : ''
    const trap = buried.get(i)
    const trapCard = trap ? seaCardById(trap.card) : undefined

    const classes = ['sea-cell']
    if (showShip) classes.push('sea-cell--ship')
    if (art) classes.push('sea-cell--art')
    if (sunk && (mode !== 'target' || showShip)) classes.push('sea-cell--sunk')
    if (shot === 'x') classes.push('sea-cell--hit')
    if (shot === 'o') classes.push('sea-cell--miss')
    if (i === last) classes.push('is-last')
    if (i === aim) classes.push('is-aim')
    if (hintSet.has(i)) classes.push('is-hint')
    if (focusSet.has(i)) classes.push('is-focus')
    if (spySet.has(i)) classes.push('is-spied')
    if (trap && !trap.sprung) classes.push('is-buried')

    cells.push(
      <button
        key={i}
        type="button"
        className={classes.join(' ')}
        disabled={disabled || !onTap}
        aria-label={cellName(i)}
        onClick={() => onTap?.(i)}
      >
        {art && <img className="sea-art" src={stickerUrl(art)} alt="" draggable={false} />}
        {shot === 'x' ? (
          <span className="sea-mark">{sunk ? '🔥' : '💥'}</span>
        ) : shot === 'o' ? (
          <span className="sea-miss" aria-hidden />
        ) : showShip && !art && badge.has(i) ? (
          <span className="sea-mark sea-mark--ship">{badge.get(i)}</span>
        ) : null}
        {trapCard && (
          <span className={`sea-buried${trap!.sprung ? ' is-sprung' : ''}`} aria-hidden>
            {trapCard.emoji}
          </span>
        )}
        {bury && !trap && <span className="sea-bury-ghost" aria-hidden />}
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
      {overlay && overlayAt !== null && (
        <div
          className="sea-overlay"
          // +2 because the grid's first column and row are the A–J / 1–10 axis
          style={{ gridColumn: (overlayAt % SIZE) + 2, gridRow: Math.floor(overlayAt / SIZE) + 2 }}
        >
          {overlay}
        </div>
      )}
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
