// 🏫 St. Eugene 7 — write a lesson pack for every subtopic: `npm run se:seed`
//
//   npm run se:seed                 every subtopic that has no pack yet
//   npm run se:seed -- math-abs     just these
//   npm run se:seed -- --force      rewrite packs that already exist
//   npm run se:seed -- --no-videos  skip the YouTube pass (faster, offline-ish)
//   npm run se:seed -- --dry        one subtopic, nothing written, prints a sample
//
// The output is COMMITTED TYPESCRIPT, not rows in a database. That is the
// whole design: a generated lesson has to be reviewable in a diff, correctable
// by hand, and shipped in the bundle so the tablet has it offline. A model
// wrote it, but the repo owns it.
//
// Resumable by default — a subtopic with a file is skipped — because this
// makes hundreds of calls and the wifi will drop at least once.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { loadTs } from './lib/se-bundle.mjs'
import { pickVideos } from './lib/se-youtube.mjs'
import { ask, cleanBlock, sliceJson, GAME_SHAPE, SEED_MODEL, SHAPES, STYLE } from './lib/se-generate.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT_DIR = join(ROOT, 'src/steugene/packs/generated')

const args = process.argv.slice(2)
const force = args.includes('--force')
const dry = args.includes('--dry')
const noVideos = args.includes('--no-videos')
const only = args.filter((a) => !a.startsWith('--'))
const model = args.find((a) => a.startsWith('--model='))?.slice(8) ?? SEED_MODEL
const lanes = Math.max(1, Number(args.find((a) => a.startsWith('--lanes='))?.slice(8)) || 3)

// --- the key -------------------------------------------------------------------

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
  console.error('No OpenRouter key in app/aiConfig — set it in the app under Settings → API key.')
  process.exit(1)
}

// --- what to write ---------------------------------------------------------------

const { curriculum } = await loadTs(join(ROOT, 'scripts/steugene-seed.entry.ts'))
const all = curriculum()
mkdirSync(OUT_DIR, { recursive: true })

const HAND_WRITTEN = new Set(['math-rational']) // never overwritten by a model

let todo = all.filter((s) => !HAND_WRITTEN.has(s.id))
if (only.length) todo = todo.filter((s) => only.includes(s.id))
if (!force) todo = todo.filter((s) => !existsSync(join(OUT_DIR, `${s.id}.ts`)))
if (dry) todo = todo.slice(0, 1)

console.log(`🏫 seeding ${todo.length} subtopic(s) with ${model}, ${lanes} at a time${dry ? ' (DRY)' : ''}\n`)

const spend = { in: 0, out: 0 }
const failures = []

// --- the batches -----------------------------------------------------------------

/**
 * Six angles on one subtopic, asked in parallel.
 *
 * They are separate calls rather than one big one for two reasons: a model
 * asked for fifty cards in one breath writes the last twenty carelessly, and
 * one failed call then costs the whole subtopic instead of a sixth of it.
 * Each angle is deliberately different so the six do not collide.
 */
function batches(s) {
  const who = `Subject: ${s.subject}. Strand: ${s.strand}.\nTopic: ${s.title} — ${s.plain}\nWhat it looks like on the page: ${s.sample}`
  const skin = s.skin === 'bluelock' ? 'Blue Lock (football) first, One Piece second' : 'One Piece first, Blue Lock second'
  const buildHint =
    s.subjectId === 'math'
      ? 'Answers are numbers, fractions or decimals.'
      : s.subjectId === 'history'
        ? 'Answers are years (e.g. "1813") or very short words.'
        : s.subjectId === 'language'
          ? 'Answers are single short words, correctly spelled.'
          : 'Answers are numbers, units or very short words (under 7 characters).'

  return [
    {
      tag: 'teach',
      prompt: `${who}\n\nFlavour: ${skin}.\n\nWrite 6 "explain" cards that teach this topic from the beginning, in order: what it is, why it matters, the method, the common trap, a worked example in words, and a recap. Add "art" wherever a picture genuinely helps.\n\n${SHAPES}`,
    },
    {
      tag: 'basics',
      prompt: `${who}\n\nFlavour: ${skin}.\n\nWrite 10 "choice" questions on the CORE of this topic — the things the test will definitely ask. Straightforward but real. Vary what each one asks about.\n\n${SHAPES}`,
    },
    {
      tag: 'applied',
      prompt: `${who}\n\nFlavour: ${skin}.\n\nWrite 10 "choice" questions that put this topic inside a STORY — a pirate crew, a football match, a Toronto street, a school trip. The scenario is the wrapper; the question underneath is real grade-7 work. Harder than textbook basics.\n\n${SHAPES}`,
    },
    {
      tag: 'build',
      prompt: `${who}\n\nFlavour: ${skin}.\n\nWrite 8 "build" questions — he assembles the answer from tiles. ${buildHint} Keep every answer at most 7 characters. Give 2-3 "decoys".\n\n${SHAPES}`,
    },
    {
      tag: 'deeper',
      prompt: `${who}\n\nFlavour: ${skin}.\n\nWrite 6 "explain" cards and 6 "choice" questions on the parts of this topic people get WRONG — the exceptions, the confusions, the two things that look alike. Come at it from a different angle than a textbook would.\n\n${SHAPES}`,
    },
    { tag: 'games', prompt: `${who}\n\nWrite 2 minigames for this topic.\n\n${GAME_SHAPE}`, system: STYLE },
  ]
}

