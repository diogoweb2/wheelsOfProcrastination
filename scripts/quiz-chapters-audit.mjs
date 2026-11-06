// §14d — `npm run quiz:audit`. Structural checks on the hand-written chapter
// quizzes. Costs nothing and touches nothing: it reads the code and prints.
import { fileURLToPath } from 'node:url'
import { loadTs } from './lib/se-bundle.mjs'

const { audit } = await loadTs(fileURLToPath(new URL('./quiz-chapters-audit.entry.ts', import.meta.url)))
process.exit(audit() ? 0 : 1)
