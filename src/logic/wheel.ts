// Weighted-but-fair wheel selection. Rules in BUSINESS_REQUIREMENTS.md §3.
import type { Completion, EffortFilter, Task } from '../types'
import { addDays, dayKey, dayOfWeek, daysUntil, isMonthDay, isWeekend, seasonOf } from './dates'
import { isEffectivelyUrgent } from './economy'
import { QUIZ_TASK_PREFIX } from './quiz'

export interface WheelEntry {
  task: Task
  weight: number
}

/** Latest day (YYYY-MM-DD) this task was completed on or before `today`, if ever. */
export function lastDoneDay(taskId: string, completions: Completion[], today: string): string | null {
  let last: string | null = null
  for (const c of completions) {
    if (c.taskId !== taskId || c.day > today) continue
    if (!last || c.day > last) last = c.day
  }
  return last
}

/**
 * Chained quest gate: has the prerequisite been done (on or before `today`)?
 * A prerequisite that no longer exists is treated as satisfied, so deleting a
 * task can never strand the ones waiting behind it.
 */
export function isUnlockedOn(task: Task, today: string, completions: Completion[], tasks?: Task[]): boolean {
  if (!task.afterTaskId) return true
  if (tasks && !tasks.some((t) => t.id === task.afterTaskId)) return true
  return lastDoneDay(task.afterTaskId, completions, today) !== null
}

/** First day a cooling-down task is allowed back, or null if it has no cooldown / was never done. */
export function cooldownUntil(task: Task, completions: Completion[], today: string = dayKey()): string | null {
  if (!task.cooldownDays || task.cooldownDays <= 0) return null
  const last = lastDoneDay(task.id, completions, today)
  return last ? addDays(last, task.cooldownDays) : null
}

/**
 * Is the task allowed on `today`? Start date reached, day-of-week scope, its
 * prerequisite quest done, and not still cooling down from its last completion.
 * `completions` may be omitted only where the caller has already ruled those out.
 */
export function isAvailableOn(
  task: Task,
  today: string,
  completions: Completion[] = [],
  tasks?: Task[],
  opts: { ignoreCooldown?: boolean } = {},
): boolean {
  if (task.startDate && today < task.startDate) return false
  if (task.dayScope === 'weekdays' && isWeekend(today)) return false
  if (task.dayScope === 'weekends' && !isWeekend(today)) return false
  // Hand-picked days ("video games on Mon/Wed/Fri"). An empty list = no restriction.
  if (task.dayScope === 'custom' && task.weekDays?.length && !task.weekDays.includes(dayOfWeek(today))) return false
  // Hand-picked days of the month ("pay the rent on the 1st"). An empty list = no restriction.
  if (task.dayScope === 'monthdays' && task.monthDays?.length && !isMonthDay(today, task.monthDays)) return false
  // Seasonal quests ("rake the leaves"). An empty list = all year round.
  if (task.seasons?.length && !task.seasons.includes(seasonOf(today))) return false
  if (!isUnlockedOn(task, today, completions, tasks)) return false
  if (opts.ignoreCooldown) return true
  const back = cooldownUntil(task, completions, today)
  if (back && today < back) return false
  return true
}

/**
 * Is this required task actually being asked for on `today`? A requirement can
 * carry a window (`requiredFrom`…`requiredUntil`); outside it the task is
 * dormant — off the checklist, and no penalty for not doing it.
 */
export function isRequiredOn(
  task: Task,
  today: string = dayKey(),
  completions: Completion[] = [],
  tasks?: Task[],
  opts: { ignoreJustDone?: boolean } = {},
): boolean {
  if (!task.required) return false
  // Ticking a must-do can archive it (one-shots) or start its rest days ticking.
  // `ignoreJustDone` looks past both, so a task that was on the list this morning
  // is still recognised as belonging to it this evening.
  if (task.archived && !opts.ignoreJustDone) return false
  // Volunteered for today by hand: skip the window, the day scope and the cooldown.
  if (task.doTodayDay === today) return true
  if (task.requiredFrom && today < task.requiredFrom) return false
  if (task.requiredUntil && today > task.requiredUntil) return false
  return isAvailableOn(task, today, completions, tasks, { ignoreCooldown: opts.ignoreJustDone })
}

