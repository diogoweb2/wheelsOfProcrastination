// Validate the gym catalog: `npm run gym:audit`.
//
// The Pallof discovery (two catalog rows describing an exercise that is
// physically impossible with the equipment they list) proved the point: the
// catalog cannot be treated as ground truth just because something wrote it.
//
// Everything checked here has a right answer that code can compute: does the id
// exist, is the equipment owned, is the enum legal, is rest inside its band. The
// judgement half — "does this exercise mean what its name says?" — used to be a
// second, model-driven pass; it is gone, because the catalog is now written by
// hand (`npm run gym:seed`, then the Gear tab) and a human already answered
// those questions before the row existed.
//
// It WRITES NOTHING. A validator that repairs things is a validator you stop
// trusting; every finding here is either a code fix or a hand edit in Gear.
//
// Flags:
//   --json        machine-readable findings on stdout, nothing else
//   --quiet       errors only, skip the warnings and the summary tables
//   --strict      treat warnings as failures too (exit 1)
import { pathToFileURL } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'

// Same public web config as src/lib/firebase.ts (client configs are not secrets).
const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

const args = process.argv.slice(2)
const JSON_OUT = args.includes('--json')
const QUIET = args.includes('--quiet')
const STRICT = args.includes('--strict')

// --- the legal values -------------------------------------------------------
//
// These mirror `ExerciseKind`, `BodyPart` and `addedBy` in src/types.ts. Keep
// them in step: a value legal there and illegal here fails the audit for no
// reason, and the reverse lets a bad row into the app.

export const KINDS = ['weight', 'bodyweight', 'timed', 'cardio']
export const PARTS = ['chest', 'back', 'shoulders', 'arms', 'forearms', 'legs', 'glutes', 'core', 'fullBody', 'power', 'cardio']
const ADDED_BY = ['ai', 'manual']

/** Mirrors REST_MIN / REST_MAX in src/logic/gym.ts — rest is clamped to this band. */
const REST_MIN = 15
const REST_MAX = 240

const ID_RE = /^[a-z0-9][a-z0-9-]*$/

// --- findings ---------------------------------------------------------------

let findings = []
const err = (check, subject, detail) => findings.push({ level: 'error', check, subject, detail })
const warn = (check, subject, detail) => findings.push({ level: 'warn', check, subject, detail })

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

// --- checks -----------------------------------------------------------------

function checkEquipment(equipment) {
  const seen = new Map()
  for (const [i, e] of equipment.entries()) {
    const where = e?.name || e?.id || `equipment[${i}]`
    if (!e?.id) {
      err('equipment.id', where, 'no id')
      continue
    }
    if (!ID_RE.test(e.id)) err('equipment.id', e.id, 'id is not a lowercase slug')
    if (seen.has(e.id)) err('equipment.duplicate', e.id, `id used twice (${seen.get(e.id)} and ${e.name})`)
    seen.set(e.id, e.name)
    if (!e.name?.trim()) err('equipment.name', e.id, 'no name')
    if (e.addedBy && !ADDED_BY.includes(e.addedBy)) err('equipment.addedBy', e.id, `illegal addedBy "${e.addedBy}"`)
    // the notes are what the coach reads about a piece of gear — its limits
    // (lightest notch, unstable handles, fixed height) live nowhere else
    if (!e.notes?.trim()) warn('equipment.notes', e.name || e.id, 'no notes — the coach sees nothing but the name')
  }
  return seen
}

function checkExercise(e, i, ownedIds, retiredEquip, allIds) {
  const where = e?.name || e?.id || `exercises[${i}]`

  if (!e?.id) {
    err('exercise.id', where, 'no id')
    return
  }
  if (!ID_RE.test(e.id)) err('exercise.id', e.id, 'id is not a lowercase slug')
  if (!e.name?.trim()) err('exercise.name', e.id, 'no name')

  // A RETIRED row is never planned again, so "would this actually work" is the
  // wrong question to ask of it. Retiring is how §12 preserves a bad exercise
  // instead of deleting it — auditing the corpse would make the audit
  // permanently red for rows we deliberately kept. Structure only, then out.
  if (e.retired) return

  if (!e.how?.trim()) warn('exercise.how', where, 'no instructions — the runner shows nothing')

  // --- equipment references: this is the eq-b8a8b13d check ---
  const gear = Array.isArray(e.equipmentIds) ? e.equipmentIds : []
  if (!Array.isArray(e.equipmentIds)) err('exercise.equipmentIds', where, 'equipmentIds is not an array')
  for (const id of gear) {
    if (!ownedIds.has(id)) err('equipment.missing', where, `references equipment "${id}" which is not in the catalog`)
    else if (retiredEquip.has(id)) warn('equipment.retired', where, `references retired equipment "${ownedIds.get(id)}"`)
  }

  // --- enums that exist today ---
  if (!KINDS.includes(e.kind)) err('exercise.kind', where, `illegal kind "${e.kind}"`)
  if (!Array.isArray(e.parts) || e.parts.length === 0) err('exercise.parts', where, 'no body parts')
  else for (const p of e.parts) if (!PARTS.includes(p)) err('exercise.parts', where, `illegal body part "${p}"`)
  if (![1, 2, 3].includes(e.intensity)) err('exercise.intensity', where, `intensity must be 1–3, got ${e.intensity}`)
  if (e.addedBy && !ADDED_BY.includes(e.addedBy)) err('exercise.addedBy', where, `illegal addedBy "${e.addedBy}"`)

  // --- numbers ---
  if (!(e.defaultSets >= 1)) err('exercise.sets', where, `defaultSets must be ≥ 1, got ${e.defaultSets}`)
  if (!(e.defaultReps >= 1)) err('exercise.reps', where, `defaultReps must be ≥ 1, got ${e.defaultReps}`)
  if (!(e.restSec >= REST_MIN && e.restSec <= REST_MAX))
    err('exercise.rest', where, `restSec ${e.restSec} outside ${REST_MIN}–${REST_MAX}`)

  // --- impossible combinations (§12a) ---
  // a clocked move is measured across the whole set, both sides together, so
  // per-side is meaningless on it — and the app would double a number that
  // already covers both sides
  if (e.perSide && e.kind === 'cardio') err('combo.perSide', where, 'perSide on a cardio exercise')
  // ladders are the bodyweight rep game (§18f); a loaded lift progresses by weight
  if (e.ladder && e.kind === 'weight') warn('combo.ladder', where, 'ladder on a `weight` exercise — ladders are for bodyweight staples')

  return true
}

