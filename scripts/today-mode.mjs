// One-off: put a profile on the Today card (§2b) and clear the two things that
// made the old list unopenable — the daily hygiene rows and the stalled split
// chains. `node scripts/today-mode.mjs --dry-run` prints the diff and writes
// nothing; without the flag it writes `settings` and `tasks` on that profile
// and touches nothing else in the document.
//
// Safe to run twice: every change below is idempotent.
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'

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
const PROFILE = (args.find((a) => a.startsWith('--profile=')) ?? '').slice(10) || 'diogo'

/** Daily hygiene: not an achievement, and the data says it died on its own. */
const ARCHIVE_EXACT = ['Teeth - 🪥 1', 'Teeth 🪥 2', 'Teeth floss']

/**
 * Split chains that stalled. Each one collapses back to a single plain quest:
 * the parts already done keep their place in history, the ones that never
 * happened stop being six separate reproaches on the list.
 */
const COLLAPSE = [
  { match: /^Garagem arrumar \(\d+\/\d+\)$/, name: 'Garagem arrumar', effort: 'high', categories: ['Garage'] },
  {
    match: /^Separar madeira camping \(\d+\/\d+\)$/,
    name: 'Separar madeira camping',
    effort: 'low',
    categories: ['Backyard/Frontyard'],
  },
]

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const ref = doc(db, 'profiles', PROFILE)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error(`no profile ${PROFILE}`)
  const data = snap.data()

  const tasks = (data.tasks ?? []).map((t) => ({ ...t }))
  const log = []

  for (const t of tasks) {
    if (t.archived) continue
    if (ARCHIVE_EXACT.includes(t.name)) {
      t.archived = true
      log.push(`  archive  ${t.name}`)
    }
  }

  for (const rule of COLLAPSE) {
    const parts = tasks.filter((t) => !t.archived && rule.match.test(t.name))
    if (parts.length === 0) continue
    for (const t of parts) {
      t.archived = true
      log.push(`  archive  ${t.name}`)
    }
    if (tasks.some((t) => !t.archived && t.name === rule.name)) continue
    tasks.push({
      id: crypto.randomUUID(),
      name: rule.name,
      repeats: false,
      effort: rule.effort,
      priority: 'normal',
      dayScope: 'all',
      createdAt: new Date().toISOString(),
      archived: false,
      spinsSinceLastPicked: 0,
      timesPicked: 0,
      categories: rule.categories,
    })
    log.push(`  create   ${rule.name}  (was ${parts.length} locked parts)`)
  }

  const settings = { ...data.settings, dailyMode: 'today', qotdOff: true }
  log.push('  settings dailyMode = today, qotdOff = true')

  console.log(`\n${PROFILE}:`)
  console.log(log.join('\n') || '  (nothing to do)')
  const active = tasks.filter((t) => !t.archived).length
  console.log(`\n  active quests: ${(data.tasks ?? []).filter((t) => !t.archived).length} → ${active}`)

  if (DRY) {
    console.log('\n--dry-run: nothing written.\n')
    return
  }
  await updateDoc(ref, { tasks, settings })
  console.log('\n✅ written.\n')
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  },
)
