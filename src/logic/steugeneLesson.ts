// 🏫 St. Eugene 7 (§24d) — building a lesson that lasts as long as it should.
//
// The brief: 30 to 60 minutes of ACTIVE work. Not elapsed time — if he walks
// off for ten minutes, those ten minutes never happened. And no visible clock,
// ever, because a clock on screen turns "do the work" into "survive the timer"
// and he will learn to stare at it.
//
// So the engine works the other way round. It plans a run it believes is about
// the right length, then watches how fast he is actually going and splices
// more in from the pack's bench whenever he is ahead of it. Running OUT of
// content before the time is up is the one failure mode that matters, which is
// why every pack carries far more `extra` than `core`.
import type { SeBlock, SeExplain, SePack } from '../steugene/types'
import type { SeAnswer, SeFixLock } from '../types'
import { seFind } from './steugene'

/**
 * Allowed lesson lengths, in minutes; 40 is the default (storage.ts). 15 is for
 * the days 30 is a wall: his first 30-minute lesson ran past an hour of real
 * time and was never finished, and a finish line he reaches beats one he
 * does not.
 */
export const SE_LENGTHS = [15, 30, 40, 60] as const

/**
 * Deal this much more than the target asks for.
 *
 * The block estimates are what a block takes someone who already knows the
 * answer. He is twelve and learning it, and the Gym taught us the same lesson
 * about estimated vs. real time (§18z) — plans run long. So the queue is
 * oversized and the CLOCK ends the lesson, not the end of the queue. Running
 * out of cards early is the only outcome that actually looks like a bug.
 */
export const SE_PLAN_HEADROOM = 1.35

/**
 * How much slower he really is than a block's `secs` estimate.
 *
 * The estimates are "already knows it" time. His Gym sessions run about 1.4×
 * their plan (§18z measures it from finished sessions) and the audit prints
 * the same allowance for these packs. Used to size a 🔁 Review (§24v), whose
 * queue cannot be topped up and therefore has to be right first time.
 */
export const SE_REAL_PACE = 1.4

/** How long we GUESS a block takes. Only ever used to size the opening queue. */
export function seBlockSeconds(b: SeBlock): number {
  if (b.secs) return b.secs
  switch (b.kind) {
    case 'explain':
      return 45
    case 'choice':
      return 40
    case 'build':
      return 65
    case 'game':
      return 80
    case 'video':
      return b.seconds + b.checks.length * 40
  }
}

/** A question of any kind — what the report counts and what the clock is mostly made of. */
export function seIsQuestion(b: SeBlock): boolean {
  return b.kind === 'choice' || b.kind === 'build'
}

/**
 * Deal a lesson.
 *
 * Shape, in order, repeated until the budget is full: something to read, two
 * things to answer, something to watch or play, two more things to answer. It
 * opens on an explanation on purpose — the first thing he meets should never
 * be a question he might get wrong.
 *
 * `seen` is every block id he has already been served for this subtopic.
 * Unseen blocks are dealt first, so repeating a subtopic (§24) gives him
 * different work. When the bench is exhausted the seen ones come back round,
 * oldest-served first — better a repeat than an empty screen.
 *
 * Note what that means on its own: a card he has seen is effectively gone.
 * That is right for *new work* and wrong for *remembering*, which is why the
 * warm-up (`seWarmUp`, §24q) is prepended to this and deliberately reaches
 * for seen cards.
 */
export function sePlanLesson(available: SeBlock[], seen: string[], targetSeconds: number): SeBlock[] {
  const budgetTo = targetSeconds * SE_PLAN_HEADROOM
  const seenSet = new Set(seen)
  const fresh = (list: SeBlock[]) => list.filter((b) => !seenSet.has(b.id))
  const stale = (list: SeBlock[]) => list.filter((b) => seenSet.has(b.id))

  // Three decks, each fresh-first, each shuffled within its freshness band so
  // two lessons in a row are never identical even with the same bench.
  const deck = (pick: (b: SeBlock) => boolean) => {
    const list = available.filter(pick)
    return [...shuffle(fresh(list)), ...shuffle(stale(list))]
  }
  const reads = deck((b) => b.kind === 'explain')
  const asks = deck(seIsQuestion)
  const watches = deck((b) => b.kind === 'video' || b.kind === 'game')

  const byId = new Map(available.map((b) => [b.id, b]))
  const out: SeBlock[] = []
  let budget = 0
  const push = (b: SeBlock) => {
    out.push(b)
    budget += seBlockSeconds(b)
  }
  const take = (from: SeBlock[]) => {
    const b = from.shift()
    if (!b) return false
    // Its picture first, once per lesson — and out of the reads deck, so it
    // is not dealt a second time later.
    const lead = b.lead ? byId.get(b.lead) : undefined
    if (lead && !out.includes(lead)) {
      push(lead)
      if (reads.includes(lead)) reads.splice(reads.indexOf(lead), 1)
    }
    push(b)
    return true
  }

  // Deal in the pattern above. Each `take` that comes up empty is simply
  // skipped — a pack with no videos still produces a sane lesson.
  let guard = 0
  while (budget < budgetTo && guard++ < 200) {
    const before = out.length
    take(reads)
    take(asks)
    take(asks)
    if (budget < budgetTo) take(watches)
    take(asks)
    take(asks)
    if (out.length === before) break // every deck is empty; nothing more to deal
  }
  return out
}

