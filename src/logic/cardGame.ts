// Davy Back Duel — the card game played with the album's stickers.
//
// This file is the RULES, and nothing else: no React, no Firestore, no sound.
// Every function is pure and every state is JSON — which is what lets the exact
// same engine run a solo match in React state and an online match through a
// shared Firestore doc, with both devices agreeing on the outcome.
//
// The shape of a match:
//   · each captain fields DECK_SIZE cards they own, and opens a chest of
//     TREASURE cards nobody else can see (see logic/treasures.ts)
//   · turns alternate; a turn is one ACTION (attack, swap, focus) plus, for
//     free, up to one treasure card — that free play is what makes a turn a
//     decision instead of a button press
//   · +1 energy at the start of your turn; attacks cost energy, so the big ones
//     have to be saved up for
//   · down to your last card you may roll the Davy Back Dice, once, for a
//     comeback — no face on it is bad
//   · from STORM_TURN every hit lands DOUBLE, so nothing can drag out
//   · knock out KOS_TO_WIN of their cards and you win
//
// Card stats (HP, element, the two attacks) are generated from the sticker id by
// scripts/stickers.mjs, so any new album art is battle-ready on arrival.
import { CARD_ELEMENTS, type CardAttack, type CardElement, type StickerDef } from './stickerCatalog.generated'
import { ALL_STICKER_IDS, stickerById } from './album'
import {
  CHEST_SIZE,
  DICE_FACES,
  HAND_CAP,
  drawTreasures,
  rollDice,
  treasureById,
  type TreasureFx,
} from './treasures'

export { CARD_ELEMENTS }
export type { CardAttack, CardElement }
export { CARD_ARCHETYPES } from './stickerCatalog.generated'

/** Cards each captain fields. */
export const DECK_SIZE = 4
/** Knockouts that win the duel — one card can survive and you still lose. */
export const KOS_TO_WIN = 3
/** Energy ceiling, so nobody banks ten turns of it for an unanswerable alpha strike. */
export const MAX_ENERGY = 5
/** Energy gained at the start of every turn. */
export const ENERGY_PER_TURN = 1
/** "Focus" trades your action for extra energy and a small patch-up. */
export const FOCUS_ENERGY = 1
export const FOCUS_HEAL = 10
/** Berries the winner takes from an online duel. */
export const DUEL_REWARD = 25
/** Berries for beating the ship's training dummy, and how many a day pay out. */
export const SOLO_REWARD = 8
export const SOLO_REWARD_LIMIT = 3
/**
 * The Grand Line storm. From this turn on, every hit does double damage — the
 * hard guarantee that a match ends inside ten minutes no matter how defensively
 * both sides play. It also makes the late game genuinely tense, which a slow
 * grind never is.
 */
export const STORM_TURN = 24
/** Backstop for a match that somehow still hasn't ended. Counted in single turns. */
export const TURN_LIMIT = 60

// --- state ------------------------------------------------------------------

/** One card as it stands on the table: which sticker it is, and its current HP. */
export interface DuelCard {
  id: string // sticker id
  hp: number // current
  max: number // starting HP, for the health bar
}

export interface DuelSide {
  profileId: string
  name: string
  emoji: string
  /** Cards still standing; index 0 is the front line. */
  cards: DuelCard[]
  /** Knocked out, in the order they fell — what Phoenix Flames reaches into. */
  fallen: DuelCard[]
  /** Treasure card ids. The other captain's device holds these but never renders them. */
  hand: string[]
  energy: number
  /** How many of the OPPONENT's cards this side has knocked out. */
  kos: number
  /** Damage queued onto this side's next attack (Bruiser finisher, Whetstone, Bounty Poster). */
  boost: number
  /** Set by a Trickster finisher or Soul Solid — this side cannot attack on its next turn. */
  stunned: boolean

  // --- one-shot treasure flags. Protections clear at the start of your next
  // turn (they cover the opponent's turn); turn-scoped ones clear when you act.
  shield: number // the next hit taken is this much weaker
  survive: boolean // cannot be knocked out
  reflect: boolean // their next attack hits their own front-liner
  freeSwap: boolean // sending out a bench card costs nothing this turn
  multiplier: number // attacks are multiplied by this for the rest of this turn (1 = normal)
  extraTurn: boolean // Time Skip: go again instead of handing over
  playedTreasure: boolean // one treasure per turn
  diceUsed: boolean // the Davy Back Dice is once per match
}

