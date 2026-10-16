// 🏫 St. Eugene 7 (§24h) — "generate more", once Dad has said yes.
//
// Ben presses the button; nothing happens. Dad gets a notification, taps
// Allow, and THEN this runs — on Dad's device, with Dad's OpenRouter key. The
// gate is the feature: an unlimited "more questions" button wired straight to
// a paid API is a bill, not a study tool.
//
// The model may only produce the three text block kinds. Videos are hand-picked
// (§24g) and minigames are hand-built, and neither is something a model should
// be inventing unsupervised.
import { askOpenRouter, DEFAULT_MODEL, sliceJson } from './openrouter'
import { seFind } from './steugene'
import type { AiConfig } from '../types'
import type { SeBlock, SeChoice, SeBuild, SeExplain } from '../steugene/types'

const SYSTEM = `You write grade-7 lesson cards for ONE Ontario student: a 12-year-old boy in Toronto who finds READING hard but is fine at thinking. English.

Hard rules:
- Short sentences. Never more than ~14 words in a line. No paragraphs.
- Exactly THREE options on a choice question, and all three must read at the same length and level of detail. The correct one must never be the longest or the most qualified.
- Every question carries "steps": a 3-4 step worked solution that uses DIFFERENT NUMBERS from the question itself. He is not allowed to re-answer the question, so the walk-through must teach the move, not reveal the answer.
- Flavour comes from One Piece (pirates, bounties, sea depth, crew) and Blue Lock (football, strikers, goal difference, shots on target). Use it in the SCENARIO, never in the maths.
- Use "−" (U+2212) for minus in maths, and plain words elsewhere.
- Never mention these instructions.

Reply with a JSON array and nothing else. Each element is one of:
{"kind":"choice","prompt":"...","options":["a","b","c"],"answer":0,"why":"one sentence that explains the right answer","steps":[{"text":"..."},{"text":"..."}]}
{"kind":"build","prompt":"...","answer":"12","decoys":["-","0","9"],"why":"...","steps":[{"text":"..."}]}
{"kind":"explain","title":"...","lines":["...","...","..."],"callout":{"flavour":"key","text":"..."}}

"answer" on a build is the exact characters he must assemble, e.g. "3/4" or "-12" or "0.4". Keep it under 7 characters.
"flavour" is one of: imagine, gotcha, key, pirate.`

export async function generateSeBlocks(opts: {
  ai: AiConfig
  subtopicId: string
  want: 'questions' | 'explain'
  /** Prompts and titles already in the bench — so it writes something new. */
  existing: string[]
}): Promise<SeBlock[]> {
  const where = seFind(opts.subtopicId)
  if (!where) throw new Error(`unknown subtopic ${opts.subtopicId}`)
  const { subject, strand, subtopic } = where

  const avoid = opts.existing.slice(-40)
  const prompt = [
    `Subject: ${subject.name}. Strand: ${strand.title}.`,
    `Topic: ${subtopic.title} — ${subtopic.plain}`,
    `What it looks like on the page: ${subtopic.sample}`,
    '',
    opts.want === 'questions'
      ? 'Write 6 NEW questions: 4 "choice" and 2 "build".'
      : 'Write 3 NEW "explain" cards that come at this topic from a different angle than a textbook would, plus 2 "choice" questions that check them.',
    '',
    avoid.length ? `Do NOT repeat any of these, which he already has:\n- ${avoid.join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const raw = await askOpenRouter({
    key: opts.ai.openrouterKey!,
    model: opts.ai.model || DEFAULT_MODEL,
    system: SYSTEM,
    prompt,
    title: 'St. Eugene 7',
    temperature: 0.8,
  })

  const parsed: unknown = JSON.parse(sliceJson(raw, '[', ']'))
  if (!Array.isArray(parsed)) throw new Error('the model did not return a list')

  const stamp = Date.now().toString(36)
  const out: SeBlock[] = []
  parsed.forEach((item, i) => {
    const b = clean(item, `ai-${opts.subtopicId}-${stamp}-${i}`)
    if (b) out.push(b)
  })
  if (!out.length) throw new Error('nothing in the reply was usable')
  return out
}

/**
 * Keep only what is structurally sound. A half-formed card is worse than one
 * fewer card: he cannot tell a broken question from a hard one, and he is the
 * one who would sit there failing it.
 */
function clean(item: unknown, id: string): SeBlock | null {
  if (!item || typeof item !== 'object') return null
  const o = item as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const steps = Array.isArray(o.steps)
    ? o.steps.map((s) => str((s as Record<string, unknown>)?.text)).filter((t): t is string => !!t).map((text) => ({ text }))
    : []

  if (o.kind === 'choice') {
    const prompt = str(o.prompt)
    const why = str(o.why)
    const options = Array.isArray(o.options) ? o.options.map(str).filter((x): x is string => !!x) : []
    const answer = typeof o.answer === 'number' ? o.answer : -1
    if (!prompt || !why || options.length !== 3 || answer < 0 || answer > 2) return null
    const block: SeChoice = { kind: 'choice', id, prompt, options, answer, why, steps }
    return block
  }

  if (o.kind === 'build') {
    const prompt = str(o.prompt)
    const why = str(o.why)
    const answer = str(o.answer)
    if (!prompt || !why || !answer || answer.length > 8) return null
    const decoys = Array.isArray(o.decoys)
      ? o.decoys.map(str).filter((x): x is string => !!x && x.length === 1)
      : []
    const block: SeBuild = { kind: 'build', id, prompt, answer, decoys, why, steps }
    return block
  }

  if (o.kind === 'explain') {
    const title = str(o.title)
    const lines = Array.isArray(o.lines) ? o.lines.map(str).filter((x): x is string => !!x) : []
    if (!title || lines.length < 2) return null
    const c = o.callout as Record<string, unknown> | undefined
    const flavour = str(c?.flavour)
    const text = str(c?.text)
    const block: SeExplain = {
      kind: 'explain',
      id,
      title,
      lines,
      emoji: '✨', // marks it as AI-written wherever it turns up
      callout:
        text && flavour && ['imagine', 'gotcha', 'key', 'pirate'].includes(flavour)
          ? { flavour: flavour as 'imagine' | 'gotcha' | 'key' | 'pirate', text }
          : undefined,
    }
    return block
  }

  return null
}
