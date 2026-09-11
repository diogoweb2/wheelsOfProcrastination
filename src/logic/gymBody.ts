// 🩹 Recovery — how rested each muscle group is, right now.
//
// The planner has always known this (it is what stops it giving you chest two
// days running), but it kept the number to itself. This exposes the same model,
// and it is the same model: `partRecovery` and the planner's `partFatigue` read
// the identical effort rows, so the map and your next session cannot disagree.
//
// TIME AND DOSE, not time alone (§18t). It used to be time alone, and that was
// the lie: one set of curls and twenty were the same hit, and the 0.15 share of
// a push-up that lands on the core put the core in the red for a day.
//
// Now every session hands each part a dose in effort units, and that dose sets
// BOTH how long the hole takes to fill and HOW DEEP IT IS. Depth is the half
// that matters for the colour: scaling only the window still let a 0.3-unit
// brush paint a part the same red a real session earns, just for fewer hours.
// A part can only be driven as far down as the work actually put it, so red
// means "you genuinely trained this" — which is the only thing it ever meant
// to say. A part is as tired as whichever outstanding hit leaves it most tired
// right now, which is not always the most recent one.
import type { BodyPart, GymState } from '../types'
import { RECOVERY_HOURS } from './gym'
import { doseFactor, effortRows, hitFatigue } from './gymEffort'

/** One muscle group's state, ready to draw. */
export interface PartRecovery {
  part: BodyPart
  /** 0 = worked minutes ago, 1 = fully recovered. */
  pct: number
  /** Hours since it was last worked. `Infinity` = never, or long enough ago not to matter. */
  since: number
  /** Hours until it is fully recovered. 0 once it is. */
  left: number
  /** What this part wants after the work it actually got, in hours. */
  need: number
  /** Effort units the hit that is driving this dropped on the part (§18t). */
  dose: number
  /** What the part would want after a full session's work on it — `need` before the dose scaled it. */
  fullNeed: number
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
 * Every hit the log has landed on a body part, newest first, as
 * `{ hours ago, dose in effort units }`.
 *
 * Doses land per SESSION rather than per exercise: a split squat and a side
 * plank in the same workout both reach the core, and what the core actually
 * took is the two of them added together, not two separate light touches.
 *
 * A session still in progress counts from RIGHT NOW — the map should go red
 * while you are still on the bench, not politely wait for you to press Finish.
 */
function hits(gym: GymState, now: number): Map<BodyPart, { hours: number; dose: number }[]> {
  const perSession = new Map<number, Partial<Record<BodyPart, number>>>()
  for (const r of effortRows(gym.sessions, { live: gym.active, now })) {
    const bucket = perSession.get(r.at) ?? {}
    for (const [part, units] of Object.entries(r.mix)) bucket[part as BodyPart] = (bucket[part as BodyPart] ?? 0) + units
    perSession.set(r.at, bucket)
  }

  const out = new Map<BodyPart, { hours: number; dose: number }[]>()
  for (const [at, bucket] of perSession) {
    const hours = Math.max(0, (now - at) / 3_600_000)
    for (const [part, dose] of Object.entries(bucket)) {
      if (!dose || dose <= 0) continue
      const list = out.get(part as BodyPart) ?? []
      list.push({ hours, dose })
      out.set(part as BodyPart, list)
    }
  }
  return out
}

/**
 * Every body part, worst-recovered first. Parts never trained come back fully
 * rested — which is also how a piece of new gear talks the planner into using
 * the exercises that need it.
 */
export function partRecovery(gym: GymState, now = Date.now()): PartRecovery[] {
  const all = hits(gym, now)
  return (Object.keys(RECOVERY_HOURS) as BodyPart[])
    .map((part) => {
      const fullNeed = RECOVERY_HOURS[part]
      // The hit still holding this part back is the one leaving it MOST tired
      // right now — not the most recent, and not the biggest. A heavy session
      // three days ago can still outweigh a brush this morning, and should.
      const list = all.get(part) ?? []
      // "when did I last touch this at all" is a separate question from "what is
      // still holding it back", and the panel asks both. A part brushed by a
      // one-arm row this morning is fully recovered AND was worked today; saying
      // "never trained" there would be a plain lie.
      const touched = list.reduce((best, h) => Math.min(best, h.hours), Infinity)
      let worst: PartRecovery = { part, pct: 1, since: touched, left: 0, need: fullNeed, dose: 0, fullNeed }
      let deepest = 0
      for (const h of list) {
        const fatigue = hitFatigue(h.dose, h.hours, fullNeed)
        if (fatigue <= deepest) continue
        deepest = fatigue
        const need = fullNeed * doseFactor(h.dose)
        worst = { part, pct: 1 - fatigue, since: h.hours, left: Math.max(0, need - h.hours), need, dose: h.dose, fullNeed }
      }
      return worst
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
