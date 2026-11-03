// Every bundled question bank, in one list. cloud.ts seeds Firestore from it (only
// ids the cloud doesn't have yet), and the variant layer (src/logic/quizVariants.ts)
// checks a question still reads as seeded before it rotates its wording.
import type { QuizQuestion } from '../types'
import { CANADA_GEOGRAPHY_SEED } from './canadaGeographySeed'
import { CANADA_GEOGRAPHY_2_SEED } from './canadaGeography2Seed'
import { CANADA_HISTORY_SEED } from './canadaHistorySeed'
import { ONTARIO_GEOGRAPHY_SEED } from './ontarioGeographySeed'
import { TORONTO_GEOGRAPHY_SEED } from './torontoGeographySeed'
import { AI_DEV_SEED } from './aiDevSeed'
import { AGENTS_SEED } from './agentsSeed'
import { SCIENCE_6_SEED } from './science6Seed'
import { CRITICAL_THINKING_6_SEED } from './criticalThinking6Seed'
import { LOGIC_6_SEED } from './logic6Seed'
import { G7_HIST_A_SEED } from './g7HistASeed'
import { G7_HIST_B_SEED } from './g7HistBSeed'
import { G7_SCI_A_SEED } from './g7SciASeed'
import { G7_SCI_B_SEED } from './g7SciBSeed'
import { G7_GEO_SEED } from './g7GeoSeed'

export const ALL_SEEDS: QuizQuestion[] = [
  ...CANADA_GEOGRAPHY_SEED,
  ...CANADA_GEOGRAPHY_2_SEED,
  ...CANADA_HISTORY_SEED,
  ...ONTARIO_GEOGRAPHY_SEED,
  ...TORONTO_GEOGRAPHY_SEED,
  ...AI_DEV_SEED,
  ...AGENTS_SEED,
  ...SCIENCE_6_SEED,
  ...CRITICAL_THINKING_6_SEED,
  ...LOGIC_6_SEED,
  ...G7_HIST_A_SEED,
  ...G7_HIST_B_SEED,
  ...G7_SCI_A_SEED,
  ...G7_SCI_B_SEED,
  ...G7_GEO_SEED,
]
