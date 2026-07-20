// Logic & Reasoning — 50 seed questions, tuned for a grade-6 brain (born Feb 2014).
// Core material (weight 2): riddles, sequences, deduction, odd-one-out, spatial reasoning.
// Fun extras (weight 1): lateral-thinking traps and wordplay puzzles.
// Strictly NO arithmetic drills — counting is fine, calculating is not. Every puzzle is
// self-contained in the prompt: no pictures, no diagrams, no links.
// This file only seeds Firestore (app/quizBank) on first run — after that, the bank
// in Firestore is the source of truth (removals, AI-regenerated questions, edits).
import type { QuizQuestion } from '../types'

const AT = '2026-07-19T00:00:00.000Z'
const T = 'logic-6'

const choice = (
  id: string,
  prompt: string,
  choices: string[],
  answer: string,
  opts: Partial<QuizQuestion> = {},
): QuizQuestion => ({
  id,
  topicId: T,
  type: 'choice',
  prompt,
  choices,
  answer,
  weight: 2,
  points: 8,
  status: 'active',
  createdAt: AT,
  ...opts,
})

export const LOGIC_6_SEED: QuizQuestion[] = [
  // --- sequences & patterns -------------------------------------------------
  choice('lg-01', 'What comes next? A, C, E, G, ?', ['H', 'I', 'J', 'K', 'F', 'L', 'M'], 'I', {
    emoji: '🔤',
    funFact: 'The pattern skips one letter every time: A_C_E_G_I. Skipping is a rule too!',
  }),
  choice('lg-02', 'What comes next? Monday, Wednesday, Friday, ?', ['Saturday', 'Sunday', 'Thursday', 'Tuesday', 'Monday', 'Wednesday', 'Friday'], 'Sunday', {
    emoji: '📅',
    funFact: 'Every other day: Mon → Wed → Fri → Sun. The week keeps rolling past Saturday.',
  }),
  choice('lg-03', 'What comes next in this shape pattern? circle, square, circle, square, circle, ?', ['circle', 'square', 'triangle', 'star', 'hexagon', 'diamond', 'oval'], 'square', {
    emoji: '🔷',
    funFact: 'A pattern that repeats every two steps is called an ABAB pattern — the easiest kind to spot.',
  }),
  choice('lg-04', 'What comes next? J, F, M, A, M, J, ?', ['J', 'D', 'S', 'O', 'N', 'T', 'W'], 'J', {
    emoji: '🗓️',
    funFact: 'They are the first letters of the months! January, February… June, July. Sneaky.',
  }),
  choice('lg-05', 'What comes next? O, T, T, F, F, S, S, ?', ['E', 'T', 'N', 'O', 'S', 'F', 'R'], 'E', {
    emoji: '🔢',
    funFact: 'First letters of One, Two, Three, Four, Five, Six, Seven… Eight!',
  }),
  choice('lg-06', 'A pattern goes: red, red, blue, red, red, blue, red, ... What comes next?', ['red', 'blue', 'green', 'yellow', 'purple', 'white', 'black'], 'red', {
    emoji: '🎨',
    funFact: 'The block is "red red blue". We just started a new block with one red, so another red comes before blue.',
  }),
  choice('lg-07', 'What comes next? Z, Y, X, W, ?', ['U', 'V', 'T', 'S', 'A', 'B', 'R'], 'V', {
    emoji: '⬅️',
    funFact: 'The alphabet backwards. Reading a rule in reverse is a classic puzzle trick.',
  }),
  {
    id: 'lg-08',
    topicId: T,
    type: 'order',
    prompt: 'A day at school got jumbled. Put these events in the order they HAPPEN, earliest first:',
    emoji: '🎒',
    sequence: ['Wake up', 'Catch the bus', 'Eat lunch', 'Walk home'],
    weight: 1,
    points: 6,
    status: 'active',
    createdAt: AT,
    funFact: 'Sequencing everyday events is the same skill as sequencing clues in a logic puzzle — find what must come first.',
  },

  // --- riddles --------------------------------------------------------------
  choice('lg-09', 'I have keys but open no locks. I have space but no room. You can enter, but you cannot go outside. What am I?', ['A keyboard', 'A piano', 'A map', 'A treasure chest', 'A house', 'A car', 'A dictionary'], 'A keyboard', {
    emoji: '⌨️',
    funFact: 'Keys, a space bar and an Enter key — the riddle describes every word literally.',
  }),
  choice('lg-10', 'What gets wetter the more it dries?', ['A towel', 'A sponge left out', 'The sun', 'A river', 'A raincoat', 'An umbrella', 'A cloud'], 'A towel', {
    emoji: '🧻',
    funFact: 'Drying something means soaking up its water — so the towel gets wetter as it works.',
  }),
  choice('lg-11', 'What has a neck but no head?', ['A bottle', 'A snake', 'A shirt collar', 'A guitar pick', 'A ladder', 'A door', 'A spoon'], 'A bottle', {
    emoji: '🍾',
    funFact: 'Bottles, guitars and violins all have necks. This one is the classic answer.',
  }),
  choice('lg-12', 'What can travel around the world while staying in one corner?', ['A stamp', 'A bird', 'A cloud', 'A ship', 'A satellite', 'The wind', 'A letter'], 'A stamp', {
    emoji: '📮',
    funFact: 'A stamp sits in the corner of an envelope and rides along to anywhere on Earth.',
  }),
  choice('lg-13', 'The more of them you take, the more you leave behind. What are they?', ['Footsteps', 'Coins', 'Photos', 'Breaths', 'Books', 'Seeds', 'Shadows'], 'Footsteps', {
    emoji: '👣',
    funFact: 'Every step you take leaves one more footprint behind you. Riddles love a good double meaning.',
  }),
  choice('lg-14', 'What has many teeth but cannot bite?', ['A comb', 'A shark', 'A crocodile', 'A mirror', 'A hairbrush', 'A pillow', 'A shoe'], 'A comb', {
    emoji: '🪥',
    funFact: 'Combs, saws and zippers all have "teeth" — none of them bite.',
  }),
  choice('lg-15', 'What goes up but never comes down?', ['Your age', 'A balloon', 'A rocket', 'Rain', 'A kite', 'An elevator', 'A ball'], 'Your age', {
    emoji: '🎂',
    funFact: 'Balloons pop, rockets land, elevators come back down — only your age is a one-way trip.',
  }),
  choice('lg-16', 'I am full of holes but I still hold water. What am I?', ['A sponge', 'A bucket', 'A net', 'A colander', 'A cup', 'A balloon', 'A straw'], 'A sponge', {
    emoji: '🧽',
    weight: 1,
    points: 5,
    funFact: 'A colander and a net have holes but let water straight through — a sponge traps it inside.',
  }),
  choice('lg-17', 'What has hands but cannot clap?', ['A clock', 'A statue', 'A glove', 'A robot', 'A doll', 'A tree', 'A puppet'], 'A clock', {
    emoji: '🕐',
    funFact: 'Clock hands point, they never applaud. A clock also has a face — but no nose.',
  }),
  choice('lg-18', 'What can you catch but never throw?', ['A cold', 'A ball', 'A frisbee', 'A fish', 'A bus', 'A butterfly', 'A snowball'], 'A cold', {
    emoji: '🤧',
    weight: 1,
    points: 5,
    funFact: '"Catch" means two different things: grabbing something, or getting sick. Riddles love that.',
  }),

  // --- deduction ------------------------------------------------------------
  choice('lg-19', 'All Zibs are blue. Nothing blue can fly. So what must be TRUE about Zibs?', ['Zibs cannot fly', 'Zibs can fly', 'Some Zibs are red', 'All flying things are Zibs', 'Zibs are birds', 'No Zibs are blue', 'Zibs have wings'], 'Zibs cannot fly', {
    emoji: '🧠',
    funFact: 'Chain the rules: Zib → blue → cannot fly. This is called a syllogism.',
  }),
  choice('lg-20', 'Ana is taller than Ben. Ben is taller than Cleo. Who is the SHORTEST?', ['Cleo', 'Ben', 'Ana', 'Ana and Ben tie', 'Ben and Cleo tie', 'Nobody is shortest', 'Ana and Cleo tie'], 'Cleo', {
    emoji: '📏',
    funFact: 'Line them up: Ana > Ben > Cleo. The last one in the chain is the shortest.',
  }),
  choice('lg-21', 'Sam finished the race before Tara. Tara finished before Leo. Leo was not last, because Mia came after him. Who WON?', ['Sam', 'Tara', 'Leo', 'Mia', 'Sam and Tara tied', 'Leo and Mia tied', 'Nobody won'], 'Sam', {
    emoji: '🏁',
    funFact: 'The order is Sam, Tara, Leo, Mia. Extra facts about the back of the pack do not change the front.',
  }),
  choice('lg-22', 'If it rains, the picnic is cancelled. The picnic was NOT cancelled. What do we know?', ['It did not rain', 'It rained', 'It might have rained', 'The picnic was moved', 'It snowed', 'It rained a little', 'Nothing at all'], 'It did not rain', {
    emoji: '🌧️',
    funFact: 'If rain always cancels it, and it was not cancelled, then rain never happened. Logicians call this "modus tollens".',
  }),
  choice('lg-23', 'Some cats are grey. Fluffy is a cat. What do we know about Fluffy?', ['Fluffy might be grey', 'Fluffy is grey', 'Fluffy is not grey', 'Fluffy is black', 'All cats are grey', 'Fluffy is a dog', 'Grey things are cats'], 'Fluffy might be grey', {
    emoji: '🐈',
    funFact: '"Some" is not "all". A careful thinker never upgrades "some" into a promise.',
  }),
  choice('lg-24', 'Three boxes: one has only apples, one only oranges, one has both. Every label is WRONG. You pick ONE fruit from the box labelled "Both". It is an apple. What is really in that box?', ['Only apples', 'Only oranges', 'Both', 'It is empty', 'Apples and bananas', 'Oranges and apples mixed', 'Impossible to know'], 'Only apples', {
    emoji: '📦',
    funFact: 'Since all labels are wrong, the "Both" box cannot hold both — one apple proves it is the apples-only box.',
  }),
  choice('lg-25', 'Every student who passed studied. Rita did NOT study. What follows?', ['Rita did not pass', 'Rita passed', 'Rita studied a little', 'Rita is not a student', 'Everyone passed', 'Nobody passed', 'Rita failed on purpose'], 'Rita did not pass', {
    emoji: '📚',
    funFact: 'Passing requires studying. No studying, no pass — the rule works backwards too.',
  }),
  choice('lg-26', 'A boy says: "I have as many brothers as sisters." His sister says: "I have twice as many brothers as sisters." How many CHILDREN are in the family?', ['7', '3', '4', '5', '6', '8', '9'], '7', {
    emoji: '👨‍👩‍👧‍👦',
    weight: 1,
    points: 5,
    funFact: '4 boys and 3 girls. Each boy sees 3 brothers and 3 sisters; each girl sees 4 brothers and 2 sisters.',
  }),
  choice('lg-27', 'You are in a race and you overtake the person in SECOND place. What place are you in now?', ['Second', 'First', 'Third', 'Fourth', 'Last', 'You win', 'Nobody knows'], 'Second', {
    emoji: '🏃',
    funFact: 'You take their spot — you do not jump to first. That runner in first is still ahead of you!',
  }),
  {
    id: 'lg-28',
    topicId: T,
    type: 'order',
    prompt: 'Four friends sit in a row. Ivy is on the far left. Max sits right next to Ivy. Nia sits on the far right. Seat them in order from LEFT to RIGHT:',
    emoji: '💺',
    sequence: ['Ivy', 'Max', 'Oli', 'Nia'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Ivy and Nia lock the two ends, Max takes seat two — only one seat is left over for Oli.',
  },

  // --- odd one out ----------------------------------------------------------
  choice('lg-29', 'Which is the ODD ONE OUT? Robin, Eagle, Penguin, Sparrow', ['Penguin', 'Robin', 'Eagle', 'Sparrow', 'Robin and Eagle', 'Eagle and Sparrow', 'None of them differ'], 'Penguin', {
    emoji: '🐧',
    funFact: 'They are all birds — but the penguin is the only one that cannot fly.',
  }),
  choice('lg-30', 'Which is the ODD ONE OUT? Carrot, Potato, Tomato, Onion', ['Tomato', 'Carrot', 'Potato', 'Onion', 'Carrot and Onion', 'Potato and Onion', 'They are all the same'], 'Tomato', {
    emoji: '🍅',
    funFact: 'Carrot, potato and onion all grow underground. The tomato grows above ground — and is technically a fruit.',
  }),
  choice('lg-31', 'Which is the ODD ONE OUT? Circle, Triangle, Square, Cube', ['Cube', 'Circle', 'Triangle', 'Square', 'Circle and Square', 'Triangle and Square', 'Square and Cube'], 'Cube', {
    emoji: '🧊',
    funFact: 'A cube is 3D — you can hold it. The others are flat 2D shapes on paper.',
  }),
  choice('lg-32', 'Which is the ODD ONE OUT? Guitar, Violin, Drum, Harp', ['Drum', 'Guitar', 'Violin', 'Harp', 'Guitar and Harp', 'Violin and Harp', 'Guitar and Violin'], 'Drum', {
    emoji: '🥁',
    funFact: 'The others all make sound with strings. The drum uses a stretched skin instead.',
  }),
  choice('lg-33', 'Which word is the ODD ONE OUT? Level, Radar, Kayak, Table', ['Table', 'Level', 'Radar', 'Kayak', 'Level and Radar', 'Kayak and Table', 'Radar and Kayak'], 'Table', {
    emoji: '🔁',
    weight: 1,
    points: 5,
    funFact: 'Level, radar and kayak read the same backwards — they are palindromes. Table becomes "elbat".',
  }),
  choice('lg-34', 'Which is the ODD ONE OUT? Whale, Shark, Dolphin, Seal', ['Shark', 'Whale', 'Dolphin', 'Seal', 'Whale and Seal', 'Dolphin and Seal', 'Whale and Dolphin'], 'Shark', {
    emoji: '🦈',
    funFact: 'Whales, dolphins and seals are mammals that breathe air. The shark is a fish with gills.',
  }),

  // --- lateral thinking & traps --------------------------------------------
  choice('lg-35', 'A rooster lays an egg on a pointed roof. Which side does the egg roll down?', ['Neither — roosters do not lay eggs', 'The left side', 'The right side', 'The steeper side', 'Straight down the middle', 'It stays put', 'The sunny side'], 'Neither — roosters do not lay eggs', {
    emoji: '🐓',
    funFact: 'Roosters are male. The whole roof detail was bait to stop you checking the first fact.',
  }),
  choice('lg-36', 'Some months have 31 days. How many months have 28 days?', ['All 12', 'Just 1', '2', '4', '7', '11', 'None'], 'All 12', {
    emoji: '📆',
    funFact: 'Every month contains a 28th day. February is just the only one that STOPS there.',
  }),
  choice('lg-37', 'A farmer has 17 sheep. All but 9 run away. How many sheep does he have left?', ['9', '8', '17', '26', '7', '11', '0'], '9', {
    emoji: '🐑',
    funFact: '"All but 9" means 9 stayed. The 17 is there purely to tempt you into subtracting.',
  }),
  choice('lg-38', 'A man pushes his car to a hotel and tells the owner he is bankrupt. What is going on?', ['They are playing Monopoly', 'The car ran out of fuel', 'He lost his job', 'He is moving house', 'The hotel is closed', 'He is a taxi driver', 'It is a dream'], 'They are playing Monopoly', {
    emoji: '🎲',
    weight: 1,
    points: 5,
    funFact: 'The car is a Monopoly token and the hotel is a plastic piece. Never assume the everyday meaning.',
  }),
  choice('lg-39', 'How many times can you take 1 apple from a basket of 10 apples?', ['Once — after that it is not a basket of 10', '10 times', '9 times', '11 times', 'Forever', 'Twice', 'Zero times'], 'Once — after that it is not a basket of 10', {
    emoji: '🍎',
    weight: 1,
    points: 5,
    funFact: 'The question says "a basket of 10 apples". After one apple leaves, that basket no longer exists.',
  }),
  choice('lg-40', 'What word becomes SHORTER when you add two letters to it?', ['Short', 'Long', 'Tall', 'Small', 'Tiny', 'Word', 'Letter'], 'Short', {
    emoji: '✂️',
    funFact: 'Short + "er" = shorter. The puzzle plays on the word itself, not its length.',
  }),

  // --- spatial reasoning ----------------------------------------------------
  choice('lg-41', 'You face NORTH, then turn right twice. Which way are you facing?', ['South', 'North', 'East', 'West', 'North-east', 'South-west', 'Back where you started'], 'South', {
    emoji: '🧭',
    funFact: 'Right once = East, right again = South. Two right turns always flip you around.',
  }),
  choice('lg-42', 'You hold up your RIGHT hand in front of a mirror. Which hand does your reflection appear to raise?', ['Its left hand', 'Its right hand', 'Both hands', 'Neither hand', 'It depends on the mirror', 'Its foot', 'You cannot tell'], 'Its left hand', {
    emoji: '🪞',
    funFact: 'Mirrors swap left and right — that is why ambulances have their name written backwards.',
  }),
  choice('lg-43', 'A standard six-sided die has 6 faces. If you glue two dice together face to face, how many faces can you still SEE?', ['10', '12', '11', '8', '9', '6', '4'], '10', {
    emoji: '🎲',
    funFact: 'Each die hides one face against the glue: 6 + 6 − 2 hidden = 10 visible. Just count what is covered.',
  }),
  choice('lg-44', 'A cube is painted red on all sides. How many of its corners have red on exactly THREE sides?', ['8', '6', '12', '4', '0', '24', '2'], '8', {
    emoji: '🟥',
    weight: 1,
    points: 5,
    funFact: 'A cube has 8 corners, and three faces meet at every one of them.',
  }),

  // --- write-in -------------------------------------------------------------
  {
    id: 'lg-45',
    topicId: T,
    type: 'write',
    prompt: 'What has a face and two hands, but no arms or legs? (type it)',
    emoji: '⏰',
    accept: ['Clock', 'A clock', 'Watch'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'A clock face with an hour hand and a minute hand. No arms required.',
  },
  {
    id: 'lg-46',
    topicId: T,
    type: 'write',
    prompt: 'What comes ONCE in a minute, twice in a moment, but never in a thousand years? (type the letter)',
    emoji: '🔠',
    accept: ['M', 'The letter M', 'Letter M'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'It is about the spelling, not about time: mi-nute has one M, mo-ment has two, "thousand years" has none.',
  },
  {
    id: 'lg-47',
    topicId: T,
    type: 'write',
    prompt: 'It follows you everywhere in the sunshine but disappears in the dark. What is it? (type it)',
    emoji: '🌞',
    accept: ['Shadow', 'A shadow', 'Your shadow'],
    weight: 1,
    points: 5,
    status: 'active',
    createdAt: AT,
    funFact: 'A shadow needs light to exist — in total darkness there is nothing left to block.',
  },

  // --- match ----------------------------------------------------------------
  {
    id: 'lg-48',
    topicId: T,
    type: 'match',
    prompt: 'Match each riddle to its answer:',
    emoji: '🔗',
    pairs: [
      { left: 'Has keys but opens no locks', right: 'Piano' },
      { left: 'Has a bed but never sleeps', right: 'River' },
      { left: 'Has leaves but is not a tree', right: 'Book' },
      { left: 'Has an eye but cannot see', right: 'Needle' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Every one of these works by taking a body-part word literally: keys, bed, leaves, eye.',
  },
  {
    id: 'lg-49',
    topicId: T,
    type: 'match',
    prompt: 'Match each group to the ODD ONE OUT in it:',
    emoji: '🕵️',
    pairs: [
      { left: 'Dog, Cat, Fish, Horse', right: 'Fish' },
      { left: 'Red, Blue, Loud, Green', right: 'Loud' },
      { left: 'Apple, Banana, Carrot, Pear', right: 'Carrot' },
    ],
    weight: 1,
    points: 6,
    status: 'active',
    createdAt: AT,
    funFact: 'Fish has no legs, "loud" is a sound not a colour, and carrot is a vegetable among fruits.',
  },

  // --- order ----------------------------------------------------------------
  {
    id: 'lg-50',
    topicId: T,
    type: 'order',
    prompt: 'Four kids ran a race. Zed beat Ola. Ola beat Pip. Pip beat Rex. Put them in order from FIRST to LAST:',
    emoji: '🏆',
    sequence: ['Zed', 'Ola', 'Pip', 'Rex'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Chain the clues one link at a time: Zed > Ola > Pip > Rex. No shortcuts needed.',
  },
]
