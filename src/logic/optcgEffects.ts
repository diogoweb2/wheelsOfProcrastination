// Card text, one card at a time.
//
// The engine (logic/optcg.ts) knows the turn, the battle and the keywords every
// card shares — [Blocker], [Rush], [Double Attack], [Banish], Counter values.
// It deliberately knows nothing about what any particular card DOES. That lives
// here: a table keyed by printed card code.
//
// This is meant to grow. Today it covers the two starter decks in
// logic/optcgDecks.ts; adding the next deck is a handful of entries below and
// nothing else — no engine change, no UI change. A card with no entry is still
// perfectly playable: the board shows its text and the players honour it, the
// way a table does with a card whose ruling nobody has memorised.
import {
  card,
  other,
  unit,
  type OptcgPlayer,
  type OptcgSide,
  type OptcgState,
  registerStatics,
  FIELD_LIMIT,
} from './optcg'

/** What the player has to pick before an effect can run. */
export type OptcgTarget =
  | 'none'
  /** Your Leader or one of your Characters. */
  | 'ownAny'
  | 'ownChar'
  /** One of the opponent's Characters — `foeRested` only the rested ones. */
  | 'foeChar'
  | 'foeRested'

export type OptcgTiming =
  /** Resolves the moment the card is played from hand. */
  | 'onPlay'
  /** [Activate: Main] — a button on a card already on the field. */
  | 'activate'
  /** [When Attacking] — fires as the attack is declared. */
  | 'attack'
  /** [Main] event, played from hand during your Main phase. */
  | 'main'
  /** [Counter] event, played from hand while defending. */
  | 'counter'

export interface OptcgEffect {
  timing: OptcgTiming
  /** Shown on the button / prompt. */
  label: string
  target: OptcgTarget
  /** Rested DON!! this costs on top of the card's own cost. */
  donCost?: number
  /** The card rests itself to pay. */
  restSelf?: boolean
  oncePerTurn?: boolean
  /** Narrower than `target` when the text says so (e.g. "cost 3 or less"). */
  allow?: (s: OptcgState, side: OptcgSide, ref: string) => boolean
  /** Mutates `s` in place — the caller has already cloned it. */
  run: (s: OptcgState, side: OptcgSide, self: string, ref: string) => void
}

/** Static, always-on power text. Returns the bonus for `ref` on that side. */
export type OptcgStatic = (p: OptcgPlayer, ref: string) => number

// --- helpers the entries lean on -------------------------------------------------

const me = (s: OptcgState, side: OptcgSide) => s[side]
const foe = (s: OptcgState, side: OptcgSide) => s[other(side)]

/** Give `ref` a power bonus for the rest of the turn. */
function buff(s: OptcgState, side: OptcgSide, ref: string, amount: number): void {
  const p = me(s, side)
  if (ref === 'leader') p.leaderBuff += amount
  else {
    const u = unit(p, ref)
    if (u) u.buff += amount
  }
}

/** Hand a rested DON!! to a Leader/Character — Red's whole trick (§7-3). */
function giveRestedDon(s: OptcgState, side: OptcgSide, ref: string, n: number): void {
  const p = me(s, side)
  const take = Math.min(n, p.donRested + p.donActive)
  let left = take
  const fromRested = Math.min(left, p.donRested)
  p.donRested -= fromRested
  left -= fromRested
  p.donActive -= left
  if (ref === 'leader') p.leaderDon += take
  else {
    const u = unit(p, ref)
    if (u) u.don += take
  }
}

function koFoe(s: OptcgState, side: OptcgSide, uid: string): void {
  const d = foe(s, side)
  const i = d.chars.findIndex((c) => c.uid === uid)
  if (i < 0) return
  const [ko] = d.chars.splice(i, 1)
  d.donActive += ko.don
  d.trash.push(ko.code)
}

const restFoe = (s: OptcgState, side: OptcgSide, uid: string): void => {
  const u = unit(foe(s, side), uid)
  if (u) u.rested = true
}

const costOfFoe = (s: OptcgState, side: OptcgSide, uid: string): number =>
  card(unit(foe(s, side), uid)?.code ?? '').cost

const powerOfFoe = (s: OptcgState, side: OptcgSide, uid: string): number => {
  const u = unit(foe(s, side), uid)
  return u ? card(u.code).power + u.don * 1000 + u.buff : 0
}

