// Grand Line Academy — quiz rules. Keep in sync with BUSINESS_REQUIREMENTS.md §14–15.
import type { AppData, QuizQuestion, QuizQuestionType, QuizState, QuizStat, QuizTestRecord } from '../types'
import { addDays, dayKey, daysUntil } from './dates'
import { SE_SUBJECTS } from './steugene'

// --- topics ----------------------------------------------------------------

export interface QuizTopic {
  id: string
  owner: 'ben' | 'diogo' // whose academy this topic belongs to (KID_ID / PARENT_ID)
  title: string
  emoji: string
  description: string
  targetCount: number // how many active questions the bank should hold
  comingSoon?: boolean // registered but no questions generated yet
  /**
   * Curriculum ladder: this topic stays locked until `unlockAfter` is PASSED
   * officially. Topics without it are entry points and unlock themselves.
   */
  unlockAfter?: string
  track?: string // groups topics into a section on the Academy screen
  level?: number // position in the ladder, shown as "LEVEL n"
  /** One-line promise of what you can do once this level is conquered. */
  outcome?: string
  /**
   * §14b — a SCHOOL QUIZ: something he was actually set in class, not part of
   * the academy's own ladder. Berries and nothing else. No Devil Fruit, no
   * official final test, never the prize another topic's pass hands out, and
   * no daily must-do — a unit of schoolwork is over when the unit is over, and
   * a habit that outlives it is just noise.
   */
  school?: boolean
  /** How many options a choice question shows here. Defaults to CHOICE_OPTIONS_SHOWN. */
  optionCount?: number
  /** Where the material came from, printed on the card ("All Summer in a Day"). */
  source?: string
  /**
   * The St. Eugene 7 strands (§24a) this topic quizzes. The card offers each of
   * their lessons — the quiz checks, St. Eugene teaches — and the questions
   * point at one subtopic each (`QuizQuestion.seSubtopic`).
   */
  seStrands?: string[]
  /**
   * §14d — a CHAPTER QUIZ: one St. Eugene 7 subtopic, studied on the 📚
   * Subjects tab (`/academy/subjects`) and named by its subtopic id. Berries
   * only, like a school quiz: no Devil Fruit, no final test, no daily must-do,
   * never the prize for passing something else. There are sixty-odd of them,
   * and the economy and the one-task-a-day rule were sized for a handful.
   */
  chapter?: string
  /**
   * §14f — this topic has a FIRST GOAL: the questions marked `firstGoal`. Until
   * he knows them, training asks nothing else. `everyInTest` makes the final
   * test ask every one of them, one by one, before the usual test begins.
   */
  firstGoal?: { one: string; many: string; everyInTest?: boolean }
}

/** §14b + §14d — Berries and nothing else: no final test, no 🍇, no must-do, never a prize. */
export function berriesOnly(t: QuizTopic): boolean {
  return !!t.school || !!t.chapter
}

/** Sections on the Academy screen, in display order. */
export const QUIZ_TRACKS: { id: string; title: string; blurb: string }[] = [
  {
    id: 'agent-path',
    title: '🛠️ The Agent Engineer Path',
    blurb: 'Six levels, vendor-neutral. Pass a level’s final test to unlock the next one.',
  },
  { id: 'tooling', title: '🧰 Tooling & day job', blurb: 'The specific tools you actually type into.' },
  {
    id: 'grade7',
    title: '🏫 Grade 7 — St. Eugene',
    blurb: 'Your real school year. Learn it in St. Eugene 7, prove it here. One opens at a time.',
  },
  {
    id: 'school',
    title: '🏫 School quiz',
    blurb: 'Real homework, pirate paint. Berries only — no Devil Fruits, no final test.',
  },
]

/** §14f — the Where Is This? quizzes live on their own tab (/academy/maps). */
export const MAPS_TRACK = 'maps'

/** §14f — these map topics keep their questions in `app/quizBankWorld` (`src/store/cloud.ts`). */
export const WORLD_PREFIX = 'world-'

/** §14d — chapter quiz ids are the subtopic's, prefixed. Also how the bank shards them (`src/store/cloud.ts`). */
export const CHAPTER_PREFIX = 'se7-'

/** The subjects that get chapter quizzes, in the year's order. Maths stays in St. Eugene (§14). */
export const CHAPTER_SUBJECTS = SE_SUBJECTS.filter((s) => s.id !== 'math')

/**
 * §14d — one quiz per St. Eugene subtopic, generated from the year's map so
 * the Subjects tab can never disagree with it about names or order.
 */
const CHAPTER_TOPICS: QuizTopic[] = CHAPTER_SUBJECTS.flatMap((subject) =>
  subject.strands.flatMap((strand) =>
    strand.subtopics.map(
      (sub): QuizTopic => ({
        id: CHAPTER_PREFIX + sub.id,
        owner: 'ben',
        title: sub.title,
        emoji: sub.emoji,
        description: sub.plain,
        targetCount: 15,
        optionCount: 3, // the St. Eugene rule (§24f): three options, one right
        chapter: sub.id,
      }),
    ),
  ),
)

