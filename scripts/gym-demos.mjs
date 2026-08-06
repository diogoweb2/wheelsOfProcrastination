// Give every exercise in the catalog a still image and a looping animation of
// the movement: `npm run gym:demos`.
//
// Source: ExerciseDB's free open endpoint (https://oss.exercisedb.dev/api/v1) —
// 1,500 exercises, no API key, no account. We take ONLY the handful that match
// exercises we actually own and re-host those on our own Firebase Storage, so
// the app never depends on their CDN staying up and we never mirror a library
// we don't use.
//
// Each match produces two files, and the split is the whole point of the data
// budget:
//   • poster.webp  ~2 KB   — one still frame; what a list of ten exercises loads
//   • anim.webp    ~21 KB  — the animated movement; fetched only when you're
//                            actually looking at that one exercise
// (their GIFs are 180×180 / ~67 KB; animated WebP is ~3× smaller). The service
// worker caches both forever, so seeing an exercise a second time costs nothing.
//
// MATCHING IS THE HARD PART, not the download. The whole 1,500-row index is
// pulled ONCE (pagination is `after=<meta.nextCursor>`; `offset`/`page`/`cursor`
// are all silently ignored and hand back page 1 forever — misreading that is
// what made an earlier version fire ten narrowing queries per exercise) and
// cached on disk. Every match after that is offline, instant and reproducible.
//
// Their own ranking is not usable — asking for "push-up" returns "push-up
// inside leg kick" first — so we score every row ourselves, and scoring only
// RANKS. Only a true name match is auto-accepted; everything else goes to the
// claude CLI with a shortlist, and it may answer "none of these". A WRONG
// animation teaches bad form, so an unmatched exercise just keeps its emoji.
//
// Re-runnable: exercises that already have a demo are skipped unless --refresh.
//
// Flags:
//   --dry-run              match and report, download nothing, write nothing
//   --refresh              re-match exercises that already have a demo
//   --only=<exerciseId>    just this one catalog exercise
//   --pin=<ourId>:<theirId>  force a specific ExerciseDB id (repeatable)
//   --to=storage|public    where the media lands (default storage)
//   --no-ai                never call claude; ambiguous matches are just skipped
//   --reindex              re-pull the library index instead of using the cached one
//   --key=<rapidapi key>   use the paid v1 tier, ~2,000 exercises (or set EXERCISEDB_KEY)
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage'

// The same list the app ships (src/logic/gym.ts imports this exact file), so the
// 20 built-in bodyweight moves get animations too — not just the ones generated
// from equipment photos. A built-in that finds a demo is written to the catalog
// as an override row, which is the same mechanism the Gear tab uses to edit one.
const STARTERS = JSON.parse(readFileSync(resolve('src/logic/gymStarters.json'), 'utf8'))

const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

const WORK_DIR = resolve('.gym-work')
const PUBLIC_DIR = resolve('public/gym/moves')

const args = process.argv.slice(2)
const flag = (n, d) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : d
}
const DRY = args.includes('--dry-run')
const REFRESH = args.includes('--refresh')
const NO_AI = args.includes('--no-ai')
const REINDEX = args.includes('--reindex')
const ONLY = flag('only', null)
const TO = flag('to', 'storage')
const PINS = new Map(
  args.filter((a) => a.startsWith('--pin=')).map((a) => a.slice(6).split(':')),
)

