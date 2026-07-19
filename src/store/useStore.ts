import { create } from 'zustand'
import type {
  AlbumState,
  AppData,
  BankAccountId,
  BankConfig,
  BankConverterState,
  Completion,
  DayScope,
  Effort,
  EffortFilter,
  Idea,
  MarketData,
  Priority,
  Profile,
  QuizQuestion,
  QuizTestRecord,
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
  saveData,
  saveIdeas,
  saveQuizBank,
  saveRoster,
  saveStickerTrades,
  subscribeData,
  subscribeIdeas,
  subscribeStickerTrades,
  subscribeMarketData,
  subscribeQuizBank,
  subscribeRoster,
} from './cloud'
import { addDays, dayKey } from '../logic/dates'
import { BACKGROUND_CATALOG } from '../logic/backgrounds'
import { PACK_COST, freePackReady, isBalanced, rollPack, spareCount } from '../logic/album'
import {
  ABANDON_PENALTY,
  BACKGROUND_COST,
  FREEZE_COST,
  MAX_FREEZES,
  MAX_PENDING,
  isEffectivelyUrgent,
  manualPickCost,
  respinCost,
  rewardFor,
  requiredPenalty,
  requiredReward,
  streakGoalBonus,
  streakRepairCost,
} from '../logic/economy'
import { buildEntries, eligibleTasks, isAvailableOn, isRequiredOn, pickWeighted } from '../logic/wheel'
import { newBadges } from '../logic/badges'
import { PASS_PCT, giftCardDaysLeft, prizesFor, syncQuizTasks, topicsFor, trainingReward, updatedStat } from '../logic/quiz'
import { flyBerries } from '../logic/fx'
import { ACCOUNT_IDS, BOUNCE_MULT, DEFAULT_CONVERTER, applyCrash, armFirstShock, crashWorthwhile, fmt$, pickRecoverDay, pushTxn, round2, simulateBank, type BankSimEvent } from '../logic/bank'
import { setMuted } from '../audio'

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
  cloudError: string | null // set if Firestore/auth can't be reached
  events: AppEvent[]
  quizBank: QuizQuestion[] // shared question bank (app/quizBank), live-synced
  quizBankLoaded: boolean
  kidData: AppData | null // Ben's world, live-synced while the PARENT is logged in (banner, official tests, grants)
  market: MarketData | null // shared XGRO/QQQ return series, live-synced; drives realistic daily moves
  ideas: Idea[] // shared wishlist (app/ideas), live-synced — both crewmates read and write it
  trades: StickerTrade[] // shared sticker swaps (app/stickerTrades), live-synced
  mateAlbum: AlbumState | null // the OTHER crewmate's album, live-synced — powers "cards they can spare for you"
  mateData: AppData | null // their whole world; kept so accepting a swap can write their album back intact

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
    effort: Effort
    priority: Priority
    dueDate?: string
    startDate?: string
    dayScope: DayScope
    required?: boolean
    requiredFrom?: string
    requiredUntil?: string
  }) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void

  completedTodayIds: () => Set<string>
  /** Tick a required checklist item off for today (pays the reduced flat reward). */
  completeRequired: (taskId: string) => number
  /** Last-day escape hatch: push a requirement's deadline out by `days`. */
  postponeRequired: (taskId: string, days: number) => void
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
  /** Store a finished final test for `targetId`. Official pass → topic checkmark + one-time Devil Fruit. */
  finishQuizTest: (targetId: string, topicId: string, official: boolean, results: { qid: string; correct: boolean }[]) => QuizTestRecord
  setTopicUnlocked: (targetId: string, topicId: string, unlocked: boolean) => void // admin
  grantDevilFruit: (targetId: string, topicId: string) => void // admin bonus 🍇
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

  buyBackground: () => string | 'broke' | 'complete'
  /** Equip an owned background as the app background; null = default solid color. */
  equipBackground: (id: string | null) => void
  setStreakGoal: (goal: number) => void
  setSettings: (patch: Partial<AppData['settings']>) => void
}

function checkBadges(data: AppData, events: AppEvent[]): void {
  for (const b of newBadges(data)) {
    data.badges.push(b)
    events.push({ type: 'badge', title: b.title, emoji: b.emoji, description: b.description })
  }
}

