// 🏫 St. Eugene 7 (§24ab) — solved in front of him, one move at a time.
//
// A page of advice did not help, and it was never going to: he does not need
// to be TOLD the method, he needs to WATCH it happen, on a real question, over
// and over, until the shape of it is familiar. That is the whole design here.
//
// Every example is the same bar, and the bar does the explaining:
//
//   1. one bar = everything you start with, cut into parts
//   2. the first fraction takes some parts — they go red
//   3. what is left gets a bracket under it
//   4. ⭐ THE LEFTOVER SLIDES OUT AND BECOMES THE WHOLE BAR
//   5. the second fraction takes parts of THAT
//
// Step 4 is the one he gets wrong on paper, and it is the one that is
// impossible to miss when the red parts physically collapse to nothing and
// the rest stretches out to fill the bar. It is marked ⭐ in every example
// that has it, drawn identically every time, because the point is not this
// question — the point is that it is always the same question.
//
// The backwards ones end the other way round: one part turns out to be worth
// the number he was given (🔑), and then the bar comes BACK to full size and
// gets multiplied up.
//
// The ladder is deliberate. Two with one cut, three with two cuts, then his
// own worksheet, then the ones that run backwards. Same bar throughout.
import type { SeIcon } from './types'

/** How a part of the bar is painted. The five states, and nothing else. */
export type SeBarTone =
  /** still in play, nothing has happened to it */
  | 'plain'
  /** spent, eaten, gone — it leaves the bar at the ⭐ step */
  | 'gone'
  /** what is left after a cut: the thing the next sentence works on */
  | 'left'
  /** the part this sentence is taking */
  | 'take'
  /** the answer, or the part we have just been told the value of */
  | 'answer'

export interface SeBarCell {
  /** Stable across stages — the same id in two stages is the same box moving. */
  id: string
  /** Relative width. 0 collapses it away; back to 1 brings it back. */
  w: number
  tone?: SeBarTone
  /** Printed inside the box when it is wide enough. */
  cap?: string
}

export interface SeWorkStage {
  /** The move, in his words. One line. */
  say: string
  /** The arithmetic for this move, if there is any. */
  maths?: string
  /** What the WHOLE bar stands for right now — this changes, and that is the lesson. */
  whole?: string
  cells: SeBarCell[]
  /** A bracket under some boxes, naming what they come to. */
  brace?: { ids: string[]; label: string }
  /**
   * The repeated beat. Drawn the same in every example on purpose: it is the
   * pattern, and a pattern he is shown in the same shape ten times is a
   * pattern he ends up using.
   */
  mark?: 'same' | 'one'
}

export interface SeWorked {
  id: string
  level: 1 | 2 | 3 | 4
  title: string
  icon: SeIcon
  /** The problem, one sentence per line — he is a weak reader. */
  lines: string[]
  /** The question sentence, kept apart because finding it is move 2 (§24ab). */
  ask: string
  answer: string
  stages: SeWorkStage[]
}

export const SE_LEVELS: { level: 1 | 2 | 3 | 4; name: string; blurb: string }[] = [
  { level: 1, name: 'One cut', blurb: 'One fraction, one bar. Start here.' },
  { level: 2, name: 'Two cuts', blurb: 'The second fraction is of WHAT IS LEFT.' },
  { level: 3, name: 'Off his worksheet', blurb: 'The real ones, same bar.' },
  { level: 4, name: 'Backwards', blurb: 'You are told the leftover. Find the start.' },
]

/** `cells('p', 5, 'plain', '100')` → five identical boxes, p1…p5. */
const row = (prefix: string, n: number, tone: SeBarTone = 'plain', cap?: string): SeBarCell[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}`, w: 1, tone, ...(cap ? { cap } : {}) }))

/** The same row, with some boxes repainted (and optionally re-captioned). */
const paint = (cells: SeBarCell[], ids: string[], tone: SeBarTone, cap?: string): SeBarCell[] =>
  cells.map((c) => (ids.includes(c.id) ? { ...c, tone, ...(cap !== undefined ? { cap } : {}) } : c))

/** The same row with some boxes collapsed to nothing — the ⭐ move. */
const drop = (cells: SeBarCell[], ids: string[]): SeBarCell[] =>
  cells.map((c) => (ids.includes(c.id) ? { ...c, w: 0 } : c))

const ids = (prefix: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`)

