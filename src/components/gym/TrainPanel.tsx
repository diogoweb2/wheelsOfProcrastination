// 💪 Train — the whole workout loop: set it up, look at it before you commit,
// do it, get graded on the way out.
//
// Two rules shape this screen.
//
// 1. NOTHING IS EVER GUESSED SILENTLY. The preview says who built the session
//    (coach or offline planner) and why, the runner shows the weight it is
//    suggesting AND lets you correct it, and every correction is what the app
//    learns from.
// 2. ONE CLICK PER SET, AND NOTHING ELSE. You tap START once, at the very
//    beginning. After that the session drives itself: DONE → rest (ends by
//    itself) → 15s setup (ends by itself) → the next set is live. The only
//    button you ever have to press again is DONE, because only you know when
//    the reps are finished. Rest has a PAUSE for when life interrupts, and the
//    paused time is logged as extra rest rather than pretended away.
//    A set is never logged by hand: the app times it from the moment you
//    started to the moment you said you were done, and that measured time is
//    what the end-of-session grade is built on.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { ExerciseRating, GearMode, GymSession, Mood, SessionExercise } from '../../types'
import {
  GEAR_MODES,
  GEAR_MODE_LABEL,
  PART_LABEL,
  RATING_LABEL,
  SESSION_MINUTES,
  allExercises,
  loadSteps,
  mmss,
  sessionReport,
  sessionSeconds,
  stepLoad,
} from '../../logic/gym'
import { coachReady } from '../../logic/gymCoach'
import { keepScreenAwake } from '../../logic/wakeLock'
import { primeGymAudio, gymSfx, sfx } from '../../audio'
import { RestTimer } from './RestTimer'
import { SetupCountdown } from './SetupCountdown'
import { DemoCaption, DemoCredit, ExerciseDemo } from './ExerciseDemo'

const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: 'lazy', label: 'Lazy', emoji: '🥱' },
  { id: 'normal', label: 'Normal', emoji: '🙂' },
  { id: 'motivated', label: 'Fired up', emoji: '🔥' },
]

const RATINGS: ExerciseRating[] = ['hate', 'dislike', 'ok', 'like', 'love']

/** Seconds since `on` became true. A slow model is fine; a frozen button is not. */
function useElapsed(on: boolean): number {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    setSecs(0)
    if (!on) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [on])
  return secs
}

/**
 * The time on the wall. A gym session eats time without you noticing — this is
 * the one number the app can't measure for you, so it just shows it.
 */
function WallClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className="gym-wallclock">
      🕒 {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}

/** The exact reason the coach was skipped — verbatim, never rounded off to "something went wrong". */
/** The plan didn't happen at all. Says so, and says what broke. */
function PlanFailure({ why }: { why: string }) {
  return (
    <div className="card" style={{ borderColor: '#b91c1c', background: 'rgba(185,28,28,0.12)', marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 800 }}>❌ Couldn’t build a session</div>
      <p
        className="muted"
        style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace' }}
      >
        {why}
      </p>
      <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Logged — try again, and tell Diogo if it keeps happening.</p>
    </div>
  )
}

function CoachFailure({ why }: { why: string }) {
  return (
    <div className="card" style={{ borderColor: '#b45309', background: 'rgba(180,83,9,0.12)', marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 800 }}>⚠️ The AI coach didn’t answer — planned offline instead</div>
      <p
        className="muted"
        style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace' }}
      >
        {why}
      </p>
      <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
        This is still a real session, built from your own history. “Plan a different one” retries the coach.
      </p>
    </div>
  )
}

/** Minute buttons offered by the "do more" card — a bonus block is a short one. */
const MORE_MINUTES = [5, 10, 15, 20] as const

/**
 * The demo on a preview card, in CSS pixels. The source animations are 180px
 * (§18l), so this is the biggest it can go without upscaling — and on the
 * preview it is the point of the card: you are deciding whether you want to do
 * that movement, and a 56px thumbnail can't tell you.
 */
const DEMO_SIZE = 120

