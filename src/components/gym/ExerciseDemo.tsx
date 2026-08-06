// The "what does this actually look like" picture next to an exercise.
//
// Data budget is the whole design. Every demo is two files (see §18l): a ~2 KB
// still and a ~21 KB animation. A list of ten exercises therefore costs ~20 KB,
// not 200 KB, because a list only ever renders the still — the animation is
// requested when you are actually looking at that one movement. After that the
// service worker holds both forever (`gym-demos` cache, CacheFirst), so the
// second view of an exercise transfers nothing and works with no signal.
//
// Not every exercise has one: the free ExerciseDB tier is a 1,500-row subset
// and genuinely lacks some basics (there is no plain "plank" in it). Missing is
// a normal state, not an error — it falls back to the emoji and says nothing.
import { useState } from 'react'
import type { ExerciseDemo as Demo } from '../../types'

export function ExerciseDemo({
  demo,
  emoji,
  size = 56,
  /** Play immediately — the runner does this for the exercise you're on. */
  autoPlay = false,
  className,
}: {
  demo?: Demo
  emoji: string
  size?: number
  autoPlay?: boolean
  className?: string
}) {
  const [playing, setPlaying] = useState(autoPlay)
  const [broken, setBroken] = useState(false)

  if (!demo || broken) {
    return (
      <span className={className} style={{ fontSize: size * 0.62, lineHeight: 1, flex: 'none' }} aria-hidden>
        {emoji}
      </span>
    )
  }

  const showAnim = playing || autoPlay

  return (
    <button
      type="button"
      className={`gym-demo ${className ?? ''}`}
      style={{ width: size, height: size }}
      onClick={() => setPlaying((p) => !p)}
      aria-label={showAnim ? `${demo.sourceName} — animation playing, tap to pause` : `${demo.sourceName} — tap to see the movement`}
      title={demo.sourceName}
    >
      <img
        // Swapping src is what starts/stops it: an animated WebP has no play
        // control, so "paused" is literally the still frame.
        src={showAnim ? demo.anim : demo.poster}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setBroken(true)}
      />
      {!showAnim && <span className="gym-demo-play" aria-hidden>▶</span>}
      {demo.match === 'close' && <span className="gym-demo-approx" aria-hidden>≈</span>}
    </button>
  )
}

/**
 * The one-liner under a playing demo. Only says anything when the demo is an
 * approximation — if the animation isn't exactly this exercise, the screen has
 * to admit it, because the written instructions are the authority on form.
 */
export function DemoCaption({ demo }: { demo?: Demo }) {
  if (!demo || demo.match !== 'close') return null
  return (
    <p className="muted" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.35 }}>
      ≈ Closest demo we could find (“{demo.sourceName}”) — near enough for the pattern, but follow the steps above for the
      real form.
    </p>
  )
}

/** Attribution line, shown once per screen wherever demos appear. */
export function DemoCredit() {
  return (
    <p className="muted" style={{ fontSize: 10, textAlign: 'center', marginTop: 14 }}>
      Exercise animations from ExerciseDB (oss.exercisedb.dev)
    </p>
  )
}
