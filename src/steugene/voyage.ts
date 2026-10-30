// 🏫 St. Eugene 7 (§24ac) — the same ten problems, solved the pirate way.
//
// §24ab's bar model is the slow, safe way: cut one bar into equal parts and
// walk the parts. It works, and it is the right first way. But it is also
// seven or eight moves long every single time, and the method he will
// actually be expected to use by the end of grade 7 is one line.
//
// So every worked example gets a SECOND take, and the second take is a
// different idea, not a different skin:
//
//   each sentence of the problem is an ISLAND, and every island KEEPS a
//   fraction of the hold. Multiply the keeps. That is the answer.
//
//   "2/5 goes on the ramp"  →  the island keeps 3/5
//   "half of the rest goes" →  the island keeps 1/2
//   500 × 3/5 × 1/2 = 150. One line. Nothing subtracted, ever.
//
// Three things make this worth having as well as the bar:
//
//  · It is the method, not a drawing of one question. The bar shows him what
//    is happening; the chain shows him what to WRITE.
//  · It kills the subtraction. Every one of his wrong answers on this
//    worksheet came from subtracting in the middle and losing the thread.
//  · The hard ones run backwards, and backwards is a DIRECTION here — the
//    ship physically sails west again — rather than a different procedure.
//
// The beat repeats, same two marks in all ten: 🧭 write the keep, ⚓ multiply
// the keeps. The four level-4 ones add 🔙 sail back. He is meant to get bored
// of them; bored is what remembered looks like.
//
// One Piece because that is the world he is actually in (world.ts) — islands,
// a log pose, a hold full of crates, and the Jolly Roger when it lands.
import type { SeIcon } from './types'

/** One island on the route = one sentence of the problem. */
export interface SeVoyPort {
  /** The pin on the map. */
  flag: string
  /** Short enough to sit under the pin. */
  name: string
  /** What it takes, in the problem's own words. */
  takes: string
  /** What it KEEPS — the number that goes in the chain. The whole point. */
  keeps: string
}

/** The crates the hold is packed into right now. `n` is the denominator. */
export interface SeVoyCrates {
  n: number
  /** How many stay aboard; the rest go over the side. */
  keep: number
  icon: SeIcon
  /** Printed under a crate that stays. */
  each?: string
  /**
   * The crates that are not kept are being POINTED AT, not thrown away: they
   * stay put and go faint. Used on the moves that pick out the one part with a
   * number on it — those crates were already dealt with islands ago, and
   * throwing them over the side a second time reads as a second loss.
   */
  spot?: boolean
}

export interface SeVoyLeg {
  /** The move, in his words. One line. */
  say: string
  /** The arithmetic for this move. */
  maths?: string
  /** Where the ship is: 0 = the home dock, n = moored at island n. */
  at: number
  /** What is in the hold right now, big. */
  hold: string
  /** A small caption under it. */
  holdNote?: string
  crates?: SeVoyCrates
  /** The log pose, chip by chip. A chip starting `=` is an answer, `↩` a turn. */
  chain?: string[]
  /** The repeated beat — one `keeps` and one `chain` in every voyage. */
  mark?: 'keeps' | 'chain' | 'back'
  /** Sailing west again: the wake reverses and the ship turns round. */
  back?: boolean
}

export interface SeVoyage {
  id: string
  /** The §24ab example this is a second take on. */
  of: string
  title: string
  /** One line: what is different about this way. */
  idea: string
  ports: SeVoyPort[]
  legs: SeVoyLeg[]
  /** The whole problem on one line, shown with the answer. */
  oneline: string
}

// --- level 1 --------------------------------------------------------------------

