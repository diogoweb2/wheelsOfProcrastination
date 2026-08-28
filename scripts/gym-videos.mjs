// Give every exercise a SHORT YouTube demonstration: `npm run gym:videos`.
//
// The animation (§18l) shows you the shape of a movement in 21 KB. It cannot
// tell you to keep your elbows tucked. This fills that gap with the thing a
// beginner actually wants at the machine — thirty seconds of a person doing it
// and saying what matters — and it is the ONE piece of gym media we do not
// re-host: it is an embed, chosen by id, played only when tapped.
//
// WHY THERE IS NO API KEY HERE. The YouTube Data API needs a Google Cloud
// project, a key, and a 100-unit-per-search quota that a full catalog run would
// eat in an afternoon. The search page itself is server-rendered: every result
// is already in a `ytInitialData` blob in the HTML, ten of them, with title,
// channel, view count and length. One request per exercise, no account, no
// quota, nothing to leak into the repo.
//
// PICKING IS THE HARD PART, exactly as it was for the animations. YouTube's own
// ranking optimises for watch time, which is the opposite of what is wanted
// here: the top hit for "push up" is a 40-million-view essay on the perfect
// push-up. So we ignore their order, keep only clips at or under --max seconds
// (default 90 — you are standing in a basement, not watching a lecture), score
// what is left on the title, and hand anything ambiguous to the claude CLI with
// a shortlist. It may answer "none", and none is a perfectly good answer: an
// exercise with no video keeps its animation and its written steps.
//
// EMBEDDABILITY IS CHECKED, because it is invisible until it fails. An uploader
// can forbid embedding, and there is no way for the app to notice — the player
// just shows "watch on YouTube" inside a box the size of a phone. So every pick
// is confirmed against the watch page (`playableInEmbed`) before it is written,
// and a video that fails hands over to the runner-up. The same fetch is where
// the exact length comes from.
//
// YOUR PICK ALWAYS WINS. A video you pasted in the app (`source: 'manual'`) is
// never replaced by this script, not even with --refresh — only by naming it
// with --only or --pin. The app is the editor; this is just the first draft.
//
// Flags:
//   --dry-run            search, score, report — write nothing
//   --refresh            redo exercises that already have a picked video
//   --only=<exerciseId>  just this one
//   --pin=<id>:<url>     use this exact video for that exercise (repeatable)
//   --max=<seconds>      longest clip we'll accept (default 90)
//   --no-ai              never call claude; only unambiguous picks are taken
//   --verbose            print the whole scored shortlist for each exercise
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

// The same list the app ships, so the built-in bodyweight moves are covered too.
const STARTERS = JSON.parse(readFileSync(resolve('src/logic/gymStarters.json'), 'utf8'))

const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

const args = process.argv.slice(2)
const flag = (n, d) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : d
}
const DRY = args.includes('--dry-run')
const REFRESH = args.includes('--refresh')
const NO_AI = args.includes('--no-ai')
const VERBOSE = args.includes('--verbose')
const ONLY = flag('only', null)
const MAX_SEC = Number(flag('max', '90'))
const PINS = new Map(
  args.filter((a) => a.startsWith('--pin=')).map((a) => {
    const rest = a.slice(6)
    const cut = rest.indexOf(':')
    return [rest.slice(0, cut), rest.slice(cut + 1)]
  }),
)

// A browser's headers, because a bare fetch gets the consent wall. `CONSENT=YES+1`
// is what clicking "accept" sets, and without it Europe gets a redirect instead
// of results.
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  cookie: 'CONSENT=YES+1',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * YouTube stops answering a burst of requests from one address — the tenth
 * fetch of a run just fails, with no status to read. So every request is
 * retried with a widening pause, and the whole run is deliberately slow: a
 * catalog gets its videos once, and being a good guest costs a few minutes.
 */
async function fetchText(url, tries = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      if (attempt >= tries) throw e
      await sleep(attempt * 4000)
    }
  }
}

