// ⚽ FC Lock — the football schedule (§21).
//
// Fixtures, results and badges come from TheSportsDB's free v1 API: no key, no
// signup, CORS open to the browser, and it carries every competition CazéTV
// shows in Brazil. Kick-offs arrive as UTC and are only ever *displayed* in
// Toronto time — that conversion is the whole point of the app.
//
// Everything is cached in localStorage for half an hour, because the free tier
// is rate-limited and a schedule that changed a minute ago is not news.

const API = 'https://www.thesportsdb.com/api/v1/json/3'
const CACHE_PREFIX = 'fclock:v1:'
const CACHE_TTL_MS = 30 * 60 * 1000

/** The only clock this app tells the time in. */
export const TZ = 'America/Toronto'

// --- the competition roster --------------------------------------------------

export interface LeagueDef {
  id: string // TheSportsDB league id
  name: string // how we say it
  emoji: string
  /**
   * Shown on CazéTV in Brazil, as far as we know. CazéTV's rights move season
   * to season and nobody publishes them as data, so this is a hand-kept list —
   * a badge, never a promise. Every league can be followed either way.
   */
  caze?: boolean
}

export const LEAGUES: LeagueDef[] = [
  { id: '4480', name: 'Champions League', emoji: '🏆', caze: true },
  { id: '4481', name: 'Europa League', emoji: '🥈', caze: true },
  { id: '5071', name: 'Conference League', emoji: '🥉', caze: true },
  { id: '4351', name: 'Brasileirão Série A', emoji: '🇧🇷', caze: true },
  { id: '4328', name: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: '4335', name: 'La Liga', emoji: '🇪🇸' },
  { id: '4332', name: 'Serie A', emoji: '🇮🇹' },
  { id: '4331', name: 'Bundesliga', emoji: '🇩🇪' },
  { id: '4334', name: 'Ligue 1', emoji: '🇫🇷' },
  { id: '4482', name: 'FA Cup', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: '4483', name: 'Copa del Rey', emoji: '🇪🇸' },
  { id: '4570', name: 'EFL Cup', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
]

export function leagueById(id: string): LeagueDef | undefined {
  return LEAGUES.find((l) => l.id === id)
}

// --- what a match looks like once it's ours ---------------------------------

export interface FcMatch {
  id: string // TheSportsDB idEvent — also the watchlist key
  leagueId: string
  leagueName: string
  home: string
  away: string
  homeId?: string
  awayId?: string
  homeBadge?: string
  awayBadge?: string
  /** Kick-off, UTC ISO. Displayed in Toronto time, always. */
  kickoff: string
  homeScore?: number
  awayScore?: number
}

export interface FcTeam {
  id: string
  name: string
  badge?: string
  leagueName?: string
}

/** Raw TheSportsDB event → our shape. Returns null for anything without a kick-off. */
function toMatch(e: Record<string, string | null>): FcMatch | null {
  const stamp = e.strTimestamp
  if (!e.idEvent || !stamp) return null
  const num = (v: string | null | undefined) => (v === null || v === undefined || v === '' ? undefined : Number(v))
  return {
    id: e.idEvent,
    leagueId: e.idLeague ?? '',
    leagueName: e.strLeague ?? '',
    home: e.strHomeTeam ?? '?',
    away: e.strAwayTeam ?? '?',
    homeId: e.idHomeTeam ?? undefined,
    awayId: e.idAwayTeam ?? undefined,
    homeBadge: e.strHomeTeamBadge ?? undefined,
    awayBadge: e.strAwayTeamBadge ?? undefined,
    // the API sends UTC without a zone marker; say so explicitly or the browser
    // reads it as local time and every kick-off lands hours out
    kickoff: stamp.endsWith('Z') ? stamp : `${stamp}Z`,
    homeScore: num(e.intHomeScore),
    awayScore: num(e.intAwayScore),
  }
}

// --- the network, with a half-hour memory ------------------------------------

interface Cached<T> {
  at: number
  value: T
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const hit = JSON.parse(raw) as Cached<T>
    return Date.now() - hit.at < CACHE_TTL_MS ? hit.value : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), value } satisfies Cached<T>))
  } catch {
    // a full quota is not worth failing a fetch over
  }
}

async function get<T>(path: string, cacheKey: string): Promise<T | null> {
  const hit = readCache<T>(cacheKey)
  if (hit) return hit
  const res = await fetch(`${API}/${path}`)
  if (!res.ok) throw new Error(`TheSportsDB HTTP ${res.status}`)
  const json = (await res.json()) as T
  writeCache(cacheKey, json)
  return json
}

type EventsBody = { events: Record<string, string | null>[] | null }

async function events(path: string, cacheKey: string): Promise<FcMatch[]> {
  const body = await get<EventsBody>(path, cacheKey)
  return (body?.events ?? []).map(toMatch).filter((m): m is FcMatch => m !== null)
}

/** The next fixtures in a competition (the free tier gives ~15). */
export function nextInLeague(leagueId: string): Promise<FcMatch[]> {
  return events(`eventsnextleague.php?id=${leagueId}`, `next-league-${leagueId}`)
}

/** The last results in a competition (~15). */
export function pastInLeague(leagueId: string): Promise<FcMatch[]> {
  return events(`eventspastleague.php?id=${leagueId}`, `past-league-${leagueId}`)
}

