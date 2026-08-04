// All streak logic runs on LOCAL calendar days, formatted YYYY-MM-DD.
import type { Season } from '../types'

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** Day of week for a day key: 0 = Sunday … 6 = Saturday (local). */
export function dayOfWeek(key: string): number {
  return parseDay(key).getDay()
}

/** Short weekday label for a 0–6 index, e.g. 1 → "Mon". */
export function weekDayLabel(dow: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow] ?? ''
}

/** True if the given day (local) falls on Saturday or Sunday. */
export function isWeekend(key: string): boolean {
  const dow = parseDay(key).getDay()
  return dow === 0 || dow === 6
}

/**
 * Which season a day key falls in (northern hemisphere, month-based so it never
 * drifts): Mar–May spring, Jun–Aug summer, Sep–Nov fall, Dec–Feb winter.
 */
export function seasonOf(key: string): Season {
  const m = parseDay(key).getMonth() // 0 = Jan
  if (m <= 1 || m === 11) return 'winter'
  if (m <= 4) return 'spring'
  if (m <= 7) return 'summer'
  return 'fall'
}

/** Label + emoji for a season chip, e.g. "☀️ Summer". */
export function seasonLabel(s: Season): string {
  return { winter: '❄️ Winter', spring: '🌱 Spring', summer: '☀️ Summer', fall: '🍂 Fall' }[s]
}

/** Days from today until `due` (negative = overdue). */
export function daysUntil(due: string, today: string = dayKey()): number {
  const ms = parseDay(due).getTime() - parseDay(today).getTime()
  return Math.round(ms / 86_400_000)
}

/** Every day strictly between a and b (exclusive both ends), ascending. */
export function daysBetween(a: string, b: string): string[] {
  const out: string[] = []
  let cur = addDays(a, 1)
  while (cur < b) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

export function prettyDay(key: string): string {
  return parseDay(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
