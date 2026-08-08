// Turns the source art in assets/Album/ into the Grand Line Sticker Album:
//  1. normalizes every image to one portrait card ratio (Panini-style), on a
//     transparent canvas, and compresses it — output always lands in
//     public/stickers/<slug>.webp so the originals stay untouched
//  2. regenerates src/logic/stickerCatalog.generated.ts: every sticker with a
//     stable id, display name, rarity, its crew — and its Davy Back Duel battle
//     card (element, archetype, HP, two attacks). New art is playable the moment
//     it lands; see the "battle stats" section below.
//
// The originals live OUTSIDE public/ on purpose: they are ~15 MB of full-size
// art, and anything under public/ is copied verbatim into the build and
// downloaded by every user. Only the compressed cards in public/stickers/ ship.
//
// Rarity comes from the folder:
//   assets/Album/                    → common  (white border)
//   assets/Album/special stickers/   → special (red border)
//
// Crews are assigned by a STABLE hash of the sticker id, so dropping new images
// in never reshuffles the cards anyone already owns. Ids are derived from the
// filename, so renaming a source file mints a new sticker (and retires the old).
//
// Runs on `npm run stickers`, and before every dev/build via pre-scripts.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = new URL('../assets/Album/', import.meta.url).pathname
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

// Battle identities for characters we recognise by name (see card-powers.json).
const POWERS = JSON.parse(await readFile(new URL('./card-powers.json', import.meta.url), 'utf8'))