// The free open tier: 1,500 exercises, no key, no account. It is a SUBSET, and
// the gaps are real — it has no plain "plank", "wall sit", "bird dog",
// "jumping jack", "arm circle" or "hollow hold" (verified against the full
// downloaded index, not guessed). Exercises it can't cover keep their emoji.
//
// A RapidAPI key for this same v1 product raises the count to ~2,000 and lifts
// the rate limit. Set EXERCISEDB_KEY (or --key=) and this script switches over
// on its own — same pagination, same response shape, nothing else to change.
// Note it is only ~500 more exercises, so it probably does NOT contain the
// basics listed above; the 11,000-exercise library is ExerciseDB *v2*, a
// separate subscription that serves MP4 instead of GIF. See §18l for the
// options and what each actually buys.
const RAPID_HOST = 'edb-with-gifs-and-images-by-ascendapi.p.rapidapi.com'
const KEY = process.env.EXERCISEDB_KEY || flag('key', '')
const API = KEY ? `https://${RAPID_HOST}/api/v1` : 'https://oss.exercisedb.dev/api/v1'
const AUTH_HEADERS = KEY ? { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': RAPID_HOST } : {}

/** Our body parts → the vocabulary ExerciseDB filters on. */
const BODY_PARTS = {
  chest: ['chest'],
  back: ['back'],
  shoulders: ['shoulders'],
  arms: ['upper arms', 'lower arms'],
  legs: ['upper legs', 'lower legs'],
  glutes: ['upper legs'],
  core: ['waist'],
  cardio: ['cardio'],
  fullBody: [],
}

/** Words in an equipment name → the equipment ExerciseDB filters on. */
const EQUIPMENT_WORDS = [
  ['dumbbell', 'dumbbell'],
  ['kettlebell', 'kettlebell'],
  ['ez', 'ez barbell'],
  ['barbell', 'barbell'],
  ['cable', 'cable'],
  ['band', 'band'],
  ['smith', 'smith machine'],
  ['machine', 'leverage machine'],
  ['ball', 'stability ball'],
  ['rope', 'rope'],
  ['roller', 'roller'],
  ['sled', 'sled machine'],
  ['bike', 'stationary bike'],
  ['elliptical', 'elliptical machine'],
  ['rower', 'upper body ergometer'],
]

/**
 * Noise words that carry no identity.
 *
 * "weighted" is deliberately NOT in here. It looks like a qualifier but it names
 * a different exercise: with it dropped, "Pull-ups" matched "weighted pull-up"
 * and "Bodyweight squats" matched "weighted squat" — both loaded movements
 * prescribed as bodyweight ones. "bodyweight" IS noise, because a bodyweight
 * exercise is our default and their library sometimes says it and sometimes
 * doesn't.
 */
const STOP = new Set([
  'the', 'a', 'and', 'with', 'to', 'on', 'of', 'your', 'v', 'variation', 'version',
  'alternating', 'alternate', 'bodyweight', 'hold', 'holds',
  'male', 'female', 'left', 'right', 'both', 'single', 'one', 'two',
])

const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Identity words of an exercise name. Plurals are folded (length ≥ 3) so
 * "Push-ups" and "push-up" reduce to the same thing — the whole match hinges on
 * that, since our names are written for humans and theirs are not.
 */
const tokens = (s) =>
  norm(s)
    .split(' ')
    .map((t) => (t.length >= 3 && t.endsWith('s') ? t.slice(0, -1) : t))
    .filter((t) => t && !STOP.has(t))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const kb = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`)

// --- the API ----------------------------------------------------------------
//
// Their free endpoint sits behind Cloudflare and starts returning 429 (error
// 1015) after a burst of ~150 requests; it clears in about 30 s. So: every
// response is cached to disk forever, requests are spaced out, and a 429 is
// waited out rather than swallowed. Swallowing it was the original bug — the
// script reported "no match found" for every exercise when the truth was that
// it had been throttled after the first one.

const CACHE_FILE = resolve('scripts/.exercisedb-cache.json')
const INDEX_FILE = resolve(KEY ? 'scripts/.exercisedb-index-full.json' : 'scripts/.exercisedb-index.json')
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {}
let cacheDirty = false
let requests = 0

function saveCache() {
  if (cacheDirty) writeFileSync(CACHE_FILE, JSON.stringify(cache))
  cacheDirty = false
}

// The free tier throttles hard (Cloudflare 1015 after ~150 requests, clearing in
// ~30 s); a paid key does not, so it doesn't have to crawl.
const REQUEST_GAP = KEY ? 120 : 900
const BACKOFF = 45_000 // how long to wait out a 429

export async function query(params) {
  const qs = new URLSearchParams({ ...params, limit: '25' }).toString()
  if (cache[qs]) return cache[qs]

  const url = `${API}/exercises?${qs}`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: AUTH_HEADERS, signal: AbortSignal.timeout(25_000) })
    if (res.status === 429) {
      process.stdout.write(`\n  ⏳ rate limited by ExerciseDB — waiting ${BACKOFF / 1000}s…`)
      await sleep(BACKOFF)
      continue
    }
    if (!res.ok) throw new Error(`ExerciseDB ${res.status} on ${url}`)
    const json = await res.json()
    const out = {
      rows: json.data ?? [],
      total: json.meta?.total ?? (json.data ?? []).length,
      nextCursor: json.meta?.nextCursor ?? null,
    }
    cache[qs] = out
    cacheDirty = true
    requests += 1
    if (requests % 25 === 0) saveCache() // don't lose a long crawl to one crash
    await sleep(REQUEST_GAP)
    return out
  }
  throw new Error('ExerciseDB kept rate limiting us — try again in a few minutes')
}

/**
 * The WHOLE library, pulled once and kept on disk.
 *
 * Pagination is `after=<meta.nextCursor>` — not `offset`, `page` or `cursor`,
 * all of which are silently ignored and hand back page 1 again. That misread
 * cost this script an entire design: it used to fire ~10 narrowing queries per
 * exercise because "the index can't be paginated". With the real parameter it
 * is ~60 requests, once, and every match after that is offline and instant.
 */
async function buildIndex() {
  if (existsSync(INDEX_FILE) && !REINDEX) {
    const cached = JSON.parse(readFileSync(INDEX_FILE, 'utf8'))
    if (cached.length > 0) return cached
  }

  console.log(`📚 Pulling the ExerciseDB index (${KEY ? 'full library, via your key' : 'free tier'}) — one time, then cached on disk…`)
  const all = new Map()
  let after = null
  for (let page = 0; page < 200; page++) {
    const res = await query(after ? { after } : {})
    if (res.rows.length === 0) break
    const before = all.size
    for (const row of res.rows) all.set(row.exerciseId, row)
    process.stdout.write(`\r   ${all.size}${res.total ? ` / ${res.total}` : ''}`)
    // a cursor that stops yielding anything new means we've reached the end (or
    // the server is looping) — either way there is nothing more to fetch
    if (all.size === before || !res.nextCursor) break
    after = res.nextCursor
  }
  console.log('')
  const list = [...all.values()]
  writeFileSync(INDEX_FILE, JSON.stringify(list))
  return list
}

async function byId(id) {
  const res = await fetch(`${API}/exercises/${id}`, { headers: AUTH_HEADERS, signal: AbortSignal.timeout(25_000) })
  if (!res.ok) throw new Error(`ExerciseDB ${res.status} for id ${id}`)
  return (await res.json()).data
}

/**
 * Candidates for one of our exercises, scored against the WHOLE library — no
 * network, no per-exercise queries. Everything is a candidate; `score` sorts
 * them and only the top handful ever leaves this function.
 */
export function candidatesFor(ex, index, equipNames) {
  const ranked = index
    .map((row) => ({ row, s: score(ex, row, equipNames) }))
    .filter((c) => c.s > 0)
    .sort((a, b) => b.s - a.s)
  return ranked.slice(0, 12)
}

/** Same exercise, allowing for plurals, hyphens and filler words ("Push-ups" ≡ "push-up"). */
function sameMove(a, b) {
  const x = tokens(a)
  const y = tokens(b)
  return x.length > 0 && x.length === y.length && x.every((t) => y.includes(t))
}

export function equipmentFor(ex, equipNames) {
  if (!ex.equipmentIds || ex.equipmentIds.length === 0) return 'body weight'
  const text = ex.equipmentIds.map((id) => equipNames.get(id) ?? '').join(' ').toLowerCase()
  for (const [word, theirs] of EQUIPMENT_WORDS) if (text.includes(word)) return theirs
  return '' // unknown gear: don't filter on it, let the name do the work
}

// --- scoring ----------------------------------------------------------------

/**
 * How well does one of their exercises match one of ours? The extra-token
 * penalty is what stops "push-up inside leg kick" from winning "Push-ups".
 */
export function score(ex, theirs, equipNames) {
  const ours = tokens(ex.name)
  const mine = tokens(theirs.name)
  // Same name AND the right kit. Without the second half the shortcut fired
  // before the equipment penalty below could ever apply.
  if (sameMove(ex.name, theirs.name) && equipmentAgrees(ex, theirs, equipNames)) return 1000

  const shared = ours.filter((t) => mine.includes(t))
  if (shared.length === 0) return 0
  let s = (2 * shared.length) / (ours.length + mine.length) * 400

  const theirParts = new Set((ex.parts ?? []).flatMap((p) => BODY_PARTS[p] ?? []))
  if ((theirs.bodyParts ?? []).some((p) => theirParts.has(p))) s += 80

  const wanted = equipmentFor(ex, equipNames)
  if (wanted && (theirs.equipments ?? []).includes(wanted)) s += 60
  else if (wanted === 'body weight' && !(theirs.equipments ?? []).includes('body weight')) s -= 90

  const muscles = [...(theirs.targetMuscles ?? []), ...(theirs.secondaryMuscles ?? [])].map(norm)
  if (ours.some((t) => muscles.includes(t))) s += 40

  // every word of theirs we did NOT ask for makes it a different exercise
  s -= mine.filter((t) => !ours.includes(t)).length * 45
  return Math.round(s)
}

/** Does their entry use the kit we actually have? A loaded version of a bodyweight move does not. */
function equipmentAgrees(ex, theirs, equipNames) {
  const wanted = equipmentFor(ex, equipNames)
  if (!wanted) return true // we couldn't map our gear; don't let that veto a match
  return (theirs.equipments ?? []).includes(wanted)
}

// Scoring RANKS candidates; it does not get to accept them. Only a true name
// match (`sameMove`) is auto-accepted — an early version let anything above a
// numeric threshold through and cheerfully matched "Wall sit" to "march sit
// (wall)" and "Pike push-ups" to "side push-up". A wrong animation teaches bad
// form, so everything short of certain goes to the model, which is allowed to
// answer "none of these".

// --- the AI tie-breaker -----------------------------------------------------

/** One batched claude call for everything scoring couldn't settle. Returns ourId → theirId|null. */
export function askClaude(open) {
  const blocks = open.map(({ ex, ranked }) => {
    const options = ranked
      .slice(0, 8)
      .map((c, i) => `     ${i + 1}. id=${c.row.exerciseId} "${c.row.name}" [${(c.row.bodyParts ?? []).join('/')}] equipment=${(c.row.equipments ?? []).join('/')} target=${(c.row.targetMuscles ?? []).join('/')}`)
      .join('\n')
    return `- OUR EXERCISE id=${ex.id} "${ex.name}"  (body parts: ${(ex.parts ?? []).join('/')}, how: ${String(ex.how ?? '').slice(0, 120)})\n   candidates:\n${options}`
  })

  const prompt = `You are matching exercises in a personal training app to demonstration animations from the ExerciseDB library.

For each of OUR exercises below, pick the ONE candidate that demonstrates the same movement.

${blocks.join('\n\n')}

For each one answer with a fit:
- "same"  — the same movement. Differences in equipment brand, camera angle or rep count don't matter.
- "close" — not identical, but it demonstrates the same basic pattern well enough to be useful
            (e.g. "bench dip on floor" for chair dips, "low glute bridge on floor" for a glute bridge).
            The app LABELS these as approximate, so a close match is genuinely useful — don't be shy with it.
- null    — nothing here shows this movement. A candidate that adds a move our exercise doesn't have
            ("push-up inside leg kick" for a plain push-up, "march sit (wall)" for a static wall sit)
            is NOT close, it is wrong. Showing wrong form is worse than showing nothing, so answer null.

Answer with ONLY a JSON object mapping our exercise id to the pick, or null:
{"mv-example": {"id": "AbC123", "fit": "same"}, "mv-two": {"id": "Xy9", "fit": "close"}, "mv-three": null}`

  const out = execFileSync('claude', ['--model', 'opus', '--effort', 'medium', '-p', prompt], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const a = out.indexOf('{')
  const b = out.lastIndexOf('}')
  if (a === -1 || b === -1) throw new Error('no JSON object in claude output')
  return JSON.parse(out.slice(a, b + 1))
}

// --- media ------------------------------------------------------------------

/** GIF → an animated webp (the movement) and a single still (the list thumbnail). */
async function convert(gifUrl) {
  const res = await fetch(gifUrl, { signal: AbortSignal.timeout(45_000) })
  if (!res.ok) throw new Error(`gif ${res.status}`)
  const gif = Buffer.from(await res.arrayBuffer())
  const anim = await sharp(gif, { animated: true }).webp({ quality: 70, effort: 4 }).toBuffer()
  const poster = await sharp(gif).webp({ quality: 72 }).toBuffer()
  return { anim, poster, original: gif.length }
}

function makeUploader(app) {
  if (TO === 'public') {
    mkdirSync(PUBLIC_DIR, { recursive: true })
    return async (name, buf) => {
      writeFileSync(join(PUBLIC_DIR, name), buf)
      return `/gym/moves/${name}`
    }
  }
  const storage = getStorage(app)
  return async (name, buf) => {
    const r = storageRef(storage, `gym/moves/${name}`)
    await uploadBytes(r, buf, { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' })
    return await getDownloadURL(r)
  }
}

// --- main -------------------------------------------------------------------

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const ref = doc(db, 'app', 'gymCatalog')
  const snap = await getDoc(ref)
  // No catalog at all is fine — the 20 built-in bodyweight moves still deserve
  // animations, and this run is what creates the doc.
  const equipment = snap.exists() ? (snap.data().equipment ?? []) : []
  const exercises = snap.exists() ? (snap.data().exercises ?? []) : []
  if (!snap.exists()) console.log('ℹ️  No catalog yet — doing the built-in bodyweight moves. Run `npm run gym:equipment` to add your gear.\n')
  const equipNames = new Map(equipment.map((e) => [e.id, e.name]))

  // built-ins that have no override row yet are pulled in as candidates; only
  // the ones that actually find a demo get written back
  const stored = new Set(exercises.map((e) => e.id))
  const pending = STARTERS.filter((s) => !stored.has(s.id)).map((s) => ({ ...s }))

  const targets = [...exercises, ...pending].filter(
    (e) => !e.retired && (ONLY ? e.id === ONLY : REFRESH || !e.demo),
  )
  if (targets.length === 0) {
    console.log('✓ Every exercise already has a demo. Use --refresh to redo them.')
    process.exit(0)
  }
  console.log(`🎬 ${targets.length} exercise(s) need a demo (${exercises.length} in the catalog + ${STARTERS.length} built in)\n`)

  // 1. match
  const decided = new Map() // ourId -> { row, how }
  const open = []

  const index = await buildIndex()
  console.log(`📖 ${index.length} exercises in the library\n`)

  for (const ex of targets) {
    if (PINS.has(ex.id)) {
      decided.set(ex.id, { row: await byId(PINS.get(ex.id)), how: 'manual' })
      console.log(`  📌 ${ex.name} → pinned`)
      continue
    }
    const ranked = candidatesFor(ex, index, equipNames)
    const best = ranked[0]
    const runnerUp = ranked[1]?.s ?? 0
    if (!best) {
      console.log(`  ✗  ${ex.name} — nothing similar in the library`)
      continue
    }
    if (best.s >= 1000) {
      decided.set(ex.id, { row: best.row, how: 'exact' })
      console.log(`  ✓  ${ex.name} → "${best.row.name}"`)
    } else {
      open.push({ ex, ranked })
      console.log(`  ?  ${ex.name} — ambiguous, best "${best.row.name}" (${best.s} vs ${runnerUp})`)
    }
  }

  // 2. let the model settle the ambiguous ones — this is exactly the judgement
  //    call a scoring function is bad at and a model is good at
  if (open.length > 0 && !NO_AI) {
    console.log(`\n🧠 Asking claude to settle ${open.length} ambiguous match(es)…`)
    try {
      const picks = askClaude(open)
      for (const { ex, ranked } of open) {
        const pick = picks[ex.id]
        const id = typeof pick === 'string' ? pick : pick?.id // tolerate the older flat shape
        const fit = typeof pick === 'object' && pick?.fit === 'close' ? 'close' : 'ai'
        const row = id ? ranked.find((c) => c.row.exerciseId === id)?.row : null
        if (row) {
          decided.set(ex.id, { row, how: fit })
          console.log(`  ${fit === 'close' ? '≈' : '✓'}  ${ex.name} → "${row.name}"${fit === 'close' ? ' (approximate)' : ''}`)
        } else {
          console.log(`  ✗  ${ex.name} — no honest match, keeping its emoji`)
        }
      }
    } catch (e) {
      console.log(`  ⚠️  claude couldn't be reached (${e.message}); leaving these unmatched`)
    }
  } else if (open.length > 0) {
    console.log(`\n⚠️  ${open.length} ambiguous match(es) skipped (--no-ai). Pin them with --pin=<ourId>:<theirId>.`)
  }

  saveCache()
  console.log(`\n📊 Matched ${decided.size} of ${targets.length}`)
  if (DRY) {
    console.log('🧪 --dry-run: nothing downloaded, nothing written.')
    process.exit(0)
  }
  if (decided.size === 0) process.exit(0)

  // 3. download, shrink, upload
  mkdirSync(WORK_DIR, { recursive: true })
  const upload = makeUploader(app)
  const byIdMap = new Map([...exercises, ...pending].map((e) => [e.id, e]))
  let animBytes = 0
  let posterBytes = 0
  let originalBytes = 0
  let done = 0

  for (const [ourId, { row, how }] of decided) {
    const ex = byIdMap.get(ourId)
    try {
      const { anim, poster, original } = await convert(row.gifUrl)
      const [animUrl, posterUrl] = await Promise.all([
        upload(`${ourId}.webp`, anim),
        upload(`${ourId}-poster.webp`, poster),
      ])
      ex.demo = { anim: animUrl, poster: posterUrl, source: 'ExerciseDB', sourceId: row.exerciseId, sourceName: row.name, match: how }
      // a built-in earning a demo becomes a real catalog row from now on
      if (!stored.has(ex.id)) {
        exercises.push(ex)
        stored.add(ex.id)
      }
      animBytes += anim.length
      posterBytes += poster.length
      originalBytes += original
      done += 1
      process.stdout.write(`\r  ⬇  ${done}/${decided.size} — ${ex.name.slice(0, 34).padEnd(34)}`)
    } catch (e) {
      console.log(`\n  ⚠️  ${ex.name}: ${e.message}`)
    }
  }
  console.log('')

  await setDoc(ref, { equipment, exercises, updatedAt: new Date().toISOString() })
  rmSync(WORK_DIR, { recursive: true, force: true })

  console.log(`\n✅ ${done} demo(s) saved to ${TO === 'public' ? 'public/gym/moves/' : 'Firebase Storage (gym/moves/)'}`)
  console.log(`   ${kb(originalBytes)} of source GIFs → ${kb(animBytes)} of animation + ${kb(posterBytes)} of stills`)
  console.log(`   Lists load only the ${kb(posterBytes)} of stills; an animation is fetched when you open that exercise,`)
  console.log('   and the service worker then caches it forever — a second view transfers nothing.')
  console.log('   Check them in the Gym app → Gear. A wrong one: --pin=<ourExerciseId>:<theirExerciseId>')
  process.exit(0)
}

/** Only run when invoked directly — importing this file just exposes the matcher. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(onError)
}

function onError(err) {
  saveCache() // a crash mid-crawl must not throw away the requests already paid for
  if (String(err?.code) === 'storage/unauthorized' || String(err?.message).includes('storage/unknown')) {
    console.error('❌ Firebase Storage rejected the upload.')
    console.error('   Enable Storage once in the Firebase console, then: firebase deploy --only storage')
    console.error('   Or skip Storage entirely and serve from the app bundle: npm run gym:demos -- --to=public')
    process.exit(1)
  }
  console.error('❌', err.message ?? err)
  process.exit(1)
}
