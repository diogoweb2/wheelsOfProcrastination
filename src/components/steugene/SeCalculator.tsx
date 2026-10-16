// 🏫 St. Eugene 7 (§24n) — the calculator that sits on the lesson.
//
// It is there the whole time a maths lesson is running, because a calculator
// he has to go and find is a calculator he does not use, and the thing being
// taught in grade 7 is almost never the arithmetic. He can fold it down to a
// button when it is in the way, and send it to the other side of the screen
// when it is sitting on top of the answer buttons — both remembered, so he
// sets it once and never thinks about it again.
//
// Two deliberate choices:
//  · No `eval`. The expression is parsed here (recursive descent), so a
//    calculator cannot become a way to run anything, and "5 −" fails politely
//    instead of throwing.
//  · It shows the tidy fraction next to the decimal — 0.75 also reads as 3/4.
//    That conversion is half of this term's number sense, and seeing the two
//    forms side by side every time he divides is free teaching.
import { useEffect, useState } from 'react'
import { sfx } from '../../audio'
import { asFraction, evaluate, tidy } from '../../logic/seCalc'

/** Remembered between lessons: he sets it up once. */
const OPEN_KEY = 'se.calc.open'
const SIDE_KEY = 'se.calc.side'

function stored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private window, or storage full — the calculator still works */
  }
}

// --- the keypad ---------------------------------------------------------------

const KEYS: { label: string; kind?: 'op' | 'act' | 'go' }[] = [
  { label: 'C', kind: 'act' },
  { label: '⌫', kind: 'act' },
  { label: '(', kind: 'op' },
  { label: ')', kind: 'op' },
  { label: '7' },
  { label: '8' },
  { label: '9' },
  { label: '÷', kind: 'op' },
  { label: '4' },
  { label: '5' },
  { label: '6' },
  { label: '×', kind: 'op' },
  { label: '1' },
  { label: '2' },
  { label: '3' },
  { label: '−', kind: 'op' },
  { label: '0' },
  { label: '.' },
  { label: '±', kind: 'act' },
  { label: '+', kind: 'op' },
]

export function SeCalculator() {
  const [open, setOpen] = useState(() => stored(OPEN_KEY, 'open') === 'open')
  const [side, setSide] = useState(() => (stored(SIDE_KEY, 'right') === 'left' ? 'left' : 'right'))
  const [expr, setExpr] = useState('')
  const [locked, setLocked] = useState<string | null>(null) // the answer after =

  useEffect(() => remember(OPEN_KEY, open ? 'open' : 'shut'), [open])
  useEffect(() => remember(SIDE_KEY, side), [side])

  const live = locked === null ? evaluate(expr) : null
  const shown = locked ?? (live === null ? '' : tidy(live))
  const frac = locked !== null ? asFraction(Number(locked)) : live === null ? null : asFraction(live)

  const press = (label: string) => {
    sfx.click()
    if (label === 'C') {
      setExpr('')
      setLocked(null)
      return
    }
    if (label === '⌫') {
      setLocked(null)
      setExpr((e) => e.slice(0, -1))
      return
    }
    if (label === '±') {
      // Flip the number he is in the middle of typing, not the whole sum.
      setLocked(null)
      setExpr((e) => {
        const m = e.match(/(\d*\.?\d*)$/)
        const tail = m?.[1] ?? ''
        const head = e.slice(0, e.length - tail.length)
        return head.endsWith('−') ? head.slice(0, -1) + tail : `${head}−${tail}`
      })
      return
    }
    // Typing after "=" starts a new sum, unless he carries on with an operator.
    setExpr((e) => {
      const base = locked !== null ? (/[+−×÷]/.test(label) ? locked : '') : e
      return base + label
    })
    setLocked(null)
  }

  const equals = () => {
    const v = evaluate(expr)
    if (v === null) {
      sfx.error() // "5 ×" is not an answer — say so quietly and leave it on screen
      return
    }
    sfx.click()
    setLocked(tidy(v))
    setExpr(tidy(v))
  }

  if (!open) {
    return (
      <button
        className={`se-calc-fab se-calc-fab--${side}`}
        onClick={() => {
          sfx.click()
          setOpen(true)
        }}
        aria-label="Open the calculator"
        title="Calculator"
      >
        🧮
      </button>
    )
  }

  return (
    <div className={`se-calc se-calc--${side}`} role="group" aria-label="Calculator">
      <div className="se-calc__bar">
        <button
          className="se-calc__chip"
          onClick={() => {
            sfx.click()
            setSide((s) => (s === 'right' ? 'left' : 'right'))
          }}
          aria-label="Move the calculator to the other side"
          title="Other side"
        >
          ⇄
        </button>
        <span className="se-calc__name">🧮</span>
        <button
          className="se-calc__chip"
          onClick={() => {
            sfx.click()
            setOpen(false)
          }}
          aria-label="Fold the calculator away"
          title="Fold away"
        >
          ▁
        </button>
      </div>

      <div className="se-calc__screen">
        <div className="se-calc__expr">{expr || '0'}</div>
        <div className="se-calc__out">
          {shown && <span>= {shown}</span>}
          {frac && <span className="se-calc__frac">= {frac}</span>}
        </div>
      </div>

      <div className="se-calc__pad">
        {KEYS.map((k) => (
          <button
            key={k.label}
            className={`se-calc__key${k.kind ? ` se-calc__key--${k.kind}` : ''}`}
            onClick={() => press(k.label)}
          >
            {k.label}
          </button>
        ))}
        <button className="se-calc__key se-calc__key--go" onClick={equals}>
          =
        </button>
      </div>
    </div>
  )
}
