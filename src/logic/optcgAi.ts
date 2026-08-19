// The AI captain — the opponent when Ben is asleep.
//
// Deliberately a heuristic player, not a search: One Piece is a hidden-hand
// game and a shallow search over a hidden deck reads as random anyway. What it
// does play is the shape of the real game — spend all your DON!!, keep the
// board wide, attack the Leader when the trade is bad and the Characters when
// the trade is good, block when the blocker survives, counter only to save
// something worth more than the counter.
//
// Everything goes through the engine's own public moves, so the AI can never
// make a move a player could not make.
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
  other,
  passBlock,
  playCard,
  playCounter,
  powerOf,
  resolveBattle,
  answerTrigger,
  targetsFor,
  unit,
  type OptcgSide,
  type OptcgState,
} from './optcg'
import { canActivate, effectsOf, runEffect, targetsOf, type OptcgEffect } from './optcgEffects'

const clone = (s: OptcgState): OptcgState => JSON.parse(JSON.stringify(s)) as OptcgState

/** How much the AI wants a card on the board: power per DON!! spent, roughly. */
const value = (code: string): number => {
  const c = card(code)
  return c.power / 1000 + (c.effect ? 1 : 0)
}

/** Run one scripted effect, picking the target the AI likes most. */
function castEffect(s: OptcgState, side: OptcgSide, self: string, e: OptcgEffect): OptcgState {
  const next = clone(s)
  const refs = e.target === 'none' ? [''] : targetsOf(next, side, e)
  if (e.target !== 'none' && refs.length === 0) return s
  // Against the opponent: hit the biggest thing. On our own side: the Leader,
  // which is the card that attacks every turn.
  const pick =
    e.target === 'foeChar' || e.target === 'foeRested'
      ? refs.reduce((a, b) => (powerOf(next[other(side)], a) >= powerOf(next[other(side)], b) ? a : b))
      : refs.includes('leader')
        ? 'leader'
        : refs[0]
  runEffect(next, side, self, e, pick)
  return next
}

/** [Activate: Main] buttons the AI presses before it commits to anything else. */
function activations(s: OptcgState, side: OptcgSide): OptcgState {
  let next = s
  const holders = ['leader', ...next[side].chars.map((c) => c.uid)]
  for (const ref of holders) {
    const code = ref === 'leader' ? next[side].leader : unit(next[side], ref)?.code
    if (!code) continue
    for (const e of effectsOf(code, 'activate')) {
      if (canActivate(next, side, ref, e)) next = castEffect(next, side, ref, e)
    }
  }
  return next
}

/** Play out the hand: the most valuable card it can afford, until it can't. */
function develop(s: OptcgState, side: OptcgSide): OptcgState {
  let next = s
  for (let guard = 0; guard < 12; guard++) {
    const p = next[side]
    let best = -1
    let bestScore = 0
    for (let i = 0; i < p.hand.length; i++) {
      const c = cardByCode(p.hand[i])
      if (!c || c.cost > p.donActive) continue
      if (c.kind === 'character' && p.chars.length >= 5) continue
      // Events only fire when their scripted text can do something useful.
      if (c.kind === 'event') {
        const main = effectsOf(c.code, 'main')[0]
        if (!main || targetsOf(next, side, main).length === 0) continue
      }
      const score = value(c.code) - c.cost * 0.2
      if (score > bestScore) { bestScore = score; best = i }
    }
    if (best < 0) break
    const code = next[side].hand[best]
    const played = playCard(next, side, best)
    if (played === next) break
    next = played
    const c = card(code)
    const timing = c.kind === 'event' ? 'main' : 'onPlay'
    for (const e of effectsOf(code, timing)) {
      const self = c.kind === 'event' ? 'leader' : (next[side].chars[next[side].chars.length - 1]?.uid ?? 'leader')
      next = castEffect(next, side, self, e)
    }
  }
  return next
}

/** One attack, chosen greedily: a free K.O. first, otherwise the Leader. */
function chooseAttack(s: OptcgState, side: OptcgSide): { from: string; to: string } | null {
  const mine = attackers(s, side)
  if (mine.length === 0) return null
  const foeSide = other(side)
  for (const from of mine) {
    const power = powerOf(s[side], from)
    const kills = targetsFor(s, side)
      .filter((t) => t !== 'leader')
      .filter((t) => powerOf(s[foeSide], t) <= power)
      .sort((a, b) => powerOf(s[foeSide], b) - powerOf(s[foeSide], a))
    if (kills.length > 0) return { from, to: kills[0] }
  }
  // No trade on offer — swing at the Leader with the strongest attacker.
  const best = mine.reduce((a, b) => (powerOf(s[side], a) >= powerOf(s[side], b) ? a : b))
  return { from: best, to: 'leader' }
}

/** Spend leftover DON!! pushing the next attacker over the Leader's power. */
function pumpFor(s: OptcgState, side: OptcgSide, ref: string, need: number): OptcgState {
  let next = s
  while (powerOf(next[side], ref) < need && next[side].donActive > 0) {
    const after = giveDon(next, side, ref)
    if (after === next) break
    next = after
  }
  return next
}

/**
 * The AI's whole turn: activate, develop, attack until nothing is left standing
 * that wants to attack, then pass. Returns the state with the turn already
 * handed back — unless an attack has stopped on the defender's block/counter
 * decision, which is the human's to answer.
 */
export function aiTurn(state: OptcgState, side: OptcgSide): OptcgState {
  if (state.over || state.turn !== side || state.phase !== 'main') return state
  let next = activations(state, side)
  next = develop(next, side)
  for (let guard = 0; guard < 8; guard++) {
    if (next.phase !== 'main' || next.over) break
    const plan = chooseAttack(next, side)
    if (!plan) break
    const foeSide = other(side)
    const need = powerOf(next[foeSide], plan.to) + (plan.to === 'leader' ? 1000 : 0)
    next = pumpFor(next, side, plan.from, need)
    const declared = declareAttack(next, side, plan.from, plan.to)
    if (declared === next) break
    next = declared
    // [When Attacking] text fires now.
    const code = plan.from === 'leader' ? next[side].leader : unit(next[side], plan.from)?.code
    if (code) for (const e of effectsOf(code, 'attack')) next = castEffect(next, side, plan.from, e)
    // Hand the battle to the defender; the screen resumes the AI afterwards.
    return next
  }
  return next.phase === 'main' && !next.over ? endTurn(next) : next
}

/** The AI defending: block only when the blocker survives or the hit is lethal. */
export function aiDefend(state: OptcgState, side: OptcgSide): OptcgState {
  let next = state
  if (next.phase === 'block') {
    const b = next.battle
    const power = b ? powerOf(next[other(side)], b.attacker) : 0
    const lethal = b?.target === 'leader' && next[side].life.length <= 1
    const options = blockers(next).filter((uid) => {
      const survives = powerOf(next[side], uid) > power
      return survives || lethal
    })
    next = options.length > 0 ? block(next, options[0]) : passBlock(next)
  }
  if (next.phase === 'counter') {
    const b = next.battle
    const power = b ? powerOf(next[other(side)], b.attacker) : 0
    const worth = b?.target === 'leader' ? next[side].life.length <= 2 : true
    for (let guard = 0; guard < 5 && worth; guard++) {
      if (defenderPower(next) > power) break
      const p = next[side]
      const i = p.hand.findIndex((code) => (cardByCode(code)?.counter ?? 0) > 0)
      if (i < 0) break
      const after = playCounter(next, i)
      if (after === next) break
      next = after
    }
    next = resolveBattle(next)
  }
  if (next.phase === 'trigger') next = answerTrigger(next, true)
  return next
}
