// 🐦 Shangri-La Frontier (§22) — the hunt itself.
//
// Canvas, a thumbstick and five buttons. React holds nothing but the HUD: the
// engine (logic/frontier.ts) owns the fight, the loop lives in a ref, and the
// canvas is redrawn every frame — the same shape as the football match, and for
// the same reason. Sixty frames a second inside a PWA is only possible if React
// never sees the state that changes sixty times a second.
//
// Everything here is drawn, not downloaded. The show's art belongs to somebody
// else, and `public/` stays tight (CLAUDE.md), so the arena, the monsters and
// the bird mask are all canvas primitives — which also means they scale to any
// phone for free.
import { useEffect, useRef, useState } from 'react'
import {
  ARENA,
  FLASKS,
  MAX_STAM,
  type Fight,
  type FightResult,
  type Foe,
  type Input,
  type Vec,
  noInput,
  settle,
  sight,
  step,
} from '../logic/frontier'
import { slfSfx } from '../audio'

interface Vec2 {
  x: number
  y: number
}

/** What React needs about the fight, refreshed once a frame. */
interface Hud {
  hp: number
  maxHp: number
  stam: number
  flasks: number
  dur: number
  maxDur: number
  broken: boolean
  over: number
  assist: boolean
  clock: number
  clockRate: number
  bossHp: number
  bossMax: number
  packLeft: number
  packOf: number
  phase: number
  phases: number
  shout: string | null
  emul: string | null
  done: 'won' | 'lost' | null
  how: string | null
  charge: number
  aggro: number
}

const hudOf = (f: Fight): Hud => {
  const boss = f.foes.find((x) => x.kind === 'boss')
  const pack = f.foes.filter((x) => x.kind === 'pack')
  return {
    hp: f.hero.hp,
    maxHp: f.hero.maxHp,
    stam: f.hero.stam,
    flasks: f.hero.flasks,
    dur: f.hero.dur,
    maxDur: f.stats.dur,
    broken: f.hero.broken,
    over: f.hero.over,
    assist: f.hero.assist,
    clock: f.clock,
    clockRate: f.clockRate,
    bossHp: boss?.hp ?? 0,
    bossMax: boss?.maxHp ?? 1,
    packLeft: pack.length,
    packOf: f.def.pack ?? 0,
    phase: boss?.phase ?? 1,
    phases: f.def.phases.length,
    shout: f.shout,
    emul: f.emul,
    done: f.phase === 'won' ? 'won' : f.phase === 'lost' ? 'lost' : null,
    how: f.how,
    charge: f.hero.charge,
    aggro: f.aggro,
  }
}

