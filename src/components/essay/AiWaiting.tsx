// The wait, made honest: which model is being asked, how many seconds it has
// left, and what happens when it runs out.
//
// A minute of a blank screen is indistinguishable from a hang, and the fix
// (drop this model, ask the next one) is invisible unless it's said out loud.
import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'

export function AiWaiting({ label }: { label: string }) {
  const { essayAttempt } = useStore()
  const [, tick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [])

  if (!essayAttempt) return null
  const { model, index, total, timeoutMs, startedAt } = essayAttempt
  const elapsed = Date.now() - startedAt
  const left = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000))
  const pct = Math.max(0, Math.min(100, 100 - (elapsed / timeoutMs) * 100))

  return (
    <div className="card ai-wait">
      <div className="ai-wait-head">
        <span className="ai-wait-spin">🤖</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{label}… {left}s</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 800, marginTop: 2, wordBreak: 'break-all' }}>
            model {index} of {total} · {model}
          </div>
        </div>
      </div>
      <div className="ai-wait-bar"><span style={{ width: `${pct}%` }} /></div>
      <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
        {index < total
          ? 'If it doesn’t answer in time, the next model gets asked automatically.'
          : 'Last model in the queue — if this one times out, try again in a minute.'}
      </p>
    </div>
  )
}
