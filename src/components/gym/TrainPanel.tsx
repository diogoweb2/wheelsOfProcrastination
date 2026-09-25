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
import type { CSSProperties } from 'react'
import { useStore } from '../../store/useStore'
import type { ExerciseRating, GearMode, GymSession, LoadKind, LoggedSet, Mood, SessionExercise } from '../../types'
import type { SetRecord } from '../../logic/gym'
import {
  GEAR_MODES,
  GEAR_MODE_LABEL,
  BANDS,
  PART_LABEL,
  RATING_LABEL,
  SESSION_MINUTES,
  allExercises,
  bandFor,
  benchAngleLabel,
  bestsFor,
  isFixedSession,
  isLoaded,
  isRamped,
  loadLabel,
  loadSteps,
  mmss,
  plannedWeight,
  progressesOnReps,
  recordForSet,
  sessionReport,
  sessionSeconds,
  stepLoad,
  warmupReps,
  romanChairMove,
} from '../../logic/gym'
import type { BlockAge } from '../../logic/gymBlock'
import type { SessionLength } from '../../logic/gymBlock'
import { PACE_MIN_SAMPLES, honestRange, paceCalibration } from '../../logic/gymPace'
import { DRIVER_BEAT_MS, deviceId, liveDriver, livePosition } from '../../logic/gymLive'
import {
  SESSION_LENGTHS,
  activeBlock,
  diffBlockPlans,
  blockAge,
  blockPos as blockPosOf,
  blockSessionsDone,
  blockWeeks,
  nextBlockSession,
  planBlockSession,
  sessionAfter,
  slotLine,
} from '../../logic/gymBlock'
import { keepScreenAwake } from '../../logic/wakeLock'
import confetti from 'canvas-confetti'
import { primeGymAudio, gymSfx, setGymHandedOff, sfx } from '../../audio'
import { RestTimer } from './RestTimer'
import { LEAD_SEC, SETUP_SEC, SIDE_SEC, SetupCountdown } from './SetupCountdown'
import { DemoCaption, DemoCredit, ExerciseDemo } from './ExerciseDemo'
import { MuscleMap } from './BodyMap'
import { VideoButton } from './ExerciseVideo'
import { PlanChangeModal } from './PlanChangeModal'
import { PickleballWhy } from './PickleballWhy'

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
  return <SessionFlow idle={<Setup />} />
}

/**
 * The whole session loop — preview → runner → report — over whatever is in
 * `gym.active`, with `idle` shown when there is nothing running.
 *
 * It is exported because the Snack tab (§18ab) runs the SAME loop: a snack is
 * an ordinary session in the ordinary slot, so it gets the ordinary animation,
 * rest clock, records, grade and Berries by simply being handed to the same
 * three screens. Two runners would be two runners to keep in step, and one of
 * them would quietly rot.
 *
 * Whichever tab you started on, the other one shows the session too — there is
 * one `gym.active` and pretending otherwise would mean losing a workout by
 * tapping the wrong tab mid-set.
 */
export function SessionFlow({ idle }: { idle: React.ReactNode }) {
  const active = useStore((s) => s.data.gym.active)
  const gymFinish = useStore((s) => s.gymFinish)
  const [banked, setBanked] = useState<Banked | null>(null)
  const hasActive = !!active
  const watchFinished = active?.status === 'done'
  /** Sessions already banked here, so a re-render can't pay for one twice. */
  const settled = useRef(new Set<string>())

  // ordering a "do more" block from the report retires the report
  useEffect(() => {
    if (hasActive) setBanked(null)
  }, [hasActive])

  /**
   * The session was ended on the WATCH (§18aa). All the watch could honestly
   * write is `status: 'done'` and the instant it happened — the Berries, the
   * grade, the records, the rep and hold ladders and the block rotation are
   * `gymFinish`, and a second copy of that reasoning in Kotlin would be wrong
   * within a month.
   *
   * So the banking happens HERE, the first time you open the app afterwards,
   * which is also the first moment there is a screen big enough to read the
   * report on. Nothing is asked of you: it pays, it learns, and the report is
   * simply sitting there — the stars are optional and always were.
   */
  useEffect(() => {
    if (!watchFinished || !active || settled.current.has(active.id)) return
    settled.current.add(active.id)
    const res = gymFinish()
    if (res.session) setBanked({ session: res.session, coins: res.coins })
  }, [watchFinished, active, gymFinish])

  if (active?.status === 'preview') return <Preview session={active} />
  // a session the watch closed is not a session to keep running: the effect
  // above is one tick away from turning it into a report
  if (active && !watchFinished) return <Runner session={active} onBanked={setBanked} />
  if (banked) return <ReportCard banked={banked} onClose={() => setBanked(null)} />
  if (watchFinished) return <BankingCard />
  return <>{idle}</>
}

/** The half-second between "the watch ended it" and the report. */
function BankingCard() {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>⌚</div>
      <p style={{ fontWeight: 900, fontSize: 15, marginTop: 6 }}>You finished this one on your watch.</p>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Counting the Berries…</p>
    </div>
  )
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
 * A length or mood button you have tapped but not yet agreed to: the session as
 * it stands, the session as that button would leave it, and the words for when
 * the two come out identical. See `PlanChangeModal`.
 */
interface PendingChange {
  mood: Mood
  length: SessionLength
  label: string
  emptyNote: string
  before: GymSession
  after: GymSession
}

/**
 * What each button does to the SESSION, now that its face says what the button
 * does to your evening. Both halves are needed: "~42 min" alone can't tell you
 * whether the tail came off.
 */
const LENGTH_SHAPE: Record<SessionLength, string> = {
  20: 'short',
  30: 'as written',
  40: '+1 set',
}

/** Why a length button sometimes moves nothing — always a real reason, never a shrug. */
const LENGTH_NO_CHANGE: Record<SessionLength, string> = {
  20: 'This session already fits inside 20 minutes. Nothing has to come off — the tail you would cut isn’t there.',
  30: 'Today’s session comes out the same as written either way.',
  40: 'Nothing here can take the extra set: the first two movements are ⚡ quality slots, and those stop when the speed goes, not when the count says so. Take the longer rests instead — that part is yours.',
}

