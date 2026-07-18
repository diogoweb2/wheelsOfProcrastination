// 🏦 Grand Line Bank — real CAD dollars.
// Ben decides EVERY dollar himself (no auto-invest) so the habit forms: he moves
// money between the Pocket Chest, Merchant Ship (XGRO), Rocket Ship (QQQ) and the
// College Chest, pays Dad back, and allocates each payday. Withdrawing from an
// investment brings a concerned Luffy (growth he's giving up); pulling from
// College brings a panic Luffy (Dad's matched money burns). Diogo runs the
// banker's desk: rates, market status, the Shock Test lever and the full ledger.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import type { AppData, BankAccountId, BankTxn, MarketData } from '../types'
import {
  ACCOUNT_IDS,
  ACCOUNT_META,
  CRASH_PCT,
  DAY_NAMES,
  INVEST_IDS,
  PROJECTION_YEARS,
  QQQ_MER,
  XGRO_MER,
  crashWorthwhile,
  daysToRecover,
  daysWithoutCrash,
  fmt$,
  partyName,
  projectAccount,
  randomLuffyQuote,
  round2,
  totalTreasure,
} from '../logic/bank'
import { Luffy } from '../components/Luffy'
import { sfx } from '../audio'

/** Live-or-fallback growth label for an account. */
function rateLabel(acct: BankAccountId, data: AppData, market: MarketData | null): string {
  const c = data.bank.config
  const live = market && market.status === 'ok' && market.asOfDay
  switch (acct) {
    case 'college':
      return 'Dad DOUBLES what you add · grows over time'
    case 'xgro':
      return live ? `real market · fee ${XGRO_MER}%/yr` : `~${c.xgroMonthly}%/month · fee ${XGRO_MER}%/yr`
    case 'qqq':
      return live ? `real market · fee ${QQQ_MER}%/yr` : `~${c.qqqMonthly}%/month · fee ${QQQ_MER}%/yr`
    default:
      return 'no growth — everyday money'
  }
}

/** Rough "you'd make about this much next month at this pace" for an invested chest. */
function projectedMonthGrowth(acct: BankAccountId, data: AppData): number {
  const c = data.bank.config
  const pct = acct === 'qqq' ? c.qqqMonthly : c.xgroMonthly
  return round2(data.bank.accounts[acct].balance * (pct / 100))
}

/** A dollar amount that visibly counts to its new value. */
function Money({ value, size = 16 }: { value: number; size?: number }) {
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 800)
      setShown(from + (value - from) * p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span style={{ fontWeight: 900, fontSize: size }}>{fmt$(shown)}</span>
}

/** Tiny 30-day sparkline from the account's daily snapshots. */
function Sparkline({ history }: { history: { day: string; balance: number }[] }) {
  if (history.length < 2) return null
  const w = 96
  const h = 26
  const vals = history.map((p) => p.balance)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(' ')
  const up = vals[vals.length - 1] >= vals[0]
  return (
    <svg width={w} height={h} className="bank-spark">
      <polyline points={pts} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** 🌊 risk meter — the whole lesson in one glance. */
function RiskMeter({ level }: { level: 0 | 1 | 2 | 3 }) {
  if (level === 0) return null
  return (
    <span title={['', 'calm waters', 'some waves', 'STORMY seas'][level]} style={{ fontSize: 11, letterSpacing: 1 }}>
      {'🌊'.repeat(level)}
      <span style={{ opacity: 0.25 }}>{'🌊'.repeat(3 - level)}</span>
    </span>
  )
}

/** New-money vs growth split bar: blue = you saved it, gold = the money worked. */
function GrowthBar({ deposited, growth }: { deposited: number; growth: number }) {
  const total = deposited + Math.max(0, growth)
  if (total <= 0) return null
  const gPct = Math.max(0, growth) / total
  return (
    <div style={{ marginTop: 8 }}>
      <div className="bank-growbar">
        <div style={{ flex: Math.max(0.02, 1 - gPct), background: 'var(--blue)' }} />
        <div style={{ flex: Math.max(0.02, gPct), background: 'var(--gold)' }} className={growth > 0 ? 'bank-growbar-shine' : ''} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, marginTop: 3 }}>
        <span style={{ color: 'var(--blue)' }}>you put in {fmt$(deposited)}</span>
        <span style={{ color: growth < 0 ? 'var(--red)' : 'var(--gold)' }}>
          {growth < 0 ? `storm losses ${fmt$(growth)}` : `money made ${fmt$(growth)} ✨`}
        </span>
      </div>
    </div>
  )
}

export function BankScreen() {
  const { activeProfileId } = useStore()
  return activeProfileId === PARENT_ID ? <BankAdmin /> : <BankKid />
}

// ============================================================================
// Ben's bank
// ============================================================================

type KidModal =
  | { kind: 'move'; from: BankAccountId }
  | { kind: 'sell'; from: BankAccountId }
  | { kind: 'college' }
  | { kind: 'payDad' }
  | null