const V1: SeVoyage = {
  id: 'v-wood1',
  of: 'w-wood1',
  title: 'One island, one keep',
  idea: 'Never subtract. Read what the island KEEPS.',
  ports: [{ flag: '🛠️', name: 'Ramp I.', takes: 'takes 2/5', keeps: 'keeps 3/5' }],
  legs: [
    {
      say: 'The hold starts full. Five crates of 100.',
      at: 0,
      hold: '500 wood',
      holdNote: 'the bottom number is 5, so pack it in 5',
      crates: { n: 5, keep: 5, icon: 'plank', each: '100' },
      chain: ['500'],
    },
    {
      say: 'Ramp Island takes 2 of the 5 crates.',
      maths: '2 × 100 = 200 over the side',
      at: 1,
      hold: '500 wood',
      crates: { n: 5, keep: 3, icon: 'plank', each: '100' },
      chain: ['500'],
    },
    {
      say: 'Do not subtract. 2/5 taken means 3/5 KEPT — read the keep straight off.',
      maths: '3/5 × 500 = 300',
      at: 1,
      hold: '300 wood',
      holdNote: 'the three crates still aboard',
      crates: { n: 5, keep: 3, icon: 'plank', each: '100' },
      chain: ['500', '× 3/5', '= 300'],
      mark: 'keeps',
    },
    {
      say: 'That is the whole problem. One island, one line.',
      maths: '500 × 3/5 = 300 wood',
      at: 1,
      hold: '300 wood',
      chain: ['500', '× 3/5', '= 300'],
      mark: 'chain',
    },
  ],
  oneline: '500 × 3/5 = 300 wood',
}

const V2: SeVoyage = {
  id: 'v-stack1',
  of: 'w-stack1',
  title: 'Read the bounty poster',
  idea: 'This one asks for the TAKEN pile. So take it in one go.',
  ports: [{ flag: '🪚', name: 'Floor I.', takes: 'takes 3/8', keeps: 'keeps 5/8' }],
  legs: [
    {
      say: 'The hold: one stack, 64 planks. Eight crates of 8.',
      at: 0,
      hold: '64 planks',
      crates: { n: 8, keep: 8, icon: 'plank', each: '8' },
      chain: ['64'],
    },
    {
      say: 'Floor Island takes 3 of the 8 crates — so it keeps 5.',
      maths: '3 taken, 5 kept',
      at: 1,
      hold: '64 planks',
      crates: { n: 8, keep: 5, icon: 'plank', each: '8' },
      chain: ['64'],
      mark: 'keeps',
    },
    {
      say: 'The keep is 5/8. That is 40 planks still aboard.',
      maths: '5/8 × 64 = 40 kept',
      at: 1,
      hold: '40 planks aboard',
      crates: { n: 8, keep: 5, icon: 'plank', each: '8' },
      chain: ['64', '× 5/8', '= 40'],
    },
    {
      say: 'But the question asked for the TAKEN pile. So multiply by 3/8 and stop.',
      maths: '3/8 × 64 = 24',
      at: 1,
      hold: '24 planks',
      holdNote: 'what went on the floor — what was asked for',
      chain: ['64', '× 3/8', '= 24'],
      mark: 'chain',
    },
  ],
  oneline: '3/8 × 64 = 24 planks',
}

// --- level 2 --------------------------------------------------------------------

const V3: SeVoyage = {
  id: 'v-wood2',
  of: 'w-wood2',
  title: 'Two islands, one line',
  idea: 'Two keeps, multiplied: 500 × 3/5 × 1/2.',
  ports: [
    { flag: '🛠️', name: 'Ramp I.', takes: 'takes 2/5', keeps: 'keeps 3/5' },
    { flag: '📦', name: 'Box I.', takes: 'takes 1/2', keeps: 'keeps 1/2' },
  ],
  legs: [
    {
      say: 'Two islands this time. The hold starts at 500.',
      at: 0,
      hold: '500 wood',
      crates: { n: 5, keep: 5, icon: 'plank', each: '100' },
      chain: ['500'],
    },
    {
      say: 'Ramp Island takes 2/5, so it keeps 3/5 of the hold.',
      maths: '3/5 × 500 = 300',
      at: 1,
      hold: '300 wood',
      crates: { n: 5, keep: 3, icon: 'plank', each: '100' },
      chain: ['500', '× 3/5'],
      mark: 'keeps',
    },
    {
      say: 'Repack. The hold is 300 now, in two halves of 150.',
      maths: 'the 500 never comes back',
      at: 1,
      hold: '300 wood',
      holdNote: 'this is what the next sentence is about',
      crates: { n: 2, keep: 2, icon: 'plank', each: '150' },
      chain: ['500', '× 3/5', '= 300'],
    },
    {
      say: 'Box Island takes half — so it keeps 1/2.',
      maths: '1/2 × 300 = 150',
      at: 2,
      hold: '150 wood',
      crates: { n: 2, keep: 1, icon: 'plank', each: '150' },
      chain: ['500', '× 3/5', '× 1/2'],
    },
    {
      say: 'Both keeps on one line. You never stopped to subtract.',
      maths: '500 × 3/5 × 1/2 = 150',
      at: 2,
      hold: '150 wood',
      chain: ['500', '× 3/5', '× 1/2', '= 150'],
      mark: 'chain',
    },
  ],
  oneline: '500 × 3/5 × 1/2 = 150 wood',
}

