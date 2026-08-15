// Sea Battle's special cards — the one house rule on top of official Battleship.
//
// Each captain buries THREE of these in their own waters before the first shot.
// Nothing happens until the enemy fires at the square one is buried on; then it
// springs, and both captains are shown the card so neither has to guess what
// just changed.
//
// Half of them punish the captain who buried them (`bad`) and half backfire on
// the captain who found them (`good`). You do not choose which three you get,
// so setup is a real decision: the 💀 ones want burying where nobody shoots,
// and the 🛡️ ones are bait.
//
// Pure data + pure functions, same contract as seaBattle.ts: no React, no
// Firestore, `null` never `undefined`, flat arrays only.

/** What a card actually does. The engine switches on exactly these. */
export type SeaEffect =
  | 'skip' // owner loses their next turn
  | 'wreck' // one square of a random afloat ship of the owner's blows apart
  | 'peek' // finder glimpses one of the owner's ship squares
  | 'burn' // one of the owner's other buried cards is destroyed
  | 'revive' // finder raises one of their OWN sunk ships
  | 'jump' // one of the finder's untouched ships jumps somewhere new
  | 'barrage' // finder takes two extra shots, right now
  | 'chart' // finder is told which row hides the most of the owner's fleet
  | 'mine' // finder loses their next turn
  | 'fog' // the finder's next shot lands wherever it likes
  | 'mend' // owner raises one of their OWN sunk ships
  | 'steal' // one of the FINDER's buried cards is destroyed
  | 'swap' // one of the owner's untouched ships slips somewhere new
  | 'haki' // owner glimpses one of the FINDER's ship squares
  | 'dud' // nothing happens

export interface SeaCardDef {
  id: SeaEffect
  name: string
  emoji: string
  /** Who it hurts: 'bad' the captain who buried it, 'good' the captain who found it. */
  side: 'bad' | 'good'
  rarity: 'common' | 'rare'
  /**
   * What it does, in as few words as fit on a card at phone size. Deliberately
   * terse: the long version is `who`, and it is only ever read on the big card.
   */
  text: string
  /** Flavour — the One Piece reason it does that. */
  who: string
}

/**
 * Fifteen cards, one effect each. Rares are the swingy ones, so a 3-card hand
 * is usually two ordinary shoves and one thing worth shouting about.
 */