function BankKid() {
  const { data, celebrateBankBounce } = useStore()
  const [modal, setModal] = useState<KidModal>(null)
  const [crashDismissed, setCrashDismissed] = useState(false) // "let me think" hides the alert until the next visit
  const quote = useMemo(() => randomLuffyQuote(), [])
  const bank = data.bank
  const pendingPaybacks = bank.txns.filter((t) => t.type === 'payback' && !t.ackAt)
  const crashPending = !!bank.shock.crashedDay && bank.shock.decision === null
  const needsAllocation = bank.pending.amount > 0

  // a held position recovered since last visit → one-shot celebration popup
  const bounced = !!bank.shock.bounce
  useEffect(() => {
    if (bounced) celebrateBankBounce()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounced])

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="h1" style={{ flex: 1 }}>Grand Line Bank</div>
        <div style={{ fontSize: 40 }}>🏦</div>
      </div>

      {/* Luffy the guide */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
        <Luffy size={72} />
        <div className="bubble" style={{ fontSize: 12, flex: 1 }}>{quote}</div>
      </div>

      {/* total treasure */}
      <div className="card bank-total" style={{ textAlign: 'center', marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
          Your whole treasure
        </div>
        <div style={{ color: 'var(--gold)' }}>
          <Money value={totalTreasure(data.bank)} size={40} />
        </div>
        <div className="muted" style={{ fontSize: 11 }}>yours to sell — the chests you can cash out</div>
        {bank.config.respBalance > 0 && (
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 8, color: 'var(--text)' }}>
            {fmt$(totalTreasure(data.bank) + bank.config.respBalance)}{' '}
            <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>with Dad’s college treasure (RESP)</span>
          </div>
        )}
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Allowance: {fmt$(bank.config.weeklyAmount)} every {DAY_NAMES[bank.config.payday]}
        </div>
      </div>

      {pendingPaybacks.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--blue)' }}>
          {pendingPaybacks.map((t) => (
            <div key={t.id} style={{ fontSize: 13, fontWeight: 800 }}>
              📨 {fmt$(t.amount)} flying to Dad by News Coo… waiting for his “Got it”.
            </div>
          ))}
        </div>
      )}

      {/* the chests */}
      {ACCOUNT_IDS.map((id) => (
        <AccountCard
          key={id}
          id={id}
          data={data}
          onMove={() => setModal({ kind: 'move', from: id })}
          onSell={() => setModal({ kind: 'sell', from: id })}
          onCollege={() => setModal({ kind: 'college' })}
          onPayDad={() => setModal({ kind: 'payDad' })}
        />
      ))}

      <ProjectionCard />

      {/* payday decision is mandatory: no dismiss, it just sits until allocated */}
      {needsAllocation && <PaydayModal />}
      {modal?.kind === 'move' && <MoveModal from={modal.from} onClose={() => setModal(null)} />}
      {modal?.kind === 'sell' && <SellModal from={modal.from} onClose={() => setModal(null)} />}
      {modal?.kind === 'college' && <CollegeWithdrawModal onClose={() => setModal(null)} />}
      {modal?.kind === 'payDad' && <PayDadModal onClose={() => setModal(null)} />}
      {crashPending && !crashDismissed && !needsAllocation && <CrashModal onThink={() => setCrashDismissed(true)} />}
    </div>
  )
}

function AccountCard({
  id,
  data,
  onMove,
  onSell,
  onCollege,
  onPayDad,
}: {
  id: BankAccountId
  data: AppData
  onMove: () => void
  onSell: () => void
  onCollege: () => void
  onPayDad: () => void
}) {
  const { market } = useStore()
  const meta = ACCOUNT_META[id]
  const a = data.bank.accounts[id]
  const shock = data.bank.shock
  const crashed = id === 'qqq' && !!shock.crashedDay && shock.decision === null
  const holding = id === 'qqq' && shock.decision === 'hold' && !!shock.recoverDay
  const recoverIn = holding ? daysToRecover(data.bank) : null
  const calmDays = id === 'qqq' && !crashed && !holding ? daysWithoutCrash(data.bank) : null
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: crashed ? 'var(--red)' : undefined }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 30, lineHeight: 1 }}>{meta.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 15, flex: 1 }}>{meta.name}</div>
            <RiskMeter level={meta.risk} />
          </div>
          <div className="muted" style={{ fontSize: 11 }}>{rateLabel(id, data, market)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Money value={a.balance} size={20} />
          <Sparkline history={a.history} />
        </div>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{meta.blurb}</div>

      {crashed && <div className="bank-crash-chip">🚨 CRASHED −{CRASH_PCT}%! A big decision is waiting…</div>}
      {holding && (
        <div className="bank-hold-chip">
          💪 Holding the line — {recoverIn === 0 ? 'bouncing back any moment now!' : `about ${recoverIn} day${recoverIn === 1 ? '' : 's'} to full recovery`}
        </div>
      )}
      {calmDays !== null && (
        <div className="muted" style={{ fontSize: 11, marginTop: 6, fontWeight: 800 }}>
          ☀️ {calmDays} day{calmDays === 1 ? '' : 's'} without a market storm
        </div>
      )}

      {id === 'college' && (
        <div className="bank-resp">
          🎓 Dad’s real college treasure for you (RESP): <b>{fmt$(data.bank.config.respBalance)}</b>
          <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
            Of the chest above, {fmt$(a.matched)} is Dad’s matched money. Pull YOUR part out and an equal chunk of his burns up forever! 🔥
          </div>
        </div>
      )}

      <GrowthBar deposited={a.deposited + (id === 'college' ? a.matched : 0)} growth={a.growth} />

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {id === 'chequing' && (
          <>
            <button className="btn btn--blue btn--small" style={{ flex: 1 }} disabled={a.balance <= 0} onClick={() => { sfx.click(); onMove() }}>
              ⛵ Invest / move
            </button>
            <button className="btn btn--small" style={{ flex: 1 }} disabled={a.balance <= 0} onClick={() => { sfx.click(); onPayDad() }}>
              📨 Pay Dad back
            </button>
          </>
        )}
        {INVEST_IDS.includes(id) && (
          <button className="btn btn--ghost btn--small" style={{ flex: 1 }} disabled={a.balance <= 0} onClick={() => { sfx.click(); onSell() }}>
            💰 Sell → Pocket Chest
          </button>
        )}
        {id === 'college' && (
          <button className="btn btn--ghost btn--small" style={{ flex: 1, color: 'var(--red)' }} disabled={a.deposited <= 0} onClick={() => { sfx.click(); onCollege() }}>
            🔥 Take my part out
          </button>
        )}
      </div>
    </div>
  )
}

