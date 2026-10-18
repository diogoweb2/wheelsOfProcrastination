// 🏫 St. Eugene 7 (§24) — Ben's actual grade-7 curriculum, in the order his
// class walks it.
//
// This file is the MAP, not the content. It knows what the year contains and
// what order it comes in; the lessons themselves live in `src/steugene/packs/`.
// Keeping them apart means a subtopic can exist on the map long before anyone
// has written a lesson for it — which is the normal state of a school year.
//
// Order is the whole point. The curriculum arrived as Term 1 (History), then
// the general subjects, then Term 2 (Geography), and that is exactly how it is
// laid out here: October is Term 1, so Geography sits at the bottom where it
// belongs until February.

/** The three blocks of the year, in the order they are taught. */
import type { SeAnswer } from '../types'

export type SeTerm = 'term1' | 'general' | 'term2'

export const TERM_LABEL: Record<SeTerm, string> = {
  term1: 'Term 1 — now',
  general: 'All year',
  term2: 'Term 2 — later',
}

/**
 * One teachable thing: the unit of a lesson, a report row and a "what are you
 * learning?" card.
 *
 * `sample` is the part that matters for him. "Rational numbers" means nothing
 * to a twelve-year-old; `|−20| = 20` means everything. The Finder (§24e) shows
 * `sample`, never `title`, and that is deliberate.
 */
export interface SeSubTopic {
  id: string
  title: string
  /** What it looks like on the page — one line he would recognise from class. */
  sample: string
  /** Plain-English "this is the one where…", read aloud by the Finder. */
  plain: string
  /**
   * First person, past the finish line: what he can DO once he has this
   * (§24r). It is not the topic reworded — "Wrapping paper, basically" is a
   * topic, "I can unfold a box in my head" is an ability, and only the second
   * one belongs on a list of his own wins.
   */
  can: string
  emoji: string
}

export interface SeStrand {
  id: string
  /** Verbatim from the curriculum sheet — this is what the teacher calls it. */
  title: string
  subtopics: SeSubTopic[]
}

export interface SeSubject {
  id: string
  name: string
  emoji: string
  term: SeTerm
  /** Icon tile gradient, same two-colour shape as an app tile. */
  tint: [string, string]
  /** The crossover flavour this subject is painted in. */
  skin: 'onepiece' | 'bluelock'
  strands: SeStrand[]
}

const t = (id: string, title: string, emoji: string, sample: string, plain: string, can: string): SeSubTopic => ({
  id,
  title,
  emoji,
  sample,
  plain,
  can,
})

// --- Term 1: History ---------------------------------------------------------

