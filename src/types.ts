// Type-only, so it is erased at build time and no import cycle survives into the
// bundle (cardGame → album → types). The duel RULES live in logic/cardGame.ts;
// only the stored shapes belong here.
import type { DuelState } from './logic/cardGame'
import type { BoardKind as BoardGameKind, BoardState } from './logic/boardGames'
import type { SeaState } from './logic/seaBattle'
import type { OptcgDeck, OptcgState } from './logic/optcg'

export type { BoardGameKind }

export type Effort = 'low' | 'medium' | 'high'
export type Priority = 'urgent' | 'normal' // both are "important"; unimportant tasks don't exist here
export type EffortFilter = Effort[] // selected efforts; empty = all
export type Season = 'winter' | 'spring' | 'summer' | 'fall'
export type DayScope ='all' | 'weekdays' | 'weekends' | 'custom' | 'monthdays' // which days a task is allowed on the wheel / checklist

export interface Task {
  id: string
  name: string
  repeats: boolean
  /**
   * "Repeat until done" — only read when `repeats` is true. The quest keeps
   * coming back every day like a habit, but the FIRST tick retires it for good,
   * and a day without it costs nothing. For jobs that wait on somebody else
   * ("ask Dad if the form went in"): you can't fail them, you just aren't done yet.
   */
  untilDone?: boolean
  effort: Effort
  priority: Priority
  dueDate?: string // YYYY-MM-DD
  startDate?: string // YYYY-MM-DD; task stays off the wheel until this day arrives
  dayScope: DayScope // restrict the task to weekdays / weekends / all days / hand-picked days
  /**
   * Hand-picked days of the week, only read when `dayScope === 'custom'`:
   * 0 = Sunday … 6 = Saturday (e.g. [1,3,5] = Mon/Wed/Fri). An empty or missing
   * list means the scope says nothing, so the task is allowed on any day.
   */
  weekDays?: number[]
  /**
   * Hand-picked days of the MONTH, only read when `dayScope === 'monthdays'`:
   * 1–31 (e.g. [11] = the 11th of every month, [1,15] = twice a month). A day
   * past the end of a short month lands on that month's last day, so 31 still
   * fires in February. Empty / missing = the scope says nothing, any day goes.
   */
  monthDays?: number[]
  createdAt: string // ISO
  archived: boolean // non-repeating tasks get archived once done
  spinsSinceLastPicked: number // fairness counter
  timesPicked: number
  /**
   * Non-negotiables (floss, brush teeth). A required task leaves the wheel
   * entirely and lives in the daily checklist beside it: one tap = done.
   * Pays a reduced flat reward; skipping it is free unless `penalty` is set.
   */
  required?: boolean
  /**
   * Opt-in fine, in Berries. Absent / 0 = missing this quest costs NOTHING —
   * that's the default for every quest. Set it per quest ("Add punishment?" in
   * the form) and the amount is docked at rollover for a must-do day left
   * undone, or for a wheel pick promised and abandoned.
   */
  penalty?: number
  /**
   * Optional window for a required task. `requiredUntil` is the hard deadline:
   * as it nears the checklist warns, and on the last day the app forces a
   * decision (do it / postpone / drop). `requiredFrom` keeps it dormant until
   * the window opens. Both YYYY-MM-DD. Absent = required every day, forever.
   */
  requiredFrom?: string
  requiredUntil?: string
  /**
   * A must-do that ALSO wants a wheel segment. Normally `required` pulls a task
   * off the wheel entirely (checklist only); with this on it lives in both, so
   * the wheel can still land on it and pay the full reward.
   */
  onWheel?: boolean
  /**
   * Chained quest: stays completely hidden (wheel AND must-do checklist) until
   * the task with this id has been completed at least once. A dangling id (the
   * prerequisite was deleted) unlocks it, so a chain can never get stuck.
   */
  afterTaskId?: string
  /**
   * Cooldown for a repeating task: once done, it disappears for this many days.
   * "Cut the grass" with 15 comes back on the 15th day after the last time it
   * was ticked off. Absent / 0 = available again the next day, as before.
   */
  cooldownDays?: number
  /**
   * "Do it today anyway" (YYYY-MM-DD). A must-do that is dormant today — still
   * resting out its cooldown, outside its required window, or on the wrong day
   * of the week — can be pulled onto today's checklist by hand. It only counts
   * for that one day, and skipping it costs nothing (it was volunteered, not
   * demanded). Ticking it off restarts the cooldown from today, so a 7-day
   * chore done 3 days early is next due 7 days from now, not 4.
   */
  doTodayDay?: string
  /**
   * "Delay" decision on a must-do (YYYY-MM-DD). The quest is off the checklist,
   * off the late list and free of the miss fine until this day arrives — then it
   * comes back exactly as late as it was. Set from today + N days.
   */
  delayedUntil?: string
  /**
   * "Won't do it" decision on a must-do (YYYY-MM-DD): every occurrence up to and
   * including this day is written off, so the red carry stops nagging. A
   * repeating quest still comes back on its NEXT scheduled day — the waiver
   * settles the past, not the future. A one-shot is archived outright.
   */
  waivedThrough?: string
  /**
   * Auto-split quest ("cut the trees" → 6 sessions). Every part of one split
   * shares a `seriesId` and knows its place (`seriesPart` of `seriesTotal`).
   * Parts are chained through `afterTaskId`, so only the next one is ever live.
   * Finishing early drops every part that hasn't been done yet.
   */
  seriesId?: string
  seriesPart?: number
  seriesTotal?: number
  /**
   * Free-text categories for this quest ("Basement", "Computer"). Several per
   * quest — the quest log can group by category so you can knock out a whole
   * batch of the same kind at once. Absent / empty = uncategorized.
   */
  categories?: string[]
  /**
   * Seasons this quest is allowed in ("mow the lawn" → spring/summer/fall).
   * Multi-select and orthogonal to `dayScope`, so "every day, but only in
   * summer" works. Absent / empty = all year round.
   */
  seasons?: Season[]
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
  /** Home-screen icon order (app ids). Unknown/new apps append at the end. */
  homeOrder?: string[]
  /**
   * Training-hall matches (card game vs the AI) allowed per day. Set by the
   * captain in the Parent app; undefined means SOLO_PLAY_LIMIT_DEFAULT.
   */
  soloDuelLimit?: number
  /**
   * Seconds each player gets to make ONE move, set by the captain in the Parent
   * app. Two dials, because a board move and a card turn are not the same size
   * of decision. `0` switches the clock off; undefined means the default
   * (BOARD_MOVE_SECONDS / DUEL_MOVE_SECONDS).
   */
  boardMoveSeconds?: number
  duelMoveSeconds?: number
}