/** Shared amount picker: quick chips + free input, validated against `max`. */
function AmountPicker({ max, amount, setAmount, label }: { max: number; amount: string; setAmount: (v: string) => void; label?: string }) {
  const chips = [1, 2, 5, 10].filter((c) => c <= max)
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label>{label ?? `Amount (you have ${fmt$(max)})`}</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {chips.map((c) => (
          <button key={c} className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); setAmount(String(c)) }}>
            ${c}
          </button>
        ))}
        <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={() => { sfx.click(); setAmount(String(round2(max))) }}>
          All
        </button>
      </div>
      <input type="number" inputMode="decimal" min={0} step="0.25" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
    </div>
  )
}

function amountOk(amount: string, max: number): boolean {
  const n = Number(amount)
  return Number.isFinite(n) && n > 0 && n <= max + 0.001
}

// --- payday: the mandatory allocation modal ---------------------------------

function PaydayModal() {
  const { data, bankAllocate, pushEvent } = useStore()
  const pool = round2(data.bank.pending.amount)
  const weeks = data.bank.pending.weeks
  const [alloc, setAlloc] = useState<Record<BankAccountId, string>>({ chequing: '', xgro: '', qqq: '', college: '' })
  const used = round2(ACCOUNT_IDS.reduce((s, id) => s + (Number(alloc[id]) || 0), 0))
  const left = round2(pool - used)
  const over = left < -0.001

  function set(id: BankAccountId, v: string) {
    setAlloc((a) => ({ ...a, [id]: v }))
  }

  return (
    <div className="overlay overlay--center">
      <div className="sheet bank-payday-sheet">
        <div style={{ textAlign: 'center', fontSize: 40 }} className="float">🎉</div>
        <div style={{ fontWeight: 900, fontSize: 20, textAlign: 'center' }}>PAYDAY!</div>
        <p style={{ fontSize: 13, textAlign: 'center', margin: '6px 0 4px' }}>
          {weeks > 1 ? `${weeks} paydays stacked up — ` : ''}You’ve got <b style={{ color: 'var(--gold)' }}>{fmt$(pool)}</b> to place.
        </p>
        <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginBottom: 10 }}>
          Every dollar needs a home. Leftover stays in your Pocket Chest — but YOU decide. Doing nothing isn’t a pirate’s way!
        </p>
        {ACCOUNT_IDS.map((id) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{ACCOUNT_META[id].emoji}</span>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 13 }}>
              {ACCOUNT_META[id].name}
              {id === 'college' && Number(alloc.college) > 0 && (
                <span style={{ color: 'var(--green)', fontWeight: 800 }}> → {fmt$(Number(alloc.college) * 2)} after match!</span>
              )}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.25"
              min={0}
              value={alloc[id]}
              onChange={(e) => set(id, e.target.value)}
              placeholder="0"
              style={{ width: 80 }}
            />
          </div>
        ))}
        <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 13, color: over ? 'var(--red)' : left > 0.001 ? 'var(--muted)' : 'var(--green)', margin: '6px 0 10px' }}>
          {over ? `That’s ${fmt$(-left)} too much!` : left > 0.001 ? `${fmt$(left)} will rest in your Pocket Chest` : 'All placed! ⚓'}
        </div>
        <button
          className="btn btn--blue"
          disabled={over || pool <= 0}
          onClick={() => {
            const payload: Partial<Record<BankAccountId, number>> = {}
            for (const id of ACCOUNT_IDS) if (Number(alloc[id]) > 0) payload[id] = Number(alloc[id])
            if (bankAllocate(payload) === 'ok') {
              sfx.gem()
              pushEvent({ type: 'goal', emoji: '⚓', title: 'Allowance placed!', description: 'Smart captain. Every Berry has its orders now!' })
            } else sfx.error()
          }}
        >
          ⚓ Set my treasure!
        </button>
      </div>
    </div>
  )
}

