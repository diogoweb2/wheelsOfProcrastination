// The Grand Line Sticker Album — pack odds, trade values and album math.
// Catalog + crews are generated from public/Album/ by `npm run stickers`.
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

export const stickerUrl = (id: string) => `/stickers/${id}.webp`

const BY_ID = new Map(STICKER_CATALOG.map((s) => [s.id, s]))
export const stickerById = (id: string): StickerDef | undefined => BY_ID.get(id)

export function defaultAlbumState(): AlbumState {
  return { counts: {}, packsOpened: 0, lastFreePackDay: null, trades: [] }
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

/** Free pack is available once per calendar day. */
export const freePackReady = (a: AlbumState, today: string) => a.lastFreePackDay !== today
