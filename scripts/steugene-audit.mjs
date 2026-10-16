// 🏫 St. Eugene 7 — check every pack before he meets it: `npm run se:audit`
//
// A broken lesson card is worse than a missing one: he cannot tell a question
// with no right answer from a question he does not understand, so he sits
// there failing it and concludes he is bad at the subject. This catches the
// mechanical half of that — three options, an answer that exists, tiles that
// can actually spell the answer, a walk-through on every question, a YouTube
// id of the right shape, and a bench long enough for the longest lesson.
//
// The checks are TypeScript (they share the app's own types), so `loadTs`
// bundles them with Vite and imports the result. No loader flag, no extra
// dependency.
import { fileURLToPath } from 'node:url'
import { loadTs } from './lib/se-bundle.mjs'

const { audit } = await loadTs(fileURLToPath(new URL('./steugene-audit.entry.ts', import.meta.url)))
process.exit((await audit(process.argv.includes('--verbose'))) ? 0 : 1)
