// All economy rules live here. Keep in sync with BUSINESS_REQUIREMENTS.md §5.
import type { Effort, Task } from '../types'
import { daysUntil } from './dates'

export const BASE_REWARD: Record<Effort, number> = { low: 10, medium: 20, high: 35 }
export const URGENT_MULTIPLIER = 1.5
export const FIRST_OF_DAY_BONUS = 5
export const STREAK_GOAL_BONUS = 50
export const FREEZE_COST = 150
export const MAX_FREEZES = 2
export const RESPIN_CHEAP = 15
export const RESPIN_EXPENSIVE = 60
export const MANUAL_PICK_MULTIPLIER = 1.5
export const STREAK_GOAL_OPTIONS = [7, 14, 30, 50, 100]
/** Mystery background from the Store. SPECIAL feature — priced like a luxury, not a habit. */
export const BACKGROUND_COST = 500
export const MAX_PENDING = 3
/** Gems lost per pending pick abandoned at end of day (half the base reward, rounded up). */
export const ABANDON_PENALTY: Record<Effort, number> = { low: 5, medium: 10, high: 18 }

/** A task counts as urgent if flagged urgent OR due within 48h / overdue. */
export function isEffectivelyUrgent(task: Task, today?: string): boolean {
  if (task.priority === 'urgent') return true
  if (task.dueDate) return daysUntil(task.dueDate, today) <= 2
  return false
}

export function rewardFor(task: Task, isFirstOfDay: boolean, today?: string): number {
  let gems = BASE_REWARD[task.effort]
  if (isEffectivelyUrgent(task, today)) gems = Math.round(gems * URGENT_MULTIPLIER)
  if (isFirstOfDay) gems += FIRST_OF_DAY_BONUS
  return gems
}

/** Cost to hand-pick a task. Urgent = free (encouraged). Non-urgent = pay more than you'd earn. */
export function manualPickCost(task: Task, today?: string): number {
  if (isEffectivelyUrgent(task, today)) return 0
  return Math.ceil(BASE_REWARD[task.effort] * MANUAL_PICK_MULTIPLIER)
}

export function respinCost(respinsToday: number, completionsToday: number): number {
  return respinsToday === 0 && completionsToday === 0 ? RESPIN_CHEAP : RESPIN_EXPENSIVE
}
