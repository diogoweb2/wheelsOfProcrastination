// The One Piece Album — the second collection (§14b): every card printed for the
// ONE PIECE Card Game, collected exactly the way the Grand Line sticker album
// is collected.
//
// **The rules are not re-implemented here.** Packs, spares, the 1-red-is-worth-
// 2-whites swap and the pack ceremony all come out of logic/collections.ts and
// the shared components; this screen is the binder's own presentation, and the
// one thing it presents differently is browsing: 2 665 cards will not fit on a
// page the way 200 stickers do, so the shelf is one SET at a time.
//
// Loaded lazily by the router: the card catalog behind `CARD_BINDER` is about a
// megabyte, and nobody who never opens the binder should download it.
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { CARD_BINDER, CARD_PACK_COST, binderItem } from '../logic/cardBinder'
import { card } from '../logic/optcg'
// The album-state helpers work on either collection — both slices are the same
// shape — so they come from the album, and the pile-specific rules from the kit.
import { awaitsAnswer, freePackReady, packCredits } from '../logic/album'
import {
  gemHintIn,
  offerValueIn,
  ownsIn,
  progressIn,
  rollPackIn,
  spareCountIn,
  tradeableIn,
  type CollectItem,
  type CollectRarity,
} from '../logic/collections'
import { dayKey } from '../logic/dates'
import { AlbumRace } from '../components/AlbumRace'
import { Sticker, type CardFace } from '../components/Sticker'
import { StickerDetail } from '../components/StickerDetail'
import { PackOpening } from '../components/PackOpening'
import { TradeOffer } from '../components/TradeOffer'
import { BerryCoin } from '../components/BerryCoin'
import { sfx } from '../audio'

const KIT = CARD_BINDER
const rarityOf = (id: string): CollectRarity => binderItem(id)?.rarity ?? 'common'
/** What the card actually does — the scans' own text box is blank (§15g). */
const cardText = (id: string) => {
  const c = card(id)
  const head = [c.kind === 'leader' ? `Leader · ${c.life} Life` : `Cost ${c.cost}`, c.power ? `${c.power} power` : '', c.counter ? `Counter +${c.counter}` : '']
    .filter(Boolean)
    .join(' · ')
  return [head, c.effect].filter(Boolean).join('\n')
}

const setNameOf = (id: string) => KIT.groups.find((g) => g.id === binderItem(id)?.group)?.name ?? ''

/** Tap-to-zoom plumbing, same as the album's: remember the card and its rect. */
function useCardZoom() {
  const [item, setItem] = useState<CardFace | null>(null)
  const [origin, setOrigin] = useState<DOMRect | null>(null)
  return {
    item,
    origin,
    open(s: CardFace, e: React.MouseEvent<HTMLElement>) {
      sfx.click()
      setOrigin(e.currentTarget.getBoundingClientRect())
      setItem(s)
    },
    close: () => setItem(null),
  }
}

export function CardBinderScreen({ tab }: { tab: string }) {
  const data = useStore((s) => s.data)
  const mateData = useStore((s) => s.mateData)
  const progress = progressIn(KIT, data.cards)
  return (
    <div className="screen">
      <div className="h1" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        🎴 One Piece Album
      </div>
      <p className="muted" style={{ marginBottom: 10 }}>
        Every card in the ONE PIECE Card Game — collect them all, trade the spares.
      </p>

      {/* The same head-to-head race the sticker album runs (§15b), over this
          pile: the question a collector actually asks is not "how far am I?"
          but "am I ahead?". */}
      <AlbumRace
        mine={progress}
        theirs={mateData ? progressIn(KIT, mateData.cards) : null}
        noun="card"
        scope="binder"
      />

      <div style={{ height: 14 }} />
      {tab === 'binder' && <BinderTab zoomKey="binder" />}
      {tab === 'packs' && <PacksTab />}
      {tab === 'trade' && <TradeTab />}
    </div>
  )
}

// --- the shelves ----------------------------------------------------------------

