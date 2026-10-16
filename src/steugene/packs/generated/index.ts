// 🏫 St. Eugene 7 — every generated pack, found by filename.
//
// Lazily, and that is the whole point. 105 packs is about 4 MB of lesson
// content; bundling it into the app would quadruple the download for everyone
// and push a single asset past the service worker's 2 MiB per-file precache
// limit, which costs the tablet its offline mode. Each pack is its own chunk
// instead, fetched the first time he opens that subtopic and precached after.
//
// `import.meta.glob` reads the directory at build time, so adding a pack is
// dropping a file in here — there is no list that can drift out of step.
import type { SePack } from '../../types'

const MODULES = import.meta.glob<{ pack: SePack }>('./*.ts')

const idOf = (path: string) => path.slice(2, -3) // './math-abs.ts' → 'math-abs'

/** Which subtopics have a generated pack. Ids only — this stays cheap. */
export const GENERATED_IDS: string[] = Object.keys(MODULES).map(idOf).filter((id) => id !== 'index')

export async function loadGenerated(id: string): Promise<SePack | null> {
  const load = MODULES[`./${id}.ts`]
  if (!load) return null
  return (await load()).pack
}