/** `0:47` / `1:02:11` → seconds. */
function toSeconds(text) {
  if (!text) return undefined
  const parts = text.split(':').map(Number)
  if (parts.some((n) => !Number.isFinite(n))) return undefined
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

/** Pull every `videoRenderer` out of the search page's data blob. */
function parseResults(html) {
  const m = html.match(/var ytInitialData = (\{.+?\});<\/script>/s)
  if (!m) return []
  const out = []
  JSON.parse(m[1], (key, value) => {
    if (key === 'videoRenderer' && value?.videoId) {
      out.push({
        id: value.videoId,
        title: value.title?.runs?.[0]?.text ?? '',
        channel: value.ownerText?.runs?.[0]?.text ?? value.longBylineText?.runs?.[0]?.text ?? '',
        sec: toSeconds(value.lengthText?.simpleText),
        views: Number((value.viewCountText?.simpleText ?? '').replace(/\D/g, '')) || 0,
      })
    }
    return value
  })
  return out
}

/**
 * `sp=EgIYAQ%3D%3D` is YouTube's own "under 4 minutes" filter. It is applied
 * before ranking, so it buys a whole page of short results rather than one or
 * two survivors at the bottom of a page of essays.
 */
async function search(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIYAQ%253D%253D`
  return parseResults(await fetchText(url))
}

// Words that say "this is a demonstration" and words that say "this is content
// about the exercise". The second kind is the trap: a video called "I did 100
// push-ups every day" matches the name perfectly and teaches nothing.
const GOOD = /\bhow to\b|\bproper\b|\bcorrect\b|\bform\b|\btechnique\b|\btutorial\b|\bdemo|\bguide\b|\bexercise\b/i
const BAD = /\bevery day\b|\bchallenge\b|\bi did\b|\bmistakes?\b|\bstop\b|\bworst\b|\bwhy\b|\bvs\.?\b|\bworkout\b|\bday \d|\breact|\bshorts? feed|\bmusic\b|\bcompilation\b/i

/**
 * Rough word-overlap between our name and the title — 1.0 means every word is
 * there. Both sides are stripped of punctuation and de-pluralised first, because
 * "Push-ups" and "Push-Up" are the same movement and a substring test says they
 * are not.
 */
const stem = (w) => (w.length > 2 && w.endsWith('s') ? w.slice(0, -1) : w)
const tokens = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1)
    .map(stem)

function overlap(name, title) {
  const want = tokens(name)
  if (want.length === 0) return 0
  const have = new Set(tokens(title))
  return want.filter((w) => have.has(w)).length / want.length
}

/**
 * Score a candidate. Length dominates on purpose: the brief is "super short",
 * and a 25-second clip that is merely good beats a two-minute one that is
 * perfect — you are holding a phone between sets.
 */
function score(ex, v) {
  if (!v.sec || v.sec > MAX_SEC) return -1
  let s = overlap(ex.name, v.title) * 100
  if (s < 50) return -1 // not this movement — no length makes up for that
  if (GOOD.test(v.title)) s += 25
  if (BAD.test(v.title)) s -= 45
  s += Math.max(0, 40 - v.sec / 2) // 20 s → +30, 60 s → +10, 90 s → 0
  if (v.views > 50_000) s += 5 // a little wisdom of the crowd, not a lot
  return s
}

/**
 * Confirm a video can actually be embedded, and get its exact length. An
 * uploader's "no embedding" is invisible to the app — the player just refuses —
 * so it is caught here, once, rather than by you in a basement.
 */
async function verify(id) {
  let html
  try {
    html = await fetchText(`https://www.youtube.com/watch?v=${id}`)
  } catch {
    return null
  }
  const embeddable = /"playableInEmbed":true/.test(html)
  const sec = Number(html.match(/"lengthSeconds":"(\d+)"/)?.[1]) || undefined
  const live = /"isLiveContent":true/.test(html)
  if (!embeddable || live) return null
  return { sec }
}

