// Weekly snapshot of the whole Firestore database: `npm run backup`.
//
// The project is on the free Spark plan, so Firestore keeps no backups of its
// own and point-in-time recovery only reaches back one hour. Ben's July quiz
// passes vanished from `profiles/ben` with nothing to restore them from; this
// is the copy that would have saved them.
//
// It READS ONLY. Every document in `profiles`, `app` and `auditLog` is written
// as one gzipped JSON file to ~/Backups/wheels-of-procrastination/, named by
// date, and the oldest files past KEEP are deleted. Firestore Timestamps are
// kept as { _ts: <ISO> } so a restore can tell them apart from plain strings.
//
// Restoring is deliberately by hand: open the file, take the one field that was
// lost, and write that back — never the whole snapshot over live data.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { Timestamp, collection, getDocs, getFirestore } from 'firebase/firestore'

// Same public web config as src/lib/firebase.ts (client configs are not secrets).
const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

const COLLECTIONS = ['profiles', 'app', 'auditLog']
const DIR = join(homedir(), 'Backups', 'wheels-of-procrastination')
const KEEP = 12 // a quarter of weekly snapshots

const plain = (v) => {
  if (v instanceof Timestamp) return { _ts: v.toDate().toISOString() }
  if (Array.isArray(v)) return v.map(plain)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
  return v
}

const app = initializeApp(firebaseConfig)
await signInAnonymously(getAuth(app))
const db = getFirestore(app)

const snapshot = { takenAt: new Date().toISOString(), collections: {} }
for (const name of COLLECTIONS) {
  const docs = await getDocs(collection(db, name))
  snapshot.collections[name] = Object.fromEntries(docs.docs.map((d) => [d.id, plain(d.data())]))
  console.log(`${name}: ${docs.size} docs`)
}

// A run that reads nothing must not rotate out a good snapshot.
if (!Object.keys(snapshot.collections.profiles).length) {
  console.error('No profiles read — refusing to write an empty backup.')
  process.exit(1)
}

mkdirSync(DIR, { recursive: true })
const file = join(DIR, `firestore-${snapshot.takenAt.slice(0, 10)}.json.gz`)
const gz = gzipSync(JSON.stringify(snapshot))
writeFileSync(file, gz)
console.log(`💾 ${file} (${(gz.length / 1024).toFixed(0)} KB)`)

const old = readdirSync(DIR).filter((f) => /^firestore-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(f)).sort().slice(0, -KEEP)
for (const f of old) {
  rmSync(join(DIR, f))
  console.log(`🗑️  rotated out ${f}`)
}
process.exit(0)
