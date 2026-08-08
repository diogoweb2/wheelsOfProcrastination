import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import {
  KOS_TO_WIN,
  MAX_ENERGY,
  activeCard,
  benchCards,
  canAttack,
  canPlayTreasure,
  canRollDice,
  canSwap,
  previewDamage,
  retreatCost,
  statsFor,
  stormActive,
  turnsToStorm,
  type DuelLogEntry,
  type DuelMove,
  type DuelState,
} from '../logic/cardGame'
import { DICE_FACES, treasureById } from '../logic/treasures'
import { BattleCard, BoardCard } from './BattleCard'
import { duelSfx, sfx } from '../audio'

/** How long a blow is animated for. The action bar is locked for exactly this long. */
const FX_MS = 1100
/** A treasure reveal holds longer — there's text to read on it. */
const TREASURE_FX_MS = 1700

interface Fx extends DuelLogEntry {
  /** Which side (index) threw it — drives which card lunges and which one flinches. */
  side: number
}

/**
 * Watch the board for a new move and turn it into a burst of animation + sound.
 *
 * Driven by the log's length AND the turn counter, because treasures and dice
 * rolls are free plays that don't advance the turn. That also means it works
 * identically for a move I made and one that arrived from the other phone
 * through Firestore — the arena cannot tell the difference, and shouldn't.
 */
function useDuelFx(state: DuelState): Fx | null {
  const [fx, setFx] = useState<Fx | null>(null)
  const seen = useRef<string>('')

  const log = state.log.filter((e) => !e.final)
  const last = log[log.length - 1]
  // the log is trimmed, so pair it with the turn count to get a stable identity
  const stamp = last ? `${state.turnNo}:${state.log.length}:${last.text}` : ''

  useEffect(() => {
    if (!last || stamp === seen.current) return
    const first = seen.current === ''
    seen.current = stamp
    if (first) return // arriving mid-match shouldn't replay the last blow

    const side = state.sides.findIndex((s) => s.profileId === last.by)
    setFx({ ...last, side })

    if (last.treasureId) {
      duelSfx.treasure(treasureById(last.treasureId)?.rarity ?? 'common')
    } else if (last.diceFace !== undefined) {
      duelSfx.dice()
    } else if (last.damage && last.cardId) {
      // The attacking card picks the sound: its own voice on a finisher, its
      // element on a quick attack. A card with no curated voice still sounds
      // like itself — a Blade card rings steel, a Storm card cracks thunder.
      const card = statsFor(last.cardId)
      if (last.attackIndex === 0) duelSfx.attack(card.element)
      else duelSfx.special(card.element, card.voice)
    } else {
      sfx.click()
    }
    if (last.effect === 'stun') window.setTimeout(() => duelSfx.haki(), 260)
    if (last.ko) window.setTimeout(() => duelSfx.ko(), 320)

    const t = window.setTimeout(
      () => setFx(null),
      last.treasureId || last.diceFace !== undefined ? TREASURE_FX_MS : FX_MS,
    )
    return () => window.clearTimeout(t)
  }, [stamp]) // eslint-disable-line react-hooks/exhaustive-deps

  return fx
}

/** A short gold burst when the match is won. */
function winBurst() {
  for (const delay of [0, 220, 460]) {
    window.setTimeout(() => {
      void confetti({
        particleCount: 80,
        spread: 90,
        startVelocity: 55,
        origin: { y: 0.6 },
        colors: ['#ffce00', '#d70000', '#fff', '#60bff5'],
        scalar: 1.15,
      })
    }, delay)
  }
}

/**
 * The board. Purely presentational: it renders a `DuelState`, and every action
 * goes back out through `onMove`. It never decides anything itself, which is why
 * the same component drives a solo match against the AI and a live one against
 * the other phone.
 */
