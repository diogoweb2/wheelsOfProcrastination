// The ONE PIECE Card Game — the real one, by the published comprehensive rules.
//
// Same contract as logic/chess.ts, logic/checkers.ts and logic/seaBattle.ts:
// pure JSON-only functions, no React, no Firestore, `null` never `undefined`,
// and no nested arrays anywhere (Firestore rejects them). That is what lets one
// engine drive a solo match against the AI held in React state and a live match
// against Ben running through a single shared document.
//
// What the engine enforces (§ numbers are the comprehensive rules):
//   • the turn: Refresh → Draw → DON!! → Main → End (§6)
//   • DON!! — 10 in the DON!! deck, 2 added per turn (1 on the first player's
//     first turn), rested to pay costs, or GIVEN to a Leader/Character for
//     +1000 power until the end of the turn (§7)
//   • playing Characters (5 on the field, the 6th needs one trashed), Stages
//     (one at a time) and Events (§9)
//   • attacking: only an active card, never on the turn it was played unless it
//     has [Rush]; a Character may only be attacked while RESTED (§8)
//   • [Blocker], the Counter step (Counter values off cards in hand and
//     [Counter] events), [Double Attack], [Banish] (§8, §10)
//   • damage: the top Life card goes to hand, and its [Trigger] may be used;
//     a hit on a Leader with no Life left ends the game (§4, §11)
//   • decking out loses (§6-2)
//
// What it does NOT do: read the effect box of all ~2600 cards. Effects are
// hand-written per card in logic/optcgEffects.ts, which starts with the two
// curated starter decks and grows a card at a time. Everything else is legal to
// build and play — the engine simply shows its text and lets the players honour
// it, exactly like a card whose ruling you look up at the table.
// --- cards --------------------------------------------------------------------

export type OptcgKind = 'leader' | 'character' | 'event' | 'stage'
export type OptcgColor = 'red' | 'green' | 'blue' | 'purple' | 'black' | 'yellow'

export interface OptcgCard {
  /** `OP01-006` — the printed code, and this catalog's primary key. */
  code: string
  name: string
  kind: OptcgKind
  /** One entry, or two for a dual-colour card. Decides deck legality. */
  colors: string[]
  /** The type line, split: `Animal`, `Straw Hat Crew`. */
  types: string[]
  cost: number
  power: number
  /** Counter value playable from hand during the Counter step. 0 = no counter. */
  counter: number
  /** `Slash`, `Strike`, … — flavour today, effect fodder later. */
  attribute: string
  rarity: string
  effect: string
  trigger: string
  /** How many printed arts exist, base included. */
  arts: number
  /** Leaders only: starting Life. */
  life?: number
  /** On the ban list — buildable to look at, refused by the deck checker. */
  banned?: boolean
}

/**
 * The card index, filled in by logic/optcgCards.ts when the card game screen
 * loads. It is NOT imported here on purpose: the generated catalog is ~1 MB,
 * larger than the rest of the app put together, and the store imports this
 * module — so importing it here would drag the whole catalog into the main
 * bundle for everyone, card game or not.
 */
const BY_CODE = new Map<string, OptcgCard>()

export function registerCards(cards: OptcgCard[]): void {
  for (const c of cards) BY_CODE.set(c.code, c)
}

export const cardByCode = (code: string): OptcgCard | undefined => BY_CODE.get(code)
/** Never throws: an unknown code renders as a blank card rather than a crash. */
export function card(code: string): OptcgCard {
  return BY_CODE.get(code) ?? { code, name: code, kind: 'character', colors: [], types: [], cost: 0, power: 0, counter: 0, attribute: '', rarity: '', effect: '', trigger: '', arts: 1 }
}

// --- art ----------------------------------------------------------------------

const SET_OF = (code: string) => code.slice(0, code.lastIndexOf('-'))

/**
 * Card art, straight off a public mirror — NOTHING is stored on our server.
 *
 * The publisher's own image host sends `Cross-Origin-Resource-Policy:
 * same-site`, so a browser refuses to paint those PNGs on our origin: an <img>
 * pointed at it fails silently. These two mirrors send no such header, so every
 * card gets a primary and a fallback and the card component swaps on error.
 */
export const artUrl = (code: string): string =>
  `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/${SET_OF(code)}/${code}_EN.webp`
