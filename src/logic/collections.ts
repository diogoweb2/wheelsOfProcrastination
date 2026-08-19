// Collecting, once — the rules both albums play by.
//
// There are two collections in this app: the Grand Line Sticker Album (§14,
// album art out of assets/) and the One Piece Album (§14b, every card in the One
// Piece TCG, hotlinked). They are the SAME GAME — packs, duplicates, the daily
// free pack, the 1-red-is-worth-2-whites swap, the race against the other
// crewmate — over a different pile of cards. So the rules live here once, and a
// `CollectionKit` is what tells them which pile.
//
// A kit carries no React and no Firestore, the same contract the game engines
// follow, which is why the store, the screens and the pack ceremony can all
// share it.
export type CollectRarity = 'common' | 'special'

/** One collectible, whatever it is a picture of. */
export interface CollectItem {
  id: string
  name: string
  rarity: CollectRarity
  /** Which shelf it sits on — a crew in the album, a set in the binder. */
  group: string
  /**
   * Where the picture comes from. The sticker album's are ours; the binder's
   * are hotlinked off a public mirror, hence the second URL to fall back on.
   */
  img: string
  imgFallback?: string
}

export interface CollectGroup {
  id: string
  name: string
  /** A flag image (album) or an emoji (binder) — the shelf's badge. */
  flag?: string
  emoji?: string
}

export interface CollectionKit {
  id: 'stickers' | 'cards'
  /** Which slice of the profile's data holds this collection's counts. */
  slice: 'album' | 'cards'
  name: string
  emoji: string
  items: CollectItem[]
  groups: CollectGroup[]
  packCost: number
  packSize: number
  specialChance: number
  repeatFloor: number
  /** Berries one point of swap value is roughly worth. Only ever a hint. */
  gemsPerPoint: number
}

/** A red rare is worth two whites in a swap — in either collection. */
export const TRADE_VALUE: Record<CollectRarity, number> = { common: 1, special: 2 }

export interface CollectCounts {
  counts: Record<string, number>
}

export const ownedIdsIn = (a: CollectCounts) => Object.keys(a.counts).filter((id) => (a.counts[id] ?? 0) > 0)
export const ownsIn = (a: CollectCounts, id: string) => (a.counts[id] ?? 0) > 0
/** Copies beyond the one glued in — the tradeable pile. */
export const spareCountIn = (a: CollectCounts, id: string) => Math.max(0, (a.counts[id] ?? 0) - 1)

export function progressIn(kit: CollectionKit, a: CollectCounts): { owned: number; total: number; pct: number } {
  const total = kit.items.length
  const owned = kit.items.filter((s) => ownsIn(a, s.id)).length
  return { owned, total, pct: total === 0 ? 0 : Math.round((owned / total) * 100) }
}

export function sparesIn(kit: CollectionKit, a: CollectCounts): { item: CollectItem; count: number }[] {
  return kit.items
    .filter((s) => spareCountIn(a, s.id) > 0)
    .map((s) => ({ item: s, count: spareCountIn(a, s.id) }))
}

/** Cards `wanter` is missing that `holder` can spare — the "I can help you" list. */
export function tradeableIn(kit: CollectionKit, holder: CollectCounts, wanter: CollectCounts): CollectItem[] {
  return kit.items.filter((s) => spareCountIn(holder, s.id) > 0 && !ownsIn(wanter, s.id))
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/**
 * Roll one pack. Each slot picks a rarity first, then a card of that rarity —
 * biased so at least `repeatFloor` of the pack is stuff you already own
 * (duplicates you can trade away), the rest drawn at true random from the whole
 * pool. So the closer the album gets to full the harder the last cards are to
 * find, which is exactly when trading becomes the fastest way to finish.
 */
export function rollPackIn(kit: CollectionKit, album: CollectCounts, size = kit.packSize): string[] {
  const drawn: string[] = []
  const have = new Set(ownedIdsIn(album))
  const commons = kit.items.filter((s) => s.rarity === 'common')
  const specials = kit.items.filter((s) => s.rarity === 'special')

  for (let i = 0; i < size; i++) {
    let pool = Math.random() < kit.specialChance ? specials : commons
    if (pool.length === 0) pool = kit.items
    const owned = pool.filter((s) => have.has(s.id))
    const wantDupe = i < Math.floor(size * kit.repeatFloor)
    const from = wantDupe && owned.length > 0 ? owned : pool
    const s = pick(from.length > 0 ? from : kit.items)
    drawn.push(s.id)
    have.add(s.id)
  }
  return drawn
}

/** Total swap value of one side of a trade (red = 2, white = 1). */
export const offerValueIn = (rarityOf: (id: string) => CollectRarity, ids: string[]): number =>
  ids.reduce((sum, id) => sum + TRADE_VALUE[rarityOf(id)], 0)

/** A card-for-card trade is fair when both sides carry the same swap value. */
export const isBalancedIn = (rarityOf: (id: string) => CollectRarity, give: string[], want: string[]) =>
  offerValueIn(rarityOf, give) === offerValueIn(rarityOf, want)

/**
 * A ballpark Berry price for what is being asked for — shown as a hint on the
 * scale, never enforced. A rare counts double, same as in a card-for-card swap.
 */
export const gemHintIn = (
  rarityOf: (id: string) => CollectRarity,
  gemsPerPoint: number,
  wantIds: string[],
): number => offerValueIn(rarityOf, wantIds) * gemsPerPoint
