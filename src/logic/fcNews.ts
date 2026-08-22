// ⚽ FC Lock's news desk (§21d).
//
// There is no free football-news API worth wiring up: the good ones cost money
// and the RSS ones are blocked by CORS in the browser. What the app already has
// is an OpenRouter key, and OpenRouter's `:online` suffix puts a live web search
// in front of any model. So the news tab asks a model to go and read today's
// football press for the clubs we follow, and hand it back as JSON.
//
// It is a *summary of sources*, not a wire feed: every item carries where it
// came from, and the batch is cached in Firestore so opening the tab five times
// costs one search.
import type { AiConfig, FcNewsItem, FcTransferItem } from '../types'
import { askOpenRouter, shortAiError, sliceJson } from './openrouter'

/** Search-augmented: the `:online` suffix is OpenRouter's web plugin. */
const NEWS_MODELS = ['perplexity/sonar', 'deepseek/deepseek-v4-flash:online']
const TITLE = 'Wheels — FC Lock news'
const TIMEOUT_MS = 90_000

/** A fetched batch is good for six hours — transfer rumours don't move faster. */
export const NEWS_TTL_MS = 6 * 60 * 60 * 1000

export function newsKey(teams: string[]): string {
  return [...teams].sort().join('|')
}

export function newsStale(fetchedAt: string | undefined, key: string, forKey: string | undefined): boolean {
  if (!fetchedAt || forKey !== key) return true
  return Date.now() - Date.parse(fetchedAt) > NEWS_TTL_MS
}

const SYSTEM = `You are a football news desk. You search the live web and report only what you actually found.
Rules:
- Only report items you can attribute to a real, named outlet you found in the search.
- Never invent a transfer, a fee, a quote or a date. If there is little news, return fewer items.
- Transfer news first, then other news about the club (injuries, results, managers).
- Write in plain English, short sentences, no hype.`

/**
 * The latest news for the clubs we follow, transfers first.
 * Throws with a reason a human can act on.
 */
export async function fetchFcNews(ai: AiConfig | null, teams: string[]): Promise<FcNewsItem[]> {
  const key = ai?.openrouterKey?.trim()
  if (!key) throw new Error('No OpenRouter key set — add one in Settings to turn the news on.')
  if (!teams.length) throw new Error('Follow a club first and the news follows it.')

  const today = new Date().toISOString().slice(0, 10)
  const prompt = `Today is ${today}. Search the web for the latest football news about these clubs: ${teams.join(', ')}.
Return 8-12 items, TRANSFER news first (signings, bids, rumours from reputable outlets), then other club news.
Answer with ONLY a JSON array, each item:
{"title": "...", "summary": "1-2 sentences", "team": "which club it is about", "kind": "transfer" | "news", "source": "outlet name", "url": "link to the article", "date": "YYYY-MM-DD"}`

  let last: unknown
  for (const model of NEWS_MODELS) {
    try {
      const text = await askOpenRouter({
        key,
        model,
        system: SYSTEM,
        prompt,
        title: TITLE,
        temperature: 0.2,
        timeoutMs: TIMEOUT_MS,
      })
      return parse(text)
    } catch (e) {
      last = e
    }
  }
  throw new Error(shortAiError(last, TIMEOUT_MS))
}

function parse(text: string): FcNewsItem[] {
  const raw = JSON.parse(sliceJson(text, '[', ']')) as Partial<FcNewsItem>[]
  return raw
    .filter((i) => i?.title)
    .slice(0, 15)
    .map((i, n) => ({
      id: `news-${Date.now()}-${n}`,
      title: String(i.title).slice(0, 160),
      summary: String(i.summary ?? '').slice(0, 400),
      kind: i.kind === 'transfer' ? 'transfer' : 'news',
      ...(i.team ? { team: String(i.team).slice(0, 60) } : {}),
      ...(i.source ? { source: String(i.source).slice(0, 60) } : {}),
      ...(i.url ? { url: String(i.url).slice(0, 400) } : {}),
      ...(i.date ? { date: String(i.date).slice(0, 10) } : {}),
    }))
}

// --- the transfer market (§21f) ----------------------------------------------

/** The market is a slow-moving record, not a rumour mill: one read a day is plenty. */
export const TRANSFERS_TTL_MS = 24 * 60 * 60 * 1000

export function transfersStale(
  cache: { fetchedAt: string; forKey: string; year: number } | undefined,
  key: string,
  year: number,
): boolean {
  if (!cache || cache.forKey !== key || cache.year !== year) return true
  return Date.now() - Date.parse(cache.fetchedAt) > TRANSFERS_TTL_MS
}

const TRANSFERS_SYSTEM = `You are a football transfer archivist. You search the live web and report only completed or officially announced transfers you actually found.
Rules:
- Only moves that are DONE (signed / officially announced). No rumours, no "in talks", no "close to".
- Fees exactly as reported by the outlet ("€60m", "£45m", "free", "loan", "undisclosed"). Never estimate a fee yourself.
- Never invent a player, a club, a fee or a date.
- If you are unsure a move completed, leave it out.`

/**
 * Every transfer this calendar year: the followed clubs first, then the biggest
 * moves in world football. Throws with a reason a human can act on.
 */
export async function fetchFcTransfers(
  ai: AiConfig | null,
  teams: string[],
  year: number = new Date().getFullYear(),
): Promise<FcTransferItem[]> {
  const key = ai?.openrouterKey?.trim()
  if (!key) throw new Error('No OpenRouter key set — add one in Settings to turn transfers on.')

  const following = teams.length
    ? `First, EVERY completed transfer in and out of these clubs in ${year}: ${teams.join(', ')}. Mark each of those with "ours": true.
Then, the 15 biggest completed transfers in world football in ${year} (any club), with "ours": false.`
    : `The 25 biggest completed transfers in world football in ${year}, with "ours": false.`

  const prompt = `Today is ${new Date().toISOString().slice(0, 10)}. Search the web for the ${year} football transfer market.
${following}
Answer with ONLY a JSON array, newest first, each item:
{"player": "...", "from": "selling club", "to": "buying club", "fee": "as reported", "kind": "permanent" | "loan" | "free", "date": "YYYY-MM-DD", "source": "outlet name", "url": "link", "ours": true | false}`

  let last: unknown
  for (const model of NEWS_MODELS) {
    try {
      const text = await askOpenRouter({
        key,
        model,
        system: TRANSFERS_SYSTEM,
        prompt,
        title: TITLE,
        temperature: 0.1,
        timeoutMs: TIMEOUT_MS,
      })
      return parseTransfers(text)
    } catch (e) {
      last = e
    }
  }
  throw new Error(shortAiError(last, TIMEOUT_MS))
}

function parseTransfers(text: string): FcTransferItem[] {
  const raw = JSON.parse(sliceJson(text, '[', ']')) as Partial<FcTransferItem>[]
  return raw
    .filter((t) => t?.player && t?.to)
    .slice(0, 60)
    .map((t, n) => ({
      id: `tr-${Date.now()}-${n}`,
      player: String(t.player).slice(0, 80),
      from: String(t.from ?? '—').slice(0, 60),
      to: String(t.to).slice(0, 60),
      fee: String(t.fee ?? 'undisclosed').slice(0, 40),
      kind: t.kind === 'loan' || t.kind === 'free' ? t.kind : 'permanent',
      ...(t.ours ? { ours: true } : {}),
      ...(t.date ? { date: String(t.date).slice(0, 10) } : {}),
      ...(t.source ? { source: String(t.source).slice(0, 60) } : {}),
      ...(t.url ? { url: String(t.url).slice(0, 400) } : {}),
    }))
}
