// The rules that don't need a model.
//
// "A sentence starts with a capital letter" and "the word I is always a capital"
// are not judgement calls, and waiting on a language model to notice them is
// absurd: it costs money, it takes a minute, and it sometimes just... misses
// one. Everything in this file is decidable by looking at the characters, so the
// app decides it — instantly, offline, every single time, for free.
//
// The AI is left with the one job that genuinely needs it: is this word spelled
// right? Everything below runs before it and independently of it.
//
// Rules here must be near-certain. A false positive costs the reviewer a tap on
// "Disagree", so anything ambiguous ("a" vs "an" before a `u`, a lowercase word
// after a comma) is deliberately left out rather than guessed at.
import type { EssayIssue } from '../types'

export interface RuleHit {
  rule: string
  para: number // -1 = the title
  quote: string // exact text to mark, copied out of the essay
  issue: EssayIssue
  text: string // what he reads
  count: number // how many times this rule fired in this paragraph
}

/** Sentence-enders that are really abbreviations, so the next word is allowed to be lowercase. */
const ABBREVIATIONS = /\b(mr|mrs|ms|dr|st|vs|etc|e\.g|i\.e|jr|sr|no)\.$/i

/** Words where "a" is correct even though a vowel follows — the sound isn't a vowel sound. */
const A_BEFORE_VOWEL_OK = /^(one|once|euro|european|eu)/i

/** Squashed contractions with no other meaning in English — safe to flag on sight. */
const MISSING_APOSTROPHE = [
  'dont', 'doesnt', 'didnt', 'cant', 'wont', 'isnt', 'arent', 'wasnt', 'werent',
  'hasnt', 'havent', 'hadnt', 'couldnt', 'shouldnt', 'wouldnt', 'aint',
  'im', 'ive', 'youre', 'youve', 'theyre', 'theyve', 'weve', 'werent',
  'thats', 'whats', 'wheres', 'theres', 'heres', 'hes', 'shes', 'lets',
  'couldve', 'shouldve', 'wouldve', 'oclock',
]

/** Grow a match outwards to whole words, so the mark lands on words rather than mid-syllable. */
function expand(text: string, start: number, end: number): string {
  let a = start
  let b = end
  while (a > 0 && /\S/.test(text[a - 1])) a--
  while (b < text.length && /\S/.test(text[b])) b++
  return text.slice(a, b)
}

/** The last few words of a paragraph — unique enough to mark reliably. */
function tailQuote(text: string): string {
  const words = text.trim().split(/\s+/)
  return words.slice(-4).join(' ')
}

/**
 * Every rule, over one part of the essay. One hit per rule per part: three
 * lowercase "i"s in a paragraph are ONE note that says there are three, because
 * a note is only useful while it still has something to point at — and the mark
 * moves to the next one as he fixes them.
 */
