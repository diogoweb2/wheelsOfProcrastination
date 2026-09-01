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
import type { ExerciseRating, GearMode, GymSession, LoggedSet, Mood, SessionExercise } from '../../types'
import {
  GEAR_MODES,
  GEAR_MODE_LABEL,
  PART_LABEL,
  RATING_LABEL,
  SESSION_MINUTES,
  allExercises,
  isLoaded,
  loadSteps,
  mmss,
  sessionReport,
  sessionSeconds,
  stepLoad,
  romanChairMove,
} from '../../logic/gym'
import type { BlockAge } from '../../logic/gymBlock'
import type { SessionLength } from '../../logic/gymBlock'
import {
  SESSION_LENGTHS,
  activeBlock,
  blockAge,
  blockPos as blockPosOf,
  blockSessionsDone,
  blockWeeks,
  nextBlockSession,
  sessionAfter,
  slotLine,
} from '../../logic/gymBlock'
import { keepScreenAwake } from '../../logic/wakeLock'
import { primeGymAudio, gymSfx, sfx } from '../../audio'
import { RestTimer } from './RestTimer'
import { SetupCountdown } from './SetupCountdown'
import { DemoCaption, DemoCredit, ExerciseDemo } from './ExerciseDemo'
import { VideoButton } from './ExerciseVideo'

const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: 'lazy', label: 'Lazy', emoji: '🥱' },
  { id: 'normal', label: 'Normal', emoji: '🙂' },
  { id: 'motivated', label: 'Fired up', emoji: '🔥' },
]

const RATINGS: ExerciseRating[] = ['hate', 'dislike', 'ok', 'like', 'love']


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
  const { data, gymPlan, gymPlanning } = useStore()
  const [minutes, setMinutes] = useState(20)
  const [mood, setMood] = useState<Mood>('normal')
  const [gearMode, setGearMode] = useState<GearMode>('mixed')
  const [freeSession, setFreeSession] = useState(false)
  const gym = data.gym
  const block = activeBlock(gym)
  const hasBlock = !!block && block.sessions.length > 0

  return (
    <>
      <div className="gym-title-row">
        <div className="h2" style={{ margin: 0 }}>💪 {hasBlock ? 'What’s next' : 'Today’s session'}</div>
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

      {hasBlock && <NextSessionCard />}

      {hasBlock && !freeSession && (
        <button
          className="btn btn--ghost btn--small"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => {
            sfx.click()
            setFreeSession(true)
          }}
        >
          🎲 Off-programme session instead
        </button>
      )}

      {(!hasBlock || freeSession) && (
      <div className="card" style={{ marginTop: 10 }}>
        {hasBlock && (
          <p className="muted" style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.45 }}>
            One-off, outside the block. It won’t move the rotation — S{blockPosOf(gym) + 1} is still waiting for you.
          </p>
        )}
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
          {gymPlanning ? 'Building…' : '📋 Build my session'}
        </button>

        <p className="muted" style={{ fontSize: 11, marginTop: 10, textAlign: 'center' }}>
          Planned from your brief, your history and how you felt last time. No network, no waiting.
        </p>
      </div>
      )}
    </>
  )
}

/**
 * The whole point of the Train tab now: ONE question, already answered.
 *
 * No minutes picker, no mood dial deciding what you get — the session is the
 * next one in the rotation, the same one it was yesterday and will be tomorrow
 * until you do it. What the app still owns is the loading: every weight on the
 * card comes from your own history with that exercise.
 */