/** One batched claude call for everything scoring couldn't settle. ourId → videoId|null. */
function askClaude(open) {
  const blocks = open
    .map(({ ex, shortlist }) => {
      const lines = shortlist
        .map((v, i) => `    ${i + 1}. [${v.id}] ${v.sec}s · ${v.title} — ${v.channel}`)
        .join('\n')
      return `  ${ex.id} — "${ex.name}" (${ex.parts.join(', ')}; ${ex.how})\n${lines}`
    })
    .join('\n\n')
  const prompt = `You are picking ONE short YouTube video to demonstrate each gym exercise, for an app used by a father and his son in their basement.

For each exercise below, choose the candidate that is most likely to be a clear, correct demonstration OF THAT EXACT MOVEMENT — someone performing it, ideally with a word about form. Prefer the shortest good one. Reject anything that is a workout routine, a challenge, a listicle, a reaction, or about a different exercise. "none" is a perfectly good answer and is often the right one: a wrong video teaches bad form, and the app is fine without one.

${blocks}

Answer with ONLY a JSON object mapping each exercise id to the chosen video id, or null. No prose.`
  const out = execFileSync('claude', ['--model', 'opus', '--effort', 'medium', '-p', prompt], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  const a = out.indexOf('{')
  const b = out.lastIndexOf('}')
  if (a === -1 || b === -1) throw new Error('no JSON object in claude output')
  return JSON.parse(out.slice(a, b + 1))
}

/** A pinned URL → the id we store. Same shapes the app accepts. */
function idFromUrl(url) {
  const m = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([\w-]{11})/) ?? url.match(/^([\w-]{11})$/)
  return m?.[1] ?? null
}

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const ref = doc(db, 'app', 'gymCatalog')
  const snap = await getDoc(ref)
  const equipment = snap.exists() ? (snap.data().equipment ?? []) : []
  const exercises = snap.exists() ? (snap.data().exercises ?? []) : []

  // built-ins with no override row yet are candidates; only the ones that find a
  // video get written back, exactly like the demos script
  const stored = new Set(exercises.map((e) => e.id))
  const pending = STARTERS.filter((s) => !stored.has(s.id)).map((s) => ({ ...s }))

  const named = (e) => PINS.has(e.id) || ONLY === e.id
  const targets = [...exercises, ...pending].filter((e) => {
    if (e.retired) return false
    if (named(e)) return true
    if (ONLY) return false
    if (e.video?.source === 'manual') return false // your pick is never overwritten
    return REFRESH || !e.video
  })
  if (targets.length === 0) {
    console.log('✓ Every exercise already has a video. --refresh to redo them, --only=<id> for one.')
    process.exit(0)
  }
  console.log(`📺 ${targets.length} exercise(s) need a video (max ${MAX_SEC}s each)\n`)

  const decided = new Map() // ourId -> video row
  const open = [] // ourId -> shortlist for the model

  for (const ex of targets) {
    if (PINS.has(ex.id)) {
      const id = idFromUrl(PINS.get(ex.id))
      if (!id) {
        console.log(`  ⚠️  ${ex.name}: --pin isn't a YouTube link`)
        continue
      }
      const ok = await verify(id)
      if (!ok) console.log(`  ⚠️  ${ex.name}: that video refuses to embed — pinning it anyway, it's your call`)
      decided.set(ex.id, { id, source: 'manual', sec: ok?.sec })
      console.log(`  🖐  ${ex.name} → ${id}`)
      continue
    }

    let results = []
    try {
      results = await search(`${ex.name} exercise how to`)
    } catch (e) {
      console.log(`  ⚠️  ${ex.name}: search failed (${e.message})`)
      continue
    }
    await sleep(1200) // one household, one request a second — be a good guest

    const ranked = results
      .map((v) => ({ ...v, score: score(ex, v) }))
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score)

    if (VERBOSE) {
      console.log(`  📋 ${ex.name}`)
      for (const v of ranked) console.log(`       ${String(Math.round(v.score)).padStart(3)} · ${v.sec}s · ${v.title}`)
    }
    if (ranked.length === 0) {
      console.log(`  ·   ${ex.name}: nothing short enough that was clearly this movement`)
      continue
    }
    // A clear winner is taken as-is; anything close is a judgement call, and a
    // judgement call about form is exactly what §18l says to hand to the model.
    const clear = ranked[0].score >= 120 && (ranked.length === 1 || ranked[0].score - ranked[1].score >= 25)
    if (clear) {
      decided.set(ex.id, { ...ranked[0], source: 'search' })
      console.log(`  ✓   ${ex.name} → ${ranked[0].sec}s · ${ranked[0].title}`)
    } else if (NO_AI) {
      console.log(`  ?   ${ex.name}: ${ranked.length} plausible, none obvious — skipped (--no-ai)`)
    } else {
      open.push({ ex, shortlist: ranked.slice(0, 6) })
    }
  }

  if (open.length > 0) {
    console.log(`\n🧠 Asking claude to settle ${open.length} ambiguous pick(s)…`)
    try {
      const picked = askClaude(open)
      for (const { ex, shortlist } of open) {
        const id = picked[ex.id]
        const hit = shortlist.find((v) => v.id === id)
        if (!hit) {
          console.log(`  ·   ${ex.name}: none of them`)
          continue
        }
        decided.set(ex.id, { ...hit, source: 'search' })
        console.log(`  🧠  ${ex.name} → ${hit.sec}s · ${hit.title}`)
      }
    } catch (e) {
      console.log(`  ⚠️  claude couldn't be reached (${e.message}); leaving these without a video`)
    }
  }

  // Embeddability last, on the survivors only — one extra request each, and it
  // is the difference between a video and a black box in the app.
  for (const [ourId, v] of [...decided]) {
    if (v.source === 'manual') continue
    const ok = await verify(v.id)
    if (ok) {
      v.sec = ok.sec ?? v.sec
      continue
    }
    decided.delete(ourId)
    console.log(`  🚫  ${ourId}: “${v.title}” can't be embedded — dropped`)
  }

  if (DRY) {
    console.log(`\n🌵 Dry run — ${decided.size} video(s) found, nothing written.`)
    process.exit(0)
  }
  if (decided.size === 0) {
    console.log('\nNothing to write.')
    process.exit(0)
  }

  const byId = new Map([...exercises, ...pending].map((e) => [e.id, e]))
  for (const [ourId, v] of decided) {
    const ex = byId.get(ourId)
    ex.video = { id: v.id, source: v.source, ...(v.title ? { title: v.title } : {}), ...(v.channel ? { channel: v.channel } : {}), ...(v.sec ? { sec: v.sec } : {}) }
    if (!stored.has(ex.id)) {
      exercises.push(ex)
      stored.add(ex.id)
    }
  }
  await setDoc(ref, { equipment, exercises, updatedAt: new Date().toISOString() })

  console.log(`\n✅ ${decided.size} video(s) saved to the shared catalog.`)
  console.log('   Check them in the Gym app — ▶ next to any exercise. A bad one: paste a better link right there,')
  console.log('   and your pick is kept for the whole crew and never overwritten by this script.')
  process.exit(0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`❌ ${err.message}`)
    process.exit(1)
  })
}
