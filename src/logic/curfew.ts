// 🌙 Night watch (§23) — the daily schedule that puts most of the app to bed.
//
// One window per day (19:00 → 07:00 by default). Inside it only the apps on the
// allow-list open; everything else shows the schedule card instead of its
// screen. It is deliberately NOT a hidden feature: the icons stay on the home
// screen wearing a moon, and the blocked screen says whose rule it is and when
// it lifts, so it can never read as a bug.
//
// Whose clock: the device's own. This is a family on one timezone, and a
// server-side curfew would need a server the rest of the app doesn't have.
export interface CurfewSettings {
  /** Master switch. Off = the app behaves exactly as it always did. */
  on: boolean
  /** Local time the window opens — the "time x" the parent sets. */
  startHour: number // 0-23
  startMin: number // 0-59
  /** Local time it lifts the next morning. */
  endHour: number
  endMin: number
  /** App ids that stay open through the night. Everything else sleeps. */
  allow: string[]
}

/**
 * What the night watch looks like out of the box: tasks, the bank and the
 * schoolwork stay open, plus the three board games that are played against a
 * person rather than farmed alone.
 */
export const DEFAULT_ALLOW = ['wheel', 'bank', 'academy', 'essay', 'chess', 'checkers', 'seabattle']

/**
 * Apps nobody can lock away, whatever the allow-list says: Settings (it holds
 * the PIN and the sound) and the parent's own desk — the desk is where the
 * curfew is switched off, so locking it would lock the key inside the room.
 */
export const ALWAYS_OPEN = ['settings', 'admin']

export function defaultCurfew(): CurfewSettings {
  return { on: true, startHour: 19, startMin: 0, endHour: 7, endMin: 0, allow: [...DEFAULT_ALLOW] }
}

const mins = (h: number, m: number) => h * 60 + m

/** Is the night watch on right now? A window that wraps past midnight counts both sides. */
export function curfewActive(c: CurfewSettings | undefined, now: Date = new Date()): boolean {
  if (!c?.on) return false
  const start = mins(c.startHour, c.startMin)
  const end = mins(c.endHour, c.endMin)
  const t = mins(now.getHours(), now.getMinutes())
  // 19:00 → 07:00 wraps midnight; 13:00 → 15:00 doesn't. Same clock, both shapes.
  return start <= end ? t >= start && t < end : t >= start || t < end
}

/** May this profile open this app right now? */
export function appOpen(appId: string, c: CurfewSettings | undefined, now: Date = new Date()): boolean {
  if (ALWAYS_OPEN.includes(appId)) return true
  if (!curfewActive(c, now)) return true
  return !!c?.allow.includes(appId)
}

/** `19:00` — the clock as the settings card and the blocked screen both print it. */
export function clockLabel(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** When the app wakes back up, as a sentence: "7:00 tomorrow morning" / "7:00". */
export function opensAtLabel(c: CurfewSettings, now: Date = new Date()): string {
  const end = mins(c.endHour, c.endMin)
  const t = mins(now.getHours(), now.getMinutes())
  const tomorrow = end <= t
  return `${clockLabel(c.endHour, c.endMin)}${tomorrow ? ' tomorrow' : ''}`
}

/** Minutes left until the window lifts — what the countdown on the blocked screen reads. */
export function minutesLeft(c: CurfewSettings, now: Date = new Date()): number {
  const end = mins(c.endHour, c.endMin)
  const t = mins(now.getHours(), now.getMinutes())
  return end > t ? end - t : 24 * 60 - t + end
}

/** "2h 15m" — the countdown, short enough to sit on one line. */
export function leftLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
