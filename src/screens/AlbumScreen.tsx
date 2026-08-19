import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  ALL_STICKER_IDS,
  PACK_COST,
  STICKER_CATALOG,
  STICKER_CREWS,
  albumProgress,
  awaitsAnswer,
  freePackReady,
  gemHint,
  offerValue,
  offerWorth,
  ownsSticker,
  packCredits,
  spareCount,
  tradeGems,
  tradeableFor,
} from '../logic/album'
import { CARDS_PER_TEAM, TOTAL_WC_TEAMS } from '../logic/stickerCatalog.generated'
import { dayKey } from '../logic/dates'
import { Sticker, type CardFace } from '../components/Sticker'
import { GemStepper, TradeOffer } from '../components/TradeOffer'
import { StickerDetail } from '../components/StickerDetail'
import { PackOpening } from '../components/PackOpening'
import { VictoryParty } from '../components/VictoryParty'
import { BerryCoin } from '../components/BerryCoin'
import { sfx } from '../audio'

/**
 * Tap-to-zoom plumbing: remembers which sticker was tapped and the on-screen
 * rect of the thumbnail, so the detail view can grow out of that exact spot.
 */
function useStickerZoom() {
  const [sticker, setSticker] = useState<CardFace | null>(null)
  const [origin, setOrigin] = useState<DOMRect | null>(null)
  return {
    sticker,
    origin,
    open(s: CardFace, e: React.MouseEvent<HTMLElement>) {
      sfx.click()
      setOrigin(e.currentTarget.getBoundingClientRect())
      setSticker(s)
    },
    close: () => setSticker(null),
  }
}

/** The Sticker Album. `tab` comes from the app's bottom menu. */
export function AlbumScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      <div className="h1" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        🖼️ Sticker Album
      </div>
      <p className="muted" style={{ marginBottom: 10 }}>
        Every pirate on the seas — collect them all, trade the spares.
      </p>

      <AlbumRace />

      <div style={{ height: 14 }} />

      {tab === 'album' && <AlbumTab />}
      {tab === 'packs' && <PacksTab />}
      {tab === 'trade' && <TradeTab />}
    </div>
  )
}

// --- race ------------------------------------------------------------------

/**
 * Head-to-head album race: both crewmates run the same track, each riding their
 * own profile icon. Whoever is nearer the finish flag wears the crown.
 */
const RACE_MS = 1500

/**
 * Drives the start-of-race animation: 0 → 1 over RACE_MS on mount, so both
 * runners leave the starting line together every time the page opens.
 */
function useRaceIntro() {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setT(1)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / RACE_MS)
      setT(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return t
}

/** Ease-out so the runners burst off the line and settle into their spot. */
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)

/**
 * Per-device memory of which victory has already thrown its party. Keyed by
 * album size too: growing the catalog starts a new edition, so completing that
 * one is a fresh win and earns its own party.
 */
const partySeenKey = (viewerId: string, winnerId: string, total: number) =>
  `wop-party-seen:${viewerId}:${winnerId}:${total}`