/** Mood is a diary entry on a block session, not an input. Say so plainly. */
const MOOD_NO_CHANGE =
  'Your block decides the work, not how you feel — that is the whole reason it is a block. The mood is still filed with the session, so a 🥱 day and a 🔥 day can be told apart later. If you need less today, that is the 20 min button.'

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
  // A length or mood tap is held here until you have seen what it does.
  const [pending, setPending] = useState<PendingChange | null>(null)
  const byId = useMemo(() => new Map(allExercises(gymCatalog).map((e) => [e.id, e])), [gymCatalog])
  const cal = useMemo(() => paceCalibration(gym), [gym])
  const pos = blockPosOf(gym)
  /**
   * What each of the three buttons actually costs you, in wall-clock minutes.
   *
   * Built, not described: the same `planBlockSession` the ▶️ button will call,
   * run three times, so the number on the button is by construction the number
   * the countdown will start from. 20 · 30 · 40 are shapes (§18m); these are
   * minutes (§18z), and the two stopped being the same number the day the app
   * had enough history to know better.
   */
  const costs = useMemo(() => {
    const built = {} as Record<SessionLength, GymSession | null>
    for (const len of SESSION_LENGTHS) {
      built[len] = planBlockSession({ catalog: gymCatalog, gym, mood: 'normal', length: len, pos, paceFactor: cal.factor })
    }
    const written = built[30]
    return SESSION_LENGTHS.reduce(
      (acc, len) => {
        const s = built[len]
        acc[len] = {
          min: s?.minutes ?? null,
          // Two buttons printing the same minutes is not a bug — on S3 both
          // leading slots are ⚡ quality-capped, so "+1 set" has nothing to add
          // it (§18m). It IS confusing, and the modal explaining it only opens
          // AFTER you tap. The caption says it up front instead.
          same: len !== 30 && !!s && !!written && diffBlockPlans(written, s).changes.length === 0,
        }
        return acc
      },
      {} as Record<SessionLength, { min: number | null; same: boolean }>,
    )
  }, [gymCatalog, gym, pos, cal.factor])
  if (!block) return null

  /**
   * Build today's session as it stands and as the tapped setting would make it,
   * and put the two in front of you. Nothing is applied until you say so — and
   * if the session can't be built at all, the setting just changes, silently:
   * a modal with nothing in it is worse than no modal.
   */
  const propose = (next: { mood: Mood; length: SessionLength }, label: string, emptyNote: string) => {
    const before = planBlockSession({ catalog: gymCatalog, gym, mood, length, pos, paceFactor: cal.factor })
    const after = planBlockSession({
      catalog: gymCatalog,
      gym,
      mood: next.mood,
      length: next.length,
      pos,
      paceFactor: cal.factor,
    })
    if (!before || !after) {
      setMood(next.mood)
      setLength(next.length)
      return
    }
    setPending({ ...next, label, emptyNote, before, after })
  }
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
                <span className="muted">{slotLine(slot, gymCatalog, gym)}</span>
                {def && <VideoButton exId={def.id} name={def.name} />}
              </li>
            )
          })}
        </ul>

        {/* How long you have got — never WHAT you do, only how much of it.
            20 drops the tail, 40 adds a set to the first two movements. The
            button says what that costs YOU (§18z), not what the shape is
            called: "30" has meant 42 minutes on this profile all along. */}
        <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
          <label>How long have you got?</label>
          <div className="seg gym-len">
            {SESSION_LENGTHS.map((m) => (
              <button
                key={m}
                className={length === m ? 'on' : ''}
                onClick={() => {
                  sfx.click()
                  if (m === length) return
                  propose({ mood, length: m }, `⏱ ${costs[m].min ?? m} min`, LENGTH_NO_CHANGE[m])
                }}
              >
                {costs[m].min ? `~${costs[m].min} min` : `${m} min`}
                <span>{costs[m].same ? 'no change' : LENGTH_SHAPE[m]}</span>
              </button>
            ))}
          </div>
          <span className="muted" style={{ fontSize: 11, display: 'block', marginTop: 6, lineHeight: 1.4 }}>
            {length === 20
              ? 'The accessories at the end come off. The main work stays.'
              : length === 40
                ? 'An extra set on the first two movements — not extra exercises. Take the longer rests too.'
                : 'The session exactly as written.'}
            {cal.learned && ` Timings from your last ${cal.samples} finished session${cal.samples === 1 ? '' : 's'}, not from the plan.`}
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
                if (m.id === mood) return
                propose({ mood: m.id, length }, `${m.emoji} ${m.label}`, MOOD_NO_CHANGE)
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

      {pending && (
        <PlanChangeModal
          label={pending.label}
          before={pending.before}
          after={pending.after}
          emptyNote={pending.emptyNote}
          onConfirm={() => {
            setMood(pending.mood)
            setLength(pending.length)
            setPending(null)
          }}
          onCancel={() => setPending(null)}
        />
      )}
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

/**
 * Running order, before you commit. The planner sequences the session, but the
 * order is a suggestion — heavy first, or the one you actually came for first,
 * is your call. Same ↑/↓ pair the block editor uses, so it reads the same way.
 */
function MoveButtons({ onMove, first, last }: { onMove: (dir: -1 | 1) => void; first: boolean; last: boolean }) {
  return (
    <>
      <button
        className="btn btn--ghost btn--small"
        title="Do this one earlier"
        disabled={first}
        onClick={() => {
          sfx.click()
          onMove(-1)
        }}
      >
        ↑
      </button>
      <button
        className="btn btn--ghost btn--small"
        title="Do this one later"
        disabled={last}
        onClick={() => {
          sfx.click()
          onMove(1)
        }}
      >
        ↓
      </button>
    </>
  )
}