/** Chequing → an investment or College. Instant, no fees. College shows the double-up. */
function MoveModal({ from, onClose }: { from: BankAccountId; onClose: () => void }) {
  const { data, bankTransfer, pushEvent } = useStore()
  const [to, setTo] = useState<BankAccountId>('xgro')
  const [amount, setAmount] = useState('')
  const max = data.bank.accounts[from].balance
  const dests: BankAccountId[] = ['xgro', 'qqq', 'college']
  return (
    <div className="overlay overlay--center" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 10 }}>⛵ Set sail from the {ACCOUNT_META[from].name}</div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Where to?</label>
          <div className="seg" style={{ flexWrap: 'wrap' }}>
            {dests.map((id) => (
              <button key={id} className={to === id ? 'on' : ''} onClick={() => { sfx.click(); setTo(id) }}>
                {ACCOUNT_META[id].emoji} {ACCOUNT_META[id].name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <AmountPicker max={max} amount={amount} setAmount={setAmount} />
        {to === 'college' && amountOk(amount, max) && (
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)', marginBottom: 8 }}>
            🎓 Dad doubles it: {fmt$(Number(amount))} becomes {fmt$(Number(amount) * 2)} — future-you’s treasure!
          </p>
        )}
        <button
          className="btn btn--blue"
          disabled={!amountOk(amount, max)}
          onClick={() => {
            if (bankTransfer(from, to, Number(amount)) === 'ok') {
              sfx.gem()
              pushEvent({
                type: 'goal',
                emoji: ACCOUNT_META[to].emoji,
                title: `${fmt$(Number(amount))} aboard the ${ACCOUNT_META[to].name}!`,
                description: to === 'college' ? 'Dad matched it — double treasure for future-you! 🎓' : 'Now watch it grow. Patience is a pirate skill too!',
              })
            } else sfx.error()
            onClose()
          }}
        >
          ⚓ Move it!
        </button>
        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => { sfx.click(); onClose() }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Selling an investment: concerned-Luffy warning → pick amount → 10s deal animation. */
function SellModal({ from, onClose }: { from: BankAccountId; onClose: () => void }) {
  const { data, bankTransfer } = useStore()
  const [amount, setAmount] = useState('')
  const [selling, setSelling] = useState<number | null>(null)
  const a = data.bank.accounts[from]
  const max = a.balance
  const nextMonth = projectedMonthGrowth(from, data)

  if (selling !== null) {
    return <SellingOverlay from={from} amount={selling} onClose={onClose} />
  }
  return (
    <div className="overlay overlay--center" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 6 }}>💰 Sell from the {ACCOUNT_META[from].name}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', margin: '4px 0 10px' }}>
          <Luffy mood="judging" state="hard" size={60} />
          <div className="bubble bubble--concern" style={{ fontSize: 12, flex: 1 }}>
            Sure, nakama? This ship already made you <b>{fmt$(Math.max(0, a.growth))}</b>. At this pace it’d make about{' '}
            <b>{fmt$(nextMonth)}</b> more next month. Selling stops that treasure!
          </div>
        </div>
        <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>No selling charge — the money sails back to your Pocket Chest.</p>
        <AmountPicker max={max} amount={amount} setAmount={setAmount} />
        <button
          className="btn btn--red"
          disabled={!amountOk(amount, max)}
          onClick={() => {
            const amt = Number(amount)
            if (bankTransfer(from, 'chequing', amt) === 'ok') setSelling(amt)
            else {
              sfx.error()
              onClose()
            }
          }}
        >
          🏴‍☠️ Sell anyway
        </button>
        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => { sfx.click(); onClose() }}>
          Keep it growing 🌱
        </button>
      </div>
    </div>
  )
}

/** College withdrawal — panic Luffy, Dad's matched money burns. His contribution only. */
function CollegeWithdrawModal({ onClose }: { onClose: () => void }) {
  const { data, bankTransfer, pushEvent } = useStore()
  const a = data.bank.accounts.college
  const max = a.deposited // only his own contributions
  const [amount, setAmount] = useState('')
  const burn = amountOk(amount, max) ? round2(Math.min(a.matched, Number(amount))) : 0
  return (
    <div className="overlay overlay--center" onClick={onClose}>
      <div className="sheet bank-crash-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', fontSize: 40 }} className="shake">😱</div>
        <div style={{ fontWeight: 900, fontSize: 18, textAlign: 'center', color: 'var(--red)' }}>WAIT!! FREE MONEY!</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', margin: '8px 0' }}>
          <Luffy mood="shocked" state="hard" size={64} />
          <div className="bubble bubble--panic" style={{ fontSize: 12, flex: 1 }}>
            Nooo don’t do it!! Every dollar YOU take out makes Dad’s matched dollar go up in <b>smoke</b> 🔥. That’s free treasure GONE forever!
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          You can only take back your own contributions ({fmt$(max)}). Dad’s match isn’t yours to sail away with.
        </p>
        <AmountPicker max={max} amount={amount} setAmount={setAmount} label={`How much of YOUR part? (max ${fmt$(max)})`} />
        {burn > 0 && (
          <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--red)', marginBottom: 8 }}>🔥 This burns {fmt$(burn)} of Dad’s free money!</p>
        )}
        <button
          className="btn btn--red"
          disabled={!amountOk(amount, max)}
          onClick={() => {
            if (bankTransfer('college', 'chequing', Number(amount)) === 'ok') {
              sfx.error()
              pushEvent({
                type: 'penalty',
                emoji: '🔥',
                title: `Burned ${fmt$(burn)} of free money`,
                description: 'You pulled from College and Dad’s matched treasure went up in smoke. Future-you felt that one…',
              })
            } else sfx.error()
            onClose()
          }}
        >
          😤 Do it anyway (burn the free money)
        </button>
        <button className="btn btn--blue" style={{ marginTop: 8 }} onClick={() => { sfx.gem(); onClose() }}>
          🎓 Keep the free treasure!
        </button>
      </div>
    </div>
  )
}

