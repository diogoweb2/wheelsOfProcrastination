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
import { ALL_PARTS, daysSince, isLoaded, loggedReps } from './gym'
import { effortMix, effortRows } from './gymEffort'

/**
 * The smallest share of an exercise's effort that counts as "this trains that".
 * Below it the muscle is along for the ride, and listing the movement under it
 * is how the old parts-list filter told you push-ups were core training.
 */
const FILTER_SHARE = 0.1

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
  /**
   * reps × weight, the honest "how much work" number (reps alone when bodyweight).
   * A LOADED hold or carry is seconds × weight, and seconds are converted to
   * rep-equivalents first (6 s ≈ a rep, a cardio minute ≈ 8 — the same exchange
   * rate the session grade uses), because otherwise one 45 s farmer's carry at
   * 50 lb would outweigh an entire upper-body session on the chart.
   */
  volume: number
}

export function flatten(sessions: GymSession[], part: BodyPart | 'all' = 'all'): StatRow[] {
  const rows: StatRow[] = []
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      // "show me chest work" means work that actually LANDS on the chest, so the
      // filter reads the effort mix (§18t) rather than the parts list: a pull-up
      // is forearm work even though the catalog files it under back and arms,
      // and a push-up is not core work just because the core is listed.
      if (part !== 'all' && (effortMix(e)[part] ?? 0) < FILTER_SHARE) continue
      const reps = loggedReps(e)
      const topWeight = Math.max(0, ...e.sets.map((x) => x.weight ?? 0))
      const topReps = Math.max(...e.sets.map((x) => x.reps))
      // volume follows the same both-sides rule as `reps`, so keep it in step with loggedReps
      const sideMult = reps / Math.max(1, e.sets.reduce((n, x) => n + x.reps, 0))
      // an unloaded hold keeps counting a second as a unit, exactly as it always has
      const perUnit = isLoaded(e) ? (e.kind === 'timed' ? 1 / 6 : e.kind === 'cardio' ? 8 : 1) : 1
      const volume =
        e.sets.reduce((n, x) => n + x.reps * perUnit * (x.weight && x.weight > 0 ? x.weight : 1), 0) * sideMult
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
  /** Effort units (§18t) — what the bar is drawn from and what the list is sorted by. */
  effort: number
  /** Sets that touched this part at all. Kept as context; it is NOT the ranking. */
  sets: number
  reps: number
  pct: number
}

/**
 * Where the work went over the last `days` — ranked by EFFORT, not by sets.
 *
 * Sets were the old ranking and they were wrong (§18t): a set of push-ups
 * counted for the core exactly as hard as a set of planks, so a month of
 * pressing came out looking like core training. Every set is now split by the
 * exercise's effort mix, so the core gets the 0.15 of a push-up it actually
 * does and the 1.0 of a side plank it actually does.
 */
export function partSplit(sessions: GymSession[], days = 28, today = dayKey()): PartSlice[] {
  const cutoff = addDays(today, -days)
  const recent = sessions.filter((s) => s.day >= cutoff)
  const tally = new Map<BodyPart, { effort: number; sets: number; reps: number }>()

  for (const r of effortRows(recent)) {
    for (const [part, units] of Object.entries(r.mix)) {
      const p = part as BodyPart
      const cur = tally.get(p) ?? { effort: 0, sets: 0, reps: 0 }
      cur.effort += units
      tally.set(p, cur)
    }
  }
  // sets and reps stay whole-exercise counts — "this many sets touched your
  // core" is a true and useful sentence, it just isn't the ranking any more
  for (const s of recent) {
    for (const e of s.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      const reps = loggedReps(e)
      for (const part of Object.keys(effortMix(e)) as BodyPart[]) {
        const cur = tally.get(part)
        if (!cur) continue
        cur.sets += e.sets.length
        cur.reps += reps
      }
    }
  }

  const total = [...tally.values()].reduce((n, v) => n + v.effort, 0) || 1
  return ALL_PARTS.filter((p) => (tally.get(p)?.effort ?? 0) > 0)
    .map((p) => {
      const v = tally.get(p)!
      return {
        part: p,
        effort: Math.round(v.effort * 10) / 10,
        sets: Math.round(v.sets),
        reps: Math.round(v.reps),
        pct: (v.effort / total) * 100,
      }
    })
    .sort((a, b) => b.effort - a.effort)
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
