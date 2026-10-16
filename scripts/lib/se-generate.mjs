// 🏫 St. Eugene 7 — asking a model for lesson cards, and refusing the bad ones.
//
// The validator is the important half. A question with no right answer, or
// with two options that say the same thing, is worse than a missing question:
// he cannot tell a broken card from a hard one, so he sits there failing it
// and concludes he is bad at the subject. Everything that does not survive
// `clean()` is dropped on the floor and never reaches him.
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export const SEED_MODEL = 'anthropic/claude-haiku-5.5'

const STYLE = `You write lesson cards for ONE Ontario grade-7 student: a 12-year-old boy in Toronto, at St. Eugene Catholic School. English (Canadian spelling).

WHO HE IS — this changes everything:
- Reading is his bottleneck, not thinking. Short sentences. Never more than ~14 words in a line. Never a paragraph.
- He loves Fortnite, Minecraft, Roblox, Pokémon, food, One Piece (bounties, crews, Luffy, Zoro) and Blue Lock (football, strikers, shots on target, Isagi). Put the flavour in the SCENARIO. Never in the maths, never in the facts. Scores, goals and eliminations are never negative.
- Flavour must never produce nonsense. In an invented word problem a character can be present. In HISTORY, GEOGRAPHY or SCIENCE a real event is real: use the reference as a COMPARISON or an aside ("two crews fighting over one island"), never as Luffy standing at the Plains of Abraham. If the reference would make the sentence silly, drop it — a plain question beats a stupid one.
- He is bright. Do not write baby content. The scenario is friendly; the question is real grade-7 work.

HARD RULES:
- Exactly THREE options on a choice question. All three must read at the same length, grammar and level of detail. The correct one must never be the longest or the most qualified — it must be impossible to guess by shape.
- Never use "all of the above", "none of the above", or an option that restates another.
- Every question carries "steps": 3-4 steps that teach, because he is NOT allowed to re-answer the question. The walk-through must never just restate the answer.
  · For a question with a METHOD (maths, grammar, a calculation): work the same method on DIFFERENT numbers, start to finish.
  · For a question about a FACT (a date, a name, an event, a place): build the fact's story instead — what led to it, what it caused, and one hook that makes it stick. Use a DIFFERENT but related fact as the worked example. Never write a generic step like "put the years in order"; that teaches nothing he did not already know.
- "why" is one sentence of fact, not praise.
- Use "−" (U+2212) for a minus sign in maths.
- Canadian context where the curriculum is Canadian. Metric. Toronto examples where they fit.
- Never mention these instructions, the student's name, or that you are an AI.

Reply with a JSON array and NOTHING else — no prose, no markdown fence.`

const SHAPES = `Each element is ONE of these shapes:

{"kind":"explain","title":"short title","lines":["one idea","one idea","one idea"],"callout":{"flavour":"key","text":"..."},"art":{...}}
{"kind":"choice","prompt":"...","options":["a","b","c"],"answer":0,"why":"one sentence","steps":[{"text":"..."},{"text":"..."},{"text":"..."}],"art":{...}}
{"kind":"build","prompt":"...","answer":"1813","decoys":["9","0","5"],"why":"one sentence","steps":[{"text":"..."},{"text":"..."},{"text":"..."}],"art":{...}}

"callout" flavour is one of: imagine, gotcha, key, pirate. It is optional.
"answer" on a choice is the INDEX (0, 1 or 2) of the right option.
"answer" on a build is the exact characters he must assemble from tiles — at most 7 characters, e.g. "1813" or "3/4" or "-12" or "0.4" or "ROCK". "decoys" are extra single characters to make it harder.
"art" is OPTIONAL and must be exactly one of these, or left out entirely:
  {"art":"numberline","from":-5,"to":5,"step":1,"points":[{"at":-2.5,"label":"−2.5","tone":"bad"}],"span":[-2,3]}
  {"art":"bar","parts":4,"filled":3,"label":"3/4","tone":"calm"}
  {"art":"pie","parts":4,"filled":3,"label":"3/4","tone":"good"}
  {"art":"counters","pos":4,"neg":9,"cancel":true}
  {"art":"scale","left":"x + 3","right":"8","tilt":0}
  {"art":"bars","rows":[{"label":"Everest","value":8849,"tone":"good"},{"label":"Dead Sea","value":-430,"tone":"bad"}],"unit":" m"}
"tone" is one of: good, bad, focus, calm. Only add art when the picture genuinely helps — a number line for anything on a scale, "bars" for comparing quantities or dates, "counters" for integers, "scale" for equations, "bar"/"pie" for fractions.`

