// ⚽ Rivals League (§21j) — the match engine.
//
// A top-down **3v3** arcade football game, built to feel like Blue Lock Rivals:
// three a side and no substitutes, one period, a score limit, a charged shot,
// a slide tackle that has to be aimed, a dash with invincibility frames, a
// signature move that belongs to your Style, and an **ego meter** that fills as
// you play until you can switch on **Flow State**.
//
// The engine is pure state + a fixed step, so the screen only ever draws what
// `step()` produced — no game logic lives in React. Every timer below is in
// SECONDS and advanced by `dt`, so a 120 Hz phone plays the same game as a 60 Hz
// one.
//
// The pitch is 96 × 60 units, goals in the middle of each end.

/** One period, whatever the format. */
export const MATCH_SECONDS = 180
/** Goal depth is the same everywhere; the WIDTH comes from the format. */
export const GOAL = { depth: 2 }

export type Role = 'GK' | 'DF' | 'MF' | 'WG' | 'FW'
export const ROLE_NAMES: Record<Role, string> = {
  GK: 'Keeper',
  DF: 'Defender',
  MF: 'Midfielder',
  WG: 'Winger',
  FW: 'Striker',
}

export interface Vec {
  x: number
  y: number
}

/** How many a side, and everything that follows from it. */
export type TeamSize = 3 | 4 | 5

/** A width and a height, in pitch units. */
export interface Size {
  w: number
  h: number
}

export interface FormatDef {
  size: TeamSize
  label: string
  what: string
  /** Who's on the pitch, in this order. */
  roles: Role[]
  /**
   * The arena. It grows with the format — five a side on the 3v3 pitch is a
   * scrum, and three a side on the 5v5 pitch is a hike.
   */
  pitch: Size
  /** Goal width. Wider pitch, wider goal, so the game doesn't get stingier as it grows. */
  goal: number
  /** First to this many wins it there and then. */
  limit: number
}

/**
 * Rivals runs small-sided games; these are the three it offers. The pitch is
 * kept deliberately tight in every one of them — the players have to stay big
 * enough to read on a phone.
 */
export const FORMATS: Record<TeamSize, FormatDef> = {
  3: {
    size: 3,
    label: '3v3',
    what: 'quick and end-to-end',
    roles: ['GK', 'MF', 'FW'],
    pitch: { w: 72, h: 44 },
    goal: 14,
    limit: 4,
  },
  4: {
    size: 4,
    label: '4v4',
    what: 'a defender to beat',
    roles: ['GK', 'DF', 'MF', 'FW'],
    pitch: { w: 84, h: 50 },
    goal: 16,
    limit: 5,
  },
  5: {
    size: 5,
    label: '5v5',
    what: 'wingers, and room to run',
    roles: ['GK', 'DF', 'MF', 'WG', 'FW'],
    pitch: { w: 96, h: 56 },
    goal: 18,
    limit: 5,
  },
}

export const TEAM_SIZES: TeamSize[] = [3, 4, 5]

/** Every shirt that exists, biggest format first — what the Squad picker offers. */
export const ALL_ROLES: Role[] = ['GK', 'DF', 'MF', 'WG', 'FW']

/**
 * The role you saved, folded onto one that exists in the format you're about to
 * play — and old six-a-side saves (CB/CM/LW/RW) folded on first.
 */
export function normalizeRole(r: string | undefined | null, size: TeamSize = 5): Role {
  const legacy: Record<string, Role> = { CB: 'DF', CM: 'MF', CF: 'FW', LW: 'WG', RW: 'WG' }
  let role = (legacy[r ?? ''] ?? (r as Role)) || 'FW'
  if (!ROLE_NAMES[role]) role = 'FW'
  const roles = FORMATS[size].roles
  if (roles.includes(role)) return role
  // no winger in a small format, and no dedicated defender in a 3v3
  if (role === 'WG') return roles.includes('FW') ? 'FW' : 'MF'
  if (role === 'DF') return 'MF'
  return 'FW'
}

// --- styles ------------------------------------------------------------------

export type StyleId = 'striker' | 'speedster' | 'trapper' | 'emperor' | 'vision'

/**
 * A Style is who you are on the pitch: a stat profile plus one signature move on
 * the ABILITY button. Rivals rolls these; here you simply pick one, because a
 * gacha is not what a nine-year-old needs before a game of football.
 */
export interface StyleDef {
  id: StyleId
  name: string
  emoji: string
  /** The signature move's name — printed on the button. */
  move: string
  what: string
  /** Running speed multiplier. */
  speed: number
  /** Shot power multiplier. */
  power: number
  /** How hard you are to rob. */
  control: number
  /** Seconds before the move comes back. */
  cooldown: number
  /** Hair, for the little figure on the pitch — Blue Lock's whole cast is dyed. */
  hair: string
}

export const STYLES: StyleDef[] = [
  {
    id: 'striker',
    hair: '#c62828',
    name: 'Striker',
    emoji: '⚡',
    move: 'DIRECT',
    what: 'Direct Shot — a full-power strike with no wind-up at all.',
    speed: 1,
    power: 1.15,
    control: 1,
    cooldown: 6,
  },
  {
    id: 'speedster',
    hair: '#e5484d',
    name: 'Speedster',
    emoji: '💨',
    move: 'BLAST',
    what: 'Accelerate — a long dash straight through anyone in the way.',
    speed: 1.14,
    power: 0.92,
    control: 1,
    cooldown: 5,
  },
  {
    id: 'trapper',
    hair: '#f2f2f2',
    name: 'Trapper',
    emoji: '🧲',
    move: 'TRAP',
    what: 'Trap — drags any loose ball nearby onto your foot, first touch perfect.',
    speed: 0.96,
    power: 1,
    control: 1.25,
    cooldown: 6,
  },
  {
    id: 'emperor',
    hair: '#f4d35e',
    name: 'Emperor',
    emoji: '👑',
    move: 'IMPACT',
    what: 'Impact — a rocket that scores from anywhere on the pitch.',
    speed: 0.95,
    power: 1.4,
    control: 1,
    cooldown: 10,
  },
  {
    id: 'vision',
    hair: '#2b3a67',
    name: 'Vision',
    emoji: '👁️',
    move: 'META',
    what: 'Metavision — six seconds where every pass finds a runner and your legs never tire.',
    speed: 1.05,
    power: 1,
    control: 1.15,
    cooldown: 12,
  },
]