// --- level 1: one cut ----------------------------------------------------------

const W1: SeWorked = {
  id: 'w-wood1',
  level: 1,
  title: '500 wood, one ramp',
  icon: 'plank',
  lines: ['You drop with 500 wood.', 'You spend 2/5 of it on a ramp.'],
  ask: 'How much wood is left?',
  answer: '300 wood',
  stages: [
    { say: 'One bar for everything you have.', whole: '500 wood', cells: [{ id: 'p1', w: 5, tone: 'plain', cap: '500 wood' }] },
    {
      say: 'The bottom number is 5. Cut the bar into 5 parts.',
      maths: '500 ÷ 5 = 100 in each part',
      whole: '500 wood',
      cells: row('p', 5, 'plain', '100'),
    },
    {
      say: 'The ramp takes 2 of those parts.',
      maths: '2 × 100 = 200 on the ramp',
      whole: '500 wood',
      cells: paint(row('p', 5, 'plain', '100'), ids('p', 1, 2), 'gone'),
      brace: { ids: ids('p', 1, 2), label: '200 spent' },
    },
    {
      say: 'What is left is the other 3 parts.',
      maths: '3 × 100 = 300',
      whole: '500 wood',
      cells: paint(paint(row('p', 5, 'plain', '100'), ids('p', 1, 2), 'gone'), ids('p', 3, 5), 'answer'),
      brace: { ids: ids('p', 3, 5), label: '300 wood left' },
    },
  ],
}

const W2: SeWorked = {
  id: 'w-stack1',
  level: 1,
  title: 'A stack of 64',
  icon: 'chest',
  lines: ['A stack is 64 planks.', 'You use 3/8 of the stack on a floor.'],
  ask: 'How many planks go on the floor?',
  answer: '24 planks',
  stages: [
    { say: 'One bar for the whole stack.', whole: '64 planks', cells: [{ id: 'p1', w: 8, tone: 'plain', cap: '64 planks' }] },
    {
      say: 'The bottom number is 8. Cut it into 8 parts.',
      maths: '64 ÷ 8 = 8 in each part',
      whole: '64 planks',
      cells: row('p', 8, 'plain', '8'),
    },
    {
      say: 'The floor takes 3 of the 8 parts.',
      maths: '3 × 8 = 24',
      whole: '64 planks',
      cells: paint(row('p', 8, 'plain', '8'), ids('p', 1, 3), 'answer'),
      brace: { ids: ids('p', 1, 3), label: '24 planks on the floor' },
    },
  ],
}

// --- level 2: two cuts, and the second is of what is left -----------------------

