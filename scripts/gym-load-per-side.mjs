// Move one exercise onto a PER-SIDE load, history and all.
//
// The hip thrust is the case it was written for: it used to be one dumbbell
// across the hips, so the number logged was the whole load. Then a harness
// arrived that takes a dumbbell on each END, and the number you can actually
// SET on the dial is one dumbbell's — so that is what the app should store,
// suggest and progress from now on.
//
// Flipping the flag alone would be a lie about the past: every old set would
// read as if it were per side, and the next suggestion would come out at double
// what you lifted. So this does both halves at once — it sets `loadPerSide` on
// the catalog row and HALVES every load already recorded for that exercise, in
// every profile: the finished sessions, the session in progress, and the
// per-exercise memory the planner reads.
//
// Usage:
//   node scripts/gym-load-per-side.mjs mv-bench-hip-thrust [--dry-run] [--off]
//
//   --dry-run   print what would change, write nothing   (start here)
//   --off       the reverse: clear the flag and DOUBLE the stored loads
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
const DRY = args.includes('--dry-run')
const OFF = args.includes('--off')
const exId = args.find((a) => !a.startsWith('--'))

if (!exId) {
  console.error('Usage: node scripts/gym-load-per-side.mjs <exerciseId> [--dry-run] [--off]')
  process.exit(1)
}

/** Loads live on a half-pound grid everywhere else in the app; keep them there. */
const scale = (w) => (typeof w === 'number' && Number.isFinite(w) ? Math.round((OFF ? w * 2 : w / 2) * 2) / 2 : w)

/** Every load stored against this exercise inside one profile, rescaled. */
function rewriteProfile(data) {
  const gym = data?.gym
  if (!gym) return { data, touched: 0 }
  let touched = 0

  const rewriteSession = (s) => {
    if (!s?.exercises?.some((e) => e.exId === exId)) return s
    return {
      ...s,
      exercises: s.exercises.map((e) => {
        if (e.exId !== exId) return e
        touched++
        return {
          ...e,
          plan: {
            ...e.plan,
            ...(e.plan?.weight != null ? { weight: scale(e.plan.weight) } : {}),
            ...(e.plan?.weights ? { weights: e.plan.weights.map(scale) } : {}),
          },
          sets: (e.sets ?? []).map((set) => (set.weight != null ? { ...set, weight: scale(set.weight) } : set)),
        }
      }),
    }
  }

  const mem = gym.ex?.[exId]
  const nextMem = mem
    ? {
        ...mem,
        ...(mem.lastWeight != null ? { lastWeight: scale(mem.lastWeight) } : {}),
        ...(mem.suggestedWeight != null ? { suggestedWeight: scale(mem.suggestedWeight) } : {}),
        ...(mem.bestWeight != null ? { bestWeight: scale(mem.bestWeight) } : {}),
      }
    : undefined

  // the maps have to RUN before `touched` is read, so the next object builds it
  const next = {
    ...data,
    gym: {
      ...gym,
      sessions: (gym.sessions ?? []).map(rewriteSession),
      active: gym.active ? rewriteSession(gym.active) : gym.active,
      ...(nextMem ? { ex: { ...gym.ex, [exId]: nextMem } } : {}),
    },
  }
  return { data: next, touched: touched + (nextMem ? 1 : 0) }
}

const app = initializeApp(firebaseConfig)
await signInAnonymously(getAuth(app))
const db = getFirestore(app)

const catRef = doc(db, 'app', 'gymCatalog')
const catSnap = await getDoc(catRef)
if (!catSnap.exists()) {
  console.error('❌ No catalog in Firestore.')
  process.exit(1)
}
const catalog = catSnap.data()
const def = (catalog.exercises ?? []).find((e) => e.id === exId)
if (!def) {
  console.error(`❌ No exercise "${exId}" in the catalog.`)
  process.exit(1)
}
if (!!def.loadPerSide === !OFF) {
  console.log(`✓ ${def.name} is already ${OFF ? 'a whole-load' : 'a per-side'} exercise — nothing to do.`)
  process.exit(0)
}

console.log(`${OFF ? '↩️' : '⚖️'} ${def.name} (${exId}): every stored load ${OFF ? '×2' : '÷2'}`)

const roster = (await getDoc(doc(db, 'app', 'roster'))).data()
const writes = []
for (const p of roster?.profiles ?? []) {
  const ref = doc(db, 'profiles', p.id)
  const snap = await getDoc(ref)
  if (!snap.exists()) continue
  const { data, touched } = rewriteProfile(snap.data())
  console.log(`   ${p.name}: ${touched} record(s) rewritten`)
  if (touched) writes.push([ref, data])
}

if (DRY) {
  console.log('\n🧪 --dry-run: nothing written.')
  process.exit(0)
}

for (const [ref, data] of writes) await setDoc(ref, data)
await setDoc(catRef, {
  ...catalog,
  exercises: catalog.exercises.map((e) => (e.id === exId ? { ...e, loadPerSide: !OFF } : e)),
  updatedAt: new Date().toISOString(),
})
console.log('\n✅ Saved — catalog flag and history are in step.')
process.exit(0)
