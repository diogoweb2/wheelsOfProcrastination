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
  /**
   * Non-negotiables (floss, brush teeth). A required task leaves the wheel
   * entirely and lives in the daily checklist beside it: one tap = done.
   * Pays a reduced flat reward; skipping it costs the SAME amount at rollover.
   */
  required?: boolean
  /**
   * Optional window for a required task. `requiredUntil` is the hard deadline:
   * as it nears the checklist warns, and on the last day the app forces a
   * decision (do it / postpone / drop). `requiredFrom` keeps it dormant until
   * the window opens. Both YYYY-MM-DD. Absent = required every day, forever.
   */
  requiredFrom?: string
  requiredUntil?: string
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
  lastGoalPromptDay?: string // YYYY-MM-DD — the periodic "check your streak goal" nudge throttle
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
  deadStreak?: { value: number; day: string } | null // a streak that just died — offered for Berry repair until repaired/dismissed
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

// --- Ideas (shared wishlist, Firestore app/ideas) ---------------------------

/** One idea anyone in the crew wrote down. Shared by both profiles, checklist-style. */
export interface Idea {
  id: string
  text: string
  authorId: string // profile id who wrote it
  authorName: string // snapshotted so the list reads fine even if the roster changes
  done: boolean
  createdAt: string
  doneAt?: string
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
  streak?: number // consecutive correct answers; a wrong answer resets it to 0
  dueDay?: string | null // YYYY-MM-DD — training hides the question until this day (spaced repetition)
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

// --- Grand Line Bank (real CAD dollars — Ben's allowance world, admin = Diogo) ---

// Simplified to three real chests + the College/RESP one. No savings account.
export type BankAccountId = 'chequing' | 'xgro' | 'qqq' | 'college'

export interface BankTxn {
  id: string
  day: string // YYYY-MM-DD
  at: string // ISO
  type: 'allowance' | 'transfer' | 'match' | 'payback' | 'adjust' | 'crash' | 'recover'
  from?: BankAccountId | 'dad' | 'allowance'
  to?: BankAccountId | 'dad'
  amount: number // dollars
  note?: string
  ackAt?: string | null // paybacks only: set when dad taps "Got it"
}

export interface BankAccountState {
  balance: number // stored unrounded so tiny daily interest still compounds; round on display
  deposited: number // lifetime net "new money" HE put in (drives the new-money-vs-growth split)
  growth: number // lifetime market growth earned
  matched: number // college only: Dad's matched dollars currently in the chest (burned if he withdraws)
  history: { day: string; balance: number }[] // last ~30 daily snapshots for the sparkline
}

export interface BankConfig {
  weeklyAmount: number // dollars per allowance day
  payday: number // 0 = Sunday … 6 = Saturday
  xgroMonthly: number // fallback avg %/month if the live market series is unavailable
  qqqMonthly: number // fallback avg %/month if the live market series is unavailable
  respBalance: number // dad's real RESP $ (manually updated; shown on the College Chest, never his to move)
}

/**
 * Allowance he's received but hasn't placed yet. Payday drops money here; a
 * mandatory 🎉 modal makes him decide where every dollar goes (chequing counts
 * as a decision). Accumulates across weeks he forgets to open the app.
 */
export interface BankPending {
  amount: number // dollars waiting to be allocated
  weeks: number // how many paydays are stacked up
  since: string | null // first unallocated payday (YYYY-MM-DD)
}

/**
 * The Shock Test — a scripted QQQ "Market Correction" (−20% overnight).
 * First crash auto-arms ~1 month after the first QQQ deposit; after that,
 * only dad's manual crash button fires new ones. Ben must choose:
 * PANIC SELL (loss locked in forever) or HOLD THE LINE (bounces back higher).
 */
export interface BankShockState {
  scheduledDay: string | null // auto first-crash date; fires on the first day ≥ this with real QQQ money
  crashedDay: string | null // a crash happened and Ben hasn't decided yet (drives his alert modal)
  crashAmount: number // dollars wiped by the pending crash (for the alert copy)
  decision: 'hold' | 'panic' | null // last decision; 'hold' keeps recoverDay armed
  recoverDay: string | null // when the held position finishes bouncing back
  recoverTo: number // target QQQ balance on recoverDay (~6% above pre-crash) — 0 when not recovering
  bounce: { day: string; gain: number } | null // one-shot flag: recovery landed, celebrate on Ben's next visit
  crashCount: number // ≥1 unlocks dad's manual crash button
  lastCrashDay: string | null // drives the "days without a crash" counter
}

/**
 * Live market returns fetched monthly by `npm run bank:market` (Claude reads the
 * last 30 days of real XGRO/QQQ daily % moves). The sim replays them for the
 * next 30 days, looping if the next month's fetch hasn't landed. Shared across
 * the app (Firestore app/marketData), NOT per-kid. `status`/`lastError` drive
 * the admin failure banner.
 */
export interface MarketData {
  xgro: number[] // ~30 daily returns, in percent (e.g. 0.4 = +0.4%)
  qqq: number[]
  asOfDay: string // first day this series applies from (YYYY-MM-DD)
  updatedAt: string // ISO of the last successful fetch
  status: 'ok' | 'failed'
  lastError?: string
  lastAttemptDay?: string // YYYY-MM-DD of the last run (success or fail) — throttles the daily retry
}

/**
 * Trip mode — the Money Converter. Dad turns it on before a trip, picks the
 * local currency and the rate, and it expires on its own after N days so it
 * doesn't linger with a stale rate. Ben types a local amount and sees the CAD.
 * `rate` is LOCAL per 1 CAD (e.g. 1 CAD = 4.05 BRL → rate 4.05).
 */
export interface BankConverterState {
  enabled: boolean
  currency: string // ISO code, e.g. "BRL", "EUR", "USD"
  rate: number // units of `currency` per 1 CAD
  until: string | null // YYYY-MM-DD — last day it's usable; null = never enabled
  setAt: string | null // ISO — when dad last saved the rate (shown to Ben as "rate set …")
}

export interface BankState {
  config: BankConfig
  accounts: Record<BankAccountId, BankAccountState>
  pending: BankPending
  txns: BankTxn[] // newest last, capped
  lastDay: string // bank simulated through this day (YYYY-MM-DD)
  shock: BankShockState
  converter?: BankConverterState // trip-mode money converter (absent on older saves)
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

// --- Sticker album (Grand Line Log Book) -----------------------------------

/**
 * One crewmate's album. `counts` holds how many copies of each sticker they've
 * pulled — 1 = glued in the album, anything above that is a spare they can
 * trade. Trades live in the SHARED app/stickerTrades doc, not here; `trades`
 * only exists so a profile keeps a local history of settled swaps.
 */
export interface AlbumState {
  counts: Record<string, number> // sticker id → copies owned
  packsOpened: number
  lastFreePackDay: string | null // YYYY-MM-DD — the daily free pack throttle
  trades: string[] // ids of trades this profile has already seen resolved (dedupes the celebration)
}

/**
 * A swap between the two crewmates, in the shared app/stickerTrades doc so both
 * sides see it live. The sender offers spares and names the cards they want; the
 * receiver accepts or declines. Values must balance (1 red = 2 whites).
 */
export interface StickerTrade {
  id: string
  fromId: string // profile who proposed
  fromName: string
  toId: string // profile who must answer
  toName: string
  give: string[] // sticker ids the sender hands over
  want: string[] // sticker ids the sender is asking for
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  createdAt: string
  resolvedAt?: string
  note?: string // optional one-liner from the sender
}

// --- Free freezes from Dad (shared app/freezeRequests doc) ------------------

/**
 * Ben asking Dad to cover a day he couldn't be at the app (a trip, being sick).
 * Lives in the SHARED app/freezeRequests doc so Diogo sees it live and can
 * answer from the Admin desk. `status` stays 'pending' until he grants or
 * declines; a granted request records how many freezes were gifted.
 */
export interface FreezeRequest {
  id: string
  fromId: string // the kid asking
  fromName: string
  reason?: string // optional one-liner from the kid ("ski trip, no wifi")
  status: 'pending' | 'granted' | 'declined'
  createdAt: string
  resolvedAt?: string
  granted?: number // how many freezes Dad gave (only on 'granted')
}

/**
 * A gift Dad handed out — the kid's side reads the newest unseen one and shows
 * the celebration ("Dad gave you a free freeze!" + his custom note). Dad can
 * gift with no request at all, so these are not tied to a FreezeRequest.
 */
export interface FreezeGift {
  id: string
  toId: string // the kid receiving
  fromName: string // "Dad" — whoever granted it
  count: number // how many freezes gifted
  message: string // Dad's custom message, shown verbatim to the kid
  revived: number | null // the streak value brought back to life, if any
  createdAt: string
  seenAt?: string // set once the kid's app has shown the celebration
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
  bank: BankState
  album: AlbumState
}
