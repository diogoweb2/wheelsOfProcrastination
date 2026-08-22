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

// --- players -----------------------------------------------------------------

const PLAYER_KEY = 'fclock:player:v2:'

/** Everything TheSportsDB knows about a footballer, in the shape the sheet wants. */
export interface PlayerInfo {
  id: string
  name: string
  team?: string
  position?: string
  /** YYYY-MM-DD. */
  born?: string
  nationality?: string
  birthPlace?: string
  height?: string
  weight?: string
  number?: string
  foot?: string
  description?: string
  cutout?: string
  thumb?: string
}

/**
 * Look a player up by name and remember them forever — a face and a birthday
 * don't change. Two calls behind one cache entry: the search finds the id, the
 * lookup carries the height, the foot and the write-up. `null` is cached too, as
 * an empty record, so a name they've never heard of isn't searched every render.
 */
export async function lookupPlayer(name: string): Promise<PlayerInfo | null> {
  const cached = localStorage.getItem(PLAYER_KEY + name)
  if (cached !== null) {
    const parsed = JSON.parse(cached) as PlayerInfo | null
    return parsed && parsed.id ? parsed : null
  }
  let info: PlayerInfo | null = null
  try {
    const res = await fetch(`${API}/searchplayers.php?p=${encodeURIComponent(name)}`)
    if (res.ok) {
      const body = (await res.json()) as { player: Record<string, string | null>[] | null }
      const hit = (body.player ?? []).find((p) => p.strSport === 'Soccer')
      if (hit?.idPlayer) info = await full(hit)
    }
  } catch {
    return null // offline: don't poison the cache, try again next time
  }
  try {
    localStorage.setItem(PLAYER_KEY + name, JSON.stringify(info ?? {}))
  } catch {
    // a full quota is not worth failing a face over
  }
  return info
}

/** The search hit, topped up with the fields only the full record carries. */
async function full(hit: Record<string, string | null>): Promise<PlayerInfo> {
  let deep: Record<string, string | null> = {}
  try {
    const res = await fetch(`${API}/lookupplayer.php?id=${hit.idPlayer}`)
    if (res.ok) {
      const body = (await res.json()) as { players: Record<string, string | null>[] | null }
      deep = body.players?.[0] ?? {}
    }
  } catch {
    // the search hit alone is still a useful card
  }
  const pick = (k: string) => (deep[k] || hit[k] || undefined) ?? undefined
  return {
    id: hit.idPlayer ?? '',
    name: pick('strPlayer') ?? '',
    team: pick('strTeam'),
    position: pick('strPosition'),
    born: pick('dateBorn'),
    nationality: pick('strNationality'),
    birthPlace: pick('strBirthLocation'),
    height: pick('strHeight'),
    weight: pick('strWeight'),
    number: pick('strNumber'),
    foot: pick('strSide'),
    description: pick('strDescriptionEN'),
    cutout: pick('strCutout'),
    thumb: pick('strThumb'),
  }
}

