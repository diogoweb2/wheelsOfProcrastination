// 🏫 St. Eugene 7 (§24) — the written lessons, by subtopic.
//
// Two sources, and the order matters. `WRITTEN` is hand-authored and always
// wins; everything else was seeded by `npm run se:seed` (§24k). Same shape,
// same validation, same player — the only difference is who typed it, and a
// generated pack that gets corrected by hand just moves up into this file.
//
// Generated packs load ON DEMAND (see ./generated), so reading a pack is
// asynchronous the first time and synchronous forever after. Call `ensurePack`
// before you need one; `packFor` answers from what is already in hand.
import type { SePack } from '../types'
import { rationalNumbers } from './rationalNumbers'
import { GENERATED_IDS, loadGenerated } from './generated'

/** Written by hand. Never overwritten by the seeder. */
const WRITTEN = new Map<string, SePack>([[rationalNumbers.subtopicId, rationalNumbers]])

const loaded = new Map<string, SePack>()

/** The pack, if it is already in memory. Null means "not here yet", not "none". */
export function packFor(subtopicId: string): SePack | null {
  return WRITTEN.get(subtopicId) ?? loaded.get(subtopicId) ?? null
}

/** Is there a pack for this subtopic at all? Answered without fetching it. */
export function hasPack(subtopicId: string): boolean {
  return WRITTEN.has(subtopicId) || GENERATED_IDS.includes(subtopicId)
}

/** Fetch it if we must, then keep it. Safe to call again — it is memoised. */
export async function ensurePack(subtopicId: string): Promise<SePack | null> {
  const have = packFor(subtopicId)
  if (have) return have
  const pack = await loadGenerated(subtopicId)
  if (pack) loaded.set(subtopicId, pack)
  return pack
}

/** Which subtopics have something written for them — the Subjects tab's ✍️ dot. */
export function writtenSubtopics(): Set<string> {
  return new Set([...WRITTEN.keys(), ...GENERATED_IDS])
}
