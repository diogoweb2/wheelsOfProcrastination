// 📺 The "show me someone doing it" button (§18n).
//
// It sits on EVERY place an exercise is named — the Gear list, the plan, the
// runner, the rest screen — because the moment you need a demonstration is the
// moment you are standing in front of the machine, not the moment you happen to
// be in a settings tab.
//
// The animation (§18l) is a 21 KB loop with no sound and no coaching; this is a
// real person saying what to do with your elbows. It is an EMBED, not a file we
// re-host: nothing is downloaded, nothing is cached offline, and the player is
// only created once you tap — a list of ten exercises costs nothing at all.
//
// Every video is replaceable from wherever you found it wrong. The picked one is
// a machine's guess (`npm run gym:videos`); yours wins, for the whole crew,
// because the video lives on the shared catalog row exactly like the animation.
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { PART_LABEL, exerciseById } from '../../logic/gym'
import { clipLength, embedUrl, parseYouTube, searchUrl, watchUrl } from '../../logic/gymVideo'
import type { ExerciseVideo } from '../../types'
import { sfx } from '../../audio'

/**
 * The button itself. Red and solid when there is a video to watch, hollow when
 * there isn't — tapping the hollow one is how you add the first video, so the
 * feature works before the script has ever run.
 */
export function VideoButton({ exId, name, className }: { exId: string; name: string; className?: string }) {
  const video = useStore((s) => exerciseById(s.gymCatalog, exId)?.video)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`gym-yt ${video ? '' : 'gym-yt--empty'} ${className ?? ''}`}
        // rows are often inside a bigger tappable card — the video button is
        // never the thing that opens the card
        onClick={(ev) => {
          ev.stopPropagation()
          sfx.click()
          setOpen(true)
        }}
        aria-label={video ? `Watch a short video of ${name}` : `Pick a video for ${name}`}
        title={video ? (video.title ?? 'Watch it') : 'No video yet — tap to add one'}
      >
        ▶
      </button>
      {open && <VideoSheet exId={exId} name={name} video={video} onClose={() => setOpen(false)} />}
    </>
  )
}

function VideoSheet({
  exId,
  name,
  video,
  onClose,
}: {
  exId: string
  name: string
  video?: ExerciseVideo
  onClose: () => void
}) {
  const gymSetExerciseVideo = useStore((s) => s.gymSetExerciseVideo)
  const gymFindExerciseVideo = useStore((s) => s.gymFindExerciseVideo)
  // OUR words for the movement, next to someone else's video of it. The written
  // steps are the authority on form (§18l), so the point of putting them here is
  // that you can tell in one screen whether the video is even the same exercise.
  const def = useStore((s) => exerciseById(s.gymCatalog, exId))
  const [link, setLink] = useState('')
  const [bad, setBad] = useState(false)
  /**
   * Every id you have turned down in this sitting. It is handed to the model on
   * the next try, so "another one" really is another one rather than the same
   * clip with a different sentence about it.
   */
  const [rejected, setRejected] = useState<string[]>([])
  const [hunting, setHunting] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const length = clipLength(video?.sec)

  async function findAnother() {
    const avoid = [...new Set([...rejected, ...(video ? [video.id] : [])])]
    setHunting(true)
    setAiError(null)
    try {
      await gymFindExerciseVideo(exId, avoid)
      setRejected(avoid)
      sfx.gem()
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setHunting(false)
    }
  }

  function pin() {
    const parsed = parseYouTube(link)
    if (!parsed) {
      setBad(true)
      return
    }
    // a link you chose yourself is never overwritten by a later script run
    gymSetExerciseVideo(exId, { id: parsed.id, start: parsed.start, source: 'manual' })
    setLink('')
    setBad(false)
    sfx.click()
  }

  return (
    <div className="overlay overlay--center" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <div className="gym-note-head" style={{ marginBottom: 10 }}>
          <span className="chip">📺 {name}</span>
          {length && <span className="chip">⏱ {length}</span>}
          {video?.source === 'manual' && <span className="chip">🖐 your pick</span>}
          {video?.source === 'ai' && <span className="chip">🤖 AI pick</span>}
        </div>

        {def?.how && (
          <div className="gym-yt-how">
            <div className="gym-yt-how-label">What this app says the movement is</div>
            <p>{def.how}</p>
            <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              {def.parts.map((p) => PART_LABEL[p]).join(' · ')}
              {def.perSide ? ' · one side at a time' : ''}
              {' — if the video is doing something else, it is the wrong video.'}
            </p>
          </div>
        )}

        {video ? (
          <>
            <div className="gym-yt-frame">
              <iframe
                key={`${video.id}-${video.start ?? 0}`}
                src={embedUrl(video)}
                title={video.title ?? name}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.45 }}>
              {video.title ? `“${video.title}”` : 'YouTube'}
              {video.channel ? ` · ${video.channel}` : ''} ·{' '}
              {/* an embed can be blocked by the uploader, and the app can't tell —
                  so the way out is always on screen rather than after a failure */}
              <a href={watchUrl(video)} target="_blank" rel="noreferrer">
                open on YouTube ↗
              </a>
            </p>
          </>
        ) : (
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            No video for this one yet. Find a short demonstration and paste its link below — it is kept for the whole crew.
          </p>
        )}

        <div className="field" style={{ marginTop: 12, marginBottom: 6 }}>
          <label>{video ? 'Better video? Paste its link' : 'Paste a YouTube link'}</label>
          <input
            type="url"
            inputMode="url"
            value={link}
            placeholder="https://youtu.be/… · youtube.com/shorts/…"
            onChange={(ev) => {
              setLink(ev.target.value)
              setBad(false)
            }}
          />
        </div>
        {bad && (
          <p className="muted" style={{ fontSize: 11, color: 'var(--red)' }}>
            That doesn’t look like a YouTube link. Use the video’s <strong>Share</strong> button and paste what it gives you.
          </p>
        )}

        {aiError && (
          <p className="muted" style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>
            {aiError}
          </p>
        )}

        <div className="gym-yt-actions">
          {/* the lazy way out of a bad pick: no searching, no pasting — ask the
              model for another one and let it check its own answer (§18n) */}
          <button className="btn btn--blue btn--small" disabled={hunting} onClick={findAnother}>
            {hunting ? '🤖 Looking…' : video ? '🤖 Find a better one' : '🤖 Find one with AI'}
          </button>
          <button className="btn btn--small" disabled={!link.trim()} onClick={pin}>
            💾 Use this one
          </button>
          <a className="btn btn--ghost btn--small" href={searchUrl(name)} target="_blank" rel="noreferrer">
            🔎 Search YouTube
          </a>
          {video && (
            <button
              className="btn btn--ghost btn--small"
              onClick={() => {
                sfx.click()
                gymSetExerciseVideo(exId, null)
              }}
            >
              🚫 Wrong video — remove it
            </button>
          )}
        </div>

        <button className="btn btn--ghost" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
