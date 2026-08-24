// 📋 Plan — what the app knows about you, and how a session gets set up.
//
// This replaced the Coach tab when the AI trainer was removed. Nothing on this
// screen was ever the AI part of it: the brief, the four hard rules, the
// ratings summary and the session settings are all read by the offline planner
// (src/logic/gym.ts), which is now the only planner there is.
//
// The brief is still the highest-leverage thing here — age, goals, injuries,
// what motivates you — and the written program (BUSINESS_REQUIREMENTS §18)
// lands on this tab once `npm run gym:program` exists.
import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { ExerciseRating } from '../../types'
import { RATING_LABEL, allExercises, romanChairMove, seedBrief } from '../../logic/gym'
import { wakeLockSupported } from '../../logic/wakeLock'
import { sfx } from '../../audio'

export function PlanPanel() {
  const { data, activeProfileId, gymSetBrief, gymSetOptions, gymCatalog } = useStore()
  const gym = data.gym
  const brief = gym.brief
  const [text, setText] = useState(brief.text)
  const [dirty, setDirty] = useState(false)

  // another device editing the brief shouldn't be clobbered by a stale textarea
  useEffect(() => {
    if (!dirty) setText(brief.text)
  }, [brief.text, dirty])

  const moves = allExercises(gymCatalog).filter((e) => !e.retired)
  // said out loud in the toggle's hint: the setting is only worth anything if
  // there is actually a bench in the basement for it to prescribe
  const romanChair = romanChairMove(gymCatalog, { ...brief, romanChairWarmup: true }, gym.ex)
  const known = moves.filter((e) => gym.ex[e.id]?.timesDone).length
  const rated = moves.filter((e) => gym.ex[e.id]?.rating).length
  const readiness = Math.min(100, Math.round((gym.sessions.length / 20) * 50 + (known / Math.max(1, moves.length)) * 50))

  return (
    <>
      <div className="h2">🧠 Your brief</div>
      <div className="card">
        <p className="muted" style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.45 }}>
          Your trainer reads this word for word before building every single session. Age, goals, injuries, what bores you,
          what makes you show up. Be blunt.
        </p>
        <div className="field" style={{ marginBottom: 10 }}>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setDirty(true)
            }}
            style={{ minHeight: 220 }}
            placeholder="43, plays pickleball, lower back history, wants a strong core…"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn--small"
            style={{ flex: 1 }}
            disabled={!dirty}
            onClick={() => {
              sfx.gem()
              gymSetBrief({ text })
              setDirty(false)
            }}
          >
            💾 Save brief
          </button>
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              sfx.click()
              const seed = seedBrief(activeProfileId)
              setText(seed.text)
              setDirty(true)
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="card">
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Age</label>
          <input
            type="number"
            value={brief.age ?? ''}
            onChange={(e) => gymSetBrief({ age: Number(e.target.value) || undefined })}
          />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Weight unit</label>
          <div className="seg">
            {(['lb', 'kg'] as const).map((u) => (
              <button key={u} className={(brief.weightUnit ?? 'lb') === u ? 'on' : ''} onClick={() => gymSetBrief({ weightUnit: u })}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <Toggle
          on={!!brief.avoidBackLoad}
          label="Protect my lower back"
          hint="Filters out anything that loads the spine heavily — enforced by the offline planner too, not just the AI."
          onChange={(v) => gymSetBrief({ avoidBackLoad: v })}
        />
        <Toggle
          on={!!brief.noWarmup}
          label="No warm-up block"
          hint="The first one or two exercises run light instead, so the warm-up happens by itself."
          onChange={(v) => gymSetBrief({ noWarmup: v })}
        />
        <Toggle
          on={brief.romanChairWarmup !== false}
          label="Roman chair first, always"
          hint={
            romanChair
              ? `Every session opens with ${romanChair.name} to wake the lower back up, before anything else asks the lower back for a favour.`
              : 'On, but there is no roman chair / back-extension bench in the catalog yet — add one in the Gear tab and it will start opening every session.'
          }
          onChange={(v) => gymSetBrief({ romanChairWarmup: v })}
        />
      </div>

      <div className="h2">📚 What it knows about you</div>
      <div className="card">
        <div className="gym-card-head" style={{ marginBottom: 8 }}>
          <span>Independence from the AI</span>
          <span style={{ fontWeight: 900, color: readiness > 70 ? 'var(--gold)' : 'var(--muted)' }}>{readiness}%</span>
        </div>
        <div className="widget-bar">
          <span style={{ width: `${readiness}%` }} />
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>
          {gym.sessions.length} session{gym.sessions.length === 1 ? '' : 's'} logged · {known} of {moves.length} exercises tried ·{' '}
          {rated} rated. Every set, every weight correction and every rest you actually take is stored here.{' '}
          {readiness > 70
            ? 'You have enough history that the offline planner is genuinely good — you can turn the AI off and stop spending credits.'
            : 'Once this passes ~70% the offline planner is good enough to run on its own.'}
        </p>
      </div>

      <RatingSummary />

      <div className="h2">⚙️ Session settings</div>
      <div className="card">
        <Toggle
          on={gym.soundOn}
          label="Rest-timer sounds"
          hint="A double blip at 10 seconds left, a rising tone when rest is over. Built to still fire with the screen off."
          onChange={(v) => gymSetOptions({ soundOn: v })}
        />
        <Toggle
          on={gym.keepAwake}
          label="Keep the screen on during a session"
          hint={
            wakeLockSupported()
              ? 'Stops the phone locking between sets — the most reliable way to get the alerts on time.'
              : 'This browser has no Wake Lock API, so this does nothing here. The beeps still work.'
          }
          onChange={(v) => gymSetOptions({ keepAwake: v })}
        />
      </div>

    </>
  )
}

function RatingSummary() {
  const { data, gymCatalog } = useStore()
  const moves = allExercises(gymCatalog)
  const byRating = (r: ExerciseRating) =>
    moves.filter((m) => data.gym.ex[m.id]?.rating === r).map((m) => m.name)

  const groups: { r: ExerciseRating; names: string[] }[] = (['love', 'like', 'dislike', 'hate'] as ExerciseRating[])
    .map((r) => ({ r, names: byRating(r) }))
    .filter((g) => g.names.length > 0)

  if (groups.length === 0) return null

  return (
    <div className="card">
      {groups.map((g) => (
        <div key={g.r} style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>{RATING_LABEL[g.r]}</div>
          <div className="muted" style={{ fontSize: 12 }}>{g.names.join(', ')}</div>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 11 }}>Change any of these in the Gear tab.</p>
    </div>
  )
}


function Toggle({ on, label, hint, onChange }: { on: boolean; label: string; hint: string; onChange: (v: boolean) => void }) {
  return (
    <button
      className="gym-toggle"
      onClick={() => {
        sfx.click()
        onChange(!on)
      }}
    >
      <span className={`gym-toggle-box ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontWeight: 900, fontSize: 14 }}>{label}</span>
        <span className="muted" style={{ display: 'block', fontSize: 11, lineHeight: 1.4 }}>{hint}</span>
      </span>
    </button>
  )
}
