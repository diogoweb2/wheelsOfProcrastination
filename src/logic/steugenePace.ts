// 📅 St. Eugene 7 — the calendar (§24x).
//
// The curriculum map (`steugene.ts`) knows WHAT the year contains and in what
// order. This file knows WHEN: that the year ends on a Friday in late June,
// that History's window shuts at the end of January, that Geography cannot
// start before February, and that nobody is in class over Christmas.
//
// It exists to answer one question out loud — "are we going to get through
// this by June, and if not, what should we do tonight?" — because that is the
// question that was being answered by feel.

import {
  SE_CAN_MIN_ATTEMPTS,
  SE_CAN_MIN_RATE,
  SE_SUBJECTS,
  seNowBySubtopic,
  seSubtopicsOf,
  type SeTerm,
} from './steugene'
import type { SeAnswer, SeFixLock, SeStat } from '../types'

/** Weeks nobody is in class. Month-day, so they hold for any school year. */
const BREAKS: { from: [number, number]; to: [number, number] }[] = [
  { from: [11, 20], to: [0, 3] }, // winter: 20 Dec → 3 Jan
  { from: [2, 13], to: [2, 21] }, // March break
]

/** The Tuesday after the first Monday in September — the first day back. */
function firstDayBack(year: number): number {
  const d = new Date(year, 8, 1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  d.setDate(d.getDate() + 1)
  return d.getTime()
}

/** The last Friday in June — the last day of school. */
function lastDayOut(year: number): number {
  const d = new Date(year, 5, 30)
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1)
  return d.getTime()
}

export interface SeSchoolYear {
  start: number
  end: number
  /** Geography opens. */
  term2: number
  /** History shuts. */
  term1End: number
  /** "2026–27" */
  label: string
}

/**
 * The school year that TODAY sits in. August onwards is the new year; July
 * still belongs to the one that just finished, so the report does not wipe
 * itself the morning after the last day.
 */
export function seSchoolYear(now: number = Date.now()): SeSchoolYear {
  const d = new Date(now)
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1
  return {
    start: firstDayBack(y),
    end: lastDayOut(y + 1),
    term2: new Date(y + 1, 1, 1).getTime(),
    term1End: new Date(y + 1, 0, 31).getTime(),
    label: `${y}–${String((y + 1) % 100).padStart(2, '0')}`,
  }
}

/**
 * Weeks of school between two dates — breaks taken out.
 *
 * This is the number everything else divides by, so counting the Christmas
 * fortnight as working time would quietly make every target too easy.
 */
export function seSchoolWeeks(from: number, to: number): number {
  if (to <= from) return 0
  let days = 0
  // Stepped with setDate, not `+= 86_400_000`: adding a fixed day across a
  // clock change drifts the time by an hour, and a drifted midnight counts one
  // calendar day twice or not at all.
  for (const d = new Date(from); d.getTime() < to; d.setDate(d.getDate() + 1)) {
    const m = d.getMonth()
    const day = d.getDate()
    const off = BREAKS.some(({ from: f, to: u }) =>
      f[0] > u[0] // the range wraps the new year
        ? (m === f[0] && day >= f[1]) || (m === u[0] && day <= u[1])
        : m === f[0] && day >= f[1] && day <= u[1],
    )
    if (!off) days++
  }
  return days / 7
}

/** When a subject is taught: Term 1 shuts in January, Term 2 opens in February. */
export function seWindow(term: SeTerm, year: SeSchoolYear): { from: number; to: number } {
  if (term === 'term1') return { from: year.start, to: year.term1End }
  if (term === 'term2') return { from: year.term2, to: year.end }
  return { from: year.start, to: year.end }
}

export type SePaceState =
  /** Every chapter finished. */
  | 'done'
  | 'ahead'
  | 'on-track'
  | 'behind'
  /** The window has not opened — Geography before February. */
  | 'not-yet'
  /** The window closed with chapters still in it. */
  | 'shut'

/** One subtopic's place on the map. */
export type SeDot = 'done' | 'started' | 'todo'

