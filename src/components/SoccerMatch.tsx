// ⚽ One Piece Soccer League — the match itself (§21j).
//
// Canvas + a thumbstick + four buttons. React holds nothing but the frame's
// score line: the engine (logic/opsoccer.ts) owns the state, the loop runs in a
// ref, and the canvas is redrawn every frame. That's what keeps a 6-a-side game
// at 60 fps inside a PWA.
import { useEffect, useRef, useState } from 'react'
import {
  GOAL,
  PITCH,
  ROLE_NAMES,
  type Input,
  type Match,
  type Player,
  type Role,
  makeSub,
  onBench,
  onPitch,
  step,
} from '../logic/opsoccer'
import { sfx } from '../audio'

const noInput = (): Input => ({ move: { x: 0, y: 0 }, shoot: false, pass: false, dribble: false, call: false })

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
    half: 1,
    event: match.event,
    over: false,
    phase: match.phase,
  })
  const lastEvent = useRef<string | null>(null)

  // the loop: one rAF for the whole match
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const m = step(game.current, inputs.current, dt)
      // the one-shot buttons are consumed by the frame that saw them
      for (const i of inputs.current) {
        i.shoot = false
        i.pass = false
        i.dribble = false
        i.call = false
      }
      draw(canvas.current, m)
      if (m.event !== lastEvent.current) {
        lastEvent.current = m.event
        if (m.event?.startsWith('GOAL')) sfx.gem()
      }
      setHud({
        score: [...m.score] as [number, number],
        clock: m.clock,
        half: m.half,
        event: m.event,
        over: m.phase === 'over',
        phase: m.phase,
      })
      if (m.phase !== 'over') raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const me = game.current.players.find((p) => p.human === 0)
  const them = game.current.players.find((p) => p.human === 1)

  return (
    <div className="ops-wrap">
      <div className="ops-hud">
        <span className="ops-team" style={{ color: match.home.colors[0] }}>
          {match.home.emoji} {match.home.name}
        </span>
        <b className="ops-score">
          {hud.score[0]} – {hud.score[1]}
        </b>
        <span className="ops-team" style={{ color: match.away.colors[0] }}>
          {match.away.name} {match.away.emoji}
        </span>
      </div>
      <div className="ops-clock">
        {hud.half === 1 ? '1st' : '2nd'} half · {Math.max(0, Math.ceil(hud.clock))}s
      </div>

      <div className="ops-pitch-wrap">
        <canvas ref={canvas} className="ops-pitch" width={PITCH.w * 10} height={PITCH.h * 10} />
        {hud.event && <div className="ops-shout">{hud.event}</div>}
      </div>

      {hud.phase === 'half' && (
        <div className="card" style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 900 }}>🔄 Half time — fresh legs?</div>
          <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            Tired players run slower. Two on the bench, and this is the moment to use them.
          </p>
          <SubPanel game={game} />
        </div>
      )}

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
          <Controls
            label={me ? `You · ${ROLE_NAMES[me.role]}` : 'You'}
            onMove={(v) => (inputs.current[0].move = v)}
            onAction={(a) => {
              inputs.current[0][a] = true
            }}
          />
          {match.twoPlayer && them && (
            <Controls
              label={`Player 2 · ${ROLE_NAMES[them.role]}`}
              flip
              onMove={(v) => (inputs.current[1].move = v)}
              onAction={(a) => {
                inputs.current[1][a] = true
              }}
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

/** Half time: swap a tired starter for one of the two on the bench. */
function SubPanel({ game }: { game: React.MutableRefObject<Match> }) {
  const m = game.current
  const [, redraw] = useState(0)
  const bench = onBench(m, 0)
  const [off, setOff] = useState<string | null>(null)

  if (!bench.length) return <p className="muted" style={{ fontSize: 12 }}>Bench is empty — everyone's already on.</p>

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {onPitch(m, 0)
          .filter((p) => p.role !== 'GK')
          .map((p) => (
            <button
              key={p.id}
              className={`btn btn--small ${off === p.id ? 'btn--blue' : 'btn--ghost'}`}
              onClick={() => { sfx.click(); setOff(p.id) }}
            >
              {p.role} {Math.round(p.stamina * 100)}%
            </button>
          ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {bench.map((b) => (
          <button
            key={b.id}
            className="btn btn--small"
            disabled={!off}
            onClick={() => {
              if (!off) return
              sfx.gem()
              makeSub(m, 0, off, b.id)
              setOff(null)
              redraw((n) => n + 1)
            }}
          >
            ⬆️ {b.name} on
          </button>
        ))}
      </div>
    </>
  )
}

/** One player's controls: the stick on one side, the four buttons on the other. */
function Controls({
  label,
  flip,
  onMove,
  onAction,
}: {
  label: string
  flip?: boolean
  onMove: (v: { x: number; y: number }) => void
  onAction: (a: 'shoot' | 'pass' | 'dribble' | 'call') => void
}) {
  return (
    <div className={`ops-controls ${flip ? 'is-flipped' : ''}`}>
      <Stick onMove={onMove} />
      <div className="ops-buttons">
        <button className="ops-btn ops-btn--shoot" onPointerDown={() => onAction('shoot')}>SHOOT</button>
        <button className="ops-btn ops-btn--pass" onPointerDown={() => onAction('pass')}>PASS</button>
        <button className="ops-btn ops-btn--dribble" onPointerDown={() => onAction('dribble')}>DRIBBLE</button>
        <button className="ops-btn ops-btn--call" onPointerDown={() => onAction('call')}>CALL</button>
      </div>
      <span className="ops-label">{label}</span>
    </div>
  )
}

/** The circle you drag your player around with. Keyboard arrows work too, for a desktop. */
function Stick({ onMove }: { onMove: (v: { x: number; y: number }) => void }) {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const held = new Set<string>()
    const send = () => {
      const v = {
        x: (held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0),
        y: (held.has('ArrowDown') ? 1 : 0) - (held.has('ArrowUp') ? 1 : 0),
      }
      onMove(v)
      setKnob({ x: v.x * 26, y: v.y * 26 })
    }
    const down = (e: KeyboardEvent) => {
      if (!e.key.startsWith('Arrow')) return
      held.add(e.key)
      send()
    }
    const up = (e: KeyboardEvent) => {
      held.delete(e.key)
      send()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [onMove])

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
      <span className="ops-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}

// --- drawing -----------------------------------------------------------------

const S = 10 // canvas units per pitch unit

function draw(cv: HTMLCanvasElement | null, m: Match): void {
  const ctx = cv?.getContext('2d')
  if (!cv || !ctx) return
  const w = PITCH.w * S
  const h = PITCH.h * S

  // grass, in mown stripes
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? '#1f7a3c' : '#1a6b35'
    ctx.fillRect((i * w) / 10, 0, w / 10 + 1, h)
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 2
  ctx.strokeRect(4, 4, w - 8, h - 8)
  ctx.beginPath()
  ctx.moveTo(w / 2, 4)
  ctx.lineTo(w / 2, h - 4)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, 9 * S, 0, Math.PI * 2)
  ctx.stroke()

  // goals and boxes
  const gy = (h - GOAL.width * S) / 2
  for (const side of [0, 1] as const) {
    const x = side === 0 ? 0 : w - GOAL.depth * S
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillRect(x, gy, GOAL.depth * S, GOAL.width * S)
    const bw = 14 * S
    ctx.strokeRect(side === 0 ? 4 : w - 4 - bw, (h - 30 * S) / 2, bw, 30 * S)
  }

  // players (the bench isn't on the pitch)
  for (const p of m.players) {
    if (p.bench) continue
    const team = p.side === 0 ? m.home : m.away
    drawPlayer(ctx, p, team.colors, m)
  }

  // ball
  ctx.beginPath()
  ctx.arc(m.ball.pos.x * S, m.ball.pos.y * S, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

/** A blocky little figure — shirt, head, and a ring under whoever you're driving. */
function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, colors: [string, string], m: Match): void {
  const x = p.pos.x * S
  const y = p.pos.y * S

  if (p.human !== null) {
    ctx.beginPath()
    ctx.arc(x, y, 16, 0, Math.PI * 2)
    ctx.strokeStyle = p.human === 0 ? '#ffce00' : '#4aa3ff'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  if (p.burst > 0) {
    ctx.beginPath()
    ctx.arc(x, y, 20, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  if (m.ball.owner === p.id) {
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fill()
  }

  ctx.fillStyle = colors[0]
  ctx.fillRect(x - 6, y - 4, 12, 12) // shirt
  ctx.fillStyle = colors[1]
  ctx.fillRect(x - 6, y + 5, 12, 3) // shorts trim
  ctx.fillStyle = '#f2c9a0'
  ctx.fillRect(x - 4, y - 10, 8, 7) // head
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.font = 'bold 7px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(p.role, x, y + 17)
}

export type { Role }