export const artFallbackUrl = (code: string): string =>
  `https://static.dotgg.gg/onepiece/card/${code}.webp`

// --- keywords -----------------------------------------------------------------

/** Keywords the engine itself acts on, read straight off the printed text. */
export const hasKeyword = (c: OptcgCard, word: string): boolean => c.effect.includes(`[${word}]`)
export const isBlocker = (c: OptcgCard) => hasKeyword(c, 'Blocker')
export const hasRush = (c: OptcgCard) => hasKeyword(c, 'Rush')
export const hasDoubleAttack = (c: OptcgCard) => hasKeyword(c, 'Double Attack')
export const hasBanish = (c: OptcgCard) => hasKeyword(c, 'Banish')

// --- state --------------------------------------------------------------------

export type OptcgSide = 'p1' | 'p2'
export const other = (s: OptcgSide): OptcgSide => (s === 'p1' ? 'p2' : 'p1')

/** One card standing on the field. `uid` is stable for the life of the card. */
export interface OptcgUnit {
  uid: string
  code: string
  rested: boolean
  /** DON!! cards given to it: +1000 power each, until the end of the turn. */
  don: number
  /** Played this turn — cannot attack unless it has [Rush]. */
  sick: boolean
  /** Power granted by an effect this turn, in raw power (can be negative). */
  buff: number
  /** [Once Per Turn] effects already used this turn, by tag. */
  used: string[]
}

export interface OptcgPlayer {
  name: string
  leader: string
  leaderRested: boolean
  leaderDon: number
  leaderBuff: number
  leaderUsed: string[]
  /** Top of the deck is index 0. */
  deck: string[]
  hand: string[]
  /** Face-down Life, index 0 on top — the next card damage takes. */
  life: string[]
  trash: string[]
  chars: OptcgUnit[]
  stage: OptcgUnit | null
  /** DON!! still waiting in the DON!! deck. Starts at 10. */
  donDeck: number
  /** Active (usable) and rested (spent) DON!! sitting in the cost area. */
  donActive: number
  donRested: number
  /** Mulligan decision taken. */
  kept: boolean
}

/** The attack being resolved, or null outside a battle. */
export interface OptcgBattle {
  by: OptcgSide
  /** `'leader'` or a unit uid. */
  attacker: string
  target: string
  /** Counter power the defender has stacked on this battle. */
  counter: number
  /** A [Blocker] took the hit — the original target is off the hook. */
  blocked: boolean
}

export type OptcgPhase =
  /** Both players still deciding on their opening hand. */
  | 'mulligan'
  | 'main'
  /** Defender may declare a [Blocker]. */
  | 'block'
  /** Defender may play Counter cards. */
  | 'counter'
  /** Defender was dealt damage and may use the revealed card's [Trigger]. */
  | 'trigger'
  | 'over'

export interface OptcgLog {
  by: OptcgSide
  text: string
}

export interface OptcgState {
  kind: 'optcg'
  p1: OptcgPlayer
  p2: OptcgPlayer
  turn: OptcgSide
  /** Who took the first turn — they skip their first draw and get 1 DON!!. */
  first: OptcgSide
  /** 1-based; both players' turns count up, so turn 1 and 2 are the openers. */
  turnNo: number
  phase: OptcgPhase
  battle: OptcgBattle | null
  /** The Life card damage just revealed, waiting on its [Trigger] answer. */
  reveal: string
  over: boolean
  winner: OptcgSide | null
  log: OptcgLog[]
  /** Bumped on every change, so a live match can tell a new position from a redraw. */
  seq: number
}

// --- deck legality -------------------------------------------------------------

/** Berries the winner of a head-to-head takes, matching the other games' scale. */
export const OPTCG_REWARD = 25
/** Berries a win over the AI pays, for the first few of the day only. */
export const OPTCG_SOLO_REWARD = 8
export const OPTCG_SOLO_LIMIT = 3

export const DECK_SIZE = 50
export const MAX_COPIES = 4
export const DON_DECK = 10
export const FIELD_LIMIT = 5
export const OPENING_HAND = 5

export interface OptcgDeck {
  id: string
  name: string
  leader: string
  /** 50 card codes, repeats included. */
  cards: string[]
}