export const QUIZ_TOPICS: QuizTopic[] = [
  // --- Ben (grade 6, born Feb 2014) ---
  {
    id: 'canada-geography',
    owner: 'ben',
    title: 'Canada Geography',
    emoji: '🍁',
    description: 'Provinces, capitals, languages, flags and famous places of Canada.',
    targetCount: 50,
  },
  {
    id: 'canada-geography-2',
    owner: 'ben',
    title: 'Canada Geography II',
    emoji: '🏔️',
    description: 'Book two: mountains, rivers, lakes, regions and where Canadians actually live.',
    targetCount: 50,
    comingSoon: true,
  },
  {
    id: 'canada-history',
    owner: 'ben',
    title: 'Canada History',
    emoji: '📜',
    description: 'First Peoples, explorers, the fur trade, Confederation, the railway and the wars.',
    targetCount: 50,
  },
  // §14 — how the country he lives in is actually run. Deliberately almost
  // name-free: only the Prime Minister, the Premier of Ontario and the Mayor of
  // Toronto are named, because the rest of the bank has to survive an election.
  {
    id: 'canada-politics',
    owner: 'ben',
    title: 'Canada Politics',
    emoji: '🏛️',
    description: 'Three levels, one country: what Ottawa, Queen’s Park and City Hall each decide — and who you elect.',
    targetCount: 64,
  },
  {
    id: 'ontario-geography',
    owner: 'ben',
    title: 'Ontario Geography',
    emoji: '🌲',
    description: 'The Great Lakes, the Shield, cottage country and the cities outside Toronto.',
    targetCount: 50,
    comingSoon: true,
  },
  {
    id: 'toronto-geography',
    owner: 'ben',
    title: 'Toronto Geography',
    emoji: '🏙️',
    description: 'Home turf: the lake, the six, the streets, the TTC and the landmarks.',
    targetCount: 50,
    comingSoon: true,
  },
  {
    id: 'science-6',
    owner: 'ben',
    title: 'Science',
    emoji: '🔬',
    description: 'Grade 6 science: space, electricity, flight, biodiversity.',
    targetCount: 50,
  },
  {
    id: 'critical-thinking-6',
    owner: 'ben',
    title: 'Critical Thinking',
    emoji: '🧠',
    description: 'Spot scams, fake news and tricky ads. Think like a detective.',
    targetCount: 50,
  },
  {
    id: 'logic-6',
    owner: 'ben',
    title: 'Logic',
    emoji: '🧩',
    description: 'Riddles, patterns and puzzles. No math calculations, promise.',
    targetCount: 50,
  },
  // --- Ben: grade 7, the St. Eugene year (§14, §24) ---
  // A ladder, one rung at a time: each opens when the one before is passed, so
  // he has one quiz must-do on the checklist, not five. The order follows his
  // school year: History is term 1, Science runs all year, Geography is term 2.
  // The St. Eugene 7 app teaches every question here (`seStrands`, `seSubtopic`).
  {
    id: 'g7-hist-a',
    owner: 'ben',
    title: 'New France & British North America',
    emoji: '🏴',
    description: 'Grade 7 History, 1713–1800: the fur trade, the fall of New France, 1763, the Loyalists, 1791.',
    targetCount: 40,
    track: 'grade7',
    unlockAfter: 'canada-history',
    seStrands: ['hist-a'],
  },
  {
    id: 'g7-hist-b',
    owner: 'ben',
    title: 'Canada 1800–1850',
    emoji: '💥',
    description: 'Grade 7 History: settler life, 1812, the famine ships, 1837, Durham, the Union and 1848.',
    targetCount: 35,
    track: 'grade7',
    unlockAfter: 'g7-hist-a',
    seStrands: ['hist-b'],
  },
  {
    id: 'g7-sci-a',
    owner: 'ben',
    title: 'Ecosystems & Mixtures',
    emoji: '🔬',
    description: 'Grade 7 Science: food webs, cycles, invaders, succession — then mixtures, solutions and clean water.',
    targetCount: 40,
    track: 'grade7',
    unlockAfter: 'g7-hist-b',
    seStrands: ['sci-life', 'sci-matter'],
  },
  {
    id: 'g7-sci-b',
    owner: 'ben',
    title: 'Structures & Heat',
    emoji: '🏗️',
    description: 'Grade 7 Science: forces, stability and machines — then heat, its travel and the greenhouse effect.',
    targetCount: 40,
    track: 'grade7',
    unlockAfter: 'g7-sci-a',
    seStrands: ['sci-struct', 'sci-earth'],
  },
  {
    id: 'g7-geo',
    owner: 'ben',
    title: 'Physical Patterns & Resources',
    emoji: '🌍',
    description: 'Grade 7 Geography: maps, plates, climate and hazards — then resources, water and your footprint.',
    targetCount: 40,
    track: 'grade7',
    unlockAfter: 'g7-sci-b',
    seStrands: ['geo-a', 'geo-b'],
  },
  // --- Diogo: the Agent Engineer path (vendor-neutral, six levels) ---
  // Deliberately free of provider names: model APIs churn every few months, the
  // ideas underneath them don't. Every level assumes a frontend/React brain.
  {
    id: 'agents-1-foundations',
    owner: 'diogo',
    title: 'L1 · What a model actually is',
    emoji: '🧱',
    description: 'Next-token prediction, tokens, context windows, temperature, embeddings, statelessness.',
    outcome: 'You can explain, precisely, why an LLM does the weird things it does.',
    track: 'agent-path',
    level: 1,
    targetCount: 40,
  },
  {
    id: 'agents-2-prompting',
    owner: 'diogo',
    title: 'L2 · Talking to models on purpose',
    emoji: '🎯',
    description: 'System vs user roles, few-shot, chain of thought, structured JSON output, schemas, first evals.',
    outcome: 'You can get reliable, machine-parseable output instead of vibes.',
    track: 'agent-path',
    level: 2,
    unlockAfter: 'agents-1-foundations',
    targetCount: 40,
  },
  {
    id: 'agents-3-tools',
    owner: 'diogo',
    title: 'L3 · Tools & the agent loop',
    emoji: '🔧',
    description: 'Function calling, the think→act→observe loop, tool schemas, errors, parallel calls, ReAct.',
    outcome: 'You can build a real agent from scratch on any provider.',
    track: 'agent-path',
    level: 3,
    unlockAfter: 'agents-2-prompting',
    targetCount: 40,
  },
  {
    id: 'agents-4-context',
    owner: 'diogo',
    title: 'L4 · Context engineering & memory',
    emoji: '🧠',
    description: 'RAG, chunking, vector vs keyword search, reranking, compaction, context rot, agent memory.',
    outcome: 'You can feed an agent the right 5% of your data instead of all of it.',
    track: 'agent-path',
    level: 4,
    unlockAfter: 'agents-3-tools',
    targetCount: 40,
  },
  {
    id: 'agents-5-architecture',
    owner: 'diogo',
    title: 'L5 · Agent architectures',
    emoji: '🏗️',
    description: 'Workflows vs agents, routing, chaining, orchestrator–worker, evaluator loops, human-in-the-loop.',
    outcome: 'You can pick the simplest architecture that solves the problem — and defend it.',
    track: 'agent-path',
    level: 5,
    unlockAfter: 'agents-4-context',
    targetCount: 40,
  },
  {
    id: 'agents-6-production',
    owner: 'diogo',
    title: 'L6 · Shipping agents for real',
    emoji: '🚢',
    description: 'Evals, tracing, cost & latency, caching, prompt injection, sandboxing, permissions, rollout.',
    outcome: 'You can put an agent in front of real users without it becoming an incident.',
    track: 'agent-path',
    level: 6,
    unlockAfter: 'agents-5-architecture',
    targetCount: 40,
  },
  // --- Diogo: the specific tools (these DO churn — retrain as they change) ---
  {
    id: 'ai-software-dev',
    owner: 'diogo',
    title: 'AI in Software Dev',
    emoji: '🤖',
    description: 'Tokens, context, prompting, agents, orchestration, MCP — the practical craft.',
    track: 'tooling',
    targetCount: 50,
  },
  {
    id: 'copilot-ai',
    owner: 'diogo',
    title: 'GitHub Copilot',
    emoji: '🧑‍✈️',
    description: 'Chat participants, slash commands, custom instructions, agent mode, Copilot at work.',
    track: 'tooling',
    targetCount: 50,
  },
  {
    id: 'claude-code-ai',
    owner: 'diogo',
    title: 'Claude Code',
    emoji: '🟠',
    description: 'CLAUDE.md, plan mode, subagents, hooks, MCP, headless -p, token-efficient workflows.',
    track: 'tooling',
    targetCount: 50,
  },
  // --- Ben: Where Is This? (§14f) — tap the map, on the 🗺️ Maps tab ---
  // A ladder like Grade 7: four quizzes must not be four daily must-dos.
  {
    id: 'where-canada',
    owner: 'ben',
    title: 'Where Is This? Canada',
    emoji: '🍁',
    description: 'A map with no names. Find every province first — then capitals, coasts, rivers and famous places.',
    targetCount: 59,
    track: MAPS_TRACK,
    firstGoal: { one: 'province', many: 'provinces', everyInTest: true },
  },
  {
    id: WORLD_PREFIX + 'physical',
    owner: 'ben',
    title: 'Where Is This? Physical World',
    emoji: '🌐',
    description: 'Continents and oceans first — then the great rivers, mountain ranges and deserts.',
    targetCount: 58,
    track: MAPS_TRACK,
    unlockAfter: 'where-canada',
    firstGoal: { one: 'place', many: 'continents and oceans' },
  },
  {
    id: 'where-gta',
    owner: 'ben',
    title: 'Where Is This? Toronto & GTA',
    emoji: '🏙️',
    description: 'Home turf: the six areas and two rivers first — then the cities around Toronto and the 401, 404, 407 and 427.',
    targetCount: 57,
    track: MAPS_TRACK,
    unlockAfter: WORLD_PREFIX + 'physical',
    firstGoal: { one: 'place', many: 'places' },
  },
  {
    id: WORLD_PREFIX + 'ttc',
    owner: 'ben',
    title: 'Where Is This? TTC',
    emoji: '🚇',
    description: 'The five lines first — then the key stations, and where to change to get around on your own.',
    targetCount: 43,
    track: MAPS_TRACK,
    unlockAfter: 'where-gta',
    firstGoal: { one: 'line', many: 'lines' },
  },
  {
    id: WORLD_PREFIX + 'canada-history',
    owner: 'ben',
    title: 'Where Did It Happen? Canada',
    emoji: '📜',
    description: 'History on the map: tap the province where it happened.',
    targetCount: 36,
    track: MAPS_TRACK,
    unlockAfter: WORLD_PREFIX + 'ttc',
  },
  {
    id: 'where-usa',
    owner: 'ben',
    title: 'Where Is This? USA',
    emoji: '🗽',
    description: 'All 50 states on the map first — then every state capital.',
    targetCount: 150,
    track: MAPS_TRACK,
    unlockAfter: WORLD_PREFIX + 'canada-history',
    firstGoal: { one: 'state', many: 'states' },
  },
  {
    id: 'where-europe',
    owner: 'ben',
    title: 'Where Is This? Europe',
    emoji: '🏰',
    description: 'Every country on the map first — then every capital.',
    targetCount: 123,
    track: MAPS_TRACK,
    unlockAfter: 'where-usa',
    firstGoal: { one: 'country', many: 'countries' },
  },
  {
    id: WORLD_PREFIX + 'south-america',
    owner: 'ben',
    title: 'Where Is This? South America',
    emoji: '🌎',
    description: 'Every country on the map first — then every capital.',
    targetCount: 36,
    track: MAPS_TRACK,
    unlockAfter: 'where-europe',
    firstGoal: { one: 'country', many: 'countries' },
  },
  {
    id: WORLD_PREFIX + 'africa',
    owner: 'ben',
    title: 'Where Is This? Africa',
    emoji: '🌍',
    description: 'Every country on the map first — then every capital.',
    targetCount: 147,
    track: MAPS_TRACK,
    unlockAfter: WORLD_PREFIX + 'south-america',
    firstGoal: { one: 'country', many: 'countries' },
  },
  {
    id: WORLD_PREFIX + 'asia-oceania',
    owner: 'ben',
    title: 'Where Is This? Asia & Oceania',
    emoji: '🌏',
    description: 'Every country on the map first — then every capital.',
    targetCount: 161,
    track: MAPS_TRACK,
    unlockAfter: WORLD_PREFIX + 'africa',
    firstGoal: { one: 'country', many: 'countries' },
  },
  {
    id: WORLD_PREFIX + 'flags',
    owner: 'ben',
    title: 'Whose Flag Is This?',
    emoji: '🚩',
    description: 'A flag and a map: tap the country it belongs to.',
    targetCount: 59,
    track: MAPS_TRACK,
    unlockAfter: WORLD_PREFIX + 'asia-oceania',
  },
  {
    id: WORLD_PREFIX + 'body',
    owner: 'ben',
    title: 'Where Is This? Human Body',
    emoji: '🫀',
    description: 'The organs first — then what each one does, and the big bones.',
    targetCount: 34,
    track: MAPS_TRACK,
    unlockAfter: WORLD_PREFIX + 'flags',
    firstGoal: { one: 'organ', many: 'organs' },
  },
  ...CHAPTER_TOPICS,
]

