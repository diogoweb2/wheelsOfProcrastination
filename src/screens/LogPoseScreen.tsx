// 🧭 Log Pose — where everyone is (clocks across the crew's time zones) and who
// everyone is (the crew roster).
import { useStore } from '../store/useStore'
import { TimeZoneSection } from '../components/TimeZoneSection'
import { Chopper, Nami, Zoro } from '../components/Crew'
import { Luffy } from '../components/Luffy'

export function LogPoseScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      {tab === 'clocks' && <TimeZoneSection />}
      {tab === 'crew' && <CrewTab />}
    </div>
  )
}

const STRAW_HATS = [
  { name: 'Luffy', role: 'Captain — never stops, never explains', art: <Luffy size={72} /> },
  { name: 'Zoro', role: 'Swordsman — trains until it hurts, then trains', art: <Zoro size={72} /> },
  { name: 'Nami', role: 'Navigator — runs the money, charges interest', art: <Nami size={72} /> },
  { name: 'Chopper', role: 'Doctor — hands out the streak freezes', art: <Chopper size={72} /> },
]

function CrewTab() {
  const { profiles, activeProfileId } = useStore()

  return (
    <>
      <div className="h2">🏴‍☠️ Aboard this ship</div>
      {profiles.map((p) => (
        <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 30 }}>{p.emoji}</div>
          <div style={{ flex: 1, fontWeight: 900, fontSize: 16 }}>{p.name}</div>
          {p.id === activeProfileId && (
            <span className="chip" style={{ background: 'var(--green)', color: '#06121f' }}>at the helm</span>
          )}
        </div>
      ))}

      <div className="h2">⚓ The Straw Hats</div>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {STRAW_HATS.map((c) => (
          <div key={c.name} style={{ textAlign: 'center' }}>
            {c.art}
            <div style={{ fontWeight: 900, marginTop: 4 }}>{c.name}</div>
            <div className="muted" style={{ fontSize: 11, lineHeight: 1.3 }}>{c.role}</div>
          </div>
        ))}
      </div>
    </>
  )
}
