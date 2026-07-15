import type { AppData, BadgeAward, Task } from '../types'

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365]
export const HABIT_MILESTONES = [10, 30, 50, 100]
export const TOTAL_MILESTONES = [10, 50, 100, 250]

const STREAK_TITLES: Record<number, [string, string]> = {
  3: ['🏴‍☠️', 'Set Sail'],
  7: ['🌊', 'One Week at Sea'],
  14: ['🍖', 'Two Weeks, No Mutiny'],
  30: ['🗺️', 'Grand Line Rookie'],
  50: ['💪', 'Supernova'],
  100: ['👑', 'Warlord Status'],
  200: ['🔥', 'Emperor of the Sea'],
  365: ['👒', 'King of the Pirates'],
}

/** Returns badges newly earned given current data. Pure — caller persists. */
export function newBadges(data: AppData): BadgeAward[] {
  const have = new Set(data.badges.map((b) => b.id))
  const out: BadgeAward[] = []
  const now = new Date().toISOString()

  for (const m of STREAK_MILESTONES) {
    const id = `streak-${m}`
    if (data.streak.current >= m && !have.has(id)) {
      const [emoji, title] = STREAK_TITLES[m]
      out.push({ id, emoji, title, description: `${m}-day streak. Luffy's proud of you, nakama!`, awardedAt: now })
    }
  }

  const total = data.completions.length
  for (const m of TOTAL_MILESTONES) {
    const id = `total-${m}`
    if (total >= m && !have.has(id)) {
      out.push({ id, emoji: '⚔️', title: `${m} Quests Cleared`, description: `${m} quests conquered. A true pirate!`, awardedAt: now })
    }
  }

  const habitCounts = new Map<string, number>()
  for (const c of data.completions) habitCounts.set(c.taskId, (habitCounts.get(c.taskId) ?? 0) + 1)
  const habits = new Map<string, Task>(data.tasks.filter((t) => t.repeats).map((t) => [t.id, t]))
  for (const [taskId, count] of habitCounts) {
    const task = habits.get(taskId)
    if (!task) continue
    for (const m of HABIT_MILESTONES) {
      const id = `habit-${taskId}-${m}`
      if (count >= m && !have.has(id)) {
        out.push({ id, emoji: '🎯', title: `${m}× ${task.name}`, description: `"${task.name}" done ${m} times. It's part of your legend now!`, awardedAt: now })
      }
    }
  }
  return out
}