export const SEA_CARDS: SeaCardDef[] = [
  // --- 💀 hurts whoever buried it -------------------------------------------
  {
    id: 'skip',
    name: 'Ope Ope Room',
    emoji: '🕰️',
    side: 'bad',
    rarity: 'common',
    text: 'You lose your next turn.',
    who: 'Law drops a Room over your deck and nobody moves for a while.',
  },
  {
    id: 'wreck',
    name: 'Buster Call',
    emoji: '💣',
    side: 'bad',
    rarity: 'common',
    text: 'One square of your fleet is destroyed.',
    who: 'Five vice admirals answer a signal nobody meant to send.',
  },
  {
    id: 'peek',
    name: 'Observation Haki',
    emoji: '👁️',
    side: 'bad',
    rarity: 'rare',
    text: 'They see one of your squares. 2s.',
    who: 'Katakuri looks a moment ahead and finds you in it.',
  },
  {
    id: 'burn',
    name: 'Marine Raid',
    emoji: '🔥',
    side: 'bad',
    rarity: 'common',
    text: 'One of your other buried cards dies.',
    who: 'They came aboard while you were busy at the guns.',
  },
  {
    id: 'revive',
    name: 'Rumble Ball',
    emoji: '🩺',
    side: 'bad',
    rarity: 'rare',
    text: 'They raise one of their sunk ships.',
    who: 'Chopper does what a doctor does, and does it to the wrong fleet.',
  },
  {
    id: 'jump',
    name: 'Coup de Burst',
    emoji: '🌀',
    side: 'bad',
    rarity: 'common',
    text: 'One of their ships moves somewhere new.',
    who: 'Franky fires the cola and the Sunny is simply somewhere else.',
  },
  {
    id: 'barrage',
    name: 'Gum-Gum Gatling',
    emoji: '🔫',
    side: 'bad',
    rarity: 'rare',
    text: 'They fire 2 extra shots now.',
    who: 'Once Luffy starts throwing punches he does not throw one.',
  },
  {
    id: 'chart',
    name: 'Log Pose',
    emoji: '🧭',
    side: 'bad',
    rarity: 'common',
    text: 'They learn your fullest row.',
    who: 'The needle swings, and it does not swing at nothing.',
  },

  // --- 🛡️ backfires on whoever found it -------------------------------------
  {
    id: 'mine',
    name: 'Nose Fancy Cannon',
    emoji: '💥',
    side: 'good',
    rarity: 'common',
    text: 'They lose their next turn.',
    who: 'Mr. 5 left something in the water that goes off when touched.',
  },
  {
    id: 'fog',
    name: 'Smoke Screen',
    emoji: '🌫️',
    side: 'good',
    rarity: 'common',
    text: 'Their next shot goes wild.',
    who: 'Smoker fills the whole bay and nobody can see the sea.',
  },
  {
    id: 'mend',
    name: 'Doctor’s Orders',
    emoji: '🍖',
    side: 'good',
    rarity: 'rare',
    text: 'You raise one of your sunk ships.',
    who: 'Meat, sleep, and the ship floats again. That is the whole method.',
  },
  {
    id: 'steal',
    name: 'Nami’s Thievery',
    emoji: '💰',
    side: 'good',
    rarity: 'common',
    text: 'One of THEIR buried cards dies.',
    who: 'She was in their hold the entire time you were arguing.',
  },
  {
    id: 'swap',
    name: 'Merry’s Escape',
    emoji: '🐑',
    side: 'good',
    rarity: 'common',
    text: 'One of your ships moves somewhere new.',
    who: 'The Merry sails herself when the crew needs her to.',
  },
  {
    id: 'haki',
    name: 'Conqueror’s Haki',
    emoji: '⚔️',
    side: 'good',
    rarity: 'rare',
    text: 'You see one of their squares. 2s.',
    who: 'You look at the sea hard enough and the sea gives it up.',
  },
  {
    id: 'dud',
    name: 'Sanji’s Bento',
    emoji: '🍱',
    side: 'good',
    rarity: 'common',
    text: 'Nothing happens.',
    who: 'Not every crate in the hold is gunpowder.',
  },
]

/** How many cards each captain buries before the first shot. */
export const TRAPS_PER_SIDE = 3

const BY_ID = new Map(SEA_CARDS.map((c) => [c.id, c]))
export const seaCardById = (id: string): SeaCardDef | undefined => BY_ID.get(id as SeaEffect)

/** 💀 / 🛡️ — which way this card cuts, for the corner of the card face. */
export const cardBadge = (c: SeaCardDef): string => (c.side === 'bad' ? '💀' : '🛡️')

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]

/**
 * Deal a hand to bury. Rares are held to at most one per hand, so a captain can
 * never open with three board-flipping cards — and the hand is dealt, never
 * chosen, so both sides are gambling on the same table.
 */
export function dealSeaCards(n = TRAPS_PER_SIDE): SeaEffect[] {
  const commons = SEA_CARDS.filter((c) => c.rarity === 'common')
  const rares = SEA_CARDS.filter((c) => c.rarity === 'rare')
  const hand: SeaEffect[] = []
  // roughly half of hands open with a rare
  if (Math.random() < 0.5) hand.push(pick(rares).id)
  const pool = commons.filter((c) => !hand.includes(c.id))
  while (hand.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length)
    hand.push(pool[i].id)
    pool.splice(i, 1)
  }
  // shuffle so the rare isn't always first in the tray
  for (let i = hand.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[hand[i], hand[j]] = [hand[j], hand[i]]
  }
  return hand
}