export const styleById = (id: string | undefined | null): StyleDef =>
  STYLES.find((s) => s.id === id) ?? STYLES[0]

// --- the clubs ---------------------------------------------------------------

export interface TeamDef {
  id: string
  name: string
  emoji: string
  /** Shirt and trim. */
  colors: [string, string]
  /** How good the bots are, 0.8 (kick-and-rush) … 1.2 (frightening). */
  strength: number
}

/** The thirteen. Every one of them plays everyone else once — that's the league. */
export const TEAMS: TeamDef[] = [
  { id: 'straws', name: "Straw's FC", emoji: '🏴‍☠️', colors: ['#d70000', '#ffce00'], strength: 1.15 },
  { id: 'monsters', name: 'The Monsters', emoji: '👹', colors: ['#7b2ff7', '#2a0a4a'], strength: 1.2 },
  { id: 'knights', name: 'The Knights', emoji: '🛡️', colors: ['#c0c6d0', '#2b3440'], strength: 1.1 },
  { id: 'champs', name: 'The Champs', emoji: '🏆', colors: ['#ffce00', '#8a5a00'], strength: 1.1 },
  { id: 'warriors', name: 'The Warriors', emoji: '⚔️', colors: ['#ff6a00', '#5a1f00'], strength: 1.05 },
  { id: 'knifes', name: 'The Knifes', emoji: '🔪', colors: ['#e0e6ef', '#8a0f2a'], strength: 1.05 },
  { id: 'bucks', name: 'The Bucks', emoji: '🦌', colors: ['#0a7d3c', '#03301a'], strength: 1.0 },
  { id: 'bears', name: 'The Bears', emoji: '🐻', colors: ['#8b5a2b', '#2b1a0d'], strength: 1.0 },
  { id: 'tiger', name: 'Tiger FC', emoji: '🐯', colors: ['#ff9f1c', '#1a1a1a'], strength: 1.0 },
  { id: 'crow', name: 'Crow FC', emoji: '🐦‍⬛', colors: ['#2b2b3a', '#6f7ba0'], strength: 0.95 },
  { id: 'monks', name: 'The Monks', emoji: '🧘', colors: ['#f0a000', '#7a2b00'], strength: 0.95 },
  { id: 'manfc', name: 'Man FC', emoji: '💪', colors: ['#4aa3ff', '#0b2a52'], strength: 0.9 },
  { id: 'newcastles', name: 'New Castles', emoji: '🏰', colors: ['#f4f4f4', '#1b1b1b'], strength: 0.9 },
]

export const teamById = (id: string) => TEAMS.find((t) => t.id === id)

/** How hard the bots play. The chaos complaint was mostly this. */
export type Difficulty = 'easy' | 'normal' | 'hard'
export const DIFFICULTY: Record<Difficulty, { label: string; skill: number; what: string }> = {
  easy: { label: 'Rookie', skill: 0.72, what: 'they give you room' },
  normal: { label: 'Rival', skill: 1, what: 'a fair game' },
  hard: { label: 'Blue Lock', skill: 1.3, what: 'they hunt the ball' },
}

// --- state -------------------------------------------------------------------

export interface Player {
  id: string
  side: 0 | 1 // 0 attacks right, 1 attacks left
  role: Role
  name: string
  style: StyleId
  pos: Vec
  vel: Vec
  /** Which controller drives this one, if any. */
  human: 0 | 1 | null
  /** 1 → fresh, 0.6 → running on empty. */
  stamina: number
  /** 0…1 — the ego meter. Full, and Flow State is yours. */
  ego: number
  /** Seconds of Flow State left. */
  flow: number
  /** Seconds of dash burst left. */
  dash: number
  /** Seconds before another dash. */
  dashCd: number
  /** Seconds you cannot be tackled or robbed. */
  iframes: number
  /** Seconds before you may touch the ball again. */
  touchCd: number
  /** Seconds before the style move comes back. */
  abilityCd: number
  /** Seconds of a slide still running — committed, and you can't steer. */
  sliding: number
  /** Which way the slide is going. */
  slideDir: Vec
  /** 0…1 shot charge while SHOOT is held. */
  charge: number
  /** Seconds of Metavision left. */
  vision: number
  /** Seconds before this bot may try another tackle. */
  botTackleCd: number
}

export interface Ball {
  pos: Vec
  vel: Vec
  /** Player id in possession, or null when it's loose. */
  owner: string | null
  /** Who a pass is flying to — they get a bigger first touch. */
  target: string | null
  /** Last player to touch it — who gets the credit for a goal. */
  lastTouch: string | null
}

export type Phase = 'kickoff' | 'live' | 'goal' | 'over'

/**
 * Something that just HAPPENED, for the screen to make a noise and a mess
 * about. The engine has no idea what a spark is; it only says where the ball
 * was struck and how hard, and the renderer turns that into shake, sparks and
 * sound. Drained every frame by whoever drew it.
 */
export type FxKind =
  | 'kick'
  | 'shot'
  | 'tackle'
  | 'miss'
  | 'dash'
  | 'ability'
  | 'flow'
  | 'catch'
  | 'goal'