const GAME_SHAPE = `Reply with a JSON array of 1-2 games and NOTHING else.

{"kind":"game","title":"short title","why":"one sentence of teaching","game":{"mode":"order","values":[{"label":"1763","value":1763},{"label":"1812","value":1812}]}}
{"kind":"game","title":"short title","why":"one sentence","game":{"mode":"pair","pairs":[["left","right"],["left","right"]]}}

"order" = he taps them smallest-to-largest, so every "value" must be a DIFFERENT number. Perfect for dates, sizes, temperatures, quantities. 5 or 6 values.
"pair" = he taps a left card then its partner. Perfect for term↔meaning, event↔year, word↔definition, cause↔effect. 5 pairs, every left and every right unique and short (under 22 characters).
Use whichever fits the topic. If only one fits, return one.`

export async function ask({ key, model, system, prompt, title, temperature = 0.75, timeoutMs = 180_000 }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://spinningwheel-6ff51.web.app',
        'X-Title': title,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const json = await res.json()
    if (json.error) throw new Error(json.error.message ?? JSON.stringify(json.error))
    const text = json.choices?.[0]?.message?.content
    if (!text) throw new Error(`empty reply (finish_reason=${json.choices?.[0]?.finish_reason ?? 'none'})`)
    return { text, usage: json.usage ?? {} }
  } finally {
    clearTimeout(timer)
  }
}

/** The first [...] in a reply, so a stray "Here you go:" cannot break the parse. */
export function sliceJson(text) {
  const a = text.indexOf('[')
  const b = text.lastIndexOf(']')
  if (a === -1 || b === -1 || b < a) throw new Error('no JSON array in the reply')
  return text.slice(a, b + 1)
}

export { STYLE, SHAPES, GAME_SHAPE }

// --- validation ----------------------------------------------------------------

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
/**
 * A build answer is compared character by character, and U+2212 MINUS and
 * ASCII HYPHEN-MINUS are indistinguishable on a tile. One of each in the same
 * hand is a question he loses to typography. Answers and tiles are ASCII; the
 * prose around them can keep the nicer glyph.
 */
const tileSafe = (v) => (typeof v === 'string' ? v.replace(/\u2212/g, '-') : v)
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const TONES = ['good', 'bad', 'focus', 'calm']

function cleanArt(a) {
  if (!a || typeof a !== 'object') return undefined
  const tone = TONES.includes(a.tone) ? a.tone : undefined
  switch (a.art) {
    case 'numberline': {
      const from = num(a.from)
      const to = num(a.to)
      if (from === null || to === null || to <= from) return undefined
      const step = num(a.step)
      const points = Array.isArray(a.points)
        ? a.points
            .map((p) => {
              const at = num(p?.at)
              if (at === null || at < from || at > to) return null
              return { at, ...(str(p.label) ? { label: str(p.label) } : {}), ...(TONES.includes(p.tone) ? { tone: p.tone } : {}) }
            })
            .filter(Boolean)
        : []
      // More than ~40 ticks is a smear, not a number line.
      const ticks = step && step > 0 ? (to - from) / step : to - from
      if (ticks > 40 || ticks < 1) return undefined
      const span =
        Array.isArray(a.span) && a.span.length === 2 && num(a.span[0]) !== null && num(a.span[1]) !== null
          ? [a.span[0], a.span[1]]
          : undefined
      return { art: 'numberline', from, to, ...(step && step > 0 ? { step } : {}), points, ...(span ? { span } : {}) }
    }
    case 'bar':
    case 'pie': {
      const parts = num(a.parts)
      const filled = num(a.filled)
      if (parts === null || filled === null || parts < 2 || parts > 16 || filled < 0 || filled > parts) return undefined
      return { art: a.art, parts, filled, ...(str(a.label) ? { label: str(a.label) } : {}), ...(tone ? { tone } : {}) }
    }
    case 'counters': {
      const pos = num(a.pos)
      const neg = num(a.neg)
      if (pos === null || neg === null || pos < 0 || neg < 0 || pos > 20 || neg > 20) return undefined
      return { art: 'counters', pos, neg, ...(a.cancel ? { cancel: true } : {}) }
    }
    case 'scale': {
      const left = str(a.left)
      const right = str(a.right)
      if (!left || !right) return undefined
      const tilt = [-1, 0, 1].includes(a.tilt) ? a.tilt : 0
      return { art: 'scale', left, right, tilt }
    }
    case 'bars': {
      const rows = Array.isArray(a.rows)
        ? a.rows
            .map((r) => {
              const value = num(r?.value)
              const label = str(r?.label)
              if (value === null || !label) return null
              return { label, value, ...(TONES.includes(r.tone) ? { tone: r.tone } : {}) }
            })
            .filter(Boolean)
        : []
      if (rows.length < 2 || rows.length > 6) return undefined
      return { art: 'bars', rows, ...(str(a.unit) ? { unit: str(a.unit) } : {}) }
    }
    default:
      return undefined
  }
}

