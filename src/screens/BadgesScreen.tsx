import { useStore } from '../store/useStore'

export function BadgesScreen() {
  const { data } = useStore()

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="h1" style={{ flex: 1 }}>Trophy shelf</div>
        <div style={{ fontSize: 40 }}>🏅</div>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Prizes you've earned on the journey. {data.badges.length} collected so far.
      </p>

      {data.badges.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 64 }}>🏝️</div>
          <p className="muted" style={{ marginTop: 10 }}>
            Empty shelf. Very minimalist. Very sad. Go earn some badges!
          </p>
        </div>
      ) : (
        <div className="badge-shelf">
          {[...data.badges].reverse().map((b) => (
            <div key={b.id} className="badge-tile" title={b.description}>
              <div className="e">{b.emoji}</div>
              <div className="t">{b.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
