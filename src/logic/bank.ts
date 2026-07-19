// Grand Line Bank — real CAD dollars, Ben's allowance world.
// The bank lives inside BEN's AppData; Diogo is the banker (config + log + adjustments).
// Simulation is deterministic per calendar day (seeded by the day string), so any
// device that catches the bank up computes the exact same numbers.
//
// Design (v2): NO auto-invest / auto-split — Ben decides every dollar himself so
// the habit forms. Three chests + the College/RESP one. Market moves come from a
// monthly-fetched real series (see scripts/bank-market.mjs); we fall back to the
// admin's monthly-rate estimate when the series is missing.
import type { BankAccountId, BankConfig, BankConverterState, BankState, BankTxn, MarketData } from '../types'
import { addDays, dayKey, daysUntil, parseDay } from './dates'

// Real admin fees (MER, %/year) — buying/selling itself is free, like we promised.
export const XGRO_MER = 0.2
export const QQQ_MER = 0.2

// Fallback daily volatility (σ, % of balance) when there's no live market series.
const XGRO_DAILY_VOL = 0.5
const QQQ_DAILY_VOL = 1.1

const HISTORY_DAYS = 30
const MAX_TXNS = 250

// The Shock Test: a scripted QQQ market correction.
export const CRASH_PCT = 20 // −20% overnight
export const BOUNCE_MULT = 1.325 // undoes the −20% and lands ~6% higher — holding must WIN
const CRASH_MIN_DAYS = 21 // first auto-crash arms 3–5 weeks after the first QQQ deposit
const CRASH_SPREAD_DAYS = 14
const RECOVER_MIN_DAYS = 14 // held positions finish bouncing back 2–3 weeks after the decision
const RECOVER_SPREAD_DAYS = 8
const CRASH_MIN_BALANCE = 0.5 // don't waste the lesson on pennies

export const ACCOUNT_IDS: BankAccountId[] = ['chequing', 'xgro', 'qqq', 'college']
export const INVEST_IDS: BankAccountId[] = ['xgro', 'qqq'] // freely movable growth chests

/**
 * HIS money only. Two separate Dad contributions are excluded:
 *  - `college.matched` — the dollars Dad doubles into the College Chest. They sit
 *    inside that chest's balance, but they're Dad's and burn if Ben withdraws.
 *  - `config.respBalance` — Dad's real external RESP, display-only (see `totalWithDad`).
 */
export function totalTreasure(bank: BankState): number {
  const chests = ACCOUNT_IDS.reduce((sum, id) => sum + bank.accounts[id].balance, 0)
  return round2(chests - bank.accounts.college.matched)
}

/** Everything with Dad's side counted: his match plus the real RESP. */
export function totalWithDad(bank: BankState): number {
  return round2(totalTreasure(bank) + bank.accounts.college.matched + bank.config.respBalance)
}

/** One Piece skin for each account. `risk` drives the little risk meter. */
export const ACCOUNT_META: Record<
  BankAccountId,
  { name: string; emoji: string; blurb: string; risk: 0 | 1 | 2 | 3 }
> = {
  chequing: { name: 'Pocket Chest', emoji: '👛', blurb: 'Everyday dollars. No growth here — spend, or set them to work!', risk: 0 },
  xgro: { name: 'Merchant Ship', emoji: '⛵', blurb: 'A steady trading fleet (XGRO ETF). Gentle waves, good winds over time.', risk: 2 },
  qqq: { name: 'Rocket Ship', emoji: '🚀', blurb: 'Full-speed tech ship (QQQ). Big storms, big treasure… if you can hold on.', risk: 3 },
  college: { name: 'College Chest', emoji: '🎓', blurb: 'Future-you treasure. Dad DOUBLES what you add — take it out and his half burns up!', risk: 1 },
}

export function defaultBankState(): BankState {
  const emptyAcct = () => ({ balance: 0, deposited: 0, growth: 0, matched: 0, history: [] })
  return {
    config: {
      weeklyAmount: 7,
      payday: 6, // Saturday — the paper-sheet tradition
      xgroMonthly: 0.7,
      qqqMonthly: 1.1,
      respBalance: 0,
    },
    accounts: {
      chequing: emptyAcct(),
      xgro: emptyAcct(),
      qqq: emptyAcct(),
      college: emptyAcct(),
    },
    pending: { amount: 0, weeks: 0, since: null },
    txns: [],
    // Seed to yesterday so the very first sim runs *through* today — otherwise a
    // bank created on payday (Saturday) would skip that day's allowance entirely.
    lastDay: addDays(dayKey(), -1),
    shock: defaultShockState(),
  }
}

