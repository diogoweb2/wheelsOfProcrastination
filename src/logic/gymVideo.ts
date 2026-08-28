// The YouTube side of an exercise (§18n): reading a link you pasted, and
// building the one the app plays.
//
// Only an id and an optional start offset are ever stored. Everything else —
// autoplay, no related videos at the end, inline playback on iOS — is decided
// here, so every place that shows a video behaves the same and a link pasted in
// any of YouTube's five shapes ends up as the same row.
import type { ExerciseVideo } from '../types'

/** YouTube ids are exactly 11 chars of URL-safe base64. */
const ID = /^[\w-]{11}$/

/** `90`, `1m30s`, `2h3m4s` — YouTube's own three ways of saying "start here". */
function seconds(raw: string | null): number | undefined {
  if (!raw) return undefined
  if (/^\d+$/.test(raw)) return Number(raw) || undefined
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!m) return undefined
  const total = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return total || undefined
}

/**
 * Anything you could plausibly paste → `{ id, start }`, or null when it isn't a
 * YouTube link at all. Handles `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`,
 * `/live/`, and a bare id copied out of a URL bar.
 */
export function parseYouTube(input: string): { id: string; start?: number } | null {
  const text = input.trim()
  if (!text) return null
  if (ID.test(text)) return { id: text }
  let url: URL
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`)
  } catch {
    return null
  }
  if (!/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(url.hostname)) return null
  const start = seconds(url.searchParams.get('t') ?? url.searchParams.get('start'))
  const fromPath = url.pathname.match(/\/(?:shorts|embed|live|v)\/([\w-]{11})/)
  const id = url.hostname.endsWith('youtu.be') ? url.pathname.slice(1, 12) : (url.searchParams.get('v') ?? fromPath?.[1] ?? '')
  return ID.test(id) ? { id, start } : null
}

/**
 * What the in-app player loads. `youtube-nocookie.com` is the privacy-preserving
 * host — same player, no tracking cookie until you actually press play — and
 * `playsinline` is what stops iOS taking the video full-screen over the app.
 */
export function embedUrl(video: ExerciseVideo, autoplay = true): string {
  const p = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    autoplay: autoplay ? '1' : '0',
  })
  if (video.start) p.set('start', String(video.start))
  return `https://www.youtube-nocookie.com/embed/${video.id}?${p}`
}

/** The same video on YouTube proper — the escape hatch when an embed is blocked. */
export function watchUrl(video: ExerciseVideo): string {
  return `https://www.youtube.com/watch?v=${video.id}${video.start ? `&t=${video.start}` : ''}`
}

/** Where "find one myself" goes: short videos only, this exercise's name. */
export function searchUrl(name: string): string {
  // sp=EgIYAQ%3D%3D is YouTube's "under 4 minutes" filter — the same one the
  // script uses, so what you see is what it was choosing from.
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise how to`)}&sp=EgIYAQ%3D%3D`
}

/** "0:47" — length is the whole point of the pick, so it is always shown. */
export function clipLength(sec: number | undefined): string | null {
  if (!sec) return null
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
