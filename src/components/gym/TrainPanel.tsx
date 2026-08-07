// 💪 Train — the whole workout loop: set it up, look at it before you commit,
// do it one exercise at a time, rate it on the way out.
//
// The one rule that shapes this screen: nothing is ever guessed silently. The
// preview says who built the session (coach or offline planner) and why, the
// runner shows the weight it is suggesting AND lets you correct it, and every
// correction is what the app learns from.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { ExerciseRating, GymSession, Mood, SessionExercise } from '../../types'
import { PART_LABEL, RATING_LABEL, SESSION_MINUTES, allExercises, sessionSeconds } from '../../logic/gym'
import { coachReady } from '../../logic/gymCoach'
import { keepScreenAwake } from '../../logic/wakeLock'
import { primeGymAudio, gymSfx, sfx } from '../../audio'
import { RestTimer } from './RestTimer'
import { DemoCaption, DemoCredit, ExerciseDemo } from './ExerciseDemo'

const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: 'lazy', label: 'Lazy', emoji: '🥱' },
  { id: 'normal', label: 'Normal', emoji: '🙂' },
  { id: 'motivated', label: 'Fired up', emoji: '🔥' },
]

const RATINGS: ExerciseRating[] = ['hate', 'dislike', 'ok', 'like', 'love']

/**
 * Demos by exercise id. A session stores a SNAPSHOT of each exercise (so old
 * logs survive a catalog edit), which means the media has to be looked up live
 * rather than read off the session.
 */
function useDemos() {
  const catalog = useStore((s) => s.gymCatalog)
  return useMemo(() => new Map(allExercises(catalog).map((e) => [e.id, e.demo])), [catalog])
}

export function TrainPanel() {
  const active = useStore((s) => s.data.gym.active)
  if (!active) return <Setup />
  if (active.status === 'preview') return <Preview session={active} />
  return <Runner session={active} />
}

// --- setup ------------------------------------------------------------------