export interface Fx {
  kind: FxKind
  /** Where, in pitch units. */
  at: Vec
  /** Which way it points, when that means anything. */
  dir: Vec
  /** 0…1 — how big a deal it was. Drives shake, sparks and volume. */
  power: number
  /** Whose it was, for the colour. */
  side: 0 | 1
  /** The player it happened to, when there is one. */
  who: string | null
}

export interface Match {
  home: TeamDef
  away: TeamDef
  /** How many a side. */
  size: TeamSize
  /** This match's arena, from the format. */
  pitch: Size
  /** This match's goal width. */
  goalW: number
  /** First to this many ends it. */
  limit: number
  players: Player[]
  ball: Ball
  score: [number, number]
  /** Seconds left. */
  clock: number
  phase: Phase
  /** Seconds the current non-live phase still has to run. */
  wait: number
  restartFor: 0 | 1
  /** Last thing worth shouting about. */
  event: string | null
  /** 'ai' — the other three are bots. 'duo' — Diogo takes one of them, same phone. */
  mode: 'ai' | 'duo'
  /** Bot sharpness, from the difficulty picker. */
  aiSkill: number
  /** Seconds the keeper has been holding on to it. */
  gkHold: number
  /** This frame's bangs, for the renderer. Drained by whoever draws them. */
  fx: Fx[]
}

/** Log a bang. Capped, so a scrum can never flood the renderer. */
function bang(
  m: Match,
  kind: FxKind,
  at: Vec,
  side: 0 | 1,
  power = 0.5,
  dir: Vec = { x: 0, y: 0 },
  who: string | null = null,
): void {
  if (m.fx.length > 24) return
  m.fx.push({ kind, at: { x: at.x, y: at.y }, dir, power: clamp(power, 0, 1), side, who })
}

/**
 * Where each role stands with the ball / without it, as a share of the pitch.
 * The `y` values differ on the attacking side so a bigger team spreads out
 * instead of running the same lane.
 */
const FORMATION: Record<Role, { att: Vec; def: Vec }> = {
  GK: { att: { x: 0.08, y: 0.5 }, def: { x: 0.05, y: 0.5 } },
  DF: { att: { x: 0.32, y: 0.5 }, def: { x: 0.17, y: 0.5 } },
  MF: { att: { x: 0.54, y: 0.36 }, def: { x: 0.3, y: 0.5 } },
  WG: { att: { x: 0.74, y: 0.18 }, def: { x: 0.44, y: 0.24 } },
  FW: { att: { x: 0.82, y: 0.58 }, def: { x: 0.54, y: 0.5 } },
}

/** Mirror a home-side spot for the away team, on this match's pitch. */
function spot(side: 0 | 1, s: Vec, pitch: Size): Vec {
  return { x: side === 0 ? s.x * pitch.w : pitch.w - s.x * pitch.w, y: s.y * pitch.h }
}

const BOT_NAMES = ['Rook', 'Blaze', 'Fang', 'Echo', 'Storm', 'Vega', 'Onyx', 'Kite', 'Ash', 'Nova']
/** What the bots bring, so a bot side isn't five of the same thing. */
const BOT_STYLES: Record<Role, StyleId> = {
  GK: 'trapper',
  DF: 'trapper',
  MF: 'vision',
  WG: 'speedster',
  FW: 'striker',
}

function squadFor(
  side: 0 | 1,
  team: TeamDef,
  human: 0 | 1 | null,
  myRole: Role | null,
  myStyle: StyleId,
  fmt: FormatDef,
): Player[] {
  return fmt.roles.map((role, i) => {
    const mine = human !== null && role === myRole
    return {
      id: `${side}-${role}`,
      side,
      role,
      name: `${BOT_NAMES[side * fmt.size + i]} ${team.emoji}`,
      style: mine ? myStyle : BOT_STYLES[role],
      pos: spot(side, FORMATION[role].def, fmt.pitch),
      vel: { x: 0, y: 0 },
      human: (mine ? human : null) as 0 | 1 | null,
      stamina: 1,
      ego: 0,
      flow: 0,
      dash: 0,
      dashCd: 0,
      iframes: 0,
      touchCd: 0,
      abilityCd: 0,
      sliding: 0,
      slideDir: { x: 0, y: 0 },
      charge: 0,
      vision: 0,
      botTackleCd: 0,
    }
  })
}

export const onPitch = (m: Match, side: 0 | 1) => m.players.filter((p) => p.side === side)

export function kickoffPositions(m: Match, forSide: 0 | 1): void {
  for (const p of m.players) {
    p.pos = spot(p.side, FORMATION[p.role].def, m.pitch)
    p.vel = { x: 0, y: 0 }
    p.dash = 0
    p.dashCd = 0
    p.iframes = 0
    p.touchCd = 0
    p.sliding = 0
    p.charge = 0
  }
  const taker = m.players.find((p) => p.side === forSide && p.role === 'FW')
  m.ball = { pos: { x: m.pitch.w / 2, y: m.pitch.h / 2 }, vel: { x: 0, y: 0 }, owner: taker?.id ?? null, target: null, lastTouch: taker?.id ?? null }
  m.gkHold = 0
  if (taker) taker.pos = { x: m.pitch.w / 2 - (forSide === 0 ? 2 : -2), y: m.pitch.h / 2 }
  m.restartFor = forSide
}

