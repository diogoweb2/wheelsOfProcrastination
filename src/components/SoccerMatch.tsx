// ⚽ Rivals League — the match itself (§21j).
//
// Canvas + a thumbstick + six buttons. React holds nothing but the frame's HUD:
// the engine (logic/opsoccer.ts) owns the state, the loop runs in a ref, and the
// canvas is redrawn every frame. That's what keeps a 3v3 game at 60 fps inside
// a PWA.
import { useEffect, useRef, useState } from 'react'
import {
  GOAL,
  ROLE_NAMES,
  SPEED,
  type Input,
  type Match,
  type Player,
  type Role,
  noInput,
  step,
  styleById,
} from '../logic/opsoccer'
import { rivalsSfx } from '../audio'

/** A stick vector. The engine calls it a Vec; here it is only ever x and y. */
interface Vec2 {
  x: number
  y: number
}

/** What one human needs to see about themselves, refreshed every frame. */
interface Meter {
  ego: number
  flow: number
  charge: number
  abilityCd: number
  stamina: number
  role: Role
  style: string
  move: string
}

const meterOf = (p: Player | undefined): Meter | null =>
  p
    ? {
        ego: p.ego,
        flow: p.flow,
        charge: p.charge,
        abilityCd: p.abilityCd,
        stamina: p.stamina,
        role: p.role,
        style: styleById(p.style).name,
        move: styleById(p.style).move,
      }
    : null

export function SoccerMatch({
  match,
  onDone,
  onQuit,
}: {
  match: Match
  /** Final score, once the whistle goes. */
  onDone: (score: [number, number]) => void
  onQuit: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const game = useRef<Match>(match)
  const inputs = useRef<[Input, Input]>([noInput(), noInput()])
  const [hud, setHud] = useState({
    score: [0, 0] as [number, number],
    clock: match.clock,
    event: match.event,
    over: false,
    mine: meterOf(match.players.find((p) => p.human === 0)),
    theirs: meterOf(match.players.find((p) => p.human === 1)),
  })
  const duo = match.mode === 'duo'
  // where the keyboard is pushing each stick, so the on-screen knob still moves
  const [keyKnob, setKeyKnob] = useState<[Vec2, Vec2]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ])

  // the keyboard: both seats, matched on physical key so any layout works
  useEffect(() => {
    const maps: [Keys, Keys] = [keysFor(0, duo), keysFor(1, duo)]
    const held = new Set<string>()

    const drive = (seat: 0 | 1) => {
      const k = maps[seat]
      const v = {
        x: (k.right.some((c) => held.has(c)) ? 1 : 0) - (k.left.some((c) => held.has(c)) ? 1 : 0),
        y: (k.down.some((c) => held.has(c)) ? 1 : 0) - (k.up.some((c) => held.has(c)) ? 1 : 0),
      }
      const l = Math.hypot(v.x, v.y) || 1
      const move = l > 1 ? { x: v.x / l, y: v.y / l } : v
      inputs.current[seat].move = move
      setKeyKnob((was) => (was[seat].x === move.x && was[seat].y === move.y ? was : (seat === 0 ? [move, was[1]] : [was[0], move])))
    }

    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      for (const seat of [0, 1] as const) {
        if (seat === 1 && !duo) continue
        const k = maps[seat]
        const i = inputs.current[seat]
        if ([...k.up, ...k.down, ...k.left, ...k.right].includes(e.code)) {
          held.add(e.code)
          drive(seat)
          e.preventDefault()
          return
        }
        if (e.code === k.shoot) { i.shoot = true; e.preventDefault(); return }
        if (e.code === k.pass) { i.pass = true; e.preventDefault(); return }
        if (e.code === k.tackle) { i.tackle = true; e.preventDefault(); return }
        if (e.code === k.dash) { i.dash = true; e.preventDefault(); return }
        if (e.code === k.ability) { i.ability = true; e.preventDefault(); return }
        if (e.code === k.flow) { i.flow = true; e.preventDefault(); return }
      }
    }

    const onUp = (e: KeyboardEvent) => {
      for (const seat of [0, 1] as const) {
        if (seat === 1 && !duo) continue
        const k = maps[seat]
        if ([...k.up, ...k.down, ...k.left, ...k.right].includes(e.code)) {
          held.delete(e.code)
          drive(seat)
          return
        }
        // SHOOT is the only held button: letting go is what fires it
        if (e.code === k.shoot) {
          inputs.current[seat].shoot = false
          return
        }
      }
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [duo])

  // the loop: one rAF for the whole match
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const m = step(game.current, inputs.current, dt)
      // the one-shot buttons are consumed by the frame that saw them; SHOOT is
      // held, so it is the one thing here that survives the frame
      for (const i of inputs.current) {
        i.pass = false
        i.tackle = false
        i.dash = false
        i.ability = false
        i.flow = false
      }
      // the engine's bangs are drained here — draw() is what makes the noise
      draw(canvas.current, m, now / 1000, dt)
      setHud({
        score: [...m.score] as [number, number],
        clock: m.clock,
        event: m.event,
        over: m.phase === 'over',
        mine: meterOf(m.players.find((p) => p.human === 0)),
        theirs: meterOf(m.players.find((p) => p.human === 1)),
      })
      if (m.phase !== 'over') raf = requestAnimationFrame(tick)
    }
    resetPaint()
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="ops-wrap">
      <div className="ops-board">
        <span className="ops-side" style={{ ['--kit' as string]: match.home.colors[0] }}>
          <i style={{ background: match.home.colors[0], borderColor: match.home.colors[1] }} />
          <b>{match.home.emoji} {match.home.name}</b>
        </span>
        <span className="ops-score">
          {hud.score[0]}<em>:</em>{hud.score[1]}
          <i>{Math.floor(Math.max(0, hud.clock) / 60)}:{String(Math.floor(Math.max(0, hud.clock) % 60)).padStart(2, '0')}</i>
        </span>
        <span className="ops-side is-away" style={{ ['--kit' as string]: match.away.colors[0] }}>
          <b>{match.away.name} {match.away.emoji}</b>
          <i style={{ background: match.away.colors[0], borderColor: match.away.colors[1] }} />
        </span>
      </div>
      <div className="ops-clock">{match.size}v{match.size} · first to {match.limit} goals</div>

      <div className="ops-pitch-wrap">
        <canvas ref={canvas} className="ops-pitch" width={canvasW(match)} height={canvasH(match)} />
        {hud.event && (
          <div className={`ops-shout ${hud.event.startsWith('GOAL') ? 'is-goal' : ''}`}>
            <span>{hud.event}</span>
          </div>
        )}
      </div>

      {hud.over ? (
        <div className="card" style={{ marginTop: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            {hud.score[0]} – {hud.score[1]}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {hud.score[0] > hud.score[1]
              ? `${match.home.name} win it.`
              : hud.score[0] < hud.score[1]
                ? `${match.away.name} take it.`
                : 'Honours even.'}
          </p>
          <button className="btn btn--blue" style={{ marginTop: 10, width: '100%' }} onClick={() => onDone(hud.score)}>
            Save the result
          </button>
        </div>
      ) : (
        <>
          <Pad
            label={hud.mine ? `You · ${ROLE_NAMES[hud.mine.role]} · ${hud.mine.style}` : 'You'}
            meter={hud.mine}
            input={inputs.current[0]}
            keys={keysFor(0, duo)}
            keyKnob={keyKnob[0]}
          />
          {duo && hud.theirs && (
            <Pad
              label={`Diogo · ${ROLE_NAMES[hud.theirs.role]} · ${hud.theirs.style}`}
              meter={hud.theirs}
              input={inputs.current[1]}
              keys={keysFor(1, duo)}
              keyKnob={keyKnob[1]}
              flip
            />
          )}
          <button className="btn btn--ghost btn--small" style={{ marginTop: 10 }} onClick={onQuit}>
            Leave the match
          </button>
        </>
      )}
    </div>
  )
}


