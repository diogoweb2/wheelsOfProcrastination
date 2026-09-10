// Monthly market refresh: `npm run bank:market` (scheduled via cron, e.g. 1st of the month 08:00).
//
// Pulls the last ~30 days of REAL daily % returns for XGRO (iShares Core Growth
// ETF Portfolio, TSX) and QQQ (Nasdaq-100) straight from Yahoo Finance's public
// chart endpoint — no API key, no login. We store that series in Firestore
// app/marketData; the app replays it for the next ~30 days, teaching Ben with
// real — not made-up — volatility.
//
// Returns come from the ADJUSTED close, so quarterly distributions count as
// return instead of showing up as a fake drop on the ex-dividend day.
//
// Resilience: if the fetch/parse fails, we write status:"failed" (keeping the last
// good series intact) so the app shows a red banner on Diogo's Banker's desk. The
// job is meant to run daily; it no-ops when it already succeeded this month, so a
// failure simply retries tomorrow until it lands.
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

const SERIES_LEN = 30
const SYMBOLS = { xgro: 'XGRO.TO', qqq: 'QQQ' } // XGRO trades in Toronto, QQQ on the Nasdaq

function today() {
  return new Date().toISOString().slice(0, 10)
}

/** Sanity-check a returned series: right length-ish, numeric, and not absurd (>|10%|/day). */
function cleanSeries(arr) {
  if (!Array.isArray(arr)) return null
  const nums = arr.map(Number).filter((n) => Number.isFinite(n) && Math.abs(n) <= 10)
  return nums.length >= 20 ? nums.slice(-SERIES_LEN) : null
}

/**
 * Daily closes for one symbol, oldest first, as { day, close }.
 * Today's bar is dropped: the cron fires before the opening bell, so it would
 * otherwise fold a stale/pre-market print in as a bogus ~0% day.
 */
async function fetchCloses(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (wheels-of-procrastination bank:market)' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`)
  const result = (await res.json())?.chart?.result?.[0]
  const stamps = result?.timestamp
  const closes = result?.indicators?.adjclose?.[0]?.adjclose ?? result?.indicators?.quote?.[0]?.close
  if (!Array.isArray(stamps) || !Array.isArray(closes)) throw new Error(`${symbol}: no price series in response`)

  const now = today()
  return stamps
    .map((t, i) => ({ day: new Date(t * 1000).toISOString().slice(0, 10), close: Number(closes[i]) }))
    .filter((b) => Number.isFinite(b.close) && b.close > 0 && b.day < now)
}

/** Close-to-close percent moves, oldest first: SERIES_LEN returns need SERIES_LEN + 1 closes. */
async function fetchSeries(symbol) {
  const bars = (await fetchCloses(symbol)).slice(-(SERIES_LEN + 1))
  if (bars.length < 21) throw new Error(`${symbol}: only ${bars.length} usable closes`)
  const pct = bars.slice(1).map((b, i) => Math.round(((b.close / bars[i].close - 1) * 100 + Number.EPSILON) * 10_000) / 10_000)
  const series = cleanSeries(pct)
  if (!series) throw new Error(`${symbol}: series failed validation (need ≥20 sane daily returns)`)
  return { series, lastDay: bars[bars.length - 1].day }
}

/** One retry: a single flaky response shouldn't cost Ben a whole day of real data. */
async function withRetry(fn) {
  try {
    return await fn()
  } catch (err) {
    console.warn('… retrying after:', err?.message ?? err)
    return await fn()
  }
}

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const ref = doc(db, 'app', 'marketData')
  const snap = await getDoc(ref)
  const prev = snap.exists() ? snap.data() : null
  const day = today()

  // already refreshed successfully this calendar month? nothing to do.
  if (prev?.status === 'ok' && prev.updatedAt?.slice(0, 7) === day.slice(0, 7)) {
    console.log(`✓ Market series already fresh for ${day.slice(0, 7)} — skipping.`)
    process.exit(0)
  }

  try {
    const [xgro, qqq] = await Promise.all([withRetry(() => fetchSeries(SYMBOLS.xgro)), withRetry(() => fetchSeries(SYMBOLS.qqq))])

    await setDoc(ref, {
      xgro: xgro.series,
      qqq: qqq.series,
      asOfDay: day,
      updatedAt: new Date().toISOString(),
      status: 'ok',
      lastAttemptDay: day,
    })
    console.log(
      `✅ Market series updated as of ${day}: ${xgro.series.length} XGRO days (through ${xgro.lastDay}) / ${qqq.series.length} QQQ days (through ${qqq.lastDay}).`,
    )
    process.exit(0)
  } catch (err) {
    const message = err?.message ?? String(err)
    console.error('❌ Market fetch failed:', message)
    // keep the last good series; just flag the failure so the app warns Diogo and retries tomorrow
    await setDoc(
      ref,
      { ...(prev ?? {}), status: 'failed', lastError: message.slice(0, 300), lastAttemptDay: day },
      { merge: true },
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌', err.message ?? err)
  process.exit(1)
})
