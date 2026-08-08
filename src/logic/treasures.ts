// Treasure cards — the loot-box half of the Davy Back Fight.
//
// Every duel opens with a chest: you draw a small hand of one-shot powers that
// the other captain never sees. Playing one is FREE — it doesn't use your turn's
// action — so every turn is a real decision (what do I spend, and when?) instead
// of tapping the same attack until someone falls over. It's also the great
// equaliser: a kid holding a Phoenix Flames can lose three cards and still win.
//
// Every card is built from the same handful of primitives below, so adding a new
// one is a data change, never an engine change.
import type { CardElement } from './stickerCatalog.generated'

export type TreasureRarity = 'common' | 'rare' | 'epic' | 'legendary'

/**
 * What a card does. All optional, all stackable — a card is just the set of
 * primitives it switches on. `Infinity` means "to full" for the heals.
 */
export interface TreasureFx {
  heal?: number // your front-liner
  healAll?: number // every card you still have
  maxHp?: number // permanent bump to the front-liner's max HP (and heals the same)
  damage?: number // straight to their front-liner, no attack roll involved
  damageAll?: number // every card they have, front line and bench
  energy?: number // your energy, right now
  theirEnergy?: number // negative drains theirs; -99 empties it
  boost?: number // your next attack hits for +N
  double?: number // your attacks are multiplied by this for the rest of your turn
  stun?: boolean // they can't attack on their next turn
  clearStun?: boolean
  shield?: number // the next hit you take is reduced by N
  survive?: boolean // you cannot be knocked out until your next turn
  freeSwap?: boolean // sending out a bench card costs nothing this turn
  reflect?: boolean // their next attack hits their own front-liner instead
  revive?: boolean // a fallen crewmate comes back at half HP
  draw?: number // more treasure cards
  extraTurn?: boolean // go again immediately
  scatter?: boolean // their front-liner is thrown back and a random benched card steps up
}

export interface TreasureDef {
  id: string
  name: string
  icon: string
  rarity: TreasureRarity
  /** The card's rules text, written for a ten-year-old. */
  text: string
  fx: TreasureFx
}

/**
 * The 30. Roughly: commons keep you alive, rares swing a turn, epics swing a
 * match, legendaries are the story you retell afterwards.
 */
export const TREASURES: TreasureDef[] = [
  // --- common: small, always useful, never dead in your hand ---------------
  { id: 'feast', name: 'Sea King Feast', icon: '🍖', rarity: 'common', text: 'Heal 40 HP.', fx: { heal: 40 } },
  { id: 'doctor', name: 'Ship’s Doctor', icon: '🩹', rarity: 'common', text: 'Heal 20 HP on every card you have.', fx: { healAll: 20 } },
  { id: 'cola', name: 'Cola Barrel', icon: '🥤', rarity: 'common', text: 'Gain ⚡⚡ right now.', fx: { energy: 2 } },
  { id: 'whetstone', name: 'Whetstone', icon: '🪒', rarity: 'common', text: 'Your next attack does +25.', fx: { boost: 25 } },
  { id: 'breeze', name: 'Following Wind', icon: '🌬️', rarity: 'common', text: 'Sending out a bench card is free this turn.', fx: { freeSwap: true } },
  { id: 'warning', name: 'Warning Shot', icon: '💣', rarity: 'common', text: 'Deal 25 damage. No attack needed.', fx: { damage: 25 } },
  { id: 'guard', name: 'Rubber Guard', icon: '🛡️', rarity: 'common', text: 'The next hit you take is 30 weaker.', fx: { shield: 30 } },
  { id: 'secondwind', name: 'Second Wind', icon: '💨', rarity: 'common', text: 'Shake off a stun and gain ⚡.', fx: { clearStun: true, energy: 1 } },
  { id: 'rumble', name: 'Rumble Ball', icon: '💊', rarity: 'common', text: 'Your fighter gets +20 max HP, healed too.', fx: { maxHp: 20 } },
  { id: 'riptide', name: 'Riptide', icon: '🌊', rarity: 'common', text: 'Deal 15 damage to their whole crew.', fx: { damageAll: 15 } },
  { id: 'nap', name: 'Power Nap', icon: '😴', rarity: 'common', text: 'Heal 60 HP — but they gain ⚡.', fx: { heal: 60, theirEnergy: 1 } },
  { id: 'lookout', name: 'Crow’s Nest', icon: '🔭', rarity: 'common', text: 'Gain ⚡ and your next attack does +15.', fx: { energy: 1, boost: 15 } },

  // --- rare: swings a turn -------------------------------------------------
  { id: 'haki', name: 'Armament Haki', icon: '⚫', rarity: 'rare', text: 'Your attacks do DOUBLE damage this turn.', fx: { double: 2 } },
  { id: 'soulsolid', name: 'Soul Solid', icon: '🎻', rarity: 'rare', text: 'They can’t attack on their next turn.', fx: { stun: true } },
  { id: 'shambles', name: 'Room: Shambles', icon: '🔵', rarity: 'rare', text: 'Throw their fighter back — a random benched one steps up.', fx: { scatter: true } },
  { id: 'thunder', name: 'Thunderbolt Tempo', icon: '⚡', rarity: 'rare', text: 'Deal 45 damage out of the sky.', fx: { damage: 45 } },
  { id: 'awakening', name: 'Awakening', icon: '🍇', rarity: 'rare', text: 'Gain ⚡⚡⚡ right now.', fx: { energy: 3 } },
  { id: 'ironbody', name: 'Iron Body', icon: '🪨', rarity: 'rare', text: 'You cannot be knocked out until your next turn.', fx: { survive: true } },
  { id: 'map', name: 'Treasure Map', icon: '🗺️', rarity: 'rare', text: 'Draw 2 more treasure cards.', fx: { draw: 2 } },
  { id: 'cuffs', name: 'Sea-Prism Cuffs', icon: '⛓️', rarity: 'rare', text: 'They lose ALL their energy.', fx: { theirEnergy: -99 } },
  { id: 'mirror', name: 'Mirror Coating', icon: '🪞', rarity: 'rare', text: 'Their next attack hits themselves instead.', fx: { reflect: true } },
  { id: 'bounty', name: 'Bounty Poster', icon: '📜', rarity: 'rare', text: 'Your next attack does +50.', fx: { boost: 50 } },

  // --- epic: swings a match ------------------------------------------------
  { id: 'gear5', name: 'Gear Fifth', icon: '🥁', rarity: 'epic', text: 'Heal to FULL and hit double this turn.', fx: { heal: Infinity, double: 2 } },
  { id: 'conqueror', name: 'Conqueror’s Haki', icon: '👑', rarity: 'epic', text: 'Deal 60 damage AND stun them.', fx: { damage: 60, stun: true } },
  { id: 'timeskip', name: 'Time Skip', icon: '⏭️', rarity: 'epic', text: 'Take another turn straight away.', fx: { extraTurn: true } },
  { id: 'broadside', name: 'Sunny Broadside', icon: '🚢', rarity: 'epic', text: 'Deal 35 damage to their whole crew.', fx: { damageAll: 35 } },
  { id: 'miracle', name: 'Doctor’s Miracle', icon: '🏥', rarity: 'epic', text: 'Heal your WHOLE crew to full.', fx: { healAll: Infinity } },

  // --- legendary: the story you retell afterwards ---------------------------
  { id: 'phoenix', name: 'Phoenix Flames', icon: '🕊️', rarity: 'legendary', text: 'A fallen crewmate comes BACK at half HP.', fx: { revive: true } },
  { id: 'pirateking', name: 'Will of the Pirate King', icon: '🏴‍☠️', rarity: 'legendary', text: 'TRIPLE damage this turn, and gain ⚡⚡.', fx: { double: 3, energy: 2 } },
  { id: 'bustercall', name: 'Buster Call', icon: '💥', rarity: 'legendary', text: 'Deal 55 damage to EVERY card they have.', fx: { damageAll: 55 } },
]