const HISTORY: SeSubject = {
  id: 'history',
  name: 'History',
  emoji: '⚔️',
  term: 'term1',
  tint: ['#af6528', '#3a1a00'],
  skin: 'onepiece',
  strands: [
    {
      id: 'hist-a',
      title: 'Strand A: New France and British North America, 1713–1800',
      subtopics: [
        t('hist-a-1713', 'Who was already here in 1713', '🗺️', 'Haudenosaunee · Anishinaabe · Wendat · French · British', 'The people living here before the map had borders on it.', 'I can name who was already living here in 1713, long before any treaty.'),
        t('hist-a-fur', 'The fur trade and the alliances it bought', '🦫', 'beaver pelt → musket, kettle, cloth', 'Trade was not shopping. It was how sides were chosen.', 'I can explain why the fur trade was really about who your allies were.'),
        t('hist-a-war', 'The fall of New France, 1754–1763', '🏴', '1759 — the Plains of Abraham', 'Seven years of war, and who ended up holding Quebec.', 'I can tell you how New France fell, and it was not in one battle.'),
        t('hist-a-1763', 'The Royal Proclamation of 1763', '📜', '1763 — a line drawn down the map', 'Britain promises land to First Nations, and the settlers ignore it.', 'I can say what the Royal Proclamation promised, and who it promised it to.'),
        t('hist-a-quebec', 'The Quebec Act, 1774', '⛪', 'French law + Catholic faith, kept', 'Britain lets Quebec stay Quebec — and the Thirteen Colonies rage.', 'I can explain why the Quebec Act pleased one side and enraged the other.'),
        t('hist-a-loyal', 'The Loyalists arrive', '⛵', '1783 — ~50,000 people move north', 'People who picked the losing side of a revolution, and where they landed.', 'I can explain who the Loyalists were and why they had to leave.'),
        t('hist-a-1791', 'The Constitutional Act, 1791', '✂️', 'Upper Canada · Lower Canada', 'One colony cut into two so each could keep its own language.', 'I can explain what the Constitutional Act split in two, and why.'),
        t('hist-a-slave', 'Slavery and freedom in early Canada', '⛓️', '1793 — Upper Canada limits slavery', 'The part of the story the old textbooks skipped.', 'I can tell you that slavery was legal here, and how it ended.'),
      ],
    },
    {
      id: 'hist-b',
      title: 'Strand B: Canada, 1800–1850: Conflict and Challenges',
      subtopics: [
        t('hist-b-life', 'Life in Upper and Lower Canada', '🏚️', 'a log house, a stump field, no doctor', 'What an ordinary day cost when nothing was built yet.', 'I can describe an ordinary day in Upper and Lower Canada.'),
        t('hist-b-1812', 'The War of 1812', '💥', '1813 — York burns', 'The war that decided Canada would not be American.', 'I can explain who won the War of 1812, and why that is a trick question.'),
        t('hist-b-immig', 'Immigration, 1815–1850', '🚢', 'the Irish famine ships', 'Who came, why they left, and what met them at the dock.', 'I can explain why so many people came here between 1815 and 1850.'),
        t('hist-b-reb', 'The Rebellions of 1837–38', '🔥', 'Mackenzie · Papineau', 'Two uprisings, both crushed, both the reason things changed.', 'I can explain what the 1837 rebels wanted, and whether they got it.'),
        t('hist-b-durham', "Lord Durham's Report", '📝', '1839 — "two nations warring"', 'A British lord looks at the mess and writes what to do about it.', 'I can explain what Lord Durham told Britain to do, and what it did.'),
        t('hist-b-union', 'The Act of Union, 1840', '🔗', 'Upper + Lower = the Province of Canada', 'The two halves glued back together, against one half’s will.', 'I can explain what the Act of Union joined, and who it left out.'),
        t('hist-b-resp', 'Responsible government, 1848', '🗳️', '1848 — the governor stops deciding', 'The year the people who were elected finally ran things.', 'I can explain what responsible government means in one sentence.'),
      ],
    },
  ],
}

// --- All year: Language ------------------------------------------------------

const LANGUAGE: SeSubject = {
  id: 'language',
  name: 'Language',
  emoji: '📖',
  term: 'general',
  tint: ['#2e63a4', '#12315a'],
  skin: 'onepiece',
  strands: [
    {
      id: 'lang-a',
      title: 'Literacy Connections and Applications',
      subtopics: [
        t('lang-a-real', 'Reading the real world', '🔍', 'an ad, a post, a thing an AI wrote', 'Spotting what a text is actually trying to do to you.', 'I can read something real — a page, a label, a post — and say what it is doing.'),
        t('lang-a-talk', 'Talking about what you read', '💬', '"I think X, because the text says Y"', 'Having an opinion and being able to prove it from the page.', 'I can say what I think about a text and point at the line that proves it.'),
        t('lang-a-make', 'Making something out of what you learned', '🛠️', 'poster · script · explainer', 'Turning reading into a thing other people can use.', 'I can turn something I read into something of my own.'),
      ],
    },
    {
      id: 'lang-b',
      title: 'Foundations of Language',
      subtopics: [
        t('lang-b-spell', 'Spelling patterns and syllables', '🔤', 'be·cause · re·ceive · ne·ces·sary', 'Why English spells things the way it does, mostly.', 'I can break a long word into syllables and spell it.'),
        t('lang-b-vocab', 'Prefixes, suffixes and roots', '🧩', 'un + break + able', 'Taking a long word apart to find a word you already know.', 'I can work out a new word from its prefix, root and suffix.'),
        t('lang-b-sent', 'Sentences: subject, predicate, clauses', '🧱', 'The crew | sailed at dawn.', 'What makes a sentence a sentence and not a fragment.', 'I can find the subject and the predicate in any sentence.'),
        t('lang-b-punct', 'Punctuation and capitals', '❗', "Let's eat, Zoro. / Let's eat Zoro.", 'The commas that decide whether somebody gets eaten.', 'I can punctuate a sentence so it means what I meant.'),
        t('lang-b-parts', 'Parts of speech', '🏷️', 'noun · verb · adjective · adverb', 'Naming the jobs the words in a sentence are doing.', 'I can name what every word in a sentence is doing.'),
      ],
    },
    {
      id: 'lang-c',
      title: 'Comprehension: Understanding and Responding to Texts',
      subtopics: [
        t('lang-c-main', 'Main idea and supporting details', '🎯', 'the one sentence the rest is about', 'Finding the point, and the three things holding it up.', 'I can find the main idea and the lines that hold it up.'),
        t('lang-c-infer', 'Inference — what the text does NOT say', '🕵️', '"He left his plate full." → ?', 'Reading what the writer made you work out yourself.', 'I can work out what a text is saying without saying it.'),
        t('lang-c-bias', 'Point of view and bias', '⚖️', 'who is telling it, and what they want', 'Two people describe the same fight. Both are "true".', 'I can spot whose side a piece of writing is on.'),
        t('lang-c-feat', 'Text features and structure', '🗂️', 'heading · caption · sidebar · bold', 'Reading the shape of a page before the words.', 'I can use headings, captions and bold type to find things fast.'),
        t('lang-c-two', 'Comparing two texts', '🔀', 'same event, two writers', 'Putting two accounts side by side and finding the gap.', 'I can put two texts side by side and say where they disagree.'),
      ],
    },
    {
      id: 'lang-d',
      title: 'Composition: Expressing Ideas and Creating Texts',
      subtopics: [
        t('lang-d-plan', 'Planning a piece of writing', '🗒️', 'idea → 3 points → order', 'The five minutes that save the next forty.', 'I can plan a piece of writing before I start it.'),
        t('lang-d-para', 'Paragraphs that hold together', '🧱', 'point · evidence · explain', 'One idea per paragraph, and how to prove it.', 'I can write a paragraph that sticks to one idea.'),
        t('lang-d-narr', 'Narrative writing', '📚', 'hook · problem · turn · end', 'Telling a story that someone wants to finish.', 'I can write a story with an opening that makes you carry on.'),
        t('lang-d-op', 'Opinion and persuasive writing', '📣', 'claim + reason + proof', 'Arguing on paper without shouting.', 'I can argue for something and back it up.'),
        t('lang-d-edit', 'Revising and editing', '✏️', 'cut 10% and it gets better', 'The draft is not the piece.', 'I can go back over my own writing and make it better.'),
      ],
    },
  ],
}

