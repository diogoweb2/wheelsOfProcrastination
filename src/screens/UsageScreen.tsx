// 📈 Usage (§26) — the analytics report, Diogo only. One URL per page:
//   /usage/apps      every app and page, by opens and time
//   /usage/unused    the cleanup list: pages nobody opened in the window
//   /usage/actions   what was actually done and tapped, ranked
//   /usage/people    Ben and me side by side, and the hours we each use it
//   /usage/log       the raw tail, newest first
//
// It reads `usage/*` live (src/lib/usage.ts writes it) and does all its
// arithmetic in src/logic/usageReport.ts, which `npm run usage` shares.
import { useEffect, useMemo, useState } from 'react'
import { RETAIN_DAYS, clearUsage, subscribeUsage } from '../lib/usage'
import {
  dayLabel,
  minutes,
  rollUsage,
  tail,
  whoLabel,
  type AppRow,
  type PersonRow,
  type Row,
  type Usage,
} from '../logic/usageReport'
import type { UsageDay } from '../types'
import { sfx } from '../audio'

export function UsageScreen({ tab }: { tab: string }) {
  const [days, setDays] = useState<UsageDay[] | null>(null)
  useEffect(() => subscribeUsage(setDays), [])
  const roll = useMemo(() => (days ? rollUsage(days) : null), [days])

  if (!roll) {
    return (
      <div className="screen">
        <p className="muted">Reading the log…</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <Window r={roll} />
      {tab === 'apps' && <AppsPage r={roll} />}
      {tab === 'unused' && <UnusedPage r={roll} />}
      {tab === 'actions' && <ActionsPage r={roll} />}
      {tab === 'people' && <PeoplePage r={roll} />}
      {tab === 'log' && <LogPage r={roll} days={days ?? []} />}
    </div>
  )
}

// --- shared ------------------------------------------------------------------

function Window({ r }: { r: Usage }) {
  if (r.docs === 0) {
    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>Nothing logged yet</div>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Every page open, tap and action is recorded from now on. Come back in a week.
        </p>
      </div>
    )
  }
  return (
    <div className="use-window">
      {r.from === r.to ? dayLabel(r.from) : `${dayLabel(r.from)} → ${dayLabel(r.to)}`} · {r.dayCount} day
      {r.dayCount === 1 ? '' : 's'} · keeps {RETAIN_DAYS}
    </div>
  )
}

function Widget({ head, big, sub }: { head: string; big: string; sub?: string }) {
  return (
    <div className="card">
      <div className="widget-head">{head}</div>
      <div className="widget-big">{big}</div>
      {sub && <div className="widget-sub">{sub}</div>}
    </div>
  )
}

const num = (n: number) => n.toLocaleString()

/** Who did it, as one chip per person. */
function Split({ by }: { by: Record<string, number> }) {
  const parts = Object.entries(by).sort((a, b) => b[1] - a[1])
  if (parts.length === 0) return null
  return (
    <span className="use-split">
      {parts.map(([pid, n]) => (
        <span key={pid} className={`use-who use-who--${pid}`}>
          {whoLabel(pid)} {num(n)}
        </span>
      ))}
    </span>
  )
}

/** One ranked row with a proportional bar. */
function BarRow({
  label,
  value,
  of,
  right,
  by,
  note,
  color,
}: {
  label: string
  value: number
  of: number
  right: string
  by?: Record<string, number>
  note?: string
  color?: string
}) {
  const pct = of > 0 ? Math.max(2, Math.round((value / of) * 100)) : 0
  return (
    <div className="use-row">
      <div className="use-row-top">
        <span className="use-row-name">{label}</span>
        <span className="use-row-val">{right}</span>
      </div>
      <div className="use-bar">
        <i style={{ width: `${pct}%`, background: color ?? 'var(--blue)' }} />
      </div>
      {(by || note) && (
        <div className="use-row-foot">
          {note && <span className="muted" style={{ fontSize: 11 }}>{note}</span>}
          {by && <Split by={by} />}
        </div>
      )}
    </div>
  )
}

