// 🔤 Language "build the word" blocks, shown as multiple choice instead.
//
// The tile hand tested his thumbs and his eye for letters; the Language
// questions are about the word, not about assembling it. So every Language
// `build` block that has an entry here is dealt as a 3-option choice:
// the real answer + two wrong ones written by hand (real words of the same
// kind, or the classic misspelling for the spelling cards).
//
// Two things change every time a card is dealt:
//  - the ORDER of the options (never the same slot twice running), and
//  - sometimes the QUESTION itself — `alt` asks the same thing another way,
//    with the same answer. The block id, answer and history stay the same.
//
// Tuple: [wrong, wrong, alt prompt, prompt override?]. The override is for
// the blocks whose original prompt ends in "Build the …", where stripping it
// would also strip the question.
import type { SeBuild, SeChoice } from './types'

type Row = [string, string, string, string?]

const MAKE: Record<string, Row> = {
  'lang-a-make-build-0': ['HEADLINE', 'LABEL', 'The name of a poster, printed big at the top, is its ____.'],
  'lang-a-make-build-1': ['SCENE', 'PROP', 'In a script, the line or sign that tells an actor it is their turn is the ____.'],
  'lang-a-make-build-2': ['CAPTION', 'HEADING', 'To pull the main points together in a few lines at the end, you write a ____.'],
  'lang-a-make-build-3': ['HEADING', 'TITLE', 'Words printed under a photo to say what it shows make a ____.'],
  'lang-a-make-build-4': ['POSTER', 'SCRIPT', 'A drawing with labels that shows the parts of a machine is a ____.'],
  'lang-a-make-build-5': ['CUE', 'STAGE', 'A play is split into small parts, each in one place at one time. Each part is a ____.'],
  'lang-a-make-build-7': ['CAPTION', 'HEADING', '"Just do it" is a famous ____: a short, catchy phrase.'],
  'lang-a-real-build-0': ['HONESTY', 'DETAIL', '"Hurry, last chance!" tries to make you feel rushed. That trick is called ____.'],
  'lang-a-real-build-2': ['PICTURE', 'HEADING', 'A claim that names a person or a study and says where it came from has a ____.'],
  'lang-a-real-build-3': ['JOY', 'PRIDE', '"Do not be left behind!" tries to make you feel ____.'],
  'lang-a-real-build-4': ['FREE', 'OLD', '"Sponsored" means a company ____ for the post to be shown.'],
  'lang-a-real-build-6': ['FACT', 'TONE', 'A writer who leans strongly toward one side shows ____.'],
  'lang-a-real-build-7': ['GIFT', 'NEWS', 'You "win" something you never entered for, and must pay a fee. This trick is a ____.'],
  'lang-a-talk-basics-2': ['BEFORE', 'UNLESS', 'I believe Luffy is strong ____ the text says he stretched across the sea.'],
  'lang-a-talk-basics-7': ['GUESS', 'DREAM', 'To back up an opinion, point to ____ in the text.'],
  'lang-a-talk-build-2': ['MAPING', 'MAPS', 'Proof that Nami is clever: she ___ the storm route before the ship left.'],
  'lang-a-talk-build-3': ['STIL', 'STEEL', 'Zoro is tough. Even after three hits, he stood ___ and did not fall.'],
  'lang-a-talk-build-4': ['DANSED', 'DANCING', 'Proof that Bachira is playful: he ___ around the ball like a child.'],
  'lang-a-talk-build-5': ['HEART', 'MEMORY', 'Proof comes from the ___ of the text, not just from your own head.'],
  'lang-a-talk-build-6': ['AFTER', 'UNTIL', 'I think Zoro is loyal ___ the text says he stays with his captain.'],
  'lang-a-talk-build-7': ['ADORE', 'SPELL', 'The Marines fear Luffy. That is why they ___ hearing his name.'],
}

