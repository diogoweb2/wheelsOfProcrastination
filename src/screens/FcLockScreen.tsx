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
import type { FcNewsItem, FcWatchItem } from '../types'
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
import { fetchFcNews, newsKey, newsStale } from '../logic/fcNews'
import {
  PACK_COST,
  PL_CLUBS,
  SLOTS_PER_CLUB,
  TOTAL_STICKERS,
  buildPage,
  emptyAlbum,
  fetchSquad,
  freePackReady,
  ownedCount,
  owns,
  pageStart,
  rollPack,
  spares,
  type StickerDef,
} from '../logic/fcAlbum'
import { dayKey } from '../logic/dates'
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
      {tab === 'album' && <AlbumTab />}
      {tab === 'packs' && <PacksTab />}
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

  const refresh = useCallback(async () => {
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
  }, [aiConfig, teams, key, setFcNews])

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
              ? `Read ${torontoDay(fcLock.news.fetchedAt)}, ${torontoTime(fcLock.news.fetchedAt)} ET${stale ? ' · out of date' : ''}`
              : 'Never fetched'}
          </div>
        </div>
        <button className="btn btn--blue btn--small" disabled={loading} onClick={() => { sfx.click(); void refresh() }}>
          {loading ? 'Reading…' : '🔄 Get news'}
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
  sticker?: { clubName: string; number: number; shirt?: string; position?: string; spares: number }
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

// --- Album -------------------------------------------------------------------