export function topicById(id: string): QuizTopic | undefined {
  return QUIZ_TOPICS.find((t) => t.id === id)
}

export function topicsFor(ownerId: string): QuizTopic[] {
  return QUIZ_TOPICS.filter((t) => t.owner === ownerId)
}

// --- curriculum ladder ------------------------------------------------------

/**
 * Auto-unlocking, done idempotently.
 *
 * A topic opens itself when it's an entry point (no `unlockAfter`) or when its
 * prerequisite has been officially passed. We remember every id we've ever
 * auto-opened in `quiz.autoUnlocked` so that (a) adding a new topic to the
 * catalog opens it exactly once, and (b) a topic the admin deliberately
 * re-locks stays locked instead of springing back open on the next login.
 *
 * Returns true if anything changed (callers only save when it did).
 */
/** §14 — profiles that work on one academy topic at a time. Berries-only shelves don't count. */
const ONE_TOPIC_OWNERS = ['ben']

function isWorkingOn(id: string, passed: string[]): boolean {
  const t = topicById(id)
  return !!t && !berriesOnly(t) && !passed.includes(id)
}

export function syncTopicUnlocks(d: AppData, ownerId: string): boolean {
  const q = d.quiz
  let changed = false
  if (!q.autoUnlocked) {
    // Migration: everything already open counts as "we've offered this before".
    q.autoUnlocked = [...q.unlockedTopics]
    changed = true
  }
  // A conquered topic locks itself and drops off the wheel — retroactively too,
  // for profiles that passed before this rule existed.
  for (const id of q.passedTopics) {
    if (!q.unlockedTopics.includes(id)) continue
    q.unlockedTopics = q.unlockedTopics.filter((x) => x !== id)
    if (!q.autoUnlocked.includes(id)) q.autoUnlocked.push(id)
    changed = true
  }
  for (const t of topicsFor(ownerId)) {
    if (t.comingSoon || q.autoUnlocked.includes(t.id)) continue
    const ready = !t.unlockAfter || q.passedTopics.includes(t.unlockAfter)
    if (!ready) continue
    // §14 — nothing opens beside the topic he is trying to pass; the pass opens the next
    if (ONE_TOPIC_OWNERS.includes(ownerId) && !berriesOnly(t) && q.unlockedTopics.some((id) => isWorkingOn(id, q.passedTopics))) continue
    q.autoUnlocked.push(t.id)
    if (!q.unlockedTopics.includes(t.id)) q.unlockedTopics.push(t.id)
    changed = true
  }
  return changed
}