export type DuelMove =
  | { kind: 'attack'; attack: number } // index into the active card's attacks
  | { kind: 'swap'; to: number } // index into own cards
  | { kind: 'focus' }
  /** Free: does not use your action, max one per turn. */
  | { kind: 'treasure'; index: number }
  /** Free: once per match, and only while you're down to your last card. */
  | { kind: 'dice' }

/** One line of the battle log — also what drives the arena's animations. */
export interface DuelLogEntry {
  by: string // profileId who acted
  text: string
  /** The card that acted — the arena needs it to play THAT pirate's voice. */
  cardId?: string
  /** Which of its attacks: 0 = quick, 1 = finisher. Absent on swaps and focus. */
  attackIndex?: number
  damage?: number
  weak?: boolean // the weakness ring doubled it
  ko?: boolean
  /**
   * The card that was knocked out. It has already left the board by the time
   * anyone renders this, so the arena needs its id to animate the right card
   * falling instead of the one that stepped up to replace it.
   */
  koId?: string
  effect?: 'heal' | 'boost' | 'stun' | 'drain'
  /** A treasure card was played — the arena reveals it with rarity-scaled noise. */
  treasureId?: string
  /** The dice was rolled: index into DICE_FACES. */
  diceFace?: number
  /** The closing line. The arena reads the entry BEFORE this one to animate the last blow. */
  final?: boolean
}

export interface DuelState {
  sides: DuelSide[] // exactly 2
  turn: number // index into sides — whose move it is
  turnNo: number // ACTIONS played so far, for the storm and the TURN_LIMIT backstop
  /**
   * Every move ever played, free ones included. `turnNo` deliberately does not
   * count treasures and dice rolls, so it is useless as a "did anything happen?"
   * signal — and anything watching for a change (the arena's animations, the
   * solo opponent's timer) will sit there forever on a free move. This is that
   * signal, and it only ever goes up.
   */
  seq: number
  log: DuelLogEntry[]
  winnerId: string | null
  over: boolean
}

export interface DuelSeed {
  profileId: string
  name: string
  emoji: string
  deck: string[] // sticker ids, in field order
}

// --- card lookups -----------------------------------------------------------

/** The battle stats behind a sticker id. Unknown ids get a plain fallback rather than crashing a live match. */
export function statsFor(id: string): StickerDef['card'] {
  return (
    stickerById(id)?.card ?? {
      element: 'spirit',
      archetype: 'trickster',
      hp: 100,
      retreat: 1,
      attacks: [{ name: 'Struggle', cost: 1, damage: 20 }],
    }
  )
}

export const cardName = (id: string) => stickerById(id)?.name ?? 'Unknown Pirate'

const ELEMENT_BY_ID = new Map(CARD_ELEMENTS.map((e) => [e.id, e]))
export const elementInfo = (id: CardElement) => ELEMENT_BY_ID.get(id) ?? CARD_ELEMENTS[0]

/** Does `attacker`'s element hit `defender`'s for double? */
export const isWeakTo = (attacker: CardElement, defender: CardElement) => elementInfo(attacker).beats === defender

/** The element that hits `el` for double — what the card front prints as its weakness. */
export const weaknessOf = (el: CardElement): CardElement =>
  CARD_ELEMENTS.find((e) => e.beats === el)?.id ?? CARD_ELEMENTS[0].id

// --- setup ------------------------------------------------------------------

const freshSide = (seed: DuelSeed): DuelSide => ({
  profileId: seed.profileId,
  name: seed.name,
  emoji: seed.emoji,
  cards: seed.deck.map((id) => {
    const { hp } = statsFor(id)
    return { id, hp, max: hp }
  }),
  fallen: [],
  hand: drawTreasures(CHEST_SIZE),
  energy: 0,
  kos: 0,
  boost: 0,
  stunned: false,
  shield: 0,
  survive: false,
  reflect: false,
  freeSwap: false,
  multiplier: 1,
  extraTurn: false,
  playedTreasure: false,
  diceUsed: false,
})