// --- the table -------------------------------------------------------------------
//
// ST-01 (Straw Hat Crew, Red) and ST-02 (Worst Generation, Green) — the two
// decks the game ships knowing how to play by itself.

export const OPTCG_EFFECTS: Record<string, OptcgEffect[]> = {
  // — ST-01 —
  'ST01-001': [
    {
      timing: 'activate',
      label: 'Give 1 rested DON!!',
      target: 'ownAny',
      oncePerTurn: true,
      run: (s, side, _self, ref) => giveRestedDon(s, side, ref, 1),
    },
  ],
  'ST01-007': [
    {
      timing: 'activate',
      label: 'Give 1 rested DON!!',
      target: 'ownAny',
      oncePerTurn: true,
      run: (s, side, _self, ref) => giveRestedDon(s, side, ref, 1),
    },
  ],
  'ST01-011': [
    {
      timing: 'onPlay',
      label: 'Give 2 rested DON!!',
      target: 'ownAny',
      run: (s, side, _self, ref) => giveRestedDon(s, side, ref, 2),
    },
  ],
  'ST01-005': [
    {
      timing: 'attack',
      label: '+1000 power to another card',
      target: 'ownAny',
      allow: (_s, _side, ref) => ref !== '',
      run: (s, side, _self, ref) => buff(s, side, ref, 1000),
    },
  ],
  'ST01-014': [
    { timing: 'counter', label: '+3000 power this battle', target: 'ownAny', run: (s, side, _self, ref) => buff(s, side, ref, 3000) },
  ],
  'ST01-015': [
    {
      timing: 'main',
      label: "K.O. a Character with 6000 power or less",
      target: 'foeChar',
      allow: (s, side, ref) => powerOfFoe(s, side, ref) <= 6000,
      run: (s, side, _self, ref) => koFoe(s, side, ref),
    },
  ],
  'ST01-016': [
    {
      timing: 'main',
      label: '+2000 power to a Straw Hat',
      target: 'ownAny',
      run: (s, side, _self, ref) => buff(s, side, ref, 2000),
    },
  ],
  'ST01-017': [
    {
      timing: 'activate',
      label: '+1000 power to a Straw Hat',
      target: 'ownAny',
      restSelf: true,
      run: (s, side, _self, ref) => buff(s, side, ref, 1000),
    },
  ],

  // — ST-02 —
  'ST02-001': [
    {
      timing: 'activate',
      label: '+1000 power to a Supernova (rest 3 DON!!)',
      target: 'ownAny',
      donCost: 3,
      oncePerTurn: true,
      run: (s, side, _self, ref) => buff(s, side, ref, 1000),
    },
  ],
  'ST02-005': [
    {
      timing: 'onPlay',
      label: "K.O. a rested Character costing 3 or less",
      target: 'foeRested',
      allow: (s, side, ref) => costOfFoe(s, side, ref) <= 3,
      run: (s, side, _self, ref) => koFoe(s, side, ref),
    },
  ],
  'ST02-007': [
    {
      timing: 'activate',
      label: 'Dig 5 for a Supernova',
      target: 'none',
      donCost: 1,
      restSelf: true,
      run: (s, side) => {
        const p = me(s, side)
        const look = p.deck.splice(0, 5)
        const i = look.findIndex((code) => card(code).types.includes('Supernovas'))
        if (i >= 0) p.hand.push(...look.splice(i, 1))
        p.deck.push(...look) // the rest go to the bottom, in any order
      },
    },
  ],
  'ST02-008': [
    {
      timing: 'attack',
      label: "Rest 1 of your opponent's DON!!",
      target: 'none',
      run: (s, side) => {
        const d = foe(s, side)
        if (d.donActive > 0) { d.donActive--; d.donRested++ }
      },
    },
  ],
  'ST02-009': [
    {
      timing: 'onPlay',
      label: 'Set a rested Supernova/Heart Pirate active',
      target: 'ownChar',
      allow: (s, side, ref) => {
        const u = unit(me(s, side), ref)
        if (!u || !u.rested) return false
        const t = card(u.code).types
        return t.includes('Supernovas') || t.includes('Heart Pirates')
      },
      run: (s, side, _self, ref) => {
        const u = unit(me(s, side), ref)
        if (u) u.rested = false
      },
    },
  ],
  'ST02-015': [
    { timing: 'counter', label: '+2000 power this battle', target: 'ownAny', run: (s, side, _self, ref) => buff(s, side, ref, 2000) },
  ],
  'ST02-016': [
    { timing: 'counter', label: '+4000 power this battle', target: 'ownAny', run: (s, side, _self, ref) => buff(s, side, ref, 4000) },
  ],
  'ST02-017': [
    { timing: 'main', label: "Rest 1 of your opponent's Characters", target: 'foeChar', run: (s, side, _self, ref) => restFoe(s, side, ref) },
  ],
}