// --- All year: Mathematics ---------------------------------------------------
//
// October: the class is on **rational numbers**, the first subtopic of the
// first strand. `CURRENT_SUBTOPIC` below marks it, and the Subjects tab opens
// there.

const MATH: SeSubject = {
  id: 'math',
  name: 'Mathematics',
  emoji: '🔢',
  term: 'general',
  tint: ['#d70000', '#5c0000'],
  skin: 'bluelock',
  strands: [
    {
      id: 'math-number',
      title: 'Number Sense and Numeration',
      subtopics: [
        t('math-rational', 'Rational numbers', '➗', '−3 · ½ · 0.75 · 0 — all on one line', 'Slices of a pizza, Y levels below zero — anything you can write as a fraction.', 'I can see any number as a fraction — pizza slices, Y levels, anything.'),
        t('math-compare', 'Comparing and ordering', '📏', '−2.5 < −2 < −¾ < 0.3', 'Which is bigger — deeper in the mine is the smaller Y.', 'I can put any numbers in order, negatives included.'),
        t('math-abs', 'Absolute value and opposites', '🪞', '|−20| = 20', 'How far you are from spawn, never mind which direction.', 'I can say how far a number is from zero without caring which side.'),
        t('math-int-add', 'Adding and subtracting integers', '➕', '−7 + 12 = 5', 'Hearts lost and healed, walking west past spawn.', 'I can add and subtract negatives without getting lost.'),
        t('math-int-mult', 'Multiplying and dividing integers', '✖️', '(−4) × (−6) = 24', 'Two negatives, one positive. The rule and the reason.', 'I can multiply and divide negatives, and say why two make a plus.'),
        t('math-fdp', 'Fractions, decimals and percents', '🔁', '¾ = 0.75 = 75%', 'A shield at 3/4, 0.75 and 75% — one number, three shirts.', 'I can switch a number between a fraction, a decimal and a percent.'),
        t('math-frac-add', 'Adding and subtracting fractions', '🍕', '⅔ + ¼ = 11/12', 'Slices have to be the same size before you can add them.', 'I can add fractions that started out cut into different sizes.'),
        t('math-frac-mult', 'Multiplying and dividing fractions', '🍰', '⅗ ÷ ¼ = 12/5', 'Half of a half pizza, two thirds of a stack of 64.', 'I can multiply and divide fractions.'),
        t('math-percent', 'Percents in real life', '🏷️', '$80 shirt, 25% off, +13% HST', 'A skin on sale, 13% HST, and what you really pay.', 'I can work out a sale price and the tax on top of it.'),
        t('math-ratio', 'Ratios, rates and proportions', '⚖️', '3 : 5 · 90 km/h · $4.50 / kg', 'K/D, Robux per hour, damage per second — two numbers, one fair comparison.', 'I can compare two things fairly — K/D, Robux an hour, damage a second.'),
        t('math-power', 'Powers and square roots', '🔺', '7² = 49 · √144 = 12', 'Exponents, and the button that undoes them.', 'I can do powers and square roots.'),
        t('math-round', 'Rounding and estimating', '🎯', '1 043 221 → 1.0 million', 'A 3,000,000,000 bounty rounded to 3 billion, on purpose.', 'I can round a huge number and say how much I threw away.'),
      ],
    },
    {
      id: 'math-pattern',
      title: 'Patterning and Algebra',
      subtopics: [
        t('math-pat', 'Patterns and pattern rules', '🔢', '4, 7, 10, 13, … → 3n + 1', 'Finding the rule, then jumping straight to term 100.', 'I can find the rule in a pattern and jump straight to term 100.'),
        t('math-var', 'Variables and expressions', '🅰️', '3n + 1 when n = 7', 'A letter is just a box waiting for a number.', 'I can read a letter in maths as a box with a number in it.'),
        t('math-eq1', 'Solving one-step equations', '⚖️', 'x + 9 = 14', 'Do the same thing to both sides. Always.', 'I can solve for x in one move.'),
        t('math-eq2', 'Solving two-step equations', '⚖️', '2x − 5 = 11', 'Undo in the opposite order you would do it.', 'I can solve for x in two moves, in the right order.'),
        t('math-graph', 'Graphing linear relations', '📈', 'y = 2x + 1', 'A rule, a table, and the straight line they make.', 'I can turn a rule into a table and a table into a straight line.'),
      ],
    },
    {
      id: 'math-measure',
      title: 'Measurement',
      subtopics: [
        t('math-area', 'Perimeter and area', '🟦', 'A = b × h', 'Around the edge, and inside the shape.', 'I can work out the edge of a shape and the inside of it.'),
        t('math-circle', 'Circles: radius, diameter, circumference', '⭕', 'C = π × d', 'The storm circle: radius, diameter, and the run around the edge.', 'I can get from radius to diameter to the whole way round.'),
        t('math-circle-area', 'Area of a circle', '🥧', 'A = π r²', 'Why one 12-inch pizza beats two 8-inch ones.', 'I can work out the area of a circle, and why the big pizza wins.'),
        t('math-surface', 'Surface area of prisms', '📦', 'unfold the box, add the faces', 'Wrapping paper, basically.', 'I can unfold a box in my head and add up the faces.'),
        t('math-volume', 'Volume of prisms and cylinders', '🧊', 'V = base area × height', 'How much water fills a 5 × 3 × 2 pool.', 'I can work out how much fits inside a prism or a cylinder.'),
        t('math-units', 'Units and conversions', '📐', '2.4 m = 240 cm = 2400 mm', 'One block is one metre, one chunk is sixteen.', 'I can convert between mm, cm, m and km without guessing.'),
      ],
    },
    {
      id: 'math-data',
      title: 'Data Management',
      subtopics: [
        t('math-collect', 'Collecting data and sampling', '📋', 'who did you ask, and was that fair?', 'Asking only your squad if Fortnite is the best game.', 'I can tell a fair question from a loaded one.'),
        t('math-avg', 'Mean, median, mode and range', '📊', '2, 3, 3, 9 → mean 4.25, median 3', 'Your K/D across five matches, four different ways.', 'I can work out mean, median, mode and range, and say which one lies.'),
        t('math-graphs', 'Reading and drawing graphs', '📉', 'bar · line · circle · scatter', 'Picking the graph that tells the truth.', 'I can pick the graph that tells the truth, and spot one that does not.'),
        t('math-prob', 'Probability', '🎲', 'P(six) = 1/6', 'Pack odds, chest spawns, and shiny at 1 in 4,096.', 'I can work out the odds of something — a pack, a chest, a shiny.'),
      ],
    },
    {
      id: 'math-geo',
      title: 'Geometry and Spatial Sense',
      subtopics: [
        t('math-angles', 'Angles and angle relationships', '📐', 'supplementary: 180° − 115° = 65°', 'Angles that always add to the same thing.', 'I can find a missing angle from the ones I already have.'),
        t('math-shapes', 'Triangles and quadrilaterals', '🔺', 'angles of a triangle = 180°', 'Sorting shapes by what is true about them.', 'I can sort triangles and quadrilaterals by what is true about them.'),
        t('math-congr', 'Congruence and similarity', '🪞', 'same shape · same size?', 'Identical twins versus scaled-up twins.', 'I can tell same-shape-same-size from same-shape-but-bigger.'),
        t('math-trans', 'Transformations', '🔄', 'slide · flip · turn · resize', 'Moving a shape without changing what it is.', 'I can slide, flip, turn and resize a shape and say what I did.'),
        t('math-cart', 'The Cartesian plane', '📍', '(−3, 4)', 'The F3 screen: X and Z, negatives included.', 'I can plot any point on the grid, negatives and all.'),
      ],
    },
    {
      id: 'math-coding',
      title: 'Coding',
      subtopics: [
        t('code-seq', 'Sequence, input and output', '▶️', 'step 1 → step 2 → step 3', 'A computer does exactly what you said, in order.', 'I can read code and say exactly what order it happens in.'),
        t('code-loop', 'Loops', '🔁', 'repeat 4 [ forward 100, right 90 ]', 'Saying a thing once and having it happen ten times.', 'I can write a loop instead of the same line ten times.'),
        t('code-if', 'Conditionals', '🔀', 'if score > 10 then …', 'Teaching the program to choose.', 'I can make a program choose between two things.'),
        t('code-var', 'Variables in code', '📦', 'score = score + 1', 'A box with a name on it.', 'I can store something in a variable and change it later.'),
        t('code-debug', 'Debugging and efficiency', '🐛', 'why does it run 11 times?', 'Finding the one wrong line.', 'I can find the one wrong line in code that nearly works.'),
      ],
    },
    {
      id: 'math-fin',
      title: 'Financial Literacy',
      subtopics: [
        t('fin-budget', 'Budgets and spending plans', '🧾', 'in $60 · out $47 · left $13', 'Allowance in, Battle Pass out, what is left.', 'I can build a budget and say what is left at the end of it.'),
        t('fin-interest', 'Interest: simple and compound', '📈', '$100 at 5% for 3 years', 'Money that grows while you do nothing.', 'I can work out interest, and why compound is the scary one.'),
        t('fin-unit', 'Unit price and best buy', '🛒', '$4.50 / 900 g vs $2.80 / 500 g', 'Which V-Bucks bundle is actually cheaper per V-Buck.', 'I can work out which bundle is actually cheaper per unit.'),
        t('fin-tax', 'Taxes, tips and discounts', '💸', '$40 + 13% HST = $45.20', 'Why the till always asks for more than the sticker.', 'I can work out the real price once HST, a tip or a discount lands.'),
        t('fin-credit', 'Saving, borrowing and credit', '💳', 'minimum payment = a long time', 'Borrowing is renting money.', 'I can explain why paying the minimum takes years.'),
      ],
    },
  ],
}

