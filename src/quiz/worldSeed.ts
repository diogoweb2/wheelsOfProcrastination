// Where Is This? (§14f) — South America, Africa, Asia & Oceania: same quiz as
// Europe. Where each country is, then its capital both ways. Capitals checked
// against a reference list when written; they do move (Equatorial Guinea, 2026).
//
// These live in their own Firestore document, app/quizBankWorld: `app/quizBank`
// was already ~770 KB of its 1 MB ceiling. Any topic whose id starts with
// WORLD_PREFIX lands there (src/store/cloud.ts).
import type { QuizQuestion } from '../types'
import { AFRICA_COUNTRIES, ASIA_COUNTRIES, OCEANIA_COUNTRIES, SOUTH_AMERICA_COUNTRIES } from './maps/names'
import { placesAndCapitals } from './whereIsSeed'

export const WORLD_SEED: QuizQuestion[] = [
  ...placesAndCapitals('world-south-america', 'samerica', 'ws', 'country', SOUTH_AMERICA_COUNTRIES),
  ...placesAndCapitals('world-africa', 'africa', 'wf', 'country', AFRICA_COUNTRIES),
  // one quiz, two maps: a single drawing from Turkey to Samoa would make everything too small to tap
  ...placesAndCapitals('world-asia-oceania', 'asia', 'wa', 'country', ASIA_COUNTRIES),
  ...placesAndCapitals('world-asia-oceania', 'oceania', 'wo', 'country', OCEANIA_COUNTRIES),
]