const V4: SeVoyage = {
  id: 'v-pizza1',
  of: 'w-pizza1',
  title: 'The galley raid',
  idea: 'Survive the first island, then take the half you were asked for.',
  ports: [
    { flag: '🍕', name: 'Hungry I.', takes: 'eats 2/3', keeps: 'keeps 1/3' },
    { flag: '📦', name: 'Box I.', takes: 'takes 1/2', keeps: 'the box IS the 1/2' },
  ],
  legs: [
    {
      say: 'Twelve slices in the hold. Three crates of 4.',
      at: 0,
      hold: '12 slices',
      crates: { n: 3, keep: 3, icon: 'pizza', each: '4' },
      chain: ['12'],
    },
    {
      say: 'The crew eats 2/3 — so the hold keeps 1/3.',
      maths: '1/3 × 12 = 4 slices left',
      at: 1,
      hold: '4 slices',
      crates: { n: 3, keep: 1, icon: 'pizza', each: '4' },
      chain: ['12', '× 1/3'],
      mark: 'keeps',
    },
    {
      say: 'Repack. Four slices, two halves of 2.',
      at: 1,
      hold: '4 slices',
      holdNote: 'the 12 is finished with',
      crates: { n: 2, keep: 2, icon: 'pizza', each: '2' },
      chain: ['12', '× 1/3', '= 4'],
    },
    {
      say: 'The box TAKES half. Follow the half the question asked about.',
      maths: '1/2 × 4 = 2 slices',
      at: 2,
      hold: '2 slices',
      crates: { n: 2, keep: 1, icon: 'pizza', each: '2' },
      chain: ['12', '× 1/3', '× 1/2'],
    },
    {
      say: 'Chain it: survive the eating, then take the half.',
      maths: '12 × 1/3 × 1/2 = 2',
      at: 2,
      hold: '2 slices in the box',
      chain: ['12', '× 1/3', '× 1/2', '= 2'],
      mark: 'chain',
    },
  ],
  oneline: '12 × 1/3 × 1/2 = 2 slices',
}