// --- All year: Science -------------------------------------------------------

const SCIENCE: SeSubject = {
  id: 'science',
  name: 'Science',
  emoji: '🔬',
  term: 'general',
  tint: ['#0a7d3c', '#052d17'],
  skin: 'onepiece',
  strands: [
    {
      id: 'sci-life',
      title: 'Life Systems — Interactions in the Environment',
      subtopics: [
        t('sci-eco', 'Ecosystems: who needs whom', '🌳', 'producer → consumer → decomposer', 'Nothing in nature lives alone.', 'I can explain who in an ecosystem needs whom.'),
        t('sci-web', 'Food chains and food webs', '🕸️', 'remove the wolves → ?', 'Pull one thread and watch the whole thing move.', 'I can trace a food web and say what breaks if one animal goes.'),
        t('sci-cycles', 'Water, carbon and nitrogen cycles', '💧', 'the same water, forever', 'Matter goes around. It never leaves.', 'I can follow water, carbon and nitrogen all the way round the loop.'),
        t('sci-impact', 'Human impact and invasive species', '🚯', 'zebra mussels in the Great Lakes', 'What happens when something arrives that does not belong.', 'I can explain what an invasive species does to a place.'),
        t('sci-succ', 'Succession and biodiversity', '🌱', 'bare rock → moss → forest', 'How an empty place fills back up.', 'I can explain how bare rock turns into a forest.'),
      ],
    },
    {
      id: 'sci-matter',
      title: 'Matter and Energy — Pure Substances and Mixtures',
      subtopics: [
        t('sci-pure', 'Pure substances and mixtures', '⚗️', 'salt vs salt water', 'One thing, or several things pretending to be one.', 'I can tell a pure substance from a mixture.'),
        t('sci-sol', 'Solutions and solubility', '🧂', 'how much sugar before it stops dissolving?', 'Saturated, and why heat changes it.', 'I can explain what saturated means and what heat does to it.'),
        t('sci-sep', 'Separating mixtures', '🧫', 'filter · evaporate · distil · magnet', 'Getting it back apart again.', 'I can pick the right way to get a mixture back apart.'),
        t('sci-particle', 'The particle theory of matter', '🔵', 'solid · liquid · gas', 'Five rules that explain almost everything.', 'I can use the particle theory to explain solid, liquid and gas.'),
        t('sci-water', 'Water quality and treatment', '🚰', 'from the lake to your tap', 'What happens to Lake Ontario before you drink it.', 'I can describe what happens to lake water before I drink it.'),
      ],
    },
    {
      id: 'sci-struct',
      title: 'Structures and Mechanisms — Form and Function',
      subtopics: [
        t('sci-forms', 'Solid, frame and shell structures', '🏗️', 'dam · tower · eggshell', 'Three ways to hold something up.', 'I can tell a solid, a frame and a shell structure apart.'),
        t('sci-forces', 'Forces on structures', '🧲', 'compression · tension · shear · torsion', 'The four ways a thing gets pushed apart.', 'I can name the four ways a force pulls a structure apart.'),
        t('sci-gravity', 'Centre of gravity and stability', '⚖️', 'why a wide base does not fall over', 'Where the weight sits decides whether it tips.', 'I can say whether something will tip over, and why.'),
        t('sci-fail', 'Designing so it fails safely', '🧯', 'the part that is MEANT to break', 'Good design plans for the bad day.', 'I can explain why good design plans for the part that breaks.'),
        t('sci-mech', 'Mechanisms and mechanical advantage', '⚙️', 'lever · pulley · gear', 'Trading distance for force.', 'I can explain how a lever, a pulley and a gear trade distance for force.'),
      ],
    },
    {
      id: 'sci-earth',
      title: 'Earth and Space Systems — Heat in the Environment',
      subtopics: [
        t('sci-heat', 'Heat and temperature are not the same', '🌡️', 'a spark vs a bathtub', 'One is energy, the other is how hot it feels.', 'I can explain why a spark is hotter than a bath but holds less heat.'),
        t('sci-expand', 'Heat and the particle theory', '🔥', 'things get bigger when they get hot', 'Why bridges have gaps in them.', 'I can explain why bridges are built with gaps in them.'),
        t('sci-transfer', 'Conduction, convection, radiation', '♨️', 'spoon · boiling water · the sun', 'The three ways heat travels.', 'I can name the three ways heat travels and spot each one.'),
        t('sci-climate', 'Heat in the atmosphere and oceans', '🌊', 'why the lake keeps Toronto warmer', 'Water holds heat. A lot of it.', 'I can explain why the sea heats up more slowly than the land.'),
        t('sci-energy', 'Energy sources and the greenhouse effect', '🌍', 'in stays in', 'Where our heat comes from, and where it is stuck.', 'I can explain the greenhouse effect without the shouting.'),
      ],
    },
  ],
}