/** Every reason this deck may not be played, in plain words. Empty = legal. */
export function deckProblems(deck: OptcgDeck): string[] {
  const out: string[] = []
  const leader = cardByCode(deck.leader)
  if (!leader || leader.kind !== 'leader') return ['Pick a Leader card.']
  if (deck.cards.length !== DECK_SIZE) out.push(`${deck.cards.length} of ${DECK_SIZE} cards.`)
  const counts = new Map<string, number>()
  for (const code of deck.cards) counts.set(code, (counts.get(code) ?? 0) + 1)
  for (const [code, n] of counts) {
    const c = cardByCode(code)
    if (!c) { out.push(`Unknown card ${code}.`); continue }
    if (c.kind === 'leader') out.push(`${c.name} is a Leader — only the Leader slot takes one.`)
    if (n > MAX_COPIES) out.push(`${n} copies of ${c.name} (max ${MAX_COPIES}).`)
    if (c.banned) out.push(`${c.name} (${code}) is banned.`)
    if (!c.colors.some((col) => leader.colors.includes(col)))
      out.push(`${c.name} is ${c.colors.join('/')} — off your Leader's colours.`)
  }
  return out
}

export const deckLegal = (deck: OptcgDeck) => deckProblems(deck).length === 0

// --- setup ---------------------------------------------------------------------