/** A ranked list with a filter box and a "show everything" tail. */
function Ranked({ rows, unit, empty }: { rows: Row[]; unit: string; empty: string }) {
  const [find, setFind] = useState('')
  const [all, setAll] = useState(false)
  const needle = find.trim().toLowerCase()
  const shown = needle ? rows.filter((r) => r.name.toLowerCase().includes(needle)) : rows
  const top = all ? shown : shown.slice(0, 40)
  const max = shown[0]?.count ?? 0

  return (
    <>
      <div className="search-row" data-usage="usage filter">
        <span>🔍</span>
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={`Find a ${unit}…`} />
        {find && (
          <button className="search-clear" onClick={() => setFind('')}>
            ✕
          </button>
        )}
      </div>
      {shown.length === 0 && <p className="muted">{needle ? `No ${unit} matches “${find}”.` : empty}</p>}
      {top.map((row) => (
        <BarRow
          key={row.key}
          label={row.name}
          value={row.count}
          of={max}
          right={num(row.count)}
          by={row.by}
          note={`${row.days} day${row.days === 1 ? '' : 's'} · last ${dayLabel(row.lastDate)}`}
        />
      ))}
      {!all && shown.length > top.length && (
        <button className="btn btn--ghost btn--small" style={{ marginTop: 10 }} onClick={() => setAll(true)}>
          Show all {shown.length}
        </button>
      )}
    </>
  )
}

// --- /usage/apps -------------------------------------------------------------

function AppsPage({ r }: { r: Usage }) {
  const max = r.apps[0]?.opens ?? 0
  return (
    <>
      <div className="widget-grid" style={{ marginTop: 10 }}>
        <Widget head="Time in app" big={minutes(r.seconds)} sub={`${r.dayCount} days logged`} />
        <Widget head="Page opens" big={num(r.apps.reduce((s, a) => s + a.opens, 0))} sub={`${r.apps.length} apps touched`} />
        <Widget head="Everything logged" big={num(r.events)} sub={`${num(r.docs)} day files`} />
        <Widget
          head="Unused pages"
          big={num(r.dead.reduce((s, d) => s + d.tabs.length, 0))}
          sub={`${r.dead.filter((d) => d.whole).length} whole apps cold`}
        />
      </div>

      <h2 className="h2">Apps, most used first</h2>
      {r.apps.map((app) => (
        <AppCard key={app.id} app={app} of={max} />
      ))}
      {r.apps.length === 0 && <p className="muted">No page opens recorded yet.</p>}
    </>
  )
}

function AppCard({ app, of }: { app: AppRow; of: number }) {
  return (
    <details className="card use-app">
      <summary>
        <div className="use-app-head">
          <span className="use-app-icon">{app.icon}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="use-app-name">
              {app.name}
              {app.adminOnly ? ' · parent' : ''}
              {app.hidden ? ' · hidden' : ''}
              {!app.known ? ' · gone' : ''}
            </span>
            <span className="use-app-sub">
              {num(app.opens)} opens · {minutes(app.seconds)} · {app.days} day{app.days === 1 ? '' : 's'}
            </span>
          </span>
          <span className="use-row-val">{minutes(app.seconds)}</span>
        </div>
        <div className="use-bar">
          <i
            style={{
              width: `${of > 0 ? Math.max(2, Math.round((app.opens / of) * 100)) : 0}%`,
              background: app.opens === 0 ? 'var(--red)' : 'var(--green)',
            }}
          />
        </div>
        <div className="use-row-foot">
          <Split by={app.by} />
        </div>
      </summary>
      <div style={{ marginTop: 8 }}>
        {app.tabs.map((t) => (
          <BarRow
            key={`${t.app}-${t.tab}`}
            label={`${t.label} · /${t.app}/${t.tab}`}
            value={t.count}
            of={app.tabs[0]?.count ?? 0}
            right={`${num(t.count)} · ${minutes(t.seconds)}`}
            by={t.by}
            note={t.count === 0 ? 'never opened' : `last ${dayLabel(t.lastDate)}`}
            color={t.count === 0 ? 'var(--red)' : t.known ? 'var(--blue)' : 'var(--orange)'}
          />
        ))}
      </div>
    </details>
  )
}

// --- /usage/unused ----------------------------------------------------------

