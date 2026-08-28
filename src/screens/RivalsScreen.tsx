// ⚽ Rivals League (§21j) — the 3v3 game, as its own app.
//
// It used to be a tab inside FC Lock, which was the wrong home: FC Lock is about
// real football on TV, and this is a game you play. It lives in the Games folder
// now, next to Chess and Sea Battle, with a URL of its own per §1c.
//
// This screen is only the desk around the match — the pickers, the fixtures, the
// table and the how-to. The match itself is <SoccerMatch>, over the engine in
// logic/opsoccer.ts.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'
import { SoccerMatch } from '../components/SoccerMatch'
import {
  ALL_ROLES,
  DIFFICULTY,
  FORMATS,
  MATCH_SECONDS,
  ROLE_NAMES,
  STYLES,
  TEAM_SIZES,
  TEAMS,
  fixturesLeft,
  newMatch,
  normalizeRole,
  standings,
  styleById,
  teamById,
  type Difficulty,
  type Match,
  type Role,
  type StyleId,
  type TeamDef,
  type TeamSize,
} from '../logic/opsoccer'

export function RivalsScreen({ tab, setTab }: { tab: string; setTab: (tab: string) => void }) {
  return (
    <>
      {tab === 'play' && <PlayTab setTab={setTab} />}
      {tab === 'squad' && <SquadTab />}
      {tab === 'table' && <TableTab setTab={setTab} />}
      {tab === 'rules' && <RulesTab />}
    </>
  )
}

// --- Play --------------------------------------------------------------------

/**
 * The fixture list and the match. Pick who you're playing — the bots or Diogo —
 * then a club to face, and the pitch takes over the screen.
 */
function PlayTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data, addFcResult, resetFcSeason } = useStore()
  const saved = data.fcLock.soccer
  const [live, setLive] = useState<Match | null>(null)
  const [opponent, setOpponent] = useState<TeamDef | null>(null)
  const [size, setSize] = useState<TeamSize>(3)
  const [mode, setMode] = useState<'ai' | 'duo'>('ai')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [theirRole, setTheirRole] = useState<Role>('FW')
  const [theirStyle, setTheirStyle] = useState<StyleId>('emperor')

  const myTeam = saved ? teamById(saved.teamId) : undefined
  const myStyle = styleById(saved?.style)
  const results = saved?.results ?? []
  // the shirt you picked, folded onto one this format actually has
  const myRole = normalizeRole(saved?.role, size)
  const fmt = FORMATS[size]

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

  if (!saved || !myTeam) {
    return (
      <div className="card">
        <div className="h3">⚽ Sign for a club first</div>
        <p className="muted" style={{ fontSize: 12, margin: '6px 0 10px' }}>
          Pick your club, the position you play and your Style over on <b>Squad</b> — then come back and kick off.
        </p>
        <button className="btn btn--blue" style={{ width: '100%' }} onClick={() => { sfx.click(); setTab('squad') }}>
          Go to Squad
        </button>
      </div>
    )
  }

  const left = fixturesLeft(myTeam.id, results)

  function kickOff(opp: TeamDef) {
    if (!myTeam) return
    sfx.click()
    setOpponent(opp)
    setLive(
      newMatch({
        home: myTeam,
        away: opp,
        size,
        myRole,
        myStyle: myStyle.id,
        mode,
        theirRole: mode === 'duo' ? normalizeRole(theirRole, size) : null,
        theirStyle,
        difficulty,
      }),
    )
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 30 }}>{myTeam.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>{myTeam.name}</div>
            <div className="muted" style={{ fontSize: 11 }}>
              {ROLE_NAMES[myRole]} · {myStyle.emoji} {myStyle.name} · {results.length}/12 played
            </div>
          </div>
          <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setTab('squad') }}>
            Change
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 6 }}>🔢 How many a side?</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TEAM_SIZES.map((n) => (
            <button
              key={n}
              className={`btn btn--small ${size === n ? 'btn--blue' : 'btn--ghost'}`}
              style={{ flex: 1 }}
              onClick={() => { sfx.click(); setSize(n) }}
            >
              {FORMATS[n].label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          {fmt.what} · {fmt.roles.join(' · ')} · first to {fmt.limit} · bigger pitch as it grows
        </p>
        {ROLE_NAMES[normalizeRole(saved?.role, size)] !== ROLE_NAMES[normalizeRole(saved?.role, 5)] && (
          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            No {ROLE_NAMES[normalizeRole(saved?.role, 5)].toLowerCase()} in a {fmt.label} — you play{' '}
            <b>{ROLE_NAMES[myRole]}</b> here.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 6 }}>⚔️ Who are you playing?</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn--small ${mode === 'ai' ? 'btn--blue' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { sfx.click(); setMode('ai') }}
          >
            🤖 vs AI
          </button>
          <button
            className={`btn btn--small ${mode === 'duo' ? 'btn--blue' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { sfx.click(); setMode('duo') }}
          >
            👨 vs Diogo
          </button>
        </div>

        {mode === 'ai' ? (
          <>
            <p className="muted" style={{ fontSize: 12, margin: '8px 0 6px' }}>
              {fmt.size === 2 ? 'Their other one is a bot' : `All ${fmt.size - 1} of theirs are bots`}. How hard should
              they play?
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  className={`btn btn--small ${difficulty === d ? 'btn--blue' : 'btn--ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => { sfx.click(); setDifficulty(d) }}
                >
                  {DIFFICULTY[d].label}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>{DIFFICULTY[difficulty].what}</p>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 12, margin: '8px 0 6px' }}>
              One phone, flat between you. Diogo takes a player on the other team and gets their own stick and buttons
              on the far side.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {fmt.roles.map((r) => (
                <button
                  key={r}
                  className={`btn btn--small ${normalizeRole(theirRole, size) === r ? 'btn--blue' : 'btn--ghost'}`}
                  onClick={() => { sfx.click(); setTheirRole(r) }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {STYLES.map((st) => (
                <button
                  key={st.id}
                  className={`btn btn--small ${theirStyle === st.id ? 'btn--blue' : 'btn--ghost'}`}
                  onClick={() => { sfx.click(); setTheirStyle(st.id) }}
                >
                  {st.emoji} {st.name}
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

    </>
  )
}


// --- Squad -------------------------------------------------------------------

/** Your club, your shirt and your Style — changeable any time, season intact. */
function SquadTab() {
  const { data, setFcSquad } = useStore()
  const saved = data.fcLock.soccer
  const myTeam = saved ? teamById(saved.teamId) : undefined
  const [editing, setEditing] = useState(false)

  if (!myTeam || editing) {
    return (
      <SquadPicker
        onPick={(teamId, role, style) => {
          setFcSquad(teamId, role, style)
          setEditing(false)
        }}
      />
    )
  }

  const myRole = normalizeRole(saved?.role)
  const myStyle = styleById(saved?.style)
  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 40 }}>{myTeam.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{myTeam.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {ROLE_NAMES[myRole]} · {myStyle.emoji} {myStyle.name}
            </div>
          </div>
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <i style={{ width: 16, height: 16, borderRadius: 4, background: myTeam.colors[0] }} />
            <i style={{ width: 16, height: 16, borderRadius: 4, background: myTeam.colors[1] }} />
          </span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 4 }}>{myStyle.emoji} {myStyle.name}</div>
        <p className="muted" style={{ fontSize: 12 }}>{myStyle.what}</p>
        <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          Signature move: <b>{myStyle.move}</b> · speed ×{myStyle.speed} · shot ×{myStyle.power} · cooldown {myStyle.cooldown}s
        </p>
      </div>

      <button className="btn btn--blue" style={{ width: '100%' }} onClick={() => { sfx.click(); setEditing(true) }}>
        Change club, position or Style
      </button>
      <p className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>
        Your season's results stay where they are.
      </p>
    </>
  )
}


// --- Table -------------------------------------------------------------------

/** The standings, and every result you've filed this season. */
function TableTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data, resetFcSeason } = useStore()
  const saved = data.fcLock.soccer
  const myTeam = saved ? teamById(saved.teamId) : undefined
  const results = saved?.results ?? []

  if (!myTeam) {
    return (
      <div className="card">
        <div className="h3">🏆 No season yet</div>
        <p className="muted" style={{ fontSize: 12, margin: '6px 0 10px' }}>Sign for a club on <b>Squad</b> and the table opens up.</p>
        <button className="btn btn--blue" style={{ width: '100%' }} onClick={() => { sfx.click(); setTab('squad') }}>
          Go to Squad
        </button>
      </div>
    )
  }

  const table = standings(myTeam.id, results)

  return (
    <>
      <div className="h2">🏆 Rivals League</div>
      <div className="card" style={{ padding: 8, overflowX: 'auto', marginBottom: 12 }}>
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

      <div className="h2">✅ Your results — {results.length}/12</div>
      {!results.length && <div className="card muted" style={{ fontSize: 12 }}>Nothing played yet. Kick off on <b>Play</b>.</div>}
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

      {results.length > 0 && (
        <button className="btn btn--ghost btn--small" style={{ width: '100%', marginTop: 10 }} onClick={() => { sfx.click(); resetFcSeason() }}>
          Start a new season
        </button>
      )}
    </>
  )
}


// --- How to ------------------------------------------------------------------

/** The rules, on the screen, so nobody has to remember which button slides. */
function RulesTab() {
  return (
    <>
      <div className="h2">⚽ Rivals League</div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, margin: 0 }}>
          Top-down small-sided football in the spirit of Blue Lock Rivals. <b>No subs</b> — you play one shirt and the
          rest of your side are bots. Pick <b>2v2</b>, <b>3v3</b>, <b>4v4</b> or <b>5v5</b> on the Play tab before each
          match; the pitch, the goal and the score limit all grow with it. The match takes over the whole screen, with
          the stick and the six buttons floating on the pitch.
        </p>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {MATCH_SECONDS / 60} minutes, one period. <b>Reach the score limit and it's over on the spot</b>, otherwise
          whoever leads when the clock runs out.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12, fontSize: 12 }}>
        {TEAM_SIZES.map((n) => (
          <div key={n} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
            <b style={{ width: 40, flexShrink: 0 }}>{FORMATS[n].label}</b>
            <span className="muted">
              {FORMATS[n].roles.join(' · ')} — {FORMATS[n].what}, first to {FORMATS[n].limit}
            </span>
          </div>
        ))}
      </div>

      <div className="h2">🎮 The buttons</div>
      <div className="card" style={{ marginBottom: 12, fontSize: 12 }}>
        {[
          ['SHOOT', 'Held, not tapped — the longer you hold, the harder it goes, and it fires when you let go.'],
          ['PASS', 'Finds the best runner and leads the ball onto them.'],
          ['TACKLE', 'A slide you have to aim. Land it and the ball is yours; miss and you are on the floor.'],
          ['DASH', 'A burst where nobody can tackle you. Short cooldown.'],
          ['MOVE', 'Your Style’s signature move — the fifth button is named after it.'],
          ['FLOW', 'Lights up when the EGO bar fills. Ten seconds of more speed, more power and legs that never tire.'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
            <b style={{ width: 62, flexShrink: 0 }}>{k}</b>
            <span className="muted">{v}</span>
          </div>
        ))}
      </div>

      <div className="h2">⌨️ On a keyboard</div>
      <div className="card" style={{ marginBottom: 12, fontSize: 12 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Every key is also printed in the corner of the button it presses, so you never have to come back here.
        </p>
        <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
          <b style={{ width: 62, flexShrink: 0 }}>You</b>
          <span className="muted">
            <b>W A S D</b> to run (the <b>arrow keys</b> too, when you're playing the bots).<br />
            <b>U I O</b> = shoot · pass · tackle, and <b>J K L</b> = dash · your move · flow — the same 3×2 shape as the
            buttons.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
          <b style={{ width: 62, flexShrink: 0 }}>Diogo</b>
          <span className="muted">
            <b>Arrow keys</b> to run. <b>Numpad 7 8 9</b> = shoot · pass · tackle, <b>Numpad 4 5 6</b> = dash · move ·
            flow.
          </span>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          <b>SHOOT is held</b> on the keyboard too: hold U (or Numpad 7) to charge, let go to strike.
        </p>
      </div>

      <div className="h2">✨ Styles</div>
      <div className="card" style={{ marginBottom: 12 }}>
        {STYLES.map((st) => (
          <div key={st.id} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 18 }}>{st.emoji}</span>
            <span style={{ minWidth: 0 }}>
              <b style={{ fontSize: 13 }}>{st.name}</b> <span className="muted" style={{ fontSize: 11 }}>· {st.move}</span>
              <span className="muted" style={{ display: 'block', fontSize: 11 }}>{st.what}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="h2">🧠 Two rules worth knowing</div>
      <div className="card">
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          A ball someone is <b>carrying</b> only changes hands on a tackle that lands — nobody gets robbed just by
          standing next to them. And only the <b>closest</b> player on each side chases the ball; the other holds the
          shape. That is why it is a game of football and not a scrum.
        </p>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Play the bots at <b>Rookie</b>, <b>Rival</b> or <b>Blue Lock</b>, or hand the phone to Diogo — he takes a
          player on the other team and gets his own stick and buttons on the far side.
        </p>
      </div>
    </>
  )
}


// --- the pickers -------------------------------------------------------------

/** Club first, then the shirt you wear, then the Style you play as. */
function SquadPicker({ onPick }: { onPick: (teamId: string, role: string, style?: string) => void }) {
  const [team, setTeam] = useState<TeamDef | null>(null)
  const [role, setRole] = useState<Role>('FW')
  const [style, setStyle] = useState<StyleId>('striker')

  return (
    <>
      <div className="h2">🏟️ Pick your club</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Thirteen teams, <b>no subs</b>. Play 2v2, 3v3, 4v4 or 5v5 — you pick that on <b>Play</b>, before each match. You
        play one shirt; the rest are bots.
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
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              className={`btn btn--small ${role === r ? 'btn--blue' : 'btn--ghost'}`}
              onClick={() => { sfx.click(); setRole(r) }}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {ROLE_NAMES[role]} — your bots fill the rest. A shirt a smaller format doesn't have folds onto the nearest one
          it does: no winger in a 3v3 or 4v4, no dedicated defender in a 3v3, and a 2v2 is a keeper and a striker —
          everyone outfield plays striker there.
        </p>
      </div>

      <div className="h2">✨ Pick your Style</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Your Style sets your speed, your shot and the one signature move on the ABILITY button.
      </p>
      <div className="card" style={{ marginBottom: 12, padding: 8 }}>
        {STYLES.map((st) => (
          <button
            key={st.id}
            className="btn btn--ghost btn--small"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10, opacity: style === st.id ? 1 : 0.6, textAlign: 'left' }}
            onClick={() => { sfx.click(); setStyle(st.id) }}
          >
            <span style={{ fontSize: 18 }}>{st.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 800 }}>{st.name}</span>
              <span className="muted" style={{ display: 'block', fontSize: 11, whiteSpace: 'normal' }}>{st.what}</span>
            </span>
            <span>{style === st.id ? '✅' : ''}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 4 }}>🎮 The buttons</div>
        <p className="muted" style={{ fontSize: 12 }}>
          <b>SHOOT</b> is held, not tapped — the longer you hold it the harder it goes. <b>PASS</b> finds a runner.
          <b> TACKLE</b> is a slide you have to aim, and missing it puts you on the floor. <b>DASH</b> makes you
          untouchable for half a second. Your move is on the fifth button, and when the <b>EGO</b> bar fills,
          <b> FLOW</b> turns you up to eleven. Reach the score limit, or lead when the clock runs out. On a keyboard:
          <b> WASD</b> to run, <b>U I O</b> / <b>J K L</b> for the six buttons — each one is printed on the button.
        </p>
      </div>

      <button
        className="btn btn--blue"
        style={{ width: '100%' }}
        disabled={!team}
        onClick={() => { sfx.gem(); if (team) onPick(team.id, role, style) }}
      >
        Sign for {team ? team.name : 'a club'}
      </button>
    </>
  )
}

