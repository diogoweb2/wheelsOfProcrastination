// The essay desk's AI, over OpenRouter. Four jobs, four prompts:
//
//   1. suggestTopics  — propose things to write about, never repeating one that
//                       has already been offered (kept OR binned)
//   2. reviewEssay    — circle the spelling and punctuation, and say what's hard
//                       to follow. NEVER write the sentence for him.
//   3. checkFixes     — did he actually fix each note? one verdict per note
//   4. gradeEssay     — a letter from C- to A+, plus two sentences of feedback
//
// Everything is validated on the way back in: an unknown note id, a made-up
// grade or a missing field is dropped rather than trusted. Every call throws a
// readable error on failure — the desk shows it, nothing is faked.
import type { AiConfig, Essay, EssayComment, EssayGrade } from '../types'
import { GRADES, essayText } from './essay'
import { DEFAULT_MODEL, askOpenRouter, sliceJson } from './openrouter'

export { aiReady as essayAiReady, shortAiError as essayAiError } from './openrouter'

/** Offered in the Topics tab. Any OpenRouter model id can be typed in instead (Gym → Coach owns the setting). */
export const ESSAY_MODEL_NOTE = 'Uses the same OpenRouter key and model as the Gym coach (Gym → Coach → Settings).'

const TITLE = 'Wheels of Procrastination Essays'

/**
 * Who is writing. Ben was born in 2014 and goes to a TCDSB (Toronto Catholic
 * District School Board) school, so the topics have to be Ontario-curriculum
 * plausible, Canadian, and fine to hand to a Catholic-school teacher — and the
 * spelling rules are Canadian English (colour, favourite, practise the verb).
 *
 * The school year flips in September, so the grade is derived rather than
 * hard-coded: this feature should still be right next September without an edit.
 */
export const BIRTH_YEAR = 2014

export function schoolProfile(now = new Date()): { age: number; grade: number } {
  const year = now.getFullYear()
  const schoolYearStart = now.getMonth() >= 8 ? year : year - 1 // September = month 8
  return {
    age: year - BIRTH_YEAR - (now.getMonth() >= 8 ? 0 : 1),
    grade: Math.min(12, Math.max(1, schoolYearStart - BIRTH_YEAR - 5)),
  }
}

function whoBlock(name: string): string {
  const { age, grade } = schoolProfile()
  return `The writer is ${name}, ${age} years old, in Grade ${grade} at a TCDSB (Toronto Catholic District School Board) school in Toronto, Ontario, Canada.
Everything must fit the Ontario curriculum for that grade and be appropriate for a Catholic school.
Spelling is CANADIAN English (colour, favourite, neighbour, centre, travelled).`
}

function model(ai: AiConfig | null): string {
  return ai?.model?.trim() || DEFAULT_MODEL
}

function key(ai: AiConfig | null): string {
  const k = ai?.openrouterKey?.trim()
  if (!k) throw new Error('No OpenRouter key set yet — add one in Gym → Coach → Settings.')
  return k
}

// --- 1. topic ideas ---------------------------------------------------------

export interface TopicOffer {
  title: string
  blurb: string
  subject: string
}

/**
 * Propose `count` topics, avoiding everything already offered. The avoid list is
 * sent verbatim: this is what keeps the tenth batch from being the first batch
 * with different words.
 */
export async function suggestTopics(ai: AiConfig | null, count: number, avoid: string[], steer: string): Promise<TopicOffer[]> {
  const avoidBlock = avoid.length
    ? `These have ALREADY been offered. Do not repeat any of them, and do not offer a rewording of one:\n${avoid.map((t) => `- ${t}`).join('\n')}`
    : 'Nothing has been offered yet.'

  const prompt = `${whoBlock('a student')}

Propose ${count} DIFFERENT essay topics he could write about.

${avoidBlock}
${steer.trim() ? `\nThe parent asked for topics along these lines: "${steer.trim()}"\n` : ''}
Rules for the topics:
- Each one must be something a Grade ${schoolProfile().grade} student can write 150–300 words about from his own head, with no research and no internet.
- Mix the kinds: a personal-experience one, an opinion one, a "explain how something works" one, a "what would you do" one, a school/community one.
- Nothing that needs sources, statistics or adult knowledge. Nothing political, violent, or about anyone's private life.
- Interesting to a ${schoolProfile().age}-year-old boy — sports, video games, science, animals, friends, food, and school all count.
- The blurb is spoken TO him, in one short sentence, telling him what the essay should cover.

Answer with ONLY this JSON array, no prose and no markdown fence:
[{"title": "<max 8 words>", "blurb": "<one sentence, max 25 words>", "subject": "<one word, e.g. Science / Sports / Community / Opinion / Story>"}]`

  const reply = await askOpenRouter({
    key: key(ai),
    model: model(ai),
    system:
      'You design writing assignments for middle-school students. You answer with raw JSON and nothing else, and you never repeat a topic you were told to avoid.',
    prompt,
    title: TITLE,
    temperature: 1,
  })

  const raw = JSON.parse(sliceJson(reply, '[', ']')) as unknown
  if (!Array.isArray(raw)) throw new Error('the model did not answer with a list')
  const seen = new Set(avoid.map((t) => t.toLowerCase().trim()))
  const out: TopicOffer[] = []
  for (const row of raw as Record<string, unknown>[]) {
    const title = typeof row.title === 'string' ? row.title.trim().slice(0, 90) : ''
    if (!title || seen.has(title.toLowerCase())) continue
    seen.add(title.toLowerCase())
    out.push({
      title,
      blurb: typeof row.blurb === 'string' ? row.blurb.trim().slice(0, 200) : '',
      subject: typeof row.subject === 'string' ? row.subject.trim().slice(0, 20) : 'Writing',
    })
  }
  if (!out.length) throw new Error('every idea it sent back was one we already had — try again')
  return out
}

