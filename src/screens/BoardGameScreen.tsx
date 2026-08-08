// One screen, both board games. Chess and Checkers differ only in their rules
// (logic/chess.ts, logic/checkers.ts), which meet behind a `GameKit` — so the
// lobby, the challenge flow, the coaching highlights, the sounds and the record
// are written once here and neither game gets the better version by accident.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID, KID_ID } from '../store/storage'
import {
  BOARD_REWARD,
  kitFor,
  lessonsFor,
  squareName,
  type BoardKind,
  type BoardMove,
  type BoardState,
  type Color,
  type GameKit,
} from '../logic/boardGames'
import { GameBoard, type BoardTarget } from '../components/GameBoard'
import { BerryCoin } from '../components/BerryCoin'
import { boardSfx, sfx } from '../audio'

/** Which finished boards this device has already read. Per-device on purpose. */
const seenKey = (viewer: string | null, id: string) => `wop-board-seen:${viewer ?? 'guest'}:${id}`
const boardSeen = (viewer: string | null, id: string) => Boolean(localStorage.getItem(seenKey(viewer, id)))
const markSeen = (viewer: string | null, id: string) => localStorage.setItem(seenKey(viewer, id), '1')

const CREW: Record<Color, { name: string; emoji: string }> = {
  w: { name: 'Straw Hats', emoji: '👒' },
  b: { name: 'Marines', emoji: '⚓' },
}

export function BoardGameScreen({ kind, tab }: { kind: BoardKind; tab: string }) {
  const kit = kitFor(kind)
  return (
    <div className="screen">
      <div className="h1">
        {kit.icon} {kit.title}
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>{kit.blurb}</p>
      {tab === 'play' && <PlayTab kit={kit} />}
      {tab === 'pieces' && <PiecesTab kit={kit} />}
      {tab === 'rules' && <RulesTab kit={kit} />}
    </div>
  )
}

// --- play -------------------------------------------------------------------

