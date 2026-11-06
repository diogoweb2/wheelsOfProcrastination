// §14d — every chapter quiz, in the year's order. See ./build.ts.
import type { QuizQuestion } from '../../types'
import type { Se7Chapter, Se7Note } from './build'
import { HIST_A } from './histA'
import { HIST_B } from './histB'
import { LANG_AB } from './langAB'
import { LANG_CD } from './langCD'
import { SCI_AB } from './sciAB'
import { SCI_CD } from './sciCD'
import { GEO } from './geo'

const CHAPTERS: Se7Chapter[] = [...HIST_A, ...HIST_B, ...LANG_AB, ...LANG_CD, ...SCI_AB, ...SCI_CD, ...GEO]

export const SE7_SEED: QuizQuestion[] = CHAPTERS.flatMap((c) => c.questions)

const NOTES = new Map<string, Se7Note>(CHAPTERS.flatMap((c) => c.notes))

/** What a miss on this idea offers. */
export function se7Note(family: string): Se7Note | undefined {
  return NOTES.get(family)
}
