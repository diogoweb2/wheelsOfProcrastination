// 🌙 The screen a sleeping app shows instead of itself (§23).
//
// Its whole job is to not look like a bug: it names the rule, says who set it,
// prints the exact window and counts down to the minute it lifts, and then
// points at the apps that ARE open right now. Nothing here can be dismissed —
// there is no "continue anyway", because a curfew with a back door isn't one.
import { appById } from '../apps/registry'
import { clockLabel } from '../logic/curfew'
import type { CurfewNow } from '../hooks/useCurfew'
import { sfx } from '../audio'

export function NightWatch({
  appId,
  curfewNow,
  onOpen,
}: {
  appId: string
  curfewNow: CurfewNow
  onOpen: (appId: string) => void
}) {
  const { curfew, opensAt, left } = curfewNow
  const app = appById(appId)
  const stillOpen = curfew.allow.map(appById).filter((a): a is NonNullable<typeof a> => !!a && !a.hidden)

  return (
    <div className="screen" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginTop: 24 }}>🌙</div>
      <h1 className="h1" style={{ marginTop: 4 }}>{app?.name ?? 'This app'} is asleep</h1>
      <p className="muted" style={{ maxWidth: 320, margin: '8px auto 0', lineHeight: 1.5 }}>
        Nothing is broken — this is the <b>night watch</b>, the daily schedule Dad set. Most of the crew turns in at{' '}
        <b>{clockLabel(curfew.startHour, curfew.startMin)}</b> and wakes at <b>{clockLabel(curfew.endHour, curfew.endMin)}</b>.
      </p>

      <div className="card" style={{ margin: '14px auto 0', maxWidth: 340 }}>
        <div style={{ fontWeight: 900, fontSize: 15 }}>⏳ Back in {left}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>opens again at {opensAt}</div>
      </div>

      {stillOpen.length > 0 && (
        <div className="card" style={{ margin: '10px auto 0', maxWidth: 340, textAlign: 'left' }}>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 2 }}>Still open tonight</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            The night watch never closes these — there's always something worth doing.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stillOpen.map((a) => (
              <button
                key={a.id}
                className="btn btn--small"
                style={{ width: 'auto' }}
                onClick={() => {
                  sfx.click()
                  onOpen(a.id)
                }}
              >
                {a.icon} {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        Want it changed? Ask Dad — it's the ⏳ Limits tab of his Parent app.
      </p>
    </div>
  )
}
