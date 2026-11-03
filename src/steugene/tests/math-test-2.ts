// 🏫 St. Eugene 7 (§24ad) — 📝 Math test 2, sat 3 November 2026. Written by hand.
//
// Online Workbook 7A, Chapter 3 Review/Test — fractions. 16/20 on page 1,
// then page 2 and page 3 cost him the rest. Only the questions he got WRONG
// or left BLANK are here. The fourteen he got right are not: re-asking them
// teaches nothing and turns the page into a punishment for sitting a test.
//
// SIX of the ten are the same mistake. 4 1/6 − 1 1/3, 5 2/9 − 3 1/3,
// 7 5/12 − 2 7/8, 1 5/7 − 2/5 − 3/5, Kalim's juice and the melon all needed a
// whole broken into slices, and all six came back as a NEGATIVE fraction —
// "3 −1/6", "−1/9", "5 −11/24", "−2/9". His teacher wrote it in red across
// question 30: *No negative integers in a fraction. All proper fractions are
// under a whole.*
//
// So this section teaches one move — borrow one whole, turn it into slices —
// and then asks for it six times, which is the only reason a section exists
// at all (§24a: a way of being wrong, not a page).
//
// The other four are each their own thing: the word for the bottom number
// (he answered "reciprocal"), finishing a "Solve" question with a sentence
// (he had 8/9 right and lost the mark for stopping at the number), and the
// 3-mark bonus he did not attempt, which is dividing by a fraction.
import type { SeTest } from '../types'

