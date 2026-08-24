// One-off repair: link the six bar-hang exercises to the pull-up bar.
// Found by `npm run gym:audit:semantic`; see GYM_PROGRAM.md §12d.
//
// The pull-up bar (eq-9fc3b4f7) was catalogued on 2026-08-23. Every exercise
// that hangs from it predates that by weeks and shipped with `equipmentIds: []`,
// so the catalog claimed you could do a chin-up with no equipment at all. Layer
// 2 caught all six independently, at high confidence, on the same reasoning.
//
// Why this matters more than it looks: `gearMode: 'weights' | 'bodyweight'`
// filters by KIND, not gear, so the app never noticed — but the new program
// generator validates that every exercise's equipment is owned, and would have
// happily planned a chin-up for someone with no bar.
//
// `bw-pullup` is a BUILT-IN (src/logic/gymStarters.json), and the starters are
// deliberately gear-free so a fresh install works before anything is
// photographed. That file is left alone; §18b's rule is that a stored catalog
// row with the same id overrides the built-in, which is exactly what this does.
//
// Their `catalogStatus` is cleared so the next `npm run gym:audit:semantic`
// re-audits them with the equipment finally attached.
//
// Flags:
//   --dry-run   print the diff, write nothing
import { writeFileSync } from 'node:fs'
import { getDoc, setDoc } from 'firebase/firestore'
import { catalogRef } from './gym-audit.mjs'

const DRY = process.argv.includes('--dry-run')

const BAR_ID = 'eq-9fc3b4f7'
const IDS = ['bw-pullup', 'mv-scapular-pull-up', 'mv-dead-hang', 'mv-negative-pull-up', 'mv-chin-up', 'mv-hanging-knee-raise']

async function main() {
  const ref = await catalogRef()
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('app/gymCatalog does not exist')
  const data = snap.data()

  if (!(data.equipment ?? []).some((e) => e.id === BAR_ID && !e.retired))
    throw new Error(`${BAR_ID} is not an active piece of equipment — refusing to link onto it`)

  let touched = 0
  const next = (data.exercises ?? []).map((e) => {
    if (!IDS.includes(e.id)) return e
    if ((e.equipmentIds ?? []).includes(BAR_ID)) {
      console.log(`  ⏭  ${e.name} — already linked`)
      return e
    }
    touched++
    console.log(`  🔗 ${e.name}\n     equipment [] → ["${BAR_ID}"], status "${e.catalogStatus ?? 'none'}" → re-audit`)
    // eslint-disable-next-line no-unused-vars
    const { catalogStatus, auditConfidence, auditReason, ...rest } = e
    return { ...rest, equipmentIds: [...(e.equipmentIds ?? []), BAR_ID] }
  })

  const absent = IDS.filter((id) => !(data.exercises ?? []).some((e) => e.id === id))
  if (absent.length) console.log(`\n⚠️  Not in the catalog, skipped: ${absent.join(', ')}`)

  if (DRY) {
    console.log(`\n🧪 --dry-run: ${touched} would change, nothing written.\n`)
    process.exit(0)
  }
  if (touched === 0) {
    console.log('\nNothing to do.\n')
    process.exit(0)
  }

  const backup = `.gym-catalog-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(backup, JSON.stringify(data, null, 2))
  await setDoc(ref, { ...data, exercises: next, updatedAt: new Date().toISOString() })
  console.log(`\n💾 Backed up to ${backup}`)
  console.log(`✅ ${touched} linked. Run \`npm run gym:audit:semantic\` to re-audit them.\n`)
  process.exit(0)
}

main().catch((e) => {
  console.error('❌', e.message ?? e)
  process.exit(1)
})
