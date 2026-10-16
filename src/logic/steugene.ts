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

const t = (id: string, title: string, emoji: string, sample: string, plain: string): SeSubTopic => ({
  id,
  title,
  emoji,
  sample,
  plain,
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
        t('hist-a-1713', 'Who was already here in 1713', '🗺️', 'Haudenosaunee · Anishinaabe · Wendat · French · British', 'The people living here before the map had borders on it.'),
        t('hist-a-fur', 'The fur trade and the alliances it bought', '🦫', 'beaver pelt → musket, kettle, cloth', 'Trade was not shopping. It was how sides were chosen.'),
        t('hist-a-war', 'The fall of New France, 1754–1763', '🏴', '1759 — the Plains of Abraham', 'Seven years of war, and who ended up holding Quebec.'),
        t('hist-a-1763', 'The Royal Proclamation of 1763', '📜', '1763 — a line drawn down the map', 'Britain promises land to First Nations, and the settlers ignore it.'),
        t('hist-a-quebec', 'The Quebec Act, 1774', '⛪', 'French law + Catholic faith, kept', 'Britain lets Quebec stay Quebec — and the Thirteen Colonies rage.'),
        t('hist-a-loyal', 'The Loyalists arrive', '⛵', '1783 — ~50,000 people move north', 'People who picked the losing side of a revolution, and where they landed.'),
        t('hist-a-1791', 'The Constitutional Act, 1791', '✂️', 'Upper Canada · Lower Canada', 'One colony cut into two so each could keep its own language.'),
        t('hist-a-slave', 'Slavery and freedom in early Canada', '⛓️', '1793 — Upper Canada limits slavery', 'The part of the story the old textbooks skipped.'),
      ],
    },
    {
      id: 'hist-b',
      title: 'Strand B: Canada, 1800–1850: Conflict and Challenges',
      subtopics: [
        t('hist-b-life', 'Life in Upper and Lower Canada', '🏚️', 'a log house, a stump field, no doctor', 'What an ordinary day cost when nothing was built yet.'),
        t('hist-b-1812', 'The War of 1812', '💥', '1813 — York burns', 'The war that decided Canada would not be American.'),
        t('hist-b-immig', 'Immigration, 1815–1850', '🚢', 'the Irish famine ships', 'Who came, why they left, and what met them at the dock.'),
        t('hist-b-reb', 'The Rebellions of 1837–38', '🔥', 'Mackenzie · Papineau', 'Two uprisings, both crushed, both the reason things changed.'),
        t('hist-b-durham', "Lord Durham's Report", '📝', '1839 — "two nations warring"', 'A British lord looks at the mess and writes what to do about it.'),
        t('hist-b-union', 'The Act of Union, 1840', '🔗', 'Upper + Lower = the Province of Canada', 'The two halves glued back together, against one half’s will.'),
        t('hist-b-resp', 'Responsible government, 1848', '🗳️', '1848 — the governor stops deciding', 'The year the people who were elected finally ran things.'),
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
        t('lang-a-real', 'Reading the real world', '🔍', 'an ad, a post, a thing an AI wrote', 'Spotting what a text is actually trying to do to you.'),
        t('lang-a-talk', 'Talking about what you read', '💬', '"I think X, because the text says Y"', 'Having an opinion and being able to prove it from the page.'),
        t('lang-a-make', 'Making something out of what you learned', '🛠️', 'poster · script · explainer', 'Turning reading into a thing other people can use.'),
      ],
    },
    {
      id: 'lang-b',
      title: 'Foundations of Language',
      subtopics: [
        t('lang-b-spell', 'Spelling patterns and syllables', '🔤', 'be·cause · re·ceive · ne·ces·sary', 'Why English spells things the way it does, mostly.'),
        t('lang-b-vocab', 'Prefixes, suffixes and roots', '🧩', 'un + break + able', 'Taking a long word apart to find a word you already know.'),
        t('lang-b-sent', 'Sentences: subject, predicate, clauses', '🧱', 'The crew | sailed at dawn.', 'What makes a sentence a sentence and not a fragment.'),
        t('lang-b-punct', 'Punctuation and capitals', '❗', "Let's eat, Zoro. / Let's eat Zoro.", 'The commas that decide whether somebody gets eaten.'),
        t('lang-b-parts', 'Parts of speech', '🏷️', 'noun · verb · adjective · adverb', 'Naming the jobs the words in a sentence are doing.'),
      ],
    },
    {
      id: 'lang-c',
      title: 'Comprehension: Understanding and Responding to Texts',
      subtopics: [
        t('lang-c-main', 'Main idea and supporting details', '🎯', 'the one sentence the rest is about', 'Finding the point, and the three things holding it up.'),
        t('lang-c-infer', 'Inference — what the text does NOT say', '🕵️', '"He left his plate full." → ?', 'Reading what the writer made you work out yourself.'),
        t('lang-c-bias', 'Point of view and bias', '⚖️', 'who is telling it, and what they want', 'Two people describe the same fight. Both are "true".'),
        t('lang-c-feat', 'Text features and structure', '🗂️', 'heading · caption · sidebar · bold', 'Reading the shape of a page before the words.'),
        t('lang-c-two', 'Comparing two texts', '🔀', 'same event, two writers', 'Putting two accounts side by side and finding the gap.'),
      ],
    },
    {
      id: 'lang-d',
      title: 'Composition: Expressing Ideas and Creating Texts',
      subtopics: [
        t('lang-d-plan', 'Planning a piece of writing', '🗒️', 'idea → 3 points → order', 'The five minutes that save the next forty.'),
        t('lang-d-para', 'Paragraphs that hold together', '🧱', 'point · evidence · explain', 'One idea per paragraph, and how to prove it.'),
        t('lang-d-narr', 'Narrative writing', '📚', 'hook · problem · turn · end', 'Telling a story that someone wants to finish.'),
        t('lang-d-op', 'Opinion and persuasive writing', '📣', 'claim + reason + proof', 'Arguing on paper without shouting.'),
        t('lang-d-edit', 'Revising and editing', '✏️', 'cut 10% and it gets better', 'The draft is not the piece.'),
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
        t('math-rational', 'Rational numbers', '➗', '−3 · ½ · 0.75 · 0 — all on one line', 'Every number you can write as a fraction. Yes, including the negative ones.'),
        t('math-compare', 'Comparing and ordering', '📏', '−2.5 < −2 < −¾ < 0.3', 'Which one is bigger, when the minus signs start lying to you.'),
        t('math-abs', 'Absolute value and opposites', '🪞', '|−20| = 20', 'How far from zero, never mind which side.'),
        t('math-int-add', 'Adding and subtracting integers', '➕', '−7 + 12 = 5', 'Minus a minus, and why it turns into a plus.'),
        t('math-int-mult', 'Multiplying and dividing integers', '✖️', '(−4) × (−6) = 24', 'Two negatives, one positive. The rule and the reason.'),
        t('math-fdp', 'Fractions, decimals and percents', '🔁', '¾ = 0.75 = 75%', 'The same number wearing three different shirts.'),
        t('math-frac-add', 'Adding and subtracting fractions', '🍕', '⅔ + ¼ = 11/12', 'Common denominators, and why you need them.'),
        t('math-frac-mult', 'Multiplying and dividing fractions', '🍰', '⅗ ÷ ¼ = 12/5', 'Flip the second one. Here is why that works.'),
        t('math-percent', 'Percents in real life', '🏷️', '$80 shirt, 25% off, +13% HST', 'Sales, tax and tips — the maths you will actually use.'),
        t('math-ratio', 'Ratios, rates and proportions', '⚖️', '3 : 5 · 90 km/h · $4.50 / kg', 'Comparing two things fairly, and scaling them up.'),
        t('math-power', 'Powers and square roots', '🔺', '7² = 49 · √144 = 12', 'Exponents, and the button that undoes them.'),
        t('math-round', 'Rounding and estimating', '🎯', '1 043 221 → 1.0 million', 'Getting close on purpose, and knowing how close.'),
      ],
    },
    {
      id: 'math-pattern',
      title: 'Patterning and Algebra',
      subtopics: [
        t('math-pat', 'Patterns and pattern rules', '🔢', '4, 7, 10, 13, … → 3n + 1', 'Finding the rule, then jumping straight to term 100.'),
        t('math-var', 'Variables and expressions', '🅰️', '3n + 1 when n = 7', 'A letter is just a box waiting for a number.'),
        t('math-eq1', 'Solving one-step equations', '⚖️', 'x + 9 = 14', 'Do the same thing to both sides. Always.'),
        t('math-eq2', 'Solving two-step equations', '⚖️', '2x − 5 = 11', 'Undo in the opposite order you would do it.'),
        t('math-graph', 'Graphing linear relations', '📈', 'y = 2x + 1', 'A rule, a table, and the straight line they make.'),
      ],
    },
    {
      id: 'math-measure',
      title: 'Measurement',
      subtopics: [
        t('math-area', 'Perimeter and area', '🟦', 'A = b × h', 'Around the edge, and inside the shape.'),
        t('math-circle', 'Circles: radius, diameter, circumference', '⭕', 'C = π × d', 'Why every circle hides the same number.'),
        t('math-circle-area', 'Area of a circle', '🥧', 'A = π r²', 'Squaring the radius, not doubling it.'),
        t('math-surface', 'Surface area of prisms', '📦', 'unfold the box, add the faces', 'Wrapping paper, basically.'),
        t('math-volume', 'Volume of prisms and cylinders', '🧊', 'V = base area × height', 'How much fits inside.'),
        t('math-units', 'Units and conversions', '📐', '2.4 m = 240 cm = 2400 mm', 'Sliding the decimal point on purpose.'),
      ],
    },
    {
      id: 'math-data',
      title: 'Data Management',
      subtopics: [
        t('math-collect', 'Collecting data and sampling', '📋', 'who did you ask, and was that fair?', 'A survey can be wrong before it starts.'),
        t('math-avg', 'Mean, median, mode and range', '📊', '2, 3, 3, 9 → mean 4.25, median 3', 'Four different answers to "what is typical".'),
        t('math-graphs', 'Reading and drawing graphs', '📉', 'bar · line · circle · scatter', 'Picking the graph that tells the truth.'),
        t('math-prob', 'Probability', '🎲', 'P(six) = 1/6', 'What "likely" means in numbers.'),
      ],
    },
    {
      id: 'math-geo',
      title: 'Geometry and Spatial Sense',
      subtopics: [
        t('math-angles', 'Angles and angle relationships', '📐', 'supplementary: 180° − 115° = 65°', 'Angles that always add to the same thing.'),
        t('math-shapes', 'Triangles and quadrilaterals', '🔺', 'angles of a triangle = 180°', 'Sorting shapes by what is true about them.'),
        t('math-congr', 'Congruence and similarity', '🪞', 'same shape · same size?', 'Identical twins versus scaled-up twins.'),
        t('math-trans', 'Transformations', '🔄', 'slide · flip · turn · resize', 'Moving a shape without changing what it is.'),
        t('math-cart', 'The Cartesian plane', '📍', '(−3, 4)', 'Four quadrants, and getting to the right one.'),
      ],
    },
    {
      id: 'math-coding',
      title: 'Coding',
      subtopics: [
        t('code-seq', 'Sequence, input and output', '▶️', 'step 1 → step 2 → step 3', 'A computer does exactly what you said, in order.'),
        t('code-loop', 'Loops', '🔁', 'repeat 4 [ forward 100, right 90 ]', 'Saying a thing once and having it happen ten times.'),
        t('code-if', 'Conditionals', '🔀', 'if score > 10 then …', 'Teaching the program to choose.'),
        t('code-var', 'Variables in code', '📦', 'score = score + 1', 'A box with a name on it.'),
        t('code-debug', 'Debugging and efficiency', '🐛', 'why does it run 11 times?', 'Finding the one wrong line.'),
      ],
    },
    {
      id: 'math-fin',
      title: 'Financial Literacy',
      subtopics: [
        t('fin-budget', 'Budgets and spending plans', '🧾', 'in $60 · out $47 · left $13', 'Where the money went, written down before it goes.'),
        t('fin-interest', 'Interest: simple and compound', '📈', '$100 at 5% for 3 years', 'Money that grows while you do nothing.'),
        t('fin-unit', 'Unit price and best buy', '🛒', '$4.50 / 900 g vs $2.80 / 500 g', 'Which box is actually cheaper.'),
        t('fin-tax', 'Taxes, tips and discounts', '💸', '13% HST on everything', 'Why the till always asks for more than the sticker.'),
        t('fin-credit', 'Saving, borrowing and credit', '💳', 'minimum payment = a long time', 'Borrowing is renting money.'),
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
        t('sci-eco', 'Ecosystems: who needs whom', '🌳', 'producer → consumer → decomposer', 'Nothing in nature lives alone.'),
        t('sci-web', 'Food chains and food webs', '🕸️', 'remove the wolves → ?', 'Pull one thread and watch the whole thing move.'),
        t('sci-cycles', 'Water, carbon and nitrogen cycles', '💧', 'the same water, forever', 'Matter goes around. It never leaves.'),
        t('sci-impact', 'Human impact and invasive species', '🚯', 'zebra mussels in the Great Lakes', 'What happens when something arrives that does not belong.'),
        t('sci-succ', 'Succession and biodiversity', '🌱', 'bare rock → moss → forest', 'How an empty place fills back up.'),
      ],
    },
    {
      id: 'sci-matter',
      title: 'Matter and Energy — Pure Substances and Mixtures',
      subtopics: [
        t('sci-pure', 'Pure substances and mixtures', '⚗️', 'salt vs salt water', 'One thing, or several things pretending to be one.'),
        t('sci-sol', 'Solutions and solubility', '🧂', 'how much sugar before it stops dissolving?', 'Saturated, and why heat changes it.'),
        t('sci-sep', 'Separating mixtures', '🧫', 'filter · evaporate · distil · magnet', 'Getting it back apart again.'),
        t('sci-particle', 'The particle theory of matter', '🔵', 'solid · liquid · gas', 'Five rules that explain almost everything.'),
        t('sci-water', 'Water quality and treatment', '🚰', 'from the lake to your tap', 'What happens to Lake Ontario before you drink it.'),
      ],
    },
    {
      id: 'sci-struct',
      title: 'Structures and Mechanisms — Form and Function',
      subtopics: [
        t('sci-forms', 'Solid, frame and shell structures', '🏗️', 'dam · tower · eggshell', 'Three ways to hold something up.'),
        t('sci-forces', 'Forces on structures', '🧲', 'compression · tension · shear · torsion', 'The four ways a thing gets pushed apart.'),
        t('sci-gravity', 'Centre of gravity and stability', '⚖️', 'why a wide base does not fall over', 'Where the weight sits decides whether it tips.'),
        t('sci-fail', 'Designing so it fails safely', '🧯', 'the part that is MEANT to break', 'Good design plans for the bad day.'),
        t('sci-mech', 'Mechanisms and mechanical advantage', '⚙️', 'lever · pulley · gear', 'Trading distance for force.'),
      ],
    },
    {
      id: 'sci-earth',
      title: 'Earth and Space Systems — Heat in the Environment',
      subtopics: [
        t('sci-heat', 'Heat and temperature are not the same', '🌡️', 'a spark vs a bathtub', 'One is energy, the other is how hot it feels.'),
        t('sci-expand', 'Heat and the particle theory', '🔥', 'things get bigger when they get hot', 'Why bridges have gaps in them.'),
        t('sci-transfer', 'Conduction, convection, radiation', '♨️', 'spoon · boiling water · the sun', 'The three ways heat travels.'),
        t('sci-climate', 'Heat in the atmosphere and oceans', '🌊', 'why the lake keeps Toronto warmer', 'Water holds heat. A lot of it.'),
        t('sci-energy', 'Energy sources and the greenhouse effect', '🌍', 'in stays in', 'Where our heat comes from, and where it is stuck.'),
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
        t('geo-a-map', 'Reading a physical map', '🗺️', 'latitude · longitude · legend · scale', 'Finding anywhere on Earth with two numbers.'),
        t('geo-a-land', 'Landforms and plate tectonics', '🏔️', 'plates move ~ as fast as your nails grow', 'Mountains are a collision in slow motion.'),
        t('geo-a-climate', 'Climate and climate zones', '🌤️', 'latitude · altitude · water · wind', 'Why two cities at the same latitude feel nothing alike.'),
        t('geo-a-hazard', 'Earthquakes, volcanoes, hurricanes', '🌋', 'the Ring of Fire', 'Natural events, and why they happen where they happen.'),
        t('geo-a-where', 'Where people live, and why', '🏙️', 'water · flat land · food · trade', 'Population maps are not random.'),
      ],
    },
    {
      id: 'geo-b',
      title: 'Strand B: Natural Resources around the World: Use and Sustainability',
      subtopics: [
        t('geo-b-what', 'What counts as a resource', '💎', 'oil · fish · sunlight · lithium', 'A rock is only a resource when someone wants it.'),
        t('geo-b-renew', 'Renewable vs non-renewable', '♻️', 'wind forever · oil once', 'The difference that decides the next century.'),
        t('geo-b-cost', 'Extracting resources: the real cost', '⛏️', 'the mine, the town, the river', 'Somebody always pays, and it is rarely the buyer.'),
        t('geo-b-water', 'Water as a resource', '🚱', 'Canada has 20% of the fresh water', 'The thing nobody can substitute.'),
        t('geo-b-sust', 'Sustainability and your own footprint', '👣', 'what you own, where it came from', 'Adding up your own share.'),
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
 * Where the class actually is, today. Updated by hand as the year moves — it
 * only ever decides which card the Subjects tab opens on and which one wears
 * the "📍 you are here" pin, so being a week stale costs nothing.
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
