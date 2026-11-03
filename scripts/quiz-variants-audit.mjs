// 🔁 Check the quiz's question/answer wordings: `npm run quiz:variants`
// (add --verbose to list Diogo's banks too). Reads code only, spends nothing.
// See scripts/quiz-variants-audit.entry.ts for what it checks.
import { fileURLToPath } from 'node:url'
import { loadTs } from './lib/se-bundle.mjs'

const { audit } = await loadTs(fileURLToPath(new URL('./quiz-variants-audit.entry.ts', import.meta.url)))
process.exit(audit(process.argv.includes('--verbose')) ? 0 : 1)
