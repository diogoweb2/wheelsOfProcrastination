// Give every exercise in the catalog a still image and a looping animation of
// the movement: `npm run gym:demos`.
//
// THREE sources, tried in order. We take ONLY the handful that match exercises we
// actually own and re-host those on our own Firebase Storage, so the app never
// depends on someone else's CDN staying up and we never mirror a library we
// don't use.
//
//   1. ExerciseDB's free open endpoint (https://oss.exercisedb.dev/api/v1) —
//      1,500 exercises, no API key, no account, a real GIF of the movement.
//   2. free-exercise-db (https://github.com/yuhonas/free-exercise-db) — 873
//      exercises, public domain (Unlicense), a plain JSON file on GitHub. It
//      has no GIFs: every entry is TWO photos, the start and the end of the
//      movement, which we turn into a two-frame animation (~1 s a frame). Less
//      pretty than a GIF, but it covers basics ExerciseDB's free tier simply
//      does not have — Superman, dead bug, arm circles, plank — and a bad still
//      of the right movement still beats an emoji.
//
//   3. the open web — a Giphy search, for the moves NEITHER library has (bird
//      dog, wall sit, hollow hold, jumping jacks). Its results are mostly junk,
//      so the model is shown frames of the top few and picks by LOOKING, or
//      answers "none". Needs the claude CLI; `--no-ai` switches it off entirely.
//
// Each source only ever sees what the one before it couldn't match, so nothing
// already animated gets downgraded to a two-frame flip or a stranger's GIF.
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
//   --no-photos            skip source 2 (the two-frame photo fallback)
//   --no-web               skip source 3 (the web search)
//   --gif=<ourId>:<url>    use an image YOU found for that exercise (repeatable).
//                          Neither free library has bird dog, wall sit, hollow
//                          hold or jumping jacks, and no automatic search can
//                          fill that: an image-search page is JavaScript, and
//                          picking a demo that shows correct form is a judgement
//                          call anyway. So you pick it (right-click → Copy image
//                          address) and this handles the rest — animated GIF,
//                          WebP, PNG, JPG or SVG all work, resized and converted
//                          exactly like a library match. Check what you paste is
//                          yours to use.
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
const NO_PHOTOS = args.includes('--no-photos')
const NO_WEB = args.includes('--no-web')
const REINDEX = args.includes('--reindex')
const ONLY = flag('only', null)
const TO = flag('to', 'storage')
const PINS = new Map(
  args.filter((a) => a.startsWith('--pin=')).map((a) => a.slice(6).split(':')),
)
// --gif=<ourId>:<url> — an image you found yourself. Split on the FIRST colon
// only, or `https:` eats the URL.
const GIFS = new Map(
  args
    .filter((a) => a.startsWith('--gif='))
    .map((a) => a.slice(6))
    .map((v) => [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)]),
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

// --- source 2: free-exercise-db ---------------------------------------------
//
// One JSON file on GitHub, public domain, no key and no rate limit. Every entry
// carries exactly two photos — the start and the end of the movement — so a
// match here becomes a two-frame animation rather than a GIF.
//
// Its rows are RESHAPED into ExerciseDB's field names below, which is the whole
// trick: scoring, the shortlist and the AI tie-breaker then work on it without
// knowing a second source exists.

const FDB_JSON = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const FDB_IMAGES = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const FDB_FILE = resolve('scripts/.free-exercise-db.json')

/** Their muscle names → the body-part vocabulary the scorer already speaks. */
const FDB_BODY_PART = {
  abdominals: 'waist',
  abductors: 'upper legs',
  adductors: 'upper legs',
  biceps: 'upper arms',
  calves: 'lower legs',
  chest: 'chest',
  forearms: 'lower arms',
  glutes: 'upper legs',
  hamstrings: 'upper legs',
  lats: 'back',
  'lower back': 'back',
  'middle back': 'back',
  neck: 'neck',
  quadriceps: 'upper legs',
  shoulders: 'shoulders',
  traps: 'back',
  triceps: 'upper arms',
}

/** Their equipment names → ExerciseDB's. `body only` → `body weight` matters most: the scorer penalises a loaded match for a bodyweight move. */
const FDB_EQUIPMENT = {
  'body only': 'body weight',
  bands: 'band',
  barbell: 'barbell',
  cable: 'cable',
  dumbbell: 'dumbbell',
  'e-z curl bar': 'ez barbell',
  'exercise ball': 'stability ball',
  'foam roll': 'roller',
  kettlebells: 'kettlebell',
  machine: 'leverage machine',
  'medicine ball': 'medicine ball',
}

