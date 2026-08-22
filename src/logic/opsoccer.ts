// ⚽ One Piece Soccer League (§21j) — the match engine.
//
// A top-down 6-a-side arcade football game, in the spirit of Blue Lock Rivals:
// you control ONE player, everyone else is a bot, and the ball is fought over
// rather than politely shared. The engine is pure state + a fixed step, so the
// screen only ever draws what `step()` produced — no game logic lives in React.
//
// The pitch is 100 × 64 units, goals in the middle of each end. Everything below
// is in those units; the canvas scales them to whatever the phone gives us.

export const PITCH = { w: 100, h: 64 }
export const GOAL = { width: 18, depth: 2 }
/** Two halves. Short, because it's a phone. */
export const HALF_SECONDS = 90

export type Role = 'GK' | 'CB' | 'CM' | 'CF' | 'LW' | 'RW'
export const ROLES: Role[] = ['GK', 'CB', 'CM', 'CF', 'LW', 'RW']
export const ROLE_NAMES: Record<Role, string> = {
  GK: 'Goalkeeper',
  CB: 'Centre-back',
  CM: 'Midfielder',
  CF: 'Striker',
  LW: 'Left wing',
  RW: 'Right wing',
}

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

// --- the squad ---------------------------------------------------------------

/** Six on the pitch, two on the bench: eight per team, exactly as asked. */
export const SQUAD_SIZE = 8
export const ON_PITCH = 6

export interface Vec {
  x: number
  y: number
}

export interface Player {
  id: string
  side: 0 | 1 // 0 = you attack right, 1 = attacks left
  role: Role
  name: string
  pos: Vec
  vel: Vec
  /** The human's player. Everyone else runs on the bot brain. */
  human: 0 | 1 | null // which controller, if any
  /** Ticks of dribble burst left — faster, and can't be tackled. */
  burst: number
  /** Ticks before this player may take the ball again (stops instant re-steals). */
  cooldown: number
  /** 1 → fresh, 0.55 → running on empty. Draining is what makes a bench matter. */
  stamina: number
  /** On the bench: no position on the pitch until they come on. */
  bench: boolean
}

export interface Ball {
  pos: Vec
  vel: Vec
  /** Player id in possession, or null when it's loose. */
  owner: string | null
}

export type Phase = 'kickoff' | 'live' | 'goal' | 'half' | 'over'

export interface Match {
  home: TeamDef
  away: TeamDef
  players: Player[]
  ball: Ball
  score: [number, number]
  /** Seconds left in this half. */
  clock: number
  half: 1 | 2
  phase: Phase
  /** Frames the current non-live phase still has to run. */
  wait: number
  /** Which side kicks off / restarts. */
  restartFor: 0 | 1
  /** Last thing worth shouting about. */
  event: string | null
  /** Two-player: the second human's player id, when there is one. */
  twoPlayer: boolean
}

/** Where each role stands when their team has the ball / doesn't, as a share of the pitch. */
const FORMATION: Record<Role, { att: Vec; def: Vec }> = {
  GK: { att: { x: 0.08, y: 0.5 }, def: { x: 0.05, y: 0.5 } },
  CB: { att: { x: 0.34, y: 0.5 }, def: { x: 0.2, y: 0.5 } },
  CM: { att: { x: 0.55, y: 0.5 }, def: { x: 0.38, y: 0.5 } },
  LW: { att: { x: 0.72, y: 0.2 }, def: { x: 0.45, y: 0.25 } },
  RW: { att: { x: 0.72, y: 0.8 }, def: { x: 0.45, y: 0.75 } },
  CF: { att: { x: 0.85, y: 0.5 }, def: { x: 0.55, y: 0.5 } },
}

/** Mirror a home-side spot for the away team. */
function spot(side: 0 | 1, s: { x: number; y: number }): Vec {
  return { x: side === 0 ? s.x * PITCH.w : PITCH.w - s.x * PITCH.w, y: s.y * PITCH.h }
}

export interface SquadPick {
  /** Role the human takes. */
  mine: Role
  /** Names for the eight, in role order then the two subs. */
  names?: string[]
}

const BOT_NAMES = ['Rook', 'Blaze', 'Fang', 'Echo', 'Storm', 'Vega', 'Iron', 'Quill']

