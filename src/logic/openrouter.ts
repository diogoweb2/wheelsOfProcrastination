// One place to talk to OpenRouter. The Gym coach and the Essay desk both use it.
//
// The key lives in Firestore (`app/aiConfig`), never in the repo or the bundle,
// so it can be rotated without a build. Put a spend cap on the OpenRouter
// dashboard: these are all small, cheap, occasional calls.
import type { AiConfig } from '../types'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

/** Cheap, fast and reliably good at small structured JSON — the right default here. */
export const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash'

/** DeepSeek and friends can think for a long minute. Waiting beats a silent fallback. */
export const TIMEOUT_MS = 180_000

export function aiReady(ai: AiConfig | null): boolean {
  return !!ai?.openrouterKey?.trim()
}

export interface AskOptions {
  key: string
  model: string
  system: string
  prompt: string
  /** Shown on the OpenRouter dashboard, so spend can be read per feature. */
  title: string
  temperature?: number
  /** How long to wait before giving up on this model. Defaults to TIMEOUT_MS. */
  timeoutMs?: number
}

/** One chat completion, returned as raw text. Throws with a reason a human can act on. */
export async function askOpenRouter({
  key,
  model,
  system,
  prompt,
  title,
  temperature = 0.7,
  timeoutMs = TIMEOUT_MS,
}: AskOptions): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': location.origin,
        'X-Title': title,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status} (${model}): ${(await res.text()).slice(0, 300)}`)
    // OpenRouter can answer 200 with an error body, or with an empty choice when
    // the upstream model times out on its side. Say which one it was.
    const json = (await res.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[]
      error?: { message?: string; code?: number }
    }
    if (json.error) throw new Error(`OpenRouter said: ${json.error.message ?? JSON.stringify(json.error)} (${model})`)
    const text = json.choices?.[0]?.message?.content
    if (!text) throw new Error(`${model} sent an empty reply (finish_reason=${json.choices?.[0]?.finish_reason ?? 'none'})`)
    return text
  } finally {
    clearTimeout(timer)
  }
}

/** The first {...} / [...] in a reply, so a stray "Here you go:" or a markdown fence can't break the parse. */
export function sliceJson(text: string, open: string, close: string): string {
  const a = text.indexOf(open)
  const b = text.lastIndexOf(close)
  if (a === -1 || b === -1 || b < a) throw new Error('no JSON in the reply')
  return text.slice(a, b + 1)
}

/** Kept verbatim wherever possible — a vague reason is worse than a long one. */
export function shortAiError(e: unknown, timeoutMs = TIMEOUT_MS): string {
  const msg = e instanceof Error ? `${e.name === 'Error' ? '' : `${e.name}: `}${e.message}` : String(e)
  if (/abort/i.test(msg)) return `no answer in ${timeoutMs / 1000}s — the model is overloaded or too slow`
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return `network error reaching OpenRouter (offline? blocked?) — ${msg}`
  if (/JSON/i.test(msg)) return `the model's answer wasn't valid JSON — ${msg}`
  return msg.slice(0, 300)
}