function AlbumRace() {
  const { data, mateAlbum, profiles, activeProfileId } = useStore()
  const t = useRaceIntro()
  const racing = t < 1
  const [party, setParty] = useState<{ name: string; emoji: string } | null>(null)

  const me = profiles.find((p) => p.id === activeProfileId)
  const mate = profiles.find((p) => p.id !== activeProfileId)
  const mine = albumProgress(data.album)
  const theirs = mateAlbum ? albumProgress(mateAlbum) : null

  // Whoever glues in the last sticker wins the race — and the party.
  const winner =
    mine.pct === 100 && (!theirs || mine.owned >= theirs.owned)
      ? { id: activeProfileId ?? 'me', name: me?.name ?? 'You', emoji: me?.emoji ?? '👒' }
      : theirs?.pct === 100
        ? { id: mate?.id ?? 'mate', name: mate?.name ?? 'Crewmate', emoji: mate?.emoji ?? '🏴‍☠️' }
        : null

  // The party fires itself once per device, after the runners have settled.
  const viewer = activeProfileId ?? 'guest'
  useEffect(() => {
    if (!winner || racing) return
    const key = partySeenKey(viewer, winner.id, mine.total)
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    setParty({ name: winner.name, emoji: winner.emoji })
  }, [winner?.id, racing, viewer, mine.total]) // eslint-disable-line react-hooks/exhaustive-deps

  // the mate's world may not have landed yet — until it does, nobody leads
  const lead = theirs ? mine.owned - theirs.owned : null
  const runners = [
    { key: 'me', name: me?.name ?? 'You', emoji: me?.emoji ?? '👒', p: mine, lag: 0, crown: lead !== null && lead > 0 },
    { key: 'mate', name: mate?.name ?? 'Crewmate', emoji: mate?.emoji ?? '🏴‍☠️', p: theirs, lag: 0.12, crown: lead !== null && lead < 0 },
  ]

  let caption: string
  if (racing) caption = 'Ready… set… GO!'
  else if (lead === null) caption = `Waiting for ${mate?.name ?? 'your crewmate'}’s log book…`
  else if (lead === 0) caption = `Neck and neck — ${mine.owned} stickers each!`
  else {
    const ahead = lead > 0 ? me?.name ?? 'You' : mate?.name ?? 'Crewmate'
    const gap = Math.abs(lead)
    caption = `${ahead} leads by ${gap} sticker${gap === 1 ? '' : 's'}`
  }

  return (
    <div className="album-race">
      {party && <VictoryParty name={party.name} emoji={party.emoji} onDone={() => setParty(null)} />}

      <div className="album-race-head">
        <span>🏁 Race to {mine.total}</span>
        <span className="album-race-caption">{caption}</span>
      </div>

      {runners.map((r) => {
        // each lane runs its own clock so the two icons don't move in lockstep
        const laneT = easeOut(Math.max(0, Math.min(1, (t - r.lag) / (1 - r.lag))))
        const at = (r.p?.pct ?? 0) * laneT
        return (
          <div
            key={r.key}
            className={`race-lane ${!racing && r.crown ? 'is-leading' : ''} ${racing ? 'is-racing' : ''}`}
          >
            <div className="race-lane-top">
              <span className="race-name">
                {!racing && r.crown && <span className="race-crown">👑</span>}
                {r.name}
              </span>
              <span className="race-count">
                {r.p ? `${Math.round(r.p.owned * laneT)} / ${r.p.total} · ${Math.round(r.p.pct * laneT)}%` : '— / —'}
              </span>
            </div>
            <div className="race-track">
              <div className="race-fill" style={{ width: `${at}%` }} />
              <div className="race-runner" style={{ left: `${at}%` }}>
                {r.emoji}
              </div>
            </div>
          </div>
        )
      })}

      {winner && (
        <button
          className="party-replay"
          onClick={() => { sfx.click(); setParty({ name: winner.name, emoji: winner.emoji }) }}
        >
          🎉 Replay victory party
        </button>
      )}
    </div>
  )
}

// --- album ------------------------------------------------------------------

