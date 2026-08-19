// The decks the game ships with.
//
// Both are the printed starter decks, rebuilt to the legal 50: ST-01 (Straw Hat
// Crew, Red) and ST-02 (Worst Generation, Green). They are the pair whose card
// text logic/optcgEffects.ts actually knows how to run, so a match between them
// plays itself end to end with no honour system.
//
// Every other card in the catalog is still buildable in the deckbuilder — see
// BUSINESS_REQUIREMENTS: the roster grows one starter deck at a time, and a new
// preset here plus its entries in optcgEffects.ts is the whole job.
import type { OptcgDeck } from './optcg'

/** `['ST01-002', 4]` → four copies. Keeps the lists readable. */
type Slot = [string, number]

const build = (id: string, name: string, leader: string, slots: Slot[]): OptcgDeck => ({
  id,
  name,
  leader,
  cards: slots.flatMap(([code, n]) => Array<string>(n).fill(code)),
})

export const OPTCG_PRESETS: OptcgDeck[] = [
  build('st01', 'Straw Hat Crew', 'ST01-001', [
    ['ST01-002', 4], ['ST01-003', 4], ['ST01-004', 4], ['ST01-005', 4],
    ['ST01-006', 4], ['ST01-007', 4], ['ST01-008', 4], ['ST01-009', 2],
    ['ST01-010', 2], ['ST01-011', 4], ['ST01-012', 2], ['ST01-013', 4],
    ['ST01-014', 4], ['ST01-015', 2], ['ST01-016', 1], ['ST01-017', 1],
  ]),
  build('st02', 'Worst Generation', 'ST02-001', [
    ['ST02-002', 4], ['ST02-003', 4], ['ST02-004', 4], ['ST02-005', 4],
    ['ST02-006', 2], ['ST02-007', 4], ['ST02-008', 4], ['ST02-009', 2],
    ['ST02-010', 2], ['ST02-011', 4], ['ST02-012', 4], ['ST02-013', 2],
    ['ST02-014', 4], ['ST02-015', 4], ['ST02-016', 1], ['ST02-017', 1],
  ]),
]

export const presetById = (id: string): OptcgDeck | undefined => OPTCG_PRESETS.find((d) => d.id === id)
