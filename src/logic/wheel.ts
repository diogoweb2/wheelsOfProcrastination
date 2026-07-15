// Weighted-but-fair wheel selection. Rules in BUSINESS_REQUIREMENTS.md §3.
import type { EffortFilter, Task } from '../types'
import { dayKey, daysUntil, isWeekend } from './dates'
import { isEffectivelyUrgent } from './economy'

export interface WheelEntry {
  task: Task
  weight: number
}

/** Is the task allowed on the wheel on `today` (start date reached + day-of-week scope)? */
export function isAvailableOn(task: Task, today: string): boolean {
  if (task.startDate && today < task.startDate) return false
  if (task.dayScope === 'weekdays' && isWeekend(today)) return false
  if (task.dayScope === 'weekends' && !isWeekend(today)) return false
  return true
}

export function eligibleTasks(
  tasks: Task[],
  filter: EffortFilter,
  completedTodayIds: Set<string>,
  today: string = dayKey(),
): Task[] {
  return tasks.filter(
    (t) =>
      !t.archived &&
      (filter === 'all' || t.effort === filter) &&
      !completedTodayIds.has(t.id) &&
      isAvailableOn(t, today),
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
