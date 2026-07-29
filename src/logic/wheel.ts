// Weighted-but-fair wheel selection. Rules in BUSINESS_REQUIREMENTS.md §3.
import type { Completion, EffortFilter, Task } from '../types'
import { addDays, dayKey, daysUntil, isWeekend } from './dates'
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
export function isAvailableOn(task: Task, today: string, completions: Completion[] = [], tasks?: Task[]): boolean {
  if (task.startDate && today < task.startDate) return false
  if (task.dayScope === 'weekdays' && isWeekend(today)) return false
  if (task.dayScope === 'weekends' && !isWeekend(today)) return false
  if (!isUnlockedOn(task, today, completions, tasks)) return false
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
): boolean {
  if (!task.required || task.archived) return false
  if (task.requiredFrom && today < task.requiredFrom) return false
  if (task.requiredUntil && today > task.requiredUntil) return false
  return isAvailableOn(task, today, completions, tasks)
}

/** Today's checklist: every active requirement in its window, urgent ones first. */
export function requiredToday(tasks: Task[], today: string = dayKey(), completions: Completion[] = []): Task[] {
  return tasks
    .filter((t) => isRequiredOn(t, today, completions, tasks))
    .sort((a, b) => {
      // the closest deadline leads; undated requirements sit at the bottom
      const da = a.requiredUntil ?? '9999-12-31'
      const db = b.requiredUntil ?? '9999-12-31'
      return da.localeCompare(db) || a.name.localeCompare(b.name)
    })
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
      // required items are checklist-only — they never take a wheel segment
      !t.required &&
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
