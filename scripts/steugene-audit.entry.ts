// The checks themselves. Bundled and run by `scripts/steugene-audit.mjs`.
import { SE_SUBJECTS, CURRENT_SUBTOPIC, seFind, seAllSubtopics } from '../src/logic/steugene'
import { packFor } from '../src/steugene/packs'
import { SE_LENGTHS, seAvailable, seBlockSeconds, sePlanLesson, seTiles } from '../src/logic/steugeneLesson'

export function audit(): boolean {
  let bad = 0
  const fail = (m: string) => {
    console.log(`  ✗ ${m}`)
    bad++
  }

  const all = seAllSubtopics()
  console.log(`🏫 ${SE_SUBJECTS.length} subjects · ${all.length} subtopics · you are here: ${CURRENT_SUBTOPIC}`)
  if (!seFind(CURRENT_SUBTOPIC)) fail('CURRENT_SUBTOPIC is not a subtopic in the map')

  const longest = Math.max(...SE_LENGTHS)
  let packs = 0

  for (const { subtopic } of all) {
    const pack = packFor(subtopic.id)
    if (!pack) continue
    packs++
    const blocks = [...pack.core, ...pack.extra]
    const ids = new Set<string>()

    for (const b of blocks) {
      if (ids.has(b.id)) fail(`${subtopic.id}: duplicate block id "${b.id}"`)
      ids.add(b.id)

      if (b.kind === 'choice') {
        if (b.options.length !== 3) fail(`${b.id}: ${b.options.length} options, want 3 (§24f)`)
        if (b.answer < 0 || b.answer >= b.options.length) fail(`${b.id}: answer index ${b.answer} is out of range`)
        if (new Set(b.options).size !== b.options.length) fail(`${b.id}: two options read the same`)
        if (!b.steps?.length) fail(`${b.id}: no walk-through — a miss would teach nothing`)
      }

      if (b.kind === 'build') {
        const tiles = seTiles(b.answer, b.decoys)
        const pool = [...tiles]
        for (const ch of b.answer) {
          const i = pool.indexOf(ch)
          if (i === -1) {
            fail(`${b.id}: the tiles cannot spell "${b.answer}"`)
            break
          }
          pool.splice(i, 1)
        }
        if (tiles.length < 5) fail(`${b.id}: only ${tiles.length} tiles — too easy`)
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
    }

    const bench = seAvailable(pack, [])
    const minutes = Math.round(bench.reduce((n, b) => n + seBlockSeconds(b), 0) / 60)
    console.log(`\n${subtopic.emoji} ${subtopic.title} — ${blocks.length} blocks, ${minutes} min on the bench`)
    for (const m of SE_LENGTHS) {
      const plan = sePlanLesson(bench, [], m * 60)
      const est = Math.round(plan.reduce((n, b) => n + seBlockSeconds(b), 0) / 60)
      const qs = plan.filter((b) => b.kind === 'choice' || b.kind === 'build').length
      console.log(`   ${String(m).padStart(2)} min → ${plan.length} cards · ~${est} min · ${qs} questions`)
    }
    if (minutes < longest) fail(`${subtopic.id}: the bench is ${minutes} min, short of a ${longest}-minute lesson`)

    // A repeat has to feel different, or "do it again" is a punishment.
    const first = sePlanLesson(bench, [], 40 * 60).map((b) => b.id)
    const again = sePlanLesson(bench, first, 40 * 60)
    const fresh = again.filter((b) => !first.includes(b.id)).length
    console.log(`   repeat: ${fresh}/${again.length} cards he has never seen`)
  }

  console.log(`\n${packs} pack(s) written, ${all.length - packs} subtopics still empty`)
  console.log(bad ? `${bad} problem(s)` : 'all checks passed')
  return bad === 0
}
