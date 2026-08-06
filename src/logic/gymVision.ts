// "Point the phone at it and let the app fill the form in."
//
// The in-app twin of `npm run gym:equipment`. Same job, different place: the
// script is for cataloguing the whole basement from a laptop; this is for the
// moment you're standing in front of one machine with your phone. It reuses the
// OpenRouter key the coach already has (Coach → AI trainer), so there is nothing
// extra to set up.
//
// Deliberately narrower than the script: ONE piece of equipment per photo, and
// it only ever SUGGESTS. Nothing is written until you press Save, every field
// stays editable, and each proposed exercise has a checkbox. A vision model
// reading a dark basement will sometimes be wrong, and being wrong here has to
// cost a tap, not a bad catalog entry.
import type { AiConfig, BodyPart, ExerciseDef, ExerciseKind } from '../types'
import { ALL_PARTS } from './gym'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

/** Vision-capable and cheap. A photo costs a fraction of a cent to look at. */
const VISION_MODEL = 'google/gemini-2.5-flash'

const KINDS: ExerciseKind[] = ['weight', 'bodyweight', 'timed', 'cardio']

/** One exercise the model thinks this gear makes possible, ready to tick or ignore. */
export interface SuggestedExercise extends Omit<ExerciseDef, 'id' | 'equipmentIds' | 'createdAt' | 'addedBy'> {
  /** Ticked by default; untick to leave it out. */
  keep: boolean
}

export interface IdentifiedEquipment {
  name: string
  emoji: string
  notes: string
  exercises: SuggestedExercise[]
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
export async function identifyEquipment(
  ai: AiConfig | null,
  imageDataUrl: string,
  hint: string,
  known: { kidMode: boolean; avoidBackLoad: boolean },
): Promise<IdentifiedEquipment> {
  const key = ai?.openrouterKey?.trim()
  if (!key) throw new Error('No OpenRouter key yet — add one in Coach → AI trainer.')

  const prompt = `A photo of ONE piece of home-gym equipment, taken by its owner.

Identify it, then list the exercises it makes possible for a household of two: a 43-year-old man with a history of lower-back flare-ups, and his 12-year-old son.
${hint.trim() ? `\nTHE OWNER SAYS: "${hint.trim()}"\nTrust this over what you think you can see — a photo can't show a weight range or an adjustment limit. Work it into "notes".\n` : ''}
If the photo shows no usable training equipment at all, return {"error": "<short reason>"}.

Answer with ONLY this JSON object — no prose, no markdown fence:
{
  "name": "short specific name, e.g. \\"Adjustable dumbbells\\"",
  "emoji": "one fitting emoji",
  "notes": "weight range, attachments, adjustability, condition — anything a trainer needs. Empty string if nothing useful.",
  "exercises": [
    {
      "name": "standard exercise name",
      "emoji": "one fitting emoji",
      "kind": one of ${JSON.stringify(KINDS)},
      "parts": ["primary body part FIRST", "then secondary"],   // from ${JSON.stringify(ALL_PARTS)}
      "intensity": 1 | 2 | 3,
      "how": "one or two plain sentences on how to do it, including the form cue that keeps it safe",
      "restSec": 30-180,
      "defaultReps": number,      // reps; SECONDS for "timed"; MINUTES for "cardio"
      "defaultSets": 2-5,
      "kidSafe": true | false,    // safe for a 12-year-old beginner
      "backRisk": true | false,   // true if it loads the lower back / spine meaningfully
      "ladder": true | false      // true ONLY for bodyweight staples worth a rep ladder
    }
  ]
}

Rules:
- 3 to 8 exercises. Only ones this exact equipment genuinely allows.
- "kind": "weight" means the app asks him to type the load each set.
- Be accurate about backRisk${known.avoidBackLoad ? ' — anything true is never prescribed to him' : ''}${known.kidMode ? ', and about kidSafe — anything false is never given to the boy' : ''}.
- "how" is read mid-set on a phone. Short and concrete.`

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(45_000),
    headers: {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': location.origin,
      'X-Title': 'Wheels of Procrastination — Gym',
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
    exercises: Array.isArray(parsed.exercises) ? parsed.exercises.map(clean).filter((e): e is SuggestedExercise => e !== null) : [],
  }
}

/** Nothing from the model is trusted: unknown values are replaced with safe ones or the row is dropped. */
function clean(raw: unknown): SuggestedExercise | null {
  const r = raw as Record<string, unknown>
  if (!r || typeof r.name !== 'string' || !r.name.trim()) return null
  const parts = (Array.isArray(r.parts) ? r.parts : []).filter((p): p is BodyPart => ALL_PARTS.includes(p as BodyPart))
  if (parts.length === 0) return null

  const num = (v: unknown, min: number, max: number, fallback: number) => {
    const n = Math.round(Number(v))
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
  }

  return {
    keep: true,
    name: r.name.trim().slice(0, 60),
    emoji: typeof r.emoji === 'string' && r.emoji ? [...r.emoji][0] : '🤸',
    kind: KINDS.includes(r.kind as ExerciseKind) ? (r.kind as ExerciseKind) : 'weight',
    parts,
    intensity: ([1, 2, 3].includes(Number(r.intensity)) ? Number(r.intensity) : 2) as 1 | 2 | 3,
    how: typeof r.how === 'string' && r.how.trim() ? r.how.trim().slice(0, 400) : 'No description yet.',
    restSec: num(r.restSec, 15, 240, 60),
    defaultReps: num(r.defaultReps, 1, 300, 10),
    defaultSets: num(r.defaultSets, 1, 5, 3),
    kidSafe: r.kidSafe !== false,
    backRisk: r.backRisk === true,
    ladder: r.ladder === true,
  }
}
