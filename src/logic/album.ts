// The Grand Line Sticker Album — pack odds, trade values and album math.
// Catalog + crews are generated from assets/Album/ by `npm run stickers`.
import { STICKER_CATALOG, STICKER_CREWS, type StickerDef } from './stickerCatalog.generated'
import {
  type CollectionKit,
  type CollectRarity,
  isBalancedIn,
  offerValueIn,
  ownedIdsIn,
  ownsIn,
  progressIn,
  rollPackIn,
  spareCountIn,
  sparesIn,
  tradeableIn,
  TRADE_VALUE as COLLECT_TRADE_VALUE,
} from './collections'
import type { AlbumState, StickerTrade } from '../types'

export { STICKER_CATALOG, STICKER_CREWS }
export type { StickerDef }

export const PACK_COST = 70 // Berries per pack
export const PACK_SIZE = 7 // stickers per pack
/**
 * Chance any given sticker in a pack is a red rare. At ~6% a 7-card pack has
 * roughly a 1-in-3 shot of holding a red, so pulling one still feels like an
 * event rather than routine.
 */
export const SPECIAL_CHANCE = 0.06
/**
 * Minimum share of a pack that is deliberately a duplicate of something you
 * already own. Trading is the point of the album, so both crews need spare
 * cards early instead of only once the album is nearly full.
 */
export const REPEAT_FLOOR = 0.4
/** A red rare is worth two whites in a swap. Shared with the One Piece Album. */
export const TRADE_VALUE = COLLECT_TRADE_VALUE
/**
 * What one point of swap value is *roughly* worth in Berries. Only a hint on
 * the scale — a Berry offer is never blocked for being low, because haggling
 * over it is the whole point. A pack is 70 for 7 random cards; a named card you
 * actually need is worth more than a random one, hence 25 rather than 10.
 */
export const GEMS_PER_POINT = 25
/** What a free pack thrown into a swap is worth on the same scale. */
export const PACK_HINT_VALUE = PACK_COST

export const stickerUrl = (id: string) => `/stickers/${id}.webp`

const BY_ID = new Map(STICKER_CATALOG.map((s) => [s.id, s]))
export const stickerById = (id: string): StickerDef | undefined => BY_ID.get(id)

/**
 * The album as a collection kit — the same shape the One Piece Album uses, so the
 * rules (packs, spares, swap value, the race) are written once in
 * logic/collections.ts and this file is only the album's own numbers.
 */
export const STICKER_KIT: CollectionKit = {
  id: 'stickers',
  slice: 'album',
  name: 'Sticker Album',
  emoji: '🖼️',
  items: STICKER_CATALOG.map((s) => ({
    id: s.id,
    name: s.name,
    rarity: s.rarity,
    group: s.crew,
    img: stickerUrl(s.id),
  })),
  groups: STICKER_CREWS.map((c) => ({ id: c.id, name: c.name, flag: c.flag })),
  packCost: PACK_COST,
  packSize: PACK_SIZE,
  specialChance: SPECIAL_CHANCE,
  repeatFloor: REPEAT_FLOOR,
  gemsPerPoint: GEMS_PER_POINT,
}

const rarityOfSticker = (id: string): CollectRarity => stickerById(id)?.rarity ?? 'common'

export function defaultAlbumState(): AlbumState {
  return { counts: {}, packsOpened: 0, lastFreePackDay: null, trades: [], packCredits: 0 }
}

/** Every sticker id the album can hold, in catalog (crew-grouped) order. */
export const ALL_STICKER_IDS = STICKER_CATALOG.map((s) => s.id)

export const ownedIds = (a: AlbumState) => ownedIdsIn(a)
export const ownsSticker = (a: AlbumState, id: string) => ownsIn(a, id)
/** Copies beyond the one glued into the album — these are the tradeable pile. */
export const spareCount = (a: AlbumState, id: string) => spareCountIn(a, id)

export const albumProgress = (a: AlbumState) => progressIn(STICKER_KIT, a)

/** Spare cards, catalog order, with how many copies are going spare. */
export function spares(a: AlbumState): { sticker: StickerDef; count: number }[] {
  return sparesIn(STICKER_KIT, a).map(({ item, count }) => ({ sticker: stickerById(item.id) as StickerDef, count }))
}

/** Cards `wanter` is still missing that `holder` can spare — the "I can help you" list. */
export function tradeableFor(holder: AlbumState, wanter: AlbumState): StickerDef[] {
  return tradeableIn(STICKER_KIT, holder, wanter).map((i) => stickerById(i.id) as StickerDef)
}

/** Roll one pack out of the album's pool. The rules live in logic/collections.ts. */
export const rollPack = (album: AlbumState, size = PACK_SIZE): string[] => rollPackIn(STICKER_KIT, album, size)

/** Total swap value of a side of a trade (red = 2, white = 1). */
export const offerValue = (ids: string[]): number => offerValueIn(rarityOfSticker, ids)

/** A trade is fair when both sides carry the same swap value. */
export const isBalanced = (give: string[], want: string[]) => isBalancedIn(rarityOfSticker, give, want)

export const isPendingTrade = (t: StickerTrade) => t.status === 'pending'

// --- haggling ---------------------------------------------------------------
//
// Berries and the free pack exist for the "I have nothing you need" case, and
// they deliberately have no fixed price: the counter-offer loop is the price.
// These readers all default the fields, because trades written before haggling
// existed are still sitting in the shared doc.

/** Berries on the table in this offer. */
export const tradeGems = (t: StickerTrade) => Math.max(0, Math.round(t.giveGems ?? 0))
/** Does this offer carry anything other than cards? */
export const hasSweetener = (t: StickerTrade) => tradeGems(t) > 0 || t.givePack === true
/** Whose answer the offer is waiting on right now. */
export const tradeTurnId = (t: StickerTrade) => ((t.turn ?? 'to') === 'to' ? t.toId : t.fromId)
/** Is this offer sitting in `profileId`'s court? */
export const awaitsAnswer = (t: StickerTrade, profileId: string | null) =>
  t.status === 'pending' && !!profileId && tradeTurnId(t) === profileId
/** Haggle round — 0 on the original offer, +1 per counter. */
export const tradeRound = (t: StickerTrade) => t.round ?? 0

/**
 * A ballpark Berry price for what's being asked for — shown as a hint on the
 * scale, never enforced. A red counts double, same as in a card swap.
 */
export const gemHint = (wantIds: string[]) => offerValue(wantIds) * GEMS_PER_POINT

/**
 * What the proposer's side is worth on the Berry scale, so the ⚖️ can say
 * "generous" / "a bit light" without ever blocking the Send button.
 */
export const offerWorth = (t: { give: string[]; giveGems?: number; givePack?: boolean }) =>
  offerValue(t.give) * GEMS_PER_POINT + Math.max(0, Math.round(t.giveGems ?? 0)) + (t.givePack ? PACK_HINT_VALUE : 0)

/** Free pack is available once per calendar day. */
export const freePackReady = (a: AlbumState, today: string) => a.lastFreePackDay !== today
/** Packs won in a trade, waiting to be opened. */
export const packCredits = (a: AlbumState) => Math.max(0, a.packCredits ?? 0)