export function defaultShockState(): BankState['shock'] {
  return {
    scheduledDay: null,
    crashedDay: null,
    crashAmount: 0,
    decision: null,
    recoverDay: null,
    recoverTo: 0,
    bounce: null,
    crashCount: 0,
    lastCrashDay: null,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function fmt$(n: number): string {
  const v = round2(n)
  const sign = v < 0 ? '-' : ''
  return `${sign}$${Math.abs(v).toFixed(2)}`
}

// --- deterministic daily market moves --------------------------------------

/** Tiny string hash → uniform [0,1). Same day + account = same number everywhere. */
function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** Approx standard normal from three seeded uniforms (Irwin–Hall). */
function seededNormal(day: string, acct: string): number {
  return (hash01(`${day}:${acct}:a`) + hash01(`${day}:${acct}:b`) + hash01(`${day}:${acct}:c`) - 1.5) * 2
}

/** Fallback mean daily growth rate (fraction), fees subtracted, when no live series. */
export function meanDailyRate(acct: BankAccountId, config: BankConfig): number {
  switch (acct) {
    case 'college':
      return Math.pow(1 + config.xgroMonthly / 100, 1 / 30) - 1 - XGRO_MER / 100 / 365 // grows like a balanced fund while it waits
    case 'xgro':
      return Math.pow(1 + config.xgroMonthly / 100, 1 / 30) - 1 - XGRO_MER / 100 / 365
    case 'qqq':
      return Math.pow(1 + config.qqqMonthly / 100, 1 / 30) - 1 - QQQ_MER / 100 / 365
    default:
      return 0
  }
}

/** One market series' return (fraction) for a given day, replaying/looping the 30-day array. */
function seriesRate(series: number[] | undefined, asOfDay: string, day: string): number | null {
  if (!series || series.length === 0) return null
  const idx = Math.max(0, Math.round((parseDay(day).getTime() - parseDay(asOfDay).getTime()) / 86_400_000))
  return series[idx % series.length] / 100
}

/** The actual rate applied on one simulated day, preferring the live market series. */
function dailyRate(acct: BankAccountId, day: string, config: BankConfig, market?: MarketData | null): number {
  if (acct === 'chequing') return 0
  if (market && market.asOfDay) {
    const raw = acct === 'qqq' ? seriesRate(market.qqq, market.asOfDay, day) : seriesRate(market.xgro, market.asOfDay, day)
    if (raw !== null) {
      // college rides the XGRO series but at the balanced-fund fee
      const mer = acct === 'qqq' ? QQQ_MER : XGRO_MER
      return raw - mer / 100 / 365
    }
  }
  const mean = meanDailyRate(acct, config)
  if (acct === 'xgro') return mean + (seededNormal(day, acct) * XGRO_DAILY_VOL) / 100
  if (acct === 'qqq' || acct === 'college') return mean + (seededNormal(day, acct) * XGRO_DAILY_VOL) / 100
  return mean
}

/** During a HOLD recovery we ignore real data and wiggle randomly with an upward drift. */
function recoveryRate(day: string): number {
  return 0.004 + (seededNormal(day, 'recover') * QQQ_DAILY_VOL) / 100 // ~+0.4%/day drift, still bumpy
}

export function pushTxn(bank: BankState, txn: Omit<BankTxn, 'id' | 'at'> & { at?: string }): void {
  bank.txns.push({ id: crypto.randomUUID(), at: txn.at ?? new Date().toISOString(), ...txn })
  if (bank.txns.length > MAX_TXNS) bank.txns = bank.txns.slice(-MAX_TXNS)
}

/** Arm the one-and-only automatic Shock Test crash, ~1 month out. No-op after crash #1. */
export function armFirstShock(bank: BankState, fromDay: string, rand01: number): void {
  const s = bank.shock
  if (s.crashCount > 0 || s.scheduledDay || s.crashedDay) return
  s.scheduledDay = addDays(fromDay, CRASH_MIN_DAYS + Math.floor(rand01 * CRASH_SPREAD_DAYS))
}

/** The overnight −20% hit on the Rocket Ship. Returns the dollars wiped (0 = nothing to crash). */
export function applyCrash(bank: BankState, day: string): number {
  const a = bank.accounts.qqq
  const loss = round2(a.balance * (CRASH_PCT / 100))
  if (loss <= 0) return 0
  a.balance -= loss
  a.growth -= loss
  const s = bank.shock
  s.scheduledDay = null
  s.crashedDay = day
  s.crashAmount = loss
  s.decision = null
  s.recoverDay = null
  s.recoverTo = 0
  s.crashCount += 1
  s.lastCrashDay = day
  pushTxn(bank, { day, type: 'crash', to: 'qqq', amount: -loss, note: `Market correction! Tech stocks dove ${CRASH_PCT}% overnight` })
  return loss
}

/** Pick the bounce-back date for a freshly-held position: 2–3 weeks out. */
export function pickRecoverDay(fromDay: string): string {
  return addDays(fromDay, RECOVER_MIN_DAYS + Math.floor(Math.random() * RECOVER_SPREAD_DAYS))
}

/** True when the Rocket Ship holds enough money for a crash to mean something. */
export function crashWorthwhile(bank: BankState): boolean {
  return bank.accounts.qqq.balance >= CRASH_MIN_BALANCE
}

/** Days since the last crash (the "safety sign" counter), or null if it never crashed. */
export function daysWithoutCrash(bank: BankState, today: string = dayKey()): number | null {
  if (!bank.shock.lastCrashDay) return null
  return Math.max(0, Math.round((parseDay(today).getTime() - parseDay(bank.shock.lastCrashDay).getTime()) / 86_400_000))
}

/** Days until a held position finishes recovering, or null if not currently recovering. */
export function daysToRecover(bank: BankState, today: string = dayKey()): number | null {
  const s = bank.shock
  if (s.decision !== 'hold' || !s.recoverDay) return null
  return Math.max(0, Math.round((parseDay(s.recoverDay).getTime() - parseDay(today).getTime()) / 86_400_000))
}

/** Popup-worthy things that happened while catching the bank up (crash landing, bounce-back, payday…). */
export interface BankSimEvent {
  emoji: string
  title: string
  description: string
}

/**
 * Catch the bank up to `today`: daily market moves, allowance piling into the
 * pending pool on payday (Ben allocates it himself), Shock-Test crashes and
 * HOLD recoveries, and a balance snapshot per day. Idempotent per day.
 */
export function simulateBank(
  bank: BankState,
  today: string = dayKey(),
  onEvent?: (e: BankSimEvent) => void,
  market?: MarketData | null,
): void {
  let day = bank.lastDay
  const shock = bank.shock
  while (day < today) {
    day = addDays(day, 1)
    const recovering = shock.decision === 'hold' && shock.recoverDay && day < shock.recoverDay

    // 1) growth on every invested chest
    for (const id of ACCOUNT_IDS) {
      const a = bank.accounts[id]
      if (a.balance <= 0) continue
      const rate = id === 'qqq' && recovering ? recoveryRate(day) : dailyRate(id, day, bank.config, market)
      const delta = a.balance * rate
      a.balance += delta
      a.growth += delta
    }

    // 1b) Shock Test — the scheduled first crash fires on the first day with real money aboard
    if (shock.scheduledDay && !shock.crashedDay && day >= shock.scheduledDay && bank.accounts.qqq.balance >= CRASH_MIN_BALANCE) {
      applyCrash(bank, day)
      onEvent?.({
        emoji: '📉🚨',
        title: 'MARKET CRASH!',
        description: 'Tech stocks just took a dive! Open the Bank — the Rocket Ship needs a decision.',
      })
    }
    // 1c) a held position finishes bouncing back HIGHER — the whole point of the lesson
    if (shock.decision === 'hold' && shock.recoverDay && day >= shock.recoverDay) {
      const a = bank.accounts.qqq
      const gain = round2(Math.max(0, shock.recoverTo - a.balance))
      a.balance = Math.max(a.balance, shock.recoverTo)
      a.growth += gain
      pushTxn(bank, { day, type: 'recover', to: 'qqq', amount: gain, note: 'HOLD THE LINE paid off — the market bounced back higher!' })
      shock.crashedDay = null
      shock.crashAmount = 0
      shock.decision = null
      shock.recoverDay = null
      shock.recoverTo = 0
      shock.bounce = { day, gain }
      onEvent?.({
        emoji: '🚀📈',
        title: 'The Rocket Ship is BACK!',
        description: `Holding through the storm paid off: +${fmt$(gain)}. Panic loses, patience wins.`,
      })
    }

    // 2) payday → allowance lands in the "to be placed" pool; Ben decides where it goes
    if (parseDay(day).getDay() === bank.config.payday && bank.config.weeklyAmount > 0) {
      bank.pending.amount = round2(bank.pending.amount + bank.config.weeklyAmount)
      bank.pending.weeks += 1
      if (!bank.pending.since) bank.pending.since = day
      onEvent?.({
        emoji: '🎉',
        title: 'PAYDAY! 🎉',
        description: `${fmt$(bank.config.weeklyAmount)} landed! Open the Bank and decide where every dollar sails.`,
      })
    }

    // 3) daily snapshot for the sparklines
    for (const id of ACCOUNT_IDS) {
      const a = bank.accounts[id]
      a.history.push({ day, balance: round2(a.balance) })
      if (a.history.length > HISTORY_DAYS) a.history = a.history.slice(-HISTORY_DAYS)
    }

    bank.lastDay = day
  }
}

// --- projections ------------------------------------------------------------

export const PROJECTION_YEARS = [1, 2, 3, 5, 10, 20, 50]

export interface Projection {
  years: number
  total: number
  newMoney: number
  interest: number
}

/**
 * "At this pace" — the current balance compounding, plus an optional weekly
 * habit deposit the kid dials in himself (College doubles it via Dad's match).
 * The allowance he can afford grows a little (+$1/week) every 6 months.
 */
export function projectAccount(acct: BankAccountId, bank: BankState, years: number, weeklyDeposit: number): Projection {
  const weeklyRate = Math.pow(1 + meanDailyRate(acct, bank.config), 7) - 1
  let balance = bank.accounts[acct].balance
  let newMoney = bank.accounts[acct].deposited + bank.accounts[acct].matched
  let interest = bank.accounts[acct].growth
  let weekly = weeklyDeposit
  const weeks = Math.round(years * 52)
  for (let w = 1; w <= weeks; w++) {
    if (w % 26 === 0 && weekly > 0) weekly += 1 // habit grows with the allowance
    const growth = balance * weeklyRate
    balance += growth
    interest += growth
    let deposit = weekly
    if (acct === 'college') deposit *= 2 // Dad's match
    balance += deposit
    newMoney += deposit
  }
  return { years, total: round2(balance), newMoney: round2(newMoney), interest: round2(interest) }
}

// --- flavor -----------------------------------------------------------------

export const LUFFY_BANK_QUOTES = [
  '“If you don’t take risks, you can’t create a future!” …but never bet the whole ship. Shishishi!',
  '“Power isn’t determined by your size, but by the size of your dreams!” Small deposits become BIG treasure!',
  '“I don’t want to conquer anything…” except maybe compound interest. That thing is STRONG!',
  '“Forgetting is like a wound.” Never forget payday — decide where your treasure sails!',
  '“A ship that sails through storms gets the farthest.” When the Rocket shakes, HOLD ON!',
  '“The treasure you save today is the meat you eat tomorrow!” …okay I made that up, but it’s TRUE!',
]

export function randomLuffyQuote(): string {
  return LUFFY_BANK_QUOTES[Math.floor(Math.random() * LUFFY_BANK_QUOTES.length)]
}

/** Human name for a txn party. */
export function partyName(p: BankTxn['from'] | BankTxn['to']): string {
  if (!p) return '—'
  if (p === 'dad') return 'Dad'
  if (p === 'allowance') return 'Allowance'
  return ACCOUNT_META[p].name
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// --- Money Converter (trip mode) -------------------------------------------

/** The currencies we're realistically ever standing in front of a price tag in. */
export const CURRENCIES: { code: string; name: string; symbol: string; flag: string }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'PTE', name: 'Portugal (Euro)', symbol: '€', flag: '🇵🇹' },
]

export function currencyMeta(code: string) {
  return CURRENCIES.find((c) => c.code === code) ?? { code, name: code, symbol: '', flag: '🌍' }
}

export const DEFAULT_CONVERTER: BankConverterState = {
  enabled: false,
  currency: 'BRL',
  rate: 4,
  until: null,
  setAt: null,
}

/** Older saves have no `converter` key — read through this everywhere. */
export function getConverter(bank: BankState): BankConverterState {
  return bank.converter ?? DEFAULT_CONVERTER
}

/** On for Ben only while dad enabled it, the rate is sane, and today is still inside the window. */
export function converterActive(bank: BankState, today: string = dayKey()): boolean {
  const c = getConverter(bank)
  return c.enabled && c.rate > 0 && !!c.until && today <= c.until
}

/** Whole days left including today; 0 once it has lapsed. */
export function converterDaysLeft(bank: BankState, today: string = dayKey()): number {
  const c = getConverter(bank)
  if (!c.until) return 0
  return Math.max(0, daysUntil(c.until, today) + 1)
}

/** Local money → CAD. `rate` is local-per-CAD, so we divide. */
export function toCad(amountLocal: number, rate: number): number {
  if (!(rate > 0)) return 0
  return round2(amountLocal / rate)
}
