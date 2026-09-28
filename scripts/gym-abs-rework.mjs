// One-off: put the 2026-09-28 abs rework into a block that is ALREADY BEING
// TRAINED. See BUSINESS_REQUIREMENTS.md §18m and §18ab.
//
// The seed in `src/logic/gymBlock.ts` carries the change for anyone starting
// fresh, but it deliberately never touches a block with sessions logged against
// it — that is the programme you actually did, not ours to rewrite. Diogo's
// Block 1 has months on it, so the two slot changes have to be made in the live
// document, the same way the kettlebell swing was replaced on 2026-09-25.
//
// What it does, per profile that is following a block whose sessions match
// Block 1 by name:
//
//   S1 🦵  Side Plank            → Band Face-Away Crunch   3 × 8–12
//   S3 ⚡  (new slot after the Copenhagen plank) Bench Garhammer Raise 3 × 6–12
//
// It is idempotent: a block that already has the crunch or the raise is left
// alone, so running it twice changes nothing.
//
// Flags:
//   --dry-run   print the diff, write nothing   (start here)
import { writeFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { collection, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

const DRY = process.argv.includes('--dry-run')

const OUT = 'bw-side-plank'
const CRUNCH = {
  exId: 'mv-band-face-away-crunch',
  sets: 3,
  repLow: 8,
  repHigh: 12,
  note: 'Hips against the post, and walk out until the band is tight BEFORE the first rep. Stepping further out is your next increment, not a thicker band.',
}
const RAISE = {
  exId: 'mv-bench-garhammer-raise',
  sets: 3,
  repLow: 6,
  repHigh: 12,
  note: 'Thighs stay tucked at 90°. The rep is the pelvis curling, not the legs dropping.',
}
const AFTER = 'mv-copenhagen-plank'

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const profiles = await getDocs(collection(db, 'profiles'))

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = {}
  let touched = 0

  for (const p of profiles.docs) {
    const data = p.data()
    const blocks = data?.gym?.blocks
    if (!Array.isArray(blocks) || blocks.length === 0) continue
    backup[p.id] = blocks
    let changed = false

    for (const block of blocks) {
      for (const session of block.sessions ?? []) {
        const list = session.exercises ?? []
        const has = (id) => list.some((e) => e.exId === id)

        // S1: the unloadable hold comes out, the loaded crunch goes in its place
        const i = list.findIndex((e) => e.exId === OUT)
        if (i >= 0 && !has(CRUNCH.exId)) {
          console.log(`  ${p.id} · ${block.name} · ${session.name}: ${OUT} → ${CRUNCH.exId}`)
          list[i] = { ...CRUNCH }
          changed = true
        }

        // S3: the loaded lower-ab movement joins, ahead of the Pallof press so
        // a 20-minute cut takes the Pallof first (`fitToLength` trims the tail)
        const c = list.findIndex((e) => e.exId === AFTER)
        if (c >= 0 && !has(RAISE.exId)) {
          console.log(`  ${p.id} · ${block.name} · ${session.name}: + ${RAISE.exId} after ${AFTER}`)
          list.splice(c + 1, 0, { ...RAISE })
          changed = true
        }
        session.exercises = list
      }
    }

    if (!changed) continue
    touched += 1
    if (!DRY) await setDoc(doc(db, 'profiles', p.id), { gym: { ...data.gym, blocks } }, { merge: true })
  }

  if (Object.keys(backup).length) {
    const file = `.gym-blocks-backup-${stamp}.json`
    writeFileSync(file, JSON.stringify(backup, null, 2))
    console.log(`\n💾 Every profile's blocks, as they were, in ${file}`)
  }
  console.log(DRY ? `\n🧪 --dry-run: ${touched} profile(s) would change, nothing written.` : `\n✅ ${touched} profile(s) updated.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