/**
 * Open a match. `first` decides who moves first — the caller picks it (a coin
 * flip online, always the human in solo) so this stays deterministic.
 */
export function startDuel(a: DuelSeed, b: DuelSeed, first = 0): DuelState {
  const state: DuelState = {
    sides: [freshSide(a), freshSide(b)],
    turn: first,
    turnNo: 0,
    seq: 0,
    log: [],
    winnerId: null,
    over: false,
  }
  beginTurn(state)
  return state
}

/** Top up the mover's energy and expire the protections that covered the other turn. */
function beginTurn(state: DuelState) {
  const side = state.sides[state.turn]
  side.energy = Math.min(MAX_ENERGY, side.energy + ENERGY_PER_TURN)
  side.shield = 0
  side.survive = false
  side.reflect = false
  side.playedTreasure = false
}

// --- reading a position -----------------------------------------------------

export const activeCard = (side: DuelSide): DuelCard | undefined => side.cards[0]
export const benchCards = (side: DuelSide) => side.cards.slice(1)

/** Is the Grand Line storm up? Every hit lands double once it is. */
export const stormActive = (state: DuelState) => state.turnNo >= STORM_TURN
/** Turns until the storm — the arena counts it down so it never arrives as a surprise. */
export const turnsToStorm = (state: DuelState) => Math.max(0, STORM_TURN - state.turnNo)

/** Damage this attack would do right now, and whether the weakness ring doubled it. */
export function previewDamage(
  state: DuelState,
  sideIndex: number,
  attackIndex: number,
): { damage: number; weak: boolean } {
  const me = state.sides[sideIndex]
  const them = state.sides[1 - sideIndex]
  const mine = activeCard(me)
  const theirs = activeCard(them)
  const attack = mine ? statsFor(mine.id).attacks[attackIndex] : undefined
  if (!mine || !theirs || !attack) return { damage: 0, weak: false }
  const weak = isWeakTo(statsFor(mine.id).element, statsFor(theirs.id).element)
  // Order matters and is deliberate: flat bonuses first, then the weakness ring,
  // then treasure multipliers, then the storm. A boosted Haki hit into a
  // weakness during the storm is the biggest number in the game — as it should be.
  let damage = (attack.damage + me.boost) * (weak ? 2 : 1) * me.multiplier
  if (stormActive(state)) damage *= 2
  return { damage: Math.round(damage), weak }
}

/** Can this side use that attack right now? */
export function canAttack(state: DuelState, sideIndex: number, attackIndex: number): boolean {
  const me = state.sides[sideIndex]
  const mine = activeCard(me)
  if (!mine || me.stunned) return false
  const attack = statsFor(mine.id).attacks[attackIndex]
  return Boolean(attack) && me.energy >= attack.cost
}

/** Energy it costs this side to pull its front-line card back (free under Following Wind). */
export function retreatCost(side: DuelSide): number {
  if (side.freeSwap) return 0
  const mine = activeCard(side)
  return mine ? statsFor(mine.id).retreat : 0
}

export function canSwap(state: DuelState, sideIndex: number, to: number): boolean {
  const me = state.sides[sideIndex]
  return to > 0 && to < me.cards.length && me.energy >= retreatCost(me)
}

/**
 * The dice unlocks on your LAST STAND — when one more knockout ends it — and
 * fires once a match.
 *
 * Deliberately keyed on the opponent's knockout count, not on how many cards you
 * have left: with a 4-card deck and 3 knockouts to win, being "down to your last
 * card" is a position that never exists, because the match ends on the knockout
 * that gets you there. This is the real edge of defeat.
 */
export const canRollDice = (state: DuelState, sideIndex: number): boolean => {
  const them = state.sides[1 - sideIndex]
  const me = state.sides[sideIndex]
  return !state.over && !me.diceUsed && them.kos >= KOS_TO_WIN - 1
}

export const canPlayTreasure = (state: DuelState, sideIndex: number): boolean =>
  !state.over && !state.sides[sideIndex].playedTreasure && state.sides[sideIndex].hand.length > 0