const W3: SeWorked = {
  id: 'w-wood2',
  level: 2,
  title: '500 wood, a ramp and a box',
  icon: 'sword',
  lines: ['You drop with 500 wood.', 'You spend 2/5 of it on a ramp.', 'Then you spend 1/2 of what is left on a box.'],
  ask: 'How much wood is left at the end?',
  answer: '150 wood',
  stages: [
    {
      say: 'One bar. Fifths and halves both fit into 10 parts.',
      maths: '500 ÷ 10 = 50 in each part',
      whole: '500 wood',
      cells: row('p', 10, 'plain', '50'),
    },
    {
      say: 'The ramp takes 2/5 — that is 4 of the 10 parts.',
      maths: '4 × 50 = 200 on the ramp',
      whole: '500 wood',
      cells: paint(row('p', 10, 'plain', '50'), ids('p', 1, 4), 'gone'),
    },
    {
      say: 'What is left is 6 parts.',
      maths: '6 × 50 = 300 left',
      whole: '500 wood',
      cells: paint(paint(row('p', 10, 'plain', '50'), ids('p', 1, 4), 'gone'), ids('p', 5, 10), 'left'),
      brace: { ids: ids('p', 5, 10), label: '300 left' },
    },
    {
      say: 'That 300 is now the whole bar.',
      maths: 'the 500 is finished with',
      whole: '300 wood — the new whole',
      cells: drop(paint(row('p', 10, 'plain', '50'), ids('p', 5, 10), 'left'), ids('p', 1, 4)),
      mark: 'same',
    },
    {
      say: 'The box takes half of it: 3 of the 6 parts.',
      maths: '3 × 50 = 150 on the box',
      whole: '300 wood',
      cells: drop(paint(paint(row('p', 10, 'plain', '50'), ids('p', 5, 10), 'left'), ids('p', 5, 7), 'gone'), ids('p', 1, 4)),
    },
    {
      say: 'What is left is the last 3 parts.',
      maths: '3 × 50 = 150',
      whole: '300 wood',
      cells: drop(
        paint(paint(paint(row('p', 10, 'plain', '50'), ids('p', 5, 10), 'left'), ids('p', 5, 7), 'gone'), ids('p', 8, 10), 'answer'),
        ids('p', 1, 4),
      ),
      brace: { ids: ids('p', 8, 10), label: '150 wood left' },
    },
  ],
}

const W4: SeWorked = {
  id: 'w-pizza1',
  level: 2,
  title: 'A party pizza',
  icon: 'pizza',
  lines: ['A party pizza has 12 slices.', '2/3 of it gets eaten.', 'Half of what is left goes in a box.'],
  ask: 'How many slices go in the box?',
  answer: '2 slices',
  stages: [
    {
      say: 'One bar. Thirds and halves both fit into 6 parts.',
      maths: '12 ÷ 6 = 2 slices in each part',
      whole: '12 slices',
      cells: row('p', 6, 'plain', '2'),
    },
    {
      say: '2/3 gets eaten — that is 4 of the 6 parts.',
      maths: '4 × 2 = 8 slices eaten',
      whole: '12 slices',
      cells: paint(row('p', 6, 'plain', '2'), ids('p', 1, 4), 'gone'),
    },
    {
      say: 'What is left is 2 parts.',
      maths: '2 × 2 = 4 slices left',
      whole: '12 slices',
      cells: paint(paint(row('p', 6, 'plain', '2'), ids('p', 1, 4), 'gone'), ids('p', 5, 6), 'left'),
      brace: { ids: ids('p', 5, 6), label: '4 slices left' },
    },
    {
      say: 'Those 4 slices are now the whole bar.',
      maths: 'the 12 is finished with',
      whole: '4 slices — the new whole',
      cells: drop(paint(row('p', 6, 'plain', '2'), ids('p', 5, 6), 'left'), ids('p', 1, 4)),
      mark: 'same',
    },
    {
      say: 'The box takes half: 1 of the 2 parts.',
      maths: '1 × 2 = 2 slices',
      whole: '4 slices',
      cells: drop(paint(paint(row('p', 6, 'plain', '2'), ids('p', 5, 6), 'left'), ['p5'], 'answer'), ids('p', 1, 4)),
      brace: { ids: ['p5'], label: '2 slices in the box' },
    },
  ],
}

