// Firestore data layer. Three shapes:
//   app/roster            → { profiles: Profile[] }     the crew + their PIN hashes (synced across devices)
//   app/quizBank          → { questions: QuizQuestion[] } the shared question bank (incl. removed/pending flags)
//   profiles/{id}         → AppData                     one whole world per crewmate
// The active login (which profile is signed in) stays local, per device (see storage.ts).
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { ensureAuth, firestore } from '../lib/firebase'
import type { AppData, Profile, QuizQuestion } from '../types'
import { mergeData, readLocalData, readLocalRoster, seedProfiles } from './storage'
import { CANADA_GEOGRAPHY_SEED } from '../quiz/canadaGeographySeed'
import { AI_DEV_SEED } from '../quiz/aiDevSeed'

const ALL_SEEDS = [...CANADA_GEOGRAPHY_SEED, ...AI_DEV_SEED]

const rosterRef = () => doc(firestore, 'app', 'roster')
const dataRef = (id: string) => doc(firestore, 'profiles', id)
const bankRef = () => doc(firestore, 'app', 'quizBank')

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

// --- quiz bank -------------------------------------------------------------

/**
 * Make sure the bank exists and holds the bundled seed topics, then return the
 * questions. Seeding only ADDS questions whose ids aren't in the cloud yet, so
 * removals/edits/regenerated questions in Firestore always win.
 */
export async function loadQuizBank(): Promise<QuizQuestion[]> {
  await ensureAuth()
  const snap = await getDoc(bankRef())
  const existing: QuizQuestion[] = snap.exists() ? ((snap.data() as { questions?: QuizQuestion[] }).questions ?? []) : []
  const known = new Set(existing.map((q) => q.id))
  const missing = ALL_SEEDS.filter((q) => !known.has(q.id))
  if (missing.length > 0) {
    const questions = [...existing, ...missing]
    await setDoc(bankRef(), { questions })
    return questions
  }
  return existing
}

/** Live bank updates (another device removing/approving questions, or the regen script). */
export function subscribeQuizBank(cb: (questions: QuizQuestion[]) => void): () => void {
  return onSnapshot(bankRef(), (snap) => {
    const data = snap.data() as { questions?: QuizQuestion[] } | undefined
    if (data?.questions) cb(data.questions)
  })
}

export async function saveQuizBank(questions: QuizQuestion[]): Promise<void> {
  await ensureAuth()
  await setDoc(bankRef(), { questions })
}
