// §14d — what a miss offers on a chapter quiz: the IDEA behind the question,
// in a few short lines he can have read to him, and a video about it.
//
// He learns by watching, and a one-line fun fact under a crossed-out answer is
// not teaching. The lines are the idea, not this card's answer — the same
// lines come up for every version of it — and the video is a St. Eugene one
// (§24z), played in the same shielded frame, with the one thing to listen for
// pinned above it.
//
// Both load on demand. The notes ride in the chapter-quiz chunk that the bank
// already loaded at startup (`src/store/cloud.ts`), and the video catalogue
// is the shelf's own lazy chunk, so a miss on any other quiz costs nothing.
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'
import { canSpeak, speak, stopSpeaking } from '../lib/speak'
import type { QuizQuestion } from '../types'
import type { Se7Note } from '../quiz/se7/build'
import type { SeVideoRef } from '../steugene/types'
import { SeVideoBlock } from './steugene/SeVideoBlock'

export function QuizMissHelp({ q }: { q: QuizQuestion }) {
  const rate = useStore((s) => s.data.steugene?.speak?.rate ?? 0.9)
  const [note, setNote] = useState<Se7Note | null>(null)
  const [video, setVideo] = useState<SeVideoRef | null>(null)
  const [watching, setWatching] = useState(false)

  useEffect(() => {
    setNote(null)
    setVideo(null)
    if (!q.family) return
    let alive = true
    void import('../quiz/se7').then(({ se7Note }) => {
      const n = se7Note(q.family!)
      if (!alive || !n) return
      setNote(n)
      if (!n.video) return
      void import('../steugene/videoIndex').then(({ SE_VIDEOS }) => {
        if (alive) setVideo(SE_VIDEOS.find((v) => v.id === n.video) ?? null)
      })
    })
    return () => {
      alive = false
      stopSpeaking()
    }
  }, [q.family])

  if (!note) return null
  const minutes = video ? Math.max(1, Math.round(((video.end ?? video.seconds) - (video.start ?? 0)) / 60)) : 0

  return (
    <>
      <div className="miss-idea">
        <div className="miss-idea__head">
          <span style={{ flex: 1 }}>📖 Here’s the idea</span>
          {canSpeak() && (
            <button
              className="btn btn--ghost btn--small"
              style={{ width: 'auto', fontSize: 18, padding: '2px 10px' }}
              onClick={() => speak(note.explain.join(' '), rate)}
              aria-label="Read the idea out loud"
              title="Read the idea out loud"
            >
              🔊
            </button>
          )}
        </div>
        {note.explain.map((line, i) => (
          <p key={i} className="miss-idea__line">
            {line}
          </p>
        ))}
      </div>

      {video && (
        <button
          className="btn btn--blue"
          style={{ marginTop: 12 }}
          onClick={() => {
            sfx.click()
            stopSpeaking()
            setWatching(true)
          }}
        >
          🎬 Watch a video about it · {minutes} min
        </button>
      )}

      {watching && video && (
        <div className="se-sheet" role="dialog" onClick={() => setWatching(false)}>
          <div className="se-sheet__body card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 900, fontSize: 16 }}>{video.title}</div>
              <button className="btn btn--ghost btn--small" style={{ width: 'auto' }} onClick={() => setWatching(false)}>
                ✕
              </button>
            </div>
            {/* `free`: he chose to watch, so no hold — but the shield stays (§24g) */}
            <SeVideoBlock
              youtube={video.youtube}
              title={video.title}
              by={video.by}
              start={video.start}
              end={video.end}
              watchFor={note.watchFor ?? video.watchFor}
              free
              onFinished={() => {}}
            />
            <button className="btn" style={{ marginTop: 10 }} onClick={() => setWatching(false)}>
              Back to the question ➜
            </button>
          </div>
        </div>
      )}
    </>
  )
}