function squadFor(side: 0 | 1, team: TeamDef, human: 0 | 1 | null, myRole: Role | null): Player[] {
  const starters = ROLES.map((role, i) => ({
    id: `${side}-${role}`,
    side,
    role,
    name: `${BOT_NAMES[i]} ${team.emoji}`,
    pos: spot(side, FORMATION[role].def),
    vel: { x: 0, y: 0 },
    human: (human !== null && role === myRole ? human : null) as 0 | 1 | null,
    burst: 0,
    cooldown: 0,
    stamina: 1,
    bench: false,
  }))
  // two on the bench, exactly like the real squad: a defender and a forward, so
  // whichever way the game is going there is someone to bring on
  const subs: Player[] = (['CB', 'CF'] as Role[]).map((role, i) => ({
    id: `${side}-sub${i}`,
    side,
    role,
    name: `${BOT_NAMES[6 + i]} ${team.emoji}`,
    pos: { x: -10, y: -10 },
    vel: { x: 0, y: 0 },
    human: null,
    burst: 0,
    cooldown: 0,
    stamina: 1,
    bench: true,
  }))
  return [...starters, ...subs]
}

/** The eleven-a-side ritual, six-a-side: bring a fresh pair of legs on at the break. */
export function makeSub(m: Match, side: 0 | 1, offId: string, onId: string): void {
  const off = m.players.find((p) => p.id === offId && p.side === side && !p.bench)
  const on = m.players.find((p) => p.id === onId && p.side === side && p.bench)
  if (!off || !on || off.role === 'GK') return
  on.bench = false
  on.role = off.role
  on.human = off.human
  on.pos = { ...off.pos }
  on.stamina = 1
  off.bench = true
  off.human = null
  off.pos = { x: -10, y: -10 }
  if (m.ball.owner === off.id) m.ball.owner = on.id
}

export const onPitch = (m: Match, side: 0 | 1) => m.players.filter((p) => p.side === side && !p.bench)
export const onBench = (m: Match, side: 0 | 1) => m.players.filter((p) => p.side === side && p.bench)

export function kickoffPositions(m: Match, forSide: 0 | 1): void {
  for (const p of m.players) {
    if (p.bench) continue
    p.pos = spot(p.side, FORMATION[p.role].def)
    p.vel = { x: 0, y: 0 }
    p.burst = 0
    p.cooldown = 0
  }
  const taker = m.players.find((p) => p.side === forSide && p.role === 'CF' && !p.bench)
  m.ball = { pos: { x: PITCH.w / 2, y: PITCH.h / 2 }, vel: { x: 0, y: 0 }, owner: taker?.id ?? null }
  if (taker) taker.pos = { x: PITCH.w / 2 - (forSide === 0 ? 2 : -2), y: PITCH.h / 2 }
  m.restartFor = forSide
}

