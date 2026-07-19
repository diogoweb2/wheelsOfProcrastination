import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  ALL_STICKER_IDS,
  PACK_COST,
  STICKER_CATALOG,
  STICKER_CREWS,
  albumProgress,
  freePackReady,
  offerValue,
  ownsSticker,
  spareCount,
  spares,
  stickerById,
  tradeableFor,
} from '../logic/album'
import { dayKey } from '../logic/dates'
import { Sticker } from '../components/Sticker'
import { PackOpening } from '../components/PackOpening'
import { BerryCoin } from '../components/BerryCoin'
import { sfx } from '../audio'
import type { StickerTrade } from '../types'

export function AlbumScreen() {
  const [tab, setTab] = useState<'album' | 'packs' | 'trade'>('album')
  const { data, trades, activeProfileId } = useStore()
  const progress = albumProgress(data.album)

  // a swap waiting on MY answer deserves a dot on the tab
  const incoming = trades.filter((t) => t.status === 'pending' && t.toId === activeProfileId).length

  return (
    <div className="screen">
      <div className="h1" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        📖 Grand Line Log Book
      </div>
      <p className="muted" style={{ marginBottom: 10 }}>
        Every pirate on the seas — collect them all, trade the spares.
      </p>

      <div className="album-progress">
        <div className="album-progress-bar">
          <div className="album-progress-fill" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="album-progress-label">
          {progress.owned} / {progress.total} stickers · {progress.pct}%
        </div>
      </div>

      <div className="seg" style={{ margin: '14px 0' }}>
        <button className={tab === 'album' ? 'on' : ''} onClick={() => { sfx.click(); setTab('album') }}>
          📖 Album
        </button>
        <button className={tab === 'packs' ? 'on' : ''} onClick={() => { sfx.click(); setTab('packs') }}>
          🎁 Packs
        </button>
        <button className={tab === 'trade' ? 'on' : ''} onClick={() => { sfx.click(); setTab('trade') }}>
          🤝 Trade{incoming > 0 && <span className="tab-dot">{incoming}</span>}
        </button>
      </div>

      {tab === 'album' && <AlbumTab />}
      {tab === 'packs' && <PacksTab />}
      {tab === 'trade' && <TradeTab />}
    </div>
  )
}

// --- album ------------------------------------------------------------------