/** The topic this one opens up, if any — used for the "next level unlocked!" celebration. */
export function nextLevelAfter(topicId: string): QuizTopic | undefined {
  return QUIZ_TOPICS.find((t) => t.unlockAfter === topicId)
}

/**
 * The reward for passing a final test: the next topic to open in the owner's
 * academy. The ladder wins when there is one (Diogo's levels); otherwise — Ben's
 * topics have no prerequisites, Dad just opens them one at a time — it's the
 * first topic of his still sitting locked, in catalog order.
 *
 * The fallback must never jump the ladder: passing an off-ladder topic (say
 * Claude Code) can't hand out L2 while L1 is still unconquered.
 */
export function nextTopicToUnlock(d: AppData, ownerId: string, passedTopicId: string): QuizTopic | undefined {
  const ladder = nextLevelAfter(passedTopicId)
  if (ladder) return ladder
  return topicsFor(ownerId).find(
    (t) =>
      !t.comingSoon &&
      !berriesOnly(t) && // homework (and a chapter quiz) is never the prize for passing something else
      t.id !== passedTopicId &&
      !d.quiz.unlockedTopics.includes(t.id) &&
      !d.quiz.passedTopics.includes(t.id) && // a conquered topic leaves the unlocked list, but is not the prize
      (!t.unlockAfter || d.quiz.passedTopics.includes(t.unlockAfter)),
  )
}

/** The prerequisite topic, for the "🔒 pass L2 first" hint on a locked card. */
export function prerequisiteOf(topic: QuizTopic): QuizTopic | undefined {
  return topic.unlockAfter ? topicById(topic.unlockAfter) : undefined
}

// --- economy ---------------------------------------------------------------

export const REPEAT_FACTOR = 0.5 // reward halves once a question has ever been answered correctly
export const PASS_PCT = 80 // back to 80 (Oct 2026): 85 made a single slip cost the whole test
export const PRIZE_WINDOW_DAYS = 30 // the rolling window every prize limit is counted over
export const TEST_TIME_BUDGET_MS = 18 * 60_000 // keep the whole test under ~20 min
export const TEST_MIN_QUESTIONS = 15
export const TEST_MAX_QUESTIONS = 20
export const DEFAULT_ANSWER_TIME_MS = 45_000 // assumed pace for questions he's never trained on
export const REVIEW_PASS_PCT = 70 // the warm-up is a real check, not a formality
export const REVIEW_BASE_QUESTIONS = 14 // one old topic to keep fresh = 14 questions; each extra topic adds half of the previous
export const REVIEW_HARD_SHARE = 0.4 // of each topic's warm-up share, how much comes from his weak/unseen questions

export interface Prize {
  id: string
  label: string
  emoji: string
  cost: number // Devil Fruits 🍇
  perMonth: number // purchases allowed per 30-day window; 0 = as many as he can afford
  logo?: string // /prizes/*.png — spins like the Luffy tab icon; without one the emoji is the logo
  /**
   * Roblox screen time this treasure is worth, in minutes (§20). Buying it
   * banks the minutes instead of leaving a thing for Dad to hand over, so it
   * never shows up in the "to settle" list.
   */
  minutes?: number
}

/** Every profile's shelf. Lives in Firestore (`app/prizeCatalog`) once seeded; this is the seed. */
export type PrizeCatalog = Record<string, Prize[]>

/** Each profile shops from its own catalog. Duplicates accumulate as separate purchases. */
export const DEFAULT_PRIZES: PrizeCatalog = {
  ben: [
    { id: 'roblox10', label: 'Roblox $10', emoji: '🎮', cost: 3, perMonth: 1, logo: '/prizes/roblox.png' },
    { id: 'roblox-hour', label: 'Roblox 1 hour', emoji: '⏳', cost: 2, perMonth: 0, minutes: 60, logo: '/prizes/roblox.png' },
    { id: 'dollarama-candy', label: 'Dollarama candy', emoji: '🍬', cost: 2, perMonth: 1, logo: '/prizes/dollarama.png' },
    { id: 'costco-sushi', label: 'Costco Sushi', emoji: '🍣', cost: 6, perMonth: 1, logo: '/prizes/costco.png' },
    // $15 + HST ≈ $17: priced at five passed topics, so a month of real tests buys it (Oct 2026)
    { id: 'fortnite-crew', label: 'Fortnite Crew (1 month)', emoji: '🦙', cost: 5, perMonth: 1 },
  ],
  diogo: [{ id: 'lcbo10', label: 'LCBO $10', emoji: '🍷', cost: 3, perMonth: 1, logo: '/prizes/lcbo.png' }],
}

export function prizesFor(ownerId: string, catalog?: PrizeCatalog | null): Prize[] {
  return (catalog ?? DEFAULT_PRIZES)[ownerId] ?? []
}

/** Berries a training answer pays right now (0 if already rewarded today). */
export function trainingReward(q: QuizQuestion, stat: QuizStat | undefined, today: string = dayKey()): number {
  if (stat?.lastRewardDay === today) return 0
  return stat?.everCorrect ? Math.ceil(q.points * REPEAT_FACTOR) : q.points
}

/**
 * How much of one prize's allowance is left, and when the next slot frees up.
 *
 * Limits are counted per prize over a rolling 30 days — candy can be weekly
 * while sushi stays a once-a-month event — and `perMonth: 0` means no limit at
 * all, so the 🍇 balance is the only thing standing in the way.
 *
 * `readyDay` is the calendar day the shelf restocks (today when it's already
 * buyable), so the shop can show a real date instead of only a countdown.
 */
