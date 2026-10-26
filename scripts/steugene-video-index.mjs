// 🏫 St. Eugene 7 (§24z) — rebuild the 🎬 shelf's index: `npm run se:video-index`
//
// Run it after adding or changing a video in any pack. It reads the packs the
// app reads (TypeScript, so Vite bundles them first — see lib/se-bundle.mjs)
// and rewrites `src/steugene/videoIndex.ts`. It touches nothing else, spends
// nothing, and asks no API anything.
import { fileURLToPath } from 'node:url'
import { loadTs } from './lib/se-bundle.mjs'

// The entry is bundled into a temp directory, so it cannot work out where the
// repo is from its own `import.meta.url`. This file can, so it hands it over.
const out = fileURLToPath(new URL('../src/steugene/videoIndex.ts', import.meta.url))
const { writeIndex } = await loadTs(fileURLToPath(new URL('./steugene-video-index.entry.ts', import.meta.url)))
await writeIndex(out)