/** Every task ticked off on `day`. */
function doneOn(completions: Completion[], day: string): Set<string> {
  return new Set(completions.filter((c) => c.day === day).map((c) => c.taskId))
}

/**
 * Today's checklist: every active requirement in its window, urgent ones first.
 * Must-dos already ticked off today stay on the list until midnight — completing
 * a one-shot archives it and completing a rest-days quest sends it to sleep, and
 * neither should make the row (or its slot in the "2/3" count) vanish mid-tick.
 */
export function requiredToday(tasks: Task[], today: string = dayKey(), completions: Completion[] = []): Task[] {
  const done = doneOn(completions, today)
  return tasks
    .filter((t) => isRequiredOn(t, today, completions, tasks, { ignoreJustDone: done.has(t.id) }))
    .sort((a, b) => {
      // the closest deadline leads; undated requirements sit at the bottom
      const da = a.requiredUntil ?? '9999-12-31'
      const db = b.requiredUntil ?? '9999-12-31'
      return da.localeCompare(db) || a.name.localeCompare(b.name)
    })
}

/**
 * Is this must-do simply asked for EVERY day, or does it keep a schedule of its
 * own (certain weekdays, a day of the month, rest days, a season, a window)?
 * The checklist splits on this: a scheduled must-do is easy to miss, so it gets
 * its own section above the daily habits.
 */
export function isEveryDayRequired(task: Task): boolean {
  if (task.dayScope && task.dayScope !== 'all') return false
  if (task.cooldownDays && task.cooldownDays > 0) return false
  if (task.seasons?.length && task.seasons.length < 4) return false
  if (task.requiredFrom || task.requiredUntil || task.startDate) return false
  return true
}

/** How far back the checklist looks for a scheduled must-do that was never ticked. */
const MISSED_LOOKBACK_DAYS = 90

/**
 * The earliest day in the recent past this scheduled must-do was asked for and
 * never ticked off — or null if it's up to date, or simply due today. Walks back
 * day by day over its own schedule, no further than the day the quest was
 * created, and stops at the first occurrence that WAS done, so only the current
 * run of misses counts. Daily habits are exempt: yesterday's floss is gone, but
 * "pay the rent on the 1st" has to keep nagging until it's paid.
 */
export function missedSince(
  task: Task,
  today: string = dayKey(),
  completions: Completion[] = [],
  tasks?: Task[],
): string | null {
  if (!task.required || isEveryDayRequired(task)) return null
  // Its day is TODAY — it's due, not late. Whatever it did or didn't do on
  // earlier occurrences, the live one is the one on the checklist.
  if (isRequiredOn(task, today, completions, tasks)) return null
  const doneDays = new Set(completions.filter((c) => c.taskId === task.id).map((c) => c.day))
  const born = task.createdAt.slice(0, 10) // YYYY-MM-DD
  let earliest: string | null = null
  let day = addDays(today, -1)
  for (let i = 0; i < MISSED_LOOKBACK_DAYS; i++, day = addDays(day, -1)) {
    // Before it ever started being asked for — nothing older can be a miss.
    if (born && day < born) break
    if (task.requiredFrom && day < task.requiredFrom) break
    if (task.startDate && day < task.startDate) break
    if (!isRequiredOn(task, day, completions, tasks)) continue
    if (doneDays.has(day)) break // caught up as of this occurrence
    earliest = day
  }
  return earliest
}

/**
 * Scheduled must-dos whose day came and went unticked. They are NOT on today's
 * list by their own schedule, but they stay on the checklist (in red) until
 * they're done — that's the whole point of scheduling them.
 */
export function carriedRequired(tasks: Task[], today: string = dayKey(), completions: Completion[] = []): Task[] {
  const done = doneOn(completions, today)
  return tasks
    .filter(
      (t) =>
        t.required &&
        !t.archived &&
        !done.has(t.id) &&
        !isRequiredOn(t, today, completions, tasks) &&
        isUnlockedOn(t, today, completions, tasks) &&
        missedSince(t, today, completions, tasks) !== null,
    )
    .sort((a, b) => (missedSince(a, today, completions) ?? '').localeCompare(missedSince(b, today, completions) ?? ''))
}

