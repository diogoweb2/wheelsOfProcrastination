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

/** Allowed lesson lengths, in minutes. The middle one is the default. */
export const SE_LENGTHS = [30, 40, 60] as const

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

  const out: SeBlock[] = []
  let budget = 0
  const take = (from: SeBlock[]) => {
    const b = from.shift()
    if (!b) return false
    out.push(b)
    budget += seBlockSeconds(b)
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
    .slice(0, SE_WARM_MAX)
    .map((a) => askable.get(a.id)!)
}

/**
 * He is working faster than the plan: one more block, please.
 *
 * Weighted towards questions, because that is what the report is made of and
 * what he is actually here to practise — but it will hand back a read or a
 * game rather than nothing.
 */
export function seTopUp(available: SeBlock[], used: string[]): SeBlock | null {
  const usedSet = new Set(used)
  const left = available.filter((b) => !usedSet.has(b.id))
  if (!left.length) return null
  const questions = left.filter(seIsQuestion)
  const pool = questions.length >= 2 ? questions : left
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Everything that could be served for a subtopic: the pack plus anything the AI added. */
export function seAvailable(pack: SePack | null, generated: SeBlock[]): SeBlock[] {
  const seen = new Set<string>()
  const out: SeBlock[] = []
  for (const b of [...(pack?.core ?? []), ...(pack?.extra ?? []), ...generated]) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    out.push(b)
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
 */
export function seFixGroups(locks: SeFixLock[]): { subtopicId: string; left: SeAnswer[] }[] {
  const groups = new Map<string, SeAnswer[]>()
  for (const lock of [...locks].sort((a, b) => a.at - b.at)) {
    if (!lock.allowedAt || lock.clearedAt) continue
    const left = seLockLeft(lock)
    if (left.length) groups.set(lock.subtopicId, [...(groups.get(lock.subtopicId) ?? []), ...left])
  }
  return [...groups].map(([subtopicId, left]) => ({ subtopicId, left }))
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

function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
