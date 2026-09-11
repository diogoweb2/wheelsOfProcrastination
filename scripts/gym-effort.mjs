// ⚖️ npm run gym:effort — give every exercise an effort mix (§18t).
//
// The app splits a set across the muscles by a WRITTEN ratio, not by the order
// of `parts`, because the order of a list has never said how much. Those ratios
// live in `src/logic/gymEffort.ts` and are written by hand — but exercises get
// added to the catalog (usually from Claude Code, sometimes from the Gear tab),
// and one without a ratio silently falls back to a positional guess: the exact
// thing this model exists to replace.
//
// So this script is the gap-filler. It reads the live catalog, finds every
// exercise the MIX map has never heard of, asks the claude CLI for a ratio for
// each, checks the answer is actually a legal mix, and writes the new entries
// into the source file. The result is a normal code change you review and
// commit — the ratios are part of the app, not per-profile data.
//
//   npm run gym:effort              fill in whatever is missing
//   npm run gym:effort -- --dry-run print what it would add, write nothing
//   npm run gym:effort -- --all     re-ask for EVERY exercise, overwriting
//   npm run gym:effort -- --only=mv-foo,mv-bar
//
// Nothing is ever deleted: an id that has left the catalog keeps its ratio, so
// old sessions in the log still score correctly.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'

