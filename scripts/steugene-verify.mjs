// 🏫 St. Eugene 7 — mark the marking: `npm run se:verify`
//
// `se:audit` checks that a question is well FORMED. This checks that it is
// RIGHT, which is a different job and a much more important one here, because
// §24f says he does not get a second go. A mis-keyed answer does not just
// teach him something false — it records his correct answer as a mistake,
// seals the question away, and puts it in front of me as something he needs
// help with. One bad key costs all three.
//
// Three failure shapes, all of which a generator produces and a schema check
// sails straight past:
//   · the key points at the wrong option, and "why" explains a different one
//   · two options are both defensibly correct
//   · the question asks two things at once, or asks nothing clearly
//
// A question it cannot vouch for is DELETED. There are 5000 of them; losing
// the doubtful ones costs nothing and keeps every survivor trustworthy.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { ask, sliceJson, SEED_MODEL } from './lib/se-generate.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIR = join(ROOT, 'src/steugene/packs/generated')

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const only = args.filter((a) => !a.startsWith('--'))
const model = args.find((a) => a.startsWith('--model='))?.slice(8) ?? SEED_MODEL
const lanes = Math.max(1, Number(args.find((a) => a.startsWith('--lanes='))?.slice(8)) || 4)
const BATCH = 12

const fb = initializeApp({
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
})
await signInAnonymously(getAuth(fb))
const key = (await getDoc(doc(getFirestore(fb), 'app', 'aiConfig'))).data()?.openrouterKey
if (!key) {
  console.error('No OpenRouter key in app/aiConfig.')
  process.exit(1)
}

const SYSTEM = `You are checking quiz questions written for a 12-year-old Ontario student BEFORE he sees them. Be strict and be adversarial: you are looking for errors, not approving work.

He is NOT allowed to re-answer a question he gets wrong, so a question with the wrong answer marked is worse than no question at all — it records his correct answer as a mistake.

For each question decide:
1. Is the marked answer FACTUALLY correct for a Canadian grade-7 curriculum?
2. Is EXACTLY ONE option defensibly correct? If a reasonable student could argue a second option is also correct, the question fails.
3. Does the "why" sentence agree with the MARKED option? A "why" that explains a different option is the clearest possible sign the key is wrong.
4. Is the question coherent — one clear thing asked, no two questions mashed together, no reference to something that is not there?
5. For a "build" question: does the answer string actually and exactly answer the prompt?

Reply with a JSON array, one object per question, in the SAME ORDER, and nothing else:
{"i":0,"v":"ok"}
{"i":1,"v":"fix","answer":2}
{"i":2,"v":"drop","note":"two options are correct"}

Use "fix" ONLY when the question is sound and exactly one option is clearly correct but the key points elsewhere; give that option's index.
Use "drop" for anything else that is wrong, ambiguous, incoherent, or that you are not confident about.
Use "ok" only when you would be happy for him to be marked on it.`

/** Every question in a pack, with a path back to where it lives. */
function slots(pack) {
  const out = []
  for (const where of ['core', 'extra']) {
    pack[where].forEach((b, bi) => {
      if (b.kind === 'choice' || b.kind === 'build') out.push({ where, bi, ci: null, b })
      if (b.kind === 'video') b.checks.forEach((c, ci) => out.push({ where, bi, ci, b: c }))
    })
  }
  return out
}

function describe(s, i) {
  const b = s.b
  if (b.kind === 'build' || b.answer === undefined || Array.isArray(b.options) === false) {
    return `${i}. BUILD — ${b.prompt}\n   answer: "${b.answer}"\n   why: ${b.why}`
  }
  const opts = b.options.map((o, k) => `   [${k}]${k === b.answer ? ' <-- MARKED' : ''} ${o}`).join('\n')
  return `${i}. CHOICE — ${b.prompt}\n${opts}\n   why: ${b.why}`
}

const spend = { in: 0, out: 0 }
const tally = { checked: 0, fixed: 0, dropped: 0, unverified: 0 }
const examples = []
const unchecked = []

async function verdicts(batch) {
  const prompt = batch.map((s, i) => describe(s, i)).join('\n\n')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { text, usage } = await ask({
        key,
        model,
        system: SYSTEM,
        prompt,
        title: 'St. Eugene verify',
        temperature: 0,
      })
      spend.in += usage.prompt_tokens ?? 0
      spend.out += usage.completion_tokens ?? 0
      const parsed = JSON.parse(sliceJson(text))
      if (!Array.isArray(parsed)) throw new Error('not an array')
      return parsed
    } catch {
      if (attempt === 2) return null
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
    }
  }
  return null
}

