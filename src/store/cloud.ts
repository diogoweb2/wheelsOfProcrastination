// Firestore data layer. Two shapes:
//   app/roster            → { profiles: Profile[] }     the crew + their PIN hashes (synced across devices)
//   profiles/{id}         → AppData                     one whole world per crewmate
// The active login (which profile is signed in) stays local, per device (see storage.ts).
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { ensureAuth, firestore } from '../lib/firebase'
import type { AppData, Profile } from '../types'
import { mergeData, readLocalData, readLocalRoster, seedProfiles } from './storage'

const rosterRef = () => doc(firestore, 'app', 'roster')
const dataRef = (id: string) => doc(firestore, 'profiles', id)

/**
 * Load the roster, seeding Firestore on first run. If the cloud roster is
 * missing we adopt the previous localStorage build (roster + each profile's
 * blob, incl. PIN hashes) so nothing is lost; otherwise we seed the defaults.
 */
export async function loadRoster(): Promise<Profile[]> {
  await ensureAuth()
  const snap = await getDoc(rosterRef())
  if (snap.exists()) {
    const data = snap.data() as { profiles?: Profile[] }
    if (data.profiles?.length) return data.profiles
  }
  const local = readLocalRoster()
  const profiles = local?.length ? local : seedProfiles()
  await setDoc(rosterRef(), { profiles })
  // carry each profile's local data up to the cloud (one-time)
  for (const p of profiles) {
    const localData = readLocalData(p.id)
    if (localData) await setDoc(dataRef(p.id), mergeData(localData))
  }
  return profiles
}

export async function saveRoster(profiles: Profile[]): Promise<void> {
  await ensureAuth()
  await setDoc(rosterRef(), { profiles })
}

/** Live roster: fires on other devices setting/changing a PIN. Returns unsubscribe. */
export function subscribeRoster(cb: (profiles: Profile[]) => void): () => void {
  return onSnapshot(rosterRef(), (snap) => {
    const data = snap.data() as { profiles?: Profile[] } | undefined
    if (data?.profiles?.length) cb(data.profiles)
  })
}

/** Live-sync one profile's world. cb fires on load and whenever another device writes. Returns unsubscribe. */
export function subscribeData(id: string, cb: (data: AppData) => void): () => void {
  return onSnapshot(dataRef(id), (snap) => {
    cb(mergeData(snap.exists() ? (snap.data() as Partial<AppData>) : undefined))
  })
}

export async function saveData(id: string, data: AppData): Promise<void> {
  await ensureAuth()
  await setDoc(dataRef(id), data)
}
