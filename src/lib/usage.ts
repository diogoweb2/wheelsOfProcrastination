// 📈 Usage analytics (§26) — what Ben and I actually open, tap and do, so a
// feature nobody has touched in a month can be found and taken out.
//
// Three things are logged with no per-feature work at all:
//   view:<app>-<tab>  every page open      — App.tsx calls trackView on each route
//   act:<action>      every store action   — instrumentActions wraps them all
//   tap:<label>       every tap, anywhere  — one capturing click listener
// plus `seconds` per page (time with the screen actually in front of someone),
// `hours` (which hour of the day), and `ses:open` / `ses:login` for arrivals.
//
// It writes to `usage/{profile}__{date}__{device}`: one document per person per
// day per device. A device owns its own document, so it rewrites it whole with
// no merge logic and can never clobber the other device's copy; the report just
// sums them. A day of heavy use is one small document, not a thousand writes.
//
// The rules this file lives by:
//  - It never breaks the app. Every entry point swallows its own failures.
//  - It never costs much. Events pile up in memory and flush at most every 20s.
//  - It forgets. Nothing older than RETAIN_DAYS survives in Firestore (§26d).
//  - It never records a secret. `data-usage` on a container relabels everything
//    inside it (that is how the PIN pad logs "pin key" and not the digits), and
//    `data-usage-off` drops the tap entirely. Input VALUES are never read.
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { ensureAuth, firestore } from './firebase'
import { addDays, dayKey } from '../logic/dates'
import { getActiveProfileId } from '../store/storage'
import { inShell } from '../push'
import type { UsageDay, UsageEvent } from '../types'

const COL = 'usage'

/** §26d — how much history is kept. A month, never more. */
export const RETAIN_DAYS = 30
/**
 * Events kept per day document. A flush rewrites the document whole — simple,
 * and nothing can half-apply — so the tail is also the size of every write.
 * 500 × ~100 B is a readable trail of a day for about 50 KB.
 */
const TAIL = 500
/**
 * …and how many times one key may appear in that trail. Without this, a day of
 * tapping `pin key` is the whole tail and the trail says nothing. The count is
 * never capped — only the trail is a sample.
 */
const PER_KEY_TAIL = 20
/** Distinct `counts` keys per day document, after which they fold into `:other`. */
const KEY_CAP = 600
/** A burst of taps writes once: the flush is debounced by this. */
const FLUSH_MS = 30_000
/** Page time accrues in the background, so a dirty document is swept this often. */
const SWEEP_MS = 5 * 60_000
/** Untouched for this long and nobody is looking: page time stops accruing. */
const IDLE_MS = 10 * 60_000
const BEAT_MS = 15_000
/** Whose events these are before anyone has got past the PIN. */
const LOCKED = 'locked'

const DEVICE_KEY = 'wop-device'
const SWEPT_KEY = 'wop-usage-swept'

export type UsageKind = 'view' | 'act' | 'tap' | 'ses'

interface Bucket {
  day: UsageDay
  /** Unwritten changes. */
  dirty: boolean
  /** Whether what the server already holds for this day has been folded in. */
  hydrated: boolean
}

let installed = false
let device = 'unknown'
let deviceName = 'unknown'
let profile = LOCKED
/** The page we are on, as `app-tab` — the key page time is charged to. */
let route = 'lock-pin'
let lastTouch = 0
let flushTimer: number | null = null
const buckets = new Map<string, Bucket>()

// --- keys --------------------------------------------------------------------

/**
 * A Firestore map key that is still readable. `.`, `[`, `]`, `*` and a backtick
 * are field-path syntax, a leading `__` is reserved, and the rest is squeezed
 * to single dashes so `✓ Got it` stays `✓-Got-it` rather than becoming a hash.
 */
