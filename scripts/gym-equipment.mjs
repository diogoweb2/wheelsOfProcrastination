// Turn photos of the basement into a gym catalog: `npm run gym:equipment`.
//
// Drop photos of every machine, bar, bench and band into `gym-photos/` (any
// mix of jpg/png/webp/heic — gitignored, they never enter the repo), then run
// this. It:
//   1. shrinks each photo to a 1024px webp in `.gym-work/` — the model reads
//      those, not the 4 MB originals;
//   2. asks Claude (Opus, medium effort) to identify every distinct piece of
//      equipment and describe it thoroughly (the exercise library is built from
//      those descriptions when you write an exercise by hand, and by the coach
//      before every session — so the notes carry the limits: lightest notch,
//      unstable handles, fixed height);
//   3. writes a 96px webp thumbnail per item into `public/gym/` (see CLAUDE.md —
//      no un-resized image ever lands in public/);
//   4. merges the result into Firestore `app/gymCatalog`.
//
// Ids are slugs of the name, so re-running is idempotent: an item you already
// have is UPDATED, never duplicated, and anything you edited or retired in the
// app's Gear tab keeps those edits. No CATALOG entry is ever deleted here.
//
// Nothing large survives the run. The originals and the shrunk copies are both
// DELETED once the catalog is saved — a photo's whole job is to become a row in
// the database, and the only image left anywhere is a 96px webp thumbnail
// (~4 KB) in public/gym/, which is the one thing the app actually displays.
//
// Flags:
//   --dry-run       print what would be written, touch nothing (photos kept)
//   --keep-photos   don't delete the originals after a successful run
//   --photos=DIR / --model=NAME / --effort=LEVEL
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

// Same public web config as src/lib/firebase.ts (client configs are not secrets).
const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}
const DRY = args.includes('--dry-run')
const KEEP = args.includes('--keep-photos')
const PHOTO_DIR = resolve(flag('photos', 'gym-photos'))
const WORK_DIR = resolve('.gym-work')
const THUMB_DIR = resolve('public/gym')
const MODEL = flag('model', 'opus')
const EFFORT = flag('effort', 'medium')
/** Gear tab draws thumbnails at 48px; 2× retina is the ceiling CLAUDE.md sets. */
const THUMB_PX = 96

const PHOTO_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'])

/** Stable id from a name, so a second run updates instead of duplicating. */
const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

// --- your comments about the gear -------------------------------------------
//
// A photo of a dumbbell can't tell you it adjusts from 5 to 52 lb, so there are
// three ways to say so, and all of them are read:
//
//   1. The photo's own CAPTION — type it in the Photos app on your phone when
//      you take the shot. Nothing else to manage.
//   2. `gym-photos/notes.txt` — a line per photo, plus anything about the room
//      itself (see NOTES_HELP below).
//   3. A sidecar text file next to the photo (`dumbbells.jpg.txt`).
//
// Everything found is handed to the model with that photo, and the room-level
// notes are stored on the catalog so the AI trainer reads them before every
// session too (a low ceiling should change what it prescribes).

const NOTES_FILE = 'notes.txt'

const NOTES_HELP = `# Notes for the gym cataloguer. Two kinds of line:
#
#   <photo filename>: what the photo can't show you
#   dumbbells.jpg: adjustable, 5 to 52 lb in 2.5 lb steps
#
# Any line WITHOUT a filename describes the room itself, and your AI trainer
# reads it before every session:
#   Ceiling is low - nothing standing overhead with a bar.
#
# Lines starting with # are ignored. You can also just caption the photo in the
# Photos app, or drop a "dumbbells.jpg.txt" next to it.
`