const PARTS: Record<string, Row> = {
  'lang-b-parts-build-0': ['rock', 'half', 'Zoro cuts the big tree. Which word is the verb?', 'Zoro cuts the rock in half. Which word is the VERB, the action word?'],
  'lang-b-parts-build-1': ['fight', 'after', 'Luffy is hungry at lunch. Which word describes Luffy?', 'Luffy is very hungry after the fight. Which word is the ADJECTIVE that describes Luffy?'],
  'lang-b-parts-build-2': ['kicks', 'net', 'Which word tells HOW Isagi kicks? Isagi kicks the ball quickly.', 'Isagi kicks the ball quickly into the net. Which word is the ADVERB that tells how he kicks?'],
  'lang-b-parts-build-3': ['plays', 'crew', 'Brook plays a violin on deck. What is the thing he plays?', 'Brook plays the violin for the crew. Which word is the NOUN, the name of the thing he plays?'],
  'lang-b-parts-build-4': ['goal', 'Isagi', 'Isagi shoots at the goal. Which word tells what Isagi does?', 'Isagi shoots at the goal. Which word is the VERB, the action word?'],
  'lang-b-parts-build-5': ['team', 'striker', 'Which word describes the striker? Bachira has a fierce striker.', 'Bachira has a fierce striker on his team. Which word is the ADJECTIVE that describes the striker?'],
  'lang-b-parts-build-6': ['tree', 'sleeps', 'Zoro eats lunch on the ship. Which word is the name of one person?', 'Zoro sleeps under the big tree. Which word is the PROPER NOUN, the name of one person?'],
  'lang-b-punct-build-0': ['colon', 'dash', 'Zoro, Sanji and Nami ate. The little mark that separates the first two names is a ___.'],
  'lang-b-punct-build-1': ['small', 'curly', 'In "Luffy sailed on the Going Merry", which kind of letter starts "Luffy" and "Going"?'],
  'lang-b-punct-build-2': ['gap', 'line', 'Another name for a period is a full ___.'],
  'lang-b-punct-build-3': ['jump', 'shout', 'At a comma, the reader takes a short ___.'],
  'lang-b-punct-build-4': ['Luffy', 'Nami', 'Read "Wake up, Zoro." Who is being told to wake up?'],
  'lang-b-punct-build-5': ['Zoro', 'Nami', 'Read "Let’s eat Luffy." Who might get eaten?'],
  'lang-b-punct-build-6': ['Zoro', 'Nami', 'Read "Sanji, bring the tea." Who must bring it?'],
  'lang-b-punct-build-7': ['story', 'poster', 'Isagi, Nagi, Rin: three names in a row. Commas keep the items of a ___ apart.'],
  'lang-b-sent-build-0': ['ate', 'meat', 'Find the subject. Luffy drank the juice.'],
  'lang-b-sent-build-1': ['crew', 'dawn', 'Find the verb: The crew sailed home.'],
  'lang-b-sent-build-3': ['Luffy', 'ate', 'Zoro slept because he was tired. Which word starts the dependent clause?'],
  'lang-b-sent-build-4': ['and', 'so', 'Nami ran fast, ___ she still missed the boat. Which word shows contrast?', 'Isagi shot hard, ___ the keeper dived. Which joining word shows contrast?'],
  'lang-b-sent-build-6': ['noun', 'comma', 'A subject says who or what. The ___ says what the subject does.'],
  'lang-b-sent-build-7': ['carried', 'swords', 'Find the subject. Zoro polished the blade.'],
  'lang-b-spell-build-0': ['CAPPE', 'CAEP', 'Add a silent e to "cap" and you get the word for a hero’s cloak: ___.'],
  'lang-b-spell-build-1': ['HOPED', 'HOPT', 'Yesterday Isagi ___ over the fence.'],
  'lang-b-spell-build-2': ['SENTRE', 'CENTRY', 'Blue Lock’s striker stands in the ___ of the pitch.'],
  'lang-b-spell-build-3': ['ACTSION', 'AKTION', 'The coach wants less talk and more ___.'],
  'lang-b-spell-build-4': ['NOW', 'NOE', 'Does Zoro ___ where the ship is? No, he gets lost.'],
  'lang-b-spell-build-5': ['CRUE', 'CROO', 'Nine pirates sail together. They are Luffy’s ___.'],
  'lang-b-spell-build-6': ['ANGEL', 'ANGUL', 'A shot from a tight ___ is hard to save.'],
  'lang-b-spell-build-7': ['RECIEVE', 'RECEAVE', 'Zoro will ___ a sword as a gift.'],
  'lang-b-vocab-build-0': ['fare', 'fearl', 'Chopper is fearless at sea. Take off -less. Which word is left?', 'Zoro is fearless in a fight. Cut off the suffix -less. Which root word is left?'],
  'lang-b-vocab-basics-4': ['hopeing', 'hopping', 'Add -ing to "hope". Which spelling is right?', 'Nami wants to write "hoping" from the word "hope". Which spelling is correct?'],
  'lang-b-vocab-build-1': ['clock', 'lack', 'Usopp tries to unlock the chest. Take off un-. Which word is left?', 'Franky must unlock the Sea Train door. Cut off the prefix un-. Which root word is left?'],
  'lang-b-vocab-build-2': ['pray', 'plea', 'Isagi asks for a replay of the pass. Cut off re-. Which word is left?', 'Isagi wants a replay of the goal. Cut off the prefix re-. Which root word is left?'],
  'lang-b-vocab-build-3': ['tea', 'reach', 'Zoro is a strong teacher of swordsmanship. Cut off -er. Which root is left?', 'Nami is a great teacher of maps. Cut off the suffix -er. Which root word is left?'],
  'lang-b-vocab-build-4': ['pat', 'play', 'Usopp waits for his payment. Cut off -ment. Which word is left?', 'Usopp got a Berry payment for the job. Cut off the suffix -ment. Which root word is left?'],
  'lang-b-vocab-build-5': ['kin', 'kid', 'Chopper’s kindness helps everyone. Cut off -ness. Which word is left?', 'Chopper showed real kindness to the crew. Cut off the suffix -ness. Which root word is left?'],
  'lang-b-vocab-build-6': ['honour', 'hone', 'Sanji is never dishonest. Cut off dis-. Which root word is left?', 'The referee called that tackle dishonest. Cut off the prefix dis-. Which root word is left?'],
  'lang-b-vocab-build-7': ['wire', 'wrote', 'Nami must rewrite the map. Cut off re-. Which word is left?', 'Isagi must rewrite his plan before the next match. Cut off the prefix re-. Which root word is left?'],
}