export function prizeAllowance(
  prize: Prize,
  data: AppData,
  today: string = dayKey(),
): { left: number; daysLeft: number; readyDay: string } {
  if (!prize.perMonth) return { left: Infinity, daysLeft: 0, readyDay: today }
  // for each purchase still inside the window: how many days until it rolls out of it
  const inWindow = data.giftcards
    .filter((p) => p.itemId === prize.id)
    .map((p) => PRIZE_WINDOW_DAYS + daysUntil(p.day, today))
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  const left = Math.max(0, prize.perMonth - inWindow.length)
  // enough must roll out to drop the count below the limit — that's the (n - perMonth)-th oldest
  const daysLeft = left > 0 ? 0 : inWindow[inWindow.length - prize.perMonth]
  return { left, daysLeft, readyDay: addDays(today, daysLeft) }
}

// --- answer checking -------------------------------------------------------

/** Forgiving compare for written answers: case, accents, punctuation and extra spaces don't count. */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Edit distance, capped-cheap enough for short answers. */
function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** How many typos we forgive: longer words get a little more slack. */
function typoBudget(len: number): number {
  if (len <= 3) return 0
  if (len <= 7) return 1
  return 2
}

export type WriteVerdict = 'exact' | 'close' | 'wrong'

/**
 * Grade a typed answer. "Tornto" counts as Toronto — a near miss scores the
 * full points, we just tell him the correct spelling.
 */
export function gradeWrite(q: QuizQuestion, input: string): WriteVerdict {
  const got = normalizeAnswer(input)
  if (!got) return 'wrong'
  const accepted = (q.accept ?? []).map(normalizeAnswer)
  if (accepted.some((a) => a === got)) return 'exact'
  // same first letter required: "Nome" for "Rome" is a wrong answer, not a typo
  const close = accepted.some(
    (a) => a[0] === got[0] && editDistance(a, got) <= typoBudget(Math.max(a.length, got.length)),
  )
  return close ? 'close' : 'wrong'
}

export function checkWrite(q: QuizQuestion, input: string): boolean {
  return gradeWrite(q, input) !== 'wrong'
}

/** The canonical correct answer, for feedback and review screens. */
export function correctAnswerText(q: QuizQuestion): string {
  switch (q.type) {
    case 'choice':
      return q.answer ?? ''
    case 'write':
      return q.accept?.[0] ?? ''
    case 'match':
      return (q.pairs ?? []).map((p) => `${p.left} → ${p.right}`).join(' · ')
    case 'order':
      return (q.sequence ?? []).join(' → ')
    case 'map':
      return q.answer ?? ''
  }
}

// --- stats helpers ---------------------------------------------------------

export function activeQuestions(bank: QuizQuestion[], topicId: string): QuizQuestion[] {
  return bank.filter((q) => q.topicId === topicId && q.status === 'active')
}

/** 0..1 success estimate with a mild prior so unseen ≠ hopeless. */
export function successRate(stat: QuizStat | undefined): number {
  if (!stat || stat.seen === 0) return 0.5
  return (stat.correct + 1) / (stat.seen + 2)
}

/** True while a question added/updated by the weekly AI review hasn't been seen since — drives the "NEW" badge + training priority. */
export function isFresh(q: QuizQuestion, stat: QuizStat | undefined): boolean {
  if (!q.freshAt) return false
  return !stat?.lastSeenAt || stat.lastSeenAt < q.freshAt
}

/**
 * Spaced repetition ladder: how many days a question rests after N consecutive
 * correct answers. Get it right and it fades out; get it wrong and it's back
 * tomorrow, so training loops on the mistakes.
 */
const REST_DAYS = [2, 5, 14, 30]

function restDaysFor(streak: number): number {
  return REST_DAYS[Math.min(streak, REST_DAYS.length) - 1] ?? REST_DAYS[0]
}

/** True when training may show this question today (never answered right, or its rest is over). */
export function isDue(stat: QuizStat | undefined, today: string = dayKey()): boolean {
  if (!stat?.dueDay) return true
  return stat.dueDay <= today
}

export function updatedStat(stat: QuizStat | undefined, correct: boolean, timeMs: number): QuizStat {
  const s: QuizStat = stat ? { ...s0(stat) } : { seen: 0, correct: 0, wrong: 0, everCorrect: false, lastRewardDay: null, avgTimeMs: 0 }
  s.seen += 1
  s.lastSeenAt = new Date().toISOString() // clears any "NEW" badge for this question
  if (correct) {
    s.correct += 1
    s.everCorrect = true
    s.streak = (s.streak ?? 0) + 1
    const rest = new Date()
    rest.setDate(rest.getDate() + restDaysFor(s.streak))
    s.dueDay = dayKey(rest)
  } else {
    s.wrong += 1
    s.streak = 0
    s.dueDay = null // missed → straight back into the rotation
  }
  // rolling average, clamped so one bathroom break doesn't wreck the estimate
  const t = Math.min(Math.max(timeMs, 1000), 4 * 60_000)
  s.avgTimeMs = s.avgTimeMs === 0 ? t : Math.round(s.avgTimeMs * 0.7 + t * 0.3)
  return s
}

function s0(stat: QuizStat): QuizStat {
  // older blobs may miss fields; normalize before mutating
  return {
    seen: stat.seen ?? 0,
    correct: stat.correct ?? 0,
    wrong: stat.wrong ?? 0,
    everCorrect: stat.everCorrect ?? false,
    lastRewardDay: stat.lastRewardDay ?? null,
    avgTimeMs: stat.avgTimeMs ?? 0,
    lastSeenAt: stat.lastSeenAt,
    streak: stat.streak ?? 0,
    dueDay: stat.dueDay ?? null,
  }
}

// --- training question picker ----------------------------------------------

/** The questions training may serve today: unmastered, or past their spaced-repetition rest. */
export function duePool(pool: QuizQuestion[], stats: Record<string, QuizStat>): QuizQuestion[] {
  const today = dayKey()
  return pool.filter((q) => isDue(stats[q.id], today))
}

/**
 * Pick the next training question: unseen first-ish, then the ones he struggles
 * with, core (weight 2) material favoured. Avoids the last few shown.
 * Questions resting after a correct answer are skipped unless `ignoreRest`.
 */
