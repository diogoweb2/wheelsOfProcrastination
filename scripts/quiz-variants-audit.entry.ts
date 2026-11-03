// The checks behind `npm run quiz:variants`. Bundled and run by
// `scripts/quiz-variants-audit.mjs`. Spends nothing — it reads code only.
//
// PROBLEMS fail the run: a variant for a question that doesn't exist, a "right
// answer" wording that is also one of the distractors (a right tap marked
// wrong), an answer wording that towers over every distractor (§14 no length
// tell — guessable without knowing anything).
// COVERAGE is the backlog: how much of each bank still has only one wording.
import { ALL_SEEDS } from '../src/quiz/seeds'
import { QUESTION_VARIANTS } from '../src/quiz/variants'
import { topicById } from '../src/logic/quiz'

/** Same bar as `pickChoiceOptions`' de-tell: the answer may be at most this much longer than the longest distractor. */
const TOWER = 1.35

export function audit(verbose = false): boolean {
  const problems: string[] = []
  const byId = new Map(ALL_SEEDS.map((q) => [q.id, q]))

  for (const [id, v] of Object.entries(QUESTION_VARIANTS)) {
    const q = byId.get(id)
    if (!q) { problems.push(`${id}: no seeded question has this id`); continue }
    const prompts = [q.prompt, ...(v.prompts ?? [])]
    if (new Set(prompts.map((p) => p.toLowerCase())).size !== prompts.length) problems.push(`${id}: two prompt wordings are the same`)
    if (v.answers?.length) {
      if (q.type !== 'choice') { problems.push(`${id}: answers only rotate on choice questions (this is ${q.type})`); continue }
      const wrong = (q.choices ?? []).filter((c) => c !== q.answer)
      const longest = Math.max(...wrong.map((c) => c.length))
      for (const a of v.answers) {
        if (wrong.some((c) => c.toLowerCase() === a.toLowerCase())) problems.push(`${id}: answer wording “${a}” is also a distractor`)
        if (a.length > longest * TOWER && a.length - longest > 8) problems.push(`${id}: answer wording “${a}” (${a.length}) towers over the longest distractor (${longest})`)
      }
      const answers = [q.answer, ...v.answers]
      if (new Set(answers.map((a) => a!.toLowerCase())).size !== answers.length) problems.push(`${id}: two answer wordings are the same`)
    }
  }

  const topics = new Map<string, { total: number; varied: number }>()
  for (const q of ALL_SEEDS) {
    const t = topics.get(q.topicId) ?? { total: 0, varied: 0 }
    t.total++
    if ((QUESTION_VARIANTS[q.id]?.prompts?.length ?? 0) > 0) t.varied++
    topics.set(q.topicId, t)
  }
  console.log('🔁 Question wordings per bank (questions with at least one other wording):')
  for (const [id, t] of topics) {
    const topic = topicById(id)
    if (!verbose && topic?.owner !== 'ben') continue
    const mark = t.varied === t.total ? '✅' : t.varied ? '🟡' : '⬜'
    console.log(`  ${mark} ${id.padEnd(22)} ${String(t.varied).padStart(3)}/${t.total}${topic?.comingSoon ? '  (coming soon)' : ''}`)
  }

  if (problems.length) {
    console.log(`\n❌ ${problems.length} problem(s):`)
    for (const p of problems) console.log('  - ' + p)
    return false
  }
  console.log('\n✅ No problems.')
  return true
}
