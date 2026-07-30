// Turns a spoken phrase ("cut the grass every two weeks, high effort") into the
// fields TaskForm needs. Deliberately dumb keyword matching — no network, no key.
// Anything we don't recognise stays undefined so the form keeps its defaults.
import type { DayScope, Effort, Priority } from '../types'
import { addDays, dayKey, parseDay } from './dates'

export type ParsedTask = {
  name: string
  repeats?: boolean
  cooldownDays?: number
  effort?: Effort
  priority?: Priority
  required?: boolean
  dueDate?: string
  dayScope?: DayScope
  weekDays?: number[] // 0=Sun…6=Sat, only meaningful with dayScope 'custom'
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, a: 1, an: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fourteen: 14, fifteen: 15, twenty: 20, thirty: 30,
}
const NUM = '(\\d+|one|an?|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|fifteen|twenty|thirty)'

function toNumber(word: string): number {
  const n = Number(word)
  return Number.isFinite(n) ? n : (WORD_NUMBERS[word] ?? 1)
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
// "mondays", "mon", "tues", "weds"… whatever the dictation hands us.
const DAY_WORD = '(?:sun|mon|tues?|wed(?:nes)?|thurs?|fri|sat(?:ur)?)(?:day)?s?'
const DAY_LIST = `${DAY_WORD}(?:\\s*(?:,|and|&)?\\s*${DAY_WORD})*`

/** Every weekday named in a phrase like "monday, wednesday and friday" → [1,3,5]. */
function parseDayList(phrase: string): number[] {
  const days = new Set<number>()
  for (const m of phrase.matchAll(new RegExp(DAY_WORD, 'g'))) {
    const w = m[0]
    const i = WEEKDAYS.findIndex((d) => d.startsWith(w.slice(0, 3)))
    if (i >= 0) days.add(i)
  }
  return [...days].sort()
}

// Next occurrence of a weekday, always in the future (a week out if it's today).
function nextWeekday(name: string, today: string): string {
  const target = WEEKDAYS.indexOf(name)
  const cur = parseDay(today).getDay()
  const delta = (target - cur + 7) % 7
  return addDays(today, delta === 0 ? 7 : delta)
}

type Rule = { re: RegExp; apply: (m: RegExpMatchArray, out: ParsedTask, today: string) => void }

// Order matters: the more specific phrasing has to win before the loose one
// ("every other day" before "every day", "weekends" before "weekend").
const RULES: Rule[] = [
  // --- repeats / cooldown ---
  { re: /\bevery other day\b/, apply: (_m, o) => { o.repeats = true; o.cooldownDays = 1 } },
  { re: /\bevery ?day\b|\bdaily\b|\beach day\b/, apply: (_m, o) => { o.repeats = true; o.cooldownDays = 0 } },
  { re: new RegExp(`\\bevery ${NUM} days?\\b`), apply: (m, o) => { o.repeats = true; o.cooldownDays = toNumber(m[1]) } },
  { re: new RegExp(`\\b(?:every|once every) ${NUM} weeks?\\b`), apply: (m, o) => { o.repeats = true; o.cooldownDays = toNumber(m[1]) * 7 } },
  { re: new RegExp(`\\b(?:every|once every) ${NUM} months?\\b`), apply: (m, o) => { o.repeats = true; o.cooldownDays = toNumber(m[1]) * 30 } },
  { re: /\b(?:every|once a) fortnight\b|\bfortnightly\b/, apply: (_m, o) => { o.repeats = true; o.cooldownDays = 14 } },
  { re: /\bonce a week\b|\bevery week\b|\bweekly\b/, apply: (_m, o) => { o.repeats = true; o.cooldownDays = 7 } },
  { re: /\bonce a month\b|\bevery month\b|\bmonthly\b/, apply: (_m, o) => { o.repeats = true; o.cooldownDays = 30 } },
  { re: /\brepeats?\b|\bhabit\b/, apply: (_m, o) => { o.repeats = true } },
  { re: /\bone ?(?:-| )?(?:shot|off)\b|\bjust once\b/, apply: (_m, o) => { o.repeats = false } },

  // --- effort ---
  { re: /\b(?:high|hard|heavy|big|tough) (?:effort|one)\b|\b(?:high|hard|heavy|big|tough) effort\b|\bit'?s hard\b/, apply: (_m, o) => { o.effort = 'high' } },
  { re: /\b(?:medium|normal|middling) (?:effort|one)\b/, apply: (_m, o) => { o.effort = 'medium' } },
  { re: /\b(?:low|easy|quick|small|tiny) (?:effort|one)\b/, apply: (_m, o) => { o.effort = 'low' } },
  { re: /\bhigh effort\b|\bhard\b/, apply: (_m, o) => { o.effort = 'high' } },
  { re: /\bmedium\b/, apply: (_m, o) => { o.effort = 'medium' } },
  { re: /\beasy\b|\bquick\b/, apply: (_m, o) => { o.effort = 'low' } },

  // --- priority / must-do ---
  { re: /\burgent\b|\basap\b|\bimportant\b|\bright away\b/, apply: (_m, o) => { o.priority = 'urgent' } },
  { re: /\bmust ?-? ?do\b|\brequired\b|\bno excuses\b|\bevery single day no matter what\b/, apply: (_m, o) => { o.required = true } },

  // --- day scope ---
  // Hand-picked days, e.g. "every monday wednesday and friday", "on tuesdays".
  // Ahead of the deadline rules so "on Friday" reads as a schedule, not a due date.
  {
    re: new RegExp(`\\b(?:every|each|on)\\s+(${DAY_LIST})\\b`),
    apply: (m, o) => {
      const days = parseDayList(m[1])
      if (!days.length) return
      o.dayScope = 'custom'
      o.weekDays = days
      if (o.repeats === undefined) o.repeats = true
    },
  },
  { re: /\b(?:on |at )?(?:the )?weekends?\b|\bsaturdays and sundays\b/, apply: (_m, o) => { o.dayScope = 'weekends' } },
  { re: /\b(?:on )?(?:week ?days|school days)\b/, apply: (_m, o) => { o.dayScope = 'weekdays' } },

  // --- due date ---
  { re: /\b(?:due |by )?today\b/, apply: (_m, o, today) => { o.dueDate = today } },
  { re: /\b(?:due |by )?tomorrow\b/, apply: (_m, o, today) => { o.dueDate = addDays(today, 1) } },
  { re: new RegExp(`\\bin ${NUM} days?\\b`), apply: (m, o, today) => { o.dueDate = addDays(today, toNumber(m[1])) } },
  { re: new RegExp(`\\bin ${NUM} weeks?\\b`), apply: (m, o, today) => { o.dueDate = addDays(today, toNumber(m[1]) * 7) } },
  {
    re: new RegExp(`\\b(?:due |by |before |on )(?:next )?(${WEEKDAYS.join('|')})\\b`),
    apply: (m, o, today) => { o.dueDate = nextWeekday(m[1], today) },
  },
]

// Filler that's about the act of adding, not the quest itself. Stripped
// repeatedly, since "add a quest called ..." stacks several of these.
// ("make" is deliberately absent — "make the bed" is a real chore.)
const FILLER = /^(?:please|ok(?:ay)?|add|create|new|another|quest|task|chore|to ?do|called|named)\b\s*/

function cleanName(raw: string): string {
  let s = raw.replace(/[,.;]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
  s = s.replace(/\b(?:remind me to|i need to|i have to|i want to|i should)\b/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  // "a"/"an"/"the" only count as filler while they precede more filler
  // ("add a quest called X") — never as the start of the quest name itself.
  for (let i = 0; i < 6; i++) {
    const next = s.replace(FILLER, '').replace(/^(?:a|an|the)\s+(?=(?:quest|task|chore|to ?do)\b)/, '')
    if (next === s) break
    s = next
  }
  // Leftover conjunctions/prepositions the rules stranded at either end.
  s = s.replace(/^(?:and|then|but|it'?s|is|it|with|at|on|in|by|for)\b/, '').trim()
  s = s.replace(/\b(?:and|then|but|it'?s|is|it|with|at|on|in|by|for)$/, '').trim()
  if (!s) return ''
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 60)
}

export function parseSpokenTask(text: string, today: string = dayKey()): ParsedTask {
  const lower = text.toLowerCase()
  const out: ParsedTask = { name: '' }
  // Blank out each matched phrase so it can't end up in the quest name, and so a
  // later, looser rule can't re-match text an earlier rule already claimed.
  let rest = lower
  for (const rule of RULES) {
    const m = rest.match(rule.re)
    if (!m || m.index === undefined) continue
    rule.apply(m, out, today)
    rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length)
  }
  if (out.required && out.repeats === undefined) out.repeats = true
  out.name = cleanName(rest)
  return out
}

// What the rules above understand, in plain English — powers the 🎤 help sheet.
// Keep this in step with RULES when you add a phrasing.
export const VOICE_PHRASES: { emoji: string; title: string; phrases: string[] }[] = [
  {
    emoji: '🔁',
    title: 'Repeats & rest days',
    phrases: [
      '“every day” / “daily” — comes back tomorrow',
      '“every other day” — 1 rest day',
      '“every 3 days”, “every two weeks”, “every 6 months”',
      '“once a week” / “weekly” — 7 rest days',
      '“fortnightly” — 14 rest days',
      '“once a month” / “monthly” — 30 rest days',
      '“one-shot” / “just once” — no repeat',
    ],
  },
  {
    emoji: '💪',
    title: 'Effort (sets the reward)',
    phrases: [
      '“high effort”, “hard”, “big one”, “tough”',
      '“medium effort”, “normal one”',
      '“low effort”, “easy”, “quick”, “small one”',
    ],
  },
  {
    emoji: '🔥',
    title: 'Urgent & must-do',
    phrases: [
      '“urgent”, “asap”, “important” — marks it urgent',
      '“must do”, “required”, “no excuses” — skips the wheel',
    ],
  },
  {
    emoji: '📅',
    title: 'Deadlines',
    phrases: [
      '“today”, “tomorrow”',
      '“in 3 days”, “in two weeks”',
      '“by Friday”, “before Monday” — the next one coming up',
    ],
  },
  {
    emoji: '🗓️',
    title: 'Which days',
    phrases: [
      '“on weekends”',
      '“on weekdays” / “school days”',
      '“every monday, wednesday and friday” — just those days',
      '“on tuesdays” — one day a week',
    ],
  },
  {
    emoji: '✂️',
    title: 'Words I throw away',
    phrases: [
      '“add a quest called…”, “new task…”, “remind me to…”',
      'Everything left over becomes the quest name (max 60 letters).',
    ],
  },
]

export const VOICE_EXAMPLES: string[] = [
  'cut the grass every two weeks, high effort',
  'read for 10 minutes every day, must do',
  'tidy room by Friday, urgent',
  'take the bins out every week on weekends',
  'water the plants once a month, easy',
  'play video games every monday wednesday and friday, must do',
]

// One-line "here's what I heard" for the form, so a mis-parse is obvious.
export function describeParsed(p: ParsedTask): string {
  const bits: string[] = []
  if (p.required) bits.push('must-do')
  if (p.repeats) bits.push(p.cooldownDays ? `repeats, ${p.cooldownDays}d rest` : 'repeats daily')
  if (p.effort) bits.push(`${p.effort} effort`)
  if (p.priority === 'urgent') bits.push('urgent')
  if (p.weekDays?.length) bits.push(p.weekDays.map((d) => WEEKDAYS[d].slice(0, 3)).join('/'))
  else if (p.dayScope && p.dayScope !== 'all') bits.push(p.dayScope)
  if (p.dueDate) bits.push(`due ${p.dueDate}`)
  return bits.join(' · ')
}
