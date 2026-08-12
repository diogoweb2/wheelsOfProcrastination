// Aggregations behind the Gym's Stats tab. Pure functions over the session log —
// no rendering, no state.
//
// Charting note: every chart on that page is deliberately SINGLE-SERIES. The
// app's palette is a brand palette, not a categorical one (running the dataviz
// validator over it: gold↔orange separate by only ΔE 13.4, and bronze misses 3:1
// on the card surface), so identity is never carried by colour here — it comes
// from the body-part filter and from direct labels on the marks.
import type { BodyPart, GymSession, GymState } from '../types'
import { addDays, dayKey, parseDay } from './dates'
import { ALL_PARTS, daysSince, loggedReps } from './gym'

/** One completed exercise flattened out of the log — the row every aggregate is built from. */
export interface StatRow {
  day: string
  exId: string
  name: string
  parts: BodyPart[]
  sets: number
  reps: number
  topWeight: number
  topReps: number
  /** reps × weight, the honest "how much work" number (reps alone when bodyweight). */
  volume: number
}

export function flatten(sessions: GymSession[], part: BodyPart | 'all' = 'all'): StatRow[] {
  const rows: StatRow[] = []
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      if (part !== 'all' && !e.parts.includes(part)) continue
      const reps = loggedReps(e)
      const topWeight = Math.max(0, ...e.sets.map((x) => x.weight ?? 0))
      const topReps = Math.max(...e.sets.map((x) => x.reps))
      // volume follows the same both-sides rule as `reps`, so keep it in step with loggedReps
      const sideMult = reps / Math.max(1, e.sets.reduce((n, x) => n + x.reps, 0))
      const volume = e.sets.reduce((n, x) => n + x.reps * (x.weight && x.weight > 0 ? x.weight : 1), 0) * sideMult
      rows.push({ day: s.day, exId: e.exId, name: e.name, parts: e.parts, sets: e.sets.length, reps, topWeight, topReps, volume })
    }
  }
  return rows
}

export interface WeekBucket {
  /** Monday of the week, YYYY-MM-DD. */
  start: string
  label: string // "Aug 4"
  sessions: number
  minutes: number
  reps: number
  volume: number
}

/** The last `weeks` calendar weeks (Monday-start), oldest first, gaps included as zeroes. */
export function weeklyVolume(sessions: GymSession[], part: BodyPart | 'all', weeks = 8, today = dayKey()): WeekBucket[] {
  const rows = flatten(sessions, part)
  const thisMonday = mondayOf(today)
  const buckets: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i)
    buckets.push({ start, label: shortDate(start), sessions: 0, minutes: 0, reps: 0, volume: 0 })
  }
  const index = new Map(buckets.map((b) => [b.start, b]))

  for (const r of rows) {
    const b = index.get(mondayOf(r.day))
    if (!b) continue
    b.reps += r.reps
    b.volume += r.volume
  }
  for (const s of sessions) {
    const b = index.get(mondayOf(s.day))
    if (!b || s.status !== 'done') continue
    b.sessions += 1
    b.minutes += Math.round((s.activeSec ?? s.minutes * 60) / 60)
  }
  return buckets
}

function mondayOf(day: string): string {
  const dow = parseDay(day).getDay() // 0 = Sunday
  return addDays(day, dow === 0 ? -6 : 1 - dow)
}

