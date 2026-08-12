// One-time backfill: tag every exercise already in the catalog with `perSide`.
//
// `npm run gym:exercises` is append-only on purpose — it never rewrites an
// exercise you already have, so a new field like this would only ever reach
// exercises added AFTER it existed. Everything generated before stays silent
// about whether "2 × 15" means fifteen reps or thirty.
//
// So this pass exists, and it is deliberately narrow: it reads the catalog,
// asks the model one question about each exercise, and writes back NOTHING but
// `perSide`. Every other field is copied through untouched. Run it once; after
// that the generator handles new exercises and the app's own toggle handles
// corrections.
//
// Flags:
//   --dry-run     show the verdicts, write nothing   (start here)
//   --force       re-tag exercises that already have a perSide value
//   --model=NAME / --effort=LEVEL   (default: opus / medium)
import { execFileSync } from 'node:child_process'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

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
const FORCE = args.includes('--force')
const MODEL = flag('model', 'opus')
const EFFORT = flag('effort', 'medium')

function prompt(list) {
  return `For each exercise below, decide whether ONE LIMB WORKS AT A TIME — meaning the
prescribed reps are per side, and the athlete performs the set twice (left, then right).

true:  single-arm dumbbell row, side-lying external rotation, side plank,
       Bulgarian split squat, single-leg calf raise, suitcase carry, bird dog
false: anything both limbs do together (squat, bench press, plank, push-up)
       AND anything that alternates within the rep count (alternating lunges,
       dead bug, mountain climbers) — there the number is already the total

When the name is ambiguous, use the "how" text. When it is still ambiguous, answer false:
a missed tag is a label the athlete can flip in the app, a wrong one silently doubles their work.

${list.map((e, i) => `${i + 1}. ${e.name} [${e.kind}] — ${e.how}`).join('\n')}

Answer with ONLY a JSON array, one object per exercise above, same order, no prose and no markdown fence:
[{ "n": 1, "name": "echo the name back", "perSide": true | false }]`
}

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const ref = doc(db, 'app', 'gymCatalog')
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    console.error('❌ No catalog in Firestore yet — nothing to backfill.')
    process.exit(1)
  }

  const exercises = snap.data().exercises ?? []
  const todo = exercises.filter((e) => !e.retired && (FORCE || e.perSide === undefined))

  console.log(`📚 ${exercises.length} exercise(s) in the catalog`)
  if (todo.length === 0) {
    console.log('✓ Every one of them is already tagged. (--force to redo them anyway.)')
    process.exit(0)
  }
  console.log(`🧠 Asking claude (${MODEL}, effort ${EFFORT}) about ${todo.length} of them…\n`)

  const out = execFileSync('claude', ['--model', MODEL, '--effort', EFFORT, '-p', prompt(todo)], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  const start = out.indexOf('[')
  const end = out.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error(`No JSON array in claude's reply:\n${out.slice(0, 800)}`)
  const verdicts = JSON.parse(out.slice(start, end + 1))

  // match on the echoed name rather than position — a dropped row would
  // otherwise shift every verdict after it onto the wrong exercise
  const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  const byName = new Map(verdicts.map((v) => [norm(v.name), v.perSide === true]))

  const decided = []
  const missing = []
  for (const e of todo) {
    const v = byName.get(norm(e.name))
    if (v === undefined) missing.push(e.name)
    else decided.push({ id: e.id, name: e.name, perSide: v })
  }

  const yes = decided.filter((d) => d.perSide)
  console.log(`\n↔️  ${yes.length} per-side:`)
  for (const d of yes) console.log(`   ${d.name}`)
  console.log(`\n   ${decided.length - yes.length} both-sides-together (not listed)`)
  if (missing.length) console.log(`⚠️  No verdict for ${missing.length}, left untagged: ${missing.join(', ')}`)

  if (DRY) {
    console.log('\n🧪 --dry-run: nothing written.')
    process.exit(0)
  }

  const patch = new Map(decided.map((d) => [d.id, d.perSide]))
  const next = exercises.map((e) => (patch.has(e.id) ? { ...e, perSide: patch.get(e.id) } : e))
  await setDoc(ref, { ...snap.data(), exercises: next, updatedAt: new Date().toISOString() })
  console.log('\n✅ Saved. Wrong ones can be flipped in the app: Gym → Gear → tap the exercise.')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌', err.message ?? err)
  process.exit(1)
})