export function newMatch(opts: {
  home: TeamDef
  away: TeamDef
  /** 3, 4 or 5 a side. */
  size: TeamSize
  myRole: Role
  myStyle: StyleId
  /** 'duo' puts a second human on the away team. */
  mode: 'ai' | 'duo'
  theirRole?: Role | null
  theirStyle?: StyleId
  difficulty?: Difficulty
}): Match {
  const fmt = FORMATS[opts.size]
  const duo = opts.mode === 'duo' && !!opts.theirRole
  // whatever was picked, it has to be a shirt this format actually has
  const mine = normalizeRole(opts.myRole, opts.size)
  const theirs = duo ? normalizeRole(opts.theirRole, opts.size) : null
  const m: Match = {
    home: opts.home,
    away: opts.away,
    size: fmt.size,
    pitch: { ...fmt.pitch },
    goalW: fmt.goal,
    limit: fmt.limit,
    players: [
      ...squadFor(0, opts.home, 0, mine, opts.myStyle, fmt),
      ...squadFor(1, opts.away, duo ? 1 : null, theirs, opts.theirStyle ?? 'striker', fmt),
    ],
    ball: { pos: { x: fmt.pitch.w / 2, y: fmt.pitch.h / 2 }, vel: { x: 0, y: 0 }, owner: null, target: null, lastTouch: null },
    score: [0, 0],
    clock: MATCH_SECONDS,
    phase: 'kickoff',
    wait: 1.4,
    restartFor: 0,
    event: 'Kick off!',
    mode: duo ? 'duo' : 'ai',
    aiSkill: DIFFICULTY[opts.difficulty ?? 'normal'].skill,
    gkHold: 0,
    fx: [],
  }
  kickoffPositions(m, 0)
  return m
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

/** The centre of the goal a side is attacking. */
export function targetGoal(side: 0 | 1, pitch: Size): Vec {
  return { x: side === 0 ? pitch.w : 0, y: pitch.h / 2 }
}

// --- input -------------------------------------------------------------------

export interface Input {
  /** Stick vector, clamped to the unit circle. */
  move: Vec
  /** HELD, not tapped: the longer it's down the harder the shot, and it goes on release. */
  shoot: boolean
  /** One-shots — the frame that reads them clears them. */
  pass: boolean
  tackle: boolean
  dash: boolean
  ability: boolean
  flow: boolean
}

export const noInput = (): Input => ({
  move: { x: 0, y: 0 },
  shoot: false,
  pass: false,
  tackle: false,
  dash: false,
  ability: false,
  flow: false,
})

// --- tuning ------------------------------------------------------------------

// Pace. Rivals is arcade football, not a Sunday league: a player crosses this
// pitch in about three and a half seconds, a sprint arrives almost the instant
// the stick moves, and a struck ball CRACKS across the grass. Weight still comes
// from ACCEL — legs ramp up, they don't teleport — but the top end is fast
// enough that the game reads as exciting rather than polite.
export const SPEED = 21 // units per second, flat out
const ACCEL = 78 // units per second², so top speed takes about a quarter of a second
const DASH_SPEED = 38
const SLIDE_SPEED = 44
const FRICTION = 0.995 // per frame at 60 Hz, applied time-correctly below
const DASH_TIME = 0.42
const DASH_COOLDOWN = 1
const SLIDE_TIME = 0.28
const CHARGE_TIME = 0.7 // seconds to a full-power shot
const FLOW_TIME = 10
const EGO = { pass: 0.09, shot: 0.11, steal: 0.13, goal: 0.4, beat: 0.07 }

/** A per-SECOND chance, so bots decide at the same rate on a 60 Hz phone and a 120 Hz one. */
const chance = (perSecond: number, dt: number) => Math.random() < perSecond * dt

function reward(p: Player, amount: number): void {
  if (p.flow > 0) return // you're already spending it
  p.ego = clamp(p.ego + amount, 0, 1)
}

/** Everything that multiplies a player's legs right now. */
function speedOf(p: Player): number {
  const st = styleById(p.style)
  const base = p.role === 'GK' ? SPEED * 1.04 : SPEED
  return base * st.speed * p.stamina * (p.flow > 0 ? 1.3 : 1) * (p.charge > 0 ? 0.55 : 1)
}

function powerOf(p: Player, charge: number): number {
  const st = styleById(p.style)
  return (40 + 48 * charge) * st.power * (p.flow > 0 ? 1.35 : 1)
}

/** A shot at full tilt, for scaling the noise and the mess a kick makes. */
const TOP_KICK = 100

// --- the tick ----------------------------------------------------------------

/** One frame. `dt` is real seconds, so the game runs the same at any refresh rate. */
export function step(m: Match, inputs: [Input, Input], dt: number): Match {
  if (m.phase === 'over') return m
  m.fx = []

  // kick-off and goal celebrations just hold still and count down
  if (m.phase !== 'live') {
    m.wait -= dt
    if (m.wait > 0) return m
    m.phase = 'live'
    m.event = null
  }

  m.clock -= dt
  if (m.clock <= 0) {
    m.clock = 0
    m.phase = 'over'
    m.event = 'Full time'
    return m
  }

  const owner = m.players.find((p) => p.id === m.ball.owner) ?? null

  // --- timers, then legs
  for (const p of m.players) {
    p.dash = down(p.dash, dt)
    p.dashCd = down(p.dashCd, dt)
    p.iframes = down(p.iframes, dt)
    p.touchCd = down(p.touchCd, dt)
    p.abilityCd = down(p.abilityCd, dt * (p.flow > 0 ? 2 : 1))
    p.sliding = down(p.sliding, dt)
    p.vision = down(p.vision, dt)
    p.botTackleCd = down(p.botTackleCd, dt)
    p.flow = down(p.flow, dt)

    const input = p.human !== null ? inputs[p.human] : noInput()
    const wish = p.sliding > 0 ? p.slideDir : p.human !== null ? humanWish(input) : botWish(m, p, owner)

    // legs go — but never while flowing or under Metavision
    const frozen = p.flow > 0 || p.vision > 0
    const drain = frozen ? -0.05 : len(wish) > 0.1 ? (p.dash > 0 ? 0.05 : 0.016) : -0.08
    p.stamina = clamp(p.stamina - drain * dt, 0.6, 1)

    const speed = p.sliding > 0 ? SLIDE_SPEED : p.dash > 0 ? DASH_SPEED : speedOf(p)
    // legs have weight: steer the velocity toward what the stick asked for
    // rather than teleporting onto it. This alone is most of the calmer feel.
    const want: Vec = { x: wish.x * speed, y: wish.y * speed }
    const grip = p.sliding > 0 ? 400 : p.dash > 0 ? ACCEL * 2.4 : ACCEL
    const dv = sub(want, p.vel)
    const dl = len(dv)
    const grab = grip * dt
    p.vel = dl <= grab ? want : { x: p.vel.x + (dv.x / dl) * grab, y: p.vel.y + (dv.y / dl) * grab }
    p.pos = {
      x: clamp(p.pos.x + p.vel.x * dt, 1.5, m.pitch.w - 1.5),
      y: clamp(p.pos.y + p.vel.y * dt, 1.5, m.pitch.h - 1.5),
    }
  }

  // --- what the humans pressed
  for (const p of m.players) {
    if (p.human === null) continue
    humanActions(m, p, inputs[p.human], dt)
  }

  // --- what the bots decided
  for (const p of m.players) {
    if (p.human !== null) continue
    botActions(m, p, owner, dt)
  }

  // --- the ball: carried, or rolling
  // A ball at eighty units a second covers more than a stride between frames, so
  // possession is tested against the LINE it travelled, not the point it landed.
  let was: Vec = { ...m.ball.pos }
  const carrier = m.players.find((p) => p.id === m.ball.owner) ?? null
  if (carrier) {
    const dir = carrier.vel.x || carrier.vel.y ? norm(carrier.vel) : { x: carrier.side === 0 ? 1 : -1, y: 0 }
    m.ball.pos = { x: carrier.pos.x + dir.x * 1.8, y: carrier.pos.y + dir.y * 1.8 }
    m.ball.vel = { x: 0, y: 0 }
    m.ball.target = null
  } else {
    was = { ...m.ball.pos }
    m.ball.pos = { x: m.ball.pos.x + m.ball.vel.x * dt, y: m.ball.pos.y + m.ball.vel.y * dt }
    const decay = Math.pow(FRICTION, dt * 60)
    m.ball.vel = { x: m.ball.vel.x * decay, y: m.ball.vel.y * decay }
    if (len(m.ball.vel) < 1.2) m.ball.vel = { x: 0, y: 0 }
  }

  possession(m, was)
  keeper(m, dt)
  goalsAndLines(m)
  return m
}

function humanWish(input: Input): Vec {
  const l = len(input.move)
  return l > 1 ? norm(input.move) : input.move
}

// --- human actions -----------------------------------------------------------

function humanActions(m: Match, p: Player, input: Input, dt: number): void {
  // FLOW — the meter is full, so spend it
  if (input.flow && p.ego >= 1 && p.flow <= 0) {
    p.flow = FLOW_TIME
    p.ego = 0
    p.iframes = Math.max(p.iframes, 0.6)
    m.event = `${p.name} — FLOW STATE!`
    bang(m, 'flow', p.pos, p.side, 1, { x: 0, y: 0 }, p.id)
  }

  // the style move
  if (input.ability && p.abilityCd <= 0) fireAbility(m, p)

  // dash: a burst you can't be tackled during
  if (input.dash && p.dash <= 0 && p.dashCd <= 0 && p.sliding <= 0) {
    p.dash = DASH_TIME
    p.dashCd = DASH_TIME + DASH_COOLDOWN
    p.iframes = Math.max(p.iframes, DASH_TIME)
    bang(m, 'dash', p.pos, p.side, 0.7, norm(p.vel), p.id)
    if (m.ball.owner !== p.id) reward(p, EGO.beat * 0.5)
  }

  const hasBall = m.ball.owner === p.id

  if (hasBall) {
    // SHOOT is held: charge while it's down, strike when it lifts
    if (input.shoot) p.charge = Math.min(1, p.charge + dt / CHARGE_TIME)
    else if (p.charge > 0) {
      const c = p.charge
      p.charge = 0
      shoot(m, p, powerOf(p, c))
    }
    if (input.pass) passTo(m, p)
  } else {
    p.charge = 0
    // TACKLE: a committed slide, and missing it costs you a second and a half
    if (input.tackle && p.sliding <= 0 && p.touchCd <= 0) slide(m, p)
  }
}

/** The signature move. One button, five very different things. */
function fireAbility(m: Match, p: Player): void {
  const st = styleById(p.style)
  const hasBall = m.ball.owner === p.id
  p.abilityCd = st.cooldown
  bang(m, 'ability', p.pos, p.side, 1, { x: 0, y: 0 }, p.id)

  switch (st.id) {
    case 'striker': // Direct Shot — full power, no wind-up
      if (hasBall) {
        p.charge = 0
        shoot(m, p, powerOf(p, 1) * 1.05)
        m.event = 'DIRECT SHOT'
      } else p.abilityCd = 0.4
      return
    case 'speedster': { // Accelerate — a long dash through anyone
      bang(m, 'dash', p.pos, p.side, 1, norm(p.vel), p.id)
      p.dash = DASH_TIME * 2.2
      p.dashCd = 0
      p.iframes = Math.max(p.iframes, p.dash)
      m.event = 'ACCELERATE'
      return
    }
    case 'trapper': { // Trap — drag a loose ball onto your foot
      if (!hasBall && !m.ball.owner && dist(p.pos, m.ball.pos) < 11) {
        m.ball.owner = p.id
        m.ball.vel = { x: 0, y: 0 }
        p.iframes = Math.max(p.iframes, 0.7)
        reward(p, EGO.beat)
        m.event = 'TRAP'
      } else if (!hasBall) p.abilityCd = 0.4
      else p.iframes = Math.max(p.iframes, 0.9)
      return
    }
    case 'emperor': // Impact — a rocket from anywhere
      if (hasBall) {
        p.charge = 0
        shoot(m, p, powerOf(p, 1) * 1.3, 0.35)
        m.event = 'IMPACT'
      } else p.abilityCd = 0.4
      return
    case 'vision': // Metavision — perfect passing, and legs that don't tire
      p.vision = 6
      m.event = 'METAVISION'
      return
  }
}

/** A slide tackle. Committed, aimed, and punished when it misses. */
function slide(m: Match, p: Player): void {
  const carrier = m.players.find((x) => x.id === m.ball.owner)
  const toward = carrier && carrier.side !== p.side ? norm(sub(carrier.pos, p.pos)) : m.ball.owner ? { x: 0, y: 0 } : norm(sub(m.ball.pos, p.pos))
  p.sliding = SLIDE_TIME
  p.slideDir = len(toward) ? toward : { x: p.side === 0 ? 1 : -1, y: 0 }

  if (!carrier || carrier.side === p.side) {
    p.touchCd = 0.5 // sliding at nothing: a small penalty
    bang(m, 'miss', p.pos, p.side, 0.4, p.slideDir, p.id)
    return
  }
  if (dist(p.pos, carrier.pos) > 5.5) {
    p.touchCd = 1.4 // miles off — you're on the floor and out of the play
    bang(m, 'miss', p.pos, p.side, 0.4, p.slideDir, p.id)
    return
  }
  if (carrier.iframes > 0 || carrier.dash > 0) {
    p.touchCd = 1.4
    reward(carrier, EGO.beat)
    bang(m, 'miss', p.pos, p.side, 0.6, p.slideDir, p.id)
    return
  }
  // weighted by the carrier's control and by who is actually moving
  const resist = styleById(carrier.style).control
  const win = clamp(0.62 / resist + (len(p.vel) - len(carrier.vel)) / 260, 0.2, 0.9)
  if (Math.random() > win) {
    p.touchCd = 1.4
    reward(carrier, EGO.beat)
    bang(m, 'miss', p.pos, p.side, 0.6, p.slideDir, p.id)
    return
  }
  m.ball.owner = p.id
  m.ball.target = null
  m.ball.lastTouch = p.id
  m.ball.vel = { x: 0, y: 0 }
  p.sliding = 0.12
  p.iframes = Math.max(p.iframes, 0.4)
  carrier.touchCd = 0.9
  carrier.charge = 0
  reward(p, EGO.steal)
  bang(m, 'tackle', carrier.pos, p.side, 1, p.slideDir, p.id)
  m.event = 'Tackle!'
}

// --- bots --------------------------------------------------------------------

/** The one on each side who goes for the ball. Everyone else keeps the shape. */
function presser(m: Match, side: 0 | 1): Player | null {
  let best: Player | null = null
  let bd = Infinity
  for (const p of m.players) {
    if (p.side !== side || p.role === 'GK') continue
    const d = dist(p.pos, m.ball.pos)
    if (d < bd) {
      bd = d
      best = p
    }
  }
  return best
}

/**
 * Where a bot wants to be. Only ONE of them chases; the other holds a shape or
 * makes a run. That single rule is most of what stopped the game being a scrum.
 */
function botWish(m: Match, p: Player, owner: Player | null): Vec {
  if (p.role === 'GK') {
    const line = p.side === 0 ? 4.5 : m.pitch.w - 4.5
    const y = clamp(m.ball.pos.y, m.pitch.h / 2 - m.goalW / 2 + 1, m.pitch.h / 2 + m.goalW / 2 - 1)
    return steer(p, { x: line, y })
  }

  const attacking = owner ? owner.side === p.side : false
  const chaser = presser(m, p.side)
  const iChase = chaser?.id === p.id

  if (owner?.id === p.id) {
    // on the ball: run at the goal, but round the nearest defender rather than into them
    const goal = targetGoal(p.side, m.pitch)
    const marker = nearestOpponent(m, p)
    const away = marker && dist(marker.pos, p.pos) < 6 ? sub(p.pos, marker.pos) : { x: 0, y: 0 }
    return steer(p, { x: goal.x, y: clamp(goal.y * 0.4 + p.pos.y * 0.6 + away.y * 0.8, 4, m.pitch.h - 4) })
  }

  if (!owner && iChase) return steer(p, leadBall(m, p))
  if (owner && owner.side !== p.side) {
    if (iChase) return steer(p, owner.pos)
    // the other one screens the goal rather than piling in
    const goal = targetGoal(p.side === 0 ? 1 : 0, m.pitch)
    return steer(p, { x: (owner.pos.x + goal.x) / 2, y: (owner.pos.y + goal.y) / 2 })
  }

  // our ball, and it isn't mine: make a run into the shape's attacking spot.
  // Each role has its own lane, so a five-a-side team spreads rather than queues.
  if (attacking) {
    const home = spot(p.side, FORMATION[p.role].att, m.pitch)
    return steer(p, { x: home.x, y: clamp(home.y * 0.65 + m.ball.pos.y * 0.35, 5, m.pitch.h - 5) })
  }
  const home = spot(p.side, FORMATION[p.role].def, m.pitch)
  return steer(p, { x: home.x, y: home.y * 0.6 + m.ball.pos.y * 0.4 })
}

/** Run to where the ball is going, not where it is. */
function leadBall(m: Match, p: Player): Vec {
  const t = clamp(dist(p.pos, m.ball.pos) / 18, 0, 0.6)
  return { x: m.ball.pos.x + m.ball.vel.x * t, y: m.ball.pos.y + m.ball.vel.y * t }
}

function steer(p: Player, to: Vec): Vec {
  const d = sub(to, p.pos)
  return len(d) < 1 ? { x: 0, y: 0 } : norm(d)
}

function nearestOpponent(m: Match, p: Player): Player | null {
  let best: Player | null = null
  let bd = Infinity
  for (const o of m.players) {
    if (o.side === p.side || o.role === 'GK') continue
    const d = dist(o.pos, p.pos)
    if (d < bd) {
      bd = d
      best = o
    }
  }
  return best
}

/** What a bot presses. Rate-limited on purpose: a bot that tackles every frame is a wall. */
function botActions(m: Match, p: Player, owner: Player | null, dt: number): void {
  if (p.role === 'GK') return
  const skill = ((p.side === 0 ? m.home : m.away).strength * (p.human === null ? m.aiSkill : 1))

  // spend Flow near the goal, the way a striker would
  if (p.ego >= 1 && p.flow <= 0 && dist(p.pos, targetGoal(p.side, m.pitch)) < 34) {
    p.flow = FLOW_TIME
    p.ego = 0
    m.event = `${p.name} — FLOW STATE!`
    bang(m, 'flow', p.pos, p.side, 1, { x: 0, y: 0 }, p.id)
  }

  if (m.ball.owner === p.id) {
    const goal = targetGoal(p.side, m.pitch)
    const toGoal = dist(p.pos, goal)
    const pressed = m.players.some((o) => o.side !== p.side && o.role !== 'GK' && dist(o.pos, p.pos) < 4.5)

    if (p.abilityCd <= 0 && toGoal < 26 && chance(0.8 * skill, dt)) {
      fireAbility(m, p)
      return
    }
    if (toGoal < 24 && chance(1.4 * skill, dt)) {
      shoot(m, p, powerOf(p, clamp(toGoal / 26, 0.45, 1)))
      return
    }
    if (pressed && chance(2.2, dt)) {
      passTo(m, p)
      return
    }
    if (pressed && p.dash <= 0 && p.dashCd <= 0 && chance(0.9 * skill, dt)) {
      p.dash = DASH_TIME
      p.dashCd = DASH_TIME + DASH_COOLDOWN
      p.iframes = Math.max(p.iframes, DASH_TIME)
      bang(m, 'dash', p.pos, p.side, 0.7, norm(p.vel), p.id)
    }
    return
  }

  // defending: one aimed slide at a time, and only when it's actually on
  if (owner && owner.side !== p.side && p.botTackleCd <= 0 && p.sliding <= 0 && p.touchCd <= 0) {
    if (dist(p.pos, owner.pos) < 4.5 && chance(2.2 * skill, dt)) {
      p.botTackleCd = 1.8 / skill
      slide(m, p)
    }
  }
}

// --- kicking -----------------------------------------------------------------

/** The best teammate to give it to: ahead of you, and not marked. */
function passTo(m: Match, p: Player): void {
  const mates = m.players.filter((x) => x.side === p.side && x.id !== p.id && x.role !== 'GK')
  let best: Player | null = null
  let bestScore = -Infinity
  for (const mate of mates) {
    const forward = (mate.pos.x - p.pos.x) * (p.side === 0 ? 1 : -1)
    const marked = m.players.some((o) => o.side !== p.side && dist(o.pos, mate.pos) < 4)
    const far = dist(mate.pos, p.pos)
    // Metavision ignores the marking: every pass finds a runner
    const score = forward * 1.4 - far * 0.3 - (marked && p.vision <= 0 ? 14 : 0)
    if (score > bestScore) {
      bestScore = score
      best = mate
    }
  }
  if (!best) return
  // lead the pass onto where they're running, so it doesn't die behind them
  const lead: Vec = { x: best.pos.x + best.vel.x * 0.3, y: best.pos.y + best.vel.y * 0.3 }
  kick(m, p, norm(sub(lead, p.pos)), clamp(dist(lead, p.pos) * 2.4, 34, 62))
  m.ball.target = best.id
  reward(p, EGO.pass)
}

/** `curve` bends the shot toward the far post, which is what makes Impact feel like Impact. */
function shoot(m: Match, p: Player, power: number, curve = 0): void {
  const goal = targetGoal(p.side, m.pitch)
  const keeperY = m.players.find((k) => k.side !== p.side && k.role === 'GK')?.pos.y ?? goal.y
  // aim away from the keeper, with a little scatter so it isn't always the same corner
  const away = keeperY > goal.y ? -1 : 1
  const spread = (m.goalW / 2 - 1.5) * (curve ? 0.95 : 0.75)
  const aim: Vec = { x: goal.x, y: goal.y + away * spread * (0.45 + Math.random() * 0.55) }
  kick(m, p, norm(sub(aim, p.pos)), power)
  if (dist(p.pos, goal) < 34) reward(p, EGO.shot)
  m.ball.target = null
}

function kick(m: Match, p: Player, dir: Vec, power: number): void {
  if (m.ball.owner !== p.id) return
  m.ball.owner = null
  m.ball.pos = { x: p.pos.x + dir.x * 2.2, y: p.pos.y + dir.y * 2.2 }
  m.ball.vel = { x: dir.x * power, y: dir.y * power }
  m.ball.lastTouch = p.id
  p.touchCd = 0.35 // you can't kick it and instantly take it back
  bang(m, power > 58 ? 'shot' : 'kick', m.ball.pos, p.side, power / TOP_KICK, dir, p.id)
}

// --- possession, keeper, lines ----------------------------------------------

/**
 * Who has it now. A loose ball goes to whoever reaches it; a ball someone is
 * carrying can ONLY change hands through a tackle. That is the whole anti-chaos
 * rule — no more ping-pong between two bodies standing next to each other.
 */
function possession(m: Match, from: Vec): void {
  if (m.ball.owner) return
  let best: Player | null = null
  let bd = Infinity
  for (const p of m.players) {
    if (p.touchCd > 0) continue
    // the man a pass is aimed at gets a generous first touch; a keeper has hands
    const reach = p.id === m.ball.target ? 4.2 : p.role === 'GK' ? 4.8 : 2.6
    const d = swept(p.pos, from, m.ball.pos)
    if (d > reach || d >= bd) continue
    bd = d
    best = p
  }
  if (!best) return
  const stopped = len(m.ball.vel)
  m.ball.owner = best.id
  m.ball.vel = { x: 0, y: 0 }
  m.ball.lastTouch = best.id
  if (m.ball.target && m.ball.target !== best.id) reward(best, EGO.steal * 0.5)
  m.ball.target = null
  best.iframes = Math.max(best.iframes, 0.35) // a moment to look up
  if (best.role === 'GK' && stopped > 45) bang(m, 'catch', best.pos, best.side, 1, { x: 0, y: 0 }, best.id)
  else if (stopped > 6) bang(m, 'kick', best.pos, best.side, 0.3)
}

/** How close a point came to the segment the ball travelled this frame. */
function swept(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a)
  const l2 = ab.x * ab.x + ab.y * ab.y
  if (l2 < 0.0001) return dist(p, b)
  const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2, 0, 1)
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t })
}