async function buildPhotoIndex() {
  if (existsSync(FDB_FILE) && !REINDEX) {
    const cached = JSON.parse(readFileSync(FDB_FILE, 'utf8'))
    if (cached.length > 0) return cached
  }
  const res = await fetch(FDB_JSON, { signal: AbortSignal.timeout(45_000) })
  if (!res.ok) throw new Error(`free-exercise-db ${res.status}`)
  const rows = (await res.json()).map((e) => ({
    exerciseId: e.id,
    name: e.name,
    bodyParts: [...new Set((e.primaryMuscles ?? []).map((m) => FDB_BODY_PART[m]).filter(Boolean))],
    equipments: [FDB_EQUIPMENT[e.equipment] ?? ''].filter(Boolean),
    targetMuscles: e.primaryMuscles ?? [],
    secondaryMuscles: e.secondaryMuscles ?? [],
    // start frame and end frame, in that order
    frames: (e.images ?? []).map((p) => FDB_IMAGES + p.split('/').map(encodeURIComponent).join('/')),
  })).filter((r) => r.frames.length >= 2)
  writeFileSync(FDB_FILE, JSON.stringify(rows))
  return rows
}

// --- source 3: the open web -------------------------------------------------
//
// Last resort, for the moves neither library has (bird dog, wall sit, hollow
// hold, jumping jacks). It searches Giphy, because that is a GIF index whose
// search page is plain server-rendered HTML — an image-search page is JavaScript
// and has nothing to fetch, and Giphy's own API now answers `403 BANNED` to the
// old public demo key.
//
// THE SEARCH IS THE EASY HALF AND THE RESULTS ARE MOSTLY GARBAGE. A search for
// "bird dog exercise" returns, in order: a beagle on a treadmill, an Angry Birds
// cartoon, a band called BirdDog — and, eighth, an actual bird dog demo. Titles
// don't separate those ("dogs bird GIF" vs "Bird Dog Calisthenics GIF"), and no
// text score ever will.
//
// So the model LOOKS AT THEM. Three frames of each candidate are written to disk
// and claude is asked to read the images and name the one that demonstrates the
// movement with correct form — or none of them. That is the same rule the rest
// of this script follows (a wrong animation teaches bad form), and it is why
// `--no-ai` switches this source off completely rather than falling back to a
// text guess: nothing from the open web is accepted unseen.
//
// What it finds is a stranger's GIF, re-hosted for one family's app. The source
// URL is recorded on the demo, and Gear removes a bad one in a tap.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
const WEB_CANDIDATES = 6 // how many get looked at; more is slower and rarely better
const WEB_FRAMES = 3 // frames per candidate — start, middle, end is enough to recognise a movement

/** Giphy search results, best-guess-first, as `{ id, title, gif, preview }`. */
async function searchWeb(query) {
  const slug = norm(query).split(' ').filter(Boolean).join('-')
  const res = await fetch(`https://giphy.com/search/${encodeURIComponent(slug)}`, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`giphy ${res.status}`)
  const html = await res.text()

  const out = []
  const seen = new Set()
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1]
    const id = src?.match(/media\d?\.giphy\.com\/media\/(?:[^/]+\/)?([A-Za-z0-9]{8,})\//)?.[1]
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      title: (tag.match(/\balt="([^"]*)"/)?.[1] ?? '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"'),
      // clean URLs: no cid token, so they keep working
      gif: `https://i.giphy.com/${id}.gif`,
      preview: `https://i.giphy.com/media/${id}/200w.gif`,
    })
  }
  return out
}

/** Three frames of one candidate, on disk, for the model to look at. */
async function sampleFrames(url, dir, prefix) {
  const buf = await download(url)
  const meta = await sharp(buf, { animated: true }).metadata()
  const pages = meta.pages ?? 1
  const paths = []
  for (let i = 0; i < WEB_FRAMES; i++) {
    const page = Math.min(pages - 1, Math.round((i * (pages - 1)) / Math.max(1, WEB_FRAMES - 1)))
    const p = join(dir, `${prefix}-${i}.png`)
    await sharp(buf, { page, pages: 1 }).resize({ width: 280, withoutEnlargement: true }).png().toFile(p)
    paths.push(p)
  }
  return paths
}

/**
 * Search the web for the exercises nothing else could cover, and let the model
 * pick by looking. Writes straight into `decided`.
 */
