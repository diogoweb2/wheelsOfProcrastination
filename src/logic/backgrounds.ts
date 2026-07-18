// The pool of purchasable backgrounds lives in public/backgrounds/; the catalog
// is generated from that folder by scripts/backgrounds.mjs (runs before dev/build).
// Nobody owns any by default — the app starts on the plain solid color.
export { BACKGROUND_CATALOG } from './backgroundCatalog.generated'

export function backgroundUrl(id: string): string {
  return `/backgrounds/${id}`
}