const BY_ID = new Map(TREASURES.map((t) => [t.id, t]))
export const treasureById = (id: string): TreasureDef | undefined => BY_ID.get(id)

/** Cards drawn from the chest at the start of a duel. */
export const CHEST_SIZE = 3
/** Nobody holds more than this — draws past it are lost, so hoarding isn't a strategy. */
export const HAND_CAP = 5

/**
 * Draw odds. Legendaries are deliberately rare enough that pulling one is an
 * event; commons are common enough that a hand is never dead.
 */
export const TREASURE_ODDS: Record<TreasureRarity, number> = {
  common: 0.58,
  rare: 0.28,
  epic: 0.11,
  legendary: 0.03,
}

export const RARITY_LABEL: Record<TreasureRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'LEGENDARY',
}

/** How loud the reveal should be — the chest and the arena both read this. */
export const RARITY_RANK: Record<TreasureRarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 }

const BY_RARITY = TREASURES.reduce<Record<TreasureRarity, TreasureDef[]>>(
  (m, t) => {
    m[t.rarity].push(t)
    return m
  },
  { common: [], rare: [], epic: [], legendary: [] },
)

/** Draw one card: roll a rarity, then a card of that rarity. */
export function drawTreasure(rand: () => number = Math.random): string {
  let roll = rand()
  for (const rarity of ['legendary', 'epic', 'rare', 'common'] as TreasureRarity[]) {
    // walk from the rarest down so the smallest slices are checked first
    if (roll < TREASURE_ODDS[rarity]) {
      const pool = BY_RARITY[rarity]
      return pool[Math.floor(rand() * pool.length)].id
    }
    roll -= TREASURE_ODDS[rarity]
  }
  const pool = BY_RARITY.common
  return pool[Math.floor(rand() * pool.length)].id
}

export function drawTreasures(n: number, rand: () => number = Math.random): string[] {
  return Array.from({ length: n }, () => drawTreasure(rand))
}

// --- the Davy Back Dice -----------------------------------------------------
//
// The comeback rule, and the reason a losing kid keeps playing. Down to your
// LAST card, once per match, you may roll — for free, without spending your
// turn. There is no bad face: the worst roll still hands you energy, because
// a comeback mechanic that can do nothing isn't a comeback mechanic.

export interface DiceFace {
  pip: string
  name: string
  text: string
  fx: TreasureFx
}

export const DICE_FACES: DiceFace[] = [
  { pip: '⚀', name: 'Salty Wind', text: 'The sea gives little — gain ⚡.', fx: { energy: 1 } },
  { pip: '⚁', name: 'Second Wind', text: 'Gain ⚡⚡⚡!', fx: { energy: 3 } },
  { pip: '⚂', name: 'Buried Loot', text: 'Draw 2 treasure cards!', fx: { draw: 2 } },
  { pip: '⚃', name: 'Frozen Sea', text: 'They lose their next turn!', fx: { stun: true } },
  { pip: '⚄', name: 'Healing Tide', text: 'Heal to FULL!', fx: { heal: Infinity } },
  { pip: '⚅', name: 'Phoenix Rising', text: 'A fallen crewmate returns!', fx: { revive: true } },
]

export const rollDice = (rand: () => number = Math.random) => Math.floor(rand() * DICE_FACES.length)

/** Element flavour is unused by the rules — kept so the arena can tint a card. */
export type { CardElement }