// --- Term 2: Geography -------------------------------------------------------

const GEOGRAPHY: SeSubject = {
  id: 'geography',
  name: 'Geography',
  emoji: '🌍',
  term: 'term2',
  tint: ['#60bff5', '#1d4f80'],
  skin: 'onepiece',
  strands: [
    {
      id: 'geo-a',
      title: 'Strand A: Physical Patterns in a Changing World',
      subtopics: [
        t('geo-a-map', 'Reading a physical map', '🗺️', 'latitude · longitude · legend · scale', 'Finding anywhere on Earth with two numbers.', 'I can read a physical map — height, scale and legend.'),
        t('geo-a-land', 'Landforms and plate tectonics', '🏔️', 'plates move ~ as fast as your nails grow', 'Mountains are a collision in slow motion.', 'I can explain what moving plates build and what they wreck.'),
        t('geo-a-climate', 'Climate and climate zones', '🌤️', 'latitude · altitude · water · wind', 'Why two cities at the same latitude feel nothing alike.', 'I can explain why two places at the same latitude are nothing alike.'),
        t('geo-a-hazard', 'Earthquakes, volcanoes, hurricanes', '🌋', 'the Ring of Fire', 'Natural events, and why they happen where they happen.', 'I can explain what causes an earthquake, a volcano and a hurricane.'),
        t('geo-a-where', 'Where people live, and why', '🏙️', 'water · flat land · food · trade', 'Population maps are not random.', 'I can explain why people settled where they did.'),
      ],
    },
    {
      id: 'geo-b',
      title: 'Strand B: Natural Resources around the World: Use and Sustainability',
      subtopics: [
        t('geo-b-what', 'What counts as a resource', '💎', 'oil · fish · sunlight · lithium', 'A rock is only a resource when someone wants it.', 'I can say what turns a thing into a resource.'),
        t('geo-b-renew', 'Renewable vs non-renewable', '♻️', 'wind forever · oil once', 'The difference that decides the next century.', 'I can tell renewable from non-renewable, and the awkward cases.'),
        t('geo-b-cost', 'Extracting resources: the real cost', '⛏️', 'the mine, the town, the river', 'Somebody always pays, and it is rarely the buyer.', 'I can name what getting a resource out of the ground really costs.'),
        t('geo-b-water', 'Water as a resource', '🚱', 'Canada has 20% of the fresh water', 'The thing nobody can substitute.', 'I can explain why fresh water is a resource people argue over.'),
        t('geo-b-sust', 'Sustainability and your own footprint', '👣', 'what you own, where it came from', 'Adding up your own share.', 'I can work out my own footprint and what would actually shrink it.'),
      ],
    },
  ],
}

