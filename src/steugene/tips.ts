// 🏫 St. Eugene 7 (§24ab) — how to start, when the question is a wall of words.
//
// He can do the maths. Ask him 3/4 of 64 and he has it. Put the same sum
// inside four lines of English and he stops before the first number, because
// the hard part was never the arithmetic — it is being handed a paragraph and
// not knowing what the first move is.
//
// So the first move is written down. Not a hint about one question: a PLAN,
// the same five steps every time, short enough to hold in his head and dull
// enough to work on a question nobody has seen yet. It lives here as data
// because two places need it — the 🧭 Tips tab (`/steugene7/tips`), read
// whenever he likes, and the button on the question itself, read at the exact
// moment he is stuck. They must say the same words, or they are two plans.
//
// Nothing here gives an answer away. A plan is not a nudge: §24f's "🤔 I don't
// get it yet" hands him the same move on different numbers and marks the
// question `helped`, because that is a step towards the answer. Reading the
// plan is not, so it is free and it is not recorded.

import type { SeArt, SeIcon } from './types'

export interface SeTipStep {
  /** The move, as an instruction he can actually carry out. */
  do: string
  /** What it looks like on the worksheet question he is on. */
  like?: string
  /**
   * The move, drawn (§24b). He is a visual boy and this is a page of
   * instructions — the one shape of page he is least likely to read. Every
   * move gets a picture for the same reason every question in a lesson does,
   * and they are the same closed set of renderers, so each one is a line.
   */
  art?: SeArt
}

export interface SeTipPlan {
  id: string
  emoji: string
  title: string
  /** One line: when this plan is the right one to open. */
  when: string
  steps: SeTipStep[]
  /** The pixel sprites that parade across the top of the card (§24b). */
  icons?: SeIcon[]
  /** The short list for when he has done all five and it is still not moving. */
  stuck?: string[]
  /** Word → what it means in maths. The clue table. */
  words?: { word: string; means: string }[]
}

/**
 * The general one. It is deliberately about READING, not about fractions:
 * four of the five steps happen before any arithmetic, because that is where
 * he actually stops.
 */
const WORDS: SeTipPlan = {
  id: 'words',
  emoji: '🧭',
  title: 'Any word problem — the five moves',
  when: 'The question is a paragraph and you do not know where to start.',
  icons: ['pizza', 'diamond', 'pokeball', 'vbuck', 'robux', 'ball', 'trophy'],
  steps: [
    {
      do: 'Read it twice. The first time, do not look at a single number.',
      like: 'First read: "a girl has some flour, she bakes twice." That is all you need from read one.',
      art: {
        art: 'table',
        head: ['read', 'what you are hunting for'],
        rows: [
          ['1st', 'just the story — no numbers'],
          ['2nd', 'the numbers, and what they count'],
        ],
        hl: { r: 0 },
      },
    },
    {
      do: 'Find the question. It is nearly always the last sentence.',
      like: '"How much flour is left?" Say it out loud. That is what the answer has to be.',
      art: {
        art: 'table',
        head: ['the sentences'],
        rows: [['Victoria has 2 kg of flour.'], ['She uses 2/5 of it for a pie.'], ['How much is left? ← the job']],
        hl: { r: 2 },
      },
    },
    {
      do: 'Circle every number, and write what it counts beside it.',
      like: '2 kg flour · 2/5 to the pie · 3/10 of the rest to the bread.',
      art: {
        art: 'table',
        head: ['number', 'what it counts'],
        rows: [
          ['2 kg', 'flour at the start'],
          ['2/5', 'goes into the pie'],
          ['3/10', 'of what is LEFT'],
        ],
        hl: { r: 2 },
      },
    },
    {
      do: 'Draw it. One bar for the whole thing, then cut it.',
      like: 'A bar for the 2 kg. Shade 2 of 5 parts for the pie. What is not shaded is what the next sentence works on.',
      art: { art: 'bar', parts: 5, filled: 2, tone: 'focus', label: 'the 2 kg — the pie takes 2/5' },
    },
    {
      do: 'Answer the question you found in move 2 — then add the pieces back up.',
      like: 'Pie + bread + left should come to 2 kg. If it does not, something went wrong.',
      art: { art: 'bar', parts: 5, filled: 5, tone: 'good', label: 'pie + bread + left = the whole' },
    },
  ],
  stuck: [
    'Say the sentence as a picture, not as words. What does it look like?',
    'Try the same question with an easy number — 100, or 20 — then put the real one back.',
    'Cross out everything that is not maths. Names and "after school one afternoon" do no work.',
    'Read only up to the first full stop. Do that bit. Then read the next one.',
  ],
  words: [
    { word: 'of', means: '× — "2/5 of 500" is 2/5 × 500' },
    { word: 'the remaining · what is left', means: 'start again from what is LEFT, not from the start' },
    { word: 'each · split between · shared', means: '÷ by how many there are' },
    { word: 'in total · altogether', means: '+ — add the pieces up' },
    { word: 'how many fit', means: '÷ — "how many 1/4 cups in 3 cups"' },
  ],
}