const SELL_STEPS = [
  'Sending the News Coo to the merchants… 🕊️',
  'Nami is haggling for the best price… 🍊',
  'Counting the Berries twice… 🪙🪙',
  'Signing with the Captain’s mark… 🏴‍☠️',
]

/** The 10-second "deal in progress" show, then the DONE DEAL stamp + coin rain. */
function SellingOverlay({ from, amount, onClose }: { from: BankAccountId; amount: number; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  useEffect(() => {
    const stepTimers = SELL_STEPS.map((_, i) => window.setTimeout(() => setStep(i), i * 2500))
    const doneTimer = window.setTimeout(() => {
      setDone(true)
      sfx.gem()
    }, 10_000)
    return () => {
      stepTimers.forEach(window.clearTimeout)
      window.clearTimeout(doneTimer)
    }
  }, [])
  return (
    <div className="overlay overlay--center">
      <div className="sheet" style={{ textAlign: 'center', overflow: 'hidden', position: 'relative' }}>
        {!done ? (
          <>
            <div className="bank-ship">⛵</div>
            <Luffy state="spinning" size={110} />
            <div style={{ fontWeight: 900, marginTop: 10 }}>Selling {fmt$(amount)} from the {ACCOUNT_META[from].name}…</div>
            <p className="muted" style={{ fontSize: 13, minHeight: 36, marginTop: 6 }} key={step}>
              {SELL_STEPS[step]}
            </p>
            <div className="bank-dealbar"><div /></div>
          </>
        ) : (
          <>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="bank-coin" style={{ left: `${6 + i * 8}%`, animationDelay: `${(i % 5) * 0.18}s` }}>🪙</span>
            ))}
            <Luffy state="easy" size={110} />
            <div className="bank-stamp">☠️ DONE DEAL!</div>
            <div style={{ fontWeight: 900, marginTop: 6 }}>{fmt$(amount)} landed in your Pocket Chest 👛</div>
            <button className="btn btn--blue" style={{ marginTop: 14 }} onClick={() => { sfx.click(); onClose() }}>
              Shishishi! 🪙
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Interac-style payback to dad, from chequing. Dad gets a banner until he acks. */
function PayDadModal({ onClose }: { onClose: () => void }) {
  const { data, bankPayDad, pushEvent } = useStore()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const max = data.bank.accounts.chequing.balance
  return (
    <div className="overlay overlay--center" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 6 }}>📨 Pay Dad back</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Like an Interac transfer — straight from your Pocket Chest. Dad gets the news instantly.
        </p>
        <AmountPicker max={max} amount={amount} setAmount={setAmount} />
        <div className="field" style={{ marginBottom: 10 }}>
          <label>What’s it for? (optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. movie ticket 🎬" />
        </div>
        <button
          className="btn btn--blue"
          disabled={!amountOk(amount, max)}
          onClick={() => {
            if (bankPayDad(Number(amount), note) === 'ok') {
              sfx.gem()
              pushEvent({
                type: 'goal',
                emoji: '📨',
                title: `${fmt$(Number(amount))} sent to Dad!`,
                description: 'The News Coo is on its way. Paying debts like a true honorable pirate! ⚓',
              })
            } else sfx.error()
            onClose()
          }}
        >
          📨 Send it
        </button>
        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => { sfx.click(); onClose() }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

const CONTRIB_CHIPS = [0, 1, 2, 5]

/** "At this pace…" — the compound-interest telescope with a habit-deposit dial. */
function ProjectionCard() {
  const { data } = useStore()
  const [acct, setAcct] = useState<BankAccountId>('xgro')
  const [weekly, setWeekly] = useState(2)
  const rows = PROJECTION_YEARS.map((y) => projectAccount(acct, data.bank, y, weekly))
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 2 }}>🔭 Treasure telescope</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        If you keep adding money to the {ACCOUNT_META[acct].name}, here’s how big it grows:
      </div>
      <div className="seg" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        {ACCOUNT_IDS.map((id) => (
          <button key={id} className={acct === id ? 'on' : ''} onClick={() => { sfx.click(); setAcct(id) }}>
            {ACCOUNT_META[id].emoji}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span className="muted" style={{ fontSize: 11, fontWeight: 800 }}>add / week:</span>
        {CONTRIB_CHIPS.map((c) => (
          <button key={c} className={`btn btn--ghost btn--small ${weekly === c ? 'on' : ''}`} style={{ flex: 1, ...(weekly === c ? { background: 'var(--card2)', color: 'var(--text)' } : {}) }} onClick={() => { sfx.click(); setWeekly(c) }}>
            ${c}
          </button>
        ))}
      </div>
      {rows.map((r) => {
        const interestPct = r.total > 0 ? Math.max(0, r.interest) / r.total : 0
        return (
          <div key={r.years} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 12, width: 64 }}>in {r.years} year{r.years > 1 ? 's' : ''}</span>
              <span style={{ fontWeight: 900, fontSize: 15, flex: 1, color: 'var(--gold)' }}>{fmt$(r.total)}</span>
              <span className="muted" style={{ fontSize: 10 }}>
                {fmt$(r.newMoney)} saved + <b style={{ color: 'var(--gold)' }}>{fmt$(r.interest)} made by money</b>
              </span>
            </div>
            <div className="bank-growbar" style={{ marginTop: 3 }}>
              <div style={{ flex: Math.max(0.02, 1 - interestPct), background: 'var(--blue)' }} />
              <div style={{ flex: Math.max(0.02, interestPct), background: 'var(--gold)' }} />
            </div>
          </div>
        )
      })}
      <p className="muted" style={{ fontSize: 10, marginTop: 8 }}>
        🔵 money you save · 🟡 money your money makes — the longer you wait, the more gold. That’s compound interest!
      </p>
    </div>
  )
}

// --- the crash decision alert ----------------------------------------------

function CrashModal({ onThink }: { onThink: () => void }) {
  const { data, resolveBankCrash, pushEvent } = useStore()
  const shock = data.bank.shock
  const qqqLeft = data.bank.accounts.qqq.balance
  useEffect(() => {
    sfx.error()
  }, [])
  return (
    <div className="overlay overlay--center">
      <div className="sheet bank-crash-sheet">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="bank-chart-fall" style={{ left: `${8 + i * 12}%`, animationDelay: `${(i % 4) * 0.3}s` }}>📉</span>
        ))}
        <div style={{ fontSize: 44, textAlign: 'center' }} className="shake">🚨</div>
        <div style={{ fontWeight: 900, fontSize: 20, textAlign: 'center', color: 'var(--red)' }}>MARKET CRASH!</div>
        <p style={{ fontSize: 14, fontWeight: 800, textAlign: 'center', margin: '8px 0' }}>
          Tech stocks just took a dive! Your Rocket Ship 🚀 lost <span style={{ color: 'var(--red)' }}>{fmt$(shock.crashAmount)}</span> overnight (−{CRASH_PCT}%).
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', margin: '10px 0' }}>
          <Luffy state="hard" size={64} />
          <div className="bubble" style={{ fontSize: 12, flex: 1 }}>
            Storms happen on the Grand Line! The ship is damaged, not sunk. Hold on and it usually climbs back — even higher. What&rsquo;s your call, Captain?
          </div>
        </div>
        <button
          className="btn btn--blue"
          onClick={() => {
            sfx.gem()
            resolveBankCrash('hold')
            pushEvent({
              type: 'goal',
              emoji: '💪⚓',
              title: 'HOLDING THE LINE!',
              description: 'Anchors steady! Watch the Rocket Ship — it should recover (and then some) over the next couple of weeks.',
            })
          }}
        >
          💪 HOLD THE LINE — ride out the storm
        </button>
        <button
          className="btn btn--red"
          style={{ marginTop: 8 }}
          onClick={() => {
            sfx.error()
            resolveBankCrash('panic')
            pushEvent({
              type: 'penalty',
              emoji: '😱',
              title: `Panic sold for ${fmt$(qqqLeft)}`,
              description: `You jumped ship at the bottom — the ${fmt$(shock.crashAmount)} the storm took is gone FOREVER. Next storm, remember: the sea always calms down.`,
            })
          }}
        >
          😱 PANIC SELL — jump ship with what&rsquo;s left
        </button>
        <button className="btn btn--ghost btn--small" style={{ marginTop: 10, width: '100%' }} onClick={() => { sfx.click(); onThink() }}>
          🤔 I need to think (ask Dad)
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Diogo's banker desk
// ============================================================================