/** What the finished session left on screen: the grade, the Berries, and the offer of more. */
interface Banked {
  session: GymSession
  coins: number
}

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
  const [banked, setBanked] = useState<Banked | null>(null)
  const hasActive = !!active

  // ordering a "do more" block from the report retires the report
  useEffect(() => {
    if (hasActive) setBanked(null)
  }, [hasActive])

  if (active?.status === 'preview') return <Preview session={active} />
  if (active) return <Runner session={active} onBanked={setBanked} />
  if (banked) return <ReportCard banked={banked} onClose={() => setBanked(null)} />
  return <Setup />
}

// --- setup ------------------------------------------------------------------

function Setup() {
  const { data, gymPlan, gymPlanning, gymFellBack, aiConfig } = useStore()
  const [minutes, setMinutes] = useState(20)
  const [mood, setMood] = useState<Mood>('normal')
  const [gearMode, setGearMode] = useState<GearMode>('mixed')
  const gym = data.gym
  const coachOn = gym.aiOn && coachReady(aiConfig)
  const waited = useElapsed(gymPlanning)

  return (
    <>
      <div className="gym-title-row">
        <div className="h2" style={{ margin: 0 }}>💪 Today’s session</div>
        <WallClock />
      </div>

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

        <GearModePicker value={gearMode} onChange={setGearMode} />

        <button
          className="btn"
          disabled={gymPlanning}
          onClick={() => {
            sfx.click()
            primeGymAudio() // first gesture of the session: unlock the alert clips
            void gymPlan(minutes, mood, { gearMode })
          }}
        >
          {gymPlanning ? `🧠 Asking your coach… ${waited}s` : '📋 Build my session'}
        </button>
        {/* On this screen there is no session, so a reason here means the plan
            failed outright — not the usual "coach was slow, planned offline". */}
        {!gymPlanning && gymFellBack && <PlanFailure why={gymFellBack} />}
        {gymPlanning && waited > 20 && (
          <p className="muted" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
            The model is thinking. It gets up to 3 minutes before we plan offline instead.
          </p>
        )}

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

/** Weights only · bodyweight only · both. Offered before the first session and again after it. */
function GearModePicker({ value, onChange }: { value: GearMode; onChange: (m: GearMode) => void }) {
  return (
    <div className="field" style={{ marginBottom: 14 }}>
      <label>What do you want to use?</label>
      <div className="seg">
        {GEAR_MODES.map((g) => (
          <button
            key={g.id}
            className={value === g.id ? 'on' : ''}
            onClick={() => {
              sfx.click()
              onChange(g.id)
            }}
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>
    </div>
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
          {session.gearMode && session.gearMode !== 'mixed' && <span className="chip">{GEAR_MODE_LABEL[session.gearMode]}</span>}
          {session.followUp && <span className="chip chip--test">➕ Bonus block</span>}
        </div>
        {session.note && <p style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>“{session.note}”</p>}
      </div>

      {gymFellBack && <CoachFailure why={gymFellBack} />}

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
        // Two columns: the movement on the left, big enough to actually read,
        // and everything you can say about it on the right.
        <div className="card gym-ex-card gym-ex-split" key={e.exId}>
          <ExerciseDemo demo={demos.get(e.exId)} emoji={e.emoji} size={DEMO_SIZE} className="gym-ex-demo--big" />
          <div className="gym-ex-body">
            <div style={{ fontWeight: 900, fontSize: 15 }}>
              {i + 1}. {e.name}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{planLine(e, unit)}</div>
            <div className="gym-chip-row gym-chip-row--wrap">
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
                // Same idea, no coach: the offline planner fills the slot from
                // your own history, instantly and for free. It only ever leaves
                // a hole when there is genuinely nothing left to offer.
                title="Swap it offline, instantly"
                onClick={() => {
                  sfx.click()
                  if (gymDrop(e.exId) === 'dropped') sfx.error()
                }}
              >
                ⚡ Offline
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
              🗑 Never show this
            </button>
          </div>
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
            void gymPlan(session.minutes, session.mood, { gearMode: session.gearMode })
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
// START → DONE → rest → 15s setup → DONE → … Everything between two DONEs is
// automatic, and no bookkeeping: the app times every set itself, so "how long
// did that actually take" is a measurement rather than something you have to
// remember at the end.

type Phase = 'ready' | 'working' | 'resting' | 'setup'

function Runner({ session, onBanked }: { session: GymSession; onBanked: (b: Banked) => void }) {
  const { data, gymLogSet, gymUndoSet, gymLogRest, gymRateInSession, gymSkip, gymAbandon } = useStore()
  // a refresh mid-session lands on the first exercise that still has sets owed,
  // not back at the top — `gym.active` is synced, so this is a real recovery
  const [idx, setIdx] = useState(() => {
    const i = session.exercises.findIndex((e) => !e.skipped && e.sets.length < e.plan.reps.length)
    return i === -1 ? Math.max(0, session.exercises.length - 1) : i
  })
  const [phase, setPhase] = useState<Phase>('ready')
  const [startedAt, setStartedAt] = useState(0)
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
  const upNext = list[idx + 1]
  /** What NEXT actually starts: another set of this, or the next exercise. */
  const nextUpEx = setsLeft > 0 ? current : upNext

  if (finishing) return <FinishCard session={session} onBanked={onBanked} onBack={() => setFinishing(false)} />
  if (!current) return null

  /** Start (or restart) the clock on the set in front of you. */
  const begin = () => {
    setStartedAt(Date.now())
    setPhase('working')
  }

  /**
   * Move on without logging anything more for this exercise. It lands in setup,
   * not in 'ready' — jumping ahead shouldn't cost you an extra tap on GO.
   */
  const moveOn = (skip: boolean) => {
    if (skip) gymSkip(current.exId)
    if (isLast) {
      setFinishing(true)
      return
    }
    setIdx(idx + 1)
    setPhase('setup')
  }

  /** DONE — measure the set, log it, and drop straight into rest. */
  const done = () => {
    const sec = Math.max(1, (Date.now() - startedAt) / 1000)
    // a timed hold or a run is measured, never typed: hold a 30s plank for a
    // minute and the minute is what gets logged
    const logged =
      current.kind === 'timed' ? Math.round(sec) : current.kind === 'cardio' ? Math.max(1, Math.round(sec / 60)) : reps
    gymSfx.logged()
    gymLogSet(current.exId, logged, weight, sec)
    const moreHere = current.sets.length + 1 < current.plan.reps.length
    if (moreHere || !isLast) setPhase('resting')
    else setFinishing(true)
  }

  /**
   * Rest is over — either it ran out on its own or you skipped it. Either way
   * `restedSec` is however long it really took, pauses included. What follows
   * is NOT the set: it is 15s of setup time, so walking to the rack and loading
   * it isn't measured as work. The rest that gets learned from is the rest you
   * took, not the setup on top of it.
   */
  const next = (restedSec: number) => {
    gymLogRest(current.exId, restedSec, current.plan.restSec)
    if (setsLeft > 0) {
      setPhase('setup')
      return
    }
    if (isLast) {
      setFinishing(true)
      return
    }
    setIdx(idx + 1)
    setPhase('setup')
  }

  return (
    <>
      <div className="gym-progress">
        <div className="gym-progress-bar">
          <span style={{ width: `${(doneCount / Math.max(1, list.length)) * 100}%` }} />
        </div>
        <div className="gym-progress-text">
          <span>
            Exercise {idx + 1} / {list.length} · set {Math.min(nextSetNo + 1, current.plan.reps.length)} / {current.plan.reps.length}
          </span>
          <WallClock />
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

      {phase === 'resting' ? (
        // the picture is of what comes NEXT — the same exercise if there are
        // sets left, otherwise the one you should be walking over to now
        <RestTimer
          seconds={current.plan.restSec}
          nextDemo={demos.get(nextUpEx?.exId ?? '')}
          nextEmoji={nextUpEx?.emoji}
          footNote={<SessionCountdown session={session} />}
          upNext={
            setsLeft > 0 ? (
              <>
                Up next: <strong>set {current.sets.length + 1}</strong> of {current.name}
              </>
            ) : upNext ? (
              <>
                Up next: <strong>{upNext.name}</strong> · {planLine(upNext, unit)}
              </>
            ) : (
              <>Up next: <strong>the finish line</strong></>
            )
          }
          onNext={next}
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

          {current.perSide && (
            <div className="gym-banner">
              ↔️ <strong>Both sides.</strong> Every set is {plannedReps} {current.kind === 'timed' ? 'seconds' : 'reps'} on the
              left <em>and</em> {plannedReps} on the right. Log it once, when both are done.
            </div>
          )}

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

          {phase === 'setup' && <SetupCountdown onDone={begin} />}

          {phase === 'working' && isClocked(current) ? (
            // a plank or a run: no numbers to type, just a clock that keeps going
            // a per-side hold has to cover both sides before the bell makes sense
            <WorkClock startedAt={startedAt} target={current.perSide ? plannedReps * 2 : plannedReps} kind={current.kind} />
          ) : phase === 'working' ? (
            <div className="gym-inputs">
              <Stepper label={repLabel(current)} value={reps} step={1} min={1} onChange={setReps} />
              {current.kind === 'weight' && (
                <Stepper
                  label={`weight (${unit})`}
                  value={weight ?? 0}
                  step={2.5}
                  min={0}
                  // + and − walk the dumbbell's real notches, not arithmetic
                  notches={loadSteps(unit)}
                  onChange={setWeight}
                  hint={current.plan.weight != null ? `asked for ${current.plan.weight}` : 'first time — set it'}
                />
              )}
            </div>
          ) : null}

          {current.sets.length > 0 && phase === 'ready' && (
            <button
              className="btn btn--ghost btn--small"
              style={{ marginTop: 8, width: '100%' }}
              onClick={() => {
                sfx.click()
                gymUndoSet(current.exId)
              }}
            >
              ↩︎ Undo last set
            </button>
          )}
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

      {phase !== 'resting' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            className="btn btn--ghost btn--small"
            style={{ flex: 1 }}
            onClick={() => {
              sfx.click()
              moveOn(true)
            }}
          >
            ⏭ Skip this one
          </button>
          <button
            className="btn btn--ghost btn--small"
            style={{ flex: 1 }}
            onClick={() => {
              sfx.click()
              moveOn(false)
            }}
          >
            {isLast ? '🏁 Finish session' : 'Next exercise →'}
          </button>
        </div>
      )}

      <button
        className="btn btn--ghost btn--small"
        style={{ marginTop: 16, width: '100%' }}
        onClick={() => {
          sfx.click()
          const res = gymAbandon()
          if (res.session) onBanked({ session: res.session, coins: res.coins })
        }}
      >
        Leave (keeps whatever you logged)
      </button>

      {/* One action, pinned to the bottom and 78px tall — you are meant to be
          able to hit it with a foot without picking the phone up. The rest
          screen brings its own foot bar, because NEXT lives there. */}
      <div className="gym-foot-gap" />
      {phase !== 'resting' && (
        <div className="gym-foot">
          <SessionCountdown session={session} />
          {phase === 'working' ? (
            <button className="btn" onClick={done}>
              ✓ DONE
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                sfx.fanfare()
                begin()
              }}
            >
              {phase === 'setup' ? '▶️ GO NOW' : '▶️ START'}
            </button>
          )}
        </div>
      )}
    </>
  )
}

/**
 * "I said 20 minutes — how am I doing?" On screen for the whole workout, small,
 * and it does NOT stop at zero: running over is allowed, the clock just turns
 * amber and counts the other way.
 */
function SessionCountdown({ session }: { session: GymSession }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const startedAt = session.startedAt ? Date.parse(session.startedAt) : now
  const left = Math.round(session.minutes * 60 - (now - startedAt) / 1000)
  const over = left < 0

  return (
    <div className={`gym-countdown ${over ? 'over' : ''}`}>
      <span>⏳</span>
      <strong>{over ? `−${mmss(-left)}` : mmss(left)}</strong>
      <span>{over ? `over your ${session.minutes} min` : `left of ${session.minutes} min`}</span>
    </div>
  )
}

/** Reps you count vs. time the app counts. Planks and runs are clocked. */
function isClocked(e: SessionExercise): boolean {
  return e.kind === 'timed' || e.kind === 'cardio'
}

/**
 * The clock for a hold or a run. It counts UP and never stops at the target:
 * asked for 30 seconds of plank and held it for a minute? The minute is what
 * gets logged, and what the next session is planned from.
 */
function WorkClock({ startedAt, target, kind }: { startedAt: number; target: number; kind: SessionExercise['kind'] }) {
  const targetSec = kind === 'cardio' ? target * 60 : target
  const [now, setNow] = useState(Date.now())
  const rang = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [])

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  useEffect(() => {
    if (elapsed >= targetSec && !rang.current) {
      rang.current = true
      gymSfx.go()
    }
  }, [elapsed, targetSec])

  const hit = elapsed >= targetSec
  const pct = Math.min(1, targetSec > 0 ? elapsed / targetSec : 1)

  return (
    <div className="gym-clock">
      <div className={`gym-clock-time ${hit ? 'over' : ''}`}>{mmss(elapsed)}</div>
      <div className="gym-clock-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
        {hit ? `past the ${mmss(targetSec)} asked for — every extra second counts` : `target ${mmss(targetSec)}`}
      </div>
    </div>
  )
}

// --- finish -----------------------------------------------------------------

function FinishCard({ session, onBanked, onBack }: { session: GymSession; onBanked: (b: Banked) => void; onBack: () => void }) {
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
            const { coins, session: filed } = gymFinish(stars, feedback.trim() || undefined)
            if (coins > 0) gymSfx.win()
            else sfx.click()
            onBanked({ session: filed ?? session, coins })
          }}
        >
          🪙 Bank it
        </button>
        <button className="btn btn--ghost btn--small" style={{ marginTop: 8, width: '100%' }} onClick={onBack}>
          ← Not yet, back to the workout
        </button>
      </div>
    </>
  )
}

// --- the report -------------------------------------------------------------

function ReportCard({ banked, onClose }: { banked: Banked; onClose: () => void }) {
  const { gymPlan, gymPlanning } = useStore()
  const { session, coins } = banked
  const report = sessionReport(session)
  const [more, setMore] = useState(false)
  const [gearMode, setGearMode] = useState<GearMode>(session.gearMode ?? 'mixed')
  const waited = useElapsed(gymPlanning)

  return (
    <>
      <div className="h2">📊 How that went</div>

      {report && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className={`gym-grade grade-${report.grade[0].toLowerCase()}`}>{report.grade}</div>
          <p style={{ fontWeight: 800, fontSize: 14, margin: '4px 0 0' }}>{report.blurb}</p>
          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            {report.score} / 100 — the work you did, how heavy it was, and how long you rested.
          </p>

          <div className="gym-score">
            <ScoreRow
              emoji="💪"
              label="Work done"
              points={report.workPoints}
              max={60}
              note={`${Math.round(report.workRatio * 100)}% of the reps × weight the plan asked for${
                report.workRatio > 1 ? ' — you went past it' : ''
              }`}
            />
            <ScoreRow
              emoji="🔥"
              label="How hard it was"
              points={report.effortPoints}
              max={20}
              note={`${['', 'light', 'moderate', 'heavy'][Math.round(report.intensity)] ?? 'moderate'} movements${
                report.loadOverPlan > 0.02 ? ` · ${Math.round(report.loadOverPlan * 100)}% heavier than prescribed` : ''
              }`}
            />
            <ScoreRow
              emoji="😮‍💨"
              label="Rest"
              points={report.restPoints}
              max={20}
              note={`${mmss(report.restSec)} taken against the ${mmss(report.restTargetSec)} offered`}
            />
          </div>

          <div className="gym-report" style={{ marginTop: 6 }}>
            <ReportRow emoji="🏋️" label="Time working" actual={report.workSec} target={report.workTargetSec} />
          </div>

          <p className="muted" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.45 }}>
            Time spent on the reps is reported, not graded — slow, controlled reps are training, not dawdling. Targets only count
            the sets you actually did, so skipping never buys a better grade.
          </p>
        </div>
      )}

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>🪙</div>
        <div style={{ fontWeight: 900, fontSize: 20 }}>+{coins} Berries banked</div>
        {!report && (
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Nothing logged this session — a grade needs at least one set done.
          </p>
        )}
      </div>

      {!more ? (
        <>
          <button
            className="btn btn--blue"
            onClick={() => {
              sfx.click()
              setMore(true)
            }}
          >
            ➕ Do more exercises
          </button>
          <button className="btn btn--ghost btn--small" style={{ marginTop: 8, width: '100%' }} onClick={onClose}>
            ✓ Done for today
          </button>
        </>
      ) : (
        <div className="card">
          <div className="h2" style={{ marginTop: 0 }}>➕ How much longer?</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            A bonus block built around what you just did — none of those exercises come back, and the muscles they hit get left
            alone.
          </p>
          <div className="gym-min-grid" style={{ marginBottom: 14 }}>
            {MORE_MINUTES.map((m) => (
              <button
                key={m}
                className="gym-min"
                disabled={gymPlanning}
                onClick={() => {
                  sfx.click()
                  primeGymAudio()
                  void gymPlan(m, session.mood, { gearMode, followUp: session })
                }}
              >
                {m}
                <span>min</span>
              </button>
            ))}
          </div>
          <GearModePicker value={gearMode} onChange={setGearMode} />
          <button
            className="btn btn--ghost btn--small"
            style={{ width: '100%' }}
            onClick={() => {
              sfx.click()
              setMore(false)
            }}
          >
            {gymPlanning ? `🧠 Asking your coach… ${waited}s` : '← Actually, I’m done'}
          </button>
        </div>
      )}
    </>
  )
}