export function FrontierFight({
  fight,
  onDone,
  onQuit,
}: {
  fight: Fight
  /** The settled result, once it is over one way or the other. */
  onDone: (result: FightResult) => void
  onQuit: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  const game = useRef<Fight>(fight)
  const input = useRef<Input>(noInput())
  const [hud, setHud] = useState<Hud>(hudOf(fight))
  const [knobKeys, setKnobKeys] = useState<Vec2>({ x: 0, y: 0 })

  // the keyboard, for anyone playing this on a laptop
  useEffect(() => {
    const held = new Set<string>()
    const dirs: Record<string, Vec2> = {
      KeyW: { x: 0, y: -1 },
      ArrowUp: { x: 0, y: -1 },
      KeyS: { x: 0, y: 1 },
      ArrowDown: { x: 0, y: 1 },
      KeyA: { x: -1, y: 0 },
      ArrowLeft: { x: -1, y: 0 },
      KeyD: { x: 1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    }
    const drive = () => {
      let v = { x: 0, y: 0 }
      for (const code of held) {
        const d = dirs[code]
        if (d) v = { x: v.x + d.x, y: v.y + d.y }
      }
      const l = Math.hypot(v.x, v.y) || 1
      const move = l > 1 ? { x: v.x / l, y: v.y / l } : v
      input.current.move = move
      setKnobKeys(move)
    }
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (dirs[e.code]) {
        held.add(e.code)
        drive()
        e.preventDefault()
        return
      }
      if (e.code === 'KeyJ') input.current.light = true
      else if (e.code === 'KeyK') input.current.heavy = true
      else if (e.code === 'Space' || e.code === 'KeyL') input.current.dodge = true
      else if (e.code === 'KeyH') input.current.flask = true
      else if (e.code === 'KeyP') input.current.assist = true
      else return
      e.preventDefault()
    }
    const onUp = (e: KeyboardEvent) => {
      if (dirs[e.code]) {
        held.delete(e.code)
        drive()
        return
      }
      // HEAVY is the one that is held, so it is the one that has to be released
      if (e.code === 'KeyK') input.current.heavy = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  // the canvas fills the screen at device resolution, and the hunt goes
  // fullscreen and landscape where the browser allows it
  useEffect(() => {
    const cv = canvas.current
    const el = shell.current
    if (!cv || !el) return
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(cv.clientWidth * dpr))
      const h = Math.max(1, Math.round(cv.clientHeight * dpr))
      if (cv.width !== w || cv.height !== h) {
        cv.width = w
        cv.height = h
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(cv)
    window.addEventListener('orientationchange', fit)
    void el.requestFullscreen?.().catch(() => {})
    const orientation = screen.orientation as ScreenOrientation & { lock?: (to: string) => Promise<void> }
    void orientation?.lock?.('landscape').catch(() => {})
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', fit)
      orientation?.unlock?.()
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // the loop: one rAF for the whole hunt
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const f = step(game.current, input.current, dt)
      // the taps are consumed by the frame that saw them; HEAVY is held, so it
      // is the only one that survives
      input.current.light = false
      input.current.dodge = false
      input.current.flask = false
      input.current.assist = false
      draw(canvas.current, f, now / 1000, dt)
      setHud(hudOf(f))
      if (f.phase !== 'won' && f.phase !== 'lost') raf = requestAnimationFrame(tick)
    }
    resetPaint()
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const def = fight.def
  const bossPct = hud.bossMax ? Math.max(0, hud.bossHp / hud.bossMax) : 0
  const urgent = hud.clock <= 30

  return (
    <div className="ops-full slf-full" ref={shell}>
      <canvas ref={canvas} className="ops-canvas" />

      {/* the monster's bar, hanging off the top edge — or, for a pack, a count */}
      <div className="slf-top">
        <div className="slf-boss">
          <span className="slf-boss-name">
            {def.emoji} {def.name}
            {hud.phases > 1 && <i> · phase {hud.phase}/{hud.phases}</i>}
          </span>
          {hud.packOf > 0 ? (
            <div className="slf-pips">
              {Array.from({ length: hud.packOf }, (_, i) => (
                <b key={i} className={i < hud.packLeft ? 'is-alive' : ''} />
              ))}
            </div>
          ) : (
            <div className="slf-bossbar">
              <i style={{ width: `${bossPct * 100}%` }} />
            </div>
          )}
        </div>
        <div className={`slf-clock ${urgent ? 'is-urgent' : ''} ${hud.clockRate > 1 ? 'is-fast' : ''}`}>
          {Math.floor(Math.max(0, hud.clock) / 60)}:{String(Math.floor(Math.max(0, hud.clock) % 60)).padStart(2, '0')}
          {hud.clockRate > 1 && <em>×2</em>}
        </div>
      </div>

      <button className="ops-x" onClick={onQuit} aria-label="Leave the hunt">✕</button>

      {hud.shout && (
        <div className={`ops-shout ${hud.shout.includes('DIED') || hud.shout.includes('SEAL') || hud.shout === 'SCARRED' ? 'is-bad' : 'is-goal'}`}>
          <span>{hud.shout}</span>
        </div>
      )}

      {hud.emul && !hud.done && (
        <div className="slf-emul">
          <span className="slf-emul-face">🐰</span>
          <p>{hud.emul}</p>
        </div>
      )}

      {!hud.done && (
        <div className="ops-deck">
          <Stick onMove={(v) => (input.current.move = v)} keyKnob={knobKeys} />

          <div className="slf-gauges">
            <div className="slf-chips">
              <span className={hud.broken ? 'is-broken' : ''}>
                {hud.broken ? '💔 BROKEN' : `${fight.stats.weapon.emoji} ${Math.max(0, Math.ceil(hud.dur))}`}
              </span>
              <span className={hud.over > 0 ? 'is-over' : ''}>{hud.over > 0 ? '⚡ OVERCLOCK' : `🧪 ${hud.flasks}/${FLASKS}`}</span>
            </div>
            <div className="ops-bar slf-bar--hp">
              <i style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }} />
              <b>{Math.max(0, Math.ceil(hud.hp))} HP</b>
            </div>
            <div className="ops-bar ops-bar--stam">
              <i style={{ width: `${(hud.stam / MAX_STAM) * 100}%` }} />
            </div>
          </div>

          <div className="ops-cluster">
            <button
              className="ops-btn slf-btn--light"
              onPointerDown={() => (input.current.light = true)}
            >
              Slash<kbd>J</kbd>
            </button>
            <button
              className="ops-btn slf-btn--heavy"
              onPointerDown={() => (input.current.heavy = true)}
              onPointerUp={() => (input.current.heavy = false)}
              onPointerLeave={() => (input.current.heavy = false)}
              onPointerCancel={() => (input.current.heavy = false)}
            >
              <span className="ops-charge" style={{ transform: `scale(${hud.charge.toFixed(2)})` }} />
              Heavy<kbd>K</kbd>
            </button>
            <button className="ops-btn slf-btn--dodge" onPointerDown={() => (input.current.dodge = true)}>
              Dodge<kbd>Spc</kbd>
            </button>
            <button
              className={`ops-btn slf-btn--flask ${hud.flasks <= 0 ? 'is-cold' : ''}`}
              onPointerDown={() => (input.current.flask = true)}
            >
              <em>{hud.flasks}</em>
              Flask<kbd>H</kbd>
            </button>
            {hud.assist && (
              <button className="ops-btn slf-btn--assist" onPointerDown={() => (input.current.assist = true)}>
                Psyger<kbd>P</kbd>
              </button>
            )}
          </div>
        </div>
      )}

      {hud.done && <Verdict fight={game.current} onDone={onDone} />}
    </div>
  )
}

/**
 * The end card. It says which failure state you hit by name, because "you died"
 * and "the tomb sealed with you in it" are two different mistakes and a player
 * who cannot tell them apart cannot fix either.
 */
function Verdict({ fight, onDone }: { fight: Fight; onDone: (r: FightResult) => void }) {
  // settled once, on mount: the drops are random and must not be re-rolled by a
  // re-render (React can call a render function twice in dev)
  const result = useRef<FightResult | null>(null)
  if (!result.current) result.current = settle(fight)
  const r = result.current

  const title =
    r.how === 'slain'
      ? fight.def.pack
        ? 'PACK CLEARED'
        : `${fight.def.name.toUpperCase()} SLAIN`
      : r.how === 'sealed'
        ? 'GRAVE SEAL'
        : r.how === 'timeout'
          ? fight.def.pack ? 'THEY MELT AWAY' : 'IT SLIPS AWAY'
          : 'YOU DIED'
  const line =
    r.how === 'slain'
      ? 'A unique monster is down. The frontier moves.'
      : r.how === 'sealed'
        ? 'The countdown ran out. Wezaemon did not attack — it simply ended the run.'
        : r.how === 'timeout'
          ? fight.def.pack
            ? 'The pack broke off and vanished into Rabituza. Nothing dropped.'
            : 'The hunt ran out of time. It walked away, and nothing dropped.'
          : 'Read the tell, not the monster. Try again.'

  return (
    <div className="ops-over">
      <div className={`ops-over-card ${r.won ? '' : 'is-bad'}`}>
        <div className="slf-verdict">{title}</div>
        <p className="muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>{line}</p>
        <div className="slf-tally">
          <span><b>{r.seconds}s</b>time</span>
          <span><b>{r.hits}</b>hits</span>
          <span><b>{r.perfect}</b>perfect</span>
          <span><b>−{r.wear}</b>blade</span>
        </div>
        {r.scar && (
          <p className="slf-scarline">🩸 Scarred — that part will never take armour again.</p>
        )}
        {r.drops.length > 0 && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Dropped: {r.drops.length} material{r.drops.length === 1 ? '' : 's'}
          </p>
        )}
        {/* one button, and it always files. A "leave without saving" here would
            be a way to lose a fight and keep the blade, and the blade breaking
            is supposed to be a cost you actually pay. */}
        <button className="btn btn--blue" style={{ marginTop: 12, width: '100%' }} onClick={() => onDone(r)}>
          {r.won ? 'Take the drops' : 'Back to the frontier'}
        </button>
      </div>
    </div>
  )
}

/** The thumbstick. Same one the football game uses, minus the two-seat plumbing. */
function Stick({ onMove, keyKnob }: { onMove: (v: Vec2) => void; keyKnob: Vec2 }) {
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
  const release = () => {
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
      <span className="ops-keys">WASD</span>
    </div>
  )
}

// --- drawing -----------------------------------------------------------------
//
// The look: a black tomb-floor arena lit from nowhere, monsters as hard
// silhouettes, and — the important part — **every dangerous thing painted on the
// ground before it happens**. A telegraph in this game is not a flourish, it is
// the information the fight is made of, so it is the brightest thing on screen
// and it fills up as the wind-up runs so you can see exactly how long you have.

/** Canvas pixels per arena unit, and the canvas we are drawing into. */
let S = 8
let CWv = 0
let CHv = 0
const px = (u: number) => u * S
/** Everything measured in pixels scales with the screen; this is that factor. */
let K = 1

/** Sparks, dust, rings and floating numbers. One list, aged by `dt`. */
interface Bit {
  kind: 'spark' | 'ring' | 'num' | 'ash'
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  grow: number
  text?: string
}
const bits: Bit[] = []
/** The player's afterimages, while rolling or overclocked. */
const ghosts: { x: number; y: number; a: number; life: number }[] = []
/** Where each figure was last frame, so a body can lean into its own movement. */
const lean = new Map<string, number>()

const cam = {
  x: 0,
  y: 0,
  z: 1,
  shake: 0,
  flash: 0,
  /** 0…1 red wash when you are the one who got hit. */
  hurt: 0,
  /** 0…1 white-gold wash on a perfect dodge. */
  clutch: 0,
  ready: false,
}

function resetPaint(): void {
  bits.length = 0
  ghosts.length = 0
  lean.clear()
  cam.shake = 0
  cam.flash = 0
  cam.hurt = 0
  cam.clutch = 0
  cam.ready = false
}

function spark(x: number, y: number, n: number, spread: number, dir: Vec2, speed: number, color: string): void {
  speed *= K
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(dir.y, dir.x) + (Math.random() - 0.5) * spread
    const v = speed * (0.4 + Math.random() * 0.9)
    bits.push({
      kind: 'spark',
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.2 + Math.random() * 0.26,
      max: 0.46,
      size: (1.4 + Math.random() * 2.6) * K,
      color,
      grow: 0,
    })
  }
}

function ring(x: number, y: number, color: string, grow: number, life = 0.4): void {
  bits.push({ kind: 'ring', x, y, vx: 0, vy: 0, life, max: life, size: 5 * K, color, grow: grow * K })
}

function ash(x: number, y: number, n: number, color: string): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const v = (18 + Math.random() * 70) * K
    bits.push({
      kind: 'ash',
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.5 + Math.random() * 0.8,
      max: 1.3,
      size: (2 + Math.random() * 4) * K,
      color,
      grow: 0,
    })
  }
}