/** Read every comment source. Returns per-photo notes plus the room-level ones. */
function readNotes(files) {
  const perPhoto = new Map()
  const general = []

  // 1. notes.txt
  const notesPath = join(PHOTO_DIR, NOTES_FILE)
  if (existsSync(notesPath)) {
    const known = new Map(files.map((f) => [f.toLowerCase(), f]))
    for (const line of readFileSync(notesPath, 'utf8').split('\n')) {
      const text = line.trim()
      if (!text || text.startsWith('#')) continue
      const split = text.indexOf(':')
      const head = split > 0 ? text.slice(0, split).trim().toLowerCase() : ''
      if (head && known.has(head)) add(perPhoto, known.get(head), text.slice(split + 1).trim())
      else general.push(text)
    }
  }

  // 2. sidecar files
  for (const f of files) {
    for (const side of [`${f}.txt`, `${f.replace(/\.[^.]+$/, '')}.txt`]) {
      const p = join(PHOTO_DIR, side)
      if (existsSync(p)) add(perPhoto, f, readFileSync(p, 'utf8').trim())
    }
  }

  return { perPhoto, general: general.join(' ') }
}

function add(map, key, value) {
  if (!value) return
  const prev = map.get(key)
  map.set(key, prev ? `${prev} ${value}` : value)
}

/**
 * The caption you typed in the Photos app, read straight out of the file's EXIF
 * ImageDescription (tag 0x010E). Deliberately hand-rolled rather than pulling in
 * an EXIF library for one field — and it returns '' for anything it doesn't
 * fully understand, so a weird file can never break the run.
 */
export function exifDescription(buf) {
  if (!buf || buf.length < 16) return ''
  const at = buf.subarray(0, 6).toString('latin1') === 'Exif\0\0' ? 6 : 0
  const order = buf.subarray(at, at + 2).toString('latin1')
  if (order !== 'II' && order !== 'MM') return ''
  const le = order === 'II'
  const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o))
  const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o))
  if (u16(at + 2) !== 42) return ''
  const ifd0 = at + u32(at + 4)
  if (ifd0 + 2 > buf.length) return ''
  const count = u16(ifd0)
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12
    if (entry + 12 > buf.length) break
    if (u16(entry) !== 0x010e) continue // ImageDescription
    const len = u32(entry + 4)
    if (len === 0 || len > 4096) return ''
    const start = len <= 4 ? entry + 8 : at + u32(entry + 8)
    if (start + len > buf.length) return ''
    // EXIF ASCII values are NUL-terminated and often NUL-padded
    return buf.subarray(start, start + len).toString('utf8').split('\u0000')[0].trim()
  }
  return ''
}

function prompt(images, existing, generalNotes) {
  return `You are cataloguing a home gym from photographs, for a personal-training app used by a 43-year-old man with a history of lower-back flare-ups and by his 12-year-old son.

Look at every one of these photos:
${images.map((i) => `- ${i.workPath}   (original: ${i.name})${i.note ? `\n    ↳ THE OWNER SAYS: ${i.note}` : ''}`).join('\n')}
${generalNotes ? `\nAbout the room itself, from the owner: ${generalNotes}\n` : ''}
Identify EVERY distinct piece of equipment across all of them. The same item may appear in several photos — that is ONE piece of equipment, not several. Ignore furniture, walls, boxes and anything that is not usable for training.

Do NOT list exercises. A separate pass does that, and it needs to see the whole inventory at once so it can find the combinations (a bench plus dumbbells is worth far more than either alone).

${existing.equipment.length > 0 ? `Equipment already in the catalog (reuse the EXACT name if you see the same item again, so it updates instead of duplicating):\n${existing.equipment.map((e) => `- ${e.name}`).join('\n')}\n` : ''}
Answer with ONLY this JSON object. No prose, no markdown fence.

{
  "equipment": [
    {
      "name": "short specific name, e.g. \\"Adjustable dumbbells\\"",
      "emoji": "one fitting emoji",
      "photo": "the ORIGINAL filename this item is best shown in",
      "notes": "everything a trainer needs to know that the picture alone can't settle: weight range, increments, attachments, what it adjusts to and what it doesn't, condition. This is the field that decides which exercises are possible later, so be thorough and concrete. Empty string only if there is genuinely nothing to say."
    }
  ]
}

Rules that matter:
- Where the owner has commented on a photo, TRUST IT over what you think you see, and fold it into that item's "notes". A photo can't show you that a dumbbell adjusts from 5 to 52 lb.
- Be specific in "notes". The next pass writes the entire exercise library from these descriptions alone — it never sees the photos.`
}