/**
 * Always-on power text. Read on every power calculation, so it stays cheap and
 * never mutates anything.
 */
const OPTCG_STATICS: Record<string, (p: OptcgPlayer, ref: string) => number> = {
  // [DON!! x1] This Character gains +1000 power.
  'ST01-013': (p, ref) => (unit(p, ref)?.don ?? 0) >= 1 ? 1000 : 0,
  // [DON!! x1] If you have 3 or more Characters, this card gains +2000 power.
  'ST02-003': (p, ref) => ((unit(p, ref)?.don ?? 0) >= 1 && p.chars.length >= 3 ? 2000 : 0),
  // [DON!! x1] [Your Turn] All of your Characters gain +1000 power. (OP01-001 Zoro)
  'OP01-001': () => 0,
}

registerStatics((p, ref) => {
  const code = ref === 'leader' ? p.leader : unit(p, ref)?.code
  if (!code) return 0
  return OPTCG_STATICS[code]?.(p, ref) ?? 0
})

// --- what the UI asks --------------------------------------------------------------

export const effectsOf = (code: string, timing: OptcgTiming): OptcgEffect[] =>
  (OPTCG_EFFECTS[code] ?? []).filter((e) => e.timing === timing)

/** Does this code have any scripted text at all? Drives the "manual" badge. */
export const isScripted = (code: string): boolean =>
  (OPTCG_EFFECTS[code] ?? []).length > 0 || code in OPTCG_STATICS

/** Legal picks for an effect, as refs (`'leader'` or a uid). */
export function targetsOf(s: OptcgState, side: OptcgSide, e: OptcgEffect): string[] {
  const mine = me(s, side)
  const theirs = foe(s, side)
  let refs: string[] = []
  if (e.target === 'ownAny') refs = ['leader', ...mine.chars.map((c) => c.uid)]
  else if (e.target === 'ownChar') refs = mine.chars.map((c) => c.uid)
  else if (e.target === 'foeChar') refs = theirs.chars.map((c) => c.uid)
  else if (e.target === 'foeRested') refs = theirs.chars.filter((c) => c.rested).map((c) => c.uid)
  return e.allow ? refs.filter((r) => e.allow?.(s, side, r)) : refs
}

/** Can this [Activate: Main] be pressed right now? */
export function canActivate(s: OptcgState, side: OptcgSide, uid: string, e: OptcgEffect): boolean {
  if (s.phase !== 'main' || s.turn !== side || s.over) return false
  const p = me(s, side)
  const u = uid === 'leader' ? null : unit(p, uid)
  if (uid !== 'leader' && !u) return false
  const used = uid === 'leader' ? p.leaderUsed : (u as { used: string[] }).used
  if (e.oncePerTurn && used.includes(e.label)) return false
  if (e.restSelf && (uid === 'leader' ? p.leaderRested : u?.rested)) return false
  if ((e.donCost ?? 0) > p.donActive) return false
  if (e.target !== 'none' && targetsOf(s, side, e).length === 0) return false
  return true
}

/**
 * Run an effect. The caller owns cloning (every engine action returns a fresh
 * state), so this takes an already-cloned state and mutates it.
 */
export function runEffect(s: OptcgState, side: OptcgSide, self: string, e: OptcgEffect, ref: string): void {
  const p = me(s, side)
  if (e.donCost) { p.donActive -= e.donCost; p.donRested += e.donCost }
  if (e.restSelf) {
    if (self === 'leader') p.leaderRested = true
    else { const u = unit(p, self); if (u) u.rested = true }
  }
  if (e.oncePerTurn) {
    if (self === 'leader') p.leaderUsed.push(e.label)
    else unit(p, self)?.used.push(e.label)
  }
  e.run(s, side, self, ref)
  s.log = [...s.log.slice(-40), { by: side, text: `${p.name}: ${e.label}.` }]
  s.seq++
}

/** Room on the field, for effects that put a Character into play. */
export const hasRoom = (p: OptcgPlayer): boolean => p.chars.length < FIELD_LIMIT