// --- The warm-up (§24q) --------------------------------------------------------

/**
 * How long a question has to have been left alone before it comes back.
 *
 * Three days, because the point is RETRIEVAL — pulling it back out of memory
 * after it has gone cold. Asking the same thing an hour later measures
 * nothing; asking it three days later is what makes it stick.
 */
export const SE_WARM_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1000

/** At most this many. It is a warm-up, not a test. */
export const SE_WARM_MAX = 3

/**
 * How many a lesson of this length should open with.
 *
 * A 15-minute lesson (§24d) is barely four questions long, so three of them
 * being last week's would turn the whole thing into revision. Two.
 */
export function seWarmCount(minutes: number): number {
  return minutes <= 15 ? 2 : SE_WARM_MAX
}

/**
 * The card that says what the warm-up is.
 *
 * It exists because §24d promises the first thing he meets is never a
 * question he might get wrong, and because three questions with no framing
 * read as an exam. Framed, they read as a win he already has in the bank.
 */
export const SE_WARM_INTRO: SeExplain = {
  kind: 'explain',
  id: 'se-warm-intro',
  emoji: '⚡',
  title: 'Warm-up',
  lines: ['First, a few you have already got right before.', 'Nothing new yet — this is the drop before the storm moves.'],
  secs: 12,
}

/**
 * Questions he got RIGHT at least three days ago, oldest first (§24q).
 *
 * The gap this closes: `seen` takes a card out of the deck and never puts it
 * back (see `sePlanLesson`). So before this, nothing he learned was ever
 * deliberately met again — he saw each idea once and the engine moved on.
 * Understanding is not built that way; it is built by meeting the same idea
 * again after forgetting some of it.
 *
 * Only things he got right, and only his LATEST answer counts: a question he
 * got right in September and wrong last week is not warm, it is broken, and
 * it belongs in "mistakes to fix" (§24f), not here. A card he gets wrong in
 * the warm-up is sealed like any other, which is the honest outcome — it
 * means he had lost it.
 *
 * `available` is the bench, so sealed misses are already out.
 */
export function seWarmUp(
  available: SeBlock[],
  history: SeAnswer[],
  subtopicId: string,
  now: number = Date.now(),
  max: number = SE_WARM_MAX,
): SeBlock[] {
  const cutoff = now - SE_WARM_MIN_AGE_MS
  // Latest answer per block — history is oldest-first, so the last one wins.
  const latest = new Map<string, SeAnswer>()
  for (const a of history) {
    if (a.subtopicId === subtopicId) latest.set(a.id, a)
  }
  const askable = new Map(available.filter(seIsQuestion).map((b) => [b.id, b]))
  return [...latest.values()]
    .filter((a) => a.right && a.at <= cutoff && askable.has(a.id))
    .sort((x, y) => x.at - y.at) // coldest first: longest since he last saw it
    .slice(0, Math.max(0, max))
    .map((a) => askable.get(a.id)!)
}

/**
 * He is working faster than the plan: one more block, please.
 *
 * Weighted towards questions, because that is what the report is made of and
 * what he is actually here to practise — but it will hand back a read or a
 * game rather than nothing.
 */
export function seTopUp(available: SeBlock[], used: string[]): SeBlock[] {
  const usedSet = new Set(used)
  const left = available.filter((b) => !usedSet.has(b.id))
  if (!left.length) return []
  const questions = left.filter(seIsQuestion)
  const pool = questions.length >= 2 ? questions : left
  const b = pool[Math.floor(Math.random() * pool.length)]
  const lead = b.lead && !usedSet.has(b.lead) ? available.find((x) => x.id === b.lead) : undefined
  return lead ? [lead, b] : [b]
}