function safeKey(s: string): string {
  const cleaned = s
    .replace(/[.[\]*`/\\]/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\s\u0000-\u001f]+/g, ' ')
    .trim()
    .slice(0, 48)
    .replace(/ /g, '-')
    .replace(/^_+/, '')
  return cleaned || 'other'
}

// --- the day document --------------------------------------------------------

function docId(profileId: string, date: string): string {
  return `${profileId}__${date}__${device}`
}

function bucket(profileId: string, date: string): Bucket {
  const id = docId(profileId, date)
  const found = buckets.get(id)
  if (found) return found
  const now = new Date().toISOString()
  const fresh: Bucket = {
    dirty: false,
    hydrated: false,
    day: {
      id,
      profileId,
      date,
      deviceId: device,
      device: deviceName,
      firstAt: now,
      lastAt: now,
      counts: {},
      seconds: {},
      hours: {},
      events: [],
      dropped: 0,
    },
  }
  buckets.set(id, fresh)
  return fresh
}

// --- logging -----------------------------------------------------------------

/**
 * Log one moment. Never throws, never awaits, never blocks what it is watching.
 *
 * @param detail a label or argument worth keeping in full (80 chars)
 * @param value  a number worth keeping (Berries, minutes, a score)
 */
export function track(kind: UsageKind, name: string, detail?: string, value?: number): void {
  try {
    if (!installed) return
    const now = Date.now()
    const b = bucket(profile, dayKey(new Date(now)))
    const d = b.day
    let key = `${kind}:${safeKey(name)}`
    // A free-text label (every quest title, every card name) could otherwise
    // grow `counts` without limit; past the cap they all fold into one key.
    if (d.counts[key] === undefined && Object.keys(d.counts).length >= KEY_CAP) key = `${kind}:other`
    d.counts[key] = (d.counts[key] ?? 0) + 1
    const hour = String(new Date(now).getHours())
    d.hours[hour] = (d.hours[hour] ?? 0) + 1
    d.lastAt = new Date(now).toISOString()

    if (d.counts[key] <= PER_KEY_TAIL) {
      const event: UsageEvent = { t: now, k: key }
      if (detail) event.p = detail.replace(/\s+/g, ' ').trim().slice(0, 80)
      if (value !== undefined && Number.isFinite(value)) event.v = Math.round(value)
      if (kind !== 'view') event.r = route
      d.events.push(event)
      if (d.events.length > TAIL) {
        d.dropped += d.events.length - TAIL
        d.events.splice(0, d.events.length - TAIL)
      }
    } else {
      d.dropped += 1
    }

    b.dirty = true
    lastTouch = now
    schedule()
  } catch {
    // A logger must never be the thing that breaks.
  }
}

let lastView = { key: '', at: 0 }

/** Every page open. `tab` is null on the Dashboard. */
export function trackView(app: string, tab: string | null): void {
  try {
    const key = tab ? `${app}-${tab}` : app
    const now = Date.now()
    // React StrictMode mounts effects twice in dev; one arrival is one view.
    if (key === lastView.key && now - lastView.at < 1000) return
    lastView = { key, at: now }
    route = key
    track('view', key)
  } catch {
    // ignored on purpose
  }
}

/** Who is signed in now. Switching crewmate closes the previous person's day. */
export function usageProfile(profileId: string | null): void {
  try {
    const next = profileId ?? LOCKED
    if (next === profile) return
    void flushUsage()
    profile = next
    if (profileId) track('ses', 'login')
  } catch {
    // ignored on purpose
  }
}

// --- the store's actions -----------------------------------------------------

/**
 * Names that say nothing about what anyone DID, so logging them would bury the
 * things that do:
 *  - selectors the UI calls while rendering (hundreds of times a minute),
 *  - timers and effects that run whether or not anybody is there,
 *  - "I have seen this" writes, which a banner appearing causes, not a person.
 */
const SILENT = new Set([
  // selectors
  'activeProfile',
  'completedTodayIds',
  'soloPlaysLeft',
  // timers, rollovers and boot-time repair
  'rollover',
  'ensureToday',
  'refreshDailyQuiz',
  'seTick',
  'popEvent',
  'pushEvent',
  'settleDuels',
  'settleBoardGames',
  'settleSeaBattles',
  'settleOptcgMatches',
  'essayAutoResolve',
  // acknowledgements a render fires, not a finger
  'dismissSaveError',
  'essayClearError',
  'essayClearCheck',
  'seSeenVerdict',
])

/** …and anything shaped like `markSomethingSeen`. */
const SILENT_SHAPE = /^mark[A-Z].*Seen$/

/** Actions whose arguments are never recorded, whatever they are. */
const ARGS_OFF = new Set(['login', 'setupPin'])

/** Nested calls (`get().other()` inside an action) are one action, not two. */
let depth = 0

/**
 * Wrap every function on the store so calling it is logged. One line in
 * `useStore` instead of a `track()` call in two hundred components — and
 * nothing can be added later and quietly go unmeasured.
 */
export function instrumentActions<T extends object>(api: T): T {
  const out: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(api)) {
    if (typeof value !== 'function' || SILENT.has(name) || SILENT_SHAPE.test(name)) {
      out[name] = value
      continue
    }
    const fn = value as (...args: unknown[]) => unknown
    out[name] = (...args: unknown[]) => {
      if (depth === 0) track('act', name, ARGS_OFF.has(name) ? undefined : argHint(args), numberArg(args))
      depth++
      try {
        return fn(...args)
      } finally {
        depth--
      }
    }
  }
  return out as T
}

/** The first string argument, when it is short enough to be an id and not prose. */
function argHint(args: unknown[]): string | undefined {
  const first = args.find((a) => typeof a === 'string') as string | undefined
  return first && first.length <= 48 ? first : undefined
}

function numberArg(args: unknown[]): number | undefined {
  const first = args.find((a) => typeof a === 'number') as number | undefined
  return first
}

// --- taps --------------------------------------------------------------------

const TAPPABLE = '[data-usage],button,a,summary,label,[role="button"],input,select,textarea'

function onTap(e: Event): void {
  try {
    const target = e.target as Element | null
    const el = target?.closest?.(TAPPABLE)
    if (!el) return
    if (el.closest('[data-usage-off]')) return
    const label = tapLabel(el)
    track('tap', label, label)
  } catch {
    // ignored on purpose
  }
}

/**
 * What to call the thing that was tapped. A `data-usage` ancestor wins, which
 * is how a pad of digits reports "pin key" instead of the PIN. Input VALUES are
 * never read — only the label around them.
 */
function tapLabel(el: Element): string {
  const marked = el.closest('[data-usage]')
  const given = marked?.getAttribute('data-usage')
  if (given) return given
  const aria = el.getAttribute('aria-label')
  if (aria?.trim()) return aria.trim()
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (text) return text
  const bits = [el.tagName.toLowerCase(), el.getAttribute('type'), el.getAttribute('name') ?? el.id]
  return bits.filter(Boolean).join(' ')
}

const touch = () => {
  lastTouch = Date.now()
}

// --- page time ---------------------------------------------------------------

/**
 * Page time, counted rather than measured: every beat where the screen is
 * visible AND somebody has touched it within [IDLE_MS] adds its own length to
 * the open page. A phone left face-up on the table stops counting; a video
 * being watched (visible, tapped a minute ago) keeps counting.
 */
function beat(): void {
  try {
    if (document.visibilityState !== 'visible') return
    if (Date.now() - lastTouch > IDLE_MS) return
    const b = bucket(profile, dayKey())
    b.day.seconds[route] = (b.day.seconds[route] ?? 0) + BEAT_MS / 1000
    b.dirty = true
  } catch {
    // ignored on purpose
  }
}

// --- writing -----------------------------------------------------------------

function schedule(): void {
  if (flushTimer !== null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushUsage()
  }, FLUSH_MS)
}

/** Write every changed day document. Safe to call at any time. */
export async function flushUsage(): Promise<void> {
  for (const [id, b] of [...buckets]) {
    if (!b.dirty) continue
    try {
      await ensureAuth()
      if (!b.hydrated) {
        // Reloading the app mid-day starts the counters at zero, so what the
        // server already holds for this device-day is folded in before the
        // first write — otherwise the rewrite would throw the morning away.
        b.hydrated = true
        await absorb(id, b.day)
      }
      b.dirty = false
      await setDoc(doc(firestore, COL, id), b.day)
      // Yesterday's document, once safely written, is no longer ours to hold.
      if (b.day.date !== dayKey() && !b.dirty) buckets.delete(id)
    } catch (err) {
      b.dirty = true
      console.warn('usage write failed', err)
    }
  }
}

/** Add the server's copy of this device-day into ours (everything is additive). */
async function absorb(id: string, day: UsageDay): Promise<void> {
  try {
    const snap = await getDoc(doc(firestore, COL, id))
    if (!snap.exists()) return
    const prev = snap.data() as UsageDay
    for (const [k, n] of Object.entries(prev.counts ?? {})) day.counts[k] = (day.counts[k] ?? 0) + n
    for (const [k, n] of Object.entries(prev.seconds ?? {})) day.seconds[k] = (day.seconds[k] ?? 0) + n
    for (const [k, n] of Object.entries(prev.hours ?? {})) day.hours[k] = (day.hours[k] ?? 0) + n
    day.dropped += prev.dropped ?? 0
    if (prev.firstAt && prev.firstAt < day.firstAt) day.firstAt = prev.firstAt
    const all = [...(prev.events ?? []), ...day.events].sort((a, b) => a.t - b.t)
    day.dropped += Math.max(0, all.length - TAIL)
    day.events = all.slice(-TAIL)
  } catch (err) {
    // Offline or refused: carry on and write what this load has seen. Losing a
    // morning of analytics is a smaller problem than never writing again.
    console.warn('usage merge failed', err)
  }
}

// --- forgetting --------------------------------------------------------------

/** §26d — drop every day older than a month. Once per device per day. */
async function sweep(): Promise<void> {
  try {
    const today = dayKey()
    if (localStorage.getItem(SWEPT_KEY) === today) return
    await ensureAuth()
    const cutoff = addDays(today, -RETAIN_DAYS)
    const old = await getDocs(query(collection(firestore, COL), where('date', '<', cutoff), limit(400)))
    await Promise.all(old.docs.map((d) => deleteDoc(d.ref)))
    localStorage.setItem(SWEPT_KEY, today)
    if (old.size) console.info(`[usage] swept ${old.size} day(s) older than ${cutoff}`)
  } catch (err) {
    console.warn('usage sweep failed', err)
  }
}

/** Throw the whole log away — the 🧹 on `/usage/log`. Returns documents removed. */
export async function clearUsage(): Promise<number> {
  await ensureAuth()
  const all = await getDocs(query(collection(firestore, COL), limit(500)))
  await Promise.all(all.docs.map((d) => deleteDoc(d.ref)))
  buckets.clear()
  return all.size
}

// --- reading -----------------------------------------------------------------

/** Live-sync the whole retained window, newest day first. Returns unsubscribe. */
export function subscribeUsage(cb: (days: UsageDay[]) => void): () => void {
  const from = addDays(dayKey(), -RETAIN_DAYS)
  let stop: (() => void) | null = null
  let dead = false
  void ensureAuth()
    .then(() => {
      if (dead) return
      stop = onSnapshot(
        query(collection(firestore, COL), where('date', '>=', from), orderBy('date', 'desc')),
        (snap) => cb(snap.docs.map((d) => d.data() as UsageDay)),
        (err) => {
          console.warn('usage read failed', err)
          cb([])
        },
      )
    })
    .catch(() => cb([]))
  return () => {
    dead = true
    stop?.()
  }
}

// --- install -----------------------------------------------------------------

function readDevice(): string {
  try {
    const found = localStorage.getItem(DEVICE_KEY)
    if (found) return found
    const made = crypto.randomUUID().slice(0, 8)
    localStorage.setItem(DEVICE_KEY, made)
    return made
  } catch {
    return 'nostore'
  }
}

/** A device I can recognise in the report a week later. */
function readDeviceName(): string {
  try {
    if (inShell()) return 'tablet (android shell)'
    const ua = navigator.userAgent
    const kind = /Android/.test(ua)
      ? 'android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'ios'
        : /Macintosh/.test(ua)
          ? 'mac'
          : /Windows/.test(ua)
            ? 'windows'
            : 'web'
    const installedApp = window.matchMedia?.('(display-mode: standalone)')?.matches
    return installedApp ? `${kind} (installed)` : kind
  } catch {
    return 'web'
  }
}

/** Called once, from main.tsx, before the app renders. */
export function installUsage(): void {
  try {
    if (installed) return
    installed = true
    device = readDevice()
    deviceName = readDeviceName()
    profile = getActiveProfileId() ?? LOCKED
    lastTouch = Date.now()
    track('ses', 'open', deviceName)

    document.addEventListener('click', onTap, true)
    for (const name of ['pointerdown', 'keydown', 'touchstart']) {
      document.addEventListener(name, touch, { capture: true, passive: true })
    }
    document.addEventListener('visibilitychange', () => {
      touch()
      if (document.visibilityState === 'hidden') void flushUsage()
    })
    window.addEventListener('pagehide', () => void flushUsage())

    window.setInterval(beat, BEAT_MS)
    window.setInterval(() => {
      for (const b of buckets.values()) {
        if (b.dirty) {
          void flushUsage()
          return
        }
      }
    }, SWEEP_MS)

    void sweep()
  } catch (err) {
    console.warn('usage install failed', err)
  }
}
