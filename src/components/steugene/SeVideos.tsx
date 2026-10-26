// 🏫 St. Eugene 7 (§24z) — 🎬 the shelf: every video in his year, by chapter.
//
// Lazy-loaded by `StEugeneScreen`, which is why this is a file of its own: the
// catalogue it imports (`src/steugene/videoIndex.ts`) is ~60 kB of titles, and
// nobody who never opens the shelf should download it.
//
// It is a SHELF, not a lesson. Nothing is asked afterwards, nothing is
// recorded, nothing is paid. The video block inside a lesson exists because
// questions follow it (§24g) and is held for two minutes so it cannot be
// waved past; a video he went looking for himself needs neither. What it keeps
// is the shield — YouTube's chrome is a corridor out whatever brought him to
// the frame — and the credit line, and the "listen for" hint, because that is
// what makes a re-watch worth something.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { PARENT_ID } from '../../store/storage'
import { sfx } from '../../audio'
import { seFind, seOpenSubject } from '../../logic/steugene'
import {
  SE_VIDEO_SECONDS,
  SE_VIDEO_TOTAL,
  seClock,
  seSpan,
  seThumb,
  seVideoSeconds,
  seVideoShelf,
} from '../../logic/steugeneVideos'
import { SeVideoBlock } from './SeVideoBlock'
import type { AppData, SeStat } from '../../types'
import type { SeVideoRef } from '../../steugene/types'

const NO_STATS: Record<string, SeStat> = {}