/** Every move the side to move may legally make. Never empty — focus is always available. */
export function legalMoves(state: DuelState): DuelMove[] {
  if (state.over) return []
  const i = state.turn
  const me = state.sides[i]
  const mine = activeCard(me)
  const moves: DuelMove[] = [{ kind: 'focus' }]
  if (canRollDice(state, i)) moves.push({ kind: 'dice' })
  if (canPlayTreasure(state, i)) me.hand.forEach((_, hi) => moves.push({ kind: 'treasure', index: hi }))
  if (!mine) return moves
  statsFor(mine.id).attacks.forEach((_, ai) => {
    if (canAttack(state, i, ai)) moves.push({ kind: 'attack', attack: ai })
  })
  me.cards.forEach((_, ci) => {
    if (canSwap(state, i, ci)) moves.push({ kind: 'swap', to: ci })
  })
  return moves
}

// --- playing a move ---------------------------------------------------------

const clone = (state: DuelState): DuelState => JSON.parse(JSON.stringify(state))

/**
 * Land `amount` on a side's front-liner, honouring Rubber Guard and Iron Body,
 * and retiring the card if it falls. The single place damage is ever applied, so
 * an attack and a Buster Call can't drift apart.
 *
 * Returns the knocked-out card, if any.
 */
function dealDamage(target: DuelSide, attacker: DuelSide, raw: number): DuelCard | null {
  const card = activeCard(target)
  if (!card || raw <= 0) return null
  const amount = Math.max(0, raw - target.shield)
  target.shield = Math.max(0, target.shield - raw)
  card.hp = Math.max(target.survive ? 1 : 0, card.hp - amount)
  if (card.hp > 0) return null
  target.cards.shift()
  target.fallen.push(card)
  // Clamped: a sweep card can down three cards in one go, and the knockout
  // count is a scoreboard the UI draws KOS_TO_WIN pips for — not a tally.
  attacker.kos = Math.min(KOS_TO_WIN, attacker.kos + 1)
  return card
}

/**
 * Play one move for whoever is to move, and hand back the next position.
 * Invalid moves are ignored (the state comes back untouched) rather than
 * throwing — a stale tap on a slow connection shouldn't crash a match.
 *
 * Treasures and the dice are FREE: they resolve and leave the turn with you.
 * Everything else is your action and hands over.
 */