const V5: SeVoyage = {
  id: 'v-bucket',
  of: 'w-bucket',
  title: 'Three plants, one chain',
  idea: 'Three fractions in a row, and not one bucket to divide.',
  ports: [
    { flag: '🚲', name: 'Bike I.', takes: 'takes 1/2', keeps: 'keeps 1/2' },
    { flag: '🌱', name: 'Plant I.', takes: 'splits 3 ways', keeps: 'each gets 1/3' },
  ],
  legs: [
    {
      say: 'The hold is 6/7 of a bucket — not a full one. That is the start number.',
      maths: 'one crate was never collected',
      at: 0,
      hold: '6/7 of a bucket',
      crates: { n: 7, keep: 6, icon: 'potion', each: '1/7', spot: true },
      chain: ['6/7'],
    },
    {
      say: 'The bike takes half — so the hold keeps 1/2.',
      maths: '1/2 × 6/7 = 3/7',
      at: 1,
      hold: '3/7 of a bucket',
      crates: { n: 2, keep: 1, icon: 'potion', each: '3/7' },
      chain: ['6/7', '× 1/2'],
      mark: 'keeps',
    },
    {
      say: 'Three plants share the rest. Each one gets 1/3 of the hold.',
      maths: '1/3 × 3/7 = 1/7',
      at: 2,
      hold: '1/7 of a bucket',
      holdNote: 'what ONE plant gets — that was the question',
      crates: { n: 3, keep: 1, icon: 'potion', each: '1/7' },
      chain: ['6/7', '× 1/2', '× 1/3'],
    },
    {
      say: 'One line, three fractions. Multiply across the top, across the bottom.',
      maths: '6/7 × 1/2 × 1/3 = 6/42 = 1/7',
      at: 2,
      hold: '1/7 of a bucket',
      chain: ['6/7', '× 1/2', '× 1/3', '= 1/7'],
      mark: 'chain',
    },
  ],
  oneline: '6/7 × 1/2 × 1/3 = 6/42 = 1/7 of a bucket',
}

// --- level 3: his own worksheet --------------------------------------------------

const V6: SeVoyage = {
  id: 'v-flour',
  of: 'w-flour',
  title: "Victoria's log pose",
  idea: 'His worksheet question in a single line of multiplying.',
  ports: [
    { flag: '🥧', name: 'Pie I.', takes: 'takes 2/5', keeps: 'keeps 3/5' },
    { flag: '🍞', name: 'Bread I.', takes: 'takes 3/10', keeps: 'keeps 7/10' },
  ],
  legs: [
    {
      say: 'The hold: 2 kg of flour. Five crates of 0.4 kg.',
      at: 0,
      hold: '2 kg of flour',
      crates: { n: 5, keep: 5, icon: 'cookie', each: '0.4' },
      chain: ['2'],
    },
    {
      say: 'Pie Island takes 2/5 — so the keep is 3/5.',
      maths: '3/5 × 2 = 1.2 kg',
      at: 1,
      hold: '1.2 kg',
      crates: { n: 5, keep: 3, icon: 'cookie', each: '0.4' },
      chain: ['2', '× 3/5'],
      mark: 'keeps',
    },
    {
      say: 'Bread Island works in tenths. Repack the 1.2 kg into 10.',
      maths: '1.2 ÷ 10 = 0.12 kg a crate',
      at: 1,
      hold: '1.2 kg',
      holdNote: 'the 2 kg bag is finished with',
      crates: { n: 10, keep: 10, icon: 'cookie', each: '0.12' },
      chain: ['2', '× 3/5', '= 1.2'],
    },
    {
      say: 'Bread takes 3/10 — so the keep is 7/10.',
      maths: '7/10 × 1.2 = 0.84 kg',
      at: 2,
      hold: '0.84 kg',
      crates: { n: 10, keep: 7, icon: 'cookie', each: '0.12' },
      chain: ['2', '× 3/5', '× 7/10'],
    },
    {
      say: 'Both keeps multiplied — and nothing was subtracted anywhere.',
      maths: '2 × 3/5 × 7/10 = 42/50 = 21/25 kg',
      at: 2,
      hold: '21/25 kg',
      holdNote: '0.84 kg — the same answer, three lines shorter',
      chain: ['2', '× 3/5', '× 7/10', '= 21/25'],
      mark: 'chain',
    },
  ],
  oneline: '2 × 3/5 × 7/10 = 42/50 = 21/25 kg (0.84 kg)',
}

