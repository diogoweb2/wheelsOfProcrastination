// Firestore data layer. Three shapes:
//   app/roster            → { profiles: Profile[] }     the crew + their PIN hashes (synced across devices)
//   app/quizBank          → { questions: QuizQuestion[] } the shared question bank (incl. removed/pending flags)
//   app/prizeCatalog      → { prizes: PrizeCatalog }   the treasures on each crewmate's shelf
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
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage'
import { app, ensureAuth, firestore } from '../lib/firebase'
import type { AiConfig, AppData, AuditEntry, BoardMatch, CardDuel, Essay, EssayTopic, EssayWord, EssayWordTest, FinalTestAuth, FreezeGift, FreezeRequest, GymCatalog, Idea, MarketData, OptcgMatch, Profile, QuizQuestion, SeaMatch, StickerTrade } from '../types'
import { mergeData, readLocalData, readLocalRoster, seedProfiles } from './storage'
import { DEFAULT_PRIZES, type PrizeCatalog } from '../logic/quiz'
import { CANADA_GEOGRAPHY_SEED } from '../quiz/canadaGeographySeed'
import { CANADA_GEOGRAPHY_2_SEED } from '../quiz/canadaGeography2Seed'
import { CANADA_HISTORY_SEED } from '../quiz/canadaHistorySeed'
import { ONTARIO_GEOGRAPHY_SEED } from '../quiz/ontarioGeographySeed'
import { TORONTO_GEOGRAPHY_SEED } from '../quiz/torontoGeographySeed'
import { AI_DEV_SEED } from '../quiz/aiDevSeed'
import { AGENTS_SEED } from '../quiz/agentsSeed'
import { SCIENCE_6_SEED } from '../quiz/science6Seed'
import { CRITICAL_THINKING_6_SEED } from '../quiz/criticalThinking6Seed'
import { LOGIC_6_SEED } from '../quiz/logic6Seed'

