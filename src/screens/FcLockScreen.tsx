// ⚽ FC Lock (§21) — the football schedule, in Toronto time.
//
// Personal, not shared: the leagues, clubs, watchlist and news all live on the
// logged-in crewmate's own profile (`data.fcLock`), so Diogo and Ben each get
// their own schedule out of the same app.
//
// Five tabs: the games that matter to us (Games), the ones we said out loud we
// would watch (Watchlist), what the press is saying about our clubs (News), how
// many days until the big finals (Cups), and who "our clubs" are (Teams).
//
// Fixtures come from TheSportsDB (src/logic/fclock.ts), the news from OpenRouter
// (src/logic/fcNews.ts). Both are cached, so a tab switch is not a fetch.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'
import type { AlbumState, FcNewsItem, FcWatchItem, StickerTrade } from '../types'
import {
  CLUB_RANKING,
  LEAGUES,
  countdownLabel,
  daysUntil,
  hasScore,
  isFinished,
  leagueById,
  lookupMatch,
  nextForTeam,
  nextInLeague,
  pastForTeam,
  pastInLeague,
  ageFrom,
  lookupPlayer,
  searchTeams,
  sourceForLeague,
  highlightSearch,
  VIDEO_SOURCES,
  CAZE_LIVE_EMBED,
  CAZE_UPLOADS_EMBED,
  teamByName,
  torontoDay,
  torontoTime,
  upcomingTournaments,
  type FcMatch,
  type FcTeam,
  type RankedClub,
  type PlayerInfo,
} from '../logic/fclock'
import { fetchFcNews, newsFetchedToday, newsKey, newsStale } from '../logic/fcNews'
import {
  PACK_COST,
  PACK_SIZE,
  PL_CLUBS,
  SLOTS_PER_CLUB,
  TOTAL_STICKERS,
  asItem,
  buildPage,
  fcKit,
  fetchSquad,
  gemHintFc,
  offerValueFc,
  offerWorthFc,
  pageStart,
  type StickerDef,
} from '../logic/fcAlbum'
// The album's rules are the shared ones — FC Lock is the third collection
// (§15b-2), so packs, spares, the swap value and the race all come from here.
import {
  ownedIdsIn,
  ownsIn,
  rollPackIn,
  spareCountIn,
  tradeableIn,
} from '../logic/collections'
// The state helpers work on any of the three collections — same slice shape.
import { awaitsAnswer, freePackReady, packCredits, tradeGems } from '../logic/album'
import { AlbumRace, type RaceProgress } from '../components/AlbumRace'
import { Sticker, type CardFace } from '../components/Sticker'
import { StickerDetail } from '../components/StickerDetail'
import { PackOpening } from '../components/PackOpening'
import { GemStepper, TradeOffer } from '../components/TradeOffer'
import { BerryCoin } from '../components/BerryCoin'
import { dayKey } from '../logic/dates'
import { SoccerMatch } from '../components/SoccerMatch'
import {
  ROLES,
  ROLE_NAMES,
  TEAMS,
  fixturesLeft,
  newMatch,
  standings,
  teamById,
  type Match,
  type Role,
  type TeamDef,
} from '../logic/opsoccer'
import {
  SOURCE_NAME,
  SOURCE_READ,
  SOURCE_URL,
  TRANSFERS_2026,
  involves,
  type Transfer,
} from '../logic/transfers2026'

export function FcLockScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      <div className="h1">⚽ FC Lock</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Every kick-off in Toronto time. Star a game and it gets a countdown.
      </p>
      {tab === 'games' && <GamesTab />}
      {tab === 'countdown' && <CountdownTab />}
      {tab === 'news' && <NewsDesk />}
      {tab === 'watch' && <HighlightsTab />}
      {tab === 'league' && <LeagueTab />}
      {tab === 'album' && <AlbumTab />}
      {tab === 'packs' && <PacksTab />}
      {tab === 'trade' && <TradeTab />}
      {tab === 'teams' && <TeamsTab />}
    </div>
  )
}

// --- Games -------------------------------------------------------------------