// Album sections are World Cup 2026 teams, best-ranked first. Only as many
// teams as the catalog needs are active (~CARDS_PER_TEAM cards each), so
// dropping new images in unlocks the next country automatically. `code` is the
// flagcdn.com code — the flag is downloaded to public/flags/<code>.webp on
// first use.
const CARDS_PER_TEAM = 8
const WC2026_TEAMS = [
  { id: 'argentina', name: 'Argentina', code: 'ar' },
  { id: 'spain', name: 'Spain', code: 'es' },
  { id: 'france', name: 'France', code: 'fr' },
  { id: 'england', name: 'England', code: 'gb-eng' },
  { id: 'brazil', name: 'Brazil', code: 'br' },
  { id: 'portugal', name: 'Portugal', code: 'pt' },
  { id: 'netherlands', name: 'Netherlands', code: 'nl' },
  { id: 'belgium', name: 'Belgium', code: 'be' },
  { id: 'germany', name: 'Germany', code: 'de' },
  { id: 'croatia', name: 'Croatia', code: 'hr' },
  { id: 'morocco', name: 'Morocco', code: 'ma' },
  { id: 'colombia', name: 'Colombia', code: 'co' },
  { id: 'mexico', name: 'Mexico', code: 'mx' },
  { id: 'usa', name: 'USA', code: 'us' },
  { id: 'uruguay', name: 'Uruguay', code: 'uy' },
  { id: 'switzerland', name: 'Switzerland', code: 'ch' },
  { id: 'senegal', name: 'Senegal', code: 'sn' },
  { id: 'japan', name: 'Japan', code: 'jp' },
  { id: 'ecuador', name: 'Ecuador', code: 'ec' },
  { id: 'canada', name: 'Canada', code: 'ca' },
  { id: 'australia', name: 'Australia', code: 'au' },
  { id: 'south-korea', name: 'South Korea', code: 'kr' },
  { id: 'austria', name: 'Austria', code: 'at' },
  { id: 'norway', name: 'Norway', code: 'no' },
  { id: 'iran', name: 'Iran', code: 'ir' },
  { id: 'paraguay', name: 'Paraguay', code: 'py' },
  { id: 'tunisia', name: 'Tunisia', code: 'tn' },
  { id: 'egypt', name: 'Egypt', code: 'eg' },
  { id: 'algeria', name: 'Algeria', code: 'dz' },
  { id: 'ivory-coast', name: 'Ivory Coast', code: 'ci' },
  { id: 'scotland', name: 'Scotland', code: 'gb-sct' },
  { id: 'panama', name: 'Panama', code: 'pa' },
  { id: 'saudi-arabia', name: 'Saudi Arabia', code: 'sa' },
  { id: 'qatar', name: 'Qatar', code: 'qa' },
  { id: 'uzbekistan', name: 'Uzbekistan', code: 'uz' },
  { id: 'jordan', name: 'Jordan', code: 'jo' },
  { id: 'ghana', name: 'Ghana', code: 'gh' },
  { id: 'south-africa', name: 'South Africa', code: 'za' },
  { id: 'cape-verde', name: 'Cape Verde', code: 'cv' },
  { id: 'new-zealand', name: 'New Zealand', code: 'nz' },
  { id: 'haiti', name: 'Haiti', code: 'ht' },
  { id: 'curacao', name: 'Curaçao', code: 'cw' },
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

// --- battle stats (the Davy Back Duel card game) ----------------------------
//
// Every album card doubles as a playable TCG card, so the stats have to be
// DERIVED, not written by hand: new art dropped into assets/Album/ has to arrive
// battle-ready. Everything below hangs off the same stable id hash the crews use
// — a card's element, archetype, HP and damage never change once it exists, and
// two machines running the script produce identical numbers.
//
// Balance is archetype-driven rather than random: a card is a Guardian (tanky,
// heals), Bruiser (solid, powers up), Striker (glass cannon) or Trickster
// (fragile, stuns). Within an archetype the hash only picks WHERE in a narrow
// band the card lands, so nothing can roll broken. Red rares get +HP, +damage
// and pay for it with a 3-energy finisher instead of 2.

/** The weakness ring: each element beats the NEXT one, and is weak to the one before it. */
const ELEMENTS = [
  { id: 'flame', name: 'Flame', icon: '🔥' },
  { id: 'beast', name: 'Beast', icon: '🐗' },
  { id: 'blade', name: 'Blade', icon: '⚔️' },
  { id: 'spirit', name: 'Spirit', icon: '👻' },
  { id: 'storm', name: 'Storm', icon: '⚡' },
  { id: 'tide', name: 'Tide', icon: '🌊' },
]

/**
 * hp: [floor, steps] → floor + 10·(hash % steps). Same shape for damage with a
 * step of 5. `effect` rides on the finisher; Strikers trade it for raw damage.
 */
// A finisher is worth ~2.6 quick attacks for twice the energy, so hoarding a
// turn to land one genuinely beats swinging every turn. That gap is the whole
// decision the game asks a player to make, and it's why matches don't drag.
const ARCHETYPES = {
  guardian: { label: 'Guardian', hp: [120, 4], quick: [15, 3], big: [50, 3], effect: 'heal', amount: 20, retreat: 2 },
  bruiser: { label: 'Bruiser', hp: [105, 4], quick: [20, 3], big: [62, 3], effect: 'boost', amount: 20, retreat: 2 },
  striker: { label: 'Striker', hp: [80, 4], quick: [25, 3], big: [80, 3], effect: null, amount: 0, retreat: 1 },
  trickster: { label: 'Trickster', hp: [90, 4], quick: [20, 3], big: [56, 3], effect: 'stun', amount: 0, retreat: 1 },
}
const ARCH_IDS = Object.keys(ARCHETYPES)

/** Move names for cards we can't recognise — flavoured by element so they still read right. */
const MOVES = {
  flame: {
    quick: ['Ember Jab', 'Cinder Kick', 'Heat Haze', 'Spark Fist'],
    big: ['Blazing Cross', 'Inferno Rush', 'Volcano Break', 'Firestorm'],
  },
  beast: {
    quick: ['Wild Swipe', 'Horn Jab', 'Fang Bite', 'Heavy Paw'],
    big: ['Beast Rampage', 'Roar of the Wild', 'Savage Charge', 'Titan Slam'],
  },
  blade: {
    quick: ['Quick Draw', 'Crescent Cut', 'Iron Slash', 'Blade Dance'],
    big: ['Flying Slash', 'Thousand Cuts', 'Storm of Steel', 'Executioner'],
  },
  spirit: {
    quick: ['Phantom Grip', 'Soul Touch', 'Hollow Chill', 'Shadow Jab'],
    big: ['Spirit Requiem', 'Nightmare Wail', 'Soul Parade', 'Curse Bloom'],
  },
  storm: {
    quick: ['Static Snap', 'Wind Slap', 'Bolt Jab', 'Gale Kick'],
    big: ['Sky Judgment', 'Thunder Lance', 'Tempest Cannon', 'Cloudbreaker'],
  },
  tide: {
    quick: ['Water Shot', 'Ripple Palm', 'Undertow', 'Salt Spray'],
    big: ['Whirlpool Spear', 'Deep Sea Crush', 'Tidal Wall', 'Abyss Current'],
  },
}

/** Longest-matching key from card-powers.json, so "Luffy · Gear 5" beats plain "luffy". */
function curatedPower(name) {
  const lower = name.toLowerCase()
  let best = null
  for (const key of Object.keys(POWERS)) {
    if (key.startsWith('_') || !lower.includes(key)) continue
    if (!best || key.length > best.length) best = key
  }
  return best ? POWERS[best] : null
}

/** Human-readable effect line — the card front prints this under the finisher. */
function effectText(effect, amount) {
  if (effect === 'heal') return `Heal ${amount} HP`
  if (effect === 'boost') return `Next attack +${amount}`
  if (effect === 'stun') return 'They can’t attack next turn'
  if (effect === 'drain') return 'Heal half the damage dealt'
  return null
}

/**
 * The full battle card for one sticker. `id` drives every roll (stable forever);
 * `name` only chooses the curated identity, so renaming a card can change its
 * flavour but never destabilises the rest of the album.
 */
function cardStats(id, name, rarity) {
  const h = hash(id)
  const curated = curatedPower(name)
  const special = rarity === 'special'

  const element = curated?.element ?? ELEMENTS[h % ELEMENTS.length].id
  const archId = curated?.archetype ?? ARCH_IDS[(h >>> 3) % ARCH_IDS.length]
  const arch = ARCHETYPES[archId]

  const hp = arch.hp[0] + 10 * ((h >>> 6) % arch.hp[1]) + (special ? 20 : 0)
  const quickDmg = arch.quick[0] + 5 * ((h >>> 10) % arch.quick[1]) + (special ? 5 : 0)
  const bigDmg = arch.big[0] + 5 * ((h >>> 14) % arch.big[1]) + (special ? 10 : 0)

  const pool = MOVES[element]
  const names = curated?.attacks ?? [
    pool.quick[(h >>> 18) % pool.quick.length],
    pool.big[(h >>> 22) % pool.big.length],
  ]

  const finisher = { name: names[1], cost: special ? 3 : 2, damage: bigDmg }
  if (arch.effect) {
    finisher.effect = arch.effect
    if (arch.amount) finisher.amount = arch.amount
    finisher.text = effectText(arch.effect, arch.amount)
  }

  const stats = {
    element,
    archetype: archId,
    hp,
    retreat: arch.retreat,
    attacks: [{ name: names[0], cost: 1, damage: quickDmg }, finisher],
  }
  // Only recognised characters carry a voice; everyone else is played with their
  // element's sound, so a swordsman never shouts Gum-Gum.
  if (curated?.voice) stats.voice = curated.voice
  return stats
}

/**
 * Many clipart downloads have the transparency checkerboard baked into the
 * pixels instead of a real alpha channel. Detect that (opaque, light-gray
 * border) and strip it with a flood fill from the edges, so only
 * background-connected pixels go transparent — white parts of the character
 * itself are safe.
 */
async function ensureTransparent(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const isBg = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    const min = Math.min(r, g, b), max = Math.max(r, g, b)
    return a > 200 && min >= 175 && max - min <= 22
  }
  // only bother when the border actually looks like a baked-in checkerboard
  let bgBorder = 0, border = 0
  for (let x = 0; x < w; x++) {
    border += 2
    if (isBg((x + 0) * 4)) bgBorder++
    if (isBg(((h - 1) * w + x) * 4)) bgBorder++
  }
  for (let y = 0; y < h; y++) {
    border += 2
    if (isBg(y * w * 4)) bgBorder++
    if (isBg((y * w + w - 1) * 4)) bgBorder++
  }
  if (bgBorder / border < 0.5) return buf

  const visited = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const p = stack.pop()
    if (visited[p] || !isBg(p * 4)) continue
    visited[p] = 1
    data[p * 4 + 3] = 0
    const x = p % w
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (p >= w) stack.push(p - w)
    if (p < w * (h - 1)) stack.push(p + w)
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
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
  const img = sharp(await ensureTransparent(await readFile(full)))
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
  const name = curated ?? displayName(file)
  catalog.push({
    id,
    name,
    named: Boolean(curated),
    rarity,
    card: cardStats(id, name, rarity),
    kb: Math.round(out.length / 1024),
  })
}