/** A team's next fixtures, whatever competition they're in. */
export function nextForTeam(teamId: string): Promise<FcMatch[]> {
  return events(`eventsnext.php?id=${teamId}`, `next-team-${teamId}`)
}

/** A team's last results. */
export function pastForTeam(teamId: string): Promise<FcMatch[]> {
  return events(`eventslast.php?id=${teamId}`, `past-team-${teamId}`)
}

/** One match by id — how a watchlisted game finds out its own score. */
export async function lookupMatch(eventId: string): Promise<FcMatch | null> {
  const body = await get<EventsBody>(`lookupevent.php?id=${eventId}`, `event-${eventId}`)
  const raw = body?.events?.[0]
  return raw ? toMatch(raw) : null
}

/** Team search for the Teams tab. Not cached — it's typed, and it's cheap. */
export async function searchTeams(name: string): Promise<FcTeam[]> {
  const res = await fetch(`${API}/searchteams.php?t=${encodeURIComponent(name)}`)
  if (!res.ok) throw new Error(`TheSportsDB HTTP ${res.status}`)
  const body = (await res.json()) as { teams: Record<string, string | null>[] | null }
  return (body?.teams ?? [])
    .filter((t) => t.strSport === 'Soccer')
    .slice(0, 12)
    .map((t) => ({
      id: t.idTeam ?? '',
      name: t.strTeam ?? '?',
      badge: t.strBadge ?? undefined,
      leagueName: t.strLeague ?? undefined,
    }))
}

/** Drop a stale schedule so the next open refetches. */
export function clearCache(): void {
  for (const k of Object.keys(localStorage)) if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k)
}

// --- Toronto time ------------------------------------------------------------

export function torontoTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
}

export function torontoDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' })
}

/** The Toronto calendar date (YYYY-MM-DD) a moment falls on — how days get grouped. */
export function torontoDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
}

/**
 * Whole days from today to that kick-off, counted in Toronto calendar days:
 * 0 = today, 1 = tomorrow, negative = it already happened. Calendar days, not
 * 24-hour blocks, so a game tonight never reads "in 0 days" while one tomorrow
 * morning reads the same.
 */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const a = Date.parse(`${torontoDate(now)}T00:00:00Z`)
  const b = Date.parse(`${torontoDate(iso)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/** "Today", "Tomorrow", "in 5 days", "3 days ago" — the countdown, in words. */
export function countdownLabel(iso: string, now: Date = new Date()): string {
  const d = daysUntil(iso, now)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  return d > 0 ? `in ${d} days` : `${-d} days ago`
}

/** Kicked off more than ~2½ hours ago: long enough that a result should exist. */
export function isFinished(m: FcMatch, now: Date = new Date()): boolean {
  return now.getTime() - Date.parse(m.kickoff) > 150 * 60 * 1000
}

export function hasScore(m: FcMatch): boolean {
  return typeof m.homeScore === 'number' && typeof m.awayScore === 'number'
}

// --- the big tournaments -----------------------------------------------------

export interface TournamentDef {
  id: string
  name: string
  emoji: string
  what: string
  /** Toronto-local date, YYYY-MM-DD. */
  date: string
  /**
   * The date is the published one. `approx` means the competition's window is
   * known but the day isn't fixed yet, so the countdown is shown with a ≈.
   */
  approx?: boolean
}

/**
 * The countdowns worth having — European club finals and the next national-team
 * tournaments. Hand-kept: these dates are announced years out and change rarely,
 * and anything still unfixed is marked `approx` rather than invented.
 */
export const TOURNAMENTS: TournamentDef[] = [
  { id: 'ucl-27', name: 'Champions League final', emoji: '🏆', what: 'Metropolitano, Madrid', date: '2027-05-29' },
  { id: 'uel-27', name: 'Europa League final', emoji: '🥈', what: 'Beşiktaş Park, Istanbul', date: '2027-05-19' },
  { id: 'uecl-27', name: 'Conference League final', emoji: '🥉', what: 'Red Bull Arena, Leipzig', date: '2027-05-26' },
  { id: 'ucl-ko-27', name: 'Champions League knockouts', emoji: '⚔️', what: 'round of 16 begins', date: '2027-03-09', approx: true },
  { id: 'libertadores-26', name: 'Libertadores final', emoji: '🌎', what: 'South America’s big one', date: '2026-11-28', approx: true },
  { id: 'euro-28', name: 'Euro 2028', emoji: '🇬🇧', what: 'UK & Ireland', date: '2028-06-09', approx: true },
  { id: 'copa-america-28', name: 'Copa América 2028', emoji: '🇧🇷', what: 'Brazil’s next shot', date: '2028-06-01', approx: true },
  { id: 'wc-30', name: 'World Cup 2030', emoji: '🌍', what: 'Spain · Portugal · Morocco', date: '2030-06-13', approx: true },
]

/** Only the ones still ahead of us, soonest first. */
export function upcomingTournaments(now: Date = new Date()): TournamentDef[] {
  return TOURNAMENTS.filter((t) => daysUntil(`${t.date}T12:00:00Z`, now) >= 0).sort((a, b) => a.date.localeCompare(b.date))
}