export function applyMove(prev: DuelState, move: DuelMove): DuelState {
  if (prev.over) return prev
  const state = clone(prev)
  const i = state.turn
  const me = state.sides[i]
  const them = state.sides[1 - i]

  // --- free plays: resolve, then hand the turn straight back ----------------
  if (move.kind === 'treasure') {
    if (!canPlayTreasure(prev, i)) return prev
    const id = me.hand[move.index]
    const card = id ? treasureById(id) : undefined
    if (!card) return prev
    me.hand.splice(move.index, 1)
    me.playedTreasure = true
    const entry: DuelLogEntry = { by: me.profileId, text: `${card.icon} ${me.name} played ${card.name}!`, treasureId: id }
    resolveFx(state, i, card.fx, entry)
    state.log.push(entry)
    finish(state)
    return commit(state)
  }

  if (move.kind === 'dice') {
    if (!canRollDice(prev, i)) return prev
    me.diceUsed = true
    const face = rollDice()
    const rolled = DICE_FACES[face]
    const entry: DuelLogEntry = {
      by: me.profileId,
      text: `🎲 ${me.name} rolled ${rolled.pip} ${rolled.name} — ${rolled.text}`,
      diceFace: face,
    }
    resolveFx(state, i, rolled.fx, entry)
    state.log.push(entry)
    finish(state)
    return commit(state)
  }

  // --- the turn's one action ------------------------------------------------
  const mine = activeCard(me)
  if (!mine) return prev

  if (move.kind === 'attack') {
    if (!canAttack(prev, i, move.attack)) return prev
    const stats = statsFor(mine.id)
    const attack = stats.attacks[move.attack]
    if (!activeCard(them)) return prev

    me.energy -= attack.cost
    const { damage, weak } = previewDamage(prev, i, move.attack)
    me.boost = 0 // a boost is spent by the next attack, hit or miss

    const entry: DuelLogEntry = {
      by: me.profileId,
      text: `${cardName(mine.id)} used ${attack.name} — ${damage} damage${weak ? ' (weakness ×2!)' : ''}`,
      cardId: mine.id,
      attackIndex: move.attack,
      damage,
    }
    if (weak) entry.weak = true

    // Mirror Coating: they turned the blow around before it ever landed.
    if (them.reflect) {
      them.reflect = false
      entry.text += ` — 🪞 reflected straight back!`
      const fell = dealDamage(me, them, damage)
      if (fell) {
        entry.ko = true
        entry.koId = fell.id
        entry.text += ` ${cardName(fell.id)} is down!`
      }
    } else {
      const fell = dealDamage(them, me, damage)
      applyAttackEffect(attack, me, them, mine, damage, entry)
      if (fell) {
        entry.ko = true
        entry.koId = fell.id
        entry.text += ` — ${cardName(fell.id)} is down!`
      }
    }
    state.log.push(entry)
  } else if (move.kind === 'swap') {
    if (!canSwap(prev, i, move.to)) return prev
    me.energy -= retreatCost(me)
    const incoming = me.cards[move.to]
    me.cards[move.to] = me.cards[0]
    me.cards[0] = incoming
    state.log.push({ by: me.profileId, text: `${me.name} sent out ${cardName(incoming.id)}!` })
  } else {
    me.energy = Math.min(MAX_ENERGY, me.energy + FOCUS_ENERGY)
    const healed = Math.min(mine.max - mine.hp, FOCUS_HEAL)
    mine.hp += healed
    state.log.push({
      by: me.profileId,
      text: `${cardName(mine.id)} caught its breath — +${FOCUS_ENERGY} energy${healed ? ` and +${healed} HP` : ''}`,
    })
  }

  // the stun this side was carrying expires with the turn it cost them, and the
  // turn-scoped treasure buffs expire with the action they were bought for
  me.stunned = false
  me.multiplier = 1
  me.freeSwap = false
  state.turnNo += 1
  finish(state)
  if (!state.over) {
    if (me.extraTurn) {
      // Time Skip: keep the turn. Deliberately NOT a full beginTurn — the
      // protections you bought are meant to cover their turn, and they haven't
      // had one yet, so taking them away here would punish the card.
      me.extraTurn = false
      me.playedTreasure = false
      me.energy = Math.min(MAX_ENERGY, me.energy + ENERGY_PER_TURN)
      state.log.push({ by: me.profileId, text: `⏭️ ${me.name} takes another turn!` })
    } else {
      state.turn = 1 - i
      beginTurn(state)
    }
  }
  return commit(state)
}

/**
 * Close out a move: stamp it so watchers can tell something happened, and keep
 * the log to what the panel can show (a full match is otherwise ~60 lines).
 * Every path that returns a NEW position goes through here.
 */
function commit(state: DuelState): DuelState {
  state.seq = (state.seq ?? 0) + 1
  if (state.log.length > 12) state.log = state.log.slice(-12)
  return state
}

/**
 * Resolve a treasure card or dice face for `sideIndex`. Every primitive in
 * TreasureFx is handled here and nowhere else, so a new card is a data change.
 */
