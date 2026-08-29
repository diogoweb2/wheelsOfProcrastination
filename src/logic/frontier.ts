// 🐦 Shangri-La Frontier (§22) — the boss-rush engine.
//
// A single-player, top-down action RPG in the spirit of the show: a thirty-
// million-player VRMMO where the monsters are cleverer than you and the stat
// sheet will not save you. Everything here follows from one pillar:
//
//   **spacing and reflexes beat numbers.**
//
// So: no lock-on (you swing where you FACE), stamina on every action, a dodge
// with real invincibility frames, telegraphs you are meant to READ rather than
// react to, weapons that break, and monsters that LEARN what you keep doing and
// stop falling for it.
//
// The engine is pure state + a fixed step, exactly like the football one
// (logic/opsoccer.ts): `step()` owns the game, React owns nothing, and the
// canvas only ever draws what the last step produced. Every timer is in SECONDS
// and advanced by `dt`, so a 120 Hz phone plays the same fight as a 60 Hz one.

import type { FrontierState } from '../types'

export interface Vec {
  x: number
  y: number
}

/** The arena is a circle. This is its radius, in arena units. */
export const ARENA = 34

// --- the build ---------------------------------------------------------------

/**
 * Armour goes on four parts, and a part Lycaon has scarred can never be covered
 * again — that curse is the whole reason the slots are named at all.
 */
export type BodyPart = 'head' | 'body' | 'arms' | 'legs'
export const PARTS: BodyPart[] = ['head', 'body', 'arms', 'legs']
export const PART_NAMES: Record<BodyPart, string> = {
  head: 'Head',
  body: 'Body',
  arms: 'Arms',
  legs: 'Legs',
}

export interface WeaponDef {
  id: string
  name: string
  emoji: string
  what: string
  /** Damage of one light swing at +0. */
  dmg: number
  /** How far the arc reaches, in arena units. */
  reach: number
  /** How wide the arc is, in degrees either side of where you face. */
  arc: number
  /** Multiplies every swing timer — over 1 is a slower weapon. */
  wind: number
  /** Extra crit chance, in points. */
  crit: number
  /** Swings before it breaks. */
  dur: number
  /** What a charged heavy multiplies the light damage by. */
  heavy: number
  /** Stamina one light swing costs. */
  stam: number
  /** The boss you have to beat before the smith will make it. */
  needs?: string
  /** What it costs to forge, once unlocked. */
  cost?: Partial<Record<string, number>>
}

/**
 * Four weapons, and they are four different games. The Twin Fangs are the
 * Sunraku build in one object: almost no reach, almost no damage per swing, and
 * a swing rate that turns a read into a punish.
 */
export const WEAPONS: WeaponDef[] = [
  {
    id: 'starter',
    name: 'Beginner’s Blade',
    emoji: '🗡️',
    what: 'The sword everyone starts with. Nothing it does is wrong; nothing it does is special.',
    dmg: 11,
    reach: 8,
    arc: 55,
    wind: 1,
    crit: 0,
    dur: 260,
    heavy: 2.4,
    stam: 11,
  },
  {
    id: 'fangs',
    name: 'Twin Fangs',
    emoji: '🔪',
    what: 'Two knives. Half the reach, half the damage, twice the swings — and it crits like nothing else. The reckless build.',
    dmg: 7,
    reach: 6,
    arc: 45,
    wind: 0.62,
    crit: 14,
    dur: 200,
    heavy: 2.1,
    stam: 7,
  },
  {
    id: 'splitter',
    name: 'Tomb-Splitter',
    emoji: '🪓',
    what: 'A slab of a thing. It swings like a door closing, and it staggers anything it lands on.',
    dmg: 22,
    reach: 9,
    arc: 80,
    wind: 1.55,
    crit: -4,
    dur: 340,
    heavy: 2.8,
    stam: 20,
  },
  {
    id: 'nightfang',
    name: 'Nightslayer Fang',
    emoji: '🌙',
    what: 'Forged out of the wolf. Long, fast and mean, and it does not care what the moon is doing.',
    dmg: 16,
    reach: 9.5,
    arc: 62,
    wind: 0.85,
    crit: 8,
    dur: 300,
    heavy: 2.6,
    stam: 12,
    needs: 'lycaon',
    cost: { 'night-pelt': 3, 'hound-fang': 6 },
  },
  {
    id: 'tombedge',
    name: 'Tombguard Edge',
    emoji: '⚔️',
    what: 'Ancient machine steel with a lost-technology core. The best sword in the game, and it took a mechanical samurai to get it.',
    dmg: 20,
    reach: 10,
    arc: 70,
    wind: 0.9,
    crit: 10,
    dur: 400,
    heavy: 2.9,
    stam: 14,
    needs: 'wezaemon',
    cost: { 'tomb-alloy': 4, 'night-pelt': 2, 'vorpal-core': 1 },
  },
]

export const weaponById = (id: string | undefined | null): WeaponDef =>
  WEAPONS.find((w) => w.id === id) ?? WEAPONS[0]

export interface ArmourDef {
  id: string
  name: string
  emoji: string
  part: BodyPart
  /** Damage taken is divided by (100 + def) / 100. */
  def: number
  /** Slows you down and makes the dodge cost more. This is the whole trade. */
  weight: number
  what: string
  needs?: string
  cost?: Partial<Record<string, number>>
}

/**
 * Armour is a TAX, not a reward. Every piece buys you a few points of damage
 * reduction and sells you the one thing this game is actually about, which is
 * being somewhere else when the attack lands. Sunraku fights in his pants for a
 * reason, and the numbers here are set so that choice is genuinely playable.
 */
export const ARMOUR: ArmourDef[] = [
  { id: 'cap', name: 'Traveller’s Cap', emoji: '🧢', part: 'head', def: 6, weight: 1, what: 'Cloth. Barely there — which is the point.' },
  { id: 'helm', name: 'Iron Helm', emoji: '⛑️', part: 'head', def: 13, weight: 3, what: 'You will survive the bite. You will not see it coming.' },
  { id: 'vest', name: 'Padded Vest', emoji: '🎽', part: 'body', def: 9, weight: 2, what: 'Light padding, honest numbers.' },
  { id: 'plate', name: 'Tomb Plate', emoji: '🛡️', part: 'body', def: 22, weight: 6, what: 'Machine-steel scale off Wezaemon. Enormous, and it shows.', needs: 'wezaemon', cost: { 'tomb-alloy': 2 } },
  { id: 'wraps', name: 'Hand Wraps', emoji: '🧤', part: 'arms', def: 4, weight: 0.5, what: 'Almost free. Almost nothing.' },
  { id: 'bracers', name: 'Fang Bracers', emoji: '🦾', part: 'arms', def: 12, weight: 3, what: 'Wolf bone over the forearms. Good against a bite.', needs: 'lycaon', cost: { 'night-pelt': 1, 'hound-fang': 3 } },
  { id: 'boots', name: 'Runner’s Boots', emoji: '👟', part: 'legs', def: 4, weight: 0.5, what: 'They give you nothing and take nothing. Sunraku approves.' },
  { id: 'greaves', name: 'Iron Greaves', emoji: '🥾', part: 'legs', def: 12, weight: 4, what: 'Heavy legs. Heavy legs are how you die here.' },
]

export const armourById = (id: string | undefined | null): ArmourDef | null =>
  ARMOUR.find((a) => a.id === id) ?? null

export interface MaterialDef {
  id: string
  name: string
  emoji: string
  what: string
  rare: boolean
}

export const MATERIALS: MaterialDef[] = [
  { id: 'hound-fang', name: 'Hound Fang', emoji: '🦷', what: 'Off a Rabbit-Eater. Common as dirt in Rabituza.', rare: false },
  { id: 'night-pelt', name: 'Night Pelt', emoji: '🐺', what: 'Lycaon’s hide. It is still cold.', rare: false },
  { id: 'tomb-alloy', name: 'Tomb Alloy', emoji: '⚙️', what: 'Machine plate out of the Tombguard. Nobody alive knows how it was made.', rare: false },
  { id: 'vorpal-core', name: 'Vorpal Core', emoji: '💠', what: 'A unique drop. Luck decides whether you ever see one — and luck is a hidden parameter.', rare: true },
]

export const materialById = (id: string) => MATERIALS.find((m) => m.id === id)

/** What the smith charges to take a weapon from +n to +n+1. */
export const UPGRADE_COST: Partial<Record<string, number>>[] = [
  { 'hound-fang': 3 },
  { 'hound-fang': 5, 'night-pelt': 1 },
  { 'night-pelt': 2, 'tomb-alloy': 1 },
]
export const MAX_PLUS = 3