// --- the keyboard ------------------------------------------------------------
//
// Everything the six buttons and the stick do, on keys — and the key printed on
// the button that does it, so nobody has to be told twice. Matched on
// `event.code`, so a French or a Portuguese layout gets the same physical keys.

/** One player's keyboard. Action keys sit in a 3×2 block the same shape as the buttons. */
interface Keys {
  up: string[]
  down: string[]
  left: string[]
  right: string[]
  shoot: string
  pass: string
  tackle: string
  dash: string
  ability: string
  flow: string
  /** What to print: on the stick, and on each of the six. */
  stick: string
  cap: { shoot: string; pass: string; tackle: string; dash: string; ability: string; flow: string }
}

/**
 * Player one runs on the left half of the keyboard (WASD) with the action block
 * under the right hand (U I O / J K L). On their own — no Diogo — the arrow keys
 * drive them too, because that is what a person tries first.
 *
 * Player two takes the arrows and the numeric keypad, whose 7-8-9 / 4-5-6 block
 * is laid out exactly like the six buttons on screen.
 */
function keysFor(seat: 0 | 1, duo: boolean): Keys {
  if (seat === 0) {
    return {
      up: duo ? ['KeyW'] : ['KeyW', 'ArrowUp'],
      down: duo ? ['KeyS'] : ['KeyS', 'ArrowDown'],
      left: duo ? ['KeyA'] : ['KeyA', 'ArrowLeft'],
      right: duo ? ['KeyD'] : ['KeyD', 'ArrowRight'],
      shoot: 'KeyU',
      pass: 'KeyI',
      tackle: 'KeyO',
      dash: 'KeyJ',
      ability: 'KeyK',
      flow: 'KeyL',
      stick: duo ? 'W A S D' : 'W A S D  ·  ↑ ← ↓ →',
      cap: { shoot: 'U', pass: 'I', tackle: 'O', dash: 'J', ability: 'K', flow: 'L' },
    }
  }
  return {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    shoot: 'Numpad7',
    pass: 'Numpad8',
    tackle: 'Numpad9',
    dash: 'Numpad4',
    ability: 'Numpad5',
    flow: 'Numpad6',
    stick: '↑ ← ↓ →',
    cap: { shoot: '7', pass: '8', tackle: '9', dash: '4', ability: '5', flow: '6' },
  }
}