function num(x: number, y: number, text: string, color: string, big: boolean): void {
  bits.push({
    kind: 'num',
    x,
    y,
    vx: (Math.random() - 0.5) * 26 * K,
    vy: -60 * K,
    life: big ? 0.9 : 0.65,
    max: big ? 0.9 : 0.65,
    size: (big ? 20 : 13) * K,
    color,
    grow: 0,
    text,
  })
}

/** Everything the engine reported this frame, turned into mess and noise. */
function feel(f: Fight): void {
  for (const e of f.fx) {
    const x = px(e.at.x)
    const y = px(e.at.y)
    switch (e.kind) {
      case 'swing':
        slfSfx.swing(e.power > 0.5)
        break
      case 'hit':
        cam.shake = Math.max(cam.shake, (3 + 9 * e.power) * K)
        spark(x, y, 10, 1.4, e.dir, 320 * e.power, '#ffd9a0')
        if (e.who === 'hero') {
          cam.hurt = 1
          num(x, y, '', '#ff5a5a', false)
        }
        slfSfx.hit(e.power)
        break
      case 'crit':
        cam.shake = Math.max(cam.shake, 13 * K)
        spark(x, y, 20, 1.8, e.dir, 520, '#fff3c4')
        ring(x, y, 'rgba(255,240,180,', 900, 0.35)
        num(x, y, 'CRIT', '#ffe066', true)
        slfSfx.crit()
        break
      case 'block':
        spark(x, y, 8, Math.PI, { x: 1, y: 0 }, 160, '#9fb4d8')
        break
      case 'dodge':
        ash(x, y, 6, 'rgba(180,210,255,')
        slfSfx.dodge()
        break
      case 'perfect':
        cam.clutch = 1
        cam.shake = Math.max(cam.shake, 8 * K)
        ring(x, y, 'rgba(255,255,255,', 1500, 0.5)
        ring(x, y, 'rgba(120,200,255,', 1000, 0.7)
        num(x, y, 'PERFECT', '#8fe0ff', true)
        slfSfx.perfect()
        break
      case 'tell':
        slfSfx.tell()
        break
      case 'boom':
        cam.shake = Math.max(cam.shake, (6 + 10 * e.power) * K)
        ring(x, y, 'rgba(255,120,90,', 1200, 0.4)
        slfSfx.boom(e.power)
        break
      case 'roar':
        cam.shake = Math.max(cam.shake, 20 * K)
        cam.flash = 0.8
        ring(x, y, 'rgba(255,90,60,', 1800, 0.9)
        ring(x, y, 'rgba(255,255,255,', 1200, 0.6)
        slfSfx.roarBig()
        break
      case 'break':
        cam.shake = Math.max(cam.shake, 16 * K)
        spark(x, y, 24, Math.PI * 2, { x: 1, y: 0 }, 400, '#dfe7f5')
        slfSfx.breakIt()
        break
      case 'heal':
        ring(x, y, 'rgba(120,255,170,', 700, 0.6)
        ash(x, y, 10, 'rgba(150,255,190,')
        slfSfx.heal()
        break
      case 'die':
        cam.shake = Math.max(cam.shake, 14 * K)
        ash(x, y, 26, 'rgba(255,150,120,')
        ring(x, y, 'rgba(255,140,90,', 1100, 0.7)
        slfSfx.die()
        break
      case 'curse':
        cam.shake = Math.max(cam.shake, 22 * K)
        cam.flash = 1
        ring(x, y, 'rgba(190,60,255,', 1600, 1)
        ash(x, y, 30, 'rgba(190,90,255,')
        slfSfx.curse()
        break
      case 'vent':
        cam.shake = Math.max(cam.shake, 12 * K)
        spark(x, y, 26, Math.PI * 2, { x: 1, y: 0 }, 420, '#ffb45a')
        ring(x, y, 'rgba(255,170,60,', 1400, 0.6)
        slfSfx.vent()
        break
      case 'assist':
        cam.flash = 0.9
        ring(x, y, 'rgba(120,200,255,', 2000, 0.9)
        slfSfx.assist()
        break
    }
  }
  f.fx.length = 0
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
    const drag = b.kind === 'num' ? 2.4 : b.kind === 'ash' ? 1.4 : 5
    b.vx -= b.vx * drag * dt
    b.vy -= b.vy * drag * dt
  }
  for (let i = ghosts.length - 1; i >= 0; i--) {
    ghosts[i].life -= dt
    if (ghosts[i].life <= 0) ghosts.splice(i, 1)
  }
}