const W5: SeWorked = {
  id: 'w-bucket',
  level: 2,
  title: "Karen's rainwater",
  icon: 'potion',
  lines: ['Karen collects 6/7 of a bucket of rainwater.', 'She uses 1/2 of it to clean her bike.', 'She splits the rest between 3 plants.'],
  ask: 'What fraction of a bucket does each plant get?',
  answer: '1/7 of a bucket',
  stages: [
    {
      say: 'One bar for a FULL bucket. Sevenths, because of the 6/7.',
      whole: '1 full bucket',
      cells: row('p', 7, 'plain', '1/7'),
    },
    {
      say: 'She only collected 6 of the 7 parts.',
      whole: '1 full bucket',
      cells: paint(row('p', 7, 'plain', '1/7'), ids('p', 1, 6), 'left'),
      brace: { ids: ids('p', 1, 6), label: 'what she has: 6/7' },
    },
    {
      say: 'The bike takes half of her 6 parts: 3 of them.',
      maths: 'half of 6 parts = 3 parts',
      whole: '1 full bucket',
      cells: paint(paint(row('p', 7, 'plain', '1/7'), ids('p', 1, 6), 'left'), ids('p', 1, 3), 'gone'),
      brace: { ids: ids('p', 4, 6), label: '3/7 left' },
    },
    {
      say: 'Those 3 parts are now the whole bar.',
      maths: 'the bike water is finished with',
      whole: '3/7 of a bucket — the new whole',
      cells: drop(paint(row('p', 7, 'plain', '1/7'), ids('p', 4, 6), 'left'), [...ids('p', 1, 3), 'p7']),
      mark: 'same',
    },
    {
      say: 'Share it between the 3 plants: one part each.',
      maths: '3 parts ÷ 3 plants = 1 part each',
      whole: '3/7 of a bucket',
      cells: [
        { id: 'p1', w: 0 },
        { id: 'p2', w: 0 },
        { id: 'p3', w: 0 },
        { id: 'p4', w: 1, tone: 'answer', cap: 'plant 1' },
        { id: 'p5', w: 1, tone: 'answer', cap: 'plant 2' },
        { id: 'p6', w: 1, tone: 'answer', cap: 'plant 3' },
        { id: 'p7', w: 0 },
      ],
      brace: { ids: ['p4'], label: 'one plant' },
    },
    {
      say: 'Each plant gets one part — and one part is 1/7 of a bucket.',
      maths: 'each plant: 1/7 of a bucket',
      whole: '3/7 of a bucket',
      cells: [
        { id: 'p1', w: 0 },
        { id: 'p2', w: 0 },
        { id: 'p3', w: 0 },
        { id: 'p4', w: 1, tone: 'answer', cap: '1/7' },
        { id: 'p5', w: 1, tone: 'answer', cap: '1/7' },
        { id: 'p6', w: 1, tone: 'answer', cap: '1/7' },
        { id: 'p7', w: 0 },
      ],
      brace: { ids: ids('p', 4, 6), label: '1/7 each' },
    },
  ],
}

// --- level 3: his own worksheet -------------------------------------------------

const W6: SeWorked = {
  id: 'w-flour',
  level: 3,
  title: "Victoria's flour",
  icon: 'cookie',
  lines: ['Victoria has 2 kg of flour.', 'She uses 2/5 of it for a pie.', 'She uses 3/10 of what is left for bread.'],
  ask: 'How much flour is left?',
  answer: '21/25 kg (0.84 kg)',
  stages: [
    {
      say: 'One bar for the 2 kg. Fifths, because of the 2/5.',
      maths: '2 ÷ 5 = 0.4 kg in each part',
      whole: '2 kg of flour',
      cells: row('p', 5, 'plain', '0.4'),
    },
    {
      say: 'The pie takes 2 of the 5 parts.',
      maths: '2 × 0.4 = 0.8 kg into the pie',
      whole: '2 kg of flour',
      cells: paint(row('p', 5, 'plain', '0.4'), ids('p', 1, 2), 'gone'),
    },
    {
      say: 'What is left is 3 parts.',
      maths: '3 × 0.4 = 1.2 kg left',
      whole: '2 kg of flour',
      cells: paint(paint(row('p', 5, 'plain', '0.4'), ids('p', 1, 2), 'gone'), ids('p', 3, 5), 'left'),
      brace: { ids: ids('p', 3, 5), label: '1.2 kg left' },
    },
    {
      say: 'That 1.2 kg is now the whole bar.',
      maths: 'the 2 kg is finished with',
      whole: '1.2 kg — the new whole',
      cells: drop(paint(row('p', 5, 'plain', '0.4'), ids('p', 3, 5), 'left'), ids('p', 1, 2)),
      mark: 'same',
    },
    {
      say: 'The bread takes tenths, so cut this bar into 10.',
      maths: '1.2 ÷ 10 = 0.12 kg in each part',
      whole: '1.2 kg',
      cells: [...drop(row('p', 5), ids('p', 1, 5)), ...row('q', 10, 'plain', '0.12')],
    },
    {
      say: 'The bread takes 3 of the 10 parts.',
      maths: '3 × 0.12 = 0.36 kg into the bread',
      whole: '1.2 kg',
      cells: [...drop(row('p', 5), ids('p', 1, 5)), ...paint(row('q', 10, 'plain', '0.12'), ids('q', 1, 3), 'gone')],
    },
    {
      say: 'What is left is 7 parts.',
      maths: '7 × 0.12 = 0.84 kg',
      whole: '1.2 kg',
      cells: [
        ...drop(row('p', 5), ids('p', 1, 5)),
        ...paint(paint(row('q', 10, 'plain', '0.12'), ids('q', 1, 3), 'gone'), ids('q', 4, 10), 'answer'),
      ],
      brace: { ids: ids('q', 4, 10), label: '0.84 kg = 21/25 kg' },
    },
  ],
}