/** One device registered for web push, so a closed app can still be reached. */
export interface PushToken {
  token: string // the FCM registration token
  label: string // rough device hint (e.g. "iPhone"), just for the settings list
  addedAt: string // ISO
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
  lessonId?: string // deep-dive explanation offered after a wrong answer (see src/quiz/lessons.ts)
}

// --- Lessons (the "I got it wrong, teach me properly" layer) -----------------
// Lessons live in CODE, not in the Firestore bank: they're long, they're shared
// by several questions, and the whole bank is one Firestore document with a 1MB
// ceiling. Questions point at one with `lessonId`.

/** A callout's flavour — drives the icon + colour of the block. */
export type LessonNote = 'imagine' | 'react' | 'warn' | 'key'

/** One box in a flow diagram. */
export interface LessonFlowStep {
  emoji?: string
  label: string
  sub?: string
  tone?: 'accent' | 'muted' | 'danger'
}

/** One column of a side-by-side comparison. */
export interface LessonPane {
  title: string
  emoji?: string
  tone?: 'good' | 'bad' | 'neutral'
  items: string[]
}

/**
 * A block of lesson content. Text fields support a tiny inline syntax:
 * `**bold**` and `` `code` ``.
 */
export type LessonBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string } // section heading
  | { kind: 'note'; note: LessonNote; text: string } // "Imagine that…" / React bridge / gotcha / takeaway
  | { kind: 'flow'; steps: LessonFlowStep[]; loop?: string; caption?: string } // boxes joined by arrows
  | { kind: 'compare'; left: LessonPane; right: LessonPane; caption?: string }
  | { kind: 'stack'; layers: { label: string; sub?: string }[]; caption?: string } // layered architecture
  | { kind: 'bars'; items: { label: string; pct: number; note?: string }[]; caption?: string }
  | { kind: 'code'; code: string; caption?: string }
  | { kind: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }

export interface QuizLesson {
  id: string
  title: string
  emoji: string
  minutes: number // honest reading estimate, shown up front
  blocks: LessonBlock[]
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
  /** The warm-up round on already-conquered topics that gates this test. Pass mark 70%; `topicId` is the test it guards. */
  review?: boolean
  results: { qid: string; correct: boolean }[]
  scorePct: number
  passed: boolean // scorePct >= 80 (>= 70 on a review round)
}

/**
 * The Question of the Day. One review question, resurfaced when the app opens,
 * drawn ONLY from topics the profile has already trained (keeps old material
 * fresh, favouring the old + hard ones). Answer it to win Berries or lose some;
 * "do it later" parks it on the Spin screen. Ignoring it all day costs Berries
 * at rollover. Regenerated each local day.
 */
export interface DailyQuiz {
  day: string // YYYY-MM-DD this question belongs to
  qid: string // the chosen question in the shared bank
  state: 'unseen' | 'later' | 'done' // unseen = auto-opens; later = parked on the Spin card; done = answered
  answeredCorrect?: boolean // once done, whether they nailed it
}

