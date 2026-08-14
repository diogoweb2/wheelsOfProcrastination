import { create } from 'zustand'
import type {
  AiConfig,
  AlbumState,
  AppData,
  BankAccountId,
  BankConfig,
  BankConverterState,
  Completion,
  DayScope,
  Effort,
  EffortFilter,
  Essay,
  EssayComment,
  EssayTopic,
  EssayWord,
  EssayWordTest,
  ExerciseDef,
  ExerciseRating,
  FinalTestAuth,
  FreezeGift,
  FreezeRequest,
  GearMode,
  GymCatalog,
  GymSession,
  Idea,
  LoggedSet,
  MarketData,
  Mood,
  Priority,
  Profile,
  QuizQuestion,
  QuizTestRecord,
  CardDuel,
  BoardMatch,
  StickerTrade,
  Task,
} from '../types'
import {
  KID_ID,
  PARENT_ID,
  defaultData,
  getActiveProfileId,
  hashPin,
  seedProfiles,
  setActiveProfileId,
} from './storage'
import {
  loadQuizBank,
  loadRoster,
  logAudit,
  pruneExpiredAudit,
  subscribeAudit,
  fireAndForget,
  saveDataFields,
  setWriteErrorHandler,
  saveAiConfig,
  saveGymCatalog,
  saveIdeas,
  saveQuizBank,
  saveRoster,
  saveStickerTrades,
  saveCardDuels,
  saveBoardGames,
  saveFreezeDesk,
  saveFinalTests,
  saveEssays,
  subscribeEssays,
  type EssayDesk,
  subscribeAiConfig,
  subscribeData,
  subscribeGymCatalog,
  subscribeIdeas,
  subscribeStickerTrades,
  subscribeCardDuels,
  subscribeBoardGames,
  subscribeFreezeDesk,
  subscribeFinalTests,
  subscribeMarketData,
  subscribeQuizBank,
  subscribeRoster,
} from './cloud'
import type { AuditCategory, AuditEntry, Season } from '../types'
import { addDays, dayKey } from '../logic/dates'
import { BACKGROUND_CATALOG } from '../logic/backgrounds'
import { PACK_COST, freePackReady, isBalanced, rollPack, spareCount } from '../logic/album'
import {
  DECK_SIZE,
  DUEL_MOVE_SECONDS,
  DUEL_REWARD,
  SOLO_PLAY_LIMIT_DEFAULT,
  SOLO_REWARD,
  SOLO_REWARD_LIMIT,
  applyMove,
  startDuel,
  type DuelMove,
  type DuelState,
} from '../logic/cardGame'
import {
  BOARD_MOVE_SECONDS,
  BOARD_REWARD,
  kitFor,
  type BoardKind,
  type BoardMove,
  type BoardState,
} from '../logic/boardGames'
import {
  ABANDON_PENALTY,
  BACKGROUND_COST,
  FREEZE_COST,
  MAX_FREEZES,
  MAX_PENDING,
  isEffectivelyUrgent,
  respinCost,
  rewardFor,
  requiredPenalty,
  requiredReward,
  streakGoalBonus,
  streakRepairCost,
} from '../logic/economy'
import { buildEntries, eligibleTasks, isAvailableOn, isRequiredOn, missedSince, pickWeighted, studyLockedIds } from '../logic/wheel'
import { newBadges } from '../logic/badges'
import { PASS_PCT, REVIEW_PASS_PCT, reviewBreakdown, giftCardDaysLeft, nextTopicToUnlock, pickDailyQuestion, prizesFor, qotdPenalty, qotdReward, syncQuizTasks, syncTopicUnlocks, trainingReward, updatedStat } from '../logic/quiz'
import { flyBerries } from '../logic/fx'
import { ACCOUNT_IDS, BOUNCE_MULT, DEFAULT_CONVERTER, applyCrash, crashWorthwhile, fmt$, pickRecoverDay, pushTxn, round2, simulateBank, type BankSimEvent } from '../logic/bank'
import { setMuted } from '../audio'
import { enablePush } from '../push'
import {
  GYM_LOG_CAP,
  STARTER_EXERCISES,
  bumpStreak,
  coinsForExercise,
  defaultLadder,
  exerciseById,
  isPersonalRecord,
  learnFromExercise,
  loggedReps,
  seedBrief,
  sessionBonus,
  setSeconds,
  advanceLadder,
} from '../logic/gym'
import { coachPlan, coachSwap } from '../logic/gymCoach'
import {
  AUTO_CLOSE_ISSUES,
  DEFAULT_MIN_WORDS,
  autoResolve,
  canSuggestTopic,
  ESSAY_CAP,
  WORD_CAP,
  WORD_COIN,
  gradeCoins,
  titleTaken,
  newEssay,
  openComments,
  openRuleNotes,
  openSpelling,
  resendWaitMs,
  syncRuleNotes,
} from '../logic/essay'
import {
  checkFixes,
  essayAiError,
  gradeEssay,
  reviewEssay,
  suggestTopics,
  type DraftComment,
  type EssayAttempt,
  type TopicOffer,
} from '../logic/essayAi'

/** Rough device hint for the registered-devices list ("iPhone", "Mac", …). */
function deviceLabel(): string {
  const ua = navigator.userAgent
  for (const [re, name] of [[/iPhone/, 'iPhone'], [/iPad/, 'iPad'], [/Android/, 'Android'], [/Macintosh/, 'Mac'], [/Windows/, 'Windows']] as const) {
    if (re.test(ua)) return name
  }
  return 'this device'
}

/**
 * Diff the audited slices of two AppData snapshots and append one audit-log row
 * per meaningful change: Berries/Devil Fruits/freezes, real bank money (per
 * account), the album (per sticker + packs), and the task roster. Called from
 * the write funnels, so EVERY path (user, admin, nightly rollover) is captured
 * without touching individual call sites. Fire-and-forget; never blocks the UI.
 */
function auditDiff(profileId: string, actor: string, before: AppData, after: AppData) {
  const emit = (
    category: AuditCategory,
    detail: string,
    extra?: { before?: number | string; after?: number | string; delta?: number },
  ) => logAudit({ profileId, actor, category, detail, ...extra })

  // --- non-real money: Berries (gems), Devil Fruits, streak freezes ---------
  const num: [AuditCategory, string, number, number][] = [
    ['gems', 'Berries', before.economy.gems, after.economy.gems],
    ['devilFruits', 'Devil Fruits', before.economy.devilFruits, after.economy.devilFruits],
    ['freezes', 'Streak freezes', before.economy.freezes, after.economy.freezes],
  ]
  for (const [category, label, b, a] of num) {
    if (a !== b) emit(category, `${label} ${b} → ${a}`, { before: b, after: a, delta: a - b })
  }

  // --- real money: each bank account's balance -------------------------------
  for (const id of ACCOUNT_IDS) {
    const b = round2(before.bank.accounts[id].balance)
    const a = round2(after.bank.accounts[id].balance)
    if (a !== b) emit('bank', `${id} balance ${fmt$(b)} → ${fmt$(a)}`, { before: b, after: a, delta: round2(a - b) })
  }

  // --- album: per-sticker counts + packs opened ------------------------------
  const ids = new Set([...Object.keys(before.album.counts), ...Object.keys(after.album.counts)])
  for (const sid of ids) {
    const b = before.album.counts[sid] ?? 0
    const a = after.album.counts[sid] ?? 0
    if (a !== b) emit('album', `sticker ${sid} ×${b} → ×${a}`, { before: b, after: a, delta: a - b })
  }
  if (after.album.packsOpened !== before.album.packsOpened) {
    emit('album', `packs opened ${before.album.packsOpened} → ${after.album.packsOpened}`, {
      before: before.album.packsOpened,
      after: after.album.packsOpened,
      delta: after.album.packsOpened - before.album.packsOpened,
    })
  }

  // --- tasks: creations & removals (by id) -----------------------------------
  const beforeTasks = new Map(before.tasks.map((t) => [t.id, t]))
  const afterTasks = new Map(after.tasks.map((t) => [t.id, t]))
  for (const [tid, t] of afterTasks) {
    if (!beforeTasks.has(tid)) {
      emit('tasks', `task created: "${t.name}" (${t.effort}${t.required ? ', required' : ''})`)
    }
  }
  for (const [tid, t] of beforeTasks) {
    if (!afterTasks.has(tid)) emit('tasks', `task deleted: "${t.name}"`)
  }
}

// TEMP (local testing only — do not commit as true): when set, spins are not
// registered: no pendingPicks entry, no pick counters, nothing saved to Firestore.
const TEST_DISABLE_SPIN_TRACKING = false
export interface AppEvent {
  type: 'badge' | 'goal' | 'streakDead' | 'frozen' | 'penalty'
  title: string
  emoji: string
  description: string
}

interface StoreState {
  data: AppData
  profiles: Profile[] // the crew roster (synced from Firestore)
  activeProfileId: string | null // who's logged in on this device
  ready: boolean // roster loaded from cloud
  dataLoaded: boolean // active profile's data has arrived at least once (guards writes)
  cloudError: string | null // set if Firestore/auth can't be reached (blocks the whole app)
  saveError: string | null // last failed background write — the change is in memory only and dies on refresh
  dismissSaveError: () => void
  events: AppEvent[]
  quizBank: QuizQuestion[] // shared question bank (app/quizBank), live-synced
  quizBankLoaded: boolean
  kidData: AppData | null // Ben's world, live-synced while the PARENT is logged in (banner, official tests, grants)
  kidDataFresh: boolean // kidData has arrived from the SERVER (not just the local cache) — guards writes into Ben's world
  market: MarketData | null // shared XGRO/QQQ return series, live-synced; drives realistic daily moves
  ideas: Idea[] // shared wishlist (app/ideas), live-synced — both crewmates read and write it
  trades: StickerTrade[] // shared sticker swaps (app/stickerTrades), live-synced
  duels: CardDuel[] // shared card-duel board (app/cardDuels), live-synced — challenges and live matches
  boardGames: BoardMatch[] // shared Chess/Checkers board (app/boardGames), live-synced
  freezeRequests: FreezeRequest[] // the kid's "ask Dad for a freeze" queue (app/freezeRequests), live-synced
  freezeGifts: FreezeGift[] // freezes Dad handed out; the kid's app celebrates the unseen ones
  finalTests: FinalTestAuth[] // remote final-test authorisations + their results (app/finalTests), live-synced
  mateAlbum: AlbumState | null // the OTHER crewmate's album, live-synced — powers "cards they can spare for you"
  mateData: AppData | null // their whole world; kept so accepting a swap can write their album back intact
  mateDataFresh: boolean // mateData came from the SERVER — guards writing a swap into their doc
  audit: AuditEntry[] // recent audit-log rows (admin desk), live-synced; self-expiring after ~7d
  qotdOpen: boolean // is the Question-of-the-Day modal showing?
  gymCatalog: GymCatalog | null // the shared basement (app/gymCatalog), live-synced
  aiConfig: AiConfig | null // OpenRouter key + model for the Gym coach (app/aiConfig), live-synced
  essayTopics: EssayTopic[] // the curated topic list (app/essays), live-synced
  essays: Essay[] // every essay in flight or finished (app/essays), live-synced
  essayWords: EssayWord[] // the word bank: every word he has ever misspelled (app/essays)
  essayWordTests: EssayWordTest[] // word-test history, newest last
  essayBusy: string | null // what the essay AI is doing right now ('topics' | 'review' | 'fixes' | 'grade'), for the spinner
  /** Which model is being waited on, and since when — the desk counts the 60 seconds down out loud. */
  essayAttempt: (EssayAttempt & { startedAt: number }) | null
  essayError: string | null // the last AI failure, verbatim — the desk shows it instead of pretending
  /** The result of the writer's last self-check: did his fixes get past the spelling gate? */
  essayCheck: { ok: boolean; stillWrong: number } | null
  /**
   * Which essay the reviewer has open. It lives here rather than inside the Desk
   * screen because the red pen is its own tab: switching between the two must
   * not lose the essay you were holding.
   */
  essayDeskId: string | null
  gymPlanning: boolean // the coach is thinking about today's session
  /** Why the last plan came from the offline planner instead of the coach; null when the coach built it. */
  gymFellBack: string | null

  activeProfile: () => Profile | null
  addIdea: (text: string) => void
  toggleIdea: (id: string) => void
  deleteIdea: (id: string) => void
  login: (profileId: string, pin: string) => Promise<boolean>
  setupPin: (profileId: string, pin: string) => Promise<void>
  logout: () => void

  rollover: () => void
  popEvent: () => void
  pushEvent: (e: AppEvent) => void

  addTask: (t: {
    name: string
    repeats: boolean
    untilDone?: boolean
    effort: Effort
    priority: Priority
    dueDate?: string
    startDate?: string
    dayScope: DayScope
    weekDays?: number[]
    monthDays?: number[]
    required?: boolean
    onWheel?: boolean
    requiredFrom?: string
    requiredUntil?: string
    afterTaskId?: string
    cooldownDays?: number
    categories?: string[]
    seasons?: Season[]
    /** Auto-split: >1 creates that many chained parts instead of one quest. */
    parts?: number
  }) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  /**
   * "I'm done earlier than planned": drops every part of an auto-split quest
   * that hasn't been completed yet. Returns how many parts were removed.
   */
  finishSeriesEarly: (seriesId: string) => number

  completedTodayIds: () => Set<string>
  /** Tick a required checklist item off for today (pays the reduced flat reward). */
  completeRequired: (taskId: string) => number
  /** Pull a dormant must-do onto today's checklist (or take it back off again). */
  setDoToday: (taskId: string, on: boolean) => void
  /** Last-day escape hatch: push a requirement's deadline out by `days`. */
  postponeRequired: (taskId: string, days: number) => void
  /** "Delay" decision: off the checklist (and unfined) until `days` from today. */
  delayRequired: (taskId: string, days: number) => void
  /** "Won't do it" decision: write off every occurrence up to today. Repeats still return. */
  skipRequired: (taskId: string) => void
  /** Last-day escape hatch: stop requiring this task forever (it stays as a normal quest). */
  dropRequired: (taskId: string) => void
  spin: (filter: EffortFilter) => Task | null | 'full'
  respin: (filter: EffortFilter, replaceTaskId: string) => Task | null | 'broke' | 'full'
  manualPick: (taskId: string) => 'ok' | 'broke' | 'full'
  dropPendingPick: (taskId: string) => void
  completeTask: (taskId: string) => number

  // --- quiz (every action names the profile it touches; admin can target Ben from Diogo's session) ---
  /** Log a quiz answer to `targetId`'s stats. `rewarded` = training mode pays Berries. Returns Berries earned. */
  recordQuizAnswer: (targetId: string, qid: string, correct: boolean, timeMs: number, rewarded: boolean) => number
  /**
   * Store a finished final test for `targetId`. Official pass → topic checkmark
   * + one-time Devil Fruit + the next topic opens. `authId` ties it to a remote
   * authorisation (see finalTests), which is closed out with the result.
   */
  finishQuizTest: (targetId: string, topicId: string, official: boolean, results: { qid: string; correct: boolean }[], authId?: string) => QuizTestRecord
  /**
   * Close the warm-up review round that gates an official test (70% to pass).
   * A fail ends the whole attempt: the new topic is never sat, and Dad's banner
   * carries the per-topic tally instead of a score.
   */
  finishReviewTest: (targetId: string, topicId: string, results: { qid: string; correct: boolean }[], authId?: string) => QuizTestRecord