/** Every +1 is this much more damage and this much more life in the blade. */
export const plusDamage = (plus: number) => 1 + plus * 0.14
export const plusDurability = (plus: number) => 1 + plus * 0.3

// --- the loadout -------------------------------------------------------------

/** Everything the player brought, flattened into the numbers the fight uses. */
export interface Loadout {
  weapon: string
  plus: number
  /** Armour worn per part — an id, or null for nothing at all. */
  worn: Partial<Record<BodyPart, string | null>>
  /** Parts Lycaon has scarred. These can never be covered again. */
  scars: BodyPart[]
  /**
   * Swings left in the blade RIGHT NOW, carried in from the save. Without this
   * every hunt would start with a fresh weapon and durability would mean
   * nothing — a blade with five swings in it has to snap five swings in.
   */
  dur?: number
  /** Psyger-0 will come when called, once you have met them. */
  assist: boolean
}

export interface Stats {
  weapon: WeaponDef
  dmg: number
  reach: number
  arc: number
  wind: number
  dur: number
  maxHp: number
  speed: number
  def: number
  weight: number
  /** Crit chance, in points out of 100. Hidden until the codex finds it. */
  crit: number
  /** Hidden parameter: nudges crit and the odds on a rare drop. */
  luck: number
  /** Hidden parameter: the odds a Night-Slaying Fang fails to leave a mark. */
  curseRes: number
  /** Stamina one dodge costs — armour makes rolling expensive. */
  dodgeCost: number
}

const BASE_SPEED = 17
export const MAX_STAM = 100

/**
 * Roll the loadout into stats.
 *
 * The two hidden parameters are computed HERE and never shown until the codex
 * has found them, because half of what makes the show's game feel deep is that
 * the important numbers are not on the character sheet.
 *
 *   · **Luck** rewards the reckless: it climbs as your armour comes off. It is
 *     the joke the show would make, and it makes the naked build genuinely good.
 *   · **Curse resistance** is the exact opposite — it is bought with armour. So
 *     the fast build is the one that gets permanently scarred, and that is a
 *     real decision rather than a stat check.
 */
export function statsOf(load: Loadout): Stats {
  const w = weaponById(load.weapon)
  let def = 0
  let weight = 0
  for (const part of PARTS) {
    if (load.scars.includes(part)) continue
    const piece = armourById(load.worn[part])
    if (!piece) continue
    def += piece.def
    weight += piece.weight
  }
  const bare = PARTS.filter((p) => !load.scars.includes(p) && !load.worn[p]).length
  return {
    weapon: w,
    dmg: w.dmg * plusDamage(load.plus),
    reach: w.reach,
    arc: (w.arc * Math.PI) / 180,
    wind: w.wind,
    dur: Math.round(w.dur * plusDurability(load.plus)),
    maxHp: 100 + def * 0.6,
    speed: BASE_SPEED * Math.max(0.62, 1 - weight * 0.045),
    def,
    weight,
    crit: 8 + w.crit + load.plus * 2,
    luck: 10 + bare * 9 + load.plus * 3,
    curseRes: Math.min(80, def * 1.5),
    dodgeCost: 18 + weight * 1.1,
  }
}

// --- how hard ----------------------------------------------------------------

/**
 * The show's own difficulty ladder, and the middle rung is the game as shipped.
 * `tell` is the one that matters: it stretches every telegraph, so Casual is not
 * a monster that hits softer — it is a monster that gives you time to READ it,
 * which is the skill the whole game is teaching.
 */
export type Grade = 'casual' | 'frontier' | 'unique'
export interface GradeDef {
  label: string
  what: string
  /** Multiplies the damage they do to you. */
  dmg: number
  /** Multiplies their legs. */
  speed: number
  /** Multiplies every telegraph — over 1 means longer to read. */
  tell: number
  /** Multiplies their health. */
  hp: number
  /** Multiplies the pause between their attacks. */
  rest: number
}
export const GRADES: Record<Grade, GradeDef> = {
  casual: { label: 'Casual', what: 'long tells, soft teeth — learn the fight', dmg: 0.3, speed: 0.74, tell: 1.9, hp: 0.5, rest: 1.8 },
  frontier: { label: 'Frontier', what: 'the game as it shipped', dmg: 1, speed: 1, tell: 1, hp: 1, rest: 1 },
  unique: { label: 'Unique Scenario', what: 'they hunt you. good luck', dmg: 1.32, speed: 1.12, tell: 0.86, hp: 1.15, rest: 0.8 },
}

// --- what a monster does -----------------------------------------------------

/**
 * The shape a danger takes. Every one of these is drawn on the floor while the
 * monster winds up, so every death in this game is a telegraph you failed to
 * read rather than a number you failed to have.
 */
export type Shape =
  /** A wedge in front of it. The bread and butter. */
  | 'cone'
  /** A donut: the OUTSIDE is death and hugging it is safe. Teaches closing in. */
  | 'ring'
  /** A circle centred on the monster. Teaches getting out. */
  | 'nova'
  /** It travels while it strikes, and the whole path hurts. */
  | 'dash'
  /** A circle marked on the FLOOR where you were standing, landing later. */
  | 'zone'
  /** A line straight out in front, thin and very long. */
  | 'line'

export interface MoveDef {
  id: string
  name: string
  shape: Shape
  /** Seconds of wind-up. This is the read. */
  tell: number
  /** Seconds the hitbox is live. */
  strike: number
  /** Seconds it stands there afterwards, wide open. Your entire turn. */
  recover: number
  dmg: number
  reach: number
  /** Cone half-width / line width, in degrees. */
  arc?: number
  /** Ring only: everything inside this radius is safe. */
  inner?: number
  /** Dash only: how far it travels during the strike. */
  travel?: number
  /** How many times the hitbox comes round. A 3-hit combo is one move. */
  hits?: number
  /** Seconds between those hits. */
  gap?: number
  /** Only from this phase on (1-based). */
  from?: number
  /** Never after this phase. */
  until?: number
  /** How often it is picked, against the others available. */
  w?: number
  /** The band of distance it wants: [min, max]. Outside it, the weight drops. */
  band?: [number, number]
  /** It leaves a mark that never heals. Lycaon's, and only Lycaon's. */
  curse?: boolean
  /** It is announced by name across the screen, because it deserves to be. */
  shout?: string
}

export interface BossDef {
  id: string
  name: string
  title: string
  emoji: string
  /** One line, for the hunt list. */
  what: string
  /** The bestiary entry — what the codex says once you have met it. */
  lore: string
  hp: number
  /** Body radius, in arena units. */
  size: number
  speed: number
  colors: [string, string]
  moves: MoveDef[]
  /** Health fractions the phases change at, high to low. */
  phases: number[]
  /** Seconds on the clock. Running it out is its own way to lose. */
  limit: number
  /** Losing to the clock is a scripted execution, not a draw. */
  seal?: string
  /** The pack fight: this many of it, and no single health bar. */
  pack?: number
  /** Ley-vents erupt in this arena. */
  vents?: number
  /** From this phase on it calls help. */
  summonAt?: number
  /** Night falls from this phase on — you can only see so far. */
  nightAt?: number
  /** From this phase the armour is off and the core takes everything. */
  exposeAt?: number
  /** What it drops, and how likely. `luck` moves the rare ones. */
  drops: { id: string; chance: number; n?: number }[]
  /** Berries the first kill is worth. */
  bounty: number
  /** Emul's hints, keyed to what just happened. */
  emul: Record<string, string>
}

/**
 * Three hunts, and they are three different lessons.
 *
 *   1. **The Rabbit-Eaters** teach that the arena is a weapon. They ADAPT: kill
 *      them with the sword and the survivors stop falling for the sword. The
 *      ley-vents do not teach them anything, which is the answer.
 *   2. **Lycaon** teaches spacing in the dark, and takes something permanent.
 *   3. **Wezaemon** teaches a fight with a deadline, and a weak point you have
 *      to go and stand next to.
 */
