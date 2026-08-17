// 🧠 Coach — who your trainer thinks you are, and whether it's an AI at all.
//
// The brief at the top is read verbatim by the coach before every session, so
// it is the highest-leverage thing on this screen: age, goals, injuries, what
// motivates you. The switch at the bottom turns the AI off entirely — the app
// keeps working, planning from the memory shown in the middle.
import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { PARENT_ID } from '../../store/storage'
import type { ExerciseRating } from '../../types'
import { RATING_LABEL, allExercises, romanChairMove, seedBrief } from '../../logic/gym'
import { DEFAULT_MODEL, MODEL_PRESETS, coachReady } from '../../logic/gymCoach'
import { wakeLockSupported } from '../../logic/wakeLock'
import { sfx } from '../../audio'

export function CoachPanel() {
  const { data, activeProfileId, gymSetBrief, gymSetOptions, gymCatalog, aiConfig } = useStore()
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
  const coachLive = gym.aiOn && coachReady(aiConfig)

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
              ? `Every session opens with ${romanChair.name} to wake the lower back up. The AI coach is told, and the app puts it there whether or not the coach listened.`
              : 'On, but there is no roman chair / back-extension bench in the catalog yet — add one in the Gear tab and it will start opening every session.'
          }
          onChange={(v) => gymSetBrief({ romanChairWarmup: v })}
        />
        <Toggle
          on={!!brief.kidMode}
          label="Kid mode"
          hint="Bodyweight first, nothing heavy, short and fun. Hard filter, not a suggestion."
          onChange={(v) => gymSetBrief({ kidMode: v })}
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

      <div className="h2">🤖 AI trainer</div>
      <div className="card">
        <Toggle
          on={gym.aiOn}
          label="Use the AI trainer"
          hint={
            coachLive
              ? 'On. One small OpenRouter call per session (and one per swap) — a fraction of a cent each.'
              : gym.aiOn
                ? 'On, but there is no API key yet, so sessions are being planned offline.'
                : 'Off. Sessions are planned entirely from your own history — no network, no credits.'
          }
          onChange={(v) => gymSetOptions({ aiOn: v })}
        />
        {activeProfileId === PARENT_ID ? <AiConfigForm /> : (
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            {coachReady(aiConfig) ? 'The trainer is set up and ready.' : 'Ask Dad to add the API key.'}
          </p>
        )}
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

function AiConfigForm() {
  const { aiConfig, setAiConfig } = useStore()
  const [key, setKey] = useState('')
  const [model, setModel] = useState(aiConfig?.model ?? DEFAULT_MODEL)
  const hasKey = coachReady(aiConfig)

  return (
    <div style={{ marginTop: 12, borderTop: '2px solid var(--line)', paddingTop: 12 }}>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>OpenRouter API key {hasKey ? '(set)' : ''}</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={hasKey ? '•••••••••• — type a new one to replace it' : 'sk-or-v1-…'}
          autoComplete="off"
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className="btn btn--small"
          style={{ flex: 1 }}
          disabled={!key.trim()}
          onClick={() => {
            sfx.gem()
            setAiConfig({ openrouterKey: key.trim() })
            setKey('')
          }}
        >
          Save key
        </button>
        {hasKey && (
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              sfx.click()
              setAiConfig({ openrouterKey: '' })
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label>Model</label>
        <select
          value={MODEL_PRESETS.some((m) => m.id === model) ? model : 'custom'}
          onChange={(e) => {
            const v = e.target.value
            if (v !== 'custom') {
              setModel(v)
              setAiConfig({ model: v })
            }
          }}
        >
          {MODEL_PRESETS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.note}
            </option>
          ))}
          <option value="custom">Something else (type it below)</option>
        </select>
      </div>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Model id</label>
        <input type="text" value={model} onChange={(e) => setModel(e.target.value)} onBlur={() => setAiConfig({ model: model.trim() || DEFAULT_MODEL })} />
      </div>

      <p className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
        The key is stored in the crew’s Firestore database, never in the app bundle or the repo — so it can be rotated without a
        rebuild. Anyone who can sign into this Firebase project can read it, so put a spend limit on it in the OpenRouter
        dashboard.
      </p>
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
