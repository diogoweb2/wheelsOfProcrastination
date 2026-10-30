// 🏫 St. Eugene 7 (§24ab) — "🧭 How do I start?", on the question itself.
//
// The 🧭 Tips tab is where the plan is learned. This is where it is USED: the
// same five moves, folded into one line, on the card he is stuck on, so that
// getting to them costs no decision and loses no place in the lesson.
//
// It is NOT a hint. §24f's "🤔 I don't get it yet" works the same question out
// on different numbers and marks the answer `helped`, because that is the
// answer moving towards him. A plan is a way to start, it is the same four
// lines on every question in the year, and reading it is not evidence of
// anything — so it records nothing, and he never has to weigh "will Dad see
// that I looked".
//
// Opened once, it stays open for the rest of the lesson. He should not have to
// re-decide to ask for the plan on every card, and a boy who is reading the
// plan on card three probably wants it on card four.
import { useState } from 'react'
import { sfx } from '../../audio'
import { speak, canSpeak } from '../../lib/speak'
import type { SeTipPlan } from '../../steugene/tips'

export function SePlanBox({
  plan,
  open,
  onOpen,
  rate,
}: {
  plan: SeTipPlan
  open: boolean
  onOpen: () => void
  rate: number
}) {
  // Which step he is on, so it is one instruction at a time rather than a
  // second wall of text under the first one.
  const [step, setStep] = useState(0)
  const spoken = plan.steps.map((s, i) => `${i + 1}. ${s.do}`).join(' ')

  if (!open) {
    return (
      <button
        className="btn btn--ghost btn--small se-plan__ask"
        onClick={() => {
          sfx.click()
          onOpen()
        }}
      >
        🧭 How do I start?
      </button>
    )
  }

  const s = plan.steps[step]
  return (
    <div className="se-plan">
      <div className="se-plan__bar">
        <span className="se-plan__name">
          {plan.emoji} {plan.title}
        </span>
        {canSpeak() && (
          <button
            className="btn btn--ghost btn--small se-speak"
            onClick={() => speak(spoken, rate)}
            aria-label="Read the plan out loud"
            title="Read the plan out loud"
          >
            🔊
          </button>
        )}
      </div>

      <ol className="se-plan__dots" aria-label="the five moves">
        {plan.steps.map((_, i) => (
          <li key={i}>
            <button
              className={`se-plan__dot${i === step ? ' se-plan__dot--on' : ''}${i < step ? ' se-plan__dot--done' : ''}`}
              onClick={() => {
                sfx.tick()
                setStep(i)
              }}
              aria-label={`Move ${i + 1}`}
              aria-current={i === step}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      <p className="se-plan__do">{s.do}</p>
      {s.like && <p className="se-plan__like">{s.like}</p>}

      {step < plan.steps.length - 1 ? (
        <button
          className="btn btn--ghost btn--small se-plan__more"
          onClick={() => {
            sfx.click()
            setStep(step + 1)
          }}
        >
          Next move →
        </button>
      ) : (
        <div className="se-plan__foot">That is the whole plan. Have a go — nobody is counting this.</div>
      )}
    </div>
  )
}