function Setup() {
  const { data, gymPlan, gymPlanning, aiConfig } = useStore()
  const [minutes, setMinutes] = useState(20)
  const [mood, setMood] = useState<Mood>('normal')
  const gym = data.gym
  const coachOn = gym.aiOn && coachReady(aiConfig)

  return (
    <>
      <div className="h2">💪 Today’s session</div>

      {gym.streak.current > 0 && (
        <div className="card gym-streak">
          <span style={{ fontSize: 26 }}>🔥</span>
          <div>
            <div style={{ fontWeight: 900 }}>{gym.streak.current}-day training streak</div>
            <div className="muted" style={{ fontSize: 12 }}>best ever: {gym.streak.best} · don’t be the one who breaks it</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="field" style={{ marginBottom: 14 }}>
          <label>How long have you got?</label>
          <div className="gym-min-grid">
            {SESSION_MINUTES.map((m) => (
              <button
                key={m}
                className={`gym-min ${minutes === m ? 'on' : ''}`}
                onClick={() => {
                  sfx.click()
                  setMinutes(m)
                }}
              >
                {m}
                <span>min</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>How are you feeling?</label>
          <div className="seg">
            {MOODS.map((m) => (
              <button
                key={m.id}
                className={mood === m.id ? 'on' : ''}
                onClick={() => {
                  sfx.click()
                  setMood(m.id)
                }}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn"
          disabled={gymPlanning}
          onClick={() => {
            sfx.click()
            primeGymAudio() // first gesture of the session: unlock the alert clips
            void gymPlan(minutes, mood)
          }}
        >
          {gymPlanning ? '🧠 Building your session…' : '📋 Build my session'}
        </button>

        <p className="muted" style={{ fontSize: 11, marginTop: 10, textAlign: 'center' }}>
          {coachOn
            ? 'Your AI trainer reads your brief, your history and how you felt last time.'
            : gym.aiOn
              ? 'No OpenRouter key yet — planning offline from your own history (Coach → Settings).'
              : 'AI coach is off. Planning offline from your own history.'}
        </p>
      </div>
    </>
  )
}

// --- preview ----------------------------------------------------------------

function Preview({ session }: { session: GymSession }) {
  const { gymStart, gymSwap, gymDrop, gymDeleteExercise, gymDiscard, gymPlan, gymPlanning, gymFellBack, data } = useStore()
  const [swapping, setSwapping] = useState<string | null>(null)
  const demos = useDemos()
  const unit = data.gym.brief.weightUnit ?? 'lb'
  const estimate = Math.round(sessionSeconds(session) / 60)

  return (
    <>
      <div className="h2">📋 Before you start</div>

      <div className="card">
        <div className="gym-note-head">
          <span className="chip">{session.source === 'ai' ? '🧠 AI trainer' : '⚙️ Offline plan'}</span>
          <span className="chip">⏱ ~{estimate} min of {session.minutes}</span>
          <span className="chip">{MOODS.find((m) => m.id === session.mood)?.emoji} {MOODS.find((m) => m.id === session.mood)?.label}</span>
        </div>
        {session.note && <p style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>“{session.note}”</p>}
        {gymFellBack && (
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            The coach didn’t answer ({gymFellBack}), so this one was planned offline from your history. It’s still a real session.
          </p>
        )}
      </div>

      {session.exercises.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>🤷</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Nothing to prescribe — everything is either rated “hate”, still recovering, or already done today. Add gear in the
            Gear tab, or come back tomorrow.
          </p>
        </div>
      )}

      {session.exercises.map((e, i) => (
        <div className="card gym-ex-card" key={e.exId}>
          <div className="gym-ex-head">
            <ExerciseDemo demo={demos.get(e.exId)} emoji={e.emoji} size={56} className="gym-ex-emoji" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>
                {i + 1}. {e.name}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{planLine(e, unit)}</div>
            </div>
          </div>
          <div className="gym-chip-row">
            {e.parts.slice(0, 3).map((p) => (
              <span className="chip" key={p}>{PART_LABEL[p]}</span>
            ))}
            {e.ladderTest && <span className="chip chip--test">🏁 Max test</span>}
            {e.ladder && !e.ladderTest && <span className="chip">🪜 Ladder</span>}
          </div>
          {e.why && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>💬 {e.why}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              className="btn btn--ghost btn--small"
              style={{ flex: 1 }}
              disabled={gymPlanning}
              onClick={async () => {
                sfx.click()
                setSwapping(e.exId)
                const res = await gymSwap(e.exId, 'not feeling like this one today')
                setSwapping(null)
                if (res === 'none') sfx.error()
              }}
            >
              {swapping === e.exId ? '…' : '🔄 Not this one'}
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={() => {
                sfx.click()
                gymDrop(e.exId)
              }}
            >
              ✕
            </button>
          </div>
          <button
            className="btn btn--ghost btn--small"
            style={{ marginTop: 8, width: '100%' }}
            onClick={() => {
              // "✕" only drops it from today. This removes it from the shared
              // catalog, so no planner — AI or offline — can ever offer it again.
              if (!confirm(`Delete “${e.name}” for good? It leaves the crew’s exercise list and will never be planned again.`))
                return
              sfx.click()
              gymDeleteExercise(e.exId)
            }}
          >
            🗑 Never show this exercise again
          </button>
        </div>
      ))}

      <button
        className="btn"
        disabled={session.exercises.length === 0}
        onClick={() => {
          sfx.fanfare()
          primeGymAudio()
          gymStart()
        }}
      >
        ▶️ GO
      </button>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn btn--ghost btn--small"
          style={{ flex: 1 }}
          disabled={gymPlanning}
          onClick={() => {
            sfx.click()
            void gymPlan(session.minutes, session.mood)
          }}
        >
          🎲 Plan a different one
        </button>
        <button
          className="btn btn--ghost btn--small"
          style={{ flex: 1 }}
          onClick={() => {
            sfx.click()
            gymDiscard()
          }}
        >
          🗑 Cancel
        </button>
      </div>
      {session.exercises.some((e) => demos.get(e.exId)) && <DemoCredit />}
    </>
  )
}

// --- runner -----------------------------------------------------------------

function Runner({ session }: { session: GymSession }) {
  const { data, gymLogSet, gymUndoSet, gymLogRest, gymRateInSession, gymSkip, gymAbandon } = useStore()
  const [idx, setIdx] = useState(0)
  const [resting, setResting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const demos = useDemos()
  const unit = data.gym.brief.weightUnit ?? 'lb'

  const list = session.exercises
  const current = list[Math.min(idx, list.length - 1)] as SessionExercise | undefined
  const memory = current ? data.gym.ex[current.exId] : undefined
  const needsRating = !!current && !current.rating && !memory?.rating

  const nextSetNo = current ? current.sets.length : 0
  const plannedReps = current?.plan.reps[Math.min(nextSetNo, (current?.plan.reps.length ?? 1) - 1)] ?? 10

  const [reps, setReps] = useState(plannedReps)
  const [weight, setWeight] = useState<number | undefined>(current?.plan.weight)

  // a new exercise (or a new set) re-arms the inputs with what was prescribed —
  // you only touch them when reality differs, and that difference is the signal
  useEffect(() => {
    setReps(plannedReps)
    setWeight(current?.plan.weight)
    setResting(false)
  }, [idx, nextSetNo, plannedReps, current?.plan.weight])

  // hold the screen on for the whole workout, so a phone on the bench doesn't
  // lock between sets and swallow the rest timer
  useEffect(() => {
    if (!data.gym.keepAwake) return
    keepScreenAwake(true)
    return () => keepScreenAwake(false)
  }, [data.gym.keepAwake])

  const doneCount = list.filter((e) => e.sets.length > 0 || e.skipped).length
  const setsLeft = current ? Math.max(0, current.plan.reps.length - current.sets.length) : 0
  const isLast = idx >= list.length - 1

  if (finishing) return <FinishCard session={session} onDone={() => setFinishing(false)} />
  if (!current) return null

  return (
    <>
      <div className="gym-progress">
        <div className="gym-progress-bar">
          <span style={{ width: `${(doneCount / Math.max(1, list.length)) * 100}%` }} />
        </div>
        <div className="gym-progress-text">
          <span>
            Exercise {idx + 1} / {list.length}
          </span>
          <button
            className="gym-quit"
            onClick={() => {
              sfx.click()
              setFinishing(true)
            }}
          >
            🏁 Finish
          </button>
        </div>
      </div>

      {resting ? (
        <RestTimer
          seconds={current.plan.restSec}
          onDone={(actual) => {
            gymLogRest(current.exId, actual)
            setResting(false)
          }}
          onSkip={(actual) => {
            gymLogRest(current.exId, actual)
            setResting(false)
          }}
        />
      ) : (
        <div className="card gym-ex-card">
          <div className="gym-ex-head">
            <ExerciseDemo demo={demos.get(current.exId)} emoji={current.emoji} size={96} autoPlay className="gym-ex-emoji--big" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 19 }}>{current.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{planLine(current, unit)}</div>
            </div>
          </div>

          {current.ladderTest && (
            <div className="gym-banner">
              🏁 <strong>Max test.</strong> One all-out set — as many as you can. Your whole ladder is rebuilt from this number.
            </div>
          )}

          {current.how && <p className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.4 }}>{current.how}</p>}
          <DemoCaption demo={demos.get(current.exId)} />

          <div className="gym-set-row">
            {current.plan.reps.map((r, i) => {
              const logged = current.sets[i]
              return (
                <span key={i} className={`gym-set ${logged ? 'done' : i === nextSetNo ? 'now' : ''}`}>
                  {logged ? logged.reps : r}
                  {logged?.weight ? <em>{logged.weight}</em> : null}
                </span>
              )
            })}
            {current.sets.length > current.plan.reps.length &&
              current.sets.slice(current.plan.reps.length).map((s, i) => (
                <span key={`extra-${i}`} className="gym-set done">
                  {s.reps}
                  {s.weight ? <em>{s.weight}</em> : null}
                </span>
              ))}
          </div>

          <div className="gym-inputs">
            <Stepper
              label={repLabel(current)}
              value={reps}
              step={current.kind === 'timed' ? 5 : 1}
              min={1}
              onChange={setReps}
            />
            {current.kind === 'weight' && (
              <Stepper
                label={`weight (${unit})`}
                value={weight ?? 0}
                step={2.5}
                min={0}
                onChange={setWeight}
                hint={current.plan.weight != null ? `asked for ${current.plan.weight}` : 'first time — set it'}
              />
            )}
          </div>

          <button
            className="btn"
            onClick={() => {
              gymSfx.logged()
              gymLogSet(current.exId, reps, weight)
              if (setsLeft > 1) setResting(true)
            }}
          >
            ✓ Log set {nextSetNo + 1}
          </button>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {current.sets.length > 0 && (
              <button
                className="btn btn--ghost btn--small"
                style={{ flex: 1 }}
                onClick={() => {
                  sfx.click()
                  gymUndoSet(current.exId)
                }}
              >
                ↩︎ Undo set
              </button>
            )}
            <button
              className="btn btn--ghost btn--small"
              style={{ flex: 1 }}
              onClick={() => {
                sfx.click()
                setResting(true)
              }}
            >
              😮‍💨 Rest
            </button>
          </div>
        </div>
      )}

      {needsRating && current.sets.length > 0 && (
        <div className="card">
          <div className="h2" style={{ marginTop: 0 }}>First time on this one — how was it?</div>
          <div className="gym-rate-row">
            {RATINGS.map((r) => (
              <button
                key={r}
                className="gym-rate"
                onClick={() => {
                  sfx.gem()
                  gymRateInSession(current.exId, r)
                }}
              >
                {RATING_LABEL[r]}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            “Hate it” retires it for good. You can change your mind any time in the Gear tab.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="btn btn--ghost btn--small"
          style={{ flex: 1 }}
          onClick={() => {
            sfx.click()
            gymSkip(current.exId)
            if (isLast) setFinishing(true)
            else setIdx(idx + 1)
          }}
        >
          ⏭ Skip this one
        </button>
        <button
          className="btn btn--blue btn--small"
          style={{ flex: 1 }}
          onClick={() => {
            sfx.click()
            if (isLast) setFinishing(true)
            else setIdx(idx + 1)
          }}
        >
          {isLast ? '🏁 Finish session' : 'Next exercise →'}
        </button>
      </div>

      <button
        className="btn btn--ghost btn--small"
        style={{ marginTop: 16, width: '100%' }}
        onClick={() => {
          sfx.click()
          gymAbandon()
        }}
      >
        Leave (keeps whatever you logged)
      </button>
    </>
  )
}

// --- finish -----------------------------------------------------------------

function FinishCard({ session, onDone }: { session: GymSession; onDone: () => void }) {
  const { gymFinish } = useStore()
  const [stars, setStars] = useState(4)
  const [feedback, setFeedback] = useState('')

  const done = session.exercises.filter((e) => !e.skipped && e.sets.length > 0)
  const totalReps = done.reduce((n, e) => n + e.sets.reduce((m, s) => m + s.reps, 0), 0)

  return (
    <>
      <div className="h2">🏁 Session done</div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 46 }}>💪</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginTop: 4 }}>
          {done.length} exercise{done.length === 1 ? '' : 's'} · {totalReps} reps
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {done.length === 0 ? 'Nothing logged — no Berries, no hard feelings.' : 'Berries are counted the moment you rate it.'}
        </p>
      </div>

      <div className="card">
        <div className="field" style={{ marginBottom: 12 }}>
          <label>How was that session?</label>
          <div className="gym-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => {
                  sfx.click()
                  setStars(n)
                }}
                className={n <= stars ? 'on' : ''}
                aria-label={`${n} stars`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11 }}>Your coach reads this before building the next one.</p>
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Anything to tell your trainer? (optional)</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Too easy · shoulder felt off · loved the ladder · ran out of time…"
            style={{ minHeight: 60 }}
          />
        </div>

        <button
          className="btn"
          onClick={() => {
            const coins = gymFinish(stars, feedback.trim() || undefined)
            if (coins > 0) gymSfx.win()
            else sfx.click()
            onDone()
          }}
        >
          🪙 Bank it
        </button>
      </div>
    </>
  )
}

// --- bits -------------------------------------------------------------------

function Stepper({
  label,
  value,
  step,
  min,
  onChange,
  hint,
}: {
  label: string
  value: number
  step: number
  min: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div className="gym-stepper">
      <label>{label}</label>
      <div className="gym-stepper-row">
        <button
          onClick={() => {
            sfx.click()
            onChange(Math.max(min, Math.round((value - step) * 2) / 2))
          }}
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        />
        <button
          onClick={() => {
            sfx.click()
            onChange(Math.round((value + step) * 2) / 2)
          }}
        >
          +
        </button>
      </div>
      {hint && <span className="gym-stepper-hint">{hint}</span>}
    </div>
  )
}

function repLabel(e: SessionExercise): string {
  if (e.kind === 'timed') return 'seconds'
  if (e.kind === 'cardio') return 'minutes'
  return 'reps'
}

function planLine(e: SessionExercise, unit: string): string {
  const bits: string[] = []
  if (e.ladderTest) bits.push('1 all-out set')
  else if (new Set(e.plan.reps).size === 1) bits.push(`${e.plan.reps.length} × ${e.plan.reps[0]} ${repLabel(e)}`)
  else bits.push(`${e.plan.reps.join(' · ')} ${repLabel(e)}`)
  if (e.plan.weight) bits.push(`${e.plan.weight} ${unit}`)
  bits.push(`rest ${e.plan.restSec}s`)
  return bits.join(' · ')
}