export interface SePace {
  subjectId: string
  name: string
  emoji: string
  term: SeTerm
  /** Every subtopic, in teaching order, as a dot. */
  dots: SeDot[]
  total: number
  done: number
  started: number
  /** How many should be behind him by today. Rounded for display. */
  due: number
  /** Weeks of school left before this subject's window shuts. */
  weeksLeft: number
  /** Chapters a week from here to hit the end of the window. */
  perWeek: number
  /** Inside its window right now — Geography is not, until February, and
   *  History is not, after January. */
  open: boolean
  /** The window has closed. Nothing more can be due. */
  shut: boolean
  state: SePaceState
}

/** A finished chapter, by the same bar as "what I can do" (§24r). */
function isDone(now: { asked: number; right: number } | undefined, stat: SeStat | undefined): boolean {
  const asked = now?.asked ?? stat?.attempts ?? 0
  const right = now?.asked ? now.right : (stat?.right ?? 0)
  if (asked < SE_CAN_MIN_ATTEMPTS) return false
  return right / asked >= SE_CAN_MIN_RATE
}

/**
 * Where he is, and where the calendar says he should be — per subject.
 *
 * `due` spreads a subject evenly across its own window, which is not how a
 * class teaches but IS how you tell in October whether June is reachable.
 * Deliberately not a grade and never shown as a percentage of him: it is a
 * percentage of the YEAR, and the year is the thing with the deadline.
 */
export function sePaceBySubject(
  stats: Record<string, SeStat>,
  history: SeAnswer[],
  locks: SeFixLock[],
  now: number = Date.now(),
): SePace[] {
  const year = seSchoolYear(now)
  const nowBy = seNowBySubtopic(history, locks)
  return SE_SUBJECTS.map((subject) => {
    const subs = seSubtopicsOf(subject.id)
    const dots: SeDot[] = subs.map((s) => {
      const stat = stats[s.id]
      if (isDone(nowBy[s.id], stat)) return 'done'
      return stat && stat.attempts > 0 ? 'started' : 'todo'
    })
    const done = dots.filter((d) => d === 'done').length
    const started = dots.filter((d) => d === 'started').length
    const win = seWindow(subject.term, year)
    const span = seSchoolWeeks(win.from, win.to)
    const gone = seSchoolWeeks(win.from, Math.min(now, win.to))
    // A window CLOSES as well as opens. History is taught Sept–January; in
    // June it is not "behind", it is over, and telling me to pick it up
    // tonight would be advice about a term that has finished.
    const open = now >= win.from && now <= win.to
    const shut = now > win.to
    const share = span > 0 ? Math.min(1, Math.max(0, gone / span)) : 0
    const due = Math.round(subs.length * share)
    const weeksLeft = seSchoolWeeks(Math.max(now, win.from), win.to)
    const left = subs.length - done
    const state: SePaceState =
      done >= subs.length
        ? 'done'
        : now < win.from
          ? 'not-yet'
          : shut
            ? 'shut'
            : done >= due + 1
              ? 'ahead'
              : done >= due - 1
                ? 'on-track'
                : 'behind'
    return {
      subjectId: subject.id,
      name: subject.name,
      emoji: subject.emoji,
      term: subject.term,
      dots,
      total: subs.length,
      done,
      started,
      due,
      weeksLeft,
      perWeek: weeksLeft > 0 ? left / weeksLeft : left,
      open,
      shut,
      state,
    }
  })
}

export interface SePlanOfYear {
  year: SeSchoolYear
  /** Weeks of school left before the last day. */
  weeksLeft: number
  /** Chapters not finished, across every subject. */
  left: number
  /** Minutes one chapter costs HIM — measured, not assumed. */
  minutesEach: number
  /** Minutes a week to finish the map by the last day. */
  minutesPerWeek: number
  /** Measured from his own finished chapters, or still the default guess. */
  measured: boolean
  /** The subject to pick up next: open, and the hardest to still finish. */
  pickUp: SePace | null
  /** Open, behind, and running out of window — the one with a deadline. */
  closing: SePace | null
  /** Windows that shut with chapters still unfinished. Nothing to plan, but
   *  not nothing to know. */
  missed: SePace[]
  /** Nothing left in the whole map. */
  allDone: boolean
}

