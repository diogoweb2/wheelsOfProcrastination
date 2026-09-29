// 🏫 School quiz — "All Summer in a Day" (Ray Bradbury), the 25 vocabulary words.
//
// The point of this bank is USAGE, not definitions. Every word gets two goes at it:
//   …a  — a scene from his world (One Piece / Blue Lock), and the question is
//         "which of these words is the one for this?" Distractors are always OTHER
//         words off the same worksheet, so the contrast is the lesson.
//   …b  — the word already in a sentence, and the question is "what does it mean
//         HERE?" Several of these words carry two real senses (a concussion is a
//         brain injury AND a violent shock; stakes are money AND wooden posts;
//         bore is carried AND made-someone-yawn), so the sentence has to decide it.
//         That is the whole skill, and it is the one a definition list can't teach.
//
// Choice questions show THREE options (`optionCount: 3` on the topic) sampled from a
// pool of five, so the set changes every time and the position never means anything.
// Illustrations are One Piece stickers we already ship in public/stickers/ — no new
// bytes on disk (see CLAUDE.md on image storage).
import type { QuizQuestion } from '../types'

const AT = '2026-09-29T00:00:00.000Z'
const T = 'asiad-vocab'

/** Art we already own, from the sticker album (src/logic/stickerCatalog.generated.ts). */
const pic = (id: string) => `/stickers/${id}.webp`

const LUFFY = pic('monkey-d-luffy-one-piece-monkey-d-luffy-wallpape')
const GEAR5 = pic('luffygear5')
const ZORO = pic('roronoa-zoro')
const NAMI = pic('nami-onigashima-official-by-monkeyoflife-dje6rrx')
const USOPP = pic('images-1')
const CHOPPER = pic('d4fty22-efc79fb4-86ee-4950-81f8-da8e362ba5ee')
const ROBIN = pic('robin-render')
const FRANKY = pic('franky-2-years-later')
const BROOK = pic('brook')
const JINBE = pic('jinbe')
const KAIDO = pic('kaidoh')
const WHITEBEARD = pic('edwardnew')
const LAW = pic('7a094561ead54385afc5120f89988e5d')
const DOFLAMINGO = pic('imgbin-donquixote-doflamingo-one-piece-unlimited')
const ENEL = pic('enelrender')
const MARCO = pic('marco-the-phoenix')
const UTA = pic('uta-one-piece')
const CREW = pic('kody29-onepiece')
const LEGENDS = pic('top-20-strongest-one-piece-characters-powerscali')
const VEGAPUNK = pic('vegapunkrender')
const ODEN = pic('8523302-eb2874b406880a99ca39ec0cc06b4dc4')

/** "Which word is this?" — the scene is the question, the word is the answer. */
const word = (
  n: string,
  prompt: string,
  answer: string,
  distractors: string[],
  opts: Partial<QuizQuestion> = {},
): QuizQuestion => ({
  id: `asiad-${n}a`,
  topicId: T,
  type: 'choice',
  prompt,
  choices: [answer, ...distractors],
  answer,
  weight: 2,
  points: 8,
  status: 'active',
  createdAt: AT,
  ...opts,
})

/** "What does it mean HERE?" — the sentence is given, the meaning is the answer. */
const sense = (
  n: string,
  prompt: string,
  answer: string,
  distractors: string[],
  opts: Partial<QuizQuestion> = {},
): QuizQuestion => ({
  id: `asiad-${n}b`,
  topicId: T,
  type: 'choice',
  prompt,
  choices: [answer, ...distractors],
  answer,
  weight: 2,
  points: 6,
  status: 'active',
  createdAt: AT,
  ...opts,
})

