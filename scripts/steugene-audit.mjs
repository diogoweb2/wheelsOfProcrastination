// 🏫 St. Eugene 7 — check every pack before he meets it: `npm run se:audit`
//
// A broken lesson card is worse than a missing one: he cannot tell a question
// with no right answer from a question he does not understand, so he sits
// there failing it and concludes he is bad at the subject. This catches the
// mechanical half of that — three options, an answer that exists, tiles that
// can actually spell the answer, a walk-through on every question, a YouTube
// id of the right shape, and a bench long enough for the longest lesson.
//
// The checks are TypeScript (they share the app's own types), so Vite — which
// is already here — bundles them to a temp file and we import that. No loader
// flag, no extra dependency.
import { build } from 'vite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const entry = fileURLToPath(new URL('./steugene-audit.entry.ts', import.meta.url))
const outDir = mkdtempSync(join(tmpdir(), 'se-audit-'))

await build({
  configFile: false,
  logLevel: 'error',
  build: {
    ssr: entry,
    outDir,
    emptyOutDir: false,
    minify: false,
    rollupOptions: { output: { entryFileNames: 'audit.mjs', format: 'es' } },
  },
})

const { audit } = await import(pathToFileURL(join(outDir, 'audit.mjs')).href)
process.exit(audit() ? 0 : 1)
