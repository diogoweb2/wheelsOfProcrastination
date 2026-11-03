// 🏫 St. Eugene 7 (§24ad) — 📝 the tests he has actually sat.
//
// One file per paper, listed here NEWEST FIRST, which is also the order the
// 📝 Tests tab draws them in. The list is written out rather than globbed
// because that order is editorial: a glob would sort them by filename and the
// paper he sat last week would end up under the one from September.
//
// Adding the next test is three steps and no code:
//   1. `cp math-test-2.ts math-test-3.ts` and write it — the misses only,
//      each with its `lead` explain card and a walk-through on DIFFERENT
//      numbers (§24f). `id` is `test-math-3`; block ids are `t3-…`.
//   2. Add it to the top of `SE_TESTS` below.
//   3. Nothing else. The pack loader (`../packs`), the lesson player, the
//      locks, 🔁 Review, the Report and Dad's notes all key off this list.
//
// A block id, once he has answered it, is permanent — renaming one orphans
// the miss that points at it (§24b).
import type { SeTest } from '../types'
import { test as mathTest2 } from './math-test-2'

/** Newest first. */
export const SE_TESTS: SeTest[] = [mathTest2]

export const SE_TEST_IDS: string[] = SE_TESTS.map((t) => t.id)

export function seTestById(id: string): SeTest | null {
  return SE_TESTS.find((t) => t.id === id) ?? null
}

/** The paper a question came off, by block id — what Dad's notes are keyed on. */
export function seTestOf(blockId: string): SeTest | null {
  return SE_TESTS.find((t) => t.questions.some((q) => q.id === blockId)) ?? null
}
