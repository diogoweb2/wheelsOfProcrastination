// 🏫 St. Eugene 7 — the world brief, for the scripts.
//
// One copy only, and it lives in `src/steugene/world.ts`, because the app
// itself generates cards too: Dad approves a "more questions" request and the
// result has to land in the same world as everything else on the tablet. A
// second copy in here would drift within a month.
import { fileURLToPath } from 'node:url'
import { loadTs } from './se-bundle.mjs'

const mod = await loadTs(fileURLToPath(new URL('../steugene-world.entry.ts', import.meta.url)))

export const { MATH_IDS, SUB_WORLDS, WORLD_KIT, WORLD_RULES } = mod
