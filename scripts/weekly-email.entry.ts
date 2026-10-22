// 📬 The weekly email about Ben — the report itself (§25).
//
// Bundled and run by `scripts/weekly-email.mjs`, which does the Firestore read
// and the sending. This file is pure: data in, one email out. It is TypeScript
// because it computes its numbers with the app's OWN logic — `simulateBank`,
// `seNowBySubtopic`, `sePlanOfYear` — rather than a second implementation that
// would quietly drift from what the screens say.
//
// Two rules shape it:
//
//   1. It never writes. The bank is caught up to today on a COPY, so the email
//      quotes today's balance without a cron job silently mutating Ben's save
//      at half past eight on a Sunday.
//   2. It opens with what Dad has to do. A sealed mistake is a button on his
//      desk standing between Ben and fixing it (§24f); an unplaced allowance is
//      a modal Ben has not been sent to. Both are invisible unless something
//      says them out loud once a week.
import {
  ACCOUNT_IDS,
  ACCOUNT_META,
  defaultBankState,
  fmt$,
  fmtPct,
  lifetimeReturnPct,
  partyName,
  round2,
  simulateBank,
  totalTreasure,
  totalWithDad,
} from '../src/logic/bank'
import { addDays, dayKey, prettyDay } from '../src/logic/dates'
import {
  SE_CAN_MIN_ATTEMPTS,
  seFind,
  seNowBySubtopic,
  sePct,
  seRetired,
} from '../src/logic/steugene'
import { seLockLeft } from '../src/logic/steugeneLesson'
import { sePaceBySubject, sePlanOfYear, seShowUp } from '../src/logic/steugenePace'
import type { AppData, BankAccountState, BankState, BankTxn, MarketData, SeStat } from '../src/types'

/** Where a line in the email points. Deep links work because every page has a URL (§1c). */
const APP = 'https://spinningwheel-6ff51.web.app'

export interface WeeklyEmail {
  subject: string
  text: string
  html: string
}

/** One labelled figure. `tone` only colours the HTML; the text copy reads the same. */
interface Row {
  label: string
  value: string
  note?: string
  tone?: 'good' | 'bad' | 'warn'
}

interface Section {
  title: string
  lead?: string
  rows?: Row[]
  bulletsTitle?: string
  bullets?: string[]
  /** A short closing line under the section, e.g. a link. */
  foot?: string
}

// --- the money (§8b) ---------------------------------------------------------

/** The latest snapshot on or before `day`, or null when the history is younger than that. */
function balanceOn(a: BankAccountState, day: string): number | null {
  let found: number | null = null
  for (const h of a.history) if (h.day <= day) found = h.balance
  return found
}

/**
 * How a balance moved over the week.
 *
 * Deliberately NOT called a return: it counts money he moved in and out as
 * well as what the market did, so a $6 transfer out of a $9 chest reads −67%.
 * `lifetimeReturnPct` is the chest's actual performance and is quoted beside
 * it; this one answers "what is in there now, versus last Sunday".
 */
function delta(now: number, then: number | null): string {
  if (then === null) return 'no snapshot a week back'
  const d = round2(now - then)
  const pct = then > 0 ? (d / then) * 100 : 0
  return `${d >= 0 ? '+' : '−'}${fmt$(Math.abs(d)).replace('-', '')} this week${then > 0 ? ` (${fmtPct(pct)})` : ''}`
}

function txnLine(t: BankTxn): string {
  const when = prettyDay(t.day)
  switch (t.type) {
    case 'allowance':
      return `${when} · 🎉 allowance ${fmt$(t.amount)}`
    case 'match':
      return `${when} · 🎓 Dad matched ${fmt$(t.amount)} into the College Chest`
    case 'payback':
      return `${when} · 💸 paid you back ${fmt$(t.amount)}${t.note ? ` — “${t.note}”` : ''}${t.ackAt ? '' : ' — NOT acknowledged yet'}`
    case 'crash':
      return `${when} · 📉 Shock Test wiped ${fmt$(t.amount)} off the Rocket Ship`
    case 'recover':
      return `${when} · 📈 the held position bounced back ${fmt$(t.amount)}`
    case 'adjust':
      return `${when} · 🛠️ adjustment ${fmt$(t.amount)}${t.note ? ` — “${t.note}”` : ''}`
    default:
      return `${when} · ➡️ ${fmt$(t.amount)} ${partyName(t.from)} → ${partyName(t.to)}${t.note ? ` — “${t.note}”` : ''}`
  }
}

