// 🏫 St. Eugene 7 (§24o) — the arithmetic behind the lesson calculator.
//
// Split out from the component for one reason: it is the only part with a
// right answer, so it has to be testable without a browser.
//
// No `eval` anywhere. The expression is parsed by hand, so the calculator
// cannot become a way to run something, and a half-typed "5 ×" fails politely
// instead of throwing — half-typed is the normal state of this box.

/**
 * Evaluate `+ − × ÷ ( )` with the usual precedence, plus unary minus.
 * Returns null for anything incomplete or malformed — half-typed sums are the
 * normal state of this box, not an error worth shouting about.
 */
export function evaluate(src: string): number | null {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '')
  if (!s) return null
  let i = 0

  const expr = (): number | null => {
    let left = term()
    if (left === null) return null
    for (;;) {
      const op = s[i]
      if (op !== '+' && op !== '-') return left
      i++
      const right = term()
      if (right === null) return null
      left = op === '+' ? left + right : left - right
    }
  }

  const term = (): number | null => {
    let left = unary()
    if (left === null) return null
    for (;;) {
      const op = s[i]
      if (op !== '*' && op !== '/') return left
      i++
      const right = unary()
      if (right === null) return null
      if (op === '/' && right === 0) return null // he gets "—", not Infinity
      left = op === '*' ? left * right : left / right
    }
  }

  const unary = (): number | null => {
    if (s[i] === '-') {
      i++
      const v = unary()
      return v === null ? null : -v
    }
    if (s[i] === '+') {
      i++
      return unary()
    }
    return atom()
  }

  const atom = (): number | null => {
    if (s[i] === '(') {
      i++
      const v = expr()
      if (v === null || s[i] !== ')') return null
      i++
      return v
    }
    const start = i
    while (i < s.length && /[\d.]/.test(s[i])) i++
    if (i === start) return null
    const n = Number(s.slice(start, i))
    return Number.isFinite(n) ? n : null
  }

  const out = expr()
  return out !== null && i === s.length && Number.isFinite(out) ? out : null
}

/** Round off the floating-point dust: 0.1 + 0.2 should read 0.3. */
export function tidy(n: number): string {
  const r = Math.round(n * 1e10) / 1e10
  return String(r)
}

/**
 * The same number as a fraction, when there is a tidy one.
 *
 * Denominators up to 20 only, matched to within floating-point dust so that
 * 1 ÷ 3 = 0.3333333333 still reads as 1/3 — a repeating decimal IS the
 * fraction, and seeing both forms every time he divides is half of this
 * term's number sense for free. Anything that does not land on a small
 * denominator shows no fraction at all rather than a rounded guess.
 */
export function asFraction(n: number): string | null {
  if (!Number.isFinite(n) || Number.isInteger(n)) return null
  const sign = n < 0 ? '-' : ''
  const x = Math.abs(n)
  if (x > 1000) return null
  for (let d = 2; d <= 20; d++) {
    const top = x * d
    if (Math.abs(top - Math.round(top)) < 1e-9) {
      const t = Math.round(top)
      const g = gcd(t, d)
      if (d / g === 1) return null
      return `${sign}${t / g}/${d / g}`
    }
  }
  return null
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