/** One player's half of the phone: the meters, the stick, and the six buttons. */
function Pad({
  label,
  meter,
  input,
  keys,
  keyKnob,
  flip,
}: {
  label: string
  meter: Meter | null
  input: Input
  keys: Keys
  keyKnob: Vec2
  flip?: boolean
}) {
  const flowing = (meter?.flow ?? 0) > 0
  const ready = (meter?.ego ?? 0) >= 1
  return (
    <div className={`ops-pad ${flip ? 'is-flipped' : ''}`}>
      <span className="ops-label">{label}</span>
      <div className="ops-meters">
        <span className={`ops-bar ops-bar--ego ${ready ? 'is-full' : ''} ${flowing ? 'is-flowing' : ''}`}>
          <i style={{ width: `${flowing ? (meter!.flow / 10) * 100 : (meter?.ego ?? 0) * 100}%` }} />
          <b>{flowing ? 'FLOW' : ready ? 'EGO FULL' : 'EGO'}</b>
        </span>
        <span className="ops-bar ops-bar--stam">
          <i style={{ width: `${(((meter?.stamina ?? 1) - 0.6) / 0.4) * 100}%` }} />
          <b>LEGS</b>
        </span>
      </div>
      <div className="ops-controls">
        <Stick onMove={(v) => (input.move = v)} hint={keys.stick} keyKnob={keyKnob} />
        <div className="ops-buttons">
          <button
            className="ops-btn ops-btn--shoot"
            onPointerDown={() => (input.shoot = true)}
            onPointerUp={() => (input.shoot = false)}
            onPointerLeave={() => (input.shoot = false)}
            onPointerCancel={() => (input.shoot = false)}
          >
            SHOOT
            <kbd>{keys.cap.shoot}</kbd>
            <i className="ops-charge" style={{ width: `${(meter?.charge ?? 0) * 100}%` }} />
          </button>
          <button className="ops-btn ops-btn--pass" onPointerDown={() => (input.pass = true)}>
            PASS
            <kbd>{keys.cap.pass}</kbd>
          </button>
          <button className="ops-btn ops-btn--tackle" onPointerDown={() => (input.tackle = true)}>
            TACKLE
            <kbd>{keys.cap.tackle}</kbd>
          </button>
          <button className="ops-btn ops-btn--dash" onPointerDown={() => (input.dash = true)}>
            DASH
            <kbd>{keys.cap.dash}</kbd>
          </button>
          <button
            className={`ops-btn ops-btn--ability ${(meter?.abilityCd ?? 0) > 0 ? 'is-cold' : ''}`}
            onPointerDown={() => (input.ability = true)}
          >
            {meter?.move ?? 'MOVE'}
            <kbd>{keys.cap.ability}</kbd>
            {(meter?.abilityCd ?? 0) > 0 && <em>{Math.ceil(meter!.abilityCd)}</em>}
          </button>
          <button
            className={`ops-btn ops-btn--flow ${ready && !flowing ? 'is-ready' : 'is-cold'}`}
            onPointerDown={() => (input.flow = true)}
          >
            FLOW
            <kbd>{keys.cap.flow}</kbd>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The circle you drag your player around with. The keyboard is handled once, up
 * in <SoccerMatch>, and pushed back down as `keyKnob` so the knob still moves
 * when nobody is touching the screen.
 */
function Stick({
  onMove,
  hint,
  keyKnob,
}: {
  onMove: (v: Vec2) => void
  hint: string
  keyKnob: Vec2
}) {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const keyed = keyKnob.x !== 0 || keyKnob.y !== 0
  const shown = keyed ? { x: keyKnob.x * 30, y: keyKnob.y * 30 } : knob

  function track(e: React.PointerEvent) {
    const el = base.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const max = r.width / 2
    const l = Math.hypot(dx, dy) || 1
    const k = Math.min(1, l / max)
    const v = { x: (dx / l) * k, y: (dy / l) * k }
    onMove(v)
    setKnob({ x: v.x * max * 0.6, y: v.y * max * 0.6 })
  }

  function release() {
    onMove({ x: 0, y: 0 })
    setKnob({ x: 0, y: 0 })
  }

  return (
    <div className="ops-stickwrap">
      <div
        ref={base}
        className="ops-stick"
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          track(e)
        }}
        onPointerMove={(e) => e.buttons && track(e)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span className="ops-knob" style={{ transform: `translate(${shown.x}px, ${shown.y}px)` }} />
      </div>
      <span className="ops-keys">{hint}</span>
    </div>
  )
}

// --- drawing -----------------------------------------------------------------
//
// The look is Blue Lock Rivals' — a night arena, a hard green pitch, blocky
// figures with dyed hair, and everything important announced with light. None
// of it is downloaded: that game's art belongs to somebody else and this repo
// keeps `public/` tight (CLAUDE.md), so the whole scene is drawn here, which
// also means it scales to any phone for free.
//
// The FEEL is the other half of it, and it is all in this file:
//
//   · a camera that leans toward the ball and pushes in when it gets dangerous,
//     clamped so the whole pitch is always on screen;
//   · legs that actually run — a stride cycle driven by how fast the figure is
//     travelling, arms swinging the other way, and a body that leans;
//   · afterimages behind anyone at a sprint;
//   · a ball that spins, stretches along its flight and drags a comet trail;
//   · and a bang for every `Fx` the engine reports — sparks, dust, shockwaves,
//     screen shake and a white flash when the net goes.

const S = 16 // canvas pixels per pitch unit
const PAD = 3.5 // units of stand around the pitch
const OX = PAD * S
/** The canvas the arena needs — it grows with the format. */
const canvasW = (m: Match) => (m.pitch.w + PAD * 2) * S
const canvasH = (m: Match) => (m.pitch.h + PAD * 2) * S

/** Pitch units → canvas pixels. */
const px = (u: number) => u * S

/**
 * How much bigger than life the figures and the ball are drawn. A real ball on
 * a pitch this size would be two pixels across on a phone, so everything that
 * isn't a line gets exaggerated — the arcade tradition, and the only way three
 * a side reads at arm's length.
 */
const FIG = 2.6

/** A stable pseudo-random, so the crowd doesn't shimmer every frame. */
function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// --- what the screen remembers between frames --------------------------------

/** Facing angles, smoothed — a figure that snaps round looks like a bug. */
const facing = new Map<string, number>()
/** How far through the run cycle each figure is. */
const stride = new Map<string, number>()
/** A kick or a tackle punches the figure; this is what's left of the punch. */
const punch = new Map<string, number>()
/** The last few ball positions, for a motion trail. */
const trail: { x: number; y: number; s: number }[] = []
/** How far the ball has rolled, in radians. */
let roll = 0

/** Sparks, dust, confetti and shockwaves. One list, updated by `dt`. */
interface Bit {
  kind: 'spark' | 'dust' | 'confetti' | 'ring'
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  /** Rings only: how fast the wave opens, in canvas pixels a second. */
  grow: number
  spin: number
}
const bits: Bit[] = []

/**
 * The camera. It is not a free camera: `clampCam` keeps every corner of the
 * pitch on screen, so pushing in only ever eats the stands. `hot` is how
 * exciting the moment is — a fast ball near a goal — and it drives the zoom.
 */
const cam = {
  x: 0,
  y: 0,
  z: 1,
  hot: 0,
  /** Pixels of shake left. */
  shake: 0,
  /** 0…1 white-out, for the moment the net goes. */
  flash: 0,
  /** 0…1 glow behind the goal that was just scored in. */
  glow: 0,
  glowSide: 0 as 0 | 1,
  ready: false,
}

function resetPaint(): void {
  facing.clear()
  stride.clear()
  punch.clear()
  trail.length = 0
  bits.length = 0
  roll = 0
  cam.hot = 0
  cam.shake = 0
  cam.flash = 0
  cam.glow = 0
  cam.ready = false
}

// --- the bangs ---------------------------------------------------------------

function spark(x: number, y: number, n: number, spread: number, dir: Vec2, speed: number, color: string): void {
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(dir.y, dir.x) + (Math.random() - 0.5) * spread
    const v = speed * (0.4 + Math.random() * 0.8)
    bits.push({
      kind: 'spark',
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.24 + Math.random() * 0.22,
      max: 0.46,
      size: 1.6 + Math.random() * 2.4,
      color,
      grow: 0,
      spin: 0,
    })
  }
}

