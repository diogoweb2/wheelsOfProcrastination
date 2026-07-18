export type Effort = 'low' | 'medium' | 'high'
export type Priority = 'urgent' | 'normal' // both are "important"; unimportant tasks don't exist here
export type EffortFilter = Effort[] // selected efforts; empty = all
export type DayScope = 'all' | 'weekdays' | 'weekends' // which days a task is allowed on the wheel

export interface Task {
  id: string
  name: string
  repeats: boolean
  effort: Effort
  priority: Priority
  dueDate?: string // YYYY-MM-DD
  startDate?: string // YYYY-MM-DD; task stays off the wheel until this day arrives
  dayScope: DayScope // restrict the task to weekdays / weekends / all days
  createdAt: string // ISO
  archived: boolean // non-repeating tasks get archived once done
  spinsSinceLastPicked: number // fairness counter
  timesPicked: number
}

export interface Completion {
  id: string
  taskId: string
  taskName: string // denormalized so map survives task deletion
  effort: Effort
  wasUrgent: boolean
  day: string // YYYY-MM-DD local
  at: string // ISO
  gemsEarned: number
  via: 'wheel' | 'manual'
}

export interface FrozenDay {
  day: string
}

export interface BadgeAward {
  id: string // badge definition id (e.g. streak-7, habit-<taskId>-10)
  title: string
  emoji: string
  description: string
  awardedAt: string
}

export interface Settings {
  reminderHour: number // 0-23
  soundOn: boolean
  streakGoal: number
  goalsReached: number[] // list of streak goals already rewarded
}

export interface Profile {
  id: string
  name: string
  emoji: string
  pinHash: string | null // SHA-256(salt:pin); null until this profile picks a code
  pinSalt: string
}

export interface EconomyState {
  gems: number
  freezes: number // stocked streak freezes, max 2
  totalGemsEarned: number
}

export interface StreakState {
  current: number
  best: number
  lastCompletionDay: string | null // YYYY-MM-DD
  lastRolloverDay: string | null // last day we processed rollover up to
}

export interface PendingPick {
  taskId: string
  via: 'wheel' | 'manual'
}

export interface DailyState {
  day: string // which day these counters belong to
  completionsToday: number
  respinsToday: number
  pendingPicks: PendingPick[] // newest first; each unfinished one is penalized at rollover
}

export interface BackgroundsState {
  owned: string[] // catalog filenames (e.g. "bg7.jpg")
  active: string | null // equipped background; null = default solid color
}

export interface AppData {
  tasks: Task[]
  completions: Completion[]
  frozenDays: FrozenDay[]
  badges: BadgeAward[]
  settings: Settings
  economy: EconomyState
  streak: StreakState
  daily: DailyState
  backgrounds: BackgroundsState
}