function PlayTab({ kit }: { kit: GameKit }) {
  const {
    data, boardGames, activeProfileId, profiles,
    challengeBoardGame, answerBoardChallenge, playBoardMove, resignBoardGame, cancelBoardGame, setBoardHints,
  } = useStore()

  const [local, setLocal] = useState<BoardState | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [inspect, setInspect] = useState<number | null>(null)
  const [promo, setPromo] = useState<BoardMove | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [flipped, setFlipped] = useState(false)

  const hints = data.games.hints
  const mateId = activeProfileId === PARENT_ID ? KID_ID : PARENT_ID
  const mateName = profiles.find((p) => p.id === mateId)?.name ?? 'your crewmate'

  const mine = boardGames.filter((m) => m.kind === kit.kind && (m.fromId === activeProfileId || m.toId === activeProfileId))
  // a finished board stays up until it's been read — the winning move is the one
  // moment you actually want to look at the board
  const match = mine.find(
    (m) =>
      m.state &&
      (m.status === 'active' ||
        (m.status === 'finished' && !dismissed.includes(m.id) && !boardSeen(activeProfileId, m.id))),
  )
  const incoming = boardGames.find((m) => m.kind === kit.kind && m.status === 'pending' && m.toId === activeProfileId)
  const outgoing = boardGames.find((m) => m.kind === kit.kind && m.status === 'pending' && m.fromId === activeProfileId)
  const recent = mine.filter((m) => m.status === 'finished').slice(-3).reverse()

  // the live position: an online board wins over a pass-and-play one
  const state: BoardState | null = match?.state ?? local
  const online = !!match
  const mySide: Color | null = match ? (match.fromId === activeProfileId ? 'w' : 'b') : state ? state.turn : null
  const myTurn = !!state && !state.over && (!online || state.turn === mySide)

  // pass-and-play shows the board from the side about to move, so nobody plays
  // upside down; online always shows your own crew at the bottom
  const view: Color = online ? (mySide ?? 'w') : flipped ? (state?.turn === 'w' ? 'b' : 'w') : (state?.turn ?? 'w')

  useBoardSounds(kit, state, mySide, online)

  // Every new position clears any half-finished selection, so a stale highlight
  // can never be tapped into a move. The one exception is a checkers multi-jump:
  // the piece mid-chain is the ONLY piece allowed to move next, so it stays
  // picked up — including when the chain arrives from the other phone.
  useEffect(() => {
    setPromo(null)
    setSelected(state && state.kind === 'checkers' && state.chain !== null ? state.chain : null)
  }, [state?.seq]) // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = (c: Color) => {
    if (!online) return `${CREW[c].emoji} ${CREW[c].name}`
    const who = c === 'w' ? match!.fromName : match!.toName
    return `${CREW[c].emoji} ${who}`
  }

  const targets: BoardTarget[] = useMemo(() => {
    if (!state || selected === null || !myTurn) return []
    const seen = new Map<number, BoardTarget>()
    for (const m of kit.legalMoves(state, selected)) {
      if (seen.has(m.to)) continue // the four promotion moves share one square
      seen.set(m.to, { to: m.to, capture: kit.isCapture(state, m), risky: kit.risky(state, m) })
    }
    return [...seen.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.seq, selected, myTurn])

  const danger = useMemo(
    () => (state && hints && myTurn ? kit.threatened(state, state.turn) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.seq, hints, myTurn],
  )
  const movable = useMemo(
    () => (state && myTurn ? kit.movable(state) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.seq, myTurn],
  )
  const checkSquare = useMemo(() => {
    if (!state || state.kind !== 'chess' || !state.check) return null
    const k = state.squares.indexOf(`${state.turn}K`)
    return k >= 0 ? k : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.seq])

  function play(move: BoardMove) {
    if (!state) return
    if (kit.needsPromo(state, move)) {
      setPromo(move)
      return
    }
    commit(move)
  }

  function commit(move: BoardMove) {
    if (!state) return
    if (online) {
      playBoardMove(match!.id, move)
    } else {
      const next = kit.apply(state, move)
      if (!next) {
        boardSfx.nope()
        return
      }
      setLocal(next) // the seq effect re-picks the piece if a jump chain is still running
    }
    setInspect(move.to)
  }

  function tap(i: number) {
    if (!state) return
    if (selected !== null && targets.some((t) => t.to === i)) {
      play({ from: selected, to: i })
      return
    }
    const cell = kit.cell(state, i)
    setInspect(cell ? i : null)
    if (!cell) {
      setSelected(null)
      boardSfx.drop()
      return
    }
    if (myTurn && cell.color === state.turn && kit.legalMoves(state, i).length > 0) {
      setSelected(i)
      boardSfx.pick()
    } else {
      // still worth a tap: the sheet below the board says what the piece is
      setSelected(null)
      boardSfx.drop()
    }
  }

  // --- no board yet: the lobby ---
  if (!state) {
    return (
      <>
        {msg && <div className="card" style={{ marginBottom: 10 }}>{msg}</div>}

        {incoming && (
          <div className="card" style={{ marginBottom: 10, borderColor: 'var(--red)' }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>
              {incoming.fromEmoji} {incoming.fromName} challenges you to {kit.title}!
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              They play {CREW.w.emoji} {CREW.w.name} and move first. Winner takes {BOARD_REWARD} Berries.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--small" onClick={() => { sfx.click(); answerBoardChallenge(incoming.id, true) }}>
                ✓ Accept
              </button>
              <button className="btn btn--small btn--ghost" onClick={() => { sfx.click(); answerBoardChallenge(incoming.id, false) }}>
                Decline
              </button>
            </div>
          </div>
        )}

        {outgoing && (
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>⏳ Waiting for {outgoing.toName}…</div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              They’ll get a ping. You play {CREW.w.emoji} {CREW.w.name} and move first.
            </p>
            <button className="btn btn--small btn--ghost" onClick={() => { sfx.click(); cancelBoardGame(outgoing.id) }}>
              Take it back
            </button>
          </div>
        )}

        {!incoming && !outgoing && (
          <button
            className="btn"
            style={{ marginBottom: 10 }}
            onClick={() => {
              sfx.click()
              const r = challengeBoardGame(kit.kind)
              setMsg(r === 'ok' ? `Challenge sent to ${mateName}! 📞` : 'There’s already a game on the board.')
            }}
          >
            ⚔️ Challenge {mateName}
          </button>
        )}

        <button
          className="btn btn--blue"
          onClick={() => {
            sfx.click()
            setLocal(kit.create())
            setSelected(null)
            setMsg(null)
          }}
        >
          👥 Pass &amp; play on this phone
        </button>

        <Record kit={kit} />

        {recent.length > 0 && (
          <>
            <div className="h2" style={{ marginTop: 16 }}>Last games</div>
            {recent.map((m) => (
              <div className="card" key={m.id} style={{ marginTop: 8, padding: '10px 12px' }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>
                  {m.draw ? '🤝 Draw' : m.winnerId === activeProfileId ? '🏆 You won' : `😤 ${m.winnerId === m.fromId ? m.fromName : m.toName} won`}
                  {' '}vs {m.fromId === activeProfileId ? m.toName : m.fromName}
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {m.state ? `${m.state.log.length} moves` : ''} · {(m.resolvedAt ?? m.createdAt).slice(0, 10)}
                </div>
              </div>
            ))}
          </>
        )}
      </>
    )
  }

  // --- a live board ---
  const inspected = inspect !== null ? kit.cell(state, inspect) : null
  const lesson = inspected
    ? lessonsFor(kit.kind, inspected.color).find((l) => l.name === inspected.name)
    : undefined
  const log = kit.log(state)

  return (
    <>
      <div className="board-status">
        <div className={`board-status-line${state.over ? ' is-over' : state.kind === 'chess' && state.check ? ' is-check' : ''}`}>
          {state.over
            ? kit.status(state, nameOf)
            : online
              ? myTurn
                ? `Your move — you’re ${nameOf(mySide!)}`
                : `Waiting for ${state.turn === 'w' ? match!.fromName : match!.toName}…`
              : kit.status(state, nameOf)}
        </div>
        {!state.over && (
          <div className="muted" style={{ fontSize: 11 }}>
            {kit.kind === 'checkers' && state.kind === 'checkers' && state.mustJump
              ? '⚠️ A jump is on the board — capturing is compulsory.'
              : kit.score(state, online ? mySide! : state.turn)}
          </div>
        )}
      </div>

      <GameBoard
        kit={kit}
        state={state}
        view={view}
        selected={selected}
        targets={targets}
        danger={danger}
        movable={movable}
        checkSquare={checkSquare}
        hints={hints}
        labels={hints}
        disabled={!myTurn}
        onTap={tap}
      />

      <div className="board-tools">
        <button
          className={`chip${hints ? ' chip--on' : ''}`}
          onClick={() => { sfx.click(); setBoardHints(!hints) }}
        >
          🧑‍🏫 Helper {hints ? 'on' : 'off'}
        </button>
        {!online && !state.over && (
          <button className="chip" onClick={() => { sfx.click(); setFlipped((f) => !f) }}>
            🔄 Flip board
          </button>
        )}
        {online && !state.over && (
          <button
            className="chip"
            onClick={() => {
              if (!confirm('Resign this game? The other captain takes the win.')) return
              sfx.click()
              resignBoardGame(match!.id)
            }}
          >
            🏳️ Resign
          </button>
        )}
        {!online && (
          <button className="chip" onClick={() => { sfx.click(); setLocal(null); setSelected(null); setInspect(null) }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* Tapping any piece answers "what IS this?" — it never costs a move. */}
      {inspected && lesson && (
        <div className="card piece-sheet">
          <span className={`pc pc--${inspected.color} pc--${kit.kind}${inspected.king ? ' pc--king' : ''}`} aria-hidden>
            <span className="pc-glyph">{inspected.glyph}</span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>
              {inspected.name}
              {inspect !== null && <span className="muted" style={{ fontWeight: 700 }}> on {squareName(inspect)}</span>}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{lesson.who}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{lesson.moves}</div>
          </div>
        </div>
      )}

      {state.over && (
        <div className="card" style={{ marginTop: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>
            {state.winner === null ? '🤝' : online ? (state.winner === mySide ? '🏆' : '😤') : '🏆'}
          </div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{kit.status(state, nameOf)}</div>
          {online && state.winner === mySide && (
            <div
              className="muted"
              style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center' }}
            >
              <BerryCoin size={13} /> +{BOARD_REWARD} Berries
            </div>
          )}
          <button
            className="btn btn--small"
            style={{ marginTop: 10 }}
            onClick={() => {
              sfx.click()
              if (online) {
                markSeen(activeProfileId, match!.id)
                setDismissed((d) => [...d, match!.id])
              } else {
                setLocal(null)
              }
              setSelected(null)
              setInspect(null)
            }}
          >
            Done
          </button>
        </div>
      )}

      {log.length > 0 && (
        <div className="board-log">
          {log.slice(-4).map((l, i) => (
            <div key={log.length - 4 + i} className={`board-log-line board-log-line--${l.by}`}>
              {l.text}
            </div>
          ))}
        </div>
      )}

      {promo && <PromoPicker color={state.turn} onPick={(p) => { setPromo(null); commit({ ...promo, promo: p }) }} />}
    </>
  )
}

/** A pawn reaching the far rank: what does it become? Queen is the default for a reason. */
function PromoPicker({ color, onPick }: { color: Color; onPick: (p: 'Q' | 'R' | 'B' | 'N') => void }) {
  const glyphs: Record<string, string> =
    color === 'w' ? { Q: '♕', R: '♖', B: '♗', N: '♘' } : { Q: '♛', R: '♜', B: '♝', N: '♞' }
  const names: Record<string, string> = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }
  return (
    <div className="overlay overlay--center">
      <div className="sheet" style={{ padding: 18 }}>
        <div className="h2" style={{ textAlign: 'center', margin: '0 0 4px' }}>👑 Your Pawn made it across!</div>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
          It becomes any piece you like. Almost everyone picks the Queen.
        </p>
        <div className="promo-row">
          {(['Q', 'R', 'B', 'N'] as const).map((p) => (
            <button key={p} className="promo-pick" onClick={() => { sfx.click(); onPick(p) }}>
              <span className={`pc pc--${color} pc--chess`}><span className="pc-glyph">{glyphs[p]}</span></span>
              <span>{names[p]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Record({ kit }: { kit: GameKit }) {
  const { data } = useStore()
  const r = data.games[kit.kind]
  const played = r.wins + r.losses + r.draws
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>🏅 Your record</div>
      <div className="board-record">
        <div><span className="board-record-num" style={{ color: 'var(--green)' }}>{r.wins}</span><span className="muted">won</span></div>
        <div><span className="board-record-num" style={{ color: 'var(--red)' }}>{r.losses}</span><span className="muted">lost</span></div>
        <div><span className="board-record-num" style={{ color: 'var(--muted)' }}>{r.draws}</span><span className="muted">drawn</span></div>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
        {played === 0 ? 'No games yet — send a challenge.' : `${played} game${played === 1 ? '' : 's'} · winner takes ${BOARD_REWARD} 🪙`}
      </div>
    </div>
  )
}

// --- pieces -----------------------------------------------------------------

function PiecesTab({ kit }: { kit: GameKit }) {
  const straw = lessonsFor(kit.kind, 'w')
  const marine = lessonsFor(kit.kind, 'b')
  return (
    <>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        The names are the <strong>real</strong> ones — that’s the point. Who they are in One Piece rides along beside.
      </p>
      {straw.map((p, i) => (
        <div className="card piece-sheet" key={p.name} style={{ marginBottom: 8 }}>
          <span className={`pc pc--w pc--${kit.kind}${p.name === 'King' ? ' pc--king' : ''}`} aria-hidden>
            <span className="pc-glyph">{p.glyph}</span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>
              {p.name}
              {p.value ? <span className="muted" style={{ fontWeight: 700, fontSize: 12 }}> · worth {p.value}</span> : null}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {p.who} — vs {marine[i].who}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{p.moves}</div>
          </div>
        </div>
      ))}
    </>
  )
}

// --- how to -----------------------------------------------------------------

function RulesTab({ kit }: { kit: GameKit }) {
  return kit.kind === 'chess' ? <ChessRules /> : <CheckersRules />
}

function ChessRules() {
  return (
    <div className="rules">
      <h3>How you win</h3>
      <p>Trap the enemy King so it can’t escape being captured. That’s <strong>checkmate</strong>, and the game ends there.</p>
      <h3>Check</h3>
      <p>When your King is attacked you are <strong>in check</strong> and you MUST get out of it — move him, block the attack, or capture the attacker. If you can’t, it’s checkmate.</p>
      <h3>The three special moves</h3>
      <ul>
        <li><strong>Castling</strong> — once per game, if neither the King nor that Rook has moved and the squares between them are empty, the King jumps two squares toward the Rook and the Rook hops over him. You can’t castle out of, through, or into check.</li>
        <li><strong>En passant</strong> — if an enemy Pawn uses its two-square first move to slip past your Pawn, you may capture it as if it had only moved one. Only on the very next move.</li>
        <li><strong>Promotion</strong> — a Pawn reaching the far row becomes any piece you choose. Take the Queen.</li>
      </ul>
      <h3>Draws — nobody wins</h3>
      <ul>
        <li><strong>Stalemate</strong> — you have no legal move but you’re NOT in check.</li>
        <li><strong>Fifty moves</strong> with no capture and no Pawn move.</li>
        <li><strong>The same position three times.</strong></li>
        <li><strong>Not enough pieces</strong> left for anyone to checkmate.</li>
      </ul>
      <h3>The helper</h3>
      <p>🧑‍🏫 <strong>Helper on</strong> marks every square your piece may go to (a dot to move, a ring to capture), rings your pieces the other side is attacking, puts ⚠️ on a square where your piece could be taken next move, and prints each piece’s letter. Tapping any piece — yours or theirs — tells you what it is and how it moves, and never costs you a turn.</p>
    </div>
  )
}

function CheckersRules() {
  return (
    <div className="rules">
      <h3>How you win</h3>
      <p>Capture every enemy piece — or leave them with no legal move at all. Being blocked loses just as surely as being captured.</p>
      <h3>Moving</h3>
      <ul>
        <li>Only the <strong>dark squares</strong> are ever used.</li>
        <li>A <strong>Man</strong> moves one square diagonally <em>forward</em> — but can <strong>capture in any of the four diagonal directions</strong>, backwards included.</li>
        <li>Jump an enemy piece by hopping over it to the empty square straight behind it. The jumped piece is captured.</li>
      </ul>
      <h3>Jumping is compulsory — and the biggest jump wins</h3>
      <p>If a jump exists anywhere on the board, you <strong>must</strong> jump — a quiet move isn’t legal. This is Brazilian Draughts, so it's not just any jump: only the sequence that captures the <strong>most pieces</strong> is legal. If one piece can take 3 and another can only take 1, you must play the 3. And if the piece you just landed with can jump again, it <strong>must keep going</strong>: one turn, many captures.</p>
      <h3>Getting crowned</h3>
      <p>A Man reaching the far row is <strong>crowned a King</strong> 👑 — it <strong>flies</strong>: any distance along an empty diagonal, in any direction, and after capturing it can land on any empty square past the piece it took. Crowning <strong>ends your turn</strong> right there, even if more jumps were available.</p>
      <h3>Draws</h3>
      <p>Forty moves each with nothing captured is a draw.</p>
      <h3>The helper</h3>
      <p>🧑‍🏫 <strong>Helper on</strong> marks every square the piece you tapped may go to, rings your pieces that can be jumped next turn, and puts ⚠️ on a landing square that hands the other side a jump. Tapping a piece never costs you a turn.</p>
    </div>
  )
}

// --- plumbing ---------------------------------------------------------------

/**
 * Every position change gets its sound, whether it was played on this phone or
 * arrived from the other one — so a move landing while you're looking at the
 * board is never silent. The sound is read off the move's own log line rather
 * than off the move object, which is what makes the online case work at all:
 * the receiving device never sees the move, only the position that followed it.
 */
function useBoardSounds(kit: GameKit, state: BoardState | null, mySide: Color | null, online: boolean) {
  const lastSeq = useRef<number | null>(null)
  const announced = useRef<string | null>(null)
  useEffect(() => {
    if (!state) {
      lastSeq.current = null
      announced.current = null
      return
    }
    const first = lastSeq.current === null
    const moved = !first && state.seq !== lastSeq.current
    lastSeq.current = state.seq

    if (moved) {
      const text = kit.log(state).at(-1)?.text ?? ''
      if (/Crowned/.test(text)) boardSfx.crown()
      else if (/becomes a/.test(text)) boardSfx.promote()
      else if (/castles/.test(text)) boardSfx.castle()
      else if (/takes the|jumps the/.test(text)) boardSfx.capture()
      else if (/Resigned/.test(text)) boardSfx.nope()
      else boardSfx.move()
      if (/ Check!/.test(text)) window.setTimeout(() => boardSfx.check(), 180)
    }

    // the result fanfare fires once per finished board, even on a cold open
    if (state.over && announced.current !== `${state.seq}`) {
      announced.current = `${state.seq}`
      const delay = moved ? 400 : 0
      window.setTimeout(() => {
        if (state.winner === null) boardSfx.draw()
        else if (!online || state.winner === mySide) boardSfx.win()
        else boardSfx.lose()
      }, delay)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.seq, state?.over])
}