export function pickTraining(
  pool: QuizQuestion[],
  stats: Record<string, QuizStat>,
  recentIds: string[],
  ignoreRest = false,
  missedIds: string[] = [],
  /** The topic's whole bank: a card he just missed has left `pool`, but its family still counts. */
  all: QuizQuestion[] = pool,
): QuizQuestion | null {
  if (pool.length === 0) return null
  const due = ignoreRest ? pool : duePool(pool, stats)
  if (due.length === 0) return null
  const recent = new Set(recentIds.slice(-6))
  let candidates = due.filter((q) => !recent.has(q.id))
  if (candidates.length === 0) candidates = due
  // §14d — the version of an idea he just saw does not get a twin straight
  // after it: that would be reading the answer off the last card. One card in
  // between, at least, whenever there is anything else to ask.
  const byId = new Map(all.map((q) => [q.id, q]))
  const lastFamilies = new Set(recentIds.slice(-2).map((id) => byId.get(id)?.family).filter(Boolean))
  const apart = candidates.filter((q) => !q.family || !lastFamilies.has(q.family))
  if (apart.length > 0) candidates = apart
  // …and an idea he missed this session comes back sooner, in another version
  const hot = new Set(missedIds.map((id) => byId.get(id)?.family).filter(Boolean))
  const weights = candidates.map((q) => {
    const stat = stats[q.id]
    const novelty = !stat || stat.seen === 0 ? 2.5 : 1
    const struggle = 1.6 - successRate(stat) // weak questions come back more often
    const fresh = isFresh(q, stat) ? 3 : 1 // weekly-review additions/updates jump the queue
    const missed = q.family && hot.has(q.family) ? 2 : 1
    return q.weight * novelty * struggle * fresh * missed
  })
  return weightedPick(candidates, weights)
}

// --- first goal (§14f) ------------------------------------------------------

/** Right this many times running, and a first-goal question counts as known. */
export const FIRST_GOAL_STREAK = 2
/** How many he is drilled on at a time: fifty states at once is a wall. */
export const DRILL_ROUND = 10

/** The first-goal questions he does not know yet, in bank order, so a round is neighbours. */
export function firstGoalGaps(pool: QuizQuestion[], stats: Record<string, QuizStat>): QuizQuestion[] {
  return pool.filter((q) => q.firstGoal && (stats[q.id]?.streak ?? 0) < FIRST_GOAL_STREAK)
}

export function firstGoalProgress(pool: QuizQuestion[], stats: Record<string, QuizStat>): { total: number; known: number } {
  const total = pool.filter((q) => q.firstGoal).length
  return { total, known: total - firstGoalGaps(pool, stats).length }
}

/**
 * §14d — how many IDEAS of a pool he owns. An idea is a family (or a lone
 * question); he owns it once any version of it has ever been answered right.
 * Counting questions instead would make a chapter of five ideas look like
 * fifteen things to learn.
 */
export function ideaProgress(pool: QuizQuestion[], stats: Record<string, QuizStat>): { total: number; known: number } {
  const ideas = new Map<string, boolean>()
  for (const q of pool) {
    const key = q.family ?? q.id
    ideas.set(key, (ideas.get(key) ?? false) || !!stats[q.id]?.everCorrect)
  }
  let known = 0
  for (const v of ideas.values()) if (v) known++
  return { total: ideas.size, known }
}

/**
 * §14d — what training may still ask in this session, with the versions of
 * one idea treated as one idea.
 *
 * - A right answer clears its whole FAMILY for the session: he showed he knows
 *   the fact, and the other versions are the same fact in other words.
 * - A missed card does not come back as itself while another version of it is
 *   still left — the retry is the same idea, asked differently, so he cannot
 *   pass it by remembering where the answer sat.
 *
 * Questions without a family behave exactly as before: only a right answer
 * takes them out.
 */
export function sessionPool(pool: QuizQuestion[], correctIds: string[], missedIds: string[]): QuizQuestion[] {
  const right = new Set(correctIds)
  const missed = new Set(missedIds)
  const solved = new Set(pool.filter((q) => q.family && right.has(q.id)).map((q) => q.family))
  const left = pool.filter((q) => !right.has(q.id) && !(q.family && solved.has(q.family)))
  return left.filter(
    (q) => !q.family || !missed.has(q.id) || !left.some((o) => o.family === q.family && !missed.has(o.id)),
  )
}

// --- Question of the Day ----------------------------------------------------

/** Berries a correct Question-of-the-Day answer wins. */
export function qotdReward(q: QuizQuestion): number {
  return q.points
}

/** Berries lost for a wrong Question-of-the-Day answer — or for ignoring it all day. */
export function qotdPenalty(q: QuizQuestion): number {
  return Math.max(1, Math.ceil(q.points * 0.5))
}

/**
 * Choose the day's review question. It's drawn ONLY from questions this profile
 * has ALREADY answered correctly at least once (`everCorrect`) in an unlocked,
 * active topic — the whole point is keeping mastered material fresh (a passed
 * topic still counts; passing doesn't lock it). Older + harder questions are
 * favoured: the weight climbs with how long since it was last seen and how weak
 * the success rate is. Returns null if nothing's been mastered yet.
 */
/**
 * §17 — the only question types the daily question may use. A tap-to-match or
 * put-in-order question is a two-minute job on a screen you opened to be asked
 * ONE thing, and the honest answer to it is "later", which is how it ends up
 * being charged for. Choice and write-in are answered in seconds.
 */
export const QOTD_TYPES: QuizQuestionType[] = ['choice', 'write']