export const ASIAD_VOCAB_SEED: QuizQuestion[] = [
  // --- 1. compounded ---------------------------------------------------------
  word(
    '01',
    'Isagi misses one shot. Then a second. Then a third — and every miss sits on top of the last one until the pressure is a mountain. His trouble has been ______.',
    'compounded',
    ['slackened', 'muffled', 'savoured', 'drenched'],
    {
      emoji: '⚽',
      funFact: 'compounded (verb) = built up by adding more and more of the same thing. A late homework compounds into a bad week. Bradbury: “thousands of days compounded and filled… with rain”.',
    },
  ),
  sense(
    '01',
    '“Seven years of rain — thousands upon thousands of days compounded, end to end.” What does COMPOUNDED mean here?',
    'piled up, one adding onto the next',
    ['washed away, one after another', 'counted out and written down', 'split apart into small pieces'],
    {
      emoji: '🌧️',
      funFact: 'In chemistry a “compound” is a substance of two or more elements — same family of meaning (things joined), but here it is the VERB: stacked up, added together.',
    },
  ),

  // --- 2. gush ---------------------------------------------------------------
  word(
    '02',
    'Franky rips a plate off the Sunny’s hull and sea water comes pouring through the hole in a thick, fast jet. The water does what?',
    'gushes',
    ['slackens', 'muffles', 'savours', 'patterns'],
    {
      emoji: '🌊',
      image: FRANKY,
      funFact: 'gush (verb/noun) = liquid pouring out fast and heavy. Careful — it is about WATER, not wind. A burst pipe gushes; a fire hose gushes; a nosebleed gushes.',
    },
  ),
  sense(
    '02',
    '“Blood gushed from the cut on Zoro’s arm.” What does GUSHED mean here?',
    'poured out fast and heavy',
    ['dried up almost at once', 'blew past like a strong wind', 'dripped out slowly, drop by drop'],
    {
      emoji: '🩸',
      image: ZORO,
      funFact: 'A gush is a FLOW, never a breeze. If you can say “a gush of water”, you have it; “a gush of wind” is a gust — different word, one letter apart.',
    },
  ),

  // --- 3. concussion ---------------------------------------------------------
  word(
    '03',
    'Whitebeard punches the air. There is no wound and nothing is cut — but the shock of the blow slams through the whole island and cracks it. That violent shock is a ______.',
    'concussion',
    ['tremor', 'repercussion', 'civilization', 'patterning'],
    {
      emoji: '💥',
      image: WHITEBEARD,
      funFact: 'concussion (noun) has TWO real meanings: (1) a violent shock or slamming impact, (2) the brain injury you get from one. Bradbury uses meaning 1: “the concussion of storms”.',
    },
  ),
  sense(
    '03',
    'Bradbury writes about “the concussion of storms so heavy they were tidal waves”. What does CONCUSSION mean in THAT sentence?',
    'the violent shock of something slamming down',
    ['a brain injury from a knock to the head', 'a long, low rumble far in the distance', 'a sudden bright flash of lightning'],
    {
      emoji: '⛈️',
      image: ENEL,
      funFact: 'Same word, two jobs. A hockey player gets a concussion (injury); a bomb goes off with a concussion (shock wave). The sentence tells you which one — here the storms are doing the slamming.',
    },
  ),

  // --- 4. civilization -------------------------------------------------------
  word(
    '04',
    'Wano is not just a village. It has cities, farms, laws, a shogun, its own writing and its own art, all built up over hundreds of years. Wano is a ______.',
    'civilization',
    ['avalanche', 'concussion', 'repercussion', 'patterning'],
    {
      emoji: '🏯',
      image: ODEN,
      funFact: 'civilization (noun) = a big, organised human society with its own cities, government, art and way of life. One family is not a civilization; the Roman Empire is.',
    },
  ),
  sense(
    '04',
    '“The children of the rocket men and women who had come to build a civilization on Venus.” What are they building?',
    'a whole organised society to live in',
    ['one very large rocket ship', 'a single weather-proof house', 'a machine that can stop the rain'],
    {
      emoji: '🪐',
      image: VEGAPUNK,
      funFact: 'That is why the story feels so lonely: a civilization is supposed to be everyone together, and these kids still only get sunlight for two hours every seven years.',
    },
  ),

  // --- 5. stunned ------------------------------------------------------------
  word(
    '05',
    'Luffy switches to Gear 5 and the whole battlefield stops. Nobody attacks, nobody speaks — they just stare, too shocked to move. They are ______.',
    'stunned',
    ['frail', 'resilient', 'feverish', 'immense'],
    {
      emoji: '😳',
      image: GEAR5,
      funFact: 'stunned (adjective/verb) = so shocked or dazed that you freeze. It can be a shock to the mind (surprise) or a shock to the body (a knockout blow).',
    },
  ),
  sense(
    '05',
    '“Margot stood stunned when the rain finally stopped.” What was Margot doing?',
    'standing frozen, too shocked to react',
    ['running around shouting with joy', 'quietly crying into her hands', 'arguing with the other children'],
    {
      emoji: '☀️',
      funFact: 'Being stunned is silent and still — that is the tell. If a character is yelling, they are excited, not stunned.',
    },
  ),

  // --- 6. slackening ---------------------------------------------------------
  word(
    '06',
    'Zoro has been holding the rope for an hour. His arms are burning, and slowly, without him meaning to, his grip gets looser and weaker. His grip is ______.',
    'slackening',
    ['surging', 'gushing', 'compounding', 'patterning'],
    {
      emoji: '🪢',
      image: ZORO,
      funFact: 'slacken (verb) = to get looser, slower or weaker. Slack rope = loose rope. “Slacken your pace” = slow down. The opposite is tighten, or speed up.',
    },
  ),
  sense(
    '06',
    '“The rain was slackening at last.” What is the rain doing?',
    'easing off — getting lighter and weaker',
    ['getting much heavier all at once', 'freezing into hail as it falls', 'turning around and blowing sideways'],
    {
      emoji: '🌦️',
      funFact: 'Slackening is a slow fade, not a sudden stop. That is why it builds suspense here — the rain does not switch off, it quietly gives up.',
    },
  ),

  // --- 7. feverish -----------------------------------------------------------
  word(
    '07',
    'The night before the Blue Lock final, Bachira cannot sit still. His eyes are shining, he is talking too fast and he keeps jumping up. He is ______ with excitement.',
    'feverish',
    ['frail', 'muffled', 'resilient', 'drenched'],
    {
      emoji: '⚡',
      funFact: 'feverish (adjective) = (1) hot and ill with a fever, or (2) restless and over-excited, ACTING like someone with a fever. Meaning 2 is the one writers love.',
    },
  ),
  sense(
    '07',
    '“The children pressed to each other with feverish hands.” What does FEVERISH mean here?',
    'restless and wildly excited',
    ['burning hot from being ill', 'cold, stiff and clumsy', 'gentle, slow and careful'],
    {
      emoji: '🙌',
      image: CREW,
      funFact: 'Nobody in the story is sick. Bradbury borrows the FEELING of a fever — shaky, buzzing, can’t-keep-still — and hands it to nine-year-olds waiting for the sun.',
    },
  ),

  // --- 8. spokes -------------------------------------------------------------
  word(
    '08',
    'Sunlight breaks through a gap in the cloud and comes down in straight bright bars, all shooting out from the same point — exactly like the thin rods inside a bicycle wheel. Those bars look like ______.',
    'spokes',
    ['tremors', 'stakes', 'repercussions', 'avalanches'],
    {
      emoji: '🚲',
      funFact: 'spokes (noun) = the thin rods running from the centre of a wheel out to the rim. Writers reuse the picture for anything that shoots out from one centre point — sunbeams, cracks in ice, roads out of a city.',
    },
  ),
  sense(
    '08',
    '“The sun came out in spokes of gold.” What picture does SPOKES put in your head?',
    'straight bars shooting out from one centre',
    ['round blobs scattered all over', 'a thick flat sheet of colour', 'a long thin line along the ground'],
    {
      emoji: '🌞',
      image: MARCO,
      funFact: 'Test it on a bike: hub in the middle, spokes out to the rim. If the thing in the sentence does not come from a centre, spokes is the wrong word.',
    },
  ),

  // --- 9. frail --------------------------------------------------------------
  word(
    '09',
    'Chopper’s new patient is thin, pale and light as paper — it honestly looks like one good wave could break her. She is ______.',
    'frail',
    ['resilient', 'immense', 'savage', 'tumultuous'],
    {
      emoji: '🩺',
      image: CHOPPER,
      funFact: 'frail (adjective) = weak and easily broken or hurt. It works for people (a frail old man), and for things (a frail little boat).',
    },
  ),
  sense(
    '09',
    '“Margot was a very frail girl who looked as if she had been lost in the rain for years.” What is Bradbury telling us?',
    'she is weak and easily hurt',
    ['she is strong but very shy', 'she is tall for her age', 'she is quick and hard to catch'],
    {
      emoji: '🌫️',
      funFact: 'Frail is the opposite of RESILIENT — another word on this list. Frail breaks; resilient bounces back. Margot is frail, and the other children find out how frail.',
    },
  ),

  // --- 10. drenched ----------------------------------------------------------
  word(
    '10',
    'Nami comes in off the deck after ten minutes in the storm. Her coat, her boots and her hair are all so wet that water is running off her onto the floor. She is ______.',
    'drenched',
    ['muffled', 'stunned', 'frail', 'slackened'],
    {
      emoji: '💧',
      image: NAMI,
      funFact: 'drench (verb) = to soak something completely — not damp, not sprinkled, SOAKED THROUGH. “Drenched in sweat” after training works the same way.',
    },
  ),
  sense(
    '10',
    '“The jungle was drenched, and the leaves poured water.” How wet is that jungle?',
    'soaked completely through',
    ['a little damp on top', 'dry and starting to crack', 'frozen solid with ice'],
    {
      emoji: '🌴',
      funFact: 'Degrees of wet, smallest to biggest: damp → wet → soaked → drenched. Bradbury picks the biggest one on purpose: on Venus nothing ever gets to dry out.',
    },
  ),

  // --- 11. Venus -------------------------------------------------------------
  word(
    '11',
    'Bradbury does not set this story on Earth. He sets it on the second planet from the Sun — the one wrapped in thick cloud, hotter than Mercury. That planet is ______.',
    'Venus',
    ['Mars', 'Jupiter', 'Saturn', 'Neptune'],
    {
      emoji: '🪐',
      funFact: 'Venus (noun, a proper name) = the 2nd planet from the Sun. Real Venus really is cloud-covered — Bradbury took a true fact and asked “what if kids grew up under that?”',
    },
  ),
  sense(
    '11',
    'Why does the story’s setting on VENUS matter so much to the plot?',
    'its thick cloud means the sun almost never shows',
    ['it is the closest planet to the Sun', 'it has no gravity, so they float', 'it is made entirely of ice'],
    {
      emoji: '☁️',
      funFact: 'Setting = time AND place (your Elements of a Short Story sheet). Change Venus to Toronto and the whole story dies: here, the place IS the problem.',
    },
  ),

  // --- 12. patterning --------------------------------------------------------
  word(
    '12',
    'Robin studies a Wano kimono: the same wave shape, then a flower, then the wave again, then the flower — over and over, in neat order, all the way down. That repeating arrangement is the ______.',
    'patterning',
    ['midst', 'concussion', 'avalanche', 'repercussion'],
    {
      emoji: '🎴',
      image: ROBIN,
      funFact: 'patterning (noun) = the regular, repeating arrangement of things. Wallpaper has patterning. A zebra has patterning. Random splashes do not.',
    },
  ),
  sense(
    '12',
    '“The patterning of the rain on the glass never changed.” What never changed?',
    'the repeating arrangement it made',
    ['how loud the rain was', 'the temperature outside', 'the direction the wind blew'],
    {
      emoji: '🪟',
      funFact: 'Two things make a pattern: repetition and order. If you can guess what comes next, it is patterning.',
    },
  ),

  // --- 13. savagely ----------------------------------------------------------
  word(
    '13',
    'Kaido is not sparring and he is not being careful. Every swing of the club is meant to break something, with no mercy at all. He attacks ______.',
    'savagely',
    ['feverishly', 'tumultuously', 'immensely', 'resiliently'],
    {
      emoji: '🪓',
      image: KAIDO,
      funFact: 'savagely (adverb) = fiercely, brutally, with cruelty and violence. An adverb — it describes HOW something is done.',
    },
  ),
  sense(
    '13',
    '“They surged about her, caught her up and bore her, protesting… savagely.” What does SAVAGELY tell you about the children?',
    'they were being rough and cruel',
    ['they were being playful and gentle', 'they were being quiet and sneaky', 'they were being slow and careful'],
    {
      emoji: '🚪',
      image: DOFLAMINGO,
      funFact: 'This is the ugliest word in the story and Bradbury saves it for the children, not for a monster. That is the point he is making.',
    },
  ),

  // --- 14. surged ------------------------------------------------------------
  word(
    '14',
    'The whistle goes for the last play and the whole crowd suddenly pushes forward at once, like a wave hitting a wall. The crowd ______ forward.',
    'surged',
    ['slackened', 'savoured', 'muffled', 'bore'],
    {
      emoji: '🌊',
      funFact: 'surge (verb) = to move forward suddenly and powerfully, usually as one mass. Waves surge, crowds surge, electricity surges (that is a “power surge”).',
    },
  ),
  sense(
    '14',
    '“They surged about her.” How did the children move?',
    'forward all at once, with sudden force',
    ['slowly and one at a time', 'backwards, away from her', 'in a neat straight line'],
    {
      emoji: '👥',
      funFact: 'Surge always carries the feel of water. A surging crowd is not a queue — it has no order and it does not stop easily.',
    },
  ),

  // --- 15. bore (bear) -------------------------------------------------------
  word(
    '15',
    'Luffy is out cold and cannot walk. Jinbe lifts him onto his back and carries him through the whole battle to the ship. Jinbe ______ him away.',
    'bore',
    ['surged', 'savoured', 'slackened', 'muffled'],
    {
      emoji: '🫂',
      image: JINBE,
      funFact: 'bore = the past tense of BEAR, meaning to carry. “Bear a burden”, “bear a message”, “the bridge bears the weight”. Nothing to do with being bored.',
    },
  ),
  sense(
    '15',
    '“They bore her into the tunnel and locked the door.” What did they do to her?',
    'they carried her there',
    ['they made her feel bored', 'they shouted at her from far away', 'they left her standing outside'],
    {
      emoji: '🔒',
      funFact: 'Two different words that look identical: BORE (carried — past of bear) and BORE (made someone yawn). Only the sentence tells you which. Here, they are carrying her.',
    },
  ),

  // --- 16. muffled -----------------------------------------------------------
  word(
    '16',
    'Usopp is shouting for help, but he is behind a thick steel door — so what the crew hears is only a dull, blurry, far-away sound. His shout is ______.',
    'muffled',
    ['immense', 'savage', 'tumultuous', 'drenched'],
    {
      emoji: '🔇',
      image: USOPP,
      funFact: 'muffle (verb) = to make a sound quieter or harder to hear by covering or blocking it. A scarf muffles your voice; snow muffles footsteps.',
    },
  ),
  sense(
    '16',
    '“Behind the closet door, the sound was muffled.” Why could they barely hear it?',
    'the door was blocking the sound',
    ['the sound was far too high-pitched', 'nobody was actually making a sound', 'everyone had covered their ears'],
    {
      emoji: '🚪',
      funFact: 'Muffled always means something is IN THE WAY — a door, a pillow, a hand. That is how it differs from “quiet”, which needs no reason.',
    },
  ),

  // --- 17. midst -------------------------------------------------------------
  word(
    '17',
    'Luffy is not near the marines and he is not behind them. He is standing dead centre, surrounded on every side by a hundred of them. He is in the ______ of them.',
    'midst',
    ['spokes', 'stakes', 'patterning', 'avalanche'],
    {
      emoji: '🎯',
      image: LUFFY,
      funFact: 'midst (noun) = the middle of, surrounded by. Almost always used as “in the midst of…”. “In the midst of the storm”, “in the midst of the crowd”.',
    },
  ),
  sense(
    '17',
    '“In the midst of the children, Margot stood alone.” Where was Margot standing?',
    'right in the middle of them',
    ['far away from all of them', 'just behind the last one', 'above them on a high step'],
    {
      emoji: '🧍',
      funFact: 'Bradbury is being cruel on purpose: you can be in the MIDST of a crowd and still be completely alone. That contrast is the whole line.',
    },
  ),

  // --- 18. avalanche ---------------------------------------------------------
  word(
    '18',
    'High on Drum Island the snow breaks loose and a whole mountainside of it roars down the slope, burying everything in its path. That is an ______.',
    'avalanche',
    ['immensity', 'concussion', 'civilization', 'patterning'],
    {
      emoji: '🏔️',
      image: CHOPPER,
      funFact: 'avalanche (noun) = a mass of snow, ice or rock crashing down a mountain. It also works as a picture for anything that arrives all at once and buries you.',
    },
  ),
  sense(
    '18',
    '“An avalanche of questions fell on her.” Was anyone buried in snow?',
    'no — it means a huge rush arriving at once',
    ['yes — snow really fell on her', 'yes — a rock slide hit the school', 'no — it means the questions were very quiet'],
    {
      emoji: '❓',
      funFact: 'This is figurative language: a real avalanche stands in for “too much, too fast, no escape”. Same trick as “a flood of messages” or “a mountain of homework”.',
    },
  ),

  // --- 19. repercussions -----------------------------------------------------
  word(
    '19',
    'Luffy punches a Celestial Dragon. He wins the fight in ten seconds — but weeks later an admiral is hunting him, his crew is scattered and the whole world knows his face. Those knock-on effects are the ______.',
    'repercussions',
    ['spokes', 'tremors', 'stakes', 'concussions'],
    {
      emoji: '🌐',
      image: LEGENDS,
      funFact: 'repercussions (noun, usually plural) = the unintended after-effects of an action, arriving later. Not the punch — everything that comes BECAUSE of the punch.',
    },
  ),
  sense(
    '19',
    '“They didn’t think about the repercussions of locking her in.” What were they not thinking about?',
    'what would happen later because of it',
    ['how heavy the closet door was', 'whether the sun would come out', 'how loud she would shout'],
    {
      emoji: '⏳',
      funFact: 'Repercussions are always LATER and usually UNWANTED. Think of a sound echoing back off a wall — that is literally where the word comes from.',
    },
  ),

  // --- 20. tremor ------------------------------------------------------------
  word(
    '20',
    'Chopper picks up the scalpel before his first solo surgery, and his hand gives a small, quick shake he cannot stop. That tiny shake is a ______.',
    'tremor',
    ['concussion', 'avalanche', 'repercussion', 'surge'],
    {
      emoji: '🤏',
      image: CHOPPER,
      funFact: 'tremor (noun) = a slight shaking or trembling. A small earthquake is a tremor; so is a shake in your hands or your voice.',
    },
  ),
  sense(
    '20',
    '“There was a tremor in her voice when she said the word ‘sun’.” What does that tell you?',
    'her voice shook a little',
    ['she shouted the word loudly', 'she said it perfectly calmly', 'she refused to say it at all'],
    {
      emoji: '🗣️',
      funFact: 'Size is the whole difference: a tremor is SMALL. A big shake is a quake, a jolt or a convulsion. A tremor is the one you try to hide.',
    },
  ),

  // --- 21. immense -----------------------------------------------------------
  word(
    '21',
    'The Red Line is not just big. It is a wall of rock that circles the entire planet and blocks out the sky. It is ______.',
    'immense',
    ['frail', 'muffled', 'feverish', 'slackening'],
    {
      emoji: '🗿',
      image: LEGENDS,
      funFact: 'immense (adjective) = extremely large, almost too big to measure. Bigger than “big”, bigger than “huge”. Use it when the size is the point.',
    },
  ),
  sense(
    '21',
    '“The immense jungle of Venus boiled up around them.” How big is that jungle?',
    'enormous — almost beyond measuring',
    ['medium-sized, about a park', 'small but very crowded', 'hard to see because of fog'],
    {
      emoji: '🌿',
      funFact: 'Immense can describe things you cannot touch too: immense pressure, immense relief, immense courage. It always means “huge”.',
    },
  ),

  // --- 22. tumultuously ------------------------------------------------------
  word(
    '22',
    'The golden goal goes in. The stands erupt — everyone shouting at once, shoving, jumping, no order anywhere. The crowd behaves ______.',
    'tumultuously',
    ['frailly', 'resiliently', 'immensely', 'muffledly'],
    {
      emoji: '📣',
      funFact: 'tumultuously (adverb) = in a wild, noisy, disorderly way. From “tumult” — an uproar. Picture the loudest, messiest moment of a match.',
    },
  ),
  sense(
    '22',
    '“The children ran tumultuously out into the sun.” How did they run out?',
    'wildly and noisily, with no order',
    ['quietly, in a single file', 'slowly, holding hands', 'nervously, one at a time'],
    {
      emoji: '🏃',
      funFact: 'Tumultuously needs BOTH parts — loud AND disorderly. A loud, tidy parade is not tumultuous; a silent stampede is not either.',
    },
  ),

  // --- 23. resilient ---------------------------------------------------------
  word(
    '23',
    'Isagi gets dropped from the squad, loses the rematch, and turns up to the next selection anyway — sharper than before. Knock him down and he comes back up. He is ______.',
    'resilient',
    ['frail', 'stunned', 'muffled', 'feverish'],
    {
      emoji: '🔁',
      funFact: 'resilient (adjective) = able to spring back into shape, or bounce back after something bad. A rubber band is resilient; so is a person who keeps going.',
    },
  ),
  sense(
    '23',
    'Luffy’s rubber body is described as resilient. What does that mean about it?',
    'it springs back to its shape after being hit',
    ['it is extremely heavy and solid', 'it shatters the moment it is struck', 'it grows bigger every time it is hit'],
    {
      emoji: '🫧',
      image: LUFFY,
      funFact: 'Two uses, same idea: a resilient MATERIAL bounces back physically; a resilient PERSON bounces back emotionally. Both are the opposite of frail.',
    },
  ),

  // --- 24. savoured ----------------------------------------------------------
  word(
    '24',
    'Sanji sets down the plate. Luffy swallows his in four seconds; Brook eats one small piece at a time, eyes shut, making it last as long as he can. Brook ______ it.',
    'savoured',
    ['muffled', 'compounded', 'slackened', 'drenched'],
    {
      emoji: '🍖',
      image: BROOK,
      funFact: 'savour (verb) = to enjoy something slowly and completely, on purpose, to make it last. British/Canadian spelling “savour”, American “savor”.',
    },
  ),
  sense(
    '24',
    '“For two hours they savoured the sunlight.” What were the children doing?',
    'enjoying it slowly, making it last',
    ['rushing through it without looking', 'complaining about how hot it was', 'sleeping straight through it'],
    {
      emoji: '🌻',
      image: UTA,
      funFact: 'Savouring needs TIME. You cannot savour something in a hurry — which is exactly why two hours of sun in seven years is so painful to read about.',
    },
  ),

  // --- 25. stakes ------------------------------------------------------------
  word(
    '25',
    'Blue Lock elimination match: win and you stay in the programme, lose and you can never play for Japan again. There is a huge amount to win and lose here. The ______ are high.',
    'stakes',
    ['spokes', 'tremors', 'repercussions', 'midst'],
    {
      emoji: '🎲',
      funFact: 'stakes (noun, plural) = what you stand to win or lose in a risky situation. “High stakes” = a lot on the line. “What’s at stake?” = what could I lose?',
    },
  ),
  sense(
    '25',
    '“The stakes were high: if they let her out, they would have to admit what they had done.” What does STAKES mean here?',
    'what they stood to win or lose',
    ['sharp wooden posts in the ground', 'the amount of time they had left', 'the rules the teacher had set'],
    {
      emoji: '⚖️',
      image: LAW,
      funFact: 'Another two-meaning word: a STAKE is also a wooden post you hammer into the ground (a tent stake). The sentence decides — here nobody is hammering anything.',
    },
  ),
]
