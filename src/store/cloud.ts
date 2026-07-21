// Firestore data layer. Three shapes:
//   app/roster            → { profiles: Profile[] }     the crew + their PIN hashes (synced across devices)
//   app/quizBank          → { questions: QuizQuestion[] } the shared question bank (incl. removed/pending flags)
//   profiles/{id}         → AppData                     one whole world per crewmate
// The active login (which profile is signed in) stays local, per device (see storage.ts).
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { ensureAuth, firestore } from '../lib/firebase'
import type { AppData, AuditEntry, FreezeGift, FreezeRequest, Idea, MarketData, Profile, QuizQuestion, StickerTrade } from '../types'
import { mergeData, readLocalData, readLocalRoster, seedProfiles } from './storage'
import { CANADA_GEOGRAPHY_SEED } from '../quiz/canadaGeographySeed'
import { AI_DEV_SEED } from '../quiz/aiDevSeed'
import { SCIENCE_6_SEED } from '../quiz/science6Seed'
import { CRITICAL_THINKING_6_SEED } from '../quiz/criticalThinking6Seed'
import { LOGIC_6_SEED } from '../quiz/logic6Seed'

const ALL_SEEDS = [
  ...CANADA_GEOGRAPHY_SEED,
  ...AI_DEV_SEED,
  ...SCIENCE_6_SEED,
  ...CRITICAL_THINKING_6_SEED,
  ...LOGIC_6_SEED,
]

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

// --- ideas (shared wishlist both crewmates write to) ------------------------

const ideasRef = () => doc(firestore, 'app', 'ideas')

/** Live-sync the shared idea list. Fires on load and whenever the other crewmate writes. */
export function subscribeIdeas(cb: (ideas: Idea[]) => void): () => void {
  return onSnapshot(ideasRef(), (snap) => {
    const data = snap.data() as { ideas?: Idea[] } | undefined
    cb(data?.ideas ?? [])
  })
}

export async function saveIdeas(ideas: Idea[]): Promise<void> {
  await ensureAuth()
  await setDoc(ideasRef(), { ideas })
}

// --- sticker trades (shared swap table both crewmates read and write) -------

const tradesRef = () => doc(firestore, 'app', 'stickerTrades')

/** Live-sync the shared trade table. Fires when the other crewmate offers/answers a swap. */
export function subscribeStickerTrades(cb: (trades: StickerTrade[]) => void): () => void {
  return onSnapshot(tradesRef(), (snap) => {
    const data = snap.data() as { trades?: StickerTrade[] } | undefined
    cb(data?.trades ?? [])
  })
}

export async function saveStickerTrades(trades: StickerTrade[]): Promise<void> {
  await ensureAuth()
  await setDoc(tradesRef(), { trades })
}

// --- free freezes (shared: the kid's asks + Dad's gifts) -------------------

const freezeRef = () => doc(firestore, 'app', 'freezeRequests')

/** Live-sync the ask/gift table. Fires when the kid asks or when Dad grants. */
export function subscribeFreezeDesk(
  cb: (v: { requests: FreezeRequest[]; gifts: FreezeGift[] }) => void,
): () => void {
  return onSnapshot(freezeRef(), (snap) => {
    const data = snap.data() as { requests?: FreezeRequest[]; gifts?: FreezeGift[] } | undefined
    cb({ requests: data?.requests ?? [], gifts: data?.gifts ?? [] })
  })
}

export async function saveFreezeDesk(requests: FreezeRequest[], gifts: FreezeGift[]): Promise<void> {
  await ensureAuth()
  await setDoc(freezeRef(), { requests, gifts })
}

// --- market data (shared XGRO/QQQ return series, fetched monthly) -----------

const marketRef = () => doc(firestore, 'app', 'marketData')

/** Live-sync the shared market series (fetched by scripts/bank-market.mjs). null until it exists. */
export function subscribeMarketData(cb: (m: MarketData | null) => void): () => void {
  return onSnapshot(marketRef(), (snap) => {
    cb(snap.exists() ? (snap.data() as MarketData) : null)
  })
}

// --- audit log (append-only trail of album/money/fruit/task changes) --------
// One doc per change in the top-level `auditLog` collection. Each carries an
// `expireAt` timestamp; a Firestore TTL policy on that field auto-deletes rows
// ~7 days out, so the trail is self-cleaning and costs ~no storage.

const AUDIT_TTL_DAYS = 7
const auditCol = () => collection(firestore, 'auditLog')

/** Append one audit entry. Fire-and-forget; never blocks or throws into the UI. */
export function logAudit(entry: Omit<AuditEntry, 'id' | 'at' | 'expireAt'>): void {
  const now = Date.now()
  void ensureAuth()
    .then(() =>
      addDoc(auditCol(), {
        ...entry,
        at: Timestamp.fromMillis(now),
        expireAt: Timestamp.fromMillis(now + AUDIT_TTL_DAYS * 86_400_000),
      }),
    )
    .catch((e) => console.warn('audit log write failed', e))
}

/**
 * Delete audit rows whose `expireAt` has already passed. On a paid (Blaze) plan
 * a Firestore TTL policy on `expireAt` would do this server-side for free; this
 * project is on Spark (no billing), where TTL policies aren't available, so the
 * admin app prunes on load instead. Called once when the parent subscribes; the
 * TTL field is written regardless, so enabling the real policy later is a no-op
 * migration. Best-effort — swallows errors so it never disrupts the desk.
 */
export async function pruneExpiredAudit(): Promise<void> {
  try {
    await ensureAuth()
    const snap = await getDocs(query(auditCol(), where('expireAt', '<=', Timestamp.now()), limit(300)))
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  } catch (e) {
    console.warn('audit prune failed', e)
  }
}

/** Live-sync the most recent audit entries (newest first). Returns unsubscribe. */
export function subscribeAudit(max: number, cb: (entries: AuditEntry[]) => void): () => void {
  const q = query(auditCol(), orderBy('at', 'desc'), limit(max))
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const v = d.data() as Omit<AuditEntry, 'id' | 'at'> & { at?: Timestamp }
        return { ...v, id: d.id, at: v.at ? v.at.toMillis() : Date.now() } as AuditEntry
      }),
    )
  })
}
