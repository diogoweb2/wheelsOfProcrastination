// Loads the generated card catalog into the engine's index.
//
// The split matters: logic/optcg.ts is imported by the store (which every
// screen loads), while this module is imported only by the card game screen,
// which the router loads lazily. So the ~1 MB catalog ships as its own chunk
// and only to someone who actually opens the game.
import { registerCards, type OptcgCard } from './optcg'
import { OPTCG_CARDS, OPTCG_SETS, OPTCG_SET_NAMES } from './optcgCatalog.generated'

registerCards(OPTCG_CARDS)

export { OPTCG_CARDS, OPTCG_SETS, OPTCG_SET_NAMES }
export type { OptcgCard }
