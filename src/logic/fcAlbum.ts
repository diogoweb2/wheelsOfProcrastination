// 📕 FC Lock's sticker album (§21g) — the Premier League collection.
//
// Structured like the real Topps/Panini Premier League album: a page per club,
// a shiny club badge at the top of it, then the players. What it is NOT is a
// copy of Topps' 561-sticker checklist — we can't name 450 players honestly,
// so every sticker here is a REAL footballer pulled from TheSportsDB with their
// real photo, position and shirt number. A made-up sticker would make the whole
// album worthless.
//
// The checklist is resolved once per club and then frozen in localStorage, so a
// sticker you own never turns into a different player behind your back.

const API = 'https://www.thesportsdb.com/api/v1/json/3'
const SQUAD_KEY = 'fclock:squad:v1:'

/** Stickers per club page: the badge, then the squad. */
export const PLAYERS_PER_CLUB = 10

export const PACK_SIZE = 5
/** Berries per pack — the price the shop charges for a bit of luck. */
export const PACK_COST = 50

export interface ClubDef {
  id: string // TheSportsDB team id
  name: string
  short: string
}

/** The 2026 Premier League, in the album's page order (alphabetical, like the real thing). */
export const PL_CLUBS: ClubDef[] = [
  { id: '133604', name: 'Arsenal', short: 'ARS' },
  { id: '133601', name: 'Aston Villa', short: 'AVL' },
  { id: '134301', name: 'Bournemouth', short: 'BOU' },
  { id: '134355', name: 'Brentford', short: 'BRE' },
  { id: '133619', name: 'Brighton & Hove Albion', short: 'BHA' },
  { id: '133623', name: 'Burnley', short: 'BUR' },
  { id: '133610', name: 'Chelsea', short: 'CHE' },
  { id: '133632', name: 'Crystal Palace', short: 'CRY' },
  { id: '133615', name: 'Everton', short: 'EVE' },
  { id: '133600', name: 'Fulham', short: 'FUL' },
  { id: '133635', name: 'Leeds United', short: 'LEE' },
  { id: '133602', name: 'Liverpool', short: 'LIV' },
  { id: '133613', name: 'Manchester City', short: 'MCI' },
  { id: '133612', name: 'Manchester United', short: 'MUN' },
  { id: '134777', name: 'Newcastle United', short: 'NEW' },
  { id: '133720', name: 'Nottingham Forest', short: 'NFO' },
  { id: '133603', name: 'Sunderland', short: 'SUN' },
  { id: '133616', name: 'Tottenham Hotspur', short: 'TOT' },
  { id: '133636', name: 'West Ham United', short: 'WHU' },
  { id: '133599', name: 'Wolverhampton Wanderers', short: 'WOL' },
]

/** One slot in the album. `badge` stickers are the shiny ones. */
export interface StickerDef {
  id: string
  kind: 'badge' | 'player'
  clubId: string
  clubName: string
  /** Player name, or the club name on a badge sticker. */
  name: string
  /** Number printed on the sticker — its position in the whole collection. */
  number: number
  image?: string
  position?: string
  shirt?: string
}

export type Checklist = Map<string, StickerDef[]> // clubId → its page, in order

/** Every sticker on a club's page, once its squad is known. */
function pageFor(club: ClubDef, squad: Squad, startNumber: number): StickerDef[] {
  const badge: StickerDef = {
    id: `${club.id}-badge`,
    kind: 'badge',
    clubId: club.id,
    clubName: club.name,
    name: club.name,
    number: startNumber,
    image: squad.badge,
  }
  const players = squad.players.slice(0, PLAYERS_PER_CLUB).map((p, i) => ({
    id: `${club.id}-${p.id}`,
    kind: 'player' as const,
    clubId: club.id,
    clubName: club.name,
    name: p.name,
    number: startNumber + 1 + i,
    image: p.image,
    position: p.position,
    shirt: p.shirt,
  }))
  return [badge, ...players]
}

/** Sticker slots per club, used for numbering before a squad has loaded. */
export const SLOTS_PER_CLUB = PLAYERS_PER_CLUB + 1

export function pageStart(clubIndex: number): number {
  return clubIndex * SLOTS_PER_CLUB + 1
}

