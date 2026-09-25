import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
})
await signInAnonymously(getAuth(app))
const snap = await getDoc(doc(getFirestore(app), 'profiles', 'diogo'))
const gym = snap.data()?.gym ?? {}
const a = gym.active
if (!a) {
  console.log('gym.active is NULL — nothing running')
} else {
  console.log('id        ', a.id)
  console.log('status    ', a.status)
  console.log('day       ', a.day)
  console.log('startedAt ', a.startedAt)
  console.log('finishedAt', a.finishedAt)
  console.log('finishedBy', a.finishedBy)
  console.log('restUntil ', a.restUntil)
  console.log('driver    ', JSON.stringify(a.driver))
  console.log('snack     ', a.snack, '| block', a.blockSessionName)
  console.log('--- exercises ---')
  for (const e of a.exercises ?? []) {
    console.log(
      `  ${String(e.name).padEnd(22)} plan ${(e.plan?.reps ?? []).join('·').padEnd(12)} logged ${(e.sets ?? []).length}` +
        `  ${e.skipped ? 'SKIPPED' : ''}  sets=${JSON.stringify((e.sets ?? []).map((s) => s.reps))}`,
    )
  }
}
console.log('--- log ---')
console.log('sessions in log:', (gym.sessions ?? []).length)
for (const s of (gym.sessions ?? []).slice(-3)) console.log(`  ${s.day} ${s.snack ?? s.blockSessionName ?? 'free'} coins=${s.coins} finishedBy=${s.finishedBy ?? '-'}`)
process.exit(0)