function Preview({ session }: { session: GymSession }) {
  const { gymStart, gymSwap, gymDrop, gymReorder, gymReplace, gymDeleteExercise, gymDiscard, gymPlan, gymPlanning, data } = useStore()
  const [swapping, setSwapping] = useState<string | null>(null)
  const demos = useDemos()
  const unit = data.gym.brief.weightUnit ?? 'lb'
  // Your own correction, on the number you are about to commit an evening to.
  const cal = useMemo(() => paceCalibration(data.gym), [data.gym])
  const estimate = Math.max(1, Math.round(sessionSeconds(session, cal.factor) / 60))
  const range = honestRange(session, cal)
  // A block rotation and a snack routine are both written down in advance, so
  // both get the fixed-list treatment: drop a slot, reorder it, swap it for
  // something that does the same job — never "here is a different exercise".
  const fixed = isFixedSession(session)

  return (
    <>
      <div className="h2">📋 Before you start</div>

      <div className="card">
        <div className="gym-note-head">
          {session.snackName ? (
            <span className="chip chip--test">🍿 {session.snackName} snack</span>
          ) : session.blockSessionName ? (
            <span className="chip chip--test">🧱 {session.blockSessionName}</span>
          ) : (
            <span className="chip">⚙️ Off-programme</span>
          )}
          <span className="chip">⏱ ~{estimate} min</span>
          {range && <span className="chip">usually {range[0]}–{range[1]}</span>}
          <span className="chip">{MOODS.find((m) => m.id === session.mood)?.emoji} {MOODS.find((m) => m.id === session.mood)?.label}</span>
          {session.gearMode && session.gearMode !== 'mixed' && <span className="chip">{GEAR_MODE_LABEL[session.gearMode]}</span>}
          {session.followUp && <span className="chip chip--test">➕ Bonus block</span>}
        </div>
        {session.note && <p style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>“{session.note}”</p>}
        {/* Where the number came from. An estimate you can't audit is a number
            you stop believing the second it is wrong once (§18z). */}
        <p className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.45 }}>
          {cal.learned
            ? `⏱ is wall clock, from your last ${cal.samples} finished session${cal.samples === 1 ? '' : 's'}: they ran ${cal.factor.toFixed(2)}× what the sets and rests add up to. Changing the dumbbell, reading the card and the rest you actually take are all in there.`
            : `⏱ is sets plus rests plus a walk-over. It has nothing to correct itself with yet: ${PACE_MIN_SAMPLES} finished sessions and it starts measuring how long they really take you.`}
        </p>
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
            {fixed && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <MoveButtons
                  onMove={(dir) => gymReorder(e.exId, dir)}
                  first={i === 0}
                  last={i === session.exercises.length - 1}
                />
                <button
                  className="btn btn--ghost btn--small"
                  style={{ flex: 1 }}
                  onClick={() => {
                    sfx.click()
                    gymDrop(e.exId)
                  }}
                >
                  ✕ Skip this one today
                </button>
              </div>
            )}
            {fixed && (
              <button
                className="btn btn--ghost btn--small"
                style={{ marginTop: 8, width: '100%' }}
                // The slot keeps its sets; only the movement changes. A rack in
                // use, a shoulder that doesn't like today's angle — the block's
                // work still gets done, by something that does the same job.
                onClick={() => {
                  sfx.click()
                  if (gymReplace(e.exId) === 'none') sfx.error()
                }}
              >
                🔄 Swap for something similar
              </button>
            )}
            {!fixed && (
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
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <MoveButtons
                    onMove={(dir) => gymReorder(e.exId, dir)}
                    first={i === 0}
                    last={i === session.exercises.length - 1}
                  />
                  <button
                    className="btn btn--ghost btn--small"
                    style={{ flex: 1 }}
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
        {!fixed && (
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

/**
 * What comes off a CLOCKED set when you stop it (§18c-1e). You cannot end a
 * plank and press the phone in the same instant: you unwind, you reach, you
 * press. Those seconds were never hold time, so they are not logged as hold
 * time. The bell allows for them too — it rings at target + this — so the
 * number that gets banked is still the number that was asked for.
 */
const STOP_LAG_SEC = 10

function Runner({ session, onBanked }: { session: GymSession; onBanked: (b: Banked) => void }) {
  const {
    data,
    gymLogSet,
    gymUndoSet,
    gymLogRest,
    gymRateInSession,
    gymSkip,
    gymAbandon,
    gymArmWarmup,
    gymLogWarmup,
    gymSetOptions,
    gymClaimDrive,
    gymReleaseDrive,
    gymSetRestUntil,
  } = useStore()
  /**
   * WHO HAS THE SESSION (§18aa). The watch is a full client of the same
   * document, not a remote control — so while it is driving, this runner reads
   * and does not write. Two writers means last-write-wins over the whole `gym`
   * object, and the set you just did on your wrist is what gets lost.
   */
  const me = deviceId()
  const driver = liveDriver(session)
  const watching = !!driver && driver.id !== me

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
  /**
   * The gap between "that side is done" and the next side's clock. Rolling from
   * one forearm to the other takes a few seconds whatever you do, and measuring
   * them as hold time makes the second side look longer than it was held.
   */
  const [sidePrep, setSidePrep] = useState(false)
  /**
   * The band set that opens a loaded exercise (§18u) — `true` while you are
   * actually doing it, so the same START/DONE loop drives a set that is
   * deliberately not a set.
   */
  const [warming, setWarming] = useState(false)
  const [finishing, setFinishing] = useState(false)
  /** The record the set you just logged beat, if it beat one. Cleared on a tap or on its own. */
  const [pr, setPr] = useState<(SetRecord & { exName: string }) | null>(null)
  const demos = useDemos()
  const unit = data.gym.brief.weightUnit ?? 'lb'
  /**
   * 👁 FOCUS MODE (§18y). On (the default, and read as `!== false` so an old
   * profile gets it too) the runner is the name, the video button and the two
   * numbers. Everything explanatory — the animation, the brief, the pickleball
   * reason, the set pills, the plan line — is one tap away, not in the way.
   */
  const lean = data.gym.focusMode !== false

  const list = session.exercises
  const current = list[Math.min(idx, list.length - 1)] as SessionExercise | undefined
  const memory = current ? data.gym.ex[current.exId] : undefined
  const needsRating = !!current && !current.rating && !memory?.rating

  /**
   * A band warm-up is offered on a LOADED, COUNTED movement that hasn't started
   * yet — the heavy presses and rows. Not on a band exercise (the band is the
   * work), not on a hold, and never twice: once the offer has been answered,
   * `warmup` exists and the card is gone for the rest of the session.
   */
  const canWarmUp = (e: SessionExercise | undefined): boolean =>
    !!e && !e.skipped && e.kind === 'weight' && e.loadKind !== 'band' && e.sets.length === 0 && !e.warmup

  /**
   * Where the runner lands when it arrives at a set with the rest behind it.
   * A COUNTED set starts itself after the 15s setup, as it always has. A
   * CLOCKED one never does (§18c-1e): a plank you didn't start is a plank the
   * app is timing while you are still walking to the mat, so it waits in
   * 'ready' with START under your foot.
   */
  const landing = (e: SessionExercise | undefined): Phase =>
    !e || canWarmUp(e) || isClocked(e) ? 'ready' : 'setup'

  const nextSetNo = current ? current.sets.length : 0
  const plannedReps = current?.plan.reps[Math.min(nextSetNo, (current?.plan.reps.length ?? 1) - 1)] ?? 10

  // what you actually lifted last set of THIS exercise beats what was planned:
  // once you bump the bar up, every set after it starts there. A RAMP (§18e) is
  // the exception — it prescribes a weight per set on purpose, and carrying the
  // light one forward would flatten the climb it exists to make.
  const plannedLoad = current ? plannedWeight(current, nextSetNo) : undefined
  const lastLoggedWeight = current?.sets.length ? current.sets[current.sets.length - 1].weight : undefined
  const armedWeight = current && isRamped(current) ? plannedLoad : (lastLoggedWeight ?? plannedLoad)

  const [reps, setReps] = useState(plannedReps)
  const [weight, setWeight] = useState<number | undefined>(armedWeight)
  /** The band picked for the warm-up, until it is armed. Undefined = whatever you used last time. */
  const [band, setBand] = useState<number | undefined>(undefined)

  /**
   * Hold the session while this runner is on screen, and let go when it isn't.
   *
   * Claiming is not a lock on the workout — it is a lock on WRITING. A driver
   * that stops beating for `DRIVER_STALE_MS` has gone (flat watch battery,
   * closed tab) and the session is free again without anyone having to say so.
   */
  /** The watch beeps on your wrist; the phone stays out of the podcast (§18aa). */
  useEffect(() => {
    setGymHandedOff(watching)
    return () => setGymHandedOff(false)
  }, [watching])

  /**
   * WHILE THE WATCH DRIVES, THIS RUNNER IS A DISPLAY — so where it is looking
   * has to come from the sets, not from an index this device stopped moving.
   *
   * `idx` is local state because normally this device is the one advancing it.
   * Hand the session to the wrist and nothing advances it at all: the watch
   * logged three sets of Hollow Hold and the phone sat on the same card
   * counting them, which is how it came to say **“set 4 of 3”**. `livePosition`
   * is the answer §18aa already wrote down — the first exercise still owing
   * sets — and mirroring it is all the phone has to do.
   */
  useEffect(() => {
    if (!watching) return
    const at = livePosition(session).idx
    setIdx((n) => (n === at ? n : at))
  }, [watching, session])

  /**
   * THE SESSION BEING OVER IS NOT AN EVENT THIS DEVICE HAS TO WITNESS.
   *
   * Logging the last set here has always gone straight to the finish card. Then
   * the watch started doing the logging (§18aa) and that path simply never ran,
   * so a workout finished on the wrist left the phone in the runner for ever.
   * The honest test is the derived one — nothing left owing — and it is true
   * whichever device did the work. This is deliberately a second route to the
   * same place: `gym.active.status` going `done` (`SessionFlow`) is the normal
   * one, and this one still fires if a flat watch battery means that write
   * never lands.
   */
  const nothingLeft = livePosition(session).done
  useEffect(() => {
    if (nothingLeft) setFinishing(true)
  }, [nothingLeft])

  useEffect(() => {
    if (watching) return
    gymClaimDrive()
    const id = window.setInterval(() => gymClaimDrive(), DRIVER_BEAT_MS)
    return () => {
      window.clearInterval(id)
      gymReleaseDrive()
    }
  }, [watching, gymClaimDrive, gymReleaseDrive])

  /**
   * Publish when rest ends, so a device that arrives mid-rest — the watch, or
   * this phone waking up — lands on the same countdown rather than starting a
   * fresh one. Wall clock, never a tick count.
   */
  useEffect(() => {
    if (watching) return
    const secs = current?.plan.restSec ?? 60
    if (phase === 'resting') gymSetRestUntil(new Date(Date.now() + secs * 1000).toISOString())
    else gymSetRestUntil(null)
    // the rest LENGTH is deliberately absent from the deps: +TIME during a rest
    // must not republish the instant and restart everyone else's countdown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, watching, idx])

  // a new exercise (or a new set) re-arms the inputs with what was prescribed —
  // you only touch them when reality differs, and that difference is the signal
  useEffect(() => {
    setReps(plannedReps)
    setWeight(armedWeight)
  }, [idx, nextSetNo, plannedReps, armedWeight])

  // a new exercise brings its own band and its own warm-up question
  useEffect(() => {
    setBand(undefined)
    setWarming(false)
  }, [idx])

  /**
   * The sides belong to ONE set. Move to a new set — or a new exercise — and
   * they go with the old one: `sideSec` used to be cleared only by `begin()`,
   * which was safe while every landing ran through the setup countdown and
   * therefore through `begin()`. A clocked set now lands on ▶️ START and waits
   * (§18c-1e), so it can be left by SKIP or NEXT with side one still banked —
   * and the stale entry then tells the NEXT clocked hold that its first side is
   * already done: the foot button says ✓ DONE instead of ↔️ OTHER SIDE, and
   * pressing it logs a set made of someone else's clock.
   */
  useEffect(() => {
    setSideSec([])
    setSidePrep(false)
  }, [idx, nextSetNo])

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

  // What the NEXT set of this exercise wants on the bar, against what you just
  // put on it. A ramp climbs on purpose (§18e), so this is the screen that says
  // so while you still have time to walk over and change the plates.
  const lastLoad = current.sets.length ? current.sets[current.sets.length - 1].weight : undefined
  const loadNote =
    setsLeft > 0 && isLoaded(current) && armedWeight != null && lastLoad != null ? (
      <LoadChange
        from={lastLoad}
        to={armedWeight}
        unit={unit}
        loadKind={current.loadKind}
        perSide={current.loadPerSide}
      />
    ) : null

  /**
   * The two numbers for whatever the runner is pointing at, drawn the same on
   * the set screen and on the rest screen (§18y). During rest that is the NEXT
   * thing — another set of this one, or the movement you should be walking to.
   */
  const bigFor = (e: SessionExercise, setNo: number, w: number | undefined, r: number) => (
    <NextUp
      weight={isLoaded(e) ? w : undefined}
      unit={unit}
      loadKind={e.loadKind}
      perSide={e.loadPerSide}
      setNo={setNo}
      sets={e.plan.reps.length}
      reps={r}
      repLabel={repLabel(e)}
      open={!!e.maxHold}
    />
  )

  /** A hold or a run: the app measures it, and it is the measurement that is logged. */
  const clocked = isClocked(current)

  /**
   * How long the clock that just stopped really ran. On a clocked set the walk
   * back to the phone comes off it (§18c-1e); on a counted one the number is
   * only the pace, so it stays as measured.
   */
  const stopClock = () => Math.max(1, (Date.now() - startedAt) / 1000 - (clocked ? STOP_LAG_SEC : 0))

  /** Start (or restart) the clock on the set in front of you — side one, if there are sides. */
  const begin = () => {
    setSideSec([])
    setSidePrep(false)
    setWarming(false)
    setStartedAt(Date.now())
    setPhase('working')
  }

  /** The band this warm-up would use: your last answer for this movement, or the lightest one. */
  const bandDefault = memory?.warmupBand ?? (unit === 'kg' ? BANDS[0].kg : BANDS[0].lb)
  const chosenBand = band ?? bandDefault
  const warmAsk = warmupReps(plannedReps)

  /** Yes to the warm-up: remember the band, then run it like any other set. */
  const startWarmup = () => {
    if (!current) return
    gymArmWarmup(current.exId, chosenBand, warmAsk)
    setReps(warmAsk)
    setSideSec([])
    setSidePrep(false)
    setWarming(true)
    setStartedAt(Date.now())
    setPhase('working')
  }

  /** No to it — recorded as an answer, so a refresh doesn't ask again. Straight into setup. */
  const skipWarmup = () => {
    if (!current) return
    gymLogWarmup(current.exId, null)
    setPhase('setup')
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
  /**
   * An OPEN HOLD (§18t) has no number on the first side: you go until you cannot,
   * and what you managed is the target the second side has to match — asking for
   * the prescribed 30 s after a first side that failed at 20 would be asking the
   * weak side to beat the strong one.
   */
  const openHold = !!current.maxHold && isClocked(current) && sideSec.length === 0
  const sideTarget =
    sideSec.length === 0
      ? plannedReps
      : current.maxHold
        ? Math.max(...sideSec)
        : Math.max(plannedReps, ...sideSec)

  /**
   * What to have in your hands when the clock starts. A loaded carry is the one
   * set you cannot fix once it is live — the phone is on the floor and both
   * hands are full — so the setup countdown says the load and the time out loud
   * instead of the generic "walk over, load it".
   */
  const setupNote =
    isClocked(current) && isLoaded(current) && weight != null
      ? `${loadLabel(weight, unit, current.loadKind, current.loadPerSide)}${current.perSide ? ' — one side at a time' : ' in each hand'}, ${openHold ? 'held for as long as it lasts' : `held for ${plannedReps}s`}. Pick it up now: the clock starts at zero.`
      : undefined

  /**
   * "That side is done." Bank it, then hand over five seconds to roll onto the
   * other side — the next clock starts when the countdown does, not when your
   * elbow is still moving.
   */
  const switchSides = () => {
    const sec = stopClock()
    gymSfx.go()
    setSideSec([...sideSec, sec])
    setSidePrep(true)
  }

  /** The five seconds are up (or you skipped them): the other side is live. */
  const startOtherSide = () => {
    setSidePrep(false)
    setStartedAt(Date.now())
  }

  /**
   * Move on without logging anything more for this exercise. It lands wherever
   * the next movement's own rule puts it (`landing`) — straight into setup for a
   * counted one, so jumping ahead doesn't cost an extra tap on GO.
   */
  const moveOn = (skip: boolean) => {
    if (skip) gymSkip(current.exId)
    if (isLast) {
      setFinishing(true)
      return
    }
    setIdx(idx + 1)
    // the warm-up question has to be asked BEFORE the setup countdown starts the
    // real set, so an exercise that owes one holds in 'ready' — and so does a
    // clocked one, which is never started by anything but a tap
    setPhase(landing(list[idx + 1]))
  }

  /** DONE — measure the set, log it, and drop straight into rest. */
  const done = () => {
    const thisSide = stopClock()
    // the band set is not a set: it is banked on `warmup`, pays nothing, beats
    // no records, and is followed by ordinary rest before the real set 1
    if (warming) {
      gymSfx.logged()
      gymLogWarmup(current.exId, { reps, sec: thisSide })
      setWarming(false)
      // the stepper was holding the BAND set's reps (20 of them, on purpose —
      // §18u). The set that follows is the real one, so it must be pre-filled
      // with what the plan asks for again: nothing else re-arms it, because no
      // set was logged and `nextSetNo` has not moved. Left alone it offers the
      // warm-up's twenty reps against the working weight.
      setReps(plannedReps)
      setWeight(armedWeight)
      setPhase('resting')
      return
    }
    // every side of the set, the one just finished included — for anything that
    // isn't per-side that is simply the one clock
    const sides = [...sideSec, thisSide]
    const sec = sides.reduce((n, x) => n + x, 0)
    // a timed hold or a run is measured, never typed: hold a 30s plank for a
    // minute and the minute is what gets logged
    const logged =
      current.kind === 'timed' ? Math.round(sec) : current.kind === 'cardio' ? Math.max(1, Math.round(sec / 60)) : reps
    // Did that beat anything? Checked BEFORE the set is logged, against every
    // set this exercise has ever done — the permanent memory for the all-time
    // bests, the log for "how many reps at that exact load", and the sets
    // already done today so your own first set counts as something to beat.
    const beat = recordForSet(
      bestsFor(memory, data.gym.sessions, current.exId, current.sets),
      { reps: logged, weight },
      current,
      (n) => loadLabel(n, unit, current.loadKind, current.loadPerSide),
    )
    gymSfx.logged()
    setSidePrep(false)
    gymLogSet(current.exId, logged, weight, sec, twoSided ? sides : undefined)
    if (beat) celebrate(() => setPr({ ...beat, exName: current.name }))
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
      setPhase(landing(current))
      return
    }
    if (isLast) {
      setFinishing(true)
      return
    }
    setIdx(idx + 1)
    setPhase(landing(list[idx + 1]))
  }

  return (
    <>
      {watching && (
        // Not an error and not a lock on the workout: the watch has the pen,
        // this screen is the same session read live. Taking it back is one tap
        // and costs nothing — the sets are in the document either way.
        <div className="card gym-handoff">
          <div style={{ fontSize: 30 }}>⌚</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>Your watch has this one</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
              Everything below is live. This phone is staying quiet and won’t log anything — so the two can’t overwrite
              each other.
            </div>
          </div>
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              sfx.click()
              gymClaimDrive(true)
            }}
          >
            Take over
          </button>
        </div>
      )}
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
            className="gym-quit gym-eye"
            onClick={() => {
              sfx.click()
              gymSetOptions({ focusMode: !lean })
            }}
            aria-pressed={!lean}
          >
            {lean ? '👁 More' : '🙈 Less'}
          </button>
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
          lean={lean}
          nextDemo={lean ? undefined : demos.get(nextUpEx?.exId ?? '')}
          nextEmoji={lean ? undefined : nextUpEx?.emoji}
          nextExId={nextUpEx?.exId}
          nextName={nextUpEx?.name}
          // the weight and the reps for whatever NEXT starts, at the same size
          // they have on the set screen — rest is when you walk over and load it
          bigNext={
            setsLeft > 0
              ? bigFor(current, current.sets.length + 1, armedWeight, plannedReps)
              : upNext
                ? bigFor(upNext, 1, plannedWeight(upNext, 0), upNext.plan.reps[0] ?? 10)
                : undefined
          }
          loadNote={
            <>
              {lean && nextUpEx && <LeanFacts ex={nextUpEx} />}
              {loadNote}
            </>
          }
          footNote={<SessionCountdown session={session} />}
          // the words for the thing you are about to walk over to. Only for a
          // NEW exercise — re-reading the brief for the set you have just done
          // twice is noise, and it would push the clock off a phone screen.
          nextBrief={
            !lean && setsLeft === 0 && upNext ? <ExerciseBrief ex={upNext} setNo={upNext.sets.length} /> : undefined
          }
          // 🏓 and the reason you are doing any of it (§18s). Always the movement
          // you are about to walk back to — on the last rest of the session that
          // is the one you just finished, which is the right one to leave you with.
          whyCard={lean ? undefined : <PickleballWhy ex={nextUpEx ?? current} />}
          upNext={
            lean ? undefined : setsLeft > 0 ? (
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
            {!lean && (
              <ExerciseDemo
                demo={demos.get(current.exId)}
                emoji={current.emoji}
                size={96}
                autoPlay
                className="gym-ex-emoji--big"
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: lean ? 24 : 19, lineHeight: 1.15 }}>{current.name}</div>
              {/* You have done this one already and it is on screen again: say
                  so at the size of the name, not in the 11px progress line. A
                  clocked set waits on ▶️ START (§18c-1e), so the card sits there
                  looking exactly like a new exercise until something says it
                  isn't — and "didn't I just do this?" is answered with SKIP. */}
              {!warming && nextSetNo > 0 && (
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--yellow)' }}>
                  ↻ same exercise · set {nextSetNo + 1} of {current.plan.reps.length}
                </div>
              )}
              {/* the load lives in its own card now (§18v), so the line under
                  the name carries everything EXCEPT the weight */}
              {!lean && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {planLine(current, unit, { load: !isLoaded(current) })}
                </div>
              )}
            </div>
            <VideoButton exId={current.exId} name={current.name} />
          </div>

          {lean ? (
            <LeanFacts ex={current} />
          ) : (
            <>
              <ExerciseBrief ex={current} setNo={nextSetNo} topped={memory?.repPlan?.phase === 3} />
              <DemoCaption demo={demos.get(current.exId)} />
            </>
          )}

          {/* The two numbers you walk to the rack with (§18v/§18y) — the load
              for the NEXT set and the reps it wants, never hidden by focus
              mode, because they are the whole instruction. */}
          {warming ? (
            <NextUp
              head="🔥 warm-up set"
              weight={chosenBand}
              unit={unit}
              loadKind="band"
              setNo={1}
              sets={1}
              reps={warmAsk}
              repLabel={repLabel(current)}
            />
          ) : (
            bigFor(current, nextSetNo + 1, armedWeight, plannedReps)
          )}

          <div className="gym-set-row" style={lean ? { display: 'none' } : undefined}>
            {current.warmup?.done && (
              <span className="gym-set done" title="band warm-up">
                🔥{current.warmup.done.reps}
                <em>{bandFor(current.warmup.band, unit)?.color.toLowerCase() ?? '—'}</em>
              </span>
            )}
            {current.plan.reps.map((r, i) => {
              const logged = current.sets[i]
              return (
                <span key={i} className={`gym-set ${logged ? 'done' : i === nextSetNo ? 'now' : ''}`}>
                  {logged ? setChip(logged) : r}
                  {logged?.weight ? <em>{loadChip(logged.weight, unit, current.loadKind)}</em> : null}
                </span>
              )
            })}
            {current.sets.length > current.plan.reps.length &&
              current.sets.slice(current.plan.reps.length).map((s, i) => (
                <span key={`extra-${i}`} className="gym-set done">
                  {setChip(s)}
                  {s.weight ? <em>{loadChip(s.weight, unit, current.loadKind)}</em> : null}
                </span>
              ))}
          </div>

          {canWarmUp(current) && !warming && phase !== 'working' && (
            <WarmupOffer
              unit={unit}
              band={chosenBand}
              reps={warmAsk}
              remembered={memory?.warmupBand != null}
              onBand={setBand}
              onSkip={() => {
                sfx.click()
                skipWarmup()
              }}
            />
          )}

          {phase === 'setup' && (
            // a counted set gets the full 15s to walk over and load the bar; a
            // clocked one gets the short lead-in, because you only tapped START
            // once you were already standing over the mat (§18c-1e)
            <SetupCountdown
              seconds={clocked ? LEAD_SEC : SETUP_SEC}
              onDone={begin}
              title={clocked ? '⏱ Clock starts in' : undefined}
              note={
                // a loaded carry says its own load and its own seconds (§18c-2)
                setupNote ??
                (clocked
                  ? 'Get into position. The clock starts at zero — or the second you tap GO.'
                  : undefined)
              }
            />
          )}
          {phase === 'setup' && loadNote}

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
                planned={plannedLoad}
                onChange={setWeight}
                loadKind={current.loadKind}
                perSide={current.loadPerSide}
                fixed={current.loadFixed}
              />
            </div>
          )}

          {phase === 'working' && sidePrep ? (
            // the roll-over. Five seconds, then the other side's clock starts on
            // its own — you never have to find the phone with one arm down
            <SetupCountdown
              seconds={SIDE_SEC}
              onDone={startOtherSide}
              title="↔️ Other side"
              note={`Roll over and get set. The second side's clock starts at zero — or the second you tap GO.`}
            />
          ) : phase === 'working' && isClocked(current) ? (
            // a plank or a run: no numbers to type, just a clock that keeps going.
            // a per-side hold runs one clock PER SIDE, and the second side's
            // target is whatever the first one actually managed
            <WorkClock
              // a fresh clock per side, so the target bell rings again on the second
              key={startedAt}
              startedAt={startedAt}
              target={twoSided ? sideTarget : plannedReps}
              kind={current.kind}
              lag={STOP_LAG_SEC}
              open={openHold}
              side={twoSided ? (sideSec.length === 0 ? 'first' : 'second') : undefined}
              banked={sideSec[0]}
            />
          ) : phase === 'working' && warming ? (
            // the band set: reps you count, a colour instead of a load, and no
            // record to beat — it is the groove, not the work
            <>
              {!lean && (
                <div className="gym-banner">
                  🔥 <strong>Warm-up set.</strong> {warmAsk} easy {repLabel(current)} with the band, nothing near
                  failure. It is not logged as a set and it beats no records.
                </div>
              )}
              <div className="gym-inputs">
                <Stepper label={repLabel(current)} value={reps} step={1} min={1} onChange={setReps} />
                <BandPicker unit={unit} value={chosenBand} planned={chosenBand} onChange={setBand} />
              </div>
            </>
          ) : phase === 'working' ? (
            <div className="gym-inputs">
              <Stepper label={repLabel(current)} value={reps} step={1} min={1} onChange={setReps} />
              {isLoaded(current) && (
                <WeightStepper
                  unit={unit}
                  value={weight}
                  planned={plannedLoad}
                  onChange={setWeight}
                  loadKind={current.loadKind}
                  perSide={current.loadPerSide}
                  fixed={current.loadFixed}
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
      {pr && <RecordBanner record={pr} onClose={() => setPr(null)} />}

      <div className="gym-foot-gap" />
      {phase !== 'resting' && (
        <div className="gym-foot">
          <SessionCountdown session={session} />
          {phase === 'working' && sidePrep ? (
            <button
              className="btn"
              onClick={() => {
                sfx.click()
                startOtherSide()
              }}
            >
              ▶️ GO NOW
            </button>
          ) : phase === 'working' && twoSided && sideSec.length === 0 ? (
            // the honest end of side one: press it the moment that side is done
            // and the five seconds that follow are yours, not the clock's
            <button className="btn" onClick={switchSides}>
              ↔️ OTHER SIDE
            </button>
          ) : phase === 'working' ? (
            <button className="btn" onClick={done}>
              ✓ DONE
            </button>
          ) : canWarmUp(current) && phase !== 'setup' ? (
            <button
              className="btn"
              onClick={() => {
                sfx.fanfare()
                startWarmup()
              }}
            >
              🔥 WARM-UP SET
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                sfx.fanfare()
                // on a clocked set START does not start the clock — it starts
                // the countdown to the clock (§18c-1e)
                if (clocked && phase !== 'setup') setPhase('setup')
                else begin()
              }}
            >
              {phase === 'setup' ? '▶️ GO NOW' : clocked ? `▶️ START — ${LEAD_SEC}s LEAD` : '▶️ START'}
            </button>
          )}
        </div>
      )}
    </>
  )
}

/**
 * The handful of facts from the brief that change what your HANDS do, kept in
 * focus mode (§18y) as one line of chips: which hole the bench goes in (§18w),
 * whether the number is per side (§18c-1a), whether this one is all-out. The
 * prose around them is what focus mode is for hiding; these are instructions.
 */
function LeanFacts({ ex }: { ex: SessionExercise }) {
  const bits: string[] = []
  if (ex.benchAngle != null) bits.push(`🪑 ${benchAngleLabel(ex.benchAngle)}`)
  if (ex.perSide) bits.push(isClocked(ex) ? '↔️ one side at a time' : '↔️ both sides')
  if (ex.loadPerSide) bits.push('⚖️ that weight EACH side')
  if (ex.maxHold) bits.push('⏳ max hold — no target')
  // focus mode hides the brief, and the two rules that change what your thumb
  // does on a clocked set are exactly the ones you need before you lie down
  if (isClocked(ex)) bits.push(`⏱ ${LEAD_SEC}s lead, −${STOP_LAG_SEC}s on stop`)
  if (ex.ladderTest) bits.push('🏁 max test — one all-out set')
  if (bits.length === 0) return null
  return (
    <div className="gym-lean-facts">
      {bits.map((b) => (
        <span key={b}>{b}</span>
      ))}
    </div>
  )
}

/**
 * THE TWO NUMBERS YOU WALK TO THE RACK WITH (§18v, widened by §18y).
 *
 * A set is one instruction — *put this on the dumbbell and do this many* — and
 * it used to be a clause in a 12px grey line that also carried the rep range,
 * the ramp, the rest and the session budget. Standing over the rack with the
 * phone on the floor, that is unreadable. So the next set's real load AND its
 * rep ask get a card of their own, at a size you can read from standing with
 * glasses off, and the plan line underneath stops repeating them.
 *
 * It is on the set screen and on the rest screen, always, focus mode or not:
 * these are the only two numbers the session ever actually asks you for.
 */
function NextUp({
  weight,
  unit,
  loadKind,
  perSide,
  setNo,
  sets,
  reps,
  repLabel,
  open,
  head,
}: {
  /** Undefined on bodyweight work — then the card is reps alone. */
  weight?: number
  unit: 'lb' | 'kg'
  loadKind?: LoadKind
  perSide?: boolean
  setNo: number
  sets: number
  reps: number
  repLabel: string
  /** A max hold (§18t) has no rep number: you go until it goes. */
  open?: boolean
  /** Overrides "set 2 of 3" — the band warm-up (§18u) is not a numbered set. */
  head?: string
}) {
  const band = weight != null && loadKind === 'band' ? bandFor(weight, unit) : undefined
  // "reps per side" is two words too many at 44px — the label carries it
  const label = repLabel.replace(' per side', '')
  return (
    <div className="gym-next-load">
      <div className="gym-next-load-head">{head ?? `set ${Math.min(setNo, sets)} of ${sets}`}</div>
      <div className="gym-next-load-grid">
        {weight != null && (
          <div className="gym-next-load-cell">
            <div className="gym-next-load-label">weight</div>
            <div className="gym-next-load-big">
              {band ? (
                <>
                  <span className="gym-next-load-dot" style={{ '--band': band.css } as CSSProperties} />
                  <span className="gym-next-load-band">{band.color}</span>
                </>
              ) : (
                <>
                  {weight} <small>{unit}</small>
                </>
              )}
            </div>
          </div>
        )}
        <div className="gym-next-load-cell">
          <div className="gym-next-load-label">{open ? 'hold' : label}</div>
          <div className="gym-next-load-big">
            {open ? <span className="gym-next-load-band">MAX</span> : reps}
          </div>
        </div>
      </div>
      {perSide && weight != null && (
        <div className="gym-next-load-sub">
          on EACH side · {weight * 2} {unit} total
        </div>
      )}
      {repLabel.includes('per side') && <div className="gym-next-load-sub">per side</div>}
      {band && <div className="gym-next-load-sub">the {band.color.toLowerCase()} band ({weight} {unit})</div>}
    </div>
  )
}

/**
 * "Warm this one up first?" (§18u)
 *
 * Offered on the heavy counted lifts, before the first set, and answered in one
 * tap either way — the band is already the one you used last time, because a
 * warm-up you have to configure is a warm-up you skip. Saying no is recorded as
 * an answer, not left open, so it is asked once per exercise per session.
 */
function WarmupOffer({
  unit,
  band,
  reps,
  remembered,
  onBand,
  onSkip,
}: {
  unit: 'lb' | 'kg'
  band: number
  reps: number
  remembered: boolean
  onBand: (n: number) => void
  onSkip: () => void
}) {
  const chosen = bandFor(band, unit)
  return (
    <div className="card gym-warmup">
      <div style={{ fontWeight: 900, fontSize: 15 }}>🔥 Warm-up set first?</div>
      <p className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
        {reps} easy reps of the same movement with a band, then rest, then the real work. It costs a couple of
        minutes and it is never logged as a set.{' '}
        {remembered ? `Last time you used the ${chosen?.color.toLowerCase()} one.` : 'Pick a band — it is remembered.'}
      </p>
      <BandPicker unit={unit} value={band} planned={band} onChange={onBand} />
      <button className="btn btn--ghost btn--small" style={{ width: '100%', marginTop: 8 }} onClick={onSkip}>
        Skip it — straight into the work
      </button>
    </div>
  )
}

/**
 * The load for the next set, against the load you just used. It exists because
 * a ramp is silent otherwise: you finish set 2 at 18.5, walk back, and only
 * find out it wanted 25 when the set is already live and your hands are full.
 * It says "same" out loud too — "did it change?" deserves an answer either way.
 */
function LoadChange({
  from,
  to,
  unit,
  loadKind,
  perSide,
}: {
  from: number
  to: number
  unit: 'lb' | 'kg'
  loadKind?: LoadKind
  perSide?: boolean
}) {
  const say = (n: number) => loadLabel(n, unit, loadKind, perSide)
  if (to === from)
    return <div className="gym-load-change is-same">⚖️ Same load next set — {say(to)}</div>
  const up = to > from
  return (
    <div className={`gym-load-change ${up ? '' : 'is-down'}`}>
      {up ? '⬆️ HEAVIER NEXT SET' : '⬇️ Lighter next set'} · <em>{say(from)}</em> → {say(to)}
    </div>
  )
}

/** Gold everywhere, a noise, and a medal. A record you don't notice isn't motivation. */
function celebrate(show: () => void) {
  show()
  gymSfx.win()
  const colors = ['#ffce00', '#ff9600', '#60bff5', '#eaf4ff']
  void confetti({ particleCount: 90, spread: 75, origin: { y: 0.55 }, colors, scalar: 1.1 })
  window.setTimeout(() => void confetti({ particleCount: 60, spread: 110, origin: { y: 0.45 }, colors }), 220)
}

/**
 * The record itself, said out loud and with the REASON attached (§18p). "Same
 * load, more work" is the one that needs explaining — the number on the bar
 * didn't move, so without the sentence it reads as the app being confused.
 * It clears itself; a tap clears it sooner, because rest is already running.
 */
function RecordBanner({ record, onClose }: { record: SetRecord & { exName: string }; onClose: () => void }) {
  // the timer belongs to THIS record, not to the parent's render — a re-render
  // underneath must not quietly hand the banner another 3.4 seconds
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const id = window.setTimeout(() => close.current(), 3400)
    return () => window.clearTimeout(id)
  }, [record])
  const medal = record.kind === 'weight' ? '🏋️' : record.kind === 'hold' ? '⏱️' : '🏅'
  return (
    <div className="gym-pr" onClick={onClose} role="status">
      <div className="gym-pr-card">
        <span className="gym-pr-medal">{medal}</span>
        <div className="gym-pr-title">{record.title}</div>
        <div className="gym-pr-sub">{record.why}</div>
        <div className="gym-pr-ex">{record.exName}</div>
      </div>
    </div>
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
function ExerciseBrief({ ex, setNo, topped }: { ex: SessionExercise; setNo: number; topped?: boolean }) {
  const plannedReps = ex.plan.reps[Math.min(setNo, ex.plan.reps.length - 1)] ?? 10
  const twoSided = isClocked(ex) && !!ex.perSide
  return (
    <>
      {ex.perSide && (
        <div className="gym-banner">
          {twoSided ? (
            <>
              ↔️ <strong>One side at a time.</strong> {ex.maxHold ? 'Hold the first side as long as you can' : 'Hold the first side'}, then press{' '}
              <strong>↔️ OTHER SIDE</strong> the moment it drops — you get 5s to roll over before the second clock
              starts, and that side has to match the first. Press <strong>✓ DONE</strong> at the end of it.
            </>
          ) : (
            <>
              ↔️ <strong>Both sides.</strong> Every set is {plannedReps} reps on the left <em>and</em> {plannedReps} on
              the right. Log it once, when both are done.
            </>
          )}
        </div>
      )}

      {ex.benchAngle != null && (
        <div className="gym-banner">
          🪑 <strong>Bench: {benchAngleLabel(ex.benchAngle)}.</strong> Set it before you pick anything up — the angle
          is what makes this a different exercise from the one next to it.
        </div>
      )}

      {ex.maxHold && (
        <div className="gym-banner">
          ⏳ <strong>Max hold.</strong> No target on the first side — go until the form goes. Whatever you manage is
          what the other side is asked for, and what the next session starts from.
        </div>
      )}

      {isClocked(ex) && (
        <div className="gym-banner">
          ⏱ <strong>You start this one.</strong> The clock never starts itself — tap <strong>▶️ START</strong> and you
          get <strong>{LEAD_SEC}s</strong> to get into position. Stopping it takes <strong>{STOP_LAG_SEC}s</strong> off
          what gets logged, for the unwind and the reach, so the bell rings {STOP_LAG_SEC}s late on purpose: when it
          goes, the {ex.kind === 'cardio' ? 'minutes' : 'seconds'} asked for are already banked.
        </div>
      )}

      {ex.loadPerSide && (
        <div className="gym-banner">
          ⚖️ <strong>One dumbbell each side.</strong> The weight you type is what goes on <em>one</em> of them
          {ex.plan.weight ? ` — ${ex.plan.weight} means ${ex.plan.weight} a side, ${ex.plan.weight * 2} across you` : ''}.
        </div>
      )}

      {ex.ladderTest && (
        <div className="gym-banner">
          🏁 <strong>Max test.</strong> One all-out set — as many as you can. Your whole ladder is rebuilt from this number.
        </div>
      )}

      {ex.how && <p className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.4 }}>{ex.how}</p>}
      {/* the words say how to do it; the figure says where you should feel it */}
      <MuscleMap parts={ex.parts} />
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
              : progressesOnReps(ex)
                ? '. Hit the number on every set and next session asks for one rep more.'
                : ex.loadKind === 'band'
                  ? `. Finish the last set at ${ex.repRange[1]} and next session asks for the next band up.`
                  : `. Finish the last set at ${ex.repRange[1]} and next session is a notch heavier${
                      isRamped(ex) ? ' — the whole ramp moves with it' : ''
                    }.`}
        </p>
      )}
      {topped && (
        <div className="gym-banner">
          🎓 <strong>Topped out on reps.</strong> This is as far as the rep ladder goes for this movement — the next
          step is load (a vest, a belt, a dumbbell between the feet) or a harder variation.
        </div>
      )}

      {/* the ramp is the warm-up (§18e), so it has to be legible while you are
          standing at the rack deciding what to pick up */}
      {isRamped(ex) && ex.plan.weights && (
        <p style={{ fontSize: 13, marginTop: 6, fontWeight: 800 }}>
          🪜 Ramp: {ex.plan.weights.join(' → ')} — set {ex.plan.weights.length} is the working set, the ones before it
          are the warm-up.
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
 * That side counts DOWN to it (§18c-1c): the number is already decided, so the
 * only thing worth showing is how much of it is left. Past zero it turns around
 * and counts the overtime up.
 *
 * The big number is the wall clock, because that is what a clock is. What gets
 * LOGGED is `lag` seconds less (§18c-1e), so the line underneath says that
 * number out loud and the bell waits for it — hold a 30 s plank and the bell
 * rings at 0:40, when 0:30 is actually in the bank.
 */
function WorkClock({
  startedAt,
  target,
  kind,
  side,
  banked,
  open,
  lag = 0,
}: {
  startedAt: number
  target: number
  kind: SessionExercise['kind']
  side?: 'first' | 'second'
  banked?: number
  /** An open hold: no target, no bell, no bar to fill. You stop when you stop. */
  open?: boolean
  /** Seconds that come off when you stop it — the reach for the phone. */
  lag?: number
}) {
  const targetSec = kind === 'cardio' ? target * 60 : target
  const [now, setNow] = useState(Date.now())
  const rang = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [])

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  /** What stopping right now would log. */
  const bank = Math.max(0, elapsed - lag)
  useEffect(() => {
    if (open) return
    if (bank >= targetSec && !rang.current) {
      rang.current = true
      gymSfx.go()
    }
  }, [bank, targetSec, open])

  const hit = !open && bank >= targetSec
  const pct = open ? 1 : Math.min(1, targetSec > 0 ? bank / targetSec : 1)
  const lagNote = lag > 0 ? ` · banks ${mmss(bank)} (−${lag}s when you stop)` : ''

  /**
   * THE SECOND SIDE COUNTS DOWN (§18c-1c). The first side asked a question you
   * cannot answer — "how long have I been here?" is not something you know with
   * your face on a mat — but the second side does not ask it: the number is
   * already set, and the only thing you want from the screen is how much of it
   * is left. So the big digits run down to the first side's time and the bell
   * rings at zero. It counts the BANKED seconds, like everything else here, so
   * zero is the moment the two sides are genuinely equal.
   *
   * Past zero it turns around and counts the overtime up, because holding
   * longer than the first side is allowed and still gets logged.
   */
  const down = !open && side === 'second' && banked != null
  const left = Math.max(0, targetSec - bank)
  const big = down ? (hit ? `+${mmss(bank - targetSec)}` : mmss(left)) : mmss(elapsed)

  return (
    <div className="gym-clock">
      {side && (
        <div className="muted" style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.4 }}>
          ↔️ {side === 'first' ? 'FIRST SIDE' : 'SECOND SIDE'}
        </div>
      )}
      <div className={`gym-clock-time ${hit ? 'over' : ''}`}>{big}</div>
      <div className="gym-clock-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
        {open
          ? `⏳ no target — hold until you cannot, and the other side has to match it${lagNote}`
          : down
            ? hit
              ? `matched the ${mmss(banked!)} you did on the first side — every extra second counts`
              : `counting down to the ${mmss(targetSec)} you held on the first side${lagNote}`
            : hit
              ? `past the ${mmss(targetSec)} asked for — every extra second counts`
              : `target ${mmss(targetSec)}${lagNote}`}
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

      {session.finishedBy === 'watch' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 900, fontSize: 14 }}>⌚ You ended this one on your watch.</p>
          <p className="muted" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.45 }}>
            Everything below was worked out here just now — the Berries are paid and the ladders have moved. The stars
            are still yours to give, and still optional.
          </p>
        </div>
      )}

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
  loadKind,
  perSide,
  fixed,
}: {
  unit: 'lb' | 'kg'
  value: number | undefined
  planned: number | undefined
  onChange: (n: number) => void
  loadKind?: LoadKind
  /** Two dumbbells, one movement: the number asked for is what goes on EACH. */
  perSide?: boolean
  /** The gear weighs what it weighs (§18x) — there is nothing to dial. */
  fixed?: number
}) {
  // a band is not a number you dial, it is one of four things on the hook
  if (loadKind === 'band') return <BandPicker unit={unit} value={value} planned={planned} onChange={onChange} />
  // neither is a kettlebell: ± on the dumbbell's notches would offer 42 and 48.5
  // of a thing that is 46, which is how 46 came to be logged as 35.5
  if (fixed != null)
    return (
      <div className="gym-stepper" style={{ flex: '1 0 100%' }}>
        <label>weight ({unit})</label>
        <div className="gym-fixed-load">
          🏋 {fixed} {unit}
        </div>
        <span className="gym-stepper-hint">the gear weighs what it weighs — nothing to set</span>
      </div>
    )
  return (
    <Stepper
      label={perSide ? `weight per side (${unit})` : `weight (${unit})`}
      value={value ?? 0}
      step={2.5}
      min={0}
      // + and − walk the dumbbell's real notches, not arithmetic
      notches={loadSteps(unit)}
      onChange={onChange}
      hint={
        planned != null
          ? `asked for ${planned}${perSide ? ` on each side (${planned * 2} total)` : ''}`
          : perSide
            ? 'first time — set ONE dumbbell'
            : 'first time — set it'
      }
    />
  )
}