  // --- remote final tests: Dad authorises, another grown-up invigilates on Ben's device ---
  /** Admin: allow ONE official test on the target's device, guarded by a 4-digit code. */
  authorizeFinalTest: (targetId: string, topicId: string, pin: string, note: string) => void
  /** Admin: withdraw an authorisation he hasn't started yet. */
  cancelFinalTest: (authId: string) => void
  /** Kid: "later" — the popup becomes a nagging top banner. */
  postponeFinalTest: (authId: string) => void
  /** Kid: the code checked out. Burns the single attempt right away. */
  startFinalTest: (authId: string) => void
  /** Kid: walked out mid-test. The attempt is spent; Dad is told. */
  abandonFinalTest: (authId: string) => void
  /** Admin: dismiss a result banner. */
  ackFinalTest: (authId: string) => void
  // --- Question of the Day (own profile only) ---
  /** Make sure today's review question exists: penalize an ignored one from a past day, then pick a fresh one. */
  refreshDailyQuiz: () => void
  /** Open / close the Question-of-the-Day modal (shared so the Spin card can reopen a parked one). */
  openQotd: () => void
  closeQotd: () => void
  /** Answer the Question of the Day. Wins full points, or loses half on a miss. Returns the Berry delta (+/−). */
  answerDailyQuiz: (correct: boolean, timeMs: number) => number
  /** "Do it later" — park the question on the Spin screen until it's answered (or midnight bites). */
  postponeDailyQuiz: () => void
  setTopicUnlocked: (targetId: string, topicId: string, unlocked: boolean) => void // admin
  /** Admin: stamp a topic CONQUERED by hand (a pass taken off-app, or one the app missed), or take the stamp back. */
  setTopicPassed: (targetId: string, topicId: string, passed: boolean) => void
  grantDevilFruit: (targetId: string, topicId: string) => void // admin bonus 🍇
  revokeDevilFruit: (targetId: string, topicId: string) => void // admin: undo a bonus 🍇 (never below 0)
  removeQuizQuestion: (qid: string) => void // admin: flag removed (stays in db so AI won't regenerate it)
  approveQuizQuestion: (qid: string) => void // admin: pending → active (also restores removed)
  // --- prizes (each profile buys from its own catalog with its own 🍇) ---
  buyGiftCard: (itemId: string) => 'ok' | 'broke' | 'cooldown'
  markGiftCardPaid: (targetId: string, purchaseId: string) => void // admin settles a purchase

  // --- Grand Line Bank (the bank lives in BEN's world; admin edits reach it via kidData) ---
  /** Move real dollars between Ben's chests. Fully free — College deposits get Dad's match; College withdrawals burn it. */
  bankTransfer: (from: BankAccountId, to: BankAccountId, amount: number) => 'ok' | 'broke'
  /** Allocate the pending payday pool across the chests (must total the pool; chequing is a valid choice). */
  bankAllocate: (alloc: Partial<Record<BankAccountId, number>>) => 'ok' | 'bad'
  /** Interac-style payback to dad, from the Pocket Chest only. Dad sees it until he taps "Got it". */
  bankPayDad: (amount: number, note: string) => 'ok' | 'broke'
  ackBankPayback: (txnId: string) => void // admin: "Got it" on a payback
  setBankConfig: (patch: Partial<BankConfig>) => void // admin: rates, weekly amount, payday, RESP
  bankAdjust: (acct: BankAccountId, delta: number, note: string) => void // admin: manual correction / paper-money import
  /** Admin: turn the trip money converter on/off, set the currency, rate and how many days it lives. */
  setBankConverter: (patch: Partial<BankConverterState> & { days?: number }) => void
  // Shock Test:
  /** Ben answers the crash alert: panic-sell everything at the bottom, or hold for the bounce. */
  resolveBankCrash: (choice: 'hold' | 'panic') => void
  /** Admin: manually fire a market correction (unlocked after the first auto-crash). */
  triggerBankCrash: () => boolean
  /** Ben's session: pop the one-shot "it bounced back!" celebration if a recovery landed. */
  celebrateBankBounce: () => void

  /** Buy back the just-died streak (freezes the missed days). Returns false if too broke. */
  repairStreak: () => boolean
  dismissStreakRepair: () => void // "let it sink"

  buyFreeze: () => boolean

  // --- free freezes from Dad ---
  /** Kid: ask Dad to cover a day he couldn't show up for. One open ask at a time. */
  askForFreeze: (reason?: string) => 'ok' | 'busy'
  /** Kid: withdraw my pending ask. */
  cancelFreezeRequest: () => void
  /**
   * Admin: gift `count` free freezes to the kid with a custom message. If his
   * streak is currently dead, it's revived and the missed days frozen — the
   * same repair `repairStreak` does, but free. `requestId` resolves his ask.
   */
  grantFreeze: (count: number, message: string, requestId?: string) => void
  /** Admin: turn down a pending ask. */
  declineFreezeRequest: (requestId: string) => void
  /** Kid: mark a gift's celebration as shown so it only fires once. */
  markFreezeGiftSeen: (giftId: string) => void
  /** Kid: mark a declined ask as read so the "Dad said no" modal only fires once. */
  markFreezeRequestSeen: (requestId: string) => void

  /** Register this device for web push so a CLOSED app still gets pinged. Returns an error message, or null on success. */
  registerPushDevice: () => Promise<string | null>
  /** Buy a random unowned background. Returns the won catalog id, or why it failed. */
  // --- sticker album ---
  /** Open a pack. 'free' uses the daily free pack; 'buy' spends Berries. Returns the drawn sticker ids. */
  openPack: (kind: 'free' | 'buy') => string[] | 'broke' | 'used'
  /** Offer a swap to the other crewmate. Values must balance (1 red = 2 whites). */
  proposeTrade: (give: string[], want: string[], note?: string) => 'ok' | 'unbalanced' | 'busy'
  /** Answer a swap addressed to me. Accepting moves the cards in BOTH albums. */
  answerTrade: (tradeId: string, accept: boolean) => void
  /** Withdraw a swap I proposed and that hasn't been answered yet. */
  cancelTrade: (tradeId: string) => void

  // --- Davy Back Duel (the card game) ---
  /** Throw down the gauntlet with this line-up. One live duel between the crewmates at a time. */
  challengeDuel: (deck: string[]) => 'ok' | 'busy' | 'deck'
  /** Answer a challenge aimed at me — accepting needs my own line-up and starts the match. */
  answerChallenge: (duelId: string, accept: boolean, deck?: string[]) => void
  /** Play one move in an online duel. Ignored unless the board says it's my move. */
  playDuelMove: (duelId: string, move: DuelMove) => void
  /** Give up: the other side takes the win (and the Berries). */
  resignDuel: (duelId: string) => void
  /** Withdraw a challenge I sent that hasn't been answered yet. */
  cancelDuel: (duelId: string) => void
  /** Remember a line-up as my default team. */
  saveDuelDeck: (deck: string[]) => void
  /** Bank the record + Berries for any finished duel of mine not yet counted. Safe to call repeatedly. */
  settleDuels: () => void
  /** Log a solo match against the training dummy. Returns the Berries it paid. */
  recordSoloResult: (won: boolean) => number
  /** Training-hall matches left today: the captain's daily cap minus the ones already started. */
  soloPlaysLeft: () => number
  /** Spend one training-hall play. False (and nothing spent) when today's cap is used up. */
  spendSoloPlay: () => boolean

  // --- Chess & Checkers (the 🎮 Games folder) ---
  /** Challenge the other crewmate to a board game. One live match per game at a time. */
  challengeBoardGame: (kind: BoardKind) => 'ok' | 'busy'
  /** Answer a board-game challenge aimed at me. Accepting deals the opening position. */
  answerBoardChallenge: (matchId: string, accept: boolean) => void
  /** Play one move. Ignored unless the shared board says it's my move and the move is legal. */
  playBoardMove: (matchId: string, move: BoardMove) => void
  /** Give up: the other side takes the win (and the Berries). */
  resignBoardGame: (matchId: string) => void
  /** Withdraw a challenge I sent that hasn't been answered yet. */
  cancelBoardGame: (matchId: string) => void
  /** Bank the record + Berries for any finished match of mine not yet counted. Safe to call repeatedly. */
  settleBoardGames: () => void
  /** Turn the coaching highlights (legal-move dots, danger rings, labels) on or off. */
  setBoardHints: (on: boolean) => void

  buyBackground: () => string | 'broke' | 'complete'
  /** Equip an owned background as the app background; null = default solid color. */
  equipBackground: (id: string | null) => void
  setStreakGoal: (goal: number) => void
  setSettings: (patch: Partial<AppData['settings']>) => void
  /** Admin: change a crewmate's settings (Ben's world included). */
  setSettingsFor: (targetId: string, patch: Partial<AppData['settings']>) => void

  // --- gym (the 💪 Training Deck) ---
  /**
   * Build today's session (coach if it's on and reachable, offline planner
   * otherwise) and park it on the preview. `followUp` is the session that just
   * ended when this is a "do more" block — it is never repeated.
   */
  gymPlan: (minutes: number, mood: Mood, opts?: { gearMode?: GearMode; followUp?: GymSession | null }) => Promise<void>
  /** "Not that one today." Swaps one exercise on the preview for something else. */
  gymSwap: (exId: string, reason?: string) => Promise<'ok' | 'none'>
  /** Drop an exercise from the preview outright. */
  gymDrop: (exId: string) => void
  /** Kill an exercise for good: out of the shared catalog and never planned again. */
  gymDeleteExercise: (exId: string) => void
  /** Throw away the previewed session. */
  gymDiscard: () => void
  /** GO — the preview becomes a live workout. */
  gymStart: () => void
  /**
   * Log one set. `weight` is what you ACTUALLY loaded — corrections are the
   * training signal. `sec` is how long the set really took (GO/NEXT → DONE) and
   * feeds the end-of-session pace grade.
   */
  gymLogSet: (exId: string, reps: number, weight?: number, sec?: number) => void
  gymUndoSet: (exId: string) => void
  /** Record the rest you actually took after a set, and what was offered, in seconds. */
  gymLogRest: (exId: string, seconds: number, targetSec?: number) => void
  /** Rate an exercise from inside the runner (asked the first time you meet one). */
  gymRateInSession: (exId: string, rating: ExerciseRating) => void
  gymSkip: (exId: string) => void
  /**
   * Finish: pay the Berries, fold everything into the permanent memory, file the
   * session. Hands the filed session back so the report screen can grade it.
   */
  gymFinish: (rating?: number, feedback?: string) => { coins: number; session: GymSession | null }
  /** Walk out. Anything logged is still kept and still pays; an untouched session is just thrown away. */
  gymAbandon: () => { coins: number; session: GymSession | null }
  gymSetBrief: (patch: Partial<AppData['gym']['brief']>) => void
  /** Change your mind about an exercise later (Gear tab). */
  gymRateExercise: (exId: string, rating: ExerciseRating | null) => void
  gymSetExerciseNote: (exId: string, note: string) => void
  gymSetOptions: (patch: Partial<Pick<AppData['gym'], 'aiOn' | 'soundOn' | 'keepAwake'>>) => void
  /** Add / edit / retire gear and exercises in the shared basement. */
  // --- essays (the ✍️ Essay app; every action writes the shared app/essays doc) ---
  /** Ask the AI for a fresh batch of ideas. Nothing is stored yet — the parent decides. */
  essaySuggestTopics: (count: number, steer: string) => Promise<TopicOffer[]>
  /** Keep an offer (goes on Ben's list, enabled) or bin it (never offered again). */
  essayJudgeTopic: (offer: TopicOffer, keep: boolean, source?: 'ai' | 'parent') => void
  /**
   * The writer's side: ask for a topic of his own. It lands `suggested` and does
   * nothing at all until the parent answers. Returns why it was refused, or ''.
   */
  essayAskTopic: (input: { title: string; blurb: string; subject: string }) => string
  /** The parent's answer to one of his asks: approved (goes live) or turned down. */
  essayDecideTopic: (topicId: string, approve: boolean) => void
  /** The asker has read the answer — stops the badge and the banner. */
  essayMarkTopicSeen: (topicId: string) => void
  essaySetTopicEnabled: (topicId: string, enabled: boolean) => void
  essaySetTopicWords: (topicId: string, minWords: number) => void
  essayDeleteTopic: (topicId: string) => void
  /** Start (or reopen) an essay on a topic. Returns its id. */
  essayStart: (topicId: string) => string | null
  essaySaveDraft: (essayId: string, patch: { title?: string; paragraphs?: string[] }) => void
  /** Hand it in — first time, or with this round's fixes. No checks, no questions. */
  essaySubmit: (essayId: string) => void
  /**
   * The writer's send button. From round 2 on, the AI checks his fixes first and
   * refuses to pass it on while words are still misspelled — and either way the
   * button is locked for five minutes afterwards, because each check is a real
   * AI call.
   */
  essaySubmitChecked: (essayId: string) => Promise<'sent' | 'rules' | 'spelling' | 'wait' | 'failed'>
  essayClearCheck: () => void
  /** Reviewer side: which essay the desk and the red pen are both holding. */
  essaySetDeskEssay: (essayId: string | null) => void
  /**
   * Close every machine note whose problem has visibly gone from the text. Free
   * and local — no AI, no credits. Safe to call on every open.
   */
  essayAutoResolve: (essayId: string) => void
  /**
   * Run the built-in rules (capitals, spacing, "I", …) and add whatever they
   * find. No model, no network, no waiting — these have right answers.
   */
  essayProofread: (essayId: string) => void
  /** Parent side: run the AI over the submission and add its notes. */
  essayAiReview: (essayId: string) => Promise<void>
  /** Parent side: ask the AI whether each open note was actually fixed. */
  essayAiCheckFixes: (essayId: string) => Promise<void>
  essayAddComment: (essayId: string, c: Omit<EssayComment, 'id' | 'round' | 'source' | 'status'>) => void
  essayEditComment: (essayId: string, commentId: string, text: string) => void
  /** "I disagree" — the note disappears and Ben never sees it. */
  essayDeleteComment: (essayId: string, commentId: string) => void
  /** "That's fixed" — settles one note without waiting for another round. */
  essayResolveComment: (essayId: string, commentId: string, fixed: boolean) => void
  /** Send the notes back to the writer. */
  essayReturn: (essayId: string) => void
  /** Close it out: the AI writes the grade, the writer gets the Berries. */
  essayGrade: (essayId: string) => Promise<void>
  essayMarkSeen: (essayId: string) => void
  /**
   * Bank one sitting of the word test and pay for it. Only a `final` test can
   * master a word, and a word only pays the first time — so the test can be
   * retaken forever without becoming a Berry tap. Returns the Berries paid.
   */
  essayFinishWordTest: (results: { wordId: string; right: boolean }[], final: boolean) => number
  essayDeleteWord: (wordId: string) => void
  essayDelete: (essayId: string) => void
  essayClearError: () => void

  gymSaveCatalog: (catalog: GymCatalog) => void
  /** Admin: the OpenRouter key + model the coach uses. */
  setAiConfig: (patch: Partial<AiConfig>) => void
}

function checkBadges(data: AppData, events: AppEvent[]): void {
  for (const b of newBadges(data)) {
    data.badges.push(b)
    events.push({ type: 'badge', title: b.title, emoji: b.emoji, description: b.description })
  }
}

/**
 * The top-level fields of an AppData blob that changed between two versions.
 * Compared by value (JSON), since every mutation path deep-clones the whole blob
 * and so changes identity even where nothing actually moved.
 */
function changedFields(prev: AppData, next: AppData): Partial<AppData> {
  const out: Partial<AppData> = {}
  for (const key of Object.keys(next) as (keyof AppData)[]) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[key] = next[key]
    }
  }
  return out
}