function BankAdmin() {
  const { kidData } = useStore()
  if (!kidData) {
    return (
      <div className="screen">
        <div className="h1">🏦 Banker’s desk</div>
        <p className="muted">Loading Ben’s vault from the cloud…</p>
      </div>
    )
  }
  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="h1" style={{ flex: 1 }}>Banker’s desk</div>
        <div style={{ fontSize: 40 }}>🏦</div>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>Ben’s real-money world — you set the rules, he makes every call.</p>

      <AdminMarket />
      <AdminPaybacks kidData={kidData} />
      <AdminShock kidData={kidData} />
      <AdminBalances kidData={kidData} />
      <AdminConfig kidData={kidData} />
      <AdminAdjust />
      <AdminLog kidData={kidData} />
    </div>
  )
}

/** Market-feed health: green when fresh, red when the monthly fetch is failing. */
function AdminMarket() {
  const { market } = useStore()
  const failed = market?.status === 'failed'
  const missing = !market
  if (!failed && !missing) {
    return (
      <div className="card" style={{ marginBottom: 10, borderColor: 'var(--green)' }}>
        <div style={{ fontWeight: 900, fontSize: 13 }}>📈 Market feed live</div>
        <div className="muted" style={{ fontSize: 11 }}>
          Real XGRO/QQQ moves as of {market!.asOfDay} · updated {new Date(market!.updatedAt).toLocaleDateString()}
        </div>
      </div>
    )
  }
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: 'var(--red)' }}>
      <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--red)' }}>⚠️ Market feed {missing ? 'not set up yet' : 'FAILED'}</div>
      <div className="muted" style={{ fontSize: 11 }}>
        {missing
          ? 'Run npm run bank:market to fetch the first 30-day XGRO/QQQ series. Until then the sim uses your fallback monthly rates below.'
          : `Last attempt ${market?.lastAttemptDay ?? '—'} failed${market?.lastError ? `: ${market.lastError}` : ''}. It retries daily; falling back to your monthly rates.`}
      </div>
    </div>
  )
}

