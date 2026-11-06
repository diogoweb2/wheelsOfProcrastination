// 📈 Usage analytics (§26) — turning the raw day documents into the answer to
// "what are we actually using?".
//
// Pure functions over `UsageDay[]`: no Firestore, no React, so the screen
// (`src/screens/UsageScreen.tsx`) and the terminal report (`npm run usage`)
// read the same numbers from the same code.
//
// The one that matters most is `dead`: every page the registry can route to
// that NOBODY opened in the window. That is the cleanup list.
import { APPS, appById, type AppDef, type AppTabDef } from '../apps/registry'
import { prettyDay } from './dates'
import type { UsageDay, UsageEvent } from '../types'

export const PEOPLE: Record<string, string> = {
  diogo: 'Diogo',
  ben: 'Ben',
  locked: 'Before the PIN',
}

export const whoLabel = (id: string): string => PEOPLE[id] ?? id

/** `prettyDay` that survives a row with no date yet (a page nobody opened). */
export const dayLabel = (key: string): string => (key ? prettyDay(key) : '—')

/** One tallied key: how often, by whom, on how many days, most recently when. */
export interface Row {
  /** The full counts key, e.g. `act:completeTask`. */
  key: string
  /** The readable half — what comes after the colon. */
  name: string
  count: number
  /** profileId → count. */
  by: Record<string, number>
  /** Days it happened on. */
  days: number
  /** Which days — the set `days` is counted from. Two devices share a date. */
  dates: Set<string>
  lastDate: string
}

export interface TabRow extends Row {
  app: string
  tab: string
  label: string
  seconds: number
  /** Still in `registry.ts`. False = a page that no longer exists. */
  known: boolean
}

export interface AppRow {
  id: string
  name: string
  icon: string
  img?: string
  opens: number
  seconds: number
  by: Record<string, number>
  days: number
  lastDate: string
  tabs: TabRow[]
  known: boolean
  adminOnly?: boolean
  hidden?: boolean
}

export interface PersonRow {
  id: string
  name: string
  /** Days with any event at all. */
  days: number
  seconds: number
  /** `ses:login` — times they got past the PIN. */
  logins: number
  views: number
  actions: number
  taps: number
  events: number
  /** 24 buckets, local hours. */
  hours: number[]
  devices: string[]
  firstDate: string
  lastDate: string
  apps: { id: string; name: string; icon: string; seconds: number; opens: number }[]
}

/** A page the app can still route to that nobody opened in the window (§26c). */
export interface DeadRow {
  app: string
  name: string
  icon: string
  /** Nothing in the whole app was opened — the app itself is a candidate. */
  whole: boolean
  tabs: { id: string; label: string }[]
  adminOnly?: boolean
  hidden?: boolean
}

export interface DayRow {
  date: string
  events: number
  seconds: number
  by: Record<string, number>
}

export interface Usage {
  from: string
  to: string
  /** Days that have any document at all. */
  dayCount: number
  events: number
  seconds: number
  dropped: number
  docs: number
  apps: AppRow[]
  tabs: TabRow[]
  actions: Row[]
  taps: Row[]
  people: PersonRow[]
  perDay: DayRow[]
  hours: number[]
  dead: DeadRow[]
  devices: string[]
  /** Pages that were opened but no longer exist in `registry.ts`. */
  ghosts: TabRow[]
}

// --- tallies -----------------------------------------------------------------

function blankRow(key: string): Row {
  return { key, name: key.slice(key.indexOf(':') + 1), count: 0, by: {}, days: 0, dates: new Set(), lastDate: '' }
}

/**
 * Add one day document's tally for one key. Days are collected as a SET rather
 * than counted up: the same date arrives twice whenever a person used two
 * devices, and the documents are not handed to us in date order.
 */
function bump(rows: Map<string, Row>, key: string, profileId: string, n: number, date: string): Row {
  const row = rows.get(key) ?? blankRow(key)
  if (!rows.has(key)) rows.set(key, row)
  row.count += n
  row.by[profileId] = (row.by[profileId] ?? 0) + n
  row.dates.add(date)
  if (date > row.lastDate) row.lastDate = date
  return row
}

/** Turn the date sets into counts, once everything has been added. */
function counted(rows: Iterable<Row>): Row[] {
  const out = [...rows]
  for (const row of out) row.days = row.dates.size
  return out
}

const byCount = (a: Row, b: Row) => b.count - a.count || a.name.localeCompare(b.name)

/** Every page `registry.ts` can route to, as `app-tab` → its tab definition. */
function registryRoutes(): Map<string, { app: AppDef; tab: AppTabDef }> {
  const out = new Map<string, { app: AppDef; tab: AppTabDef }>()
  for (const app of APPS) {
    for (const tab of [...app.tabs, ...(app.adminTabs ?? []), ...(app.todayTabs ?? [])]) {
      out.set(`${app.id}-${tab.id}`, { app, tab })
    }
  }
  return out
}