// --- report -----------------------------------------------------------------

function group(list) {
  const by = new Map()
  for (const f of list) {
    if (!by.has(f.check)) by.set(f.check, [])
    by.get(f.check).push(f)
  }
  return [...by.entries()].sort((a, b) => b[1].length - a[1].length)
}

function report(list, icon) {
  for (const [check, items] of group(list)) {
    console.log(`\n  ${icon} ${check}  (${items.length})`)
    for (const f of items) console.log(`     ${f.subject}: ${f.detail}`)
  }
}

/** Sign in and hand back the catalog doc ref — `gym:seed` writes through the same one. */
export async function catalogRef() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  return doc(getFirestore(app), 'app', 'gymCatalog')
}

/**
 * The whole audit, as a function. Returns every finding plus the rows that came
 * through clean, so `gym:seed` can validate a file before it writes it.
 */
export function auditCatalog(data) {
  findings = []
  const equipment = Array.isArray(data.equipment) ? data.equipment : []
  const exercises = Array.isArray(data.exercises) ? data.exercises : []

  const ownedIds = checkEquipment(equipment)
  const retiredEquip = new Set(equipment.filter((e) => e.retired).map((e) => e.id))
  const allIds = new Map(exercises.filter((e) => e?.id).map((e) => [e.id, e]))

  const seenIds = new Map()
  const seenNames = new Map()

  for (const [i, e] of exercises.entries()) {
    if (e?.id) {
      if (seenIds.has(e.id)) err('exercise.duplicate', e.id, `id used twice (${seenIds.get(e.id)} and ${e.name})`)
      seenIds.set(e.id, e.name)
    }
    // a duplicate name is not illegal, but the generator dedups by name and
    // would silently drop one of them — retired rows are never offered, so a
    // live/retired collision is exactly how a duplicate is SUPPOSED to end
    if (e?.name && !e.retired) {
      const n = norm(e.name)
      if (seenNames.has(n)) warn('exercise.sameName', e.name, `same name as "${seenNames.get(n)}"`)
      seenNames.set(n, e.name)
    }
    checkExercise(e, i, ownedIds, retiredEquip, allIds)
  }

  const badIds = new Set(findings.filter((f) => f.level === 'error').map((f) => f.subject))
  const clean = exercises.filter((e) => e?.id && !e.retired && !badIds.has(e.name) && !badIds.has(e.id))

  return { findings: [...findings], equipment, exercises, clean }
}

async function main() {
  const snap = await getDoc(await catalogRef())
  if (!snap.exists()) throw new Error('app/gymCatalog does not exist')

  const data = snap.data() ?? {}
  const { findings: found, equipment, exercises } = auditCatalog(data)
  findings = found

  if (!JSON_OUT) console.log(`\n🔍 Catalog validation\n   ${equipment.length} equipment · ${exercises.length} exercises\n`)

  const errors = findings.filter((f) => f.level === 'error')
  const warns = findings.filter((f) => f.level === 'warn')

  if (JSON_OUT) {
    console.log(JSON.stringify({ equipment: equipment.length, exercises: exercises.length, findings }, null, 2))
    process.exit(errors.length ? 1 : 0)
  }

  if (errors.length) {
    console.log(`❌ ${errors.length} error${errors.length === 1 ? '' : 's'} — these block \`gym:program\`:`)
    report(errors, '·')
  } else {
    console.log('✅ No errors.')
  }

  if (warns.length && !QUIET) {
    console.log(`\n⚠️  ${warns.length} warning${warns.length === 1 ? '' : 's'} — worth a look, not blocking:`)
    report(warns, '·')
  }

  console.log('')
  process.exit(errors.length || (STRICT && warns.length) ? 1 : 0)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error('❌', e.message ?? e)
    process.exit(1)
  })
}