function AdminPaybacks({ kidData }: { kidData: AppData }) {
  const { ackBankPayback } = useStore()
  const pending = kidData.bank.txns.filter((t) => t.type === 'payback' && !t.ackAt)
  if (pending.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: 'var(--blue)' }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>📨 Ben paid you back</div>
      {pending.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--line)', padding: '8px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{fmt$(t.amount)}{t.note ? ` — ${t.note}` : ''}</div>
            <div className="muted" style={{ fontSize: 11 }}>{t.day}</div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.gem(); ackBankPayback(t.id) }}>✓ Got it</button>
        </div>
      ))}
    </div>
  )
}

/** The Shock Test control room: days-without-crash counter + the manual crash lever. */
function AdminShock({ kidData }: { kidData: AppData }) {
  const { triggerBankCrash, pushEvent } = useStore()
  const [armed, setArmed] = useState(false) // two-tap confirm on the crash lever
  const s = kidData.bank.shock
  const calm = daysWithoutCrash(kidData.bank)
  const pending = !!s.crashedDay && s.decision === null
  const holding = s.decision === 'hold' && !!s.recoverDay
  const recoverIn = holding ? daysToRecover(kidData.bank) : null
  const canTrigger = s.crashCount >= 1 && !pending && !holding && crashWorthwhile(kidData.bank)

  return (
    <div className="card" style={{ marginBottom: 10, borderColor: pending ? 'var(--red)' : 'var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>📉 Shock Test</div>
          <div className="muted" style={{ fontSize: 11 }}>
            {pending && `Crashed ${s.crashedDay} (−${fmt$(s.crashAmount)}) — waiting for Ben’s call`}
            {holding && `Ben is HOLDING — recovers in ~${recoverIn} day${recoverIn === 1 ? '' : 's'} (${s.recoverDay})`}
            {!pending && !holding && s.scheduledDay && `First auto-crash armed for ${s.scheduledDay} (needs QQQ money aboard)`}
            {!pending && !holding && !s.scheduledDay && s.crashCount === 0 && 'Arms itself ~1 month after his first QQQ deposit'}
            {!pending && !holding && !s.scheduledDay && s.crashCount > 0 && `${s.crashCount} crash${s.crashCount > 1 ? 'es' : ''} so far · sea is calm`}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 26, color: 'var(--gold)' }}>{calm ?? '—'}</div>
          <div className="muted" style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>days without<br />a crash</div>
        </div>
      </div>
      {s.crashCount >= 1 && (
        <button
          className={`btn btn--small ${armed ? 'btn--red' : 'btn--ghost'}`}
          style={{ marginTop: 10, width: '100%' }}
          disabled={!canTrigger}
          onClick={() => {
            if (!armed) {
              sfx.click()
              setArmed(true)
              return
            }
            setArmed(false)
            if (triggerBankCrash()) {
              sfx.error()
              pushEvent({
                type: 'penalty',
                emoji: '📉',
                title: 'Market correction unleashed',
                description: `Ben’s Rocket Ship just dropped ${CRASH_PCT}%. He’ll face the panic-or-hold choice on his next visit.`,
              })
            }
          }}
        >
          {armed ? '⚠️ Sure? Tap again to crash the market' : `📉 Trigger a −${CRASH_PCT}% Market Correction`}
        </button>
      )}
      {s.crashCount >= 1 && !canTrigger && !pending && !holding && (
        <p className="muted" style={{ fontSize: 10, marginTop: 6 }}>Needs real money on the Rocket Ship to matter.</p>
      )}
    </div>
  )
}

function AdminBalances({ kidData }: { kidData: AppData }) {
  const pending = kidData.bank.pending
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>
        💰 Ben’s chests · total <span style={{ color: 'var(--gold)' }}>{fmt$(totalTreasure(kidData.bank))}</span>
      </div>
      {ACCOUNT_IDS.map((id) => {
        const a = kidData.bank.accounts[id]
        return (
          <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--line)', padding: '5px 0', fontSize: 13 }}>
            <span>{ACCOUNT_META[id].emoji}</span>
            <span style={{ flex: 1, fontWeight: 800 }}>{ACCOUNT_META[id].name}</span>
            <span className="muted" style={{ fontSize: 11 }}>
              in {fmt$(a.deposited)}{id === 'college' ? ` +${fmt$(a.matched)} match` : ''} · grew {fmt$(a.growth)}
            </span>
            <span style={{ fontWeight: 900, width: 76, textAlign: 'right' }}>{fmt$(a.balance)}</span>
          </div>
        )
      })}
      {pending.amount > 0 && (
        <div className="muted" style={{ fontSize: 11, marginTop: 6, color: 'var(--orange)' }}>
          🎉 {fmt$(pending.amount)} allowance ({pending.weeks} payday{pending.weeks > 1 ? 's' : ''}) waiting for him to allocate.
        </div>
      )}
    </div>
  )
}

