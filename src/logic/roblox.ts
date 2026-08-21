// 🎮 Roblox bank (§20) — the screen time Ben is owed, and what he's actually played.
//
// One balance, in MINUTES, plus an append-only list of every movement behind
// it. Time comes in three ways (bought in the shop, granted by Dad with a
// reason, an official Roblox top-up) and leaves exactly one way: he says how
// long he played and pays it back off the balance.
//
// Minutes rather than hours because paying back is the whole point: he has 3h,
// he plays 45 minutes, he owes 45 minutes — not "one hour, close enough".
import type { RobloxEntry, RobloxState } from '../types'
import { dayKey } from './dates'

/** Old rows fall off the log rather than growing the profile doc forever. */
export const ROBLOX_LOG_CAP = 200

/** The pay-back slider's granularity: 5-minute steps, like a kitchen timer. */
export const PLAY_STEP = 5

export function defaultRobloxState(): RobloxState {
  return { minutes: 0, entries: [] }
}

/** "2h 45m" / "45m" / "0m" — how a balance is written everywhere in the app. */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (!h) return `${rest}m`
  return rest ? `${h}h ${rest}m` : `${h}h`
}

/** Signed, for the log: "+1h", "−45m". */
export function formatDelta(min: number): string {
  return `${min < 0 ? '−' : '+'}${formatMinutes(Math.abs(min))}`
}

export const KIND_ICON: Record<RobloxEntry['kind'], string> = {
  buy: '🛒',
  grant: '🎁',
  official: '🔗',
  play: '🎮',
}

/** Append a movement and move the balance. The balance never goes below zero. */
export function applyEntry(state: RobloxState, entry: RobloxEntry): void {
  state.minutes = Math.max(0, Math.round(state.minutes + entry.minutes))
  state.entries = [...state.entries, entry].slice(-ROBLOX_LOG_CAP)
}

export function makeEntry(input: {
  minutes: number
  kind: RobloxEntry['kind']
  note: string
  by: string
}): RobloxEntry {
  return {
    id: crypto.randomUUID(),
    minutes: Math.round(input.minutes),
    kind: input.kind,
    note: input.note,
    by: input.by,
    day: dayKey(),
    at: new Date().toISOString(),
  }
}

/** Minutes played today — the number the Play tab leads with. */
export function playedOn(state: RobloxState, day: string = dayKey()): number {
  return state.entries
    .filter((e) => e.kind === 'play' && e.day === day)
    .reduce((sum, e) => sum + Math.abs(e.minutes), 0)
}

/**
 * Time Dad put in that Ben hasn't been shown yet — each one gets a banner,
 * oldest first. Shop purchases aren't here: he was standing right there.
 */
export function unseenGrants(state: RobloxState): RobloxEntry[] {
  return state.entries.filter((e) => (e.kind === 'grant' || e.kind === 'official') && !e.seenAt)
}