/**
 * Must-dos that exist but aren't being asked for today — resting out a cooldown,
 * waiting for their window to open, or scoped to other days of the week. These
 * are the candidates for "do it today anyway". Chained quests whose prerequisite
 * is still unmet stay hidden: they aren't dormant, they don't exist yet.
 */
export function dormantRequired(tasks: Task[], today: string = dayKey(), completions: Completion[] = []): Task[] {
  const done = doneOn(completions, today)
  return tasks
    .filter(
      (t) =>
        t.required &&
        !t.archived &&
        !done.has(t.id) && // done today: it's on the checklist wearing a ✓, not dormant
        !isRequiredOn(t, today, completions, tasks) &&
        isUnlockedOn(t, today, completions, tasks) &&
        // already carried onto the checklist in red — offering it again would double it up
        missedSince(t, today, completions, tasks) === null &&
        !(t.requiredUntil && today > t.requiredUntil), // its deadline has passed — it's over, not dormant
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Why a dormant must-do isn't on today's list, in a few words for the picker. */
export function dormantReason(task: Task, today: string = dayKey(), completions: Completion[] = []): string {
  const back = cooldownUntil(task, completions, today)
  if (back && today < back) {
    const d = daysUntil(back, today)
    return d === 1 ? 'back tomorrow' : `back in ${d}d`
  }
  if (task.requiredFrom && today < task.requiredFrom) return `starts ${task.requiredFrom}`
  if (task.startDate && today < task.startDate) return `starts ${task.startDate}`
  return 'not scheduled today'
}

/** A quiz training quest — one auto-synced habit per unlocked topic. */
export function isStudyTask(task: Task): boolean {
  return task.id.startsWith(QUIZ_TASK_PREFIX)
}

/**
 * Study comes one topic at a time. While a quiz training quest sits on today's
 * plate, every OTHER topic leaves the wheel — so a single spin session can't
 * bury you under three subjects. Finishing (or re-spinning) it lifts the lock,
 * so a second topic later the same day is fair game.
 */
export function studyLockedIds(tasks: Task[], pendingIds: Iterable<string>): Set<string> {
  const pending = new Set(pendingIds)
  const locked = new Set<string>()
  const studyPending = tasks.some((t) => pending.has(t.id) && isStudyTask(t))
  if (!studyPending) return locked
  for (const t of tasks) if (isStudyTask(t) && !pending.has(t.id)) locked.add(t.id)
  return locked
}

export function eligibleTasks(
  tasks: Task[],
  filter: EffortFilter,
  completedTodayIds: Set<string>,
  today: string = dayKey(),
  completions: Completion[] = [],
): Task[] {
  return tasks.filter(
    (t) =>
      !t.archived &&
      // required items are checklist-only — unless they opted back onto the wheel
      (!t.required || t.onWheel) &&
      (filter.length === 0 || filter.includes(t.effort)) &&
      !completedTodayIds.has(t.id) &&
      isAvailableOn(t, today, completions, tasks),
  )
}

export function weightFor(task: Task, today?: string): number {
  let w = isEffectivelyUrgent(task, today) ? 3 : 1
  if (task.dueDate) {
    const d = daysUntil(task.dueDate, today)
    if (d <= 7) w *= 1 + Math.min(7, 7 - Math.max(d, 0)) / 7 // up to ×2 when due/overdue
  }
  const fairness = Math.min(4, 1 + 0.5 * task.spinsSinceLastPicked)
  return w * fairness
}

export function buildEntries(tasks: Task[], today?: string): WheelEntry[] {
  return tasks.map((task) => ({ task, weight: weightFor(task, today) }))
}

export function pickWeighted(entries: WheelEntry[]): Task {
  const total = entries.reduce((s, e) => s + e.weight, 0)
  let r = Math.random() * total
  for (const e of entries) {
    r -= e.weight
    if (r <= 0) return e.task
  }
  return entries[entries.length - 1].task
}
