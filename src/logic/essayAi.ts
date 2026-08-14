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
import { GRADES, MECHANICAL_ISSUES, WORD_OPTIONS, buildOptions, essayText } from './essay'
import { askOpenRouter, shortAiError, sliceJson } from './openrouter'

export { aiReady as essayAiReady } from './openrouter'

/** Shown on the Topics tab, so the desk is honest about whose key is being spent. */
export const ESSAY_MODEL_NOTE =
  'Uses the same OpenRouter key as the Gym coach (Gym → Coach → Settings), but picks its own models — 60 seconds each, then the next one.'

const TITLE = 'Wheels of Procrastination Essays'

/**
 * One minute per model, not three.
 *
 * The Gym coach can afford to wait: it plans one session a day and nobody is
 * watching the screen. The essay desk is different — somebody is sitting there
 * holding a phone — and a model that hasn't answered in a minute is stuck, not
 * thinking. So we cut it off and ask a different one.
 */
export const ESSAY_TIMEOUT_MS = 60_000

/**
 * The queue, tried in order until one answers.
 *
 * The essay desk picks its own models rather than following the Gym coach's
 * setting (`aiConfig.model`): the two jobs are different sizes, and one of them
 * having a slow day should not stall the other. They are all Chinese
 * open-weight models on OpenRouter, chosen for cost per token rather than
 * leaderboard position — this job is "read 300 words and answer in small JSON",
 * which any of them does well, and a frontier model would cost 20× for no
 * better marking.
 *
 * Edit freely: anything OpenRouter serves works, and an id it doesn't recognise
 * just fails fast onto the next one.
 */
export const ESSAY_MODELS = [
  'z-ai/glm-4.6', // Zhipu — fast, cheap, very steady on structured JSON
  'qwen/qwen3-235b-a22b-instruct-2507', // Alibaba — cheap, strong on language work
  'deepseek/deepseek-chat-v3.1', // DeepSeek's always-on chat line, as the backstop
]

/** Which model we're on right now, so the UI can say so and count down. */
export interface EssayAttempt {
  model: string
  index: number // 1-based
  total: number
  timeoutMs: number
}

export interface EssayCtx {
  ai: AiConfig | null
  onAttempt?: (a: EssayAttempt) => void
}

/** The failure reason, phrased against the 60-second cut-off rather than the Gym's. */
export function essayAiError(e: unknown): string {
  return shortAiError(e, ESSAY_TIMEOUT_MS)
}

/**
 * Ask the queue. Each model gets 60 seconds; a timeout, a dead id, a rate limit
 * or a garbled reply all mean the same thing here — move on. The last model's
 * error is what surfaces, with the ones before it named, so a failure says
 * which models were actually tried.
 */
