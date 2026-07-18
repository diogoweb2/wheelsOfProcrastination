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
  devilFruits: number // 🍇 Devil Fruits — won by passing official final tests; spent on gift cards
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

// --- Quiz (Grand Line Academy) ---------------------------------------------

export type QuizQuestionType = 'choice' | 'write' | 'match' | 'order'

/** One question in the shared bank (Firestore app/quizBank). Removed questions stay, flagged, so AI regeneration can avoid repeats. */
export interface QuizQuestion {
  id: string
  topicId: string
  type: QuizQuestionType
  prompt: string
  emoji?: string // little mood-setter shown next to the prompt
  image?: string // optional illustration URL (e.g. a flag)
  choices?: string[] // choice: the options
  answer?: string // choice: the correct option
  accept?: string[] // write: accepted answers (first one is the canonical shown in reviews)
  pairs?: { left: string; right: string }[] // match: correct pairings
  sequence?: string[] // order: items in the correct order
  weight: number // 2 = core knowledge (provinces/capitals/languages), 1 = fun extras
  points: number // Berries for a first-ever correct answer in training
  funFact?: string // shown after answering in training
  status: 'active' | 'removed' | 'pending' // pending = AI-regenerated, awaiting parent review
  createdAt: string
  freshAt?: string // set when the weekly AI review adds/updates a question → "NEW" badge + training priority until seen again
}

/** Per-question training history (lives in the kid's AppData). Drives rewards, adaptive picking and test-length estimates. */
export interface QuizStat {
  seen: number
  correct: number
  wrong: number
  everCorrect: boolean // once true, later rewards are halved
  lastRewardDay: string | null // Berries at most once per question per day
  avgTimeMs: number // rolling average time to answer
  lastSeenAt?: string // ISO — clears the "NEW" badge once the question is seen after a freshAt update
}

export interface QuizTestRecord {
  id: string
  topicId: string
  day: string // YYYY-MM-DD
  official: boolean // true = parent-launched, counts for the Devil Fruit
  results: { qid: string; correct: boolean }[]
  scorePct: number
  passed: boolean // scorePct >= 80
}

export interface QuizState {
  stats: Record<string, QuizStat> // by question id
  tests: QuizTestRecord[]
  passedTopics: string[] // official pass → big checkmark + one-time Devil Fruit
  unlockedTopics: string[] // admin-managed; locked topics are visible but not playable
  bonusFruits: Record<string, number> // admin-granted extra 🍇 per topic (a log, fruits go to economy)
  selfInit?: boolean // one-time flag: this profile's own default topics were unlocked
}

export interface GiftCardPurchase {
  id: string
  itemId: string // e.g. "roblox10"
  label: string // e.g. "Roblox $10"
  cost?: number // Devil Fruits paid (older purchases may miss it)
  day: string // YYYY-MM-DD of purchase
  at: string // ISO
  paidAt: string | null // set when the admin taps "Paid" (duplicates of one item accumulate as separate rows)
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
  quiz: QuizState
  giftcards: GiftCardPurchase[]
}
