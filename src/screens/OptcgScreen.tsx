// The ONE PIECE Card Game — the real one.
//
// Three tabs, three URLs (/optcg/play, /optcg/deck, /optcg/rules):
//   play   a game against the AI held in React state, or a live one against
//          the other crewmate running through the shared app/optcgMatches doc
//   deck   the deckbuilder over all ~2600 printed cards
//   rules  the short version of the rules the engine enforces
//
// The rules live in logic/optcg.ts and the card text in logic/optcgEffects.ts —
// this screen only decides who is asked what, and hands positions to the store.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  DECK_SIZE,
  MAX_COPIES,
  OPTCG_REWARD,
  OPTCG_SOLO_LIMIT,
  OPTCG_SOLO_REWARD,
  card,
  cardByCode,
  deckProblems,
  mulligan,
  newMatch,
  resign,
  toAct,
  type OptcgDeck,
  type OptcgSide,
  type OptcgState,
} from '../logic/optcg'
import { OPTCG_CARDS, OPTCG_SETS } from '../logic/optcgCards'
import { OPTCG_PRESETS } from '../logic/optcgDecks'
import { isScripted } from '../logic/optcgEffects'
import { aiDefend, aiTurn } from '../logic/optcgAi'
import { OptcgBoard } from '../components/optcg/OptcgBoard'
import { OptcgCardImg } from '../components/optcg/OptcgCardImg'
import { BerryCoin } from '../components/BerryCoin'
import { sfx } from '../audio'

export function OptcgScreen({ tab }: { tab: string }) {
  if (tab === 'deck') return <DeckTab />
  if (tab === 'rules') return <RulesTab />
  return <PlayTab />
}

/** Every deck this crewmate can take into a game: the presets plus their builds. */
function useMyDecks(): { decks: OptcgDeck[]; active: OptcgDeck } {
  const data = useStore((s) => s.data)
  const decks = useMemo(() => [...OPTCG_PRESETS, ...data.optcg.decks], [data.optcg.decks])
  const active = decks.find((d) => d.id === data.optcg.activeDeck) ?? decks[0]
  return { decks, active }
}

// --- play ----------------------------------------------------------------------