async function main() {
  if (!existsSync(PHOTO_DIR)) {
    console.error(`❌ No photo folder at ${PHOTO_DIR}.\n   Create it, drop your equipment photos in, and run this again.`)
    process.exit(1)
  }
  const files = readdirSync(PHOTO_DIR).filter((f) => PHOTO_EXT.has(extname(f).toLowerCase()))
  if (files.length === 0) {
    console.error(`❌ ${PHOTO_DIR} has no photos (${[...PHOTO_EXT].join(', ')}).`)
    process.exit(1)
  }
  console.log(`📷 ${files.length} photo(s) in ${PHOTO_DIR}`)

  // leave a template the first time, so the option is discoverable instead of
  // being a thing you had to read the source to find out about
  const notesPath = join(PHOTO_DIR, NOTES_FILE)
  if (!existsSync(notesPath)) writeFileSync(notesPath, NOTES_HELP)
  const { perPhoto, general } = readNotes(files)

  // 1. shrink for the model — full-size phone photos are pure token waste
  rmSync(WORK_DIR, { recursive: true, force: true })
  mkdirSync(WORK_DIR, { recursive: true })
  const images = []
  for (const name of files) {
    const source = join(PHOTO_DIR, name)
    const workPath = join(WORK_DIR, `${slug(basename(name, extname(name)))}.webp`)
    const input = sharp(source).rotate()
    // the caption you typed on your phone, before the metadata is stripped by
    // the resize
    let caption = ''
    try {
      caption = exifDescription((await input.metadata()).exif)
    } catch {
      /* unreadable metadata is not a reason to skip a photo */
    }
    await input.resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(workPath)
    const note = [caption, perPhoto.get(name)].filter(Boolean).join(' · ')
    images.push({ name, source, workPath, note })
  }
  const commented = images.filter((i) => i.note).length
  console.log(`🗜  Shrunk to 1024px webp in ${WORK_DIR}`)
  console.log(`📝 ${commented} photo(s) came with your comments${general ? ', plus notes about the room' : ''}`)
  if (commented === 0 && !general) {
    console.log(`   (tip: caption a photo in the Photos app, or describe it in ${PHOTO_DIR}/${NOTES_FILE})`)
  }

  // 2. load what we already have, so the model doesn't re-invent it
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const ref = doc(db, 'app', 'gymCatalog')
  const snap = await getDoc(ref)
  const existing = snap.exists()
    ? { equipment: snap.data().equipment ?? [], exercises: snap.data().exercises ?? [] }
    : { equipment: [], exercises: [] }
  console.log(`📚 Catalog has ${existing.equipment.length} item(s) and ${existing.exercises.length} exercise(s)`)

  // 3. ask Claude to read the photos
  console.log(`🧠 Asking claude (${MODEL}, effort ${EFFORT}) to identify everything — this takes a minute…`)
  const out = execFileSync(
    'claude',
    ['--model', MODEL, '--effort', EFFORT, '--allowedTools', 'Read,Glob', '--add-dir', WORK_DIR, '-p', prompt(images, existing, general)],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] },
  )

  const start = out.indexOf('{')
  const end = out.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`No JSON object in claude's reply:\n${out.slice(0, 800)}`)
  const parsed = JSON.parse(out.slice(start, end + 1))

  // 4. validate + merge equipment
  const now = new Date().toISOString()
  const equipment = [...existing.equipment]
  const byName = new Map(equipment.map((e) => [e.name.toLowerCase(), e]))
  const idByName = new Map(equipment.map((e) => [e.name.toLowerCase(), e.id]))
  const thumbJobs = []
  let newGear = 0

  for (const raw of parsed.equipment ?? []) {
    if (!raw?.name) continue
    const key = raw.name.toLowerCase()
    const id = idByName.get(key) ?? `eq-${slug(raw.name)}`
    const photo = images.find((i) => i.name === raw.photo) ?? images[0]
    const entry = {
      ...(byName.get(key) ?? {}),
      id,
      name: raw.name,
      emoji: raw.emoji || '🏋️',
      notes: (raw.notes || '').trim() || undefined,
      img: `/gym/${id}.webp`,
      addedBy: 'ai',
      createdAt: byName.get(key)?.createdAt ?? now,
    }
    if (photo) thumbJobs.push({ from: photo.source, to: join(THUMB_DIR, `${id}.webp`) })
    if (byName.has(key)) equipment[equipment.indexOf(byName.get(key))] = entry
    else {
      equipment.push(entry)
      newGear += 1
    }
    idByName.set(key, id)
  }

  // Exercises are NOT written here — they are written by hand (Gear, or the
  // catalog file). Existing ones are carried through untouched.
  const exercises = existing.exercises

  console.log(`\n🏋️  Equipment: ${newGear} new, ${equipment.length} total`)
  for (const e of equipment) console.log(`   ${e.emoji} ${e.name}${e.notes ? ` — ${e.notes}` : ''}`)
  console.log(`🤸 Exercises: ${exercises.length} already in the catalog (this step doesn't touch them)`)

  if (DRY) {
    rmSync(WORK_DIR, { recursive: true, force: true })
    console.log('\n🧪 --dry-run: nothing written, no photos deleted. Drop the flag to save.')
    process.exit(0)
  }

  // 6. thumbnails — the ONLY image that ever reaches the host. The Gear tab
  //    draws them at 48px, so 96px is the 2× retina size CLAUDE.md allows;
  //    anything bigger is dead weight on a deployed bundle.
  mkdirSync(THUMB_DIR, { recursive: true })
  let thumbBytes = 0
  for (const job of thumbJobs) {
    const info = await sharp(job.from).rotate().resize(THUMB_PX, THUMB_PX, { fit: 'cover' }).webp({ quality: 78 }).toFile(job.to)
    thumbBytes += info.size
  }
  console.log(`🖼  Wrote ${thumbJobs.length} thumbnail(s) to public/gym/ — ${kb(thumbBytes)} total at ${THUMB_PX}px`)

  await setDoc(ref, { equipment, exercises, notes: general || undefined, updatedAt: now })

  // 7. the photos have done their job: they are now rows in a database. Holding
  //    on to them costs disk for nothing, so both the shrunk copies AND the
  //    originals go. --keep-photos opts out (useful while tuning the prompt).
  // only the photos are deleted — notes.txt and any sidecars are yours and stay
  const freed = files.reduce((n, f) => n + statSync(join(PHOTO_DIR, f)).size, 0) + dirBytes(WORK_DIR)
  rmSync(WORK_DIR, { recursive: true, force: true })
  if (KEEP) {
    console.log(`📁 --keep-photos: the originals stay in ${PHOTO_DIR} (${kb(freed)}).`)
  } else {
    for (const name of files) rmSync(join(PHOTO_DIR, name), { force: true })
    console.log(`🧹 Deleted ${files.length} source photo(s) and the working copies — ${kb(freed)} freed. Your ${NOTES_FILE} stays.`)
  }

  console.log(`\n✅ Saved to Firestore. Open the Gym app → Gear to review, rename or retire anything.`)
  console.log(`   All that is left on disk: ${kb(thumbBytes)} of ${THUMB_PX}px thumbnails in public/gym/.`)
  console.log(`\n➡️  Next: add the exercises it unlocks in Gym → Gear (or scripts/data/gym-catalog.json + npm run gym:seed), then npm run gym:demos.`)
  process.exit(0)
}

const kb = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`)

function dirBytes(dir) {
  if (!existsSync(dir)) return 0
  return readdirSync(dir).reduce((n, f) => {
    const s = statSync(join(dir, f))
    return n + (s.isFile() ? s.size : 0)
  }, 0)
}

/** Only run when invoked directly — importing this file just exposes the helpers. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('❌', err.message ?? err)
    console.error(`   The shrunk copies are still in ${WORK_DIR} if you want to retry by hand.`)
    process.exit(1)
  })
}