const READ: Record<string, Row> = {
  'lang-c-bias-build-0': ['HONEST', 'FAIR', 'A story that hides one side and only praises the teller is ___.'],
  'lang-c-bias-build-1': ['SECOND', 'THIRD', '"I ran, and I won," says Isagi. A story that uses "I" is told in the ___ person.'],
  'lang-c-bias-build-2': ['MANNER', 'MOTION', 'A writer’s reason for telling a story their own way is their ___.'],
  'lang-c-bias-build-3': ['QUOTE', 'TITLE', '"Our ship is the fastest." A sentence you are asked to accept is a ___.'],
  'lang-c-bias-build-5': ['FACT', 'QUOTE', '"Pizza is the best food ever." That is an ___, not a fact.'],
  'lang-c-feat-build-0': ['caption', 'index', 'The big line on top of a section that names it is a ____.'],
  'lang-c-feat-build-1': ['heading', 'index', 'A small line under a photo that explains it is a ____.'],
  'lang-c-feat-build-2': ['caption', 'footer', 'A box beside the main text with extra facts is a ____.'],
  'lang-c-feat-build-3': ['light', 'tiny', 'Thick, dark print that makes a word jump out is called ____.'],
  'lang-c-feat-build-4': ['cover', 'title', 'At the back of a book, a list of topics with page numbers is the ____.'],
  'lang-c-feat-build-6': ['caption', 'poster', 'A labelled drawing that shows how parts fit together is a ____.'],
  'lang-c-feat-build-7': ['number', 'heading', 'A dot at the start of each item in an unordered list is a ____.'],
  'lang-c-infer-build-2': ['PROUD', 'SLEEPY', 'Usopp rowed alone, kept looking back and jumped at every splash. He feels ____.'],
  'lang-c-infer-build-5': ['CALM', 'SILLY', 'Bachira checks his phone again and again, and bites his nails. He feels ____.'],
  'lang-c-infer-build-7': ['HAPPY', 'SLEEPY', 'Reo kicked his bag and slammed a door. Nobody dared come close. He feels ____.'],
  'lang-c-main-build-0': ['SMALL', 'LAST', 'The big idea that all the sentences support is the ____ idea.'],
  'lang-c-main-build-1': ['TOPIC', 'TITLE', 'A sentence that backs up the big idea is a supporting ____.'],
  'lang-c-main-build-2': ['DETAIL', 'TITLE', 'In a few words, who or what a paragraph is about is its ____.'],
  'lang-c-main-build-4': ['LUCK', 'NOISE', 'To believe a main idea, we need ____, like facts and quotes.'],
  'lang-c-main-build-5': ['OPINION', 'HEADING', 'Isagi’s goal against the best defence is one ____ of his skill.'],
  'lang-c-main-build-6': ['LAST', 'THIRD', 'Often the main idea sits in the ____ sentence of a paragraph.'],
  'lang-c-main-build-7': ['TITLE', 'SPOT', 'To get the main idea, ask what ____ all the sentences make.'],
  'lang-c-two-build-0': ['FACT', 'SIZE', 'One writer sounds proud, the other sounds doubtful. The writer’s attitude is the ____.'],
  'lang-c-two-build-1': ['OPINION', 'GUESS', '"Isagi scored two goals." You can count them. That statement is a ____.', 'One report says Luffy ran 40 metres in the storm. You can check that with a measuring tape. Which word names a statement you can check?'],
  'lang-c-two-build-2': ['FACT', 'TITLE', 'A writer who always leans one way has a ___.'],
  'lang-c-two-build-3': ['FACT', 'SOURCE', '"Zoro is the coolest." It is what someone thinks, so it is an ___.'],
  'lang-c-two-build-4': ['TITLE', 'TOPIC', 'The person or record an account comes from is its ___.'],
  'lang-c-two-build-5': ['BIAS', 'TONE', 'An exact goal time gives a report more ___ than "early on".'],
  'lang-c-two-build-6': ['LUCK', 'HOPE', 'A claim needs ___, like a shot count or a witness.'],
  'lang-c-two-build-7': ['TITLE', 'TONE', '"We beat the Marines in ten minutes" is a ___ the reader must check.'],
}

