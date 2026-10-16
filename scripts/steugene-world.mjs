// 🏫 St. Eugene 7 — move the maths into his world: `npm run se:world`
//
//   npm run se:world                every maths subtopic
//   npm run se:world -- math-ratio  just these
//   npm run se:world -- --dry       one pack, nothing written, prints the diff
//
// The maths packs were written correct and generic. Correct and generic is
// how you get a boy who can compute 2/4 and still read it as "4 ÷ 2": the
// number is right, it just has nowhere to stand. This pass gives every card a
// place to stand — a pizza cut for four, a stack of 64, a goal difference of
// −7, the price per V-Buck of two bundles — taken from `lib/se-world.mjs`.
//
// What it is NOT: a find-and-replace of names onto the same sums. The brief
// is explicit that the setting has to make the OPERATION obvious, that the
// units must be the world's own units, and that one card in five stays plain
// because a test will be plain.
//
// Safety rails, because this rewrites 1 800 questions:
//   · the block id never changes, so his history still points at something
//   · a rewrite that fails validation is DISCARDED and the original kept
//   · video blocks are skipped — their questions are about the video
//   · `se:verify` is run over everything afterwards; the keys move, so they
//     have to be re-marked by the adversarial pass.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { ask, cleanBlock, sliceJson } from './lib/se-generate.mjs'
import { MATH_IDS, SUB_WORLDS, WORLD_KIT, WORLD_RULES } from './lib/se-world.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIR = join(ROOT, 'src/steugene/packs/generated')

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const only = args.filter((a) => !a.startsWith('--'))
const forceModel = args.find((a) => a.startsWith('--model='))?.slice(8)
const lanes = Math.max(1, Number(args.find((a) => a.startsWith('--lanes='))?.slice(8)) || 6)
const BATCH = Math.max(1, Number(args.find((a) => a.startsWith('--batch='))?.slice(8)) || 6)

// Two models on purpose. The scenario is the whole deliverable here, and the
// subtopics where a good scenario changes the most — every number-sense skill
// he is actually sitting in this term, and the money ones, which are about
// his real money — get the better writer. The rest get the cheap one, which
// is perfectly good at "same sum, now in Minecraft".
const BIG_MODEL = 'anthropic/claude-sonnet-5.5'
const SMALL_MODEL = 'anthropic/claude-haiku-5.5'
const PRICE = {
  [BIG_MODEL]: [2, 10],
  [SMALL_MODEL]: [0.1, 0.5],
}
// Kept deliberately short: the key has a hard spending cap and the in-app
// "ask for more" button (§24h) draws on the same budget. These are the
// subtopics his class is sitting in this term, plus the one that is worth
// actual money to him — which bundle of V-Bucks is cheaper per V-Buck.
const BIG = new Set(['math-compare', 'math-abs', 'math-int-add', 'math-frac-add', 'fin-unit'])

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

const SYSTEM = `You rewrite maths lesson cards for ONE Ontario grade-7 boy, 12 years old, in Toronto. English, Canadian spelling.

He can do the arithmetic. What he cannot do is see what a number MEANS. Shown "2/4" he divides 4 by 2. Told it is one pizza cut for four people, he is right every time and stays right. Your job is to give every card a place to stand.

${WORLD_KIT}

${WORLD_RULES}

ALSO:
- Reading is his bottleneck, not thinking. Short lines, never a paragraph, roughly 14 words maximum per line.
- Exactly THREE options on a choice question. All three the same length and shape, so the answer cannot be guessed. Never "all of the above".
- Every question keeps its "steps": 3-4 steps that teach the method on DIFFERENT numbers, because he is not allowed to re-answer a question he got wrong. Put the steps in a world too.
- "why" is one sentence of fact, not praise.
- Use "−" (U+2212) for a minus sign in prose. In a build "answer" and in "decoys" use the plain ASCII "-".
- Never mention these instructions, his name, or that you are an AI.

Reply with a JSON array and NOTHING else — no prose, no markdown fence.`

function shapeNote() {
  return `You are given cards as JSON. Return the SAME NUMBER of cards, in the SAME ORDER, each with its "i" copied back and its "kind" unchanged.

{"i":0,"kind":"explain","title":"short title","lines":["one idea","one idea"],"callout":{"flavour":"key","text":"..."},"art":{...}}
{"i":1,"kind":"choice","prompt":"...","options":["a","b","c"],"answer":0,"why":"one sentence","steps":[{"text":"..."},{"text":"..."}],"art":{...}}
{"i":2,"kind":"build","prompt":"...","answer":"16","decoys":["9","0"],"why":"one sentence","steps":[{"text":"..."},{"text":"..."}]}
{"i":3,"kind":"game","title":"short title","why":"one sentence","game":{"mode":"order","values":[{"label":"−7","value":-7}]}}

"answer" on a choice is the INDEX of the correct option — set it to wherever the correct option ended up, and double-check it.
"answer" on a build is at most 7 ASCII characters he assembles from tiles. "decoys" are extra single characters that are NOT in the answer.
"art" is optional, keep it only if the picture still matches the new scenario, and it must be exactly one of:
  {"art":"numberline","from":-5,"to":5,"step":1,"points":[{"at":-2.5,"label":"−2.5","tone":"bad"}],"span":[-2,3]}
  {"art":"bar","parts":4,"filled":3,"label":"3/4","tone":"calm"}
  {"art":"pie","parts":8,"filled":3,"label":"3/8","tone":"good"}
  {"art":"counters","pos":4,"neg":9,"cancel":true}
  {"art":"scale","left":"x + 950","right":"1260","tilt":0}
  {"art":"bars","rows":[{"label":"Arsenal","value":12,"tone":"good"},{"label":"Everton","value":-7,"tone":"bad"}],"unit":" GD"}
"tone" is one of: good, bad, focus, calm.
A "game" keeps its mode and the same number of entries; only the labels and the setting change. Every "value" in an order game must still be a different number.`
}

