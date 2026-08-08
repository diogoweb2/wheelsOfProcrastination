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
  cardName,
  damageFrom,
  elementInfo,
  previewDamage,
  weaknessOf,
  retreatCost,
  statsFor,
  stormActive,
  turnsToStorm,
  type DuelLogEntry,
  type DuelMove,
  type DuelState,
} from '../logic/cardGame'
import { DICE_FACES, treasureById } from '../logic/treasures'
import { stickerUrl } from '../logic/album'
import { BattleCard, BoardCard } from './BattleCard'
import { duelSfx, sfx } from '../audio'

/** How long a blow is animated for. The action bar is locked for exactly this long. */
const FX_MS = 1100
/** A treasure reveal holds much longer — there's a name and a rules line to read. */
const TREASURE_FX_MS = 2400

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
  // Seeded with the position we mounted at, so the very first move of a match
  // still animates while opening a match already in progress doesn't replay the
  // last blow that happened without us.
  const seen = useRef(state.seq ?? 0)

  const seq = state.seq ?? 0
  const log = state.log.filter((e) => !e.final)
  const last = log[log.length - 1]

  useEffect(() => {
    if (!last || seq === seen.current) return
    seen.current = seq

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
  }, [seq]) // eslint-disable-line react-hooks/exhaustive-deps

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
  /** Card id the crew sheet is open on, or '' for "open, no particular card". */
  const [crewOn, setCrewOn] = useState<string | null>(null)
  const openCrew = (id = '') => {
    sfx.click()
    setCrewOn(id)
  }
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

      {crewOn !== null && (
        <CrewSheet
          state={state}
          myIndex={myIndex}
          focusId={crewOn}
          onSwap={myTurn && !locked ? (to) => { setCrewOn(null); play({ kind: 'swap', to }) } : null}
          onPeek={(id) => setPeek(id)}
          onClose={() => setCrewOn(null)}
        />
      )}

      {fx?.treasureId && (
        <TreasurePop id={fx.treasureId} who={fx.side === myIndex ? 'You' : (state.sides[fx.side]?.name ?? 'They')} mine={fx.side === myIndex} />
      )}
      {fx?.diceFace !== undefined && fx?.diceFace !== null && (
        <DicePop face={fx.diceFace} who={fx.side === myIndex ? 'You' : (state.sides[fx.side]?.name ?? 'They')} />
      )}

      <SideBar side={them} flip hideHand />

      <div className={`arena-row is-them ${fx?.side === 1 - myIndex ? 'is-acting' : ''}`}>
        <div className="arena-bench">
          {benchCards(them).map((c) => (
            <BoardCard key={c.id} card={c} size="bench" onClick={() => openCrew(c.id)} />
          ))}
        </div>
        {theirActive ? (
          <div className="arena-active">
            {/* keyed by card id so a knockout always remounts and replays its fall */}
            <BoardCard key={theirActive.id} card={theirActive} state={cardState(1 - myIndex)} onClick={() => openCrew(theirActive.id)} />
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
            <BoardCard key={myActive.id} card={myActive} state={cardState(myIndex)} onClick={() => openCrew(myActive.id)} />
            {fx && fx.side === 1 - myIndex && fx.damage ? <DamagePop fx={fx} /> : null}
          </div>
        ) : (
          <div className="arena-empty">no cards left</div>
        )}
        {/* Tapping a card NEVER commits a move — it opens that card's details.
            Swapping is an explicit button inside the sheet, so a tap meant as
            "what does this one do?" can't cost you your turn. The strip just
            reports what a swap would cost. */}
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
                onClick={() => openCrew(c.id)}
                footer={
                  myTurn ? (
                    <span className={`arena-swap ${able ? 'is-ready' : 'is-off'}`}>
                      {cost === 0 ? 'SWAP FREE' : `SWAP ${'⚡'.repeat(cost)}`}
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
          <button className="crew-open" onClick={() => openCrew()}>
            🧭 <b>See every card</b>
            <em>Tap any card on the board too</em>
          </button>

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
 * The whole crew, laid out to answer one question: should I swap?
 *
 * A bench card on the board is 60px of thumbnail — you cannot read its HP, its
 * attacks, or whether its element beats what's in front of you off that. This
 * sheet shows every card's real numbers side by side, and crucially prints what
 * each attack would do **against the defender currently facing you**, so the
 * comparison is the one that actually matters rather than raw card stats.
 */
function CrewSheet({
  state,
  myIndex,
  focusId,
  onSwap,
  onPeek,
  onClose,
}: {
  state: DuelState
  myIndex: number
  /** The card that was tapped to get here — highlighted and scrolled to. '' = none. */
  focusId: string
  /** null when swapping isn't possible right now — the row says why instead. */
  onSwap: ((to: number) => void) | null
  /** Show the full card face (the art) for one card. */
  onPeek: (id: string) => void
  onClose: () => void
}) {
  const me = state.sides[myIndex]
  const them = state.sides[1 - myIndex]
  const facing = activeCard(them)
  const facingEl = facing ? elementInfo(statsFor(facing.id).element) : null
  const cost = retreatCost(me)
  const myTurn = state.turn === myIndex && !state.over

  // scroll the tapped card into view — the sheet lists eight cards and the one
  // you asked about is often below the fold
  const focusRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId])

  return (
    <div className="crew-sheet" onClick={onClose}>
      <div className="crew-panel" onClick={(e) => e.stopPropagation()}>
        <div className="crew-sheet-head">
          <span>🧭 Your crew</span>
          <button className="crew-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {facing && facingEl && (
          <div className="crew-facing">
            Facing <b>{cardName(facing.id)}</b> · {facing.hp}/{facing.max} HP · {facingEl.icon} {facingEl.name}
            <em>
              Weak to {elementInfo(weaknessOf(statsFor(facing.id).element)).icon}{' '}
              {elementInfo(weaknessOf(statsFor(facing.id).element)).name}
            </em>
          </div>
        )}

        {me.cards.map((c, i) => {
          const stats = statsFor(c.id)
          const el = elementInfo(stats.element)
          const weak = elementInfo(weaknessOf(stats.element))
          const pct = Math.max(0, Math.min(100, (c.hp / c.max) * 100))
          const health = pct > 55 ? 'is-good' : pct > 25 ? 'is-warn' : 'is-low'
          const able = i > 0 && myTurn && canSwap(state, myIndex, i)
          return (
            <div
              key={c.id}
              ref={c.id === focusId ? focusRef : undefined}
              className={`crew-card ${i === 0 ? 'is-front' : ''} ${c.id === focusId ? 'is-focus' : ''}`}
            >
              <button className="crew-art" onClick={() => onPeek(c.id)} title="See the full card">
                <img src={stickerUrl(c.id)} alt="" loading="lazy" />
              </button>
              <div className="crew-body">
                <div className="crew-name">
                  {cardName(c.id)}
                  <span className="crew-slot">{i === 0 ? 'FRONT LINE' : 'BENCH'}</span>
                </div>
                <div className="crew-hp">
                  <div className={`crew-hp-fill ${health}`} style={{ width: `${pct}%` }} />
                  <span>
                    {c.hp} / {c.max} HP
                  </span>
                </div>
                <div className="crew-tags">
                  <span>
                    {el.icon} {el.name}
                  </span>
                  <span>{stats.archetype}</span>
                  <span className="is-weak">weak {weak.icon}</span>
                </div>
                {stats.attacks.map((a, ai) => {
                  const hit = damageFrom(state, myIndex, c.id, ai)
                  return (
                    <div className="crew-move" key={ai}>
                      <span className="crew-cost">{'⚡'.repeat(a.cost)}</span>
                      <span className="crew-move-name">
                        {a.name}
                        {a.text && <em>{a.text}</em>}
                      </span>
                      <span className={`crew-dmg ${hit.weak ? 'is-weak' : ''}`}>
                        {hit.damage}
                        {hit.weak && <b>×2</b>}
                      </span>
                    </div>
                  )
                })}
                {i === 0 ? (
                  <div className="crew-action is-note">Out front · costs {'⚡'.repeat(cost) || 'nothing'} to pull back</div>
                ) : able && onSwap ? (
                  <button className="btn btn--small crew-action" onClick={() => onSwap(i)}>
                    🔄 Send {cardName(c.id).split(/[·,]/)[0].trim()} out {cost > 0 ? '⚡'.repeat(cost) : '(free)'}
                  </button>
                ) : (
                  <div className="crew-action is-note">
                    {!myTurn ? 'Wait for your move' : `Needs ${'⚡'.repeat(cost)} to swap in`}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div className="crew-sheet-head" style={{ marginTop: 6 }}>
          <span>⚔️ {them.name}’s crew</span>
        </div>
        {them.cards.map((c, i) => {
          const stats = statsFor(c.id)
          const el = elementInfo(stats.element)
          const pct = Math.max(0, Math.min(100, (c.hp / c.max) * 100))
          return (
            <div
              key={c.id}
              ref={c.id === focusId ? focusRef : undefined}
              className={`crew-card is-them ${c.id === focusId ? 'is-focus' : ''}`}
            >
              <button className="crew-art" onClick={() => onPeek(c.id)} title="See the full card">
                <img src={stickerUrl(c.id)} alt="" loading="lazy" />
              </button>
              <div className="crew-body">
                <div className="crew-name">
                  {cardName(c.id)}
                  <span className="crew-slot">{i === 0 ? 'FRONT LINE' : 'BENCH'}</span>
                </div>
                <div className="crew-hp">
                  <div className="crew-hp-fill is-them" style={{ width: `${pct}%` }} />
                  <span>
                    {c.hp} / {c.max} HP
                  </span>
                </div>
                <div className="crew-tags">
                  <span>
                    {el.icon} {el.name}
                  </span>
                  <span>{stats.archetype}</span>
                  <span className="is-weak">weak {elementInfo(weaknessOf(stats.element)).icon}</span>
                </div>
                {/* Their attacks are public in a card game — and the number that
                    matters is what it would hit YOUR front-liner for. */}
                {stats.attacks.map((a, ai) => {
                  const hit = damageFrom(state, 1 - myIndex, c.id, ai)
                  return (
                    <div className="crew-move" key={ai}>
                      <span className="crew-cost">{'⚡'.repeat(a.cost)}</span>
                      <span className="crew-move-name">
                        {a.name}
                        {a.text && <em>{a.text}</em>}
                      </span>
                      <span className={`crew-dmg is-them ${hit.weak ? 'is-weak' : ''}`}>
                        {hit.damage}
                        {hit.weak && <b>×2</b>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
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

/**
 * Full-screen flash when a treasure resolves — the payoff for the rarity, and
 * the only chance you get to see what the other captain just did to you. Names
 * whoever played it, because "they played something" is not information.
 */
function TreasurePop({ id, who, mine }: { id: string; who: string; mine: boolean }) {
  const t = treasureById(id)
  if (!t) return null
  return (
    <div className={`tpop rarity-${t.rarity} ${mine ? 'is-mine' : 'is-theirs'}`}>
      <div className="tpop-card">
        <span className="tpop-who">{mine ? 'YOU PLAYED' : `${who.toUpperCase()} PLAYED`}</span>
        <span className="tpop-icon">{t.icon}</span>
        <span className="tpop-name">{t.name}</span>
        <span className="tpop-text">{t.text}</span>
        <span className="tpop-rarity">{t.rarity === 'legendary' ? '★ LEGENDARY ★' : t.rarity}</span>
      </div>
    </div>
  )
}

/** The dice tumbling to its face. */
function DicePop({ face, who }: { face: number; who: string }) {
  const f = DICE_FACES[face]
  if (!f) return null
  return (
    <div className="tpop rarity-epic">
      <div className="tpop-card">
        <span className="tpop-who">{who.toUpperCase()} ROLLED THE DICE</span>
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