/** Pages with no app of their own. */
const EXTRA_LABELS: Record<string, { app: string; name: string; icon: string; tab: string; label: string }> = {
  home: { app: 'home', name: 'Home screen', icon: '🏠', tab: 'home', label: 'Icons' },
  'lock-pin': { app: 'lock', name: 'PIN screen', icon: '🔒', tab: 'pin', label: 'Lock' },
}

// --- the roll-up -------------------------------------------------------------

export function rollUsage(days: UsageDay[]): Usage {
  const routes = registryRoutes()
  const viewRows = new Map<string, Row>()
  const actionRows = new Map<string, Row>()
  const tapRows = new Map<string, Row>()
  const sessionRows = new Map<string, Row>()
  /** route → seconds, and route → profileId → seconds. */
  const seconds = new Map<string, number>()
  const secondsBy = new Map<string, Record<string, number>>()
  const perDay = new Map<string, DayRow>()
  const people = new Map<string, PersonRow>()
  /** profileId → the days they show up on (two devices share a date). */
  const personDates = new Map<string, Set<string>>()
  const hours = new Array(24).fill(0) as number[]
  const devices = new Set<string>()

  let events = 0
  let dropped = 0

  for (const day of days) {
    const pid = day.profileId
    devices.add(day.device)
    dropped += day.dropped ?? 0

    const person =
      people.get(pid) ??
      ({
        id: pid,
        name: whoLabel(pid),
        days: 0,
        seconds: 0,
        logins: 0,
        views: 0,
        actions: 0,
        taps: 0,
        events: 0,
        hours: new Array(24).fill(0) as number[],
        devices: [],
        firstDate: day.date,
        lastDate: day.date,
        apps: [],
      } satisfies PersonRow)
    people.set(pid, person)

    const dayRow = perDay.get(day.date) ?? { date: day.date, events: 0, seconds: 0, by: {} }
    perDay.set(day.date, dayRow)

    // one device-day per document, but a person can have two devices on a day
    const mineDates = personDates.get(pid) ?? new Set<string>()
    personDates.set(pid, mineDates)
    mineDates.add(day.date)
    if (day.date > person.lastDate) person.lastDate = day.date
    if (day.date < person.firstDate) person.firstDate = day.date
    if (!person.devices.includes(day.device)) person.devices.push(day.device)

    for (const [key, n] of Object.entries(day.counts ?? {})) {
      const kind = key.slice(0, key.indexOf(':'))
      const target =
        kind === 'view' ? viewRows : kind === 'act' ? actionRows : kind === 'tap' ? tapRows : sessionRows
      bump(target, key, pid, n, day.date)
      events += n
      person.events += n
      dayRow.events += n
      dayRow.by[pid] = (dayRow.by[pid] ?? 0) + n
      if (kind === 'view') person.views += n
      else if (kind === 'act') person.actions += n
      else if (kind === 'tap') person.taps += n
      else if (key === 'ses:login') person.logins += n
    }

    for (const [route, secs] of Object.entries(day.seconds ?? {})) {
      seconds.set(route, (seconds.get(route) ?? 0) + secs)
      const split = secondsBy.get(route) ?? {}
      split[pid] = (split[pid] ?? 0) + secs
      secondsBy.set(route, split)
      person.seconds += secs
      dayRow.seconds += secs
    }

    for (const [hour, n] of Object.entries(day.hours ?? {})) {
      const at = Number(hour)
      if (at >= 0 && at < 24) {
        hours[at] += n
        person.hours[at] += n
      }
    }
  }

  for (const [pid, dates] of personDates) {
    const person = people.get(pid)
    if (person) person.days = dates.size
  }
  counted(viewRows.values())
  counted(actionRows.values())
  counted(tapRows.values())
  counted(sessionRows.values())

  // --- pages, grouped into their apps ---------------------------------------
  const tabRows: TabRow[] = []
  const routeKeys = new Set([...viewRows.keys()].map((k) => k.slice(5)))
  for (const route of seconds.keys()) routeKeys.add(route)

  for (const route of routeKeys) {
    const row = viewRows.get(`view:${route}`) ?? blankRow(`view:${route}`)
    const known = routes.get(route)
    const extra = EXTRA_LABELS[route]
    const dash = route.indexOf('-')
    const appId = known?.app.id ?? extra?.app ?? (dash > 0 ? route.slice(0, dash) : route)
    const tabId = known?.tab.id ?? extra?.tab ?? (dash > 0 ? route.slice(dash + 1) : '')
    tabRows.push({
      ...row,
      app: appId,
      tab: tabId,
      label: known?.tab.label ?? extra?.label ?? (tabId || route),
      seconds: seconds.get(route) ?? 0,
      known: Boolean(known || extra),
    })
  }

  const apps: AppRow[] = []
  for (const [appId, tabs] of groupBy(tabRows, (t) => t.app)) {
    const def = appById(appId)
    const extra = Object.values(EXTRA_LABELS).find((e) => e.app === appId)
    const by: Record<string, number> = {}
    for (const t of tabs) for (const [pid, n] of Object.entries(t.by)) by[pid] = (by[pid] ?? 0) + n
    apps.push({
      id: appId,
      name: def?.name ?? extra?.name ?? appId,
      icon: def?.icon ?? extra?.icon ?? '❔',
      img: def?.img,
      opens: tabs.reduce((s, t) => s + t.count, 0),
      seconds: tabs.reduce((s, t) => s + t.seconds, 0),
      by,
      days: new Set(tabs.flatMap((t) => [...t.dates])).size,
      lastDate: tabs.map((t) => t.lastDate).sort().at(-1) ?? '',
      tabs: [...tabs].sort((a, b) => b.count - a.count || b.seconds - a.seconds),
      known: Boolean(def || extra),
      adminOnly: def?.adminOnly,
      hidden: def?.hidden,
    })
  }
  apps.sort((a, b) => b.opens - a.opens || b.seconds - a.seconds)

  // --- the cleanup list ------------------------------------------------------
  const opened = new Set(tabRows.filter((t) => t.count > 0).map((t) => `${t.app}-${t.tab}`))
  const dead: DeadRow[] = []
  for (const app of APPS) {
    const own = [...app.tabs, ...(app.adminTabs ?? []), ...(app.todayTabs ?? [])]
    const uniq = [...new Map(own.map((t) => [t.id, t])).values()]
    const cold = uniq.filter((t) => !opened.has(`${app.id}-${t.id}`))
    if (cold.length === 0) continue
    dead.push({
      app: app.id,
      name: app.name,
      icon: app.icon,
      whole: cold.length === uniq.length,
      tabs: cold.map((t) => ({ id: t.id, label: t.label })),
      adminOnly: app.adminOnly,
      hidden: app.hidden,
    })
  }
  dead.sort((a, b) => Number(b.whole) - Number(a.whole) || b.tabs.length - a.tabs.length)

  // --- per person: their own top apps ---------------------------------------
  for (const person of people.values()) {
    const mine = new Map<string, { seconds: number; opens: number }>()
    for (const tab of tabRows) {
      const opens = tab.by[person.id] ?? 0
      const secs = secondsBy.get(`${tab.app}-${tab.tab}`)?.[person.id] ?? 0
      if (!opens && !secs) continue
      const got = mine.get(tab.app) ?? { seconds: 0, opens: 0 }
      got.opens += opens
      got.seconds += secs
      mine.set(tab.app, got)
    }
    person.apps = [...mine]
      .map(([id, v]) => {
        const row = apps.find((a) => a.id === id)
        return { id, name: row?.name ?? id, icon: row?.icon ?? '❔', ...v }
      })
      .sort((a, b) => b.seconds - a.seconds || b.opens - a.opens)
  }

  const dates = [...perDay.keys()].sort()
  return {
    from: dates[0] ?? '',
    to: dates.at(-1) ?? '',
    dayCount: dates.length,
    events,
    seconds: [...seconds.values()].reduce((a, b) => a + b, 0),
    dropped,
    docs: days.length,
    apps,
    tabs: [...tabRows].sort((a, b) => b.count - a.count),
    actions: counted(actionRows.values()).sort(byCount),
    taps: counted(tapRows.values()).sort(byCount),
    people: [...people.values()].sort((a, b) => b.seconds - a.seconds || b.events - a.events),
    perDay: [...perDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    hours,
    dead,
    devices: [...devices],
    ghosts: tabRows.filter((t) => !t.known && t.count > 0).sort((a, b) => b.count - a.count),
  }
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const got = out.get(k)
    if (got) got.push(item)
    else out.set(k, [item])
  }
  return out
}

// --- formatting (shared by the screen and the terminal report) ---------------

export function minutes(seconds: number): string {
  if (seconds < 45) return '<1m'
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

/** The raw tail, newest first, with the day it belongs to. */
export function tail(days: UsageDay[], max = 400): (UsageEvent & { profileId: string; date: string })[] {
  const all = days.flatMap((d) => (d.events ?? []).map((e) => ({ ...e, profileId: d.profileId, date: d.date })))
  return all.sort((a, b) => b.t - a.t).slice(0, max)
}