async function generate(s) {
  const jobs = batches(s).map(async (b) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { text, usage } = await ask({
          key,
          model,
          system: b.system ?? `${STYLE}\n\n${SHAPES}`,
          prompt: b.prompt,
          title: `St. Eugene seed · ${s.id}`,
          temperature: 0.8,
        })
        spend.in += usage.prompt_tokens ?? 0
        spend.out += usage.completion_tokens ?? 0
        const parsed = JSON.parse(sliceJson(text))
        if (!Array.isArray(parsed)) throw new Error('not an array')
        return parsed.map((item, i) => cleanBlock(item, `${s.id}-${b.tag}-${i}`)).filter(Boolean)
      } catch (e) {
        if (attempt === 2) {
          failures.push(`${s.id}/${b.tag}: ${e.message}`)
          return []
        }
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      }
    }
    return []
  })

  const videoJob = noVideos ? Promise.resolve([]) : videosFor(s)
  const [groups, videos] = await Promise.all([Promise.all(jobs), videoJob])
  return { groups, videos }
}

// --- videos ------------------------------------------------------------------------

const SEARCH_HINT = {
  math: 'grade 7 math',
  science: 'grade 7 science',
  history: 'Canadian history for kids',
  geography: 'geography for kids',
  language: 'grade 7 English lesson',
}

async function videosFor(s) {
  let found = []
  try {
    found = await pickVideos(`${s.title} ${SEARCH_HINT[s.subjectId] ?? ''}`.trim(), 3)
  } catch (e) {
    failures.push(`${s.id}/videos: ${e.message}`)
    return []
  }
  if (!found.length) return []

  // Two questions per video, written against what the video teaches. YouTube
  // no longer serves caption text to anyone without a browser (see the repo
  // notes), so these are concept checks asked the second it ends rather than
  // "what colour was his shirt" — which is the half that was ever worth
  // asking anyway.
  const list = found.map((v, i) => `${i}. "${v.title}" by ${v.by}`).join('\n')
  try {
    const { text, usage } = await ask({
      key,
      model,
      system: `${STYLE}\n\n${SHAPES}`,
      prompt: `Subject: ${s.subject}. Topic: ${s.title} — ${s.plain}\n\nA student has just finished watching each of these videos:\n${list}\n\nFor EACH video in order, write exactly 2 "choice" questions about the idea that video teaches — answerable by someone who just watched it and paid attention, not by someone guessing. Return one flat JSON array of ${found.length * 2} choice questions, in video order, 2 per video.\n\n${SHAPES}`,
      title: `St. Eugene seed · ${s.id} · video checks`,
      temperature: 0.7,
    })
    spend.in += usage.prompt_tokens ?? 0
    spend.out += usage.completion_tokens ?? 0
    const checks = JSON.parse(sliceJson(text))
      .map((item, i) => cleanBlock(item, `${s.id}-vq-${i}`))
      .filter((b) => b && b.kind === 'choice')

    return found
      .map((v, i) => {
        const mine = checks.slice(i * 2, i * 2 + 2).map(({ id: _id, kind: _kind, ...rest }) => rest)
        if (!mine.length) return null // a video nobody is asked about is just television
        return {
          kind: 'video',
          id: `${s.id}-v${i}`,
          youtube: v.id,
          title: v.title.slice(0, 90),
          by: v.by,
          seconds: v.seconds,
          checks: mine,
        }
      })
      .filter(Boolean)
  } catch (e) {
    failures.push(`${s.id}/video-checks: ${e.message}`)
    return []
  }
}