export function pickDailyQuestion(bank: QuizQuestion[], quiz: QuizState, today: string = dayKey()): string | null {
  const candidates = bank.filter(
    (q) =>
      q.status === 'active' &&
      QOTD_TYPES.includes(q.type) &&
      quiz.unlockedTopics.includes(q.topicId) &&
      quiz.stats[q.id]?.everCorrect,
  )
  if (candidates.length === 0) return null
  const weights = candidates.map((q) => {
    const stat = quiz.stats[q.id]
    const struggle = Math.max(0.15, 1.7 - successRate(stat)) // weak (~1.2) beats strong (~0.7)
    const lastSeen = stat?.lastSeenAt ? stat.lastSeenAt.slice(0, 10) : today
    const age = Math.max(0, -daysUntil(lastSeen, today)) // days since last seen
    const staleness = 1 + Math.min(age, 60) / 15 // up to ×5 for questions untouched for ~2 months
    return struggle * staleness
  })
  return weightedPick(candidates, weights).id
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

// --- final test builder ----------------------------------------------------

export interface FinalTestPlan {
  questions: QuizQuestion[]
  estimatedMs: number
}

function estTime(q: QuizQuestion, stats: Record<string, QuizStat>): number {
  const s = stats[q.id]
  return s && s.avgTimeMs > 0 ? s.avgTimeMs : DEFAULT_ANSWER_TIME_MS
}

/**
 * Build an official/simulated final test:
 *  - sized by his real answering pace so the whole thing fits the time budget
 *  - ~40% questions he's strong at, ~60% weak/unseen — he was clearing the old
 *    60/40 mix too easily, so the test now has to be studied for
 *  - strong/weak interleaved so he never faces a wall of hard ones
 *  - `excludeIds` = the previous failed attempt's questions (a retry must differ)
 */
export function buildFinalTest(
  pool: QuizQuestion[],
  stats: Record<string, QuizStat>,
  excludeIds: string[] = [],
): FinalTestPlan {
  const excluded = new Set(excludeIds)
  let candidates = pool.filter((q) => !excluded.has(q.id))
  if (candidates.length < TEST_MIN_QUESTIONS) candidates = pool // small bank: allow repeats from last attempt

  const sorted = [...candidates].sort((a, b) => successRate(stats[b.id]) - successRate(stats[a.id]))
  const strong = sorted.filter((q) => successRate(stats[q.id]) >= 0.6)
  const weak = sorted.filter((q) => successRate(stats[q.id]) < 0.6)

  // decide how many questions fit the budget at his pace
  let est = 0
  const byPlan: QuizQuestion[] = []
  const takeStrong = shuffle(strong)
  const takeWeak = shuffle(weak)
  // interleave W S W S W … (~40/60), topping from whichever side still has questions
  while (byPlan.length < TEST_MAX_QUESTIONS && (takeStrong.length > 0 || takeWeak.length > 0)) {
    const wantStrong = byPlan.length % 5 === 1 || byPlan.length % 5 === 3 // 2 of every 5
    const next = (wantStrong ? takeStrong.shift() ?? takeWeak.shift() : takeWeak.shift() ?? takeStrong.shift())!
    const t = estTime(next, stats)
    if (byPlan.length >= TEST_MIN_QUESTIONS && est + t > TEST_TIME_BUDGET_MS) break
    byPlan.push(next)
    est += t
  }
  return { questions: byPlan, estimatedMs: est }
}

/**
 * The test a topic actually sits. §14f — a topic with `everyInTest` opens with
 * every first-goal question, one by one, and the usual test on the rest follows.
 * Retries ask those same questions again: the whole point is that all of them
 * get asked.
 */
export function buildTopicTest(
  topic: QuizTopic | undefined,
  pool: QuizQuestion[],
  stats: Record<string, QuizStat>,
  excludeIds: string[] = [],
): QuizQuestion[] {
  if (!topic?.firstGoal?.everyInTest) return buildFinalTest(pool, stats, excludeIds).questions
  const rest = pool.filter((q) => !q.firstGoal)
  return [...shuffle(pool.filter((q) => q.firstGoal)), ...buildFinalTest(rest, stats, excludeIds).questions]
}

// --- warm-up review round (before every official final test) ----------------

/**
 * The already-conquered topics an official test must warm up on: every topic
 * this profile has officially passed (minus the one he's about to sit) that
 * still has questions in the bank.
 */
export function reviewTopicIds(data: AppData, ownerId: string, aboutToSit: string): string[] {
  const owned = new Set(topicsFor(ownerId).map((t) => t.id))
  return data.quiz.passedTopics.filter((id) => id !== aboutToSit && owned.has(id))
}

/**
 * How long the warm-up is: 14 questions for the first old topic, then half again
 * for each extra one (14 + 7 + 3.5 + …), rounded up. It keeps growing far more
 * slowly than the pile of conquered topics does.
 */
export function reviewSize(topicCount: number): number {
  let total = 0
  for (let i = 0; i < topicCount; i++) total += REVIEW_BASE_QUESTIONS / 2 ** i
  return Math.ceil(total)
}

/** Per-topic tally of a review round, for the "what to study" report. */
export interface ReviewTopicScore {
  topicId: string
  right: number
  total: number
}

/**
 * Build the warm-up round: `reviewSize(n)` questions split as evenly as the
 * banks allow across the conquered topics, and interleaved so he hops between
 * seas instead of grinding one.
 *
 * The point is to keep old material fresh, but a warm-up he cannot fail proves
 * nothing: ~60% things he has answered right before, ~40% his weak or unseen
 * ones (`REVIEW_HARD_SHARE`), pass mark 70%.
 */
export function buildReviewTest(
  bank: QuizQuestion[],
  stats: Record<string, QuizStat>,
  topicIds: string[],
  excludeIds: string[] = [],
): QuizQuestion[] {
  if (topicIds.length === 0) return []
  const target = reviewSize(topicIds.length)
  const excluded = new Set(excludeIds)

  // fair share each, remainder handed out from the front
  const base = Math.floor(target / topicIds.length)
  const extra = target % topicIds.length
  const order = shuffle(topicIds)

  const perTopic = order.map((topicId, i) => {
    const want = base + (i < extra ? 1 : 0)
    let pool = activeQuestions(bank, topicId).filter((q) => !excluded.has(q.id))
    if (pool.length < want) pool = activeQuestions(bank, topicId) // small bank: allow last attempt's questions back
    const strong = shuffle(pool.filter((q) => successRate(stats[q.id]) >= 0.6))
    const weak = shuffle(pool.filter((q) => successRate(stats[q.id]) < 0.6))
    const hard = Math.min(weak.length, Math.round(want * REVIEW_HARD_SHARE))
    const picked = [...weak.slice(0, hard), ...strong.slice(0, want - hard)]
    // one side ran dry — top up from whatever is left
    if (picked.length < want) {
      const rest = [...strong.slice(want - hard), ...weak.slice(hard)]
      picked.push(...rest.slice(0, want - picked.length))
    }
    return shuffle(picked)
  })

  // interleave: one from each topic, round after round
  const out: QuizQuestion[] = []
  for (let round = 0; out.length < target; round++) {
    const before = out.length
    for (const list of perTopic) if (list[round]) out.push(list[round])
    if (out.length === before) break // every topic exhausted
  }
  return out.slice(0, target)
}

/** Tally a finished review round per topic — the only thing a failed round reveals. */
export function reviewBreakdown(bank: QuizQuestion[], results: { qid: string; correct: boolean }[]): ReviewTopicScore[] {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const acc = new Map<string, ReviewTopicScore>()
  for (const r of results) {
    const topicId = byId.get(r.qid)?.topicId
    if (!topicId) continue
    const row = acc.get(topicId) ?? { topicId, right: 0, total: 0 }
    row.total += 1
    if (r.correct) row.right += 1
    acc.set(topicId, row)
  }
  // weakest first: that's the study order
  return [...acc.values()].sort((a, b) => a.right / a.total - b.right / b.total)
}

/**
 * Live mercy rule: with 3 wrong in a row, serve the remaining question he's
 * strongest at next; otherwise follow the plan. Never 4 misses in a row if we
 * can help it (it was 2 → 3 until the tests got harder, Oct 2026).
 */
export function nextTestQuestion(
  remaining: QuizQuestion[],
  stats: Record<string, QuizStat>,
  lastThreeWrong: boolean,
  /** §14f — the test comes in two parts: the mercy pick must not jump out of the one he is in. */
  stayInPart = false,
): QuizQuestion {
  if (!lastThreeWrong || remaining.length === 1) return remaining[0]
  const part = stayInPart ? remaining.filter((q) => !!q.firstGoal === !!remaining[0].firstGoal) : remaining
  return [...part].sort((a, b) => successRate(stats[b.id]) - successRate(stats[a.id]))[0]
}

/** How many options a choice question shows on screen, however big its distractor pool is. */
export const CHOICE_OPTIONS_SHOWN = 4

/**
 * Pick the options for one showing of a choice question.
 *
 * `q.choices` is a *pool* — it may hold far more wrong answers than fit on
 * screen. We keep the correct answer, sample the rest at random and shuffle, so
 * both the position AND the set of distractors change every time. That's what
 * stops "the answer is the 3rd button" memorisation.
 *
 * We also kill the *length* tell: a wordy correct answer next to three short
 * ones can be guessed without knowing anything. If the sample leaves the answer
 * clearly the longest, we swap in a beefier distractor from the pool.
 */
export function optionsShownFor(topicId: string): number {
  return topicById(topicId)?.optionCount ?? CHOICE_OPTIONS_SHOWN
}

export function pickChoiceOptions(q: QuizQuestion, shown: number = optionsShownFor(q.topicId)): string[] {
  const pool = q.choices ?? []
  const answer = q.answer
  if (!answer) return shuffle(pool).slice(0, shown)
  const rest = shuffle(pool.filter((c) => c !== answer))
  const picked = rest.slice(0, Math.max(0, shown - 1))
  return shuffle([answer, ...deTell(answer, picked, rest.slice(picked.length))])
}

/** An answer this much longer than every distractor is a giveaway on its own. */
const LENGTH_TELL_RATIO = 0.8

/**
 * Swap one sampled distractor for a longer spare when the answer towers over
 * the whole sample. Only ever swaps one, so the sample stays varied.
 */
function deTell(answer: string, picked: string[], spares: string[]): string[] {
  if (!picked.length) return picked
  const floor = answer.length * LENGTH_TELL_RATIO
  if (picked.some((c) => c.length >= floor)) return picked
  const better = shuffle(spares.filter((c) => c.length >= floor))[0]
  if (!better) return picked
  const shortest = picked.reduce((a, b) => (b.length < a.length ? b : a))
  return picked.map((c) => (c === shortest ? better : c))
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- quiz habits on the wheel ----------------------------------------------

export const QUIZ_TASK_PREFIX = 'quiz-'

/**
 * Every unlocked topic is also a daily **must-do**: medium effort, high
 * priority, ticked off in the checklist beside the wheel (never spun for —
 * studying isn't left to luck). Locking a topic archives its habit (history
 * survives). Runs against the owner's data on login and whenever a lock is
 * toggled; older wheel-era quiz habits are promoted to must-dos on the way.
 */
export function syncQuizTasks(d: AppData, ownerId: string): void {
  for (const t of topicsFor(ownerId)) {
    const id = QUIZ_TASK_PREFIX + t.id
    // §14b — a school quiz never becomes a forever-daily must-do: the unit ends,
    // the habit wouldn't. An already-created one gets archived on the next sync.
    // §14d — nor do the sixty chapter quizzes: one task a day, not sixty.
    const unlocked = d.quiz.unlockedTopics.includes(t.id) && !berriesOnly(t)
    const task = d.tasks.find((x) => x.id === id)
    if (unlocked) {
      if (!task) {
        d.tasks.push({
          id,
          name: `${t.emoji} ${t.title} quiz training`,
          repeats: true,
          effort: 'medium',
          priority: 'urgent',
          dayScope: 'all',
          required: true,
          createdAt: new Date().toISOString(),
          archived: false,
          spinsSinceLastPicked: 0,
          timesPicked: 0,
        })
      } else {
        if (task.archived) task.archived = false
        // migration: quiz training used to live on the wheel
        if (!task.required) {
          task.required = true
          delete task.onWheel
        }
      }
    } else if (task && !task.archived) {
      task.archived = true
    }
  }
}

/** The most recent official attempt for a topic (drives the retry-next-day rule). */
export function lastOfficialAttempt(data: AppData, topicId: string) {
  for (let i = data.quiz.tests.length - 1; i >= 0; i--) {
    const t = data.quiz.tests[i]
    if (t.official && t.topicId === topicId && !t.review) return t
  }
  return null
}

/** The warm-up round of the previous attempt — its questions don't come back. */
export function lastReviewAttempt(data: AppData, topicId: string) {
  for (let i = data.quiz.tests.length - 1; i >= 0; i--) {
    const t = data.quiz.tests[i]
    if (t.review && t.topicId === topicId) return t
  }
  return null
}

/**
 * §14 — has he already CLEARED the gating warm-up today? Then a second official
 * test the same day (he failed the first, or Dad authorised another) skips the
 * round: he proved the old seas are fresh a few hours ago, and sitting it again
 * only taxes him for the test that failed. A failed warm-up does not count, and
 * neither does a rehearsal (those are `official: false`).
 */
export function passedWarmupToday(data: AppData, today: string = dayKey()): boolean {
  return data.quiz.tests.some((t) => t.official && t.review && t.passed && t.day === today)
}

// --- the standalone warm-up (§14c) ------------------------------------------

/**
 * The pseudo-topic every standalone warm-up is filed under.
 *
 * It guards no test, so it must not borrow a real topic's id: `lastReviewAttempt`
 * keys the official exclusion list off `topicId`, and a rehearsal filed under
 * `g7-sci-a` would start eating the questions the real warm-up before that test
 * is allowed to ask.
 */
export const WARMUP_TOPIC_ID = '_warmup'

/**
 * The whole pool a standalone warm-up draws on: every topic he has officially
 * conquered that still has questions in the bank.
 *
 * Same pool as the real thing (`reviewTopicIds`) with nothing held back, since
 * there is no test coming that one of them has to be excluded for. Topics with
 * an empty bank are dropped here rather than inside `buildReviewTest`, so the
 * count the screen promises is the count he actually gets.
 */
export function warmupTopicIds(data: AppData, ownerId: string, bank: QuizQuestion[]): string[] {
  return reviewTopicIds(data, ownerId, '').filter((id) => activeQuestions(bank, id).length > 0)
}

/**
 * How many standalone warm-ups stay on his record.
 *
 * `quiz.tests` is capped at 60 rows to keep the blob small, and that cap is
 * shared with his official final tests. A round he can run as often as he likes
 * would quietly push every real test result out of the window — and with them
 * the "last final test" line on Progress and the exclusion list that stops a
 * retry re-asking the questions he just failed. So these are pruned to the five
 * the Warm-up tab actually shows, and the cap never sees them pile up.
 */
export const WARMUP_KEEP = 5

/** Every standalone warm-up he has run, oldest first. */
export function warmupAttempts(data: AppData): QuizTestRecord[] {
  return data.quiz.tests.filter((t) => t.review && t.topicId === WARMUP_TOPIC_ID)
}
