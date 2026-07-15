import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { dayKey, prettyDay } from '../logic/dates'
import { Luffy } from '../components/Luffy'

type Node =
  | { kind: 'task'; key: string; day: string; name: string; effort: string; urgent: boolean }
  | { kind: 'ice'; key: string; day: string }
  | { kind: 'today'; key: string; day: string }

const OFFSETS = [0, 46, 74, 46, 0, -46, -74, -46]

export function MapScreen({ goSpin }: { goSpin: () => void }) {
  const { data } = useStore()
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
    <div className="screen">
      <div className="h1">The Grand Line</div>
      <p className="muted" style={{ marginBottom: 20 }}>
        Every island is a quest you conquered. Scroll down to sail back to the start.
      </p>

      {nodes.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Luffy mood="sleeping" size={150} />
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
          <Luffy mood="idle" size={110} />
          <p className="muted">Where it all began. Set sail!</p>
        </div>
      )}
    </div>
  )
}