/** The whole collection's size, whether or not every squad has been fetched. */
export const TOTAL_STICKERS = PL_CLUBS.length * SLOTS_PER_CLUB

// --- squads ------------------------------------------------------------------

interface SquadPlayer {
  id: string
  name: string
  image?: string
  position?: string
  shirt?: string
}

export interface Squad {
  badge?: string
  players: SquadPlayer[]
}

/** Anyone in the staff list who isn't a footballer. */
const NOT_A_PLAYER = /manager|coach|assistant|analyst|physio|director|scout/i

/**
 * A club's squad, fetched once and then frozen: the checklist must never
 * reshuffle, or yesterday's sticker becomes today's stranger. Sorted by name so
 * the page order is stable even if the API returns players in a new order.
 */
export async function fetchSquad(club: ClubDef): Promise<Squad> {
  const cached = localStorage.getItem(SQUAD_KEY + club.id)
  if (cached) return JSON.parse(cached) as Squad

  const res = await fetch(`${API}/lookup_all_players.php?id=${club.id}`)
  if (!res.ok) throw new Error(`TheSportsDB HTTP ${res.status}`)
  const body = (await res.json()) as { player: Record<string, string | null>[] | null }
  const players = (body.player ?? [])
    .filter((p) => p.strPosition && !NOT_A_PLAYER.test(p.strPosition) && (p.strCutout || p.strThumb))
    .map((p) => ({
      id: p.idPlayer ?? '',
      name: p.strPlayer ?? '',
      image: p.strCutout || p.strThumb || undefined,
      position: p.strPosition ?? undefined,
      shirt: p.strNumber ?? undefined,
    }))
    .filter((p) => p.id && p.name)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, PLAYERS_PER_CLUB)

  const squad: Squad = { badge: await badgeFor(club.id), players }
  try {
    localStorage.setItem(SQUAD_KEY + club.id, JSON.stringify(squad))
  } catch {
    // a full quota isn't worth failing the album over
  }
  return squad
}

/** The club crest, for the shiny sticker at the top of the page. */
async function badgeFor(clubId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${API}/lookupteam.php?id=${clubId}`)
    if (!res.ok) return undefined
    const body = (await res.json()) as { teams: Record<string, string | null>[] | null }
    return body.teams?.[0]?.strBadge ?? undefined
  } catch {
    return undefined
  }
}

/** The club page, with whatever of the squad we have. */
export function buildPage(clubIndex: number, squad: Squad | undefined): StickerDef[] {
  const club = PL_CLUBS[clubIndex]
  if (!squad) return []
  return pageFor(club, squad, pageStart(clubIndex))
}

// --- owning and opening ------------------------------------------------------

export interface FcAlbumState {
  counts: Record<string, number>
  packsOpened: number
  lastFreePackDay: string | null
}

export const emptyAlbum = (): FcAlbumState => ({ counts: {}, packsOpened: 0, lastFreePackDay: null })

export const owns = (a: FcAlbumState, id: string) => (a.counts[id] ?? 0) > 0
export const spares = (a: FcAlbumState, id: string) => Math.max(0, (a.counts[id] ?? 0) - 1)
export const ownedCount = (a: FcAlbumState) => Object.values(a.counts).filter((n) => n > 0).length
export const freePackReady = (a: FcAlbumState, today: string) => a.lastFreePackDay !== today

/**
 * A pack: five stickers drawn at random from the collection, badges rarer than
 * players (they're the shiny ones). Weighted a little towards what you're
 * missing, because an album that never fills is an album nobody opens.
 */
export function rollPack(pool: StickerDef[], album: FcAlbumState, size = PACK_SIZE): string[] {
  if (!pool.length) return []
  const missing = pool.filter((s) => !owns(album, s.id))
  const out: string[] = []
  for (let i = 0; i < size; i++) {
    // 70% of a pack comes from what's still missing, while anything is missing
    const from = missing.length && Math.random() < 0.7 ? missing : pool
    const weighted = from.filter((s) => s.kind !== 'badge' || Math.random() < 0.25)
    const list = weighted.length ? weighted : from
    const pick = list[Math.floor(Math.random() * list.length)]
    out.push(pick.id)
    const at = missing.findIndex((s) => s.id === pick.id)
    if (at >= 0) missing.splice(at, 1) // no pack hands you the same new sticker twice
  }
  return out
}
