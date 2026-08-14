// Run the built-in proofreading rules over the essays already in Firestore.
//
// The app does this by itself now — on every hand-in and every time the desk
// opens one — so this script exists for the essays that were written BEFORE the
// rules did, and for checking what the rules would say without opening a phone.
//
// It imports the real rules from src/logic (no second copy to drift), so what it
// writes is exactly what the app would have written.
//
//   node --experimental-strip-types scripts/essay-proofread.mts            # dry run
//   node --experimental-strip-types scripts/essay-proofread.mts --write    # save it
//
// Auth comes from the gcloud CLI (`gcloud auth login`), which is also what the
// deploy uses. Read-only unless you pass --write.
import { execFileSync } from 'node:child_process'
import { proofread } from '../src/logic/proofreader.ts'

const PROJECT = 'spinningwheel-6ff51'
const DOC = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/app/essays`
const WRITE = process.argv.includes('--write')

// --- Firestore's JSON, in both directions ---------------------------------

type Val = Record<string, unknown>

function decode(v: Val): unknown {
  const [kind, val] = Object.entries(v)[0] as [string, never]
  if (kind === 'arrayValue') return ((val as { values?: Val[] }).values ?? []).map(decode)
  if (kind === 'mapValue')
    return Object.fromEntries(Object.entries((val as { fields?: Record<string, Val> }).fields ?? {}).map(([k, x]) => [k, decode(x)]))
  if (kind === 'integerValue') return Number(val)
  if (kind === 'doubleValue') return Number(val)
  if (kind === 'nullValue') return null
  return val
}

function encode(v: unknown): Val {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  if (typeof v === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)])) } }
  }
  return { stringValue: String(v) }
}

function token(): string {
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
}

async function main() {
  const auth = { Authorization: `Bearer ${token()}` }
  const raw = (await (await fetch(DOC, { headers: auth })).json()) as { fields: Record<string, Val> }
  const desk = Object.fromEntries(Object.entries(raw.fields).map(([k, v]) => [k, decode(v)])) as {
    essays: {
      id: string
      title: string
      paragraphs: string[]
      round: number
      comments: Record<string, unknown>[]
    }[]
  }

  let added = 0
  for (const essay of desk.essays ?? []) {
    const hits = proofread(essay).filter((hit) => {
      const seen = (essay.comments ?? []).filter((c) => c.rule === hit.rule && c.para === hit.para)
      return !seen.some((c) => c.dismissed || c.status === 'open')
    })
    console.log(`\n📄 ${essay.title} — round ${essay.round}, ${essay.comments?.length ?? 0} notes, ${hits.length} to add`)
    for (const hit of hits) {
      console.log(`   ${hit.rule.padEnd(20)} para ${String(hit.para).padStart(2)} ×${hit.count}  ${JSON.stringify(hit.quote)}`)
      console.log(`   ${' '.repeat(20)} ${hit.text}`)
      essay.comments = [
        ...(essay.comments ?? []),
        {
          id: crypto.randomUUID(),
          round: Math.max(1, essay.round),
          para: hit.para,
          quote: hit.quote,
          text: hit.text,
          issue: hit.issue,
          source: 'app',
          rule: hit.rule,
          status: 'open',
        },
      ]
      added++
    }
  }

  if (!added) {
    console.log('\nNothing to add — the rules are happy.')
    return
  }
  if (!WRITE) {
    console.log(`\n${added} note(s) would be added. Re-run with --write to save them.`)
    return
  }

  const body = { fields: Object.fromEntries(Object.entries(desk).map(([k, v]) => [k, encode(v)])) }
  const res = await fetch(DOC, {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`write failed: ${res.status} ${await res.text()}`)
  console.log(`\n✅ ${added} note(s) written.`)
}

await main()