/**
 * The fraction one. Its whole job is the single sentence he gets wrong, and
 * it says that sentence three different ways on purpose.
 */
const FRAC: SeTipPlan = {
  id: 'frac-remaining',
  emoji: '📝',
  title: 'Fractions — "of the remaining"',
  when: 'Something takes a fraction, and then something else takes a fraction too.',
  icons: ['pizza', 'plank', 'robux', 'vbuck', 'pokeball'],
  steps: [
    {
      do: 'Ask out loud: a fraction of WHAT? Answer it before you multiply.',
      like: '3/10 of the REST, not 3/10 of the 2 kg. Those are different numbers.',
      art: { art: 'pizza', pies: [{ slices: 4, gone: 1, take: 1, label: 'now take 1/3 of what is LEFT' }] },
    },
    {
      do: 'Work out what is left after the first cut. Write it down on its own line.',
      like: '2 kg, 2/5 gone → 3/5 of 2 kg = 6/5 kg left. That 6/5 is now the whole thing.',
      art: { art: 'bar', parts: 5, filled: 2, tone: 'bad', label: '2/5 gone — 3/5 is the new whole' },
    },
    {
      do: 'The second fraction works on that leftover, and on nothing else.',
      like: 'Bread takes 3/10 of 6/5 — the 2 kg is finished with.',
      art: {
        art: 'table',
        head: ['the 2 kg bag', 'the 6/5 kg left'],
        rows: [['finished with', 'the bread works on THIS']],
        hl: { c: 1 },
      },
    },
    {
      do: 'Asked what is LEFT? Take the leftover fraction and skip the subtraction.',
      like: '3/10 is used, so 7/10 survives. 7/10 × 6/5 is one step instead of two.',
      art: {
        art: 'table',
        head: ['used up', 'survives'],
        rows: [
          ['3/10', '7/10'],
          ['3/4', '1/4'],
          ['2/5', '3/5'],
        ],
        hl: { c: 1 },
      },
    },
    {
      do: 'Given only the leftover? Work out what ONE part is worth, then multiply up.',
      like: '7 days is 1/9 of the holiday → 9 × 7 = 63 days in the whole holiday.',
      art: { art: 'bar', parts: 9, filled: 1, tone: 'focus', label: '1 part = 7 days → 9 = 63 days' },
    },
  ],
  stuck: [
    'The second fraction is of a smaller bar, so its answer is smaller than you expect.',
    'Half, then half of the rest, is not all of it. It is three quarters.',
    'Name the leftover before you touch it: "the 300", "the 6/5", "the 4/9".',
  ],
}

export const SE_TIPS: SeTipPlan[] = [WORDS, FRAC]

/**
 * Which plan to offer on a question.
 *
 * Maths only, and only when the prompt is actually wordy — "Work it out:
 * 2/5 × 3" is not a word problem, and a 🧭 button on it is one more thing on
 * the screen that is not helping. Twelve words is where his worksheet's
 * questions start and the bare sums stop.
 */
export const SE_WORDY = 12

export function seTipFor(prompt: string, subtopicId: string): SeTipPlan | null {
  if (prompt.trim().split(/\s+/).length < SE_WORDY) return null
  return subtopicId === 'math-frac-word' ? FRAC : WORDS
}