function PlayTab() {
  const { activeProfileId, profiles, optcgMatches, data } = useStore((s) => ({
    activeProfileId: s.activeProfileId,
    profiles: s.profiles,
    optcgMatches: s.optcgMatches,
    data: s.data,
  }))
  const challengeOptcg = useStore((s) => s.challengeOptcg)
  const answerOptcgChallenge = useStore((s) => s.answerOptcgChallenge)
  const playOptcgMove = useStore((s) => s.playOptcgMove)
  const resignOptcgMatch = useStore((s) => s.resignOptcgMatch)
  const cancelOptcgMatch = useStore((s) => s.cancelOptcgMatch)
  const settleOptcgMatches = useStore((s) => s.settleOptcgMatches)
  const recordOptcgSolo = useStore((s) => s.recordOptcgSolo)
  const { decks, active } = useMyDecks()

  /** The solo game against the AI. Null until "Play the AI" is pressed. */
  const [solo, setSolo] = useState<OptcgState | null>(null)
  const [soloPaid, setSoloPaid] = useState(false)

  const live = optcgMatches.find((m) => m.status === 'active' && (m.fromId === activeProfileId || m.toId === activeProfileId))
  const call = optcgMatches.find((m) => m.status === 'pending' && m.toId === activeProfileId)
  const sent = optcgMatches.find((m) => m.status === 'pending' && m.fromId === activeProfileId)
  const mate = profiles.find((p) => p.id !== activeProfileId)

  useEffect(() => { settleOptcgMatches() }, [optcgMatches, settleOptcgMatches])

  // The AI plays whenever the position is waiting on it — its own turn, and the
  // block/counter/trigger answers while we attack.
  useEffect(() => {
    if (!solo || solo.over) return
    if (toAct(solo) !== 'p2') return
    const t = setTimeout(() => {
      setSolo((s) => {
        if (!s || s.over || toAct(s) !== 'p2') return s
        if (s.phase === 'mulligan') return mulligan(s, 'p2', s.p2.hand.filter((c) => card(c).cost <= 3).length < 2)
        if (s.turn === 'p2' && s.phase === 'main') return aiTurn(s, 'p2')
        return aiDefend(s, 'p2')
      })
    }, 550)
    return () => clearTimeout(t)
  }, [solo])

  // Bank the solo result once, the moment it lands.
  useEffect(() => {
    if (!solo?.over || soloPaid) return
    setSoloPaid(true)
    const pay = recordOptcgSolo(solo.winner === 'p1')
    if (solo.winner === 'p1') sfx.bigWin()
    else sfx.sad()
    if (pay > 0) sfx.gem()
  }, [solo, soloPaid, recordOptcgSolo])

  const startSolo = () => {
    const foeDeck = OPTCG_PRESETS.find((d) => d.id !== active.id) ?? OPTCG_PRESETS[0]
    setSoloPaid(false)
    setSolo(newMatch(active, foeDeck, 'You', 'The AI', Math.random() < 0.5 ? 'p1' : 'p2'))
    sfx.click()
  }

  if (solo) {
    const soloWonToday = data.optcg.soloDay === new Date().toISOString().slice(0, 10) ? data.optcg.soloWins : 0
    return (
      <div className="screen">
        <div className="board-tools">
          <button className="btn btn--small btn--ghost" onClick={() => setSolo(null)}>Leave</button>
          <span className="muted">
            vs the AI · {soloWonToday}/{OPTCG_SOLO_LIMIT} paid wins today (<BerryCoin /> {OPTCG_SOLO_REWARD})
          </span>
          {!solo.over && (
            <button className="btn btn--small btn--ghost" onClick={() => setSolo(resign(solo, 'p1'))}>Resign</button>
          )}
        </div>
        <OptcgBoard state={solo} mySide="p1" onState={setSolo} waiting={toAct(solo) !== 'p1'} />
      </div>
    )
  }

  if (live) {
    const mySide: OptcgSide = live.fromId === activeProfileId ? 'p1' : 'p2'
    return (
      <div className="screen">
        <div className="board-tools">
          <span className="muted">
            {live.fromEmoji} {live.fromName} vs {live.toEmoji} {live.toName} · winner takes <BerryCoin /> {OPTCG_REWARD}
          </span>
          <button className="btn btn--small btn--ghost" onClick={() => resignOptcgMatch(live.id)}>Resign</button>
        </div>
        <OptcgBoard
          state={live.state}
          mySide={mySide}
          onState={(next) => playOptcgMove(live.id, next)}
          waiting={toAct(live.state) !== mySide}
        />
      </div>
    )
  }

  return (
    <div className="screen">
      <h2>Card Game</h2>
      <div className="card">
        <b>Your deck:</b> {active.name}{' '}
        <span className="muted">
          ({card(active.leader).name}, {active.cards.length} cards)
        </span>
        <div className="optcg-deckpick">
          {decks.map((d) => (
            <DeckChip key={d.id} deck={d} on={d.id === active.id} />
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Practice</h3>
        <p className="muted">
          The AI plays the other starter deck. The first {OPTCG_SOLO_LIMIT} wins each day pay <BerryCoin /> {OPTCG_SOLO_REWARD}.
        </p>
        <button className="btn" onClick={startSolo}>Play the AI</button>
      </div>

      <div className="card">
        <h3>Head to head</h3>
        {call ? (
          <>
            <p>
              {call.fromEmoji} {call.fromName} challenged you.
            </p>
            <button className="btn" onClick={() => answerOptcgChallenge(call.id, active)}>Accept with {active.name}</button>{' '}
            <button className="btn btn--ghost" onClick={() => answerOptcgChallenge(call.id, null)}>Decline</button>
          </>
        ) : sent ? (
          <>
            <p className="muted">Waiting for {sent.toName} to answer…</p>
            <button className="btn btn--ghost" onClick={() => cancelOptcgMatch(sent.id)}>Withdraw</button>
          </>
        ) : (
          <>
            <p className="muted">Winner takes <BerryCoin /> {OPTCG_REWARD}. One game at a time.</p>
            <button className="btn" disabled={!mate} onClick={() => challengeOptcg(active)}>
              Challenge {mate?.name ?? 'your crewmate'}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <b>Record:</b> {data.optcg.wins}W – {data.optcg.losses}L
      </div>
    </div>
  )
}

function DeckChip({ deck, on }: { deck: OptcgDeck; on: boolean }) {
  const setOptcgDeck = useStore((s) => s.setOptcgDeck)
  return (
    <button className={`chip${on ? ' chip--on' : ''}`} onClick={() => { sfx.click(); setOptcgDeck(deck.id) }}>
      {deck.name}
    </button>
  )
}

// --- deckbuilder ------------------------------------------------------------------

const COLORS = ['red', 'green', 'blue', 'purple', 'black', 'yellow']

function DeckTab() {
  const data = useStore((s) => s.data)
  const saveOptcgDeck = useStore((s) => s.saveOptcgDeck)
  const deleteOptcgDeck = useStore((s) => s.deleteOptcgDeck)

  const [editing, setEditing] = useState<OptcgDeck | null>(null)
  const [search, setSearch] = useState('')
  const [set, setSet] = useState('')

  if (!editing) {
    return (
      <div className="screen">
        <h2>Decks</h2>
        <p className="muted">
          {DECK_SIZE} cards plus a Leader, at most {MAX_COPIES} copies of a card, and every card must share a colour with
          your Leader.
        </p>
        {OPTCG_PRESETS.map((d) => (
          <div key={d.id} className="card optcg-deckrow">
            <OptcgCardImg code={d.leader} size="xs" />
            <div>
              <b>{d.name}</b> <span className="muted">starter deck — the AI knows this one</span>
            </div>
            <button className="btn btn--small btn--ghost" onClick={() => setEditing({ ...d, id: `deck-${Date.now()}`, name: `${d.name} copy` })}>
              Copy &amp; edit
            </button>
          </div>
        ))}
        {data.optcg.decks.map((d) => (
          <div key={d.id} className="card optcg-decrow">
            <OptcgCardImg code={d.leader} size="xs" />
            <div>
              <b>{d.name}</b>{' '}
              <span className="muted">
                {d.cards.length}/{DECK_SIZE}
                {deckProblems(d).length ? ' · not legal yet' : ' · ready'}
              </span>
            </div>
            <button className="btn btn--small" onClick={() => setEditing(d)}>Edit</button>{' '}
            <button className="btn btn--small btn--ghost" onClick={() => deleteOptcgDeck(d.id)}>Delete</button>
          </div>
        ))}
        <button
          className="btn"
          onClick={() => setEditing({ id: `deck-${Date.now()}`, name: 'New deck', leader: '', cards: [] })}
        >
          Build a new deck
        </button>
      </div>
    )
  }

  const leader = cardByCode(editing.leader)
  const counts = new Map<string, number>()
  for (const code of editing.cards) counts.set(code, (counts.get(code) ?? 0) + 1)
  const problems = deckProblems(editing)

  const pool = OPTCG_CARDS.filter((c) => {
    if (!leader) return c.kind === 'leader'
    if (c.kind === 'leader') return false
    if (!c.colors.some((col) => leader.colors.includes(col))) return false
    if (set && !c.code.startsWith(`${set}-`)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.name.toLowerCase().includes(q) && !c.types.join(' ').toLowerCase().includes(q) && !c.code.toLowerCase().includes(q))
        return false
    }
    return true
  }).slice(0, 120)

  const add = (code: string) => {
    const c = card(code)
    if (c.kind === 'leader') { setEditing({ ...editing, leader: code, cards: [] }); return }
    if ((counts.get(code) ?? 0) >= MAX_COPIES || editing.cards.length >= DECK_SIZE) return
    setEditing({ ...editing, cards: [...editing.cards, code] })
  }
  const remove = (code: string) => {
    const i = editing.cards.lastIndexOf(code)
    if (i < 0) return
    const next = [...editing.cards]
    next.splice(i, 1)
    setEditing({ ...editing, cards: next })
  }

  return (
    <div className="screen">
      <div className="board-tools">
        <button className="btn btn--small btn--ghost" onClick={() => setEditing(null)}>Back</button>
        <input
          className="optcg-input"
          value={editing.name}
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          aria-label="Deck name"
        />
        <button
          className="btn btn--small"
          disabled={problems.length > 0}
          onClick={() => { saveOptcgDeck(editing); setEditing(null) }}
        >
          Save
        </button>
      </div>

      <div className="card">
        <b>{editing.cards.length}/{DECK_SIZE}</b>{' '}
        {leader ? (
          <span className="muted">Leader: {leader.name} ({leader.colors.join('/')}, {leader.life} Life)</span>
        ) : (
          <span className="muted">Pick a Leader first.</span>
        )}
        {problems.slice(0, 3).map((p) => (
          <div key={p} className="muted">⚠️ {p}</div>
        ))}
      </div>

      {leader && (
        <div className="optcg-pool">
          {[...counts.entries()].map(([code, n]) => (
            <div key={code} className="optcg-poolcard">
              <OptcgCardImg code={code} size="xs" onClick={() => remove(code)} />
              <span className="optcg-count">×{n}</span>
            </div>
          ))}
        </div>
      )}

      <div className="board-tools">
        <input
          className="optcg-input"
          placeholder="Search name, type or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="optcg-input" value={set} onChange={(e) => setSet(e.target.value)}>
          <option value="">All sets</option>
          {OPTCG_SETS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {!leader && (
        <p className="muted">
          Leaders only, for now — the colours you pick here decide what the rest of the deck may hold.
          {COLORS.length ? '' : ''}
        </p>
      )}

      <div className="optcg-pool">
        {pool.map((c) => (
          <div key={c.code} className="optcg-poolcard">
            <OptcgCardImg code={c.code} size="xs" onClick={() => add(c.code)} />
            <span className="optcg-count">
              {counts.get(c.code) ? `×${counts.get(c.code)}` : c.kind === 'leader' ? 'L' : c.cost}
              {isScripted(c.code) ? ' ⚙️' : ''}
            </span>
          </div>
        ))}
      </div>
      <p className="muted">
        ⚙️ marks a card whose text the game plays for you. Anything else still shows its text and is honoured by the
        players — the way a table does with a card nobody has memorised.
      </p>
    </div>
  )
}

// --- rules ---------------------------------------------------------------------

function RulesTab() {
  return (
    <div className="screen rules">
      <h2>How to play</h2>
      <ol>
        <li><b>Goal.</b> Knock out the other Leader. Every hit takes one Life card; a hit with no Life left ends it.</li>
        <li><b>Your turn.</b> Everything stands up, you draw a card, and you get 2 DON!! (1 on the very first turn).</li>
        <li><b>DON!!</b> Rest them to pay for cards, or GIVE one to your Leader or a Character for +1000 power until the end of your turn.</li>
        <li><b>Attacking.</b> Tap an active card, then their Leader or a <i>rested</i> Character. Cards played this turn can't attack unless they have [Rush].</li>
        <li><b>Defending.</b> A [Blocker] can jump in front, then you may play Counter cards from your hand. Higher power wins; ties go to the attacker.</li>
      </ol>
      <p className="muted">
        Deck: a Leader plus {DECK_SIZE} cards, max {MAX_COPIES} of any card, all sharing a colour with your Leader.
      </p>
      <p className="muted">
        Card art comes from public mirrors of the official card list — nothing is stored on this app's server.
      </p>
    </div>
  )
}