export function SeVideos({ onLesson }: { onLesson?: (subtopicId: string) => void }) {
  const { data, kidData, activeProfileId } = useStore()
  const admin = activeProfileId === PARENT_ID
  const world: AppData | null = admin ? kidData : data
  const stats = world?.steugene.stats ?? NO_STATS

  /**
   * Which videos he has already met in a lesson.
   *
   * Free, and honest: `stat.seen` is the list of block ids a subtopic has
   * already dealt him (it is what stops a repeat dealing the same cards), so a
   * video id in it is one that has been on his screen. The shelf writes
   * nothing of its own — a watch counter would be a new field in the save, and
   * a ✅ that means "you have met this one" is the thing worth saying anyway.
   */
  const met = useMemo(
    () => new Set(Object.values(stats).flatMap((s) => s.seen ?? [])),
    [stats],
  )

  const [q, setQ] = useState('')
  const shelf = useMemo(() => seVideoShelf(q), [q])
  // Opens on the subject he worked in last, like the year list does (§24u).
  // `undefined` is "nobody has tapped yet", resolved on render rather than in
  // the initialiser because on Dad's phone the stats arrive after the mount.
  const [open, setOpen] = useState<string | null | undefined>(undefined)
  const openId = open === undefined ? seOpenSubject(stats) : open
  const [playing, setPlaying] = useState<SeVideoRef | null>(null)

  // A search that leaves everything folded shut is a search that found
  // nothing, as far as he can tell. So while he is typing, it is all open.
  const searching = q.trim().length > 0
  const found = shelf.reduce((n, s) => n + s.count, 0)

  return (
    <>
      <div className="h1">🎬 Videos</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Every video in {admin ? 'his' : 'your'} year — {SE_VIDEO_TOTAL} of them, {seSpan(SE_VIDEO_SECONDS)} in all,
        sorted by subject and chapter. Watch any of them as many times as you like. Nothing is asked afterwards.
      </p>

      <input
        className="se-shelf__find"
        type="search"
        value={q}
        placeholder="Search — “circle”, “fractions”, “Math Antics”…"
        onChange={(e) => setQ(e.target.value)}
      />

      {searching && (
        <p className="muted" style={{ margin: '8px 0 12px' }}>
          {found === 0 ? 'Nothing matches that.' : `${found} video${found === 1 ? '' : 's'} match “${q.trim()}”.`}
        </p>
      )}

      {shelf.map(({ subject, chapters, count, seconds }) => {
        const isOpen = searching || openId === subject.id
        return (
          <div key={subject.id} className="se-subject">
            <button
              className="se-subject__head"
              style={{ background: `linear-gradient(135deg, ${subject.tint[0]}, ${subject.tint[1]})` }}
              onClick={() => {
                sfx.click()
                setOpen(isOpen && !searching ? null : subject.id)
              }}
            >
              <span className="se-subject__emoji">{subject.emoji}</span>
              <span className="se-subject__name">
                {subject.name}
                <small>
                  {count} videos · {seSpan(seconds)}
                </small>
              </span>
              <span className="se-subject__chev">{isOpen ? '▾' : '▸'}</span>
            </button>

            {isOpen &&
              chapters.map((chapter) => (
                <div key={chapter.strand.id} className="se-strand">
                  <div className="se-strand__title">
                    {chapter.strand.title} · {chapter.count}
                  </div>
                  {chapter.pages.map(({ subtopic, videos }) => (
                    <div key={subtopic.id} className="se-shelf__page">
                      <div className="se-shelf__pagetitle">
                        <span aria-hidden>{subtopic.emoji}</span> {subtopic.title}
                      </div>
                      {videos.map((v) => (
                        <VideoRow
                          key={v.id}
                          video={v}
                          seen={met.has(v.id)}
                          onPlay={() => {
                            sfx.click()
                            setPlaying(v)
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )
      })}

      {playing && (
        <Player
          video={playing}
          admin={admin}
          onClose={() => setPlaying(null)}
          onLesson={onLesson}
        />
      )}
    </>
  )
}

/**
 * One film on the shelf.
 *
 * The still is the biggest thing on the row on purpose. He reads slowly and
 * recognises pictures instantly — the Gym learned exactly this about exercise
 * demos — so a wall of titles is a wall, and a wall of thumbnails is a shelf
 * he can scan. YouTube's own still costs us no storage (CLAUDE.md) and the
 * Android shell already lets `ytimg.com` through (§24g).
 */
function VideoRow({ video, seen, onPlay }: { video: SeVideoRef; seen: boolean; onPlay: () => void }) {
  return (
    <button className={`se-vid${seen ? ' se-vid--seen' : ''}`} onClick={onPlay}>
      <span className="se-vid__thumb">
        <img src={seThumb(video.youtube)} alt="" loading="lazy" decoding="async" />
        <span className="se-vid__clock">{seClock(seVideoSeconds(video))}</span>
        <span className="se-vid__play" aria-hidden>
          ▶
        </span>
      </span>
      <span className="se-vid__body">
        <span className="se-vid__title">{video.title}</span>
        <span className="se-vid__meta">
          {seen && <em>✅ watched in a lesson · </em>}
          {video.by ?? 'YouTube'}
        </span>
      </span>
    </button>
  )
}

/** The frame, in a sheet. Same locked player as a lesson's, with the hold off. */
function Player({
  video,
  admin,
  onClose,
  onLesson,
}: {
  video: SeVideoRef
  admin: boolean
  onClose: () => void
  onLesson?: (subtopicId: string) => void
}) {
  const where = seFind(video.subtopicId)

  return (
    <div className="se-sheet" role="dialog" onClick={onClose}>
      <div className="se-sheet__body card" onClick={(e) => e.stopPropagation()}>
        <div className="se-card__head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h1" style={{ fontSize: 18, marginBottom: 2 }}>
              {video.title}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {where ? `${where.subtopic.emoji} ${where.subtopic.title} · ${where.subject.name}` : video.subtopicId}
            </p>
          </div>
          <button className="btn btn--ghost btn--small" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* `free` turns the two-minute hold off (§24z): he chose to be here,
            and there are no questions on the other side of a skip button. */}
        <SeVideoBlock
          youtube={video.youtube}
          title={video.title}
          by={video.by}
          start={video.start}
          end={video.end}
          watchFor={video.watchFor}
          free
          onFinished={() => {}}
        />

        <div className="se-open__btns">
          {!admin && onLesson && (
            <button
              className="btn btn--blue"
              onClick={() => {
                onLesson(video.subtopicId)
                onClose()
              }}
            >
              📘 Do this lesson
            </button>
          )}
          <button className="btn btn--ghost" onClick={onClose}>
            Done
          </button>
        </div>
        {video.checks > 0 && (
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            In a lesson, {video.checks} question{video.checks === 1 ? '' : 's'} follow this one. Here, none do.
          </p>
        )}
      </div>
    </div>
  )
}