/**
 * The whole year, in teaching order: Term 1 first, then the subjects that run
 * all year, then Term 2 at the bottom. Reordering this list reorders the app.
 */
export const SE_SUBJECTS: SeSubject[] = [HISTORY, LANGUAGE, MATH, SCIENCE, GEOGRAPHY]

/**
 * Where the year STARTS for him — the seed, not the truth (§24u).
 *
 * This used to be the "📍 you are here" pin itself, set by hand. That was
 * wrong in a way that mattered: he finished the rational-numbers chapter,
 * fixed every miss in it, and the pin was still sitting on it, because a
 * constant cannot know he has moved on. The pin is now worked out from his
 * own record (`seReached`), and this is only the fallback for a subject he
 * has not opened yet.
 */
export const CURRENT_SUBTOPIC = 'math-rational'

// --- Lookups -----------------------------------------------------------------

export interface SeLocation {
  subject: SeSubject
  strand: SeStrand
  subtopic: SeSubTopic
}

const INDEX = new Map<string, SeLocation>()
for (const subject of SE_SUBJECTS) {
  for (const strand of subject.strands) {
    for (const subtopic of strand.subtopics) {
      if (INDEX.has(subtopic.id)) throw new Error(`duplicate St. Eugene subtopic id: ${subtopic.id}`)
      INDEX.set(subtopic.id, { subject, strand, subtopic })
    }
  }
}