export const BOSSES: BossDef[] = [
  {
    id: 'hounds',
    name: 'The Rabbit-Eaters',
    title: 'C-List Field Boss · Rabituza',
    emoji: '🐕',
    what: 'A pack that learns. The vents in the floor do not teach them anything.',
    lore:
      'The pack that keeps Rabituza awake. Individually they are nothing — a C-list field boss, the sort of thing a party of four grinds for materials. What makes them a wall is ADAPTATION: kill one with a blade and the rest read the blade, and by the third they are stepping out of your swing before it starts. The ley-vents in the floor are the intended answer, and nothing the vents kill ever gets to pass on what it learned.',
    hp: 62,
    size: 2.6,
    speed: 13.5,
    colors: ['#8a5a34', '#2b1a0d'],
    phases: [1],
    limit: 150,
    pack: 5,
    vents: 4,
    bounty: 18,
    drops: [
      { id: 'hound-fang', chance: 1, n: 3 },
      { id: 'vorpal-core', chance: 0.06 },
    ],
    moves: [
      { id: 'bite', name: 'Snap', shape: 'cone', tell: 0.5, strike: 0.12, recover: 0.5, dmg: 13, reach: 7, arc: 45, w: 3, band: [0, 9] },
      { id: 'pounce', name: 'Pounce', shape: 'dash', tell: 0.7, strike: 0.26, recover: 0.75, dmg: 17, reach: 4.5, travel: 16, w: 2, band: [8, 26] },
    ],
    emul: {
      start: 'Sunraku-san! They copy you — don’t win the same way twice!',
      learn: 'They’ve read your sword! Push one onto a vent!',
      vent: 'The floor is about to blow! Get off it!',
      last: 'One left! Finish it!',
    },
  },
  {
    id: 'lycaon',
    name: 'Lycaon',
    title: 'Unique Monster · the Nightslayer',
    emoji: '🐺',
    what: 'A supreme wolf that fights in its own night. Its last fang leaves a scar you keep.',
    lore:
      'A unique monster, and one of the reasons the frontier has a reputation. Lycaon fights on a field it makes itself: below two thirds it pulls the night in and you can only see as far as it lets you. It hunts in threes — it will not come at you alone once the dark is down. The thing everybody warns you about is the last phase. The **Night-Slaying Fang** does not just hurt: whatever it lands on is SCARRED, and a scarred part of you never wears armour again, on any character sheet, for as long as that save exists. Beat it and the pelt makes the best blade you can hold before the Tombguard.',
    hp: 900,
    size: 5,
    speed: 12.5,
    colors: ['#4a4a6a', '#0d0d1a'],
    phases: [1, 0.62, 0.26],
    limit: 240,
    summonAt: 2,
    nightAt: 2,
    bounty: 40,
    drops: [
      { id: 'night-pelt', chance: 1, n: 2 },
      { id: 'hound-fang', chance: 1, n: 4 },
      { id: 'vorpal-core', chance: 0.14 },
    ],
    moves: [
      { id: 'claw', name: 'Rend', shape: 'cone', tell: 0.55, strike: 0.11, recover: 0.55, dmg: 16, reach: 10, arc: 46, hits: 2, gap: 0.24, w: 3, band: [0, 12] },
      { id: 'lunge', name: 'Lunge', shape: 'dash', tell: 0.62, strike: 0.3, recover: 0.85, dmg: 22, reach: 5.5, travel: 24, w: 3, band: [10, 40] },
      { id: 'howl', name: 'Howl', shape: 'nova', tell: 0.9, strike: 0.16, recover: 1.05, dmg: 20, reach: 15, w: 2, band: [0, 16] },
      { id: 'moonfang', name: 'Moonfang', shape: 'ring', tell: 1, strike: 0.2, recover: 0.9, dmg: 26, reach: 30, inner: 9, from: 2, w: 2, shout: 'MOONFANG' },
      { id: 'prowl', name: 'Blood Hunt', shape: 'cone', tell: 0.4, strike: 0.1, recover: 0.4, dmg: 18, reach: 11, arc: 60, hits: 3, gap: 0.2, from: 3, w: 3, band: [0, 13] },
      {
        id: 'fang',
        name: 'Night-Slaying Fang',
        shape: 'line',
        tell: 1.35,
        strike: 0.22,
        recover: 1.3,
        dmg: 38,
        reach: 40,
        arc: 9,
        from: 3,
        w: 3,
        curse: true,
        shout: 'NIGHT-SLAYING FANG',
      },
    ],
    emul: {
      start: 'That’s Lycaon! Please don’t die on the first one!',
      phase2: 'It’s pulling the night in — you can’t see past the ring! And it called the pups!',
      phase3: 'The white fang! If that lands it SCARS you — sideways, Sunraku-san, sideways!',
      curse: 'It got you… that part won’t take armour again. I’m sorry.',
      low: 'It’s nearly done! Don’t get greedy!',
    },
  },
  {
    id: 'wezaemon',
    name: 'Wezaemon',
    title: 'Unique Monster · the Tombguard',
    emoji: '🗿',
    what: 'An ancient machine samurai with a countdown. Run the clock out and it seals the tomb with you in it.',
    lore:
      'A mechanical samurai left behind by whatever built the frontier, standing guard over a tomb that nobody has ever read. It fights in three states. **Sheathed**, it draws faster than the telegraph looks — the iai is barely a flicker. **Drawn**, the arcs get enormous and it starts marking the floor. **Broken**, below a third, the plate comes off and the core is out in the open: everything you land on it does more than twice what it did, and the clock starts running double. The countdown is not decoration. Reach zero and Wezaemon performs the **Grave Seal**, which is not an attack — it is the end of your run, immediately, with the fight still going.',
    hp: 1150,
    size: 5.6,
    speed: 11,
    colors: ['#9aa6bb', '#2a3345'],
    phases: [1, 0.66, 0.3],
    limit: 180,
    seal: 'GRAVE SEAL',
    exposeAt: 3,
    bounty: 60,
    drops: [
      { id: 'tomb-alloy', chance: 1, n: 3 },
      { id: 'night-pelt', chance: 0.5 },
      { id: 'vorpal-core', chance: 0.22 },
    ],
    moves: [
      { id: 'iai', name: 'Iai', shape: 'line', tell: 0.55, strike: 0.12, recover: 0.75, dmg: 24, reach: 34, arc: 7, until: 2, w: 4, shout: 'IAI' },
      { id: 'step', name: 'Step Slash', shape: 'dash', tell: 0.6, strike: 0.26, recover: 0.8, dmg: 24, reach: 6, travel: 22, w: 3, band: [9, 40] },
      { id: 'arc', name: 'Wide Arc', shape: 'cone', tell: 0.72, strike: 0.14, recover: 0.75, dmg: 21, reach: 13, arc: 72, hits: 3, gap: 0.26, from: 2, w: 3, band: [0, 15] },
      { id: 'quake', name: 'Tomb Quake', shape: 'nova', tell: 1.05, strike: 0.2, recover: 1.1, dmg: 28, reach: 17, from: 2, w: 2 },
      { id: 'mark', name: 'Grave Mark', shape: 'zone', tell: 1.2, strike: 0.3, recover: 0.7, dmg: 30, reach: 7.5, hits: 3, gap: 0.45, from: 2, w: 2, shout: 'GRAVE MARK' },
      { id: 'sever', name: 'Severing Wheel', shape: 'ring', tell: 1.1, strike: 0.24, recover: 1.2, dmg: 34, reach: 32, inner: 10, from: 3, w: 3, shout: 'SEVERING WHEEL' },
    ],
    emul: {
      start: 'The clock, Sunraku-san! When it runs out it doesn’t attack — it just ENDS you!',
      phase2: 'It’s drawn the sword! Watch the floor, not the samurai!',
      phase3: 'The plate came off! Hit the core — it’s worth more than double now! But the clock’s running twice as fast!',
      clock: 'Thirty seconds! GET IT DOWN!',
    },
  },
]

export const bossById = (id: string) => BOSSES.find((b) => b.id === id)

/**
 * Berries. A boss's `bounty` is paid ONCE, the first time it goes down — that is
 * the unique-scenario money. After that a clear pays the same small practice
 * rate the other games' solo modes do, capped per day, because a boss rush you
 * can farm is a Berry printer and not a game.
 */
export const SLF_SOLO_REWARD = 6
export const SLF_SOLO_LIMIT = 3

/** A brand-new hunter: the beginner's blade, nothing worn, nothing learned. */
export function defaultFrontierState(): FrontierState {
  return {
    weapon: 'starter',
    plus: 0,
    dur: WEAPONS[0].dur,
    worn: {},
    scars: [],
    mats: {},
    forged: [],
    owned: [],
    kills: {},
    found: [],
    assist: false,
    grade: 'casual',
    runs: 0,
    paid: [],
    day: null,
    wins: 0,
  }
}

/** The saved world, folded into the shape a fight wants. */
export function loadoutOf(s: FrontierState): Loadout {
  return {
    weapon: s.weapon,
    plus: s.plus,
    dur: s.dur,
    worn: s.worn,
    scars: (s.scars ?? []).filter((p): p is BodyPart => PARTS.includes(p as BodyPart)),
    assist: s.assist,
  }
}

