// Crash log, in Firestore, so a failure on the phone can be read from a laptop.
//
// The app had no error trail at all: an unhandled rejection just left a button
// snapping back to normal with nothing on screen and nothing anywhere else.
// Everything here is fire-and-forget and swallows its own failures — a logger
// that can break the app it watches is worse than no logger.
//
// Kept for 24h only (see TTL_MS). Old entries are swept on the next write, so
// the collection stays a handful of documents and never needs tending.
import { Timestamp, addDoc, collection, deleteDoc, getDocs, query, where } from 'firebase/firestore'
import { ensureAuth, firestore } from './firebase'
import { getActiveProfileId } from '../store/storage'

const COL = 'errors'

/** How long a crash is worth keeping. Yesterday's noise helps nobody. */
const TTL_MS = 24 * 60 * 60 * 1000

export interface ErrorEntry {
  at: string // ISO, so it reads straight out of the console
  where: string // 'gymPlan', 'window.onerror', … — what was happening
  message: string
  stack?: string
  route: string
  profile?: string
  ua: string
}

/** Same message twice in a row (React re-render, retry loop) writes once. */
let lastKey = ''
let lastAt = 0

export function logError(where: string, err: unknown): void {
  try {
    const message = messageOf(err)
    const key = `${where}:${message}`
    const now = Date.now()
    if (key === lastKey && now - lastAt < 10_000) return
    lastKey = key
    lastAt = now

    const entry: ErrorEntry = {
      at: new Date(now).toISOString(),
      where,
      message: message.slice(0, 500),
      stack: err instanceof Error && err.stack ? err.stack.slice(0, 2000) : undefined,
      route: `${location.pathname}${location.search}`,
      profile: getActiveProfileId() ?? undefined,
      ua: navigator.userAgent.slice(0, 200),
    }

    console.error(`[${where}]`, err)
    void write(entry)
  } catch {
    // A logger must never be the thing that breaks.
  }
}

async function write(entry: ErrorEntry): Promise<void> {
  try {
    await ensureAuth()
    await addDoc(collection(firestore, COL), { ...entry, ts: Timestamp.now() })
    await sweep()
  } catch {
    // Offline, rules, quota — nothing to do about it from in here.
  }
}

/** Drop everything older than the TTL. Cheap: the collection is tiny by design. */
async function sweep(): Promise<void> {
  try {
    const cutoff = Timestamp.fromMillis(Date.now() - TTL_MS)
    const old = await getDocs(query(collection(firestore, COL), where('ts', '<', cutoff)))
    await Promise.all(old.docs.map((d) => deleteDoc(d.ref)))
  } catch {
    // Same: best effort.
  }
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message || String(err)
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/** Catch what nothing else caught. Called once, from main.tsx. */
export function installErrorLog(): void {
  window.addEventListener('error', (e) => logError('window.onerror', e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => logError('unhandledrejection', e.reason))
}