function resolveFx(state: DuelState, sideIndex: number, fx: TreasureFx, entry: DuelLogEntry) {
  const me = state.sides[sideIndex]
  const them = state.sides[1 - sideIndex]
  const mine = activeCard(me)
  const say = (s: string) => {
    entry.text += ` ${s}`
  }

  if (fx.heal && mine) {
    const healed = Math.min(mine.max - mine.hp, fx.heal)
    mine.hp += healed
    if (healed) say(`+${healed} HP.`)
  }
  if (fx.healAll) {
    let total = 0
    for (const c of me.cards) {
      const healed = Math.min(c.max - c.hp, fx.healAll)
      c.hp += healed
      total += healed
    }
    if (total) say(`+${total} HP across the crew.`)
  }
  if (fx.maxHp && mine) {
    mine.max += fx.maxHp
    mine.hp += fx.maxHp
    say(`+${fx.maxHp} max HP.`)
  }
  if (fx.energy) {
    me.energy = Math.min(MAX_ENERGY, me.energy + fx.energy)
  }
  if (fx.theirEnergy) {
    them.energy = fx.theirEnergy <= -99 ? 0 : Math.max(0, Math.min(MAX_ENERGY, them.energy + fx.theirEnergy))
    if (fx.theirEnergy <= -99) say('Their energy is gone!')
  }
  if (fx.boost) me.boost += fx.boost
  if (fx.double) me.multiplier = Math.max(me.multiplier, fx.double)
  if (fx.stun) {
    them.stunned = true
    say(`${them.name} is stunned!`)
  }
  if (fx.clearStun) me.stunned = false
  if (fx.shield) me.shield += fx.shield
  if (fx.survive) me.survive = true
  if (fx.reflect) me.reflect = true
  if (fx.freeSwap) me.freeSwap = true
  if (fx.extraTurn) me.extraTurn = true
  if (fx.draw) {
    const room = Math.max(0, HAND_CAP - me.hand.length)
    const drawn = drawTreasures(Math.min(fx.draw, room))
    me.hand.push(...drawn)
    say(drawn.length ? `Drew ${drawn.length}.` : 'Hand is full!')
  }
  if (fx.revive) {
    const back = me.fallen.pop()
    if (back) {
      // returns at half HP, and gives the opponent their knockout back — a
      // revive that didn't undo the KO would end matches that look unwinnable
      back.hp = Math.max(1, Math.floor(back.max / 2))
      me.cards.push(back)
      them.kos = Math.max(0, them.kos - 1)
      say(`🕊️ ${cardName(back.id)} rises again!`)
    } else {
      say('Nobody to bring back.')
    }
  }
  if (fx.scatter && them.cards.length > 1) {
    const pick = 1 + Math.floor(Math.random() * (them.cards.length - 1))
    const incoming = them.cards[pick]
    them.cards[pick] = them.cards[0]
    them.cards[0] = incoming
    say(`${cardName(incoming.id)} is dragged to the front!`)
  }
  if (fx.damage) {
    const fell = dealDamage(them, me, fx.damage)
    entry.damage = (entry.damage ?? 0) + fx.damage
    if (fell) {
      entry.ko = true
      entry.koId = fell.id
      say(`${cardName(fell.id)} is down!`)
    }
  }
  if (fx.damageAll) {
    let downed = 0
    for (let n = 0; n < them.cards.length; n++) {
      // Rubber Guard and Iron Body only ever protected the front line, so a
      // sweep still lands in full on the bench behind it
      const amount = n === 0 ? Math.max(0, fx.damageAll - them.shield) : fx.damageAll
      if (n === 0) them.shield = Math.max(0, them.shield - fx.damageAll)
      them.cards[n].hp = Math.max(n === 0 && them.survive ? 1 : 0, them.cards[n].hp - amount)
    }
    // retire back to front, so removing one can't shift the index of the next
    for (let n = them.cards.length - 1; n >= 0; n--) {
      if (them.cards[n].hp > 0) continue
      const [gone] = them.cards.splice(n, 1)
      them.fallen.push(gone)
      me.kos = Math.min(KOS_TO_WIN, me.kos + 1)
      downed++
      entry.koId = gone.id
    }
    entry.damage = (entry.damage ?? 0) + fx.damageAll
    if (downed) {
      entry.ko = true
      say(`${downed} card${downed === 1 ? '' : 's'} went down!`)
    }
  }
}

/** Finisher riders: heal, power-up, stun, drain. Mutates the two sides. */
function applyAttackEffect(
  attack: CardAttack,
  me: DuelSide,
  them: DuelSide,
  mine: DuelCard,
  damage: number,
  entry: DuelLogEntry,
) {
  if (!attack.effect) return
  entry.effect = attack.effect
  if (attack.effect === 'heal') {
    const healed = Math.min(mine.max - mine.hp, attack.amount ?? 0)
    mine.hp += healed
    if (healed) entry.text += ` · healed ${healed}`
  } else if (attack.effect === 'drain') {
    const healed = Math.min(mine.max - mine.hp, Math.floor(damage / 2))
    mine.hp += healed
    if (healed) entry.text += ` · drained ${healed}`
  } else if (attack.effect === 'boost') {
    me.boost = attack.amount ?? 0
    entry.text += ` · next attack +${me.boost}`
  } else if (attack.effect === 'stun') {
    them.stunned = true
    entry.text += ` · ${them.name} is stunned!`
  }
}

