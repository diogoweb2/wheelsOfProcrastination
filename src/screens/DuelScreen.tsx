import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID, KID_ID } from '../store/storage'
import {
  AI_OPPONENTS,
  CARD_ARCHETYPES,
  CARD_ELEMENTS,
  DECK_SIZE,
  DUEL_REWARD,
  KOS_TO_WIN,
  SOLO_REWARD,
  SOLO_REWARD_LIMIT,
  STORM_TURN,
  aiDeck,
  aiMove,
  applyMove,
  autoDeck,
  battleReady,
  deckReady,
  elementInfo,
  startDuel,
  statsFor,
  type AiOpponent,
  type DuelState,
} from '../logic/cardGame'
import { CHEST_SIZE, DICE_FACES, TREASURES, type TreasureRarity } from '../logic/treasures'
import { BattleCard } from '../components/BattleCard'
import { DuelArena } from '../components/DuelArena'
import { TreasureChest } from '../components/TreasureChest'
import { VictoryParty } from '../components/VictoryParty'
import { BerryCoin } from '../components/BerryCoin'
import { duelSfx, sfx } from '../audio'

/** How long the AI "thinks" before playing — long enough to read what it did. */
const AI_DELAY = 950
/** Longer, after it revealed a treasure card or a dice roll: that has text to read. */
const AI_REVEAL_DELAY = 2500

// Which finished boards this device has already shown, and which chests it has
// already opened. Per-device on purpose: it's about what the person looking at
// THIS phone has seen, not shared state.
const seenKey = (kind: string, viewer: string | null, duelId: string) => `wop-duel-${kind}:${viewer ?? 'guest'}:${duelId}`
const boardSeen = (viewer: string | null, duelId: string) => Boolean(localStorage.getItem(seenKey('seen', viewer, duelId)))
const markBoardSeen = (viewer: string | null, duelId: string) => localStorage.setItem(seenKey('seen', viewer, duelId), '1')
const chestSeen = (viewer: string | null, duelId: string) => Boolean(localStorage.getItem(seenKey('chest', viewer, duelId)))
const markChestSeen = (viewer: string | null, duelId: string) => localStorage.setItem(seenKey('chest', viewer, duelId), '1')

/**
 * The line-up this profile takes into a fight: their saved deck, minus anything
 * traded away since, topped up with their best remaining cards. So there is
 * always a legal team the moment they own DECK_SIZE cards.
 */
function useDeck() {
  const { data, saveDuelDeck } = useStore()
  const owned = useMemo(() => battleReady(data.album.counts), [data.album.counts])
  const saved = data.duel.deck.filter((id) => owned.includes(id))
  const deck = useMemo(
    () => (deckReady(saved) ? saved : autoDeck(data.album.counts, saved)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saved.join('|'), owned.length],
  )
  return { owned, deck, saveDuelDeck, enough: owned.length >= DECK_SIZE }
}

export function DuelScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      <div className="h1">⚔️ Davy Back Fight</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Your album cards, in a real fight. Knock out {KOS_TO_WIN} of theirs and the Berries are yours.
      </p>
      {tab === 'fight' && <FightTab />}
      {tab === 'deck' && <DeckTab />}
      {tab === 'rules' && <RulesTab />}
    </div>
  )
}

// --- fight ------------------------------------------------------------------

