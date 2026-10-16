// 🏫 St. Eugene 7 (§24g) — a video he cannot walk out of.
//
// The whole value of a video in a lesson is that questions come after it, and
// that only works if the video is the one we chose. YouTube's own chrome is a
// corridor out: the title links to the watch page, the end screen offers six
// other videos, and the channel avatar is a door.
//
// So none of it is reachable. `controls=0` turns the chrome off, a transparent
// shield covers the frame so no click lands inside it at all, and every
// control he does get is one of ours, driving the player through the IFrame
// API. The end screen never appears, because the moment the video ends we
// cover it with the questions.
//
// It still fails open: a video that will not load says so and lets him move
// on, rather than parking him in front of a black rectangle.
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio'

interface YtPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YtPlayer
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

/** Load the IFrame API once per page, and tell everyone waiting when it lands. */
let apiPromise: Promise<void> | null = null
function youtubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  apiPromise ??= new Promise<void>((resolve, reject) => {
    const prior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prior?.()
      resolve()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onerror = () => reject(new Error('YouTube would not load'))
    document.head.appendChild(tag)
  })
  return apiPromise
}

export function SeVideoBlock({
  youtube,
  title,
  by,
  start,
  end,
  onFinished,
}: {
  youtube: string
  title: string
  by?: string
  start?: number
  end?: number
  /** Fired once, when the video has genuinely played to the end (or broke). */
  onFinished: (reason: 'ended' | 'broken') => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<YtPlayer | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'broken'>('loading')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let alive = true
    let ticker: ReturnType<typeof setInterval> | undefined

    youtubeApi()
      .then(() => {
        if (!alive || !host.current || !window.YT) return
        player.current = new window.YT.Player(host.current, {
          videoId: youtube,
          // youtube-nocookie keeps the viewing off his Google profile; the rest
          // of these strip the player back to a rectangle of video.
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            fs: 0,
            playsinline: 1,
            ...(start ? { start } : {}),
            ...(end ? { end } : {}),
          },
          events: {
            onReady: () => alive && setState('ready'),
            onError: () => {
              if (!alive) return
              setState('broken')
              onFinished('broken')
            },
            onStateChange: (e: { data: number }) => {
              if (!alive || !window.YT) return
              if (e.data === window.YT.PlayerState.ENDED) {
                setState('ended')
                sfx.click()
                onFinished('ended')
              } else if (e.data === window.YT.PlayerState.PLAYING) setState('playing')
              else if (e.data === window.YT.PlayerState.PAUSED) setState('paused')
            },
          },
        })
        ticker = setInterval(() => {
          const p = player.current
          if (!p?.getDuration) return
          const dur = (end ?? p.getDuration()) - (start ?? 0)
          if (dur > 0) setProgress(Math.min(1, (p.getCurrentTime() - (start ?? 0)) / dur))
        }, 500)
      })
      .catch(() => {
        if (!alive) return
        setState('broken')
        onFinished('broken')
      })

    return () => {
      alive = false
      clearInterval(ticker)
      player.current?.destroy?.()
      player.current = null
    }
    // One player per video block. `onFinished` is a fresh closure each render
    // and must not tear the iframe down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtube, start, end])

  const toggle = () => {
    sfx.click()
    if (state === 'playing') player.current?.pauseVideo()
    else player.current?.playVideo()
  }
  const back = () => {
    sfx.click()
    const p = player.current
    if (p) p.seekTo(Math.max(start ?? 0, p.getCurrentTime() - 10), true)
  }
  const replay = () => {
    sfx.click()
    player.current?.seekTo(start ?? 0, true)
    player.current?.playVideo()
  }

  return (
    <div className="se-video">
      <div className="se-video__frame">
        <div ref={host} />
        {/* Nothing inside the frame is clickable. Everything he can press is below it. */}
        <div className="se-video__shield" aria-hidden />
        {state === 'loading' && <div className="se-video__veil">Loading the video…</div>}
        {state === 'broken' && (
          <div className="se-video__veil">This one will not play. Skip it — it is not your fault.</div>
        )}
        {state === 'ended' && <div className="se-video__veil se-video__veil--done">✅ Watched</div>}
      </div>

      <div className="se-video__bar" aria-hidden>
        <div style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      <div className="se-video__meta">
        <strong>{title}</strong>
        {by && <span className="muted"> · {by}</span>}
      </div>

      {state !== 'broken' && (
        <div className="se-video__controls">
          <button className="btn btn--small btn--ghost" onClick={back} disabled={state === 'loading'}>
            ⏪ 10s
          </button>
          <button className="btn btn--small btn--blue" style={{ flex: 1 }} onClick={toggle} disabled={state === 'loading'}>
            {state === 'playing' ? '⏸ Pause' : state === 'ended' ? '▶️ Watch again' : '▶️ Play'}
          </button>
          <button className="btn btn--small btn--ghost" onClick={replay} disabled={state === 'loading'}>
            🔁
          </button>
        </div>
      )}
    </div>
  )
}