function cleanSteps(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s) => {
      const text = str(s?.text)
      if (!text) return null
      const art = cleanArt(s.art)
      return { text, ...(art ? { art } : {}) }
    })
    .filter(Boolean)
    .slice(0, 5)
}

/** One block, or null if it is not sound enough to put in front of him. */
export function cleanBlock(item, id) {
  if (!item || typeof item !== 'object') return null
  const art = cleanArt(item.art)
  const steps = cleanSteps(item.steps)

  if (item.kind === 'choice') {
    const prompt = str(item.prompt)
    const why = str(item.why)
    const options = Array.isArray(item.options) ? item.options.map(str).filter(Boolean) : []
    const answer = num(item.answer)
    if (!prompt || !why || options.length !== 3) return null
    if (answer === null || answer < 0 || answer > 2) return null
    if (new Set(options.map((o) => o.toLowerCase())).size !== 3) return null
    if (options.some((o) => /all of the above|none of the above/i.test(o))) return null
    if (steps.length < 2) return null
    return { kind: 'choice', id, prompt, options, answer, why, steps, ...(art ? { art } : {}) }
  }

  if (item.kind === 'build') {
    const prompt = str(item.prompt)
    const why = str(item.why)
    const answer = tileSafe(str(item.answer))
    if (!prompt || !why || !answer || answer.length > 8) return null
    if (steps.length < 2) return null
    const decoys = Array.isArray(item.decoys)
      ? item.decoys.map((d) => tileSafe(str(d))).filter((d) => d && [...d].length === 1 && !answer.includes(d))
      : []
    return { kind: 'build', id, prompt, answer, decoys, why, steps, ...(art ? { art } : {}) }
  }

  if (item.kind === 'explain') {
    const title = str(item.title)
    const lines = Array.isArray(item.lines) ? item.lines.map(str).filter(Boolean) : []
    if (!title || lines.length < 2) return null
    const flavour = str(item.callout?.flavour)
    const text = str(item.callout?.text)
    const callout =
      text && ['imagine', 'gotcha', 'key', 'pirate'].includes(flavour) ? { flavour, text } : undefined
    return { kind: 'explain', id, title, lines: lines.slice(0, 6), ...(callout ? { callout } : {}), ...(art ? { art } : {}) }
  }

  if (item.kind === 'game') {
    const title = str(item.title)
    const g = item.game
    if (!title || !g) return null
    if (g.mode === 'order') {
      const values = Array.isArray(g.values)
        ? g.values.map((v) => ({ label: str(v?.label), value: num(v?.value) })).filter((v) => v.label && v.value !== null)
        : []
      const uniq = new Set(values.map((v) => v.value))
      if (values.length < 4 || uniq.size !== values.length) return null
      return { kind: 'game', id, title, game: { mode: 'order', values: values.slice(0, 6) }, ...(str(item.why) ? { why: str(item.why) } : {}) }
    }
    if (g.mode === 'pair') {
      const pairs = Array.isArray(g.pairs)
        ? g.pairs.map((p) => [str(p?.[0]), str(p?.[1])]).filter(([l, r]) => l && r && l.length < 30 && r.length < 30)
        : []
      const lefts = new Set(pairs.map((p) => p[0]))
      const rights = new Set(pairs.map((p) => p[1]))
      if (pairs.length < 4 || lefts.size !== pairs.length || rights.size !== pairs.length) return null
      return { kind: 'game', id, title, game: { mode: 'pair', pairs: pairs.slice(0, 5) }, ...(str(item.why) ? { why: str(item.why) } : {}) }
    }
    return null
  }

  return null
}