export const useStore = create<StoreState>((set, get) => {
  // Unsubscribe from the currently-watched profile doc (swapped on login/logout).
  let unsubData: (() => void) | null = null
  // Parent-only second subscription: Ben's doc (gift-card banner, official tests, grants).
  let unsubKid: (() => void) | null = null
  // Parent-only audit-log subscription (Captain's desk).
  let unsubAudit: (() => void) | null = null
  // The other crewmate's doc — always watched, so sticker trading can read their
  // album and write the swap into it when it's accepted.
  let unsubMate: (() => void) | null = null

  /**
   * Live-sync a profile's world from Firestore. The first SERVER snapshot flips
   * dataLoaded and triggers a rollover; later snapshots are cross-device updates.
   * The parent additionally watches the kid's world.
   *
   * Cached snapshots update the UI but never unlock writing. The SDK replays the
   * local copy before reaching the network, and that copy can predate another
   * device's write — acting on it (rollover, topic unlock) would push a stale
   * blob back up and delete whatever the other device just added.
   */
  function watchProfile(id: string) {
    unsubData?.()
    let first = true
    unsubData = subscribeData(id, (data, fromCache) => {
      setMuted(!data.settings.soundOn)
      // Show cached data immediately, but hold `dataLoaded` (the write gate) until
      // the server copy lands.
      set(fromCache ? { data } : { data, dataLoaded: true })
      if (first && !fromCache) {
        first = false
        get().rollover()
        // On login: one-time unlock of this profile's own default topics, and
        // keep the wheel's quiz habits in step with the unlocked topics.
        // Only write if something actually changes (avoids a no-op save every login).
        const ensure = (d: AppData) => {
          d.quiz.selfInit = true // legacy flag; the ladder below supersedes it
          syncTopicUnlocks(d, id)
          syncQuizTasks(d, id)
          // First login on this profile: drop in the trainer brief written for
          // them (age, goals, injuries). It's a starting point — every word of
          // it is editable in Gym → Coach, and we never overwrite an edit.
          if (!d.gym.brief.text.trim() && !d.gym.brief.updatedAt) d.gym.brief = seedBrief(id)
        }
        const probe: AppData = JSON.parse(JSON.stringify(get().data))
        ensure(probe)
        if (JSON.stringify(probe) !== JSON.stringify(get().data)) commit(ensure)
      }
    })
    unsubKid?.()
    unsubKid = null
    unsubAudit?.()
    unsubAudit = null
    if (id === PARENT_ID) {
      unsubKid = subscribeData(KID_ID, (data, fromCache) => set(fromCache ? { kidData: data } : { kidData: data, kidDataFresh: true }))
      // Audit trail lives on the Captain's desk only — one subscription, parent-side.
      // Prune expired rows on load (no Firestore TTL on the free plan), then live-sync.
      void pruneExpiredAudit()
      unsubAudit = subscribeAudit(200, (audit) => set({ audit }))
    }
    // The album is a two-player game: watch the other crewmate's world so we can
    // show what they can spare, and so accepting a swap can write to their album.
    unsubMate?.()
    const mateId = id === PARENT_ID ? KID_ID : PARENT_ID
    unsubMate = subscribeData(mateId, (data, fromCache) =>
      set(fromCache ? { mateAlbum: data.album, mateData: data } : { mateAlbum: data.album, mateData: data, mateDataFresh: true }),
    )
  }

  // A failed background write means the change is only in memory and will be lost
  // on refresh — never let that pass silently.
  // Not `cloudError` — that blanks the whole app, which is wrong for a single
  // failed write. A banner warns that the change is in memory only.
  setWriteErrorHandler((e) => {
    console.error('cloud write failed', e)
    set({ saveError: (e as Error)?.message ?? String(e) })
  })

  // Async bootstrap: sign in, load the roster, and (if someone's logged in here)
  // start syncing their data. Runs once at startup.
  void (async () => {
    try {
      const profiles = await loadRoster()
      set({ profiles, ready: true })
      subscribeRoster((p) => set({ profiles: p }))
      const id = getActiveProfileId()
      if (id && profiles.some((p) => p.id === id)) {
        set({ activeProfileId: id })
        watchProfile(id)
      }
      // shared question bank: seed if needed, then live-sync
      const questions = await loadQuizBank()
      set({ quizBank: questions, quizBankLoaded: true })
      subscribeQuizBank((qs) => set({ quizBank: qs, quizBankLoaded: true }))
      // shared market series (fetched monthly by the bank:market script)
      subscribeMarketData((m) => set({ market: m }))
      // shared idea list — no seeding needed, an empty doc is a valid empty list
      subscribeIdeas((ideas) => set({ ideas }))
      // shared sticker swap table (same deal — empty doc is a valid empty list)
      subscribeStickerTrades((trades) => set({ trades }))
      // shared duel board: challenges, and every move the other phone plays
      subscribeCardDuels((duels) => set({ duels }))
      // shared Chess/Checkers board — same deal, one doc for both games
      subscribeBoardGames((boardGames) => set({ boardGames }))
      // the kid's freeze asks + Dad's gifts (empty doc is a valid empty desk)
      subscribeFreezeDesk(({ requests, gifts }) => set({ freezeRequests: requests, freezeGifts: gifts }))
      // remote final tests: Dad's authorisations and the results coming back
      subscribeFinalTests((tests) => set({ finalTests: tests }))
      // the essay desk: Dad's topic list and every essay in flight
      subscribeEssays(({ topics, essays, words, wordTests }) =>
        set({ essayTopics: topics, essays, essayWords: words, essayWordTests: wordTests }),
      )
      // the shared basement (gear + exercises) and the coach's OpenRouter config
      subscribeGymCatalog((c) => set({ gymCatalog: c }))
      subscribeAiConfig((c) => set({ aiConfig: c }))
    } catch (err) {
      console.error('Firebase bootstrap failed', err)
      set({ ready: true, cloudError: (err as Error)?.message ?? 'Could not reach Firebase.' })
    }
  })()

  /** Clone-mutate-sync helper. Mutates a copy of the active profile's data and writes through to Firestore. */
  function commit(fn: (data: AppData, events: AppEvent[]) => void) {
    const id = get().activeProfileId
    if (!id || !get().dataLoaded) return // never write before the cloud copy has loaded
    const prev = get().data
    const before = prev.economy.gems
    const data: AppData = JSON.parse(JSON.stringify(prev))
    const events: AppEvent[] = []
    fn(data, events)
    set((s) => ({ data, events: [...s.events, ...events] }))
    // Write ONLY the fields this mutation touched. A full-document write would carry
    // our whole local blob up and overwrite areas another device changed in the
    // meantime. onSnapshot echoes it back; the local set keeps the UI instant.
    fireAndForget(saveDataFields(id, changedFields(prev, data)))
    auditDiff(id, id, prev, data) // append audit rows for any audited change (actor == the active login)
    // ANY Berry gain, wherever it came from (tasks, streak goals, quiz…), gets the same fly-to-topbar animation
    if (data.economy.gems > before) flyBerries(null, data.economy.gems - before)
  }

  /**
   * Mutate a specific profile's world: the active profile commits normally;
   * the admin (Diogo) can also write BEN's world through the kidData
   * subscription (official tests, grants, unlocks, "paid").
   */
  function commitFor(targetId: string, fn: (data: AppData, events: AppEvent[]) => void) {
    if (get().activeProfileId === targetId) {
      commit(fn)
      return
    }
    if (targetId !== KID_ID) return // only Ben's world can be edited from another session
    const kid = get().kidData
    // Not loaded, or loaded only from the local cache — a cached copy can predate
    // Ben's own device's writes, and writing back from it would undo them.
    if (!kid || !get().kidDataFresh) return
    const data: AppData = JSON.parse(JSON.stringify(kid))
    const events: AppEvent[] = []
    fn(data, events)
    set((s) => ({ kidData: data, events: [...s.events, ...events] }))
    fireAndForget(saveDataFields(KID_ID, changedFields(kid, data)))
    auditDiff(targetId, get().activeProfileId ?? 'unknown', kid, data) // actor = the admin acting on Ben's world
  }

  function saveTradeList(trades: StickerTrade[]) {
    set({ trades })
    fireAndForget(saveStickerTrades(trades))
  }

  /**
   * The duel fields that follow from a new position: the board itself, plus the
   * closing paperwork once it's over. Firestore rejects `undefined`, so the
   * winner/resolution keys are only added when they actually exist (a draw
   * finishes with no winner at all).
   */
  function settledFields(state: DuelState): Partial<CardDuel> {
    if (!state.over) return { state }
    const done: Partial<CardDuel> = { state, status: 'finished', resolvedAt: new Date().toISOString() }
    if (state.winnerId) done.winnerId = state.winnerId
    return done
  }

  /** Write-through for the duel board, trimmed to what the app ever shows. */
  function saveDuelList(duels: CardDuel[]) {
    const kept = duels.slice(-8)
    set({ duels: kept })
    fireAndForget(saveCardDuels(kept))
  }

  /**
   * Write-through for the Chess/Checkers board. Trimmed harder than the duels:
   * a chess position carries a 64-square array plus a move log, and the doc
   * holds both games at once.
   */
  function saveBoardList(matches: BoardMatch[]) {
    const kept = matches.slice(-6)
    set({ boardGames: kept })
    fireAndForget(saveBoardGames(kept))
  }

  /**
   * The match fields that follow from a new position: the board itself, plus the
   * closing paperwork once it's over. Firestore rejects `undefined`, so the
   * winner key is only added when someone actually won — a draw finishes with
   * `draw: true` and no winner at all.
   */
  function boardSettledFields(match: BoardMatch, state: BoardState): Partial<BoardMatch> {
    if (!state.over) return { state }
    const done: Partial<BoardMatch> = { state, status: 'finished', resolvedAt: new Date().toISOString() }
    if (state.winner) done.winnerId = state.winner === 'w' ? match.fromId : match.toId
    else done.draw = true
    return done
  }

  function saveFreezeDeskList(requests: FreezeRequest[], gifts: FreezeGift[]) {
    set({ freezeRequests: requests, freezeGifts: gifts })
    fireAndForget(saveFreezeDesk(requests, gifts))
  }

  function saveFinalTestList(tests: FinalTestAuth[]) {
    set({ finalTests: tests })
    fireAndForget(saveFinalTests(tests))
  }

  /** Patch one authorisation in the shared desk (local set + write-through). */
  function patchFinalTest(authId: string, patch: Partial<FinalTestAuth>) {
    saveFinalTestList(get().finalTests.map((t) => (t.id === authId ? { ...t, ...patch } : t)))
  }

  /**
   * Write-through for the essay desk. Capped like the other shared boards: only
   * the most recent essays stay in the doc, and a graded one has nothing left to
   * do but be read.
   */
  function saveEssayDesk(patch: Partial<EssayDesk>) {
    const now: EssayDesk = {
      topics: patch.topics ?? get().essayTopics,
      essays: (patch.essays ?? get().essays).slice(-ESSAY_CAP),
      words: (patch.words ?? get().essayWords).slice(-WORD_CAP),
      wordTests: (patch.wordTests ?? get().essayWordTests).slice(-40),
    }
    set({ essayTopics: now.topics, essays: now.essays, essayWords: now.words, essayWordTests: now.wordTests })
    fireAndForget(saveEssays(now))
  }

  /**
   * The context every essay AI call takes: the key/model config, plus the hook
   * that publishes which model is being waited on. The desk turns that into a
   * live countdown — 60 seconds of silence with no explanation is how a feature
   * gets a reputation for being broken.
   */
  function essayCtx() {
    return {
      ai: get().aiConfig,
      onAttempt: (a: EssayAttempt) => set({ essayAttempt: { ...a, startedAt: Date.now() } }),
    }
  }

  /**
   * Ask the AI whether each open note was dealt with, and fold the verdicts in.
   * Used from both ends of the loop: the parent's "check his fixes" button and
   * the writer's own send button. Returns false if the AI never answered.
   */
  async function runFixCheck(essayId: string): Promise<boolean> {
    const essay = get().essays.find((e) => e.id === essayId)
    if (!essay) return false
    const open = openComments(essay)
    if (!open.length) return true
    set({ essayBusy: 'fixes', essayError: null })
    try {
      const verdicts = await checkFixes(essayCtx(), essay, open)
      patchEssay(essayId, (e) => {
        e.comments = e.comments.map((c) => {
          const v = verdicts.find((x) => x.id === c.id)
          if (!v) return c
          const next: EssayComment = { ...c, aiVerdict: v.verdict, aiNote: v.note }
          // Spelling and capital letters close themselves — both have a right
          // answer. Everything else waits for a human to agree.
          if (v.verdict === 'fixed' && AUTO_CLOSE_ISSUES.includes(c.issue)) {
            next.status = 'fixed'
            next.resolvedAt = new Date().toISOString()
          }
          return next
        })
        return e
      })
      return true
    } catch (e) {
      set({ essayError: essayAiError(e) })
      return false
    } finally {
      set({ essayBusy: null, essayAttempt: null })
    }
  }

  /** Patch one essay in the shared desk (local set + write-through). */
  function patchEssay(essayId: string, fn: (e: Essay) => Essay) {
    saveEssayDesk({
      essays: get().essays.map((e) =>
        e.id === essayId ? { ...fn(structuredClone(e)), updatedAt: new Date().toISOString() } : e,
      ),
    })
  }

  function saveIdeaList(ideas: Idea[]) {
    set({ ideas })
    fireAndForget(saveIdeas(ideas))
  }

  function saveBank(questions: QuizQuestion[]) {
    set({ quizBank: questions })
    fireAndForget(saveQuizBank(questions))
  }

  return {
    data: defaultData(),
    profiles: seedProfiles(),
    activeProfileId: null,
    ready: false,
    dataLoaded: false,
    cloudError: null,
    saveError: null,
    dismissSaveError: () => set({ saveError: null }),
    events: [],
    quizBank: [],
    quizBankLoaded: false,
    kidData: null,
    kidDataFresh: false,
    market: null,
    ideas: [],
    trades: [],
    duels: [],
    boardGames: [],
    freezeRequests: [],
    finalTests: [],
    freezeGifts: [],
    mateAlbum: null,
    mateData: null,
    mateDataFresh: false,
    audit: [],
    qotdOpen: false,
    gymCatalog: null,
    aiConfig: null,
    essayTopics: [],
    essays: [],
    essayWords: [],
    essayWordTests: [],
    essayBusy: null,
    essayAttempt: null,
    essayError: null,
    essayCheck: null,
    essayDeskId: null,
    gymPlanning: false,
    gymFellBack: null,

    activeProfile() {
      const { profiles, activeProfileId } = get()
      return profiles.find((x) => x.id === activeProfileId) ?? null
    },

    // --- ideas (shared list; local set keeps the UI instant, onSnapshot echoes back) ---

    addIdea(text) {
      const body = text.trim()
      const me = get().activeProfile()
      if (!body || !me) return
      saveIdeaList([
        ...get().ideas,
        {
          id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text: body,
          authorId: me.id,
          authorName: me.name,
          done: false,
          createdAt: new Date().toISOString(),
        },
      ])
    },

    toggleIdea(id) {
      // doneAt is dropped rather than set to undefined — Firestore rejects undefined values
      saveIdeaList(
        get().ideas.map((i) => {
          if (i.id !== id) return i
          if (i.done) {
            const { doneAt: _drop, ...rest } = i
            return { ...rest, done: false }
          }
          return { ...i, done: true, doneAt: new Date().toISOString() }
        }),
      )
    },

    deleteIdea(id) {
      saveIdeaList(get().ideas.filter((i) => i.id !== id))
    },

    async login(profileId, pin) {
      const prof = get().profiles.find((p) => p.id === profileId)
      if (!prof || !prof.pinHash) return false
      const hash = await hashPin(pin, prof.pinSalt)
      if (hash !== prof.pinHash) return false
      setActiveProfileId(profileId)
      set({ activeProfileId: profileId, dataLoaded: false, kidDataFresh: false, mateDataFresh: false, events: [] })
      watchProfile(profileId)
      return true
    },

    async setupPin(profileId, pin) {
      const profiles = get().profiles.map((p) => ({ ...p }))
      const prof = profiles.find((p) => p.id === profileId)
      if (!prof) return
      prof.pinHash = await hashPin(pin, prof.pinSalt)
      await saveRoster(profiles)
      setActiveProfileId(profileId)
      set({ profiles, activeProfileId: profileId, dataLoaded: false, kidDataFresh: false, mateDataFresh: false, events: [] })
      watchProfile(profileId)
    },

    logout() {
      unsubData?.()
      unsubData = null
      unsubKid?.()
      unsubKid = null
      unsubAudit?.()
      unsubAudit = null
      setActiveProfileId(null)
      unsubMate?.()
      unsubMate = null
      set({
        activeProfileId: null, dataLoaded: false, data: defaultData(), events: [],
        kidData: null, kidDataFresh: false, mateData: null, mateAlbum: null, mateDataFresh: false, audit: [],
      })
    },

    popEvent: () => set((s) => ({ events: s.events.slice(1) })),
    pushEvent: (e) => set((s) => ({ events: [...s.events, e] })),

    /** Process every day that ended since we last looked: freezes burn, streaks die. */
    rollover() {
      const today = dayKey()
      const { data, activeProfileId, dataLoaded } = get()
      if (!activeProfileId || !dataLoaded) return
      // The banker keeps Ben's bank ticking even when Ben hasn't opened the app:
      // deterministic day-based sim, so whichever device catches up writes the same numbers.
      if (activeProfileId === PARENT_ID && get().kidDataFresh && get().kidData && get().kidData!.bank.lastDay < today) {
        commitFor(KID_ID, (d, events) => simulateBank(d.bank, today, (e: BankSimEvent) => events.push({ type: 'goal', ...e }), get().market))
      }
      const bankBehind = activeProfileId === KID_ID && data.bank.lastDay < today
      if (data.streak.lastRolloverDay === today && data.daily.day === today && !bankBehind) return
      commit((d, events) => {
        if (activeProfileId === KID_ID) simulateBank(d.bank, today, (e: BankSimEvent) => events.push({ type: 'goal', ...e }), get().market)
        const completedDays = new Set(d.completions.map((c) => c.day))
        const frozen = new Set(d.frozenDays.map((f) => f.day))
        // "task X was done on day Y" — required items are judged per task, per day
        const donePerDay = new Set(d.completions.map((c) => `${c.day}|${c.taskId}`))
        let missedRequired = 0
        const missedNames: string[] = []
        let cur = d.streak.lastRolloverDay ?? today
        while (cur < today) {
          // Every requirement that was live that day and never ticked off costs Berries.
          for (const t of d.tasks) {
            // a day the user volunteered for is never a miss — it was a bonus, not a duty
            if (t.doTodayDay === cur) continue
            if (!isRequiredOn(t, cur, d.completions, d.tasks) || donePerDay.has(`${cur}|${t.id}`)) continue
            const fine = requiredPenalty(t)
            if (fine === 0) continue // "until done" quests cost nothing to miss
            missedRequired += fine
            if (!missedNames.includes(t.name)) missedNames.push(t.name)
          }
          const dayDone = completedDays.has(cur) || frozen.has(cur)
          if (!dayDone && d.streak.current > 0) {
            if (d.economy.freezes > 0) {
              d.economy.freezes -= 1
              d.frozenDays.push({ day: cur })
              events.push({
                type: 'frozen',
                emoji: '🧊',
                title: 'Streak Freeze used',
                description: `You ghosted ${cur}. A freeze bravely sacrificed itself. ${d.economy.freezes} left.`,
              })
            } else {
              // no popup here — the death becomes a standing repair offer (StreakPrompts modal)
              d.streak.deadStreak = { value: d.streak.current, day: cur }
              d.streak.current = 0
            }
          }
          cur = addDays(cur, 1)
        }
        if (missedRequired > 0) {
          d.economy.gems = Math.max(0, d.economy.gems - missedRequired)
          events.push({
            type: 'penalty',
            emoji: '🪥',
            title: `Skipped the must-dos: −${missedRequired} 🪙`,
            description: `${missedNames.join(', ')} — these aren't optional, captain. Every skipped day costs exactly what doing it would have paid.`,
          })
        }
        d.streak.lastRolloverDay = today
        if (d.daily.day !== today) {
          // every pick you left hanging yesterday gets its own fine
          let penalty = 0
          const names: string[] = []
          for (const p of d.daily.pendingPicks) {
            const t = d.tasks.find((x) => x.id === p.taskId)
            if (t && !t.archived) {
              penalty += ABANDON_PENALTY[t.effort]
              names.push(t.name)
            }
          }
          if (penalty > 0) {
            d.economy.gems = Math.max(0, d.economy.gems - penalty)
            events.push({
              type: 'penalty',
              emoji: '🧾',
              title: `Nami collects the debt: −${penalty} 🪙`,
              description: `You promised ${names.length === 1 ? `"${names[0]}"` : `${names.length} quests (${names.join(', ')})`} and left them adrift. Every abandoned quest costs Berries.`,
            })
          }
          d.daily = { day: today, completionsToday: 0, respinsToday: 0, pendingPicks: [] }
        }
      })
    },

    addTask(t) {
      const parts = t.parts && t.parts > 1 ? Math.min(20, Math.floor(t.parts)) : 1
      commit((d) => {
        // Auto-split: one quest per session, each locked behind the previous one,
        // so only the next part is ever live on the wheel.
        const seriesId = parts > 1 ? crypto.randomUUID() : undefined
        let previousId: string | undefined
        for (let i = 1; i <= parts; i++) {
          const id = crypto.randomUUID()
          // part 1 keeps whatever gate the user chose; every later part waits on its predecessor
          const gate = previousId ?? t.afterTaskId
          d.tasks.push({
            id,
            name: parts > 1 ? `${t.name.trim()} (${i}/${parts})` : t.name.trim(),
            repeats: t.repeats,
            effort: t.effort,
            priority: t.priority,
            dayScope: t.dayScope,
            createdAt: new Date().toISOString(),
            archived: false,
            spinsSinceLastPicked: 0,
            timesPicked: 0,
            // omitted entirely when unset — Firestore rejects undefined values
            ...(t.dueDate ? { dueDate: t.dueDate } : {}),
            ...(t.startDate ? { startDate: t.startDate } : {}),
            ...(t.required ? { required: true } : {}),
            ...(t.required && t.onWheel ? { onWheel: true } : {}),
            ...(t.dayScope === 'custom' && t.weekDays?.length ? { weekDays: t.weekDays } : {}),
            ...(t.dayScope === 'monthdays' && t.monthDays?.length ? { monthDays: t.monthDays } : {}),
            ...(t.required && t.requiredFrom ? { requiredFrom: t.requiredFrom } : {}),
            ...(t.required && t.requiredUntil ? { requiredUntil: t.requiredUntil } : {}),
            ...(gate ? { afterTaskId: gate } : {}),
            ...(t.cooldownDays ? { cooldownDays: t.cooldownDays } : {}),
            ...(t.repeats && t.untilDone ? { untilDone: true } : {}),
            ...(t.categories?.length ? { categories: t.categories } : {}),
            ...(t.seasons?.length ? { seasons: t.seasons } : {}),
            ...(seriesId ? { seriesId, seriesPart: i, seriesTotal: parts } : {}),
          })
          previousId = id
        }
      })
    },

    finishSeriesEarly(seriesId) {
      let removed = 0
      commit((d, events) => {
        const doneIds = new Set(d.completions.map((c) => c.taskId))
        const dropping = d.tasks.filter((t) => t.seriesId === seriesId && !doneIds.has(t.id))
        if (dropping.length === 0) return
        removed = dropping.length
        const ids = new Set(dropping.map((t) => t.id))
        d.tasks = d.tasks.filter((t) => !ids.has(t.id))
        d.daily.pendingPicks = d.daily.pendingPicks.filter((p) => !ids.has(p.taskId))
        events.push({
          type: 'goal',
          emoji: '🏁',
          title: 'Done ahead of schedule!',
          description: `You called it early — ${removed} leftover part${removed > 1 ? 's' : ''} dropped. Shishishi, that's a captain's call!`,
        })
      })
      return removed
    },

    updateTask(id, patch) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === id)
        if (!t) return
        // An explicit `undefined` means "clear this field" — delete the key rather
        // than assigning undefined, which Firestore rejects.
        const row = t as unknown as Record<string, unknown>
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) delete row[k]
          else row[k] = v
        }
        // The edit can push the quest out of today (start date moved forward, day
        // scope narrowed, archived…). If so it can't stay on the plate.
        const today = dayKey()
        if (t.archived || !isAvailableOn(t, today, d.completions, d.tasks)) {
          d.daily.pendingPicks = d.daily.pendingPicks.filter((p) => p.taskId !== id)
        }
      })
    },

    deleteTask(id) {
      commit((d) => {
        d.tasks = d.tasks.filter((x) => x.id !== id)
        d.daily.pendingPicks = d.daily.pendingPicks.filter((p) => p.taskId !== id)
      })
    },

    completedTodayIds() {
      const today = dayKey()
      return new Set(get().data.completions.filter((c) => c.day === today).map((c) => c.taskId))
    },

    completeRequired(taskId) {
      const today = dayKey()
      let earned = 0
      commit((d, events) => {
        const task = d.tasks.find((t) => t.id === taskId)
        // Asked for today, or a scheduled must-do whose day passed unticked and
        // is still being carried in red — both can be ticked off right here.
        if (!task) return
        if (!isRequiredOn(task, today, d.completions, d.tasks) && missedSince(task, today, d.completions, d.tasks) === null) return
        if (d.completions.some((c) => c.day === today && c.taskId === taskId)) return // already ticked
        earned = requiredReward(task)
        d.completions.push({
          id: crypto.randomUUID(),
          taskId: task.id,
          taskName: task.name,
          effort: task.effort,
          wasUrgent: isEffectivelyUrgent(task),
          day: today,
          at: new Date().toISOString(),
          gemsEarned: earned,
          via: 'manual',
        })
        d.economy.gems += earned
        d.economy.totalGemsEarned += earned
        d.daily.completionsToday += 1
        // A one-shot requirement with a deadline is finished for good once it's
        // done — and so is a "repeat until done" one, the moment it's ticked.
        if (!task.repeats || task.untilDone) task.archived = true
        // Doing it settles any decision taken on it: a pending delay must not
        // keep the next occurrence hidden once the job is actually done.
        delete (task as unknown as Record<string, unknown>).delayedUntil

        if (d.streak.lastCompletionDay !== today) {
          d.streak.current += 1
          d.streak.lastCompletionDay = today
          d.streak.best = Math.max(d.streak.best, d.streak.current)
        }
        checkBadges(d, events)
      })
      return earned
    },

    setDoToday(taskId, on) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === taskId)
        if (!t) return
        // Firestore rejects undefined, so clearing means deleting the key.
        if (on) t.doTodayDay = dayKey()
        else delete (t as unknown as Record<string, unknown>).doTodayDay
      })
    },

    postponeRequired(taskId, days) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === taskId)
        if (!t) return
        // Push the deadline out from today, so postponing an already-late item still buys real time.
        t.requiredUntil = addDays(dayKey(), Math.max(1, days))
      })
    },

    delayRequired(taskId, days) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === taskId)
        if (!t) return
        // Counted from today, so delaying an already-late item buys real time.
        t.delayedUntil = addDays(dayKey(), Math.max(1, days))
      })
    },

    skipRequired(taskId) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === taskId)
        if (!t) return
        // Settles the past: the red carry (and today's own fine) stop here. A
        // repeating quest is back on its next scheduled day; a one-shot is over.
        t.waivedThrough = dayKey()
        delete (t as unknown as Record<string, unknown>).delayedUntil
        if (!t.repeats) t.archived = true
      })
    },

    dropRequired(taskId) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === taskId)
        if (!t) return
        // It stops being a requirement but survives as a normal wheel quest.
        t.required = false
        delete t.onWheel
        delete t.requiredFrom
        delete t.requiredUntil
      })
    },

    spin(filter) {
      const { data } = get()
      if (data.daily.pendingPicks.length >= MAX_PENDING) return 'full'
      const pendingIds = data.daily.pendingPicks.map((p) => p.taskId)
      const excluded = new Set([
        ...get().completedTodayIds(),
        ...pendingIds,
        // one study topic on the plate at a time
        ...studyLockedIds(data.tasks, pendingIds),
      ])
      const pool = eligibleTasks(data.tasks, filter, excluded, dayKey(), data.completions)
      if (pool.length === 0) return null
      const picked = pickWeighted(buildEntries(pool))
      if (TEST_DISABLE_SPIN_TRACKING) return picked
      commit((d) => {
        for (const t of d.tasks) {
          if (!pool.some((p) => p.id === t.id)) continue
          if (t.id === picked.id) {
            t.spinsSinceLastPicked = 0
            t.timesPicked += 1
          } else {
            t.spinsSinceLastPicked += 1
          }
        }
        d.daily.pendingPicks.unshift({ taskId: picked.id, via: 'wheel' })
      })
      return picked
    },

    respin(filter, replaceTaskId) {
      const { data } = get()
      const cost = respinCost(data.daily.respinsToday, data.daily.completionsToday)
      if (data.economy.gems < cost) return 'broke'
      commit((d) => {
        d.economy.gems -= cost
        d.daily.respinsToday += 1
        d.daily.pendingPicks = d.daily.pendingPicks.filter((p) => p.taskId !== replaceTaskId)
      })
      return get().spin(filter)
    },

    manualPick(taskId) {
      const { data } = get()
      if (data.daily.pendingPicks.length >= MAX_PENDING) return 'full'
      const task = data.tasks.find((t) => t.id === taskId)
      if (!task || !isAvailableOn(task, dayKey(), data.completions, data.tasks)) return 'broke'
      commit((d) => {
        d.daily.pendingPicks.unshift({ taskId, via: 'manual' })
      })
      return 'ok'
    },

    dropPendingPick(taskId) {
      commit((d) => {
        d.daily.pendingPicks = d.daily.pendingPicks.filter((p) => p.taskId !== taskId)
      })
    },

    completeTask(taskId) {
      const today = dayKey()
      let earned = 0
      commit((d, events) => {
        const task = d.tasks.find((t) => t.id === taskId)
        if (!task) return
        const first = d.daily.completionsToday === 0
        earned = rewardFor(task, first)
        const completion: Completion = {
          id: crypto.randomUUID(),
          taskId: task.id,
          taskName: task.name,
          effort: task.effort,
          wasUrgent: isEffectivelyUrgent(task),
          day: today,
          at: new Date().toISOString(),
          gemsEarned: earned,
          via: d.daily.pendingPicks.find((p) => p.taskId === taskId)?.via ?? 'manual',
        }
        d.completions.push(completion)
        d.economy.gems += earned
        d.economy.totalGemsEarned += earned
        d.daily.completionsToday += 1
        d.daily.pendingPicks = d.daily.pendingPicks.filter((p) => p.taskId !== taskId)
        // one-shots retire on completion, and so do "repeat until done" quests
        if (!task.repeats || task.untilDone) task.archived = true

        if (d.streak.lastCompletionDay !== today) {
          d.streak.current += 1
          d.streak.lastCompletionDay = today
          d.streak.best = Math.max(d.streak.best, d.streak.current)
          const goal = d.settings.streakGoal
          if (d.streak.current >= goal && !d.settings.goalsReached.includes(goal)) {
            const bonus = streakGoalBonus(goal)
            d.settings.goalsReached.push(goal)
            d.economy.gems += bonus
            d.economy.totalGemsEarned += bonus
            events.push({
              type: 'goal',
              emoji: '🏆',
              title: `Streak goal: ${goal} days!`,
              description: `+${bonus} Berries! Set a bigger goal for a bigger bounty!`,
            })
          }
        }
        checkBadges(d, events)
      })
      return earned
    },

    // --- quiz ----------------------------------------------------------------

    recordQuizAnswer(targetId, qid, correct, timeMs, rewarded) {
      const today = dayKey()
      const q = get().quizBank.find((x) => x.id === qid)
      if (!q) return 0
      let earned = 0
      commitFor(targetId, (d) => {
        const stat = d.quiz.stats[qid]
        if (rewarded && correct) {
          earned = trainingReward(q, stat, today)
          if (earned > 0) {
            d.economy.gems += earned
            d.economy.totalGemsEarned += earned
          }
        }
        const next = updatedStat(stat, correct, timeMs)
        if (rewarded && correct && earned > 0) next.lastRewardDay = today
        d.quiz.stats[qid] = next
      })
      return earned
    },

    finishQuizTest(targetId, topicId, official, results, authId) {
      const scorePct = results.length === 0 ? 0 : Math.round((results.filter((r) => r.correct).length / results.length) * 100)
      const record: QuizTestRecord = {
        id: crypto.randomUUID(),
        topicId,
        day: dayKey(),
        official,
        results,
        scorePct,
        passed: scorePct >= PASS_PCT,
      }
      let unlockedTopicId: string | undefined
      commitFor(targetId, (d, events) => {
        d.quiz.tests.push(record)
        if (d.quiz.tests.length > 60) d.quiz.tests = d.quiz.tests.slice(-60) // keep the blob small
        if (official && record.passed && !d.quiz.passedTopics.includes(topicId)) {
          d.quiz.passedTopics.push(topicId)
          // Conquered → the topic locks itself and leaves the wheel. `autoUnlocked`
          // already holds its id, so syncTopicUnlocks won't spring it back open.
          d.quiz.unlockedTopics = d.quiz.unlockedTopics.filter((id) => id !== topicId)
          d.economy.devilFruits += 1
          events.push({
            type: 'goal',
            emoji: '🍇',
            title: 'Devil Fruit won!',
            description: `Final test conquered with ${scorePct}%! A Devil Fruit joins the treasure — spend them in the Store.`,
          })
          // The reward for a pass: the next topic opens. Diogo's ladder knows its
          // own successor; Ben's flat topics just get the next locked one.
          const next = nextTopicToUnlock(d, targetId, topicId)
          if (next) {
            syncTopicUnlocks(d, targetId) // ladder bookkeeping (autoUnlocked)
            if (!d.quiz.unlockedTopics.includes(next.id)) d.quiz.unlockedTopics.push(next.id)
            if (!d.quiz.autoUnlocked?.includes(next.id)) d.quiz.autoUnlocked = [...(d.quiz.autoUnlocked ?? []), next.id]
            unlockedTopicId = next.id
            events.push({
              type: 'goal',
              emoji: next.emoji,
              title: next.level ? `LEVEL ${next.level} UNLOCKED` : 'NEW SEA UNLOCKED',
              description: `${next.title} is open. ${next.outcome ?? ''}`.trim(),
            })
          }
          // conquered topic off the wheel + any newly opened one on it
          syncQuizTasks(d, targetId)
        }
      })
      // a remotely-authorised test closes its row with the verdict → Dad's banner + push
      if (authId) {
        patchFinalTest(authId, {
          status: 'done',
          finishedAt: new Date().toISOString(),
          scorePct,
          passed: record.passed,
          unlockedTopicId,
        })
      }
      return record
    },

    finishReviewTest(targetId, topicId, results, authId) {
      const scorePct = results.length === 0 ? 0 : Math.round((results.filter((r) => r.correct).length / results.length) * 100)
      const record: QuizTestRecord = {
        id: crypto.randomUUID(),
        topicId,
        day: dayKey(),
        official: true,
        review: true,
        results,
        scorePct,
        passed: scorePct >= REVIEW_PASS_PCT,
      }
      commitFor(targetId, (d) => {
        d.quiz.tests.push(record)
        if (d.quiz.tests.length > 60) d.quiz.tests = d.quiz.tests.slice(-60)
      })
      // a failed warm-up ends the authorised run there and then — nothing was unlocked
      if (authId && !record.passed) {
        patchFinalTest(authId, {
          status: 'done',
          finishedAt: new Date().toISOString(),
          scorePct,
          passed: false,
          reviewFailed: true,
          reviewBreakdown: reviewBreakdown(get().quizBank, results),
        })
      }
      return record
    },

    // --- remote final tests --------------------------------------------------

    authorizeFinalTest(targetId, topicId, pin, note) {
      const me = get().activeProfile()
      const auth: FinalTestAuth = {
        id: `ft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        targetId,
        topicId,
        pin,
        note: note.trim(),
        fromName: me?.name ?? 'Dad',
        createdAt: new Date().toISOString(),
        status: 'pending',
      }
      // only one open authorisation per topic — a new one replaces the old
      saveFinalTestList([
        ...get().finalTests.filter(
          (t) => !(t.targetId === targetId && t.topicId === topicId && (t.status === 'pending' || t.status === 'started')),
        ),
        auth,
      ])
    },

    cancelFinalTest(authId) {
      patchFinalTest(authId, { status: 'cancelled', finishedAt: new Date().toISOString() })
    },

    postponeFinalTest(authId) {
      patchFinalTest(authId, { postponed: true })
    },

    startFinalTest(authId) {
      // burnt the moment it opens: closing the app doesn't buy a second run
      patchFinalTest(authId, { status: 'started', startedAt: new Date().toISOString() })
    },

    abandonFinalTest(authId) {
      patchFinalTest(authId, { status: 'abandoned', finishedAt: new Date().toISOString() })
    },

    ackFinalTest(authId) {
      patchFinalTest(authId, { ackAt: new Date().toISOString() })
    },

    // --- Question of the Day -------------------------------------------------

    refreshDailyQuiz() {
      const today = dayKey()
      const { data, quizBank, quizBankLoaded, dataLoaded, activeProfileId } = get()
      if (!activeProfileId || !dataLoaded || !quizBankLoaded) return
      const cur = data.quiz.daily
      if (cur && cur.day === today) return // already set up for today
      const qid = pickDailyQuestion(quizBank, data.quiz, today)
      const needsPenalty = !!cur && cur.day < today && cur.state !== 'done'
      if (!qid && !needsPenalty && !cur) return // nothing trained yet, nothing to clean up — skip the write
      commit((d, events) => {
        const prev = d.quiz.daily
        if (prev && prev.day < today && prev.state !== 'done') {
          const q = quizBank.find((x) => x.id === prev.qid)
          if (q) {
            const pen = qotdPenalty(q)
            d.economy.gems = Math.max(0, d.economy.gems - pen)
            events.push({
              type: 'penalty',
              emoji: '🕰️',
              title: `Skipped the Question of the Day: −${pen} 🪙`,
              description: 'Yesterday’s question drifted away unanswered. Catch today’s while it’s fresh, captain!',
            })
          }
        }
        if (qid) d.quiz.daily = { day: today, qid, state: 'unseen' }
        else delete d.quiz.daily
      })
    },

    openQotd: () => set({ qotdOpen: true }),
    closeQotd: () => set({ qotdOpen: false }),

    answerDailyQuiz(correct, timeMs) {
      const today = dayKey()
      const q = get().quizBank.find((x) => x.id === get().data.quiz.daily?.qid)
      if (!q) return 0
      let delta = 0
      commit((d) => {
        const dq = d.quiz.daily
        if (!dq || dq.day !== today || dq.state === 'done') return
        // it's a genuine review, so the training stats learn from it (no training Berries though)
        d.quiz.stats[q.id] = updatedStat(d.quiz.stats[q.id], correct, timeMs)
        if (correct) {
          delta = qotdReward(q)
          d.economy.gems += delta
          d.economy.totalGemsEarned += delta
        } else {
          delta = -qotdPenalty(q)
          d.economy.gems = Math.max(0, d.economy.gems + delta)
        }
        dq.state = 'done'
        dq.answeredCorrect = correct
      })
      return delta
    },

    postponeDailyQuiz() {
      commit((d) => {
        const dq = d.quiz.daily
        if (dq && dq.state === 'unseen') dq.state = 'later'
      })
      set({ qotdOpen: false })
    },

    setTopicUnlocked(targetId, topicId, unlocked) {
      commitFor(targetId, (d) => {
        const has = d.quiz.unlockedTopics.includes(topicId)
        if (unlocked && !has) d.quiz.unlockedTopics.push(topicId)
        if (!unlocked && has) d.quiz.unlockedTopics = d.quiz.unlockedTopics.filter((t) => t !== topicId)
        syncQuizTasks(d, targetId) // keep the owner's wheel habits in step with the locks
      })
    },

    setTopicPassed(targetId, topicId, passed) {
      commitFor(targetId, (d) => {
        const has = d.quiz.passedTopics.includes(topicId)
        if (has === passed) return
        if (passed) {
          // Same bookkeeping as a real pass, minus the Devil Fruit — the prize was
          // already handed over (or Dad grants it with the +1 🍇 button).
          d.quiz.passedTopics.push(topicId)
          d.quiz.unlockedTopics = d.quiz.unlockedTopics.filter((id) => id !== topicId)
          const next = nextTopicToUnlock(d, targetId, topicId)
          if (next) {
            syncTopicUnlocks(d, targetId) // ladder bookkeeping (autoUnlocked)
            if (!d.quiz.unlockedTopics.includes(next.id)) d.quiz.unlockedTopics.push(next.id)
            if (!d.quiz.autoUnlocked?.includes(next.id)) d.quiz.autoUnlocked = [...(d.quiz.autoUnlocked ?? []), next.id]
          }
        } else {
          // Undo: the topic comes back to the wheel so it can be sat again.
          d.quiz.passedTopics = d.quiz.passedTopics.filter((id) => id !== topicId)
          if (!d.quiz.unlockedTopics.includes(topicId)) d.quiz.unlockedTopics.push(topicId)
        }
        syncQuizTasks(d, targetId)
      })
    },

    grantDevilFruit(targetId, topicId) {
      commitFor(targetId, (d) => {
        d.economy.devilFruits += 1
        d.quiz.bonusFruits[topicId] = (d.quiz.bonusFruits[topicId] ?? 0) + 1
      })
    },

    revokeDevilFruit(targetId, topicId) {
      commitFor(targetId, (d) => {
        if (d.economy.devilFruits <= 0) return // nothing to take back
        d.economy.devilFruits -= 1
        d.quiz.bonusFruits[topicId] = Math.max(0, (d.quiz.bonusFruits[topicId] ?? 0) - 1)
      })
    },

    removeQuizQuestion(qid) {
      saveBank(get().quizBank.map((q) => (q.id === qid ? { ...q, status: 'removed' as const } : q)))
    },

    approveQuizQuestion(qid) {
      saveBank(get().quizBank.map((q) => (q.id === qid ? { ...q, status: 'active' as const } : q)))
    },

    // --- gift cards ----------------------------------------------------------

    buyGiftCard(itemId) {
      const me = get().activeProfileId
      if (!me) return 'broke'
      const item = prizesFor(me).find((g) => g.id === itemId)
      const d = get().data
      if (!item) return 'broke'
      if (giftCardDaysLeft(d) > 0) return 'cooldown' // 1 per 30 days; duplicates simply accumulate over months
      if (d.economy.devilFruits < item.cost) return 'broke'
      commit((b) => {
        b.economy.devilFruits -= item.cost
        b.giftcards.push({
          id: crypto.randomUUID(),
          itemId: item.id,
          label: item.label,
          cost: item.cost,
          day: dayKey(),
          at: new Date().toISOString(),
          paidAt: null,
        })
      })
      return 'ok'
    },

    markGiftCardPaid(targetId, purchaseId) {
      commitFor(targetId, (d) => {
        const p = d.giftcards.find((x) => x.id === purchaseId)
        if (p && !p.paidAt) p.paidAt = new Date().toISOString()
      })
    },

    // --- Grand Line Bank ------------------------------------------------------

    bankTransfer(from, to, amount) {
      const world = get().activeProfileId === KID_ID ? get().data : get().kidData
      const amt = round2(amount)
      if (!world || amt <= 0 || from === to) return 'broke'
      // College withdrawals can only pull HIS own contributions (Dad's match isn't his to move)
      const maxFrom = from === 'college' ? world.bank.accounts.college.deposited : world.bank.accounts[from].balance
      if (maxFrom < amt - 0.001) return 'broke'
      commitFor(KID_ID, (d) => {
        const day = dayKey()
        const src = d.bank.accounts[from]
        src.balance -= amt
        src.deposited = Math.max(0, src.deposited - amt)
        if (from === 'college') {
          // burn an equal slice of Dad's matched money — free money going up in smoke
          const burn = round2(Math.min(src.matched, amt))
          if (burn > 0) {
            src.matched = round2(src.matched - burn)
            src.balance -= burn
            pushTxn(d.bank, { day, type: 'adjust', from: 'college', amount: -burn, note: `🔥 Dad's matched ${fmt$(burn)} burned — you pulled from College` })
          }
        }
        const dst = d.bank.accounts[to]
        dst.balance += amt
        dst.deposited += amt
        pushTxn(d.bank, { day, type: 'transfer', from, to, amount: amt })
        if (to === 'college') {
          dst.balance += amt // Dad matches it 1:1
          dst.matched = round2(dst.matched + amt)
          pushTxn(d.bank, { day, type: 'match', from: 'dad', to: 'college', amount: amt, note: 'Dad matches your college deposit' })
        }
      })
      return 'ok'
    },

    bankAllocate(alloc) {
      const world = get().activeProfileId === KID_ID ? get().data : get().kidData
      if (!world) return 'bad'
      const pool = round2(world.bank.pending.amount)
      const entries = ACCOUNT_IDS.map((id) => [id, round2(alloc[id] ?? 0)] as const).filter(([, v]) => v > 0)
      const sum = round2(entries.reduce((s, [, v]) => s + v, 0))
      if (pool <= 0 || sum > pool + 0.001 || entries.some(([, v]) => v < 0)) return 'bad'
      commitFor(KID_ID, (d) => {
        const day = dayKey()
        // any unallocated remainder stays as everyday money in the Pocket Chest
        const remainder = round2(pool - sum)
        for (const [id, v] of entries) {
          const dst = d.bank.accounts[id]
          dst.balance += v
          dst.deposited += v
          pushTxn(d.bank, { day, type: 'allowance', from: 'allowance', to: id, amount: v })
          if (id === 'college') {
            dst.balance += v
            dst.matched = round2(dst.matched + v)
            pushTxn(d.bank, { day, type: 'match', from: 'dad', to: 'college', amount: v, note: 'Dad matches your college deposit' })
          }
        }
        if (remainder > 0) {
          d.bank.accounts.chequing.balance += remainder
          d.bank.accounts.chequing.deposited += remainder
          pushTxn(d.bank, { day, type: 'allowance', from: 'allowance', to: 'chequing', amount: remainder })
        }
        d.bank.pending = { amount: 0, weeks: 0, since: null }
      })
      return 'ok'
    },

    bankPayDad(amount, note) {
      const world = get().activeProfileId === KID_ID ? get().data : get().kidData
      const amt = round2(amount)
      if (!world || amt <= 0 || world.bank.accounts.chequing.balance < amt - 0.001) return 'broke'
      commitFor(KID_ID, (d) => {
        d.bank.accounts.chequing.balance -= amt
        d.bank.accounts.chequing.deposited = Math.max(0, d.bank.accounts.chequing.deposited - amt)
        pushTxn(d.bank, { day: dayKey(), type: 'payback', from: 'chequing', to: 'dad', amount: amt, note: note.trim() || undefined, ackAt: null })
      })
      return 'ok'
    },

    ackBankPayback(txnId) {
      commitFor(KID_ID, (d) => {
        const t = d.bank.txns.find((x) => x.id === txnId)
        if (t && t.type === 'payback' && !t.ackAt) t.ackAt = new Date().toISOString()
      })
    },

    setBankConfig(patch) {
      commitFor(KID_ID, (d) => {
        Object.assign(d.bank.config, patch)
      })
    },

    setBankConverter(patch) {
      commitFor(KID_ID, (d) => {
        const cur = d.bank.converter ?? { ...DEFAULT_CONVERTER }
        const { days, ...rest } = patch
        const next: BankConverterState = { ...cur, ...rest }
        // `days` is the friendly input — turn it into the concrete last day it works.
        if (days !== undefined) next.until = days > 0 ? addDays(dayKey(), days - 1) : null
        if (rest.rate !== undefined || days !== undefined) next.setAt = new Date().toISOString()
        d.bank.converter = next
      })
    },

    bankAdjust(acct, delta, note) {
      const amt = round2(delta)
      if (amt === 0) return
      commitFor(KID_ID, (d) => {
        const a = d.bank.accounts[acct]
        a.balance = Math.max(0, a.balance + amt)
        if (amt > 0) a.deposited += amt
        else a.deposited = Math.max(0, a.deposited + amt)
        pushTxn(d.bank, { day: dayKey(), type: 'adjust', to: acct, amount: amt, note: note.trim() || 'Banker adjustment' })
      })
    },

    resolveBankCrash(choice) {
      const world = get().activeProfileId === KID_ID ? get().data : get().kidData
      if (!world || !world.bank.shock.crashedDay || world.bank.shock.decision !== null) return
      commitFor(KID_ID, (d) => {
        const s = d.bank.shock
        if (!s.crashedDay || s.decision !== null) return
        if (choice === 'panic') {
          // sell EVERYTHING at the bottom — the loss becomes real and never comes back
          const a = d.bank.accounts.qqq
          const amt = round2(a.balance)
          if (amt > 0) {
            a.balance -= amt
            a.deposited = Math.max(0, a.deposited - amt)
            d.bank.accounts.chequing.balance += amt
            d.bank.accounts.chequing.deposited += amt
            pushTxn(d.bank, { day: dayKey(), type: 'transfer', from: 'qqq', to: 'chequing', amount: amt, note: 'PANIC SOLD during the crash 😱' })
          }
          s.decision = 'panic'
          s.crashedDay = null
          s.crashAmount = 0
          s.recoverDay = null
        } else {
          s.decision = 'hold'
          s.recoverDay = pickRecoverDay(dayKey())
          s.recoverTo = round2(d.bank.accounts.qqq.balance * BOUNCE_MULT) // ~6% above the pre-crash value
        }
      })
    },

    triggerBankCrash() {
      const kid = get().kidData
      if (!kid) return false
      const s = kid.bank.shock
      // unlocked only after the scripted first crash; never stack crashes on a pending decision or an armed recovery
      if (s.crashCount < 1 || s.crashedDay || s.recoverDay || !crashWorthwhile(kid.bank)) return false
      commitFor(KID_ID, (d) => {
        applyCrash(d.bank, dayKey())
      })
      return true
    },

    celebrateBankBounce() {
      if (get().activeProfileId !== KID_ID) return
      const b = get().data.bank.shock.bounce
      if (!b) return
      commit((d, events) => {
        d.bank.shock.bounce = null
        events.push({
          type: 'goal',
          emoji: '🚀📈',
          title: `It bounced back! +${fmt$(b.gain)}`,
          description: 'You HELD THE LINE through the storm and the Rocket Ship came back HIGHER. Panic sells at the bottom — patience gets the treasure!',
        })
      })
    },

    repairStreak() {
      const { data } = get()
      const dead = data.streak.deadStreak
      if (!dead) return false
      const cost = streakRepairCost(dead.value)
      if (data.economy.gems < cost) return false
      const today = dayKey()
      commit((d, events) => {
        d.economy.gems -= cost
        // freeze every uncovered day since the streak broke, so rollover won't re-kill it
        const completed = new Set(d.completions.map((c) => c.day))
        const frozen = new Set(d.frozenDays.map((f) => f.day))
        let cur = dead.day
        while (cur < today) {
          if (!completed.has(cur) && !frozen.has(cur)) d.frozenDays.push({ day: cur })
          cur = addDays(cur, 1)
        }
        d.streak.current = dead.value
        d.streak.best = Math.max(d.streak.best, dead.value)
        d.streak.deadStreak = null
        events.push({
          type: 'frozen',
          emoji: '⚡🔥',
          title: `Streak revived! (${dead.value} days)`,
          description: `Chopper worked his miracle for 🪙${cost}. Complete a quest today to keep it burning!`,
        })
      })
      return true
    },

    dismissStreakRepair() {
      commit((d) => {
        d.streak.deadStreak = null
      })
    },

    buyFreeze() {
      const { data } = get()
      if (data.economy.freezes >= MAX_FREEZES || data.economy.gems < FREEZE_COST) return false
      commit((d) => {
        d.economy.gems -= FREEZE_COST
        d.economy.freezes += 1
      })
      return true
    },

    // --- free freezes from Dad ----------------------------------------------

    askForFreeze(reason) {
      const me = get().activeProfile()
      if (!me) return 'busy'
      const { freezeRequests, freezeGifts } = get()
      if (freezeRequests.some((r) => r.status === 'pending' && r.fromId === me.id)) return 'busy'
      const req: FreezeRequest = {
        id: `freeze-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromId: me.id,
        fromName: me.name,
        reason: reason?.trim() || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      saveFreezeDeskList([...freezeRequests, req], freezeGifts)
      return 'ok'
    },

    cancelFreezeRequest() {
      const { freezeRequests, freezeGifts, activeProfileId } = get()
      saveFreezeDeskList(
        freezeRequests.filter((r) => !(r.status === 'pending' && r.fromId === activeProfileId)),
        freezeGifts,
      )
    },

    grantFreeze(count, message, requestId) {
      const n = Math.max(1, Math.floor(count))
      const giver = get().activeProfile()
      const today = dayKey()
      let revived: number | null = null

      commitFor(KID_ID, (d) => {
        // a gift deliberately overrides the shop's MAX_FREEZES cap — Dad decided
        d.economy.freezes += n
        const dead = d.streak.deadStreak
        if (!dead) return
        // same repair the kid could have bought, but free: cover every uncovered
        // day since the streak broke so rollover won't re-kill it
        const completed = new Set(d.completions.map((c) => c.day))
        const frozen = new Set(d.frozenDays.map((f) => f.day))
        let cur = dead.day
        while (cur < today) {
          if (!completed.has(cur) && !frozen.has(cur)) d.frozenDays.push({ day: cur })
          cur = addDays(cur, 1)
        }
        d.streak.current = dead.value
        d.streak.best = Math.max(d.streak.best, dead.value)
        d.streak.deadStreak = null
        revived = dead.value
      })

      const gift: FreezeGift = {
        id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        toId: KID_ID,
        fromName: giver?.name ?? 'Dad',
        count: n,
        message: message.trim(),
        revived,
        createdAt: new Date().toISOString(),
      }
      const { freezeRequests, freezeGifts } = get()
      saveFreezeDeskList(
        freezeRequests.map((r) =>
          r.id === requestId
            ? { ...r, status: 'granted' as const, resolvedAt: new Date().toISOString(), granted: n }
            : r,
        ),
        [...freezeGifts, gift],
      )
    },

    declineFreezeRequest(requestId) {
      const { freezeRequests, freezeGifts } = get()
      const req = freezeRequests.find((r) => r.id === requestId)
      // the ask was holding the streak alive — saying no is what finally zeroes it
      if (req?.fromId === KID_ID) {
        commitFor(KID_ID, (d) => {
          d.streak.deadStreak = null
          d.streak.current = 0
        })
      }
      saveFreezeDeskList(
        freezeRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'declined' as const, resolvedAt: new Date().toISOString() } : r,
        ),
        freezeGifts,
      )
    },

    markFreezeRequestSeen(requestId) {
      const { freezeRequests, freezeGifts } = get()
      saveFreezeDeskList(
        freezeRequests.map((r) => (r.id === requestId ? { ...r, seenAt: new Date().toISOString() } : r)),
        freezeGifts,
      )
    },

    markFreezeGiftSeen(giftId) {
      const { freezeRequests, freezeGifts } = get()
      saveFreezeDeskList(
        freezeRequests,
        freezeGifts.map((g) => (g.id === giftId ? { ...g, seenAt: new Date().toISOString() } : g)),
      )
    },

    async registerPushDevice() {
      try {
        const token = await enablePush()
        if (get().data.pushTokens.some((t) => t.token === token)) return null // already registered
        commit((d) => {
          d.pushTokens = [
            ...d.pushTokens,
            { token, label: deviceLabel(), addedAt: new Date().toISOString() },
          ]
        })
        return null
      } catch (err) {
        return (err as Error)?.message ?? 'Could not turn on push notifications.'
      }
    },

    // --- sticker album ------------------------------------------------------

    openPack(kind) {
      const { data } = get()
      const today = dayKey()
      if (kind === 'free' && !freePackReady(data.album, today)) return 'used'
      if (kind === 'buy' && data.economy.gems < PACK_COST) return 'broke'

      const drawn = rollPack(data.album)
      commit((d) => {
        if (kind === 'buy') d.economy.gems = Math.max(0, d.economy.gems - PACK_COST)
        else d.album.lastFreePackDay = today
        for (const id of drawn) d.album.counts[id] = (d.album.counts[id] ?? 0) + 1
        d.album.packsOpened += 1
      })
      return drawn
    },

    proposeTrade(give, want, note) {
      const me = get().activeProfile()
      const mateId = get().activeProfileId === PARENT_ID ? KID_ID : PARENT_ID
      const mate = get().profiles.find((p) => p.id === mateId)
      if (!me || !mate) return 'busy'
      if (give.length === 0 || want.length === 0 || !isBalanced(give, want)) return 'unbalanced'
      // one open offer at a time in each direction keeps the swap table readable
      if (get().trades.some((t) => t.status === 'pending' && t.fromId === me.id)) return 'busy'

      const trade: StickerTrade = {
        id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromId: me.id,
        fromName: me.name,
        toId: mate.id,
        toName: mate.name,
        give,
        want,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...(note ? { note } : {}),
      }
      saveTradeList([...get().trades, trade])
      return 'ok'
    },

    answerTrade(tradeId, accept) {
      const { trades, activeProfileId, mateData } = get()
      const trade = trades.find((t) => t.id === tradeId)
      // only the addressee can answer, and only while it's still open
      if (!trade || trade.status !== 'pending' || trade.toId !== activeProfileId) return

      if (!accept) {
        saveTradeList(
          trades.map((t) => (t.id === tradeId ? { ...t, status: 'declined' as const, resolvedAt: new Date().toISOString() } : t)),
        )
        return
      }
      // Their world hasn't loaded, or only from cache — accepting writes into their
      // doc, so a stale copy would roll back whatever they've done since.
      // The UI keeps Accept disabled until it has.
      if (!mateData || !get().mateDataFresh) return

      // Re-check both sides still hold the spares they promised — either album
      // may have changed since the offer was made (packs opened, other swaps).
      const senderOk = trade.give.every((id) => spareCount(mateData.album, id) > 0)
      const meOk = trade.want.every((id) => spareCount(get().data.album, id) > 0)
      if (!senderOk || !meOk) {
        saveTradeList(
          trades.map((t) =>
            t.id === tradeId ? { ...t, status: 'cancelled' as const, resolvedAt: new Date().toISOString() } : t,
          ),
        )
        return
      }

      // my side: hand over what they wanted, receive what they offered
      commit((d) => {
        for (const id of trade.want) d.album.counts[id] = (d.album.counts[id] ?? 0) - 1
        for (const id of trade.give) d.album.counts[id] = (d.album.counts[id] ?? 0) + 1
      })
      // their side: mirror image, written straight into their doc
      const theirs: AppData = JSON.parse(JSON.stringify(mateData))
      for (const id of trade.give) theirs.album.counts[id] = (theirs.album.counts[id] ?? 0) - 1
      for (const id of trade.want) theirs.album.counts[id] = (theirs.album.counts[id] ?? 0) + 1
      set({ mateData: theirs, mateAlbum: theirs.album })
      fireAndForget(saveDataFields(trade.fromId, { album: theirs.album })) // only their album moves in a swap
      auditDiff(trade.fromId, get().activeProfileId ?? 'unknown', mateData, theirs) // log the counterpart's album change

      saveTradeList(
        trades.map((t) => (t.id === tradeId ? { ...t, status: 'accepted' as const, resolvedAt: new Date().toISOString() } : t)),
      )
    },

    cancelTrade(tradeId) {
      const { trades, activeProfileId } = get()
      const trade = trades.find((t) => t.id === tradeId)
      if (!trade || trade.status !== 'pending' || trade.fromId !== activeProfileId) return
      saveTradeList(
        trades.map((t) => (t.id === tradeId ? { ...t, status: 'cancelled' as const, resolvedAt: new Date().toISOString() } : t)),
      )
    },

    // --- Davy Back Duel -----------------------------------------------------
    //
    // The whole match lives in the shared board doc. Each device only ever
    // writes a position it is legally allowed to reach (its own move), so the
    // last write always wins on purpose rather than by luck.

    challengeDuel(deck) {
      const me = get().activeProfile()
      const mateId = get().activeProfileId === PARENT_ID ? KID_ID : PARENT_ID
      const mate = get().profiles.find((p) => p.id === mateId)
      if (!me || !mate) return 'busy'
      if (deck.length !== DECK_SIZE) return 'deck'
      // one duel at a time between the two of them — two live boards would be chaos
      if (get().duels.some((d) => d.status === 'pending' || d.status === 'active')) return 'busy'

      saveDuelList([
        ...get().duels,
        {
          id: `duel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fromId: me.id,
          fromName: me.name,
          fromEmoji: me.emoji,
          fromDeck: deck,
          toId: mate.id,
          toName: mate.name,
          toEmoji: mate.emoji,
          toDeck: [],
          status: 'pending',
          state: null,
          createdAt: new Date().toISOString(),
          // the clock is fixed when the call goes out, so both phones play the
          // same match even if the captain moves the dial mid-duel
          moveSeconds: get().data.settings.duelMoveSeconds ?? DUEL_MOVE_SECONDS,
        },
      ])
      return 'ok'
    },

    answerChallenge(duelId, accept, deck) {
      const { duels, activeProfileId } = get()
      const duel = duels.find((d) => d.id === duelId)
      if (!duel || duel.status !== 'pending' || duel.toId !== activeProfileId) return
      if (!accept) {
        saveDuelList(
          duels.map((d) =>
            d.id === duelId ? { ...d, status: 'declined' as const, resolvedAt: new Date().toISOString() } : d,
          ),
        )
        return
      }
      if (!deck || deck.length !== DECK_SIZE) return
      // The side that accepted moves first — it's the small edge for answering the call.
      const state = startDuel(
        { profileId: duel.fromId, name: duel.fromName, emoji: duel.fromEmoji, deck: duel.fromDeck },
        { profileId: duel.toId, name: duel.toName, emoji: duel.toEmoji, deck },
        1,
      )
      saveDuelList(duels.map((d) => (d.id === duelId ? { ...d, toDeck: deck, status: 'active' as const, state } : d)))
    },

    playDuelMove(duelId, move) {
      const { duels, activeProfileId } = get()
      const duel = duels.find((d) => d.id === duelId)
      if (!duel || duel.status !== 'active' || !duel.state || duel.state.over) return
      // the board itself is the referee: only the side it says is to move may write
      if (duel.state.sides[duel.state.turn]?.profileId !== activeProfileId) return

      const state = applyMove(duel.state, move)
      if (state === duel.state) return // move wasn't legal; leave the board alone
      saveDuelList(duels.map((d) => (d.id === duelId ? { ...d, ...settledFields(state) } : d)))
    },

    resignDuel(duelId) {
      const { duels, activeProfileId } = get()
      const duel = duels.find((d) => d.id === duelId)
      if (!duel || duel.status !== 'active' || !duel.state || !activeProfileId) return
      const winner = duel.state.sides.find((s) => s.profileId !== activeProfileId)
      if (!winner) return
      const state = {
        ...duel.state,
        over: true,
        winnerId: winner.profileId,
        // seq is what the other phone's arena watches for "something happened"
        seq: (duel.state.seq ?? 0) + 1,
        log: [...duel.state.log, { by: activeProfileId, text: `🏳️ ${winner.name} wins — the other captain sailed off.` }],
      }
      saveDuelList(duels.map((d) => (d.id === duelId ? { ...d, ...settledFields(state) } : d)))
    },

    cancelDuel(duelId) {
      const { duels, activeProfileId } = get()
      const duel = duels.find((d) => d.id === duelId)
      if (!duel || duel.status !== 'pending' || duel.fromId !== activeProfileId) return
      saveDuelList(
        duels.map((d) =>
          d.id === duelId ? { ...d, status: 'cancelled' as const, resolvedAt: new Date().toISOString() } : d,
        ),
      )
    },

    saveDuelDeck(deck) {
      commit((d) => {
        d.duel.deck = deck
      })
    },

    /**
     * Both phones run this off the live board, and each one only ever banks its
     * OWN record — so a win is counted once by the winner and once as a loss by
     * the loser, no matter which device was looking when the match ended.
     * `paidAt` on the shared doc stops the Berries being paid twice.
     */
    settleDuels() {
      const { duels, activeProfileId, data, dataLoaded } = get()
      if (!activeProfileId || !dataLoaded) return
      const counted = new Set(data.duel.settled)
      const mine = duels.filter(
        (d) =>
          d.status === 'finished' &&
          (d.fromId === activeProfileId || d.toId === activeProfileId) &&
          !counted.has(d.id),
      )
      if (mine.length === 0) return

      commit((d, events) => {
        for (const duel of mine) {
          d.duel.settled = [...d.duel.settled, duel.id].slice(-20)
          if (duel.winnerId === activeProfileId) {
            d.duel.wins += 1
            d.economy.gems += DUEL_REWARD
            d.economy.totalGemsEarned += DUEL_REWARD
            events.push({
              type: 'goal',
              title: 'Card game won!',
              emoji: '🏴‍☠️',
              description: `You beat ${duel.fromId === activeProfileId ? duel.toName : duel.fromName} — +${DUEL_REWARD} Berries.`,
            })
          } else if (duel.winnerId) {
            d.duel.losses += 1
          }
        }
      })
      // `paidAt` is the shared marker of who has already counted a match; each
      // side appends its own id, so a finished board ends up naming both.
      const ids = new Set(mine.map((d) => d.id))
      saveDuelList(
        get().duels.map((d) => (ids.has(d.id) ? { ...d, paidAt: `${d.paidAt ?? ''}|${activeProfileId}` } : d)),
      )
    },

    soloPlaysLeft() {
      const { data } = get()
      const cap = data.settings.soloDuelLimit ?? SOLO_PLAY_LIMIT_DEFAULT
      const played = data.duel.soloDay === dayKey() ? data.duel.soloPlays : 0
      return Math.max(0, cap - played)
    },

    // The cap is spent when a match STARTS, not when it ends — otherwise backing
    // out of a losing board would be a free retry.
    spendSoloPlay() {
      if (get().soloPlaysLeft() <= 0) return false
      const today = dayKey()
      commit((d) => {
        const freshDay = d.duel.soloDay !== today
        d.duel.soloDay = today
        if (freshDay) {
          d.duel.soloWins = 0
          d.duel.soloPlays = 0
        }
        d.duel.soloPlays += 1
      })
      return true
    },

    recordSoloResult(won) {
      const today = dayKey()
      const { data } = get()
      const freshDay = data.duel.soloDay !== today
      const soloWins = freshDay ? 0 : data.duel.soloWins
      // Solo pays, but only for the first few wins a day — the dummy is practice,
      // not a Berry printer.
      const pay = won && soloWins < SOLO_REWARD_LIMIT ? SOLO_REWARD : 0
      commit((d) => {
        d.duel.soloDay = today
        d.duel.soloWins = soloWins + (won ? 1 : 0)
        // midnight can roll over mid-match; the new day starts with this match counted
        if (freshDay) d.duel.soloPlays = 1
        if (pay > 0) {
          d.economy.gems += pay
          d.economy.totalGemsEarned += pay
        }
      })
      return pay
    },

    // --- Chess & Checkers ---------------------------------------------------
    //
    // Deliberately the same shape as the duel above: one shared doc, the device
    // holding the move is the only one that writes, and each side banks its own
    // W/L off the finished board. The only real difference is that these games
    // can end in a DRAW, which the duel can't — so the record has a third column
    // and `winnerId` is genuinely absent rather than always set.

    challengeBoardGame(kind) {
      const { activeProfileId, profiles } = get()
      if (!activeProfileId) return 'busy'
      const me = profiles.find((p) => p.id === activeProfileId)
      const mate = profiles.find((p) => p.id !== activeProfileId)
      if (!me || !mate) return 'busy'
      // one live match PER GAME — you can have chess and checkers going at once,
      // but two chess boards between the same two people is just confusing
      if (get().boardGames.some((m) => m.kind === kind && (m.status === 'pending' || m.status === 'active'))) {
        return 'busy'
      }
      saveBoardList([
        ...get().boardGames,
        {
          id: `bg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          kind,
          fromId: me.id,
          fromName: me.name,
          fromEmoji: me.emoji,
          toId: mate.id,
          toName: mate.name,
          toEmoji: mate.emoji,
          status: 'pending',
          state: null,
          createdAt: new Date().toISOString(),
          moveSeconds: get().data.settings.boardMoveSeconds ?? BOARD_MOVE_SECONDS,
        },
      ])
      return 'ok'
    },

    answerBoardChallenge(matchId, accept) {
      const { boardGames, activeProfileId } = get()
      const match = boardGames.find((m) => m.id === matchId)
      if (!match || match.status !== 'pending' || match.toId !== activeProfileId) return
      if (!accept) {
        saveBoardList(
          boardGames.map((m) =>
            m.id === matchId ? { ...m, status: 'declined' as const, resolvedAt: new Date().toISOString() } : m,
          ),
        )
        return
      }
      // the challenger plays the light pieces, which in chess is also who moves first
      saveBoardList(
        boardGames.map((m) => (m.id === matchId ? { ...m, status: 'active' as const, state: kitFor(m.kind).create() } : m)),
      )
    },

    playBoardMove(matchId, move) {
      const { boardGames, activeProfileId } = get()
      const match = boardGames.find((m) => m.id === matchId)
      if (!match || match.status !== 'active' || !match.state || match.state.over) return
      // only the side whose turn it is may write — the guarantee that makes
      // last-write-wins safe on a shared doc
      const mySide = match.fromId === activeProfileId ? 'w' : match.toId === activeProfileId ? 'b' : null
      if (mySide !== match.state.turn) return
      const state = kitFor(match.kind).apply(match.state, move)
      if (!state) return // illegal (or a stale tap from the other phone) — leave the board alone
      saveBoardList(boardGames.map((m) => (m.id === matchId ? { ...m, ...boardSettledFields(m, state) } : m)))
    },

    resignBoardGame(matchId) {
      const { boardGames, activeProfileId } = get()
      const match = boardGames.find((m) => m.id === matchId)
      if (!match || match.status !== 'active' || !match.state || !activeProfileId) return
      const mySide = match.fromId === activeProfileId ? 'w' : match.toId === activeProfileId ? 'b' : null
      if (!mySide) return
      const state = kitFor(match.kind).resign(match.state, mySide)
      saveBoardList(boardGames.map((m) => (m.id === matchId ? { ...m, ...boardSettledFields(m, state) } : m)))
    },

    cancelBoardGame(matchId) {
      const { boardGames, activeProfileId } = get()
      const match = boardGames.find((m) => m.id === matchId)
      if (!match || match.status !== 'pending' || match.fromId !== activeProfileId) return
      saveBoardList(
        boardGames.map((m) =>
          m.id === matchId ? { ...m, status: 'cancelled' as const, resolvedAt: new Date().toISOString() } : m,
        ),
      )
    },

    settleBoardGames() {
      const { boardGames, activeProfileId, data, dataLoaded } = get()
      if (!activeProfileId || !dataLoaded) return
      const counted = new Set(data.games.settled)
      const mine = boardGames.filter(
        (m) =>
          m.status === 'finished' &&
          (m.fromId === activeProfileId || m.toId === activeProfileId) &&
          !counted.has(m.id),
      )
      if (mine.length === 0) return

      commit((d, events) => {
        for (const match of mine) {
          d.games.settled = [...d.games.settled, match.id].slice(-20)
          const record = d.games[match.kind]
          const kit = kitFor(match.kind)
          if (match.draw) {
            record.draws += 1
          } else if (match.winnerId === activeProfileId) {
            record.wins += 1
            d.economy.gems += BOARD_REWARD
            d.economy.totalGemsEarned += BOARD_REWARD
            events.push({
              type: 'goal',
              title: `${kit.title} won!`,
              emoji: kit.icon,
              description: `You beat ${match.fromId === activeProfileId ? match.toName : match.fromName} — +${BOARD_REWARD} Berries.`,
            })
          } else if (match.winnerId) {
            record.losses += 1
          }
        }
      })
      // `paidAt` is the shared marker of who has already counted a match; each
      // side appends its own id, so a finished board ends up naming both.
      const ids = new Set(mine.map((m) => m.id))
      saveBoardList(
        get().boardGames.map((m) => (ids.has(m.id) ? { ...m, paidAt: `${m.paidAt ?? ''}|${activeProfileId}` } : m)),
      )
    },

    setBoardHints(on) {
      commit((d) => {
        d.games.hints = on
      })
    },

    buyBackground() {
      const { data } = get()
      const unowned = BACKGROUND_CATALOG.filter((id) => !data.backgrounds.owned.includes(id))
      if (unowned.length === 0) return 'complete'
      if (data.economy.gems < BACKGROUND_COST) return 'broke'
      const won = unowned[Math.floor(Math.random() * unowned.length)]
      commit((d) => {
        d.economy.gems = Math.max(0, d.economy.gems - BACKGROUND_COST)
        d.backgrounds.owned.push(won)
      })
      return won
    },

    equipBackground(id) {
      commit((d) => {
        d.backgrounds.active = id !== null && d.backgrounds.owned.includes(id) ? id : null
      })
    },

    setStreakGoal(goal) {
      commit((d) => {
        d.settings.streakGoal = goal
      })
    },

    setSettings(patch) {
      commit((d) => {
        Object.assign(d.settings, patch)
        setMuted(!d.settings.soundOn)
      })
    },

    setSettingsFor(targetId, patch) {
      commitFor(targetId, (d) => {
        Object.assign(d.settings, patch)
      })
      // muting only ever applies to THIS device's own login
      if (get().activeProfileId === targetId) setMuted(!get().data.settings.soundOn)
    },

    // --- gym ----------------------------------------------------------------
    // The store never talks to OpenRouter directly: it calls coachPlan/coachSwap,
    // which ALWAYS return something (the offline planner is their failure path).
    // `gymFellBack` carries the reason so the UI can say so out loud instead of
    // pretending an offline plan came from the coach.

    async gymPlan(minutes, mood, opts) {
      const { data, gymCatalog, aiConfig, activeProfile } = get()
      set({ gymPlanning: true, gymFellBack: null })
      try {
        const { session, fellBackBecause } = await coachPlan({
          catalog: gymCatalog,
          gym: data.gym,
          minutes,
          mood,
          gearMode: opts?.gearMode,
          followUp: opts?.followUp ?? null,
          ai: aiConfig,
          name: activeProfile()?.name ?? 'the athlete',
        })
        set({ gymFellBack: fellBackBecause })
        commit((d) => {
          d.gym.active = session
        })
      } finally {
        set({ gymPlanning: false })
      }
    },

    async gymSwap(exId, reason) {
      const { data, gymCatalog, aiConfig, activeProfile } = get()
      const active = data.gym.active
      const target = active?.exercises.find((e) => e.exId === exId)
      if (!active || !target) return 'none'
      const keep = active.exercises.filter((e) => e.exId !== exId)

      set({ gymPlanning: true, gymFellBack: null })
      try {
        const replacement = await coachSwap(
          {
            catalog: gymCatalog,
            gym: data.gym,
            minutes: active.minutes,
            mood: active.mood,
            gearMode: active.gearMode,
            ai: aiConfig,
            name: activeProfile()?.name ?? 'the athlete',
            day: active.day,
          },
          target,
          keep,
          reason ?? '',
          (why) => set({ gymFellBack: why }),
        )
        if (!replacement) return 'none'
        commit((d) => {
          if (!d.gym.active) return
          d.gym.active.exercises = d.gym.active.exercises.map((e) => (e.exId === exId ? replacement : e))
        })
        return 'ok'
      } finally {
        set({ gymPlanning: false })
      }
    },

    gymDrop(exId) {
      commit((d) => {
        if (!d.gym.active) return
        d.gym.active.exercises = d.gym.active.exercises.filter((e) => e.exId !== exId)
      })
    },

    gymDeleteExercise(exId) {
      // Gone for good, for the whole crew. A starter exercise lives in the code
      // and can't be filtered out of the catalog, so it is stored back as a
      // retired override — same effect everywhere: the planner never offers it.
      const c: GymCatalog = get().gymCatalog ?? { equipment: [], exercises: [] }
      const isStarter = STARTER_EXERCISES.some((s) => s.id === exId)
      const def = exerciseById(c, exId)
      let exercises: ExerciseDef[]
      if (!isStarter) exercises = c.exercises.filter((x) => x.id !== exId)
      else if (c.exercises.some((x) => x.id === exId))
        exercises = c.exercises.map((x) => (x.id === exId ? { ...x, retired: true } : x))
      else if (def) exercises = [...c.exercises, { ...def, retired: true }]
      else exercises = c.exercises
      get().gymSaveCatalog({ ...c, exercises })
      commit((d) => {
        if (d.gym.active) d.gym.active.exercises = d.gym.active.exercises.filter((e) => e.exId !== exId)
      })
    },

    gymDiscard() {
      set({ gymFellBack: null })
      commit((d) => {
        d.gym.active = null
      })
    },

    gymStart() {
      commit((d) => {
        if (!d.gym.active) return
        d.gym.active.status = 'running'
        d.gym.active.startedAt = new Date().toISOString()
      })
    },

    gymLogSet(exId, reps, weight, sec) {
      commit((d) => {
        const s = d.gym.active
        const se = s?.exercises.find((e) => e.exId === exId)
        if (!s || !se || reps <= 0) return
        // the plan for THIS set — the target the report grades this set against.
        // Extra sets beyond the plan reuse the last prescribed one.
        const planned = se.plan.reps[Math.min(se.sets.length, se.plan.reps.length - 1)] ?? reps
        const base: LoggedSet = { reps }
        if (weight != null && weight > 0) base.weight = weight
        if (sec != null && sec > 0) base.sec = Math.round(sec)
        se.sets.push(base)
        se.skipped = false
        if (base.sec != null) {
          s.workSec = (s.workSec ?? 0) + base.sec
          s.workTargetSec = (s.workTargetSec ?? 0) + setSeconds(se.kind, planned)
        }
      })
    },

    gymUndoSet(exId) {
      commit((d) => {
        const s = d.gym.active
        const se = s?.exercises.find((e) => e.exId === exId)
        if (!s || !se) return
        const planned = se.plan.reps[Math.min(se.sets.length - 1, se.plan.reps.length - 1)]
        const gone = se.sets.pop()
        if (gone?.sec != null) {
          s.workSec = Math.max(0, (s.workSec ?? 0) - gone.sec)
          s.workTargetSec = Math.max(0, (s.workTargetSec ?? 0) - setSeconds(se.kind, planned ?? gone.reps))
        }
      })
    },

    gymLogRest(exId, seconds, targetSec) {
      commit((d) => {
        const s = d.gym.active
        const se = s?.exercises.find((e) => e.exId === exId)
        if (!s || !se) return
        // several rests inside one exercise average out — what we want to learn
        // is "how long does THIS move take him to recover from"
        se.restSec = se.restSec ? Math.round((se.restSec + seconds) / 2) : Math.round(seconds)
        s.restTotalSec = (s.restTotalSec ?? 0) + Math.round(seconds)
        s.restTargetSec = (s.restTargetSec ?? 0) + Math.round(targetSec ?? se.plan.restSec)
      })
    },

    gymRateInSession(exId, rating) {
      commit((d) => {
        const se = d.gym.active?.exercises.find((e) => e.exId === exId)
        if (se) se.rating = rating
      })
    },

    gymSkip(exId) {
      commit((d) => {
        const se = d.gym.active?.exercises.find((e) => e.exId === exId)
        if (se) se.skipped = true
      })
    },

    gymFinish(rating, feedback) {
      const catalog = get().gymCatalog
      const active = get().data.gym.active
      if (!active) return { coins: 0, session: null }
      let paid = 0
      let filed: GymSession | null = null

      commit((d, events) => {
        const s = d.gym.active
        if (!s) return
        const day = s.day
        s.status = 'done'
        s.finishedAt = new Date().toISOString()
        s.rating = rating
        s.feedback = feedback
        if (s.startedAt) s.activeSec = Math.round((Date.parse(s.finishedAt) - Date.parse(s.startedAt)) / 1000)

        let coins = 0
        let done = 0
        let prs = 0

        for (const se of s.exercises) {
          const mem = d.gym.ex[se.exId]
          const pr = isPersonalRecord(mem, se)
          se.coins = coinsForExercise(se, pr)
          coins += se.coins
          if (!se.skipped && se.sets.length > 0) {
            done += 1
            if (pr) prs += 1
          }
          // the permanent memory — this is what makes unplugging the coach possible
          d.gym.ex[se.exId] = learnFromExercise(mem, se, day)

          // rep ladders: seeded from your first honest set, then climbed; a max
          // test reseeds the whole thing from the new number
          const def = exerciseById(catalog, se.exId)
          if (def?.ladder && !se.skipped && se.sets.length > 0) {
            const best = Math.max(...se.sets.map((x) => x.reps))
            const cur = d.gym.ladders[se.exId]
            d.gym.ladders[se.exId] = cur ? advanceLadder(cur, se.ladderTest ? best : null, day) : defaultLadder(best)
          }
        }

        coins += sessionBonus(s, done)
        s.coins = coins
        paid = coins

        if (done > 0) {
          d.gym.streak = bumpStreak(d.gym.streak, day)
          d.gym.totals.sessions += 1
          d.gym.totals.minutes += Math.round((s.activeSec ?? s.minutes * 60) / 60)
          d.gym.totals.reps += s.exercises.reduce((n, e) => n + loggedReps(e), 0)
          d.gym.totals.coins += coins
          d.economy.gems += coins
          d.economy.totalGemsEarned += coins
          d.gym.sessions = [...d.gym.sessions, s].slice(-GYM_LOG_CAP)
          events.push({
            type: 'badge',
            title: prs > 0 ? `${prs} new record${prs > 1 ? 's' : ''}!` : 'Session logged',
            emoji: prs > 0 ? '🏆' : '💪',
            description: `${done} exercise${done === 1 ? '' : 's'} · +${coins} 🪙${prs > 0 ? ' · you beat your own best' : ''}`,
          })
        }
        // a plain snapshot: the report screen outlives `gym.active`
        filed = JSON.parse(JSON.stringify(s)) as GymSession
        d.gym.active = null
      })

      set({ gymFellBack: null })
      return { coins: paid, session: filed }
    },

    gymAbandon() {
      const active = get().data.gym.active
      const anyWork = !!active?.exercises.some((e) => !e.skipped && e.sets.length > 0)
      // walked out having actually lifted something: keep it, pay it, learn from
      // it. Nothing logged at all: throw it away rather than pollute the history.
      if (anyWork) return get().gymFinish(undefined, 'Left early')
      set({ gymFellBack: null })
      commit((d) => {
        d.gym.active = null
      })
      return { coins: 0, session: null }
    },

    gymSetBrief(patch) {
      commit((d) => {
        Object.assign(d.gym.brief, patch, { updatedAt: new Date().toISOString() })
      })
    },

    gymRateExercise(exId, rating) {
      commit((d) => {
        const mem = d.gym.ex[exId] ?? { timesDone: 0, totalReps: 0 }
        if (rating) {
          mem.rating = rating
          mem.ratedAt = new Date().toISOString()
        } else {
          delete mem.rating
          delete mem.ratedAt
        }
        d.gym.ex[exId] = mem
      })
    },

    gymSetExerciseNote(exId, note) {
      commit((d) => {
        const mem = d.gym.ex[exId] ?? { timesDone: 0, totalReps: 0 }
        mem.notes = note.trim() || undefined
        d.gym.ex[exId] = mem
      })
    },

    gymSetOptions(patch) {
      commit((d) => {
        Object.assign(d.gym, patch)
      })
    },

    gymSaveCatalog(catalog) {
      set({ gymCatalog: catalog })
      fireAndForget(saveGymCatalog(catalog))
    },

    // --- essays -------------------------------------------------------------
    // The desk is a shared doc, so every action here is a write-through: the
    // writer's side and the reviewer's side are literally looking at the same
    // essay. The AI calls throw on failure and the reason is kept verbatim in
    // `essayError` — a review that didn't happen must never look like one that
    // found nothing wrong.

    async essaySuggestTopics(count, steer) {
      set({ essayBusy: 'topics', essayError: null })
      try {
        // every title ever offered, kept or binned — this is what stops it looping
        const avoid = get().essayTopics.map((t) => t.title)
        return await suggestTopics(essayCtx(), count, avoid, steer)
      } catch (e) {
        set({ essayError: essayAiError(e) })
        return []
      } finally {
        set({ essayBusy: null, essayAttempt: null })
      }
    },

    essayJudgeTopic(offer, keep, source = 'ai') {
      const { essayTopics } = get()
      if (essayTopics.some((t) => t.title.toLowerCase() === offer.title.toLowerCase())) return
      const topic: EssayTopic = {
        id: crypto.randomUUID(),
        title: offer.title,
        blurb: offer.blurb,
        subject: offer.subject,
        status: keep ? 'kept' : 'rejected',
        enabled: keep, // a kept topic is live straight away; the switch is there to take it back
        minWords: DEFAULT_MIN_WORDS,
        source,
        createdAt: new Date().toISOString(),
      }
      saveEssayDesk({ topics: [...essayTopics, topic] })
    },

    /**
     * Ben asks for a topic of his own.
     *
     * It goes into the same list as everything else, so it is covered by the
     * "never offer this again" list from the moment he types it — the AI can't
     * propose an idea that is already sitting on Dad's desk. `suggested` is
     * inert: `writableTopics` ignores it, so nothing appears on his write screen
     * until the answer comes back.
     */
    essayAskTopic({ title, blurb, subject }) {
      const { essayTopics, activeProfileId } = get()
      const me = get().activeProfile()
      if (!activeProfileId || !me) return 'Sign in first.'
      const clean = title.trim().slice(0, 120)
      if (!clean) return 'Give your idea a title.'
      if (titleTaken(essayTopics, clean)) return 'That one is already on the list.'
      const room = canSuggestTopic(essayTopics, activeProfileId)
      if (!room.ok) return room.why
      const topic: EssayTopic = {
        id: crypto.randomUUID(),
        title: clean,
        blurb: blurb.trim().slice(0, 240),
        subject: subject.trim().slice(0, 40) || 'My idea',
        status: 'suggested',
        enabled: false,
        minWords: DEFAULT_MIN_WORDS,
        source: 'kid',
        createdAt: new Date().toISOString(),
        suggestedById: activeProfileId,
        suggestedByName: me.name,
      }
      saveEssayDesk({ topics: [...essayTopics, topic] })
      return ''
    },

    /**
     * The parent's answer. Approved joins the normal flow exactly as if Diogo
     * had written the topic himself — kept, enabled, same word target, same
     * everything. Turned down keeps it as a rejection, so the AI is told never
     * to offer it either.
     */
    essayDecideTopic(topicId, approve) {
      const now = new Date().toISOString()
      saveEssayDesk({
        topics: get().essayTopics.map((t) =>
          t.id === topicId
            ? { ...t, status: approve ? ('kept' as const) : ('rejected' as const), enabled: approve, decidedAt: now }
            : t,
        ),
      })
    },

    essayMarkTopicSeen(topicId) {
      saveEssayDesk({
        topics: get().essayTopics.map((t) => (t.id === topicId ? { ...t, seenAt: new Date().toISOString() } : t)),
      })
    },

    essaySetTopicEnabled(topicId, enabled) {
      saveEssayDesk({ topics: get().essayTopics.map((t) => (t.id === topicId ? { ...t, enabled } : t)) })
    },

    essaySetTopicWords(topicId, minWords) {
      const target = Math.max(30, Math.min(600, Math.round(minWords)))
      saveEssayDesk({ topics: get().essayTopics.map((t) => (t.id === topicId ? { ...t, minWords: target } : t)) })
    },

    essayDeleteTopic(topicId) {
      // Dropped from the list but NOT forgotten: it stays as a rejection so the
      // AI is still told never to offer it again.
      saveEssayDesk({
        topics: get().essayTopics.map((t) => (t.id === topicId ? { ...t, status: 'rejected' as const, enabled: false } : t)),
      })
    },

    essayStart(topicId) {
      const { essayTopics, essays, activeProfileId } = get()
      const topic = essayTopics.find((t) => t.id === topicId)
      const me = get().activeProfile()
      if (!topic || !activeProfileId || !me) return null
      // one draft per topic per writer — reopening picks up where he left off
      const existing = essays.find((e) => e.topicId === topicId && e.authorId === activeProfileId && e.status === 'writing')
      if (existing) return existing.id
      const essay = newEssay(topic, activeProfileId, me.name)
      saveEssayDesk({ essays: [...essays, essay] })
      return essay.id
    },

    essaySaveDraft(essayId, patch) {
      patchEssay(essayId, (e) => {
        if (patch.title !== undefined) e.title = patch.title.slice(0, 120)
        if (patch.paragraphs) e.paragraphs = patch.paragraphs.map((p) => p.slice(0, 4000))
        return e
      })
    },

    essaySubmit(essayId) {
      // Free and instant: the mechanical rules get their say on every hand-in,
      // so the desk always opens onto a complete list.
      get().essayProofread(essayId)
      const now = new Date().toISOString()
      patchEssay(essayId, (e) => {
        e.round += 1
        e.status = 'submitted'
        e.submittedAt = now
        // the snapshot is what the next round's fix-check compares against
        e.versions = [...e.versions, { round: e.round, title: e.title, paragraphs: [...e.paragraphs], at: now }]
        return e
      })
    },

    async essayAiReview(essayId) {
      const essay = get().essays.find((e) => e.id === essayId)
      if (!essay) return
      const topic = get().essayTopics.find((t) => t.id === essay.topicId)
      set({ essayBusy: 'review', essayError: null })
      try {
        const drafts = await reviewEssay(essayCtx(), essay, topic?.blurb ?? '')
        // Every word it caught joins the bank, right now — a word he misspelled
        // once is a word he'll misspell again, and this list is the only
        // spelling list that is actually about him.
        const known = new Set(get().essayWords.map((w) => w.correct.toLowerCase()))
        const fresh: EssayWord[] = []
        for (const d of drafts) {
          if (d.issue !== 'spelling' || !d.correct || known.has(d.correct.toLowerCase())) continue
          known.add(d.correct.toLowerCase())
          fresh.push({
            id: crypto.randomUUID(),
            typed: d.quote ?? d.correct,
            correct: d.correct,
            options: d.options ?? [],
            authorId: essay.authorId,
            fromEssayId: essayId,
            addedAt: new Date().toISOString(),
            asked: 0,
            right: 0,
          })
        }
        if (fresh.length) saveEssayDesk({ words: [...get().essayWords, ...fresh] })
        patchEssay(essayId, (e) => {
          e.comments = [
            ...e.comments,
            ...drafts.map((d: DraftComment) => ({
              ...d,
              id: crypto.randomUUID(),
              round: e.round,
              source: 'ai' as const,
              // praise is not a chore: it shows up and settles itself
              status: (d.issue === 'praise' ? 'fixed' : 'open') as EssayComment['status'],
            })),
          ]
          return e
        })
      } catch (e) {
        set({ essayError: essayAiError(e) })
      } finally {
        set({ essayBusy: null, essayAttempt: null })
      }
    },

    async essayAiCheckFixes(essayId) {
      await runFixCheck(essayId)
    },

    /**
     * The writer's own send button.
     *
     * Two gates, cheapest first. **The app's own rules go before everything** —
     * a missing capital is not worth a minute of a model's time or a trip to
     * Dad's desk, so it comes straight back to him, instantly and for free, with
     * the word "review" carefully not used. Only once the rules are clean does
     * round 2 onwards spend an AI call on the spelling, and a failed check locks
     * the button for five minutes so "send" can't be used as a spellchecker.
     */
    async essaySubmitChecked(essayId) {
      const before = get().essays.find((e) => e.id === essayId)
      if (!before) return 'sent'

      // Gate one: the rules that have right answers. Free, instant, offline, and
      // it runs on every hand-in including the very first — nothing goes to a
      // person or a model while one of these is open.
      get().essayAutoResolve(essayId)
      get().essayProofread(essayId)
      const ruled = get().essays.find((e) => e.id === essayId)
      if (ruled && openRuleNotes(ruled).length > 0) return 'rules'

      // The first hand-in has nothing to check against, and a draft with no
      // notes left open on it is just a draft. The free pass above has already
      // closed anything he visibly fixed, so most rounds end right here — no AI
      // call, no credits, no waiting.
      const settled = ruled ?? before
      if (settled.round === 0 || openComments(settled).length === 0) {
        get().essaySubmit(essayId)
        return 'sent'
      }

      if (openSpelling(settled).length === 0) {
        get().essaySubmit(essayId)
        return 'sent'
      }
      if (resendWaitMs(before) > 0) return 'wait'

      set({ essayCheck: null })
      const ok = await runFixCheck(essayId)
      // The check itself is what costs money, so the clock starts whether it
      // passed or failed.
      patchEssay(essayId, (e) => {
        e.lastCheckAt = new Date().toISOString()
        return e
      })
      if (!ok) return 'failed' // the AI never answered; the error banner says why

      const after = get().essays.find((e) => e.id === essayId)
      const stillWrong = after ? openSpelling(after).length : 0
      if (stillWrong > 0) {
        set({ essayCheck: { ok: false, stillWrong } })
        return 'spelling'
      }
      set({ essayCheck: { ok: true, stillWrong: 0 } })
      get().essaySubmit(essayId)
      return 'sent'
    },

    essayClearCheck() {
      set({ essayCheck: null })
    },

    essaySetDeskEssay(essayId) {
      set({ essayDeskId: essayId })
    },

    essayProofread(essayId) {
      const essay = get().essays.find((e) => e.id === essayId)
      if (!essay) return
      const next = syncRuleNotes(essay, Math.max(1, essay.round))
      if (!next) return // the rules say exactly what the list already says
      patchEssay(essayId, (e) => {
        e.comments = next
        return e
      })
    },

    essayAutoResolve(essayId) {
      const essay = get().essays.find((e) => e.id === essayId)
      if (!essay) return
      const resolved = autoResolve(essay)
      if (!resolved) return // nothing moved — don't write for the sake of writing
      patchEssay(essayId, (e) => {
        e.comments = resolved
        return e
      })
    },

    essayAddComment(essayId, c) {
      patchEssay(essayId, (e) => {
        e.comments = [
          ...e.comments,
          { ...c, id: crypto.randomUUID(), round: e.round, source: 'parent', status: c.issue === 'praise' ? 'fixed' : 'open' },
        ]
        return e
      })
    },

    essayEditComment(essayId, commentId, text) {
      patchEssay(essayId, (e) => {
        e.comments = e.comments.map((c) => (c.id === commentId ? { ...c, text: text.slice(0, 300), edited: true } : c))
        return e
      })
    },

    essayDeleteComment(essayId, commentId) {
      patchEssay(essayId, (e) => {
        const note = e.comments.find((c) => c.id === commentId)
        // A rule note can't just be deleted: the rules run again every time the
        // essay is opened, so it would be back within the second. Disagreeing
        // with one settles it for good instead.
        if (note?.rule) {
          e.comments = e.comments.map((c) =>
            c.id === commentId ? { ...c, status: 'fixed' as const, dismissed: true, resolvedAt: new Date().toISOString() } : c,
          )
          return e
        }
        e.comments = e.comments.filter((c) => c.id !== commentId)
        return e
      })
    },

    essayResolveComment(essayId, commentId, fixed) {
      patchEssay(essayId, (e) => {
        e.comments = e.comments.map((c) =>
          c.id === commentId
            ? { ...c, status: fixed ? 'fixed' : 'open', ...(fixed ? { resolvedAt: new Date().toISOString() } : {}) }
            : c,
        )
        return e
      })
    },

    essayReturn(essayId) {
      const now = new Date().toISOString()
      patchEssay(essayId, (e) => {
        e.status = 'returned'
        e.returnedAt = now
        return e
      })
    },

    async essayGrade(essayId) {
      const essay = get().essays.find((e) => e.id === essayId)
      if (!essay) return
      // Don't grade what we can't pay for: a grade with no Berries behind it is
      // worse than waiting ten seconds for the writer's world to finish loading.
      const canPay =
        essay.authorId === get().activeProfileId || (essay.authorId === KID_ID && !!get().kidData && get().kidDataFresh)
      if (!canPay) {
        set({ essayError: `${essay.authorName}’s world hasn’t loaded from the cloud yet — give it a moment and try again.` })
        return
      }
      set({ essayBusy: 'grade', essayError: null })
      try {
        const result = await gradeEssay(essayCtx(), essay)
        const coins = gradeCoins(result.grade)
        patchEssay(essayId, (e) => {
          e.status = 'graded'
          e.grade = result.grade
          e.gradeGood = result.good
          e.gradeImprove = result.improve
          e.coins = coins
          e.gradedAt = new Date().toISOString()
          return e
        })
        // the Berries land in the WRITER's world, whichever side is grading
        commitFor(essay.authorId, (d) => {
          d.economy.gems += coins
          d.economy.totalGemsEarned += coins
        })
      } catch (e) {
        set({ essayError: essayAiError(e) })
      } finally {
        set({ essayBusy: null, essayAttempt: null })
      }
    },

    essayMarkSeen(essayId) {
      patchEssay(essayId, (e) => {
        e.seenAt = new Date().toISOString()
        return e
      })
    },

    essayDelete(essayId) {
      saveEssayDesk({ essays: get().essays.filter((e) => e.id !== essayId) })
    },

    essayClearError() {
      set({ essayError: null })
    },

    /**
     * Bank one sitting of the word test.
     *
     * Practice changes nothing but the counters. A FINAL test can mark a word
     * mastered — the first time he picks it correctly there, and only then, it
     * pays. That is what lets the test be retaken forever without turning into
     * a Berry tap: the second correct answer for a word is worth zero.
     */
    essayFinishWordTest(results, final) {
      const now = new Date().toISOString()
      let coins = 0
      const words = get().essayWords.map((w) => {
        const r = results.find((x) => x.wordId === w.id)
        if (!r) return w
        const next: EssayWord = { ...w, asked: w.asked + 1, right: w.right + (r.right ? 1 : 0) }
        if (final && r.right && !w.masteredAt) {
          next.masteredAt = now
          coins += WORD_COIN
        }
        return next
      })

      const patch: Partial<EssayDesk> = { words }
      if (final) {
        patch.wordTests = [
          ...get().essayWordTests,
          {
            id: crypto.randomUUID(),
            at: now,
            total: results.length,
            right: results.filter((r) => r.right).length,
            coins,
          },
        ]
      }
      saveEssayDesk(patch)

      if (coins > 0) {
        commit((d) => {
          d.economy.gems += coins
          d.economy.totalGemsEarned += coins
        })
      }
      return coins
    },

    essayDeleteWord(wordId) {
      saveEssayDesk({ words: get().essayWords.filter((w) => w.id !== wordId) })
    },

    setAiConfig(patch) {
      const next = { ...(get().aiConfig ?? {}), ...patch }
      set({ aiConfig: next })
      fireAndForget(saveAiConfig(next))
    },
  }
})