/** Is this material bill payable out of the bag? */
export function canPay(mats: Record<string, number>, cost: Partial<Record<string, number>> | undefined): boolean {
  if (!cost) return true
  return Object.entries(cost).every(([id, n]) => (mats[id] ?? 0) >= (n ?? 0))
}

/** What the smith wants for the next +1, or null if the blade is finished. */
export function nextUpgrade(plus: number): Partial<Record<string, number>> | null {
  return plus >= MAX_PLUS ? null : UPGRADE_COST[plus]
}

/** One Hound Fang buys the blade back to full. Nothing else repairs it. */
export const REPAIR_COST: Partial<Record<string, number>> = { 'hound-fang': 1 }

// --- state -------------------------------------------------------------------

export type Act = 'idle' | 'light' | 'heavy' | 'dodge' | 'drink' | 'stagger' | 'dead'
/** Where inside an action we are — wind-up, the live frames, or the recovery. */
export type Beat = 'tell' | 'strike' | 'recover'

export interface Hero {
  pos: Vec
  vel: Vec
  /** Where the sword goes. There is no lock-on in this game, on purpose. */
  face: number
  hp: number
  maxHp: number
  stam: number
  act: Act
  beat: Beat
  /** Seconds elapsed inside the current beat. */
  t: number
  /** Which swing of the three-hit chain this is. */
  chain: number
  /** Seconds the chain window stays open. */
  chainT: number
  /**
   * Seconds of invincibility, and a ROLL is the only thing that grants them.
   * Kept strictly apart from `hurt` below, because "the hitbox found you while
   * you were invincible" is only a perfect dodge if you got there on purpose —
   * before this was split, hit two of a three-hit combo counted as a read.
   */
  iframes: number
  /** Seconds on the floor after a hit. It absorbs the rest of a combo, and pays nothing. */
  hurt: number
  /** Seconds before you may roll again. */
  dodgeCd: number
  /** 0…1 while HEAVY is held. */
  charge: number
  /** Seconds of Overclock left — the reward for a frame-perfect dodge. */
  over: number
  /** Seconds you cannot act, because you emptied the bar. The worst place to be. */
  gasp: number
  /** Seconds before stamina starts coming back. */
  rest: number
  /** Potions left. */
  flasks: number
  /** Swings left in the blade before it snaps. */
  dur: number
  /** True once it has. Damage falls off a cliff and never comes back this fight. */
  broken: boolean
  /** Which way the current swing sweeps, so a chain alternates. */
  sweep: 1 | -1
  /**
   * Who this swing has already hit. The live frames of an attack run for a
   * tenth of a second, which is several frames — without this the same swing
   * lands once per FRAME, and how hard you hit would depend on your refresh
   * rate. Cleared the moment a new swing starts.
   */
  struck: string[]
  /** Psyger-0 is still available. */
  assist: boolean
  /** Seconds of Psyger-0's covering fire left. */
  assistT: number
}

export interface Foe {
  id: string
  /** 'boss' gets the big bar; 'pack' and 'pup' are counted instead. */
  kind: 'boss' | 'pack' | 'pup'
  name: string
  hp: number
  maxHp: number
  size: number
  pos: Vec
  vel: Vec
  face: number
  speed: number
  colors: [string, string]
  phase: number
  move: MoveDef | null
  beat: 'wait' | 'tell' | 'strike' | 'gap' | 'recover'
  t: number
  /** Which of a multi-hit move's strikes is live. */
  hit: number
  /** This strike has already landed, so one swing hurts once. */
  landed: boolean
  /** Where a `zone` was marked on the floor. */
  mark: Vec | null
  /** Which way a dash is going, locked in when the tell starts. */
  dir: Vec
  /** Seconds of stagger. A heavy landing on a wind-up buys you this. */
  stun: number
  /**
   * What it has learned. Every time you hit it with the same kind of attack this
   * climbs, and the damage that attack does falls — the show's monsters do not
   * lose to the same trick twice. It decays, so MIXING is the counter.
   */
  adapt: { light: number; heavy: number }
  /** The plate is off and the core is showing (Wezaemon, phase 3). */
  exposed: boolean
}

/** A ley-vent: it is the answer to the pack, and it will happily kill you too. */
export interface Vent {
  pos: Vec
  r: number
  /** Seconds until the next state change. */
  t: number
  state: 'cold' | 'warn' | 'blow'
}

export type Phase = 'intro' | 'live' | 'won' | 'lost'

/** Something that just happened, for the screen to make a mess and a noise about. */
export type FxKind =
  | 'swing'
  | 'hit'
  | 'crit'
  | 'block'
  | 'dodge'
  | 'perfect'
  | 'roar'
  | 'tell'
  | 'boom'
  | 'break'
  | 'heal'
  | 'die'
  | 'curse'
  | 'vent'
  | 'assist'

export interface Fx {
  kind: FxKind
  at: Vec
  dir: Vec
  power: number
  who: string | null
}

export interface Fight {
  def: BossDef
  grade: GradeDef
  stats: Stats
  hero: Hero
  foes: Foe[]
  vents: Vent[]
  phase: Phase
  /** Seconds left on the hunt. Wezaemon's is a death sentence; the others', a fail. */
  clock: number
  /** How fast the clock runs. Wezaemon doubles it when the plate comes off. */
  clockRate: number
  /** Seconds the current non-live phase still has to run. */
  wait: number
  /** The last big thing to shout across the screen. */
  shout: string | null
  shoutT: number
  /** What Emul is saying, and for how long. */
  emul: string | null
  emulT: number
  /** Hints already given, so the rabbit doesn't repeat itself. */
  said: string[]
  /**
   * Hidden parameter, live: how much attention you are drawing. It climbs when
   * you attack and falls when you don't, and the monster reads it — high aggro
   * and it comes at YOU, low and it starts throwing the arena around instead.
   * Backing off is a real tactic because of this one number.
   */
  aggro: number
  /** 0…1 — how badly it is hurt, for the camera. */
  heat: number
  /** Seconds of bullet-time left, from a perfect dodge. */
  slow: number
  /** Fight stats, for the result card. */
  hits: number
  perfect: number
  seconds: number
  /** Set the moment a Night-Slaying Fang leaves a mark. */
  scar: BodyPart | null
  /** Parts already scarred before this hunt — the fang cannot mark them twice. */
  scarred: BodyPart[]
  /** Durability the blade came in with, so the wear filed afterwards is real. */
  startDur: number
  /** How it ended. */
  how: 'slain' | 'died' | 'sealed' | 'timeout' | null
  /** This frame's bangs. Drained by whoever draws them. */
  fx: Fx[]
  /** What the pack has worked out about your sword. Nothing a vent kills adds to it. */
  learned: number
}

export interface FightResult {
  bossId: string
  won: boolean
  how: 'slain' | 'died' | 'sealed' | 'timeout'
  seconds: number
  /** Durability actually burned off the blade. */
  wear: number
  drops: string[]
  scar: BodyPart | null
  hits: number
  perfect: number
  bounty: number
}

// --- maths -------------------------------------------------------------------

const len = (v: Vec) => Math.hypot(v.x, v.y)
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y })
const norm = (v: Vec): Vec => {
  const l = len(v) || 1
  return { x: v.x / l, y: v.y / l }
}
const dist = (a: Vec, b: Vec) => len(sub(a, b))
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const down = (t: number, dt: number) => Math.max(0, t - dt)
const angTo = (from: Vec, to: Vec) => Math.atan2(to.y - from.y, to.x - from.x)

