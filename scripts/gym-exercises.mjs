// Step 2 of the Gym pipeline: turn the equipment you own into the exercise
// library you can actually be prescribed — then fetch a demo for each one.
//
//   1. add equipment   (app camera, or `npm run gym:equipment`)
//   2. THIS SCRIPT     `npm run gym:exercises`
//   3. …which finishes by running `npm run gym:demos` for the animations
//
// Why this is a separate pass rather than something the equipment step does:
// exercises depend on the WHOLE inventory at once. A bench on its own is worth
// almost nothing; a bench PLUS dumbbells is incline press, chest-supported row
// and step-ups. Generating per photo can never see those combinations. So this
// looks at everything you own in one go, together with what the room allows and
// who is actually training.
//
// It also adds no-equipment exercises — but only ones that make sense for THESE
// two people, read from their own briefs (Gym → Coach). Diogo's core/lower-back
// priority changes what belongs in the list.
//
// Idempotent: exercises already in the catalog are never duplicated and never
// overwritten, so run it again after adding gear and you get only what's new.
//
// Flags:
//   --dry-run     show what would be added, write nothing, skip the demo step
//   --no-demos    add the exercises but don't run gym:demos afterwards
//   --model=NAME / --effort=LEVEL   (default: opus / medium)
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

const args = process.argv.slice(2)
const flag = (n, d) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : d
}
const DRY = args.includes('--dry-run')
const NO_DEMOS = args.includes('--no-demos')
const MODEL = flag('model', 'opus')
const EFFORT = flag('effort', 'medium')

const PARTS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'fullBody', 'cardio']
const KINDS = ['weight', 'bodyweight', 'timed', 'cardio']