/**
 * One of the three things the letter is made of. The bar is the share of that
 * component you earned, and the note says in words what moved it — a grade you
 * can't argue with is a grade you can't learn from.
 */
function ScoreRow({ emoji, label, points, max, note }: { emoji: string; label: string; points: number; max: number; note: string }) {
  return (
    <div className="gym-score-row">
      <div className="gym-score-head">
        <span>
          {emoji} {label}
        </span>
        <b>
          {points}/{max}
        </b>
      </div>
      <div className="gym-score-bar">
        <span style={{ width: `${Math.min(100, (points / max) * 100)}%` }} />
      </div>
      <span className="gym-score-note">{note}</span>
    </div>
  )
}

/** Measured against planned, in minutes and seconds. Reported, not scored. */
function ReportRow({ emoji, label, actual, target }: { emoji: string; label: string; actual: number; target: number }) {
  const diff = actual - target
  return (
    <div className="gym-report-row">
      <span className="gym-report-label">
        {emoji} {label}
      </span>
      <span className="gym-report-nums">
        <strong>{mmss(actual)}</strong>
        <em>planned {mmss(target)}</em>
      </span>
      <span className="gym-report-diff">
        {diff === 0 ? 'spot on' : `${diff > 0 ? '+' : '−'}${mmss(Math.abs(diff))}`}
      </span>
    </div>
  )
}

