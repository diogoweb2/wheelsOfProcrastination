// Local helpers for the Firestore-backed store:
//  - defaultData / mergeData: shape + forward-compat merge for an AppData blob
//  - seedProfiles: the initial crew roster
//  - the active login (which profile is signed in on THIS device) — kept local, per-device
//  - readers for the previous localStorage data, used once to migrate up into Firestore
import type { AppData, Profile } from '../types'
import { addDays, dayKey, parseDay } from '../logic/dates'
import { defaultBankState } from '../logic/bank'

const DATA_PREFIX = 'wheels-of-procrastination:v1' // legacy per-profile blob: `${DATA_PREFIX}:${id}`
const LEGACY_PROFILES_KEY = 'wheels-of-procrastination:profiles:v1' // legacy local roster
const ACTIVE_KEY = 'wop-active' // which profile is logged in on this device

// The two crewmates who share this app. Add more here if the crew grows.
const SEED_PROFILES: ReadonlyArray<Pick<Profile, 'id' | 'name' | 'emoji'>> = [
  { id: 'diogo', name: 'Diogo', emoji: '🏴‍☠️' },
  { id: 'ben', name: 'Ben', emoji: '⚔️' },
]

// Family roles: the parent runs official final tests, unlocks topics and settles
// gift cards; the kid's profile holds the quiz stats, Devil Fruits and purchases.
export const PARENT_ID = 'diogo'
export const KID_ID = 'ben'

export function seedProfiles(): Profile[] {
  return SEED_PROFILES.map((p) => ({ ...p, pinHash: null, pinSalt: crypto.randomUUID() }))
}

export function defaultData(): AppData {
  return {
    tasks: [],
    completions: [],
    frozenDays: [],
    badges: [],
    settings: {
      reminderHour: 19,
      soundOn: true,
      streakGoal: 7,
      goalsReached: [],
    },
    economy: { gems: 0, freezes: 0, totalGemsEarned: 0, devilFruits: 0 },
    streak: { current: 0, best: 0, lastCompletionDay: null, lastRolloverDay: dayKey() },
    daily: { day: dayKey(), completionsToday: 0, respinsToday: 0, pendingPicks: [] },
    backgrounds: { owned: [], active: null },
    quiz: { stats: {}, tests: [], passedTopics: [], unlockedTopics: ['canada-geography'], bonusFruits: {} },
    giftcards: [],
    bank: defaultBankState(),
  }
}

/** Merge a stored (possibly older/partial) blob over fresh defaults so new fields never break old saves. */
export function mergeData(parsed: Partial<AppData> | undefined): AppData {
  const base = defaultData()
  if (!parsed) return base
  const merged = {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...parsed.settings },
    economy: { ...base.economy, ...parsed.economy },
    streak: { ...base.streak, ...parsed.streak },
    daily: { ...base.daily, ...parsed.daily },
    backgrounds: { ...base.backgrounds, ...parsed.backgrounds },
    quiz: { ...base.quiz, ...parsed.quiz },
    giftcards: parsed.giftcards ?? base.giftcards,
    bank: parsed.bank
      ? {
          ...base.bank,
          ...parsed.bank,
          config: { ...base.bank.config, ...parsed.bank.config },
          pending: { ...base.bank.pending, ...parsed.bank.pending },
          accounts: {
            // rebuild from the current account list so a dropped account (savings) can't linger
            chequing: { ...base.bank.accounts.chequing, ...parsed.bank.accounts?.chequing },
            xgro: { ...base.bank.accounts.xgro, ...parsed.bank.accounts?.xgro },
            qqq: { ...base.bank.accounts.qqq, ...parsed.bank.accounts?.qqq },
            college: { ...base.bank.accounts.college, ...parsed.bank.accounts?.college },
          },
          shock: { ...base.bank.shock, ...parsed.bank.shock },
        }
      : base.bank,
  }
  // bank v1 → v2: the old Savings account is gone; fold any leftover balance into chequing
  const legacySavings = (parsed.bank as { accounts?: { savings?: { balance?: number; deposited?: number } } } | undefined)?.accounts?.savings
  if (legacySavings?.balance) {
    merged.bank.accounts.chequing.balance += legacySavings.balance
    merged.bank.accounts.chequing.deposited += legacySavings.deposited ?? legacySavings.balance
  }
  // one-time fix: a bank seeded ON its own payday used to skip that day's allowance,
  // because the sim only pays days *after* lastDay. If it never ran (no history, no
  // allowance yet) and lastDay is a payday, roll lastDay back a day so the next
  // catch-up pays it. Guarded tightly so it can't double-pay on later loads.
  const b = merged.bank
  const neverRan = b.accounts.chequing.history.length === 0 && b.accounts.xgro.history.length === 0
    && b.accounts.qqq.history.length === 0 && b.accounts.college.history.length === 0
  if (neverRan && b.pending.weeks === 0 && b.pending.amount === 0
      && b.config.weeklyAmount > 0 && parseDay(b.lastDay).getDay() === b.config.payday) {
    b.lastDay = addDays(b.lastDay, -1)
  }
  // migrate pre-stack saves: daily.pendingPick (single) → daily.pendingPicks (array)
  const legacy = (parsed.daily as { pendingPick?: { taskId: string; via: 'wheel' | 'manual' } } | undefined)?.pendingPick
  if (!Array.isArray(merged.daily.pendingPicks)) merged.daily.pendingPicks = legacy ? [legacy] : []
  // tasks predating start-date / day-scope default to always-available
  for (const t of merged.tasks) if (!t.dayScope) t.dayScope = 'all'
  return merged
}

// --- per-device login (who's signed in here) -------------------------------

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveProfileId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}

// --- one-time migration source: the previous localStorage-backed data ------

/** The local roster from the pre-Firebase build (incl. any PIN hashes already set), if present. */
export function readLocalRoster(): Profile[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_PROFILES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { profiles?: Profile[] }
    return parsed.profiles?.length ? parsed.profiles : null
  } catch {
    return null
  }
}

/** One profile's local AppData blob from the pre-Firebase build, if present. */
export function readLocalData(id: string): Partial<AppData> | null {
  try {
    const raw = localStorage.getItem(`${DATA_PREFIX}:${id}`)
    return raw ? (JSON.parse(raw) as Partial<AppData>) : null
  } catch {
    return null
  }
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
