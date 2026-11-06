// §26 — the usage report as text. Bundled and run by `scripts/usage-report.mjs`.
//
// It shares `src/logic/usageReport.ts` with the in-app screen on purpose: the
// terminal and `/usage/apps` can never disagree about what got used.
import { dayLabel, minutes, rollUsage, whoLabel, type Row } from '../src/logic/usageReport'
import type { UsageDay } from '../src/types'

const num = (n: number) => n.toLocaleString('en-US')
const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length))
const left = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : pad(s, n))

function bar(value: number, max: number, width = 18): string {
  if (max <= 0) return ''
  const full = Math.max(value > 0 ? 1 : 0, Math.round((value / max) * width))
  return '█'.repeat(full) + '░'.repeat(width - full)
}

function split(by: Record<string, number>): string {
  return Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .map(([pid, n]) => `${whoLabel(pid).toLowerCase()} ${num(n)}`)
    .join(', ')
}

function rows(list: Row[], top: number): string[] {
  const max = list[0]?.count ?? 0
  return list.slice(0, top).map((r) => `  ${left(r.name, 34)} ${pad(num(r.count), 7)} ${bar(r.count, max)}  ${split(r.by)}`)
}

export function report(days: UsageDay[], top = 25): string {
  const r = rollUsage(days)
  const out: string[] = []
  if (r.docs === 0) return 'Nothing logged yet. The app writes `usage/*` from the next time it is opened.'

  out.push(
    `📈 Usage — ${dayLabel(r.from)} → ${dayLabel(r.to)} · ${r.dayCount} day(s) · ${num(r.events)} events · ${minutes(
      r.seconds,
    )} on screen`,
  )
  out.push(`   ${num(r.docs)} day files · devices: ${r.devices.join(', ')}`)
  if (r.dropped > 0) out.push(`   ${num(r.dropped)} events past the tail, counted but not listed`)

  out.push('', 'WHO')
  for (const p of r.people) {
    out.push(
      `  ${left(p.name, 16)} ${pad(minutes(p.seconds), 8)} ${pad(`${p.days}d`, 4)} ${pad(
        `${num(p.logins)} logins`,
        12,
      )} ${pad(`${num(p.views)} opens`, 12)} ${pad(`${num(p.actions)} actions`, 14)} ${num(p.taps)} taps`,
    )
    const favourites = p.apps
      .slice(0, 5)
      .map((a) => `${a.name} ${minutes(a.seconds)}`)
      .join(' · ')
    if (favourites) out.push(`     ${favourites}`)
  }

  out.push('', 'APPS — opens · time on screen')
  const maxOpens = r.apps[0]?.opens ?? 0
  for (const app of r.apps) {
    const flags = [app.adminOnly ? 'parent' : '', app.hidden ? 'hidden' : '', app.known ? '' : 'GONE']
      .filter(Boolean)
      .join(',')
    out.push(
      `  ${left(app.name + (flags ? ` (${flags})` : ''), 28)} ${pad(num(app.opens), 6)} ${pad(
        minutes(app.seconds),
        8,
      )} ${bar(app.opens, maxOpens)}  ${split(app.by)}`,
    )
    for (const tab of app.tabs) {
      if (tab.count === 0) continue
      out.push(`      /${left(`${tab.app}/${tab.tab}`, 26)} ${pad(num(tab.count), 6)} ${minutes(tab.seconds)}`)
    }
  }

  const cold = r.dead.reduce((s, d) => s + d.tabs.length, 0)
  out.push('', `UNUSED — ${cold} page(s) nobody opened in ${r.dayCount} day(s)`)
  for (const d of r.dead) {
    const where = d.whole ? 'WHOLE APP' : 'pages'
    const flags = [d.adminOnly ? 'parent' : '', d.hidden ? 'already hidden' : ''].filter(Boolean).join(',')
    out.push(
      `  ${left(`${d.name}${flags ? ` (${flags})` : ''}`, 30)} ${pad(where, 10)} ${d.tabs
        .map((t) => `/${d.app}/${t.id}`)
        .join(' ')}`,
    )
  }
  if (r.dead.length === 0) out.push('  — every page in the registry was opened')

  if (r.ghosts.length > 0) {
    out.push('', 'OPENED BUT NO LONGER IN THE REGISTRY')
    for (const g of r.ghosts) out.push(`  /${g.app}/${g.tab}  ${num(g.count)} · last ${dayLabel(g.lastDate)}`)
  }

  out.push('', `ACTIONS — top ${top} of ${num(r.actions.length)}`, ...rows(r.actions, top))
  out.push('', `TAPS — top ${top} of ${num(r.taps.length)}`, ...rows(r.taps, top))

  out.push('', 'DAY BY DAY')
  const maxDay = Math.max(...r.perDay.map((d) => d.events), 1)
  for (const d of r.perDay) {
    out.push(`  ${left(dayLabel(d.date), 18)} ${pad(num(d.events), 7)} ${pad(minutes(d.seconds), 8)} ${bar(d.events, maxDay)}  ${split(d.by)}`)
  }

  out.push('', 'HOURS OF THE DAY')
  const peak = Math.max(...r.hours, 1)
  for (let hour = 0; hour < 24; hour++) {
    if (r.hours[hour] === 0) continue
    out.push(`  ${pad(`${hour}:00`, 6)} ${pad(num(r.hours[hour]), 7)} ${bar(r.hours[hour], peak, 24)}`)
  }

  return out.join('\n')
}