async function webPass({ targets, decided }) {
  const dir = join(WORK_DIR, 'candidates')
  mkdirSync(dir, { recursive: true })

  for (const ex of targets) {
    let found
    try {
      found = (await searchWeb(`${ex.name} exercise`)).slice(0, WEB_CANDIDATES)
    } catch (e) {
      console.log(`  ⚠️  ${ex.name} — search failed (${e.message})`)
      continue
    }
    if (found.length === 0) {
      console.log(`  ✗  ${ex.name} — nothing came back`)
      continue
    }

    const shots = []
    for (const [i, c] of found.entries()) {
      try {
        shots.push({ ...c, n: i + 1, paths: await sampleFrames(c.preview, dir, `${ex.id}-${i + 1}`) })
      } catch {
        // a candidate we can't even open is a candidate we can't judge
      }
    }
    if (shots.length === 0) {
      console.log(`  ✗  ${ex.name} — none of the results could be opened`)
      continue
    }

    const pick = askClaudeToLook(ex, shots)
    const hit = shots.find((s) => s.n === pick)
    if (!hit) {
      console.log(`  ✗  ${ex.name} — nothing on the page shows the movement`)
      continue
    }
    decided.set(ex.id, {
      row: { exerciseId: hit.id, name: hit.title || ex.name, gifUrl: hit.gif, byHand: true },
      how: 'ai',
      source: 'giphy.com',
    })
    console.log(`  ✓  ${ex.name} → #${hit.n} “${hit.title}”`)
  }
}