export const test: SeTest = {
  id: 'test-math-2',
  title: 'Math test 2',
  on: '2026-11-03',
  paper: 'Online Workbook 7A · Chapter 3 Review/Test',
  score: '16/20 · 14 · bonus not attempted',
  thread: 'Six of these ten are one move: when the fraction leaving is bigger than the one you have, break a whole into slices. Nothing ever goes negative.',
  sample: '4 1/6 − 1 1/3 = 3 7/6 − 1 2/6',
  plain: 'The ten off your fractions test — the ones that got a red circle, and the bonus you did not start.',
  can: 'I can take a bigger fraction away from a smaller one by breaking a whole into slices.',

  questions: [
    {
      id: 't2-q1',
      no: '1',
      how: 'wrong',
      put: 'reciprocal',
      slip: 'He reached for "reciprocal" — the right word for flipping a fraction over, and the wrong word for the bottom number two fractions share.',
      say: [
        'Ask him what the bottom of a fraction is called. Denominator — he knows this one.',
        'Then: "so the one they both agree on is the common denominator, and the smallest one is the LEAST common denominator."',
        'Reciprocal is worth two seconds: 3/4 flips to 4/3. Say "that is the dividing one" and leave it there. It is a real word, just for a different job.',
      ],
    },
    {
      id: 't2-q2',
      no: '18',
      how: 'wrong',
      put: '3 −1/6',
      slip: 'He took 1/6 − 2/6 and wrote the leftover as −1/6. One whole was sitting right there waiting to be broken up.',
      say: [
        'Do not start at the arithmetic. Start at: "you have 1 slice and 2 are leaving. Where do you get another slice from?"',
        'Four whole pizzas are on the table. Break one into sixths: 4 1/6 is 3 7/6. Say it with your hands.',
        'Then it is easy: 7 sixths take away 2 sixths is 5 sixths. 2 5/6.',
        'Close with the teacher\'s own line: a leftover is never below zero.',
      ],
    },
    {
      id: 't2-q3',
      no: '19',
      how: 'wrong',
      put: '−1/9',
      slip: 'Same move missed again, and this time the whole numbers vanished with it: 5 − 3 is 2, and his answer had no 1 in front of it at all.',
      say: [
        'Same two questions as 18: make the slices match (1/3 = 3/9), then "2 ninths, 3 leaving — break a whole".',
        '5 2/9 becomes 4 11/9. 11 take 3 is 8. 4 take 3 is 1. So 1 8/9.',
        'If he gets the fraction right but drops the whole number, stop and count the wholes out loud before the slices. That is a separate slip and it is worth naming.',
      ],
    },
    {
      id: 't2-q4',
      no: '20',
      how: 'wrong',
      put: '5 −11/24',
      slip: 'He got the hard part right — twelfths and eighths both to 24ths — and then wrote the negative anyway.',
      say: [
        'Give him the credit first: finding 24 is the part most people get wrong, and he found it.',
        'Then only the borrow: 7 10/24 is 6 34/24. 34 take 21 is 13. 6 take 2 is 4. 4 13/24.',
        'This is the one to end on. If he can do it after 18 and 19, the move has landed.',
      ],
    },
    {
      id: 't2-q5',
      no: '28',
      how: 'wrong',
      put: '2 5/7',
      slip: 'Two takeaways in a row, and he added the second one. Turning all three into 35ths made it harder than it was.',
      say: [
        'Cover the 1 5/7 with your thumb and ask what 2/5 + 3/5 is. Five fifths. One whole.',
        'Uncover it: "so you are just taking one whole off 1 5/7." 5/7.',
        'The paper says *solve mentally* — this is what it means. No 35ths anywhere.',
      ],
    },
    {
      id: 't2-q6',
      no: '30',
      how: 'wrong',
      put: '1/3',
      slip: 'He wrote 2 1/3 − 5/6 = 2 −3/6, patched it to 2 1/2 instead of 1 1/2, and the lost whole carton followed him to the end.',
      say: [
        'The shortcut first: 5/6 of one carton plus 1/6 of another is one whole carton used. 2 1/3 − 1 = 1 1/3.',
        'Then go back and do it his way, properly, because that is the way he will meet on the test: 2 1/3 is 2 2/6, break a whole, 1 8/6 − 5/6 = 1 1/2.',
        'Both roads end at 1 1/3. Show him they agree — that is what makes the shortcut trustworthy rather than a trick.',
      ],
    },
    {
      id: 't2-q7',
      no: '31a',
      how: 'marks',
      put: '3/9 + 5/9 = 8/9',
      slip: 'Right answer, marks gone: "No sentence" in red. He stopped at the number on a question headed "Solve."',
      say: [
        'This is the cheapest mark on the whole paper and he is leaving it every time.',
        'The sentence is not writing — it is copying. Take the words out of the question and put the number in: "Kayla and Kevin ate 8/9 of the melon."',
        'Make it a habit with one rule: if the question has people\'s names in it, the answer has their names in it.',
      ],
    },
    {
      id: 't2-q8',
      no: '31b',
      how: 'wrong',
      put: '−2/9',
      slip: 'He subtracted the wrong way round. The whole melon is 9/9 and he never wrote it down, so there was nothing to take the 8/9 from.',
      say: [
        'Ask: "how many ninths in a whole melon?" Nine. Write 9/9 on the page before anything else.',
        'Then it is 9/9 − 8/9 = 1/9, and there is nothing to go negative.',
        'Same family as 18, 19 and 20: the whole has to be written as slices before you can take slices off it.',
      ],
    },
    {
      id: 't2-q9',
      no: '32a (bonus)',
      how: 'blank',
      put: undefined,
      slip: 'Not attempted. Three marks, and the question is one division he can already do.',
      say: [
        'Read it to him and stop at: "how many 1/16 pieces fit into 5/8?" That sentence is the whole question.',
        '5/8 ÷ 1/16 — flip and multiply: 5/8 × 16 = 80/8 = 10 pieces.',
        'Then check it in front of him: 10 × 1/16 = 10/16 = 5/8. The check is what makes a bonus worth starting.',
        'Worth saying out loud: a bonus is free marks. Writing one line beats writing nothing, every time.',
      ],
    },
    {
      id: 't2-q10',
      no: '32b (bonus)',
      how: 'blank',
      put: undefined,
      slip: 'Not attempted. It does not even need part (a) — one piece is 1/16 of the rectangle, whatever the red part was doing.',
      say: [
        'Point out that (b) does not depend on (a): he could have had this one with (a) blank.',
        'Each piece is 1/16 of the WHOLE rectangle. 48 ÷ 16 = 3 cm².',
        'If he wants the long way: 10 pieces × 3 = 30 cm², and 5/8 of 48 is 30. They agree.',
      ],
    },
  ],

  pack: {
    subtopicId: 'test-math-2',

    core: [
      // --- the thread: break a whole into slices -----------------------------
      {
        kind: 'explain',
        id: 't2-e1',
        emoji: '🍕',
        title: 'Break a whole into slices',
        lines: [
          '4 1/6 − 1 1/3. Make the slices match first: 1/3 = 2/6.',
          'Now 4 1/6 − 1 2/6. You have 1 sixth and 2 are leaving.',
          'There are 4 whole pizzas sitting there. Break one into 6 slices.',
          '4 1/6 is the same as 3 7/6. Now 7 − 2 = 5 slices. Answer: 2 5/6.',
        ],
        art: {
          art: 'pizza',
          pies: [
            { slices: 1, size: 0.55, label: '1' },
            { slices: 1, size: 0.55, label: '1' },
            { slices: 1, size: 0.55, label: '1' },
            { slices: 6, size: 0.55, take: 6, label: '+ 6/6' },
            { slices: 6, size: 0.55, take: 1, label: '+ 1/6' },
          ],
          label: '4 1/6 is the same as 3 7/6',
        },
        callout: {
          flavour: 'key',
          text: 'A leftover is never below zero. If the fraction leaving is bigger, break a whole — do not write a minus.',
        },
        secs: 60,
      },
      {
        kind: 'explain',
        id: 't2-e2',
        emoji: '🔤',
        title: 'Least common denominator',
        lines: [
          'The bottom number is the denominator. In 1/6 and 1/3 it is the 6 and the 3.',
          'To add or take away, both bottoms have to match.',
          'The smallest number they both go into is the least common denominator.',
          'A reciprocal is something else: flip it over. 3/4 → 4/3. That one is for dividing.',
        ],
        art: {
          art: 'table',
          head: ['bottoms', 'least common denominator'],
          rows: [
            ['6 and 3', '6'],
            ['12 and 8', '24'],
            ['5 and 7', '35'],
            ['9 and 3', '9'],
          ],
        },
        secs: 50,
      },
      {
        kind: 'explain',
        id: 't2-e3',
        emoji: '🧮',
        title: 'Two takeaways? Add them first',
        lines: [
          '1 5/7 − 2/5 − 3/5 looks like three numbers and a lot of work.',
          'Add the two that are leaving: 2/5 + 3/5 = 5/5, which is 1 whole.',
          'So the whole question is 1 5/7 − 1.',
          'Kalim is the same: 5/6 of a carton plus 1/6 of a carton is one whole carton gone.',
        ],
        art: { art: 'bar', parts: 5, filled: 5, tone: 'good', label: '2/5 + 3/5 = 5/5 = 1 whole' },
        callout: {
          flavour: 'imagine',
          text: 'The paper says "solve mentally". That is the clue: there is a shortcut hiding in it.',
        },
        secs: 50,
      },
      {
        kind: 'explain',
        id: 't2-e4',
        emoji: '🍈',
        title: 'One whole, written as slices',
        lines: [
          'A whole melon is 1. In ninths, 1 is 9/9.',
          'You cannot take 8/9 off "1" until the 1 is written as ninths.',
          'Write 9/9 down first. Then 9/9 − 8/9.',
          '"Left over" means what is still on the table, so it can never be below zero.',
        ],
        art: { art: 'pie', parts: 9, filled: 8, tone: 'calm', label: '8/9 eaten' },
        secs: 45,
      },
      {
        kind: 'explain',
        id: 't2-e5',
        emoji: '✍️',
        title: 'Finish it with a sentence',
        lines: [
          '"Solve." at the top means the answer is a sentence, not just a number.',
          'You had 8/9 right on the test and lost the mark for stopping at the number.',
          'The sentence is copying, not writing: take the words out of the question.',
          '"Kayla and Kevin ate 8/9 of the melon." One line, ten seconds, a whole mark.',
        ],
        callout: {
          flavour: 'gotcha',
          text: 'Rule of thumb: if the question has people\'s names in it, your answer has their names in it.',
        },
        secs: 45,
      },
      {
        kind: 'explain',
        id: 't2-e6',
        emoji: '✂️',
        title: 'Dividing asks "how many fit?"',
        lines: [
          '5/8 ÷ 1/16 is asking: how many 1/16 pieces fit inside 5/8?',
          'Flip the second one and multiply: 5/8 × 16/1 = 80/8.',
          'Check it afterwards by multiplying back — that is what makes a bonus worth starting.',
          'Careful: each piece is 1/16 of the WHOLE rectangle, not 1/16 of the red part.',
        ],
        art: {
          art: 'blocks',
          w: 4,
          h: 4,
          tile: 'stone',
          paint: [
            { x: 0, y: 0, w: 4, h: 2, tile: 'brick' },
            { x: 0, y: 2, w: 2, h: 1, tile: 'brick' },
          ],
          label: 'the whole rectangle is 16 pieces · the red part is 5/8 of it',
        },
        secs: 55,
      },

      // --- the ten questions, in paper order ---------------------------------
      {
        kind: 'choice',
        id: 't2-q1',
        lead: 't2-e2',
        prompt: 'Question 1. The ______ of two fractions is the least common multiple of their denominators.',
        options: ['the reciprocal', 'the least common denominator', 'the greatest common denominator'],
        answer: 1,
        why: 'The least common denominator — the smallest bottom number both fractions can share. A reciprocal is a flip, and that is for dividing.',
        steps: [
          { text: 'Different pair: 3/4 and 5/6.' },
          { text: 'The bottoms are 4 and 6. The smallest number both go into is 12.' },
          { text: '12 is the least common denominator. 3/4 = 9/12 and 5/6 = 10/12.' },
        ],
        secs: 40,
      },
      {
        kind: 'choice',
        id: 't2-q2',
        lead: 't2-e1',
        prompt: 'Question 18. Subtract, in simplest form: 4 1/6 − 1 1/3',
        art: { art: 'pizza', pies: [{ slices: 6, size: 0.6, take: 1, label: '1/6' }, { slices: 6, size: 0.6, take: 2, label: '1/3 = 2/6' }] },
        options: ['3 5/6', '2 5/6', '3 -1/6'],
        answer: 1,
        why: '1/3 = 2/6, so it is 4 1/6 − 1 2/6. Break a whole: 3 7/6 − 1 2/6 = 2 5/6.',
        steps: [
          { text: 'Different one: 5 1/4 − 2 1/2.' },
          { text: 'Same slices first: 1/2 = 2/4. So 5 1/4 − 2 2/4.' },
          { text: 'Only 1 quarter and 2 are leaving — break a whole: 5 1/4 = 4 5/4.' },
          { text: '4 5/4 − 2 2/4 = 2 3/4.' },
        ],
        secs: 60,
      },
      {
        kind: 'choice',
        id: 't2-q3',
        lead: 't2-e1',
        prompt: 'Question 19. Subtract, in simplest form: 5 2/9 − 3 1/3',
        options: ['2 8/9', '1 8/9', '1 -1/9'],
        answer: 1,
        why: '1/3 = 3/9, so 5 2/9 − 3 3/9. Break a whole: 4 11/9 − 3 3/9 = 1 8/9.',
        steps: [
          { text: 'Different one: 7 1/8 − 4 1/2.' },
          { text: '1/2 = 4/8. So 7 1/8 − 4 4/8.' },
          { text: 'Break a whole: 7 1/8 = 6 9/8.' },
          { text: '6 9/8 − 4 4/8 = 2 5/8.' },
        ],
        secs: 60,
      },
      {
        kind: 'choice',
        id: 't2-q4',
        lead: 't2-e1',
        prompt: 'Question 20. Subtract, in simplest form: 7 5/12 − 2 7/8',
        options: ['5 13/24', '4 13/24', '5 -11/24'],
        answer: 1,
        why: 'Twelfths and eighths both become 24ths: 7 10/24 − 2 21/24. Break a whole: 6 34/24 − 2 21/24 = 4 13/24.',
        steps: [
          { text: 'Different one: 5 1/6 − 1 3/4.' },
          { text: 'The bottoms 6 and 4 both go into 12. So 1/6 = 2/12 and 3/4 = 9/12.' },
          { text: 'Break a whole: 5 2/12 = 4 14/12.' },
          { text: '4 14/12 − 1 9/12 = 3 5/12.' },
        ],
        secs: 70,
      },
      {
        kind: 'build',
        id: 't2-q5',
        lead: 't2-e3',
        prompt: 'Question 28, mentally. Work out 1 5/7 − 2/5 − 3/5',
        answer: '5/7',
        decoys: ['2', '1'],
        why: '2/5 + 3/5 = 1 whole, so it is 1 5/7 − 1 = 5/7.',
        steps: [
          { text: 'Different one: 2 3/8 − 1/4 − 3/4.' },
          { text: 'Add the two that are leaving: 1/4 + 3/4 = 1 whole.' },
          { text: 'So 2 3/8 − 1 = 1 3/8.' },
        ],
        secs: 70,
      },
      {
        kind: 'choice',
        id: 't2-q6',
        lead: 't2-e3',
        prompt: 'Question 30. Kalim has 2 1/3 cartons of juice. He uses 5/6 of one carton and 1/6 of another carton. How much juice is left?',
        options: ['1/3 of a carton', '1 1/3 cartons', '1 1/2 cartons'],
        answer: 1,
        why: '5/6 + 1/6 = 1 whole carton used. 2 1/3 − 1 = 1 1/3 cartons left.',
        steps: [
          { text: 'Different story: Mia has 3 1/4 bottles. She drinks 2/3 of one and 1/3 of another.' },
          { text: 'Add what she used: 2/3 + 1/3 = 1 whole bottle.' },
          { text: '3 1/4 − 1 = 2 1/4 bottles left.' },
        ],
        secs: 75,
      },
      {
        kind: 'choice',
        id: 't2-q7',
        lead: 't2-e5',
        prompt: 'Question 31a said "Solve." Kayla ate 1/3 of a melon and Kevin ate 5/9 of it. You have worked out 3/9 + 5/9 = 8/9. What finishes the question?',
        options: [
          '8/9',
          'A sentence: they ate 8/9 of the melon altogether.',
          'Nothing more — 8/9 is the answer, so the work is finished.',
        ],
        answer: 1,
        why: 'A "Solve" question is answered by a sentence: they ate 8/9 of the melon altogether. The number on its own is only half of it, and that is the mark you lost.',
        steps: [
          { text: 'Different question: "Ava read 2/5 of a book and Leo read 1/5 of it. How much did they read?"' },
          { text: 'The sum: 2/5 + 1/5 = 3/5.' },
          { text: 'The sentence: "Ava and Leo read 3/5 of the book." Now it is answered.' },
        ],
        secs: 50,
      },
      {
        kind: 'build',
        id: 't2-q8',
        lead: 't2-e4',
        prompt: 'Question 31b. Kayla and Kevin ate 8/9 of the melon between them. How much of the melon is left over?',
        art: { art: 'pie', parts: 9, filled: 8, tone: 'calm' },
        answer: '1/9',
        decoys: ['2', '8'],
        why: 'A whole melon in ninths is 9/9. 9/9 − 8/9 = 1/9 left.',
        steps: [
          { text: 'Different one: they ate 5/7 of a cake. How much is left?' },
          { text: 'A whole cake in sevenths is 7/7.' },
          { text: '7/7 − 5/7 = 2/7 left.' },
        ],
        secs: 60,
      },
      {
        kind: 'build',
        id: 't2-q9',
        lead: 't2-e6',
        prompt: 'Question 32a, the bonus. 5/8 of a rectangle is red. Damien cuts the red part into pieces that are each 1/16 of the whole rectangle. How many pieces does he have?',
        answer: '10',
        unit: { post: ' pieces' },
        decoys: ['5', '8'],
        why: '5/8 ÷ 1/16 = 5/8 × 16 = 80/8 = 10 pieces. Check: 10 × 1/16 = 10/16 = 5/8.',
        steps: [
          { text: 'Different one: 3/4 of a bar, cut into pieces of 1/8 each.' },
          { text: '3/4 ÷ 1/8 = 3/4 × 8/1 = 24/4.' },
          { text: '= 6 pieces. Check it: 6 × 1/8 = 6/8 = 3/4.' },
        ],
        secs: 80,
      },
      {
        kind: 'build',
        id: 't2-q10',
        lead: 't2-e6',
        prompt: 'Question 32b, the bonus. The whole rectangle is 48 square centimetres and each piece is 1/16 of it. What is the area of each piece?',
        answer: '3',
        unit: { post: ' cm²' },
        decoys: ['8', '4', '6'],
        why: 'Each piece is 1/16 of the whole rectangle: 48 ÷ 16 = 3 cm².',
        steps: [
          { text: 'Different one: the rectangle is 32 cm² and each piece is 1/8 of it.' },
          { text: 'One piece = 32 ÷ 8.' },
          { text: '= 4 cm² each.' },
        ],
        secs: 70,
      },
    ],

    // A test is exactly its own questions. There is no bench to top up from
    // and nothing to deal by chance: the ten on the paper are the ten here.
    extra: [],
  },
}
