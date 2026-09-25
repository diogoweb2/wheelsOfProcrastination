// Where you are in a running session — §18aa.
//
// The Pixel Watch is not a remote control for the phone. It is a second client
// of the same Firestore document, exactly like a second browser tab, and the
// phone does not have to be awake for it to work. That only holds if BOTH
// devices can answer "where am I in this session?" from the synced data alone,
// with no screen-local state to ask for.
//
// They can, and this module is the proof: everything the runner shows —
// which exercise, which set, what weight, how many reps, what angle the bench
// goes to — is a pure function of `gym.active`, because a logged set is the
// only record of progress that has ever existed. The React runner held these
// as `useState` and recomputed them on a refresh; now they are written down
// once, here, so the Kotlin on the watch has something to mirror rather than
// something to reinvent.
//
// The single exception is rest. "Resting until 14:32:05" cannot be derived from
// the sets, so it is stored on the session (`restUntil`) as a wall-clock
// instant rather than a countdown — a device arriving mid-rest computes the
// same number as the one that started it, and neither has to be told.
import type { GymSession, SessionDriver, SessionExercise } from '../types'
import { isRamped, plannedWeight } from './gym'

/**
 * How long a driver's heartbeat stays good. Past this the session is up for
 * grabs — a watch that ran out of battery mid-set must not lock the phone out
 * of its own workout for the rest of the evening.
 */
export const DRIVER_STALE_MS = 90_000

/** How often the driving device refreshes its heartbeat. Comfortably inside the staleness window. */
export const DRIVER_BEAT_MS = 30_000

/** Where the runner is, derived entirely from what has been logged. */
export interface LivePosition {
  /** Index into `session.exercises`, clamped. -1 when there is nothing left to do. */
  idx: number
  exercise: SessionExercise | undefined
  /** Which set is next, 0-based: exactly how many are already logged. */
  setNo: number
  /** The reps this set asks for — the low end of the range, which is what has to be there. */
  reps: number
  /** The load to put in front of you, or undefined for an unloaded move. */
  weight: number | undefined
  /** Bench angle in degrees, when this movement has one. */
  benchAngle: number | undefined
  /** Seconds of rest this exercise prescribes between sets. */
  restSec: number
  /** True when every exercise is finished or skipped: the session is ready to close. */
  done: boolean
}

/**
 * The first exercise that still owes sets — the same rule the React runner
 * lands on after a refresh, and now the only place it is written down.
 */
export function livePosition(session: GymSession): LivePosition {
  const list = session.exercises
  const found = list.findIndex((e) => !e.skipped && e.sets.length < e.plan.reps.length)
  const done = found === -1
  const idx = done ? Math.max(0, list.length - 1) : found
  const exercise = list[idx] as SessionExercise | undefined
  const setNo = exercise ? exercise.sets.length : 0
  const reps = exercise?.plan.reps[Math.min(setNo, exercise.plan.reps.length - 1)] ?? 10

  // What you actually lifted last set beats what was planned: bump the bar up
  // once and every set after it starts there. A RAMP is the exception — it
  // prescribes a weight per set on purpose (§18e), and carrying the light one
  // forward would flatten the climb it exists to make.
  const planned = exercise ? plannedWeight(exercise, setNo) : undefined
  const lastLogged = exercise?.sets.length ? exercise.sets[exercise.sets.length - 1].weight : undefined
  const weight = exercise && isRamped(exercise) ? planned : (lastLogged ?? planned)

  return {
    idx,
    exercise,
    setNo,
    reps,
    weight,
    benchAngle: exercise?.benchAngle,
    restSec: exercise?.plan.restSec ?? 60,
    done,
  }
}

/** Seconds of rest still to run, or null when this session is not resting. */
export function restLeftSec(session: GymSession, now: number = Date.now()): number | null {
  if (!session.restUntil) return null
  const left = Math.round((Date.parse(session.restUntil) - now) / 1000)
  return Number.isFinite(left) ? left : null
}

/** A driver that is still beating. A stale one is treated as gone. */
export function liveDriver(session: GymSession | null | undefined, now: number = Date.now()): SessionDriver | null {
  const d = session?.driver
  if (!d?.at) return null
  return now - Date.parse(d.at) < DRIVER_STALE_MS ? d : null
}

/**
 * May THIS device write to the session?
 *
 * Yes when nobody is driving, or when the live driver is us. A device that
 * merely disagrees is not blocked out for ever — `DRIVER_STALE_MS` of silence
 * hands the session back.
 */
export function canDrive(session: GymSession | null | undefined, id: string, now: number = Date.now()): boolean {
  const d = liveDriver(session, now)
  return !d || d.id === id
}

/**
 * This install's driver id: stable across reloads, different per device, and
 * meaningless anywhere else. Not the profile — two browsers logged in as Diogo
 * are two devices, and that is exactly the case this exists to tell apart.
 */
export function deviceId(): string {
  const KEY = 'wop.deviceId'
  try {
    const seen = localStorage.getItem(KEY)
    if (seen) return seen
    const made = crypto.randomUUID()
    localStorage.setItem(KEY, made)
    return made
  } catch {
    // private mode, blocked storage: a per-tab id still tells two devices apart
    // for as long as the tab lives, which is as long as a session lasts.
    return 'ephemeral-' + Math.random().toString(36).slice(2)
  }
}