export function newMatch(opts: {
  home: TeamDef
  away: TeamDef
  myRole: Role
  /** Role the second human takes on the away team — same-phone head-to-head. */
  theirRole?: Role | null
}): Match {
  const twoPlayer = !!opts.theirRole
  const m: Match = {
    home: opts.home,
    away: opts.away,
    players: [
      ...squadFor(0, opts.home, 0, opts.myRole),
      ...squadFor(1, opts.away, twoPlayer ? 1 : null, opts.theirRole ?? null),
    ],
    ball: { pos: { x: PITCH.w / 2, y: PITCH.h / 2 }, vel: { x: 0, y: 0 }, owner: null },
    score: [0, 0],
    clock: HALF_SECONDS,
    half: 1,
    phase: 'kickoff',
    wait: 90,
    restartFor: 0,
    event: 'Kick off!',
    twoPlayer,
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

/** The centre of the goal a side is attacking. */
export function targetGoal(side: 0 | 1): Vec {
  return { x: side === 0 ? PITCH.w : 0, y: PITCH.h / 2 }
}

// --- the tick ----------------------------------------------------------------

export interface Input {
  /** Stick vector, already clamped to the unit circle. */
  move: Vec
  shoot: boolean
  pass: boolean
  dribble: boolean
  /** "Give me the ball" — the teammate holding it passes to you. */
  call: boolean
}

const SPEED = 26 // units per second
const BURST_SPEED = 38
const FRICTION = 0.985

const noInput = (): Input => ({ move: { x: 0, y: 0 }, shoot: false, pass: false, dribble: false, call: false })

/**
 * One frame. `dt` is seconds; the caller passes the real frame time so the game
 * runs the same on a 60 Hz phone and a 120 Hz one.
 */
export function step(m: Match, inputs: [Input, Input], dt: number): Match {
  if (m.phase === 'over') return m

  // non-live phases just count down and then restart play
  if (m.phase !== 'live') {
    m.wait -= 1
    if (m.wait <= 0) {
      if (m.phase === 'half') {
        m.half = 2
        m.clock = HALF_SECONDS
        kickoffPositions(m, 1)
        m.phase = 'kickoff'
        m.wait = 60
        m.event = 'Second half'
      } else {
        m.phase = 'live'
        m.event = null
      }
    }
    if (m.phase !== 'live') return m
  }

  m.clock -= dt
  if (m.clock <= 0) {
    if (m.half === 1) {
      m.phase = 'half'
      m.wait = 90
      m.event = 'Half time'
    } else {
      m.phase = 'over'
      m.event = 'Full time'
    }
    return m
  }

  const owner = m.players.find((p) => p.id === m.ball.owner) ?? null

  for (const p of m.players) {
    if (p.bench) {
      p.stamina = Math.min(1, p.stamina + 0.02 * dt) // a breather on the bench
      continue
    }
    p.burst = Math.max(0, p.burst - 1)
    p.cooldown = Math.max(0, p.cooldown - 1)
    const input = p.human !== null ? inputs[p.human] : noInput()
    const wish = p.human !== null ? humanWish(p, input) : botWish(m, p, owner)
    // legs go: a tired player is a fifth slower, which is exactly when a sub wins a game
    p.stamina = clamp(p.stamina - (len(wish) > 0.1 ? 0.012 : -0.006) * dt, 0.55, 1)
    const speed = (p.burst > 0 ? BURST_SPEED : SPEED) * (p.role === 'GK' ? 0.9 : 1) * p.stamina
    p.vel = { x: wish.x * speed, y: wish.y * speed }
    p.pos = {
      x: clamp(p.pos.x + p.vel.x * dt, 1, PITCH.w - 1),
      y: clamp(p.pos.y + p.vel.y * dt, 1, PITCH.h - 1),
    }
  }

  // the ball: carried, or rolling
  if (owner) {
    const dir = owner.vel.x || owner.vel.y ? norm(owner.vel) : { x: owner.side === 0 ? 1 : -1, y: 0 }
    m.ball.pos = { x: owner.pos.x + dir.x * 1.6, y: owner.pos.y + dir.y * 1.6 }
    m.ball.vel = { x: 0, y: 0 }
  } else {
    m.ball.pos = { x: m.ball.pos.x + m.ball.vel.x * dt, y: m.ball.pos.y + m.ball.vel.y * dt }
    m.ball.vel = { x: m.ball.vel.x * FRICTION, y: m.ball.vel.y * FRICTION }
  }

  // actions for whoever is under human control
  for (const p of m.players) {
    if (p.human === null) continue
    const input = inputs[p.human]
    if (input.dribble && p.burst === 0 && p.cooldown === 0) {
      p.burst = 36
      p.cooldown = 30
    }
    if (m.ball.owner === p.id) {
      if (input.shoot) shoot(m, p, 62)
      else if (input.pass) passTo(m, p)
    } else if (input.call) {
      const mate = m.players.find((x) => x.id === m.ball.owner && x.side === p.side && x.human === null)
      if (mate) kick(m, mate, norm(sub(p.pos, mate.pos)), 40)
    }
  }

  // bots with the ball decide
  if (owner && owner.human === null) botOnBall(m, owner)

  possession(m)
  goalsAndLines(m)
  return m
}

function humanWish(_p: Player, input: Input): Vec {
  const l = len(input.move)
  return l > 1 ? norm(input.move) : input.move
}

/** Where a bot wants to be: chase the ball, or hold the shape. */
function botWish(m: Match, p: Player, owner: Player | null): Vec {
  const attacking = owner ? owner.side === p.side : false
  const home = spot(p.side, FORMATION[p.role][attacking ? 'att' : 'def'])
  // the ball drags the whole shape sideways, the way a real team shuffles across
  const target: Vec = { x: home.x, y: home.y * 0.55 + m.ball.pos.y * 0.45 }

  if (p.role === 'GK') {
    const line = p.side === 0 ? 4 : PITCH.w - 4
    return steer(p, { x: line, y: clamp(m.ball.pos.y, PITCH.h / 2 - GOAL.width / 2, PITCH.h / 2 + GOAL.width / 2) })
  }

  const ballIsLoose = !owner
  const nearest = nearestTo(m, m.ball.pos, p.side)
  const iAmClosest = nearest?.id === p.id
  if ((ballIsLoose || !attacking) && iAmClosest) return steer(p, m.ball.pos)
  if (!attacking && dist(p.pos, m.ball.pos) < 22 && owner && owner.side !== p.side) return steer(p, owner.pos)
  return steer(p, target)
}

function steer(p: Player, to: Vec): Vec {
  const d = sub(to, p.pos)
  return len(d) < 1 ? { x: 0, y: 0 } : norm(d)
}

function nearestTo(m: Match, at: Vec, side: 0 | 1): Player | null {
  let best: Player | null = null
  let bd = Infinity
  for (const p of m.players) {
    if (p.side !== side || p.bench || p.role === 'GK') continue
    const d = dist(p.pos, at)
    if (d < bd) {
      bd = d
      best = p
    }
  }
  return best
}

/** The bot's decision tree: shoot if you can, pass if you're pressed, else run at them. */
function botOnBall(m: Match, p: Player): void {
  const goal = targetGoal(p.side)
  const toGoal = dist(p.pos, goal)
  const pressure = m.players.some((o) => o.side !== p.side && !o.bench && dist(o.pos, p.pos) < 4.5)
  const skill = (p.side === 0 ? m.home : m.away).strength

  if (toGoal < 26 && Math.random() < 0.05 * skill) {
    shoot(m, p, 58)
    return
  }
  if (pressure && Math.random() < 0.08) {
    passTo(m, p)
    return
  }
  if (pressure && Math.random() < 0.02 * skill) {
    p.burst = 30
    return
  }
}

/** The best teammate to give it to: ahead of you, and not marked. */
function passTo(m: Match, p: Player): void {
  const mates = m.players.filter((x) => x.side === p.side && !x.bench && x.id !== p.id && x.role !== 'GK')
  let best: Player | null = null
  let bestScore = -Infinity
  for (const mate of mates) {
    const forward = (mate.pos.x - p.pos.x) * (p.side === 0 ? 1 : -1)
    const marked = m.players.some((o) => o.side !== p.side && !o.bench && dist(o.pos, mate.pos) < 4)
    const far = dist(mate.pos, p.pos)
    const score = forward * 1.4 - far * 0.35 - (marked ? 14 : 0)
    if (score > bestScore) {
      bestScore = score
      best = mate
    }
  }
  if (!best) return
  kick(m, p, norm(sub(best.pos, p.pos)), clamp(dist(best.pos, p.pos) * 2.4, 26, 60))
}

function shoot(m: Match, p: Player, power: number): void {
  const goal = targetGoal(p.side)
  // aim at a random spot inside the frame, so shots aren't all down the middle
  const aim: Vec = { x: goal.x, y: goal.y + (Math.random() - 0.5) * (GOAL.width - 3) }
  kick(m, p, norm(sub(aim, p.pos)), power)
}

function kick(m: Match, p: Player, dir: Vec, power: number): void {
  if (m.ball.owner !== p.id) return
  m.ball.owner = null
  m.ball.pos = { x: p.pos.x + dir.x * 2, y: p.pos.y + dir.y * 2 }
  m.ball.vel = { x: dir.x * power, y: dir.y * power }
  p.cooldown = 18 // you can't kick it and instantly take it back
}

/** Who has it now: nearest body wins, unless the carrier is mid-burst. */
function possession(m: Match): void {
  const owner = m.players.find((x) => x.id === m.ball.owner) ?? null
  if (owner && owner.burst > 0) return

  for (const p of m.players) {
    if (p.bench || p.cooldown > 0 || p.id === m.ball.owner) continue
    const reach = p.role === 'GK' ? 3.2 : 2.2
    if (dist(p.pos, m.ball.pos) > reach) continue
    if (owner && owner.side === p.side) continue // teammates don't rob each other
    if (owner) {
      // a tackle is a coin flip weighted by who is moving faster
      const win = 0.55 + (len(p.vel) - len(owner.vel)) / 120
      if (Math.random() > win) continue
      owner.cooldown = 14
    }
    m.ball.owner = p.id
    m.ball.vel = { x: 0, y: 0 }
    return
  }
}

function goalLine(m: Match, side: 0 | 1): boolean {
  const y = m.ball.pos.y
  return Math.abs(y - PITCH.h / 2) < GOAL.width / 2 && (side === 0 ? m.ball.pos.x >= PITCH.w : m.ball.pos.x <= 0)
}

function goalsAndLines(m: Match): void {
  // a goal for side 0 is at x = w, for side 1 at x = 0
  if (goalLine(m, 0) || goalLine(m, 1)) {
    const scorer: 0 | 1 = goalLine(m, 0) ? 0 : 1
    m.score[scorer] += 1
    m.phase = 'goal'
    m.wait = 100
    m.event = `GOAL — ${(scorer === 0 ? m.home : m.away).name}!`
    kickoffPositions(m, scorer === 0 ? 1 : 0)
    return
  }

  const out =
    m.ball.pos.x < 0 || m.ball.pos.x > PITCH.w || m.ball.pos.y < 0 || m.ball.pos.y > PITCH.h
  if (!out) return

  // out of play: the other side gets it back where it left, no throw-in animation
  const last = m.players.find((p) => p.id === m.ball.owner)
  const to: 0 | 1 = last ? (last.side === 0 ? 1 : 0) : m.restartFor
  const taker = nearestTo(m, m.ball.pos, to)
  m.ball.pos = {
    x: clamp(m.ball.pos.x, 2, PITCH.w - 2),
    y: clamp(m.ball.pos.y, 2, PITCH.h - 2),
  }
  m.ball.vel = { x: 0, y: 0 }
  m.ball.owner = taker?.id ?? null
  if (taker) taker.pos = { ...m.ball.pos }
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

  // the rest of the division, played out from strength — same every time, so the
  // table doesn't reshuffle itself every time the screen re-renders
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
