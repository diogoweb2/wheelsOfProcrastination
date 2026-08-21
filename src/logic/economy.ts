// All economy rules live here. Keep in sync with BUSINESS_REQUIREMENTS.md §5.
import type { Effort, Task } from '../types'
import { daysUntil } from './dates'

export const BASE_REWARD: Record<Effort, number> = { low: 10, medium: 20, high: 35 }
export const URGENT_MULTIPLIER = 1.5
export const FIRST_OF_DAY_BONUS = 5
export const FREEZE_COST = 150
export const MAX_FREEZES = 2
export const RESPIN_CHEAP = 15
export const RESPIN_EXPENSIVE = 60
export const STREAK_GOAL_OPTIONS = [7, 14, 30, 50, 100]
/** Mystery background from the Store. SPECIAL feature — priced like a luxury, not a habit. */
export const BACKGROUND_COST = 20
export const MAX_PENDING = 3
/**
 * Berries lost when a task is left undone — a wheel pick abandoned at end of
 * day, or a must-do day skipped. Nothing is ever fined by default: a quest only
 * costs Berries if whoever wrote it explicitly gave it a `penalty`.
 */
export function abandonPenalty(task: Task): number {
  return Math.max(0, Math.floor(task.penalty ?? 0))
}

/**
 * Required (checklist) tasks pay a flat, reduced amount — there's no wheel risk
 * involved, so they can't out-earn a spin. Skipping one is free unless the quest
 * carries its own opt-in `penalty`.
 */
export const REQUIRED_REWARD: Record<Effort, number> = { low: 4, medium: 8, high: 14 }
/** Warn in the checklist once a dated requirement is this close to its last day. */
export const REQUIRED_WARN_DAYS = 3
/** Postpone options (days) offered by the last-day decision modal. */
export const POSTPONE_OPTIONS = [1, 3, 7, 14]

/** Berries paid for ticking a required item off the checklist. */
export function requiredReward(task: Task): number {
  return REQUIRED_REWARD[task.effort]
}

/**
 * Berries docked at rollover for a required item left undone that day. Zero
 * unless the quest opted into a punishment; "repeat until done" quests are
 * never fined at all — they're waiting on someone else, not being skipped.
 */
export function requiredPenalty(task: Task): number {
  if (task.untilDone) return 0
  return abandonPenalty(task)
}

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

export function respinCost(respinsToday: number, completionsToday: number): number {
  return respinsToday === 0 && completionsToday === 0 ? RESPIN_CHEAP : RESPIN_EXPENSIVE
}

/** Hitting a streak goal pays 10 🪙 per goal day — bigger ambition, visibly bigger treasure. */
export function streakGoalBonus(goal: number): number {
  return goal * 10
}

/** Reviving a freshly-dead streak: 15 🪙 per lost day, clamped so it stings but never bankrupts. */
export function streakRepairCost(deadDays: number): number {
  return Math.min(Math.max(deadDays * 15, 30), 450)
}

/**
 * A dead streak that is *on hold*: the kid asked Dad for a free freeze and Dad
 * hasn't answered yet. The app keeps showing the old number (and lets him carry
 * on playing) until the answer lands — granted revives it, declined zeroes it.
 */
export function heldStreak(
  deadStreak: { value: number; day: string } | null | undefined,
  freezeRequests: { status: string; fromId: string }[],
  profileId: string | null,
): number | null {
  if (!deadStreak || !profileId) return null
  const pending = freezeRequests.some((r) => r.status === 'pending' && r.fromId === profileId)
  return pending ? deadStreak.value : null
}

/** Days between goal-nudge prompts ("check your streak goal" modal). */
export const GOAL_PROMPT_EVERY_DAYS = 7
