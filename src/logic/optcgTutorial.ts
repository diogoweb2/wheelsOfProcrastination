// "Show me how to play" — the first game, with a coach sitting next to you.
//
// Not a wall of text and not a video: a REAL game, dealt from a fixed hand so
// the instructions always match what is on the screen, that refuses to move on
// until you have actually done the thing being taught. Each step names one tap.
//
// The engine is untouched: a step is a sentence plus a `done(state)` test, and
// the tutorial screen simply refuses to advance until that test passes. So the
// tutorial can never teach a move the real game would not allow.
import { OPTCG_PRESETS } from './optcgDecks'
import type { OptcgSide, OptcgState } from './optcg'

/** One thing to learn, in one tap. */
export interface TutorialStep {
  id: string
  title: string
  /** What to do, in the fewest words that still say where to tap. */
  body: string
  /**
   * True once the player has done it. Omitted for a step that is just being
   * read — those advance on "Got it".
   */
  done?: (s: OptcgState) => boolean
  /** Held until the opponent has finished, so the coach never talks over them. */
  waitForTurn?: boolean
}

const me = (s: OptcgState) => s.p1

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'goal',
    title: 'What you are trying to do',
    body:
      'Knock out their Leader. Every hit that gets through takes one of their ❤️ Life cards — when they have none left, the next hit wins the game. You have 5 Life. So do they.',
  },
  {
    id: 'board',
    title: 'What you are looking at',
    body:
      'Their side is on top, yours at the bottom. The big card on the left of each row is the Leader, with its power and its ❤️ Life underneath. Your hand is the row at the very bottom. **Press and hold any card to read it** — the pictures are the publisher\'s sample scans and have an empty text box, so the game prints the real numbers and effect for you.',
  },
  {
    id: 'mulligan',
    title: 'Your opening hand',
    body:
      'You get one look at five cards. If it is full of expensive cards you can shuffle it back and draw five new ones — but this hand is a good one. Tap **Keep**.',
    done: (s) => s.phase !== 'mulligan',
  },
  {
    id: 'don',
    title: 'DON!! is your money AND your muscle',
    body:
      'You start your turn with new 🔶 DON!! — two a turn (one on the very first turn). Playing a card RESTS that many DON!!. Look at the number under each card in your hand: that is its cost.',
    waitForTurn: true,
  },
  {
    id: 'play',
    title: 'Play a Character',
    body:
      'Tap a card in your hand you can afford — the ones you can play are the bright ones. It walks onto your row. Characters cannot attack the turn they arrive (they show **new**) unless they have [Rush].',
    done: (s) => me(s).chars.length >= 1,
  },
  {
    id: 'give',
    title: 'Give DON!! for +1000 power',
    body:
      'This is the move that wins games. Tap **Give DON!!**, then tap your Leader or a Character: it gains **+1000 power** until the end of your turn. The DON!! comes back next turn — spending it costs you nothing later.',
    done: (s) => me(s).leaderDon + me(s).chars.reduce((n, c) => n + c.don, 0) >= 1,
  },
  {
    id: 'attack',
    title: 'Attack with your Leader',
    body:
      'Tap your Leader, then tap THEIR Leader. Your Leader turns sideways — that is "rested", and a rested card cannot attack or block again until your next turn. You may only attack a Character if it is already rested; their Leader is always fair game.',
    // You attacked when something of YOURS is resting — their cards rest on
    // their own turn, so reading their board here would tick the step for free.
    done: (s) => me(s).leaderRested || me(s).chars.some((c) => c.rested) || s.battle !== null,
  },
  {
    id: 'defend',
    title: 'When they attack you',
    body:
      'Two chances to stop it. First a **[Blocker]** Character can jump in front (tap it). Then you can play **Counter** cards from your hand — the green **+1000** on a card is its Counter value, and it is added to your power for that one battle. Higher power wins; a tie goes to the attacker.',
  },
  {
    id: 'damage',
    title: 'Taking a hit',
    body:
      'When your Leader is hit you take the top ❤️ Life card **into your hand** — so losing Life gives you cards. If it has a **[Trigger]**, you get to use it right then, for free.',
  },
  {
    id: 'end',
    title: 'End your turn',
    body:
      'When you have attacked with everything worth attacking with, tap **End turn**. Everything of yours stands back up, the DON!! you gave away comes home, and they take their turn.',
    done: (s) => s.turnNo >= 3,
  },
  {
    id: 'done',
    title: 'That is the whole game',
    body:
      'Draw, take 2 DON!!, play cards, give DON!! to whatever is attacking, swing at their Leader. Finish this game out — the coach is done talking. When you want a real one, the Play tab has the AI and a challenge for your crewmate.',
  },
]

/**
 * The tutorial game, dealt so the lesson matches the screen: you are ST-01
 * (Straw Hat Crew), they are ST-02, and YOU take the first turn so the first
 * thing that happens is yours.
 *
 * The hand is fixed — a 1-cost Character to play on turn one, a [Blocker], a
 * Counter event and two mid-cost Characters — because "tap a card you can
 * afford" has to be true the moment it is said.
 */
export function newTutorialMatch(): OptcgState {
  const mine = OPTCG_PRESETS[0]
  const theirs = OPTCG_PRESETS[1]
  const HAND = ['ST01-003', 'ST01-006', 'ST01-011', 'ST01-014', 'ST01-013']

  const deal = (deck: string[], hand: string[], life: number) => {
    const rest = [...deck]
    for (const code of hand) {
      const i = rest.indexOf(code)
      if (i >= 0) rest.splice(i, 1)
    }
    return { hand: [...hand], life: rest.splice(0, life), deck: rest }
  }

  const a = deal(mine.cards, HAND, 5)
  const b = deal(theirs.cards, theirs.cards.slice(0, 5), 5)

  const player = (name: string, leader: string, d: { hand: string[]; life: string[]; deck: string[] }) => ({
    name,
    leader,
    leaderRested: false,
    leaderDon: 0,
    leaderBuff: 0,
    leaderUsed: [],
    deck: d.deck,
    hand: d.hand,
    life: d.life,
    trash: [],
    chars: [],
    stage: null,
    donDeck: 10,
    donActive: 0,
    donRested: 0,
    kept: false,
  })

  return {
    kind: 'optcg',
    p1: player('You', mine.leader, a),
    // Already past its mulligan: the coach should only ever ask YOU a question.
    p2: { ...player('The coach', theirs.leader, b), kept: true },
    turn: 'p1' as OptcgSide,
    first: 'p1' as OptcgSide,
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
