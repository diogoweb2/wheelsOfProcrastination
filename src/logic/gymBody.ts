// 🩹 Recovery — how rested each muscle group is, right now.
//
// The planner has always known this (it is what stops it giving you chest two
// days running), but it kept the number to itself. This exposes the same model:
// hours since a body part was last worked, against the hours that part wants.
//
// One honest limitation, stated rather than hidden: this is TIME-based, not
// volume-based. One set of curls and twenty are the same hit. It is what the
// planner scores on, so the map and the plan can never disagree — and "how long
// ago" is the number that actually drives whether you should train it today.
import type { BodyPart, GymState } from '../types'
import { RECOVERY_HOURS } from './gym'
import { parseDay } from './dates'

/** One muscle group's state, ready to draw. */
export interface PartRecovery {
  part: BodyPart
  /** 0 = worked minutes ago, 1 = fully recovered. */
  pct: number
  /** Hours since it was last worked. `Infinity` = never, or long enough ago not to matter. */
  since: number
  /** Hours until it is fully recovered. 0 once it is. */
  left: number
  /** What this part wants, in hours. */
  need: number
}

/** The four states a muscle can be in, worst first. Drives the colour on the map. */
export type Tone = 'fresh' | 'sore' | 'coming' | 'ready'

export const TONE_COLOR: Record<Tone, string> = {
  fresh: '#d70000', // worked within the last third of its recovery window
  sore: '#ff9600',
  coming: '#ffce00',
  ready: '#2ecc71', // the one real green in the palette — "go"
}

export const TONE_LABEL: Record<Tone, string> = {
  fresh: 'Just worked',
  sore: 'Still recovering',
  coming: 'Nearly there',
  ready: 'Ready to train',
}

export function toneFor(pct: number): Tone {
  if (pct >= 1) return 'ready'
  if (pct >= 0.75) return 'coming'
  if (pct >= 0.4) return 'sore'
  return 'fresh'
}

/**
 * Hours since each body part was last worked. A session still in progress counts
 * from RIGHT NOW — the map should go red while you are still on the bench, not
 * politely wait for you to press Finish.
 */
function hoursSince(gym: GymState, now: number): Record<string, number> {
  const out: Record<string, number> = {}
  const mark = (parts: BodyPart[], at: number) => {
    const h = Math.max(0, (now - at) / 3_600_000)
    for (const p of parts) out[p] = Math.min(out[p] ?? Infinity, h)
  }
  for (const s of gym.sessions) {
    const at = s.finishedAt ? Date.parse(s.finishedAt) : parseDay(s.day).getTime()
    if (!Number.isFinite(at)) continue
    for (const e of s.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      mark(e.parts, at)
    }
  }
  const live = gym.active
  if (live && live.status !== 'preview') {
    for (const e of live.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      mark(e.parts, now)
    }
  }
  return out
}

/** Every body part, worst-recovered first. Parts never trained come back fully rested. */
export function partRecovery(gym: GymState, now = Date.now()): PartRecovery[] {
  const since = hoursSince(gym, now)
  return (Object.keys(RECOVERY_HOURS) as BodyPart[])
    .map((part) => {
      const need = RECOVERY_HOURS[part]
      const h = since[part] ?? Infinity
      const pct = Number.isFinite(h) ? Math.max(0, Math.min(1, h / need)) : 1
      return { part, pct, since: h, left: Math.max(0, need - (Number.isFinite(h) ? h : need)), need }
    })
    .sort((a, b) => a.pct - b.pct)
}

/** "3h" / "1d 4h" — how long until it is yours again. */
export function readyIn(hours: number): string {
  if (hours <= 0) return 'now'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 24) return `${Math.round(hours)}h`
  const d = Math.floor(hours / 24)
  const h = Math.round(hours - d * 24)
  return h ? `${d}d ${h}h` : `${d}d`
}