/** The keeper punts it back out rather than standing there holding it. */
function keeper(m: Match, dt: number): void {
  const gk = m.players.find((p) => p.id === m.ball.owner && p.role === 'GK')
  if (!gk) {
    m.gkHold = 0
    return
  }
  m.gkHold += dt
  if (m.gkHold < 0.8) return
  m.gkHold = 0
  if (gk.human !== null) return // a human keeper decides for themselves
  passTo(m, gk)
  if (m.ball.owner === gk.id) kick(m, gk, { x: gk.side === 0 ? 1 : -1, y: (Math.random() - 0.5) * 0.6 }, 54)
}

function goalLine(m: Match, side: 0 | 1): boolean {
  const y = m.ball.pos.y
  return Math.abs(y - m.pitch.h / 2) < m.goalW / 2 && (side === 0 ? m.ball.pos.x >= m.pitch.w : m.ball.pos.x <= 0)
}

function goalsAndLines(m: Match): void {
  if (goalLine(m, 0) || goalLine(m, 1)) {
    const scorer: 0 | 1 = goalLine(m, 0) ? 0 : 1
    m.score[scorer] += 1
    const shooter = m.players.find((p) => p.id === m.ball.lastTouch)
    if (shooter && shooter.side === scorer) reward(shooter, EGO.goal)
    bang(m, 'goal', m.ball.pos, scorer, 1)
    m.event = `GOAL — ${(scorer === 0 ? m.home : m.away).name}!`
    if (m.score[scorer] >= m.limit) {
      m.phase = 'over'
      m.event = `${(scorer === 0 ? m.home : m.away).name} win it — ${m.score[0]}–${m.score[1]}`
      return
    }
    m.phase = 'goal'
    m.wait = 2.2
    kickoffPositions(m, scorer === 0 ? 1 : 0)
    return
  }

  const out = m.ball.pos.x < 0 || m.ball.pos.x > m.pitch.w || m.ball.pos.y < 0 || m.ball.pos.y > m.pitch.h
  if (!out) return

  // out of play: the other side gets it back where it left
  const last = m.players.find((p) => p.id === m.ball.owner)
  const to: 0 | 1 = last ? (last.side === 0 ? 1 : 0) : m.restartFor
  m.ball.pos = { x: clamp(m.ball.pos.x, 2.5, m.pitch.w - 2.5), y: clamp(m.ball.pos.y, 2.5, m.pitch.h - 2.5) }
  m.ball.vel = { x: 0, y: 0 }
  const taker = presser(m, to)
  m.ball.owner = taker?.id ?? null
  m.ball.target = null
  m.ball.lastTouch = taker?.id ?? null
  if (taker) {
    taker.pos = { ...m.ball.pos }
    taker.iframes = Math.max(taker.iframes, 0.8)
  }
  m.event = 'Out of play'
}

