// Apply the human decisions from the first catalog review round.
// Source: GYM_CATALOG_REVIEW.md, resolved 2026-08-23. One-off; delete once run.
//
// Three kinds of change, deliberately kept separate:
//
//   RETIRE   the row cannot exist here, or is a duplicate under a different
//            name. Never deleted — §12 keeps the row so logged history resolves.
//   FIX      a decision was made about the exercise itself (prescription,
//            progression, cue). The row stays and is re-audited.
//   METADATA a tag was simply wrong. The audit found these; a human confirmed.
//
// Anything touched has its `catalogStatus` cleared so the next semantic pass
// re-reads it with the correction in place. Nothing here marks a row approved
// by hand — that is still the audit's job, and it now derives status from
// `reviewFlags` rather than taking a model's word for it.
//
// NOT included, on purpose: every row whose verdict depends on whether the
// adjustable bench actually declines. Its catalogued notes say incline-only,
// and that is a question about a physical object in a basement.
//
// Flags:
//   --dry-run   print the diff, write nothing
import { writeFileSync } from 'node:fs'
import { getDoc, setDoc } from 'firebase/firestore'
import { catalogRef } from './gym-audit.mjs'

const DRY = process.argv.includes('--dry-run')
const BENCH = 'eq-dec18228'

/** Cannot exist with this equipment, or duplicates a row that already does. */
const RETIRE = {
  'mv-renegade-row': 'round adjustable dumbbells roll under a plank; band Pallof + bird dog row + suitcase hold cover anti-rotation better',
  'mv-push-up-on-dumbbells': 'the TRULAP dumbbells are round-bodied and roll under load — not a handle base',
  'mv-dumbbell-high-pull': 'as written it is an upright row, not a high pull; the position is also an impingement risk',
  'mv-medicine-ball-slam': 'a 10 lb ball is not a dead-bounce slam ball, and 12 reps of loaded overhead-to-floor flexion fights the lower-back goal',
  'mv-medicine-ball-overhead-squat-hold': 'end-range overhead flexion plus a deep loaded bottom position held for time',
  'mv-dumbbell-zercher-squat': 'a Zercher needs a bar spanning both elbow crooks; this is a goblet squat, which already exists twice',
  'mv-dip-bar-tuck-hold-swing': 'momentum-driven, contradicts the "no swinging" cue on every other dip-bar row, adds nothing over the knee raise',
}

/** Decisions about the exercise itself. */
const FIX = {
  'mv-negative-pull-up': {
    progressionMode: 'difficulty',
    how: 'Step up to the top of the pull-up from a bench or box — do not jump. Lower yourself as slowly as you can, aiming for five seconds down. Progress by slowing the descent, then by graduating to a full pull-up.',
    why: 'eccentric-only work progresses by tempo then by graduating, not by adding reps; the jump entry adds a landing for no benefit',
  },
  'mv-split-squat-jump': {
    progressionMode: 'quality',
    defaultSets: 3,
    defaultReps: 6,
    restSec: 90,
    how: 'From a split stance, jump and switch legs in the air, landing softly. Three per side. Stop the set the moment jump height, landing control or speed drops — even at two reps. Full rest between sets; never take this near failure.',
    why: '3×16 was a conditioning dose that guarantees landing quality is gone before the set ends',
  },
}