const STARTERS = JSON.parse(readFileSync(resolve('src/logic/gymStarters.json'), 'utf8'))
const SOURCE = resolve('src/logic/gymEffort.ts')

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
const ALL = args.includes('--all')
const ONLY = (flag('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean)

/** Mirrors `BodyPart` in src/types.ts. A mix may only name these. */
const PARTS = ['chest', 'back', 'shoulders', 'arms', 'forearms', 'legs', 'glutes', 'core', 'fullBody', 'power', 'cardio']

/** How many exercises go into one claude call. Small enough to stay careful, big enough to be one call. */
const BATCH = 12

/** Ids already written down, read straight out of the source file. */
function writtenIds(src) {
  const body = src.slice(src.indexOf('const MIX'), src.indexOf('const POSITIONAL'))
  return new Set([...body.matchAll(/^ {2}'([^']+)':/gm)].map((m) => m[1]))
}

/**
 * A mix is only usable if it names real body parts, has no negatives, and adds
 * up. A model that returns four parts summing to 0.8 has not answered the
 * question, and silently normalising it would hide that.
 */
function validate(mix) {
  if (!mix || typeof mix !== 'object' || Array.isArray(mix)) return 'not an object'
  const entries = Object.entries(mix)
  if (entries.length === 0) return 'empty'
  if (entries.length > 5) return `${entries.length} parts — too many to be meaningful`
  let sum = 0
  for (const [part, share] of entries) {
    if (!PARTS.includes(part)) return `"${part}" is not a body part`
    if (typeof share !== 'number' || !(share > 0) || share > 1) return `${part}: ${share} is not a share between 0 and 1`
    sum += share
  }
  if (Math.abs(sum - 1) > 0.02) return `shares add up to ${sum.toFixed(2)}, not 1`
  return null
}

/** Round to 2dp and put the difference back on the biggest slice, so it lands on exactly 1. */
function tidy(mix) {
  const entries = Object.entries(mix)
    .map(([p, v]) => [p, Math.round(v * 100) / 100])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
  const drift = Math.round((1 - entries.reduce((n, [, v]) => n + v, 0)) * 100) / 100
  if (drift !== 0) entries[0][1] = Math.round((entries[0][1] + drift) * 100) / 100
  return Object.fromEntries(entries)
}

function askClaude(batch) {
  const blocks = batch
    .map((e) => `  ${e.id} — "${e.name}" (${e.kind}; listed parts: ${e.parts.join(', ')}${e.perSide ? '; one side at a time' : ''}${e.loaded ? '; carries external weight' : ''})\n    How: ${e.how}`)
    .join('\n\n')
  const prompt = `You are assigning EFFORT RATIOS to strength exercises for a training app.

For each exercise, give the share of the total work that lands on each body part, as a JSON object whose values sum to exactly 1.

Rules:
- Use ONLY these part names: ${PARTS.join(', ')}.
- At most 5 parts. Drop anything under about 0.05 — a muscle that is barely involved should not be listed at all.
- The values must sum to 1.00.
- Weight by how much each muscle ACTUALLY does, not by whether it is involved. A push-up is roughly {"chest":0.55,"arms":0.30,"core":0.15} — the core is engaged, but it is doing a small fraction of the work. A plank is roughly {"core":0.88,"shoulders":0.12}.
- The "listed parts" are a hint about what the movement is for, not a constraint. Add a part they miss if the work really goes there (a pull-up belongs partly to forearms), and leave out a listed part that is only along for the ride.
- "power" means explosive jumping/throwing/swinging work, "cardio" means sustained conditioning. Use them only when that is genuinely what the movement trains.

${blocks}

Answer with ONLY a JSON object mapping each exercise id to its mix object. No prose, no markdown fence.`

  const out = execFileSync('claude', ['--model', 'opus', '--effort', 'medium', '-p', prompt], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  const a = out.indexOf('{')
  const b = out.lastIndexOf('}')
  if (a === -1 || b === -1) throw new Error('no JSON object in claude output')
  return JSON.parse(out.slice(a, b + 1))
}

/** Splice the new entries into the MIX object literal, alphabetically stable by insertion order. */
function writeBack(src, additions) {
  const anchor = src.indexOf('const MIX: Record<string, EffortMix> = {')
  if (anchor === -1) throw new Error('MIX map not found in gymEffort.ts')
  const close = src.indexOf('\n}', anchor)
  const lines = Object.entries(additions).map(
    ([id, mix]) => `  '${id}': { ${Object.entries(mix).map(([p, v]) => `${p}: ${v}`).join(', ')} },`,
  )
  return `${src.slice(0, close)}\n${lines.join('\n')}${src.slice(close)}`
}

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const snap = await getDoc(doc(getFirestore(app), 'app', 'gymCatalog'))
  const stored = snap.exists() ? (snap.data().exercises ?? []) : []
  const byId = new Map(STARTERS.map((s) => [s.id, s]))
  for (const e of stored) byId.set(e.id, e)

  const src = readFileSync(SOURCE, 'utf8')
  const have = writtenIds(src)
  const pending = [...byId.values()].filter((e) => {
    if (e.retired) return false
    if (ONLY.length > 0) return ONLY.includes(e.id)
    return ALL || !have.has(e.id)
  })

  if (pending.length === 0) {
    console.log(`✅ All ${byId.size} exercises already have an effort mix. Nothing to do.`)
    return
  }
  console.log(`⚖️  ${pending.length} exercise(s) without an effort mix:\n${pending.map((e) => `   · ${e.name}`).join('\n')}\n`)

  const additions = {}
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH)
    console.log(`🧠 Asking claude for ${batch.length}…`)
    let answer
    try {
      answer = askClaude(batch)
    } catch (e) {
      console.log(`  ⚠️  claude couldn't be reached (${e.message}) — these keep the positional fallback for now`)
      continue
    }
    for (const e of batch) {
      const mix = answer[e.id]
      const bad = validate(mix)
      if (bad) {
        console.log(`  ✕ ${e.name}: ${bad} — skipped, so it stays on the fallback rather than getting a wrong number`)
        continue
      }
      additions[e.id] = tidy(mix)
      const shown = Object.entries(additions[e.id]).map(([p, v]) => `${p} ${v}`).join(' · ')
      console.log(`  ✓ ${e.name}: ${shown}`)
    }
  }

  const n = Object.keys(additions).length
  if (n === 0) {
    console.log('\nNothing usable came back. Nothing written.')
    return
  }
  if (DRY) {
    console.log(`\n🔍 --dry-run: ${n} mix(es) would be added to src/logic/gymEffort.ts.`)
    return
  }
  writeFileSync(SOURCE, writeBack(src, additions))
  console.log(`\n💾 Wrote ${n} mix(es) into src/logic/gymEffort.ts. Review the diff, then commit it.`)
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  },
)
