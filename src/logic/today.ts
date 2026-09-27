// The Today card: which ONE task the app asks for today, and why. Rules in
// BUSINESS_REQUIREMENTS.md §2b.
//
// This is the wheel's opposite number and it is deliberately boring. The wheel
// is random, and random means risk: you can be handed the two-hour job on the
// evening you have twenty minutes, and the only way out costs Berries. This
// picks the same task for the same day every time you open the app, ranks it by
// reasons you can read in one line, and never surprises you.
//
// Nothing in here fines anybody, and nothing in here shows a list.
import type { Completion, Task, WeekPlan } from '../types'
import { addDays, dayKey, dayOfWeek, daysUntil } from './dates'
import { isEffectivelyUrgent } from './economy'
import { isAvailableOn, isStudyTask, lastDoneDay } from './wheel'

/** A pick, with the one line that explains it. */
export interface TodayPick {
  task: Task
  /** Short, lowercase, and true — printed under the name on the card. */
  reason: string
  /** Rank score. Higher wins; only used to order candidates. */
  score: number
}

/** How many "not today"s a day is allowed before the card stops offering more. */
export const MAX_PASSES = 2

/**
 * How many quests a week's shortlist may hold (§2c). Five, because a list of
 * eight is the list that stopped getting opened — and because five ranked
 * things beat ten unranked ones.
 */
export const WEEK_PICK_MAX = 5

/** The Monday (YYYY-MM-DD) of the week `day` falls in. */
export function weekOf(day: string = dayKey()): string {
  return addDays(day, -((dayOfWeek(day) + 6) % 7))
}

/** Is this plan the one for `day`'s week? A stale plan is no plan at all. */
export function planIsCurrent(plan: WeekPlan | undefined, day: string = dayKey()): boolean {
  return !!plan && plan.weekOf === weekOf(day)
}

/**
 * Everything the Today card is allowed to ask for: active, available today,
 * not already done today. Must-do and wheel-only stop meaning anything here —
 * there is no checklist and no wheel, so the distinction has nowhere to land.
 *
 * Study quests are left out on purpose: the Academy asks for those itself, and
 * "do a quiz" is not what this card is for.
 */
export function todayCandidates(
  tasks: Task[],
  completions: Completion[],
  today: string = dayKey(),
): Task[] {
  const doneToday = new Set(completions.filter((c) => c.day === today).map((c) => c.taskId))
  return tasks.filter(
    (t) => !t.archived && !isStudyTask(t) && !doneToday.has(t.id) && isAvailableOn(t, today, completions, tasks),
  )
}

/**
 * Rank one candidate. The score is never shown; the reason is, and the reason
 * is whichever clause won, so the card can always answer "why this one?".
 *
 * The order of the clauses IS the priority:
 *   1. overdue          — a date that has already passed
 *   2. due soon         — a date inside a week
 *   3. this week's pick — you chose it on Sunday (§2c)
 *   4. urgent           — flagged important+urgent when it was written down
 *   5. waiting longest  — nothing else to go on, so the oldest thing wins
 */
export function rankTask(task: Task, completions: Completion[], plan: WeekPlan | undefined, today: string): TodayPick {
  const planned = planIsCurrent(plan, today) && plan!.taskIds.includes(task.id)
  const planRank = planned ? plan!.taskIds.indexOf(task.id) : -1

  // How long it has been sitting there: since the last time it was done for a
  // habit, since it was written down for everything else.
  const since = lastDoneDay(task.id, completions, today) ?? task.createdAt.slice(0, 10)
  const waiting = Math.max(0, -daysUntil(since, today))

  let score = 0
  let reason = ''

  if (task.dueDate) {
    const d = daysUntil(task.dueDate, today)
    if (d < 0) {
      score = 1000 - d // the more overdue, the higher
      reason = `${-d} ${-d === 1 ? 'day' : 'days'} past its date`
    } else if (d === 0) {
      score = 900
      reason = 'due today'
    } else if (d <= 7) {
      score = 800 - d
      reason = d === 1 ? 'due tomorrow' : `due in ${d} days`
    }
  }

  if (!reason && planned) {
    score = 700 - planRank
    reason = 'you picked this for the week'
  }

  if (!reason && isEffectivelyUrgent(task, today)) {
    score = 600 + Math.min(waiting, 90)
    reason = waiting > 0 ? `urgent · waiting ${waiting} ${waiting === 1 ? 'day' : 'days'}` : 'urgent'
  }

  if (!reason) {
    score = Math.min(waiting, 365)
    reason = waiting > 0 ? `waiting ${waiting} ${waiting === 1 ? 'day' : 'days'}` : 'new today'
  }

  // A week's pick always outranks anything that isn't dated — you said this
  // one, on Sunday, with a clear head. It never jumps an overdue date.
  if (planned && score < 700) score += 250

  return { task, reason, score }
}

/**
 * The whole ranked shortlist for today, best first. `passed` are the ids waved
 * off with "not today"; they drop to the bottom rather than vanishing, so the
 * card still has something to show on a day everything was passed.
 */
export function rankToday(
  tasks: Task[],
  completions: Completion[],
  plan: WeekPlan | undefined,
  today: string = dayKey(),
  passed: string[] = [],
): TodayPick[] {
  const skip = new Set(passed)
  return todayCandidates(tasks, completions, today)
    .map((t) => rankTask(t, completions, plan, today))
    .sort((a, b) => {
      const pa = skip.has(a.task.id) ? 1 : 0
      const pb = skip.has(b.task.id) ? 1 : 0
      // passed-over tasks sink; ties break on the name so the order never wobbles
      return pa - pb || b.score - a.score || a.task.name.localeCompare(b.task.name)
    })
}

/** Today's task, or null when there is genuinely nothing to ask for. */
export function pickToday(
  tasks: Task[],
  completions: Completion[],
  plan: WeekPlan | undefined,
  today: string = dayKey(),
  passed: string[] = [],
): TodayPick | null {
  return rankToday(tasks, completions, plan, today, passed)[0] ?? null
}

/**
 * The backlog, for the one screen that is allowed to show a list: everything
 * active that isn't being asked for today, ranked the same way. Study quests
 * stay out of it for the same reason as above.
 */
export function backlog(tasks: Task[], completions: Completion[], today: string = dayKey()): TodayPick[] {
  return tasks
    .filter((t) => !t.archived && !isStudyTask(t))
    .map((t) => rankTask(t, completions, undefined, today))
    .sort((a, b) => b.score - a.score || a.task.name.localeCompare(b.task.name))
}
