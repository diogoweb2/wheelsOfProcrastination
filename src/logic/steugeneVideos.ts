// 🏫 St. Eugene 7 (§24z) — the 🎬 shelf: every video in the year, by chapter.
//
// The videos were always there; they were only reachable by luck. A video sits
// inside a lesson queue, so getting back to the one that finally explained
// circumference meant starting the circles lesson again and hoping the planner
// dealt it. For a boy who learns by watching (the Gym learned the same thing
// about exercise demos) that is the wrong way round: the film is the part he
// gets most out of, and it was the one part of the app he could not point at.
//
// So this file turns `SE_VIDEOS` — the generated card catalogue — back into the
// shape of his year: subject → chapter → page → the films on it. Nothing is
// invented here. The order is the curriculum's own order, the grouping is the
// one his class uses, and a subtopic with no video simply is not on the shelf.
import { SE_SUBJECTS, type SeStrand, type SeSubTopic, type SeSubject } from './steugene'
import { SE_VIDEOS } from '../steugene/videoIndex'
import type { SeVideoRef } from '../steugene/types'

/** How long it actually plays for — a window inside a longer upload counts short. */
export function seVideoSeconds(v: SeVideoRef): number {
  return Math.max(0, (v.end ?? v.seconds) - (v.start ?? 0))
}

/** `328` → `5:28`. */
export function seClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** `3840` → `1h 4m`, for a shelf total. */
export function seSpan(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const rest = m % 60
  return rest ? `${Math.floor(m / 60)}h ${rest}m` : `${Math.floor(m / 60)}h`
}

/** YouTube's own still, 320 × 180. Free, remote, and already allowed (§24g). */
export function seThumb(youtube: string): string {
  return `https://i.ytimg.com/vi/${youtube}/mqdefault.jpg`
}

export interface SeShelfPage {
  subtopic: SeSubTopic
  videos: SeVideoRef[]
  seconds: number
}

export interface SeShelfChapter {
  strand: SeStrand
  pages: SeShelfPage[]
  count: number
  seconds: number
}

export interface SeShelfSubject {
  subject: SeSubject
  chapters: SeShelfChapter[]
  count: number
  seconds: number
}

/** Index once: the shelf is rebuilt on every keystroke of the search box. */
const BY_SUBTOPIC = new Map<string, SeVideoRef[]>()
for (const v of SE_VIDEOS) {
  const list = BY_SUBTOPIC.get(v.subtopicId)
  if (list) list.push(v)
  else BY_SUBTOPIC.set(v.subtopicId, [v])
}

/** The videos on one page of the year, spine first then bench. */
export function seVideosOf(subtopicId: string): SeVideoRef[] {
  return BY_SUBTOPIC.get(subtopicId) ?? []
}

export const SE_VIDEO_TOTAL = SE_VIDEOS.length
export const SE_VIDEO_SECONDS = SE_VIDEOS.reduce((n, v) => n + seVideoSeconds(v), 0)

/**
 * The whole shelf, in teaching order, filtered by `q`.
 *
 * A match on the title, the channel, the page or the chapter keeps the video;
 * anything with nothing left in it drops out entirely, so the search never
 * leaves him scrolling past twenty empty chapters to find the one hit. Match
 * on the CHAPTER rather than only on the title because he does not remember
 * what a video was called — he remembers that it was the circle one.
 */
export function seVideoShelf(q = ''): SeShelfSubject[] {
  const needle = q.trim().toLowerCase()
  const hit = (v: SeVideoRef, context: string) =>
    !needle ||
    `${v.title} ${v.by ?? ''} ${v.watchFor ?? ''} ${context}`.toLowerCase().includes(needle)

  const out: SeShelfSubject[] = []
  for (const subject of SE_SUBJECTS) {
    const chapters: SeShelfChapter[] = []
    for (const strand of subject.strands) {
      const pages: SeShelfPage[] = []
      for (const subtopic of strand.subtopics) {
        const context = `${subject.name} ${strand.title} ${subtopic.title} ${subtopic.sample} ${subtopic.plain}`
        const videos = seVideosOf(subtopic.id).filter((v) => hit(v, context))
        if (!videos.length) continue
        pages.push({ subtopic, videos, seconds: videos.reduce((n, v) => n + seVideoSeconds(v), 0) })
      }
      if (!pages.length) continue
      chapters.push({
        strand,
        pages,
        count: pages.reduce((n, p) => n + p.videos.length, 0),
        seconds: pages.reduce((n, p) => n + p.seconds, 0),
      })
    }
    if (!chapters.length) continue
    out.push({
      subject,
      chapters,
      count: chapters.reduce((n, c) => n + c.count, 0),
      seconds: chapters.reduce((n, c) => n + c.seconds, 0),
    })
  }
  return out
}
