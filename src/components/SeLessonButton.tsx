// "🏫 Learn this in St. Eugene 7" — the bridge from a Grade 7 quiz miss to the
// lesson that teaches it (§14, §24). The quiz only checks; St. Eugene teaches.
import { useState } from 'react'
import { seFind } from '../logic/steugene'
import { openSeLesson } from '../steugene/open'

export function SeLessonButton({ subtopicId, small }: { subtopicId?: string; small?: boolean }) {
  const [opening, setOpening] = useState(false)
  const at = subtopicId ? seFind(subtopicId) : null
  if (!at) return null
  return (
    <button
      className={small ? 'btn btn--ghost btn--small' : 'btn btn--blue'}
      style={small ? { marginTop: 8, width: 'auto' } : { marginTop: 12 }}
      disabled={opening}
      onClick={() => {
        setOpening(true)
        void openSeLesson(at.subtopic.id)
      }}
    >
      {opening ? 'Opening the lesson…' : `🏫 Learn it in St. Eugene 7 · ${at.subtopic.emoji} ${at.subtopic.title}`}
    </button>
  )
}