const WRITE: Record<string, Row> = {
  'lang-d-edit-basics-2': ['6', '50', 'A 60-word draft loses 10%. How many words stay?', 'Zoro’s draft is 60 words. He cuts 10%. How many words are left?'],
  'lang-d-edit-build-0': ['strong', 'Zoro', 'The sea is very very wide. Which word repeats by mistake?', 'Zoro is very very strong. Which word was said twice by mistake?'],
  'lang-d-edit-build-1': ['finished', 'map', 'Sanji just just served lunch. Which word is extra?', 'Nami just just finished the map. Which word is extra?'],
  'lang-d-edit-basics-9': ['receeve', 'recive', 'Fix this word: "recieve". Which spelling is right?', 'Chopper’s note has a spelling error. Which is the correct spelling of "recieve"?'],
  'lang-d-edit-applied-6': ['10', '50', 'A 150-word story loses 10% of its words. How many are cut?', 'Cut 10% from a 150-word story. How many words go?'],
  'lang-d-edit-build-2': ['ran', 'ship', 'Franky went to to the dock. Which word is extra?', 'Chopper ran to to the ship. Which word is extra?'],
  'lang-d-edit-build-3': ['shot', 'hard', 'The sea was really really cold. Which word can go?', 'Isagi’s shot was really really hard. Which word can go?'],
  'lang-d-edit-build-4': ['scared', 'sea', 'Nami said, like, the map was wrong. Which word is the filler?', 'Usopp was, like, scared of the sea. Which word is the filler?'],
  'lang-d-edit-build-5': ['best', 'Mihawk', 'Zoro said, um, that he was lost. Which word is the filler?', 'Mihawk is, um, the best swordsman. Which word is the filler?'],
  'lang-d-edit-build-6': ['ocean', 'deep', 'Luffy was totally, totally full. Which word repeats?', 'The ocean was totally, totally deep. Which word repeats?'],
  'lang-d-edit-build-7': ['kicked', 'ran', 'Nagi stopped, and then he then slept. Which word is extra?', 'Isagi kicked the ball, and then he then ran. Which word is extra?'],
  'lang-d-narr-build-0': ['ENDING', 'TITLE', 'The opening line that grabs the reader is the ___.'],
  'lang-d-narr-build-1': ['SETTING', 'PAYOFF', 'The big trouble the hero has to fix is the ___.'],
  'lang-d-narr-build-2': ['HOOK', 'SETTING', 'A sudden change of direction in a story is the ___.'],
  'lang-d-narr-build-3': ['HOOK', 'TURN', 'The part where the question gets answered is the ___.'],
  'lang-d-narr-build-4': ['SETTING', 'TURN', 'What the hero could lose is the ___.'],
  'lang-d-narr-build-5': ['PROBLEM', 'STAKES', 'The place and time of a story are its ___.'],
  'lang-d-narr-build-6': ['SETTING', 'PAYOFF', 'The nervous waiting feeling that keeps you reading is ___.'],
  'lang-d-narr-build-7': ['HOOK', 'SETTING', 'When an early clue pays off later, that moment is the ___.'],
  'lang-d-op-build-0': ['REASON', 'TITLE', 'A sentence saying what you believe is your ___.'],
  'lang-d-op-build-1': ['BEFORE', 'UNLESS', 'Zoro is the best swordsman ___ he never loses a duel. Which word joins a claim to its reason?', 'Pick the word that joins a claim to its reason: "Isagi is the best striker ___ he scored in every game."'],
  'lang-d-op-build-3': ['TITLE', 'CLAIM', 'A book or witness that the proof comes from is the ___.'],
  'lang-d-op-build-4': ['FACT', 'SOURCE', 'A belief that someone could disagree with is an ___.'],
  'lang-d-op-build-6': ['JOKES', 'GUESSES', 'Shots on target and goal difference are ___ that support a claim.'],
  'lang-d-op-build-7': ['SIMPLE', 'FINAL', 'An argument from the other side that you must answer is the ___ argument.'],
  'lang-d-para-build-1': ['LAST', 'TITLE', 'The first sentence of a paragraph names the one idea. It is the ___ sentence.'],
  'lang-d-para-applied-8': ['24', '2', '4 sentences plus 6 sentences make how many?', 'Paragraph A has 4 sentences. Paragraph B has 6. How many sentences are there in total?'],
  'lang-d-para-build-2': ['HIDE', 'SKIP', 'A real fact from the story should ___ your point.'],
  'lang-d-para-build-3': ['REPEAT', 'SKIP', 'After the fact, you must ___ how it proves your point.'],
  'lang-d-para-build-4': ['KEEPER', 'COACH', 'The player who scores the goals is the ___.'],
  'lang-d-para-build-5': ['SEA', 'ISLAND', 'Luffy sails the Grand ___.'],
  'lang-d-para-build-6': ['ERASE', 'COPY', 'A new idea means a new paragraph. ___ the first line.'],
  'lang-d-para-build-7': ['ENDS', 'SKIPS', 'The last sentence ___ up the one idea.'],
  'lang-d-plan-build-0': ['WEB', 'ORDER', 'The one big goal of a piece of writing is the main ___.'],
  'lang-d-plan-build-1': ['TITLES', 'JOKES', 'A short plan gives the main idea three supporting ___.'],
  'lang-d-plan-build-2': ['COLOUR', 'SIZE', 'After picking your points, choose the ___ to write them in.'],
  'lang-d-plan-build-4': ['LIST', 'LADDER', 'An idea in the middle with points branching out around it is a ___.'],
  'lang-d-plan-build-5': ['EPILOGUE', 'HEADLINE', 'A short list of your idea and points in order is an ___.'],
  'lang-d-plan-build-6': ['KEPT', 'COPIED', 'A point that does not help the main idea must be ___.'],
  'lang-d-plan-build-7': ['HOURS', 'DAYS', 'Spending five ___ on a plan can save forty of rewriting.'],
}

