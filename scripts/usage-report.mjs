#!/usr/bin/env node
// §26 — read the usage log the app writes (src/lib/usage.ts) and print it.
//
//   npm run usage              everything still kept (a month at most)
//   npm run usage -- 7         just the last 7 days
//   npm run usage -- 7 json    the raw day documents, for piping somewhere
//
// It READS ONLY, costs nothing, and prints the same numbers as /usage/apps in
// the app — both sides call `rollUsage` from src/logic/usageReport.ts.
//
// Same anonymous sign-in and same public config the app uses; nothing secret.
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { collection, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore'
import { loadTs } from './lib/se-bundle.mjs'

const days = Number(process.argv[2]) || 31
const asJson = process.argv[3] === 'json'

const app = initializeApp({
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
})

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const since = new Date()
since.setDate(since.getDate() - (days - 1))

await signInAnonymously(getAuth(app))
const db = getFirestore(app)
const snap = await getDocs(
  query(collection(db, 'usage'), where('date', '>=', dayKey(since)), orderBy('date', 'desc')),
)
const docs = snap.docs.map((d) => d.data())

if (asJson) {
  console.log(JSON.stringify(docs, null, 2))
  process.exit(0)
}

const { report } = await loadTs(fileURLToPath(new URL('./usage-report.entry.ts', import.meta.url)))
console.log(report(docs))
process.exit(0)
