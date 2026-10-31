// Grade 7 — the St. Eugene year as Academy topics (§14). Shared builder.
//
// Each question names the St. Eugene 7 subtopic that TEACHES it (`seSubtopic`),
// so a miss offers that lesson. The quiz checks; St. Eugene teaches. The banks
// were written by hand in-session from the St. Eugene packs, not generated.
//
// Harder than the grade-6 banks on purpose: dates and names are asked straight,
// distractors are the neighbouring facts from the same chapter (the battle from
// the other war, the law from the other year), and about a fifth of each bank
// is match / put-in-order / type-it, which cannot be guessed by elimination.
import type { QuizQuestion } from '../types'

const AT = '2026-10-30T00:00:00.000Z'

type Extra = Partial<QuizQuestion> & { why?: string }

export function grade7(topicId: string) {
  const base = (id: string, se: string, prompt: string, extra: Extra): QuizQuestion => {
    const { why, ...rest } = extra
    return {
      id,
      topicId,
      type: 'choice',
      prompt,
      weight: 2,
      points: 10,
      status: 'active',
      createdAt: AT,
      seSubtopic: se,
      funFact: why,
      ...rest,
    }
  }
  return {
    /** Answer first, then the distractors — the bank shuffles them on screen. */
    choice: (id: string, se: string, prompt: string, answer: string, wrong: string[], extra: Extra = {}) =>
      base(id, se, prompt, { type: 'choice', answer, choices: [answer, ...wrong], ...extra }),
    write: (id: string, se: string, prompt: string, accept: string[], extra: Extra = {}) =>
      base(id, se, prompt, { type: 'write', accept, ...extra }),
    match: (id: string, se: string, prompt: string, pairs: [string, string][], extra: Extra = {}) =>
      base(id, se, prompt, { type: 'match', pairs: pairs.map(([left, right]) => ({ left, right })), ...extra }),
    order: (id: string, se: string, prompt: string, sequence: string[], extra: Extra = {}) =>
      base(id, se, prompt, { type: 'order', sequence, ...extra }),
  }
}