const W7: SeWorked = {
  id: 'w-drums',
  level: 3,
  title: "Clayton's drums",
  icon: 'star',
  lines: [
    'Clayton spends half his afternoon on homework and dinner.',
    'He spends 3/4 of the time left on the drums.',
    'The last 3/4 of an hour he spends texting.',
  ],
  ask: 'How long was he on the drums?',
  answer: '2¼ hours',
  stages: [
    {
      say: 'One bar for the afternoon. Halves and quarters fit into 8.',
      whole: 'the whole afternoon',
      cells: row('p', 8),
    },
    {
      say: 'Homework and dinner take half: 4 of the 8 parts.',
      whole: 'the whole afternoon',
      cells: paint(row('p', 8), ids('p', 1, 4), 'gone'),
    },
    {
      say: 'What is left is 4 parts.',
      whole: 'the whole afternoon',
      cells: paint(paint(row('p', 8), ids('p', 1, 4), 'gone'), ids('p', 5, 8), 'left'),
      brace: { ids: ids('p', 5, 8), label: 'the time left' },
    },
    {
      say: 'Those 4 parts are now the whole bar.',
      whole: 'the time left',
      cells: drop(paint(row('p', 8), ids('p', 5, 8), 'left'), ids('p', 1, 4)),
      mark: 'same',
    },
    {
      say: 'The drums take 3/4 of it: 3 of the 4 parts.',
      whole: 'the time left',
      cells: drop(paint(paint(row('p', 8), ids('p', 5, 8), 'left'), ids('p', 5, 7), 'take'), ids('p', 1, 4)),
    },
    {
      say: 'Texting is the last part — and we are told that is 3/4 hour.',
      maths: 'so ONE part = 3/4 hour',
      whole: 'the time left',
      cells: drop(
        paint(paint(paint(row('p', 8), ids('p', 5, 8), 'left'), ids('p', 5, 7), 'take'), ['p8'], 'answer', '3/4 h'),
        ids('p', 1, 4),
      ),
      brace: { ids: ['p8'], label: '3/4 hour' },
      mark: 'one',
    },
    {
      say: 'The drums were 3 of those parts.',
      maths: '3 × 3/4 = 9/4 = 2¼ hours',
      whole: 'the time left',
      cells: drop(
        paint(paint(paint(row('p', 8), ids('p', 5, 8), 'left'), ids('p', 5, 7), 'take', '3/4 h'), ['p8'], 'answer', '3/4 h'),
        ids('p', 1, 4),
      ),
      brace: { ids: ids('p', 5, 7), label: '2¼ hours on the drums' },
    },
  ],
}