/** Local-draft number field that saves through on Save. */
function AdminConfig({ kidData }: { kidData: AppData }) {
  const { setBankConfig, pushEvent } = useStore()
  const c = kidData.bank.config
  const [draft, setDraft] = useState({
    weeklyAmount: String(c.weeklyAmount),
    xgroMonthly: String(c.xgroMonthly),
    qqqMonthly: String(c.qqqMonthly),
    respBalance: String(c.respBalance),
  })

  function save() {
    const num = (s: string, fallback: number) => (Number.isFinite(Number(s)) && s !== '' ? Number(s) : fallback)
    setBankConfig({
      weeklyAmount: Math.max(0, num(draft.weeklyAmount, c.weeklyAmount)),
      xgroMonthly: num(draft.xgroMonthly, c.xgroMonthly),
      qqqMonthly: num(draft.qqqMonthly, c.qqqMonthly),
      respBalance: Math.max(0, num(draft.respBalance, c.respBalance)),
    })
    sfx.gem()
    pushEvent({ type: 'goal', emoji: '🏦', title: 'Bank rules updated', description: 'Ben’s bank now runs on the new numbers.' })
  }

  const field = (key: keyof typeof draft, label: string, hint?: string) => (
    <div className="field" style={{ marginBottom: 10 }}>
      <label>{label}</label>
      <input type="number" inputMode="decimal" step="0.01" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
      {hint && <span className="muted" style={{ fontSize: 10 }}>{hint}</span>}
    </div>
  )

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>⚙️ Bank rules</div>
      {field('weeklyAmount', 'Weekly allowance ($)')}
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Payday</label>
        <select value={c.payday} onChange={(e) => { setBankConfig({ payday: Number(e.target.value) }); sfx.click() }}>
          {DAY_NAMES.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
      </div>
      {field('xgroMonthly', 'XGRO fallback (%/month)', 'Only used if the live market feed is down')}
      {field('qqqMonthly', 'QQQ fallback (%/month)', 'Only used if the live market feed is down')}
      {field('respBalance', 'Real RESP balance ($)', 'Shown on his College Chest for motivation — never matched')}
      <button className="btn btn--blue" onClick={save}>💾 Save rules</button>
    </div>
  )
}

function AdminAdjust() {
  const { bankAdjust, pushEvent } = useStore()
  const [acct, setAcct] = useState<BankAccountId>('chequing')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const n = Number(amount)
  const ok = Number.isFinite(n) && n !== 0
  function apply(sign: 1 | -1) {
    bankAdjust(acct, sign * Math.abs(n), note)
    sfx.gem()
    pushEvent({
      type: 'goal',
      emoji: '🏦',
      title: `${ACCOUNT_META[acct].name} ${sign > 0 ? '+' : '−'}${fmt$(Math.abs(n))}`,
      description: note.trim() || 'Banker adjustment recorded in the log.',
    })
    setAmount('')
    setNote('')
  }
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 2 }}>✏️ Manual adjustment</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Import the paper-sheet money, fix mistakes, or add surprise bonuses — everything lands in the log.
      </div>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Chest</label>
        <select value={acct} onChange={(e) => setAcct(e.target.value as BankAccountId)}>
          {ACCOUNT_IDS.map((id) => (
            <option key={id} value={id}>{ACCOUNT_META[id].emoji} {ACCOUNT_META[id].name}</option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Amount ($)</label>
        <input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </div>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Note</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paper-sheet savings moved in" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn--blue btn--small" style={{ flex: 1 }} disabled={!ok} onClick={() => apply(1)}>＋ Add</button>
        <button className="btn btn--red btn--small" style={{ flex: 1 }} disabled={!ok} onClick={() => apply(-1)}>－ Remove</button>
      </div>
    </div>
  )
}

const TXN_ICON: Record<BankTxn['type'], string> = {
  allowance: '💵',
  transfer: '⛵',
  match: '🎓',
  payback: '📨',
  adjust: '✏️',
  crash: '📉',
  recover: '📈',
}

/** Every decision Ben makes, newest first — the coaching goldmine. */
function AdminLog({ kidData }: { kidData: AppData }) {
  const [showAll, setShowAll] = useState(false)
  const txns = [...kidData.bank.txns].reverse()
  const shown = showAll ? txns : txns.slice(0, 15)
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>📜 Captain’s ledger — every move Ben made</div>
      {txns.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Nothing yet — the ledger fills up as the bank comes alive.</p>}
      {shown.map((t) => (
        <div key={t.id} style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--line)', padding: '6px 0', fontSize: 12 }}>
          <span>{TXN_ICON[t.type]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 800 }}>
              {partyName(t.from)} → {partyName(t.to)}
            </span>
            {t.note && <span className="muted"> · {t.note}</span>}
            <div className="muted" style={{ fontSize: 10 }}>{t.day} · {t.type}{t.type === 'payback' && !t.ackAt ? ' · not acknowledged' : ''}</div>
          </div>
          <span style={{ fontWeight: 900 }}>{fmt$(t.amount)}</span>
        </div>
      ))}
      {txns.length > 15 && (
        <button className="btn btn--ghost btn--small" style={{ marginTop: 8 }} onClick={() => { sfx.click(); setShowAll(!showAll) }}>
          {showAll ? 'Show less' : `Show all ${txns.length}`}
        </button>
      )}
    </div>
  )
}