/**
 * Everything that could be served for a subtopic: the pack plus anything the
 * AI added — with every maths question whose answer is a number turned into
 * tiles (`seAsBuild`, §24y).
 *
 * That conversion happens HERE, at the one door every route into a lesson
 * comes through, so the planner sizes the queue with the right seconds, the
 * player draws it, and 🤝 Helping him shows Dad the same card Ben has.
 */
export function seAvailable(pack: SePack | null, generated: SeBlock[]): SeBlock[] {
  const maths = !!pack && seFind(pack.subtopicId)?.subject.id === 'math'
  const seen = new Set<string>()
  const out: SeBlock[] = []
  for (const b of [...(pack?.core ?? []), ...(pack?.extra ?? []), ...generated]) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    out.push(maths ? seAsBuild(b) : b)
  }
  return out
}

/**
 * The same blocks, plus every video question as a card of its own, under the
 * id it is filed as (`<video>-q<n>`, see VideoCard). A miss on a video
 * question is redone as just that question, not as the whole video again.
 */
export function seWithChecks(blocks: SeBlock[]): SeBlock[] {
  const checks = blocks.flatMap((b) =>
    b.kind === 'video' ? b.checks.map((c, i): SeBlock => ({ ...c, kind: 'choice', id: `${b.id}-q${i}` })) : [],
  )
  return [...blocks, ...checks]
}

// --- Mistakes to fix (§24f) ----------------------------------------------------

/** The misses in a lock he has not redone yet. */
export function seLockLeft(lock: SeFixLock): SeAnswer[] {
  const fixed = new Set(lock.fixed ?? [])
  return lock.mistakes.filter((m) => !fixed.has(m.id))
}

/**
 * What Dad has unlocked and he has not redone yet, one group per subtopic:
 * the "Rational numbers — mistakes to fix" rows. Oldest group first.
 *
 * There used to be a second half to this: a miss he got right on the same day
 * he made it was held back until the next day, on the grounds that repeating
 * an answer you were told an hour ago is not evidence. True, and it still made
 * for a page that said "mistakes to fix" at an evening spent fixing every one
 * of them, with no way to act on it. 🔁 Review (§24v) does that job better and
 * without a locked door: anything he still gets wrong is there, any day,
 * whenever he wants another go at it.
 */
export function seFixGroups(locks: SeFixLock[]): { subtopicId: string; left: SeAnswer[] }[] {
  const groups = new Map<string, SeAnswer[]>()
  for (const lock of [...locks].sort((a, b) => a.at - b.at)) {
    if (!lock.allowedAt || lock.clearedAt) continue
    const left = seLockLeft(lock)
    if (!left.length) continue
    groups.set(lock.subtopicId, [...(groups.get(lock.subtopicId) ?? []), ...left])
  }
  return [...groups].map(([subtopicId, left]) => ({ subtopicId, left }))
}

/**
 * A miss as "mistakes to fix" deals it (§24f): a choice keeps its options but
 * in a new order, because he has seen this card — and its right answer — once
 * already, and "it was the bottom one" is not knowing it.
 *
 * The numeric ones are not here at all any more — they were turned into tile
 * questions when the pack was read (`seAsBuild`, §24y), so what is left to
 * re-order is the questions that genuinely pick from their own options.
 */
export function seForFix(b: SeBlock, seed: string | number = ''): SeBlock {
  if (b.kind !== 'choice') return b
  // Seeded on the card and the run, never on Math.random: the player
  // re-derives this deck whenever his data syncs, and an order that changes
  // while he is reading the options is the worst bug on this screen.
  const options = shuffle([...b.options], rngFor(`${b.id}:${seed}`))
  return { ...b, options, answer: options.indexOf(b.options[b.answer]) }
}

// --- 🔁 Review (§24v) ---------------------------------------------------------

/**
 * Deal a review: his own mistakes across a whole strand, coldest first.
 *
 * `byId` holds every block from every pack in the strands involved (the caller
 * has to have fetched them). `items` are question ids in the order they should
 * be dealt, each saying whether it wants its `lead` card in front of it.
 *
 * A mistake comes with its `lead` — the picture that teaches it (§24d). A
 * review that only re-asks is a test; the point there is another go at
 * understanding it, so the explanation comes first. A question he got right
 * does not get one (§24w): he does not need teaching, and the seconds buy
 * another question instead.
 *
 * It fills the lesson length he has chosen and stops. The rest keep for the
 * next review, which is the right outcome: twenty mistakes in one sitting is
 * not a review, it is a punishment.
 */