/** The built-ins the app already ships, so the model doesn't propose them again. */
const STARTERS = JSON.parse(readFileSync(resolve('src/logic/gymStarters.json'), 'utf8'))

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function prompt(equipment, athletes, taken) {
  const gear = equipment.length
    ? equipment.map((e) => `- ${e.name}${e.notes ? ` — ${e.notes}` : ''}`).join('\n')
    : '(nothing yet — bodyweight only)'

  const people = athletes
    .map((a) => `### ${a.name}${a.age ? `, ${a.age}` : ''}\n${a.text || '(no brief written)'}${a.flags.length ? `\nHARD RULES: ${a.flags.join(' ')}` : ''}`)
    .join('\n\n')

  return `You are building the complete exercise library for a two-person home gym. This library is what an AI personal trainer will pick from every day, so it needs to be broad enough to keep sessions varied for years, and honest enough that nothing in it is unsafe for either person.

## The equipment they actually own
${gear}
## Who trains here
${people}

## Already in the library — do NOT propose these again
${taken.length ? taken.map((n) => `- ${n}`).join('\n') : '(nothing yet)'}

## What to write

1. **Every exercise each piece of equipment allows**, on its own.
2. **Exercises that COMBINE equipment.** This is the part a per-item pass always misses — a bench plus dumbbells is incline press, chest-supported row and step-ups; a pull-up bar plus a bench is assisted dips and feet-up rows. Look for these deliberately.
3. **No-equipment exercises that suit THESE TWO PEOPLE specifically.** Not a generic bodyweight list — read their briefs. What serves this man's priorities and injury history? What would this boy actually enjoy and stick with? Only include a bodyweight move if you can say why it belongs to one of them.

Cover every body part the equipment can reach, at a range of difficulty, including light moves that work as a natural ramp-in at the start of a session.

Answer with ONLY a JSON array, no prose and no markdown fence:
[
  {
    "name": "standard exercise name",
    "emoji": "one fitting emoji",
    "equipment": ["exact equipment name(s) from the list above — [] if none needed"],
    "kind": one of ${JSON.stringify(KINDS)},
    "parts": ["primary body part FIRST", "then secondary"],   // from ${JSON.stringify(PARTS)}
    "intensity": 1 | 2 | 3,        // 1 = light enough to open a session with, 3 = heavy
    "how": "one or two plain sentences on how to perform it, including the form cue that keeps it safe",
    "restSec": 30-180,
    "defaultReps": number,         // reps; SECONDS for kind "timed"; MINUTES for kind "cardio"
    "defaultSets": 2-5,
    "perSide": true | false,       // true if ONE limb works at a time (single-arm row, side plank, split squat) — defaultReps is then per side
    "backRisk": true | false,      // true if it meaningfully loads the lower back / spine
    "ladder": true | false,        // true ONLY for bodyweight staples worth a rep-ladder game (push-ups, pull-ups, dips, squats)
    "why": "max 12 words — who this is for and what it earns them"
  }
]

Rules that matter:
- Only reference equipment from the list. Never invent gear, and never assume a rack, cables or machines that aren't there.
- Respect the room. If the ceiling is low, nothing standing overhead with a bar.
- "perSide" is about one limb at a time, not about symmetry. A single-arm row, a side plank, a Bulgarian split squat, a side-lying rotation: true. Anything that alternates within the count ("alternating lunges") or works both limbs together (squat, bench press, plank): false.
- Be accurate about backRisk — it is a HARD FILTER, not a hint. An exercise marked backRisk is never shown to him.
- "how" is read mid-set on a phone. Short, concrete, no theory.
- Prefer standard, widely-used exercise names — the next step looks each one up in an exercise-demo library, and an invented name will not be found.`
}

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const ref = doc(db, 'app', 'gymCatalog')
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    console.error('❌ No catalog yet. Add your equipment first — in the app (Gear → ➕ Add equipment → 📷)')
    console.error('   or with `npm run gym:equipment`.')
    process.exit(1)
  }

  const equipment = (snap.data().equipment ?? []).filter((e) => !e.retired)
  const exercises = snap.data().exercises ?? []

  if (equipment.length === 0) {
    console.log('ℹ️  No equipment registered — this will only add bodyweight work.')
  }

  // the two athletes' own briefs: what makes the bodyweight picks personal
  const athletes = []
  for (const id of ['diogo', 'ben']) {
    const p = await getDoc(doc(db, 'profiles', id))
    const brief = p.exists() ? (p.data().gym?.brief ?? {}) : {}
    athletes.push({
      name: id[0].toUpperCase() + id.slice(1),
      age: brief.age,
      text: (brief.text ?? '').trim(),
      flags: [
        brief.avoidBackLoad && 'Nothing that loads the lower back or spine heavily.',
        brief.noWarmup && 'Refuses a warm-up block; needs light moves that double as one.',
      ].filter(Boolean),
    })
  }

  const taken = [...exercises.map((e) => e.name), ...STARTERS.map((e) => e.name)]
  console.log(`🏋️  ${equipment.length} item(s) of equipment`)
  for (const e of equipment) console.log(`   ${e.emoji} ${e.name}${e.notes ? ` — ${e.notes}` : ''}`)
  console.log(`📚 ${taken.length} exercise(s) already known`)
  console.log(`👥 Briefs: ${athletes.map((a) => `${a.name} (${a.text ? `${a.text.length} chars` : 'empty'})`).join(', ')}`)
  console.log(`\n🧠 Asking claude (${MODEL}, effort ${EFFORT}) for the full library — this takes a minute…\n`)

  const out = execFileSync('claude', ['--model', MODEL, '--effort', EFFORT, '-p', prompt(equipment, athletes, taken)], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  const start = out.indexOf('[')
  const end = out.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error(`No JSON array in claude's reply:\n${out.slice(0, 800)}`)
  const proposed = JSON.parse(out.slice(start, end + 1))

  const idByName = new Map(equipment.map((e) => [e.name.toLowerCase(), e.id]))
  const known = new Set(taken.map(norm))
  const added = []
  const skipped = []

  for (const raw of proposed) {
    if (!raw?.name || !Array.isArray(raw.parts)) continue
    if (known.has(norm(raw.name))) continue // already have it; the app's edits win

    const parts = raw.parts.filter((p) => PARTS.includes(p))
    if (parts.length === 0) {
      skipped.push(`${raw.name} (no valid body part)`)
      continue
    }
    const needs = (raw.equipment ?? []).map((n) => idByName.get(String(n).toLowerCase())).filter(Boolean)
    if ((raw.equipment ?? []).length !== needs.length) {
      skipped.push(`${raw.name} (needs gear we don't have)`)
      continue
    }

    const def = {
      id: `mv-${slug(raw.name)}`,
      name: raw.name,
      emoji: raw.emoji || '🤸',
      equipmentIds: needs,
      kind: KINDS.includes(raw.kind) ? raw.kind : 'bodyweight',
      parts,
      intensity: [1, 2, 3].includes(raw.intensity) ? raw.intensity : 2,
      how: String(raw.how ?? '').trim() || 'No description yet.',
      restSec: Math.min(240, Math.max(15, Number(raw.restSec) || 60)),
      defaultReps: Math.max(1, Number(raw.defaultReps) || 10),
      defaultSets: Math.min(5, Math.max(1, Number(raw.defaultSets) || 3)),
      perSide: raw.perSide === true,
      backRisk: raw.backRisk === true,
      ladder: raw.ladder === true,
      addedBy: 'ai',
      createdAt: new Date().toISOString(),
    }
    added.push({ def, why: String(raw.why ?? '').slice(0, 60) })
    known.add(norm(def.name))
  }

  // report grouped by what they need, since that's the interesting axis
  const withGear = added.filter((a) => a.def.equipmentIds.length > 0)
  const combos = withGear.filter((a) => a.def.equipmentIds.length > 1)
  const bodyweight = added.filter((a) => a.def.equipmentIds.length === 0)

  console.log(`\n✨ ${added.length} new exercise(s)`)
  for (const a of added) {
    const gear = a.def.equipmentIds.length
      ? ` [${a.def.equipmentIds.map((id) => equipment.find((e) => e.id === id)?.name).join(' + ')}]`
      : ' [bodyweight]'
    console.log(`   ${a.def.emoji} ${a.def.name}${gear}${a.def.perSide ? ' ↔️ per side' : ''}${a.def.backRisk ? ' ⚠️ back' : ''}`)
    if (a.why) console.log(`      ${a.why}`)
  }
  console.log(`\n   ${withGear.length} use equipment (${combos.length} combine more than one) · ${bodyweight.length} bodyweight`)
  if (skipped.length) console.log(`⚠️  Skipped ${skipped.length}: ${skipped.join(', ')}`)

  if (DRY) {
    console.log('\n🧪 --dry-run: nothing written, demos not fetched.')
    process.exit(0)
  }
  if (added.length === 0) {
    console.log('\n✓ Nothing new to add.')
  } else {
    await setDoc(ref, { ...snap.data(), exercises: [...exercises, ...added.map((a) => a.def)], updatedAt: new Date().toISOString() })
    console.log('\n✅ Saved to the catalog.')
  }

  if (NO_DEMOS) {
    console.log('   (--no-demos: run `npm run gym:demos` when you want the animations.)')
    process.exit(0)
  }

  console.log('\n🎬 Now fetching demos…\n')
  execFileSync('node', [resolve('scripts/gym-demos.mjs')], { stdio: 'inherit' })
  process.exit(0)
}

main().catch((err) => {
  console.error('❌', err.message ?? err)
  process.exit(1)
})
