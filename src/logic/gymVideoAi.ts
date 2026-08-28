// "Find me a better video" — the AI half of §18n.
//
// `npm run gym:videos` scrapes YouTube's own search page, which the browser
// cannot do: the results page sends no CORS header, so a fetch from the app is
// blocked before it starts. The app therefore asks a **web-search model** on
// OpenRouter instead — the same key and the same `:online` trick FC Lock's news
// desk uses (§21) — and then CHECKS THE ANSWER, because a language model asked
// for a YouTube id will happily invent eleven plausible characters.
//
// The check is YouTube's own oEmbed endpoint, which is the one YouTube service
// that does send `Access-Control-Allow-Origin`. It answers 200 with the real
// title and channel for a video that exists and can be embedded, and 4xx for
// one that doesn't — so an invented id is caught here rather than by you, in a
// basement, in front of a black box. The title we store is oEmbed's, never the
// model's, for the same reason.
//
// Length is the one thing that cannot be verified from the browser (oEmbed does
// not report it), so an AI pick is stored WITHOUT a duration rather than with a
// number the model made up. The prompt still asks for something short.
import type { AiConfig, ExerciseDef, ExerciseVideo } from '../types'
import { askOpenRouter, shortAiError, sliceJson } from './openrouter'
import { parseYouTube } from './gymVideo'

/** Search-augmented, cheapest first — the same pair the news desk trusts. */
const MODELS = ['perplexity/sonar', 'deepseek/deepseek-v4-flash:online']

const SYSTEM = `You find short YouTube videos that demonstrate gym exercises. You search the live web and report only videos you actually found.

Rules:
- NEVER invent or guess a YouTube URL or id. Every url you return must be one you actually saw in the search results.
- The video must demonstrate THAT EXACT MOVEMENT, performed by a person. Not a workout routine, not a "5 mistakes" list, not a challenge, not a compilation.
- SHORT is the point: prefer clips under 60 seconds; never above 90.
- A clear demonstration from a small channel beats a popular video about the exercise.
- Answer with ONLY a JSON array, best first, at most 5 items: [{"url": "...", "why": "..."}]. No prose outside the array.`

/** How the model is told what movement we mean — our own words, so it can't drift. */
function brief(ex: Pick<ExerciseDef, 'name' | 'how' | 'parts'>, avoid: string[]): string {
  return [
    `Exercise: ${ex.name}`,
    `What it is: ${ex.how}`,
    `Works: ${ex.parts.join(', ')}`,
    avoid.length > 0 ? `Do NOT return these video ids, they were rejected: ${avoid.join(', ')}` : '',
    '',
    'Find short YouTube videos demonstrating this exact movement with good form.',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Does this video exist and can it be shown? oEmbed is CORS-open, so the answer
 * comes back to the browser — with the real title and channel, which is what we
 * keep. A blocked or invented id fails here and the next candidate is tried.
 */
async function confirm(id: string): Promise<{ title?: string; channel?: string } | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2F${id}&format=json`)
    if (!res.ok) return null
    const json = (await res.json()) as { title?: string; author_name?: string }
    return { title: json.title, channel: json.author_name }
  } catch {
    // A network failure is not proof the video is bad, but it is proof we can't
    // vouch for it — and an unvouched pick is the thing this function exists to
    // prevent. Say no; the caller can be tapped again.
    return null
  }
}

/**
 * One verified video for this exercise, or a thrown reason a human can act on.
 * `avoid` is how "try another" works: the ids you have already rejected are named
 * to the model AND filtered out of its answer, so pressing it twice moves on.
 */
export async function findExerciseVideo({
  ai,
  ex,
  avoid = [],
}: {
  ai: AiConfig | null
  ex: Pick<ExerciseDef, 'name' | 'how' | 'parts'>
  avoid?: string[]
}): Promise<ExerciseVideo> {
  const key = ai?.openrouterKey?.trim()
  if (!key) throw new Error('No OpenRouter key yet — the Captain’s desk holds it (Admin → AI).')

  const skip = new Set(avoid)
  let last = 'no model answered'
  for (const model of MODELS) {
    let text: string
    try {
      text = await askOpenRouter({
        key,
        model,
        system: SYSTEM,
        prompt: brief(ex, avoid),
        title: 'WheelsOP Gym video',
        temperature: 0.4,
        timeoutMs: 90_000,
      })
    } catch (e) {
      last = shortAiError(e)
      continue
    }

    let rows: { url?: string }[]
    try {
      rows = JSON.parse(sliceJson(text, '[', ']'))
    } catch (e) {
      last = shortAiError(e)
      continue
    }

    for (const row of rows) {
      const parsed = row?.url ? parseYouTube(String(row.url)) : null
      if (!parsed || skip.has(parsed.id)) continue
      const real = await confirm(parsed.id)
      if (!real) continue // invented, private, or embedding-blocked — next
      return {
        id: parsed.id,
        start: parsed.start,
        title: real.title,
        channel: real.channel,
        source: 'ai',
      }
    }
    last = 'nothing it suggested was a real, embeddable video'
  }
  throw new Error(last)
}