// Activate just enough teams for the catalog, best-ranked first — new images
// eventually unlock the next country in the list.
const commonCount = catalog.filter((c) => c.rarity === 'common').length
const CREWS = WC2026_TEAMS.slice(
  0,
  Math.min(WC2026_TEAMS.length, Math.max(1, Math.ceil(commonCount / CARDS_PER_TEAM))),
).map((t) => ({ id: t.id, name: t.name, code: t.code, flag: `/flags/${t.code}.webp` }))

// Fetch any flag we don't have yet (flagcdn.com, public domain) and store it
// small — it renders at ~20 CSS px next to the team name.
const FLAGS_DIR = new URL('../public/flags/', import.meta.url).pathname
await mkdir(FLAGS_DIR, { recursive: true })
for (const crew of CREWS) {
  const flagPath = path.join(FLAGS_DIR, `${crew.code}.webp`)
  try {
    await readFile(flagPath)
  } catch {
    const res = await fetch(`https://flagcdn.com/w80/${crew.code}.png`)
    if (!res.ok) throw new Error(`flag download failed for ${crew.name}: HTTP ${res.status}`)
    const png = Buffer.from(await res.arrayBuffer())
    await writeFile(flagPath, await sharp(png).webp({ quality: 80 }).toBuffer())
    console.log(`⬇  downloaded flag ${crew.code}.webp (${crew.name})`)
  }
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
// Drop images into assets/Album/ (or assets/Album/${SPECIAL_DIR}/ for red rares)
// and run \`npm run stickers\` (also runs before dev/build).
/** The six battle elements, in ring order: each one beats the NEXT in this list. */
export type CardElement = ${ELEMENTS.map((e) => `'${e.id}'`).join(' | ')}

export type CardArchetype = ${ARCH_IDS.map((a) => `'${a}'`).join(' | ')}

/** What a finisher does on top of its damage. Strikers trade this for raw power. */
export type CardEffect = 'heal' | 'boost' | 'stun' | 'drain'

export interface CardAttack {
  name: string
  cost: number // energy spent to use it
  damage: number
  effect?: CardEffect
  amount?: number // heal/boost magnitude
  text?: string // the effect line printed on the card
}

/** A sticker's Davy Back Duel identity — derived from its id, so it never drifts. */
export interface CardStats {
  element: CardElement
  archetype: CardArchetype
  hp: number
  retreat: number // energy to swap this card off the front line
  /** [quick move, finisher] */
  attacks: CardAttack[]
  /**
   * Clip in public/duel/voices/ this character shouts on a finisher. Only set for
   * characters we recognise by name; everyone else uses their element's sound.
   */
  voice?: string
}

export interface StickerDef {
  id: string
  name: string
  rarity: 'common' | 'special'
  crew: string
  card: CardStats
}

export interface CrewDef {
  id: string
  name: string
  /** path under public/ to the team's flag, e.g. /flags/br.webp */
  flag: string
}

/** Cards each team holds — the album is "complete-able" in blocks of this. */
export const CARDS_PER_TEAM = ${CARDS_PER_TEAM}

/** Every country that played the World Cup 2026 — teams still waiting for images. */
export const TOTAL_WC_TEAMS = ${WC2026_TEAMS.length}

export const STICKER_CREWS: CrewDef[] = ${JSON.stringify(
  CREWS.map(({ id, name, flag }) => ({ id, name, flag })),
  null,
  2,
)}

/**
 * The weakness ring — \`beats\` takes DOUBLE damage from this element. Rendered
 * as-is on the duel's How to Play page, so the rules can never fall out of sync
 * with the maths.
 */
export const CARD_ELEMENTS: { id: CardElement; name: string; icon: string; beats: CardElement }[] = ${JSON.stringify(
  ELEMENTS.map((e, i) => ({ ...e, beats: ELEMENTS[(i + 1) % ELEMENTS.length].id })),
  null,
  2,
)}

export const CARD_ARCHETYPES: { id: CardArchetype; label: string; blurb: string }[] = ${JSON.stringify(
  [
    { id: 'guardian', label: 'Guardian', blurb: 'Huge HP, small hits — its finisher heals.' },
    { id: 'bruiser', label: 'Bruiser', blurb: 'Tough and steady — its finisher powers up the next hit.' },
    { id: 'striker', label: 'Striker', blurb: 'Glass cannon: hits hardest, folds fastest.' },
    { id: 'trickster', label: 'Trickster', blurb: 'Fragile, but its finisher stuns for a turn.' },
  ],
  null,
  2,
)}

export const STICKER_CATALOG: StickerDef[] = ${JSON.stringify(
  catalog.map(({ id, name, rarity, crew, card }) => ({ id, name, rarity, crew, card })),
  null,
  2,
)}
`
await writeFile(CATALOG, ts)

const byCrew = CREWS.map((c) => `${c.name}: ${catalog.filter((s) => s.crew === c.id).length}`).join('\n  ')
console.log(`${catalog.length} stickers (${commons} common, ${specials} special)\n  ${byCrew}`)

// New drops usually need a hand-written name — surface them instead of shipping
// "Mystery Pirate" cards nobody can identify.
const unnamed = catalog.filter((s) => !s.named)
if (unnamed.length) {
  console.log(`\n⚠️  ${unnamed.length} sticker(s) using a guessed name — add them to scripts/sticker-names.json:`)
  for (const s of unnamed) console.log(`  "${s.id}": "${s.name}",`)
}