function shortDate(day: string): string {
  const d = parseDay(day)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export interface PartSlice {
  part: BodyPart
  sets: number
  reps: number
  pct: number
}

/** How the work has been spread across the body over the last `days`. Sorted heaviest first. */
export function partSplit(sessions: GymSession[], days = 28, today = dayKey()): PartSlice[] {
  const cutoff = addDays(today, -days)
  const tally = new Map<BodyPart, { sets: number; reps: number }>()
  for (const s of sessions) {
    if (s.day < cutoff) continue
    for (const e of s.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      const reps = loggedReps(e)
      // a set counts once for the primary part; the rest get credit at half
      e.parts.forEach((p, i) => {
        const cur = tally.get(p) ?? { sets: 0, reps: 0 }
        cur.sets += i === 0 ? e.sets.length : e.sets.length / 2
        cur.reps += i === 0 ? reps : reps / 2
        tally.set(p, cur)
      })
    }
  }
  const total = [...tally.values()].reduce((n, v) => n + v.sets, 0) || 1
  return ALL_PARTS.filter((p) => tally.has(p))
    .map((p) => {
      const v = tally.get(p)!
      return { part: p, sets: Math.round(v.sets), reps: Math.round(v.reps), pct: (v.sets / total) * 100 }
    })
    .sort((a, b) => b.sets - a.sets)
}

export interface ProgressPoint {
  day: string
  label: string
  /** The number the chart plots: top weight when the exercise is loaded, best reps when it isn't. */
  value: number
  topWeight: number
  topReps: number
  reps: number
}

/** One exercise's progression over time — the "am I actually getting stronger" line. */
export function exerciseProgress(sessions: GymSession[], exId: string): ProgressPoint[] {
  const byDay = new Map<string, ProgressPoint>()
  for (const r of flatten(sessions)) {
    if (r.exId !== exId) continue
    const prev = byDay.get(r.day)
    const point: ProgressPoint = {
      day: r.day,
      label: shortDate(r.day),
      value: r.topWeight > 0 ? r.topWeight : r.topReps,
      topWeight: r.topWeight,
      topReps: r.topReps,
      reps: r.reps,
    }
    byDay.set(r.day, prev ? { ...point, value: Math.max(prev.value, point.value), reps: prev.reps + r.reps } : point)
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}

/** Exercises done at least once, most-recent first — the Stats picker's list. */
export function trainedExercises(sessions: GymSession[], part: BodyPart | 'all' = 'all'): { exId: string; name: string; times: number; lastDay: string }[] {
  const map = new Map<string, { exId: string; name: string; times: number; lastDay: string }>()
  for (const r of flatten(sessions, part)) {
    const cur = map.get(r.exId)
    if (cur) {
      cur.times += 1
      if (r.day > cur.lastDay) cur.lastDay = r.day
    } else {
      map.set(r.exId, { exId: r.exId, name: r.name, times: 1, lastDay: r.day })
    }
  }
  return [...map.values()].sort((a, b) => b.lastDay.localeCompare(a.lastDay) || b.times - a.times)
}

export interface GymSummary {
  sessions: number
  minutes: number
  reps: number
  coins: number
  streak: number
  bestStreak: number
  thisWeek: number
  lastSessionDaysAgo: number
  avgRating: number | null
  favourite: { name: string; times: number } | null
  toughest: { name: string; rating: string } | null
}

export function summarise(gym: GymState, today = dayKey()): GymSummary {
  const done = gym.sessions.filter((s) => s.status === 'done')
  const monday = mondayOf(today)
  const rated = done.filter((s) => s.rating)
  const counts = new Map<string, { name: string; times: number }>()
  for (const r of flatten(done)) {
    const cur = counts.get(r.exId)
    if (cur) cur.times += 1
    else counts.set(r.exId, { name: r.name, times: 1 })
  }
  const favourite = [...counts.values()].sort((a, b) => b.times - a.times)[0] ?? null
  const hated = Object.entries(gym.ex).find(([, m]) => m.rating === 'dislike' || m.rating === 'hate')

  return {
    sessions: gym.totals.sessions,
    minutes: gym.totals.minutes,
    reps: gym.totals.reps,
    coins: gym.totals.coins,
    streak: gym.streak.current,
    bestStreak: gym.streak.best,
    thisWeek: done.filter((s) => s.day >= monday).length,
    lastSessionDaysAgo: daysSince(done[done.length - 1]?.day, today),
    avgRating: rated.length ? rated.reduce((n, s) => n + (s.rating ?? 0), 0) / rated.length : null,
    favourite,
    toughest: hated ? { name: hated[0], rating: hated[1].rating! } : null,
  }
}

/** Records worth showing off: best weight or best reps per exercise, biggest first. */
export function records(gym: GymState): { exId: string; name: string; weight?: number; reps?: number; when?: string }[] {
  const names = new Map<string, string>()
  for (const s of gym.sessions) for (const e of s.exercises) names.set(e.exId, e.name)
  return Object.entries(gym.ex)
    .filter(([, m]) => (m.bestWeight ?? 0) > 0 || (m.bestReps ?? 0) > 0)
    .map(([exId, m]) => ({
      exId,
      name: names.get(exId) ?? exId,
      weight: m.bestWeight || undefined,
      reps: m.bestReps || undefined,
      when: m.lastDay,
    }))
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))
}

/** The last 28 days as a dot strip: which days had a session. Oldest first. */
export function activityDots(sessions: GymSession[], days = 28, today = dayKey()): { day: string; on: boolean; minutes: number }[] {
  const byDay = new Map(sessions.filter((s) => s.status === 'done').map((s) => [s.day, s]))
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, -(days - 1 - i))
    const s = byDay.get(day)
    return { day, on: !!s, minutes: s ? Math.round((s.activeSec ?? s.minutes * 60) / 60) : 0 }
  })
}
