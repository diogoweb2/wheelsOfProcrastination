// One-off repair for the five exercises orphaned by a dead equipment id.
// See GYM_PROGRAM.md §12d for the diagnosis.
//
// `eq-b8a8b13d` is the Adjustable Weight Bench under an id that no longer
// exists: the in-app camera flow minted it at 19:14:13 on 2026-08-06, and
// `npm run gym:equipment` re-slugged the same bench from its photo eleven
// minutes later as `eq-ea11007d`. Five exercises kept pointing at the old id.
//
// Three of them are real capabilities nothing else in the catalog covers, so
// they get repointed. Two are duplicates of exercises that already exist, so
// they get retired rather than deleted — history stays attached to them.
//
// This is deliberately a ONE-OFF and not part of `gym:audit`: the audit writes
// nothing, on purpose. Once this has run and `npm run gym:audit` is clean, this
// file can be deleted.
//
// Flags:
//   --dry-run   print the diff, write nothing   (start here)
import { writeFileSync } from 'node:fs'
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

const DRY = process.argv.includes('--dry-run')

const DEAD_ID = 'eq-b8a8b13d'
const BENCH_ID = 'eq-ea11007d'

/** id → what to do, and why. Every one of the five is named explicitly: a
 *  bulk "replace the id everywhere" would have kept both duplicates alive. */
const PLAN = {
  'mv-36e0ac47': { action: 'repoint', why: 'knee extension — nothing else in the catalog covers it' },
  'mv-59b0c62a': { action: 'repoint', why: 'the only hamstring curl you own' },
  'mv-585b281e': { action: 'repoint', why: 'decline crunch — needs the bench, flagged to layer 2 for its back risk' },
  'mv-48ca7418': { action: 'retire', why: 'same movement as bw-dip-chair (Chair dips)' },
  'mv-0b3f159d': { action: 'retire', why: 'triplicate of bw-incline-pushup and mv-bench-incline-push-up-ladder' },
}

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const ref = doc(getFirestore(app), 'app', 'gymCatalog')
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('app/gymCatalog does not exist')

  const data = snap.data()
  const exercises = data.exercises ?? []

  // back up before touching anything — this is shared data for two people and
  // there is no undo in Firestore
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `.gym-catalog-backup-${stamp}.json`
  writeFileSync(backup, JSON.stringify(data, null, 2))
  console.log(`\n💾 Backed up the whole catalog to ${backup}\n`)

  // safety: the ids in PLAN must be exactly the rows still pointing at the dead
  // id. If the catalog moved under us, stop rather than guess.
  const orphans = exercises.filter((e) => (e.equipmentIds ?? []).includes(DEAD_ID)).map((e) => e.id)
  const planned = Object.keys(PLAN)
  const unexpected = orphans.filter((id) => !planned.includes(id))
  const vanished = planned.filter((id) => !orphans.includes(id))
  if (unexpected.length) throw new Error(`Unplanned rows reference ${DEAD_ID}: ${unexpected.join(', ')}`)
  if (vanished.length) console.log(`ℹ️  Already handled, skipping: ${vanished.join(', ')}\n`)
  if (!exercises.some((e) => e.id === BENCH_ID) && !data.equipment?.some((e) => e.id === BENCH_ID))
    throw new Error(`${BENCH_ID} is not in the equipment list — refusing to repoint onto a missing id`)

  const next = exercises.map((e) => {
    const plan = PLAN[e.id]
    if (!plan || !(e.equipmentIds ?? []).includes(DEAD_ID)) return e
    if (plan.action === 'repoint') {
      const gear = [...new Set(e.equipmentIds.map((id) => (id === DEAD_ID ? BENCH_ID : id)))]
      console.log(`  🔗 ${e.name}\n     gear ${JSON.stringify(e.equipmentIds)} → ${JSON.stringify(gear)}\n     ${plan.why}\n`)
      return { ...e, equipmentIds: gear }
    }
    // retired, not deleted: the row keeps its id so any logged history still resolves
    console.log(`  🗄  ${e.name}  → retired\n     ${plan.why}\n`)
    return { ...e, retired: true }
  })

  if (DRY) {
    console.log('🧪 --dry-run: nothing written.\n')
    process.exit(0)
  }

  await setDoc(ref, { ...data, exercises: next, updatedAt: new Date().toISOString() })
  console.log('✅ Saved. Re-run `npm run gym:audit` to confirm.\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('❌', e.message ?? e)
  process.exit(1)
})