// --- bits -------------------------------------------------------------------

/**
 * − / value / +. When `notches` is given (the adjustable dumbbell's real holes,
 * §18d), the buttons walk that ladder instead of adding `step` — pressing + on
 * 22 lb gives 25, because 24.5 is not a thing the dumbbell can be. Typing a
 * number by hand is still free-form: a barbell or a machine ignores the ladder.
 */
function Stepper({
  label,
  value,
  step,
  min,
  notches,
  onChange,
  hint,
}: {
  label: string
  value: number
  step: number
  min: number
  notches?: readonly number[]
  onChange: (v: number) => void
  hint?: string
}) {
  const bump = (dir: 1 | -1) => {
    sfx.click()
    if (notches && notches.length > 0 && value > 0) return onChange(stepLoad(value, dir, 'lb'))
    // no ladder, or nothing loaded yet — the first + lands on the lightest notch
    if (notches && notches.length > 0 && dir === 1) return onChange(notches[0])
    onChange(Math.max(min, Math.round((value + dir * step) * 2) / 2))
  }

  return (
    <div className="gym-stepper">
      <label>{label}</label>
      <div className="gym-stepper-row">
        <button onClick={() => bump(-1)}>−</button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        />
        <button onClick={() => bump(1)}>+</button>
      </div>
      {hint && <span className="gym-stepper-hint">{hint}</span>}
    </div>
  )
}

function repLabel(e: SessionExercise): string {
  const unit = e.kind === 'timed' ? 'seconds' : e.kind === 'cardio' ? 'minutes' : 'reps'
  // one limb at a time: the number is what each side gets, so say so — otherwise
  // "2 × 15" reads as the whole job when it is really half of it
  return e.perSide ? `${unit} per side` : unit
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