/** Age today, from a YYYY-MM-DD birthday. */
export function ageFrom(born: string | undefined, now: Date = new Date()): number | null {
  if (!born) return null
  const d = new Date(`${born}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  let age = now.getFullYear() - d.getUTCFullYear()
  const beforeBirthday =
    now.getMonth() < d.getUTCMonth() || (now.getMonth() === d.getUTCMonth() && now.getDate() < d.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= 0 && age < 120 ? age : null
}

// --- the club ranking --------------------------------------------------------

const TEAM_KEY = 'fclock:team:v1:'

/** One lookup at a time, 200 ms apart — kind to a free API, invisible to a reader. */
let chain: Promise<unknown> = Promise.resolve()
function queued<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const out = await job()
    await new Promise((r) => setTimeout(r, 200))
    return out
  })
  chain = run.catch(() => undefined)
  return run as Promise<T>
}

/**
 * Look a club up by name and remember it — the Teams tab needs a badge and an
 * id for a club the user hasn't followed yet.
 */
export async function teamByName(name: string): Promise<FcTeam | null> {
  const cached = localStorage.getItem(TEAM_KEY + name)
  if (cached !== null) {
    const parsed = JSON.parse(cached) as FcTeam | null
    return parsed && parsed.id ? parsed : null
  }
  let team: FcTeam | null = null
  try {
    // forty rows mounting at once would be forty requests at once, and the free
    // tier answers that with a rate-limit page — so they queue, one at a time
    const hits = await queued(() => searchTeams(name))
    team = hits[0] ?? null
  } catch {
    return null // offline or rate-limited: try again next time, don't cache a miss
  }
  try {
    localStorage.setItem(TEAM_KEY + name, JSON.stringify(team ?? {}))
  } catch {
    // full quota: the badge is not worth failing over
  }
  return team
}

export interface RankedClub {
  /** Exactly the name TheSportsDB knows them by — this is also the search key. */
  name: string
  country: string
  /** What the ranking is built on, in one line. */
  note: string
}

/**
 * The clubs worth following, **greatest first**.
 *
 * This is a hand-kept ranking, not a computed table: it reads the last few
 * seasons of European and South American football — Champions League depth,
 * league titles, and the size of the club — and puts them in order. Reasonable
 * people rank 12 vs 15 differently; the tiers are what matter, and the file is
 * one edit away from being re-ordered.
 */
export const CLUB_RANKING: RankedClub[] = [
  { name: 'Real Madrid', country: 'Spain', note: 'the most European Cups of anyone, by a distance' },
  { name: 'Manchester City', country: 'England', note: 'a decade of Premier League titles and a treble' },
  { name: 'Bayern Munich', country: 'Germany', note: 'the Bundesliga is theirs almost by default' },
  { name: 'Paris Saint-Germain', country: 'France', note: 'France plus a European Cup at last' },
  { name: 'Liverpool', country: 'England', note: 'six European Cups and a modern title-winning side' },
  { name: 'Barcelona', country: 'Spain', note: 'La Masia, La Liga, and five European Cups' },
  { name: 'Arsenal', country: 'England', note: 'back at the top of England, still chasing Europe' },
  { name: 'Inter Milan', country: 'Italy', note: "Serie A's most consistent side of the decade" },
  { name: 'Atlético Madrid', country: 'Spain', note: 'two La Ligas among the Madrid–Barça years' },
  { name: 'AC Milan', country: 'Italy', note: 'seven European Cups, second only to Madrid' },
  { name: 'Chelsea', country: 'England', note: 'two European Cups this century, always spending' },
  { name: 'Juventus', country: 'Italy', note: 'nine Serie A titles in a row, no European Cup since 1996' },
  { name: 'Borussia Dortmund', country: 'Germany', note: "Germany's loudest second team" },
  { name: 'Manchester United', country: 'England', note: 'twenty English titles, three European Cups, thin years' },
  { name: 'Tottenham Hotspur', country: 'England', note: 'a European trophy at last, still no league' },
  { name: 'Napoli', country: 'Italy', note: 'Scudetti in 2023 and since — no longer a one-off' },
  { name: 'Benfica', country: 'Portugal', note: 'Portugal’s biggest, and a factory for the rest of Europe' },
  { name: 'FC Porto', country: 'Portugal', note: 'two European Cups from a league nobody watches' },
  { name: 'Ajax', country: 'Netherlands', note: 'four European Cups and the best academy in Europe' },
  { name: 'Bayer Leverkusen', country: 'Germany', note: 'the invincible 2024 season' },
  { name: 'RB Leipzig', country: 'Germany', note: 'twenty years old and already a fixture in Europe' },
  { name: 'Newcastle United', country: 'England', note: 'money, noise, and a return to the Champions League' },
  { name: 'Aston Villa', country: 'England', note: 'European champions in 1982, back in the mix' },
  { name: 'Sporting CP', country: 'Portugal', note: 'Portugal’s third giant, and Ronaldo’s first club' },
  { name: 'PSV Eindhoven', country: 'Netherlands', note: 'a European Cup in 1988 and the Dutch title most years' },
  { name: 'Atalanta', country: 'Italy', note: 'the best small-budget side in Europe' },
  { name: 'Flamengo', country: 'Brazil', note: 'Brazil’s biggest crowd and recent Libertadores winners' },
  { name: 'Palmeiras', country: 'Brazil', note: 'back-to-back Libertadores and the Brasileirão’s benchmark' },
  { name: 'Boca Juniors', country: 'Argentina', note: 'La Bombonera, six Libertadores' },
  { name: 'River Plate', country: 'Argentina', note: 'Boca’s equal, and the 2018 final' },
  { name: 'Club Brugge', country: 'Belgium', note: 'Belgium’s standard-bearer in Europe' },
  { name: 'Celtic', country: 'Scotland', note: 'European champions in 1967, Scotland’s biggest' },
  { name: 'Galatasaray', country: 'Turkey', note: 'a UEFA Cup and the loudest ground in Europe' },
  { name: 'Olympique de Marseille', country: 'France', note: 'the only French club with a European Cup' },
  { name: 'Sao Paulo', country: 'Brazil', note: 'three Libertadores and two Intercontinental Cups' },
  { name: 'Corinthians', country: 'Brazil', note: 'a Club World Cup and Brazil’s loudest support' },
  { name: 'West Ham United', country: 'England', note: 'a Conference League, and not much else lately' },
  { name: 'Everton', country: 'England', note: 'nine English titles, all a long time ago' },
  { name: 'Wolverhampton Wanderers', country: 'England', note: 'giants of the 1950s, mid-table since' },
  { name: 'Sunderland', country: 'England', note: 'huge support, long climb back' },
]

// --- highlights (§21i) -------------------------------------------------------

export interface VideoSource {
  id: string
  name: string
  emoji: string
  url: string
  what: string
  /** TheSportsDB league ids this source covers, for matching a result to a site. */
  leagues: string[]
}

/**
 * Where the highlights actually live. None of these publish a feed a browser is
 * allowed to read (no CORS, no free API), so FC Lock does the honest thing: it
 * takes you straight to the page, and for a specific game it builds the search
 * that finds that game's highlights.
 */
/**
 * CazéTV's YouTube channel. The two embeds below need nothing but this id — no
 * API key, no server: `live_stream` plays whatever the channel is broadcasting
 * right now, and the uploads playlist (the channel id with `UC` swapped for
 * `UU`) plays their latest videos newest first.
 */
export const CAZE_CHANNEL = 'UCZiYbVptd3PVPf4f6eR6UaQ'
export const CAZE_UPLOADS = `UU${CAZE_CHANNEL.slice(2)}`
export const CAZE_LIVE_EMBED = `https://www.youtube.com/embed/live_stream?channel=${CAZE_CHANNEL}&rel=0`
export const CAZE_UPLOADS_EMBED = `https://www.youtube.com/embed/videoseries?list=${CAZE_UPLOADS}&rel=0`

export const VIDEO_SOURCES: VideoSource[] = [
  {
    id: 'caze',
    name: 'CazéTV',
    emoji: '📺',
    url: 'https://www.youtube.com/@CazeTV/streams',
    what: 'live games and full replays, in Brazil',
    leagues: ['4480', '4481', '5071', '4351'],
  },
  {
    id: 'pl',
    name: 'Premier League',
    emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    url: 'https://www.premierleague.com/en/video',
    what: 'official match highlights',
    leagues: ['4328'],
  },
  {
    id: 'laliga',
    name: 'LaLiga',
    emoji: '🇪🇸',
    url: 'https://www.laliga.com/en-GB/videos?page=1',
    what: 'official video hub',
    leagues: ['4335'],
  },
  {
    id: 'seriea',
    name: 'Serie A',
    emoji: '🇮🇹',
    url: 'https://matchhighlights.live/league/serie-a/',
    what: 'match highlights',
    leagues: ['4332'],
  },
  {
    id: 'ligue1',
    name: 'Ligue 1',
    emoji: '🇫🇷',
    url: 'https://ligue1.com/en/videos',
    what: 'official videos',
    leagues: ['4334'],
  },
  {
    id: 'brasileirao',
    name: 'Brasileirão',
    emoji: '🇧🇷',
    url: 'https://www.foxsports.com/soccer/brazil-serie-a/highlights',
    what: 'highlights on FOX Sports',
    leagues: ['4351'],
  },
]

/** The site that covers this competition, if one of ours does. */
export function sourceForLeague(leagueId: string): VideoSource | undefined {
  return VIDEO_SOURCES.find((v) => v.id !== 'caze' && v.leagues.includes(leagueId))
}

/** A YouTube search that lands on this exact game's highlights. */
export function highlightSearch(m: FcMatch): string {
  const q = `${m.home} vs ${m.away} highlights ${m.leagueName}`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}