const ALL_SEEDS = [
  ...CANADA_GEOGRAPHY_SEED,
  ...CANADA_GEOGRAPHY_2_SEED,
  ...CANADA_HISTORY_SEED,
  ...ONTARIO_GEOGRAPHY_SEED,
  ...TORONTO_GEOGRAPHY_SEED,
  ...AI_DEV_SEED,
  ...AGENTS_SEED,
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

/**
 * Live-sync one profile's world. cb fires on load and whenever another device writes.
 *
 * `fromCache` matters: the web SDK serves the local IndexedDB copy first and only
 * then round-trips to the server, so the FIRST snapshot after a cold load is very
 * often stale (it can predate a write made on another device). Callers must not
 * treat a cached snapshot as authoritative — writing back a blob built from one
 * is how a task added on the phone gets silently deleted by the laptop.
 * Returns unsubscribe.
 */
export function subscribeData(id: string, cb: (data: AppData, fromCache: boolean) => void): () => void {
  return onSnapshot(dataRef(id), (snap) => {
    cb(mergeData(snap.exists() ? (snap.data() as Partial<AppData>) : undefined), snap.metadata.fromCache)
  })
}

/**
 * Write only the named top-level fields, leaving every other field on the doc
 * untouched. This is the normal write path: a full setDoc overwrites the whole
 * document, so two devices editing different areas (phone adds a task, laptop
 * rolls the day over) clobber each other. Merging by field means only a genuine
 * same-field conflict is last-write-wins.
 */
export async function saveDataFields(id: string, fields: Partial<AppData>): Promise<void> {
  if (Object.keys(fields).length === 0) return
  await ensureAuth()
  await setDoc(dataRef(id), fields, { merge: true })
}

/**
 * Callback invoked when a background write fails. Writes are fire-and-forget so
 * the UI stays instant, which means a rejected write is invisible: the change
 * sits in memory looking saved until a refresh throws it away. (A single
 * `undefined` field value — which Firestore rejects outright — silently ate
 * newly-added tasks this way.) The store registers a reporter here so any
 * failure surfaces instead of vanishing.
 */
let onWriteError: (e: unknown) => void = (e) => console.error('cloud write failed', e)

export function setWriteErrorHandler(fn: (e: unknown) => void): void {
  onWriteError = fn
}

/** Fire-and-forget wrapper: never blocks the UI, never swallows the failure. */
export function fireAndForget(p: Promise<unknown>): void {
  void p.catch((e) => onWriteError(e))
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

// --- card duels (shared board: challenges + the live match state) -----------
//
// One doc holding a short history of matches. Both phones subscribe; whoever's
// turn it is writes the whole list back with the new position. Only one side can
// legally move at a time, so a last-write-wins doc is enough — there is no
// window where both devices hold the move.

const duelsRef = () => doc(firestore, 'app', 'cardDuels')

/** Live-sync the duel board. Fires on a challenge, an accept, and every move the other side plays. */
export function subscribeCardDuels(cb: (duels: CardDuel[]) => void): () => void {
  return onSnapshot(duelsRef(), (snap) => {
    const data = snap.data() as { duels?: CardDuel[] } | undefined
    cb(data?.duels ?? [])
  })
}

export async function saveCardDuels(duels: CardDuel[]): Promise<void> {
  await ensureAuth()
  await setDoc(duelsRef(), { duels })
}

// --- board games (shared board for Chess and Checkers) ---------------------
//
// Same arrangement as the card duels, and safe for the same reason: only one
// side may legally move at a time, so the device holding the move is the only
// one writing. Chess and Checkers share the doc — a match names its own `kind`.

const boardGamesRef = () => doc(firestore, 'app', 'boardGames')

/** Live-sync the board-game table. Fires on a challenge, an accept, and every move the other side plays. */
export function subscribeBoardGames(cb: (matches: BoardMatch[]) => void): () => void {
  return onSnapshot(boardGamesRef(), (snap) => {
    const data = snap.data() as { matches?: BoardMatch[] } | undefined
    cb(data?.matches ?? [])
  })
}

export async function saveBoardGames(matches: BoardMatch[]): Promise<void> {
  await ensureAuth()
  await setDoc(boardGamesRef(), { matches })
}

// --- sea battles (Battleship, its own shared board) -------------------------
//
// Its own document rather than a `kind` on the board-game one: a Sea Battle
// carries four 100-square arrays where a chess position carries one of 64, and
// the two would push each other out of a doc that only keeps the last few
// matches. Same single-writer safety as everything above.

const seaBattlesRef = () => doc(firestore, 'app', 'seaBattles')

/** Live-sync the sea. Fires on a challenge, an accept, and every shot the other side takes. */
export function subscribeSeaBattles(cb: (matches: SeaMatch[]) => void): () => void {
  return onSnapshot(seaBattlesRef(), (snap) => {
    const data = snap.data() as { matches?: SeaMatch[] } | undefined
    cb(data?.matches ?? [])
  })
}

export async function saveSeaBattles(matches: SeaMatch[]): Promise<void> {
  await ensureAuth()
  await setDoc(seaBattlesRef(), { matches })
}

// --- card binder swaps (its own shared table) -------------------------------
//
// The One Piece Album trades the same way the sticker album does, but in its own
// document: the two collections are separate piles, and a swap list that mixed
// them would be unreadable.

const cardTradesRef = () => doc(firestore, 'app', 'cardTrades')

export function subscribeCardTrades(cb: (trades: StickerTrade[]) => void): () => void {
  return onSnapshot(cardTradesRef(), (snap) => {
    const data = snap.data() as { trades?: StickerTrade[] } | undefined
    cb(data?.trades ?? [])
  })
}

export async function saveCardTrades(trades: StickerTrade[]): Promise<void> {
  await ensureAuth()
  await setDoc(cardTradesRef(), { trades })
}

// --- FC Lock album swaps (its own shared table) ------------------------------
//
// Third collection, third doc, for the same reason as the second: the piles are
// separate, and one swap list holding stickers, TCG cards and footballers would
// be unreadable.

const fcTradesRef = () => doc(firestore, 'app', 'fcTrades')

export function subscribeFcTrades(cb: (trades: StickerTrade[]) => void): () => void {
  return onSnapshot(fcTradesRef(), (snap) => {
    const data = snap.data() as { trades?: StickerTrade[] } | undefined
    cb(data?.trades ?? [])
  })
}

export async function saveFcTrades(trades: StickerTrade[]): Promise<void> {
  await ensureAuth()
  await setDoc(fcTradesRef(), { trades })
}

// --- One Piece TCG (its own shared table) -----------------------------------
//
// Its own document for the same reason Sea Battle has one: a card game carries
// two 50-card decks, two hands and two fields, which would crowd out a chess
// position sharing the doc. Same single-writer rule — only the side the
// position says must act ever writes.

const optcgRef = () => doc(firestore, 'app', 'optcgMatches')

/** Live-sync the table. Fires on a challenge, an accept, and every move. */
export function subscribeOptcgMatches(cb: (matches: OptcgMatch[]) => void): () => void {
  return onSnapshot(optcgRef(), (snap) => {
    const data = snap.data() as { matches?: OptcgMatch[] } | undefined
    cb(data?.matches ?? [])
  })
}

export async function saveOptcgMatches(matches: OptcgMatch[]): Promise<void> {
  await ensureAuth()
  await setDoc(optcgRef(), { matches })
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

// --- remote final tests (shared: Dad's authorisations + their results) ------

const finalTestsRef = () => doc(firestore, 'app', 'finalTests')

/** Live-sync the final-test desk. Fires when Dad authorises one, or when Ben's device reports the result. */
export function subscribeFinalTests(cb: (tests: FinalTestAuth[]) => void): () => void {
  return onSnapshot(finalTestsRef(), (snap) => {
    const data = snap.data() as { tests?: FinalTestAuth[] } | undefined
    cb(data?.tests ?? [])
  })
}

export async function saveFinalTests(tests: FinalTestAuth[]): Promise<void> {
  await ensureAuth()
  await setDoc(finalTestsRef(), { tests })
}

// --- essays (the topic list Dad curates + the essays Ben writes) ------------
//
// One doc, both halves, because the whole feature is a conversation between the
// two sides: a topic Dad enables shows up on Ben's list, an essay Ben submits
// shows up on Dad's desk, and the review rounds bounce between them. Same
// last-write-wins arrangement as the duel board, and safe for the same reason:
// at any moment exactly one side is holding the essay.

const essaysRef = () => doc(firestore, 'app', 'essays')

/** Everything the essay app owns, in one document. */
export interface EssayDesk {
  topics: EssayTopic[]
  essays: Essay[]
  /** The word bank: every word he has ever misspelled, with the quiz built in. */
  words: EssayWord[]
  /** Word-test history — what "new words since your last test" is measured against. */
  wordTests: EssayWordTest[]
}

/** Live-sync the essay desk: topics, essays in flight, and the word bank. */
export function subscribeEssays(cb: (v: EssayDesk) => void): () => void {
  return onSnapshot(essaysRef(), (snap) => {
    const data = snap.data() as Partial<EssayDesk> | undefined
    cb({
      topics: data?.topics ?? [],
      essays: data?.essays ?? [],
      words: data?.words ?? [],
      wordTests: data?.wordTests ?? [],
    })
  })
}

export async function saveEssays(desk: EssayDesk): Promise<void> {
  await ensureAuth()
  await setDoc(essaysRef(), desk)
}

// --- market data (shared XGRO/QQQ return series, fetched monthly) -----------

const marketRef = () => doc(firestore, 'app', 'marketData')

/** Live-sync the shared market series (fetched by scripts/bank-market.mjs). null until it exists. */
export function subscribeMarketData(cb: (m: MarketData | null) => void): () => void {
  return onSnapshot(marketRef(), (snap) => {
    cb(snap.exists() ? (snap.data() as MarketData) : null)
  })
}

// --- prize catalog (the treasures on each crewmate's shelf) ----------------
// One doc for every profile's shelf, edited from the Captain's desk. Kept out
// of the profiles so the kid can't rewrite his own prices, and shared so both
// devices see an edit straight away.

const prizeCatalogRef = () => doc(firestore, 'app', 'prizeCatalog')

/** Read the shelf, writing the built-in seed on first run so the desk has something to edit. */
export async function loadPrizeCatalog(): Promise<PrizeCatalog> {
  await ensureAuth()
  const snap = await getDoc(prizeCatalogRef())
  const data = snap.data() as { prizes?: PrizeCatalog } | undefined
  if (data?.prizes) return data.prizes
  await setDoc(prizeCatalogRef(), { prizes: DEFAULT_PRIZES, updatedAt: new Date().toISOString() })
  return DEFAULT_PRIZES
}

/** Live-sync the shelf: an edit on the laptop reprices the store on the phone. */
export function subscribePrizeCatalog(cb: (c: PrizeCatalog) => void): () => void {
  return onSnapshot(prizeCatalogRef(), (snap) => {
    const data = snap.data() as { prizes?: PrizeCatalog } | undefined
    if (data?.prizes) cb(data.prizes)
  })
}

export async function savePrizeCatalog(prizes: PrizeCatalog): Promise<void> {
  await ensureAuth()
  await setDoc(prizeCatalogRef(), { prizes, updatedAt: new Date().toISOString() })
}

// --- gym catalog (the shared basement: gear + the exercises it makes possible) ---
// One basement, one doc. Written by `npm run gym:equipment` and by the Gym app's
// Gear tab; both crewmates read the same list. Personal history stays in each
// profile's own AppData.

const gymCatalogRef = () => doc(firestore, 'app', 'gymCatalog')

/** Live-sync the shared equipment + exercise catalog. Fires when the photo script or the Gear tab writes. */
export function subscribeGymCatalog(cb: (c: GymCatalog | null) => void): () => void {
  return onSnapshot(gymCatalogRef(), (snap) => {
    const data = snap.data() as GymCatalog | undefined
    cb(data ? { equipment: data.equipment ?? [], exercises: data.exercises ?? [], updatedAt: data.updatedAt } : null)
  })
}

export async function saveGymCatalog(catalog: GymCatalog): Promise<void> {
  await ensureAuth()
  await setDoc(gymCatalogRef(), { ...catalog, updatedAt: new Date().toISOString() })
}

/**
 * Store one already-shrunk Gym image and hand back its URL.
 *
 * Only ever called with a 96px thumbnail from `shrinkPhoto` — the raw camera
 * file is never uploaded. `immutable` caching plus the service worker's
 * `gym-demos` CacheFirst rule (vite.config.ts) means a given image is fetched
 * once per device, ever.
 */
export async function uploadGymImage(path: string, blob: Blob): Promise<string> {
  await ensureAuth()
  const ref = storageRef(getStorage(app), `gym/${path}`)
  await uploadBytes(ref, blob, { contentType: blob.type || 'image/webp', cacheControl: 'public, max-age=31536000, immutable' })
  return await getDownloadURL(ref)
}

// --- AI config (OpenRouter key for the Gym coach) --------------------------
// Kept in the family db rather than the bundle so the key never ships in the
// deployed JS and can be rotated without a build. Same arrangement as the Smart
// Price project. Set a spend cap on the OpenRouter dashboard.

const aiConfigRef = () => doc(firestore, 'app', 'aiConfig')

export function subscribeAiConfig(cb: (c: AiConfig | null) => void): () => void {
  return onSnapshot(aiConfigRef(), (snap) => cb(snap.exists() ? (snap.data() as AiConfig) : null))
}

export async function saveAiConfig(cfg: AiConfig): Promise<void> {
  await ensureAuth()
  await setDoc(aiConfigRef(), { ...cfg, updatedAt: new Date().toISOString() })
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