interface MoneyPart {
  section: Section
  /** For the subject line. */
  total: number
  actions: string[]
}

function money(data: AppData, market: MarketData | null, now: number): MoneyPart {
  const today = dayKey(new Date(now))
  const weekAgo = addDays(today, -7)
  // A copy, always: the email reports where the bank IS, it does not move it.
  const bank: BankState = structuredClone(data.bank ?? defaultBankState())
  simulateBank(bank, today, undefined, market)

  const total = totalTreasure(bank)
  const totalThen = ACCOUNT_IDS.reduce<number | null>((sum, id) => {
    const b = balanceOn(bank.accounts[id], weekAgo)
    return sum === null || b === null ? null : sum + b
  }, 0)

  const rows: Row[] = ACCOUNT_IDS.map((id) => {
    const a = bank.accounts[id]
    const meta = ACCOUNT_META[id]
    // The week's figure is the BALANCE moving, which is not the same thing as
    // the market moving: a $6 transfer out of the Rocket Ship reads as −83% and
    // has nothing to do with the Nasdaq. Say so, and keep the chest's own
    // lifetime return — the number that survives him emptying it — beside it.
    const bits = [delta(a.balance, balanceOn(a, weekAgo))]
    if (id === 'xgro' || id === 'qqq') bits.push(`${fmt$(a.deposited)} put in · ${fmt$(a.growth)} earned · ${fmtPct(lifetimeReturnPct(a))} lifetime`)
    if (id === 'college' && a.matched > 0) bits.push(`${fmt$(a.matched)} of that is Dad's match — it burns if he withdraws`)
    return { label: `${meta.emoji} ${meta.name}`, value: fmt$(a.balance), note: bits.join(' · ') }
  })

  if (bank.config.respBalance > 0) {
    rows.push({ label: '🏦 Dad’s real RESP', value: fmt$(bank.config.respBalance), note: 'display only — never his to move' })
  }

  // Game money, not real money, so it sits under a rule and never inside the
  // treasure total — but it is still part of what he is holding this week.
  const eco = data.economy
  if (eco) {
    rows.push({
      label: '🪙 Berries',
      value: String(eco.gems ?? 0),
      note: `${eco.totalGemsEarned ?? 0} earned all year · 🍇 ${eco.devilFruits ?? 0} Devil Fruits · ❄️ ${eco.freezes ?? 0} streak freeze${(eco.freezes ?? 0) === 1 ? '' : 's'}`,
    })
  }

  const actions: string[] = []

  if (bank.pending.amount > 0) {
    rows.push({
      label: '⏳ Waiting to be placed',
      value: fmt$(bank.pending.amount),
      note: `${bank.pending.weeks} payday${bank.pending.weeks === 1 ? '' : 's'} stacked up${bank.pending.since ? `, since ${prettyDay(bank.pending.since)}` : ''}`,
      tone: bank.pending.weeks >= 2 ? 'warn' : undefined,
    })
    if (bank.pending.weeks >= 2) {
      actions.push(`⏳ ${fmt$(bank.pending.amount)} has been waiting ${bank.pending.weeks} weeks for Ben to place it — he gets the modal the moment he opens ${APP}/bank/chests`)
    }
  }

  const week = bank.txns.filter((t) => t.day >= weekAgo)
  const unacked = bank.txns.filter((t) => t.type === 'payback' && !t.ackAt)
  for (const t of unacked) {
    actions.push(`💸 Ben paid you back ${fmt$(t.amount)} on ${prettyDay(t.day)}${t.note ? ` — “${t.note}”` : ''}. Tap “Got it”: ${APP}/bank/ledger`)
  }

  if (bank.shock.crashedDay && !bank.shock.decision) {
    actions.push(`📉 A Shock Test fired on ${prettyDay(bank.shock.crashedDay)} and Ben has not chosen PANIC or HOLD yet — ${fmt$(bank.shock.crashAmount)} is on the table.`)
  }

  const bullets = week.length ? week.slice(-12).reverse().map(txnLine) : ['Nothing moved this week.']

  // §8b — the market feed is the one thing in the bank that can be silently wrong.
  let lead = `Total treasure ${fmt$(total)} · ${delta(total, totalThen)} · ${fmt$(totalWithDad(bank))} counting Dad’s side.`
  if (!market) {
    lead += ' ⚠️ No market series at all — the sim is running on the fallback monthly rates.'
    actions.push(`⚠️ There is no market series in Firestore. The chests are growing on estimates, not on real XGRO/QQQ moves.`)
  } else if (market.status === 'failed') {
    lead += ` ⚠️ The market feed last failed on ${market.lastAttemptDay ?? '?'} — replaying the series from ${prettyDay(market.asOfDay)}.`
    actions.push(`⚠️ \`npm run bank:market\` is failing${market.lastError ? ` (${market.lastError})` : ''}. It retries daily; the last good series is from ${prettyDay(market.asOfDay)}.`)
  }

  return {
    total,
    actions,
    section: {
      title: '🏦 The money',
      lead,
      rows,
      bulletsTitle: week.length ? 'Every move he made this week' : undefined,
      bullets,
      foot: `A week figure is the BALANCE moving — a transfer out counts, so it is not the chest's return. · Banker’s desk: ${APP}/bank/vault · the full ledger: ${APP}/bank/ledger`,
    },
  }
}

