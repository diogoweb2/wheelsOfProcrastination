// What he changed since the last time it was marked.
//
// Round five of an essay looks exactly like round four to the reviewer: the same
// three hundred words, two of them different. Finding those two by re-reading is
// the fastest way to stop reviewing at all — so the app finds them instead, and
// the red pen shows them in red.
//
// Word-level, not character-level: a word is the unit a reviewer marks, so a
// word is the unit the diff speaks in. A word counts as changed if its exact
// text changed, punctuation included — "again" → "again." is precisely the kind
// of fix that would otherwise be invisible.
import type { Essay, EssayVersion } from '../types'

export interface Token {
  text: string
  start: number
  end: number
}

export function tokenize(text: string): Token[] {
  return [...text.matchAll(/\S+/g)].map((m) => ({ text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
}

/** Above this the diff isn't worth the milliseconds — no essay here is close. */
const DIFF_CAP = 1500

/**
 * Which words of `after` are new, as a flag per token.
 *
 * A longest-common-subsequence walk: everything not on the common path is
 * something he typed since. Deletions are deliberately invisible — the reviewer
 * is reading the text that exists, and marking a gap where a word used to be
 * helps nobody.
 */
export function changedWords(before: string, after: string): boolean[] {
  const a = tokenize(before).map((t) => t.text)
  const b = tokenize(after).map((t) => t.text)
  const changed = new Array<boolean>(b.length).fill(false)
  if (b.length === 0) return changed
  if (a.length > DIFF_CAP || b.length > DIFF_CAP) return changed
  // Nothing there before: a paragraph he added since is new, all of it.
  if (a.length === 0) return changed.fill(true)

  const w = b.length + 1
  const dp = new Uint16Array((a.length + 1) * w)
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i * w + j] =
        a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1])
    }
  }

  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      i++ // a word of his old text went away — nothing to paint
    } else {
      changed[j] = true
      j++
    }
  }
  for (; j < b.length; j++) changed[j] = true
  return changed
}

/** Title + paragraphs of one draft, in the shape the red pen renders. */
export interface Part {
  para: number // -1 = the title
  text: string
  label: string
}

export function draftParts(draft: Pick<Essay, 'title' | 'paragraphs'>): Part[] {
  return [
    // his raw title, never a placeholder: a quote is sliced out of this text,
    // so marking "(no title)" would mark something he never wrote
    { para: -1, text: draft.title, label: 'Title' },
    ...draft.paragraphs.map((p, i) => ({ para: i, text: p, label: `Paragraph ${i + 1}` })),
  ]
}

/** Every round that has a snapshot, oldest first. */
export function revisions(essay: Essay): EssayVersion[] {
  return [...essay.versions].sort((a, b) => a.round - b.round)
}

/**
 * The essay as it stood at the end of one round.
 *
 * The live text wins for the round he's on: he may have edited since the
 * snapshot, and the reviewer marks what exists now.
 */
export function draftAt(essay: Essay, round: number): Pick<Essay, 'title' | 'paragraphs'> {
  if (round >= essay.round) return essay
  const v = essay.versions.find((x) => x.round === round)
  return v ?? essay
}

/** What that round is compared against: the newest snapshot older than it. */
export function draftBefore(essay: Essay, round: number): Pick<Essay, 'title' | 'paragraphs'> | null {
  const older = revisions(essay).filter((v) => v.round < round)
  return older.length ? older[older.length - 1] : null
}

/**
 * Changed-word flags for a whole draft, keyed by part.
 *
 * Paragraphs are matched by position. He rewrites paragraphs in place and adds
 * them at the end, so index alignment is right nearly always and wrong in the
 * safe direction when it isn't: a whole paragraph shown as new.
 */
export function changedParts(
  draft: Pick<Essay, 'title' | 'paragraphs'>,
  previous: Pick<Essay, 'title' | 'paragraphs'> | null,
): Map<number, boolean[]> {
  const out = new Map<number, boolean[]>()
  for (const part of draftParts(draft)) {
    const was = !previous ? '' : part.para === -1 ? previous.title : (previous.paragraphs[part.para] ?? '')
    out.set(part.para, previous ? changedWords(was, part.text) : tokenize(part.text).map(() => false))
  }
  return out
}

/** How many words changed — for "he changed 4 words" rather than a guess. */
export function changedCount(flags: Map<number, boolean[]>): number {
  let n = 0
  for (const list of flags.values()) for (const f of list) if (f) n++
  return n
}