export const useStore = create<StoreState>((set, get) => {
  // Unsubscribe from the currently-watched profile doc (swapped on login/logout).
  let unsubData: (() => void) | null = null
  // Parent-only second subscription: Ben's doc (gift-card banner, official tests, grants).
  let unsubKid: (() => void) | null = null
  // The other crewmate's doc — always watched, so sticker trading can read their
  // album and write the swap into it when it's accepted.
  let unsubMate: (() => void) | null = null

  /**
   * Live-sync a profile's world from Firestore. First snapshot flips dataLoaded
   * and triggers a rollover; later snapshots are cross-device updates.
   * The parent additionally watches the kid's world.
   */
  function watchProfile(id: string) {
    unsubData?.()
    let first = true
    unsubData = subscribeData(id, (data) => {
      setMuted(!data.settings.soundOn)
      set({ data, dataLoaded: true })
      if (first) {
        first = false
        get().rollover()
        // On login: one-time unlock of this profile's own default topics, and
        // keep the wheel's quiz habits in step with the unlocked topics.
        // Only write if something actually changes (avoids a no-op save every login).
        const ensure = (d: AppData) => {
          if (!d.quiz.selfInit) {
            for (const t of topicsFor(id)) {
              if (!t.comingSoon && !d.quiz.unlockedTopics.includes(t.id)) d.quiz.unlockedTopics.push(t.id)
            }
            d.quiz.selfInit = true
          }
          syncQuizTasks(d, id)
        }
        const probe: AppData = JSON.parse(JSON.stringify(get().data))
        ensure(probe)
        if (JSON.stringify(probe) !== JSON.stringify(get().data)) commit(ensure)
      }
    })
    unsubKid?.()
    unsubKid = null
    if (id === PARENT_ID) {
      unsubKid = subscribeData(KID_ID, (data) => set({ kidData: data }))
    }
    // The album is a two-player game: watch the other crewmate's world so we can
    // show what they can spare, and so accepting a swap can write to their album.
    unsubMate?.()
    const mateId = id === PARENT_ID ? KID_ID : PARENT_ID
    unsubMate = subscribeData(mateId, (data) => set({ mateAlbum: data.album, mateData: data }))
  }

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
    } catch (err) {
      console.error('Firebase bootstrap failed', err)
      set({ ready: true, cloudError: (err as Error)?.message ?? 'Could not reach Firebase.' })
    }
  })()

  /** Clone-mutate-sync helper. Mutates a copy of the active profile's data and writes through to Firestore. */
  function commit(fn: (data: AppData, events: AppEvent[]) => void) {
    const id = get().activeProfileId
    if (!id || !get().dataLoaded) return // never write before the cloud copy has loaded
    const before = get().data.economy.gems
    const data: AppData = JSON.parse(JSON.stringify(get().data))
    const events: AppEvent[] = []
    fn(data, events)
    set((s) => ({ data, events: [...s.events, ...events] }))
    void saveData(id, data) // onSnapshot echoes it back; local set keeps the UI instant
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
    if (!kid) return // not loaded yet — admin UI disables these actions until it is
    const data: AppData = JSON.parse(JSON.stringify(kid))
    const events: AppEvent[] = []
    fn(data, events)
    set((s) => ({ kidData: data, events: [...s.events, ...events] }))
    void saveData(KID_ID, data)
  }

  function saveTradeList(trades: StickerTrade[]) {
    set({ trades })
    void saveStickerTrades(trades)
  }

  function saveIdeaList(ideas: Idea[]) {
    set({ ideas })
    void saveIdeas(ideas)
  }

  function saveBank(questions: QuizQuestion[]) {
    set({ quizBank: questions })
    void saveQuizBank(questions)
  }

  return {
    data: defaultData(),
    profiles: seedProfiles(),
    activeProfileId: null,
    ready: false,
    dataLoaded: false,
    cloudError: null,
    events: [],
    quizBank: [],
    quizBankLoaded: false,
    kidData: null,
    market: null,
    ideas: [],
    trades: [],
    mateAlbum: null,
    mateData: null,

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
      set({ activeProfileId: profileId, dataLoaded: false, events: [] })
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
      set({ profiles, activeProfileId: profileId, dataLoaded: false, events: [] })
      watchProfile(profileId)
    },

    logout() {
      unsubData?.()
      unsubData = null
      unsubKid?.()
      unsubKid = null
      setActiveProfileId(null)
      set({ activeProfileId: null, dataLoaded: false, data: defaultData(), events: [], kidData: null })
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
      if (activeProfileId === PARENT_ID && get().kidData && get().kidData!.bank.lastDay < today) {
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
            if (!isRequiredOn(t, cur) || donePerDay.has(`${cur}|${t.id}`)) continue
            missedRequired += requiredPenalty(t)
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
      commit((d) => {
        d.tasks.push({
          id: crypto.randomUUID(),
          name: t.name.trim(),
          repeats: t.repeats,
          effort: t.effort,
          priority: t.priority,
          dueDate: t.dueDate || undefined,
          startDate: t.startDate || undefined,
          dayScope: t.dayScope,
          createdAt: new Date().toISOString(),
          archived: false,
          spinsSinceLastPicked: 0,
          timesPicked: 0,
          // omitted entirely when unset — Firestore rejects undefined values
          ...(t.required ? { required: true } : {}),
          ...(t.required && t.requiredFrom ? { requiredFrom: t.requiredFrom } : {}),
          ...(t.required && t.requiredUntil ? { requiredUntil: t.requiredUntil } : {}),
        })
      })
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
        if (!task || !isRequiredOn(task, today)) return
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
        // A one-shot requirement with a deadline is finished for good once it's done.
        if (!task.repeats) task.archived = true

        if (d.streak.lastCompletionDay !== today) {
          d.streak.current += 1
          d.streak.lastCompletionDay = today
          d.streak.best = Math.max(d.streak.best, d.streak.current)
        }
        checkBadges(d, events)
      })
      return earned
    },

    postponeRequired(taskId, days) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === taskId)
        if (!t) return
        // Push the deadline out from today, so postponing an already-late item still buys real time.
        t.requiredUntil = addDays(dayKey(), Math.max(1, days))
      })
    },

    dropRequired(taskId) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === taskId)
        if (!t) return
        // It stops being a requirement but survives as a normal wheel quest.
        t.required = false
        delete t.requiredFrom
        delete t.requiredUntil
      })
    },

    spin(filter) {
      const { data } = get()
      if (data.daily.pendingPicks.length >= MAX_PENDING) return 'full'
      const excluded = new Set([...get().completedTodayIds(), ...data.daily.pendingPicks.map((p) => p.taskId)])
      const pool = eligibleTasks(data.tasks, filter, excluded)
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
      if (!task || !isAvailableOn(task, dayKey())) return 'broke'
      const cost = manualPickCost(task)
      if (data.economy.gems < cost) return 'broke'
      commit((d) => {
        d.economy.gems -= cost
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
        if (!task.repeats) task.archived = true

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

    finishQuizTest(targetId, topicId, official, results) {
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
      commitFor(targetId, (d, events) => {
        d.quiz.tests.push(record)
        if (d.quiz.tests.length > 60) d.quiz.tests = d.quiz.tests.slice(-60) // keep the blob small
        if (official && record.passed && !d.quiz.passedTopics.includes(topicId)) {
          d.quiz.passedTopics.push(topicId)
          d.economy.devilFruits += 1
          events.push({
            type: 'goal',
            emoji: '🍇',
            title: 'Devil Fruit won!',
            description: `Final test conquered with ${scorePct}%! A Devil Fruit joins the treasure — spend them in the Store.`,
          })
        }
      })
      return record
    },

    setTopicUnlocked(targetId, topicId, unlocked) {
      commitFor(targetId, (d) => {
        const has = d.quiz.unlockedTopics.includes(topicId)
        if (unlocked && !has) d.quiz.unlockedTopics.push(topicId)
        if (!unlocked && has) d.quiz.unlockedTopics = d.quiz.unlockedTopics.filter((t) => t !== topicId)
        syncQuizTasks(d, targetId) // keep the owner's wheel habits in step with the locks
      })
    },

    grantDevilFruit(targetId, topicId) {
      commitFor(targetId, (d) => {
        d.economy.devilFruits += 1
        d.quiz.bonusFruits[topicId] = (d.quiz.bonusFruits[topicId] ?? 0) + 1
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
        if (to === 'qqq') armFirstShock(d.bank, day, Math.random()) // first QQQ money quietly starts the crash countdown
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
          if (id === 'qqq') armFirstShock(d.bank, day, Math.random())
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
        if (acct === 'qqq' && amt > 0) armFirstShock(d.bank, dayKey(), Math.random())
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
      if (!mateData) return // their world hasn't loaded; the UI keeps Accept disabled until it has

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
      void saveData(trade.fromId, theirs)

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
  }
})
