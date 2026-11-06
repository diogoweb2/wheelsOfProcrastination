// §14d — Chapter quizzes: one per St. Eugene 7 subtopic, written by hand in
// session (CLAUDE.md: never by spending the app's OpenRouter key).
//
// The unit of writing is an IDEA, not a question. Each idea is one thing he
// should walk away knowing, and it is asked in two to four VERSIONS — the same
// fact from another side: forwards and backwards, as a scene, as a match, as a
// sequence. Training treats the versions as one idea (`sessionPool`), so a
// miss comes back in different clothes and he has to know the fact, not the
// card.
//
// What a miss teaches lives on the idea, in code, not in the Firestore bank:
// `explain` (a few short lines, read aloud on request) and `video` (a St.
// Eugene video id from `src/steugene/videoIndex.ts`, played in the same
// shielded player) with `watchFor`, the one thing to listen for. The bank only
// carries `family`, which is how a question finds its idea again. Keeping the
// notes here is what keeps the bank shard small (§14d, `src/store/cloud.ts`).
//
// IDS ARE PERMANENT. A question's id is its idea's key plus its position, and
// his history is filed under it. Add versions at the END of an idea, add ideas
// anywhere, and never rename a key or reorder versions — retire a bad version
// by marking it removed in the bank instead.
import type { QuizQuestion } from '../../types'
import { CHAPTER_PREFIX } from '../../logic/quiz'

const AT = '2026-11-05T00:00:00.000Z'

/** What a miss offers, shared by every version of one idea. */
export interface Se7Note {
  /** Two to four short lines. The idea itself, not this question's answer. */
  explain: string[]
  /** A St. Eugene video id (`hist-a-fur-v1`) — any chapter's, whichever teaches this best. */
  video?: string
  /** Shown above the video before it plays: the one thing to listen for (§24g). */
  watchFor?: string
}

type Extra = { why?: string; emoji?: string; image?: string }

/** A version before it is given its idea's id. */
type Draft = Omit<QuizQuestion, 'id' | 'topicId' | 'family' | 'seSubtopic' | 'createdAt' | 'status' | 'weight' | 'points'>

export interface Se7Chapter {
  subtopicId: string
  questions: QuizQuestion[]
  notes: [string, Se7Note][]
}

/** Answer first, then the distractors — the bank shuffles them and shows three. */
export function choice(prompt: string, answer: string, wrong: string[], x: Extra = {}): Draft {
  return { type: 'choice', prompt, answer, choices: [answer, ...wrong], funFact: x.why, emoji: x.emoji, image: x.image }
}

/** Tap a left card, then its partner. */
export function match(prompt: string, pairs: [string, string][], x: Extra = {}): Draft {
  return { type: 'match', prompt, pairs: pairs.map(([left, right]) => ({ left, right })), funFact: x.why, emoji: x.emoji }
}

/** Tap them in the right order. */
export function order(prompt: string, sequence: string[], x: Extra = {}): Draft {
  return { type: 'order', prompt, sequence, funFact: x.why, emoji: x.emoji }
}

/**
 * One chapter: `idea(key, note, versions)` for each thing worth knowing.
 * The versions' ids are `se7-<subtopic>-<key>-<n>`, counting from 1.
 */
export function chapter(subtopicId: string, ideas: [key: string, note: Se7Note, versions: Draft[]][]): Se7Chapter {
  const topicId = CHAPTER_PREFIX + subtopicId
  const questions: QuizQuestion[] = []
  const notes: [string, Se7Note][] = []
  for (const [key, note, versions] of ideas) {
    const family = `${topicId}-${key}`
    notes.push([family, note])
    versions.forEach((v, i) => {
      const q: QuizQuestion = {
        ...v,
        id: `${family}-${i + 1}`,
        topicId,
        family,
        seSubtopic: subtopicId,
        weight: 2,
        points: 10,
        status: 'active',
        createdAt: AT,
      }
      // Firestore rejects `undefined`, so an absent extra is absent, not undefined
      for (const k of Object.keys(q) as (keyof QuizQuestion)[]) if (q[k] === undefined) delete q[k]
      questions.push(q)
    })
  }
  return { subtopicId, questions, notes }
}
