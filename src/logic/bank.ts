// Grand Line Bank — real CAD dollars, Ben's allowance world.
// The bank lives inside BEN's AppData; Diogo is the banker (config + log + adjustments).
// Simulation is deterministic per calendar day (seeded by the day string), so any
// device that catches the bank up computes the exact same numbers.
import type { BankAccountId, BankConfig, BankSplit, BankState, BankTxn } from '../types'
import { addDays, dayKey, parseDay } from './dates'

// Real admin fees (MER, %/year) — buying/selling itself is free, like we promised.
export const XGRO_MER = 0.2
export const QQQ_MER = 0.2

// Daily volatility (σ, % of balance) for the simulated market wiggle.
// XGRO is a calm 80/20 ETF; QQQ swings much harder — that's the lesson.
const XGRO_DAILY_VOL = 0.5
const QQQ_DAILY_VOL = 1.1

const HISTORY_DAYS = 30
const MAX_TXNS = 250

// The Shock Test: a scripted QQQ market correction.
export const CRASH_PCT = 20 // −20% overnight
export const BOUNCE_MULT = 1.325 // undoes the −20% and lands ~6% higher — holding must WIN
const CRASH_MIN_DAYS = 21 // first auto-crash arms 3–5 weeks after the first QQQ deposit
const CRASH_SPREAD_DAYS = 14
const RECOVER_MIN_DAYS = 14 // held positions bounce back 2–3 weeks after the decision
const RECOVER_SPREAD_DAYS = 8
const CRASH_MIN_BALANCE = 0.5 // don't waste the lesson on pennies

export const ACCOUNT_IDS: BankAccountId[] = ['chequing', 'savings', 'xgro', 'qqq', 'college']

/** One Piece skin for each account. `risk` drives the little risk meter. */
export const ACCOUNT_META: Record<
  BankAccountId,
  { name: string; emoji: string; blurb: string; risk: 0 | 1 | 2 | 3 }
> = {
  chequing: { name: 'Pocket Chest', emoji: '👛', blurb: 'Everyday Berries… er, dollars. No growth here — spend or invest!', risk: 0 },
  savings: { name: 'Treasure Vault', emoji: '🗝️', blurb: 'Safe island vault. Slow but NEVER loses. Interest paid daily.', risk: 1 },
  xgro: { name: 'Merchant Ship', emoji: '⛵', blurb: 'A steady trading ship (XGRO ETF). Some waves, good winds.', risk: 2 },
  qqq: { name: 'Rocket Ship', emoji: '🚀', blurb: 'Full-speed tech ship (QQQ). Big storms, big treasure… maybe.', risk: 3 },
  college: { name: 'College Chest', emoji: '🎓', blurb: 'Locked treasure for future-you. Dad DOUBLES every deposit. No taking out!', risk: 1 },
}