const ROWS: Record<string, Row> = { ...MAKE, ...PARTS, ...READ, ...WRITE }

/** How often the same idea comes back worded the other way. */
const ALT_CHANCE = 0.5

/** The last slot each card put its answer in, so the answer never sits still. */
const lastSlot = new Map<string, number>()

/** "…? Build the word." → "…?" — the tiles are gone, so the instruction is too. */
function stripBuild(prompt: string): string {
  return prompt.replace(/\s*(?:Build|Type) [^.?]*[.?]\s*$/, '').trim() || prompt
}

/** Is there a choice version of this block? */
export function hasLangChoice(id: string): boolean {
  return id in ROWS
}

/**
 * The choice version of a Language build block, freshly rotated: new option
 * order every call, and about half the time the alternate wording.
 */
export function langAsChoice(block: SeBuild): SeChoice | null {
  const row = ROWS[block.id]
  if (!row) return null
  const [w1, w2, alt, override] = row
  const original = override ?? stripBuild(block.prompt)
  const prompt = Math.random() < ALT_CHANCE ? alt : original

  const options = [block.answer, w1, w2]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  let answer = options.indexOf(block.answer)
  const prev = lastSlot.get(block.id)
  if (prev === answer) {
    // rotate by one so the right answer is somewhere new
    const k = 1 + Math.floor(Math.random() * (options.length - 1))
    const rotated = options.map((_, i) => options[(i + options.length - k) % options.length])
    options.splice(0, options.length, ...rotated)
    answer = options.indexOf(block.answer)
  }
  lastSlot.set(block.id, answer)

  return {
    id: block.id,
    kind: 'choice',
    ...(block.secs ? { secs: block.secs } : {}),
    ...(block.lead ? { lead: block.lead } : {}),
    prompt,
    ...(block.art ? { art: block.art } : {}),
    options,
    answer,
    why: block.why,
    ...(block.steps ? { steps: block.steps } : {}),
  } as SeChoice
}
