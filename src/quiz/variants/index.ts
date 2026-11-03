// Other wordings of the same question, and of its right answer (§14 "Same
// question, many wordings"). One file per bank, keyed by question id; the
// rotation itself lives in src/logic/quizVariants.ts.
//
// Why this lives in CODE and not in the Firestore bank: seeding only adds ids
// the cloud doesn't have yet, so a variant written into a seed would never reach
// a question that is already live — and the bank is one document with a 1MB
// ceiling. Same reasoning as the lessons.
//
// Writing them (CLAUDE.md, "Quiz questions come in several wordings"):
//  - `prompts` ask the SAME thing another way — a different sentence, not the
//    same sentence with one word swapped — and the answer must stay the same.
//  - `answers` (choice only) say the SAME right answer another way. Each must
//    read like the distractors (same length, grammar, detail: §14 no length
//    tell) and must never be true of a distractor.
//  - write-ins already take several spellings in `accept`; match and order keep
//    their pairs/sequence, so those carry `prompts` only.
export interface QuestionVariants {
  prompts?: string[] // alternatives to q.prompt (the seed's own wording is always one of the rotation)
  answers?: string[] // alternatives to q.answer, for choice questions
}

export type VariantBank = Record<string, QuestionVariants>

export const QUESTION_VARIANTS: VariantBank = {}
