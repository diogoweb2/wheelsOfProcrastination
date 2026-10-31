// 🏫 St. Eugene 7 (§24) — walking into a lesson, from anywhere in the app.
//
// The Quiz app's Grade 7 topics (§14) check what St. Eugene teaches, so a miss
// there offers the lesson that teaches it. That needs the same three steps the
// Subjects tab takes — the pack is its own chunk (§24k), so it has to land
// before the queue can be dealt; the walk-in flag stops the Lesson tab asking
// "resume or restart" about a lesson we just started — plus a hop across apps.

import { useStore } from '../store/useStore'
import { sfx } from '../audio'
import { ensurePack } from './packs'

/**
 * The lesson this app session has already walked into, by its `startedAt`.
 * One that is open but is not this one — the app was closed mid-lesson, or he
 * came in by the 📘 tab — is asked about first: ▶️ Resume or 🔄 Start over.
 * Module state on purpose: it is forgotten exactly when the app is.
 */
let walkedInto: number | null = null

export function walkIn() {
  walkedInto = useStore.getState().data.steugene.run?.startedAt ?? null
}

export function walkedIntoRun(): number | null {
  return walkedInto
}

/**
 * Start a subtopic's lesson and land on `/steugene7/lesson`. The App follows
 * the URL on `popstate` (§1c), so pushing the path and announcing it is the
 * whole navigation — no prop has to be threaded from the App down to a quiz card.
 */
export async function openSeLesson(subtopicId: string) {
  sfx.fanfare()
  await ensurePack(subtopicId)
  useStore.getState().seStart(subtopicId)
  walkIn()
  window.history.pushState(null, '', '/steugene7/lesson')
  window.dispatchEvent(new PopStateEvent('popstate'))
}