function FightTab() {
  const {
    data, duels, activeProfileId, profiles,
    challengeDuel, answerChallenge, playDuelMove, resignDuel, cancelDuel, recordSoloResult,
  } = useStore()
  const { deck, enough } = useDeck()
  const [solo, setSolo] = useState<{ state: DuelState; foe: AiOpponent } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [party, setParty] = useState<string | null>(null)
  /** The chest ceremony, when a match is fresh and this device hasn't opened it. */
  const [chest, setChest] = useState<string[] | null>(null)

  const mateId = activeProfileId === PARENT_ID ? KID_ID : PARENT_ID
  const mateName = profiles.find((p) => p.id === mateId)?.name ?? 'your crewmate'

  // A finished board stays up until it's been read — otherwise the winning blow
  // lands and the arena simply vanishes, which is the one moment you actually
  // want to look at. Kept per-device (the same pattern as the album's victory
  // party) so it doesn't cost a Firestore write.
  const [dismissed, setDismissed] = useState<string[]>([])
  const board = duels.find(
    (d) =>
      d.state &&
      (d.fromId === activeProfileId || d.toId === activeProfileId) &&
      (d.status === 'active' ||
        (d.status === 'finished' && !dismissed.includes(d.id) && !boardSeen(activeProfileId, d.id))),
  )
  const incoming = duels.find((d) => d.status === 'pending' && d.toId === activeProfileId)
  const outgoing = duels.find((d) => d.status === 'pending' && d.fromId === activeProfileId)
  const settled = duels
    .filter((d) => d.status === 'finished' && (d.fromId === activeProfileId || d.toId === activeProfileId))
    .slice(-3)
    .reverse()

  // the transponder snail rings once when a challenge lands
  const rung = useRef<string | null>(null)
  useEffect(() => {
    if (incoming && rung.current !== incoming.id) {
      rung.current = incoming.id
      duelSfx.challenge()
    }
  }, [incoming?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- solo: the AI answers on a timer once it's its turn.
  //
  // Keyed on `seq`, NOT on the turn counter: a treasure or a dice roll is a free
  // move that changes neither whose turn it is nor the turn number, so watching
  // those left the opponent frozen mid-turn the moment it played one.
  const banked = useRef(false)
  useEffect(() => {
    if (!solo || solo.state.over || solo.state.turn !== 1) return
    // hold longer after a reveal, so there's time to read the card it played
    const lastEntry = solo.state.log[solo.state.log.length - 1]
    const revealed = Boolean(lastEntry?.treasureId) || lastEntry?.diceFace !== undefined
    const t = window.setTimeout(() => {
      setSolo((cur) => {
        if (!cur || cur.state.over || cur.state.turn !== 1) return cur
        const next = applyMove(cur.state, aiMove(cur.state))
        // A move the engine refuses would leave `seq` untouched and strand the
        // turn here for good; focus is always legal, so it can always continue.
        return { ...cur, state: next === cur.state ? applyMove(cur.state, { kind: 'focus' }) : next }
      })
    }, revealed ? AI_REVEAL_DELAY : AI_DELAY)
    return () => window.clearTimeout(t)
  }, [solo?.state.seq, solo?.state.over]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!solo?.state.over || banked.current) return
    banked.current = true
    const won = solo.state.winnerId === activeProfileId
    const paid = recordSoloResult(won)
    setMsg(
      won
        ? paid > 0
          ? `Beat the ${solo.foe.name}! +${paid} Berries.`
          : `Beat the ${solo.foe.name}! (No Berries left today — first ${SOLO_REWARD_LIMIT} wins a day pay out.)`
        : `The ${solo.foe.name} took that one. Try a different line-up!`,
    )
  }, [solo?.state.over]) // eslint-disable-line react-hooks/exhaustive-deps

  // An online duel opens its chest the first time this device sees the board.
  useEffect(() => {
    if (!board?.state || board.status !== 'active' || chestSeen(activeProfileId, board.id)) return
    const mine = board.state.sides.find((s) => s.profileId === activeProfileId)
    if (!mine) return
    markChestSeen(activeProfileId, board.id)
    setChest(mine.hand)
  }, [board?.id, board?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  function startSolo(foe: AiOpponent) {
    banked.current = false
    setMsg(null)
    sfx.fanfare()
    const state = startDuel(
      { profileId: activeProfileId ?? 'me', name: 'You', emoji: '👒', deck },
      { profileId: `ai-${foe.id}`, name: foe.name, emoji: foe.emoji, deck: aiDeck(foe) },
      0,
    )
    setSolo({ foe, state })
    setChest(state.sides[0].hand)
  }

  if (!enough) {
    return (
      <p className="muted" style={{ textAlign: 'center', marginTop: 24, lineHeight: 1.5 }}>
        🃏 You need {DECK_SIZE} cards to field a crew — you have {battleReady(data.album.counts).length}.
        <br />
        Open a pack in the Log Book and come back!
      </p>
    )
  }

  // the chest sits over whatever board is underneath it
  const chestOverlay = chest ? <TreasureChest cards={chest} onDone={() => setChest(null)} /> : null

  // --- a solo match in progress owns the whole screen
  if (solo) {
    return (
      <>
        {chestOverlay}
        <DuelArena
          state={solo.state}
          myIndex={0}
          onMove={(m) => setSolo((cur) => (cur ? { ...cur, state: applyMove(cur.state, m) } : cur))}
          waitingFor={solo.foe.name}
          onResign={() =>
            setSolo((cur) =>
              cur
                ? {
                    ...cur,
                    state: {
                      ...cur.state,
                      over: true,
                      winnerId: cur.state.sides[1].profileId,
                      seq: cur.state.seq + 1,
                      log: [...cur.state.log, { by: '', text: `🏳️ You backed out. ${cur.foe.name} takes it.`, final: true }],
                    },
                  }
                : cur,
            )
          }
          onExit={() => setSolo(null)}
        />
        {msg && <p className="duel-msg">{msg}</p>}
      </>
    )
  }

  // --- a live (or just-finished) duel with the other crewmate owns it too
  if (board?.state) {
    const myIndex = board.state.sides.findIndex((s) => s.profileId === activeProfileId)
    const won = board.state.winnerId === activeProfileId
    return (
      <>
        {chestOverlay}
        <DuelArena
          state={board.state}
          myIndex={myIndex}
          onMove={(m) => playDuelMove(board.id, m)}
          waitingFor={board.state.sides[1 - myIndex]?.name}
          onResign={board.status === 'active' ? () => resignDuel(board.id) : undefined}
          onExit={() => {
            markBoardSeen(activeProfileId, board.id)
            setDismissed((ids) => [...ids, board.id])
            if (won) setParty(profiles.find((p) => p.id === activeProfileId)?.name ?? 'You')
          }}
        />
      </>
    )
  }

  return (
    <>
      {party && <VictoryParty name={party} emoji="🏴‍☠️" onDone={() => setParty(null)} />}

      {incoming && (
        <div className="duel-call">
          <div className="duel-call-head">
            📞 {incoming.fromName} is calling you out!
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Their crew of {DECK_SIZE} is picked. Accept and your saved deck takes the field — winner takes{' '}
            {DUEL_REWARD} Berries.
          </p>
          <div className="duel-call-actions">
            <button className="btn btn--ghost btn--small" onClick={() => { sfx.sad(); answerChallenge(incoming.id, false) }}>
              ✕ Not now
            </button>
            <button
              className="btn btn--small"
              onClick={() => {
                // answer the call in your front-liner's own voice
                const front = statsFor(deck[0])
                duelSfx.special(front.element, front.voice)
                answerChallenge(incoming.id, true, deck)
              }}
            >
              ⚔️ Fight!
            </button>
          </div>
        </div>
      )}

      {outgoing && (
        <div className="duel-call is-waiting">
          <div className="duel-call-head">⏳ Waiting on {outgoing.toName}…</div>
          <p className="muted" style={{ fontSize: 12 }}>They’ll get a snail call the next time they open the app.</p>
          <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); cancelDuel(outgoing.id) }}>
            Withdraw the challenge
          </button>
        </div>
      )}

      {!incoming && !outgoing && (
        <button
          className="duel-challenge"
          onClick={() => {
            const r = challengeDuel(deck)
            if (r === 'ok') { duelSfx.challenge(); setMsg(`Challenge sent to ${mateName}!`) }
            else { sfx.error(); setMsg(r === 'busy' ? 'There’s already a duel on the board.' : 'Pick a full crew first.') }
          }}
        >
          <span className="duel-challenge-icon">📞</span>
          <span>
            <b>Call out {mateName}</b>
            <em>Live duel, one phone each · winner takes {DUEL_REWARD} 🪙</em>
          </span>
        </button>
      )}

      <div className="duel-head">🏝️ Training hall</div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
        Practise any time. First {SOLO_REWARD_LIMIT} wins a day pay {SOLO_REWARD} Berries each.
      </p>
      {AI_OPPONENTS.map((foe) => (
        <button key={foe.id} className="duel-foe" onClick={() => startSolo(foe)}>
          <span className="duel-foe-icon">{foe.emoji}</span>
          <span>
            <b>{foe.name}</b>
            <em>{foe.blurb}</em>
          </span>
          <span className="duel-foe-go">▶</span>
        </button>
      ))}

      {msg && <p className="duel-msg">{msg}</p>}

      <div className="duel-record">
        <span>
          🏆 <b>{data.duel.wins}</b> wins
        </span>
        <span>
          ☠️ <b>{data.duel.losses}</b> losses
        </span>
      </div>

      {settled.length > 0 && (
        <>
          <div className="duel-head">📜 Recent duels</div>
          {settled.map((d) => (
            <div key={d.id} className="duel-log">
              <span>
                {d.fromName} vs {d.toName}
              </span>
              <span className={d.winnerId === activeProfileId ? 'is-win' : 'is-loss'}>
                {d.winnerId === activeProfileId ? '🏆 you won' : d.winnerId ? '☠️ you lost' : '⚖️ draw'}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  )
}

// --- deck -------------------------------------------------------------------

function DeckTab() {
  const { data, saveDuelDeck } = useStore()
  const { owned, deck, enough } = useDeck()
  const [picked, setPicked] = useState<string[]>(deck)
  const [peek, setPeek] = useState<string | null>(null)

  // keep the editor in step with a deck repaired after a trade
  useEffect(() => setPicked(deck), [deck.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    sfx.click()
    const next = picked.includes(id)
      ? picked.filter((x) => x !== id)
      : picked.length < DECK_SIZE
        ? [...picked, id]
        : picked
    setPicked(next)
    if (next.length === DECK_SIZE) saveDuelDeck(next)
  }

  if (!enough) {
    return (
      <p className="muted" style={{ textAlign: 'center', marginTop: 24 }}>
        Collect {DECK_SIZE} cards in the Log Book and your crew can set sail.
      </p>
    )
  }

  return (
    <>
      {peek && (
        <div className="arena-peek" onClick={() => setPeek(null)}>
          <BattleCard id={peek} size="full" />
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>tap anywhere to close</p>
        </div>
      )}

      <div className="duel-head">
        ⚔️ Your crew ({picked.length}/{DECK_SIZE})
        <button
          className="btn btn--ghost btn--small"
          onClick={() => { sfx.gem(); const best = autoDeck(data.album.counts); setPicked(best); saveDuelDeck(best) }}
        >
          Auto-pick
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
        First card is your front line — the rest wait on the bench. Tap to drop one.
      </p>
      <div className="deck-row">
        {Array.from({ length: DECK_SIZE }, (_, i) =>
          picked[i] ? (
            <BattleCard key={picked[i]} id={picked[i]} size="bench" index={i} onClick={() => toggle(picked[i])} />
          ) : (
            <div key={`slot-${i}`} className="deck-slot">
              {i === 0 ? 'FRONT' : i + 1}
            </div>
          ),
        )}
      </div>

      <div className="duel-head">🃏 Your cards ({owned.length})</div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
        Tap to add · hold a card to read it
      </p>
      <div className="deck-pool">
        {owned
          .slice()
          .sort((a, b) => statsFor(b).hp - statsFor(a).hp)
          .map((id) => (
            <BattleCard
              key={id}
              id={id}
              size="bench"
              selected={picked.includes(id)}
              onClick={() => toggle(id)}
              onLongPress={() => setPeek(id)}
            />
          ))}
      </div>
    </>
  )
}

// --- rules ------------------------------------------------------------------

function RulesTab() {
  return (
    <div className="rules">
      <ol className="rules-steps">
        <li>
          <b>Pick 4 cards</b> from your album. The first one is your <b>front line</b>; the other three wait on the
          bench.
        </li>
        <li>
          <b>Open your chest.</b> Every duel starts with {CHEST_SIZE} secret <b>treasure cards</b> — your opponent
          never sees them.
        </li>
        <li>
          <b>You get ⚡1 energy every turn</b> (up to 5). Attacks cost energy — the big ones need you to save up.
        </li>
        <li>
          <b>One action per turn:</b> tap an <b>attack</b>, tap a card on <b>your bench</b> to send it to the front, or{' '}
          <b>Focus</b> for +⚡ and 10 HP. <b>Plus one treasure card, free</b> — it doesn’t use your action.
        </li>
        <li>
          <b>Knock out {KOS_TO_WIN} of their cards and you win.</b> When a card falls, the next one steps up on its own.
        </li>
      </ol>

      <div className="duel-head">💎 Treasure cards</div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
        {TREASURES.length} of them, from little heals to bringing a fallen crewmate back. You draw {CHEST_SIZE} at the
        start and can play <b>one per turn for free</b> — so even a losing crew can turn a match around.
      </p>
      <div className="rules-types">
        {(['common', 'rare', 'epic', 'legendary'] as TreasureRarity[]).map((r) => {
          const sample = TREASURES.filter((t) => t.rarity === r)
          return (
            <div key={r} className={`rules-type rarity-${r}`}>
              <b>
                {r} · {sample.length} cards
              </b>
              <span>
                e.g. {sample[0].icon} <b style={{ color: 'inherit' }}>{sample[0].name}</b> — {sample[0].text}
              </span>
            </div>
          )
        })}
      </div>

      <div className="duel-head">🎲 The Davy Back Dice</div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
        When one more knockout would finish you, a <b>free roll</b> appears — once a match. There is no bad face:
      </p>
      <div className="ring">
        {DICE_FACES.map((f) => (
          <span key={f.pip} className="ring-el ring-el--storm">
            {f.pip} {f.name}
            <i>{f.text.replace(/[!.]$/, '')}</i>
          </span>
        ))}
      </div>

      <div className="duel-head">⛈️ The Grand Line storm</div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
        On turn {STORM_TURN} the sky opens and <b>every hit does double damage</b> — for both of you. No duel ever
        drags on.
      </p>

      <div className="duel-head">🔥 The weakness ring</div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
        Attack a card with the element that beats it and you do <b>double damage</b>. Each one beats the next:
      </p>
      <div className="ring">
        {CARD_ELEMENTS.map((e) => (
          <span key={e.id} className={`ring-el ring-el--${e.id}`}>
            {e.icon} {e.name}
            <i>→ {elementInfo(e.beats).icon}</i>
          </span>
        ))}
      </div>

      <div className="duel-head">🃏 The four kinds of pirate</div>
      <div className="rules-types">
        {CARD_ARCHETYPES.map((a) => (
          <div key={a.id} className="rules-type">
            <b>{a.label}</b>
            <span>{a.blurb}</span>
          </div>
        ))}
      </div>

      <div className="duel-head">💰 What you win</div>
      <ul className="rules-list">
        <li>
          Beat your crewmate in a live duel: <BerryCoin size={13} /> <b>{DUEL_REWARD} Berries</b>
        </li>
        <li>
          Beat a training-hall crew: <BerryCoin size={13} /> <b>{SOLO_REWARD} Berries</b> (first {SOLO_REWARD_LIMIT}{' '}
          wins each day)
        </li>
      </ul>
      <div className="duel-head">👆 On the board</div>
      <ul className="rules-list">
        <li>
          <b>Tapping a card never costs you a move</b> — it opens that card’s details: HP, both attacks, and what each
          one would hit for <b>right now</b>, against whoever is in front of you.
        </li>
        <li>
          <b>Swapping is a button</b> inside that sheet (🔄 Send … out). Your <b>bench</b> is the row of small cards
          under your fighter; the gold <b>SWAP ⚡</b> strip tells you what bringing one in would cost.
        </li>
        <li>
          A <b>Guardian</b> costs ⚡⚡ to pull back, a <b>Striker</b> only ⚡ — so heavy cards are harder to retreat once
          they’re out front.
        </li>
        <li>Their cards are open too: the sheet shows what their crew would hit you for.</li>
      </ul>
    </div>
  )
}