const V7: SeVoyage = {
  id: 'v-drums',
  of: 'w-drums',
  title: 'Sail back for the hours',
  idea: 'No numbers? Call the afternoon 1 and sail anyway.',
  ports: [
    { flag: '📚', name: 'Homework I.', takes: 'takes 1/2', keeps: 'keeps 1/2' },
    { flag: '🥁', name: 'Drum I.', takes: 'takes 3/4', keeps: 'keeps 1/4' },
  ],
  legs: [
    {
      say: 'Not one number in the question yet. Call the whole afternoon 1 and sail.',
      maths: 'you do not need the hours to start',
      at: 0,
      hold: '1 afternoon',
      chain: ['1'],
    },
    {
      say: 'Homework and dinner take half — so the keep is 1/2.',
      maths: '1 × 1/2 = 1/2 of the afternoon',
      at: 1,
      hold: '1/2 of the afternoon',
      crates: { n: 2, keep: 1, icon: 'star', each: '1/2' },
      chain: ['1', '× 1/2'],
      mark: 'keeps',
    },
    {
      say: 'The drums take 3 of the 4 parts of what is left.',
      maths: '3/4 × 1/2 = 3/8 of the afternoon',
      at: 2,
      hold: '3/8 is drums',
      crates: { n: 4, keep: 3, icon: 'star', each: 'drums' },
      chain: ['1', '× 1/2', '× 3/4', '= 3/8'],
    },
    {
      say: 'The 4th part is the texting: 1/4 of a half. And they told us that is 3/4 h.',
      maths: '1/4 × 1/2 = 1/8 → so 1/8 of the afternoon = 3/4 hour',
      at: 2,
      hold: '1/8 = 3/4 hour',
      holdNote: 'one eighth of the afternoon has a number on it',
      crates: { n: 8, keep: 1, icon: 'star', each: '3/4 h', spot: true },
      chain: ['1/8 of it', 'is 3/4 h'],
    },
    {
      say: 'Sail back west. If one eighth is 3/4 h, all eight are 8 × 3/4.',
      maths: '3/4 × 8 = 6 hours',
      at: 0,
      hold: '6 hours',
      holdNote: 'the whole afternoon, at last',
      back: true,
      chain: ['↩ 3/4 h', '× 8', '= 6 h'],
      mark: 'back',
    },
    {
      say: 'Now sail out to the drums again: they were 3/8 of it.',
      maths: '3/8 × 6 = 18/8 = 2¼ hours',
      at: 2,
      hold: '2¼ hours',
      chain: ['6 h', '× 3/8', '= 2¼ h'],
      mark: 'chain',
    },
  ],
  oneline: 'drums 3/8 · texting 1/8 = 3/4 h → afternoon 6 h → 3/8 × 6 = 2¼ hours',
}

// --- level 4: the route runs backwards -------------------------------------------

const V8: SeVoyage = {
  id: 'v-holiday',
  of: 'w-holiday',
  title: 'Reverse the log pose',
  idea: 'The chain says the seashore is 1/9. Then sail back.',
  ports: [
    { flag: '⛺', name: 'Camp I.', takes: 'takes 5/9', keeps: 'keeps 4/9' },
    { flag: '👵', name: 'Gran I.', takes: 'takes 3/4', keeps: 'keeps 1/4' },
  ],
  legs: [
    {
      say: 'You are not told how long the holiday is. Call it 1 and sail.',
      at: 0,
      hold: '1 holiday',
      crates: { n: 9, keep: 9, icon: 'trophy', each: '1/9' },
      chain: ['1'],
    },
    {
      say: 'Camp takes 5/9 — so the keep is 4/9.',
      maths: '1 × 4/9 = 4/9 of the holiday',
      at: 1,
      hold: '4/9 of the holiday',
      crates: { n: 9, keep: 4, icon: 'trophy', each: '1/9' },
      chain: ['1', '× 4/9'],
      mark: 'keeps',
    },
    {
      say: 'Grandparents take 3/4 of that — so the keep is 1/4.',
      maths: '1/4 × 4/9 = 4/36 = 1/9',
      at: 2,
      hold: '1/9 of the holiday',
      holdNote: 'the seashore IS this ninth',
      crates: { n: 4, keep: 1, icon: 'trophy', each: '1/9' },
      chain: ['1', '× 4/9', '× 1/4', '= 1/9'],
    },
    {
      say: 'And the seashore is 7 days. So one ninth of the holiday has a number.',
      maths: '1/9 of the holiday = 7 days',
      at: 2,
      hold: '1/9 = 7 days',
      crates: { n: 9, keep: 1, icon: 'trophy', each: '7 days', spot: true },
      chain: ['1/9 of it', 'is 7 days'],
    },
    {
      say: 'Sail back to the start. Nine ninths is 9 × 7.',
      maths: '7 × 9 = 63 days',
      at: 0,
      hold: '63 days',
      holdNote: 'the whole holiday',
      back: true,
      crates: { n: 9, keep: 9, icon: 'trophy', each: '7' },
      chain: ['↩ 7 days', '× 9', '= 63 days'],
      mark: 'back',
    },
    {
      say: 'The whole route was one line: two keeps, then turn round.',
      maths: '4/9 × 1/4 = 1/9 → 7 × 9 = 63 days',
      at: 0,
      hold: '63 days',
      chain: ['4/9', '× 1/4', '= 1/9', '↩ 7', '× 9', '= 63 days'],
      mark: 'chain',
    },
  ],
  oneline: '4/9 × 1/4 = 1/9 → 7 × 9 = 63 days',
}