// --- level 4: you are told the leftover, find the start -------------------------

const W8: SeWorked = {
  id: 'w-holiday',
  level: 4,
  title: "Julia's holiday",
  icon: 'trophy',
  lines: ['Julia spends 5/9 of her holiday at camp.', 'She spends 3/4 of the time left at her grandparents.', 'The last 7 days are at the seashore.'],
  ask: 'How long is the whole holiday?',
  answer: '63 days',
  stages: [
    { say: 'One bar for the holiday. Ninths, because of the 5/9.', whole: 'the whole holiday', cells: row('p', 9) },
    {
      say: 'Camp takes 5 of the 9 parts.',
      whole: 'the whole holiday',
      cells: paint(row('p', 9), ids('p', 1, 5), 'gone'),
    },
    {
      say: 'What is left is 4 parts.',
      whole: 'the whole holiday',
      cells: paint(paint(row('p', 9), ids('p', 1, 5), 'gone'), ids('p', 6, 9), 'left'),
      brace: { ids: ids('p', 6, 9), label: 'the time left' },
    },
    {
      say: 'Those 4 parts are now the whole bar.',
      whole: 'the time left',
      cells: drop(paint(row('p', 9), ids('p', 6, 9), 'left'), ids('p', 1, 5)),
      mark: 'same',
    },
    {
      say: 'Grandparents take 3/4 of it: 3 of the 4 parts.',
      whole: 'the time left',
      cells: drop(paint(paint(row('p', 9), ids('p', 6, 9), 'left'), ids('p', 6, 8), 'take'), ids('p', 1, 5)),
    },
    {
      say: 'The seashore is the last part — and that is 7 days.',
      maths: 'so ONE part = 7 days',
      whole: 'the time left',
      cells: drop(
        paint(paint(paint(row('p', 9), ids('p', 6, 9), 'left'), ids('p', 6, 8), 'take'), ['p9'], 'answer', '7 days'),
        ids('p', 1, 5),
      ),
      brace: { ids: ['p9'], label: '7 days' },
      mark: 'one',
    },
    {
      say: 'Bring the whole bar back. It had 9 parts.',
      maths: '9 × 7 = 63 days',
      whole: 'the whole holiday',
      cells: row('p', 9, 'answer', '7'),
      brace: { ids: ids('p', 1, 9), label: '63 days in all' },
    },
  ],
}

const W9: SeWorked = {
  id: 'w-pay',
  level: 4,
  title: "Ramon's pay",
  icon: 'gold',
  lines: ['Ramon spends 2/5 of his pay on rent.', 'He spends 1/5 of it on bills.', 'He spends 3/4 of what is left on food.', 'He saves the rest: $193.50.'],
  ask: 'What is his monthly pay?',
  answer: '$1935',
  stages: [
    { say: 'One bar for his pay. Fifths fit into 10 parts.', whole: 'his monthly pay', cells: row('p', 10) },
    {
      say: 'Rent takes 2/5: 4 of the 10 parts.',
      whole: 'his monthly pay',
      cells: paint(row('p', 10), ids('p', 1, 4), 'gone'),
    },
    {
      say: 'Bills take 1/5: 2 more parts.',
      maths: 'gone so far: 6 of the 10 parts',
      whole: 'his monthly pay',
      cells: paint(row('p', 10), ids('p', 1, 6), 'gone'),
    },
    {
      say: 'What is left is 4 parts.',
      whole: 'his monthly pay',
      cells: paint(paint(row('p', 10), ids('p', 1, 6), 'gone'), ids('p', 7, 10), 'left'),
      brace: { ids: ids('p', 7, 10), label: 'what is left' },
    },
    {
      say: 'Those 4 parts are now the whole bar.',
      whole: 'what is left',
      cells: drop(paint(row('p', 10), ids('p', 7, 10), 'left'), ids('p', 1, 6)),
      mark: 'same',
    },
    {
      say: 'Food takes 3/4 of it: 3 of the 4 parts.',
      whole: 'what is left',
      cells: drop(paint(paint(row('p', 10), ids('p', 7, 10), 'left'), ids('p', 7, 9), 'take'), ids('p', 1, 6)),
    },
    {
      say: 'What he saves is the last part — $193.50.',
      maths: 'so ONE part = $193.50',
      whole: 'what is left',
      cells: drop(
        paint(paint(paint(row('p', 10), ids('p', 7, 10), 'left'), ids('p', 7, 9), 'take'), ['p10'], 'answer', '193.50'),
        ids('p', 1, 6),
      ),
      brace: { ids: ['p10'], label: '$193.50' },
      mark: 'one',
    },
    {
      say: 'Bring the whole bar back. It had 10 parts.',
      maths: '10 × 193.50 = $1935',
      whole: 'his monthly pay',
      cells: row('p', 10, 'answer'),
      brace: { ids: ids('p', 1, 10), label: '$1935 a month' },
    },
  ],
}

