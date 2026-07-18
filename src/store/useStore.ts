import { create } from 'zustand'
import type {
  AppData,
  Completion,
  DayScope,
  Effort,
  EffortFilter,
  Priority,
  Profile,
  QuizQuestion,
  QuizTestRecord,
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
  saveQuizBank,
  saveRoster,
  subscribeData,
  subscribeQuizBank,
  subscribeRoster,
} from './cloud'
import { addDays, dayKey } from '../logic/dates'
import { BACKGROUND_CATALOG } from '../logic/backgrounds'
import {
  ABANDON_PENALTY,
  BACKGROUND_COST,
  FREEZE_COST,
  MAX_FREEZES,
  MAX_PENDING,
  STREAK_GOAL_BONUS,
  isEffectivelyUrgent,
  manualPickCost,
  respinCost,
  rewardFor,
} from '../logic/economy'
import { buildEntries, eligibleTasks, isAvailableOn, pickWeighted } from '../logic/wheel'
import { newBadges } from '../logic/badges'
import { PASS_PCT, giftCardDaysLeft, prizesFor, syncQuizTasks, topicsFor, trainingReward, updatedStat } from '../logic/quiz'
import { flyBerries } from '../logic/fx'
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

  activeProfile: () => Profile | null
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
  }) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void

  completedTodayIds: () => Set<string>
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

  buyFreeze: () => boolean
  /** Buy a random unowned background. Returns the won catalog id, or why it failed. */
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

    activeProfile() {
      const { profiles, activeProfileId } = get()
      return profiles.find((x) => x.id === activeProfileId) ?? null
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
      if (data.streak.lastRolloverDay === today && data.daily.day === today) return
      commit((d, events) => {
        const completedDays = new Set(d.completions.map((c) => c.day))
        const frozen = new Set(d.frozenDays.map((f) => f.day))
        let cur = d.streak.lastRolloverDay ?? today
        while (cur < today) {
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
              events.push({
                type: 'streakDead',
                emoji: '💀',
                title: `RIP streak (${d.streak.current} days)`,
                description: 'It fought bravely against your couch. The couch won. Start again today.',
              })
              d.streak.current = 0
            }
          }
          cur = addDays(cur, 1)
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
        })
      })
    },

    updateTask(id, patch) {
      commit((d) => {
        const t = d.tasks.find((x) => x.id === id)
        if (t) Object.assign(t, patch)
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
            d.settings.goalsReached.push(goal)
            d.economy.gems += STREAK_GOAL_BONUS
            d.economy.totalGemsEarned += STREAK_GOAL_BONUS
            events.push({
              type: 'goal',
              emoji: '🏆',
              title: `Streak goal: ${goal} days!`,
              description: `+${STREAK_GOAL_BONUS} Berries! Set a new goal and keep the adventure going!`,
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

    buyFreeze() {
      const { data } = get()
      if (data.economy.freezes >= MAX_FREEZES || data.economy.gems < FREEZE_COST) return false
      commit((d) => {
        d.economy.gems -= FREEZE_COST
        d.economy.freezes += 1
      })
      return true
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
