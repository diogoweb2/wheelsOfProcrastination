// 🏫 St. Eugene 7 (§24) — the written lessons, by subtopic.
//
// Two sources, and the order matters. `./written/` is authored by hand and
// always wins; `./generated/` was seeded by `npm run se:seed` (§24k). Same
// shape, same validation, same player — the only difference is who typed it.
// Every maths subtopic is hand-written (§24n); correcting any other generated
// pack by hand is just moving its file up into `./written/`.
//
// Both kinds load ON DEMAND, each pack its own chunk (§24k), so reading a pack
// is asynchronous the first time and synchronous forever after. Call
// `ensurePack` before you need one; `packFor` answers from what is in hand.
import type { SePack } from '../types'
import { GENERATED_IDS, loadGenerated } from './generated'
import { SE_TESTS } from '../tests'

/** Written by hand, found by filename. Never overwritten by the seeder. */
const WRITTEN = import.meta.glob<{ pack: SePack }>('./written/*.ts')

/**
 * 📝 The tests (§24ad). Each one carries its own pack, keyed by the test id,
 * so `ensurePack('test-math-2')` answers like any other subtopic and every
 * route into a lesson works on a test with no special case.
 *
 * They are here rather than in `./written/` because a test is not a chapter
 * of the year: it is findable by id and absent from the map (`SE_SUBJECTS`).
 * In memory from the start — there are a handful of them and they are small.
 */
const TESTS = new Map<string, SePack>(SE_TESTS.map((t) => [t.id, t.pack]))

/** './written/math-abs.ts' → 'math-abs' */
const idOf = (path: string) => path.slice('./written/'.length, -3)

export const WRITTEN_IDS: string[] = Object.keys(WRITTEN).map(idOf)

const loaded = new Map<string, SePack>()

/** The pack, if it is already in memory. Null means "not here yet", not "none". */
export function packFor(subtopicId: string): SePack | null {
  return TESTS.get(subtopicId) ?? loaded.get(subtopicId) ?? null
}

/** Is there a pack for this subtopic at all? Answered without fetching it. */
export function hasPack(subtopicId: string): boolean {
  return TESTS.has(subtopicId) || WRITTEN_IDS.includes(subtopicId) || GENERATED_IDS.includes(subtopicId)
}

/** Fetch it if we must, then keep it. Safe to call again — it is memoised. */
export async function ensurePack(subtopicId: string): Promise<SePack | null> {
  const have = packFor(subtopicId)
  if (have) return have
  const byHand = WRITTEN[`./written/${subtopicId}.ts`]
  const pack = byHand ? (await byHand()).pack : await loadGenerated(subtopicId)
  if (pack) loaded.set(subtopicId, pack)
  return pack
}

/** Which subtopics have something written for them — the Subjects tab's ✍️ dot. */
export function writtenSubtopics(): Set<string> {
  return new Set([...WRITTEN_IDS, ...GENERATED_IDS])
}
