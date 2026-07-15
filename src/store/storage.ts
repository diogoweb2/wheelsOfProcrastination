// Persistence adapter. Today: localStorage. Later: swap `load`/`save` for Firestore.
import type { AppData } from '../types'
import { dayKey } from '../logic/dates'

const KEY = 'wheels-of-procrastination:v1'

export function defaultData(): AppData {
  return {
    tasks: [],
    completions: [],
    frozenDays: [],
    badges: [],
    settings: {
      pinHash: null,
      pinSalt: crypto.randomUUID(),
      reminderHour: 19,
      soundOn: true,
      streakGoal: 7,
      goalsReached: [],
    },
    economy: { gems: 0, freezes: 0, totalGemsEarned: 0 },
    streak: { current: 0, best: 0, lastCompletionDay: null, lastRolloverDay: dayKey() },
    daily: { day: dayKey(), completionsToday: 0, respinsToday: 0, pendingPicks: [] },
  }
}

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultData()
    // merge over defaults so new fields added in updates don't break old saves
    const parsed = JSON.parse(raw) as Partial<AppData>
    const base = defaultData()
    const merged = {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      economy: { ...base.economy, ...parsed.economy },
      streak: { ...base.streak, ...parsed.streak },
      daily: { ...base.daily, ...parsed.daily },
    }
    // migrate pre-stack saves: daily.pendingPick (single) → daily.pendingPicks (array)
    const legacy = (parsed.daily as { pendingPick?: { taskId: string; via: 'wheel' | 'manual' } } | undefined)?.pendingPick
    if (!Array.isArray(merged.daily.pendingPicks)) merged.daily.pendingPicks = legacy ? [legacy] : []
    // tasks predating start-date / day-scope default to always-available
    for (const t of merged.tasks) if (!t.dayScope) t.dayScope = 'all'
    return merged
  } catch {
    return defaultData()
  }
}

export function save(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
