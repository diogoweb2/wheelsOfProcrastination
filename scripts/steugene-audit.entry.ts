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
import { ensurePack, writtenSubtopics } from '../src/steugene/packs'
import { SE_LENGTHS, seAvailable, seBlockSeconds, sePlanLesson, seTiles } from '../src/logic/steugeneLesson'
import type { SeBlock } from '../src/steugene/types'

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
      if (b.kind === 'video') videos++
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
