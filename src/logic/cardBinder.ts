// The One Piece Album — the second collection: every card printed for the ONE PIECE
// Card Game, collected the same way the Sticker Album is collected.
//
// Same rules, bigger pile: packs, duplicates, the daily free pack, the
// 1-red-is-worth-2-whites swap and the race against the other crewmate all come
// from logic/collections.ts. This file is only the binder's own numbers and
// where its pictures come from.
//
// **Nothing is stored on our server.** The pictures are the same hotlinked
// mirrors the card game uses (logic/optcg.ts), primary plus fallback.
//
// Imported ONLY by the binder screen, which the router loads lazily: it pulls
// in the ~1 MB card catalog, and nobody who never opens the binder should pay
// for it. The store gets by with cardBinderIndex.generated.ts instead.
import { artFallbackUrl, artUrl } from './optcg'
import { OPTCG_CARDS, OPTCG_SET_NAMES } from './optcgCards'
import { CARD_SPECIAL_SET } from './cardBinderIndex.generated'
import type { CollectionKit, CollectItem, CollectRarity } from './collections'

/** Berries a pack costs — the album's price, for the album's game. */
export const CARD_PACK_COST = 70
export const CARD_PACK_SIZE = 7
/**
 * Chance a slot rolls off the rare shelf. Lower than the album's 6% on purpose:
 * the rare tiers are ~18% of this catalog against the album's handful, so the
 * same 6% would make rares routine. At 4% a 7-card pack is a ~1-in-4 rare.
 */
export const CARD_SPECIAL_CHANCE = 0.04
export const CARD_REPEAT_FLOOR = 0.4
/** A named card you actually need, in Berries. Same scale as the album. */
export const CARD_GEMS_PER_POINT = 25

const setOf = (code: string) => code.slice(0, code.lastIndexOf('-'))

const items: CollectItem[] = OPTCG_CARDS.map((c) => ({
  id: c.code,
  name: c.name,
  rarity: (CARD_SPECIAL_SET.has(c.code) ? 'special' : 'common') as CollectRarity,
  group: setOf(c.code),
  img: artUrl(c.code),
  imgFallback: artFallbackUrl(c.code),
}))

/** Starter decks first is wrong here — collectors think in booster sets. */
const groupOrder = (id: string) => (id.startsWith('OP') ? 0 : id.startsWith('EB') ? 1 : id.startsWith('PRB') ? 2 : id.startsWith('ST') ? 3 : 4)

const groups = [...new Set(items.map((i) => i.group))]
  .sort((a, b) => groupOrder(a) - groupOrder(b) || a.localeCompare(b))
  // Names come off the publisher's own series list at build time, so a shelf is
  // never labelled with a bare code like "ST07".
  .map((id) => ({ id, name: OPTCG_SET_NAMES[id] ?? id, emoji: '🎴' }))

export const CARD_BINDER: CollectionKit = {
  id: 'cards',
  slice: 'cards',
  name: 'One Piece Album',
  emoji: '🎴',
  items,
  groups,
  packCost: CARD_PACK_COST,
  packSize: CARD_PACK_SIZE,
  specialChance: CARD_SPECIAL_CHANCE,
  repeatFloor: CARD_REPEAT_FLOOR,
  gemsPerPoint: CARD_GEMS_PER_POINT,
}

const BY_ID = new Map(items.map((i) => [i.id, i]))
export const binderItem = (id: string): CollectItem | undefined => BY_ID.get(id)