// --- assembling the pack -------------------------------------------------------------

/**
 * `core` is the spine he meets first: teach, ask, ask, watch, ask, build…
 * `extra` is everything else, which is where a repeat and a long day draw from.
 */
function assemble(s, groups, videos) {
  const [teach, basics, applied, build, deeper, games] = groups
  const explains = [...teach, ...deeper.filter((b) => b.kind === 'explain')]
  const questions = [...basics, ...applied, ...deeper.filter((b) => b.kind !== 'explain')]
  const builds = build

  const core = []
  const used = new Set()
  const take = (list, n) => {
    const out = list.filter((b) => !used.has(b.id)).slice(0, n)
    for (const b of out) used.add(b.id)
    return out
  }
  core.push(...take(explains, 1))
  core.push(...take(questions, 2))
  if (videos[0]) {
    core.push(videos[0])
    used.add(videos[0].id)
  }
  core.push(...take(questions, 2))
  core.push(...take(explains, 1))
  core.push(...take(builds, 1))
  core.push(...take(questions, 2))
  if (games[0]) {
    core.push(games[0])
    used.add(games[0].id)
  }
  core.push(...take(explains, 1))
  core.push(...take(questions, 2))
  core.push(...take(builds, 1))

  const extra = [...explains, ...questions, ...builds, ...games, ...videos].filter((b) => !used.has(b.id))
  return { subtopicId: s.id, core, extra }
}

function write(s, pack) {
  const body = JSON.stringify(pack, null, 2)
  const file = `// 🏫 St. Eugene 7 (§24) — ${s.subject} · ${s.title}
//
// GENERATED by \`npm run se:seed\`. Safe to edit by hand, but a re-seed with
// --force overwrites it; to keep an edit forever, add the id to HAND_WRITTEN
// in scripts/steugene-seed.mjs.
//
// ${pack.core.length} core + ${pack.extra.length} bench blocks.
import type { SePack } from '../../types'

export const pack: SePack = ${body}
`
  writeFileSync(join(OUT_DIR, `${s.id}.ts`), file)
}

// --- the run ----------------------------------------------------------------------

let done = 0
async function lane(queue) {
  for (;;) {
    const s = queue.shift()
    if (!s) return
    const started = Date.now()
    const { groups, videos } = await generate(s)
    const pack = assemble(s, groups, videos)
    const n = pack.core.length + pack.extra.length
    if (n < 20) {
      failures.push(`${s.id}: only ${n} usable blocks — not written`)
      console.log(`  ✗ ${(++done + '/' + todo.length).padStart(7)} ${s.id} — only ${n} blocks`)
      continue
    }
    if (!dry) write(s, pack)
    console.log(
      `  ✓ ${(++done + '/' + todo.length).padStart(7)} ${s.id.padEnd(18)} ${String(n).padStart(3)} blocks · ${videos.length} video(s) · ${Math.round((Date.now() - started) / 1000)}s`,
    )
    if (dry) console.log(JSON.stringify(pack.core.slice(0, 3), null, 2))
  }
}

const queue = [...todo]
await Promise.all(Array.from({ length: lanes }, () => lane(queue)))

// The generated directory is read by `import.meta.glob` at build time, so
// adding a file IS registering it — there is no index to rewrite.

// --- the bill -------------------------------------------------------------------------

const cost = (spend.in / 1e6) * 0.1 + (spend.out / 1e6) * 0.5
console.log(`\ntokens: ${spend.in.toLocaleString()} in · ${spend.out.toLocaleString()} out  ≈ US$${cost.toFixed(2)}`)
if (failures.length) {
  console.log(`\n${failures.length} problem(s):`)
  for (const f of failures.slice(0, 40)) console.log(`  · ${f}`)
}
process.exit(0)
