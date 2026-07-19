// Keeps public/Album/ in shape for the Grand Line Sticker Album:
//  1. normalizes every image to one portrait card ratio (Panini-style), on a
//     transparent canvas, and compresses it — output always lands in
//     public/stickers/<slug>.webp so the originals stay untouched
//  2. regenerates src/logic/stickerCatalog.generated.ts: every sticker with a
//     stable id, display name, rarity, and its crew
//
// Rarity comes from the folder:
//   public/Album/                    → common  (white border)
//   public/Album/special stickers/   → special (red border)
//
// Crews are assigned by a STABLE hash of the sticker id, so dropping new images
// in never reshuffles the cards anyone already owns. Ids are derived from the
// filename, so renaming a source file mints a new sticker (and retires the old).
//
// Runs on `npm run stickers`, and before every dev/build via pre-scripts.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = new URL('../public/Album/', import.meta.url).pathname
const SPECIAL_DIR = 'special stickers'
const OUT_DIR = new URL('../public/stickers/', import.meta.url).pathname
const CATALOG = new URL('../src/logic/stickerCatalog.generated.ts', import.meta.url).pathname

// One card ratio for the whole album, like a real Panini sticker (2:3-ish).
// Cards render at ~150 CSS px wide on a phone; 3x gives retina headroom.
const CARD_W = 450
const CARD_H = 620
const QUALITY = 78
const BUDGET = 70 * 1024 // per-sticker ceiling; step quality down until it fits (floor 45)

const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

// Hand-curated names win over anything we can guess from a filename. Wiki/stock
// filenames are noisy enough that most cards need one; ids without an entry fall
// back to the guesser, and the run prints them so they're easy to fix up.
const NAMES = JSON.parse(await readFile(new URL('./sticker-names.json', import.meta.url), 'utf8'))

/** The crews a sticker can belong to. Add more and the album grows sections. */
const CREWS = [
  { id: 'straw-hats', name: 'Straw Hat Pirates', emoji: '🏴‍☠️' },
  { id: 'emperors', name: 'Emperors of the Sea', emoji: '👑' },
  { id: 'marines', name: 'Marine Headquarters', emoji: '⚓' },
  { id: 'warlords', name: 'Seven Warlords', emoji: '⚔️' },
  { id: 'worst-generation', name: 'The Worst Generation', emoji: '💀' },
  { id: 'revolutionaries', name: 'Revolutionary Army', emoji: '🔥' },
]

/** Stable 32-bit hash — same string always lands on the same crew, across runs and machines. */
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Filename → stable url-safe id (also the output filename). */
function slugify(file) {
  return path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/%[0-9a-f]{2}/g, '-') // url-encoded junk from wiki downloads
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/**
 * Filename → a readable card name. Wiki/stock filenames are noisy, so we drop
 * the obvious boilerplate and title-case what's left. Anything that ends up
 * unreadable (hash-only filenames) becomes a "Mystery" card, which is on-theme.
 */
const NOISE =
  /\b(render|original|post|timeskip|posttimeskip|anime|concept|art|copy|fix|enhanced|png|clipart|transparent|wallpaper|thumbnail|favpng|imgbin|by|one|piece|images?|jumputi|d\d+|\d{4,})\b/g

function displayName(file) {
  let base = path
    .basename(file, path.extname(file))
    .replace(/%[0-9a-f]{2}/gi, ' ')
    .replace(/[_\-.()]+/g, ' ')
    .replace(/\d+x\d+/g, ' ')
    .toLowerCase()
  base = base.replace(NOISE, ' ').replace(/\s+/g, ' ').trim()
  // strip leftover long alphanumeric blobs (hashes) and stray single letters
  base = base
    .split(' ')
    .filter((w) => w.length > 1 && !/\d/.test(w) && !/^[a-z]{16,}$/.test(w))
    .join(' ')
  if (!base) return 'Mystery Pirate'
  return base
    .split(' ')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
    .slice(0, 28)
}

