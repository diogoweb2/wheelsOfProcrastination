import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { dayKey, prettyDay } from '../logic/dates'
import { sfx } from '../audio'

type Node =
  | { kind: 'task'; key: string; day: string; name: string; effort: string; urgent: boolean }
  | { kind: 'ice'; key: string; day: string }
  | { kind: 'today'; key: string; day: string }

const OFFSETS = [0, 46, 74, 46, 0, -46, -74, -46]

export function MapSection({ goSpin }: { goSpin: () => void }) {
  const { data } = useStore()
  const [open, setOpen] = useState(false)
  const today = dayKey()

  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = []
    if (!data.completions.some((c) => c.day === today)) {
      out.push({ kind: 'today', key: 'today', day: today })
    }
    const items: { day: string; node: Node }[] = []
    for (const c of data.completions) {
      items.push({
        day: c.day,
        node: { kind: 'task', key: c.id, day: c.day, name: c.taskName, effort: c.effort, urgent: c.wasUrgent },
      })
    }
    for (const f of data.frozenDays) {
      items.push({ day: f.day, node: { kind: 'ice', key: `ice-${f.day}`, day: f.day } })
    }
    items.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
    return [...out, ...items.map((i) => i.node)]
  }, [data.completions, data.frozenDays, today])

  let lastDay = ''

  return (
    <>
      <div className="h2">🗺️ The Grand Line</div>
      <div className="card" style={{ marginBottom: 14 }}>
        <p className="muted" style={{ fontSize: 13 }}>
          Every island is a quest you conquered. Sail back to the start.
        </p>
        <button
          className="btn btn--ghost btn--small"
          style={{ marginTop: 8 }}
          onClick={() => {
            sfx.click()
            setOpen((o) => !o)
          }}
        >
          {open ? 'Hide the map' : `Unroll the map (${data.completions.length} islands)`}
        </button>

        {open && (
          <div style={{ marginTop: 14 }}>
            {nodes.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <img src="/luffy-map.png" width={150} height={150} alt="Luffy" draggable={false} className="float" style={{ objectFit: 'contain' }} />
                <p className="muted" style={{ marginTop: 10 }}>
                  No islands yet. Every voyage begins with one spin.
                </p>
              </div>
            )}

            {nodes.map((node, i) => {
              const offset = OFFSETS[i % OFFSETS.length]
              const showDay = node.day !== lastDay
              lastDay = node.day
              return (
                <div key={node.key}>
                  {showDay && (
                    <div className="map-day" style={{ textAlign: 'center', margin: '6px 0 14px' }}>
                      — {node.day === today ? 'today' : prettyDay(node.day)} —
                    </div>
                  )}
                  <div className="map-row" style={{ justifyContent: 'center' }}>
                    <div style={{ transform: `translateX(${offset}px)`, display: 'flex', alignItems: 'center', gap: 12 }}>
                      {node.kind === 'today' ? (
                        <>
                          <button className="map-node map-node--today" onClick={goSpin}>
                            🎡
                          </button>
                          <div className="map-label" style={{ color: 'var(--muted)' }}>
                            Nothing yet…
                            <br />
                            <span style={{ color: 'var(--green)' }}>tap to spin!</span>
                          </div>
                        </>
                      ) : node.kind === 'ice' ? (
                        <>
                          <div className="map-node map-node--ice">🧊</div>
                          <div className="map-label" style={{ color: 'var(--ice)' }}>
                            Frozen day
                            <br />
                            <span className="muted">a freeze died for this</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`map-node effort-${node.effort}`}>
                            ✓{node.urgent && <span className="zap">⚡</span>}
                          </div>
                          <div className="map-label">{node.name}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {nodes.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <img src="/luffy-map.png" width={110} height={110} alt="Luffy" draggable={false} className="float" style={{ objectFit: 'contain' }} />
                <p className="muted">Where it all began. Set sail!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