function BinderTab({ zoomKey }: { zoomKey: string }) {
  const data = useStore((s) => s.data)
  const mateData = useStore((s) => s.mateData)
  const profiles = useStore((s) => s.profiles)
  const activeProfileId = useStore((s) => s.activeProfileId)
  const zoom = useCardZoom()
  const mine = data.cards
  const theirs = mateData?.cards ?? null
  const mateName = profiles.find((p) => p.id !== activeProfileId)?.name ?? 'your crewmate'

  const [set, setSet] = useState(KIT.groups[0]?.id ?? '')
  const [missingOnly, setMissingOnly] = useState(false)
  /**
   * `set` walks the binder shelf by shelf — the printed sets, gaps and all.
   * `mine` is the other question a collector asks: *what have I actually got?*
   * — every card owned, across every set, on one page.
   */
  const [view, setView] = useState<'sets' | 'mine'>('sets')

  // One set at a time, on purpose: the whole catalog on one page is thousands of
  // hotlinked images, and no phone renders that twice. "My collection" is safe
  // for the same reason — it only ever draws the cards actually owned.
  const shelf = useMemo(() => KIT.items.filter((i) => i.group === set), [set])
  const shown = missingOnly ? shelf.filter((i) => !ownsIn(mine, i.id)) : shelf
  const got = shelf.filter((i) => ownsIn(mine, i.id)).length
  const owned = useMemo(() => KIT.items.filter((i) => ownsIn(mine, i.id)), [mine])

  return (
    <>
      {zoom.item && (
        <StickerDetail
          key={zoomKey}
          sticker={zoom.item}
          album={mine}
          mateAlbum={theirs}
          mateName={mateName}
          shelf={setNameOf(zoom.item.id)}
          note={cardText(zoom.item.id)}
          origin={zoom.origin}
          onClose={zoom.close}
        />
      )}

      <div className="board-tools">
        <button
          className={`chip${view === 'sets' ? ' chip--on' : ''}`}
          onClick={() => { sfx.click(); setView('sets') }}
        >
          📚 By set
        </button>
        <button
          className={`chip${view === 'mine' ? ' chip--on' : ''}`}
          onClick={() => { sfx.click(); setView('mine') }}
        >
          🎴 My collection ({owned.length})
        </button>
      </div>

      {view === 'mine' ? (
        <div className="album-crew">
          <div className="album-crew-head">
            <span className="album-crew-name">Every card you own</span>
            <span className="album-crew-count">{owned.length}</span>
          </div>
          {owned.length === 0 ? (
            <p className="muted">Nothing yet — open a pack.</p>
          ) : (
            <div className="album-grid">
              {owned.map((item) => (
                <Sticker
                  key={item.id}
                  sticker={item}
                  count={mine.counts[item.id] ?? 0}
                  size="sm"
                  onClick={(e) => zoom.open(item, e)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
      <div className="board-tools">
        <select className="optcg-input" value={set} onChange={(e) => setSet(e.target.value)}>
          {KIT.groups.map((g) => {
            const items = KIT.items.filter((i) => i.group === g.id)
            const owned = items.filter((i) => ownsIn(mine, i.id)).length
            return (
              <option key={g.id} value={g.id}>
                {g.name} — {owned}/{items.length}
              </option>
            )
          })}
        </select>
        <button
          className={`chip${missingOnly ? ' chip--on' : ''}`}
          onClick={() => { sfx.click(); setMissingOnly(!missingOnly) }}
        >
          {missingOnly ? '👀 Missing only' : 'Show all'}
        </button>
      </div>

      <div className="album-crew">
        <div className="album-crew-head">
          <span className="album-crew-name">{KIT.groups.find((g) => g.id === set)?.name ?? set}</span>
          <span className={`album-crew-count ${got === shelf.length ? 'is-done' : ''}`}>
            {got === shelf.length ? '★ COMPLETE' : `${got}/${shelf.length}`}
          </span>
        </div>
        <div className="album-grid">
          {shown.map((item) => {
            const n = mine.counts[item.id] ?? 0
            const mateHas = n === 0 && theirs ? spareCountIn(theirs, item.id) > 0 : false
            return (
              <Sticker
                key={item.id}
                sticker={item}
                state={n > 0 ? 'owned' : 'missing'}
                count={n}
                size="sm"
                badge={mateHas ? '🤝' : undefined}
                onClick={(e) => zoom.open(item, e)}
              />
            )
          })}
        </div>
        {shown.length === 0 && <p className="muted">Nothing missing here — this set is done. 🏆</p>}
      </div>
        </>
      )}
    </>
  )
}

// --- packs -------------------------------------------------------------------------

function PacksTab() {
  const data = useStore((s) => s.data)
  const openPack = useStore((s) => s.openPack)
  const [drawn, setDrawn] = useState<string[] | null>(null)
  const [ownedBefore, setOwnedBefore] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)

  const binder = data.cards
  const today = dayKey()
  const freeReady = freePackReady(binder, today)
  const canBuy = data.economy.gems >= CARD_PACK_COST
  const traded = packCredits(binder)
  const complete = progressIn(KIT, binder).pct === 100

  function open(kind: 'free' | 'buy' | 'credit') {
    setOwnedBefore(new Set(KIT.items.filter((i) => ownsIn(binder, i.id)).map((i) => i.id)))
    // The screen rolls the pack because it is the side that has the catalog;
    // the store checks the price and applies the draw. See `openPack`.
    const result = openPack(kind, 'cards', (album) => rollPackIn(KIT, album), CARD_PACK_COST)
    if (result === 'broke') {
      sfx.error()
      setMsg(`Not enough Berries. A pack runs ${CARD_PACK_COST} 🪙.`)
    } else if (result === 'used') {
      sfx.error()
      setMsg('You already claimed today’s free pack. Come back tomorrow!')
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
          lookup={binderItem}
          note={(id) => cardText(id)}
          onDone={() => setDrawn(null)}
        />
      )}

      <div className="pack-shop">
        <div className={`pack-card ${freeReady ? 'is-ready' : 'is-spent'}`}>
          <div className="pack-card-art">🎁</div>
          <div className="pack-card-body">
            <div className="pack-card-title">Daily Delivery</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {freeReady ? 'A free booster from the News Coo — one per day.' : 'Already claimed. New pack tomorrow!'}
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
              <div className="pack-card-title">Traded Pack{traded > 1 ? ` ×${traded}` : ''}</div>
              <div className="muted" style={{ fontSize: 12 }}>Won in a swap — still sealed.</div>
            </div>
            <button className="btn btn--small" onClick={() => { sfx.click(); open('credit') }}>Open</button>
          </div>
        )}

        <div className="pack-card is-ready">
          <div className="pack-card-art">📦</div>
          <div className="pack-card-body">
            <div className="pack-card-title">Booster Pack</div>
            <div className="muted" style={{ fontSize: 12 }}>
              7 cards · a rare shows up ~1 in 4 packs
            </div>
          </div>
          <button className="btn btn--small" disabled={!canBuy} onClick={() => { sfx.click(); open('buy') }}>
            <BerryCoin size={14} /> {CARD_PACK_COST}
          </button>
        </div>
      </div>

      {msg && <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>{msg}</p>}
      {complete && (
        <p style={{ marginTop: 14, textAlign: 'center', fontWeight: 900 }}>
          🏆 Every card in the game — nobody has a binder like yours.
        </p>
      )}
      <p className="muted" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
        Packs opened: {binder.packsOpened}
      </p>
    </>
  )
}

// --- swaps -------------------------------------------------------------------------

function TradeTab() {
  const data = useStore((s) => s.data)
  const mateData = useStore((s) => s.mateData)
  const cardTrades = useStore((s) => s.cardTrades)
  const profiles = useStore((s) => s.profiles)
  const activeProfileId = useStore((s) => s.activeProfileId)
  const proposeTrade = useStore((s) => s.proposeTrade)
  const answerTrade = useStore((s) => s.answerTrade)
  const counterTrade = useStore((s) => s.counterTrade)
  const cancelTrade = useStore((s) => s.cancelTrade)

  const [give, setGive] = useState<string[]>([])
  const [want, setWant] = useState<string[]>([])
  const [gems, setGems] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const zoom = useCardZoom()

  const mine = data.cards
  const theirs = mateData?.cards ?? null
  const mate = profiles.find((p) => p.id !== activeProfileId)
  const mateName = mate?.name ?? 'your crewmate'

  const iCanHelp = theirs ? tradeableIn(KIT, mine, theirs) : []
  const theyCanHelp = theirs ? tradeableIn(KIT, theirs, mine) : []

  const myTurn = cardTrades.filter((t) => awaitsAnswer(t, activeProfileId))
  const theirTurn = cardTrades.filter(
    (t) =>
      t.status === 'pending' &&
      !awaitsAnswer(t, activeProfileId) &&
      (t.fromId === activeProfileId || t.toId === activeProfileId),
  )

  const giveVal = offerValueIn(rarityOf, give)
  const wantVal = offerValueIn(rarityOf, want)
  const balanced = give.length > 0 && want.length > 0 && giveVal === wantVal
  const canSend = want.length > 0 && (give.length > 0 || gems > 0) && (gems > 0 || balanced)
  const hint = gemHintIn(rarityOf, KIT.gemsPerPoint, want)

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    sfx.click()
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  function send() {
    const result = proposeTrade(give, want, { gems, col: 'cards' })
    if (result === 'ok') {
      sfx.fanfare()
      setGive([])
      setWant([])
      setGems(0)
      setMsg(`Offer sent to ${mateName}! 🕊️`)
      return
    }
    sfx.error()
    setMsg(
      result === 'unbalanced'
        ? 'Card for card, both sides must weigh the same — a rare counts as two commons. Or throw in Berries instead.'
        : result === 'empty'
          ? 'Pick what you want, and put something up for it.'
          : result === 'broke'
            ? 'You don’t have that many Berries.'
            : 'You already have an offer on the table. Withdraw it first.',
    )
  }

  if (!theirs) {
    return <p className="muted" style={{ textAlign: 'center', marginTop: 20 }}>Finding {mateName}’s binder…</p>
  }

  return (
    <>
      {zoom.item && (
        <StickerDetail
          sticker={zoom.item}
          album={mine}
          mateAlbum={theirs}
          mateName={mateName}
          shelf={setNameOf(zoom.item.id)}
          note={cardText(zoom.item.id)}
          origin={zoom.origin}
          onClose={zoom.close}
        />
      )}

      {[...myTurn, ...theirTurn].map((t) => (
        <TradeOffer
          key={t.id}
          trade={t}
          viewerId={activeProfileId}
          myPurse={data.economy.gems}
          matePurse={mateData?.economy.gems ?? null}
          payerPackReady={
            t.fromId === activeProfileId ? freePackReady(mine, dayKey()) : freePackReady(theirs, dayKey())
          }
          lookup={binderItem}
          onAccept={() => { sfx.bigWin(); answerTrade(t.id, true, 'cards') }}
          onDecline={() => { sfx.sad(); answerTrade(t.id, false, 'cards') }}
          onCounter={(amount) => {
            const r = counterTrade(t.id, amount, 'cards')
            if (r === 'ok') { sfx.gem(); setMsg('Counter sent — the ball’s in their court. 💰') }
            else sfx.error()
            return r
          }}
          onCancel={t.fromId === activeProfileId ? () => { sfx.click(); cancelTrade(t.id, 'cards') } : undefined}
          onPeek={zoom.open}
        />
      ))}

      <div className="card">
        <b>You put up</b>{' '}
        <span className="muted">
          spares {mateName} still needs ({iCanHelp.length} of them) · worth {giveVal}
        </span>
        <TradePicker items={iCanHelp} chosen={give} counts={mine} onPick={(id) => toggle(give, setGive, id)} onPeek={zoom.open} />
        <div className="trade-gems">
          <BerryCoin size={14} /> Berries on top:{' '}
          <input
            className="optcg-input"
            type="number"
            min={0}
            max={data.economy.gems}
            value={gems}
            onChange={(e) => setGems(Math.max(0, Math.min(data.economy.gems, Number(e.target.value) || 0)))}
          />
        </div>
      </div>

      <div className="card">
        <b>You want</b>{' '}
        <span className="muted">
          their spares you are missing ({theyCanHelp.length}) · worth {wantVal} · about {hint} 🪙
        </span>
        <TradePicker items={theyCanHelp} chosen={want} counts={theirs} onPick={(id) => toggle(want, setWant, id)} onPeek={zoom.open} />
      </div>

      <button className="btn" disabled={!canSend} onClick={send}>🤝 Send the offer</button>
      {msg && <p className="muted" style={{ marginTop: 10 }}>{msg}</p>}
    </>
  )
}

/** A row of pickable cards. Tap picks, hold peeks — same gesture as the album. */
function TradePicker({
  items,
  chosen,
  counts,
  onPick,
  onPeek,
}: {
  items: CollectItem[]
  chosen: string[]
  counts: { counts: Record<string, number> }
  onPick: (id: string) => void
  onPeek: (s: CardFace, e: React.MouseEvent<HTMLElement>) => void
}) {
  if (items.length === 0) return <p className="muted">Nothing here yet — open a few more packs.</p>
  return (
    <div className="album-grid" style={{ marginTop: 8 }}>
      {items.slice(0, 60).map((item) => (
        <Sticker
          key={item.id}
          sticker={item}
          size="sm"
          count={spareCountIn(counts, item.id) + 1}
          selected={chosen.includes(item.id)}
          onClick={() => onPick(item.id)}
          onLongPress={(e) => onPeek(item, e)}
        />
      ))}
    </div>
  )
}