// --- 2. the review ----------------------------------------------------------

export type DraftComment = Omit<EssayComment, 'id' | 'round' | 'status' | 'source'>

function essayBlock(essay: Essay): string {
  return `TITLE: ${essay.title || '(no title yet)'}
${essay.paragraphs.map((p, i) => `PARAGRAPH ${i + 1}: ${p}`).join('\n')}`
}

/**
 * Mark up one submission. The hard rule — repeated three times in the prompt
 * because models love to be helpful — is that it must never supply the
 * corrected text. He has to find the fix himself; that is the entire exercise.
 */
export async function reviewEssay(ai: AiConfig | null, essay: Essay, topicBlurb: string): Promise<DraftComment[]> {
  const prompt = `${whoBlock(essay.authorName)}

He was asked to write about: "${essay.topicTitle}"${topicBlurb ? ` — ${topicBlurb}` : ''}

His essay:
"""
${essayBlock(essay)}
"""

Mark it up for him. Give:
1. Every MISSPELLED word — one note each, with the misspelled word EXACTLY as he typed it in "quote".
2. Every PUNCTUATION mistake — a missing or wrong full stop, comma, apostrophe or capital letter. Put the two or three words around the problem in "quote" so it can be circled.
3. Two to five notes on the WRITING itself: a sentence that is hard to understand, a paragraph that jumps around, a point that needs an example, a word repeated too often.
4. One or two "praise" notes on what genuinely works. Be honest — do not invent praise.

ABSOLUTE RULES:
- NEVER write the correction. Do not give the correct spelling, do not rewrite his sentence, do not show him the fixed version. Say WHAT is wrong and WHY it matters, and let him fix it.
- Write every note in simple language a ${schoolProfile().age}-year-old understands. Short sentences. No grammar jargon: say "this needs a full stop" not "terminal punctuation is absent".
- Be kind but honest. He is practising, and a note he can act on is a gift.
- "quote" must be text copied EXACTLY from the essay, character for character. If you cannot copy it exactly, leave "quote" out.
- "para" is the paragraph number as labelled above (1, 2, 3…), or 0 for the title.

Answer with ONLY this JSON array, no prose and no markdown fence:
[{"para": <number>, "quote": "<exact text from the essay, or omit>", "issue": "spelling|punctuation|clarity|idea|praise", "text": "<the note, max 30 words>"}]`

  const reply = await askOpenRouter({
    key: key(ai),
    model: model(ai),
    system:
      'You are a patient middle-school writing teacher. You point out what is wrong and never fix it yourself, because the student learns by fixing it. You answer with raw JSON and nothing else.',
    prompt,
    title: TITLE,
    temperature: 0.4,
  })

  const raw = JSON.parse(sliceJson(reply, '[', ']')) as unknown
  if (!Array.isArray(raw)) throw new Error('the model did not answer with a list')
  const issues: EssayComment['issue'][] = ['spelling', 'punctuation', 'clarity', 'idea', 'praise']
  const out: DraftComment[] = []
  for (const row of raw as Record<string, unknown>[]) {
    const text = typeof row.text === 'string' ? row.text.trim() : ''
    if (!text) continue
    const issue = issues.includes(row.issue as EssayComment['issue']) ? (row.issue as EssayComment['issue']) : 'clarity'
    // "PARAGRAPH 1" is index 0; 0 means the title, which we store as -1
    const paraRaw = Math.round(Number(row.para))
    const para = Number.isFinite(paraRaw) ? Math.min(Math.max(paraRaw - 1, -1), essay.paragraphs.length - 1) : 0
    const quote = typeof row.quote === 'string' ? row.quote.trim() : ''
    out.push({ para, issue, text: text.slice(0, 220), ...(quote ? { quote: quote.slice(0, 120) } : {}) })
  }
  if (!out.length) throw new Error('the review came back empty')
  return out
}

// --- 3. did he fix it? ------------------------------------------------------

export interface FixVerdict {
  id: string
  verdict: 'fixed' | 'unfixed'
  note: string
}

/**
 * One verdict per still-open note, comparing what he submitted last round with
 * what he just sent. Spelling verdicts are trusted outright by the store (a word
 * is right or it isn't); everything else is only ever a recommendation for the
 * parent, who has the last word.
 */
