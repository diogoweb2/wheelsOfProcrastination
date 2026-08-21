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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'
import type { FcNewsItem, FcWatchItem } from '../types'
import {
  LEAGUES,
  countdownLabel,
  daysUntil,
  hasScore,
  isFinished,
  leagueById,
  lookupMatch,
  nextForTeam,
  nextInLeague,
  searchTeams,
  torontoDay,
  torontoTime,
  upcomingTournaments,
  type FcMatch,
} from '../logic/fclock'
import { fetchFcNews, newsKey, newsStale } from '../logic/fcNews'

export function FcLockScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      <div className="h1">⚽ FC Lock</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Every kick-off in Toronto time. Star a game and it gets a countdown.
      </p>
      {tab === 'games' && <GamesTab />}
      {tab === 'watch' && <WatchTab />}
      {tab === 'news' && <NewsTab />}
      {tab === 'cups' && <CupsTab />}
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

function WatchTab() {
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

// --- Cups --------------------------------------------------------------------

function CupsTab() {
  const cups = upcomingTournaments()
  const { data } = useStore()
  const fcLock = data.fcLock
  const starred = [...fcLock.watch]
    .filter((w) => !isFinished(toMatch(w)))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .slice(0, 3)

  return (
    <>
      {starred.length > 0 && (
        <>
          <div className="h2">⭐ Your games</div>
          {starred.map((w) => (
            <Countdown key={w.id} emoji="⚽" name={`${w.home} v ${w.away}`} what={w.leagueName} days={daysUntil(w.kickoff)} />
          ))}
        </>
      )}
      <div className="h2" style={{ marginTop: starred.length ? 16 : 0 }}>🏆 The big ones</div>
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

// --- Teams -------------------------------------------------------------------

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

      <div className="h2">⚽ Clubs</div>
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