/** The schedule: our leagues' next fixtures plus our clubs', merged and deduped. */
function useSchedule() {
  const { data } = useStore()
  const fcLock = data.fcLock
  const [games, setGames] = useState<FcMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const leagues = fcLock.leagues.join(',')
  const teams = fcLock.teams.map((t) => t.id).join(',')

  const load = useCallback(async () => {
    const leagueIds = leagues ? leagues.split(',') : []
    const teamIds = teams ? teams.split(',') : []
    if (!leagueIds.length && !teamIds.length) {
      setGames([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      // one request per followed thing, in parallel; a competition that answers
      // with nothing (out of season) must not take the whole schedule down
      const batches = await Promise.all([
        ...leagueIds.map((id) => nextInLeague(id).catch(() => [])),
        ...teamIds.map((id) => nextForTeam(id).catch(() => [])),
      ])
      const byId = new Map<string, FcMatch>()
      for (const m of batches.flat()) byId.set(m.id, m)
      setGames([...byId.values()].sort((a, b) => a.kickoff.localeCompare(b.kickoff)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [leagues, teams])

  useEffect(() => {
    void load()
  }, [load])

  return { games, loading, error, reload: load }
}

function GamesTab() {
  const { data } = useStore()
  const fcLock = data.fcLock
  const { games, loading, error } = useSchedule()

  const upcoming = games.filter((m) => Date.parse(m.kickoff) > Date.now() - 150 * 60 * 1000)
  const days = groupByDay(upcoming.slice(0, 40))

  if (!fcLock.leagues.length && !fcLock.teams.length) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>⚽</div>
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          Nothing followed yet. Open <b>Teams</b> and pick a league and a club — the schedule builds itself.
        </p>
      </div>
    )
  }

  return (
    <>
      <PlayedWarning />
      {loading && <div className="card">Loading the fixtures…</div>}
      {error && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>
          Couldn’t reach the fixture list: {error}
        </div>
      )}
      {!loading && !error && !days.length && (
        <div className="card">No fixtures scheduled yet for what you follow. Try again closer to the season.</div>
      )}
      {days.map(([day, list]) => (
        <div key={day} style={{ marginBottom: 14 }}>
          <div className="h2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>{day}</span>
            <span className="muted" style={{ fontSize: 12 }}>{countdownLabel(list[0].kickoff)}</span>
          </div>
          {list.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      ))}
    </>
  )
}

/**
 * The warning the home page owes us: a game we said we'd watch has already been
 * played. It carries the score, and tapping it puts the warning to bed.
 */
function PlayedWarning() {
  const { data, setFcResult, markFcResultsSeen } = useStore()
  const fcLock = data.fcLock
  const played = fcLock.watch.filter((w) => !w.seenResult && isFinished(toMatch(w)))

  // fill in scores we don't have yet, one lookup per game, once
  useEffect(() => {
    for (const w of played) {
      if (typeof w.homeScore === 'number') continue
      void lookupMatch(w.id)
        .then((m) => {
          if (m && hasScore(m)) setFcResult(w.id, m.homeScore as number, m.awayScore as number)
        })
        .catch(() => {})
    }
    // one pass per set of unseen games — the ids are the dependency that matters
  }, [played.map((w) => w.id).join(','), setFcResult])

  if (!played.length) return null

  return (
    <div className="card" style={{ borderColor: 'var(--red)', marginBottom: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>
        ⚠️ {played.length === 1 ? 'A game on your watchlist was played' : `${played.length} watchlist games were played`}
      </div>
      {played.map((w) => (
        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>
              {w.home} {typeof w.homeScore === 'number' ? `${w.homeScore} – ${w.awayScore}` : 'vs'} {w.away}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {w.leagueName} · {countdownLabel(w.kickoff)}
              {typeof w.homeScore !== 'number' && ' · score not published yet'}
            </div>
          </div>
        </div>
      ))}
      <button
        className="btn btn--small btn--ghost"
        style={{ marginTop: 6 }}
        onClick={() => {
          sfx.click()
          markFcResultsSeen(played.map((w) => w.id))
        }}
      >
        Got it
      </button>
    </div>
  )
}

function MatchRow({ match }: { match: FcMatch }) {
  const { data, toggleFcWatch } = useStore()
  const fcLock = data.fcLock
  const watched = fcLock.watch.some((w) => w.id === match.id)
  const league = leagueById(match.leagueId)

  return (
    <div className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 52, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontWeight: 900 }}>{torontoTime(match.kickoff)}</div>
        <div className="muted" style={{ fontSize: 10 }}>ET</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge src={match.homeBadge} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.home}</span>
          <span className="muted">v</span>
          <Badge src={match.awayBadge} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.away}</span>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          {match.leagueName}
          {league?.caze && ' · 📺 CazéTV'}
        </div>
      </div>
      <button
        className="btn btn--ghost btn--small"
        style={{ flexShrink: 0 }}
        aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
        onClick={() => {
          sfx.click()
          toggleFcWatch({
            id: match.id,
            leagueId: match.leagueId,
            leagueName: match.leagueName,
            home: match.home,
            away: match.away,
            homeBadge: match.homeBadge,
            awayBadge: match.awayBadge,
            kickoff: match.kickoff,
          })
        }}
      >
        {watched ? '⭐' : '☆'}
      </button>
    </div>
  )
}

function Badge({ src }: { src?: string }) {
  if (!src) return null
  return <img src={`${src}/tiny`} alt="" width={18} height={18} style={{ flexShrink: 0, objectFit: 'contain' }} />
}

function groupByDay(games: FcMatch[]): [string, FcMatch[]][] {
  const out = new Map<string, FcMatch[]>()
  for (const m of games) {
    const day = torontoDay(m.kickoff)
    out.set(day, [...(out.get(day) ?? []), m])
  }
  return [...out.entries()]
}

// --- Watchlist ---------------------------------------------------------------

function toMatch(w: FcWatchItem): FcMatch {
  return { ...w }
}

function CountdownTab() {
  return (
    <>
      <WatchList />
      <CupsList />
    </>
  )
}

function WatchList() {
  const { data, toggleFcWatch, setFcResult } = useStore()
  const fcLock = data.fcLock
  const list = [...fcLock.watch].sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  const ahead = list.filter((w) => !isFinished(toMatch(w)))
  const done = list.filter((w) => isFinished(toMatch(w))).reverse()

  // played games catch up with their own score, once each
  useEffect(() => {
    for (const w of done) {
      if (typeof w.homeScore === 'number') continue
      void lookupMatch(w.id)
        .then((m) => {
          if (m && hasScore(m)) setFcResult(w.id, m.homeScore as number, m.awayScore as number)
        })
        .catch(() => {})
    }
  }, [done.map((w) => w.id).join(','), setFcResult])

  if (!list.length) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>⭐</div>
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          Nothing starred yet. Tap ☆ on any game in <b>Games</b> and it lands here with a countdown.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="h2">⭐ Coming up — {ahead.length}</div>
      {ahead.map((w) => (
        <WatchRow key={w.id} item={w} onDrop={() => toggleFcWatch(w)} />
      ))}
      {!ahead.length && <div className="card">Nothing ahead. Star the next one.</div>}
      {done.length > 0 && (
        <>
          <div className="h2" style={{ marginTop: 16 }}>✅ Played — {done.length}</div>
          {done.map((w) => (
            <WatchRow key={w.id} item={w} onDrop={() => toggleFcWatch(w)} />
          ))}
        </>
      )}
    </>
  )
}

function WatchRow({ item, onDrop }: { item: FcWatchItem; onDrop: () => void }) {
  const played = isFinished(toMatch(item))
  const days = daysUntil(item.kickoff)
  return (
    <div className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 62, textAlign: 'center', flexShrink: 0 }}>
        {played ? (
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            {typeof item.homeScore === 'number' ? `${item.homeScore}–${item.awayScore}` : '—'}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{days}</div>
            <div className="muted" style={{ fontSize: 10 }}>{days === 1 ? 'DAY' : 'DAYS'}</div>
          </>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>
          {item.home} v {item.away}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          {item.leagueName} · {torontoDay(item.kickoff)}, {torontoTime(item.kickoff)} ET
        </div>
      </div>
      <button
        className="btn btn--ghost btn--small"
        style={{ flexShrink: 0, color: 'var(--red)' }}
        aria-label="Remove from watchlist"
        onClick={() => {
          sfx.click()
          onDrop()
        }}
      >
        ✕
      </button>
    </div>
  )
}

// --- News --------------------------------------------------------------------

/** The press, in two halves: today's stories and the summer's business. */
function NewsDesk() {
  const [half, setHalf] = useState<'news' | 'market'>('news')
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['news', 'market'] as const).map((h) => (
          <button
            key={h}
            className={`btn btn--small ${half === h ? 'btn--blue' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => {
              sfx.click()
              setHalf(h)
            }}
          >
            {h === 'news' ? '📰 Stories' : '💸 Transfers'}
          </button>
        ))}
      </div>
      {half === 'news' ? <NewsTab /> : <TransfersTab />}
    </>
  )
}


function NewsTab() {
  const { data, aiConfig, setFcNews } = useStore()
  const fcLock = data.fcLock
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const teams = useMemo(() => fcLock.teams.map((t) => t.name), [fcLock.teams])
  const key = newsKey(teams)
  const stale = newsStale(fcLock.news?.fetchedAt, key, fcLock.news?.forKey)
  // one search a day, hard (§21d). The button is the only way to spend the key
  // here, so the cap lives on the button rather than on the cache.
  const usedToday = newsFetchedToday(fcLock.news?.fetchedAt)

  const refresh = useCallback(async () => {
    // belt and braces: the disabled button is the visible cap, this is the one
    // that survives someone later wiring up an auto-fetch on tab open
    if (newsFetchedToday(fcLock.news?.fetchedAt)) return
    setLoading(true)
    setError(null)
    try {
      const items = await fetchFcNews(aiConfig, teams)
      setFcNews({ items, fetchedAt: new Date().toISOString(), forKey: key })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [aiConfig, teams, key, setFcNews, fcLock.news?.fetchedAt])

  if (!teams.length) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>📰</div>
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          The news follows your clubs. Pick one in <b>Teams</b> first.
        </p>
      </div>
    )
  }

  const items = fcLock.news?.items ?? []
  const transfers = items.filter((i) => i.kind === 'transfer')
  const rest = items.filter((i) => i.kind !== 'transfer')

  return (
    <>
      <div className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{teams.join(' · ')}</div>
          <div className="muted" style={{ fontSize: 11 }}>
            {fcLock.news?.fetchedAt
              ? `Read ${torontoDay(fcLock.news.fetchedAt)}, ${torontoTime(fcLock.news.fetchedAt)} ET${
                  usedToday ? ' · next one tomorrow' : stale ? ' · out of date' : ''
                }`
              : 'Never fetched · one search a day'}
          </div>
        </div>
        <button
          className="btn btn--blue btn--small"
          disabled={loading || usedToday}
          onClick={() => { sfx.click(); void refresh() }}
        >
          {loading ? 'Reading…' : usedToday ? '✅ Read today' : '🔄 Get news'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>{error}</div>
      )}
      {!items.length && !loading && !error && (
        <div className="card">No news yet — tap <b>Get news</b> and the desk goes and reads the press.</div>
      )}

      {transfers.length > 0 && <div className="h2">🔁 Transfers</div>}
      {transfers.map((n) => <NewsCard key={n.id} item={n} />)}
      {rest.length > 0 && <div className="h2" style={{ marginTop: 14 }}>📰 Club news</div>}
      {rest.map((n) => <NewsCard key={n.id} item={n} />)}
    </>
  )
}

function NewsCard({ item }: { item: FcNewsItem }) {
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 700 }}>{item.title}</div>
      {item.summary && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{item.summary}</p>}
      <div className="muted" style={{ fontSize: 11, marginTop: 6, fontWeight: 800, letterSpacing: 0.4 }}>
        {[item.team, item.source, item.date].filter(Boolean).join(' · ').toUpperCase()}
      </div>
      {item.url && (
        <a className="btn btn--ghost btn--small" style={{ marginTop: 8 }} href={item.url} target="_blank" rel="noreferrer">
          Read it ↗
        </a>
      )}
    </div>
  )
}

// --- Transfers ---------------------------------------------------------------

/**
 * The 2026 summer window, as ESPN graded it (§21f). A hand-copied dataset, not
 * a feed: every move here actually happened, with the fee ESPN reported and the
 * grade they gave each club. Your clubs' business floats to the top.
 */
function TransfersTab() {
  const { data } = useStore()
  const clubs = data.fcLock.teams.map((t) => t.name)
  const [showAll, setShowAll] = useState(false)
  /** The row that was tapped — its player's card is open over the list. */
  const [open, setOpen] = useState<Transfer | null>(null)

  const ours = useMemo(() => (clubs.length ? TRANSFERS_2026.filter((t) => involves(t, clubs)) : []), [clubs.join('|')])
  const rest = useMemo(() => {
    const mine = new Set(ours.map((t) => t.id))
    return TRANSFERS_2026.filter((t) => !mine.has(t.id))
  }, [ours])
  const shown = showAll ? rest : rest.slice(0, 12)

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>💸 Summer 2026 — {TRANSFERS_2026.length} moves</div>
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          Only the big clubs. Fees and grades as {SOURCE_NAME} reported them, read {SOURCE_READ}.
        </div>
        <a className="btn btn--ghost btn--small" style={{ marginTop: 8 }} href={SOURCE_URL} target="_blank" rel="noreferrer">
          {SOURCE_NAME}’s window grades ↗
        </a>
      </div>

      {ours.length > 0 && (
        <>
          <div className="h2">⭐ Your clubs — {ours.length}</div>
          {ours.map((t) => <TransferRow key={t.id} item={t} onOpen={() => setOpen(t)} />)}
        </>
      )}

      <div className="h2" style={{ marginTop: ours.length ? 16 : 0 }}>
        {ours.length ? '🌍 Everyone else' : '🌍 The window'}
      </div>
      {shown.map((t) => <TransferRow key={t.id} item={t} onOpen={() => setOpen(t)} />)}
      {rest.length > shown.length && (
        <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setShowAll(true) }}>
          Show all {rest.length}
        </button>
      )}

      {open && <PlayerSheet name={open.player} move={open} onClose={() => setOpen(null)} />}
    </>
  )
}

const TRANSFER_ICON: Record<Transfer['kind'], string> = { permanent: '💸', loan: '🔁', free: '🆓' }

/** Look a player up once per mount; `null` while it's in flight or unknown. */
function usePlayer(name: string): PlayerInfo | null {
  const [info, setInfo] = useState<PlayerInfo | null>(null)
  useEffect(() => {
    let alive = true
    void lookupPlayer(name).then((p) => {
      if (alive) setInfo(p)
    })
    return () => {
      alive = false
    }
  }, [name])
  return info
}

/** The player's face. The shirt stands in for anyone the database misses. */
function PlayerFace({ name, size = 64, src }: { name: string; size?: number; src?: string }) {
  const info = usePlayer(name)
  const photo = src ?? info?.cutout ?? info?.thumb ?? ''
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.08)',
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.42,
      }}
    >
      {photo ? (
        <img src={photo} alt="" width={size} height={size} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
      ) : (
        '👕'
      )}
    </div>
  )
}

/**
 * Everything about the player behind a transfer: the big picture, age, position,
 * shirt number, where they're from, and the write-up. Tap the backdrop, the ✕ or
 * press Escape to close.
 */
function PlayerSheet({
  name,
  move,
  sticker,
  onClose,
}: {
  name: string
  /** Present when the sheet was opened from the transfer list. */
  move?: Transfer
  /** Present when it was opened from the album. */
  sticker?: {
    clubName: string
    number: number
    shirt?: string
    position?: string
    spares: number
    /** The swap signal: what the other crewmate's album says about this one. */
    mateName: string
    mateSpare: number
    mateNeeds: boolean
  }
  onClose: () => void
}) {
  const info = usePlayer(name)
  const age = ageFrom(info?.born)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const facts: [string, string][] = [
    ...(age !== null ? ([['Age', `${age}`]] as [string, string][]) : []),
    ...(info?.position ? ([['Position', info.position]] as [string, string][]) : []),
    ...(info?.number ? ([['Shirt', `#${info.number}`]] as [string, string][]) : []),
    ...(info?.nationality ? ([['Nationality', info.nationality]] as [string, string][]) : []),
    ...(info?.height ? ([['Height', info.height]] as [string, string][]) : []),
    ...(info?.weight ? ([['Weight', info.weight]] as [string, string][]) : []),
    ...(info?.foot ? ([['Foot', info.foot]] as [string, string][]) : []),
    ...(info?.born ? ([['Born', new Date(`${info.born}T12:00:00Z`).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })]] as [string, string][]) : []),
  ]

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn--ghost btn--small" aria-label="Close" onClick={() => { sfx.click(); onClose() }}>
            ✕
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <PlayerFace name={name} size={190} />
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>{info?.name || name}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {[info?.position ?? sticker?.position, info?.nationality].filter(Boolean).join(' · ') || 'Looking them up…'}
          </div>
        </div>

        {sticker && (
          <div className="card" style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700 }}>
              📕 Sticker #{sticker.number} · {sticker.clubName}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4, fontWeight: 800, letterSpacing: 0.4 }}>
              {[sticker.shirt ? `SHIRT #${sticker.shirt}` : null, sticker.spares > 0 ? `${sticker.spares} SPARE${sticker.spares > 1 ? 'S' : ''}` : 'NO SPARES']
                .filter(Boolean)
                .join(' · ')}
            </div>
            {/* the whole point of a second album: who has it and who wants it */}
            {sticker.mateSpare > 0 && sticker.spares === 0 && (
              <div style={{ fontSize: 12, marginTop: 6 }}>
                🤝 <b>{sticker.mateName} has a spare</b> — ask for it on the Trade tab.
              </div>
            )}
            {sticker.mateNeeds && sticker.spares > 0 && (
              <div style={{ fontSize: 12, marginTop: 6 }}>
                🎯 <b>{sticker.mateName} is missing this one</b> — your double is worth something.
              </div>
            )}
          </div>
        )}

        {move && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <span>{TRANSFER_ICON[move.kind]}</span>
            <span>{move.from}</span>
            <span className="muted">→</span>
            <b>{move.to}</b>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6, fontWeight: 800, letterSpacing: 0.4 }}>
            {[move.fee, `OUT ${move.gradeFrom}`, `IN ${move.gradeTo}`, move.date].join(' · ').toUpperCase()}
          </div>
        </div>
        )}

        {facts.length > 0 && (
          <div className="card" style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {facts.map(([label, value]) => (
              <div key={label}>
                <div className="muted" style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
                <div style={{ fontWeight: 700 }}>{value}</div>
              </div>
            ))}
            {info?.birthPlace && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="muted" style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>BORN IN</div>
                <div style={{ fontWeight: 700 }}>{info.birthPlace}</div>
              </div>
            )}
            {info?.team && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="muted" style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>ON THE BOOKS AT</div>
                <div style={{ fontWeight: 700 }}>{info.team}</div>
              </div>
            )}
          </div>
        )}

        {info?.description && (
          <div className="card" style={{ marginTop: 10 }}>
            <p style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{info.description.slice(0, 1200)}</p>
          </div>
        )}

        {info === null && (
          <p className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>
            No profile found for this player yet — the move above is still the real one.
          </p>
        )}
      </div>
    </div>
  )
}

