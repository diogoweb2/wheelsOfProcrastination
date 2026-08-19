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
import { useState } from 'react'
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
import { sfx } from '../../audio'

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
    if (!c || c.cost > me.donActive) return
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
    if (prompt.kind === 'don' && side === mySide) { sfx.click(); push(giveDon(state, mySide, ref)); return }
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
      <div className={`optcg-slot${lit(side, uid) ? ' optcg-slot--lit' : ''}`}>
        <OptcgCardImg code={u.code} size="sm" rested={u.rested} onClick={() => tapField(side, uid)} />
        <div className="optcg-slot-foot">
          <span className={power !== c.power ? 'optcg-power optcg-power--up' : 'optcg-power'}>{power}</span>
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
      <div className={`optcg-slot optcg-slot--leader${lit(side, 'leader') ? ' optcg-slot--lit' : ''}`}>
        <OptcgCardImg code={p.leader} size="md" rested={p.leaderRested} onClick={() => tapField(side, 'leader')} />
        <div className="optcg-slot-foot">
          <span className="optcg-power">{leaderPower(p)}</span>
          <span className="optcg-life" title="Life left">
            {'❤️'.repeat(Math.min(p.life.length, 6)) || '💀'}
          </span>
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

  const battle = state.battle
  const attackerName = battle
    ? battle.attacker === 'leader'
      ? card(state[battle.by].leader).name
      : card(unit(state[battle.by], battle.attacker)?.code ?? '').name
    : ''

  return (
    <div className="optcg-board">
      {/* their side */}
      <div className="optcg-side optcg-side--foe">
        <div className="optcg-tray">
          <span className="chip">✋ {foe.hand.length}</span>
          <span className="chip">🃏 {foe.deck.length}</span>
          <span className="chip">🔶 {foe.donActive}/{foe.donActive + foe.donRested}</span>
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
          <b>{attackerName}</b> ({powerOf(state[battle.by], battle.attacker)}) vs{' '}
          <b>{battle.target === 'leader' ? 'Leader' : card(unit(state[other(battle.by)], battle.target)?.code ?? '').name}</b> (
          {defenderPower(state)})
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
          <span className="chip">🔶 {me.donActive} active</span>
          <span className="chip">🃏 {me.deck.length}</span>
          <span className="chip">❤️ {me.life.length}</span>
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
      <div className="optcg-hand-backs">
        {foe.hand.map((_, i) => (
          <OptcgCardBack key={i} size="xs" />
        ))}
      </div>
    </div>
  )
}