// --- school (§24) ------------------------------------------------------------

interface SchoolPart {
  section: Section
  done: number
  actions: string[]
}

function school(data: AppData, now: number): SchoolPart {
  const se = data.steugene
  const weekFrom = now - 7 * 86_400_000
  const history = se?.history ?? []
  const locks = se?.locks ?? []
  const stats: Record<string, SeStat> = se?.stats ?? {}

  const nowBy = seNowBySubtopic(history, locks)
  const paces = sePaceBySubject(stats, history, locks, now)
  const plan = sePlanOfYear(stats, history, locks, now)
  const show = seShowUp(history, now)
  const doneAll = paces.reduce((n, p) => n + p.done, 0)
  const totalAll = paces.reduce((n, p) => n + p.total, 0)

  const actions: string[] = []
  const rows: Row[] = []

  // --- the week itself ---
  const weekAnswers = history.filter((a) => a.at >= weekFrom)
  const weekDays = new Set(weekAnswers.map((a) => new Date(a.at).toDateString())).size
  const weekRight = weekAnswers.filter((a) => a.right).length
  const touched = Object.entries(stats)
    .filter(([, s]) => s.lastAt >= weekFrom)
    .map(([id, s]) => ({ id, s, where: seFind(id) }))
    .filter((r) => r.where)
    .sort((a, b) => b.s.lastAt - a.s.lastAt)

  rows.push({
    label: '🗓️ This week',
    value: weekAnswers.length ? `${weekAnswers.length} questions` : 'nothing',
    note: weekAnswers.length
      ? `${weekRight} right (${Math.round((weekRight / weekAnswers.length) * 100)}%) · ${weekDays} day${weekDays === 1 ? '' : 's'} at it · ${touched.length} chapter${touched.length === 1 ? '' : 's'} touched`
      : 'He has not opened a lesson in seven days.',
    tone: weekAnswers.length === 0 ? 'bad' : weekDays >= 3 ? 'good' : undefined,
  })
  if (weekAnswers.length === 0) {
    actions.push(`🏫 Seven days with no St. Eugene lesson. The next chapter is one tap: ${APP}/steugene7/subjects`)
  }

  rows.push({
    label: '📈 All year',
    value: `${doneAll}/${totalAll} chapters`,
    note: `🔥 ${show.streak} day${show.streak === 1 ? '' : 's'} in a row · ✅ ${show.answers} answers · 🔧 ${show.fixed} missed then fixed · ⏱️ ${Math.round(Object.values(stats).reduce((n, s) => n + s.seconds, 0) / 60)} min of real work`,
  })

  // --- the pace (§24x) ---
  const endsOn = new Date(plan.year.end).toLocaleDateString('en-CA', { day: 'numeric', month: 'long' })
  const lead = plan.allDone
    ? `🎉 Every chapter on the map is finished.`
    : plan.weeksLeft >= 1
      ? `${plan.left} chapters left, ${plan.minutesEach} min each at his ${plan.measured ? 'own measured' : 'assumed (nothing finished yet)'} pace — ${fmtHours(plan.minutesPerWeek)} a week to finish by ${endsOn}.`
      : `${plan.left} chapters left and the year ends ${endsOn}.`

  for (const p of paces) {
    const state =
      p.state === 'done' ? '✅ finished'
      : p.state === 'not-yet' ? '🕓 window opens in February'
      : p.state === 'shut' ? `🚪 window closed with ${p.total - p.done} unfinished`
      : p.state === 'ahead' ? '🚀 ahead'
      : p.state === 'on-track' ? '👍 on track'
      : '⚠️ behind'
    const bits = [state]
    if (p.open && p.state !== 'done') bits.push(`due ${p.due} by now`, `${p.weeksLeft.toFixed(0)} school week${Math.round(p.weeksLeft) === 1 ? '' : 's'} of window left`, `${p.perWeek.toFixed(1)}/week to finish it`)
    if (p.started > 0) bits.push(`${p.started} started`)
    rows.push({
      label: `${p.emoji} ${p.name}`,
      value: `${p.done}/${p.total}`,
      note: bits.join(' · '),
      tone: p.state === 'behind' || p.state === 'shut' ? 'bad' : p.state === 'done' || p.state === 'ahead' ? 'good' : undefined,
    })
  }

  // A shutting window outranks a worse one — that is the whole point of `closing`.
  if (plan.closing) {
    const c = plan.closing
    actions.push(
      `⚠️ ${c.emoji} ${c.name}: ${c.total - c.done} chapters in ${c.weeksLeft.toFixed(0)} school weeks before its window shuts. It is the thing to pick up tonight, not maths.`,
    )
  } else if (plan.pickUp && !plan.allDone) {
    actions.push(`▶️ Tonight: ${plan.pickUp.emoji} ${plan.pickUp.name} — ${plan.pickUp.perWeek.toFixed(1)} chapters a week from here. ${APP}/steugene7/subjects`)
  }

  // --- sealed misses (§24f) — the button is on Dad's desk ---
  const sealedBy: Record<string, number> = {}
  for (const lock of locks) {
    if (lock.allowedAt || lock.clearedAt) continue
    sealedBy[lock.subtopicId] = (sealedBy[lock.subtopicId] ?? 0) + seLockLeft(lock).length
  }
  const sealed = Object.values(sealedBy).reduce((n, v) => n + v, 0)
  if (sealed > 0) {
    const where = Object.entries(sealedBy)
      .map(([id, n]) => `${seFind(id)?.subtopic.title ?? id} (${n})`)
      .join(', ')
    actions.unshift(`🔒 ${sealed} mistake${sealed === 1 ? '' : 's'} sealed and waiting on you — ${where}. Until you unlock them they keep counting against him. ${APP}/steugene7/desk`)
  }

  // --- worst first, same bar as the Report (§24i) ---
  const scored = Object.entries(stats)
    .map(([id, stat]) => ({ id, stat, now: nowBy[id], pct: sePct(nowBy[id], stat) ?? 0, where: seFind(id) }))
    .filter((r) => r.where && r.stat.attempts > 0)
  const help = scored
    .filter((r) => r.pct < 60 && (r.now?.asked ?? r.stat.attempts) >= SE_CAN_MIN_ATTEMPTS)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5)
  for (const r of help) {
    rows.push({
      label: `🆘 ${r.where!.subtopic.emoji} ${r.where!.subtopic.title}`,
      value: `${r.pct}%`,
      note: `${r.where!.subject.name} · ${r.now ? `${r.now.right}/${r.now.asked} right now` : `${r.stat.right}/${r.stat.attempts}`}${r.now && r.now.broken ? ` · ❌ ${r.now.broken} still wrong` : ''}${sealedBy[r.id] ? ` · 🔒 ${sealedBy[r.id]} sealed` : ''} · last ${prettyDay(dayKey(new Date(r.stat.lastAt)))}`,
      tone: 'bad',
    })
  }

  // --- the questions he still gets wrong, as he saw them (§24u) ---
  const stillWrong = new Set<string>()
  for (const a of history) {
    if (a.right) stillWrong.delete(a.id)
    else stillWrong.add(a.id)
  }
  const retired = seRetired(locks, history)
  const open = [...history]
    .reverse()
    .filter((a) => !a.right && stillWrong.has(a.id) && !retired.has(a.id))
    .filter((a, i, all) => all.findIndex((x) => x.id === a.id) === i)
  const bullets = open.length
    ? open.slice(0, 6).map((a) => `${seFind(a.subtopicId)?.subtopic.emoji ?? '•'} ${a.prompt} — he said “${a.given}”, it is “${a.expected}”${a.helped ? ' (he asked for a nudge first)' : ''}`)
    : ['Nothing on record that he still gets wrong. 🎉']

  return {
    done: doneAll,
    actions,
    section: {
      title: '🏫 St. Eugene 7',
      lead,
      rows,
      bulletsTitle: open.length ? 'Questions his latest answer still gets wrong' : undefined,
      bullets,
      foot: `Your report: ${APP}/steugene7/report · the desk: ${APP}/steugene7/desk`,
    },
  }
}

function fmtHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} m` : `${h} h`
}

// --- the email ---------------------------------------------------------------

export function buildWeeklyEmail(input: { data: AppData; market: MarketData | null; now?: number }): WeeklyEmail {
  const now = input.now ?? Date.now()
  const m = money(input.data, input.market, now)
  const s = school(input.data, now)
  const when = new Date(now).toLocaleDateString('en-CA', { weekday: 'short', day: 'numeric', month: 'short' })

  // Five, ranked, because a list of nine is a list nobody acts on.
  const actions = [...s.actions, ...m.actions].slice(0, 5)

  const subject = `Ben · week to ${when} — 🏦 ${fmt$(m.total)} · 🏫 ${s.done} chapters done`
  return { subject, text: renderText(subject, actions, [m.section, s.section]), html: renderHtml(subject, actions, [m.section, s.section], when) }
}

function renderText(subject: string, actions: string[], sections: Section[]): string {
  const out: string[] = [subject, '='.repeat(subject.length), '']
  if (actions.length) {
    out.push('🎯 DO THIS WEEK', '')
    actions.forEach((a, i) => out.push(`${i + 1}. ${a.replace(/\*\*/g, '')}`))
    out.push('')
  } else {
    out.push('🎯 Nothing is waiting on you this week.', '')
  }
  for (const sec of sections) {
    out.push(sec.title, '-'.repeat(sec.title.length))
    if (sec.lead) out.push(sec.lead, '')
    for (const r of sec.rows ?? []) {
      out.push(`  ${r.label.padEnd(26)} ${r.value}`)
      if (r.note) out.push(`  ${' '.repeat(26)} ${r.note}`)
    }
    if (sec.bullets?.length) {
      out.push('')
      if (sec.bulletsTitle) out.push(`  ${sec.bulletsTitle}:`)
      for (const b of sec.bullets) out.push(`  • ${b}`)
    }
    if (sec.foot) out.push('', sec.foot)
    out.push('')
  }
  out.push('--', 'Sent every Sunday by scripts/weekly-email.mjs (§25). Nothing in this email changes anything.')
  return out.join('\n')
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Turns the bare URLs in the copy into links, after escaping. */
const link = (s: string) => esc(s).replace(/(https?:\/\/[^\s·]+)/g, '<a href="$1" style="color:#2e63a4">$1</a>')

function renderHtml(subject: string, actions: string[], sections: Section[], when: string): string {
  const tone = { good: '#1a7f37', bad: '#b42318', warn: '#b25e00' }
  const card = (inner: string) =>
    `<div style="background:#ffffff;border:1px solid #e6e2d8;border-radius:12px;padding:16px 18px;margin:0 0 16px">${inner}</div>`

  const sectionHtml = (sec: Section) =>
    card(
      `<div style="font:700 19px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1a16;margin:0 0 10px">${esc(sec.title)}</div>` +
        (sec.lead ? `<p style="font:400 15px/1.5 -apple-system,sans-serif;color:#443d33;margin:0 0 14px">${link(sec.lead)}</p>` : '') +
        `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">` +
        (sec.rows ?? [])
          .map(
            (r) =>
              `<tr><td style="padding:7px 0;border-top:1px solid #f0ece3;font:400 14px/1.4 -apple-system,sans-serif;color:#1d1a16">` +
              `<strong>${esc(r.label)}</strong>` +
              `<span style="float:right;font-weight:700;color:${r.tone ? tone[r.tone] : '#1d1a16'}">${esc(r.value)}</span>` +
              (r.note ? `<div style="color:#7a7266;font-size:12.5px;margin-top:2px">${esc(r.note)}</div>` : '') +
              `</td></tr>`,
          )
          .join('') +
        `</table>` +
        (sec.bullets?.length
          ? (sec.bulletsTitle
              ? `<div style="margin:16px 0 0;font:700 13px/1.4 -apple-system,sans-serif;color:#1d1a16">${esc(sec.bulletsTitle)}</div>`
              : '') +
            `<ul style="margin:${sec.bulletsTitle ? 6 : 14}px 0 0;padding-left:20px;font:400 13.5px/1.6 -apple-system,sans-serif;color:#443d33">${sec.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
          : '') +
        (sec.foot ? `<p style="margin:14px 0 0;font:400 12.5px/1.5 -apple-system,sans-serif;color:#7a7266">${link(sec.foot)}</p>` : ''),
    )

  const actionsHtml = actions.length
    ? `<div style="background:#fff8e6;border:1px solid #f0d58a;border-radius:12px;padding:16px 18px;margin:0 0 16px">` +
      `<div style="font:700 19px/1.3 -apple-system,sans-serif;color:#6b4a00;margin:0 0 10px">🎯 Do this week</div>` +
      `<ol style="margin:0;padding-left:22px;font:400 14.5px/1.6 -apple-system,sans-serif;color:#4a3800">${actions.map((a) => `<li style="margin-bottom:7px">${link(a)}</li>`).join('')}</ol>` +
      `</div>`
    : card(`<div style="font:700 17px/1.3 -apple-system,sans-serif;color:#1a7f37">🎯 Nothing is waiting on you this week.</div>`)

  return (
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>` +
    `<body style="margin:0;padding:18px 12px;background:#faf7f0">` +
    `<div style="max-width:620px;margin:0 auto">` +
    `<div style="font:800 22px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1a16;margin:0 0 4px">🏴‍☠️ Ben’s week</div>` +
    `<div style="font:400 13px/1.4 -apple-system,sans-serif;color:#7a7266;margin:0 0 16px">week to ${esc(when)}</div>` +
    actionsHtml +
    sections.map(sectionHtml).join('') +
    `<p style="font:400 12px/1.5 -apple-system,sans-serif;color:#9a9284;margin:4px 0 0">Sent every Sunday by <code>scripts/weekly-email.mjs</code> (§25). It only reads — nothing in this email changed anything.</p>` +
    `</div></body></html>`
  )
}