/**
 * The bands, as four colours you tap.
 *
 * A stepper is the wrong control for them: nothing is printed on the rubber,
 * the pounds on the packet are the vendor's maximum, and all four are 3 mm
 * rather than the usual 4.5 — so "35 lb" is a fiction and "the red one" is the
 * truth. You pick the colour, the pounds ride underneath for scale, and when
 * the one you were given is too light or too heavy you tap the next one along.
 * What gets logged is still the number, so every ladder, record and grade in
 * the app keeps reading exactly what it read before.
 */
function BandPicker({
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
  const chosen = bandFor(value, unit)
  const asked = bandFor(planned, unit)
  return (
    <div className="gym-stepper" style={{ flex: '1 0 100%' }}>
      <label>band</label>
      <div className="gym-band-row">
        {BANDS.map((b) => {
          const load = unit === 'kg' ? b.kg : b.lb
          return (
            <button
              key={b.color}
              className={`gym-band ${chosen?.color === b.color ? 'on' : ''}`}
              style={{ '--band': b.css } as CSSProperties}
              onClick={() => {
                sfx.click()
                onChange(load)
              }}
            >
              <span className="gym-band-dot" />
              <span className="gym-band-name">{b.color}</span>
              <span className="gym-band-lb">
                {load} {unit}
              </span>
            </button>
          )
        })}
      </div>
      <span className="gym-stepper-hint">
        {asked ? `asked for the ${asked.color.toLowerCase()} one` : 'first time — pick one'}
      </span>
    </div>
  )
}

/** What a logged load says on a 44px pill: the colour for a band, the number otherwise. */
function loadChip(w: number, unit: 'lb' | 'kg', loadKind: LoadKind | undefined): string {
  return (loadKind === 'band' ? bandFor(w, unit)?.color.toLowerCase() : undefined) ?? String(w)
}

function repLabel(e: SessionExercise): string {
  const unit = e.kind === 'timed' ? 'seconds' : e.kind === 'cardio' ? 'minutes' : 'reps'
  // one limb at a time: the number is what each side gets, so say so — otherwise
  // "2 × 15" reads as the whole job when it is really half of it
  return e.perSide ? `${unit} per side` : unit
}

/** "3 × 5" when every set is the same, "5 · 5 · 4" when they are not. */
function repAsk(e: SessionExercise): string {
  return new Set(e.plan.reps).size === 1 ? `${e.plan.reps.length} × ${e.plan.reps[0]}` : e.plan.reps.join(' · ')
}

function planLine(e: SessionExercise, unit: 'lb' | 'kg', opts: { load?: boolean } = {}): string {
  const withLoad = opts.load !== false
  const bits: string[] = []
  if (e.ladderTest) bits.push('1 all-out set')
  else if (e.repRange) {
    // a block session prescribes a RANGE: the low end has to be there, the top
    // is what you chase, and hitting it everywhere is what buys you more weight
    // — or, on a rep ladder (§18d), one more rep. Once the ladder has climbed
    // off the floor the ASK is the news: "5 · 5 · 4", not "3 × 4–8".
    const [lo, hi] = e.repRange
    bits.push(
      e.plan.reps.some((r) => r > lo)
        ? `${repAsk(e)} ${repLabel(e)} (range ${lo}–${hi})`
        : `${e.plan.reps.length} × ${lo}–${hi} ${repLabel(e)}`,
    )
  } else bits.push(`${repAsk(e)} ${repLabel(e)}`)
  // a ramp is two numbers: where it starts and where it ends up
  if (!withLoad) {
    /* the NextLoad card is saying it, bigger */
  } else if (isRamped(e) && e.plan.weights) bits.push(`${e.plan.weights[0]} → ${e.plan.weight} ${unit}`)
  else if (e.plan.weight) bits.push(loadLabel(e.plan.weight, unit, e.loadKind, e.loadPerSide))
  bits.push(`rest ${e.plan.restSec}s`)
  return bits.join(' · ')
}