export function DuelArena({
  state,
  myIndex,
  onMove,
  waitingFor,
  onResign,
  onExit,
}: {
  state: DuelState
  myIndex: number
  onMove: (move: DuelMove) => void
  /** Name of whoever we're waiting on, when it isn't my move. */
  waitingFor?: string | null
  onResign?: () => void
  onExit: () => void
}) {
  const fx = useDuelFx(state)
  const [peek, setPeek] = useState<string | null>(null)
  const [picked, setPicked] = useState<number | null>(null) // treasure being considered
  const me = state.sides[myIndex]
  const them = state.sides[1 - myIndex]
  const myTurn = state.turn === myIndex && !state.over
  // no input while a blow is still playing out — a double tap can't steal a turn
  const locked = Boolean(fx) || !myTurn

  const iWon = state.over && state.winnerId === me.profileId
  const storm = stormActive(state)
  const stormIn = turnsToStorm(state)

  /**
   * What to draw in a side's front-line slot. A knocked-out card is already off
   * the board, so while its fall is animating we put it back — otherwise the
   * card that stepped up would be the one seen spinning away.
   */
  const frontLine = (side: number) => {
    const live = activeCard(state.sides[side])
    if (fx?.ko && fx.koId && fx.side !== side) {
      return { id: fx.koId, hp: 0, max: statsFor(fx.koId).hp }
    }
    return live
  }
  const myActive = frontLine(myIndex)
  const theirActive = frontLine(1 - myIndex)
  // the action bar always follows the REAL front line, never the falling ghost
  const myLive = activeCard(me)

  useEffect(() => {
    if (!state.over) return
    if (iWon) {
      winBurst()
      duelSfx.win()
    } else {
      duelSfx.lose()
    }
  }, [state.over]) // eslint-disable-line react-hooks/exhaustive-deps

  // a card taken out of the hand shifts the indices, so the panel must close
  useEffect(() => setPicked(null), [me.hand.length, state.turn])

  const play = (move: DuelMove) => {
    if (locked) return
    setPicked(null)
    onMove(move)
  }

  /** Presentation state for one side's front-line card. */
  const cardState = (side: number): 'striking' | 'hurt' | 'ko' | 'stunned' | undefined => {
    if (fx && fx.damage) {
      if (fx.side === side && fx.cardId) return 'striking'
      return fx.ko ? 'ko' : 'hurt'
    }
    if (state.sides[side].stunned) return 'stunned'
    return undefined
  }

  const canTreasure = myTurn && !locked && canPlayTreasure(state, myIndex)
  const diceReady = myTurn && !locked && canRollDice(state, myIndex)

  return (
    <div className="arena">
      {peek && (
        <div className="arena-peek" onClick={() => setPeek(null)}>
          <BattleCard id={peek} size="full" />
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>tap anywhere to close</p>
        </div>
      )}

      {fx?.treasureId && <TreasurePop id={fx.treasureId} mine={fx.side === myIndex} />}
      {fx?.diceFace !== undefined && fx?.diceFace !== null && <DicePop face={fx.diceFace} />}

      <SideBar side={them} flip hideHand />

      <div className={`arena-row is-them ${fx?.side === 1 - myIndex ? 'is-acting' : ''}`}>
        <div className="arena-bench">
          {benchCards(them).map((c) => (
            <BoardCard key={c.id} card={c} size="bench" onClick={() => setPeek(c.id)} />
          ))}
        </div>
        {theirActive ? (
          <div className="arena-active">
            {/* keyed by card id so a knockout always remounts and replays its fall */}
            <BoardCard key={theirActive.id} card={theirActive} state={cardState(1 - myIndex)} onClick={() => setPeek(theirActive.id)} />
            {fx && fx.side === myIndex && fx.damage ? <DamagePop fx={fx} /> : null}
          </div>
        ) : (
          <div className="arena-empty">no cards left</div>
        )}
      </div>

      <div className="arena-mid">
        <span className={`arena-turn ${myTurn ? 'is-mine' : ''}`}>
          {state.over
            ? iWon
              ? '🏆 You win!'
              : state.winnerId
                ? '☠️ Defeated'
                : '⚖️ Dead heat'
            : myTurn
              ? 'YOUR MOVE'
              : `${waitingFor ?? them.name} is thinking…`}
        </span>
        {!state.over &&
          (storm ? (
            <span className="arena-storm is-on">⛈️ STORM — every hit is DOUBLE</span>
          ) : stormIn <= 6 ? (
            <span className="arena-storm">⛈️ storm in {stormIn}</span>
          ) : null)}
      </div>

      <div className={`arena-row is-me ${fx?.side === myIndex ? 'is-acting' : ''}`}>
        {myActive ? (
          <div className="arena-active">
            <BoardCard key={myActive.id} card={myActive} state={cardState(myIndex)} onClick={() => setPeek(myActive.id)} />
            {fx && fx.side === 1 - myIndex && fx.damage ? <DamagePop fx={fx} /> : null}
          </div>
        ) : (
          <div className="arena-empty">no cards left</div>
        )}
        {/* The bench IS the swap control — tapping a card sends it to the front.
            The chip stays a thin strip along the bottom edge so the art it's
            advertising is still visible underneath it. */}
        <div className="arena-bench">
          {benchCards(me).map((c, i) => {
            const slot = i + 1
            const cost = retreatCost(me)
            const able = myTurn && !locked && canSwap(state, myIndex, slot)
            return (
              <BoardCard
                key={c.id}
                card={c}
                size="bench"
                onClick={() => (able ? play({ kind: 'swap', to: slot }) : setPeek(c.id))}
                footer={
                  myTurn ? (
                    <span className={`arena-swap ${able ? 'is-ready' : 'is-off'}`}>
                      {able ? (cost === 0 ? 'SEND FREE' : `SEND ${'⚡'.repeat(cost)}`) : `${'⚡'.repeat(cost)}`}
                    </span>
                  ) : undefined
                }
              />
            )
          })}
        </div>
      </div>

      <SideBar side={me} />

      {state.over ? (
        <div className="arena-actions">
          <button className="btn" style={{ width: '100%' }} onClick={() => { sfx.click(); onExit() }}>
            {iWon ? '🏴‍☠️ Claim it →' : 'Back to the docks →'}
          </button>
        </div>
      ) : (
        <div className="arena-actions">
          {myLive &&
            statsFor(myLive.id).attacks.map((a, i) => {
              const { damage, weak } = previewDamage(state, myIndex, i)
              const able = myTurn && canAttack(state, myIndex, i)
              return (
                <button
                  key={i}
                  className={`atk ${weak ? 'is-weak' : ''} ${a.cost > 1 ? 'atk--big' : ''}`}
                  disabled={!able || locked}
                  onClick={() => play({ kind: 'attack', attack: i })}
                >
                  <span className="atk-cost">{'⚡'.repeat(a.cost)}</span>
                  <span className="atk-name">
                    {a.name}
                    {a.text && <em>{a.text}</em>}
                  </span>
                  <span className="atk-dmg">
                    {damage}
                    {weak && <b> ×2</b>}
                  </span>
                </button>
              )
            })}
          <div className="arena-minor">
            <button className="btn btn--ghost btn--small" disabled={!myTurn || locked} onClick={() => play({ kind: 'focus' })}>
              🧘 Focus (+⚡, heal 10)
            </button>
            {onResign && (
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.sad(); onResign() }}>
                🏳️ Give up
              </button>
            )}
          </div>
          {me.stunned && (
            <p className="arena-warn">💫 Stunned — no attacking this turn. Send out a bench card, or focus.</p>
          )}
          {myTurn && benchCards(me).length > 0 && (
            <p className="arena-hint">
              🔄 Tap a bench card to send it to the front
              {me.energy < retreatCost(me) ? ` — needs ${'⚡'.repeat(retreatCost(me))}` : ''}
            </p>
          )}

          {/* The last stand. Free, once a match, and no face on the dice is bad. */}
          {diceReady && (
            <button className="dice-btn" onClick={() => play({ kind: 'dice' })}>
              <span className="dice-btn-die">🎲</span>
              <span>
                <b>LAST STAND — roll the dice!</b>
                <em>One knockout from losing. Free roll, once a match.</em>
              </span>
            </button>
          )}

          <Hand
            hand={me.hand}
            enabled={canTreasure}
            picked={picked}
            onPick={(i) => { sfx.click(); setPicked(picked === i ? null : i) }}
            onPlay={(i) => play({ kind: 'treasure', index: i })}
            theirCount={them.hand.length}
            theirName={them.name}
            playedThisTurn={me.playedTreasure}
          />
        </div>
      )}

      <div className="arena-log">
        {state.log.slice(-3).map((e, i) => (
          <div key={`${state.turnNo}-${i}`} className={`arena-log-line ${e.final ? 'is-final' : ''}`}>
            {e.text}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Your treasure cards. Only ever YOUR hand — the opponent's is in the same
 * document but is never rendered, and all they see is how many you're holding.
 */
function Hand({
  hand,
  enabled,
  picked,
  onPick,
  onPlay,
  theirCount,
  theirName,
  playedThisTurn,
}: {
  hand: string[]
  enabled: boolean
  picked: number | null
  onPick: (i: number) => void
  onPlay: (i: number) => void
  theirCount: number
  theirName: string
  playedThisTurn: boolean
}) {
  const chosen = picked !== null ? treasureById(hand[picked]) : undefined

  return (
    <div className="hand">
      <div className="hand-head">
        <span>💎 Your treasure ({hand.length})</span>
        <span className="hand-their">
          {theirName}: {theirCount} 🂠
        </span>
      </div>

      {hand.length === 0 ? (
        <p className="hand-empty">No treasure left — win it the honest way.</p>
      ) : (
        <div className="hand-row">
          {hand.map((id, i) => {
            const t = treasureById(id)
            if (!t) return null
            return (
              <button
                key={`${id}-${i}`}
                className={`tcard rarity-${t.rarity} ${picked === i ? 'is-picked' : ''} ${enabled ? '' : 'is-off'}`}
                onClick={() => onPick(i)}
              >
                <span className="tcard-rarity">{t.rarity === 'legendary' ? '★' : t.rarity.slice(0, 4)}</span>
                <span className="tcard-icon">{t.icon}</span>
                <span className="tcard-name">{t.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {chosen && (
        <div className={`hand-panel rarity-${chosen.rarity}`}>
          <div className="hand-panel-title">
            {chosen.icon} {chosen.name}
            <span className="hand-panel-rarity">{chosen.rarity}</span>
          </div>
          <p className="hand-panel-text">{chosen.text}</p>
          {enabled ? (
            <button className="btn btn--small" style={{ width: '100%' }} onClick={() => onPlay(picked!)}>
              ▶ Use it — it’s free!
            </button>
          ) : (
            <p className="hand-panel-note">
              {playedThisTurn ? 'One treasure a turn — save it for next turn.' : 'Wait for your move.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Full-screen flash when a treasure resolves — the payoff for the rarity. */
function TreasurePop({ id, mine }: { id: string; mine: boolean }) {
  const t = treasureById(id)
  if (!t) return null
  return (
    <div className={`tpop rarity-${t.rarity}`}>
      <div className="tpop-card">
        <span className="tpop-who">{mine ? 'YOU PLAYED' : 'THEY PLAYED'}</span>
        <span className="tpop-icon">{t.icon}</span>
        <span className="tpop-name">{t.name}</span>
        <span className="tpop-text">{t.text}</span>
        {t.rarity !== 'common' && (
          <span className="tpop-rarity">{t.rarity === 'legendary' ? '★ LEGENDARY ★' : t.rarity}</span>
        )}
      </div>
    </div>
  )
}

/** The dice tumbling to its face. */
function DicePop({ face }: { face: number }) {
  const f = DICE_FACES[face]
  if (!f) return null
  return (
    <div className="tpop rarity-epic">
      <div className="tpop-card">
        <span className="tpop-who">DAVY BACK DICE</span>
        <span className="tpop-icon dice-tumble">{f.pip}</span>
        <span className="tpop-name">{f.name}</span>
        <span className="tpop-text">{f.text}</span>
      </div>
    </div>
  )
}

/** The number that jumps off a card when it gets hit. */
function DamagePop({ fx }: { fx: Fx }) {
  return (
    <div className={`dmg-pop ${fx.weak ? 'is-weak' : ''} ${fx.ko ? 'is-ko' : ''}`}>
      <span className="dmg-pop-num">-{fx.damage}</span>
      {fx.weak && <span className="dmg-pop-tag">WEAKNESS ×2!</span>}
      {fx.ko && <span className="dmg-pop-tag">KNOCKED OUT!</span>}
      {fx.effect === 'stun' && <span className="dmg-pop-tag">STUNNED 💫</span>}
    </div>
  )
}

/** Name, knockout pips, energy and the live buffs for one captain. */
function SideBar({
  side,
  flip = false,
  hideHand = false,
}: {
  side: DuelState['sides'][number]
  flip?: boolean
  /** The opponent's cards are secret — show only how many they're holding. */
  hideHand?: boolean
}) {
  return (
    <div className={`arena-side ${flip ? 'is-them' : 'is-me'}`}>
      <span className="arena-who">
        {side.emoji} {side.name}
      </span>
      <span className="arena-kos" title={`${side.kos} of ${KOS_TO_WIN} knockouts`}>
        {Array.from({ length: KOS_TO_WIN }, (_, i) => (
          <i key={i} className={i < side.kos ? 'is-on' : ''} />
        ))}
      </span>
      <span className="arena-energy" title={`${side.energy} energy`}>
        {Array.from({ length: MAX_ENERGY }, (_, i) => (
          <b key={i} className={i < side.energy ? 'is-on' : ''}>
            ⚡
          </b>
        ))}
      </span>
      {hideHand && side.hand.length > 0 && <span className="arena-buff">🂠{side.hand.length}</span>}
      {side.boost > 0 && <span className="arena-buff is-good">+{side.boost}</span>}
      {side.multiplier > 1 && <span className="arena-buff is-good">×{side.multiplier}</span>}
      {side.shield > 0 && <span className="arena-buff is-good">🛡{side.shield}</span>}
      {side.survive && <span className="arena-buff is-good">🪨</span>}
      {side.reflect && <span className="arena-buff is-good">🪞</span>}
    </div>
  )
}