async function verifyFile(file) {
  const path = join(DIR, file)
  const text = readFileSync(path, 'utf8')
  const head = text.slice(0, text.indexOf('export const pack: SePack = '))
  const pack = JSON.parse(text.slice(text.indexOf('export const pack: SePack = ') + 28).trim())

  const list = slots(pack)
  const kill = new Set()
  let fixed = 0

  // Split a batch the model would not answer rather than letting the
  // questions through unchecked — an unverified key is the exact thing this
  // pass exists to catch, so "we could not look" must not become "it is fine".
  const judged = []
  async function judge(batch) {
    if (!batch.length) return
    const got = await verdicts(batch)
    if (got) {
      tally.checked += batch.length
      judged.push([batch, got])
      return
    }
    if (batch.length === 1) {
      tally.unverified += 1
      unchecked.push(`${pack.subtopicId}: ${batch[0].b.prompt.slice(0, 60)}`)
      return
    }
    const half = Math.ceil(batch.length / 2)
    await judge(batch.slice(0, half))
    await judge(batch.slice(half))
  }

  for (let i = 0; i < list.length; i += BATCH) await judge(list.slice(i, i + BATCH))

  for (const [batch, got] of judged) {
    for (const v of got) {
      const s = batch[v?.i]
      if (!s) continue
      if (v.v === 'fix' && typeof v.answer === 'number' && s.b.options && v.answer >= 0 && v.answer < s.b.options.length) {
        if (v.answer !== s.b.answer) {
          if (examples.length < 12) examples.push(`FIX  ${pack.subtopicId}: "${s.b.prompt.slice(0, 68)}" → [${v.answer}] ${s.b.options[v.answer].slice(0, 40)}`)
          s.b.answer = v.answer
          fixed++
        }
      } else if (v.v === 'drop') {
        kill.add(s)
        if (examples.length < 12) examples.push(`DROP ${pack.subtopicId}: "${s.b.prompt.slice(0, 68)}" — ${v.note ?? '?'}`)
      }
    }
  }

  if (kill.size || fixed) {
    // Video checks are removed from inside their video; a video left with no
    // questions goes too, because then it is just television (§24g).
    for (const where of ['core', 'extra']) {
      pack[where] = pack[where]
        .map((b) => {
          if (b.kind !== 'video') return b
          const keep = b.checks.filter((_, ci) => ![...kill].some((s) => s.b === b.checks[ci]))
          return keep.length ? { ...b, checks: keep } : null
        })
        .filter(Boolean)
        .filter((b) => ![...kill].some((s) => s.b === b))
    }
    if (!dry) writeFileSync(path, `${head}export const pack: SePack = ${JSON.stringify(pack, null, 2)}\n`)
  }

  tally.fixed += fixed
  tally.dropped += kill.size
  return { id: pack.subtopicId, n: list.length, fixed, dropped: kill.size }
}

let files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts')
if (only.length) files = files.filter((f) => only.includes(f.replace(/\.ts$/, '')))

console.log(`🔎 verifying ${files.length} pack(s) with ${model}, ${lanes} at a time${dry ? ' (DRY)' : ''}\n`)

let done = 0
const queue = [...files]
await Promise.all(
  Array.from({ length: lanes }, async () => {
    for (;;) {
      const f = queue.shift()
      if (!f) return
      const r = await verifyFile(f)
      const flag = r.dropped || r.fixed ? `${r.fixed} fixed, ${r.dropped} dropped` : 'clean'
      console.log(`  ${(++done + '/' + files.length).padStart(8)} ${r.id.padEnd(18)} ${String(r.n).padStart(3)} questions · ${flag}`)
    }
  }),
)

const cost = (spend.in / 1e6) * 0.1 + (spend.out / 1e6) * 0.5
console.log(
  `\nchecked ${tally.checked} questions · ${tally.fixed} keys corrected · ${tally.dropped} deleted${tally.unverified ? ` · ${tally.unverified} could not be checked` : ''}`,
)
console.log(`tokens: ${spend.in.toLocaleString()} in · ${spend.out.toLocaleString()} out  ≈ US$${cost.toFixed(2)}`)
if (examples.length) {
  console.log('\nsample of what changed:')
  for (const e of examples) console.log(`  · ${e}`)
}
if (unchecked.length) {
  console.log(`\n${unchecked.length} question(s) the checker never answered on — re-run se:verify to try them again:`)
  for (const u of unchecked.slice(0, 20)) console.log(`  · ${u}`)
}
process.exit(0)