async function collect(dir, rarity) {
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isFile() && EXTS.has(path.extname(e.name).toLowerCase()))
    .map((e) => ({ file: e.name, full: path.join(dir, e.name), rarity }))
}

await mkdir(OUT_DIR, { recursive: true })

const sources = [
  ...(await collect(SRC, 'common')),
  ...(await collect(path.join(SRC, SPECIAL_DIR), 'special')),
].sort((a, b) => a.file.localeCompare(b.file, 'en', { numeric: true }))

const seen = new Map()
const catalog = []

for (const { file, full, rarity } of sources) {
  let id = slugify(file)
  if (!id) id = `sticker-${hash(file).toString(36)}`
  // two different files slugging to the same id would silently overwrite each other
  if (seen.has(id)) id = `${id}-${hash(file).toString(36).slice(0, 4)}`
  seen.set(id, file)

  const outPath = path.join(OUT_DIR, `${id}.webp`)

  // Fit the character inside the card without cropping heads off, on a
  // transparent canvas — the card frame behind it supplies the colour.
  const img = sharp(await readFile(full))
    .rotate()
    .resize({
      width: CARD_W,
      height: CARD_H,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })

  let quality = QUALITY
  let out = await img.webp({ quality, alphaQuality: 90 }).toBuffer()
  while (out.length > BUDGET && quality > 45) {
    quality -= 8
    out = await img.webp({ quality, alphaQuality: 90 }).toBuffer()
  }
  await writeFile(outPath, out)

  const curated = NAMES[id]
  catalog.push({
    id,
    name: curated ?? displayName(file),
    named: Boolean(curated),
    rarity,
    kb: Math.round(out.length / 1024),
  })
}

// Crew assignment: sort by hash (stable, filename-derived) and deal the cards
// round-robin, so every crew ends up within one card of the same size. Raw
// `hash % n` clusters badly at this catalog size (20 vs 6). Dealing off a sorted
// hash keeps it deterministic — the same set of files always yields the same
// rosters — while a new image only shifts cards after it in the sort order.
const dealt = [...catalog].sort((a, b) => hash(a.id) - hash(b.id))
dealt.forEach((s, i) => {
  s.crew = CREWS[i % CREWS.length].id
})

const commons = catalog.filter((c) => c.rarity === 'common').length
const specials = catalog.length - commons

const ts = `// AUTO-GENERATED by scripts/stickers.mjs — do not edit.
// Drop images into public/Album/ (or public/Album/${SPECIAL_DIR}/ for red rares)
// and run \`npm run stickers\` (also runs before dev/build).
export interface StickerDef {
  id: string
  name: string
  rarity: 'common' | 'special'
  crew: string
}

export interface CrewDef {
  id: string
  name: string
  emoji: string
}

export const STICKER_CREWS: CrewDef[] = ${JSON.stringify(CREWS, null, 2)}

export const STICKER_CATALOG: StickerDef[] = ${JSON.stringify(
  catalog.map(({ id, name, rarity, crew }) => ({ id, name, rarity, crew })),
  null,
  2,
)}
`
await writeFile(CATALOG, ts)

const byCrew = CREWS.map((c) => `${c.emoji} ${c.name}: ${catalog.filter((s) => s.crew === c.id).length}`).join('\n  ')
console.log(`${catalog.length} stickers (${commons} common, ${specials} special)\n  ${byCrew}`)

// New drops usually need a hand-written name — surface them instead of shipping
// "Mystery Pirate" cards nobody can identify.
const unnamed = catalog.filter((s) => !s.named)
if (unnamed.length) {
  console.log(`\n⚠️  ${unnamed.length} sticker(s) using a guessed name — add them to scripts/sticker-names.json:`)
  for (const s of unnamed) console.log(`  "${s.id}": "${s.name}",`)
}
