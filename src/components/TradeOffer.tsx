// One swap offer on the table, in either collection.
//
// Lives here rather than inside the album screen because the One Piece Album (§14b)
// trades by the identical rules over a different pile of cards: the only thing
// that changes is how an id turns into a picture, which is the `lookup` prop.
import { useState } from 'react'
import { awaitsAnswer, stickerById, tradeGems } from '../logic/album'
import { Sticker, type CardFace } from './Sticker'
import { BerryCoin } from './BerryCoin'
import { sfx } from '../audio'
import type { StickerTrade } from '../types'

export function GemStepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const step = (by: number) => {
    sfx.click()
    onChange(Math.max(0, Math.min(max, value + by)))
  }
  return (
    <div className="gem-stepper">
      <button className="btn btn--ghost btn--small" disabled={value <= 0} onClick={() => step(-10)}>
        −
      </button>
      <span className="gem-stepper-val">
        <BerryCoin size={16} /> {value}
      </span>
      <button className="btn btn--ghost btn--small" disabled={value >= max} onClick={() => step(10)}>
        +
      </button>
    </div>
  )
}

export function TradeOffer({
  trade,
  viewerId,
  myPurse,
  matePurse,
  payerPackReady,
  onAccept,
  onDecline,
  onCounter,
  onCancel,
  onPeek,
  lookup = stickerById,
}: {
  trade: StickerTrade
  viewerId: string | null
  myPurse: number
  matePurse: number | null
  /** Is the payer's daily free pack still unopened? null = their world hasn't loaded. */
  payerPackReady: boolean | null
  onAccept?: () => void
  onDecline?: () => void
  onCounter?: (gems: number) => 'ok' | 'busy'
  onCancel?: () => void
  onPeek?: (s: CardFace, e: React.MouseEvent<HTMLElement>) => void
  /** How an id becomes a card face. Defaults to the Grand Line sticker album. */
  lookup?: (id: string) => CardFace | undefined
}) {
  const iProposed = trade.fromId === viewerId
  const myTurn = awaitsAnswer(trade, viewerId)
  const gems = tradeGems(trade)
  const haggle = trade.haggle ?? []
  // Whoever proposed is the one paying Berries, whatever round we're on.
  const payerPurse = iProposed ? myPurse : matePurse
  const payerName = iProposed ? 'You' : trade.fromName
  const waitingOn = (trade.turn ?? 'to') === 'to' ? trade.toName : trade.fromName

  const [asking, setAsking] = useState(false)
  const [ask, setAsk] = useState(gems)
  // A counter can't ask for Berries the payer doesn't have — an impossible
  // number would just stall the loop forever.
  const askCap = payerPurse ?? gems

  const cards = (ids: string[]) =>
    ids.map((id, i) => {
      const s = lookup(id)
      // nothing else to tap on an offer card, so a plain tap zooms in
      return s ? (
        <Sticker key={`${id}-${i}`} sticker={s} size="sm" onClick={onPeek && ((e) => onPeek(s, e))} />
      ) : null
    })

  const sweeteners = (
    <>
      {gems > 0 && (
        <span className="trade-chip">
          <BerryCoin size={14} /> {gems}
        </span>
      )}
      {trade.givePack && <span className="trade-chip">🎁 free pack</span>}
    </>
  )

  const head = myTurn
    ? haggle.length > 1
      ? `💰 ${haggle[haggle.length - 1].byName} asked for ${gems} — your call`
      : `📨 ${iProposed ? 'Your offer' : `${trade.fromName} wants to trade!`}`
    : `⏳ Waiting on ${waitingOn}`

  // The deal can go stale while it sits there: Berries get spent, and the free
  // pack promised can get opened. Say so instead of letting Accept quietly
  // cancel the swap.
  const shortGems = gems > 0 && payerPurse !== null && payerPurse !== undefined && payerPurse < gems
  const packGone = trade.givePack === true && payerPackReady === false
  const shortPayer = shortGems || packGone

  return (
    <div className="trade-offer">
      <div className="trade-offer-head">{head}</div>
      <div className="trade-offer-sides">
        <div>
          <div className="trade-offer-label">{iProposed ? 'You give' : `${trade.fromName} gives`}</div>
          <div className="trade-offer-row">
            {cards(trade.give)}
            {sweeteners}
          </div>
        </div>
        <div className="trade-offer-arrow">⇄</div>
        <div>
          <div className="trade-offer-label">{iProposed ? 'You get' : 'They want'}</div>
          <div className="trade-offer-row">{cards(trade.want)}</div>
        </div>
      </div>

      {/* the whole haggle so far, so nobody has to remember the last number */}
      {haggle.length > 1 && (
        <p className="trade-haggle">
          {haggle.map((h, i) => (
            <span key={i}>
              {i > 0 && ' → '}
              <b>{h.gems}</b> <span className="muted">({h.byName})</span>
            </span>
          ))}
        </p>
      )}

      {trade.note && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>“{trade.note}”</p>}

      {shortPayer && (
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          {shortGems
            ? `${payerName} ${iProposed ? 'don’t' : 'doesn’t'} have ${gems} Berries any more — ask for less, or call it off.`
            : `That free pack has already been opened — the deal can’t be paid as it stands.`}
        </p>
      )}

      {asking ? (
        <div className="trade-counter">
          <div className="trade-counter-label">{iProposed ? 'Change your offer to:' : `Ask ${payerName} for:`}</div>
          <GemStepper value={ask} max={askCap} onChange={setAsk} />
          <div className="trade-offer-actions">
            <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setAsking(false) }}>
              Back
            </button>
            <button
              className="btn btn--small"
              disabled={ask === gems}
              onClick={() => {
                if (onCounter?.(ask) === 'ok') setAsking(false)
              }}
            >
              💰 Send counter
            </button>
          </div>
        </div>
      ) : (
        <div className="trade-offer-actions">
          {onCancel && !myTurn && (
            <button className="btn btn--ghost btn--small" onClick={onCancel}>
              Withdraw
            </button>
          )}
          {myTurn && (
            <>
              <button className="btn btn--ghost btn--small" onClick={onDecline}>
                ✕ No deal
              </button>
              {onCounter && (
                <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setAsk(gems); setAsking(true) }}>
                  💰 Ask more
                </button>
              )}
              <button className="btn btn--small" disabled={shortPayer} onClick={onAccept}>
                🤝 Shake on it!
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