export async function checkFixes(ai: AiConfig | null, essay: Essay, open: EssayComment[]): Promise<FixVerdict[]> {
  const previous = essay.versions[essay.versions.length - 2]
  const prompt = `${whoBlock(essay.authorName)}

He was given notes on his essay and asked to fix them himself. Here is what he handed back.

${previous ? `His PREVIOUS version:\n"""\n${essayText(previous)}\n"""\n` : ''}
His NEW version:
"""
${essayBlock(essay)}
"""

The notes he was supposed to fix:
${open
  .map(
    (c) =>
      `- id=${c.id} [${c.issue}]${c.quote ? ` about "${c.quote}"` : ''} in ${c.para < 0 ? 'the title' : `paragraph ${c.para + 1}`}: ${c.text}`,
  )
  .join('\n')}

For EACH note, decide whether the new version actually deals with it.
- "fixed" = the problem is genuinely gone. A spelling note is only fixed when the word is now spelled correctly. A clarity note is fixed when the sentence is now easy to follow — not merely reworded.
- "unfixed" = still there, or he changed something else instead, or he made it worse.
- The note is one short sentence for HIM, in simple language. If it is still unfixed, say what is still wrong WITHOUT writing the correction.

Answer with ONLY this JSON array, no prose and no markdown fence:
[{"id": "<the id above>", "verdict": "fixed|unfixed", "note": "<max 20 words>"}]`

  const reply = await askOpenRouter({
    key: key(ai),
    model: model(ai),
    system:
      'You check a student\'s corrections. You are fair and strict: a note is only "fixed" when the problem is genuinely gone. You never write the correction yourself. You answer with raw JSON and nothing else.',
    prompt,
    title: TITLE,
    temperature: 0.2,
  })

  const raw = JSON.parse(sliceJson(reply, '[', ']')) as unknown
  if (!Array.isArray(raw)) throw new Error('the model did not answer with a list')
  const known = new Set(open.map((c) => c.id))
  const out: FixVerdict[] = []
  for (const row of raw as Record<string, unknown>[]) {
    const id = typeof row.id === 'string' ? row.id : ''
    if (!known.has(id) || out.some((v) => v.id === id)) continue
    out.push({
      id,
      verdict: row.verdict === 'fixed' ? 'fixed' : 'unfixed',
      note: typeof row.note === 'string' ? row.note.trim().slice(0, 200) : '',
    })
  }
  if (!out.length) throw new Error('it answered about none of the notes')
  return out
}

// --- 4. the grade -----------------------------------------------------------

export interface GradeResult {
  grade: EssayGrade
  good: string
  improve: string
}

/**
 * The closing letter. C- is the floor on purpose: he only ever reaches this
 * point after fixing everything he was asked to fix, so the grade measures the
 * writing, not his obedience — and the bottom of the scale is still a pass.
 */
export async function gradeEssay(ai: AiConfig | null, essay: Essay): Promise<GradeResult> {
  const rounds = essay.round
  const prompt = `${whoBlock(essay.authorName)}

He was asked to write about: "${essay.topicTitle}"

His finished essay:
"""
${essayBlock(essay)}
"""

He went through ${rounds} round${rounds === 1 ? '' : 's'} of corrections and fixed every note he was given.

Give it a report-card grade for a Grade ${schoolProfile().grade} student: one of ${GRADES.join(', ')}. Nothing lower than C- exists here.
Judge: does it answer the topic, is it organised, is it interesting to read, are the sentences clear, is the spelling and punctuation clean NOW.
Grade him against what is good for HIS grade level, not against an adult.

Then write two short pieces of feedback, straight to him, in simple language:
- "good": what he genuinely did well. Be specific — name the actual thing in his essay.
- "improve": the ONE thing to work on next time. One thing, not a list. Say it kindly and concretely.

Answer with ONLY this JSON object, no prose and no markdown fence:
{"grade": "<one of the grades above>", "good": "<max 40 words>", "improve": "<max 40 words>"}`

  const reply = await askOpenRouter({
    key: key(ai),
    model: model(ai),
    system:
      'You are an encouraging middle-school teacher writing a report-card comment. You are honest about the grade and kind about the person. You answer with raw JSON and nothing else.',
    prompt,
    title: TITLE,
    temperature: 0.3,
  })

  const obj = JSON.parse(sliceJson(reply, '{', '}')) as Record<string, unknown>
  const grade = GRADES.includes(obj.grade as EssayGrade) ? (obj.grade as EssayGrade) : null
  if (!grade) throw new Error(`"${String(obj.grade)}" isn't a grade on the scale`)
  return {
    grade,
    good: typeof obj.good === 'string' ? obj.good.trim().slice(0, 300) : '',
    improve: typeof obj.improve === 'string' ? obj.improve.trim().slice(0, 300) : '',
  }
}

/** A topic the parent typed themselves still needs the shape the AI ones have. */
export function manualTopic(title: string, blurb: string, subject: string): TopicOffer {
  return { title: title.trim().slice(0, 90), blurb: blurb.trim().slice(0, 200), subject: subject.trim().slice(0, 20) || 'Writing' }
}