/**
 * Decide whether the match is over. Three ways out: enough knockouts, a wiped
 * board, or the turn limit — which is settled on knockouts, then on how much HP
 * is still standing, so it can only ever be a real result.
 */
function finish(state: DuelState) {
  const [a, b] = state.sides
  const totalHp = (s: DuelSide) => s.cards.reduce((n, c) => n + c.hp, 0)

  if (a.kos >= KOS_TO_WIN || b.cards.length === 0) {
    state.over = true
    state.winnerId = a.profileId
  } else if (b.kos >= KOS_TO_WIN || a.cards.length === 0) {
    state.over = true
    state.winnerId = b.profileId
  } else if (state.turnNo >= TURN_LIMIT) {
    state.over = true
    const score = (s: DuelSide) => s.kos * 10_000 + totalHp(s)
    state.winnerId = score(a) === score(b) ? null : score(a) > score(b) ? a.profileId : b.profileId
  }
  if (state.over) {
    const winner = state.sides.find((s) => s.profileId === state.winnerId)
    state.log.push({
      by: state.winnerId ?? '',
      text: winner ? `🏴‍☠️ ${winner.name} wins the duel!` : 'A dead heat — nobody takes the flag.',
      final: true,
    })
  }
}

// --- the ship's training dummy (solo opponent) ------------------------------

/**
 * Pick a move for the side to move. Plays a decent game without being airtight:
 * it spends a treasure when it clearly helps, rolls the dice on its last card,
 * takes a knockout when one is on the table, pulls back a card that is nearly
 * done for, holds a turn when the finisher is worth the wait, and otherwise
 * swings the hardest punch it can afford.
 *
 * What it deliberately does NOT do is plan more than one turn ahead, read the
 * bench, save its legendaries for the right moment, or play around the weakness
 * ring on defence. Those are the gaps a human can exploit, and finding them is
 * half the fun.
 */
export function aiMove(state: DuelState): DuelMove {
  const i = state.turn
  const me = state.sides[i]
  const them = state.sides[1 - i]
  const mine = activeCard(me)
  const theirs = activeCard(them)

  // a free comeback roll is never wrong
  if (canRollDice(state, i)) return { kind: 'dice' }

  // treasures are free, so the only question is whether this one does anything
  if (canPlayTreasure(state, i) && mine) {
    const hurt = mine.hp <= mine.max * 0.45
    const pick = me.hand.findIndex((id) => {
      const fx = treasureById(id)?.fx
      if (!fx) return false
      if (fx.heal || fx.healAll || fx.maxHp) return hurt
      if (fx.revive) return me.fallen.length > 0
      if (fx.draw) return me.hand.length < HAND_CAP
      if (fx.damage || fx.damageAll) return true
      if (fx.stun || fx.double || fx.boost || fx.energy) return true
      return !hurt // the protections are worth least when it's already dying
    })
    if (pick >= 0) return { kind: 'treasure', index: pick }
  }

  if (mine && theirs) {
    const stats = statsFor(mine.id)
    const moves = legalMoves(state)
    const attacks = moves.filter((m): m is { kind: 'attack'; attack: number } => m.kind === 'attack')
    const scored = attacks
      .map((m) => ({ move: m, ...previewDamage(state, i, m.attack) }))
      .sort((x, y) => y.damage - x.damage)

    // a knockout on the table is always worth taking, cheapest one first
    const lethal = scored.filter((s) => s.damage >= theirs.hp)
    if (lethal.length > 0) {
      const cheapest = lethal.sort(
        (x, y) => stats.attacks[x.move.attack].cost - stats.attacks[y.move.attack].cost,
      )[0]
      return cheapest.move
    }

    // nearly dead and there's a healthier card on the bench: pull back
    if (mine.hp <= mine.max * 0.25) {
      const swaps = moves.filter((m): m is { kind: 'swap'; to: number } => m.kind === 'swap')
      const best = swaps.map((m) => ({ move: m, hp: me.cards[m.to].hp })).sort((x, y) => y.hp - x.hp)[0]
      if (best && best.hp > mine.hp * 2) return best.move
    }

    const best = scored[0]
    // Hold the turn when a finisher it can't afford yet is worth more than two
    // of what it can — one focus buys the energy, and focus heals on the way.
    const saveable = stats.attacks
      .map((a, ai) => ({ a, ai }))
      .filter(({ a }) => a.cost > me.energy && a.cost <= me.energy + ENERGY_PER_TURN + FOCUS_ENERGY)
      .map(({ ai }) => previewDamage(state, i, ai).damage)
      .sort((x, y) => y - x)[0]
    if (saveable && (!best || saveable > best.damage * 2)) return { kind: 'focus' }

    if (best) return best.move
  }
  return { kind: 'focus' }
}