const V9: SeVoyage = {
  id: 'v-pay',
  of: 'w-pay',
  title: 'Of the pay, or of the rest?',
  idea: 'Add what comes off the same bar. Multiply what comes off the rest.',
  ports: [
    { flag: '🏠', name: 'Rent I.', takes: '2/5 of the PAY', keeps: 'wait for bills' },
    { flag: '💡', name: 'Bills I.', takes: '1/5 of the PAY', keeps: 'keeps 2/5' },
    { flag: '🍲', name: 'Food I.', takes: '3/4 of the REST', keeps: 'keeps 1/4' },
  ],
  legs: [
    {
      say: 'Three islands, and his pay is never given. Call it 1.',
      at: 0,
      hold: '1 month of pay',
      crates: { n: 5, keep: 5, icon: 'gold', each: '1/5' },
      chain: ['1'],
    },
    {
      say: 'Careful here. Rent is 2/5 OF THE PAY.',
      maths: '2 of the 5 fifths of the pay',
      at: 1,
      hold: '1 month of pay',
      crates: { n: 5, keep: 3, icon: 'gold', each: '1/5' },
      chain: ['1'],
    },
    {
      say: 'Bills are 1/5 of the PAY too — not of the rest. Same bar, so add them.',
      maths: '2/5 + 1/5 = 3/5 gone → 2/5 kept',
      at: 2,
      hold: '2/5 of the pay',
      holdNote: 'this is the "what is left" the next sentence means',
      crates: { n: 5, keep: 2, icon: 'gold', each: '1/5' },
      chain: ['1', '× 2/5'],
      mark: 'keeps',
    },
    {
      say: 'Food takes 3/4 of what is left — so the keep is 1/4.',
      maths: '1/4 × 2/5 = 2/20 = 1/10',
      at: 3,
      hold: '1/10 of the pay',
      holdNote: 'his savings are one tenth of his pay',
      crates: { n: 4, keep: 1, icon: 'gold', each: 'savings' },
      chain: ['1', '× 2/5', '× 1/4', '= 1/10'],
    },
    {
      say: 'And what he saves is $193.50. So one tenth of his pay has a number.',
      maths: '1/10 of his pay = $193.50',
      at: 3,
      hold: '1/10 = $193.50',
      crates: { n: 10, keep: 1, icon: 'gold', each: '193.50', spot: true },
      chain: ['1/10 of it', 'is $193.50'],
    },
    {
      say: 'Sail all the way back. Ten tenths is 10 × 193.50.',
      maths: '193.50 × 10 = $1935',
      at: 0,
      hold: '$1935',
      holdNote: 'a month of pay',
      back: true,
      crates: { n: 10, keep: 10, icon: 'gold', each: '193.50' },
      chain: ['↩ $193.50', '× 10', '= $1935'],
      mark: 'back',
    },
    {
      say: 'One line — once you have decided what each fraction is OF.',
      maths: '(2/5 + 1/5 off the pay) → 2/5 × 1/4 = 1/10 → × 10',
      at: 0,
      hold: '$1935 a month',
      chain: ['2/5', '× 1/4', '= 1/10', '↩ $193.50', '× 10', '= $1935'],
      mark: 'chain',
    },
  ],
  oneline: '2/5 kept × 1/4 kept = 1/10 → $193.50 × 10 = $1935',
}

