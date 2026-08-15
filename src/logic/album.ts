// The Grand Line Sticker Album — pack odds, trade values and album math.
// Catalog + crews are generated from assets/Album/ by `npm run stickers`.
import { STICKER_CATALOG, STICKER_CREWS, type StickerDef } from './stickerCatalog.generated'
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
/** A red rare is worth two whites in a swap. */
export const TRADE_VALUE: Record<StickerDef['rarity'], number> = { common: 1, special: 2 }
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

export function defaultAlbumState(): AlbumState {
  return { counts: {}, packsOpened: 0, lastFreePackDay: null, trades: [], packCredits: 0 }
}

/** Every sticker id the album can hold, in catalog (crew-grouped) order. */
export const ALL_STICKER_IDS = STICKER_CATALOG.map((s) => s.id)

export const ownedIds = (a: AlbumState) => Object.keys(a.counts).filter((id) => (a.counts[id] ?? 0) > 0)
export const ownsSticker = (a: AlbumState, id: string) => (a.counts[id] ?? 0) > 0
/** Copies beyond the one glued into the album — these are the tradeable pile. */
export const spareCount = (a: AlbumState, id: string) => Math.max(0, (a.counts[id] ?? 0) - 1)

export function albumProgress(a: AlbumState): { owned: number; total: number; pct: number } {
  const total = STICKER_CATALOG.length
  const owned = STICKER_CATALOG.filter((s) => ownsSticker(a, s.id)).length
  return { owned, total, pct: total === 0 ? 0 : Math.round((owned / total) * 100) }
}

/** Spare cards, newest-catalog-order, expanded per duplicate copy count. */
export function spares(a: AlbumState): { sticker: StickerDef; count: number }[] {
  return STICKER_CATALOG.filter((s) => spareCount(a, s.id) > 0).map((s) => ({
    sticker: s,
    count: spareCount(a, s.id),
  }))
}

/** Cards `wanter` is still missing that `holder` can spare — the "I can help you" list. */
export function tradeableFor(holder: AlbumState, wanter: AlbumState): StickerDef[] {
  return STICKER_CATALOG.filter((s) => spareCount(holder, s.id) > 0 && !ownsSticker(wanter, s.id))
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/**
 * Roll one pack. Each slot picks a rarity first, then a sticker of that rarity —
 * biased so that at least REPEAT_FLOOR of the pack is stuff you already own
 * (duplicates you can trade away), with the rest favouring new cards.
 *
 * Returns the drawn ids in order; duplicates within one pack are allowed and
 * expected. The caller applies them to the album.
 */
export function rollPack(album: AlbumState, size = PACK_SIZE): string[] {
  const drawn: string[] = []
  // track what the album *would* look like mid-pack so "new" stays accurate
  const have = new Set(ownedIds(album))

  for (let i = 0; i < size; i++) {
    const rarity: StickerDef['rarity'] = Math.random() < SPECIAL_CHANCE ? 'special' : 'common'
    let pool = STICKER_CATALOG.filter((s) => s.rarity === rarity)
    if (pool.length === 0) pool = STICKER_CATALOG

    const owned = pool.filter((s) => have.has(s.id))

    // Force a duplicate for the first REPEAT_FLOOR slots when we can, so there's
    // always something to trade. The remaining slots are NOT guaranteed new:
    // they draw at true random from the whole pool, so the closer the album gets
    // to full the harder the last cards are to find — which is exactly when
    // trading with the other crewmate becomes the fastest way to finish.
    const wantDupe = i < Math.floor(size * REPEAT_FLOOR)
    const from = wantDupe && owned.length > 0 ? owned : pool
    const s = pick(from.length > 0 ? from : pool)
    drawn.push(s.id)
    have.add(s.id)
  }
  return drawn
}

/** Total swap value of a side of a trade (red = 2, white = 1). */
export function offerValue(ids: string[]): number {
  return ids.reduce((sum, id) => sum + TRADE_VALUE[stickerById(id)?.rarity ?? 'common'], 0)
}

/** A trade is fair when both sides carry the same swap value. */
export const isBalanced = (give: string[], want: string[]) => offerValue(give) === offerValue(want)

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
