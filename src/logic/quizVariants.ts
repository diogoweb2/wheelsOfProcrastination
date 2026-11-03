// Same question, many wordings (§14). Ben was passing on memory — he knew what
// the sentence LOOKED like and which phrase went with it, not the history. So a
// question can carry other wordings of its prompt and of its right answer
// (src/quiz/variants/), and every time it is shown it wears the next one.
//
// The rotation is driven by how many times this profile has already seen the
// question (`stat.seen`), so consecutive showings never wear the same pair, on
// any device, and a test shows the same thing the review and feedback will.
import type { QuizQuestion } from '../types'
import { ALL_SEEDS } from '../quiz/seeds'
import { QUESTION_VARIANTS } from '../quiz/variants'

const SEED_BY_ID = new Map(ALL_SEEDS.map((q) => [q.id, q]))

/**
 * Every wording of this question's prompt and right answer, the bank's own
 * first. Variants were written for the SEEDED wording: if the cloud copy has
 * since been edited (an AI review, a fix), the edit wins and that part stops
 * rotating rather than pairing a new prompt with an old answer.
 */
export function variantsOf(q: QuizQuestion): { prompts: string[]; answers: string[] } {
  const v = QUESTION_VARIANTS[q.id]
  const seed = SEED_BY_ID.get(q.id)
  const prompts = [q.prompt]
  if (v?.prompts && (!seed || seed.prompt === q.prompt)) prompts.push(...v.prompts.filter((p) => p && p !== q.prompt))
  const answers = q.answer ? [q.answer] : []
  if (q.type === 'choice' && q.answer && v?.answers && (!seed || seed.answer === q.answer)) {
    // an alternative right answer that is also a distractor would mark a right tap wrong
    const wrong = new Set((q.choices ?? []).filter((c) => c !== q.answer))
    answers.push(...v.answers.filter((a) => a && a !== q.answer && !wrong.has(a)))
  }
  return { prompts, answers }
}

/**
 * The question as it is shown THIS time: `turn` (usually `stat.seen`) picks the
 * prompt and the answer wording. The two walk at different paces so the pairs
 * don't lock together (prompt 2 isn't always shown with answer 2). The other
 * answer wordings are never offered as distractors — they are right too.
 */
export function showingOf(q: QuizQuestion, turn: number = Math.floor(Math.random() * 1000)): QuizQuestion {
  const { prompts, answers } = variantsOf(q)
  if (prompts.length < 2 && answers.length < 2) return q
  const prompt = prompts[turn % prompts.length]
  if (answers.length < 2) return { ...q, prompt }
  const answer = answers[(turn + Math.floor(turn / prompts.length)) % answers.length]
  const all = new Set(answers)
  const choices = [answer, ...(q.choices ?? []).filter((c) => !all.has(c))]
  return { ...q, prompt, answer, choices }
}

/** How many wordings a question rotates through — for the admin's question browser. */
export function wordingCount(q: QuizQuestion): { prompts: number; answers: number } {
  const { prompts, answers } = variantsOf(q)
  return { prompts: prompts.length, answers: answers.length }
}