/** Before he has finished anything, assume a chapter is two sittings. */
export const SE_MINUTES_PER_SUBTOPIC = 45

/**
 * The whole year in one line: how much is left, how fast that is, and what to
 * open tonight.
 *
 * `minutesEach` is measured off his own clock (§24d) — the honest-estimates
 * rule from the gym: a plan built on how fast he SHOULD go is a plan that
 * quietly runs out of year.
 */
export function sePlanOfYear(
  stats: Record<string, SeStat>,
  history: SeAnswer[],
  locks: SeFixLock[],
  now: number = Date.now(),
): SePlanOfYear {
  const paces = sePaceBySubject(stats, history, locks, now)
  const year = seSchoolYear(now)
  const weeksLeft = seSchoolWeeks(Math.max(now, year.start), year.end)
  const left = paces.reduce((n, p) => n + (p.total - p.done), 0)
  const doneAll = paces.reduce((n, p) => n + p.done, 0)
  const seconds = Object.values(stats).reduce((n, s) => n + s.seconds, 0)
  const measured = doneAll > 0 && seconds > 0
  const minutesEach = measured ? Math.round(seconds / 60 / doneAll) : SE_MINUTES_PER_SUBTOPIC
  const openNow = paces.filter((p) => p.open)
  // A window that SHUTS outranks a window that is merely behind. In October
  // maths needs more chapters a week than History does, but History has to be
  // finished by the end of January and maths has until June — so the thing to
  // do tonight is History, and a model that only looked at "furthest behind"
  // would say the opposite right up to the week it became impossible.
  const closing =
    [...openNow]
      .filter((p) => p.state === 'behind' && p.weeksLeft <= 20 && p.total > p.done)
      .sort((a, b) => a.weeksLeft - b.weeksLeft)[0] ?? null
  const pickUp = closing ?? [...openNow].sort((a, b) => b.perWeek - a.perWeek)[0] ?? null
  return {
    year,
    weeksLeft,
    left,
    minutesEach,
    // Below a week there is no weekly rate worth quoting — a hundred chapters
    // over the last two days is a true number and useless advice, so the
    // screen says what is left and when the year ends instead.
    minutesPerWeek: weeksLeft >= 1 ? Math.round((left * minutesEach) / weeksLeft) : left * minutesEach,
    measured,
    pickUp,
    closing,
    missed: paces.filter((p) => p.state === 'shut'),
    allDone: left === 0,
  }
}

// --- showing up (§24x) --------------------------------------------------------

export interface SeShowUp {
  /** Days in a row, counting back from today (or yesterday, if today is young). */
  streak: number
  /** Separate days he has ever worked. */
  days: number
  /** Questions answered, ever. */
  answers: number
  /** Missed, then got right later — the number that means he learned something. */
  fixed: number
}

const key = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * What he has done, as four numbers he can read in a second.
 *
 * The report had none of this: it opened on his worst chapter, which is the
 * right page for me and the wrong one for him. The app pays no coins for
 * schoolwork on purpose (§24), so "you turned up nine days" is the only
 * currency it has.
 */
export function seShowUp(history: SeAnswer[], now: number = Date.now()): SeShowUp {
  const days = new Set(history.map((a) => key(a.at)))
  let streak = 0
  // A day only breaks the streak once it is over: at 4pm he has not missed
  // today yet, so start counting from whichever of today/yesterday he worked.
  const cursor = new Date(now)
  if (!days.has(key(now))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(key(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  const wrongOnce = new Set<string>()
  const fixed = new Set<string>()
  for (const a of history) {
    if (a.right) {
      if (wrongOnce.has(a.id)) fixed.add(a.id)
    } else wrongOnce.add(a.id)
  }
  return { streak, days: days.size, answers: history.length, fixed: fixed.size }
}