function AlbumTab() {
  const { data, mateAlbum, profiles, activeProfileId } = useStore()
  const album = data.album
  const zoom = useStickerZoom()
  const mateName = profiles.find((p) => p.id !== activeProfileId)?.name ?? 'your crewmate'

  const specials = STICKER_CATALOG.filter((s) => s.rarity === 'special')
  const vaultGot = specials.filter((s) => ownsSticker(album, s.id)).length
  const vaultDone = specials.length > 0 && vaultGot === specials.length

  return (
    <>
      {zoom.sticker && (
        <StickerDetail
          sticker={zoom.sticker}
          album={album}
          mateAlbum={mateAlbum}
          mateName={mateName}
          origin={zoom.origin}
          onClose={zoom.close}
        />
      )}
      {/* Red rares get their own gilded shelf at the top — they're the prize of
          the album, not something to hunt for inside a crew page. */}
      {specials.length > 0 && (
        <div className="album-crew album-vault">
          <div className="album-crew-head">
            <span className="album-crew-name">★ Legendary Vault</span>
            <span className={`album-crew-count ${vaultDone ? 'is-done' : ''}`}>
              {vaultDone ? '★ COMPLETE' : `${vaultGot}/${specials.length}`}
            </span>
          </div>
          <p className="album-vault-note">Red borders · worth 2 whites in a trade</p>
          <div className="album-grid">
            {specials.map((s) => {
              const n = album.counts[s.id] ?? 0
              const mateHas = n === 0 && mateAlbum ? spareCount(mateAlbum, s.id) > 0 : false
              return (
                <Sticker
                  key={s.id}
                  sticker={s}
                  state={n > 0 ? 'owned' : 'missing'}
                  count={n}
                  size="sm"
                  badge={mateHas ? '🤝' : undefined}
                  onClick={(e) => zoom.open(s, e)}
                />
              )
            })}
          </div>
        </div>
      )}

      {STICKER_CREWS.map((crew) => {
        const cards = STICKER_CATALOG.filter((s) => s.crew === crew.id && s.rarity === 'common')
        if (cards.length === 0) return null
        const got = cards.filter((s) => ownsSticker(album, s.id)).length
        const done = got === cards.length
        return (
          <div key={crew.id} className="album-crew">
            <div className="album-crew-head">
              <span className="album-crew-name">
                <img className="crew-flag" src={crew.flag} alt="" /> {crew.name}
              </span>
              <span className={`album-crew-count ${done ? 'is-done' : ''}`}>
                {done ? '★ COMPLETE' : `${got}/${cards.length}`}
              </span>
            </div>
            <div className="album-grid">
              {cards.map((s) => {
                const n = album.counts[s.id] ?? 0
                // a little nudge: they have a spare of something you're missing
                const mateHas = n === 0 && mateAlbum ? spareCount(mateAlbum, s.id) > 0 : false
                return (
                  <Sticker
                    key={s.id}
                    sticker={s}
                    state={n > 0 ? 'owned' : 'missing'}
                    count={n}
                    size="sm"
                    badge={mateHas ? '🤝' : undefined}
                    onClick={(e) => zoom.open(s, e)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      <ImagesWantedNote />
    </>
  )
}

/** How far the collection is from fielding every World Cup 2026 country, in
    full squads of CARDS_PER_TEAM — a note for whoever curates the images. */
function ImagesWantedNote() {
  const commons = STICKER_CATALOG.filter((s) => s.rarity === 'common').length
  const missing = TOTAL_WC_TEAMS * CARDS_PER_TEAM - commons
  if (missing <= 0) return null
  return (
    <p className="album-images-wanted">
      🌍 Add {missing} more image{missing === 1 ? '' : 's'} to field all {TOTAL_WC_TEAMS} World Cup
      2026 teams ({CARDS_PER_TEAM} players each)
    </p>
  )
}

// --- packs ------------------------------------------------------------------

function PacksTab() {
  const { data, openPack } = useStore()
  const [drawn, setDrawn] = useState<string[] | null>(null)
  const [ownedBefore, setOwnedBefore] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)

  const today = dayKey()
  const freeReady = freePackReady(data.album, today)
  const canBuy = data.economy.gems >= PACK_COST
  const traded = packCredits(data.album)
  const complete = albumProgress(data.album).pct === 100

  function open(kind: 'free' | 'buy' | 'credit') {
    // snapshot the album first — the reveal needs to know what was new
    setOwnedBefore(new Set(ALL_STICKER_IDS.filter((id) => ownsSticker(data.album, id))))
    const result = openPack(kind)
    if (result === 'broke') {
      sfx.error()
      setMsg(`Not enough Berries. A pack runs ${PACK_COST} 🪙.`)
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
      {drawn && <PackOpening drawn={drawn} ownedBefore={ownedBefore} onDone={() => setDrawn(null)} />}

      <div className="pack-shop">
        <div className={`pack-card ${freeReady ? 'is-ready' : 'is-spent'}`}>
          <div className="pack-card-art">🎁</div>
          <div className="pack-card-body">
            <div className="pack-card-title">Daily Delivery</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {freeReady ? 'A free pack from the News Coo — one per day.' : 'Already claimed. New pack tomorrow!'}
            </div>
          </div>
          <button className="btn btn--small" disabled={!freeReady} onClick={() => { sfx.click(); open('free') }}>
            {freeReady ? 'Open' : '✓'}
          </button>
        </div>

        {/* a pack won in a swap waits here, still sealed — the ceremony is the point */}
        {traded > 0 && (
          <div className="pack-card is-ready">
            <div className="pack-card-art">🤝</div>
            <div className="pack-card-body">
              <div className="pack-card-title">Traded Pack{traded > 1 ? ` ×${traded}` : ''}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Won in a swap — still sealed.
              </div>
            </div>
            <button className="btn btn--small" onClick={() => { sfx.click(); open('credit') }}>
              Open
            </button>
          </div>
        )}

        <div className="pack-card is-ready">
          <div className="pack-card-art">📦</div>
          <div className="pack-card-body">
            <div className="pack-card-title">Sticker Pack</div>
            <div className="muted" style={{ fontSize: 12 }}>
              7 stickers · reds show up ~1 in 8
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
          🏆 Album complete — you are the Pirate King of collectors!
        </p>
      )}
      <p className="muted" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
        Packs opened: {data.album.packsOpened}
      </p>
    </>
  )
}

// --- trade ------------------------------------------------------------------

/** Berry stepper — big taps, ±10 a time, never past what the payer holds. */

function TradeTab() {
  const { data, mateAlbum, mateData, trades, activeProfileId, profiles, proposeTrade, answerTrade, counterTrade, cancelTrade } =
    useStore()
  const [give, setGive] = useState<string[]>([])
  const [want, setWant] = useState<string[]>([])
  const [gems, setGems] = useState(0)
  const [pack, setPack] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const zoom = useStickerZoom()

  const mateId = profiles.find((p) => p.id !== activeProfileId)?.id
  const mate = profiles.find((p) => p.id === mateId)
  const mateName = mate?.name ?? 'your crewmate'

  // what each side can actually offer the other
  const iCanHelp = mateAlbum ? tradeableFor(data.album, mateAlbum) : []
  const theyCanHelp = mateAlbum ? tradeableFor(mateAlbum, data.album) : []

  const myTurn = trades.filter((t) => awaitsAnswer(t, activeProfileId))
  const theirTurn = trades.filter(
    (t) =>
      t.status === 'pending' &&
      !awaitsAnswer(t, activeProfileId) &&
      (t.fromId === activeProfileId || t.toId === activeProfileId),
  )
  const outgoing = trades.filter((t) => t.status === 'pending' && t.fromId === activeProfileId)
  const recent = useMemo(
    () => trades.filter((t) => t.status !== 'pending').slice(-4).reverse(),
    [trades],
  )

  const purse = data.economy.gems
  const freeReady = freePackReady(data.album, dayKey())
  const giveVal = offerValue(give)
  const wantVal = offerValue(want)
  const sweetened = gems > 0 || pack
  // Cards for cards still has to weigh the same. Berries or the free pack turn
  // the offer into a haggle instead, and a haggle has no fair price to enforce.
  const balanced = give.length > 0 && want.length > 0 && giveVal === wantVal
  const canSend = want.length > 0 && (give.length > 0 || sweetened) && (sweetened || balanced)
  const hint = gemHint(want)
  const worth = offerWorth({ give, giveGems: gems, givePack: pack })
  const verdict = worth >= hint * 1.15 ? '😍 generous' : worth >= hint * 0.85 ? '👍 about right' : '🤏 a bit light'

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    sfx.click()
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  function send() {
    const result = proposeTrade(give, want, { gems, pack })
    if (result === 'unbalanced') {
      sfx.error()
      setMsg('Card for card, both sides must be worth the same. A red star counts as two whites — or throw in Berries instead!')
    } else if (result === 'empty') {
      sfx.error()
      setMsg('Pick what you want, and put something up for it.')
    } else if (result === 'broke') {
      sfx.error()
      setMsg('You don’t have that many Berries.')
    } else if (result === 'nopack') {
      sfx.error()
      setMsg('Today’s free pack is already open — nothing left to hand over.')
    } else if (result === 'busy') {
      sfx.error()
      setMsg('You already have an offer on the table. Cancel it first.')
    } else {
      sfx.fanfare()
      setGive([])
      setWant([])
      setGems(0)
      setPack(false)
      setMsg(`Offer sent to ${mateName}! 🕊️`)
    }
  }

  if (!mateAlbum) {
    return <p className="muted" style={{ textAlign: 'center', marginTop: 20 }}>Finding {mateName}’s log book…</p>
  }

  return (
    <>
      {zoom.sticker && (
        <StickerDetail
          sticker={zoom.sticker}
          album={data.album}
          mateAlbum={mateAlbum}
          mateName={mateName}
          origin={zoom.origin}
          onClose={zoom.close}
        />
      )}
      {/* offers waiting on me — mine to accept, refuse, or haggle */}
      {myTurn.map((t) => (
        <TradeOffer
          key={t.id}
          trade={t}
          viewerId={activeProfileId}
          myPurse={purse}
          matePurse={mateData?.economy.gems ?? null}
          payerPackReady={
            t.fromId === activeProfileId ? freeReady : mateAlbum ? freePackReady(mateAlbum, dayKey()) : null
          }
          onAccept={() => { sfx.bigWin(); answerTrade(t.id, true) }}
          onDecline={() => { sfx.sad(); answerTrade(t.id, false) }}
          onCounter={(amount) => {
            const r = counterTrade(t.id, amount)
            if (r === 'ok') { sfx.gem(); setMsg('Counter sent — the ball’s in their court. 💰') }
            else sfx.error()
            return r
          }}
          onCancel={t.fromId === activeProfileId ? () => { sfx.click(); cancelTrade(t.id) } : undefined}
          onPeek={zoom.open}
        />
      ))}
      {theirTurn.map((t) => (
        <TradeOffer
          key={t.id}
          trade={t}
          viewerId={activeProfileId}
          myPurse={purse}
          matePurse={mateData?.economy.gems ?? null}
          payerPackReady={
            t.fromId === activeProfileId ? freeReady : mateAlbum ? freePackReady(mateAlbum, dayKey()) : null
          }
          onCancel={t.fromId === activeProfileId ? () => { sfx.click(); cancelTrade(t.id) } : undefined}
          onPeek={zoom.open}
        />
      ))}

      <div className="trade-radar">
        <div className="trade-radar-item">
          <span className="trade-radar-num">{theyCanHelp.length}</span>
          <span>card{theyCanHelp.length === 1 ? '' : 's'} {mateName} can spare that <b>you need</b></span>
        </div>
        <div className="trade-radar-item">
          <span className="trade-radar-num">{iCanHelp.length}</span>
          <span>of your spares that <b>{mateName} needs</b></span>
        </div>
      </div>

      {theyCanHelp.length === 0 && iCanHelp.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', margin: '16px 0' }}>
          Nothing to swap right now — neither of you holds a spare the other is missing. Open more packs! 📦
        </p>
      )}

      {outgoing.length === 0 && theyCanHelp.length > 0 && (
        <>
          <div className="trade-head">🎯 You want from {mateName}</div>
          <div className="album-grid">
            {theyCanHelp.map((s) => (
              <Sticker
                key={s.id}
                sticker={s}
                size="sm"
                selected={want.includes(s.id)}
                onClick={() => toggle(want, setWant, s.id)}
                onLongPress={(e) => zoom.open(s, e)}
              />
            ))}
          </div>

          <div className="trade-head">
            🎁 You give from your spares
            {iCanHelp.length > 0 && <span className="trade-head-note">{iCanHelp.length} {mateName} needs</span>}
          </div>
          {iCanHelp.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>
              None of your spares are ones {mateName} needs right now — pay in Berries instead. 👇
            </p>
          ) : (
            <div className="album-grid">
              {iCanHelp.map((sticker) => (
                <Sticker
                  key={sticker.id}
                  sticker={sticker}
                  size="sm"
                  count={spareCount(data.album, sticker.id)}
                  selected={give.includes(sticker.id)}
                  wanted
                  onClick={() => toggle(give, setGive, sticker.id)}
                  onLongPress={(e) => zoom.open(sticker, e)}
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
              : '★ red rare = 2 · white = 1 · hold a card to see it big'}
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
                  t.give.length > 0 ? `${t.give.length} card${t.give.length === 1 ? '' : 's'}` : null,
                  tradeGems(t) > 0 ? `${tradeGems(t)} 🪙` : null,
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

/**
 * One offer on the table. The same card serves both sides and every round of a
 * haggle: it always reads from the viewer's point of view, and only shows the
 * buttons whoever is looking is actually allowed to press.
 */