function AlbumTab() {
  const { data, mateAlbum } = useStore()
  const album = data.album

  const specials = STICKER_CATALOG.filter((s) => s.rarity === 'special')
  const vaultGot = specials.filter((s) => ownsSticker(album, s.id)).length
  const vaultDone = specials.length > 0 && vaultGot === specials.length

  return (
    <>
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
                {crew.emoji} {crew.name}
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
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </>
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
  const complete = albumProgress(data.album).pct === 100

  function open(kind: 'free' | 'buy') {
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

function TradeTab() {
  const { data, mateAlbum, trades, activeProfileId, profiles, proposeTrade, answerTrade, cancelTrade } = useStore()
  const [give, setGive] = useState<string[]>([])
  const [want, setWant] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const mateId = profiles.find((p) => p.id !== activeProfileId)?.id
  const mate = profiles.find((p) => p.id === mateId)
  const mateName = mate?.name ?? 'your crewmate'

  // spares the mate is missing float to the top — those are the ones worth offering
  const mySpares = useMemo(() => {
    const all = spares(data.album)
    if (!mateAlbum) return all
    return [...all].sort((a, b) => {
      const aw = ownsSticker(mateAlbum, a.sticker.id) ? 1 : 0
      const bw = ownsSticker(mateAlbum, b.sticker.id) ? 1 : 0
      return aw - bw
    })
  }, [data.album, mateAlbum])
  const wantedSpares = mateAlbum ? mySpares.filter((s) => !ownsSticker(mateAlbum, s.sticker.id)).length : 0
  // what each side can actually offer the other
  const iCanHelp = mateAlbum ? tradeableFor(data.album, mateAlbum) : []
  const theyCanHelp = mateAlbum ? tradeableFor(mateAlbum, data.album) : []

  const incoming = trades.filter((t) => t.status === 'pending' && t.toId === activeProfileId)
  const outgoing = trades.filter((t) => t.status === 'pending' && t.fromId === activeProfileId)
  const recent = useMemo(
    () => trades.filter((t) => t.status !== 'pending').slice(-4).reverse(),
    [trades],
  )

  const giveVal = offerValue(give)
  const wantVal = offerValue(want)
  const balanced = give.length > 0 && want.length > 0 && giveVal === wantVal

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    sfx.click()
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  function send() {
    const result = proposeTrade(give, want)
    if (result === 'unbalanced') {
      sfx.error()
      setMsg('Both sides must be worth the same. A red star counts as two whites!')
    } else if (result === 'busy') {
      sfx.error()
      setMsg('You already have an offer on the table. Cancel it first.')
    } else {
      sfx.fanfare()
      setGive([])
      setWant([])
      setMsg(`Offer sent to ${mateName}! 🕊️`)
    }
  }

  if (!mateAlbum) {
    return <p className="muted" style={{ textAlign: 'center', marginTop: 20 }}>Finding {mateName}’s log book…</p>
  }

  return (
    <>
      {/* offers waiting on me */}
      {incoming.map((t) => (
        <TradeOffer
          key={t.id}
          trade={t}
          mine={false}
          onAccept={() => { sfx.bigWin(); answerTrade(t.id, true) }}
          onDecline={() => { sfx.sad(); answerTrade(t.id, false) }}
        />
      ))}
      {outgoing.map((t) => (
        <TradeOffer key={t.id} trade={t} mine onCancel={() => { sfx.click(); cancelTrade(t.id) }} />
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

      {outgoing.length === 0 && (theyCanHelp.length > 0 || iCanHelp.length > 0) && (
        <>
          <div className="trade-head">🎯 You want from {mateName}</div>
          {theyCanHelp.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>
              {mateName} has no spares you’re missing right now.
            </p>
          ) : (
            <div className="album-grid">
              {theyCanHelp.map((s) => (
                <Sticker
                  key={s.id}
                  sticker={s}
                  size="sm"
                  selected={want.includes(s.id)}
                  onClick={() => toggle(want, setWant, s.id)}
                />
              ))}
            </div>
          )}

          <div className="trade-head">
            🎁 You give from your spares
            {wantedSpares > 0 && <span className="trade-head-note">{wantedSpares} {mateName} needs</span>}
          </div>
          {mySpares.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>No spares yet — open a pack or two.</p>
          ) : (
            <div className="album-grid">
              {mySpares.map(({ sticker, count }) => (
                <Sticker
                  key={sticker.id}
                  sticker={sticker}
                  size="sm"
                  count={count}
                  selected={give.includes(sticker.id)}
                  wanted={!ownsSticker(mateAlbum, sticker.id)}
                  onClick={() => toggle(give, setGive, sticker.id)}
                />
              ))}
            </div>
          )}

          <div className="trade-scale">
            <span className={balanced ? 'is-ok' : ''}>You give {giveVal}</span>
            <span className="trade-scale-mid">{balanced ? '⚖️ fair deal' : '⚖️'}</span>
            <span className={balanced ? 'is-ok' : ''}>You get {wantVal}</span>
          </div>
          <p className="muted" style={{ fontSize: 11, textAlign: 'center' }}>
            ★ red rare = 2 · white = 1
          </p>

          <button className="btn" style={{ width: '100%', marginTop: 10 }} disabled={!balanced} onClick={send}>
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
                {t.fromName} → {t.toName} · {t.give.length} for {t.want.length}
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

function TradeOffer({
  trade,
  mine,
  onAccept,
  onDecline,
  onCancel,
}: {
  trade: StickerTrade
  mine: boolean
  onAccept?: () => void
  onDecline?: () => void
  onCancel?: () => void
}) {
  const cards = (ids: string[]) =>
    ids.map((id, i) => {
      const s = stickerById(id)
      return s ? <Sticker key={`${id}-${i}`} sticker={s} size="sm" /> : null
    })

  return (
    <div className="trade-offer">
      <div className="trade-offer-head">
        {mine ? `⏳ Waiting on ${trade.toName}` : `📨 ${trade.fromName} wants to trade!`}
      </div>
      <div className="trade-offer-sides">
        <div>
          <div className="trade-offer-label">{mine ? 'You give' : `${trade.fromName} gives`}</div>
          <div className="trade-offer-row">{cards(trade.give)}</div>
        </div>
        <div className="trade-offer-arrow">⇄</div>
        <div>
          <div className="trade-offer-label">{mine ? 'You get' : 'They want'}</div>
          <div className="trade-offer-row">{cards(trade.want)}</div>
        </div>
      </div>
      {trade.note && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>“{trade.note}”</p>}
      <div className="trade-offer-actions">
        {mine ? (
          <button className="btn btn--ghost btn--small" onClick={onCancel}>
            Withdraw offer
          </button>
        ) : (
          <>
            <button className="btn btn--ghost btn--small" onClick={onDecline}>
              ✕ No deal
            </button>
            <button className="btn btn--small" onClick={onAccept}>
              🤝 Shake on it!
            </button>
          </>
        )}
      </div>
    </div>
  )
}