/**
 * The checklist, built once and kept: every club's page, in album order. Squads
 * are fetched one club at a time (the free API is rate-limited) and frozen in
 * localStorage, so a sticker never turns into a different player.
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
  return { pages, all, ready }
}

/** The album: one club per page, swiped left and right like the real thing. */
function AlbumTab() {
  const { data } = useStore()
  const album = data.fcLock.album ?? emptyAlbum()
  const { pages, all, ready } = useChecklist()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<StickerDef | null>(null)
  const drag = useRef<{ x: number; dx: number } | null>(null)
  const [dx, setDx] = useState(0)

  const club = PL_CLUBS[page]
  const list = pages[page] ?? []
  const have = list.filter((st) => owns(album, st.id)).length

  function go(delta: number) {
    setPage((p) => Math.min(PL_CLUBS.length - 1, Math.max(0, p + delta)))
    setDx(0)
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 900 }}>📕 Premier League 2026</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {ownedCount(album)} / {all.length || TOTAL_STICKERS}
          </div>
        </div>
        <div className="quiz-bar" style={{ marginTop: 8 }}>
          <div className="quiz-bar-fill" style={{ width: `${all.length ? (ownedCount(album) / all.length) * 100 : 0}%` }} />
        </div>
        {ready < PL_CLUBS.length && (
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
            Printing the checklist… {ready}/{PL_CLUBS.length} clubs
          </div>
        )}
      </div>

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
          <span className="muted" style={{ fontSize: 12 }}>
            {have}/{list.length || SLOTS_PER_CLUB}
          </span>
        </div>

        <div className="fc-grid">
          {(list.length ? list : Array.from({ length: SLOTS_PER_CLUB })).map((st, i) =>
            st ? (
              <StickerSlot
                key={(st as StickerDef).id}
                sticker={st as StickerDef}
                owned={owns(album, (st as StickerDef).id)}
                spares={spares(album, (st as StickerDef).id)}
                onOpen={() => setOpen(st as StickerDef)}
              />
            ) : (
              <div key={i} className="fc-slot fc-slot--empty">
                <span className="muted" style={{ fontSize: 11 }}>#{pageStart(page) + i}</span>
              </div>
            ),
          )}
        </div>
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
        Swipe the page — {page + 1} of {PL_CLUBS.length}
      </p>

      {open && (
        <PlayerSheet
          name={open.name}
          sticker={{
            clubName: open.clubName,
            number: open.number,
            shirt: open.shirt,
            position: open.position,
            spares: spares(album, open.id),
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
  onOpen,
}: {
  sticker: StickerDef
  owned: boolean
  spares: number
  onOpen: () => void
}) {
  if (!owned) {
    return (
      <div className="fc-slot fc-slot--empty">
        <span className="muted" style={{ fontSize: 11, fontWeight: 800 }}>#{sticker.number}</span>
        <span style={{ fontSize: 20, opacity: 0.35 }}>{sticker.kind === 'badge' ? '🛡️' : '👕'}</span>
      </div>
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
    </button>
  )
}

// --- Packs -------------------------------------------------------------------

/**
 * Buying and opening. A pack is five stickers: they come out face down, flip
 * over one at a time when tapped, and a NEW one backflips into the album the
 * moment it lands there.
 */
function PacksTab() {
  const { data, openFcPack } = useStore()
  const album = data.fcLock.album ?? emptyAlbum()
  const { all, ready } = useChecklist()
  /** The five stickers of the pack being opened, and how far the ceremony has got. */
  const [drawn, setDrawn] = useState<StickerDef[] | null>(null)
  const [wasNew, setWasNew] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const today = dayKey()
  const freeReady = freePackReady(album, today)
  const byId = useMemo(() => new Map(all.map((s) => [s.id, s])), [all])
  /** clubId → crest, taken off each club's badge sticker. */
  const crests = useMemo(
    () => new Map(all.filter((s) => s.kind === 'badge').map((s) => [s.clubId, s.image])),
    [all],
  )

  function buy(kind: 'free' | 'buy') {
    const ids = rollPack(all, album)
    const fresh = new Set(ids.filter((id) => !owns(album, id)))
    const res = openFcPack(kind, ids, PACK_COST)
    if (res !== true) {
      setError(
        res === 'broke'
          ? `Not enough Berries — a pack is ${PACK_COST} 🫐.`
          : res === 'used'
            ? 'Today’s free pack is already open. Come back tomorrow.'
            : 'The checklist is still printing — give it a second.',
      )
      sfx.error()
      return
    }
    setError(null)
    setWasNew(fresh)
    setDrawn(ids.map((id) => byId.get(id)).filter((s): s is StickerDef => !!s))
    sfx.gem()
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>🎁 Sticker packs</div>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Five stickers a pack. One free pack every day, then {PACK_COST} 🫐 each.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn btn--blue btn--small" style={{ flex: 1 }} disabled={!freeReady || !all.length} onClick={() => buy('free')}>
            {freeReady ? '🎁 Free pack' : '✅ Free pack used'}
          </button>
          <button className="btn btn--small" style={{ flex: 1 }} disabled={!all.length} onClick={() => buy('buy')}>
            💰 Buy · {PACK_COST} 🫐
          </button>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          {data.economy.gems} 🫐 in the chest · {album.packsOpened} packs opened
          {ready < PL_CLUBS.length ? ` · checklist ${ready}/${PL_CLUBS.length}` : ''}
        </div>
      </div>

      {error && <div className="card" style={{ borderColor: 'var(--red)' }}>{error}</div>}

      {drawn && (
        <PackOpening
          pack={drawn}
          fresh={wasNew}
          crests={crests}
          onDone={() => setDrawn(null)}
        />
      )}
    </>
  )
}

/**
 * The ceremony, the way the football games do it (§21h): the sealed pack, then
 * for each of the five — the club’s crest lighting up the tunnel, then the card
 * itself rising on the podium with the fireworks going off. Every step waits for
 * a tap, so nothing is missed by looking away.
 */
function PackOpening({
  pack,
  fresh,
  crests,
  onDone,
}: {
  pack: StickerDef[]
  fresh: Set<string>
  crests: Map<string, string | undefined>
  onDone: () => void
}) {
  const [stage, setStage] = useState<'pack' | 'club' | 'card' | 'done'>('pack')
  const [i, setI] = useState(0)
  const st = pack[i]

  // the crest flash is a beat, not a screen: it moves on by itself
  useEffect(() => {
    if (stage !== 'club') return
    const t = setTimeout(() => setStage('card'), 1500)
    return () => clearTimeout(t)
  }, [stage, i])

  function tap() {
    sfx.click()
    if (stage === 'pack') {
      setStage('club')
      return
    }
    if (stage === 'club') {
      setStage('card')
      return
    }
    if (stage === 'card') {
      if (i + 1 < pack.length) {
        setI(i + 1)
        setStage('club')
      } else setStage('done')
      return
    }
    onDone()
  }

  if (stage === 'done') {
    return (
      <div className="fc-open" onClick={onDone}>
        <div className="fc-open-inner">
          <div className="h2" style={{ textAlign: 'center' }}>Pack opened</div>
          <div className="fc-pack">
            {pack.map((s, n) => (
              <span key={`${s.id}-${n}`} className={`fc-card-face fc-card-front ${s.kind === 'badge' ? 'is-shiny' : ''}`} style={{ position: 'relative' }}>
                {s.image ? <img src={s.image} alt={s.name} /> : <b style={{ fontSize: 26 }}>👕</b>}
                <b className="fc-card-name">{s.name}</b>
                <span className="fc-card-no">#{s.number}</span>
                {fresh.has(s.id) && <span className="fc-card-new">NEW!</span>}
              </span>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 12 }}>
            {fresh.size ? `${fresh.size} new — stuck in the album.` : 'All spares this time — trade fodder.'}
          </p>
          <button className="btn btn--blue" style={{ marginTop: 12, width: '100%' }} onClick={onDone}>
            Back to the packs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fc-open" onClick={tap} role="button" tabIndex={0}>
      <div className="fc-open-beams" />
      {stage === 'pack' && (
        <div className="fc-open-inner">
          <div className="fc-sealed">
            <span className="fc-sealed-shine" />
            <span className="fc-sealed-crest">⚽</span>
            <span className="fc-sealed-word">FC LOCK</span>
            <span className="fc-sealed-sub">5 STICKERS</span>
          </div>
          <div className="fc-open-cta">TAP TO OPEN</div>
        </div>
      )}

      {stage === 'club' && (
        <div className="fc-open-inner">
          <div className="fc-tunnel">
            {crests.get(st.clubId) ? (
              <img className="fc-tunnel-crest" src={crests.get(st.clubId)} alt={st.clubName} />
            ) : (
              <div className="fc-tunnel-crest fc-tunnel-crest--none">🛡️</div>
            )}
          </div>
          <div className="fc-open-club">{st.clubName}</div>
          <div className="fc-open-count">{i + 1} of {pack.length}</div>
        </div>
      )}

      {stage === 'card' && (
        <div className="fc-open-inner">
          <div className={`fc-hero ${st.kind === 'badge' ? 'is-shiny' : ''}`}>
            <span className="fc-hero-rating">
              <b>{st.shirt ? `#${st.shirt}` : `#${st.number}`}</b>
              <small>{shortPos(st.position) ?? (st.kind === 'badge' ? 'CREST' : 'PL')}</small>
            </span>
            {st.image ? <img className="fc-hero-img" src={st.image} alt={st.name} /> : <div className="fc-hero-img">👕</div>}
            <span className="fc-hero-name">{st.name}</span>
            <span className="fc-hero-club">{st.clubName}</span>
            {fresh.has(st.id) && <span className="fc-hero-new">NEW!</span>}
          </div>
          <div className="fc-flames">
            {[0, 1, 2, 3].map((n) => (
              <span key={n} className="fc-flame" style={{ animationDelay: `${n * 0.12}s` }} />
            ))}
          </div>
          <div className="fc-open-cta">{i + 1 < pack.length ? 'TAP TO CONTINUE' : 'TAP TO FINISH'}</div>
        </div>
      )}
    </div>
  )
}

/** "Right Winger" → "RW", the way a card prints it. */
function shortPos(position?: string): string | null {
  if (!position) return null
  const words = position.split(/[\s-]+/).filter(Boolean)
  return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase()
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
