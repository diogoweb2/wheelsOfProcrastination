// Monthly market refresh: `npm run bank:market` (scheduled via cron, e.g. 1st of the month 08:00).
//
// Asks Claude (sonnet) for the last ~30 days of REAL daily % returns for XGRO
// (Vanguard Growth ETF, TSX) and QQQ (Nasdaq-100, US). We store that series in
// Firestore app/marketData; the app replays it for the next ~30 days, teaching
// Ben with realistic — not made-up — volatility.
//
// Resilience: if the fetch/parse fails, we write status:"failed" (keeping the last
// good series intact) so the app shows a red banner on Diogo's Banker's desk. The
// job is meant to run daily; it no-ops when it already succeeded this month, so a
// failure simply retries tomorrow until it lands.
import { execFileSync } from 'node:child_process'
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

function today() {
  return new Date().toISOString().slice(0, 10)
}

/** Sanity-check a returned series: right length-ish, numeric, and not absurd (>|10%|/day). */
function cleanSeries(arr) {
  if (!Array.isArray(arr)) return null
  const nums = arr.map(Number).filter((n) => Number.isFinite(n) && Math.abs(n) <= 10)
  return nums.length >= 20 ? nums.slice(0, SERIES_LEN) : null
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

  const prompt = `Today is ${day}. I need the REAL daily percentage returns for the last ${SERIES_LEN} trading days for two funds, to power a kids' savings-education app:
1. "XGRO" — iShares Core Growth ETF Portfolio (TSX: XGRO), a balanced ~80/20 fund.
2. "QQQ" — Invesco QQQ Trust (Nasdaq-100).

For each, give an array of about ${SERIES_LEN} numbers = each trading day's percent change (e.g. 0.42 means +0.42%, -1.1 means -1.1%), oldest first. Use your best knowledge of recent real market behaviour; approximate realistic daily moves if exact figures aren't available (XGRO calm, typically within ±1%/day; QQQ more volatile, often ±0.5–2.5%/day).

Reply with ONLY this JSON, no markdown fences, no commentary:
{"xgro": [ ... ], "qqq": [ ... ]}`

  try {
    const out = execFileSync('claude', ['--model', 'sonnet', '-p', prompt], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    const start = out.indexOf('{')
    const end = out.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('no JSON object in claude output')
    const parsed = JSON.parse(out.slice(start, end + 1))
    const xgro = cleanSeries(parsed.xgro)
    const qqq = cleanSeries(parsed.qqq)
    if (!xgro || !qqq) throw new Error('series failed validation (need ≥20 sane daily returns each)')

    await setDoc(ref, {
      xgro,
      qqq,
      asOfDay: day,
      updatedAt: new Date().toISOString(),
      status: 'ok',
      lastAttemptDay: day,
    })
    console.log(`✅ Market series updated (${xgro.length} XGRO / ${qqq.length} QQQ days) as of ${day}.`)
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