export function seReviewPlan(
  byId: Map<string, SeBlock>,
  items: { id: string; lead?: boolean }[],
  targetSeconds: number,
): SeBlock[] {
  // A normal lesson's queue is a BUFFER — it is deliberately over-dealt by
  // `SE_PLAN_HEADROOM` and the clock ends the lesson, topping up from the
  // bench if he is quick (§24d). A review has no bench to top up from, so its
  // queue IS its length, and over-dealing would hand him a 15-minute review
  // with twenty questions in it. So it goes the other way: the estimates are
  // "already knows it" seconds and he runs about `SE_REAL_PACE` slower, so the
  // estimate budget is the real target DIVIDED by that. It lands a 15-minute
  // review on about the eight questions a 15-minute lesson gets through.
  const budget = targetSeconds / SE_REAL_PACE
  const out: SeBlock[] = []
  const taken = new Set<string>()
  let secs = 0
  for (const item of items) {
    const block = byId.get(item.id)
    if (!block || taken.has(block.id)) continue
    // `lead` is the caller's call per question: a mistake gets the card that
    // teaches it, a question he got right does not need teaching again and
    // the seconds are better spent on another question.
    const wantLead = item.lead !== false
    const lead = wantLead && block.lead && !taken.has(block.lead) ? byId.get(block.lead) : undefined
    const cost = (lead ? seBlockSeconds(lead) : 0) + seBlockSeconds(block)
    // Always deal the first one, however long it is: an empty review is worse
    // than one that overruns by a card.
    if (out.length && secs + cost > budget) break
    if (lead) {
      out.push(lead)
      taken.add(lead.id)
    }
    out.push(block)
    taken.add(block.id)
    secs += cost
  }
  return out
}

/**
 * The order a CUSTOM review deals in (§24w).
 *
 * Mistakes first, coldest first — they are worth the most and he has the most
 * attention at the start. Then everything he got right, shuffled, so two
 * custom reviews of the same chapter are never the same lesson.
 *
 * A mistake carries its lead card; a question he got right does not.
 */
export function seCustomOrder(
  seen: { id: string; at: number; right: boolean }[],
): { id: string; lead: boolean }[] {
  const wrong = seen.filter((q) => !q.right).sort((a, b) => a.at - b.at)
  const right = shuffle(seen.filter((q) => q.right))
  return [
    ...wrong.map((q) => ({ id: q.id, lead: true })),
    ...right.map((q) => ({ id: q.id, lead: false })),
  ]
}

// --- A number is built, never picked (§24y) -----------------------------------
//
// Three buttons with a number on each is a one-in-three guess, and he takes
// it: on a maths question he cannot do, picking is free and costs him nothing
// to be wrong. Tiles close that door. There is no list to choose from, so the
// only way to put "-15" in the slot is to have worked out that it is -15 —
// and the hand still carries every character he needs, because reading is his
// difficulty and a blank keypad would test that instead (§24f).
//
// It is a CONVERSION, not a rewrite. Every numeric maths question already
// written stays exactly as authored — same id, same prompt, same picture, same
// `why`, same walk-through — and is dealt as tiles. The wrong options are not
// thrown away either: their digits become the decoy tiles, which makes them
// better decoys than anything generated, because they are the mistakes
// somebody expected him to make.
//
// Two kinds of question stay on three buttons, on purpose:
//  · Anything that picks from its own options. "Which of these is a perfect
//    square? 48 / 49 / 50" has no answer to build — the options ARE the
//    question, and tiles would ask him to invent one.
//  · Anything whose answer is not a short, plain number: a bounty of
//    3,000,000,000, a mixed number, a word, a `line 2`. Thirteen taps to
//    spell an answer is a reading test again.

/** Unicode minus and the dashes authors reach for → the character the tiles use. */
const seMinus = (s: string) => s.replace(/[−–—]/g, '-')

/** Short enough to tap out: an integer, a 1–2 place decimal, or a simple fraction. */
const BUILDABLE = /^-?\d{1,4}(?:\.\d{1,2})?$|^-?\d{1,3}\/\d{1,3}$/

/** "$" / "£" / "€" in front — printed beside the slot, not built (see `SeBuild.unit`). */
const UNIT_PRE = /^[$£€]?$/

/** "%", "°C", " m", " cm²", " blocks" — one unit, after the number. */
const UNIT_POST = /^$|^°[CF]?$|^[%¢×]$|^ [A-Za-z²³]{1,7}$/

/**
 * A question that picks from its own options. Tiles cannot ask it, so it
 * stays as it was written.
 */
const PICKS_FROM_OPTIONS = /\bwhich\b|\bpick\b|\bchoose\b|\bclosest\b|\bbest\b/i

/** The packs shout the exclusion: "Which one is NOT a square number?" */
const SHOUTED_NOT = /\bNOT\b/