/** Tags that were simply wrong. */
const METADATA = {
  // perSide means "do the whole set left, then the whole set right". These all
  // alternate WITHIN the set, so the flag was silently doubling the logged reps.
  'mv-medicine-ball-dead-bug': { perSide: false, laterality: 'bilateral' },
  'mv-dip-bar-oblique-knee-raise': { perSide: false, laterality: 'unilateral' },
  'mv-kettlebell-halo': { perSide: false, laterality: 'bilateral' },
  'mv-kettlebell-around-the-body-pass': { perSide: false, laterality: 'bilateral' },
  // progression that did not match how the movement actually gets harder
  'mv-medicine-ball-chest-pass': { progressionMode: 'quality' },
  'mv-bench-incline-push-up-ladder': { progressionMode: 'difficulty' },
  'mv-feet-supported-dip': { progressionMode: 'difficulty' },
  'mv-svend-press': { progressionMode: 'reps' },
  'mv-hanging-knee-raise': { progressionMode: 'difficulty' },
  // names that described a different exercise from the one performed
  'mv-straight-bar-dip': { name: 'Parallel Bar Dip' },
  'mv-dumbbell-farmer-s-carry-hold': { name: "Dumbbell Farmer's Hold" },
  'mv-kettlebell-farmer-s-hold': { name: 'Kettlebell Suitcase Hold' },
  'mv-hyperextension-bench-plank-hold': { name: 'Hyperextension Isometric Hold' },
  'mv-bench-press-with-neutral-grip': { name: 'Neutral-Grip Dumbbell Bench Press' },
  'mv-captain-s-chair-leg-raise': { name: 'Dip Bar Support Knee Raise' },
  'mv-dumbbell-tempo-push-up-hold': { name: 'Dumbbell Push-up Isometric Hold' },
  // equipment the row needs but never declared
  'bw-incline-pushup': { addGear: BENCH },
  'bw-dip-chair': { addGear: BENCH, name: 'Bench Dips' },
}

const clear = (e) => {
  // eslint-disable-next-line no-unused-vars
  const { catalogStatus, auditConfidence, auditReason, reviewFlags, ...rest } = e
  return rest
}

async function main() {
  const ref = await catalogRef()
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('app/gymCatalog does not exist')
  const data = snap.data()
  const byId = new Map(data.exercises.map((e) => [e.id, e]))

  for (const id of [...Object.keys(RETIRE), ...Object.keys(FIX), ...Object.keys(METADATA)])
    if (!byId.has(id)) throw new Error(`${id} is not in the catalog — refusing to run a stale plan`)

  let retired = 0
  let fixed = 0
  let tagged = 0

  const next = data.exercises.map((e) => {
    if (RETIRE[e.id]) {
      retired++
      console.log(`  🗄  RETIRE  ${e.name}\n             ${RETIRE[e.id]}`)
      return { ...e, retired: true, catalogStatus: 'retired', auditReason: RETIRE[e.id] }
    }
    if (FIX[e.id]) {
      fixed++
      // eslint-disable-next-line no-unused-vars
      const { why, ...patch } = FIX[e.id]
      const shown = Object.keys(patch)
        .map((k) => `${k}: ${JSON.stringify(e[k])} → ${JSON.stringify(patch[k])}`)
        .join('\n             ')
      console.log(`  🔧 FIX     ${e.name}\n             ${shown}\n             ${why}`)
      return { ...clear(e), ...patch }
    }
    if (METADATA[e.id]) {
      tagged++
      const { addGear, ...patch } = METADATA[e.id]
      const gear = addGear && !(e.equipmentIds ?? []).includes(addGear) ? [...(e.equipmentIds ?? []), addGear] : e.equipmentIds
      const shown = Object.keys(patch)
        .map((k) => `${k}: ${JSON.stringify(e[k])} → ${JSON.stringify(patch[k])}`)
        .concat(addGear ? [`equipmentIds: ${JSON.stringify(e.equipmentIds)} → ${JSON.stringify(gear)}`] : [])
        .join('\n             ')
      console.log(`  🏷  TAG     ${e.name}\n             ${shown}`)
      return { ...clear(e), ...patch, equipmentIds: gear }
    }
    return e
  })

  console.log(`\n${retired} retired · ${fixed} fixed · ${tagged} retagged`)

  if (DRY) {
    console.log('\n🧪 --dry-run: nothing written.\n')
    process.exit(0)
  }
  const backup = `.gym-catalog-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(backup, JSON.stringify(data, null, 2))
  await setDoc(ref, { ...data, exercises: next, updatedAt: new Date().toISOString() })
  console.log(`\n💾 Backed up to ${backup}`)
  console.log('✅ Saved. Run `npm run gym:audit:semantic` to re-audit what changed.\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('❌', e.message ?? e)
  process.exit(1)
})