/** Show the model the frames and let it answer with a number, or 0 for none. */
function askClaudeToLook(ex, shots) {
  const blocks = shots
    .map((s) => `Candidate ${s.n} — titled "${s.title}"\n${s.paths.map((p) => `  ${p}`).join('\n')}`)
    .join('\n\n')

  const prompt = `A personal training app needs a demonstration animation for one exercise. I searched a GIF site, and most results are junk — cartoons, pets, band logos — with at most one real demonstration.

THE EXERCISE: "${ex.name}"
How it is performed: ${String(ex.how ?? '').slice(0, 300)}
Muscles: ${(ex.parts ?? []).join(', ')}

Below are the candidates. Each is a few frames sampled from one GIF, as image files. READ EVERY IMAGE FILE with the Read tool before answering — you are being asked to judge what is in the pictures, not what the titles say.

${blocks}

Pick the ONE candidate that shows a person performing this exact exercise with correct form.

Answer 0 — meaning none — unless you are confident. Reject: cartoons and animals, a different exercise, a person talking or posing, text-only cards, and anything where form looks wrong. Showing the wrong movement teaches the wrong movement, so 0 is the right answer far more often than not.

Reply with ONLY a JSON object: {"pick": <candidate number, or 0>}`

  try {
    const out = execFileSync('claude', ['--model', 'opus', '--effort', 'medium', '-p', prompt], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    const a = out.indexOf('{')
    const b = out.lastIndexOf('}')
    if (a === -1 || b === -1) return 0
    return Number(JSON.parse(out.slice(a, b + 1)).pick) || 0
  } catch (e) {
    console.log(`  ⚠️  claude couldn't be reached (${e.message})`)
    return 0
  }
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
export function askClaude(open, library = 'the ExerciseDB library') {
  const blocks = open.map(({ ex, ranked }) => {
    const options = ranked
      .slice(0, 8)
      .map((c, i) => `     ${i + 1}. id=${c.row.exerciseId} "${c.row.name}" [${(c.row.bodyParts ?? []).join('/')}] equipment=${(c.row.equipments ?? []).join('/')} target=${(c.row.targetMuscles ?? []).join('/')}`)
      .join('\n')
    return `- OUR EXERCISE id=${ex.id} "${ex.name}"  (body parts: ${(ex.parts ?? []).join('/')}, how: ${String(ex.how ?? '').slice(0, 120)})\n   candidates:\n${options}`
  })

  const prompt = `You are matching exercises in a personal training app to demonstration animations from ${library}.

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

/** Everything is rendered at ExerciseDB's own size, so a photo demo and a GIF demo weigh and look the same in a list. */
const DEMO_PX = 180

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(45_000) })
  if (!res.ok) throw new Error(`${res.status} on ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

/** GIF → an animated webp (the movement) and a single still (the list thumbnail). */
async function convert(row) {
  if (row.frames) return convertPhotos(row.frames)
  if (row.byHand) return convertAny(row.gifUrl)
  const gif = await download(row.gifUrl)
  const anim = await sharp(gif, { animated: true }).webp({ quality: 70, effort: 4 }).toBuffer()
  const poster = await sharp(gif).webp({ quality: 72 }).toBuffer()
  return { anim, poster, original: gif.length }
}

/**
 * Whatever `--gif=` was pointed at → the same pair of files. The libraries hand
 * us a known 180px GIF; a URL you found by hand could be a 4 MB animation, a
 * still photo or an SVG, so this one resizes and never enlarges. A still image
 * is a perfectly good demo — it just doesn't move.
 */
async function convertAny(url) {
  const buf = await download(url)
  const box = { width: DEMO_PX, height: DEMO_PX, fit: 'inside', withoutEnlargement: true }
  // `density` only matters for SVG: without it a vector rasterises at 72 dpi and lands blurry.
  const meta = await sharp(buf, { animated: true, density: 300 }).metadata()
  const anim =
    (meta.pages ?? 1) > MAX_FRAMES
      ? await thin(buf, meta, box)
      : await sharp(buf, { animated: true, density: 300 }).resize(box).webp({ quality: 70, effort: 4 }).toBuffer()
  const poster = await sharp(buf, { density: 300 }).resize(box).webp({ quality: 72 }).toBuffer()
  return { anim, poster, original: buf.length }
}

/**
 * A phone video of an exercise runs at 25 fps; the libraries' line-art loops are
 * ~30 frames total. So a hand-picked GIF is routinely 70+ frames and 150 KB of
 * WebP — seven times the budget for something the eye can't tell apart from a
 * sixth of the frames. Keep every Nth, and give each survivor the airtime of the
 * frames it replaced so the movement still plays at its real speed.
 */
const MAX_FRAMES = 14

async function thin(buf, meta, box) {
  const step = Math.ceil(meta.pages / MAX_FRAMES)
  const delays = meta.delay ?? []
  const kept = []
  const delay = []
  for (let i = 0; i < meta.pages; i += step) {
    kept.push(await sharp(buf, { page: i, pages: 1 }).resize(box).png().toBuffer())
    // the frames between this one and the next are gone; their time isn't
    delay.push(delays.slice(i, i + step).reduce((n, d) => n + d, 0) || 80 * step)
  }
  return await sharp(kept, { join: { animated: true } })
    .webp({ quality: 62, effort: 5, delay, loop: 0 })
    .toBuffer()
}

/**
 * Two photos (start of the movement, end of it) → the same pair of files a GIF
 * produces, so nothing downstream — the app, the cache, the Gear tab — can tell
 * the two sources apart. A second a frame is slow enough to read as "this
 * position, then that one" rather than a flicker.
 */
async function convertPhotos(urls) {
  const shots = await Promise.all(urls.map(download))
  const frames = await Promise.all(
    shots.map((b) => sharp(b).resize(DEMO_PX, DEMO_PX, { fit: 'cover' }).png().toBuffer()),
  )
  const anim = await sharp(frames, { join: { animated: true } })
    .webp({ quality: 70, effort: 4, delay: frames.map(() => 1000), loop: 0 })
    .toBuffer()
  const poster = await sharp(shots[0]).resize(DEMO_PX, DEMO_PX, { fit: 'cover' }).webp({ quality: 72 }).toBuffer()
  return { anim, poster, original: shots.reduce((n, b) => n + b.length, 0) }
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

// --- matching a batch against one library ------------------------------------

/**
 * Score every target against one library, auto-accept only true name matches and
 * let the model settle the rest. Writes into `decided` (ourId → { row, how,
 * source }); anything it can't settle is simply left out, which is what lets the
 * photo library have a second go at it.
 */
async function matchPass({ targets, index, equipNames, decided, source, library, pins = false }) {
  const open = []

  for (const ex of targets) {
    if (pins && PINS.has(ex.id)) {
      decided.set(ex.id, { row: await byId(PINS.get(ex.id)), how: 'manual', source })
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
      decided.set(ex.id, { row: best.row, how: 'exact', source })
      console.log(`  ✓  ${ex.name} → "${best.row.name}"`)
    } else {
      open.push({ ex, ranked })
      console.log(`  ?  ${ex.name} — ambiguous, best "${best.row.name}" (${best.s} vs ${runnerUp})`)
    }
  }

  // let the model settle the ambiguous ones — this is exactly the judgement call
  // a scoring function is bad at and a model is good at
  if (open.length === 0) return
  if (NO_AI) {
    console.log(`\n⚠️  ${open.length} ambiguous match(es) skipped (--no-ai). Pin them with --pin=<ourId>:<theirId>.`)
    return
  }
  console.log(`\n🧠 Asking claude to settle ${open.length} ambiguous match(es)…`)
  try {
    const picks = askClaude(open, library)
    for (const { ex, ranked } of open) {
      const pick = picks[ex.id]
      const id = typeof pick === 'string' ? pick : pick?.id // tolerate the older flat shape
      const fit = typeof pick === 'object' && pick?.fit === 'close' ? 'close' : 'ai'
      const row = id ? ranked.find((c) => c.row.exerciseId === id)?.row : null
      if (row) {
        decided.set(ex.id, { row, how: fit, source })
        console.log(`  ${fit === 'close' ? '≈' : '✓'}  ${ex.name} → "${row.name}"${fit === 'close' ? ' (approximate)' : ''}`)
      } else {
        console.log(`  ✗  ${ex.name} — no honest match here`)
      }
    }
  } catch (e) {
    console.log(`  ⚠️  claude couldn't be reached (${e.message}); leaving these unmatched`)
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

  // an exercise you handed a URL for is always in play, demo or not — that IS
  // the "this one is wrong, use mine instead" gesture
  const targets = [...exercises, ...pending].filter(
    (e) => !e.retired && (GIFS.has(e.id) || (ONLY ? e.id === ONLY : REFRESH || !e.demo)),
  )
  const unknownGif = [...GIFS.keys()].filter((id) => !targets.some((e) => e.id === id))
  if (unknownGif.length > 0) {
    console.log(`⚠️  --gif for unknown exercise id(s): ${unknownGif.join(', ')} — check Gear for the real id.\n`)
  }
  if (targets.length === 0) {
    console.log('✓ Every exercise already has a demo. Use --refresh to redo them.')
    process.exit(0)
  }
  console.log(`🎬 ${targets.length} exercise(s) need a demo (${exercises.length} in the catalog + ${STARTERS.length} built in)\n`)

  // 0. anything you picked yourself is already decided — no scoring, no model
  const decided = new Map() // ourId -> { row, how, source }
  for (const [id, url] of GIFS) {
    if (unknownGif.includes(id)) continue
    const ex = targets.find((e) => e.id === id)
    decided.set(id, {
      row: { exerciseId: url, name: `${ex.name} (chosen by hand)`, gifUrl: url, byHand: true },
      how: 'manual',
      source: new URL(url).hostname.replace(/^www\./, ''),
    })
    console.log(`  🖐  ${ex.name} → ${url}`)
  }

  // 1. match the rest — the GIF library first. Nothing to match means nothing to
  //    crawl, so a pure `--gif=` run touches no library at all.
  const toMatch = targets.filter((e) => !decided.has(e.id))
  if (toMatch.length > 0) {
    const index = await buildIndex()
    console.log(`📖 ${index.length} exercises in the library\n`)
    await matchPass({
      targets: toMatch,
      index,
      equipNames,
      decided,
      source: 'ExerciseDB',
      library: 'the ExerciseDB library',
      pins: true,
    })
  }

  // 2. whatever it couldn't cover gets a second chance at the photo library —
  //    ExerciseDB's free tier has no plank, wall sit, bird dog or superman, and
  //    two photos of the right movement beat an emoji
  let leftovers = targets.filter((e) => !decided.has(e.id))
  if (leftovers.length > 0 && !NO_PHOTOS) {
    const photos = await buildPhotoIndex()
    console.log(`\n📷 ${leftovers.length} still unmatched — trying free-exercise-db (${photos.length} exercises, start/end photos)\n`)
    await matchPass({
      targets: leftovers,
      index: photos,
      equipNames,
      decided,
      source: 'free-exercise-db',
      library: 'the free-exercise-db photo library, where each exercise is two photos: the START and the END of the movement',
    })
  }

  // 3. still nothing? search the open web and let the model look at what comes
  //    back. Off without AI on purpose — a web result is never taken unseen.
  leftovers = targets.filter((e) => !decided.has(e.id))
  if (leftovers.length > 0 && !NO_WEB && !NO_AI && !DRY) {
    console.log(`\n🌐 ${leftovers.length} left — searching the web and looking at the results\n`)
    await webPass({ targets: leftovers, decided })
  } else if (leftovers.length > 0 && !NO_WEB && NO_AI) {
    console.log(`\n🌐 ${leftovers.length} left — the web search needs the model to judge what it finds, so --no-ai skips it.`)
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

  for (const [ourId, { row, how, source }] of decided) {
    const ex = byIdMap.get(ourId)
    try {
      const { anim, poster, original } = await convert(row)
      const [animUrl, posterUrl] = await Promise.all([
        upload(`${ourId}.webp`, anim),
        upload(`${ourId}-poster.webp`, poster),
      ])
      ex.demo = { anim: animUrl, poster: posterUrl, source, sourceId: row.exerciseId, sourceName: row.name, match: how }
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