// --- the league --------------------------------------------------------------

export interface LeagueResult {
  /** Opponent team id. */
  opp: string
  gf: number
  ga: number
  at: string
}

export interface TableRow {
  team: TeamDef
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
}

/**
 * The table. Your results are real; the other twelve play each other in the
 * background, seeded off their strength, so the league moves whether or not you
 * are the one playing in it.
 */
export function standings(myTeamId: string, results: LeagueResult[]): TableRow[] {
  const rows = new Map<string, TableRow>(
    TEAMS.map((t) => [t.id, { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }]),
  )
  const add = (id: string, gf: number, ga: number) => {
    const r = rows.get(id)
    if (!r) return
    r.played += 1
    r.gf += gf
    r.ga += ga
    if (gf > ga) {
      r.won += 1
      r.points += 3
    } else if (gf === ga) {
      r.drawn += 1
      r.points += 1
    } else r.lost += 1
  }

  for (const res of results) {
    add(myTeamId, res.gf, res.ga)
    add(res.opp, res.ga, res.gf)
  }

  const others = TEAMS.filter((t) => t.id !== myTeamId)
  const beaten = new Set(results.map((r) => r.opp))
  for (const [i, a] of others.entries()) {
    for (const b of others.slice(i + 1)) {
      if (beaten.has(a.id) && beaten.has(b.id)) continue
      const seed = hash(`${a.id}-${b.id}`)
      const ga = Math.floor(((seed % 7) * a.strength) / 2)
      const gb = Math.floor((((seed >> 3) % 7) * b.strength) / 2)
      add(a.id, ga, gb)
      add(b.id, gb, ga)
    }
  }

  return [...rows.values()].sort(
    (x, y) => y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || x.team.name.localeCompare(y.team.name),
  )
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** Who you haven't played yet this season. */
export function fixturesLeft(myTeamId: string, results: LeagueResult[]): TeamDef[] {
  const done = new Set(results.map((r) => r.opp))
  return TEAMS.filter((t) => t.id !== myTeamId && !done.has(t.id))
}