function dust(x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const v = 25 + Math.random() * 60
    bits.push({
      kind: 'dust',
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v * 0.6,
      life: 0.3 + Math.random() * 0.3,
      max: 0.6,
      size: 3 + Math.random() * 6,
      color: 'rgba(226,255,214,',
      grow: 0,
      spin: 0,
    })
  }
}

function ring(x: number, y: number, color: string, grow: number, life = 0.4): void {
  bits.push({ kind: 'ring', x, y, vx: 0, vy: 0, life, max: life, size: 4, color, grow, spin: 0 })
}

function confetti(x: number, y: number, n: number, colors: [string, string]): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const v = 60 + Math.random() * 260
    bits.push({
      kind: 'confetti',
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.7 + Math.random() * 0.7,
      max: 1.4,
      size: 3 + Math.random() * 4,
      color: [colors[0], colors[1], '#fff', '#ffce00'][i % 4],
      grow: 0,
      spin: Math.random() * 12 - 6,
    })
  }
}

/**
 * Everything the engine reported this frame, turned into mess and noise. This
 * is the only place the match makes a sound.
 */
function feel(m: Match): void {
  for (const f of m.fx) {
    const x = px(f.at.x)
    const y = px(f.at.y)
    const kit = (f.side === 0 ? m.home : m.away).colors
    if (f.who) punch.set(f.who, 1)
    switch (f.kind) {
      case 'kick':
        dust(x, y, 3)
        if (f.power > 0.34) rivalsSfx.kick(f.power)
        break
      case 'shot':
        cam.shake = Math.max(cam.shake, 5 + 11 * f.power)
        spark(x, y, 14, 1.1, f.dir, 420 * f.power, '#fff3c4')
        ring(x, y, 'rgba(255,240,190,', 900 * f.power)
        rivalsSfx.shot(f.power)
        break
      case 'tackle':
        cam.shake = Math.max(cam.shake, 12)
        spark(x, y, 16, Math.PI, { x: 1, y: 0 }, 300, '#ffffff')
        dust(x, y, 10)
        ring(x, y, 'rgba(255,255,255,', 620)
        rivalsSfx.tackle()
        break
      case 'miss':
        dust(x, y, 9)
        rivalsSfx.miss()
        break
      case 'dash':
        dust(x, y, 8)
        ring(x, y, `${hexA(kit[0])}`, 700, 0.3)
        rivalsSfx.dash()
        break
      case 'ability':
        cam.shake = Math.max(cam.shake, 8)
        ring(x, y, 'rgba(170,120,255,', 1100, 0.5)
        spark(x, y, 18, Math.PI, { x: 1, y: 0 }, 260, '#c9a6ff')
        rivalsSfx.ability()
        break
      case 'flow':
        cam.shake = Math.max(cam.shake, 10)
        ring(x, y, 'rgba(255,206,0,', 1300, 0.6)
        ring(x, y, 'rgba(255,255,255,', 800, 0.45)
        confetti(x, y, 14, ['#ffce00', '#ff8a00'])
        rivalsSfx.flow()
        break
      case 'catch':
        cam.shake = Math.max(cam.shake, 6)
        ring(x, y, 'rgba(180,225,255,', 700, 0.4)
        dust(x, y, 6)
        rivalsSfx.save()
        break
      case 'goal':
        cam.shake = Math.max(cam.shake, 22)
        cam.flash = 1
        cam.glow = 1
        cam.glowSide = f.side
        cam.hot = 1
        confetti(x, y, 46, kit)
        ring(x, y, 'rgba(255,255,255,', 1500, 0.7)
        ring(x, y, `${hexA(kit[0])}`, 1000, 0.9)
        rivalsSfx.goal()
        break
    }
  }
}