/** ESPN's letter grade, coloured: A green, B neutral, C/D red. */
function Grade({ club, grade }: { club: string; grade: string }) {
  const color = grade.startsWith('A') ? 'var(--green, #35c46b)' : grade.startsWith('B') ? 'inherit' : 'var(--red)'
  return (
    <span className="muted" style={{ fontSize: 11 }}>
      {club} <b style={{ color }}>{grade}</b>
    </span>
  )
}

function TransferRow({ item, onOpen }: { item: Transfer; onOpen: () => void }) {
  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      onClick={() => {
        sfx.click()
        onOpen()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <PlayerFace name={item.player} size={64} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{TRANSFER_ICON[item.kind]}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.player}</span>
        </div>
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {item.from} <span className="muted">→</span> <b>{item.to}</b>
        </div>
        <div style={{ marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <b style={{ fontSize: 12 }}>{item.fee}</b>
          <Grade club="out" grade={item.gradeFrom} />
          <Grade club="in" grade={item.gradeTo} />
          <span className="muted" style={{ fontSize: 11 }}>
            {new Date(`${item.date}T12:00:00Z`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
      <div className="muted" style={{ flexShrink: 0, fontSize: 18 }}>›</div>
    </div>
  )
}

// --- Cups --------------------------------------------------------------------

function CupsList() {
  const cups = upcomingTournaments()
  return (
    <>
      <div className="h2" style={{ marginTop: 16 }}>🏆 The big ones</div>
      {cups.map((t) => (
        <Countdown key={t.id} emoji={t.emoji} name={t.name} what={t.what} days={daysUntil(`${t.date}T12:00:00Z`)} approx={t.approx} />
      ))}
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        ≈ means the date isn’t fixed yet — the window is known, the day isn’t.
      </p>
    </>
  )
}

function Countdown({ emoji, name, what, days, approx }: { emoji: string; name: string; what: string; days: number; approx?: boolean }) {
  return (
    <div className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 26, flexShrink: 0 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{name}</div>
        <div className="muted" style={{ fontSize: 11 }}>{what}</div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 62 }}>
        <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{approx ? '≈' : ''}{days}</div>
        <div className="muted" style={{ fontSize: 10 }}>{days === 1 ? 'DAY' : 'DAYS'}</div>
      </div>
    </div>
  )
}

// --- Highlights --------------------------------------------------------------

/**
 * CazéTV, playing here rather than somewhere else. Two embeds, no API key and
 * no server between us and them: **Live** is the channel's current broadcast,
 * **Latest** is their uploads playlist, newest first. When they're off air the
 * live player says so itself — that's YouTube's own message, not a guess of
 * ours — and the channel is always one tap away underneath.
 */
function CazeTv() {
  const [show, setShow] = useState<'live' | 'latest'>('live')
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>📺 CazéTV</div>
          <div className="muted" style={{ fontSize: 11 }}>
            {show === 'live' ? 'Whatever they’re broadcasting right now' : 'Their latest videos, newest first'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        {(['live', 'latest'] as const).map((k) => (
          <button
            key={k}
            className={`btn btn--small ${show === k ? 'btn--blue' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => {
              sfx.click()
              setShow(k)
            }}
          >
            {k === 'live' ? '🔴 Live' : '🎬 Latest'}
          </button>
        ))}
      </div>

      <div className="fc-video">
        <iframe
          key={show}
          src={show === 'live' ? CAZE_LIVE_EMBED : CAZE_UPLOADS_EMBED}
          title={show === 'live' ? 'CazéTV live' : 'CazéTV latest videos'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>

      <a
        className="btn btn--ghost btn--small"
        style={{ marginTop: 10 }}
        href="https://www.youtube.com/@CazeTV/streams"
        target="_blank"
        rel="noreferrer"
      >
        Open the channel ↗
      </a>
    </div>
  )
}

/** The finished games from what we follow, newest first. */
function useResults() {
  const { data } = useStore()
  const fcLock = data.fcLock
  const [games, setGames] = useState<FcMatch[]>([])
  const [loading, setLoading] = useState(false)
  const leagues = fcLock.leagues.join(',')
  const teams = fcLock.teams.map((t) => t.id).join(',')

  useEffect(() => {
    const leagueIds = leagues ? leagues.split(',') : []
    const teamIds = teams ? teams.split(',') : []
    if (!leagueIds.length && !teamIds.length) {
      setGames([])
      return
    }
    let alive = true
    setLoading(true)
    void Promise.all([
      ...leagueIds.map((id) => pastInLeague(id).catch(() => [])),
      ...teamIds.map((id) => pastForTeam(id).catch(() => [])),
    ])
      .then((batches) => {
        if (!alive) return
        const byId = new Map<string, FcMatch>()
        for (const m of batches.flat()) byId.set(m.id, m)
        setGames([...byId.values()].sort((a, b) => b.kickoff.localeCompare(a.kickoff)))
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [leagues, teams])

  return { games, loading }
}

/**
 * Where to watch it back (§21i). None of the highlight sites publish a feed a
 * browser may read — no CORS, no free API — so this tab doesn't pretend to embed
 * them. It takes you to the page, and for one particular game it builds the
 * search that lands on that game's highlights.
 */
function HighlightsTab() {
  const { games, loading } = useResults()
  const recent = games.slice(0, 20)

  return (
    <>
      <CazeTv />

      <div className="h2">🎬 Watch it back</div>
      {loading && <div className="card">Looking up the results…</div>}
      {!loading && !recent.length && (
        <div className="card">
          Follow a league or a club in <b>Teams</b> and the games you missed show up here.
        </div>
      )}
      {recent.map((m) => {
        const site = sourceForLeague(m.leagueId)
        return (
          <div key={m.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>
                  {m.home} {hasScore(m) ? `${m.homeScore} – ${m.awayScore}` : 'v'} {m.away}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  {m.leagueName} · {torontoDay(m.kickoff)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <a className="btn btn--small btn--blue" href={highlightSearch(m)} target="_blank" rel="noreferrer">
                ▶️ Highlights
              </a>
              {site && (
                <a className="btn btn--small btn--ghost" href={site.url} target="_blank" rel="noreferrer">
                  {site.emoji} {site.name} ↗
                </a>
              )}
            </div>
          </div>
        )
      })}

      <div className="h2" style={{ marginTop: 16 }}>🏟️ The video desks</div>
      {VIDEO_SOURCES.map((v) => (
        <a
          key={v.id}
          className="card"
          href={v.url}
          target="_blank"
          rel="noreferrer"
          style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
        >
          <div style={{ fontSize: 26 }}>{v.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{v.name}</div>
            <div className="muted" style={{ fontSize: 11 }}>{v.what}</div>
          </div>
          <div className="muted">↗</div>
        </a>
      ))}
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        These sites don't let an app read their video lists, so FC Lock links straight to them instead of guessing what's on.
      </p>
    </>
  )
}

// --- One Piece Soccer League -------------------------------------------------

/**
 * The league (§21j): pick a club and the position you play, then work through
 * the other twelve. The match itself lives in <SoccerMatch>; this is the desk
 * around it — the picker, the fixtures and the table.
 */
function LeagueTab() {
  const { data, setFcSquad, addFcResult, resetFcSeason } = useStore()
  const saved = data.fcLock.soccer
  const [live, setLive] = useState<Match | null>(null)
  const [opponent, setOpponent] = useState<TeamDef | null>(null)
  const [twoPlayer, setTwoPlayer] = useState(false)
  const [theirRole, setTheirRole] = useState<Role>('CF')

  const myTeam = saved ? teamById(saved.teamId) : undefined
  const myRole = (saved?.role as Role) ?? 'CF'
  const results = saved?.results ?? []

  if (live && myTeam) {
    return (
      <SoccerMatch
        match={live}
        onQuit={() => setLive(null)}
        onDone={(score) => {
          if (opponent) addFcResult(opponent.id, score[0], score[1])
          setLive(null)
        }}
      />
    )
  }

  if (!saved || !myTeam) return <SquadPicker onPick={setFcSquad} />

  const left = fixturesLeft(myTeam.id, results)
  const table = standings(myTeam.id, results)

  function kickOff(opp: TeamDef) {
    if (!myTeam) return
    sfx.click()
    setOpponent(opp)
    setLive(newMatch({ home: myTeam, away: opp, myRole, theirRole: twoPlayer ? theirRole : null }))
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 30 }}>{myTeam.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>{myTeam.name}</div>
            <div className="muted" style={{ fontSize: 11 }}>
              You play {ROLE_NAMES[myRole]} · {results.length}/12 played
            </div>
          </div>
          <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setFcSquad('', '') }}>
            Change
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
          <input type="checkbox" checked={twoPlayer} onChange={(e) => setTwoPlayer(e.target.checked)} />
          👥 Two players, one phone
        </label>
        {twoPlayer && (
          <>
            <p className="muted" style={{ fontSize: 12, margin: '6px 0' }}>
              Player 2 takes a player on the other team. Hold the phone flat between you — one set of controls each.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ROLES.map((r) => (
                <button
                  key={r}
                  className={`btn btn--small ${theirRole === r ? 'btn--blue' : 'btn--ghost'}`}
                  onClick={() => { sfx.click(); setTheirRole(r) }}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="h2">🗓️ Fixtures — {left.length} left</div>
      {!left.length && (
        <div className="card" style={{ marginBottom: 10 }}>
          Season done. <button className="btn btn--small btn--blue" style={{ marginLeft: 8 }} onClick={() => { sfx.click(); resetFcSeason() }}>Start a new one</button>
        </div>
      )}
      {left.map((t) => (
        <button key={t.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, width: '100%' }} onClick={() => kickOff(t)}>
          <span style={{ fontSize: 24 }}>{t.emoji}</span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 700 }}>{t.name}</span>
            <span className="muted" style={{ display: 'block', fontSize: 11 }}>
              {t.strength >= 1.1 ? 'Tough' : t.strength >= 1 ? 'Even' : 'Beatable'}
            </span>
          </span>
          <span className="btn btn--small btn--blue">Kick off</span>
        </button>
      ))}

      {results.length > 0 && (
        <>
          <div className="h2" style={{ marginTop: 16 }}>✅ Your results</div>
          {[...results].reverse().map((r) => {
            const opp = teamById(r.opp)
            return (
              <div key={r.opp} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <b style={{ width: 54, textAlign: 'center' }}>{r.gf} – {r.ga}</b>
                <span style={{ flex: 1, minWidth: 0 }}>
                  vs {opp?.emoji} {opp?.name}
                </span>
                <span className="muted" style={{ fontSize: 11 }}>
                  {r.gf > r.ga ? 'W' : r.gf === r.ga ? 'D' : 'L'}
                </span>
              </div>
            )
          })}
        </>
      )}

      <div className="h2" style={{ marginTop: 16 }}>🏆 One Piece Soccer League</div>
      <div className="card" style={{ padding: 8, overflowX: 'auto' }}>
        <table className="ops-table">
          <thead>
            <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <tr key={r.team.id} className={r.team.id === myTeam.id ? 'is-me' : ''}>
                <td>{i + 1}</td>
                <td>{r.team.emoji} {r.team.name}</td>
                <td>{r.played}</td>
                <td>{r.won}</td>
                <td>{r.drawn}</td>
                <td>{r.lost}</td>
                <td>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                <td><b>{r.points}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/** Club first, then the shirt you wear. */
function SquadPicker({ onPick }: { onPick: (teamId: string, role: string) => void }) {
  const [team, setTeam] = useState<TeamDef | null>(null)
  const [role, setRole] = useState<Role>('CF')

  return (
    <>
      <div className="h2">🏟️ Pick your club</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Thirteen teams, six on the pitch and two on the bench. You play one of them; the rest are bots.
      </p>
      <div className="card" style={{ marginBottom: 12, padding: 8 }}>
        {TEAMS.map((t) => (
          <button
            key={t.id}
            className="btn btn--ghost btn--small"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10, opacity: team?.id === t.id ? 1 : 0.65 }}
            onClick={() => { sfx.click(); setTeam(t) }}
          >
            <span style={{ fontSize: 18 }}>{t.emoji}</span>
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>{t.name}</span>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <i style={{ width: 12, height: 12, borderRadius: 3, background: t.colors[0] }} />
              <i style={{ width: 12, height: 12, borderRadius: 3, background: t.colors[1] }} />
            </span>
            <span>{team?.id === t.id ? '✅' : ''}</span>
          </button>
        ))}
      </div>

      <div className="h2">👕 Pick your position</div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ROLES.map((r) => (
            <button
              key={r}
              className={`btn btn--small ${role === r ? 'btn--blue' : 'btn--ghost'}`}
              onClick={() => { sfx.click(); setRole(r) }}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{ROLE_NAMES[role]} — the other five roles are filled by your bots.</p>
      </div>

      <button className="btn btn--blue" style={{ width: '100%' }} disabled={!team} onClick={() => { sfx.gem(); if (team) onPick(team.id, role) }}>
        Sign for {team ? team.name : 'a club'}
      </button>
    </>
  )
}

// --- Album, packs and swaps --------------------------------------------------
//
// FC Lock's Premier League album is the THIRD collection (§21g), and it plays
// the identical game the sticker album (§15b) and the One Piece Album (§15b-2)
// play: forced duplicates in every pack, a daily free pack, a sealed pack you
// can win in a swap, the 1-shiny-is-worth-2-commons trade, the haggle, the
// pack ceremony and the head-to-head race. **None of that is written here** —
// it comes out of logic/collections.ts through the kit in logic/fcAlbum.ts and
// the shared components. What IS here is the album's own presentation: a page
// per club that turns under the finger.

/**
 * The checklist, built once and kept: every club's page, in album order. Squads
 * are fetched one club at a time (the free API is rate-limited) and frozen in
 * localStorage, so a sticker never turns into a different player.
 *
 * It also hands back the collection kit built over whatever has loaded, plus
 * the two lookups every screen below needs: id → sticker, club → crest.
 */
function useChecklist() {
  const [pages, setPages] = useState<StickerDef[][]>(() => PL_CLUBS.map(() => []))
  const [ready, setReady] = useState(0)

  useEffect(() => {
    let alive = true
    void (async () => {
      for (const [i, club] of PL_CLUBS.entries()) {
        try {
          const squad = await fetchSquad(club)
          if (!alive) return
          setPages((prev) => {
            const next = [...prev]
            next[i] = buildPage(i, squad)
            return next
          })
        } catch {
          // a club that won't load leaves an empty page rather than an empty album
        }
        if (!alive) return
        setReady(i + 1)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const all = useMemo(() => pages.flat(), [pages])
  const kit = useMemo(() => fcKit(all), [all])
  const byId = useMemo(() => new Map(all.map((s) => [s.id, s])), [all])
  /** clubId → crest, taken off each club's badge sticker. */
  const crests = useMemo(
    () => new Map(all.filter((s) => s.kind === 'badge').map((s) => [s.clubId, s.image])),
    [all],
  )
  return { pages, all, ready, kit, byId, crests }
}

/** One drawn id as a card face, for the shared ceremony and the swap table. */
const faceOf = (byId: Map<string, StickerDef>, id: string): CardFace | undefined => {
  const s = byId.get(id)
  return s ? asItem(s) : undefined
}

/** The line printed under a sticker in the end-of-pack stack. */
const stickerNote = (byId: Map<string, StickerDef>, id: string): string => {
  const s = byId.get(id)
  if (!s) return ''
  return [s.clubName, `Sticker #${s.number}`, s.shirt ? `Shirt #${s.shirt}` : null, s.position]
    .filter(Boolean)
    .join(' · ')
}

/** The race is always run to the FULL album, not to however much has loaded. */
const fcProgress = (a: AlbumState): RaceProgress => {
  const owned = ownedIdsIn(a).length
  return { owned, total: TOTAL_STICKERS, pct: Math.round((owned / TOTAL_STICKERS) * 100) }
}

/** The other crewmate's album — the one you're racing and trading with. */
function useMate() {
  const mateData = useStore((s) => s.mateData)
  const profiles = useStore((s) => s.profiles)
  const activeProfileId = useStore((s) => s.activeProfileId)
  const mate = profiles.find((p) => p.id !== activeProfileId)
  return { theirs: mateData?.fcAlbum ?? null, mateName: mate?.name ?? 'your crewmate', mateData }
}

/** The album: one club per page, swiped left and right like the real thing. */
function AlbumTab() {
  const { data } = useStore()
  const album = data.fcAlbum
  const { theirs, mateName } = useMate()
  const { pages, all, ready } = useChecklist()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<StickerDef | null>(null)
  const [missingOnly, setMissingOnly] = useState(false)
  /** `clubs` walks the album page by page; `spares` is the trade fodder pile. */
  const [view, setView] = useState<'clubs' | 'spares'>('clubs')
  const drag = useRef<{ x: number; dx: number } | null>(null)
  const [dx, setDx] = useState(0)

  const club = PL_CLUBS[page]
  const list = pages[page] ?? []
  const have = list.filter((st) => ownsIn(album, st.id)).length
  const shown = missingOnly ? list.filter((st) => !ownsIn(album, st.id)) : list
  const spareList = useMemo(
    () => all.filter((st) => spareCountIn(album, st.id) > 0),
    [all, album],
  )

  function go(delta: number) {
    setPage((p) => Math.min(PL_CLUBS.length - 1, Math.max(0, p + delta)))
    setDx(0)
  }

  return (
    <>
      {/* the same head-to-head race both other collections run (§15b): the
          question a collector actually asks is not "how far am I?" but "am I
          ahead?" */}
      <AlbumRace
        mine={fcProgress(album)}
        theirs={theirs ? fcProgress(theirs) : null}
        noun="sticker"
        scope="fcalbum"
      />

      <div className="card" style={{ margin: '14px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 900 }}>📕 Premier League 2026</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {ownedIdsIn(album).length} / {TOTAL_STICKERS}
          </div>
        </div>
        <div className="quiz-bar" style={{ marginTop: 8 }}>
          <div className="quiz-bar-fill" style={{ width: `${(ownedIdsIn(album).length / TOTAL_STICKERS) * 100}%` }} />
        </div>
        {ready < PL_CLUBS.length && (
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
            Printing the checklist… {ready}/{PL_CLUBS.length} clubs
          </div>
        )}
      </div>

      <div className="board-tools">
        <button
          className={`chip${view === 'clubs' ? ' chip--on' : ''}`}
          onClick={() => { sfx.click(); setView('clubs') }}
        >
          📕 By club
        </button>
        <button
          className={`chip${view === 'spares' ? ' chip--on' : ''}`}
          onClick={() => { sfx.click(); setView('spares') }}
        >
          🔁 My spares ({spareList.length})
        </button>
        {view === 'clubs' && (
          <button
            className={`chip${missingOnly ? ' chip--on' : ''}`}
            onClick={() => { sfx.click(); setMissingOnly(!missingOnly) }}
          >
            {missingOnly ? '👀 Missing only' : 'Show all'}
          </button>
        )}
      </div>

      {view === 'spares' ? (
        <div style={{ marginTop: 10 }}>
          {spareList.length === 0 ? (
            <p className="muted">
              No doubles yet — every pack is built to hand you a few, so open another one. 🎁
            </p>
          ) : (
            <div className="fc-grid">
              {spareList.map((st) => (
                <StickerSlot
                  key={st.id}
                  sticker={st}
                  owned
                  spares={spareCountIn(album, st.id)}
                  badge={theirs && !ownsIn(theirs, st.id) ? '🎯' : undefined}
                  onOpen={() => setOpen(st)}
                />
              ))}
            </div>
          )}
          {spareList.length > 0 && (
            <p className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>
              🎯 = {mateName} is missing it — worth putting on the swap table.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* the page itself — drag it sideways and it turns */}
          <div
            className="fc-page"
            style={{ transform: `translateX(${dx}px)` }}
            onTouchStart={(e) => {
              drag.current = { x: e.touches[0].clientX, dx: 0 }
            }}
            onTouchMove={(e) => {
              if (!drag.current) return
              drag.current.dx = e.touches[0].clientX - drag.current.x
              setDx(drag.current.dx * 0.5)
            }}
            onTouchEnd={() => {
              const moved = drag.current?.dx ?? 0
              drag.current = null
              if (Math.abs(moved) > 60) {
                sfx.click()
                go(moved < 0 ? 1 : -1)
              } else setDx(0)
            }}
          >
            <div className="h2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>{club.name}</span>
              <span className={`album-crew-count ${list.length > 0 && have === list.length ? 'is-done' : ''}`}>
                {list.length > 0 && have === list.length ? '★ COMPLETE' : `${have}/${list.length || SLOTS_PER_CLUB}`}
              </span>
            </div>

            <div className="fc-grid">
              {/* before the squad lands the page is still printed, as numbered gaps */}
              {(list.length ? shown : Array.from<StickerDef | undefined>({ length: SLOTS_PER_CLUB })).map(
                (st, i) =>
                  st ? (
                    <StickerSlot
                      key={st.id}
                      sticker={st}
                      owned={ownsIn(album, st.id)}
                      spares={spareCountIn(album, st.id)}
                      badge={theirs && !ownsIn(album, st.id) && spareCountIn(theirs, st.id) > 0 ? '🤝' : undefined}
                      onOpen={() => setOpen(st)}
                    />
                  ) : (
                    <div key={i} className="fc-slot fc-slot--empty">
                      <span className="muted" style={{ fontSize: 11 }}>#{pageStart(page) + i}</span>
                    </div>
                  ),
              )}
            </div>
            {list.length > 0 && shown.length === 0 && (
              <p className="muted" style={{ marginTop: 8 }}>Nothing missing here — the page is done. 🏆</p>
            )}
          </div>

          <div className="fc-pager">
            <button className="btn btn--ghost btn--small" disabled={page === 0} onClick={() => { sfx.click(); go(-1) }}>
              ‹
            </button>
            <div className="fc-dots">
              {PL_CLUBS.map((c, i) => (
                <button
                  key={c.id}
                  aria-label={c.name}
                  className={`fc-dot ${i === page ? 'is-on' : ''}`}
                  onClick={() => {
                    sfx.click()
                    setPage(i)
                  }}
                />
              ))}
            </div>
            <button
              className="btn btn--ghost btn--small"
              disabled={page === PL_CLUBS.length - 1}
              onClick={() => { sfx.click(); go(1) }}
            >
              ›
            </button>
          </div>
          <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 6 }}>
            Swipe the page — {page + 1} of {PL_CLUBS.length} · 🤝 = {mateName} has a spare
          </p>
        </>
      )}

      {open && (
        <PlayerSheet
          name={open.name}
          sticker={{
            clubName: open.clubName,
            number: open.number,
            shirt: open.shirt,
            position: open.position,
            spares: spareCountIn(album, open.id),
            mateName,
            mateSpare: theirs ? spareCountIn(theirs, open.id) : 0,
            mateNeeds: theirs ? !ownsIn(theirs, open.id) : false,
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}

/** One slot on the page: the sticker if it's stuck in, its number if it isn't. */
function StickerSlot({
  sticker,
  owned,
  spares: spare,
  badge,
  onOpen,
}: {
  sticker: StickerDef
  owned: boolean
  spares: number
  /** Corner flag — 🤝 they can spare it, 🎯 they need it. */
  badge?: string
  onOpen: () => void
}) {
  if (!owned) {
    return (
      <button
        className="fc-slot fc-slot--empty"
        onClick={() => { sfx.click(); onOpen() }}
      >
        <span className="muted" style={{ fontSize: 11, fontWeight: 800 }}>#{sticker.number}</span>
        <span style={{ fontSize: 20, opacity: 0.35 }}>{sticker.kind === 'badge' ? '🛡️' : '👕'}</span>
        {badge && <span className="fc-slot-flag">{badge}</span>}
      </button>
    )
  }
  return (
    <button
      className={`fc-slot ${sticker.kind === 'badge' ? 'fc-slot--shiny' : ''}`}
      onClick={() => {
        sfx.click()
        onOpen()
      }}
    >
      {sticker.image ? (
        <img src={sticker.image} alt={sticker.name} loading="lazy" />
      ) : (
        <span style={{ fontSize: 26 }}>{sticker.kind === 'badge' ? '🛡️' : '👕'}</span>
      )}
      <span className="fc-slot-name">{sticker.name}</span>
      <span className="fc-slot-no">#{sticker.number}</span>
      {spare > 0 && <span className="fc-slot-spare">+{spare}</span>}
      {badge && <span className="fc-slot-flag">{badge}</span>}
    </button>
  )
}

// --- Packs -------------------------------------------------------------------

/**
 * Buying and opening. Three ways in — the free daily one, a sealed pack won in
 * a swap, and one bought with Berries — and the ceremony itself is the shared
 * one (§21h), handed FC Lock's own packet art and the club-crest beat.
 */
function PacksTab() {
  const data = useStore((s) => s.data)
  const openPack = useStore((s) => s.openPack)
  const { all, ready, kit, byId, crests } = useChecklist()
  const [drawn, setDrawn] = useState<string[] | null>(null)
  const [ownedBefore, setOwnedBefore] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)

  const album = data.fcAlbum
  const today = dayKey()
  const freeReady = freePackReady(album, today)
  const canBuy = data.economy.gems >= PACK_COST
  const traded = packCredits(album)
  const complete = ownedIdsIn(album).length >= TOTAL_STICKERS

  function open(kind: 'free' | 'buy' | 'credit') {
    if (!all.length) {
      sfx.error()
      setMsg('The checklist is still printing — give it a second.')
      return
    }
    setOwnedBefore(new Set(ownedIdsIn(album)))
    // The screen rolls the pack because it is the side holding the checklist;
    // the store checks the price and applies the draw. See `openPack`.
    const result = openPack(kind, 'fcAlbum', (a) => rollPackIn(kit, a), PACK_COST)
    if (result === 'broke') {
      sfx.error()
      setMsg(`Not enough Berries. A pack runs ${PACK_COST} 🫐.`)
    } else if (result === 'used') {
      sfx.error()
      setMsg('Today’s free pack is already open. Come back tomorrow!')
    } else {
      setMsg(null)
      setDrawn(result)
    }
  }

  return (
    <>
      {drawn && (
        <PackOpening
          drawn={drawn}
          ownedBefore={ownedBefore}
          lookup={(id) => faceOf(byId, id)}
          note={(id) => stickerNote(byId, id)}
          emblem="⚽"
          packTitle="FC LOCK PACK"
          intro={(id) => {
            const s = byId.get(id)
            return s ? { label: s.clubName, img: crests.get(s.clubId) } : null
          }}
          onDone={() => setDrawn(null)}
        />
      )}

      <div className="pack-shop">
        <div className={`pack-card ${freeReady ? 'is-ready' : 'is-spent'}`}>
          <div className="pack-card-art">🎁</div>
          <div className="pack-card-body">
            <div className="pack-card-title">Today’s free pack</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {freeReady ? 'One on the house, every day.' : 'Already claimed. New pack tomorrow!'}
            </div>
          </div>
          <button className="btn btn--small" disabled={!freeReady} onClick={() => { sfx.click(); open('free') }}>
            {freeReady ? 'Open' : '✓'}
          </button>
        </div>

        {traded > 0 && (
          <div className="pack-card is-ready">
            <div className="pack-card-art">🤝</div>
            <div className="pack-card-body">
              <div className="pack-card-title">Traded pack{traded > 1 ? ` ×${traded}` : ''}</div>
              <div className="muted" style={{ fontSize: 12 }}>Won in a swap — still sealed.</div>
            </div>
            <button className="btn btn--small" onClick={() => { sfx.click(); open('credit') }}>Open</button>
          </div>
        )}

        <div className="pack-card is-ready">
          <div className="pack-card-art">📦</div>
          <div className="pack-card-body">
            <div className="pack-card-title">Sticker pack</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {PACK_SIZE} stickers · doubles guaranteed to trade · a foil crest ~1 in 4 packs
            </div>
          </div>
          <button className="btn btn--small" disabled={!canBuy} onClick={() => { sfx.click(); open('buy') }}>
            <BerryCoin size={14} /> {PACK_COST}
          </button>
        </div>
      </div>

      {msg && <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>{msg}</p>}
      {complete && (
        <p style={{ marginTop: 14, textAlign: 'center', fontWeight: 900 }}>
          🏆 All {TOTAL_STICKERS} stickers — the album is full.
        </p>
      )}
      <p className="muted" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
        {data.economy.gems} 🫐 in the chest · packs opened: {album.packsOpened}
        {ready < PL_CLUBS.length ? ` · checklist ${ready}/${PL_CLUBS.length}` : ''}
      </p>
    </>
  )
}

// --- Swaps -------------------------------------------------------------------

/**
 * The swap table (§15b): spares for spares, and — when neither of you holds
 * what the other needs — Berries and today's unopened free pack on top, haggled
 * until somebody shakes on it. Its own shared doc, `app/fcTrades`.
 */
function TradeTab() {
  const data = useStore((s) => s.data)
  const mateData = useStore((s) => s.mateData)
  const fcTrades = useStore((s) => s.fcTrades)
  const activeProfileId = useStore((s) => s.activeProfileId)
  const proposeTrade = useStore((s) => s.proposeTrade)
  const answerTrade = useStore((s) => s.answerTrade)
  const counterTrade = useStore((s) => s.counterTrade)
  const cancelTrade = useStore((s) => s.cancelTrade)
  const { kit, byId } = useChecklist()
  const { theirs, mateName } = useMate()

  const [give, setGive] = useState<string[]>([])
  const [want, setWant] = useState<string[]>([])
  const [gems, setGems] = useState(0)
  const [pack, setPack] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [zoom, setZoom] = useState<{ card: CardFace; origin: DOMRect | null } | null>(null)

  const mine = data.fcAlbum
  const purse = data.economy.gems
  const freeReady = freePackReady(mine, dayKey())

  const iCanHelp = theirs ? tradeableIn(kit, mine, theirs) : []
  const theyCanHelp = theirs ? tradeableIn(kit, theirs, mine) : []

  const myTurn = fcTrades.filter((t) => awaitsAnswer(t, activeProfileId))
  const theirTurn = fcTrades.filter(
    (t) =>
      t.status === 'pending' &&
      !awaitsAnswer(t, activeProfileId) &&
      (t.fromId === activeProfileId || t.toId === activeProfileId),
  )
  const outgoing = fcTrades.filter((t) => t.status === 'pending' && t.fromId === activeProfileId)
  const recent = useMemo(() => fcTrades.filter((t) => t.status !== 'pending').slice(-4).reverse(), [fcTrades])

  const giveVal = offerValueFc(give)
  const wantVal = offerValueFc(want)
  const sweetened = gems > 0 || pack
  const balanced = give.length > 0 && want.length > 0 && giveVal === wantVal
  const canSend = want.length > 0 && (give.length > 0 || sweetened) && (sweetened || balanced)
  const hint = gemHintFc(want)
  const worth = offerWorthFc({ give, giveGems: gems, givePack: pack })
  const verdict = worth >= hint * 1.15 ? '😍 generous' : worth >= hint * 0.85 ? '👍 about right' : '🤏 a bit light'

  const peek = (card: CardFace, e: React.MouseEvent<HTMLElement>) => {
    sfx.click()
    setZoom({ card, origin: e.currentTarget.getBoundingClientRect() })
  }

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    sfx.click()
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  function send() {
    const result = proposeTrade(give, want, { gems, pack, col: 'fcAlbum' })
    if (result === 'ok') {
      sfx.fanfare()
      setGive([])
      setWant([])
      setGems(0)
      setPack(false)
      setMsg(`Offer sent to ${mateName}! 🕊️`)
      return
    }
    sfx.error()
    setMsg(
      result === 'unbalanced'
        ? 'Sticker for sticker, both sides must weigh the same — a foil crest counts as two players. Or throw in Berries instead.'
        : result === 'empty'
          ? 'Pick what you want, and put something up for it.'
          : result === 'broke'
            ? 'You don’t have that many Berries.'
            : result === 'nopack'
              ? 'Today’s free pack is already open — nothing left to hand over.'
              : 'You already have an offer on the table. Withdraw it first.',
    )
  }

  if (!theirs) {
    return <p className="muted" style={{ textAlign: 'center', marginTop: 20 }}>Finding {mateName}’s album…</p>
  }

  const offerCard = (t: StickerTrade, answerable: boolean) => (
    <TradeOffer
      key={t.id}
      trade={t}
      viewerId={activeProfileId}
      myPurse={purse}
      matePurse={mateData?.economy.gems ?? null}
      payerPackReady={t.fromId === activeProfileId ? freeReady : freePackReady(theirs, dayKey())}
      lookup={(id) => faceOf(byId, id)}
      onAccept={answerable ? () => { sfx.bigWin(); answerTrade(t.id, true, 'fcAlbum') } : undefined}
      onDecline={answerable ? () => { sfx.sad(); answerTrade(t.id, false, 'fcAlbum') } : undefined}
      onCounter={
        answerable
          ? (amount) => {
              const r = counterTrade(t.id, amount, 'fcAlbum')
              if (r === 'ok') { sfx.gem(); setMsg('Counter sent — the ball’s in their court. 💰') }
              else sfx.error()
              return r
            }
          : undefined
      }
      onCancel={t.fromId === activeProfileId ? () => { sfx.click(); cancelTrade(t.id, 'fcAlbum') } : undefined}
      onPeek={peek}
    />
  )

  return (
    <>
      {zoom && (
        <StickerDetail
          sticker={zoom.card}
          album={mine}
          mateAlbum={theirs}
          mateName={mateName}
          shelf={byId.get(zoom.card.id)?.clubName}
          note={stickerNote(byId, zoom.card.id)}
          origin={zoom.origin}
          onClose={() => setZoom(null)}
        />
      )}

      {myTurn.map((t) => offerCard(t, true))}
      {theirTurn.map((t) => offerCard(t, false))}

      <div className="trade-radar">
        <div className="trade-radar-item">
          <span className="trade-radar-num">{theyCanHelp.length}</span>
          <span>sticker{theyCanHelp.length === 1 ? '' : 's'} {mateName} can spare that <b>you need</b></span>
        </div>
        <div className="trade-radar-item">
          <span className="trade-radar-num">{iCanHelp.length}</span>
          <span>of your spares that <b>{mateName} needs</b></span>
        </div>
      </div>

      {theyCanHelp.length === 0 && iCanHelp.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', margin: '16px 0' }}>
          Nothing to swap right now — neither of you holds a double the other is missing. Open more packs! 📦
        </p>
      )}

      {outgoing.length === 0 && theyCanHelp.length > 0 && (
        <>
          <div className="trade-head">🎯 You want from {mateName}</div>
          <div className="album-grid">
            {theyCanHelp.slice(0, 60).map((s) => (
              <Sticker
                key={s.id}
                sticker={s}
                size="sm"
                selected={want.includes(s.id)}
                onClick={() => toggle(want, setWant, s.id)}
                onLongPress={(e) => peek(s, e)}
              />
            ))}
          </div>

          <div className="trade-head">
            🎁 You give from your spares
            {iCanHelp.length > 0 && <span className="trade-head-note">{iCanHelp.length} {mateName} needs</span>}
          </div>
          {iCanHelp.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>
              None of your doubles are ones {mateName} needs right now — pay in Berries instead. 👇
            </p>
          ) : (
            <div className="album-grid">
              {iCanHelp.slice(0, 60).map((s) => (
                <Sticker
                  key={s.id}
                  sticker={s}
                  size="sm"
                  count={spareCountIn(mine, s.id) + 1}
                  selected={give.includes(s.id)}
                  wanted
                  onClick={() => toggle(give, setGive, s.id)}
                  onLongPress={(e) => peek(s, e)}
                />
              ))}
            </div>
          )}

          {/* Nothing they need? Pay instead. No fixed price — that's what the
              counter-offers are for. */}
          <div className="trade-head">💰 Sweeten it</div>
          <div className="trade-sweeten">
            <div className="trade-sweeten-row">
              <GemStepper value={gems} max={purse} onChange={setGems} />
              <button
                className="btn btn--ghost btn--small"
                disabled={want.length === 0 || hint > purse}
                onClick={() => { sfx.click(); setGems(Math.min(purse, hint)) }}
              >
                fair ≈ {hint}
              </button>
            </div>
            <button
              className={`trade-pack-toss ${pack ? 'is-on' : ''}`}
              disabled={!freeReady}
              onClick={() => { sfx.click(); setPack(!pack) }}
            >
              <span>{pack ? '☑' : '☐'}</span>
              <span>
                🎁 …and today’s free pack
                {!freeReady && <span className="muted"> — already opened</span>}
              </span>
            </button>
            <div className="trade-purse">
              you hold <BerryCoin size={13} /> {purse}
            </div>
          </div>

          <div className="trade-scale">
            {sweetened ? (
              <>
                <span className="is-ok">
                  You put up ≈ <BerryCoin size={13} /> {worth}
                </span>
                <span className="trade-scale-mid">⚖️ {verdict}</span>
                <span className="is-ok">
                  asking ≈ <BerryCoin size={13} /> {hint}
                </span>
              </>
            ) : (
              <>
                <span className={balanced ? 'is-ok' : ''}>You give {giveVal}</span>
                <span className="trade-scale-mid">{balanced ? '⚖️ fair deal' : '⚖️'}</span>
                <span className={balanced ? 'is-ok' : ''}>You get {wantVal}</span>
              </>
            )}
          </div>
          <p className="muted" style={{ fontSize: 11, textAlign: 'center' }}>
            {sweetened
              ? 'Berries have no fixed price — offer what you like, they can ask for more.'
              : '🛡️ foil crest = 2 · player = 1 · hold a sticker to see it big'}
          </p>

          <button className="btn" style={{ width: '100%', marginTop: 10 }} disabled={!canSend} onClick={send}>
            🕊️ Send offer to {mateName}
          </button>
        </>
      )}

      {msg && <p className="muted" style={{ marginTop: 10, textAlign: 'center' }}>{msg}</p>}

      {recent.length > 0 && (
        <>
          <div className="trade-head">📜 Recent swaps</div>
          {recent.map((t) => (
            <div key={t.id} className="trade-log">
              <span>
                {t.fromName} → {t.toName} ·{' '}
                {[
                  t.give.length > 0 ? `${t.give.length} sticker${t.give.length === 1 ? '' : 's'}` : null,
                  tradeGems(t) > 0 ? `${tradeGems(t)} 🫐` : null,
                  t.givePack ? 'a pack 🎁' : null,
                ]
                  .filter(Boolean)
                  .join(' + ')}{' '}
                for {t.want.length}
              </span>
              <span className={`trade-log-status is-${t.status}`}>
                {t.status === 'accepted' ? '✓ done' : t.status === 'declined' ? '✕ passed' : '— off'}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  )
}

// --- Teams -------------------------------------------------------------------

/**
 * One club in the ranking. The badge and the id are looked up by name the first
 * time the row is shown and remembered, so following it is one tap.
 */
function RankedRow({ club, rank }: { club: RankedClub; rank: number }) {
  const { data, toggleFcTeam } = useStore()
  const [team, setTeam] = useState<FcTeam | null>(null)

  useEffect(() => {
    let alive = true
    void teamByName(club.name).then((t) => {
      if (alive) setTeam(t)
    })
    return () => {
      alive = false
    }
  }, [club.name])

  const on = team ? data.fcLock.teams.some((t) => t.id === team.id) : false
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null

  return (
    <button
      className="btn btn--ghost btn--small"
      style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '8px 6px', opacity: team ? 1 : 0.6 }}
      disabled={!team}
      onClick={() => {
        sfx.click()
        if (team) toggleFcTeam(team)
      }}
    >
      <span style={{ width: 26, textAlign: 'center', fontWeight: 900, flexShrink: 0 }}>{medal ?? rank}</span>
      <Badge src={team?.badge} />
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontWeight: 700 }}>{club.name}</span>
        <span className="muted" style={{ display: 'block', fontSize: 10, whiteSpace: 'normal', lineHeight: 1.25 }}>
          {club.country} · {club.note}
        </span>
      </span>
      <span style={{ flexShrink: 0 }}>{on ? '✅' : '➕'}</span>
    </button>
  )
}


function TeamsTab() {
  const { data, toggleFcLeague, toggleFcTeam } = useStore()
  const fcLock = data.fcLock
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<{ id: string; name: string; badge?: string; leagueName?: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (!q.trim()) return
    setSearching(true)
    setError(null)
    try {
      setHits(await searchTeams(q.trim()))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  return (
    <>
      <div className="h2">🏆 Leagues</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        📺 marks what CazéTV usually shows in Brazil. Follow any of them either way.
      </p>
      <div className="card" style={{ marginBottom: 14 }}>
        {LEAGUES.map((l) => {
          const on = fcLock.leagues.includes(l.id)
          return (
            <button
              key={l.id}
              className="btn btn--ghost btn--small"
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 6, opacity: on ? 1 : 0.6 }}
              onClick={() => {
                sfx.click()
                toggleFcLeague(l.id)
              }}
            >
              {on ? '✅' : '⬜'} {l.emoji} {l.name}
              {l.caze && ' 📺'}
            </button>
          )
        })}
      </div>

      <div className="h2">🥇 The clubs, best to worst</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        A hand-kept ranking — European Cups, recent titles, and how big the club is. Tap one to follow it.
      </p>
      <div className="card" style={{ marginBottom: 14, padding: 8 }}>
        {CLUB_RANKING.map((c, i) => (
          <RankedRow key={c.name} club={c} rank={i + 1} />
        ))}
      </div>

      <div className="h2">⚽ Your clubs</div>
      {fcLock.teams.length > 0 && (
        <div className="card" style={{ marginBottom: 10 }}>
          {fcLock.teams.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <Badge src={t.badge} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>{t.leagueName ?? ''}</div>
              </div>
              <button
                className="btn btn--ghost btn--small"
                style={{ color: 'var(--red)' }}
                aria-label={`Unfollow ${t.name}`}
                onClick={() => {
                  sfx.click()
                  toggleFcTeam(t)
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Search a club</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void run()
            }}
            placeholder="Flamengo, Arsenal, Real Madrid…"
          />
        </div>
        <button className="btn btn--blue btn--small" disabled={searching || !q.trim()} onClick={() => { sfx.click(); void run() }}>
          {searching ? 'Searching…' : '🔎 Search'}
        </button>
        {error && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{error}</p>}
        {hits.map((t) => {
          const on = fcLock.teams.some((x) => x.id === t.id)
          return (
            <button
              key={t.id}
              className="btn btn--ghost btn--small"
              style={{ width: '100%', justifyContent: 'flex-start', marginTop: 8 }}
              onClick={() => {
                sfx.click()
                toggleFcTeam(t)
              }}
            >
              {on ? '✅' : '➕'} {t.name} <span className="muted">· {t.leagueName ?? ''}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
