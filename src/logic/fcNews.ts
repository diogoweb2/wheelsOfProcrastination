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
import type { AiConfig, FcNewsItem } from '../types'
import { askOpenRouter, shortAiError, sliceJson } from './openrouter'
import { torontoDate } from './fclock'

/** Search-augmented: the `:online` suffix is OpenRouter's web plugin. */
const NEWS_MODELS = ['perplexity/sonar', 'deepseek/deepseek-v4-flash:online']
const TITLE = 'Wheels — FC Lock news'
const TIMEOUT_MS = 90_000

/** A fetched batch is good for a day — transfer rumours don't move faster. */
export const NEWS_TTL_MS = 24 * 60 * 60 * 1000

/**
 * ONE SEARCH PER DAY, and it is a hard cap rather than a cache rule.
 *
 * A web-search request is the most expensive thing this app does, and the
 * refresh button used to bypass the cache entirely — so the real spend was
 * "however many times someone taps it". The cap is keyed on the Toronto
 * calendar date of the last successful fetch, so it resets at local midnight
 * rather than 24 hours after whenever you last happened to look.
 *
 * Deliberately NOT tied to the cache key: changing which clubs you follow
 * invalidates the cached batch, but it must not buy another search, or the cap
 * is one team-toggle away from meaningless.
 */
export function newsFetchedToday(fetchedAt: string | undefined, now: Date = new Date()): boolean {
  if (!fetchedAt) return false
  return torontoDate(fetchedAt) === torontoDate(now)
}

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