/** `#rrggbb` → the head of an `rgba(r,g,b,` string, so bits can fade. */
function hexA(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},`
}

function stepBits(dt: number): void {
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i]
    b.life -= dt
    if (b.life <= 0) {
      bits.splice(i, 1)
      continue
    }
    if (b.kind === 'ring') {
      b.size += b.grow * dt
      continue
    }
    b.x += b.vx * dt
    b.y += b.vy * dt
    const drag = b.kind === 'confetti' ? 1.6 : 5
    b.vx -= b.vx * drag * dt
    b.vy -= b.vy * drag * dt
  }
}

function drawBits(ctx: CanvasRenderingContext2D, ground: boolean): void {
  for (const b of bits) {
    if ((b.kind === 'dust' || b.kind === 'ring') !== ground) continue
    const k = b.life / b.max
    if (b.kind === 'ring') {
      ctx.strokeStyle = `${b.color}${(k * 0.85).toFixed(3)})`
      ctx.lineWidth = 2 + 5 * k
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
      ctx.stroke()
      continue
    }
    if (b.kind === 'dust') {
      ctx.fillStyle = `${b.color}${(k * 0.3).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size * (1.6 - k), 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    if (b.kind === 'confetti') {
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.spin * (b.max - b.life))
      ctx.globalAlpha = Math.min(1, k * 1.6)
      ctx.fillStyle = b.color
      ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2)
      ctx.restore()
      ctx.globalAlpha = 1
      continue
    }
    // a spark is a streak, drawn along the way it's flying
    ctx.strokeStyle = b.color
    ctx.globalAlpha = Math.min(1, k * 1.5)
    ctx.lineWidth = b.size * k
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(b.x, b.y)
    ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

// --- the camera --------------------------------------------------------------

/**
 * Lean toward the ball, push in when it matters. The zoom ceiling is worked out
 * from the padding, so at full push the stands are gone and the pitch is still
 * whole — nobody ever loses their own player off the edge.
 */
function moveCam(m: Match, dt: number): void {
  const CW = canvasW(m)
  const CH = canvasH(m)
  const zMax = Math.min(CW / px(m.pitch.w), CH / px(m.pitch.h)) * 0.995

  const speed = Math.hypot(m.ball.vel.x, m.ball.vel.y)
  const toGoal = Math.min(
    Math.hypot(m.ball.pos.x, m.ball.pos.y - m.pitch.h / 2),
    Math.hypot(m.pitch.w - m.ball.pos.x, m.ball.pos.y - m.pitch.h / 2),
  )
  // dangerous = fast, or close to somebody's net
  const want = Math.min(1, Math.max(speed / 70, Math.max(0, 1 - toGoal / 26)))
  const goalTime = m.phase === 'goal' || m.phase === 'over'
  cam.hot += ((goalTime ? 1 : want) - cam.hot) * (1 - Math.exp(-dt * (want > cam.hot ? 7 : 2.2)))

  // where it looks: the ball, led a little, pulled back toward the middle
  const lead = 0.12
  const fx = px(m.ball.pos.x + m.ball.vel.x * lead) + OX
  const fy = px(m.ball.pos.y + m.ball.vel.y * lead) + OX
  const tz = 1 + (zMax - 1) * cam.hot
  if (!cam.ready) {
    cam.x = fx
    cam.y = fy
    cam.z = tz
    cam.ready = true
  }
  const k = 1 - Math.exp(-dt * 5)
  cam.x += (fx - cam.x) * k
  cam.y += (fy - cam.y) * k
  cam.z += (tz - cam.z) * (1 - Math.exp(-dt * 3))

  cam.shake = Math.max(0, cam.shake - cam.shake * (1 - Math.exp(-dt * 9)) - 6 * dt)
  cam.flash = Math.max(0, cam.flash - dt * 2.2)
  cam.glow = Math.max(0, cam.glow - dt * 0.7)
}

/** The pan the camera actually gets, with the pitch pinned inside the frame. */
function camShift(m: Match): { tx: number; ty: number } {
  const CW = canvasW(m)
  const CH = canvasH(m)
  const z = cam.z
  const tx = CW / 2 - cam.x * z
  const ty = CH / 2 - cam.y * z
  const lo = { x: CW - (OX + px(m.pitch.w)) * z, y: CH - (OX + px(m.pitch.h)) * z }
  const hi = { x: -OX * z, y: -OX * z }
  return {
    tx: Math.min(Math.max(tx, Math.min(lo.x, hi.x)), Math.max(lo.x, hi.x)),
    ty: Math.min(Math.max(ty, Math.min(lo.y, hi.y)), Math.max(lo.y, hi.y)),
  }
}

// --- the frame ---------------------------------------------------------------

function draw(cv: HTMLCanvasElement | null, m: Match, t: number, dt: number): void {
  const ctx = cv?.getContext('2d')
  if (!cv || !ctx) return

  const CW = canvasW(m)
  const CH = canvasH(m)
  feel(m)
  m.fx.length = 0
  stepBits(dt)
  moveCam(m, dt)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  stadium(ctx, t, CW, CH)

  ctx.save()
  const sh = cam.shake
  if (sh > 0.2) ctx.translate(Math.sin(t * 91) * sh, Math.cos(t * 77) * sh)
  const { tx, ty } = camShift(m)
  ctx.translate(tx, ty)
  ctx.scale(cam.z, cam.z)
  ctx.translate(OX, OX)

  pitch(ctx, m)
  nets(ctx, m)

  // shadows first, so nobody's shadow lands on top of somebody's head
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  for (const p of m.players) {
    ctx.beginPath()
    ctx.ellipse(px(p.pos.x), px(p.pos.y) + 11 * FIG, 13 * FIG, 6 * FIG, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  drawBits(ctx, true) // dust and shockwaves are on the grass…
  for (const p of m.players) drawPlayer(ctx, p, (p.side === 0 ? m.home : m.away).colors, m, t, dt)
  drawBall(ctx, m, dt)
  drawBits(ctx, false) // …sparks and confetti are in the air
  ctx.restore()

  // the net went: a white-out and a wash of the scorer's colour
  if (cam.flash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${(cam.flash * cam.flash * 0.75).toFixed(3)})`
    ctx.fillRect(0, 0, CW, CH)
  }
  if (cam.glow > 0.01) {
    const gx = cam.glowSide === 0 ? CW : 0
    const g = ctx.createRadialGradient(gx, CH / 2, 0, gx, CH / 2, CW * 0.6)
    const kit = (cam.glowSide === 0 ? m.home : m.away).colors[0]
    g.addColorStop(0, `${hexA(kit)}${(cam.glow * 0.5).toFixed(3)})`)
    g.addColorStop(1, `${hexA(kit)}0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CW, CH)
  }
  // a vignette, so the pitch sits in a dark arena rather than a bright box
  const vig = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.35, CW / 2, CH / 2, CW * 0.72)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, `rgba(0,0,0,${(0.25 + cam.hot * 0.2).toFixed(3)})`)
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, CW, CH)
}

