// 👁️ /admin/apps (§1e) — what each of us sees on the home screen and in each
// app's bottom menu. The roster (registry.ts) holds the defaults; this page
// writes per-person overrides into that person's `settings.appVisibility`.
//
// Hiding is never deleting: a hidden app or tab keeps working at its own URL
// (§1c), keeps its data, and comes back with one tap here.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID, PARENT_ID } from '../store/storage'
import {
  APPS,
  VISIBILITY_LOCKED,
  appShown,
  tabShown,
  tabsFor,
  type AppDef,
  type AppTabDef,
  type AppVisibility,
} from '../apps/registry'
import { sfx } from '../audio'

type Who = typeof PARENT_ID | typeof KID_ID

export function AppVisibilityDesk() {
  const { data, kidData, kidDataFresh, profiles, setSettingsFor } = useStore()
  const [openApp, setOpenApp] = useState<string | null>(null)

  const people: { id: Who; name: string; vis?: AppVisibility; dailyMode?: 'today' | 'wheel'; ready: boolean }[] = [
    {
      id: PARENT_ID,
      name: profiles.find((p) => p.id === PARENT_ID)?.name ?? 'Diogo',
      vis: data.settings.appVisibility,
      dailyMode: data.settings.dailyMode,
      ready: true,
    },
    {
      id: KID_ID,
      name: profiles.find((p) => p.id === KID_ID)?.name ?? 'Ben',
      vis: kidData?.settings.appVisibility,
      dailyMode: kidData?.settings.dailyMode,
      // his settings are only written once his doc has come from the server
      ready: !!kidData && kidDataFresh,
    },
  ]

  /** Does this person have this app at all (parent-only apps are not Ben's to see)? */
  const has = (who: Who, app: AppDef) => !app.adminOnly || who === PARENT_ID

  function write(who: Who, key: string, shown: boolean, byDefault: boolean) {
    const person = people.find((p) => p.id === who)!
    if (!person.ready) return
    sfx.click()
    const next: AppVisibility = { ...(person.vis ?? {}) }
    // store only what differs from the roster, so a changed default still reaches him
    if (shown === byDefault) delete next[key]
    else next[key] = shown
    setSettingsFor(who, { appVisibility: next })
  }

  function reset(who: Who) {
    const person = people.find((p) => p.id === who)!
    if (!person.ready) return
    sfx.click()
    setSettingsFor(who, { appVisibility: {} })
  }

  const games = APPS.filter((a) => a.folder === 'games')
  const rest = APPS.filter((a) => a.folder !== 'games')

  const shownCount = (who: Who) => {
    const vis = people.find((p) => p.id === who)!.vis
    return APPS.filter((a) => has(who, a) && appShown(a, vis)).length
  }

  function appRow(app: AppDef) {
    const locked = VISIBILITY_LOCKED.includes(app.id)
    const expanded = openApp === app.id
    return (
      <div key={app.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="btn btn--ghost btn--small"
            style={{ flex: 1, minWidth: 0, width: 'auto', justifyContent: 'flex-start', textAlign: 'left', padding: '6px 8px' }}
            onClick={() => setOpenApp(expanded ? null : app.id)}
            aria-expanded={expanded}
          >
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {expanded ? '▾' : '▸'} {app.icon} {app.name}
              {app.gate ? <span className="muted" style={{ fontSize: 11 }}> · trip mode only</span> : null}
            </span>
          </button>
          {people.map((p) =>
            has(p.id, app) ? (
              <Toggle
                key={p.id}
                label={p.name}
                on={appShown(app, p.vis)}
                disabled={locked || !p.ready}
                onClick={() => write(p.id, app.id, !appShown(app, p.vis), !app.hidden)}
              />
            ) : (
              <Blank key={p.id} />
            ),
          )}
        </div>
        {expanded && tabRows(app)}
      </div>
    )
  }

  function tabRows(app: AppDef) {
    // each person may have a different menu (the parent's own tabs, Today mode),
    // so the rows are the union of both, in the order they first appear
    const lists = people.map((p) => (has(p.id, app) ? tabsFor(app, p.id, p.dailyMode) : []))
    const rows: AppTabDef[] = []
    for (const list of lists) for (const t of list) if (!rows.some((r) => r.id === t.id)) rows.push(t)

    return (
      <div style={{ paddingLeft: 18, marginTop: 4 }}>
        {rows.map((tab) => {
          const key = `${app.id}/${tab.id}`
          return (
            <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                {tab.icon} {tab.label}
                <span className="muted" style={{ fontSize: 11 }}> · /{key}</span>
              </div>
              {people.map((p, i) => {
                const own = lists[i].find((t) => t.id === tab.id)
                if (!own) return <Blank key={p.id} />
                const on = tabShown(app, own, p.vis)
                // the last tab showing on someone's menu stays: an app with no menu is a dead end
                const lastOne = on && lists[i].filter((t) => tabShown(app, t, p.vis)).length <= 1
                return (
                  <Toggle
                    key={p.id}
                    label={p.name}
                    on={on}
                    disabled={VISIBILITY_LOCKED.includes(key) || lastOne || !p.ready}
                    onClick={() => write(p.id, key, !on, !own.hidden)}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 900 }}>👁️ What each of you sees</div>
      <p className="muted" style={{ fontSize: 12, margin: '4px 0 0', lineHeight: 1.45 }}>
        Tap a name to show or hide that app on their home screen. Tap ▸ for its pages in the bottom menu. Hidden is
        not deleted — the page still works at its own address and keeps its data.
      </p>
      <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
        {people.map((p) => `${p.name}: ${shownCount(p.id)} apps`).join(' · ')}
      </p>
      {!people[1].ready && (
        <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          loading {people[1].name}’s log from the cloud…
        </p>
      )}

      <div style={{ marginTop: 8 }}>
        {rest.map(appRow)}
        <div className="muted" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: '12px 0 2px' }}>
          🎮 Games folder
        </div>
        {games.map(appRow)}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {people.map((p) => (
          <button key={p.id} className="btn btn--small" style={{ width: 'auto' }} disabled={!p.ready} onClick={() => reset(p.id)}>
            ↩︎ {p.name}: back to the defaults
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, on, disabled, onClick }: { label: string; on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      className="btn btn--small"
      style={{
        width: 64,
        flex: '0 0 auto',
        padding: '6px 4px',
        fontSize: 12,
        background: on ? undefined : 'transparent',
        boxShadow: on ? undefined : 'inset 0 0 0 2px var(--line)',
        color: on ? undefined : 'var(--muted)',
        textDecoration: on ? undefined : 'line-through',
      }}
      disabled={disabled}
      aria-pressed={on}
      onClick={onClick}
    >
      {on ? '✓' : '·'} {label}
    </button>
  )
}

/** This person doesn't have this app/tab at all. */
function Blank() {
  return <span style={{ width: 64, flex: '0 0 auto' }} />
}