const V10: SeVoyage = {
  id: 'v-vbucks',
  of: 'w-vbucks',
  title: 'Back to the full wallet',
  idea: 'Two keeps make 1/5. So the wallet was 5 × 190.',
  ports: [
    { flag: '🧥', name: 'Skin I.', takes: 'takes 3/5', keeps: 'keeps 2/5' },
    { flag: '💃', name: 'Emote I.', takes: 'takes 1/2', keeps: 'keeps 1/2' },
  ],
  legs: [
    {
      say: 'You are not told what you started with. Call the wallet 1.',
      at: 0,
      hold: '1 wallet',
      crates: { n: 5, keep: 5, icon: 'vbuck', each: '1/5' },
      chain: ['1'],
    },
    {
      say: 'The skin takes 3/5 — so the keep is 2/5.',
      maths: '1 × 2/5 = 2/5 of the wallet',
      at: 1,
      hold: '2/5 of the wallet',
      crates: { n: 5, keep: 2, icon: 'vbuck', each: '1/5' },
      chain: ['1', '× 2/5'],
      mark: 'keeps',
    },
    {
      say: 'The emote takes half of THAT — so the keep is 1/2.',
      maths: '1/2 × 2/5 = 2/10 = 1/5',
      at: 2,
      hold: '1/5 of the wallet',
      holdNote: 'what you are still holding',
      crates: { n: 2, keep: 1, icon: 'vbuck', each: '1/5' },
      chain: ['1', '× 2/5', '× 1/2', '= 1/5'],
    },
    {
      say: 'And what you are still holding is 190. So one fifth has a number.',
      maths: '1/5 of the start = 190 V-Bucks',
      at: 2,
      hold: '1/5 = 190',
      crates: { n: 5, keep: 1, icon: 'vbuck', each: '190', spot: true },
      chain: ['1/5 of it', 'is 190'],
    },
    {
      say: 'Sail back. Five fifths is 5 × 190.',
      maths: '190 × 5 = 950',
      at: 0,
      hold: '950 V-Bucks',
      holdNote: 'what you dropped in with — a Battle Pass',
      back: true,
      crates: { n: 5, keep: 5, icon: 'vbuck', each: '190' },
      chain: ['↩ 190', '× 5', '= 950'],
      mark: 'back',
    },
    {
      say: 'Two keeps, then turn round. That is the whole thing.',
      maths: '2/5 × 1/2 = 1/5 → 190 × 5 = 950',
      at: 0,
      hold: '950 V-Bucks',
      chain: ['2/5', '× 1/2', '= 1/5', '↩ 190', '× 5', '= 950'],
      mark: 'chain',
    },
  ],
  oneline: '2/5 × 1/2 = 1/5 → 190 × 5 = 950 V-Bucks',
}

export const SE_VOYAGES: SeVoyage[] = [V1, V2, V3, V4, V5, V6, V7, V8, V9, V10]

/** The second take on a §24ab example, if it has one. */
export function seVoyageFor(workedId: string): SeVoyage | null {
  return SE_VOYAGES.find((v) => v.of === workedId) ?? null
}

/**
 * The beat, in v2's language. Deliberately only three, and the first two are
 * in all ten: he should be able to finish the sentence before he reads it.
 */
export const VOY_MARK: Record<NonNullable<SeVoyLeg['mark']>, string> = {
  keeps: '🧭 Write what the island KEEPS, never what it takes. 2/5 gone means 3/5 kept — and no subtracting.',
  chain: '⚓ The whole voyage on one line: multiply the keeps. This works on every single one of these.',
  back: '🔙 You know what ONE part is worth. Turn the ship round and multiply up to the whole.',
}