/** The three crews waiting in the training hall — solo play, no Firestore involved. */
export const AI_OPPONENTS = [
  {
    id: 'dummy',
    name: 'Training Dummy',
    emoji: '🎯',
    blurb: 'Straw dummies from the deck. Good for learning the buttons.',
    /** Where in the catalog (sorted weakest → strongest) this crew's cards come from. */
    band: [0, 0.4] as [number, number],
  },
  {
    id: 'marines',
    name: 'Marine Squad',
    emoji: '⚓',
    blurb: 'A real fight. Mixed crew, no favours.',
    band: [0.3, 0.8] as [number, number],
  },
  {
    id: 'yonko',
    name: 'Yonko Crew',
    emoji: '👑',
    blurb: 'The strongest cards in the sea. Bring your best.',
    band: [0.75, 1] as [number, number],
  },
]

export type AiOpponent = (typeof AI_OPPONENTS)[number]

const cardPower = (id: string) => {
  const s = statsFor(id)
  return s.hp + s.attacks.reduce((n, a) => n + a.damage, 0)
}

/** The catalog ranked weakest → strongest; the solo crews are dealt out of slices of it. */
const STICKER_IDS_BY_POWER = [...ALL_STICKER_IDS].sort((a, b) => cardPower(a) - cardPower(b))

/**
 * Deal a solo opponent a hand from its power band, so the Dummy really is
 * beatable and the Yonko really aren't a pushover. Drawn from the WHOLE catalog
 * — you don't have to own a card to be hit by it.
 */
export function aiDeck(opponent: AiOpponent): string[] {
  const ranked = STICKER_IDS_BY_POWER
  const from = Math.floor(ranked.length * opponent.band[0])
  const to = Math.max(from + DECK_SIZE, Math.floor(ranked.length * opponent.band[1]))
  const pool = ranked.slice(from, to)
  const picked: string[] = []
  while (picked.length < DECK_SIZE && pool.length > 0) {
    picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1))
  }
  // a catalog smaller than a deck would otherwise field an empty crew
  while (picked.length < DECK_SIZE && ranked.length > 0) picked.push(ranked[picked.length % ranked.length])
  return picked
}

// --- deck helpers -----------------------------------------------------------

/** Cards this album can field — you battle with what you've actually collected. */
export function battleReady(counts: Record<string, number>): string[] {
  return Object.keys(counts).filter((id) => (counts[id] ?? 0) > 0 && stickerById(id))
}

export const deckReady = (deck: string[]) => deck.length === DECK_SIZE

/**
 * A legal deck built from what's owned — used to fill in a first deck and to
 * repair one that references cards traded away since. Picks the highest total
 * of HP + finisher damage, so the suggestion is a genuinely decent team.
 */
export function autoDeck(counts: Record<string, number>, prefer: string[] = []): string[] {
  const owned = battleReady(counts)
  const kept = prefer.filter((id) => owned.includes(id)).slice(0, DECK_SIZE)
  const rest = owned.filter((id) => !kept.includes(id)).sort((a, b) => cardPower(b) - cardPower(a))
  return [...kept, ...rest].slice(0, DECK_SIZE)
}