export function seFind(subtopicId: string): SeLocation | null {
  return INDEX.get(subtopicId) ?? null
}

// --- Where he is now, not where he has been (§24u) ----------------------------

/**
 * One subtopic, scored on his LATEST answer to each question rather than on
 * every attempt he has ever made.
 *
 * This exists because lifetime accuracy cannot be repaired. He finished the
 * rational-numbers chapter, redid every sealed miss in it until there were
 * none left — and the number on the row was still 67%, because the misses he
 * had just fixed were still in the denominator. That number told Dad the
 * opposite of what had happened, and it is the number that decides what the
 * Report flags and what he gets credit for.
 *
 * So: one answer per question, the most recent one. A question he missed and
 * has since got right counts as right, and `repaired` keeps the honest part of
 * the old number — that it took him two goes.
 */
export interface SeNow {
  /** Distinct questions he has any answer on record for. */
  asked: number
  /** …of those, how many his latest answer gets right. */
  right: number
  /** …of those, how many he had got wrong at some point before that. */
  repaired: number
  /** …and how many his latest answer still gets wrong. */
  broken: number
}

/** Every subtopic he has answered anything in, in one pass over the history. */
export function seNowBySubtopic(history: SeAnswer[]): Record<string, SeNow> {
  // History is oldest-first, so the last write per question id wins.
  const latest = new Map<string, SeAnswer>()
  const everWrong = new Set<string>()
  for (const a of history) {
    latest.set(a.id, a)
    if (!a.right) everWrong.add(a.id)
  }
  const out: Record<string, SeNow> = {}
  for (const [id, a] of latest) {
    const now = (out[a.subtopicId] ??= { asked: 0, right: 0, repaired: 0, broken: 0 })
    now.asked += 1
    if (!a.right) {
      now.broken += 1
      continue
    }
    now.right += 1
    if (everWrong.has(id)) now.repaired += 1
  }
  return out
}

/**
 * The percentage to put on a subtopic.
 *
 * `seNow` where there is history to measure, and the cached lifetime ratio
 * where there is not — the history is capped at `SE_HISTORY_CAP` answers, so a
 * subtopic he worked on early in the year can roll out of it entirely. Falling
 * back is better than showing a topic he has done as untouched.
 */