/** "$7.50" → { pre: "$", n: "7.50", post: "" }, or null when it is not one number. */
function seUnitParts(option: string): { pre: string; n: string; post: string } | null {
  const m = seMinus(option.trim()).match(/^(\D*?)(-?[\d.,/]+)(.*)$/)
  if (!m) return null
  const [, pre, n, post] = m
  if (!BUILDABLE.test(n) || !UNIT_PRE.test(pre) || !UNIT_POST.test(post)) return null
  return { pre, n, post }
}

/**
 * The same question, asked with tiles instead of three buttons — when its
 * answer is a number he can build. Anything else comes back untouched.
 */
export function seAsBuild(b: SeBlock): SeBlock {
  if (b.kind !== 'choice' || PICKS_FROM_OPTIONS.test(b.prompt) || SHOUTED_NOT.test(b.prompt)) return b
  const parts = b.options.map(seUnitParts)
  if (parts.some((p) => !p)) return b
  const ps = parts as { pre: string; n: string; post: string }[]
  const { pre, post } = ps[0]
  if (ps.some((p) => p.pre !== pre || p.post !== post)) return b
  const answer = ps[b.answer].n
  // The digits of the wrong answers, minus the ones he already has to have.
  const has = new Set([...answer])
  const decoys = [...new Set(ps.filter((_, i) => i !== b.answer).flatMap((p) => [...p.n]))]
    .filter((c) => !has.has(c))
    .slice(0, 3)
  return {
    kind: 'build',
    id: b.id,
    prompt: b.prompt,
    answer,
    decoys,
    why: b.why,
    ...(b.art ? { art: b.art } : {}),
    ...(b.steps ? { steps: b.steps } : {}),
    ...(b.lead ? { lead: b.lead } : {}),
    ...(pre || post ? { unit: { ...(pre ? { pre } : {}), ...(post ? { post } : {}) } } : {}),
    // Tiles take longer than three buttons, and the queue is sized off this.
    ...(b.secs ? { secs: Math.round(b.secs * 1.5) } : {}),
  }
}

/** The answer as it is printed and recorded: "$41", "3 °C" — unit and all. */
export function seBuilt(block: { answer?: string; unit?: { pre?: string; post?: string } }, value: string): string {
  return `${block.unit?.pre ?? ''}${value}${block.unit?.post ?? ''}`
}

/**
 * Is what he built the answer?
 *
 * Exact first, then by VALUE for a plain decimal: handed the tiles for "7.50"
 * he builds "7.5", which is the same number and the same understanding —
 * marking it wrong would teach him to count zeroes instead of doing maths.
 * Fractions are compared as text on purpose: "4/8" is not an answer to a
 * question that asked for lowest terms.
 */
export function seBuildRight(answer: string, built: string): boolean {
  if (built === answer) return true
  const plain = /^-?\d+(?:\.\d+)?$/
  return plain.test(answer) && plain.test(built) && Number(answer) === Number(built)
}

// --- Build-your-own-answer tiles (§24f) --------------------------------------

const FILLER = '0123456789'.split('')

/**
 * The hand of tiles for a `build` question: every character of the answer,
 * plus decoys, shuffled.
 *
 * He is given the answer in pieces on purpose. Typing on a blank keypad tests
 * handwriting and reading; rearranging tiles tests whether he knows what the
 * answer IS, which is the only thing we are asking about.
 */
export function seTiles(answer: string, decoys: string[] = []): string[] {
  const chars = [...answer]
  const want = Math.max(5, chars.length + 3)
  const tiles = [...chars, ...decoys]
  // Top up with digits the answer does not already contain, so a decoy never
  // quietly creates a second correct arrangement of the same characters.
  for (const d of shuffle(FILLER)) {
    if (tiles.length >= want) break
    if (!chars.includes(d)) tiles.push(d)
  }
  return shuffle(tiles)
}

function shuffle<T>(list: T[], rnd: () => number = Math.random): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * A shuffle that can be repeated — same seed, same order, for ever.
 *
 * It exists because of a bug that was invisible from the code and obvious to
 * the boy: in a review the player re-derives the card it is drawing from the
 * packs, and `commit` deep-clones his data on every write, so the memo that
 * holds the deck recomputed about once a minute (the clock banks its seconds
 * on a timer, §24d). Each recompute re-ran `seForFix` — and the three answer
 * buttons SILENTLY CHANGED PLACES under his finger, mid-question.
 *
 * Seeding it on the block id and the run fixes that at the source: whatever
 * re-renders, and however often, the order he is looking at is the order the
 * run dealt him, and a later review still gets a different one.
 */
function rngFor(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