export function proofreadPart(text: string, para: number): RuleHit[] {
  const hits: RuleHit[] = []
  const add = (rule: string, quote: string, issue: EssayIssue, note: string, count = 1) => {
    if (!quote.trim()) return
    hits.push({ rule, para, quote, issue, text: note, count })
  }
  const body = text.trim()
  if (!body) return hits

  // --- the word I ----------------------------------------------------------
  const lonelyI = [...text.matchAll(/(?<![A-Za-z0-9])i(?![A-Za-z0-9'’])/g)]
  if (lonelyI.length) {
    add(
      'lone-i',
      'i',
      'case',
      `The word I is ALWAYS a capital, anywhere in a sentence.${lonelyI.length > 1 ? ` There are ${lonelyI.length} in this paragraph.` : ''}`,
      lonelyI.length,
    )
  }

  const contractionI = [...text.matchAll(/(?<![A-Za-z0-9])i(?=['’](m|ve|ll|d)\b)/g)]
  if (contractionI.length) {
    add('lone-i-contraction', expand(text, contractionI[0].index, contractionI[0].index + 1), 'case',
      'The I in “I’m”, “I’ve” and “I’ll” is a capital too.', contractionI.length)
  }

  // --- a sentence starts with a capital ------------------------------------
  const starts: number[] = []
  if (/[a-z]/.test(body[0])) starts.push(text.indexOf(body[0]))
  for (const m of text.matchAll(/[.!?]["'’)\]]?\s+(?=[a-z])/g)) {
    const upTo = text.slice(0, m.index + 1)
    if (ABBREVIATIONS.test(upTo.trim())) continue // "Mr. smith" is a different problem
    starts.push(m.index + m[0].length)
  }
  if (starts.length) {
    add('sentence-capital', expand(text, starts[0], starts[0] + 1), 'case',
      `A new sentence always starts with a capital letter.${starts.length > 1 ? ` ${starts.length} sentences here don't.` : ''}`,
      starts.length)
  }

  // --- spacing around punctuation ------------------------------------------
  const squashed = [...text.matchAll(/[A-Za-z][.,!?;:][A-Za-z]/g)]
  if (squashed.length) {
    add('space-after-punct', expand(text, squashed[0].index, squashed[0].index + 3), 'punctuation',
      `A full stop or comma is always followed by a space before the next word.${squashed.length > 1 ? ` This happens ${squashed.length} times here.` : ''}`,
      squashed.length)
  }

  const floating = [...text.matchAll(/\S\s+[.,!?;:](\s|$)/g)]
  if (floating.length) {
    add('space-before-punct', expand(text, floating[0].index, floating[0].index + floating[0][0].length), 'punctuation',
      'A full stop or comma sticks to the word before it — no space in front of it.', floating.length)
  }

  // Two spaces between words is deliberately NOT a rule. It is invisible on the
  // page, a phone keyboard puts one there by itself, and circling it spends a
  // twelve-year-old's attention on something no reader will ever notice.

  const doublePunct = [...text.matchAll(/([,!?;:])\1+|\.{2}(?!\.)/g)]
  if (doublePunct.length) {
    add('double-punct', expand(text, doublePunct[0].index, doublePunct[0].index + doublePunct[0][0].length), 'punctuation',
      'You wrote that punctuation mark twice.', doublePunct.length)
  }

  // --- the paragraph has to end ---------------------------------------------
  if (para >= 0 && !/[.!?"'’)]$/.test(body)) {
    add('end-stop', tailQuote(text), 'punctuation', 'This paragraph doesn’t finish with a full stop.')
  }

  // --- two little words doing one job ----------------------------------------
  // "is a another way" — the advice for this is "delete one", not "use an", so it
  // gets its own rule and is kept out of the a/an one below.
  // "another" counts: it already means "an other", so a word in front of it is one too many.
  const doubleArticle = [...text.matchAll(/(?<![A-Za-z0-9])(a|an|the)\s+(a|an|the|another)(?![A-Za-z0-9])/gi)]
  if (doubleArticle.length) {
    add('double-article', doubleArticle[0][0], 'punctuation',
      'Two little words are doing the same job here — one of them has to go.', doubleArticle.length)
  }

  // --- a / an ----------------------------------------------------------------
  const aAn = [...text.matchAll(/(?<![A-Za-z0-9])a\s+(?=[aeioAEIO])(\w+)/g)].filter(
    (m) => !A_BEFORE_VOWEL_OK.test(m[1]) && !/^(a|an|the|another)$/i.test(m[1]),
  )
  if (aAn.length) {
    add('a-an', expand(text, aAn[0].index, aAn[0].index + aAn[0][0].length), 'punctuation',
      'Before a word that starts with a vowel sound, “a” becomes “an”.', aAn.length)
  }

  // --- said twice -------------------------------------------------------------
  const repeated = [...text.matchAll(/(?<![A-Za-z0-9])([A-Za-z]+)\s+\1(?![A-Za-z0-9])/gi)]
  if (repeated.length) {
    add('repeated-word', repeated[0][0], 'punctuation', 'You wrote the same word twice in a row.', repeated.length)
  }

  // --- missing apostrophes ----------------------------------------------------
  const squashedWords = [...text.matchAll(/(?<![A-Za-z0-9'’])[A-Za-z]+(?![A-Za-z0-9'’])/g)].filter((m) =>
    MISSING_APOSTROPHE.includes(m[0].toLowerCase()),
  )
  if (squashedWords.length) {
    add('apostrophe', squashedWords[0][0], 'punctuation',
      'This is two words squashed into one — it needs an apostrophe where the missing letters were.', squashedWords.length)
  }

  return hits
}

/** Run every rule over a whole essay. */
export function proofread(essay: { title: string; paragraphs: string[] }): RuleHit[] {
  return [
    ...proofreadPart(essay.title, -1),
    ...essay.paragraphs.flatMap((p, i) => proofreadPart(p, i)),
  ]
}
