// The checks themselves. Bundled and run by `scripts/quiz-chapters-audit.mjs`.
//
// §14d — the chapter quizzes are written by hand, and a hand slips. PROBLEMS
// fail the run: a card he cannot finish, a video that does not exist, an idea
// with nowhere for a miss to come back to. TELLS are answers that can be
// guessed by their shape, which the app can only partly repair (`deTell`).
//
// It cannot judge whether an answer is TRUE. That is the verify pass, read by
// a person or in-session (§24l), never by spending the app's key (CLAUDE.md).
import { CHAPTER_SUBJECTS, CHAPTER_PREFIX } from '../src/logic/quiz'
import { SE7_SEED, se7Note } from '../src/quiz/se7'
import { SE_VIDEOS } from '../src/steugene/videoIndex'

const DOC_LIMIT = 1_048_576

export function audit(): boolean {
  const problems: string[] = []
  const tells: string[] = []
  const videos = new Set(SE_VIDEOS.map((v) => v.id))
  const ids = new Set<string>()
  const families = new Map<string, number>()
  let longest = 0
  let choices = 0

  for (const q of SE7_SEED) {
    if (ids.has(q.id)) problems.push(`${q.id}: duplicate id`)
    ids.add(q.id)
    families.set(q.family!, (families.get(q.family!) ?? 0) + 1)
    if (!q.funFact && q.type !== 'choice') tells.push(`${q.id}: no why`)

    if (q.type === 'choice') {
      const wrong = (q.choices ?? []).filter((c) => c !== q.answer)
      if (!q.choices?.includes(q.answer!)) problems.push(`${q.id}: the answer is not an option`)
      if (wrong.length < 3) problems.push(`${q.id}: ${wrong.length} distractors — three shown needs a pool that varies`)
      if (new Set(q.choices).size !== q.choices?.length) problems.push(`${q.id}: duplicate option`)
      const top = Math.max(...wrong.map((c) => c.length))
      choices++
      if (q.answer!.length > top) longest++
      if (q.answer!.length > top * 1.25 && q.answer!.length > 16) tells.push(`${q.id}: answer ${q.answer!.length} chars, longest distractor ${top}`)
    }
    if (q.type === 'match') {
      const pairs = q.pairs ?? []
      // MatchQ pairs by TEXT, so two equal right-hand cards can never both be placed
      if (new Set(pairs.map((p) => p.right)).size !== pairs.length) problems.push(`${q.id}: two matches share a right-hand card`)
      if (new Set(pairs.map((p) => p.left)).size !== pairs.length) problems.push(`${q.id}: two matches share a left-hand card`)
      if (pairs.length < 2) problems.push(`${q.id}: a match needs two pairs`)
    }
    if (q.type === 'order' && (q.sequence?.length ?? 0) < 3) problems.push(`${q.id}: an order needs three items`)
  }

  for (const [family, n] of families) {
    const note = se7Note(family)
    if (n < 2) problems.push(`${family}: one version — a miss has nothing else to come back as`)
    if (!note) problems.push(`${family}: no note`)
    else {
      if (note.explain.length < 2 || note.explain.length > 5) problems.push(`${family}: ${note.explain.length} explain lines`)
      if (!note.video) problems.push(`${family}: no video`)
      else if (!videos.has(note.video)) problems.push(`${family}: no such video ${note.video}`)
    }
  }

  const missing: string[] = []
  let chapters = 0
  for (const subject of CHAPTER_SUBJECTS) {
    for (const strand of subject.strands) {
      for (const sub of strand.subtopics) {
        chapters++
        const fams = [...families.keys()].filter((f) => f.startsWith(`${CHAPTER_PREFIX}${sub.id}-`))
        if (fams.length === 0) missing.push(sub.id)
        else if (fams.length < 4) problems.push(`${sub.id}: ${fams.length} ideas`)
      }
    }
  }

  const bytes = new TextEncoder().encode(JSON.stringify(SE7_SEED)).length
  if (bytes > DOC_LIMIT * 0.9) problems.push(`the shard is ${bytes} bytes — over 90% of a Firestore document`)

  for (const t of tells) console.log(`tell     ${t}`)
  for (const p of problems) console.log(`PROBLEM  ${p}`)
  console.log(
    `\n${chapters - missing.length}/${chapters} chapters written · ${families.size} ideas · ${SE7_SEED.length} questions · ${Math.round(bytes / 1024)} KB of the shard`,
  )
  console.log(`answer is the longest option on ${Math.round((longest / Math.max(choices, 1)) * 100)}% of choice questions (fair is ~20%)`)
  if (missing.length) console.log(`not written: ${missing.join(' ')}`)
  console.log(`${problems.length} problems, ${tells.length} tells`)
  return problems.length === 0
}
