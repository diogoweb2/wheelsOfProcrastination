// "Point the phone at it and let the app fill the form in."
//
// The in-app twin of `npm run gym:equipment`. Same job, different place: the
// script is for cataloguing the whole basement from a laptop; this is for the
// moment you're standing in front of one machine with your phone. It reuses the
// OpenRouter key the coach already has (Coach → AI trainer), so there is nothing
// extra to set up.
//
// Deliberately narrow: ONE piece of equipment per photo, and it names that piece
// and nothing else. It does NOT propose exercises — a photo of a bench cannot
// show what weight is in the room, so anything it invents from one frame is
// guesswork ("sit-ups on the bench") that then has to be un-ticked. Exercises are
// worked out later by `npm run gym:exercises`, which reads the WHOLE catalog at
// once and so knows the bench has plates next to it.
//
// It only ever SUGGESTS: nothing is written until you press Save and every field
// stays editable, because a vision model reading a dark basement will sometimes
// be wrong, and being wrong here has to cost a tap.
import type { AiConfig } from '../types'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

/** Vision-capable and cheap. A photo costs a fraction of a cent to look at. */
const VISION_MODEL = 'google/gemini-2.5-flash'

export interface IdentifiedEquipment {
  name: string
  emoji: string
  notes: string
}

export function visionReady(ai: AiConfig | null): boolean {
  return !!ai?.openrouterKey?.trim()
}

/**
 * Look at one photo and describe the equipment in it.
 *
 * `hint` is whatever you already typed in the form — a weight range, a brand,
 * "the bench only inclines to 45°". The model is told to trust it over the
 * picture, because a photo cannot show you any of that.
 */
export async function identifyEquipment(ai: AiConfig | null, imageDataUrl: string, hint: string): Promise<IdentifiedEquipment> {
  const key = ai?.openrouterKey?.trim()
  if (!key) throw new Error('No OpenRouter key yet — add one in Coach → AI trainer.')

  const prompt = `A photo of ONE piece of home-gym equipment, taken by its owner, who is cataloguing what he owns.

Name it and describe it. Do NOT suggest exercises — that is decided later, from the whole catalog at once.
${hint.trim() ? `\nTHE OWNER SAYS: "${hint.trim()}"\nTrust this over what you think you can see — a photo can't show a weight range or an adjustment limit. Work it into "notes".\n` : ''}
If the photo shows no usable training equipment at all, return {"error": "<short reason>"}.

Answer with ONLY this JSON object — no prose, no markdown fence:
{
  "name": "short specific name, e.g. \\"Adjustable dumbbells\\"",
  "emoji": "one fitting emoji",
  "notes": "what it is and what it can do: type, attachments, adjustability (e.g. flat/incline/decline), visible weight or plates, condition. Anything a trainer would need in order to program with it. Empty string if nothing useful is visible."
}`

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(45_000),
    headers: {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': location.origin,
      'X-Title': 'Wheels of Procrastination Gym',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ai?.model?.trim() && ai.model.includes('gemini') ? ai.model : VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 140)}`)
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = json.choices?.[0]?.message?.content
  if (!text) throw new Error('The model sent nothing back. Try another angle.')

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error("Couldn't read the reply. Try again.")
  const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>

  if (typeof parsed.error === 'string') throw new Error(parsed.error)
  if (typeof parsed.name !== 'string' || !parsed.name.trim()) throw new Error("Couldn't tell what that is. Try a wider shot.")

  return {
    name: String(parsed.name).trim().slice(0, 60),
    emoji: typeof parsed.emoji === 'string' && parsed.emoji ? [...parsed.emoji][0] : '🏋️',
    notes: typeof parsed.notes === 'string' ? parsed.notes.trim().slice(0, 300) : '',
  }
}
