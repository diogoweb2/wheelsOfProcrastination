// Essay rules — everything that doesn't need the network or React.
// Keep in sync with BUSINESS_REQUIREMENTS.md §19.
import type { Essay, EssayComment, EssayGrade, EssayTopic } from '../types'

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

/** Nothing left to argue about — the essay can be graded. */
export function readyToGrade(essay: Essay): boolean {
  return essay.comments.length > 0 && openComments(essay).length === 0
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

export function markUp(paragraph: string, comments: EssayComment[]): TextChunk[] {
  const spans: { start: number; end: number; comment: EssayComment }[] = []
  const taken: [number, number][] = []

  for (const c of comments) {
    const quote = c.quote?.trim()
    if (!quote) continue
    let from = 0
    for (;;) {
      const at = paragraph.indexOf(quote, from)
      if (at === -1) break
      const end = at + quote.length
      if (!taken.some(([s, e]) => at < e && s < end)) {
        spans.push({ start: at, end, comment: c })
        taken.push([at, end])
        break
      }
      from = at + 1
    }
  }

  spans.sort((a, b) => a.start - b.start)
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