function drawBits(ctx: CanvasRenderingContext2D, ground: boolean): void {
  for (const b of bits) {
    const k = b.life / b.max
    if (b.kind === 'ring') {
      if (!ground) continue
      ctx.strokeStyle = `${b.color}${(k * 0.8).toFixed(3)})`
      ctx.lineWidth = 2 + 6 * k * K
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
      ctx.stroke()
      continue
    }
    if (ground) continue
    if (b.kind === 'num') {
      ctx.globalAlpha = Math.min(1, k * 1.8)
      ctx.font = `900 ${Math.round(b.size)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.lineWidth = Math.max(2, b.size * 0.3)
      ctx.strokeStyle = 'rgba(4,6,14,0.9)'
      if (b.text) {
        ctx.strokeText(b.text, b.x, b.y)
        ctx.fillStyle = b.color
        ctx.fillText(b.text, b.x, b.y)
      }
      ctx.globalAlpha = 1
      continue
    }
    if (b.kind === 'ash') {
      ctx.fillStyle = `${b.color}${(k * 0.6).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size * (1.4 - k), 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.strokeStyle = b.color
    ctx.globalAlpha = Math.min(1, k * 1.6)
    ctx.lineWidth = b.size * k
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(b.x, b.y)
    ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

// --- the frame ---------------------------------------------------------------

function fitView(cv: HTMLCanvasElement): void {
  CWv = cv.width
  CHv = cv.height
  // the whole arena always fits, with a hair of margin: losing the edge of a
  // circular arena to a camera would be losing the only wall there is
  S = Math.min(CWv, CHv) / (ARENA * 2.24)
  K = S / 8
}

function draw(cv: HTMLCanvasElement | null, f: Fight, t: number, dt: number): void {
  const ctx = cv?.getContext('2d')
  if (!cv || !ctx) return
  fitView(cv)
  feel(f)
  stepBits(dt)

  // the camera leans a third of the way toward the player and pushes in a
  // little when the monster is hurt — never enough to lose the arena wall
  const want = { x: px(f.hero.pos.x) * 0.34, y: px(f.hero.pos.y) * 0.34 }
  if (!cam.ready) {
    cam.x = want.x
    cam.y = want.y
    cam.ready = true
  }
  const k = 1 - Math.exp(-dt * 6)
  cam.x += (want.x - cam.x) * k
  cam.y += (want.y - cam.y) * k
  cam.z += (1 + f.heat * 0.06 - cam.z) * (1 - Math.exp(-dt * 2))
  cam.shake = Math.max(0, cam.shake - cam.shake * (1 - Math.exp(-dt * 9)) - 8 * K * dt)
  cam.flash = Math.max(0, cam.flash - dt * 2.4)
  cam.hurt = Math.max(0, cam.hurt - dt * 1.6)
  cam.clutch = Math.max(0, cam.clutch - dt * 1.4)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const bg = ctx.createLinearGradient(0, 0, 0, CHv)
  bg.addColorStop(0, '#080a14')
  bg.addColorStop(1, '#03040a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CWv, CHv)

  ctx.save()
  if (cam.shake > 0.2) ctx.translate(Math.sin(t * 93) * cam.shake, Math.cos(t * 71) * cam.shake)
  ctx.translate(CWv / 2 - cam.x * cam.z, CHv / 2 - cam.y * cam.z)
  ctx.scale(cam.z, cam.z)

  arena(ctx, f, t)
  for (const v of f.vents) drawVent(ctx, v, t)
  for (const foe of f.foes) telegraph(ctx, f, foe, t)
  drawBits(ctx, true)
  for (const foe of f.foes) drawFoe(ctx, foe, t, dt)
  drawHero(ctx, f, t)
  drawBits(ctx, false)
  ctx.restore()

  night(ctx, f)

  if (cam.flash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${(cam.flash * cam.flash * 0.7).toFixed(3)})`
    ctx.fillRect(0, 0, CWv, CHv)
  }
  if (cam.hurt > 0.01) {
    const g = ctx.createRadialGradient(CWv / 2, CHv / 2, CHv * 0.2, CWv / 2, CHv / 2, CWv * 0.7)
    g.addColorStop(0, 'rgba(180,0,0,0)')
    g.addColorStop(1, `rgba(180,0,0,${(cam.hurt * 0.55).toFixed(3)})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CWv, CHv)
  }
  if (cam.clutch > 0.01) {
    const g = ctx.createRadialGradient(CWv / 2, CHv / 2, 0, CWv / 2, CHv / 2, CWv * 0.7)
    g.addColorStop(0, `rgba(150,220,255,${(cam.clutch * 0.22).toFixed(3)})`)
    g.addColorStop(1, 'rgba(150,220,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CWv, CHv)
  }
  // low health is a state you should feel without reading a number
  const hurt = 1 - f.hero.hp / f.hero.maxHp
  if (hurt > 0.65 && f.hero.hp > 0) {
    const pulse = 0.1 + Math.abs(Math.sin(t * 3)) * 0.14 * (hurt - 0.65) * 3
    const g = ctx.createRadialGradient(CWv / 2, CHv / 2, CHv * 0.28, CWv / 2, CHv / 2, CWv * 0.72)
    g.addColorStop(0, 'rgba(140,0,0,0)')
    g.addColorStop(1, `rgba(140,0,0,${pulse.toFixed(3)})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CWv, CHv)
  }
}

/** The floor: a stone disc with a rune ring, and a hard edge you cannot cross. */
function arena(ctx: CanvasRenderingContext2D, f: Fight, t: number): void {
  const r = px(ARENA)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  g.addColorStop(0, '#1a1d2b')
  g.addColorStop(0.72, '#12141f')
  g.addColorStop(1, '#0b0d16')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  // flagstones — concentric rings and spokes, so movement across the floor reads
  ctx.strokeStyle = 'rgba(140,170,220,0.07)'
  ctx.lineWidth = 1.5 * K
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.arc(0, 0, (r * i) / 4.4, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16)
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    ctx.stroke()
  }

  // the wall: a lit rim that breathes, so the edge of the world is never a guess
  const glow = 0.3 + Math.sin(t * 1.4) * 0.06 + f.heat * 0.25
  ctx.strokeStyle = `rgba(${f.def.id === 'wezaemon' ? '150,190,255' : '255,140,90'},${glow.toFixed(2)})`
  ctx.lineWidth = 4 * K
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
}

/** A ley-vent. Cold, then a ring of warning, then the column. */
function drawVent(ctx: CanvasRenderingContext2D, v: { pos: Vec; r: number; t: number; state: string }, t: number): void {
  const x = px(v.pos.x)
  const y = px(v.pos.y)
  const r = px(v.r)
  if (v.state === 'cold') {
    ctx.strokeStyle = 'rgba(255,160,70,0.18)'
    ctx.lineWidth = 2 * K
    ctx.setLineDash([6 * K, 6 * K])
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    return
  }
  if (v.state === 'warn') {
    const pulse = 0.35 + Math.abs(Math.sin(t * 12)) * 0.4
    ctx.fillStyle = `rgba(255,140,40,${(pulse * 0.28).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = `rgba(255,190,90,${pulse.toFixed(2)})`
    ctx.lineWidth = 3 * K
    ctx.stroke()
    return
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, 'rgba(255,255,220,0.95)')
  g.addColorStop(0.4, 'rgba(255,170,60,0.8)')
  g.addColorStop(1, 'rgba(255,90,20,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r * 1.15, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * The single most important thing this renderer does: paint the danger on the
 * floor while it is being wound up, filling from nothing to full over exactly
 * the length of the tell. If the shape is solid, you are already too late.
 */
function telegraph(ctx: CanvasRenderingContext2D, f: Fight, foe: Foe, t: number): void {
  const m = foe.move
  if (!m || (foe.beat !== 'tell' && foe.beat !== 'strike' && foe.beat !== 'gap')) return
  const tell = m.tell * f.grade.tell
  const striking = foe.beat === 'strike'
  const fill = striking ? 1 : foe.beat === 'gap' ? 0.35 : Math.min(1, foe.t / tell)
  const x = px(foe.pos.x)
  const y = px(foe.pos.y)
  const a = foe.face

  ctx.save()
  const heat = striking ? 'rgba(255,255,255,' : m.curse ? 'rgba(210,90,255,' : 'rgba(255,70,60,'
  // the outline flickers faster the closer the strike gets — a countdown you
  // feel rather than read
  const pulse = 0.35 + fill * 0.45 + Math.abs(Math.sin(t * (7 + fill * 22))) * 0.2
  ctx.fillStyle = `${heat}${(striking ? 0.5 : 0.1 + fill * 0.3).toFixed(3)})`
  ctx.strokeStyle = `${heat}${pulse.toFixed(3)})`
  ctx.lineWidth = (striking ? 4 : 2) * K

  const shape = (): void => {
    const half = ((m.arc ?? 40) * Math.PI) / 180
    switch (m.shape) {
      case 'cone':
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.arc(x, y, px(m.reach + foe.size), a - half, a + half)
        ctx.closePath()
        break
      case 'line': {
        const w = px(Math.max(2, ((m.arc ?? 8) / 40) * 8))
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a + Math.PI / 2) * w)
        ctx.lineTo(x + Math.cos(a) * px(m.reach) + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a) * px(m.reach) + Math.sin(a + Math.PI / 2) * w)
        ctx.lineTo(x + Math.cos(a) * px(m.reach) - Math.cos(a + Math.PI / 2) * w, y + Math.sin(a) * px(m.reach) - Math.sin(a + Math.PI / 2) * w)
        ctx.lineTo(x - Math.cos(a + Math.PI / 2) * w, y - Math.sin(a + Math.PI / 2) * w)
        ctx.closePath()
        break
      }
      case 'nova':
        ctx.beginPath()
        ctx.arc(x, y, px(m.reach), 0, Math.PI * 2)
        break
      case 'ring':
        // drawn as a donut: the hole is the safe place to stand, and it has to
        // LOOK like a hole or the move is unreadable
        ctx.beginPath()
        ctx.arc(x, y, px(m.reach), 0, Math.PI * 2)
        ctx.arc(x, y, px(m.inner ?? 8), 0, Math.PI * 2, true)
        break
      case 'dash': {
        const far = px(m.travel ?? 16)
        const w = px(m.reach + foe.size)
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a + Math.PI / 2) * w)
        ctx.lineTo(x + Math.cos(a) * far + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a) * far + Math.sin(a + Math.PI / 2) * w)
        ctx.lineTo(x + Math.cos(a) * far - Math.cos(a + Math.PI / 2) * w, y + Math.sin(a) * far - Math.sin(a + Math.PI / 2) * w)
        ctx.lineTo(x - Math.cos(a + Math.PI / 2) * w, y - Math.sin(a + Math.PI / 2) * w)
        ctx.closePath()
        break
      }
      case 'zone': {
        if (!foe.mark) return
        ctx.beginPath()
        ctx.arc(px(foe.mark.x), px(foe.mark.y), px(m.reach), 0, Math.PI * 2)
        break
      }
    }
  }

  shape()
  ctx.fill()
  ctx.stroke()

  // the wind-up bar: the same shape again, clipped to how far through it is.
  // This is what turns "something is coming" into "in a third of a second".
  if (!striking && m.shape !== 'zone') {
    ctx.save()
    shape()
    ctx.clip()
    ctx.fillStyle = `${heat}${(0.3).toFixed(2)})`
    const r = px(m.reach + 12)
    ctx.fillRect(x - r, y - r, r * 2, r * 2 * fill)
    ctx.restore()
  }

  // named moves get their name on the floor, because a move you can name is a
  // move you can learn
  if (m.shout && !striking) {
    ctx.globalAlpha = Math.min(1, fill * 2)
    ctx.font = `900 ${Math.round(11 * K)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = m.curse ? '#e9b6ff' : '#ff9a90'
    ctx.fillText(m.name.toUpperCase(), x, y - px(foe.size) - 8 * K)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

/** A shadow under everything, so nothing floats. */
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.beginPath()
  ctx.ellipse(x, y + r * 0.55, r, r * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * A monster. Wolves get a body, a snout and two eyes that catch the light; the
 * Tombguard gets hard plates and a blade. Both lean into their own movement and
 * flash white on the frames their attack is live.
 */
function drawFoe(ctx: CanvasRenderingContext2D, foe: Foe, t: number, dt: number): void {
  const x = px(foe.pos.x)
  const y = px(foe.pos.y)
  const r = px(foe.size)
  const machine = foe.colors[0] === '#9aa6bb'
  const striking = foe.beat === 'strike'
  const winding = foe.beat === 'tell'

  // lean: a body that turns without its shoulders following looks like a bug
  const was = lean.get(foe.id) ?? foe.face
  let d = foe.face - was
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  const a = was + d * Math.min(1, dt * 12)
  lean.set(foe.id, a)

  shadow(ctx, x, y, r)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)

  // a wind-up swells, a strike goes white — the two states you must never confuse
  const swell = winding ? 1 + Math.sin(t * 18) * 0.05 : 1
  ctx.scale(swell, swell)
  const skin = striking ? '#ffffff' : foe.colors[0]
  const dark = striking ? '#ffd9d9' : foe.colors[1]

  if (machine) {
    // the Tombguard: hard angles, a helmet crest and a very long blade
    ctx.fillStyle = dark
    ctx.fillRect(-r * 0.9, -r * 0.85, r * 1.9, r * 1.7)
    ctx.fillStyle = skin
    ctx.fillRect(-r * 0.6, -r * 0.7, r * 1.3, r * 1.4)
    // the crest
    ctx.beginPath()
    ctx.moveTo(r * 0.2, -r * 0.75)
    ctx.lineTo(r * 1.05, -r * 1.35)
    ctx.lineTo(r * 0.45, -r * 0.35)
    ctx.closePath()
    ctx.fill()
    // the core: exposed below a third, and then it is the only thing worth hitting
    if (foe.exposed) {
      const beat = 0.55 + Math.abs(Math.sin(t * 6)) * 0.45
      ctx.fillStyle = `rgba(255,${Math.round(90 + beat * 90)},60,${beat.toFixed(2)})`
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,220,150,0.9)'
      ctx.lineWidth = 2 * K
      ctx.stroke()
    }
    // the blade, out in front along the facing
    ctx.strokeStyle = striking ? '#fff' : '#cfe0ff'
    ctx.lineWidth = 3.5 * K
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(r * 0.4, r * 0.2)
    ctx.lineTo(r * 2.5, r * 0.05)
    ctx.stroke()
  } else {
    // a wolf: haunches, shoulders, a snout and ears
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.ellipse(-r * 0.35, 0, r * 1.15, r * 0.82, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = skin
    ctx.beginPath()
    ctx.ellipse(r * 0.25, 0, r * 0.8, r * 0.68, 0, 0, Math.PI * 2)
    ctx.fill()
    // snout
    ctx.beginPath()
    ctx.moveTo(r * 0.7, -r * 0.3)
    ctx.lineTo(r * 1.55, 0)
    ctx.lineTo(r * 0.7, r * 0.3)
    ctx.closePath()
    ctx.fill()
    // ears
    ctx.fillStyle = dark
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(r * 0.35, s * r * 0.5)
      ctx.lineTo(r * 0.15, s * r * 1.05)
      ctx.lineTo(r * 0.65, s * r * 0.66)
      ctx.closePath()
      ctx.fill()
    }
    // eyes — the one thing that stays bright in Lycaon's night
    ctx.fillStyle = striking ? '#fff' : winding ? '#ffdf5a' : '#ff6a4a'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(r * 0.85, s * r * 0.24, r * 0.15, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // a health pip over the small ones, since they have no bar of their own
  if (foe.kind !== 'boss') {
    const w = r * 1.8
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(x - w / 2, y - r * 1.7, w, 3.5 * K)
    ctx.fillStyle = '#ff6a4a'
    ctx.fillRect(x - w / 2, y - r * 1.7, w * Math.max(0, foe.hp / foe.maxHp), 3.5 * K)
  }
}

/**
 * The player: a small, fast figure in almost nothing, wearing a white bird mask.
 * The mask is the point — it is who you are in this game — and the swing arcs
 * are drawn as a sweeping crescent so an attack reads as a *direction* rather
 * than as a number leaving a hitbox.
 */
function drawHero(ctx: CanvasRenderingContext2D, f: Fight, t: number): void {
  const h = f.hero
  const x = px(h.pos.x)
  const y = px(h.pos.y)
  const r = px(2.4)
  const st = f.stats

  if (h.act === 'dodge' || h.over > 0) {
    ghosts.push({ x, y, a: h.face, life: 0.22 })
    if (ghosts.length > 12) ghosts.shift()
  }
  for (const g of ghosts) {
    ctx.globalAlpha = (g.life / 0.22) * 0.28
    ctx.fillStyle = h.over > 0 ? '#ffd75a' : '#8fd0ff'
    ctx.beginPath()
    ctx.arc(g.x, g.y, r * 0.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  shadow(ctx, x, y, r)

  // --- the swing. It sweeps across the arc over the live frames, alternating
  // direction down the chain, and a charged heavy drags a second, wider ghost
  // arc behind it so the weight of it is visible.
  if (h.act === 'light' || h.act === 'heavy') {
    const heavy = h.act === 'heavy'
    const total = heavy ? 0.12 * st.wind : 0.09 * st.wind
    const live = h.beat === 'strike'
    const p = live ? Math.min(1, h.t / total) : h.beat === 'tell' ? -0.25 : 1
    const half = st.arc * (heavy ? 1.5 : 1)
    const reach = px(st.reach * (heavy ? 1.2 : 1))
    const from = h.face - half * h.sweep
    const swept = from + half * 2 * h.sweep * Math.max(0, p)

    if (p > -0.2) {
      const grad = ctx.createRadialGradient(x, y, reach * 0.35, x, y, reach)
      const tint = h.broken ? '190,190,200' : h.over > 0 ? '255,215,90' : '190,230,255'
      grad.addColorStop(0, `rgba(${tint},0)`)
      grad.addColorStop(1, `rgba(${tint},${live ? 0.55 : 0.15})`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.arc(x, y, reach, Math.min(from, swept), Math.max(from, swept))
      ctx.closePath()
      ctx.fill()
      // the leading edge: a bright line where the blade is right now
      if (live) {
        ctx.strokeStyle = h.over > 0 ? '#fff0b0' : '#eaf6ff'
        ctx.lineWidth = (heavy ? 5 : 3) * K
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(swept) * r, y + Math.sin(swept) * r)
        ctx.lineTo(x + Math.cos(swept) * reach, y + Math.sin(swept) * reach)
        ctx.stroke()
      }
    }
    // a heavy still charging draws the ring it is going to fill
    if (heavy && h.beat === 'tell') {
      ctx.strokeStyle = `rgba(255,${Math.round(180 + h.charge * 60)},80,${(0.25 + h.charge * 0.6).toFixed(2)})`
      ctx.lineWidth = 2.5 * K
      ctx.beginPath()
      ctx.arc(x, y, r * (1.6 + h.charge * 1.4), 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(h.face)

  const flat = h.act === 'dodge'
  ctx.scale(1, flat ? 0.72 : 1)

  // body — deliberately almost bare, because that is the build
  ctx.fillStyle = h.act === 'dead' ? '#4a4a55' : '#2b3348'
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.82, r * 0.66, 0, 0, Math.PI * 2)
  ctx.fill()
  // a scarf, because every one of these characters has one
  ctx.fillStyle = '#c0392b'
  ctx.beginPath()
  ctx.ellipse(-r * 0.45, 0, r * 0.3, r * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-r * 0.5, -r * 0.2)
  ctx.lineTo(-r * (1.4 + Math.min(1.2, Math.hypot(h.vel.x, h.vel.y) / 26)), -r * 0.6)
  ctx.lineTo(-r * 0.5, r * 0.25)
  ctx.closePath()
  ctx.fill()

  // the bird mask: a white face and a beak, pointing wherever you are aiming
  ctx.fillStyle = h.iframes > 0 ? '#bfe6ff' : '#f2f5fa'
  ctx.beginPath()
  ctx.arc(r * 0.3, 0, r * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(r * 0.55, -r * 0.22)
  ctx.lineTo(r * 1.5, 0)
  ctx.lineTo(r * 0.55, r * 0.22)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#12172a'
  ctx.beginPath()
  ctx.arc(r * 0.42, -r * 0.18, r * 0.11, 0, Math.PI * 2)
  ctx.arc(r * 0.42, r * 0.18, r * 0.11, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Overclock: a gold ring you have earned and can see running out
  if (h.over > 0) {
    ctx.strokeStyle = `rgba(255,214,80,${(0.35 + Math.abs(Math.sin(t * 7)) * 0.4).toFixed(2)})`
    ctx.lineWidth = 2.5 * K
    ctx.beginPath()
    ctx.arc(x, y, r * 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (h.over / 3.2))
    ctx.stroke()
  }
  // out of breath: the single worst state in the game, so it says so
  if (h.gasp > 0) {
    ctx.font = `900 ${Math.round(10 * K)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffd0d0'
    ctx.fillText('OUT OF BREATH', x, y - r * 2.4)
  }
  // Psyger-0's covering fire: streaks arriving from off the edge of the arena
  if (h.assistT > 0) {
    ctx.strokeStyle = `rgba(150,220,255,${(0.3 + Math.random() * 0.5).toFixed(2)})`
    ctx.lineWidth = 2 * K
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2
      const far = px(ARENA)
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * far, Math.sin(a) * far)
      ctx.lineTo(Math.cos(a) * far * 0.4, Math.sin(a) * far * 0.4)
      ctx.stroke()
    }
  }
}

/**
 * Lycaon's night. Below two thirds it pulls the dark in and you simply cannot
 * see the far side of the arena — which is why the monster's eyes and every
 * telegraph are the brightest things drawn.
 */
function night(ctx: CanvasRenderingContext2D, f: Fight): void {
  const range = sight(f)
  if (!range) return
  const hx = CWv / 2 + (px(f.hero.pos.x) - cam.x) * cam.z
  const hy = CHv / 2 + (px(f.hero.pos.y) - cam.y) * cam.z
  const r = px(range) * cam.z
  const g = ctx.createRadialGradient(hx, hy, r * 0.35, hx, hy, r)
  g.addColorStop(0, 'rgba(2,3,10,0)')
  g.addColorStop(0.7, 'rgba(2,3,10,0.55)')
  g.addColorStop(1, 'rgba(2,3,10,0.94)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CWv, CHv)
}