export function defaultBankState(): BankState {
  const emptyAcct = () => ({ balance: 0, deposited: 0, growth: 0, history: [] })
  return {
    config: {
      weeklyAmount: 7,
      payday: 6, // Saturday — the paper-sheet tradition
      savingsApr: 4, // Tangerine-style reference; Diogo updates it
      xgroMonthly: 0.7,
      qqqMonthly: 1.1,
      respBalance: 0,
    },
    split: { savings: 0, xgro: 0, qqq: 0, college: 0 },
    accounts: {
      chequing: emptyAcct(),
      savings: emptyAcct(),
      xgro: emptyAcct(),
      qqq: emptyAcct(),
      college: emptyAcct(),
    },
    txns: [],
    lastDay: dayKey(),
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

// --- deterministic daily market wiggle -------------------------------------

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

/** Mean daily growth rate (fraction) for an account, fees already subtracted. */
export function meanDailyRate(acct: BankAccountId, config: BankConfig): number {
  switch (acct) {
    case 'savings':
      return config.savingsApr / 100 / 365
    case 'college':
      return config.savingsApr / 100 / 365 // the chest grows like the vault while it waits
    case 'xgro':
      return Math.pow(1 + config.xgroMonthly / 100, 1 / 30) - 1 - XGRO_MER / 100 / 365
    case 'qqq':
      return Math.pow(1 + config.qqqMonthly / 100, 1 / 30) - 1 - QQQ_MER / 100 / 365
    default:
      return 0
  }
}

/** The actual (wiggly) rate applied on one simulated day. */
function dailyRate(acct: BankAccountId, day: string, config: BankConfig): number {
  const mean = meanDailyRate(acct, config)
  if (acct === 'xgro') return mean + (seededNormal(day, acct) * XGRO_DAILY_VOL) / 100
  if (acct === 'qqq') return mean + (seededNormal(day, acct) * QQQ_DAILY_VOL) / 100
  return mean
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

/** Popup-worthy things that happened while catching the bank up (crash landing, bounce-back…). */
export interface BankSimEvent {
  emoji: string
  title: string
  description: string
}

/**
 * Catch the bank up to `today`: daily interest/market moves, allowance on payday
 * (auto-split, college part matched by dad), Shock-Test crashes/recoveries, and
 * a balance snapshot per day. Idempotent per day thanks to `lastDay` +
 * deterministic randomness.
 */
export function simulateBank(bank: BankState, today: string = dayKey(), onEvent?: (e: BankSimEvent) => void): void {
  let day = bank.lastDay
  while (day < today) {
    day = addDays(day, 1)

    // 1) growth on every invested chest
    for (const id of ACCOUNT_IDS) {
      const a = bank.accounts[id]
      if (a.balance <= 0) continue
      const delta = a.balance * dailyRate(id, day, bank.config)
      a.balance += delta
      a.growth += delta
    }

    // 1b) Shock Test — the scheduled first crash fires on the first day with real money aboard
    const shock = bank.shock
    if (shock.scheduledDay && !shock.crashedDay && day >= shock.scheduledDay && bank.accounts.qqq.balance >= CRASH_MIN_BALANCE) {
      applyCrash(bank, day)
      onEvent?.({
        emoji: '📉🚨',
        title: 'MARKET CRASH!',
        description: 'Tech stocks just took a dive! Check the Rocket Ship in the Bank — a big decision is waiting.',
      })
    }
    // 1c) a held position bounces back HIGHER — the whole point of the lesson
    if (shock.decision === 'hold' && shock.recoverDay && day >= shock.recoverDay) {
      const a = bank.accounts.qqq
      const gain = round2(a.balance * (BOUNCE_MULT - 1))
      a.balance += gain
      a.growth += gain
      pushTxn(bank, { day, type: 'recover', to: 'qqq', amount: gain, note: 'HOLD THE LINE paid off — the market bounced back higher!' })
      shock.crashedDay = null
      shock.crashAmount = 0
      shock.decision = null
      shock.recoverDay = null
      shock.bounce = { day, gain }
      onEvent?.({
        emoji: '🚀📈',
        title: 'The Rocket Ship is BACK!',
        description: `Holding through the storm paid off: +${fmt$(gain)}. Panic sells, patience wins.`,
      })
    }

    // 2) allowance day → auto-split lands
    if (parseDay(day).getDay() === bank.config.payday && bank.config.weeklyAmount > 0) {
      const { weeklyAmount } = bank.config
      const s = bank.split
      const parts: { id: BankAccountId; amt: number }[] = [
        { id: 'savings', amt: round2((weeklyAmount * s.savings) / 100) },
        { id: 'xgro', amt: round2((weeklyAmount * s.xgro) / 100) },
        { id: 'qqq', amt: round2((weeklyAmount * s.qqq) / 100) },
        { id: 'college', amt: round2((weeklyAmount * s.college) / 100) },
      ]
      const invested = parts.reduce((sum, p) => sum + p.amt, 0)
      parts.unshift({ id: 'chequing', amt: round2(weeklyAmount - invested) })
      for (const p of parts) {
        if (p.amt <= 0) continue
        bank.accounts[p.id].balance += p.amt
        bank.accounts[p.id].deposited += p.amt
        pushTxn(bank, { day, at: `${day}T12:00:00.000Z`, type: 'allowance', from: 'allowance', to: p.id, amount: p.amt })
        if (p.id === 'qqq') armFirstShock(bank, day, hash01(`${day}:arm-shock`)) // first QQQ money quietly starts the crash countdown
        if (p.id === 'college') {
          bank.accounts.college.balance += p.amt
          bank.accounts.college.deposited += p.amt
          pushTxn(bank, { day, at: `${day}T12:00:01.000Z`, type: 'match', from: 'dad', to: 'college', amount: p.amt, note: 'Dad matches your college deposit' })
        }
      }
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
 * "At this pace" — start from today's balance, keep the current weekly auto-split
 * into this account, and assume the allowance grows a little (+$1/week) every
 * 6 months. College counts dad's match as new money too.
 */
export function projectAccount(acct: BankAccountId, bank: BankState, years: number): Projection {
  const weeklyRate = Math.pow(1 + meanDailyRate(acct, bank.config), 7) - 1
  const pct =
    acct === 'chequing'
      ? 100 - bank.split.savings - bank.split.xgro - bank.split.qqq - bank.split.college
      : (bank.split[acct as keyof BankSplit] ?? 0)
  let balance = bank.accounts[acct].balance
  let newMoney = bank.accounts[acct].deposited
  let interest = bank.accounts[acct].growth
  let weeklyAllowance = bank.config.weeklyAmount
  const weeks = Math.round(years * 52)
  for (let w = 1; w <= weeks; w++) {
    if (w % 26 === 0) weeklyAllowance += 1 // allowance raise every ~6 months
    const growth = balance * weeklyRate
    balance += growth
    interest += growth
    let deposit = (weeklyAllowance * pct) / 100
    if (acct === 'college') deposit *= 2 // dad's match
    balance += deposit
    newMoney += deposit
  }
  return { years, total: round2(balance), newMoney: round2(newMoney), interest: round2(interest) }
}

// --- flavor -----------------------------------------------------------------

export const LUFFY_BANK_QUOTES = [
  '“If you don’t take risks, you can’t create a future!” …but keep some Berries in the vault too. Shishishi!',
  '“Power isn’t determined by your size, but by the size of your heart and dreams!” Small deposits become BIG treasure!',
  '“I don’t want to conquer anything…” except maybe compound interest. That thing is strong!',
  '“Forgetting is like a wound.” Never forget payday — put some treasure away first!',
  '“A ship that sails through storms gets the farthest.” The Rocket Ship shakes — hold on and think long!',
  '“The treasure you save today is the meat you eat tomorrow!” …okay, I made that one up, but it’s TRUE!',
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