async function askEssay(
  ctx: EssayCtx,
  opts: { system: string; prompt: string; temperature?: number },
): Promise<string> {
  const queue = ESSAY_MODELS
  const tried: string[] = []
  let last: unknown

  for (const [i, model] of queue.entries()) {
    ctx.onAttempt?.({ model, index: i + 1, total: queue.length, timeoutMs: ESSAY_TIMEOUT_MS })
    try {
      return await askOpenRouter({
        key: key(ctx.ai),
        model,
        title: TITLE,
        timeoutMs: ESSAY_TIMEOUT_MS,
        ...opts,
      })
    } catch (e) {
      tried.push(model)
      last = e
    }
  }
  throw new Error(`${essayAiError(last)}${tried.length > 1 ? ` · tried ${tried.join(', ')}` : ''}`)
}

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
export async function suggestTopics(ctx: EssayCtx, count: number, avoid: string[], steer: string): Promise<TopicOffer[]> {
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

  const reply = await askEssay(ctx, {
    system:
      'You design writing assignments for middle-school students. You answer with raw JSON and nothing else, and you never repeat a topic you were told to avoid.',
    prompt,
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
 * Mark up one submission — **mechanics only**: spelling, punctuation, capital
 * letters. Whether the argument holds up, whether the paragraph wanders, whether
 * it's any good: that is the parent's judgement, made by hand, and it is
 * deliberately not delegated to a cheap model.
 *
 * The other hard rule — repeated three times in the prompt, because models love
 * to be helpful — is that it must never supply the corrected text. He has to
 * find the fix himself; that is the entire exercise.
 */
export async function reviewEssay(ctx: EssayCtx, essay: Essay, topicBlurb: string): Promise<DraftComment[]> {
  const prompt = `${whoBlock(essay.authorName)}

He was asked to write about: "${essay.topicTitle}"${topicBlurb ? ` — ${topicBlurb}` : ''}

His essay:
"""
${essayBlock(essay)}
"""

Proofread it. Look ONLY for these three things:
1. "spelling" — every misspelled word. One note each, with the misspelled word EXACTLY as he typed it in "quote". For these, ALSO fill in two extra fields the app needs and he never sees:
   - "correct": the word spelled properly.
   - "options": ${WORD_OPTIONS - 1} WRONG spellings of that same word — plausible ones a 12-year-old would actually produce (a doubled letter, two letters swapped, a missing vowel, ie/ei the wrong way round). Do NOT include the correct spelling in this list.
2. "punctuation" — a missing or wrong full stop, comma, question mark or apostrophe. Put the two or three words around the problem in "quote".
3. "case" — a capital-letter mistake: a lowercase "i" for the word I, a sentence that doesn't start with a capital, a name or a place without one, or a capital in the middle of a word. Put the word in "quote".

Do NOT comment on anything else. Say nothing about his ideas, his structure, how clear it is, how interesting it is, or how it could be better — someone else is handling all of that. If the spelling and punctuation are clean, answer with an empty list.

ABSOLUTE RULES:
- The "text" of a note is the ONLY thing he reads, and it must NEVER contain the answer.
  * BANNED in "text": the correctly spelled word, in any form. Never "it should be 'because'", never "the right spelling is...", never "change it to...", never spelling it out letter by letter, never the word in quotes, brackets or capitals.
  * INSTEAD, "text" is a TIP that helps him work it out himself: point at the part of the word that is wrong ("the middle of this word has a sound you didn't write"), name the rule ("this one follows i-before-e"), or tell him what to do ("say it out loud slowly and count the sounds — one is missing").
  * The same goes for punctuation and capitals: say what is missing or wrong, not the corrected text.
- Write every note in simple language a ${schoolProfile().age}-year-old understands. Short sentences. No grammar jargon: say "this needs a full stop" not "terminal punctuation is absent".
- Canadian spellings (colour, favourite, centre, travelled) are CORRECT. Never flag one as a misspelling.
- "quote" must be text copied EXACTLY from the essay, character for character. If you cannot copy it exactly, leave "quote" out.
- "para" is the paragraph number as labelled above (1, 2, 3…), or 0 for the title.

Answer with ONLY this JSON array, no prose and no markdown fence:
[{"para": <number>, "quote": "<exact text from the essay>", "issue": "spelling|punctuation|case", "text": "<the tip, max 25 words, NEVER containing the answer>", "correct": "<spelling notes only>", "options": [<spelling notes only>]}]`

  const reply = await askEssay(ctx, {
    system:
      'You are a careful proofreader for a middle-school student. You mark spelling, punctuation and capital letters ONLY. You never give the answer: your notes are hints that help the student find the mistake himself, because being handed the correct spelling teaches him nothing. You answer with raw JSON and nothing else.',
    prompt,
    temperature: 0.2,
  })

  const raw = JSON.parse(sliceJson(reply, '[', ']')) as unknown
  if (!Array.isArray(raw)) throw new Error('the model did not answer with a list')
  const out: DraftComment[] = []
  for (const row of raw as Record<string, unknown>[]) {
    const text = typeof row.text === 'string' ? row.text.trim() : ''
    if (!text) continue
    // Anything off-list lands on `punctuation`, which is the one mechanical kind
    // the app never closes by itself — a mislabelled note can't slip through.
    const issue = MECHANICAL_ISSUES.includes(row.issue as EssayComment['issue'])
      ? (row.issue as EssayComment['issue'])
      : 'punctuation'
    // "PARAGRAPH 1" is index 0; 0 means the title, which we store as -1
    const paraRaw = Math.round(Number(row.para))
    const para = Number.isFinite(paraRaw) ? Math.min(Math.max(paraRaw - 1, -1), essay.paragraphs.length - 1) : 0
    const quote = typeof row.quote === 'string' ? row.quote.trim() : ''
    const correct = issue === 'spelling' && typeof row.correct === 'string' ? row.correct.trim() : ''
    const offered = Array.isArray(row.options) ? row.options.filter((o): o is string => typeof o === 'string') : []
    out.push({
      para,
      issue,
      // The prompt forbids leaking the answer; this is what happens when it does
      // it anyway. Models are helpful by reflex and one slip hands him the word.
      text: safeTip(text, correct).slice(0, 220),
      ...(quote ? { quote: quote.slice(0, 120) } : {}),
      ...(correct ? { correct, options: buildOptions(correct, offered) } : {}),
    })
  }
  // An empty list is a real answer now: "nothing misspelled" is a thing a
  // proofreader is allowed to say, and it is what a clean second round looks like.
  return out
}

/**
 * The last line of defence on "never give him the answer".
 *
 * The prompt says it four ways, and a helpful model will still occasionally
 * write "it should be *because*". One leak undoes the exercise, and he only has
 * to be handed the word once to stop looking it up — so anything containing the
 * correct spelling is thrown away and replaced with a tip that carries no
 * answer. A blander note is a far smaller loss than a free answer.
 */
function safeTip(text: string, correct: string): string {
  if (!correct) return text
  const leaks = new RegExp(`\\b${correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  // letter-by-letter spelling ("b-e-c-a-u-s-e") sneaks past a word-boundary test
  const spelledOut = correct.length > 3 && text.toLowerCase().includes(correct.toLowerCase().split('').join('-'))
  if (!leaks.test(text) && !spelledOut) return text
  return 'Say this word out loud, slowly, and listen to every sound — one part of it isn’t written the way it sounds.'
}

/**
 * One word, circled by hand.
 *
 * The parent's red pen says "this is misspelled" and nothing more — the note
 * carries the wrong word, never the right one. The bank needs the right one, so
 * the smallest possible call goes and gets it, along with the near misses the
 * test is built from. Nothing the model returns here is ever shown to him: he
 * only ever sees the seven options.
 */
export async function spellWord(
  ctx: EssayCtx,
  typed: string,
  sentence: string,
): Promise<{ correct: string; options: string[] } | null> {
  const prompt = `A ${schoolProfile().age}-year-old Canadian student misspelled a word in his essay.

He wrote: "${typed}"
The sentence it came from: "${sentence.slice(0, 240)}"

Give the word spelled properly, plus ${WORD_OPTIONS - 1} WRONG spellings of that same word — plausible ones a ${schoolProfile().age}-year-old would actually produce (a doubled letter, two letters swapped, a missing vowel, ie/ei the wrong way round). Do NOT include the correct spelling among the wrong ones.

Canadian spellings (colour, favourite, centre, travelled) are CORRECT — if he already spelled it the Canadian way, that IS the correct spelling.
If "${typed}" is in fact spelled correctly, answer with {"correct": "${typed}", "options": []}.

Answer with ONLY this JSON object, no prose and no markdown fence:
{"correct": "<the right spelling>", "options": [<${WORD_OPTIONS - 1} wrong spellings>]}`

  const reply = await askEssay(ctx, {
    system:
      'You are a careful proofreader for a middle-school student. You answer with raw JSON and nothing else.',
    prompt,
    temperature: 0.2,
  })

  const row = JSON.parse(sliceJson(reply, '{', '}')) as Record<string, unknown>
  const correct = typeof row.correct === 'string' ? row.correct.trim() : ''
  if (!correct) return null
  const offered = Array.isArray(row.options) ? row.options.filter((o): o is string => typeof o === 'string') : []
  return { correct, options: buildOptions(correct, offered) }
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
export async function checkFixes(ctx: EssayCtx, essay: Essay, open: EssayComment[]): Promise<FixVerdict[]> {
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
- "fixed" = the problem is genuinely gone. A spelling note is fixed only when the word is now spelled correctly; a capital-letter note only when the capital is right; a punctuation note only when the mark is actually there and correct. Anything else is fixed only when the problem itself is gone, not merely reworded.
- "unfixed" = still there, or he changed something else instead, or he made it worse.
- The note is one short sentence for HIM, in simple language. If it is still unfixed, say what is still wrong WITHOUT writing the correction — never spell the word out for him, never say "it should be X". A hint about the sound or the rule, nothing more.

Answer with ONLY this JSON array, no prose and no markdown fence:
[{"id": "<the id above>", "verdict": "fixed|unfixed", "note": "<max 20 words>"}]`

  const reply = await askEssay(ctx, {
    system:
      'You check a student\'s corrections. You are fair and strict: a note is only "fixed" when the problem is genuinely gone. You never write the correction yourself. You answer with raw JSON and nothing else.',
    prompt,
    temperature: 0.2,
  })

  const raw = JSON.parse(sliceJson(reply, '[', ']')) as unknown
  if (!Array.isArray(raw)) throw new Error('the model did not answer with a list')
  const byId = new Map(open.map((c) => [c.id, c]))
  const out: FixVerdict[] = []
  for (const row of raw as Record<string, unknown>[]) {
    const id = typeof row.id === 'string' ? row.id : ''
    const note = byId.get(id)
    if (!note || out.some((v) => v.id === id)) continue
    out.push({
      id,
      verdict: row.verdict === 'fixed' ? 'fixed' : 'unfixed',
      // scrubbed against the same word, for the same reason as the review itself
      note: typeof row.note === 'string' ? safeTip(row.note.trim(), note.correct ?? '').slice(0, 200) : '',
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
export async function gradeEssay(ctx: EssayCtx, essay: Essay): Promise<GradeResult> {
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

  const reply = await askEssay(ctx, {
    system:
      'You are an encouraging middle-school teacher writing a report-card comment. You are honest about the grade and kind about the person. You answer with raw JSON and nothing else.',
    prompt,
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
