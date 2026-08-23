#!/usr/bin/env node
// Read the crash log the app writes from the phone (src/lib/errorLog.ts).
//
//   npm run errors        the last 24h, newest first
//
// Same anonymous sign-in the app uses, same config — nothing secret here.
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { collection, getDocs, getFirestore, orderBy, query, limit } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
})

await signInAnonymously(getAuth(app))
const db = getFirestore(app)
const snap = await getDocs(query(collection(db, 'errors'), orderBy('ts', 'desc'), limit(50)))

if (snap.empty) {
  console.log('No errors logged in the last 24h. 🎉')
  process.exit(0)
}

for (const d of snap.docs) {
  const e = d.data()
  console.log(`\n── ${e.at}  [${e.where}]  ${e.route ?? ''}`)
  console.log(`   ${e.message}`)
  if (e.profile) console.log(`   profile: ${e.profile}`)
  if (e.ua) console.log(`   ua: ${e.ua}`)
  if (e.stack) console.log(e.stack.split('\n').map((l) => `   │ ${l}`).join('\n'))
}
console.log(`\n${snap.size} entr${snap.size === 1 ? 'y' : 'ies'}.`)
process.exit(0)
