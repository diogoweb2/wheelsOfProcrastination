// The playing field, and every tap that moves the game.
//
// The board owns no rules: every tap goes through logic/optcg.ts and hands the
// resulting position back to the caller, which either keeps it in React state
// (the AI game) or writes it to the shared document (against Ben). That is why
// the same component can drive both.
//
// The one thing it owns is what the player is being ASKED right now — pick a
// target for an effect, pick a blocker, add counters — which is local, throwaway
// UI state and has no business in a synced document.
import { useEffect, useRef, useState } from 'react'
import {
  attackers,
  block,
  blockers,
  card,
  cardByCode,
  declareAttack,
  defenderPower,
  endTurn,
  giveDon,
  leaderPower,
  mulligan,
  other,
  passBlock,
  playCard,
  playCounter,
  powerOf,
  resolveBattle,
  answerTrigger,
  targetsFor,
  trashOwn,
  unit,
  unitPower,
  type OptcgSide,
  type OptcgState,
} from '../../logic/optcg'
import {
  canActivate,
  effectsOf,
  isScripted,
  runEffect,
  targetsOf,
  type OptcgEffect,
} from '../../logic/optcgEffects'
import { OptcgCardBack, OptcgCardImg } from './OptcgCardImg'
import { optcgSfx, sfx } from '../../audio'
import confetti from 'canvas-confetti'

const clone = (s: OptcgState): OptcgState => JSON.parse(JSON.stringify(s)) as OptcgState

/** What the board is waiting for the player to point at. */
type Prompt =
  | { kind: 'none' }
  /** An effect that needs a target, already paid for by the caller. */
  | { kind: 'target'; self: string; effect: OptcgEffect; code: string }
  /** The field is full and a Character has to go before this one lands. */
  | { kind: 'room'; handIndex: number }
  /** An attacker is chosen and wants a target. */
  | { kind: 'attack'; from: string }
  /** DON!! given by tapping the next card. */
  | { kind: 'don' }


/**
 * The board's reactions — every sound and every flash on this screen.
 *
 * They are read off the POSITION, never off the tap that caused them: half the
 * moves in a live game arrive from the other phone, and a reaction wired to the
 * button would be silent for exactly the moves you most need to notice. Same
 * arrangement Sea Battle uses, for the same reason.
 */
interface OptcgFx {
  /** Board-wide shake, for a hit that took Life. */
  shake: boolean
  /** uid (or 'leader') of the card lunging, and the one being hit. */
  lunge: string
  struck: string
  /** The banner that drops in on a big beat — damage, a K.O., the end. */
  toast: { text: string; tone: 'hit' | 'ko' | 'good' | 'end' } | null
}

