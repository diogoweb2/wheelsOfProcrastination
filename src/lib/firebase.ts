import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Web app config from the Firebase console (Project settings → Your apps → Web).
// These values are NOT secret — like the Spmkt project, they ship in the client. The PIN never lives here.
const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

export const app = initializeApp(firebaseConfig)

// Always-online, no persisted IndexedDB cache: a stale local snapshot from a
// previous day/device was overwriting fresh cross-device writes (rollover()
// would act on it before the real server data arrived). No offline mode needed.
export const firestore = getFirestore(app)

const auth = getAuth(app)

let authReady: Promise<User> | null = null

/** Sign in anonymously (once). Firestore rules require an authenticated request. */
export function ensureAuth(): Promise<User> {
  if (authReady) return authReady
  authReady = new Promise<User>((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) {
        stop()
        resolve(user)
      }
    })
    signInAnonymously(auth).catch((err) => {
      stop()
      reject(err)
    })
  })
  return authReady
}