function UnusedPage({ r }: { r: Usage }) {
  const cold = r.dead.reduce((s, d) => s + d.tabs.length, 0)
  const whole = r.dead.filter((d) => d.whole)
  const part = r.dead.filter((d) => !d.whole)
  return (
    <>
      <div className="card" style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 15 }}>
          {cold} page{cold === 1 ? '' : 's'} nobody opened
        </div>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Over {r.dayCount} day{r.dayCount === 1 ? '' : 's'} of log. A page is only really dead once the window is a
          full week or more — read this with the date range above in mind.
        </p>
      </div>

      {whole.length > 0 && <h2 className="h2">Whole apps, untouched</h2>}
      {whole.map((d) => (
        <div className="card use-dead use-dead--whole" key={d.app}>
          <div className="use-app-head">
            <span className="use-app-icon">{d.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="use-app-name">{d.name}</span>
              <span className="use-app-sub">
                /{d.app}/* · {d.tabs.length} page{d.tabs.length === 1 ? '' : 's'}
                {d.adminOnly ? ' · parent only' : ''}
                {d.hidden ? ' · already hidden' : ''}
              </span>
            </span>
          </div>
        </div>
      ))}

      {part.length > 0 && <h2 className="h2">Pages inside an app that is used</h2>}
      {part.map((d) => (
        <div className="card use-dead" key={d.app}>
          <div className="use-app-head">
            <span className="use-app-icon">{d.icon}</span>
            <span className="use-app-name" style={{ flex: 1 }}>
              {d.name}
            </span>
          </div>
          <div className="use-chips">
            {d.tabs.map((t) => (
              <span className="chip" key={t.id}>
                /{d.app}/{t.id}
              </span>
            ))}
          </div>
        </div>
      ))}

      {r.dead.length === 0 && <p className="muted">Every page in the registry was opened. Nothing to clean up.</p>}

      {r.ghosts.length > 0 && (
        <>
          <h2 className="h2">Opened, but no longer in the registry</h2>
          {r.ghosts.map((g) => (
            <BarRow
              key={g.key}
              label={`/${g.app}/${g.tab}`}
              value={g.count}
              of={r.ghosts[0].count}
              right={num(g.count)}
              by={g.by}
              note={`last ${dayLabel(g.lastDate)}`}
              color="var(--orange)"
            />
          ))}
        </>
      )}
    </>
  )
}

// --- /usage/actions ----------------------------------------------------------

function ActionsPage({ r }: { r: Usage }) {
  const [which, setWhich] = useState<'act' | 'tap'>('act')
  return (
    <>
      <div className="seg" style={{ margin: '10px 0 14px' }}>
        <button className={which === 'act' ? 'on' : ''} onClick={() => { sfx.click(); setWhich('act') }}>
          Actions {num(r.actions.length)}
        </button>
        <button className={which === 'tap' ? 'on' : ''} onClick={() => { sfx.click(); setWhich('tap') }}>
          Taps {num(r.taps.length)}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        {which === 'act'
          ? 'Every store action that ran — the feature was not just opened, it was used.'
          : 'Every button, link and tappable, by what it says on it.'}
      </p>
      {which === 'act' ? (
        <Ranked rows={r.actions} unit="action" empty="No actions recorded yet." />
      ) : (
        <Ranked rows={r.taps} unit="button" empty="No taps recorded yet." />
      )}
    </>
  )
}

// --- /usage/people -----------------------------------------------------------

function PeoplePage({ r }: { r: Usage }) {
  return (
    <>
      <h2 className="h2">Who uses what</h2>
      {r.people.map((p) => (
        <PersonCard key={p.id} p={p} />
      ))}
      {r.people.length === 0 && <p className="muted">Nobody has opened the app since logging began.</p>}

      <h2 className="h2">Day by day</h2>
      {r.perDay.map((d) => (
        <BarRow
          key={d.date}
          label={dayLabel(d.date)}
          value={d.events}
          of={Math.max(...r.perDay.map((x) => x.events), 1)}
          right={minutes(d.seconds)}
          by={d.by}
        />
      ))}
    </>
  )
}

function PersonCard({ p }: { p: PersonRow }) {
  const peak = Math.max(...p.hours, 1)
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="use-app-head">
        <span className="use-app-name" style={{ flex: 1, fontSize: 17 }}>
          {p.name}
        </span>
        <span className="use-row-val">{minutes(p.seconds)}</span>
      </div>
      <div className="use-app-sub" style={{ marginBottom: 10 }}>
        {p.days} day{p.days === 1 ? '' : 's'} · {num(p.logins)} logins · {num(p.views)} page opens ·{' '}
        {num(p.actions)} actions · {num(p.taps)} taps
        {p.devices.length > 0 ? ` · ${p.devices.join(', ')}` : ''}
      </div>

      <div className="use-hours">
        {p.hours.map((n, hour) => (
          <span key={hour} title={`${hour}:00 — ${n} events`}>
            <i style={{ height: `${Math.round((n / peak) * 100)}%` }} />
            {hour % 6 === 0 && <em>{hour}</em>}
          </span>
        ))}
      </div>

      {p.apps.slice(0, 6).map((a) => (
        <BarRow
          key={a.id}
          label={`${a.icon} ${a.name}`}
          value={a.seconds}
          of={p.apps[0]?.seconds || 1}
          right={`${minutes(a.seconds)} · ${num(a.opens)}`}
        />
      ))}
    </div>
  )
}

// --- /usage/log --------------------------------------------------------------

function LogPage({ r, days }: { r: Usage; days: UsageDay[] }) {
  const [who, setWho] = useState('all')
  const [find, setFind] = useState('')
  const [sure, setSure] = useState(false)
  const [wiped, setWiped] = useState<number | null>(null)
  const rows = useMemo(() => tail(days, 600), [days])

  const needle = find.trim().toLowerCase()
  const shown = rows.filter(
    (e) =>
      (who === 'all' || e.profileId === who) &&
      (!needle || e.k.toLowerCase().includes(needle) || (e.p ?? '').toLowerCase().includes(needle)),
  )

  const people = [...new Set(rows.map((e) => e.profileId))]

  return (
    <>
      <div className="seg" style={{ margin: '10px 0 10px' }}>
        <button className={who === 'all' ? 'on' : ''} onClick={() => { sfx.click(); setWho('all') }}>
          Everyone
        </button>
        {people.map((pid) => (
          <button key={pid} className={who === pid ? 'on' : ''} onClick={() => { sfx.click(); setWho(pid) }}>
            {whoLabel(pid)}
          </button>
        ))}
      </div>

      <div className="search-row" data-usage="usage log filter">
        <span>🔍</span>
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find an event…" />
        {find && (
          <button className="search-clear" onClick={() => setFind('')}>
            ✕
          </button>
        )}
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        Newest first · {num(shown.length)} shown of {num(rows.length)} kept
        {r.dropped > 0 ? ` · ${num(r.dropped)} older events rolled up into the counts only` : ''}
      </p>

      <div className="use-log">
        {shown.map((e, i) => (
          <div className="use-log-row" key={`${e.t}-${i}`}>
            <span className="use-log-at">
              {new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`use-who use-who--${e.profileId}`}>{whoLabel(e.profileId)}</span>
            <span className="use-log-key">{e.k}</span>
            {e.p && e.p !== e.k.slice(e.k.indexOf(':') + 1).replace(/-/g, ' ') && (
              <span className="use-log-p">{e.p}</span>
            )}
            {e.v !== undefined && <span className="use-log-v">{e.v}</span>}
            {e.r && <span className="use-log-r">{e.r}</span>}
          </div>
        ))}
        {shown.length === 0 && <p className="muted">Nothing matches.</p>}
      </div>

      <h2 className="h2">Housekeeping</h2>
      <div className="card">
        <p className="muted" style={{ margin: '0 0 10px' }}>
          Nothing older than {RETAIN_DAYS} days is kept — the app sweeps it once a day. {num(r.docs)} day file
          {r.docs === 1 ? '' : 's'} right now, from {r.devices.join(', ') || 'no device yet'}.
        </p>
        <button
          className="btn btn--red btn--small"
          onClick={() => {
            if (!sure) {
              sfx.click()
              setSure(true)
              return
            }
            sfx.sad()
            setSure(false)
            void clearUsage().then(setWiped)
          }}
        >
          {sure ? 'Sure? Delete the whole log' : '🧹 Start the week over'}
        </button>
        {wiped !== null && (
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Deleted {wiped} day file{wiped === 1 ? '' : 's'}. Logging carries on from now.
          </p>
        )}
      </div>
    </>
  )
}
