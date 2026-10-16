// 🏫 St. Eugene 7 (§24) — the written lessons, by subtopic.
//
// Adding a pack is one import and one line. A subtopic with no pack still
// works: its page offers the Finder, the report and the "ask Dad for some
// questions" button (§24h), which is exactly what an un-written unit should
// look like rather than a dead end.
import type { SePack } from '../types'
import { rationalNumbers } from './rationalNumbers'

const ALL: SePack[] = [rationalNumbers]

const BY_ID = new Map(ALL.map((p) => [p.subtopicId, p]))

export function packFor(subtopicId: string): SePack | null {
  return BY_ID.get(subtopicId) ?? null
}

/** Which subtopics have something written for them — the Subjects tab's ✍️ dot. */
export function writtenSubtopics(): Set<string> {
  return new Set(BY_ID.keys())
}