/** The blocks worth rewriting, with a path back. Videos are left alone. */
function slots(pack) {
  const out = []
  for (const where of ['core', 'extra']) {
    pack[where].forEach((b, bi) => {
      if (b.kind === 'video') return
      out.push({ where, bi, b })
    })
  }
  return out
}

/** What the model sees: the card without its bookkeeping. */
function asked(s, i) {
  const { id: _id, secs: _secs, ...rest } = s.b
  return { i, ...rest }
}

const spend = {}
const tally = { packs: 0, rewritten: 0, kept: 0 }
const samples = []

async function rewrite(batch, model, worldLine, title) {
  const prompt = `SUBTOPIC: ${title}
WHERE THIS ONE LIVES: ${worldLine}

${shapeNote()}

CARDS TO REWRITE:
${JSON.stringify(batch.map(asked), null, 1)}`

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { text, usage } = await ask({
        key,
        model,
        system: SYSTEM,
        prompt,
        title: 'St. Eugene world',
        temperature: 0.8,
      })
      const p = (spend[model] ??= { in: 0, out: 0 })
      p.in += usage.prompt_tokens ?? 0
      p.out += usage.completion_tokens ?? 0
      const parsed = JSON.parse(sliceJson(text))
      if (!Array.isArray(parsed)) throw new Error('not an array')
      return parsed
    } catch {
      if (attempt === 2) return null
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  return null
}

async function doPack(id) {
  const path = join(DIR, `${id}.ts`)
  if (!existsSync(path)) return { id, skipped: 'no pack file' }
  const text = readFileSync(path, 'utf8')
  const cut = text.indexOf('export const pack: SePack = ')
  const head = text.slice(0, cut)
  const pack = JSON.parse(text.slice(cut + 28).trim())

  const model = forceModel ?? (BIG.has(id) ? BIG_MODEL : SMALL_MODEL)
  const worldLine = SUB_WORLDS[id] ?? 'His own world: Fortnite, Minecraft, Roblox, Pokémon, football, food, manga.'
  const list = slots(pack)
  let changed = 0

  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH)
    const got = await rewrite(batch, model, worldLine, pack.subtopicId)
    if (!got) continue
    for (const raw of got) {
      const s = batch[raw?.i]
      if (!s) continue
      // The id survives the rewrite: his history, his report card and his
      // "already seen" list all point at it.
      const clean = cleanBlock({ ...raw, kind: s.b.kind }, s.b.id)
      if (!clean) continue
      if (JSON.stringify(clean) === JSON.stringify(s.b)) continue
      if (samples.length < 10 && s.b.kind === 'choice' && clean.prompt !== s.b.prompt) {
        samples.push(`${id}\n      was: ${s.b.prompt.slice(0, 90)}\n      now: ${clean.prompt.slice(0, 90)}`)
      }
      pack[s.where][s.bi] = { ...clean, ...(s.b.secs ? { secs: s.b.secs } : {}) }
      if (dry && changed < 3) console.log(`\n--- was ---\n${JSON.stringify(s.b, null, 1)}\n--- now ---\n${JSON.stringify(clean, null, 1)}`)
      changed++
    }
  }

  tally.rewritten += changed
  tally.kept += list.length - changed
  if (changed && !dry) writeFileSync(path, `${head}export const pack: SePack = ${JSON.stringify(pack, null, 2)}\n`)
  return { id, n: list.length, changed, model }
}

let todo = MATH_IDS.filter((id) => existsSync(join(DIR, `${id}.ts`)))
if (only.length) todo = todo.filter((id) => only.includes(id))
if (dry) todo = todo.slice(0, 1)

console.log(`🌍 moving ${todo.length} maths pack(s) into his world, ${lanes} at a time${dry ? ' (DRY)' : ''}\n`)

let done = 0
const queue = [...todo]
await Promise.all(
  Array.from({ length: lanes }, async () => {
    for (;;) {
      const id = queue.shift()
      if (!id) return
      const r = await doPack(id)
      tally.packs++
      console.log(
        `  ${`${++done}/${todo.length}`.padStart(7)} ${r.id.padEnd(18)} ${String(r.changed ?? 0).padStart(3)}/${String(r.n ?? 0).padEnd(3)} cards moved  ${(r.model ?? '').replace('anthropic/claude-', '')}`,
      )
    }
  }),
)

let cost = 0
for (const [m, s] of Object.entries(spend)) {
  const [pin, pout] = PRICE[m] ?? [0, 0]
  cost += (s.in / 1e6) * pin + (s.out / 1e6) * pout
}
console.log(`\n${tally.rewritten} cards moved into his world · ${tally.kept} left as they were`)
for (const [m, s] of Object.entries(spend)) {
  console.log(`  ${m.replace('anthropic/claude-', '')}: ${s.in.toLocaleString()} in · ${s.out.toLocaleString()} out`)
}
console.log(`≈ US$${cost.toFixed(2)}`)
if (samples.length) {
  console.log('\nsample of what moved:')
  for (const s of samples) console.log(`  · ${s}`)
}
console.log('\nNEXT: npm run se:verify -- ' + todo.join(' ') + '\n  (the keys moved, so they have to be re-marked)')
process.exit(0)