const shuffle = <T,>(a: T[]): T[] => {
  const out = [...a]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

let uidSeq = 0
/** Field-unique, and stable inside one match; never read for meaning. */
const newUid = (code: string) => `${code}#${(uidSeq = (uidSeq + 1) % 100000)}-${Math.floor(Math.random() * 1000)}`

function setup(deck: OptcgDeck, name: string): OptcgPlayer {
  const leader = card(deck.leader)
  const shuffled = shuffle(deck.cards)
  const life = shuffled.splice(0, leader.life ?? 5)
  const hand = shuffled.splice(0, OPENING_HAND)
  return {
    name,
    leader: deck.leader,
    leaderRested: false,
    leaderDon: 0,
    leaderBuff: 0,
    leaderUsed: [],
    deck: shuffled,
    hand,
    life,
    trash: [],
    chars: [],
    stage: null,
    donDeck: DON_DECK,
    donActive: 0,
    donRested: 0,
    kept: false,
  }
}

export function newMatch(d1: OptcgDeck, d2: OptcgDeck, n1: string, n2: string, first: OptcgSide = 'p1'): OptcgState {
  return {
    kind: 'optcg',
    p1: setup(d1, n1),
    p2: setup(d2, n2),
    turn: first,
    first,
    turnNo: 1,
    phase: 'mulligan',
    battle: null,
    reveal: '',
    over: false,
    winner: null,
    log: [],
    seq: 0,
  }
}

const clone = (s: OptcgState): OptcgState => JSON.parse(JSON.stringify(s)) as OptcgState
const note = (s: OptcgState, by: OptcgSide, text: string) => {
  s.log = [...s.log.slice(-40), { by, text }]
  s.seq++
}

/**
 * Take the opening hand, or shuffle it back and draw five fresh ones — the one
 * mulligan each player gets (§5-2). The first turn begins once both have answered.
 */
export function mulligan(state: OptcgState, side: OptcgSide, redraw: boolean): OptcgState {
  const s = clone(state)
  const p = s[side]
  if (s.phase !== 'mulligan' || p.kept) return state
  if (redraw) {
    p.deck = shuffle([...p.deck, ...p.hand])
    p.hand = p.deck.splice(0, OPENING_HAND)
  }
  p.kept = true
  note(s, side, redraw ? `${p.name} takes a new hand.` : `${p.name} keeps their hand.`)
  if (s.p1.kept && s.p2.kept) startTurn(s, s.first)
  return s
}

// --- the turn -------------------------------------------------------------------

/** Refresh, Draw and DON!! run themselves; the player is handed the Main phase. */
function startTurn(s: OptcgState, side: OptcgSide): void {
  const p = s[side]
  // Refresh: DON!! given out comes home, and everything stands up.
  p.donActive += p.donRested + p.leaderDon + p.chars.reduce((n, c) => n + c.don, 0)
  p.donRested = 0
  p.leaderDon = 0
  p.leaderRested = false
  p.leaderBuff = 0
  p.leaderUsed = []
  for (const c of p.chars) { c.rested = false; c.don = 0; c.sick = false; c.buff = 0; c.used = [] }
  if (p.stage) { p.stage.rested = false; p.stage.used = [] }
  // Draw — except the very first turn of the player who went first.
  const opening = s.turnNo === 1 && side === s.first
  if (!opening) {
    if (p.deck.length === 0) { finish(s, other(side), `${p.name} has no cards left to draw.`); return }
    p.hand.push(p.deck.shift() as string)
  }
  // DON!!: two a turn, one on that same opening turn.
  const add = Math.min(opening ? 1 : 2, p.donDeck)
  p.donDeck -= add
  p.donActive += add
  s.phase = 'main'
  s.turn = side
  note(s, side, `${p.name}'s turn — +${add} DON!!`)
}

export function endTurn(state: OptcgState): OptcgState {
  const s = clone(state)
  if (s.over || s.phase !== 'main') return state
  const next = other(s.turn)
  s.turnNo++
  startTurn(s, next)
  return s
}

function finish(s: OptcgState, winner: OptcgSide, why: string): void {
  s.over = true
  s.winner = winner
  s.phase = 'over'
  note(s, winner, `${s[winner].name} wins — ${why}`)
}

export function resign(state: OptcgState, side: OptcgSide): OptcgState {
  const s = clone(state)
  finish(s, other(side), `${s[side].name} struck their flag.`)
  return s
}

// --- power ------------------------------------------------------------------------

/**
 * Printed power boosts that a card's own text grants ("[DON!! x1] this
 * Character gains +1000 power"). Those live in logic/optcgEffects.ts, which
 * registers itself here — the engine stays free of card text, and a card with
 * no script simply adds nothing.
 */
export type StaticPower = (p: OptcgPlayer, ref: string) => number
let statics: StaticPower = () => 0
export const registerStatics = (fn: StaticPower): void => { statics = fn }

/** A unit's power right now: printed, +1000 per DON!! given, plus effects. */
export function unitPower(p: OptcgPlayer, u: OptcgUnit): number {
  return card(u.code).power + u.don * 1000 + u.buff + statics(p, u.uid)
}
export function leaderPower(p: OptcgPlayer): number {
  return card(p.leader).power + p.leaderDon * 1000 + p.leaderBuff + statics(p, 'leader')
}
/** Power of whatever `ref` names on that side — `'leader'` or a unit uid. */
export function powerOf(p: OptcgPlayer, ref: string): number {
  if (ref === 'leader') return leaderPower(p)
  const u = p.chars.find((c) => c.uid === ref)
  return u ? unitPower(p, u) : 0
}

export const unit = (p: OptcgPlayer, uid: string): OptcgUnit | null => p.chars.find((c) => c.uid === uid) ?? null

// --- the Main phase ----------------------------------------------------------------

export const donAvailable = (p: OptcgPlayer): number => p.donActive

/** Can this card be paid for and does it have somewhere to go? */
export function canPlay(state: OptcgState, side: OptcgSide, handIndex: number): boolean {
  if (state.phase !== 'main' || state.turn !== side || state.over) return false
  const p = state[side]
  const c = cardByCode(p.hand[handIndex])
  if (!c) return false
  if (c.cost > p.donActive) return false
  // The 6th Character needs room made first; the UI asks which one leaves.
  if (c.kind === 'character' && p.chars.length >= FIELD_LIMIT) return false
  return true
}

/**
 * Play a card from hand: rest DON!! for its cost, then put it where it goes.
 * A Character arrives active but summoning-sick; a Stage replaces the old one;
 * an Event resolves and goes to the trash. Its written effect (if this card has
 * one scripted) is applied by the caller through logic/optcgEffects.ts.
 */
export function playCard(state: OptcgState, side: OptcgSide, handIndex: number): OptcgState {
  if (!canPlay(state, side, handIndex)) return state
  const s = clone(state)
  const p = s[side]
  const c = card(p.hand[handIndex])
  p.hand.splice(handIndex, 1)
  p.donActive -= c.cost
  p.donRested += c.cost
  if (c.kind === 'character') {
    p.chars.push({ uid: newUid(c.code), code: c.code, rested: false, don: 0, sick: true, buff: 0, used: [] })
  } else if (c.kind === 'stage') {
    if (p.stage) p.trash.push(p.stage.code)
    p.stage = { uid: newUid(c.code), code: c.code, rested: false, don: 0, sick: true, buff: 0, used: [] }
  } else {
    p.trash.push(c.code)
  }
  note(s, side, `${p.name} plays ${c.name}${c.cost ? ` (${c.cost})` : ''}.`)
  return s
}

/** Trash one of your own Characters — how you make room for a sixth (§9-3). */
export function trashOwn(state: OptcgState, side: OptcgSide, uid: string): OptcgState {
  const s = clone(state)
  const p = s[side]
  const i = p.chars.findIndex((c) => c.uid === uid)
  if (i < 0) return state
  const [gone] = p.chars.splice(i, 1)
  p.donActive += gone.don
  p.trash.push(gone.code)
  note(s, side, `${p.name} trashes ${card(gone.code).name}.`)
  return s
}

/**
 * Give an active DON!! card to your Leader or a Character: +1000 power until
 * the end of the turn (§7-3). The DON!! is rested while it sits there.
 */
export function giveDon(state: OptcgState, side: OptcgSide, ref: string): OptcgState {
  if (state.phase !== 'main' || state.turn !== side) return state
  const s = clone(state)
  const p = s[side]
  if (p.donActive < 1) return state
  if (ref === 'leader') p.leaderDon++
  else {
    const u = unit(p, ref)
    if (!u) return state
    u.don++
  }
  p.donActive--
  note(s, side, `${p.name} gives 1 DON!! (+1000).`)
  return s
}

// --- attacking ---------------------------------------------------------------------

/** Everything on this side that could attack right now. `'leader'` included. */
export function attackers(state: OptcgState, side: OptcgSide): string[] {
  if (state.phase !== 'main' || state.turn !== side || state.over) return []
  const p = state[side]
  const out: string[] = []
  if (!p.leaderRested && !(state.turnNo === 1 && side === state.first)) out.push('leader')
  for (const c of p.chars) {
    if (c.rested) continue
    if (c.sick && !hasRush(card(c.code))) continue
    out.push(c.uid)
  }
  return out
}

/** Legal targets for an attack: the Leader, or a RESTED Character (§8-2). */
export function targetsFor(state: OptcgState, side: OptcgSide): string[] {
  const foe = state[other(side)]
  return ['leader', ...foe.chars.filter((c) => c.rested).map((c) => c.uid)]
}

export function declareAttack(state: OptcgState, side: OptcgSide, attacker: string, target: string): OptcgState {
  if (!attackers(state, side).includes(attacker) || !targetsFor(state, side).includes(target)) return state
  const s = clone(state)
  const p = s[side]
  if (attacker === 'leader') p.leaderRested = true
  else {
    const u = unit(p, attacker)
    if (!u) return state
    u.rested = true
  }
  s.battle = { by: side, attacker, target, counter: 0, blocked: false }
  s.phase = 'block'
  const who = attacker === 'leader' ? card(p.leader).name : card(unit(p, attacker)?.code ?? '').name
  note(s, side, `${who} attacks ${target === 'leader' ? 'the Leader' : card(unit(s[other(side)], target)?.code ?? '').name}.`)
  return s
}

/** Active Characters with [Blocker] the defender may throw in front (§8-4). */
export function blockers(state: OptcgState): string[] {
  if (!state.battle || state.phase !== 'block') return []
  const d = state[other(state.battle.by)]
  return d.chars.filter((c) => !c.rested && c.uid !== state.battle?.target && isBlocker(card(c.code))).map((c) => c.uid)
}

export function block(state: OptcgState, uid: string): OptcgState {
  if (!blockers(state).includes(uid)) return state
  const s = clone(state)
  const b = s.battle as OptcgBattle
  const d = s[other(b.by)]
  const u = unit(d, uid) as OptcgUnit
  u.rested = true
  b.target = uid
  b.blocked = true
  s.phase = 'counter'
  note(s, other(b.by), `${card(u.code).name} blocks.`)
  return s
}

export function passBlock(state: OptcgState): OptcgState {
  if (state.phase !== 'block') return state
  const s = clone(state)
  s.phase = 'counter'
  s.seq++
  return s
}

/** Counter cards from hand: their Counter value is added for this battle (§8-5). */
export function playCounter(state: OptcgState, handIndex: number): OptcgState {
  if (state.phase !== 'counter' || !state.battle) return state
  const s = clone(state)
  const b = s.battle as OptcgBattle
  const d = s[other(b.by)]
  const c = cardByCode(d.hand[handIndex])
  if (!c || c.counter <= 0) return state
  d.hand.splice(handIndex, 1)
  d.trash.push(c.code)
  b.counter += c.counter
  note(s, other(b.by), `${d.name} counters with ${c.name} (+${c.counter}).`)
  return s
}

/** Power on the defending side of the current battle, counters included. */
export function defenderPower(state: OptcgState): number {
  const b = state.battle
  if (!b) return 0
  return powerOf(state[other(b.by)], b.target) + b.counter
}

/**
 * Compare the two powers and pay out. Attacker ≥ defender wins the battle:
 * a Character is K.O.'d, a Leader takes damage — the top Life card goes to the
 * defender's hand (or the trash on [Banish]), twice on [Double Attack], and the
 * game ends the moment a Leader is hit with no Life left.
 */
export function resolveBattle(state: OptcgState): OptcgState {
  if (state.phase !== 'counter' || !state.battle) return state
  const s = clone(state)
  const b = s.battle as OptcgBattle
  const att = s[b.by]
  const def = s[other(b.by)]
  const atkCard = b.attacker === 'leader' ? card(att.leader) : card(unit(att, b.attacker)?.code ?? '')
  const power = powerOf(att, b.attacker)
  const hold = defenderPower(s)
  if (power < hold) {
    note(s, other(b.by), `${def.name} holds — ${hold} against ${power}.`)
    s.battle = null
    s.phase = 'main'
    return s
  }
  if (b.target === 'leader') {
    const hits = hasDoubleAttack(atkCard) ? 2 : 1
    for (let i = 0; i < hits; i++) {
      if (def.life.length === 0) { finish(s, b.by, `${def.name}'s Leader took the last hit.`); return s }
      const taken = def.life.shift() as string
      if (hasBanish(atkCard)) {
        def.trash.push(taken)
        note(s, b.by, `${def.name} loses a Life card to [Banish].`)
      } else {
        def.hand.push(taken)
        s.reveal = taken
        note(s, b.by, `${def.name} takes 1 damage.`)
        // A Life card with a [Trigger] gets the choice; anything else is just a card.
        if (card(taken).trigger) { s.phase = 'trigger'; s.battle = null; return s }
      }
    }
  } else {
    const i = def.chars.findIndex((c) => c.uid === b.target)
    if (i >= 0) {
      const [ko] = def.chars.splice(i, 1)
      def.donActive += ko.don
      def.trash.push(ko.code)
      note(s, b.by, `${card(ko.code).name} is K.O.'d.`)
    }
  }
  s.battle = null
  s.phase = 'main'
  return s
}

/** Answer the [Trigger] on a Life card just taken: use it, or keep it in hand. */
export function answerTrigger(state: OptcgState, use: boolean): OptcgState {
  const s = clone(state)
  if (s.phase !== 'trigger') return state
  const code = s.reveal
  const def = s.turn === 'p1' ? s.p2 : s.p1
  if (use && code) {
    const c = card(code)
    // "[Trigger] Play this card." is the common one and the engine can do it
    // outright; anything else is honoured by the players, the way a table does.
    if (c.trigger.includes('Play this card') && c.kind === 'character' && def.chars.length < FIELD_LIMIT) {
      const i = def.hand.lastIndexOf(code)
      if (i >= 0) def.hand.splice(i, 1)
      def.chars.push({ uid: newUid(code), code, rested: false, don: 0, sick: true, buff: 0, used: [] })
      note(s, s.turn === 'p1' ? 'p2' : 'p1', `Trigger — ${c.name} arrives.`)
    } else {
      note(s, s.turn === 'p1' ? 'p2' : 'p1', `Trigger — ${c.name}: ${c.trigger}`)
    }
  }
  s.reveal = ''
  s.phase = 'main'
  return s
}

/** Whose input the game is waiting on right now. */
export function toAct(state: OptcgState): OptcgSide {
  if (state.phase === 'block' || state.phase === 'counter' || state.phase === 'trigger')
    return other(state.turn)
  return state.turn
}