const W10: SeWorked = {
  id: 'w-vbucks',
  level: 4,
  title: 'The skin and the emote',
  icon: 'vbuck',
  lines: ['You spend 3/5 of your V-Bucks on a skin.', 'You spend half of what is left on an emote.', 'You have 190 V-Bucks left.'],
  ask: 'How many V-Bucks did you start with?',
  answer: '950 V-Bucks',
  stages: [
    { say: 'One bar for what you started with. Fifths.', whole: 'what you started with', cells: row('p', 5) },
    {
      say: 'The skin takes 3/5: 3 of the 5 parts.',
      whole: 'what you started with',
      cells: paint(row('p', 5), ids('p', 1, 3), 'gone'),
    },
    {
      say: 'What is left is 2 parts.',
      whole: 'what you started with',
      cells: paint(paint(row('p', 5), ids('p', 1, 3), 'gone'), ids('p', 4, 5), 'left'),
      brace: { ids: ids('p', 4, 5), label: 'what is left' },
    },
    {
      say: 'Those 2 parts are now the whole bar.',
      whole: 'what is left',
      cells: drop(paint(row('p', 5), ids('p', 4, 5), 'left'), ids('p', 1, 3)),
      mark: 'same',
    },
    {
      say: 'The emote takes half: 1 of the 2 parts.',
      whole: 'what is left',
      cells: drop(paint(paint(row('p', 5), ids('p', 4, 5), 'left'), ['p4'], 'take'), ids('p', 1, 3)),
    },
    {
      say: 'What you still have is the last part — 190.',
      maths: 'so ONE part = 190 V-Bucks',
      whole: 'what is left',
      cells: drop(paint(paint(paint(row('p', 5), ids('p', 4, 5), 'left'), ['p4'], 'take'), ['p5'], 'answer', '190'), ids('p', 1, 3)),
      brace: { ids: ['p5'], label: '190 V-Bucks' },
      mark: 'one',
    },
    {
      say: 'Bring the whole bar back. It had 5 parts.',
      maths: '5 × 190 = 950 V-Bucks',
      whole: 'what you started with',
      cells: row('p', 5, 'answer', '190'),
      brace: { ids: ids('p', 1, 5), label: '950 — a Battle Pass' },
    },
  ],
}

export const SE_WORKED: SeWorked[] = [W1, W2, W3, W4, W5, W6, W7, W8, W9, W10]

/** Every box id this example ever uses, left to right — the bar's full width. */
export function seBarOrder(w: SeWorked): string[] {
  const seen: string[] = []
  for (const st of w.stages) for (const c of st.cells) if (!seen.includes(c.id)) seen.push(c.id)
  return seen
}

export const MARK_TEXT: Record<NonNullable<SeWorkStage['mark']>, string> = {
  same: '⭐ The leftover becomes the whole bar. This happens in nearly every one.',
  one: '🔑 One part is worth the number they told you. Now multiply it up.',
}