/** The shortest way round from one angle to another. */
function angDelta(a: number, b: number): number {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/** A per-SECOND chance, so a 120 Hz phone rolls it as often as a 60 Hz one. */
const chance = (perSecond: number, dt: number) => Math.random() < perSecond * dt

/** Push a point back inside the arena circle. */
function penned(p: Vec, pad = 1): Vec {
  const d = len(p)
  if (d <= ARENA - pad) return p
  const k = (ARENA - pad) / (d || 1)
  return { x: p.x * k, y: p.y * k }
}

// --- input -------------------------------------------------------------------

export interface Input {
  /** Stick, clamped to the unit circle. This is also where you face. */
  move: Vec
  /** One-shots — the frame that reads them clears them. */
  light: boolean
  /** HELD: the longer it is down the harder it lands, and it goes on release. */
  heavy: boolean
  dodge: boolean
  flask: boolean
  assist: boolean
}

export const noInput = (): Input => ({
  move: { x: 0, y: 0 },
  light: false,
  heavy: false,
  dodge: false,
  flask: false,
  assist: false,
})

// --- tuning ------------------------------------------------------------------

/** The three-hit chain: wind-up, live frames, recovery. Multiplied by the weapon. */
const LIGHT = { tell: 0.1, strike: 0.09, recover: 0.19 }
const HEAVY = { tell: 0.3, strike: 0.12, recover: 0.44 }
const CHAIN_WINDOW = 0.5
const DODGE_TIME = 0.34
const DODGE_IFRAMES = 0.24
const DODGE_SPEED = 46
const DODGE_CD = 0.18
const DRINK_TIME = 0.95
const FLASK_HEAL = 38
export const FLASKS = 3
const STAM_REGEN = 30
const STAM_DELAY = 0.55
const GASP_TIME = 1.1
const OVER_TIME = 3.2
/** How much a perfect dodge slows the world down, and for how long. */
const SLOW_TIME = 0.4
const SLOW_RATE = 0.35
const ASSIST_TIME = 5

// --- building a fight --------------------------------------------------------

function foeAt(def: BossDef, i: number, n: number, grade: GradeDef, kind: Foe['kind'], hpScale = 1): Foe {
  const a = (i / n) * Math.PI * 2
  const r = ARENA * 0.55
  return {
    id: `${def.id}-${kind}-${i}`,
    kind,
    name: def.name,
    hp: def.hp * grade.hp * hpScale,
    maxHp: def.hp * grade.hp * hpScale,
    size: kind === 'boss' ? def.size : def.size * 0.62,
    pos: { x: Math.cos(a) * r, y: Math.sin(a) * r },
    vel: { x: 0, y: 0 },
    face: a + Math.PI,
    speed: def.speed * grade.speed * (kind === 'boss' ? 1 : 1.1),
    colors: def.colors,
    phase: 1,
    move: null,
    beat: 'wait',
    t: 0.9,
    hit: 0,
    landed: false,
    mark: null,
    dir: { x: 1, y: 0 },
    stun: 0,
    adapt: { light: 0, heavy: 0 },
    exposed: false,
  }
}

export function newFight(opts: { boss: BossDef; grade: Grade; load: Loadout }): Fight {
  const g = GRADES[opts.grade]
  const st = statsOf(opts.load)
  const def = opts.boss
  const foes: Foe[] = def.pack
    ? Array.from({ length: def.pack }, (_, i) => foeAt(def, i, def.pack!, g, 'pack'))
    : [foeAt(def, 0, 1, g, 'boss')]
  if (!def.pack) foes[0].pos = { x: 0, y: -ARENA * 0.45 }

  const vents: Vent[] = Array.from({ length: def.vents ?? 0 }, (_, i) => {
    const a = (i / (def.vents ?? 1)) * Math.PI * 2 + Math.PI / 4
    return {
      pos: { x: Math.cos(a) * ARENA * 0.5, y: Math.sin(a) * ARENA * 0.5 },
      r: 5.5,
      // staggered, so they never all go at once and there is always an answer
      t: 2 + i * 1.6,
      state: 'cold',
    }
  })

  return {
    def,
    grade: g,
    stats: st,
    hero: {
      pos: { x: 0, y: ARENA * 0.5 },
      vel: { x: 0, y: 0 },
      face: -Math.PI / 2,
      hp: st.maxHp,
      maxHp: st.maxHp,
      stam: MAX_STAM,
      act: 'idle',
      beat: 'recover',
      t: 0,
      chain: 0,
      chainT: 0,
      iframes: 0,
      hurt: 0,
      dodgeCd: 0,
      charge: 0,
      over: 0,
      gasp: 0,
      rest: 0,
      flasks: FLASKS,
      // the blade you actually own, not a fresh one
      dur: Math.min(st.dur, opts.load.dur ?? st.dur),
      broken: (opts.load.dur ?? st.dur) <= 0,
      sweep: 1,
      struck: [],
      assist: opts.load.assist,
      assistT: 0,
    },
    foes,
    vents,
    phase: 'intro',
    clock: def.limit,
    clockRate: 1,
    wait: 2.1,
    shout: def.name.toUpperCase(),
    shoutT: 2.1,
    emul: def.emul.start ?? null,
    emulT: 4.5,
    said: ['start'],
    aggro: 0,
    heat: 0,
    slow: 0,
    hits: 0,
    perfect: 0,
    seconds: 0,
    scar: null,
    scarred: [...opts.load.scars],
    startDur: Math.min(st.dur, opts.load.dur ?? st.dur),
    how: null,
    fx: [],
    learned: 0,
  }
}

/** Log a bang. Capped, so a three-hit combo into a vent can't flood the renderer. */
function bang(f: Fight, kind: FxKind, at: Vec, power = 0.5, dir: Vec = { x: 0, y: 0 }, who: string | null = null): void {
  if (f.fx.length > 30) return
  f.fx.push({ kind, at: { x: at.x, y: at.y }, dir, power: clamp(power, 0, 1), who })
}

function say(f: Fight, key: string): void {
  const line = f.def.emul[key]
  if (!line || f.said.includes(key)) return
  f.said.push(key)
  f.emul = line
  f.emulT = 4.6
}

function shout(f: Fight, text: string): void {
  f.shout = text
  f.shoutT = 1.5
}

// --- the tick ----------------------------------------------------------------

/** One frame. `dt` is real seconds, so the fight runs the same at any refresh rate. */
export function step(f: Fight, input: Input, real: number): Fight {
  if (f.phase === 'won' || f.phase === 'lost') return f
  f.fx = []

  // a perfect dodge buys a moment of bullet-time. Everything below runs on the
  // SLOWED clock, so the reward is that you get to see, and act, in the gap.
  f.slow = down(f.slow, real)
  const dt = f.slow > 0 ? real * SLOW_RATE : real

  if (f.phase === 'intro') {
    f.wait -= real
    f.shoutT = down(f.shoutT, real)
    f.emulT = down(f.emulT, real)
    if (f.wait > 0) return f
    f.phase = 'live'
    f.shout = null
  }

  f.seconds += dt
  f.clock -= dt * f.clockRate
  f.shoutT = down(f.shoutT, real)
  f.emulT = down(f.emulT, real)
  if (f.shoutT <= 0) f.shout = null
  if (f.emulT <= 0) f.emul = null

  if (f.clock <= 30 && f.clock > 0) say(f, 'clock')
  if (f.clock <= 0) {
    f.clock = 0
    f.phase = 'lost'
    f.how = f.def.seal ? 'sealed' : 'timeout'
    shout(f, f.def.seal ?? (f.def.pack ? 'THE PACK MELTS AWAY' : 'IT SLIPS AWAY'))
    bang(f, 'die', f.hero.pos, 1)
    return f
  }

  // aggro bleeds off on its own. It is only ever raised by hitting things, so
  // "stop hitting it for a second" is a real and readable defensive option.
  f.aggro = clamp(f.aggro - 0.34 * dt, 0, 1)

  hero(f, input, dt)
  for (const foe of f.foes) brain(f, foe, dt)
  vents(f, dt)
  cleanup(f)
  return f
}

// --- the player --------------------------------------------------------------

function hero(f: Fight, input: Input, dt: number): void {
  const h = f.hero
  const st = f.stats

  h.iframes = down(h.iframes, dt)
  h.hurt = down(h.hurt, dt)
  h.dodgeCd = down(h.dodgeCd, dt)
  h.chainT = down(h.chainT, dt)
  h.over = down(h.over, dt)
  h.gasp = down(h.gasp, dt)
  h.rest = down(h.rest, dt)
  h.assistT = down(h.assistT, dt)
  if (h.chainT <= 0) h.chain = 0

  // stamina: it comes back fast, but only once you have stopped spending it.
  if (h.rest <= 0 && h.act !== 'dodge') h.stam = Math.min(MAX_STAM, h.stam + STAM_REGEN * dt)

  // Psyger-0's covering fire, if they were called
  if (h.assistT > 0) {
    for (const foe of f.foes) {
      if (chance(2.4, dt)) {
        wound(f, foe, 26 * (foe.exposed ? 2.2 : 1), 'light', foe.pos, false, true)
      }
    }
  }

  if (h.act === 'dead') return

  // --- steering. The stick is the ONLY thing that turns you, so a swing thrown
  // in the wrong direction is a swing thrown in the wrong direction.
  const stick = len(input.move) > 1 ? norm(input.move) : input.move
  const moving = len(stick) > 0.15
  if (moving && (h.act === 'idle' || (h.act === 'light' && h.beat === 'tell') || h.act === 'heavy')) {
    const want = Math.atan2(stick.y, stick.x)
    // turning is quick but not instant; a heavy commits you almost completely
    const rate = h.act === 'idle' ? 22 : h.act === 'heavy' ? 3 : 9
    h.face += angDelta(h.face, want) * Math.min(1, dt * rate)
  }

  // --- legs
  let speed = 0
  let wish: Vec = { x: 0, y: 0 }
  if (h.act === 'dodge') {
    speed = DODGE_SPEED * (1 - h.t / DODGE_TIME) ** 0.5
    wish = h.vel.x || h.vel.y ? norm(h.vel) : { x: Math.cos(h.face), y: Math.sin(h.face) }
  } else if (h.act === 'idle' && h.gasp <= 0) {
    speed = st.speed * (h.over > 0 ? 1.22 : 1)
    wish = stick
  } else if (h.act === 'light' && h.beat !== 'strike') {
    speed = st.speed * 0.45 // you can shuffle through a light swing, barely
    wish = stick
  }
  const want: Vec = { x: wish.x * speed, y: wish.y * speed }
  const grip = h.act === 'dodge' ? 500 : 150
  const dv = sub(want, h.vel)
  const dl = len(dv)
  const grab = grip * dt
  h.vel = dl <= grab ? want : { x: h.vel.x + (dv.x / dl) * grab, y: h.vel.y + (dv.y / dl) * grab }
  h.pos = penned({ x: h.pos.x + h.vel.x * dt, y: h.pos.y + h.vel.y * dt })

  // --- the action state machine
  if (h.act === 'idle') {
    if (h.gasp > 0) return

    if (input.assist && h.assist) {
      h.assist = false
      h.assistT = ASSIST_TIME
      shout(f, 'PSYGER-0 — COVERING FIRE')
      bang(f, 'assist', h.pos, 1)
      return
    }
    if (input.flask && h.flasks > 0 && h.hp < h.maxHp) {
      h.flasks -= 1
      h.act = 'drink'
      h.beat = 'strike'
      h.t = 0
      return
    }
    if (input.dodge && h.dodgeCd <= 0 && h.stam >= st.dodgeCost) {
      h.act = 'dodge'
      h.beat = 'strike'
      h.t = 0
      h.stam -= st.dodgeCost
      h.rest = STAM_DELAY
      h.iframes = Math.max(h.iframes, DODGE_IFRAMES)
      // a roll with no stick behind it goes backwards, which is what you meant
      const dir = moving ? stick : { x: -Math.cos(h.face), y: -Math.sin(h.face) }
      h.vel = { x: dir.x * DODGE_SPEED, y: dir.y * DODGE_SPEED }
      bang(f, 'dodge', h.pos, 0.6, dir, 'hero')
      emptyCheck(f)
      return
    }
    if (input.heavy) {
      h.act = 'heavy'
      h.beat = 'tell'
      h.t = 0
      h.charge = 0
      return
    }
    if (input.light && h.stam >= st.weapon.stam) {
      startLight(f)
      return
    }
    return
  }

  h.t += dt

  if (h.act === 'drink') {
    if (h.t >= DRINK_TIME) {
      h.hp = Math.min(h.maxHp, h.hp + FLASK_HEAL)
      bang(f, 'heal', h.pos, 1, { x: 0, y: 0 }, 'hero')
      h.act = 'idle'
    }
    return
  }

  if (h.act === 'stagger') {
    if (h.t >= GASP_TIME) h.act = 'idle'
    return
  }

  if (h.act === 'dodge') {
    if (h.t >= DODGE_TIME) {
      h.act = 'idle'
      h.dodgeCd = DODGE_CD
      h.vel = { x: h.vel.x * 0.3, y: h.vel.y * 0.3 }
    }
    return
  }

  if (h.act === 'heavy') {
    // HELD: charge while it is down, and it goes the frame it lifts
    if (h.beat === 'tell') {
      if (input.heavy) {
        h.charge = Math.min(1, h.charge + dt / 0.95)
        return
      }
      h.beat = 'strike'
      h.t = 0
      const cost = st.weapon.stam * 2.1
      if (h.stam < cost) {
        // not enough left in the legs: the swing dies and you are wide open
        h.act = 'stagger'
        h.beat = 'recover'
        h.t = 0
        h.gasp = GASP_TIME
        bang(f, 'block', h.pos, 0.4)
        return
      }
      h.stam -= cost
      h.rest = STAM_DELAY
      h.sweep = 1
      h.struck = []
      bang(f, 'swing', h.pos, 0.6 + h.charge * 0.4, { x: Math.cos(h.face), y: Math.sin(h.face) }, 'hero')
      emptyCheck(f)
      return
    }
    if (h.beat === 'strike') {
      const live = HEAVY.strike * st.wind
      if (h.t <= live) {
        swing(f, 'heavy')
        return
      }
      h.beat = 'recover'
      h.t = 0
      return
    }
    if (h.t >= HEAVY.recover * st.wind) {
      h.act = 'idle'
      h.charge = 0
    }
    return
  }

  if (h.act === 'light') {
    const wind = st.wind * (h.over > 0 ? 0.78 : 1)
    if (h.beat === 'tell') {
      if (h.t < LIGHT.tell * wind) return
      h.beat = 'strike'
      h.t = 0
      bang(f, 'swing', h.pos, 0.4, { x: Math.cos(h.face), y: Math.sin(h.face) }, 'hero')
      return
    }
    if (h.beat === 'strike') {
      if (h.t <= LIGHT.strike * wind) {
        swing(f, 'light')
        return
      }
      h.beat = 'recover'
      h.t = 0
      h.chainT = CHAIN_WINDOW
      return
    }
    // the chain: press again inside the window and the next swing comes early
    if (input.light && h.chain < 2 && h.stam >= st.weapon.stam) {
      startLight(f)
      return
    }
    if (h.t >= LIGHT.recover * wind) h.act = 'idle'
    return
  }
}

function startLight(f: Fight): void {
  const h = f.hero
  const st = f.stats
  h.act = 'light'
  h.beat = 'tell'
  h.t = 0
  h.chain = h.chainT > 0 ? Math.min(2, h.chain + 1) : 0
  h.chainT = CHAIN_WINDOW
  h.sweep = h.chain === 1 ? -1 : 1
  h.struck = []
  h.stam -= st.weapon.stam
  h.rest = STAM_DELAY
  emptyCheck(f)
}

/** Emptying the bar is a failure state of its own: you stand there and gasp. */
function emptyCheck(f: Fight): void {
  const h = f.hero
  if (h.stam > 0.5) return
  h.stam = 0
  h.gasp = GASP_TIME
  h.act = 'stagger'
  h.beat = 'recover'
  h.t = 0
  bang(f, 'block', h.pos, 0.5)
}

/**
 * The live frames of a swing. The arc is a wedge in front of you and NOTHING
 * finds a target for you: if the stick was pointing the wrong way when you
 * pressed, the sword goes through empty air.
 */
function swing(f: Fight, kind: 'light' | 'heavy'): void {
  const h = f.hero
  const st = f.stats
  const reach = st.reach * (kind === 'heavy' ? 1.2 : 1)
  const half = st.arc * (kind === 'heavy' ? 1.5 : 1)
  let landed = false

  for (const foe of f.foes) {
    // one swing, one hit each — see `Hero.struck`
    if (h.struck.includes(foe.id)) continue
    const d = dist(h.pos, foe.pos) - foe.size
    if (d > reach) continue
    if (Math.abs(angDelta(h.face, angTo(h.pos, foe.pos))) > half) continue
    if (foe.hp <= 0) continue
    h.struck.push(foe.id)

    // the chain's third swing is the payoff; a heavy scales with the charge
    const chainMul = kind === 'light' ? [1, 1, 1.45][h.chain] : 1
    const power = kind === 'heavy' ? st.weapon.heavy * (0.45 + h.charge * 0.75) : 1
    const base = st.dmg * chainMul * power * (h.over > 0 ? 1.4 : 1) * (h.broken ? 0.35 : 1)
    const crit = Math.random() * 100 < st.crit + st.luck * 0.35
    wound(f, foe, base * (crit ? 1.9 : 1), kind, h.pos, crit, false)
    landed = true

    // a big enough hit on a wind-up interrupts it. This is the reward for
    // reading a telegraph and going IN rather than away.
    const heft = kind === 'heavy' ? 1 + h.charge : 0.25
    if (foe.beat === 'tell' && heft > 0.9 && foe.kind !== 'boss') {
      foe.beat = 'recover'
      foe.t = 0
      foe.stun = 0.7
    } else if (heft > 1.4 && foe.beat === 'tell' && Math.random() < 0.35) {
      foe.stun = Math.max(foe.stun, 0.5)
    }
  }

  if (!landed || h.broken) return
  // the blade only wears when it actually bites something — and a blade that is
  // already in two pieces cannot wear any further, which is what keeps the wear
  // filed afterwards equal to the durability it actually had
  h.dur = Math.max(0, h.dur - (kind === 'heavy' ? 3 : 1))
  if (h.dur <= 0) {
    h.broken = true
    shout(f, 'YOUR WEAPON BREAKS')
    bang(f, 'break', h.pos, 1)
  }
}

/** Damage, adaptation and aggro, in the one place so nothing can skip a rule. */
function wound(f: Fight, foe: Foe, raw: number, kind: 'light' | 'heavy', from: Vec, crit: boolean, fromAssist: boolean): void {
  if (foe.hp <= 0) return
  // ADAPTATION — the pillar. Land the same kind of attack over and over and it
  // stops working; the decay in `brain` means mixing your two attacks (and
  // taking a breath) is what keeps your damage up.
  const learn = foe.adapt[kind]
  const resist = 1 / (1 + learn * 0.22)
  // and the pack's own lesson, which is a different thing: it does not decay,
  // it is not per-attack, and only a BLADE ever teaches it (see below)
  const packWise = foe.kind === 'pack' ? 1 / (1 + f.learned * 0.55) : 1
  const weak = foe.exposed ? 2.3 : 1
  const dealt = raw * Math.max(0.35, resist) * packWise * weak
  foe.hp -= dealt
  if (!fromAssist) {
    foe.adapt[kind] += 1
    f.hits += 1
    f.aggro = clamp(f.aggro + dealt / (foe.maxHp * 0.16), 0, 1)
  }
  const dir = norm(sub(foe.pos, from))
  bang(f, crit ? 'crit' : 'hit', { x: foe.pos.x - dir.x * foe.size, y: foe.pos.y - dir.y * foe.size }, clamp(dealt / 40, 0.25, 1), dir, foe.id)
  if (foe.hp <= 0) {
    foe.hp = 0
    bang(f, 'die', foe.pos, 1)
    // the pack reads whatever killed the last one — but only a BLADE teaches it
    if (foe.kind === 'pack') {
      f.learned += 1
      if (f.learned >= 2) say(f, 'learn')
      for (const other of f.foes) {
        if (other.hp <= 0 || other.kind !== 'pack') continue
        other.speed *= 1.13
      }
    }
  }
}

// --- the monsters ------------------------------------------------------------

/**
 * One monster's frame: phase, then movement, then whether it starts something.
 *
 * The AI is small on purpose. It reads three things — how far away you are, how
 * much attention you are drawing (`aggro`), and which phase it is in — and picks
 * a move whose band fits. That is enough to feel like it is thinking, because
 * every move has a telegraph the player can see it choosing.
 */
function brain(f: Fight, foe: Foe, dt: number): void {
  if (foe.hp <= 0) return
  const h = f.hero

  foe.stun = down(foe.stun, dt)
  // what it has learned bleeds away, so mixing your attacks resets it
  foe.adapt.light = Math.max(0, foe.adapt.light - (0.8 + foe.adapt.light * 0.55) * dt)
  foe.adapt.heavy = Math.max(0, foe.adapt.heavy - (0.8 + foe.adapt.heavy * 0.55) * dt)

  // --- phases
  if (foe.kind === 'boss') {
    const frac = foe.hp / foe.maxHp
    const want = f.def.phases.filter((p) => frac <= p).length || 1
    if (want > foe.phase) {
      foe.phase = want
      foe.beat = 'wait'
      foe.t = 0.9
      foe.move = null
      shout(f, `PHASE ${want}`)
      bang(f, 'roar', foe.pos, 1)
      say(f, `phase${want}`)
      if (f.def.exposeAt && want >= f.def.exposeAt) {
        foe.exposed = true
        f.clockRate = 2
      }
      if (f.def.summonAt && want >= f.def.summonAt) {
        for (let i = 0; i < 2; i++) {
          const pup = foeAt(f.def, i, 2, f.grade, 'pup', 0.06)
          pup.name = 'Shadow Pup'
          pup.size = 2.2
          pup.speed = f.def.speed * f.grade.speed * 1.25
          f.foes.push(pup)
        }
      }
    }
    f.heat = 1 - frac
  }

  const toHero = dist(foe.pos, h.pos)
  const facing = angTo(foe.pos, h.pos)

  // --- a move in flight
  if (foe.move) {
    if (foe.stun > 0 && foe.beat === 'tell') {
      // staggered out of a wind-up. Nothing happens, and it is your turn.
      foe.move = null
      foe.beat = 'recover'
      foe.t = 0.5
      return
    }
    runMove(f, foe, dt)
    return
  }

  // --- turning and walking, while it has nothing else on
  const turn = foe.beat === 'recover' ? 1.6 : 5
  foe.face += angDelta(foe.face, facing) * Math.min(1, dt * turn)

  foe.t -= dt
  if (foe.stun > 0) return

  // it keeps its distance band: too close and it backs off, too far and it comes
  const wantRange = foe.kind === 'boss' ? 11 : 7
  const drive = toHero > wantRange + 3 ? 1 : toHero < wantRange - 4 ? -0.55 : 0
  const step = foe.speed * (foe.beat === 'recover' ? 0.25 : 1) * drive
  // circling, so it does not simply walk down your throat in a straight line
  const strafe = Math.sin(f.seconds * 0.7 + foe.pos.x) * 0.45
  const dir: Vec = {
    x: Math.cos(facing) * step + Math.cos(facing + Math.PI / 2) * foe.speed * strafe,
    y: Math.sin(facing) * step + Math.sin(facing + Math.PI / 2) * foe.speed * strafe,
  }
  foe.vel = { x: dir.x, y: dir.y }
  foe.pos = penned({ x: foe.pos.x + foe.vel.x * dt, y: foe.pos.y + foe.vel.y * dt }, foe.size)

  if (foe.beat === 'recover') {
    if (foe.t <= 0) foe.beat = 'wait'
    return
  }
  if (foe.t > 0) return

  // --- pick something
  const move = pick(f, foe, toHero)
  if (!move) {
    foe.t = 0.4
    return
  }
  foe.move = move
  foe.beat = 'tell'
  foe.t = 0
  foe.hit = 0
  foe.landed = false
  foe.dir = { x: Math.cos(facing), y: Math.sin(facing) }
  foe.mark = move.shape === 'zone' ? { x: h.pos.x, y: h.pos.y } : null
  if (move.shout) shout(f, move.shout)
  bang(f, 'tell', foe.pos, 0.5, foe.dir, foe.id)
}

/**
 * Which attack. Weighted by the move's own weight, by whether you are standing
 * in the band it wants — and by AGGRO, the hidden parameter: draw a lot of
 * attention and the tracking moves get picked, back off and it starts throwing
 * the whole arena at you instead.
 */
function pick(f: Fight, foe: Foe, range: number): MoveDef | null {
  const options: { m: MoveDef; w: number }[] = []
  for (const m of f.def.moves) {
    if (m.from && foe.phase < m.from) continue
    if (m.until && foe.phase > m.until) continue
    let w = m.w ?? 1
    if (m.band) {
      const [lo, hi] = m.band
      if (range < lo || range > hi) w *= 0.15
    }
    const tracks = m.shape === 'cone' || m.shape === 'dash' || m.shape === 'line'
    w *= tracks ? 0.55 + f.aggro * 1.1 : 1.35 - f.aggro * 0.7
    if (w > 0) options.push({ m, w })
  }
  if (!options.length) return null
  let roll = Math.random() * options.reduce((s, o) => s + o.w, 0)
  for (const o of options) {
    roll -= o.w
    if (roll <= 0) return o.m
  }
  return options[options.length - 1].m
}

/** A move, beat by beat: wind-up, live frames (maybe several), then the opening. */
function runMove(f: Fight, foe: Foe, dt: number): void {
  const m = foe.move
  if (!m) return
  const h = f.hero
  foe.t += dt
  const tell = m.tell * f.grade.tell

  if (foe.beat === 'tell') {
    // it keeps tracking you through the wind-up, but slowly — that lag is the
    // gap you step into, and it is why sidestepping beats sprinting away
    const track = m.shape === 'zone' ? 0 : 2.4
    foe.face += angDelta(foe.face, angTo(foe.pos, h.pos)) * Math.min(1, dt * track)
    if (m.shape !== 'dash') foe.dir = { x: Math.cos(foe.face), y: Math.sin(foe.face) }
    if (foe.t < tell) return
    foe.beat = 'strike'
    foe.t = 0
    foe.landed = false
    foe.dir = { x: Math.cos(foe.face), y: Math.sin(foe.face) }
    bang(f, 'boom', foe.pos, 0.8, foe.dir, foe.id)
    return
  }

  if (foe.beat === 'strike') {
    if (m.shape === 'dash') {
      const speed = (m.travel ?? 16) / m.strike
      foe.pos = penned({ x: foe.pos.x + foe.dir.x * speed * dt, y: foe.pos.y + foe.dir.y * speed * dt }, foe.size)
    }
    if (!foe.landed && caught(f, foe, m)) {
      foe.landed = true
      strike(f, foe, m)
    }
    if (foe.t < m.strike) return
    foe.hit += 1
    if (m.hits && foe.hit < m.hits) {
      foe.beat = 'gap'
      foe.t = 0
      foe.landed = false
      return
    }
    foe.beat = 'recover'
    foe.t = 0
    return
  }

  if (foe.beat === 'gap') {
    foe.face += angDelta(foe.face, angTo(foe.pos, h.pos)) * Math.min(1, dt * 3)
    if (foe.t < (m.gap ?? 0.24)) return
    foe.beat = 'strike'
    foe.t = 0
    foe.dir = { x: Math.cos(foe.face), y: Math.sin(foe.face) }
    if (m.shape === 'zone' && foe.mark) foe.mark = { x: h.pos.x, y: h.pos.y }
    bang(f, 'boom', foe.pos, 0.6, foe.dir, foe.id)
    return
  }

  // recover — the only window in the game where a heavy is free
  if (foe.t < m.recover * f.grade.rest) return
  foe.move = null
  foe.beat = 'recover'
  foe.t = 0.35 + Math.random() * 0.5
}

/** Is the player inside this move's shape right now? */
function caught(f: Fight, foe: Foe, m: MoveDef): boolean {
  const h = f.hero
  const d = dist(foe.pos, h.pos)
  const a = angTo(foe.pos, h.pos)
  const half = ((m.arc ?? 40) * Math.PI) / 180
  switch (m.shape) {
    case 'cone':
      return d < m.reach + foe.size && Math.abs(angDelta(foe.face, a)) < half
    case 'line':
      return d < m.reach && Math.abs(angDelta(foe.face, a)) < half * (1 + 4 / Math.max(4, d))
    case 'nova':
      return d < m.reach
    case 'ring':
      return d > (m.inner ?? 8) && d < m.reach
    case 'dash':
      return d < m.reach + foe.size
    case 'zone':
      return foe.mark ? dist(foe.mark, h.pos) < m.reach : false
  }
}

/** It landed. Armour, invincibility, curses and the perfect-dodge reward. */
function strike(f: Fight, foe: Foe, m: MoveDef): void {
  const h = f.hero
  if (h.act === 'dead') return

  // THE moment the whole game is built around: the hitbox found you and you
  // were already rolling. Bullet-time, stamina back, and Overclock.
  if (h.iframes > 0) {
    f.perfect += 1
    f.slow = SLOW_TIME
    h.over = OVER_TIME
    h.stam = Math.min(MAX_STAM, h.stam + 26)
    bang(f, 'perfect', h.pos, 1, foe.dir, 'hero')
    return
  }

  // still on the floor from the last one: the rest of a combo washes over you
  // and pays nothing, because you did not do anything to earn it
  if (h.hurt > 0) return

  const raw = m.dmg * f.grade.dmg
  const soak = 100 / (100 + f.stats.def)
  const dealt = raw * soak
  h.hp -= dealt
  h.hurt = 0.45 // a moment down, so a 3-hit combo cannot simply delete you
  h.act = 'idle'
  h.beat = 'recover'
  h.charge = 0
  h.chain = 0
  // knocked back, which is what stops a wall-corner from being a death sentence
  h.vel = { x: foe.dir.x * 20, y: foe.dir.y * 20 }
  bang(f, 'hit', h.pos, clamp(dealt / 30, 0.4, 1), foe.dir, 'hero')

  // Lycaon's last fang. The one thing in this game you do not get back.
  if (m.curse && !f.scar) {
    const open = PARTS.filter((p) => !f.scarred.includes(p))
    if (open.length && Math.random() * 100 > f.stats.curseRes) {
      f.scar = open[Math.floor(Math.random() * open.length)]
      shout(f, 'SCARRED')
      say(f, 'curse')
      bang(f, 'curse', h.pos, 1)
    }
  }

  if (h.hp <= 0) {
    h.hp = 0
    h.act = 'dead'
    f.phase = 'lost'
    f.how = 'died'
    shout(f, 'YOU DIED')
    bang(f, 'die', h.pos, 1)
  }
}

// --- the arena ---------------------------------------------------------------

/**
 * Ley-vents. The pack fight's real answer: a vent kills a hound outright and
 * teaches the survivors nothing, which is the entire point of a C-list boss
 * that adapts. They will take a third of your health too, so "stand on it and
 * hope" is not a plan.
 */
function vents(f: Fight, dt: number): void {
  for (const v of f.vents) {
    v.t -= dt
    if (v.t > 0) {
      if (v.state === 'blow') {
        for (const foe of f.foes) {
          if (foe.hp <= 0 || dist(foe.pos, v.pos) > v.r + foe.size * 0.5) continue
          foe.hp = 0
          bang(f, 'die', foe.pos, 1)
        }
        const h = f.hero
        if (h.iframes <= 0 && h.hurt <= 0 && h.act !== 'dead' && dist(h.pos, v.pos) < v.r) {
          h.hp -= 26 * f.grade.dmg * (100 / (100 + f.stats.def)) * dt * 3
          h.hurt = 0.5
          bang(f, 'hit', h.pos, 0.9)
          if (h.hp <= 0) {
            h.hp = 0
            h.act = 'dead'
            f.phase = 'lost'
            f.how = 'died'
            shout(f, 'YOU DIED')
          }
        }
      }
      continue
    }
    if (v.state === 'cold') {
      v.state = 'warn'
      v.t = 1.25 * f.grade.tell
      say(f, 'vent')
      bang(f, 'tell', v.pos, 0.4)
    } else if (v.state === 'warn') {
      v.state = 'blow'
      v.t = 0.55
      bang(f, 'vent', v.pos, 1)
    } else {
      v.state = 'cold'
      v.t = 4.5 + Math.random() * 2.5
    }
  }
}

/** Clear the dead, and see whether it is over. */
function cleanup(f: Fight): void {
  const before = f.foes.length
  f.foes = f.foes.filter((x) => x.hp > 0)
  if (f.foes.length !== before && f.def.pack) {
    const left = f.foes.filter((x) => x.kind === 'pack').length
    if (left === 1) say(f, 'last')
  }
  const boss = f.foes.find((x) => x.kind === 'boss')
  if (boss && boss.hp / boss.maxHp < 0.15) say(f, 'low')
  const alive = f.foes.filter((x) => x.kind !== 'pup')
  if (alive.length) return
  f.phase = 'won'
  f.how = 'slain'
  shout(f, f.def.pack ? 'PACK CLEARED' : `${f.def.name.toUpperCase()} SLAIN`)
}

// --- afterwards --------------------------------------------------------------

/**
 * What the hunt paid out. Luck moves the rare rolls and nothing else — which is
 * exactly why it is hidden: you are meant to notice it, not read it.
 */
export function settle(f: Fight): FightResult {
  const won = f.phase === 'won'
  const drops: string[] = []
  if (won) {
    for (const d of f.def.drops) {
      const luck = d.chance >= 1 ? 1 : d.chance * (1 + f.stats.luck / 55)
      const n = d.n ?? 1
      for (let i = 0; i < n; i++) if (Math.random() < luck) drops.push(d.id)
    }
  }
  return {
    bossId: f.def.id,
    won,
    how: f.how ?? 'died',
    seconds: Math.round(f.seconds),
    // what this hunt actually cost the blade, measured from what it came in with
    wear: Math.max(0, f.startDur - f.hero.dur),
    drops,
    scar: f.scar,
    hits: f.hits,
    perfect: f.perfect,
    bounty: won ? f.def.bounty : 0,
  }
}

/** How far you can see. Lycaon's night is a real mechanic, not a filter. */
export function sight(f: Fight): number {
  const boss = f.foes.find((x) => x.kind === 'boss')
  if (!f.def.nightAt || !boss || boss.phase < f.def.nightAt) return 0
  return 22
}
