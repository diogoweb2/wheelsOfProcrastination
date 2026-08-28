// Push the hand-written catalog to Firestore: `npm run gym:seed`.
//
// The catalog used to be GENERATED — photos of the basement in, a model's idea
// of what you could do with them out, 199 rows nobody had ever read one by one.
// It isn't any more. `scripts/data/gym-catalog.json` is the whole gym, written
// by hand, and this script is the only thing that puts it in the database.
//
// It REPLACES `app/gymCatalog`. Rows in Firestore that are not in the file are
// gone, which is the point: the file is the catalog, not a suggestion merged
// into whatever was there before.
//
// The two things it carries over from the live document are `demo` and `video` —
// the animation and poster `npm run gym:demos` found, and the YouTube pick
// `npm run gym:videos` (or your own paste) put there. Both are expensive and
// both are keyed by exercise id, so an id already in the database keeps them
// unless the file names something different. Add an exercise here, run the two
// media scripts, and the file stays the source of truth for everything else.
//
// Day-to-day edits (a new exercise, a tweaked how-to, retiring something) belong
// in the app's Gear tab — that writes straight to Firestore and does not need
// this. Use the seed when you want to reset the catalog to the file, or after
// editing the file by hand.
//
// It refuses to write a catalog that fails `npm run gym:audit`.
//
// Flags:
//   --dry-run     print the diff against what's live, write nothing
//   --file=PATH   seed from a different file (default scripts/data/gym-catalog.json)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getDoc, setDoc } from 'firebase/firestore'
import { auditCatalog, catalogRef } from './gym-audit.mjs'

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const FILE = (args.find((a) => a.startsWith('--file=')) ?? '').slice(7) || 'scripts/data/gym-catalog.json'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

async function main() {
  const seed = JSON.parse(readFileSync(resolve(process.cwd(), FILE), 'utf8'))
  const equipment = seed.equipment ?? []
  const exercises = seed.exercises ?? []

  // audit BEFORE the network call — a broken file should cost nothing
  const { findings } = auditCatalog({ equipment, exercises })
  const errors = findings.filter((f) => f.level === 'error')
  if (errors.length) {
    console.error(`\n❌ ${FILE} fails the audit — nothing written:\n`)
    for (const f of errors) console.error(`   ${f.check}  ${f.subject}: ${f.detail}`)
    process.exit(1)
  }
  const warns = findings.filter((f) => f.level === 'warn')
  if (warns.length) {
    console.log(`\n⚠️  ${plural(warns.length, 'warning')} (not blocking):`)
    for (const f of warns) console.log(`   ${f.check}  ${f.subject}: ${f.detail}`)
  }

  const ref = await catalogRef()
  const live = (await getDoc(ref)).data() ?? {}
  const liveEx = new Map((live.exercises ?? []).map((e) => [e.id, e]))

  // Keep the media: an animation costs a match run and a video costs a search
  // plus a model call, both keyed by exercise id, and the file doesn't carry
  // either until you copy it in. A `manual` video is a link you pasted by hand
  // in the app — gym:videos refuses to overwrite one, so a seed that dropped it
  // would be the only thing in the codebase that could, and it did.
  let keptDemo = 0
  let keptVideo = 0
  const merged = exercises.map((e) => {
    const was = liveEx.get(e.id)
    let out = e
    if (!out.demo && was?.demo) {
      keptDemo++
      out = { ...out, demo: was.demo }
    }
    if (!out.video && was?.video) {
      keptVideo++
      out = { ...out, video: was.video }
    }
    return out
  })

  const added = merged.filter((e) => !liveEx.has(e.id))
  const removed = (live.exercises ?? []).filter((e) => !merged.some((m) => m.id === e.id))
  const withDemo = merged.filter((e) => e.demo).length
  const withVideo = merged.filter((e) => e.video).length

  console.log(`\n📖 ${FILE}`)
  console.log(`   ${plural(equipment.length, 'equipment item')} · ${plural(merged.length, 'exercise')} (${withDemo} with an animation, ${withVideo} with a video)`)
  console.log(`   live now: ${plural((live.exercises ?? []).length, 'exercise')}`)
  if (keptDemo) console.log(`   ♻️  ${plural(keptDemo, 'animation')} carried over from the live catalog`)
  if (keptVideo) console.log(`   ♻️  ${plural(keptVideo, 'video')} carried over from the live catalog`)
  if (added.length) console.log(`\n   ➕ new (${added.length}): ${added.map((e) => e.name).join(', ')}`)
  if (removed.length) console.log(`\n   ➖ dropped (${removed.length}): ${removed.map((e) => e.name).join(', ')}`)

  if (DRY) {
    console.log('\n🌵 --dry-run: nothing written.\n')
    process.exit(0)
  }

  await setDoc(ref, { equipment, exercises: merged, updatedAt: new Date().toISOString() })
  console.log(`\n✅ app/gymCatalog replaced.`)
  const missing = merged.filter((e) => !e.demo)
  if (missing.length) console.log(`➡️  Next: npm run gym:demos — ${plural(missing.length, 'exercise')} still has no animation.`)
  const noVideo = merged.filter((e) => !e.video)
  if (noVideo.length) console.log(`➡️  Next: npm run gym:videos — ${plural(noVideo.length, 'exercise')} still has no video.`)
  console.log('')
  process.exit(0)
}

main().catch((e) => {
  console.error('❌', e.message ?? e)
  process.exit(1)
})