/** Night stands, a crowd of dots, and four floodlights washing in from the corners. */
function stadium(ctx: CanvasRenderingContext2D, t: number, CW: number, CH: number): void {
  const bg = ctx.createLinearGradient(0, 0, 0, CH)
  bg.addColorStop(0, '#0b1020')
  bg.addColorStop(1, '#05070f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CW, CH)

  // The crowd: nine hundred dots that never move, flickering only very slightly.
  // They cover the WHOLE canvas, not just the band around the pitch — the camera
  // pans, and a crowd that only lived in the padding would slide off and leave a
  // bald strip. The pitch is opaque, so the middle of them is never seen.
  for (let i = 0; i < 900; i++) {
    const x = rnd(i) * CW
    const y = rnd(i + 5000) * CH
    const warm = rnd(i + 900)
    ctx.fillStyle = warm > 0.86 ? 'rgba(120,180,255,0.75)' : warm > 0.7 ? 'rgba(255,255,255,0.28)' : 'rgba(150,170,210,0.16)'
    // the whole crowd is up when the moment is hot
    const twinkle = warm > 0.86 ? 1 + 0.4 * Math.sin(t * 2 + i) : 1
    const jump = cam.hot > 0.5 ? 1 + Math.sin(t * 9 + i * 2.3) * 0.8 * (cam.hot - 0.5) : 0
    ctx.fillRect(x, y + jump, 2 * twinkle, 2 * twinkle)
  }

  for (const [fx, fy] of [
    [0, 0],
    [CW, 0],
    [0, CH],
    [CW, CH],
  ]) {
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, CW * 0.55)
    g.addColorStop(0, 'rgba(190,215,255,0.20)')
    g.addColorStop(1, 'rgba(190,215,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CW, CH)
  }
}

/** The grass and every line on it. Origin is already the pitch's top-left corner. */
function pitch(ctx: CanvasRenderingContext2D, m: Match): void {
  const w = px(m.pitch.w)
  const h = px(m.pitch.h)

  // mown stripes, running the way a camera sees them
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? '#23874a' : '#1d7440'
    ctx.fillRect((i * w) / 12, 0, w / 12 + 1, h)
  }
  // a floodlit sheen down the middle of the park
  const sheen = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7)
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)')
  sheen.addColorStop(1, 'rgba(0,0,0,0.18)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 2.5
  ctx.strokeRect(3, 3, w - 6, h - 6)
  ctx.beginPath()
  ctx.moveTo(w / 2, 3)
  ctx.lineTo(w / 2, h - 3)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, px(8), 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2)
  ctx.fill()

  // boxes, spots and corner arcs, both ends
  for (const side of [0, 1] as const) {
    const box = w * 0.15
    const six = w * 0.062
    const bx = side === 0 ? 3 : w - 3 - box
    ctx.strokeRect(bx, (h - px(m.goalW * 1.85)) / 2, box, px(m.goalW * 1.85))
    ctx.strokeRect(side === 0 ? 3 : w - 3 - six, (h - px(m.goalW * 1.07)) / 2, six, px(m.goalW * 1.07))
    const spot = side === 0 ? w * 0.11 : w - w * 0.11
    ctx.beginPath()
    ctx.arc(spot, h / 2, 2.5, 0, Math.PI * 2)
    ctx.fill()
    for (const cy of [3, h - 3]) {
      ctx.beginPath()
      ctx.arc(side === 0 ? 3 : w - 3, cy, px(1.6), 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/** Goals: posts, and a net drawn as a hatch so the mouth reads as a mouth. */
function nets(ctx: CanvasRenderingContext2D, m: Match): void {
  const w = px(m.pitch.w)
  const h = px(m.pitch.h)
  const gw = px(m.goalW)
  const gd = px(GOAL.depth) * 2.2
  const gy = (h - gw) / 2

  for (const side of [0, 1] as const) {
    const x = side === 0 ? -gd : w
    // the net still ringing from the goal that just went in
    const hit = cam.glow > 0 && cam.glowSide === side ? cam.glow : 0
    ctx.fillStyle = 'rgba(10,16,32,0.85)'
    ctx.fillRect(x, gy, gd, gw)
    ctx.strokeStyle = hit ? `rgba(255,255,255,${(0.3 + hit * 0.6).toFixed(2)})` : 'rgba(255,255,255,0.30)'
    ctx.lineWidth = 1
    for (let i = 1; i < 7; i++) {
      const bulge = hit ? Math.sin((i / 7) * Math.PI) * hit * 10 * (side === 0 ? -1 : 1) : 0
      ctx.beginPath()
      ctx.moveTo(x + (gd * i) / 7 + bulge, gy)
      ctx.lineTo(x + (gd * i) / 7 + bulge, gy + gw)
      ctx.stroke()
    }
    for (let i = 1; i < 9; i++) {
      const y = gy + (gw * i) / 9
      const bulge = hit ? Math.sin((i / 9) * Math.PI) * hit * 10 * (side === 0 ? -1 : 1) : 0
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + gd / 2 + bulge, y, x + gd, y)
      ctx.stroke()
    }
    // the posts themselves, lit
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(side === 0 ? 2 : w - 2, gy)
    ctx.lineTo(side === 0 ? 2 : w - 2, gy + gw)
    ctx.stroke()
  }
}

/**
 * The ball: a comet trail, a shadow that drops away as it's struck, a spin you
 * can see, and a stretch along the flight — the four tricks that make a ball
 * moving at eighty units a second look like it's moving at eighty units a
 * second rather than sliding.
 */
function drawBall(ctx: CanvasRenderingContext2D, m: Match, dt: number): void {
  const bx = px(m.ball.pos.x)
  const by = px(m.ball.pos.y)
  const v = Math.hypot(m.ball.vel.x, m.ball.vel.y)
  const fast = Math.min(1, v / 80)
  roll += v * dt * 0.16

  trail.push({ x: bx, y: by, s: fast })
  if (trail.length > 14) trail.shift()

  if (!m.ball.owner && fast > 0.05) {
    // the comet: a tapering streak through everywhere it has just been
    for (const [i, tr] of trail.entries()) {
      const k = i / trail.length
      ctx.beginPath()
      ctx.arc(tr.x, tr.y, (1.5 + k * 6) * FIG * (0.4 + fast * 0.9), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${fast > 0.55 ? '255,240,190' : '255,255,255'},${(0.045 * i * (0.3 + fast)).toFixed(3)})`
      ctx.fill()
    }
  }

  // the shadow drops away underneath a ball that has been smashed
  const lift = fast * 5 * FIG
  ctx.beginPath()
  ctx.ellipse(bx, by + 8 * FIG + lift, (7 - fast * 2) * FIG, (3.5 - fast) * FIG, 0, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(0,0,0,${0.3 - fast * 0.12})`
  ctx.fill()

  const r = 7.5 * FIG * (1 + fast * 0.18)
  const dir = v > 0.5 ? Math.atan2(m.ball.vel.y, m.ball.vel.x) : 0
  ctx.save()
  ctx.translate(bx, by - lift * 0.5)
  ctx.rotate(dir)
  ctx.scale(1 + fast * 0.5, 1 - fast * 0.22) // stretched along the flight
  ctx.rotate(-dir + roll)

  const g = ctx.createRadialGradient(-r * 0.33, -r * 0.4, 1, 0, 0, r)
  g.addColorStop(0, '#fff')
  g.addColorStop(1, '#c9cfda')
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()
  ctx.fillStyle = '#1a1f2b'
  for (const [dx, dy] of [
    [0, 0],
    [4, 3.5],
    [-4, 3],
    [3, -4],
  ]) {
    ctx.beginPath()
    ctx.arc(dx * FIG, dy * FIG, 1.7 * FIG, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // a struck ball burns
  if (fast > 0.45) {
    const glow = ctx.createRadialGradient(bx, by, 0, bx, by, r * 3)
    glow.addColorStop(0, `rgba(255,236,170,${((fast - 0.45) * 0.5).toFixed(3)})`)
    glow.addColorStop(1, 'rgba(255,236,170,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(bx, by, r * 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * One figure, Roblox-blocky and seen from above: shoulders, two arms, legs that
 * pump, a head of dyed hair, and every state the engine tracks announced in
 * light — the gold of Flow, the white ring of invincibility, the streaks of a
 * dash, the marker over whoever you're driving.
 */
function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, colors: [string, string], m: Match, t: number, dt: number): void {
  const x = px(p.pos.x)
  const y = px(p.pos.y)
  const style = styleById(p.style)
  const speed = Math.hypot(p.vel.x, p.vel.y)
  const run = Math.min(1, speed / SPEED)

  // where they're looking, eased so turns are smooth
  const moving = speed > 0.6
  const want = moving ? Math.atan2(p.vel.y, p.vel.x) : (facing.get(p.id) ?? (p.side === 0 ? 0 : Math.PI))
  const was = facing.get(p.id) ?? want
  let delta = want - was
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  const angle = was + delta * Math.min(1, dt * 14)
  facing.set(p.id, angle)

  // the run cycle: one stride per six units covered, so the legs match the pace
  const phase = (stride.get(p.id) ?? Math.random()) + (speed * dt) / 5.2
  stride.set(p.id, phase)
  const swing = Math.sin(phase * Math.PI * 2) * run
  const bob = Math.abs(Math.cos(phase * Math.PI * 2)) * run

  // what's left of a kick or a tackle
  const hit = Math.max(0, (punch.get(p.id) ?? 0) - dt * 5)
  punch.set(p.id, hit)

  // Flow State: a gold floor-glow and three chevrons climbing out of it
  if (p.flow > 0) {
    const pulse = (26 + Math.sin(t * 8) * 4) * FIG
    const g = ctx.createRadialGradient(x, y, 4, x, y, pulse)
    g.addColorStop(0, 'rgba(255,206,0,0.55)')
    g.addColorStop(0.6, 'rgba(255,140,0,0.25)')
    g.addColorStop(1, 'rgba(255,140,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,236,140,0.9)'
    ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      const rise = ((t * 60 + i * 14) % 42) - 6
      ctx.globalAlpha = 1 - rise / 40
      ctx.beginPath()
      ctx.moveTo(x - 8 * FIG, y + (14 - rise) * FIG)
      ctx.lineTo(x, y + (8 - rise) * FIG)
      ctx.lineTo(x + 8 * FIG, y + (14 - rise) * FIG)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // a dash leaves streaks behind it
  if (p.dash > 0) {
    const back = { x: -Math.cos(angle), y: -Math.sin(angle) }
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = 0.26 / i
      ctx.fillStyle = colors[0]
      ctx.beginPath()
      ctx.ellipse(x + back.x * i * 12 * FIG, y + back.y * i * 12 * FIG, 11 * FIG, 12 * FIG, angle, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // speed lines, the manga way
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      const off = (rnd(i + Math.floor(t * 20)) - 0.5) * 34 * FIG
      const nx = -Math.sin(angle) * off
      const ny = Math.cos(angle) * off
      ctx.beginPath()
      ctx.moveTo(x + nx + back.x * 14 * FIG, y + ny + back.y * 14 * FIG)
      ctx.lineTo(x + nx + back.x * 40 * FIG, y + ny + back.y * 40 * FIG)
      ctx.stroke()
    }
  }

  // untouchable
  if (p.iframes > 0) {
    ctx.beginPath()
    ctx.arc(x, y, 21 * FIG, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(180,225,255,0.85)'
    ctx.lineWidth = 3
    ctx.setLineDash([10, 8])
    ctx.stroke()
    ctx.setLineDash([])
  }

  // on the ball
  if (m.ball.owner === p.id) {
    ctx.beginPath()
    ctx.ellipse(x, y + 10 * FIG, 19 * FIG, 9 * FIG, 0, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 3.5
    ctx.stroke()
  }

  // winding up a shot: a ring that closes, and the line the ball will take
  if (p.charge > 0) {
    const c = p.charge
    const goal = { x: p.side === 0 ? m.pitch.w : 0, y: m.pitch.h / 2 }
    ctx.strokeStyle = `rgba(255,${Math.round(220 - 150 * c)},60,${(0.35 + 0.5 * c).toFixed(2)})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, (34 - 16 * c) * FIG, 0, Math.PI * 2 * c)
    ctx.stroke()
    ctx.setLineDash([9, 11])
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.25 + 0.35 * c
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(px(goal.x), px(goal.y))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  // at a sprint the figure smears: two silhouettes trailing the real one
  if (run > 0.55 && p.sliding <= 0) {
    for (let i = 1; i <= 2; i++) {
      ctx.globalAlpha = 0.16 / i
      figure(ctx, x - p.vel.x * i * 0.7, y - p.vel.y * i * 0.7, angle, colors, style, swing, bob, run, 0, p)
      ctx.globalAlpha = 1
    }
  }

  figure(ctx, x, y, angle, colors, style, swing, bob, run, hit, p)

  // the marker over whoever a human is driving
  if (p.human !== null) {
    const bounce = Math.abs(Math.sin(t * 5)) * 4 * FIG
    ctx.fillStyle = p.human === 0 ? '#ffce00' : '#4aa3ff'
    ctx.shadowColor = ctx.fillStyle
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(x, y - 20 * FIG + bounce)
    ctx.lineTo(x - 7 * FIG, y - 31 * FIG + bounce)
    ctx.lineTo(x + 7 * FIG, y - 31 * FIG + bounce)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = `bold ${Math.round(10 * FIG)}px system-ui`
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 6
  ctx.fillText(p.role, x, y + 27 * FIG)
  ctx.shadowBlur = 0
}

/**
 * The body itself, drawn at life size and blown up to arcade size. Split out of
 * `drawPlayer` because a sprinter is drawn three times: twice as a smear, once
 * for real.
 */
function figure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  colors: [string, string],
  style: { hair: string },
  swing: number,
  bob: number,
  run: number,
  hit: number,
  p: Player,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle + Math.PI / 2) // the sprite is drawn facing "down" the screen
  ctx.scale(FIG, FIG) // …and drawn once, at life size, then blown up to arcade size
  // weight: a runner leans into it and bobs, a struck ball punches the shoulders
  ctx.scale(1 - run * 0.06 + hit * 0.12, 1 + run * 0.1 + bob * 0.05 + hit * 0.12)
  ctx.translate(0, -run * 2)

  if (p.sliding > 0) {
    // on the floor, legs out — a missed tackle has to look like one
    ctx.fillStyle = colors[0]
    round(ctx, -8, -14, 16, 24, 7)
    ctx.fillStyle = '#f2c9a0'
    round(ctx, -3.5, 10, 7, 9, 3)
  } else {
    // legs, pumping — forward is up the sprite, so the stride is along y
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    round(ctx, -8, 4 - swing * 6 - hit * 4, 7, 14, 3.5)
    round(ctx, 1, 4 + swing * 6, 7, 14, 3.5)
    // arms, swinging the other way
    ctx.fillStyle = '#f2c9a0'
    round(ctx, -14, -6 + swing * 4, 6, 13, 3)
    round(ctx, 8, -6 - swing * 4, 6, 13, 3)
    // torso, in the shirt
    ctx.fillStyle = colors[0]
    round(ctx, -10, -9, 20, 21, 5)
    // the trim stripe down the middle, so the two kits never blur together
    ctx.fillStyle = colors[1]
    ctx.fillRect(-2.5, -9, 5, 21)
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(-10, 8, 20, 4) // shorts
    // head: hair first, then a face turned the way they're running
    ctx.fillStyle = style.hair
    round(ctx, -8, -12, 16, 16, 6)
    ctx.fillStyle = '#f2c9a0'
    round(ctx, -5.5, -1, 11, 6, 2.5)
  }
  ctx.restore()
}

/** A rounded rectangle, because every part of a Roblox body is one. */
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

export type { Role }
