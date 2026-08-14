// Essay rules — everything that doesn't need the network or React.
// Keep in sync with BUSINESS_REQUIREMENTS.md §19.
import type { Essay, EssayComment, EssayGrade, EssayTopic, EssayWord, EssayWordTest } from '../types'
import { proofread, type RuleHit } from './proofreader'

/** Best first. The list is also the order the "what each grade pays" table shows. */
export const GRADES: EssayGrade[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-']

/**
 * Berries per grade. Calibrated against the rest of the economy (a hard quest
 * pays 35, a Streak Freeze costs 150): an essay is days of work and a review
 * loop, so even the bottom of the scale beats a quest, and the top of it buys
 * something real. The table is shown to the writer BEFORE he starts — the point
 * is that the reward for trying harder is visible while he's deciding how hard
 * to try.
 */
export const GRADE_COINS: Record<EssayGrade, number> = {
  'A+': 200,
  A: 170,
  'A-': 150,
  'B+': 130,
  B: 110,
  'B-': 95,
  'C+': 80,
  C: 65,
  'C-': 50,
}

/** Default length target for a new topic — about three short paragraphs. */
export const DEFAULT_MIN_WORDS = 150

/** How many topic ideas one "ask the AI" round brings back. */
export const TOPIC_BATCH = 6

/** Kept essays per author. Old graded ones drop off the end of the shared doc. */
export const ESSAY_CAP = 40

export function gradeCoins(grade: EssayGrade | undefined): number {
  return grade ? GRADE_COINS[grade] : 0
}

/** Colour band for a grade chip: A = gold, B = blue, C = bronze. */
export function gradeTint(grade: EssayGrade): string {
  if (grade.startsWith('A')) return 'var(--gold)'
  if (grade.startsWith('B')) return 'var(--blue)'
  return 'var(--bronze)'
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function essayWords(essay: Pick<Essay, 'paragraphs'>): number {
  return essay.paragraphs.reduce((n, p) => n + wordCount(p), 0)
}

/** The full essay as one block of text — what the AI reads, and what a version snapshot compares against. */
export function essayText(essay: Pick<Essay, 'title' | 'paragraphs'>): string {
  return [essay.title, ...essay.paragraphs].join('\n\n')
}

export function openComments(essay: Essay): EssayComment[] {
  return essay.comments.filter((c) => c.status === 'open' && c.issue !== 'praise')
}

/**
 * Nothing left to argue about — the essay can be graded.
 *
 * The app's own rule notes deliberately don't count as "it has been marked":
 * they are raised before anyone reads the essay (§19e-4), so an essay that
 * arrives already tidy would otherwise look ready to grade before a single
 * person or model had looked at it.
 */
export function readyToGrade(essay: Essay): boolean {
  return wasMarked(essay) && openComments(essay).length === 0
}

/** Has anything other than the built-in rules had its say on this essay yet? */
export function wasMarked(essay: Essay): boolean {
  return essay.comments.some((c) => c.source !== 'app')
}

/** Notes raised in the current round, newest round first — what the writer is looking at right now. */
export function commentsForRound(essay: Essay, round: number): EssayComment[] {
  return essay.comments.filter((c) => c.round === round)
}

/** Can he send it in? Needs a title and something to say. */
export function canSubmit(essay: Essay, minWords: number): { ok: boolean; why: string } {
  if (!essay.title.trim()) return { ok: false, why: 'Give it a title first.' }
  const words = essayWords(essay)
  if (words < Math.min(30, minWords)) return { ok: false, why: `Only ${words} words — write a bit more first.` }
  return { ok: true, why: '' }
}

/**
 * Split one paragraph into plain text and circled bits, given the notes that
 * point at it.
 *
 * The AI hands back a `quote`, not an offset — offsets drift the moment he edits
 * a word, quotes don't. Each quote claims its first occurrence that no earlier
 * note already took, so "the the" flagged twice circles both. A quote that isn't
 * in the paragraph at all (the model paraphrased) is simply skipped: the note
 * still appears in the list, it just has nothing to point at.
 */
export interface TextChunk {
  text: string
  comment?: EssayComment
}

const WORD_CHAR = /[A-Za-z0-9]/
const APOSTROPHE = /['’]/

/**
 * Is the character at `i` part of a word?
 *
 * Letters and digits always are. An apostrophe counts **only when it sits
 * between two letters** — inside "that's" it is part of the word, at either
 * edge ("'roblox", "friends'") it isn't. That split matters in both directions:
 *
 * - a quote may legitimately start or end against an apostrophe that belongs to
 *   the quote itself, so an apostrophe can't be word-glue everywhere;
 * - a quote must not be allowed to start **inside** a word. The AI came back
 *   with the quote `s roblox` for a missing apostrophe in "thats roblox"; once
 *   he fixed it to "that's roblox", that quote still matched — the apostrophe
 *   wasn't a word character, so "s" looked like a word of its own. The note
 *   could never close, so a problem he had fixed stayed circled forever and the
 *   essay could never be graded.
 */
function wordCharAt(text: string, i: number): boolean {
  const ch = text[i]
  if (!ch) return false
  if (WORD_CHAR.test(ch)) return true
  if (!APOSTROPHE.test(ch)) return false
  return WORD_CHAR.test(text[i - 1] ?? '') && WORD_CHAR.test(text[i + 1] ?? '')
}

/**
 * Is the match at `at` a whole word rather than a fragment of a bigger one?
 *
 * This is not a nicety. A note quoting the single letter "i" matched the **i in
 * "life"** with a plain substring search, so the app drew a red circle around a
 * perfectly good word and told a 12-year-old to fix it. A quote only counts
 * where its own edges are word characters butting against non-word ones.
 */
function wholeWordAt(text: string, at: number, quote: string): boolean {
  if (wordCharAt(quote, 0) && wordCharAt(text, at - 1)) return false
  const last = quote.length - 1
  if (wordCharAt(quote, last) && wordCharAt(text, at + quote.length)) return false
  return true
}

/** Does this exact text still appear in the essay, as its own word? */
export function containsQuote(text: string, quote: string): boolean {
  let from = 0
  for (;;) {
    const at = text.indexOf(quote, from)
    if (at === -1) return false
    if (wholeWordAt(text, at, quote)) return true
    from = at + 1
  }
}

/** Where one note lands in one part of the text. */
export interface MarkSpan {
  start: number
  end: number
  comment: EssayComment
}

/**
 * Every note's slice of this paragraph, in reading order and never overlapping.
 *
 * Both ways of showing a marked-up essay are built on this: the read-back view
 * (which splits the text into plain and circled chunks) and the reviewer's focus
 * mode (which needs to know, per word, whether something is already flagged
 * there).
 */
export function markSpans(paragraph: string, comments: EssayComment[]): MarkSpan[] {
  const spans: MarkSpan[] = []
  const taken: [number, number][] = []

  for (const c of comments) {
    const quote = c.quote?.trim()
    if (!quote) continue
    let from = 0
    for (;;) {
      const at = paragraph.indexOf(quote, from)
      if (at === -1) break
      const end = at + quote.length
      if (wholeWordAt(paragraph, at, quote) && !taken.some(([s, e]) => at < e && s < end)) {
        spans.push({ start: at, end, comment: c })
        taken.push([at, end])
        break
      }
      from = at + 1
    }
  }

  return spans.sort((a, b) => a.start - b.start)
}

export function markUp(paragraph: string, comments: EssayComment[]): TextChunk[] {
  const spans = markSpans(paragraph, comments)
  const out: TextChunk[] = []
  let cursor = 0
  for (const s of spans) {
    if (s.start > cursor) out.push({ text: paragraph.slice(cursor, s.start) })
    out.push({ text: paragraph.slice(s.start, s.end), comment: s.comment })
    cursor = s.end
  }
  if (cursor < paragraph.length) out.push({ text: paragraph.slice(cursor) })
  return out.length ? out : [{ text: paragraph }]
}

/**
 * How much text around a mark the writer gets to edit (§19e-5).
 *
 * A spelling note is about one word, and handing him the sentence to retype
 * invites him to rewrite around the problem instead of solving it — so spelling
 * (and a missing capital, which is the same word with a different first letter)
 * opens the **word alone**.
 *
 * Everything else is rarely fixable inside the mark: "hard to follow" on three
 * words usually needs the words on either side moving too. Those open the
 * **sentence** the mark sits in, capped at `CONTEXT_WORDS` either side so a
 * paragraph written as one long sentence doesn't become the whole paragraph.
 */
export const CONTEXT_WORDS = 10

/** Issues that open just the marked word, with no room around it. */
const TIGHT_ISSUES: EssayComment['issue'][] = ['spelling', 'case']

const SENTENCE_END = '.!?\n'

function backWords(text: string, at: number, n: number): number {
  let i = at
  for (let w = 0; w < n && i > 0; w++) {
    while (i > 0 && /\s/.test(text[i - 1])) i--
    while (i > 0 && !/\s/.test(text[i - 1])) i--
  }
  return i
}

function forwardWords(text: string, at: number, n: number): number {
  let i = at
  for (let w = 0; w < n && i < text.length; w++) {
    while (i < text.length && /\s/.test(text[i])) i++
    while (i < text.length && !/\s/.test(text[i])) i++
  }
  return i
}

/** The slice of `text` the writer edits to deal with one mark. */
export function editWindow(
  text: string,
  span: { start: number; end: number },
  issue: EssayComment['issue'],
): { start: number; end: number } {
  if (TIGHT_ISSUES.includes(issue)) return { start: span.start, end: span.end }

  let start = 0
  for (let i = span.start - 1; i > 0; i--) {
    if (SENTENCE_END.includes(text[i])) {
      start = i + 1
      break
    }
  }
  let end = text.length
  for (let i = span.end; i < text.length; i++) {
    if (SENTENCE_END.includes(text[i])) {
      end = i + 1
      break
    }
  }

  start = Math.max(start, backWords(text, span.start, CONTEXT_WORDS))
  end = Math.min(end, forwardWords(text, span.end, CONTEXT_WORDS))
  // never open on a leading space — it reads as a typo he didn't make
  while (start < span.start && /\s/.test(text[start])) start++
  return { start, end }
}

/** The colour a circled word gets, by what's wrong with it. */
export function issueTint(issue: EssayComment['issue']): string {
  switch (issue) {
    case 'spelling':
      return 'var(--red)'
    case 'punctuation':
      return 'var(--orange)'
    case 'case':
      return 'var(--ice)'
    case 'praise':
      return 'var(--green)'
    default:
      return 'var(--yellow)'
  }
}

export const ISSUE_LABEL: Record<EssayComment['issue'], string> = {
  spelling: 'Spelling',
  punctuation: 'Punctuation',
  case: 'Capital letter',
  clarity: 'Hard to follow',
  idea: 'Make it stronger',
  praise: 'Nice one',
}

export const ISSUE_EMOJI: Record<EssayComment['issue'], string> = {
  spelling: '🔤',
  punctuation: '✏️',
  case: '🔠',
  clarity: '🤔',
  idea: '💡',
  praise: '⭐',
}

/**
 * What the AI is allowed to look for. Everything here has a right answer, which
 * is the entire reason a cheap model can be trusted with it.
 */
export const MECHANICAL_ISSUES: EssayComment['issue'][] = ['spelling', 'punctuation', 'case']

/**
 * The two the app closes without asking a human. A word is spelled right or it
 * isn't, and "i" either got its capital or it didn't — making a parent tick off
 * thirty of those by hand is how a good idea stops getting used. Punctuation
 * stays manual: a model's opinion about a comma is an opinion.
 */
export const AUTO_CLOSE_ISSUES: EssayComment['issue'][] = ['spelling', 'case']

/**
 * How long the writer must wait between self-checks. Each one is a real AI call
 * on Dad's credit, and without a cooldown "send" becomes a button he mashes.
 */
export const RESEND_COOLDOWN_MS = 5 * 60_000

/** Milliseconds still to wait before he can send again. 0 = go ahead. */
export function resendWaitMs(essay: Essay, now = Date.now()): number {
  if (!essay.lastCheckAt) return 0
  return Math.max(0, new Date(essay.lastCheckAt).getTime() + RESEND_COOLDOWN_MS - now)
}

/** m:ss, for a button that has to say how long the wait is. */
export function waitClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Close the machine's notes the app can settle by itself, for free.
 *
 * The reviewer should never have to tick off spelling. The AI finds it, the
 * writer fixes it, and the app notices — no button, no second AI call, no
 * credits. The test is deliberately literal:
 *
 * - the flagged text is **gone from the essay** (whole-word, so "realy" is not
 *   found inside "really"), and
 * - where we know the right spelling, it is **now present**.
 *
 * A word he changed into a *different* wrong spelling therefore stays open,
 * which is exactly right: he hasn't fixed it. Only the AI's own mechanical
 * notes are eligible — a note the parent wrote by hand is the parent's to close.
 *
 * Returns null when nothing moved, so callers can skip a pointless write.
 */
export function autoResolve(essay: Essay): EssayComment[] | null {
  let changed = false
  const next = essay.comments.map((c) => {
    if (c.status !== 'open' || c.source === 'parent' || !MECHANICAL_ISSUES.includes(c.issue)) return c
    const quote = c.quote?.trim()
    // Scoped to the note's OWN part, exactly like the marking is. Checking the
    // whole essay instead let a note stay open because the same slip appeared in
    // a paragraph it wasn't about — leaving the reviewer with a note in the list
    // and nothing circled in the text. An open note always has a visible mark.
    const part = partText(essay, c.para)
    if (!quote || containsQuote(part, quote)) return c
    // he changed it into something else wrong — not our call to close
    if (c.correct && !containsQuote(part, c.correct)) return c
    changed = true
    return { ...c, status: 'fixed' as const, resolvedAt: new Date().toISOString() }
  })
  return changed ? next : null
}

/** The text one note points at: the title for -1, otherwise that paragraph ('' if it's gone). */
export function partText(essay: Pick<Essay, 'title' | 'paragraphs'>, para: number): string {
  return para < 0 ? essay.title : (essay.paragraphs[para] ?? '')
}

/** Is there something to circle for this note right now? Drives the "go to it" button. */
export function hasMark(essay: Pick<Essay, 'title' | 'paragraphs'>, c: EssayComment): boolean {
  const quote = c.quote?.trim()
  return !!quote && containsQuote(partText(essay, c.para), quote)
}

/** Notes raised by a machine — the AI's proofreading and the app's own rules. Never the parent's. */
export function isMachineNote(c: EssayComment): boolean {
  return c.source !== 'parent' && MECHANICAL_ISSUES.includes(c.issue)
}

/**
 * Re-run the built-in rules and make the note list say what they say right now.
 *
 * Three things happen in one pass, because they're the same question asked from
 * different ends:
 *
 * - a rule that no longer fires **closes its note** — the exact test, rather
 *   than "is the quoted text still there?", which got this wrong: fixing the
 *   one lowercase sentence-start the note pointed at left the note open if any
 *   other paragraph happened to contain that same word;
 * - a rule that still fires **refreshes its note's quote**, so the mark moves on
 *   to the next offender instead of pointing at text he already fixed. The
 *   invariant is that an open note always has something visible to point at;
 * - a rule that fires with no open note of its own **gets one**.
 *
 * One note per rule per part throughout. A rule the reviewer threw out
 * (`dismissed`) never comes back, and wording the reviewer rewrote is never
 * overwritten — the rule owns the mark, the human owns the words.
 *
 * Returns null when nothing moved, so callers can skip a pointless write.
 */
export function syncRuleNotes(essay: Essay, round: number): EssayComment[] | null {
  const hits = proofread(essay)
  const now = new Date().toISOString()
  let changed = false

  const next: EssayComment[] = essay.comments.map((c) => {
    if (!c.rule || c.status !== 'open') return c
    const hit = hits.find((h) => h.rule === c.rule && h.para === c.para)
    if (!hit) {
      changed = true
      return { ...c, status: 'fixed' as const, resolvedAt: now }
    }
    const text = c.edited ? c.text : hit.text
    if (hit.quote === c.quote && text === c.text) return c
    changed = true
    return { ...c, quote: hit.quote, text }
  })

  for (const hit of hits) {
    const seen = essay.comments.filter((c) => c.rule === hit.rule && c.para === hit.para)
    if (seen.some((c) => c.dismissed)) continue
    if (next.some((c) => c.rule === hit.rule && c.para === hit.para && c.status === 'open')) continue
    changed = true
    next.push({
      id: crypto.randomUUID(),
      round,
      status: 'open',
      para: hit.para,
      quote: hit.quote,
      text: hit.text,
      issue: hit.issue,
      source: 'app',
      rule: hit.rule,
    })
  }

  return changed ? next : null
}

/**
 * The app's own rule notes that are still open — the gate the writer has to get
 * through before anyone (or anything) reads his essay (§19e-4).
 */
export function openRuleNotes(essay: Essay): EssayComment[] {
  return essay.comments.filter((c) => c.source === 'app' && c.status === 'open')
}

/**
 * What the rules say about the text he has in front of him *right now*, before
 * any of it is saved. This is what makes the gate feel like a spell-checker
 * instead of a submission: the list shrinks as he types.
 *
 * Rules the reviewer already disagreed with are left out, exactly as they are
 * on the stored list.
 */
export function liveRuleHits(essay: Essay, draft: { title: string; paragraphs: string[] }): RuleHit[] {
  const dismissed = new Set(essay.comments.filter((c) => c.dismissed).map((c) => `${c.rule}:${c.para}`))
  return proofread(draft).filter((h) => !dismissed.has(`${h.rule}:${h.para}`))
}

/** Still-open notes the app is willing to judge on its own. */
export function openAutoIssues(essay: Essay): EssayComment[] {
  return openComments(essay).filter((c) => AUTO_CLOSE_ISSUES.includes(c.issue))
}

/** Still-misspelled words: the gate he has to get through before Dad sees it again. */
export function openSpelling(essay: Essay): EssayComment[] {
  return openComments(essay).filter((c) => c.issue === 'spelling')
}

/** Topics the writer is allowed to pick from right now. */
export function writableTopics(topics: EssayTopic[]): EssayTopic[] {
  return topics.filter((t) => t.status === 'kept' && t.enabled)
}

/** Every title the AI must never propose again — kept AND binned. */
export function usedTitles(topics: EssayTopic[]): string[] {
  return topics.map((t) => t.title)
}

// --- the writer's own ideas (§19c-1) ----------------------------------------
//
// A topic he picked himself is the one he'll actually want to write, so he can
// ask for one — but asking is all he can do. The suggestion sits in the same
// list as everything else, marked `suggested`, and nothing about it reaches his
// write screen until Diogo approves it.

/**
 * How many of his asks can be waiting at once. Not a punishment: three pending
 * ideas is already more than a parent wants to read in one sitting, and a queue
 * of thirty is how a good idea turns into something nobody answers.
 */
export const SUGGEST_CAP = 3

/** Everything waiting on the parent's answer, oldest first — that's the order to read them in. */
export function pendingTopics(topics: EssayTopic[]): EssayTopic[] {
  return topics.filter((t) => t.status === 'suggested')
}

/** One writer's asks — pending and answered — newest first. */
export function myTopicAsks(topics: EssayTopic[], profileId: string | null | undefined): EssayTopic[] {
  if (!profileId) return []
  return topics
    .filter((t) => t.source === 'kid' && t.suggestedById === profileId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Answered, but he hasn't read the answer yet — what the badge and the banner are counting. */
export function unseenTopicAnswers(topics: EssayTopic[], profileId: string | null | undefined): EssayTopic[] {
  return myTopicAsks(topics, profileId).filter((t) => t.status !== 'suggested' && t.decidedAt && !t.seenAt)
}

/** May he send another one? Only the still-unanswered ones count against the cap. */
export function canSuggestTopic(
  topics: EssayTopic[],
  profileId: string | null | undefined,
): { ok: boolean; why: string } {
  const waiting = pendingTopics(topics).filter((t) => t.suggestedById === profileId).length
  if (waiting >= SUGGEST_CAP) {
    return { ok: false, why: `You already have ${waiting} ideas waiting for Dad. Wait for those first.` }
  }
  return { ok: true, why: '' }
}

/** Is this title already on the list (in any state)? Stops the same idea being asked twice. */
export function titleTaken(topics: EssayTopic[], title: string): boolean {
  const want = title.trim().toLowerCase()
  return !!want && topics.some((t) => t.title.trim().toLowerCase() === want)
}

// --- the word bank ----------------------------------------------------------
//
// Every word the proofreader catches goes in here with the right spelling and a
// set of near-identical wrong ones. It is a spelling list made entirely of HIS
// mistakes, it never closes, and the test can be taken as often as he likes —
// but each word only pays the first time he gets it right, so a retake is
// practice, not a Berry tap.

/** Berries for a word answered correctly for the first time ever, in a final test. */
export const WORD_COIN = 5

/** How many options one question shows. */
export const WORD_OPTIONS = 7

/** A practice round is short on purpose — it should be over before it feels like homework. */
export const PRACTICE_SIZE = 5

/** The bank is permanent, but not infinite. */
export const WORD_CAP = 300

export function wordsAddedSince(words: EssayWord[], tests: EssayWordTest[]): EssayWord[] {
  const last = tests[tests.length - 1]
  if (!last) return words
  return words.filter((w) => w.addedAt > last.at)
}

/** Words he has never yet got right in a test — what practice should be made of. */
export function shakyWords(words: EssayWord[]): EssayWord[] {
  return words.filter((w) => !w.masteredAt)
}

export function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The words a practice round asks about: the shaky ones first, then anything. */
export function practiceSet(words: EssayWord[], size = PRACTICE_SIZE): EssayWord[] {
  const shaky = shuffle(shakyWords(words))
  const rest = shuffle(words.filter((w) => w.masteredAt))
  return [...shaky, ...rest].slice(0, size)
}

/**
 * Plausible wrong spellings, generated locally — the safety net for when the
 * model returns too few. Every rule here is a mistake a real 12-year-old makes:
 * doubling the wrong letter, swapping two letters over, dropping a vowel,
 * getting ie/ei the wrong way round.
 */
export function nearMisses(word: string): string[] {
  const out = new Set<string>()
  const w = word.toLowerCase()
  const vowels = 'aeiou'

  for (let i = 0; i < w.length; i++) {
    if (w[i] === w[i + 1]) out.add(w.slice(0, i) + w.slice(i + 1)) // undouble
    else out.add(w.slice(0, i + 1) + w[i] + w.slice(i + 1)) // double
    if (i < w.length - 1) out.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2)) // swap
    if (vowels.includes(w[i]) && w.length > 3) out.add(w.slice(0, i) + w.slice(i + 1)) // drop a vowel
  }
  out.add(w.replace('ie', 'ei'))
  out.add(w.replace('ei', 'ie'))
  out.add(`${w}e`)
  out.delete(w)
  return [...out].filter((x) => x.length > 1)
}

/**
 * The final option list: the right spelling, plus wrong ones, shuffled. The
 * model's suggestions come first (they're the interesting near-misses), topped
 * up locally so a lazy answer still produces a real question.
 */
export function buildOptions(correct: string, offered: string[]): string[] {
  const seen = new Set([correct.toLowerCase()])
  const wrong: string[] = []
  for (const o of [...offered, ...nearMisses(correct)]) {
    const clean = o.trim()
    if (!clean || seen.has(clean.toLowerCase())) continue
    seen.add(clean.toLowerCase())
    wrong.push(clean)
    if (wrong.length >= WORD_OPTIONS - 1) break
  }
  return shuffle([correct, ...wrong])
}

export function newEssay(topic: EssayTopic, authorId: string, authorName: string): Essay {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    topicId: topic.id,
    topicTitle: topic.title,
    authorId,
    authorName,
    title: '',
    paragraphs: [''],
    status: 'writing',
    round: 0,
    comments: [],
    versions: [],
    createdAt: now,
    updatedAt: now,
  }
}