function useOptcgFx(state: OptcgState, mySide: OptcgSide): OptcgFx {
  const prev = useRef<OptcgState | null>(null)
  const [fx, setFx] = useState<OptcgFx>({ shake: false, lunge: '', struck: '', toast: null })

  useEffect(() => {
    const before = prev.current
    prev.current = state
    if (!before || before.seq === state.seq) return

    const foeSide = other(mySide)
    const myLifeLost = before[mySide].life.length - state[mySide].life.length
    const foeLifeLost = before[foeSide].life.length - state[foeSide].life.length
    const myKos = before[mySide].chars.length - state[mySide].chars.length
    const foeKos = before[foeSide].chars.length - state[foeSide].chars.length
    const next: Partial<OptcgFx> = {}

    // a new attack: the attacker lunges at whatever it declared on
    if (state.battle && !before.battle) {
      optcgSfx.attack()
      next.lunge = state.battle.attacker
      next.struck = state.battle.target
    }
    if (state.phase === 'counter' && before.phase === 'block' && state.battle?.blocked) optcgSfx.block()
    if ((state.battle?.counter ?? 0) > (before.battle?.counter ?? 0)) optcgSfx.counter()
    if (state.phase === 'trigger' && before.phase !== 'trigger') optcgSfx.trigger()

    if (myLifeLost > 0 || foeLifeLost > 0) {
      const mine = myLifeLost > 0
      optcgSfx.damage(mine ? state[mySide].life.length : state[foeSide].life.length)
      next.shake = true
      next.toast = mine
        ? { text: `You took ${myLifeLost} damage — ${state[mySide].life.length} Life left`, tone: 'hit' }
        : { text: `Their Leader is down to ${state[foeSide].life.length} Life!`, tone: 'good' }
    } else if (myKos > 0 || foeKos > 0) {
      optcgSfx.ko()
      next.toast = foeKos > 0 ? { text: 'K.O.!', tone: 'ko' } : { text: 'You lost a Character', tone: 'ko' }
    } else if (before.phase === 'counter' && state.phase === 'main' && !state.over) {
      // the battle resolved without anything happening: it was held off
      optcgSfx.hold()
    }

    if (state[mySide].chars.length > before[mySide].chars.length) optcgSfx.play()
    if (state.turn !== before.turn && state.turn === mySide && !state.over) {
      optcgSfx.turn()
      next.toast = { text: 'Your turn', tone: 'good' }
    }

    if (state.over && !before.over) {
      const won = state.winner === mySide
      if (won) {
        optcgSfx.win()
        void confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ['#ffce00', '#d70000', '#fff'] })
      } else optcgSfx.lose()
      next.toast = { text: won ? '🏆 You win!' : 'Your Leader is down…', tone: 'end' }
    }

    setFx((f) => ({ ...f, ...next }))
  }, [state, mySide])

  // every flash is short — they mark a beat, they do not hold the screen
  useEffect(() => {
    if (!fx.shake && !fx.lunge && !fx.toast) return
    const timers = [
      window.setTimeout(() => setFx((f) => ({ ...f, shake: false, lunge: '', struck: '' })), 620),
      window.setTimeout(() => setFx((f) => ({ ...f, toast: null })), 2200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [fx.shake, fx.lunge, fx.toast])

  return fx
}

export function OptcgBoard({
  state,
  mySide,
  onState,
  waiting,
}: {
  state: OptcgState
  mySide: OptcgSide
  onState: (next: OptcgState) => void
  /** True while it is the other side's move and we are only watching. */
  waiting: boolean
}) {
  const [prompt, setPrompt] = useState<Prompt>({ kind: 'none' })
  const fx = useOptcgFx(state, mySide)

  const me = state[mySide]
  const foe = state[other(mySide)]
  const myTurn = state.turn === mySide && state.phase === 'main' && !state.over
  const defending =
    (state.phase === 'block' || state.phase === 'counter' || state.phase === 'trigger') && state.turn !== mySide

  const push = (next: OptcgState) => {
    setPrompt({ kind: 'none' })
    if (next !== state) onState(next)
  }

  /** Run an effect, asking for a target first when it needs one. */
  const fire = (self: string, code: string, e: OptcgEffect, from: OptcgState) => {
    const refs = e.target === 'none' ? [''] : targetsOf(from, mySide, e)
    if (e.target !== 'none' && refs.length === 0) { onState(from); return }
    if (e.target !== 'none' && refs.length > 1) {
      onState(from)
      setPrompt({ kind: 'target', self, effect: e, code })
      return
    }
    const next = clone(from)
    runEffect(next, mySide, self, e, refs[0])
    push(next)
  }

  // --- taps ------------------------------------------------------------------

  const tapHand = (i: number) => {
    if (defending && state.phase === 'counter') {
      const code = me.hand[i]
      const c = cardByCode(code)
      const counterEffect = effectsOf(code, 'counter')[0]
      if (counterEffect && c && c.cost <= me.donActive) {
        optcgSfx.counter()
        // A [Counter] event: pay it, then let it pick who it protects.
        const paid = clone(state)
        const p = paid[mySide]
        p.hand.splice(i, 1)
        p.trash.push(code)
        p.donActive -= c.cost
        p.donRested += c.cost
        sfx.click()
        fire('leader', code, counterEffect, paid)
        return
      }
      if (c && c.counter > 0) { sfx.click(); push(playCounter(state, i)) }
      return
    }
    if (!myTurn) return
    const c = cardByCode(me.hand[i])
    if (!c || c.cost > me.donActive) { optcgSfx.nope(); return }
    if (c.kind === 'character' && me.chars.length >= 5) { setPrompt({ kind: 'room', handIndex: i }); return }
    const played = playCard(state, mySide, i)
    if (played === state) return
    sfx.click()
    const timing = c.kind === 'event' ? 'main' : 'onPlay'
    const e = effectsOf(c.code, timing)[0]
    if (!e) { push(played); return }
    const self = c.kind === 'character' ? (played[mySide].chars[played[mySide].chars.length - 1]?.uid ?? 'leader') : 'leader'
    fire(self, c.code, e, played)
  }

  /** A tap on any card on the field — meaning depends on what was asked. */
  const tapField = (side: OptcgSide, ref: string) => {
    if (prompt.kind === 'target') {
      const legal = targetsOf(state, mySide, prompt.effect)
      if (!legal.includes(ref)) return
      const next = clone(state)
      runEffect(next, mySide, prompt.self, prompt.effect, ref)
      sfx.click()
      push(next)
      return
    }
    if (prompt.kind === 'room' && side === mySide && ref !== 'leader') {
      const cleared = trashOwn(state, mySide, ref)
      const i = prompt.handIndex
      setPrompt({ kind: 'none' })
      const played = playCard(cleared, mySide, i)
      const code = cleared[mySide].hand[i]
      const e = code ? effectsOf(code, 'onPlay')[0] : undefined
      if (!e) { onState(played); return }
      fire(played[mySide].chars[played[mySide].chars.length - 1]?.uid ?? 'leader', code, e, played)
      return
    }
    if (prompt.kind === 'don' && side === mySide) { optcgSfx.don(); push(giveDon(state, mySide, ref)); return }
    if (state.phase === 'block' && defending && side === mySide && blockers(state).includes(ref)) {
      sfx.click()
      push(block(state, ref))
      return
    }
    if (!myTurn) return
    if (prompt.kind === 'attack') {
      if (side === other(mySide) && targetsFor(state, mySide).includes(ref)) {
        const declared = declareAttack(state, mySide, prompt.from, ref)
        if (declared === state) return
        sfx.click()
        // [When Attacking] fires as the attack goes in.
        const code = prompt.from === 'leader' ? me.leader : unit(me, prompt.from)?.code
        const e = code ? effectsOf(code, 'attack')[0] : undefined
        if (!e) { push(declared); return }
        fire(prompt.from, code as string, e, declared)
        return
      }
      setPrompt({ kind: 'none' })
      return
    }
    if (side === mySide && attackers(state, mySide).includes(ref)) setPrompt({ kind: 'attack', from: ref })
  }

  // --- what to highlight ------------------------------------------------------

  const litRefs = (() => {
    if (prompt.kind === 'target') return new Set(targetsOf(state, mySide, prompt.effect))
    if (prompt.kind === 'attack') return new Set(targetsFor(state, mySide))
    if (prompt.kind === 'don') return new Set(['leader', ...me.chars.map((c) => c.uid)])
    if (prompt.kind === 'room') return new Set(me.chars.map((c) => c.uid))
    if (state.phase === 'block' && defending) return new Set(blockers(state))
    if (myTurn) return new Set(attackers(state, mySide))
    return new Set<string>()
  })()

  const lit = (side: OptcgSide, ref: string) => {
    const mine = side === mySide
    if (prompt.kind === 'attack' || prompt.kind === 'target') {
      const wantFoe = prompt.kind === 'attack' || prompt.effect.target === 'foeChar' || prompt.effect.target === 'foeRested'
      if (mine === wantFoe) return false
    } else if (!mine) return false
    return litRefs.has(ref)
  }

  // --- pieces of the view ------------------------------------------------------

  const Unit = ({ side, uid }: { side: OptcgSide; uid: string }) => {
    const p = state[side]
    const u = unit(p, uid)
    if (!u) return null
    const c = card(u.code)
    const power = unitPower(p, u)
    return (
      <div
        className={`optcg-slot${lit(side, uid) ? ' optcg-slot--lit' : ''}${
          fx.lunge === uid ? (side === mySide ? ' is-lunging-up' : ' is-lunging-down') : ''
        }${fx.struck === uid ? ' is-struck' : ''}`}
      >
        <OptcgCardImg code={u.code} size="sm" rested={u.rested} onClick={() => tapField(side, uid)} />
        <div className="optcg-slot-foot">
          {/* keyed by the number so a change restarts the pop by itself */}
          <span key={power} className={power !== c.power ? 'optcg-power optcg-power--up' : 'optcg-power'}>
            {power}
          </span>
          {u.don > 0 && <span className="optcg-don-chip">🔶{u.don}</span>}
          {u.sick && <span className="optcg-tag">new</span>}
        </div>
        {side === mySide &&
          effectsOf(u.code, 'activate').map((e) =>
            canActivate(state, mySide, uid, e) ? (
              <button key={e.label} className="btn btn--small optcg-act" onClick={() => fire(uid, u.code, e, state)}>
                {e.label}
              </button>
            ) : null,
          )}
      </div>
    )
  }

  const Leader = ({ side }: { side: OptcgSide }) => {
    const p = state[side]
    return (
      <div
        className={`optcg-slot optcg-slot--leader${lit(side, 'leader') ? ' optcg-slot--lit' : ''}${
          fx.lunge === 'leader' && side === state.turn ? (side === mySide ? ' is-lunging-up' : ' is-lunging-down') : ''
        }${fx.struck === 'leader' && side !== state.turn ? ' is-struck' : ''}`}
      >
        <OptcgCardImg code={p.leader} size="md" rested={p.leaderRested} onClick={() => tapField(side, 'leader')} />
        <div className="optcg-slot-foot">
          <span key={leaderPower(p)} className="optcg-power">{leaderPower(p)}</span>
        </div>
        {/* Life as hearts you can count at a glance — the one number that ends the game */}
        <div className={`optcg-life${p.life.length <= 1 ? ' is-critical' : ''}`} title="Life left">
          {p.life.length === 0
            ? '💀'
            : Array.from({ length: p.life.length }, (_, i) => <span key={i}>❤️</span>)}
        </div>
        {side === mySide &&
          effectsOf(p.leader, 'activate').map((e) =>
            canActivate(state, mySide, 'leader', e) ? (
              <button key={e.label} className="btn btn--small optcg-act" onClick={() => fire('leader', p.leader, e, state)}>
                {e.label}
              </button>
            ) : null,
          )}
      </div>
    )
  }

  // The two facts that change how you play the turn, said out loud.
  const lethal = myTurn && foe.life.length === 0
  const danger = me.life.length <= 1 && !state.over

  const battle = state.battle
  const attackerName = battle
    ? battle.attacker === 'leader'
      ? card(state[battle.by].leader).name
      : card(unit(state[battle.by], battle.attacker)?.code ?? '').name
    : ''

  return (
    <div className={`optcg-board${fx.shake ? ' is-shaking' : ''}`}>
      {fx.toast && <div className={`optcg-toast optcg-toast--${fx.toast.tone}`}>{fx.toast.text}</div>}
      {/* their side */}
      <div className="optcg-side optcg-side--foe">
        <div className="optcg-tray">
          <span className="chip">✋ {foe.hand.length}</span>
          <span className="chip">🃏 {foe.deck.length}</span>
          <DonRow active={foe.donActive} rested={foe.donRested} />
          <span className="chip">🗑️ {foe.trash.length}</span>
        </div>
        <div className="optcg-row">
          <Leader side={other(mySide)} />
          {foe.stage && <OptcgCardImg code={foe.stage.code} size="sm" />}
          {foe.chars.map((c) => (
            <Unit key={c.uid} side={other(mySide)} uid={c.uid} />
          ))}
        </div>
      </div>

      {/* the battle in progress */}
      {battle && (
        <div className="optcg-battle">
          {/* who is winning, as a bar rather than two numbers to compare in your head */}
          <div className="optcg-clash">
            <span className="optcg-clash-side">
              <b>{attackerName}</b>
              <span className="optcg-clash-power">{powerOf(state[battle.by], battle.attacker)}</span>
            </span>
            <span className="optcg-clash-vs">⚔️</span>
            <span className="optcg-clash-side optcg-clash-side--right">
              <b>{battle.target === 'leader' ? 'Leader' : card(unit(state[other(battle.by)], battle.target)?.code ?? '').name}</b>
              <span className="optcg-clash-power">{defenderPower(state)}</span>
            </span>
          </div>
          <div className="optcg-clash-bar">
            <span
              className={powerOf(state[battle.by], battle.attacker) >= defenderPower(state) ? 'is-attacker' : 'is-defender'}
              style={{
                width: `${Math.round(
                  (powerOf(state[battle.by], battle.attacker) /
                    Math.max(1, powerOf(state[battle.by], battle.attacker) + defenderPower(state))) *
                    100,
                )}%`,
              }}
            />
          </div>
          <p className="optcg-clash-note">
            {powerOf(state[battle.by], battle.attacker) >= defenderPower(state)
              ? battle.target === 'leader'
                ? `This gets through — ${state[other(battle.by)].name} loses a Life card.`
                : 'This K.O.s the Character as it stands.'
              : 'Held off as it stands.'}
          </p>
          {state.phase === 'block' && defending && (
            <div className="optcg-ask">
              {blockers(state).length > 0 ? 'Tap a [Blocker], or ' : 'No blockers — '}
              <button className="btn btn--small" onClick={() => push(passBlock(state))}>
                let it through
              </button>
            </div>
          )}
          {state.phase === 'counter' && defending && (
            <div className="optcg-ask">
              Play Counter cards from your hand, then{' '}
              <button className="btn btn--small" onClick={() => push(resolveBattle(state))}>
                take the hit
              </button>
            </div>
          )}
        </div>
      )}

      {state.phase === 'trigger' && defending && (
        <div className="optcg-battle">
          Trigger — <b>{card(state.reveal).name}</b>: {card(state.reveal).trigger}
          <div className="optcg-ask">
            <button className="btn btn--small" onClick={() => push(answerTrigger(state, true))}>Use it</button>{' '}
            <button className="btn btn--small btn--ghost" onClick={() => push(answerTrigger(state, false))}>Keep it in hand</button>
          </div>
        </div>
      )}

      {/* my side */}
      <div className="optcg-side">
        <div className="optcg-row">
          <Leader side={mySide} />
          {me.stage && <OptcgCardImg code={me.stage.code} size="sm" />}
          {me.chars.map((c) => (
            <Unit key={c.uid} side={mySide} uid={c.uid} />
          ))}
        </div>
        <div className="optcg-tray">
          <DonRow active={me.donActive} rested={me.donRested} />
          <span className="chip">🃏 {me.deck.length}</span>
          <span className="chip">🗑️ {me.trash.length}</span>
          {myTurn && (
            <>
              <button
                className={`btn btn--small${prompt.kind === 'don' ? ' btn--ghost' : ''}`}
                disabled={me.donActive < 1}
                onClick={() => setPrompt(prompt.kind === 'don' ? { kind: 'none' } : { kind: 'don' })}
              >
                Give DON!!
              </button>
              <button className="btn btn--small" onClick={() => push(endTurn(state))}>
                End turn
              </button>
            </>
          )}
        </div>
        <div className="optcg-hand">
          {me.hand.map((code, i) => {
            const c = card(code)
            const playable = myTurn && c.cost <= me.donActive
            const counterable = defending && state.phase === 'counter' && (c.counter > 0 || effectsOf(code, 'counter').length > 0)
            return (
              <div key={`${code}-${i}`} className={`optcg-handcard${playable || counterable ? ' optcg-handcard--live' : ''}`}>
                <OptcgCardImg code={code} size="sm" onClick={() => tapHand(i)} />
                <div className="optcg-slot-foot">
                  <span className="optcg-cost">{c.kind === 'event' ? '⚡' : ''}{c.cost}</span>
                  {c.counter > 0 && <span className="optcg-counter">+{c.counter}</span>}
                  {!isScripted(code) && c.effect && <span className="optcg-tag" title={c.effect}>text</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* the turn, in one line: whose it is, what is left to spend, what is at stake */}
      <div className={`optcg-turnbar${myTurn ? ' is-mine' : ''}`}>
        <span className="optcg-turnbar-who">{myTurn ? '⚔️ Your turn' : `⏳ ${foe.name}`}</span>
        <span className="chip">Turn {state.turnNo}</span>
        {myTurn && <span className="chip">🔶 {me.donActive} to spend</span>}
        {lethal && <span className="optcg-lethal">One more hit wins it!</span>}
        {danger && <span className="optcg-danger">Your Leader is on the last Life</span>}
      </div>

      {/* what we are being asked, and the running commentary */}
      <div className="optcg-status">
        {state.over ? (
          <b>{state.winner === mySide ? 'You win!' : `${foe.name} wins.`}</b>
        ) : state.phase === 'mulligan' ? (
          <span>
            Opening hand —{' '}
            <button className="btn btn--small" onClick={() => push(mulligan(state, mySide, false))}>Keep</button>{' '}
            <button className="btn btn--small btn--ghost" onClick={() => push(mulligan(state, mySide, true))}>Redraw all 5</button>
          </span>
        ) : prompt.kind === 'target' ? (
          <span>Pick a target: {prompt.effect.label}</span>
        ) : prompt.kind === 'room' ? (
          <span>Field is full — tap one of your Characters to trash it.</span>
        ) : prompt.kind === 'attack' ? (
          <span>Tap their Leader or a rested Character.</span>
        ) : prompt.kind === 'don' ? (
          <span>Tap a card to give it 1 DON!! (+1000).</span>
        ) : waiting ? (
          <span className="muted">Waiting for {foe.name}…</span>
        ) : (
          <span className="muted">{state.log[state.log.length - 1]?.text ?? 'Your move.'}</span>
        )}
      </div>
      <div className="optcg-hint muted">Hold any card to read what it does.</div>
      <div className="optcg-hand-backs">
        {foe.hand.map((_, i) => (
          <OptcgCardBack key={i} size="xs" />
        ))}
      </div>
    </div>
  )
}

/**
 * DON!! as chips rather than a number. Active ones are gold and are what you
 * can actually spend; rested ones are spent, and stay on the table because a
 * turn's shape is "how much have I got left" against "how much have I used".
 */
function DonRow({ active, rested }: { active: number; rested: number }) {
  const total = active + rested
  if (total === 0) return <span className="chip">🔶 0</span>
  return (
    <span className="optcg-don-row" title={`${active} active of ${total} DON!!`}>
      {Array.from({ length: Math.min(total, 10) }, (_, i) => (
        <span key={i} className={`optcg-don${i < active ? ' is-active' : ' is-rested'}`} />
      ))}
      <b>{active}</b>
    </span>
  )
}
