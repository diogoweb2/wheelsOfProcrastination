// The checks themselves. Bundled and run by `scripts/steugene-audit.mjs`.
//
// Two classes of finding, kept apart on purpose:
//   PROBLEMS are structural — a question with no right answer, tiles that
//   cannot spell the answer, a game whose order is luck. These fail the run,
//   because he cannot tell a broken card from a hard one and will blame
//   himself for both.
//   THIN is a length warning — a bench too short for the longest lesson. Real,
//   but it is a content backlog, not a bug, so it reports and moves on.
import { SE_SUBJECTS, CURRENT_SUBTOPIC, seFind, seAllSubtopics } from '../src/logic/steugene'
import { WRITTEN_IDS, ensurePack, writtenSubtopics } from '../src/steugene/packs'
import { SE_LENGTHS, seAvailable, seBlockSeconds, sePlanLesson, seTiles } from '../src/logic/steugeneLesson'
import { SE_VIDEOS } from '../src/steugene/videoIndex'
import { collectVideos } from './steugene-video-index.entry'
import type { SeArt, SeBlock, SeChoice } from '../src/steugene/types'

export async function audit(verbose = false): Promise<boolean> {
  const problems: string[] = []
  const thin: string[] = []
  const fail = (m: string) => problems.push(m)

  const all = seAllSubtopics()
  console.log(`🏫 ${SE_SUBJECTS.length} subjects · ${all.length} subtopics · you are here: ${CURRENT_SUBTOPIC}`)
  if (!seFind(CURRENT_SUBTOPIC)) fail('CURRENT_SUBTOPIC is not a subtopic in the map')

  const longest = Math.max(...SE_LENGTHS)
  let packs = 0
  let blocks = 0
  let videos = 0
  let minutesAll = 0
  const empty: string[] = []

  const written = writtenSubtopics()
  for (const { subject, subtopic } of all) {
    // Generated packs are their own chunks (§24k), so the audit has to pull
    // each one in rather than reading a registry.
    const pack = written.has(subtopic.id) ? await ensurePack(subtopic.id) : null
    if (!pack) {
      empty.push(subtopic.id)
      continue
    }
    packs++
    const list = [...pack.core, ...pack.extra]
    blocks += list.length
    const ids = new Set<string>()

    for (const b of list) {
      if (ids.has(b.id)) fail(`${subtopic.id}: duplicate block id "${b.id}"`)
      ids.add(b.id)
      checkBlock(b, subtopic.id, fail)
      if (WRITTEN_IDS.includes(subtopic.id)) checkWritten(b, fail)
      if (b.kind === 'video') videos++
    }
    // A lead (§24d) is the picture shown right before its question: it has to
    // be an explain card in this same pack.
    for (const b of list) {
      if (!b.lead) continue
      const lead = list.find((x) => x.id === b.lead)
      if (!lead) fail(`${subtopic.id}/${b.id}: lead "${b.lead}" is not in this pack`)
      else if (lead.kind !== 'explain') fail(`${subtopic.id}/${b.id}: lead "${b.lead}" is a ${lead.kind}, not an explain`)
    }

    const bench = seAvailable(pack, [])
    const minutes = Math.round(bench.reduce((n, b) => n + seBlockSeconds(b), 0) / 60)
    minutesAll += minutes
    if (minutes < longest) thin.push(`${subtopic.id} (${minutes} min)`)

    if (verbose) {
      console.log(`\n${subtopic.emoji} ${subject.name} · ${subtopic.title} — ${list.length} blocks, ${minutes} min`)
      for (const m of SE_LENGTHS) {
        const plan = sePlanLesson(bench, [], m * 60)
        const qs = plan.filter((b) => b.kind === 'choice' || b.kind === 'build').length
        console.log(`   ${String(m).padStart(2)} min → ${plan.length} cards · ${qs} questions`)
      }
    }
  }

  // 🎬 The shelf's catalogue (§24z) is a COPY of what the packs hold, so it
  // can go stale the moment anyone adds a video — and a stale shelf is a video
  // he cannot find or a row that plays nothing. Comparing it here means the
  // same command that already reads every pack is the one that notices.
  const fresh = JSON.stringify(await collectVideos())
  if (fresh !== JSON.stringify(SE_VIDEOS)) {
    fail(`src/steugene/videoIndex.ts is out of date — run \`npm run se:video-index\` (packs have ${JSON.parse(fresh).length} videos, the index has ${SE_VIDEOS.length})`)
  }

  console.log(
    `\n${packs}/${all.length} subtopics written · ${blocks} blocks · ${videos} videos · ${Math.round(minutesAll / 60)}h of material`,
  )
  if (empty.length) console.log(`${empty.length} still empty: ${empty.slice(0, 8).join(', ')}${empty.length > 8 ? '…' : ''}`)
  if (thin.length) {
    console.log(`\n⚠️  ${thin.length} pack(s) under ${longest} ESTIMATED minutes:`)
    console.log(`   ${thin.slice(0, 12).join(', ')}${thin.length > 12 ? `, +${thin.length - 12} more` : ''}`)
    // The estimates are what a block costs someone who already knows the
    // answer. His real sessions run about 1.4x the plan (the Gym learned the
    // same thing, §18z), so ~45 estimated minutes is already an hour of his
    // actual time. Anything well under that is the one worth refilling.
    console.log('   (estimates are "already knows it" time; his real pace runs ~1.4x, so ~45 min est ≈ an hour)')
  }
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`)
    for (const p of problems.slice(0, 40)) console.log(`  ✗ ${p}`)
    if (problems.length > 40) console.log(`  … and ${problems.length - 40} more`)
  } else {
    console.log('\nall structural checks passed')
  }
  return problems.length === 0
}

function checkBlock(b: SeBlock, where: string, fail: (m: string) => void) {
  if (b.kind === 'choice') {
    if (b.options.length !== 3) fail(`${b.id}: ${b.options.length} options, want 3 (§24f)`)
    if (b.answer < 0 || b.answer >= b.options.length) fail(`${b.id}: answer index ${b.answer} out of range`)
    if (new Set(b.options.map((o) => o.toLowerCase())).size !== b.options.length) fail(`${b.id}: two options read the same`)
    if (!b.steps?.length) fail(`${b.id}: no walk-through — a miss would teach nothing`)
  }

  if (b.kind === 'build') {
    const pool = [...seTiles(b.answer, b.decoys)]
    if (pool.length < 5) fail(`${b.id}: only ${pool.length} tiles`)
    for (const ch of b.answer) {
      const i = pool.indexOf(ch)
      if (i === -1) {
        fail(`${b.id}: the tiles cannot spell "${b.answer}"`)
        break
      }
      pool.splice(i, 1)
    }
    if (!b.steps?.length) fail(`${b.id}: no walk-through`)
  }

  if (b.kind === 'video') {
    if (!/^[\w-]{11}$/.test(b.youtube)) fail(`${b.id}: "${b.youtube}" is not a YouTube id`)
    if (!b.checks.length) fail(`${b.id}: a video nobody is asked about is just television`)
    b.checks.forEach((c, i) => {
      if (c.options.length !== 3) fail(`${b.id} check ${i}: ${c.options.length} options, want 3`)
      if (c.answer < 0 || c.answer >= c.options.length) fail(`${b.id} check ${i}: answer out of range`)
    })
  }

  if (b.kind === 'game' && b.game.mode === 'line') {
    const spots: number[] = []
    for (let v = b.game.from; v <= b.game.to + 1e-9; v += b.game.step) spots.push(Number(v.toFixed(4)))
    for (const t of b.game.targets) {
      if (!spots.some((sp) => Math.abs(sp - t.at) < 1e-6)) fail(`${b.id}: "${t.label}" is not on a tick`)
    }
  }

  if (b.kind === 'game' && b.game.mode === 'order') {
    const vals = b.game.values.map((v) => v.value)
    if (new Set(vals).size !== vals.length) fail(`${b.id}: two values are equal — the order is luck, not maths`)
  }

  if (b.kind === 'game' && b.game.mode === 'pair') {
    const lefts = b.game.pairs.map((p) => p[0])
    const rights = b.game.pairs.map((p) => p[1])
    if (new Set(lefts).size !== lefts.length) fail(`${b.id}: a left card appears twice`)
    if (new Set(rights).size !== rights.length) fail(`${b.id}: two pairs share a right card — ambiguous`)
  }

  if (where === '') fail('unreachable')
}

// --- the stricter bar for hand-written packs (§24n) -----------------------------
//
// A generator cannot be held to these; a person writing by hand can. Each one
// is a way a card can be technically "fine" and still teach the wrong thing.

type Check = Omit<SeChoice, 'kind' | 'id'>

function checkWritten(b: SeBlock, fail: (m: string) => void) {
  const arts: SeArt[] = []
  const ask = (c: Check, where: string) => {
    // The key has to agree with its own explanation. A "why" that works the
    // sum out to 80 under an option marked "100°" is a mis-keyed question,
    // and on this app a mis-keyed question seals his RIGHT answer away (§24f).
    const nums = (t: string) => (t.replace(/−/g, '-').match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, '')))
    const keyNums = nums(c.options[c.answer] ?? '')
    const said = nums(c.why)
    if (keyNums.length && !keyNums.some((n) => said.some((w) => Math.abs(w - n) < 1e-9)))
      fail(`${where}: the "why" never says the keyed answer (${c.options[c.answer]})`)
    // §24f: the right answer must never be the one that LOOKS right — the
    // longest option is the oldest tell there is.
    const len = c.options.map((o) => o.length)
    const mine = len[c.answer]
    if (mine > 0 && len.every((l, i) => i === c.answer || l < mine)) fail(`${where}: the right answer is the longest option`)
    if (!c.why?.trim()) fail(`${where}: no "why"`)
    if (c.art) arts.push(c.art)
    for (const st of c.steps ?? []) if (st.art) arts.push(st.art)
    stepsReadRight(c.steps, where)
  }
  // A walk-through step he has to read is a sentence, not a stub.
  const stepsReadRight = (steps: { text: string }[] | undefined, where: string) => {
    for (const st of steps ?? []) if (st.text.trim().length < 2 || /\b(TODO|TBD|fixed below)\b/i.test(st.text)) fail(`${where}: a walk-through step is a placeholder`)
  }
  // A hop is drawn to where it LANDS, and on a question that is the answer.
  // Hops belong on explanations and walk-throughs.
  if ((b.kind === 'choice' || b.kind === 'build') && b.art?.art === 'numberline' && b.art.hops?.length)
    fail(`${b.id}: hops on a question draw the answer`)
  if (b.kind === 'choice') {
    ask(b, b.id)
    if ((b.steps?.length ?? 0) < 2) fail(`${b.id}: a walk-through needs at least two steps`)
  }
  if (b.kind === 'video') b.checks.forEach((c, i) => ask(c, `${b.id} check ${i}`))
  if (b.kind === 'build') {
    if (b.art) arts.push(b.art)
    for (const st of b.steps ?? []) if (st.art) arts.push(st.art)
    stepsReadRight(b.steps, b.id)
    if ((b.steps?.length ?? 0) < 2) fail(`${b.id}: a walk-through needs at least two steps`)
    if (/[−–]/.test(b.answer)) fail(`${b.id}: a build answer is typed with tiles, so its minus is "-", not "−"`)
  }
  if (b.kind === 'explain' && b.art) arts.push(b.art)
  // Two cards that LOOK the same are one card to him: tapping the "wrong"
  // twin would be marked as a slip for a correct answer.
  if (b.kind === 'game' && b.game.mode === 'pair') {
    const look = (v: string) => v.trim().toLowerCase()
    if (new Set(b.game.pairs.map((p) => look(p[1]))).size !== b.game.pairs.length) fail(`${b.id}: two right-hand cards look the same`)
    if (new Set(b.game.pairs.map((p) => look(p[0]))).size !== b.game.pairs.length) fail(`${b.id}: two left-hand cards look the same`)
  }
  if (b.kind === 'game' && b.game.mode === 'order') {
    const look = new Set(b.game.values.map((v) => v.label.trim()))
    if (look.size !== b.game.values.length) fail(`${b.id}: two chips have the same label`)
  }
  for (const a of arts) checkArt(a, b.id, fail)
}

function checkArt(a: SeArt, id: string, fail: (m: string) => void) {
  const inside = (v: number, lo: number, hi: number, what: string) => {
    if (v < lo - 1e-9 || v > hi + 1e-9) fail(`${id}: ${what} ${v} is off the drawing (${lo}…${hi})`)
  }
  switch (a.art) {
    case 'numberline':
      for (const p of a.points ?? []) inside(p.at, a.from, a.to, 'point')
      for (const h of a.hops ?? []) {
        inside(h.from, a.from, a.to, 'hop start')
        inside(h.to, a.from, a.to, 'hop end')
      }
      for (const v of a.span ?? []) inside(v, a.from, a.to, 'span end')
      break
    case 'ylevel':
      for (const m of a.marks ?? []) inside(m.at, a.from, a.to, 'Y mark')
      for (const v of a.dig ?? []) inside(v, a.from, a.to, 'dig end')
      break
    case 'thermo':
      inside(a.at, a.from, a.to, 'temperature')
      for (const m of a.marks ?? []) inside(m.at, a.from, a.to, 'mark')
      break
    case 'plane':
      for (const p of a.points ?? []) {
        inside(p.x, a.x[0], a.x[1], 'x')
        inside(p.y, a.y[0], a.y[1], 'y')
      }
      for (const poly of a.polys ?? [])
        for (const [x, y] of poly.pts) {
          inside(x, a.x[0], a.x[1], 'x')
          inside(y, a.y[0], a.y[1], 'y')
        }
      break
    case 'pizza':
      for (const p of a.pies) if ((p.take ?? 0) + (p.gone ?? 0) > p.slices) fail(`${id}: more slices taken than the pizza has`)
      break
    case 'hearts':
      if (a.full + (a.lost ?? 0) > (a.max ?? 10)) fail(`${id}: more hearts than the bar holds`)
      break
    case 'bar':
    case 'pie':
      if (a.filled > a.parts) fail(`${id}: ${a.filled} of ${a.parts} filled`)
      break
    case 'table':
      for (const r of a.rows) if (r.length !== a.head.length) fail(`${id}: a table row is the wrong width`)
      break
    case 'chart':
      if (a.labels.length !== a.values.length) fail(`${id}: chart labels and values differ in number`)
      break
  }
}