export function sePct(now: SeNow | undefined, stat: { attempts: number; right: number } | undefined): number | null {
  if (now?.asked) return Math.round((now.right / now.asked) * 100)
  if (stat?.attempts) return Math.round((stat.right / stat.attempts) * 100)
  return null
}

/**
 * The 📍 pin: the furthest subtopic he has reached in each subject, by the
 * year's own teaching order. Subjects he has not opened get no pin.
 *
 * Furthest *reached*, not most *recent*, on purpose. "Mistakes to fix" (§24f)
 * and the warm-up (§24q) both send him back to older work, and a pin that
 * tracked his last answer would walk backwards every time he did either.
 */
export function seReached(stats: Record<string, { attempts: number }>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const subject of SE_SUBJECTS) {
    const all = seSubtopicsOf(subject.id)
    for (let i = all.length - 1; i >= 0; i -= 1) {
      if (stats[all[i].id]?.attempts) {
        out[subject.id] = all[i].id
        break
      }
    }
  }
  return out
}

/** Which subject card the Subjects tab opens on: the one he touched last. */
export function seOpenSubject(stats: Record<string, { attempts: number; lastAt: number }>): string {
  let best: { subjectId: string; at: number } | null = null
  for (const [id, stat] of Object.entries(stats)) {
    if (!stat.attempts || !stat.lastAt) continue
    const where = seFind(id)
    if (!where) continue
    if (!best || stat.lastAt > best.at) best = { subjectId: where.subject.id, at: stat.lastAt }
  }
  return best?.subjectId ?? seFind(CURRENT_SUBTOPIC)?.subject.id ?? 'math'
}

// --- What I can do now (§24r) --------------------------------------------------

/** Four tries, because one lucky guess is not a skill. */
export const SE_CAN_MIN_ATTEMPTS = 4
/** And three in four right, because the claim has to be true. */
export const SE_CAN_MIN_RATE = 0.75

export interface SeCanDone {
  subtopicId: string
  /** The first-person line. */
  can: string
  emoji: string
  subject: string
  /** When he last worked on it — what the list is ordered by. */
  at: number
}

/**
 * Everything he can now do, newest first (§24r).
 *
 * The app pays nothing on purpose (§24), so the only reward it has to give
 * is the fact that he gets it — and until this list existed, that fact was
 * nowhere on screen. The ⛵ shows progress through ONE lesson and resets; the
 * Report is percentages, which is Dad's language, not his. This is the year
 * accumulating, in sentences he would say out loud.
 *
 * Deliberately not a percentage and not a tick-list of everything left to do.
 * A list of what is missing is a list of failures; this one only ever grows.
 */
export function seCanDo(
  stats: Record<string, { attempts: number; right: number; lastAt: number }>,
  history: SeAnswer[] = [],
): SeCanDone[] {
  // Measured on where he is NOW (§24u), not on every attempt he ever made —
  // otherwise repairing a chapter can never earn the line, which is backwards:
  // getting it right on the second go is exactly what learning it looks like.
  const nowBy = seNowBySubtopic(history)
  const out: SeCanDone[] = []
  for (const [id, stat] of Object.entries(stats)) {
    const now = nowBy[id]
    const asked = now?.asked ?? stat.attempts
    const right = now?.asked ? now.right : stat.right
    if (asked < SE_CAN_MIN_ATTEMPTS) continue
    if (right / asked < SE_CAN_MIN_RATE) continue
    const where = seFind(id)
    if (!where) continue
    out.push({
      subtopicId: id,
      can: where.subtopic.can,
      emoji: where.subtopic.emoji,
      subject: where.subject.name,
      at: stat.lastAt,
    })
  }
  return out.sort((a, b) => b.at - a.at)
}

export function seSubjectById(id: string): SeSubject | null {
  return SE_SUBJECTS.find((s) => s.id === id) ?? null
}

/** Every subtopic in the year, flat, still in teaching order. */
export function seAllSubtopics(): SeLocation[] {
  return [...INDEX.values()]
}

/** The subtopics of one subject, flat — what the Finder slides through. */
export function seSubtopicsOf(subjectId: string): SeSubTopic[] {
  const subject = seSubjectById(subjectId)
  return subject ? subject.strands.flatMap((s) => s.subtopics) : []
}

/** The one after this one, within the same subject. `null` at the end. */
export function seNext(subtopicId: string): SeSubTopic | null {
  const here = seFind(subtopicId)
  if (!here) return null
  const all = seSubtopicsOf(here.subject.id)
  const i = all.findIndex((s) => s.id === subtopicId)
  return i >= 0 && i + 1 < all.length ? all[i + 1] : null
}
