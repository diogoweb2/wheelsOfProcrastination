// Write GYM_CATALOG.md from whatever is actually live: `npm run gym:catalog`.
//
// The catalog is edited in two places — `scripts/data/gym-catalog.json` (then
// `npm run gym:seed`) and the app's Gear tab, which writes straight to
// Firestore. Only one of those is readable on a phone in a basement, so this
// prints the live document as a single page you can scan: what you own, and
// every exercise grouped by the muscle area it is filed under.
//
// It reads Firestore, never the seed file, precisely so a hand edit made in the
// app shows up here.
//
// Flags:
//   --out=PATH    write somewhere else (default GYM_CATALOG.md)
//   --stdout      print instead of writing
import { writeFileSync } from 'node:fs'
import { getDoc } from 'firebase/firestore'
import { catalogRef } from './gym-audit.mjs'

const args = process.argv.slice(2)
const OUT = (args.find((a) => a.startsWith('--out=')) ?? '').slice(6) || 'GYM_CATALOG.md'
const STDOUT = args.includes('--stdout')

/** Display order and headings. An exercise is filed under its FIRST part. */
const PARTS = [
  ['chest', 'Chest'], ['back', 'Back'], ['shoulders', 'Shoulders'], ['arms', 'Arms'],
  ['forearms', 'Forearms'], ['legs', 'Legs'], ['glutes', 'Glutes'], ['core', 'Core'],
  ['fullBody', 'Full body'], ['power', 'Power'], ['cardio', 'Cardio'],
]
const LABEL = new Map(PARTS)

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|')
const amount = (e) => `${e.defaultSets} × ${e.defaultReps}${e.kind === 'timed' ? 's' : e.kind === 'cardio' ? ' min' : ''}${e.perSide ? ' /side' : ''}`

function render({ equipment = [], exercises = [] }) {
  const gearName = new Map(equipment.map((e) => [e.id, e.name]))
  const live = exercises.filter((e) => !e.retired)
  const retired = exercises.filter((e) => e.retired)
  const gearOf = (e) => (e.equipmentIds.length ? e.equipmentIds.map((id) => gearName.get(id) ?? id).join(', ') : 'Bodyweight')

  const out = [
    '# Gym — equipment & exercise catalog',
    '',
    `Generated from Firestore \`app/gymCatalog\` by \`npm run gym:catalog\` on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand — edit the gym, then re-run it.`,
    '',
    `**${equipment.filter((e) => !e.retired).length} pieces of equipment · ${live.length} exercises** (${live.filter((e) => e.demo).length} with an animation).`,
    '',
    'The catalog file is [scripts/data/gym-catalog.json](scripts/data/gym-catalog.json) (`npm run gym:seed` to push it); day-to-day edits happen in the app at Gym → Gear. Rules: [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) §18k.',
    '',
    '---',
    '',
    '## 🧰 Equipment',
    '',
  ]
  for (const g of equipment.filter((e) => !e.retired)) {
    const uses = live.filter((e) => e.equipmentIds.includes(g.id)).length
    out.push(`### ${g.emoji ?? ''} ${g.name}`, '', (g.notes ?? '').trim() || '_No notes recorded._', '', `*Used by ${uses} exercise${uses === 1 ? '' : 's'}.*`, '')
  }
  const bw = live.filter((e) => !e.equipmentIds.length).length
  out.push('### 🤸 No equipment', '', `Floor and bodyweight work — ${bw} exercises need nothing but the room.`, '', '---', '')

  out.push('## 💪 Exercises by muscle area', '', 'Filed under the **first** of its body parts; "Also works" is the rest. 🎬 = has an animation.', '')
  for (const [key, heading] of PARTS) {
    const list = live.filter((e) => e.parts[0] === key).sort((a, b) => a.name.localeCompare(b.name))
    if (!list.length) continue
    out.push(`### ${heading} — ${list.length}`, '', '| Exercise | Equipment | Sets × reps | Rest | Also works |', '| --- | --- | --- | --- | --- |')
    for (const e of list) {
      const also = e.parts.slice(1).map((p) => LABEL.get(p) ?? p).join(', ') || '—'
      out.push(`| ${e.emoji ?? ''} ${esc(e.name)}${e.demo ? ' 🎬' : ''} | ${esc(gearOf(e))} | ${amount(e)} | ${e.restSec}s | ${esc(also)} |`)
    }
    out.push('')
  }

  const orphan = live.filter((e) => !PARTS.some(([k]) => k === e.parts[0]))
  if (orphan.length) out.push(`> ⚠️ Unknown first body part on: ${orphan.map((e) => `${e.name} (${e.parts[0]})`).join(', ')}`, '')

  if (retired.length) {
    out.push('---', '', `## 🗄️ Retired — ${retired.length}`, '', 'Kept for history; never prescribed.', '')
    for (const e of retired.sort((a, b) => a.name.localeCompare(b.name))) out.push(`- ${e.emoji ?? ''} **${e.name}** — ${e.parts.join(', ')}`)
    out.push('')
  }
  return out.join('\n')
}

const data = (await getDoc(await catalogRef())).data()
if (!data) {
  console.error('❌ app/gymCatalog does not exist')
  process.exit(1)
}
const md = render(data)
if (STDOUT) console.log(md)
else {
  writeFileSync(OUT, md)
  console.log(`📝 ${OUT} — ${data.exercises.length} exercises, ${data.equipment.length} equipment.`)
}
process.exit(0)