export interface QuizState {
  stats: Record<string, QuizStat> // by question id
  tests: QuizTestRecord[]
  passedTopics: string[] // official pass → big checkmark + one-time Devil Fruit
  unlockedTopics: string[] // admin-managed; locked topics are visible but not playable
  bonusFruits: Record<string, number> // admin-granted extra 🍇 per topic (a log, fruits go to economy)
  selfInit?: boolean // legacy one-time flag: this profile's own default topics were unlocked
  autoUnlocked?: string[] // every topic the ladder has ever auto-opened — so a re-locked topic stays locked
  daily?: DailyQuiz // the Question of the Day (absent until the profile has trained something)
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
  // lifetime compounded return of the chest itself (1 = flat, 1.1 = +10%). Cash
  // moving in or out never touches it, so "this pocket paid you 10%" stays true
  // even after he empties it.
  returnFactor: number
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

// --- Roblox bank (§20) -----------------------------------------------------

/**
 * One movement of Roblox screen time, in minutes. Positive = time going IN
 * (bought in the shop, granted by Dad, an official Roblox top-up); negative =
 * time actually played, paid back off the balance.
 */
export interface RobloxEntry {
  id: string
  minutes: number // + earned, - played
  kind: 'buy' | 'grant' | 'official' | 'play'
  note: string // shown verbatim: "Roblox 1 hour", Dad's reason, "Played 45 min"
  by: string // who put the row there ("Dad", "Ben")
  day: string // YYYY-MM-DD
  at: string // ISO
  seenAt?: string // set once Ben's app has shown the "Dad added time" banner
}

/** The whole Roblox bank: a balance in minutes and every movement behind it. */
export interface RobloxState {
  /** Minutes banked and not yet played. Never negative. */
  minutes: number
  /** Newest last. Capped at ROBLOX_LOG_CAP rows. */
  entries: RobloxEntry[]
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
  /** Unopened packs won in a trade — they wait on the Packs tab for their own ceremony. */
  packCredits: number
}

/**
 * A swap between the two crewmates, in the shared app/stickerTrades doc so both
 * sides see it live. The proposer offers spares — and, when they have no spare
 * the other side needs, Berries and/or today's unopened free pack — and names
 * the cards they want back.
 *
 * Card-for-card offers must still balance (1 red = 2 whites). The moment
 * Berries are on the table there is no fair-value gate: the haggle settles the
 * price. Either side can counter with a different Berry amount, which flips
 * `turn` and bumps `round`, and it stays pending until somebody shakes on it or
 * walks away without a counter.
 */
export interface StickerTrade {
  id: string
  fromId: string // profile who proposed
  fromName: string
  toId: string // profile who must answer first
  toName: string
  give: string[] // sticker ids the proposer hands over
  want: string[] // sticker ids the proposer is asking for
  /** Berries the proposer throws in on top of `give`. Rewritten by every counter. */
  giveGems?: number
  /** The proposer also hands over today's unopened free pack (lands as a pack credit). */
  givePack?: boolean
  /** Whose answer the offer is waiting on: 'to' = the addressee, 'from' = the proposer (after a counter). */
  turn?: 'to' | 'from'
  /** Haggle round — 0 on the original offer, +1 per counter. Wakes the push notification up again. */
  round?: number
  /** Every Berry amount asked for so far, oldest first — the haggle printed on the offer card. */
  haggle?: { byId: string; byName: string; gems: number; at: string }[]
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  createdAt: string
  resolvedAt?: string
  note?: string // optional one-liner from the sender
}

// --- Davy Back Duel (the card game played with album cards) -----------------

/** One crewmate's duel record and the team they take into battle. */
export interface DuelStats {
  wins: number
  losses: number
  /** Their saved line-up (sticker ids, front line first); empty until they build one. */
  deck: string[]
  /** Solo wins are only paid for the first few each day — this is the day they count for. */
  soloDay: string | null // YYYY-MM-DD
  soloWins: number
  /** Training-hall matches STARTED on soloDay, capped by settings.soloDuelLimit. */
  soloPlays: number
  /** Duel ids already counted into wins/losses, so a re-sync can't double-count them. */
  settled: string[]
}

/**
 * A head-to-head match, in the SHARED app/cardDuels doc so both phones watch the
 * same board. `state` is the whole position: whoever's turn it is writes the
 * next one back, which is safe precisely because only one side may move at a
 * time. Solo matches never touch this — they live in React state.
 */
export interface CardDuel {
  id: string
  fromId: string // who challenged
  fromName: string
  fromEmoji: string
  fromDeck: string[]
  toId: string // who must answer
  toName: string
  toEmoji: string
  toDeck: string[] // empty until they accept with their own line-up
  status: 'pending' | 'active' | 'finished' | 'declined' | 'cancelled'
  state: DuelState | null // null while the challenge is still pending
  createdAt: string
  resolvedAt?: string
  winnerId?: string
  /** Set once the winner's Berries have been paid, so a re-render can't pay twice. */
  paidAt?: string
  /**
   * The move clock this match is played on, stamped from the challenger's
   * settings when the call goes out. On the match rather than read live from
   * settings so the two phones can never disagree mid-duel — and so changing
   * the dial never moves the goalposts on a game already in progress. `0` is a
   * match with no clock; undefined is one dealt before clocks existed.
   */
  moveSeconds?: number
}

// --- Board games (Chess & Checkers, the 🎮 Games folder) --------------------

/**
 * One head-to-head board game, in the SHARED app/boardGames doc so both phones
 * watch the same position. Exactly the arrangement the card duel uses, and safe
 * for the same reason: only one side may legally move at a time, so whoever's
 * turn it is writes the next position back and last-write-wins can never lose a
 * move. The challenger always plays the light pieces (`'w'`), which in chess is
 * also who moves first.
 */
export interface BoardMatch {
  id: string
  kind: BoardGameKind
  fromId: string // who challenged — plays 'w'
  fromName: string
  fromEmoji: string
  toId: string // who must answer — plays 'b'
  toName: string
  toEmoji: string
  status: 'pending' | 'active' | 'finished' | 'declined' | 'cancelled'
  state: BoardState | null // null while the challenge is still pending
  createdAt: string
  resolvedAt?: string
  winnerId?: string // absent on a draw — see `draw`
  draw?: boolean
  /** Set once each side has banked its own result, so a re-sync can't pay twice. */
  paidAt?: string
  /** The move clock, stamped at challenge time — see `CardDuel.moveSeconds`. */
  moveSeconds?: number
}

/** One crewmate's record in one board game. */
export interface BoardGameStats {
  wins: number
  losses: number
  draws: number
}

export interface BoardGamesState {
  chess: BoardGameStats
  checkers: BoardGameStats
  /** Sea Battle, head-to-head only. It cannot draw, so `draws` stays 0. */
  seabattle: BoardGameStats
  /** Match ids already counted into the record, so a re-sync can't double-count. */
  settled: string[]
  /** Sea Battle match ids already counted — its own list, since it's its own doc. */
  seaSettled: string[]
  /** Day (YYYY-MM-DD) the Sea Battle AI wins below were banked on. */
  seaDay: string | null
  /** Wins over the AI on `seaDay` — only the first few pay (see SEA_SOLO_REWARD_LIMIT). */
  seaWins: number
  /** Coaching highlights (legal moves, danger rings, piece labels). On by default. */
  hints: boolean
}

// --- Sea Battle (the 🚢 app, inside the 🎮 Games folder) ---------------------

/**
 * One head-to-head Sea Battle, in the SHARED app/seaBattles doc. Same
 * single-writer arrangement as the board games — only the side whose turn it is
 * writes — with one extra twist for the setup phase: the CHALLENGER's fleet is
 * already in `state` when the challenge goes out, and the accepter's is written
 * in the same breath as the accept. So there is never a moment where both
 * phones are laying ships into the same document.
 *
 * The doc physically holds both fleets; the UI simply never renders one that
 * hasn't sunk. Same trade the card duel makes with a player's hand.
 */
export interface SeaMatch {
  id: string
  fromId: string // who challenged — fires first
  fromName: string
  fromEmoji: string
  toId: string // who must answer
  toName: string
  toEmoji: string
  status: 'pending' | 'active' | 'finished' | 'declined' | 'cancelled'
  /** Never null: the challenger's fleet is dealt at challenge time. */
  state: SeaState
  createdAt: string
  resolvedAt?: string
  winnerId?: string
  /** Set once each side has banked its own result, so a re-sync can't pay twice. */
  paidAt?: string
  /** The shot clock, stamped at challenge time — see `CardDuel.moveSeconds`. */
  moveSeconds?: number
}

// --- One Piece TCG (the 🏴‍☠️ app, inside the 🎮 Games folder) ----------------

/** A crewmate's decks and their record in the real card game. */
export interface OptcgProfileState {
  /** Decks built in the deckbuilder. The two starter decks are always offered. */
  decks: OptcgDeck[]
  /** Deck id taken into the next match — a preset id, or a built deck's id. */
  activeDeck: string
  wins: number
  losses: number
  /** Live match ids already counted into the record, so a re-sync can't double-count. */
  settled: string[]
  /** Day (YYYY-MM-DD) the AI wins below were banked on. */
  soloDay: string | null
  /** Wins over the AI on `soloDay` — only the first few pay. */
  soloWins: number
}

/**
 * One head-to-head One Piece TCG game, in the SHARED app/optcgMatches doc.
 * Same single-writer arrangement as the board games: whoever the position says
 * must act is the only side that writes, so two phones never hold the pen.
 *
 * The document holds both hands, both decks and both Life stacks — the UI
 * simply never renders the other side's. Exactly the trade Sea Battle and the
 * card duel make, for the same reason: real hidden information would need the
 * state split server-side, and this is a two-person family app.
 */
export interface OptcgMatch {
  id: string
  fromId: string // who challenged — takes the first turn
  fromName: string
  fromEmoji: string
  toId: string
  toName: string
  toEmoji: string
  status: 'pending' | 'active' | 'finished' | 'declined' | 'cancelled'
  /** Dealt at challenge time: both decks are known, so both sides can be set up. */
  state: OptcgState
  createdAt: string
  resolvedAt?: string
  winnerId?: string
  /** Set once each side has banked its own result, so a re-sync can't pay twice. */
  paidAt?: string
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
  seenAt?: string // set once the kid's app has shown the answer (only needed for 'declined')
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

// --- Remote final tests (shared app/finalTests doc) -------------------------

/**
 * Diogo authorising ONE official final test to run on Ben's own device, with a
 * grown-up sitting next to him instead of Dad. Lives in the SHARED
 * app/finalTests doc so both sides see it live.
 *
 * The `pin` is never shown to Ben: he taps Start, hands the phone to the
 * grown-up, who reads `note` and types the code. That's the invigilator.
 *
 * Exactly ONE attempt: the moment the test opens the row flips to 'started',
 * so closing the app can't buy a second run. It ends 'done' (with the score) or
 * 'abandoned' (he walked out mid-test) — either way Diogo gets told.
 */
export interface FinalTestAuth {
  id: string
  targetId: string // whose device runs it (Ben)
  topicId: string
  pin: string // 4 digits, shown ONLY on the admin desk
  note: string // message for the grown-up ("Ben has 15 min, no phone")
  fromName: string // who authorised it
  createdAt: string
  status: 'pending' | 'started' | 'done' | 'abandoned' | 'cancelled'
  postponed?: boolean // he chose "later"; the top banner nags until he starts
  startedAt?: string
  finishedAt?: string
  scorePct?: number // on 'done'
  passed?: boolean // on 'done'
  /** He fell under 70% on the warm-up review round, so the new topic was never opened. */
  reviewFailed?: boolean
  /** Per-topic tally of the failed warm-up (weakest first) — what he has to study again. */
  reviewBreakdown?: { topicId: string; right: number; total: number }[]
  unlockedTopicId?: string // the topic his pass opened, if any
  ackAt?: string // Diogo dismissed the result banner
}

// --- Gym ("Training Deck", the 💪 Gym app) ---------------------------------
// Two halves. The CATALOG (what exists in the basement: gear + the exercises it
// makes possible) is SHARED — one basement, one doc: `app/gymCatalog`. The
// MEMORY (what you like, what you lift, how long you actually rest) is personal
// and lives in each profile's AppData under `gym`.
//
// The memory is deliberately small and permanent; the raw session log is capped.
// That split is the point: once `gym.ex` is full enough, the local planner in
// src/logic/gym.ts builds good sessions with no AI call at all.

/**
 * The groups an exercise can be filed under. `forearms` (grip and wrist work)
 * and `power` (jumps, throws, swings — the pickleball block) are not muscles in
 * the same sense as the rest, but they are how the catalog is actually
 * organised, so they get their own slot rather than being hidden inside `arms`
 * and `legs`.
 */
export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'forearms'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'fullBody'
  | 'power'
  | 'cardio'

/** How a set is measured — decides what the runner asks you to type. */
export type ExerciseKind = 'weight' | 'bodyweight' | 'timed' | 'cardio'

/** One machine / bar / band in the basement. Written by `npm run gym:equipment`, editable by hand. */
export interface Equipment {
  id: string
  name: string
  emoji: string
  img?: string // thumbnail in public/gym/, written by the photo script
  notes?: string // "adjustable 5–25 lb", "resistance bands: light/medium/heavy" — the coach reads this
  addedBy: 'ai' | 'manual'
  createdAt: string
  retired?: boolean // kept for history, never planned again
}

/**
 * The "what does this actually look like" media for one exercise, fetched by
 * `npm run gym:demos` from ExerciseDB (https://oss.exercisedb.dev) or, for the
 * moves it doesn't have, free-exercise-db (two photos — start and end of the
 * movement — flipped into a two-frame animation). Either way it is re-hosted on
 * our own Firebase Storage: only the handful we actually use, never a whole
 * library.
 *
 * Two files per exercise on purpose: the poster (~2 KB) is what a list of ten
 * exercises loads, and the animation (~21 KB) is only fetched when you are
 * looking at that one move. Both are cached by the service worker forever, so
 * the second view of an exercise costs nothing.
 */
export interface ExerciseDemo {
  anim: string // animated webp — the movement
  poster: string // single still frame, for lists and as the animation's placeholder
  source: string // attribution — "ExerciseDB" or "free-exercise-db"
  sourceId: string // their exerciseId, so a bad match can be re-pinned by hand
  sourceName: string // their name for it — this is what you check when a match looks wrong
  /**
   * How this demo was chosen. `close` matters to the UI: the free library is
   * missing plenty of basics, so rather than show nothing we allow an
   * approximate demonstration — but it is always LABELLED as approximate, and
   * the written instructions stay the authority on form.
   */
  match: 'exact' | 'ai' | 'close' | 'manual'
}

/** One exercise the crew can be asked to do. `equipmentIds: []` = needs nothing but you. */
export interface ExerciseDef {
  id: string
  name: string
  emoji: string
  equipmentIds: string[]
  kind: ExerciseKind
  parts: BodyPart[] // primary muscle first — drives recovery spacing and the stats filter
  intensity: 1 | 2 | 3 // 1 = light (good as a ramp-in), 3 = heavy
  how: string // one or two sentences, shown in the runner
  restSec: number // starting point; personal history overrides it once there is any
  defaultReps: number // reps, or seconds for 'timed', minutes for 'cardio'
  defaultSets: number
  /**
   * One limb at a time — a side-lying rotation, a single-arm row, a side plank.
   * The prescribed reps are then PER SIDE, so "2 × 15" means 15 left and 15
   * right. Only the wording and the rep tally change; the plan numbers stay as
   * they are so history before and after this flag stays comparable.
   */
  perSide?: boolean
  backRisk?: boolean // loads the lower back — skipped when the profile flags back issues
  ladder?: boolean // eligible for the rep-ladder game (pushups, pullups, squats…)
  demo?: ExerciseDemo // animation + still, once `npm run gym:demos` has found one
  addedBy: 'ai' | 'manual'
  createdAt: string
  retired?: boolean
}

/** The shared basement (Firestore `app/gymCatalog`). */
export interface GymCatalog {
  equipment: Equipment[]
  exercises: ExerciseDef[]
  updatedAt?: string
}

/** OpenRouter credentials, shared by Essays and FC Lock news (Firestore `app/aiConfig`, admin-only). */
export interface AiConfig {
  openrouterKey?: string
  model?: string
  updatedAt?: string
}

export type ExerciseRating = 'hate' | 'dislike' | 'ok' | 'like' | 'love'
export type Mood = 'lazy' | 'normal' | 'motivated'

/**
 * What a session is allowed to draw on. `weights` = loaded work only, `bodyweight`
 * = nothing but you (a pull-up bar still counts as bodyweight — what matters is
 * whether you load it), `mixed` = both, and the default.
 */
export type GearMode = 'mixed' | 'weights' | 'bodyweight'

/**
 * Everything the app has learned about ONE exercise for ONE person. This is the
 * file that replaces the AI: it is what a good trainer would remember about you.
 */
export interface ExerciseMemory {
  rating?: ExerciseRating
  ratedAt?: string
  timesDone: number
  totalReps: number
  lastDay?: string // YYYY-MM-DD
  lastWeight?: number // what you actually loaded last time
  suggestedWeight?: number // what to put in front of you next time
  lastAdjust?: 'up' | 'down' | 'same' // how the last suggestion landed — too light, too heavy, right
  restLearned?: number // rolling average of the rest you ACTUALLY took, seconds
  /** Rolling average wall-clock seconds for ONE set of this, as YOU do it (both sides included). */
  setSecLearned?: number
  /** Rolling average seconds per rep — lets a 12-rep set be predicted from an 8-rep one. 'reps' kind only. */
  repSecLearned?: number
  /** How many measured sets those two averages are built from. Under ~3 they are still noisy. */
  timedSets?: number
  bestReps?: number // best single set ever (seconds for 'timed')
  /**
   * What to ask for next time on a hold or a run — PER SIDE, in that exercise's
   * own unit (seconds for 'timed', minutes for 'cardio'). The exact twin of
   * `suggestedWeight`: hold longer than you were asked on every set and the next
   * prescription is what you actually held, so a 40 s plank you hold for 70 comes
   * back asking for 70. Absent until a clocked exercise has been done once.
   */
  suggestedHold?: number
  bestWeight?: number
  notes?: string // your own note; the coach reads it
}

/**
 * The rep-ladder game for a bodyweight staple: 2 2 2 2 2 → 2 3 2 3 2 → 3 4 2 4 2.
 * Every few cycles the app asks for a max-rep test and reseeds the whole ladder
 * from the new number, so it never stops climbing.
 */
export interface LadderState {
  max: number // last tested max reps — the ladder is built from this
  level: number // step within the cycle
  cyclesSinceTest: number
  lastTestDay?: string
}

/** One set you actually did. `reps` = seconds for 'timed', minutes for 'cardio'. */
export interface LoggedSet {
  reps: number
  weight?: number
  /** Wall-clock seconds between GO/NEXT and DONE — what the end-of-session pace is graded on. */
  sec?: number
  /**
   * A clocked per-side set, split by side, in the order you did them — `[70, 68]`
   * is seventy seconds on the first side and sixty-eight on the second. `reps`
   * stays the TOTAL of the two, so every total in the app reads the same as it
   * always did; this is the extra detail progression needs, because what you can
   * hold is a per-side number and the weaker side is the one that sets it.
   * Absent on old sets and on anything that isn't a clocked per-side move.
   */
  sides?: number[]
}

/** One exercise inside a session: what was asked for (`plan`) and what happened (`sets`). */
export interface SessionExercise {
  exId: string
  name: string // denormalised so old sessions survive a catalog edit
  emoji: string
  kind: ExerciseKind
  parts: BodyPart[]
  /**
   * How hard the movement itself is (1 light … 3 heavy), copied off the catalog
   * at plan time. Denormalised like `name` because the end-of-session grade is
   * built from it and a session must stay gradable after a catalog edit.
   */
  intensity?: 1 | 2 | 3
  how?: string
  /** The ask. `reps` is per-set, so a ladder is literally [2,3,2,3,2]. */
  plan: { reps: number[]; weight?: number; restSec: number }
  /**
   * The prescribed RANGE for a training-block session — "3 × 8–12". `plan.reps`
   * holds the low end, because that is the number that has to be there for the
   * set to count; the top of the range is what you chase, and reaching it on
   * every set is the signal to add load next time. Absent on a free session,
   * which prescribes one number.
   */
  repRange?: [number, number]
  /**
   * Quality-terminated: stop the set the moment height, speed or landing goes,
   * even if the rep count says there is more. Jumps and throws only — chasing
   * a rep number on those trains the wrong thing.
   */
  quality?: boolean
  sets: LoggedSet[]
  restSec?: number // rest you actually took after it, seconds
  rating?: ExerciseRating // asked the first time you meet an exercise; editable later
  skipped?: boolean
  perSide?: boolean // reps are per side; denormalised like `name` so old sessions read right
  ladder?: boolean
  ladderTest?: boolean // this one is a max-rep test — do as many as you can
  why?: string // the coach's reason, shown on the preview card
  /** Measured seconds for one set of THIS prescription, from your own history. Beats the formula when set. */
  paceSec?: number
  coins: number
}

/** One workout, from "GO" to the closing star rating. */
export interface GymSession {
  id: string
  day: string // YYYY-MM-DD
  status: 'preview' | 'running' | 'done'
  startedAt?: string // ISO, set on GO
  finishedAt?: string
  minutes: number // the budget you asked for
  mood: Mood
  gearMode?: GearMode // weights / bodyweight / both (default 'mixed')
  source: 'ai' | 'local' // who built it — the coach or the offline planner
  model?: string
  note?: string // the coach's one-liner
  exercises: SessionExercise[]
  rating?: number // 1–5 stars, asked at the end
  feedback?: string
  coins: number
  activeSec?: number // wall-clock length
  /**
   * The end-of-session report. Every number is accumulated live by the runner:
   * `*Sec` is wall-clock reality, `*TargetSec` is what the plan asked for, and
   * the targets only count the sets you ACTUALLY did — so skipping half the
   * session can never buy you a better grade.
   */
  workSec?: number
  workTargetSec?: number
  restTotalSec?: number
  restTargetSec?: number
  /** True when this one was planned as "do more" right after another session. */
  followUp?: boolean
  /** The training block this came out of, and which session of the rotation it was. */
  blockId?: string
  blockSessionId?: string
  blockSessionName?: string
}

// --- the training block -----------------------------------------------------
//
// The app stopped inventing a workout every day (2026-08-24). A programme is a
// sequence you repeat and progress on, and a planner that picks something
// plausible each morning can't progress anything — you never meet the same
// exercise under the same conditions twice.
//
// So: a BLOCK is a fixed, ordered rotation of sessions, and you simply do the
// next one. Not Monday/Wednesday/Friday — the rotation ignores the calendar,
// because training 2× one week and 5× the next is normal and a calendar
// programme silently breaks when it happens. Train twice, you do S1 and S2;
// next week starts at S3.

/** One exercise slot in a block session. */
export interface BlockExercise {
  exId: string
  sets: number
  /** Rep range. For a `timed` exercise these are SECONDS, for `cardio`, minutes. */
  repLow: number
  repHigh: number
  /** Stop on quality, not on the count — jumps, throws, sprints. */
  quality?: boolean
  /** Shown on the card: "or Chin-up", "stop when height drops". */
  note?: string
}

/** One session of the rotation — a name and an ordered list of slots. */
export interface BlockSession {
  id: string
  name: string
  emoji: string
  exercises: BlockExercise[]
}

/**
 * A block of training: the rotation, plus when it started. It is deliberately
 * time-boxed rather than session-boxed — at 2–5 sessions a week the same eight
 * weeks can mean 16 sessions or 40, and both are fine. What matters is that the
 * exercises stop being novel, which happens on the calendar, not the counter.
 */
export interface TrainingBlock {
  id: string
  name: string
  /** Where it came from — `seed` is the copy that ships in code, `manual` is yours. */
  source?: 'seed' | 'manual'
  /** What this block is FOR, in one line. Shown on the Plan tab. */
  goal?: string
  startedAt: string // ISO
  /**
   * How much REAL TRAINING this block is worth, counted in finished sessions
   * rather than weeks. Eight weeks means 16 sessions at two a week and 40 at
   * five, and only one of those is a block's worth of work — the calendar
   * measures how long you have owned the programme, not how much of it you have
   * done. `reviewSessions` is where the app starts suggesting a new block,
   * `retireSessions` where it says so plainly.
   */
  reviewSessions: number
  retireSessions: number
  /** Which generation of the code's seed this came from — lets an untouched copy be updated. */
  seedVersion?: number
  sessions: BlockSession[]
}

/**
 * The free-text brief the coach reads before every session, plus the few hard
 * rules the OFFLINE planner also enforces (it can't read prose).
 */
export interface GymBrief {
  text: string
  age?: number
  avoidBackLoad?: boolean // lower-back history — heavy spinal loading is filtered out
  noWarmup?: boolean // no warmup block; ramp in with light sets of the real work instead
  /**
   * Always open the session on the roman chair (back extension), to protect the
   * lower back. ON unless explicitly switched off — read everywhere as
   * `!== false`, so profiles saved before this flag existed still get it.
   */
  romanChairWarmup?: boolean
  weightUnit?: 'lb' | 'kg'
  updatedAt?: string
}

export interface GymState {
  brief: GymBrief
  /**
   * Every training block this person has — the one being followed, the ones
   * that came before it, and any drafted for later. A block is never deleted by
   * finishing it: last block's rotation is the starting point for the next one.
   */
  blocks: TrainingBlock[]
  /** Which of `blocks` the Train tab is walking through. Null = free planner. */
  activeBlockId: string | null
  /** Index into the ACTIVE block's sessions of the one you do NEXT. Wraps; advanced on finish. */
  blockPos: number
  ex: Record<string, ExerciseMemory> // by exercise id — the permanent memory
  ladders: Record<string, LadderState>
  sessions: GymSession[] // finished workouts, newest LAST, capped (see GYM_LOG_CAP)
  active: GymSession | null // the plan on the preview screen, or the workout in progress
  streak: { current: number; best: number; lastDay: string | null }
  totals: { sessions: number; minutes: number; reps: number; coins: number }
  soundOn: boolean // rest-timer beeps
  keepAwake: boolean // hold a screen Wake Lock during a session
}

// --- Essays (the ✍️ Essay app, shared `app/essays` doc) ---------------------
//
// One doc holds both halves: the TOPIC LIST the parent curates (AI proposes,
// the parent keeps or bins, and a binned title is never proposed again) and the
// ESSAYS themselves. Both crewmates read it live, because the whole feature is
// a conversation: Ben writes, Dad reviews, Ben fixes, Dad agrees, Ben gets a
// grade. See BUSINESS_REQUIREMENTS.md §19.

/** School report-card grades, best first. Nothing below C- exists: this is practice, not a verdict. */
export type EssayGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-'

/**
 * One thing Ben can be asked to write about. The AI proposes a batch; every
 * proposal ends up here either `kept` (the parent liked it) or `rejected` (they
 * didn't) — and BOTH lists are sent back to the AI as "never offer these
 * again", which is what stops it circling the same five ideas forever.
 *
 * Ben can propose one too (§19c-1): it lands as `suggested` and sits there,
 * invisible to him as something to write, until Diogo approves it (→ `kept`) or
 * turns it down (→ `rejected`). A topic he chose himself is the one he'll
 * actually want to write, so the road in exists — it just goes past Dad.
 */
export interface EssayTopic {
  id: string
  title: string
  blurb: string // one line of what the essay should cover, in his language
  subject: string // "Science", "Community", "Sports" — just for the chip on the card
  status: 'kept' | 'rejected' | 'suggested'
  /** Kept topics still have a switch: Ben only ever sees the enabled ones. */
  enabled: boolean
  minWords: number // the target length, shown as a progress bar while he writes
  source: 'ai' | 'parent' | 'kid'
  createdAt: string
  /** `kid` topics only: who asked for it, so the answer goes back to the right person. */
  suggestedById?: string
  suggestedByName?: string
  /** When the parent answered a suggestion, and whether the asker has read the answer. */
  decidedAt?: string
  seenAt?: string
  /**
   * Who has already written this one and been graded. A topic is asked once per
   * writer: once it's marked and done it drops off his list, because being
   * offered the essay you just finished reads as the app not having noticed.
   *
   * Stamped on the topic rather than worked out from `essays[]` alone, because
   * that list is capped at 40 and the oldest fall off — a topic must not come
   * back from the dead the day his history rolls over.
   */
  writtenBy?: string[]
}

/**
 * What one note is about.
 *
 * The first three are MECHANICAL — spelling, punctuation, capital letters — and
 * they are the only things the AI is asked to look for. They have right answers,
 * which is exactly why a machine can be trusted with them, and two of them
 * (`spelling`, `case`) are objective enough that the app closes them on its own
 * once they're fixed.
 *
 * The rest — is it clear, is the idea any good — are the parent's to raise by
 * hand. Judging whether a 12-year-old's argument holds up is not a job to hand
 * to a cheap model.
 */
export type EssayIssue = 'spelling' | 'punctuation' | 'case' | 'clarity' | 'idea' | 'praise'

/**
 * One note on the essay. Notes never contain the fix: the AI is instructed to
 * say what is wrong and why, never to write the sentence for him.
 *
 * `quote` is the exact text to circle in the paragraph. The renderer finds it by
 * plain string search, so a quote the AI hallucinated simply doesn't get circled
 * — the note still shows, nothing breaks.
 */
export interface EssayComment {
  id: string
  round: number // the review round it was raised in
  para: number // paragraph index; -1 = the title
  quote?: string // exact substring to circle
  /**
   * Where that substring started in the part, at the moment it was picked.
   *
   * A short quote ("a", "i", "the") occurs all over a paragraph, so looking the
   * text up again lands on the first one and circles a word the reviewer never
   * tapped. Notes made by hand carry the offset; anything that arrives without
   * one (or whose text has moved since) falls back to the search.
   */
  at?: number
  text: string // the note itself, written for a 12-year-old
  issue: EssayIssue
  /**
   * Who raised it. `app` is the built-in proofreader (§19e-3) — the rules that
   * have no opinion in them (a sentence starts with a capital, "I" is a capital,
   * a full stop is followed by a space) and therefore need no model, no network
   * and no waiting.
   */
  source: 'ai' | 'parent' | 'app'
  /** `app` notes only: which rule found it, so the same one is never raised twice. */
  rule?: string
  /** The reviewer disagreed with a rule note; it stays settled and never comes back. */
  dismissed?: boolean
  edited?: boolean // the parent rewrote the AI's wording
  /** `open` = he still has to deal with it; `fixed` = settled and out of his way. */
  status: 'open' | 'fixed'
  /**
   * Spelling notes only: the word as it is actually spelled, and ~7 plausible
   * spellings to choose between later.
   *
   * **Neither is ever shown to him as part of the note.** They exist so the app
   * can (a) check that the AI didn't smuggle the answer into its own wording and
   * (b) build the word-bank quiz (§19f). Finding the right spelling is the
   * exercise; being handed it is the failure mode.
   */
  correct?: string
  options?: string[]
  /** The AI's opinion of his fix, on the round after this note was raised. */
  aiVerdict?: 'fixed' | 'unfixed'
  aiNote?: string
  resolvedAt?: string
}

/** A snapshot of the essay as it was submitted for one round, so the loop can be replayed. */
export interface EssayVersion {
  round: number
  title: string
  paragraphs: string[]
  at: string
}

/**
 * One essay, from blank page to grade.
 *
 * `writing` → he's drafting (autosaved). `submitted` → it's on Dad's desk.
 * `returned` → the notes are back and he's fixing them. Round by round until no
 * note is left open, then `graded`: a letter, two sentences of feedback, and the
 * Berries that go with the letter.
 */
export interface Essay {
  id: string
  topicId: string
  topicTitle: string // denormalised so a deleted topic never orphans an essay
  authorId: string
  authorName: string
  title: string
  paragraphs: string[]
  status: 'writing' | 'submitted' | 'returned' | 'graded'
  round: number // 1 on the first submission, +1 on every return
  comments: EssayComment[]
  versions: EssayVersion[]
  grade?: EssayGrade
  gradeGood?: string // "what you did well"
  gradeImprove?: string // "what to try next time"
  coins?: number
  createdAt: string
  updatedAt: string
  submittedAt?: string
  returnedAt?: string
  gradedAt?: string
  /**
   * When the writer last spent an AI call checking his own fixes. Sending is
   * locked for a few minutes afterwards (see `RESEND_COOLDOWN_MS`) — the check
   * costs money, and "submit, submit, submit" is otherwise free to him.
   */
  lastCheckAt?: string
  /** Set once the author's app has celebrated the grade, so it only pops once. */
  seenAt?: string
}

/**
 * One word he got wrong, kept forever in the word bank.
 *
 * The bank is the point of the whole essay loop: a word he misspelled once is a
 * word he will misspell again, and a list of *his* words is worth ten spelling
 * lists off the internet. It never closes and it only grows.
 */
export interface EssayWord {
  id: string
  typed: string // exactly as he wrote it — this is what makes it his list
  correct: string
  options: string[] // ~7 near-identical spellings, the right one among them
  authorId: string // whose list it belongs to — a word is only yours if you wrote it
  fromEssayId: string
  addedAt: string
  asked: number
  right: number
  /**
   * How many times he has misspelled this word in an essay — 1 when it first
   * lands. A word he keeps getting wrong is a word the practice round should
   * keep putting in front of him, so this is what weights the draw.
   */
  misses: number
  lastMissedAt?: string
  /**
   * The first time he picks it correctly **in a final test**. Pays Berries once,
   * then never again — which is what stops unlimited retakes being a Berry tap.
   */
  masteredAt?: string
}

/** One sitting of the word test. Kept so "new words since your last test" means something. */
export interface EssayWordTest {
  id: string
  at: string
  total: number
  right: number
  coins: number
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
  duel: DuelStats
  games: BoardGamesState
  /**
   * The One Piece Album (§14b) — the second collection, holding every printed ONE
   * PIECE TCG card. Deliberately the same shape as `album`: it is the same
   * game over a different pile, so one set of rules and one set of screens
   * serve both.
   */
  cards: AlbumState
  /** The One Piece TCG app: this crewmate's built decks and their record. */
  optcg: OptcgProfileState
  gym: GymState
  /** Roblox screen-time bank (§20): hours owed to Ben, and what he's played. */
  roblox: RobloxState
  /** FC Lock (§21): this crewmate's own leagues, clubs, watchlist and news. */
  fcLock: FcLockState
  pushTokens: PushToken[] // devices this profile has registered for web push
}

/**
 * One row in the append-only audit trail (`auditLog` collection). Written on any
 * change to a crewmate's Berries/Devil Fruits/freezes, real bank money, album,
 * or task roster, so a bad write (e.g. an AI update) can be spotted after the
 * fact. Self-cleaning: a Firestore TTL policy deletes rows once `expireAt`
 * passes (~7 days), so the log costs ~no storage.
 */
export type AuditCategory = 'gems' | 'devilFruits' | 'freezes' | 'bank' | 'album' | 'tasks'

export interface AuditEntry {
  id: string
  profileId: string // whose world changed
  actor: string // which logged-in profile made the change (may differ: Dad editing Ben)
  category: AuditCategory
  detail: string // human-readable summary, e.g. "Devil Fruits 0 → 1" or "pack opened (+3 stickers)"
  before?: number | string
  after?: number | string
  delta?: number
  at: number // epoch ms (server Timestamp on write, coerced to ms on read)
  expireAt?: unknown // Firestore Timestamp; TTL field — never read in app code
}

// --- FC Lock (⚽ the football schedule, §21) ---------------------------------

/** A game on the watchlist: a snapshot, so the list renders with no network. */
export interface FcWatchItem {
  id: string // TheSportsDB idEvent
  leagueId: string
  leagueName: string
  home: string
  away: string
  homeBadge?: string
  awayBadge?: string
  kickoff: string // UTC ISO — displayed in Toronto time, always
  addedAt: string
  /** Filled in once the game has been played and we've looked the score up. */
  homeScore?: number
  awayScore?: number
  /** The result has been read on the Games tab, so the warning stops shouting. */
  seenResult?: boolean
}

export interface FcNewsItem {
  id: string
  title: string
  summary: string
  team?: string
  kind: 'transfer' | 'news'
  source?: string
  url?: string
  date?: string
}

/**
 * One crewmate's FC Lock world. It lives on the profile (`AppData.fcLock`), not
 * in a shared doc: Diogo and Ben follow different clubs and star different
 * games, so the schedule is personal — same app, two schedules.
 */
export interface FcLockState {
  /** TheSportsDB league ids we follow (see `LEAGUES` in logic/fclock.ts). */
  leagues: string[]
  teams: { id: string; name: string; badge?: string; leagueName?: string }[]
  watch: FcWatchItem[]
  /** ⚽ One Piece Soccer League (§21j): your club, and the season so far. */
  soccer?: {
    teamId: string
    /** The position you play. */
    role: string
    results: { opp: string; gf: number; ga: number; at: string }[]
  }
  /** 📕 The Premier League sticker album (§21g): what this crewmate has stuck in. */
  album?: {
    counts: Record<string, number>
    packsOpened: number
    lastFreePackDay: string | null
  }
  news?: {
    items: FcNewsItem[]
    fetchedAt: string
    /** Which teams the batch was fetched for — a changed favourite invalidates it. */
    forKey: string
  }
}