function NextSessionCard() {
  const { data, gymCatalog, gymPlanBlock, gymSetBlockPos } = useStore()
  const gym = data.gym
  const block = activeBlock(gym)
  const [picking, setPicking] = useState(false)
  const [mood, setMood] = useState<Mood>('normal')
  const [length, setLength] = useState<SessionLength>(30)
  const byId = useMemo(() => new Map(allExercises(gymCatalog).map((e) => [e.id, e])), [gymCatalog])
  if (!block) return null

  const pos = blockPosOf(gym)
  const session = nextBlockSession(gym)
  const then = sessionAfter(block, pos)
  const weeks = blockWeeks(block)
  const done = blockSessionsDone(gym)
  const age = blockAge(block, done)

  return (
    <>
      {age !== 'fresh' && <BlockWarning age={age} done={done} />}

      <div className="card">
        <div className="gym-note-head">
          <span className="chip">🧱 {block.name}</span>
          <span className="chip">{done} of {block.reviewSessions} sessions</span>
          <span className="chip">week {weeks + 1}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <span style={{ fontSize: 40 }}>{session?.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Session {pos + 1} of {block.sessions.length}
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>{session?.name}</div>
          </div>
        </div>

        <ul className="gym-block-list">
          {(session?.exercises ?? []).map((slot, i) => {
            const def = byId.get(slot.exId)
            return (
              <li key={`${slot.exId}-${i}`}>
                <span>{def?.emoji ?? '❓'} {def?.name ?? 'Not in the catalog any more'}</span>
                <span className="muted">{slotLine(slot, gymCatalog)}</span>
                {def && <VideoButton exId={def.id} name={def.name} />}
              </li>
            )
          })}
        </ul>

        {/* How long you have got — never WHAT you do, only how much of it.
            20 drops the tail, 40 adds a set to the first two movements. */}
        <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
          <label>How long have you got?</label>
          <div className="seg">
            {SESSION_LENGTHS.map((m) => (
              <button
                key={m}
                className={length === m ? 'on' : ''}
                onClick={() => {
                  sfx.click()
                  setLength(m)
                }}
              >
                {m} min
              </button>
            ))}
          </div>
          <span className="muted" style={{ fontSize: 11, display: 'block', marginTop: 6, lineHeight: 1.4 }}>
            {length === 20
              ? 'The accessories at the end come off. The main work stays.'
              : length === 40
                ? 'An extra set on the first two movements — not extra exercises. Take the longer rests too.'
                : 'The session exactly as written.'}
          </span>
        </div>

        <button
          className="btn"
          style={{ marginTop: 12 }}
          onClick={() => {
            sfx.fanfare()
            primeGymAudio() // first gesture of the session: unlock the alert clips
            gymPlanBlock({ mood, length })
          }}
        >
          ▶️ Do session {pos + 1}
        </button>

        <div className="seg" style={{ marginTop: 10 }}>
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

        <p className="muted" style={{ fontSize: 11, marginTop: 10, textAlign: 'center' }}>
          {then ? `Then: ${then.emoji} ${then.name}.` : ''} The rotation only moves when you finish a session.
        </p>

        <button
          className="btn btn--ghost btn--small"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => {
            sfx.click()
            setPicking((v) => !v)
          }}
        >
          {picking ? '✕ Never mind' : '↔️ Do a different one'}
        </button>

        {picking && (
          <div className="gym-block-pick">
            {block.sessions.map((s, i) => (
              <button
                key={s.id}
                className={`btn btn--ghost btn--small ${i === pos ? 'on' : ''}`}
                onClick={() => {
                  sfx.click()
                  gymSetBlockPos(i)
                  setPicking(false)
                }}
              >
                S{i + 1} · {s.emoji} {s.name}
              </button>
            ))}
            <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Jumping the queue moves the rotation here — the next session is the one after whatever you pick.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

/** "This block has run its course." Says it once it is true, and says what to do about it. */
function BlockWarning({ age, done }: { age: BlockAge; done: number }) {
  const { data, gymRestartBlock } = useStore()
  const block = activeBlock(data.gym)
  if (!block) return null
  return (
    <div className="card gym-block-warn">
      <div style={{ fontWeight: 900, fontSize: 15 }}>
        {age === 'overdue' ? '🛑 This block has had its run' : '⏳ Time to think about the next block'}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
        {done} sessions of {block.name} finished
        {age === 'overdue'
          ? `, past the ${block.retireSessions} it was written for.`
          : `, which is the ${block.reviewSessions} it was written for.`}{' '}
        <strong>If it is still progressing, keep going</strong> — this is a suggestion, not a rule. When it stops, Block 2
        changes <strong>2–4 movements and nothing else</strong>: split squat → reverse lunge, flat press → incline,
        chest-supported row → one-arm, split squat jump → another lateral or vertical power move. Same patterns, progressive
        exposure, not novelty.
      </p>
      <button
        className="btn btn--ghost btn--small"
        style={{ width: '100%', marginTop: 8 }}
        onClick={() => {
          if (!confirm('Carry on with these sessions as a new block? The session counter starts again at zero.')) return
          sfx.click()
          gymRestartBlock()
        }}
      >
        🔄 Carry on with these — restart the clock
      </button>
    </div>
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
  const { gymStart, gymSwap, gymDrop, gymDeleteExercise, gymDiscard, gymPlan, gymPlanning, data } = useStore()
  const [swapping, setSwapping] = useState<string | null>(null)
  const demos = useDemos()
  const unit = data.gym.brief.weightUnit ?? 'lb'
  const estimate = Math.round(sessionSeconds(session) / 60)

  return (
    <>
      <div className="h2">📋 Before you start</div>

      <div className="card">
        <div className="gym-note-head">
          {session.blockSessionName ? (
            <span className="chip chip--test">🧱 {session.blockSessionName}</span>
          ) : (
            <span className="chip">⚙️ {session.minutes} min plan</span>
          )}
          <span className="chip">⏱ ~{estimate} min</span>
          <span className="chip">{MOODS.find((m) => m.id === session.mood)?.emoji} {MOODS.find((m) => m.id === session.mood)?.label}</span>
          {session.gearMode && session.gearMode !== 'mixed' && <span className="chip">{GEAR_MODE_LABEL[session.gearMode]}</span>}
          {session.followUp && <span className="chip chip--test">➕ Bonus block</span>}
        </div>
        {session.note && <p style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>“{session.note}”</p>}
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
        // Two columns: the movement on the left, big enough to actually read,
        // and everything you can say about it on the right.
        <div className="card gym-ex-card gym-ex-split" key={e.exId}>
          <ExerciseDemo demo={demos.get(e.exId)} emoji={e.emoji} size={DEMO_SIZE} className="gym-ex-demo--big" />
          <div className="gym-ex-body">
            <div className="gym-ex-title">
              <div style={{ fontWeight: 900, fontSize: 15 }}>
                {i + 1}. {e.name}
              </div>
              <VideoButton exId={e.exId} name={e.name} />
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{planLine(e, unit)}</div>
            <div className="gym-chip-row gym-chip-row--wrap">
              {e.parts.slice(0, 3).map((p) => (
                <span className="chip" key={p}>{PART_LABEL[p]}</span>
              ))}
              {e.ladderTest && <span className="chip chip--test">🏁 Max test</span>}
              {e.ladder && !e.ladderTest && <span className="chip">🪜 Ladder</span>}
              {e.quality && <span className="chip chip--urgent">⚡ Quality — stop when it drops</span>}
            </div>
            {e.why && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>💬 {e.why}</p>}
            {/* On a block session the exercise list is the programme — swapping
                one out for "something similar" is exactly what the block exists
                to stop. Short on time? Drop it; the slot just closes. */}
            {session.blockId ? (
              <button
                className="btn btn--ghost btn--small"
                style={{ marginTop: 10, width: '100%' }}
                onClick={() => {
                  sfx.click()
                  gymDrop(e.exId)
                }}
              >
                ✕ Skip this one today
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn btn--ghost btn--small"
                    style={{ flex: 1 }}
                    disabled={gymPlanning}
                    onClick={async () => {
                      sfx.click()
                      setSwapping(e.exId)
                      const res = await gymSwap(e.exId)
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
              </>
            )}
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
        {!session.blockId && (
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
        )}
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
  /**
   * A clocked per-side hold is two clocks, not one. `sideSec` holds the seconds
   * already banked on the sides you have finished; `startedAt` is always the
   * clock of the side you are on RIGHT NOW. The set is logged when the last side
   * is done, with the total in `reps` and the split in `sides`.
   */
  const [sideSec, setSideSec] = useState<number[]>([])
  const [finishing, setFinishing] = useState(false)
  const demos = useDemos()
  const unit = data.gym.brief.weightUnit ?? 'lb'

  const list = session.exercises
  const current = list[Math.min(idx, list.length - 1)] as SessionExercise | undefined
  const memory = current ? data.gym.ex[current.exId] : undefined
  const needsRating = !!current && !current.rating && !memory?.rating

  const nextSetNo = current ? current.sets.length : 0
  const plannedReps = current?.plan.reps[Math.min(nextSetNo, (current?.plan.reps.length ?? 1) - 1)] ?? 10

  // what you actually lifted last set of THIS exercise beats what was planned:
  // once you bump the bar up, every set after it starts there
  const lastLoggedWeight = current?.sets.length ? current.sets[current.sets.length - 1].weight : undefined
  const armedWeight = lastLoggedWeight ?? current?.plan.weight

  const [reps, setReps] = useState(plannedReps)
  const [weight, setWeight] = useState<number | undefined>(armedWeight)

  // a new exercise (or a new set) re-arms the inputs with what was prescribed —
  // you only touch them when reality differs, and that difference is the signal
  useEffect(() => {
    setReps(plannedReps)
    setWeight(armedWeight)
  }, [idx, nextSetNo, plannedReps, armedWeight])

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

  /** Start (or restart) the clock on the set in front of you — side one, if there are sides. */
  const begin = () => {
    setSideSec([])
    setStartedAt(Date.now())
    setPhase('working')
  }

  /**
   * A clocked per-side move is done one side at a time, and the button says so.
   * The target for the FIRST side is what was prescribed; the target for the
   * second is whatever you actually did on the first — hold a 40 s plank for 70
   * and the other side is asked for 70, because the point of a per-side hold is
   * that the two sides match. What you managed on both is what the next session
   * is planned from.
   */
  const twoSided = isClocked(current) && !!current.perSide
  const sideTarget = sideSec.length === 0 ? plannedReps : Math.max(plannedReps, ...sideSec)

  /** "Ready on the other side." Bank this side and start the next one's clock. */
  const switchSides = () => {
    const sec = Math.max(1, (Date.now() - startedAt) / 1000)
    gymSfx.go()
    setSideSec([...sideSec, sec])
    setStartedAt(Date.now())
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
    const thisSide = Math.max(1, (Date.now() - startedAt) / 1000)
    // every side of the set, the one just finished included — for anything that
    // isn't per-side that is simply the one clock
    const sides = [...sideSec, thisSide]
    const sec = sides.reduce((n, x) => n + x, 0)
    // a timed hold or a run is measured, never typed: hold a 30s plank for a
    // minute and the minute is what gets logged
    const logged =
      current.kind === 'timed' ? Math.round(sec) : current.kind === 'cardio' ? Math.max(1, Math.round(sec / 60)) : reps
    gymSfx.logged()
    gymLogSet(current.exId, logged, weight, sec, twoSided ? sides : undefined)
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
          nextExId={nextUpEx?.exId}
          nextName={nextUpEx?.name}
          footNote={<SessionCountdown session={session} />}
          // the words for the thing you are about to walk over to. Only for a
          // NEW exercise — re-reading the brief for the set you have just done
          // twice is noise, and it would push the clock off a phone screen.
          nextBrief={setsLeft === 0 && upNext ? <ExerciseBrief ex={upNext} setNo={upNext.sets.length} /> : undefined}
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
            <VideoButton exId={current.exId} name={current.name} />
          </div>

          <ExerciseBrief ex={current} setNo={nextSetNo} />
          <DemoCaption demo={demos.get(current.exId)} />

          <div className="gym-set-row">
            {current.plan.reps.map((r, i) => {
              const logged = current.sets[i]
              return (
                <span key={i} className={`gym-set ${logged ? 'done' : i === nextSetNo ? 'now' : ''}`}>
                  {logged ? setChip(logged) : r}
                  {logged?.weight ? <em>{logged.weight}</em> : null}
                </span>
              )
            })}
            {current.sets.length > current.plan.reps.length &&
              current.sets.slice(current.plan.reps.length).map((s, i) => (
                <span key={`extra-${i}`} className="gym-set done">
                  {setChip(s)}
                  {s.weight ? <em>{s.weight}</em> : null}
                </span>
              ))}
          </div>

          {phase === 'setup' && <SetupCountdown onDone={begin} />}

          {/* A loaded hold — a farmer's carry, a weighted plank — is clocked AND
              weighted, so the weight is asked for BEFORE the clock starts: once
              the set is live your hands are full of dumbbells and the phone is
              on the floor. A counted lift keeps its stepper next to the reps,
              where it has always been. */}
          {isClocked(current) && isLoaded(current) && phase !== 'working' && (
            <div className="gym-inputs">
              <WeightStepper
                unit={unit}
                value={weight}
                planned={current.plan.weight}
                onChange={setWeight}
              />
            </div>
          )}

          {phase === 'working' && isClocked(current) ? (
            // a plank or a run: no numbers to type, just a clock that keeps going.
            // a per-side hold runs one clock PER SIDE, and the second side's
            // target is whatever the first one actually managed
            <WorkClock
              // a fresh clock per side, so the target bell rings again on the second
              key={startedAt}
              startedAt={startedAt}
              target={twoSided ? sideTarget : plannedReps}
              kind={current.kind}
              side={twoSided ? (sideSec.length === 0 ? 'first' : 'second') : undefined}
              banked={sideSec[0]}
            />
          ) : phase === 'working' ? (
            <div className="gym-inputs">
              <Stepper label={repLabel(current)} value={reps} step={1} min={1} onChange={setReps} />
              {isLoaded(current) && (
                <WeightStepper unit={unit} value={weight} planned={current.plan.weight} onChange={setWeight} />
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
          {phase === 'working' && twoSided && sideSec.length === 0 ? (
            // the honest end of side one: you press it when you are set up on the
            // OTHER side, so the seconds up to the press are side one's
            <button className="btn" onClick={switchSides}>
              ↔️ OTHER SIDE
            </button>
          ) : phase === 'working' ? (
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

/**
 * Everything the exercise ASKS OF YOU, in words: how to do it, both-sides rules,
 * the rep range you are chasing, and why it is in the session at all.
 *
 * It renders in two places on purpose. On the exercise card it is the brief for
 * the set you are about to do; on the rest screen it is the brief for the one
 * coming NEXT, because rest is the only part of a session where you actually
 * have the hands and the attention to read it (§18c). Same words in both, so
 * reading it early is never reading a different thing.
 */
function ExerciseBrief({ ex, setNo }: { ex: SessionExercise; setNo: number }) {
  const plannedReps = ex.plan.reps[Math.min(setNo, ex.plan.reps.length - 1)] ?? 10
  const twoSided = isClocked(ex) && !!ex.perSide
  return (
    <>
      {ex.perSide && (
        <div className="gym-banner">
          {twoSided ? (
            <>
              ↔️ <strong>One side at a time.</strong> Hold the first side, then press{' '}
              <strong>↔️ OTHER SIDE</strong> when you are set up on the second — and hold that one just as long.
              Press <strong>✓ DONE</strong> at the end of it.
            </>
          ) : (
            <>
              ↔️ <strong>Both sides.</strong> Every set is {plannedReps} reps on the left <em>and</em> {plannedReps} on
              the right. Log it once, when both are done.
            </>
          )}
        </div>
      )}

      {ex.ladderTest && (
        <div className="gym-banner">
          🏁 <strong>Max test.</strong> One all-out set — as many as you can. Your whole ladder is rebuilt from this number.
        </div>
      )}

      {ex.how && <p className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.4 }}>{ex.how}</p>}
      {/* the rep box shows the LOW end of the range — the number that has to
          be there. The range itself is the thing you are aiming at, and it
          belongs on screen while you are deciding whether to stop. */}
      {ex.repRange && (
        <p style={{ fontSize: 13, marginTop: 6, fontWeight: 800 }}>
          🎯 Aim for {ex.repRange[0]}–{ex.repRange[1]} {repLabel(ex)}
          {ex.quality
            ? ' — and stop the moment quality drops.'
            : isClocked(ex)
              ? `. Hold ${ex.repRange[1]} on every set (both sides) and the whole range moves up next time.`
              : `. All sets at ${ex.repRange[1]}? Add weight next time.`}
        </p>
      )}
      {ex.why && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>💬 {ex.why}</p>}
    </>
  )
}

/** Reps you count vs. time the app counts. Planks and runs are clocked. */
function isClocked(e: SessionExercise): boolean {
  return e.kind === 'timed' || e.kind === 'cardio'
}

/** What a logged set shows on its chip — a per-side hold shows both sides. */
function setChip(set: LoggedSet): string {
  return set.sides && set.sides.length > 1 ? set.sides.join('/') : String(set.reps)
}

/**
 * The clock for a hold or a run. It counts UP and never stops at the target:
 * asked for 30 seconds of plank and held it for a minute? The minute is what
 * gets logged, and what the next session is planned from.
 *
 * On a per-side move it is the clock for ONE side, and `side` says which — the
 * second side's target is the first side's real time, so the line under the bar
 * is telling you the number to match rather than the number you were prescribed.
 */
function WorkClock({
  startedAt,
  target,
  kind,
  side,
  banked,
}: {
  startedAt: number
  target: number
  kind: SessionExercise['kind']
  side?: 'first' | 'second'
  banked?: number
}) {
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
      {side && (
        <div className="muted" style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.4 }}>
          ↔️ {side === 'first' ? 'FIRST SIDE' : 'SECOND SIDE'}
        </div>
      )}
      <div className={`gym-clock-time ${hit ? 'over' : ''}`}>{mmss(elapsed)}</div>
      <div className="gym-clock-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
        {side === 'second' && banked != null
          ? hit
            ? `matched the ${mmss(banked)} you did on the first side`
            : `match the first side — ${mmss(targetSec)}`
          : hit
            ? `past the ${mmss(targetSec)} asked for — every extra second counts`
            : `target ${mmss(targetSec)}`}
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
  const { gymPlan, gymPlanning, gymPlanSolo, gymCatalog, data } = useStore()
  const { session, coins } = banked
  const report = sessionReport(session)
  const [more, setMore] = useState(false)
  const [gearMode, setGearMode] = useState<GearMode>(session.gearMode ?? 'mixed')
  // The one-tap finisher. The roman chair is the standing exception to "the
  // block decides what you do" (§18e): it is the one thing worth doing on its
  // own, so it gets its own button instead of hiding behind "do more" and a
  // minute picker. `romanChairWarmup: true` is forced because the SETTING is
  // about opening a session with it — turning that off shouldn't take away the
  // finisher you deliberately asked for. Undefined = no such bench catalogued,
  // and then there is no button at all rather than a dead one.
  const finisher = useMemo(
    () => romanChairMove(gymCatalog, { ...data.gym.brief, romanChairWarmup: true }, data.gym.ex),
    [gymCatalog, data.gym.brief, data.gym.ex],
  )

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
          {finisher && (
            <button
              className="btn btn--blue"
              style={{ marginBottom: 8 }}
              onClick={() => {
                sfx.click()
                primeGymAudio()
                gymPlanSolo(finisher.id, session)
              }}
            >
              {finisher.emoji} Do some {finisher.name.toLowerCase()}
            </button>
          )}
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
            {gymPlanning ? 'Building…' : '← Actually, I’m done'}
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

/**
 * The load. Split out of the reps row because a loaded HOLD needs the same
 * control in a different place — before the clock rather than beside a rep
 * count — and the two must stay the same control: the same notches, the same
 * "asked for" hint, the same first-time prompt.
 */
function WeightStepper({
  unit,
  value,
  planned,
  onChange,
}: {
  unit: 'lb' | 'kg'
  value: number | undefined
  planned: number | undefined
  onChange: (n: number) => void
}) {
  return (
    <Stepper
      label={`weight (${unit})`}
      value={value ?? 0}
      step={2.5}
      min={0}
      // + and − walk the dumbbell's real notches, not arithmetic
      notches={loadSteps(unit)}
      onChange={onChange}
      hint={planned != null ? `asked for ${planned}` : 'first time — set it'}
    />
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
  // a block session prescribes a RANGE: the low end has to be there, the top is
  // what you chase, and hitting it everywhere is what buys you more weight
  else if (e.repRange) bits.push(`${e.plan.reps.length} × ${e.repRange[0]}–${e.repRange[1]} ${repLabel(e)}`)
  else if (new Set(e.plan.reps).size === 1) bits.push(`${e.plan.reps.length} × ${e.plan.reps[0]} ${repLabel(e)}`)
  else bits.push(`${e.plan.reps.join(' · ')} ${repLabel(e)}`)
  if (e.plan.weight) bits.push(`${e.plan.weight} ${unit}`)
  bits.push(`rest ${e.plan.restSec}s`)
  return bits.join(' · ')
}
