import { useEffect, useMemo, useRef, useState } from 'react'
import type { Task } from '../types'
import { sfx } from '../audio'
import { JollyRoger } from './JollyRoger'

const EFFORT_FILL: Record<string, [string, string]> = {
  low: ['#60bff5', '#2e63a4'],
  medium: ['#ffce00', '#c9a200'],
  high: ['#d70000', '#a30000'],
}

interface Props {
  tasks: Task[]
  /** id of the task the wheel must land on; null = at rest */
  targetId: string | null
  spinToken: number // increments to trigger a new spin even for same target
  onDone: () => void
  /** the hub is the spin button now — tap the skull to spin */
  onSpin: () => void
  spinDisabled: boolean
}

const SIZE = 360
const R = SIZE / 2

function arcPath(startAngle: number, endAngle: number): string {
  const r = R - 6
  const x1 = R + r * Math.sin(startAngle)
  const y1 = R - r * Math.cos(startAngle)
  const x2 = R + r * Math.sin(endAngle)
  const y2 = R - r * Math.cos(endAngle)
  const large = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${R} ${R} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

export function Wheel({ tasks, targetId, spinToken, onDone, onSpin, spinDisabled }: Props) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const rotationRef = useRef(0)
  const timeouts = useRef<number[]>([])

  const n = Math.max(tasks.length, 1)
  const seg = (2 * Math.PI) / n

  const segments = useMemo(
    () =>
      tasks.map((t, i) => ({
        task: t,
        start: i * seg,
        end: (i + 1) * seg,
        mid: (i + 0.5) * seg,
      })),
    [tasks, seg],
  )

  useEffect(() => {
    if (!targetId) return
    const idx = tasks.findIndex((t) => t.id === targetId)
    if (idx < 0) return

    // Land segment `idx` under the top pointer: rotate so its mid-angle ends at 0 (top).
    const midDeg = ((idx + 0.5) * 360) / n
    const jitter = (Math.random() - 0.5) * (300 / n) // land off-center, feels less rigged
    const current = rotationRef.current
    const base = current - (current % 360)
    const target = base + 360 * (5 + Math.floor(Math.random() * 2)) + (360 - midDeg) + jitter

    const duration = 4200
    setSpinning(true)
    setRotation(target)
    rotationRef.current = target

    // tick sounds, decelerating like the wheel
    const totalDeg = target - current
    const segDeg = 360 / n
    const ticks = Math.min(80, Math.floor(totalDeg / segDeg))
    timeouts.current.forEach(clearTimeout)
    timeouts.current = []
    for (let i = 0; i < ticks; i++) {
      const p = i / ticks
      // ease-out cubic: progress in time for equal-angle steps
      const t = 1 - Math.cbrt(1 - p)
      timeouts.current.push(window.setTimeout(() => sfx.tick(), t * duration))
    }
    timeouts.current.push(
      window.setTimeout(() => {
        setSpinning(false)
        onDone()
      }, duration + 80),
    )
    return () => timeouts.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken])

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer">🔻</div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          width: '100%',
          display: 'block',
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 4.2s cubic-bezier(0.12, 0.6, 0.04, 1)' : 'none',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.45))',
        }}
      >
        <circle cx={R} cy={R} r={R - 2} fill="#123252" stroke="#2e63a4" strokeWidth="4" />
        {tasks.length === 0 ? null : (
          segments.map(({ task, start, end, mid }, i) => {
            const [fill, dark] = EFFORT_FILL[task.effort]
            const shape =
              n === 1 ? ( // a full-circle "arc" degenerates to nothing, so draw a disc
                <circle cx={R} cy={R} r={R - 6} fill={fill} stroke="#0c2338" strokeWidth="2" />
              ) : (
                <path d={arcPath(start, end)} fill={i % 2 === 0 ? fill : dark} stroke="#0c2338" strokeWidth="2" />
              )
            const labelR = R * 0.62
            const lx = R + labelR * Math.sin(mid)
            const ly = R - labelR * Math.cos(mid)
            const deg = (mid * 180) / Math.PI
            // radial text; flip any label whose final rotation would render upside down
            let labelDeg = (deg + 90) % 360
            if (labelDeg > 90 && labelDeg < 270) labelDeg -= 180
            const name = task.name.length > 14 ? task.name.slice(0, 13) + '…' : task.name
            return (
              <g key={task.id}>
                {shape}
                {task.priority === 'urgent' && (
                  <text
                    x={R + (R * 0.87) * Math.sin(mid)}
                    y={R - (R * 0.87) * Math.cos(mid) + 7}
                    textAnchor="middle"
                    fontSize="20"
                  >
                    ⚡
                  </text>
                )}
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  fill="#0c2338"
                  fontSize={n > 10 ? 11 : 13}
                  fontWeight="800"
                  transform={`rotate(${labelDeg} ${lx} ${ly})`}
                >
                  {name}
                </text>
              </g>
            )
          })
        )}
        {/* rim studs */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6
          return <circle key={i} cx={R + (R - 10) * Math.sin(a)} cy={R - (R - 10) * Math.cos(a)} r="4" fill="#eef7ef" opacity="0.85" />
        })}
      </svg>
      {tasks.length === 0 ? (
        // nothing to spin — a happy Luffy takes the hub instead of the spin button
        <div className="wheel-hub wheel-hub--empty">
          <img src="/luffy-easy.png" alt="All done!" draggable={false} />
        </div>
      ) : (
        <button
          className="wheel-hub wheel-hub--btn"
          aria-label="Spin the wheel"
          title="Spin the wheel"
          disabled={spinDisabled || spinning}
          onClick={onSpin}
        >
          <JollyRoger size={64} spinning={spinning} />
        </button>
      )}
    </div>
  )
}
