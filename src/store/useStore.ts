import { create } from 'zustand'
import type { AppData, Completion, DayScope, Effort, EffortFilter, Priority, Profile, Task } from '../types'
import {
  defaultData,
  getActiveProfileId,
  hashPin,
  seedProfiles,
  setActiveProfileId,
} from './storage'
import { loadRoster, saveData, saveRoster, subscribeData, subscribeRoster } from './cloud'
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
import { setMuted } from '../audio'

// TEMP (local testing only — do not commit as true): when set, spins are not
// registered: no pendingPicks entry, no pick counters, nothing saved to Firestore.
const TEST_DISABLE_SPIN_TRACKING = true
// TEMP (local testing only — do not commit as true): Store purchases ignore the
// Berries balance so infinite items can be bought while QA-ing.
const TEST_FREE_SHOPPING = true

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

  /**
   * Live-sync a profile's world from Firestore. First snapshot flips dataLoaded
   * and triggers a rollover; later snapshots are cross-device updates.
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
      }
    })
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
    } catch (err) {
      console.error('Firebase bootstrap failed', err)
      set({ ready: true, cloudError: (err as Error)?.message ?? 'Could not reach Firebase.' })
    }
  })()

  /** Clone-mutate-sync helper. Mutates a copy of the active profile's data and writes through to Firestore. */
  function commit(fn: (data: AppData, events: AppEvent[]) => void) {
    const id = get().activeProfileId
    if (!id || !get().dataLoaded) return // never write before the cloud copy has loaded
    const data: AppData = JSON.parse(JSON.stringify(get().data))
    const events: AppEvent[] = []
    fn(data, events)
    set((s) => ({ data, events: [...s.events, ...events] }))
    void saveData(id, data) // onSnapshot echoes it back; local set keeps the UI instant
  }

  return {
    data: defaultData(),
    profiles: seedProfiles(),
    activeProfileId: null,
    ready: false,
    dataLoaded: false,
    cloudError: null,
    events: [],

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
      setActiveProfileId(null)
      set({ activeProfileId: null, dataLoaded: false, data: defaultData(), events: [] })
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
      if (!TEST_FREE_SHOPPING && data.economy.gems < BACKGROUND_COST) return 'broke'
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
