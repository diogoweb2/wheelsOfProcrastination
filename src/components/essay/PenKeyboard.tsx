// The app's own keyboard — the whole point of it is what it does NOT do.
//
// Android's keyboard autocorrects, autocapitalises and suggests the next word,
// which quietly does a chunk of the exercise for him: an essay is where you
// learn to spell, and a keyboard that fixes "definately" while he types means he
// never finds out he can't spell it. So the fields are marked `inputMode="none"`
// (the OS keyboard never opens) and this is what he types on instead.
//
// The layout is the standard US phone layout, key for key, so nothing he learns
// here has to be unlearned on a real keyboard.
import { useState } from 'react'
import { sfx } from '../../audio'

export type KeyPress =
  | { kind: 'char'; value: string }
  | { kind: 'backspace' }
  | { kind: 'enter' }

const LETTERS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const NUMBERS = ['1234567890', '-/:;()$&@"', '.,?!\'']
const SYMBOLS = ['[]{}#%^*+=', '_\\|~<>€£¥•', '.,?!\'']

type Layer = 'letters' | 'numbers' | 'symbols'
/** off → one capital, then back to lowercase. locked → CAPS LOCK, set by double-tap. */
type Shift = 'off' | 'on' | 'locked'

export function PenKeyboard({ onKey, onHide }: { onKey: (k: KeyPress) => void; onHide: () => void }) {
  const [layer, setLayer] = useState<Layer>('letters')
  const [shift, setShift] = useState<Shift>('off')

  const rows = layer === 'letters' ? LETTERS : layer === 'numbers' ? NUMBERS : SYMBOLS

  function type(ch: string) {
    sfx.click()
    onKey({ kind: 'char', value: layer === 'letters' && shift !== 'off' ? ch.toUpperCase() : ch })
    if (shift === 'on') setShift('off') // one capital, exactly like a real phone
  }

  return (
    // The (simulated) mousedown is swallowed so the field keeps focus and its
    // caret — a keyboard that steals the cursor would type into nothing. Touch
    // events are deliberately left alone: cancelling those cancels the click
    // that follows them, and then no key would work at all on a phone.
    <div className="kb" onMouseDown={(e) => e.preventDefault()}>
      <div className="kb-bar">
        <span className="kb-hint">✍️ No autocorrect — the spelling is yours</span>
        <button className="kb-key kb-key--wide" onClick={() => { sfx.click(); onHide() }}>
          ⌄ Hide
        </button>
      </div>

      {rows.map((row, i) => (
        <div className="kb-row" key={i}>
          {/* the bottom letter row is shift … m … backspace, as on a real phone */}
          {i === 2 && layer === 'letters' && (
            <button
              className={`kb-key kb-key--mod${shift !== 'off' ? ' is-on' : ''}`}
              onClick={() => {
                sfx.click()
                setShift(shift === 'off' ? 'on' : shift === 'on' ? 'locked' : 'off')
              }}
            >
              {shift === 'locked' ? '⇪' : '⇧'}
            </button>
          )}
          {i === 2 && layer !== 'letters' && (
            <button
              className="kb-key kb-key--mod"
              onClick={() => { sfx.click(); setLayer(layer === 'numbers' ? 'symbols' : 'numbers') }}
            >
              {layer === 'numbers' ? '#+=' : '123'}
            </button>
          )}
          {[...row].map((ch) => (
            <button className="kb-key" key={ch} onClick={() => type(ch)}>
              {layer === 'letters' && shift !== 'off' ? ch.toUpperCase() : ch}
            </button>
          ))}
          {i === 2 && (
            <button className="kb-key kb-key--mod" onClick={() => { sfx.click(); onKey({ kind: 'backspace' }) }}>
              ⌫
            </button>
          )}
        </div>
      ))}

      <div className="kb-row">
        <button
          className="kb-key kb-key--mod"
          onClick={() => { sfx.click(); setLayer(layer === 'letters' ? 'numbers' : 'letters') }}
        >
          {layer === 'letters' ? '?123' : 'ABC'}
        </button>
        <button className="kb-key" onClick={() => type(',')}>,</button>
        <button className="kb-key kb-key--space" onClick={() => type(' ')}>space</button>
        <button className="kb-key" onClick={() => type('.')}>.</button>
        <button className="kb-key kb-key--mod" onClick={() => { sfx.click(); onKey({ kind: 'enter' }) }}>
          ⏎
        </button>
      </div>
    </div>
  )
}
