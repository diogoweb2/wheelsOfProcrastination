// Layer 1 of the catalog audit: `npm run gym:audit`. See GYM_PROGRAM.md §12a.
//
// The Pallof discovery (two catalog rows describing an exercise that is
// physically impossible with the equipment they list) proved the point: the
// catalog cannot be treated as ground truth. And because the new program
// generator is CONSTRAINED to the catalog, a bad catalog produces a
// deterministically bad program — which is worse than the old random one,
// because it is wrong the same way every single time.
//
// So the audit runs in two layers, and THIS FILE IS THE ONE WITHOUT A MODEL.
// Everything here has a right answer that code can compute: does the id exist,
// is the equipment owned, is the enum legal, is rest inside its band. A model
// asked these questions can only add noise and cost. Layer 2 (`--semantic`, a
// separate pass) is where judgement belongs — "does this exercise mean what its
// name says?" — and it never sees a row that failed layer 1.
//
// It WRITES NOTHING. A validator that repairs things is a validator you stop
// trusting; every finding here is either a code fix or a hand edit in Gear.
//
// Layer 2 lives in `scripts/gym-audit-semantic.mjs` (`npm run gym:audit:semantic`)
// and imports the checks below so it can honour that rule without duplicating
// them.
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
// `kind`, `parts`, `intensity` and `addedBy` exist today (src/types.ts). The
// rest are the fields layer 2 adds (GYM_PROGRAM.md §12) — they are validated
// WHEN PRESENT and counted when absent, so this same script reports audit
// progress as layer 2 fills them in.

export const KINDS = ['weight', 'bodyweight', 'timed', 'cardio']
export const PARTS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'fullBody', 'cardio']
const ADDED_BY = ['ai', 'manual']

/**
 * Catalog movement patterns. This is the UNION of §12's list and the two extra
 * patterns §8 tracks recovery on (`anti-rotation`, `back-extension`) — without
 * them there is no way to DERIVE a recovery pattern from an exercise's
 * metadata, which is the gap this script found on its first run.
 *
 * `isolation` is the second gap, found by layer 2: a leg extension, a leg curl
 * and a wrist curl are single-joint accessory work that fits NONE of the
 * compound patterns. Forcing a wrist curl to `pull` would charge it against the
 * same recovery budget as chin-ups. The muscle is already in `parts`; this says
 * only that the movement claims no compound slot.
 */
export const MOVEMENT_PATTERNS = [
  'push', 'pull', 'squat', 'hinge', 'lunge', 'lateral', 'carry',
  'core', 'anti-rotation', 'back-extension', 'power', 'mobility', 'shoulder', 'isolation',
]
export const PRIMARY_ROLES = ['strength', 'hypertrophy', 'power', 'stability', 'mobility', 'prehab']
export const LATERALITY = ['bilateral', 'unilateral', 'perSide']
export const PROGRESSION_MODES = ['load', 'reps', 'duration', 'difficulty', 'quality', 'none']
export const RISK_LEVELS = ['low', 'moderate', 'high']
export const RISK_JOINTS = ['back', 'shoulder', 'knee']
export const CATALOG_STATUS = ['approved', 'review', 'retired']
export const AUDIT_CONFIDENCE = ['high', 'medium', 'low']

/**
 * WHY a row needs a human, as separate booleans rather than one prose blob.
 * Without this a reviewer sees `review` and cannot tell whether they are being
 * asked to approve the EXERCISE, the EQUIPMENT SETUP, or merely the METADATA.
 *
 * `programFit` is the odd one out, deliberately: it NEVER blocks. The catalog's
 * job is to describe what is POSSIBLE; deciding what is worth doing belongs to
 * the program and the per-profile brief. A row that is real, correctly
 * described and correctly tagged is `approved` even when Court & Core would
 * never pick it — otherwise the catalog slowly becomes safe for everybody and
 * optimised for nobody.
 */
export const REVIEW_FLAGS = ['physicalSetup', 'movementDefinition', 'metadata', 'loadSuitability', 'programFit']
/** The flags that actually mean "not usable as data". `programFit` is advisory. */
export const BLOCKING_FLAGS = REVIEW_FLAGS.filter((f) => f !== 'programFit')

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
    // the notes are the ONLY thing the exercise generator ever sees about a
    // piece of gear (§18k), so an item without them is invisible to it
    if (!e.notes?.trim()) warn('equipment.notes', e.name || e.id, 'no notes — the generator sees nothing but the name')
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
  if (e.retired) return { retired: true }

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

  // --- layer 2 fields: validated when present, counted when absent ---
  const enumIf = (field, legal) => {
    if (e[field] == null) return false
    if (!legal.includes(e[field])) err(`exercise.${field}`, where, `illegal ${field} "${e[field]}"`)
    return true
  }
  const audited = {
    movementPattern: enumIf('movementPattern', MOVEMENT_PATTERNS),
    primaryRole: enumIf('primaryRole', PRIMARY_ROLES),
    laterality: enumIf('laterality', LATERALITY),
    progressionMode: enumIf('progressionMode', PROGRESSION_MODES),
    catalogStatus: enumIf('catalogStatus', CATALOG_STATUS),
    auditConfidence: enumIf('auditConfidence', AUDIT_CONFIDENCE),
  }

  if (e.reviewFlags != null) {
    if (typeof e.reviewFlags !== 'object') err('exercise.reviewFlags', where, 'reviewFlags is not an object')
    else
      for (const [k, v] of Object.entries(e.reviewFlags)) {
        if (!REVIEW_FLAGS.includes(k)) err('exercise.reviewFlags', where, `unknown review flag "${k}"`)
        if (typeof v !== 'boolean') err('exercise.reviewFlags', where, `reviewFlags.${k} must be a boolean`)
      }
  }

  if (e.riskProfiles != null) {
    if (typeof e.riskProfiles !== 'object') err('exercise.riskProfiles', where, 'riskProfiles is not an object')
    else
      for (const [joint, level] of Object.entries(e.riskProfiles)) {
        if (!RISK_JOINTS.includes(joint)) err('exercise.riskProfiles', where, `unknown joint "${joint}"`)
        if (!RISK_LEVELS.includes(level)) err('exercise.riskProfiles', where, `illegal risk level "${level}" for ${joint}`)
      }
  }

  // rep ranges arrive with the program, not the catalog — but if one half is
  // there the other must be, and they must be the right way round
  if (e.repLow != null || e.repHigh != null) {
    if (e.repLow == null || e.repHigh == null) err('exercise.repRange', where, 'repLow/repHigh: one set without the other')
    else if (!(e.repLow < e.repHigh)) err('exercise.repRange', where, `repLow ${e.repLow} must be < repHigh ${e.repHigh}`)
  }

  // --- cross-field sanity on the layer 2 metadata ---
  if (audited.laterality && e.laterality === 'perSide' && e.perSide !== true)
    warn('combo.laterality', where, 'laterality "perSide" but perSide flag is not true')
  if (audited.progressionMode) {
    if (e.progressionMode === 'reps' && (e.kind === 'timed' || e.kind === 'cardio'))
      err('combo.progressionMode', where, `progressionMode "reps" on a ${e.kind} exercise — it is measured in seconds`)
    if (e.progressionMode === 'duration' && (e.kind === 'weight' || e.kind === 'bodyweight'))
      err('combo.progressionMode', where, `progressionMode "duration" on a ${e.kind} exercise — it is measured in reps`)
    if (e.progressionMode === 'load' && e.kind === 'bodyweight' && gear.length === 0)
      err('combo.progressionMode', where, 'progressionMode "load" but nothing to load — bodyweight with no equipment')
  }

  // an alternative pointing at a retired or missing exercise leaves a hole in a swap
  for (const alt of e.alternatives ?? []) {
    if (!allIds.has(alt)) err('alternatives.missing', where, `alternative "${alt}" does not exist`)
    else if (allIds.get(alt).retired) err('alternatives.retired', where, `alternative "${allIds.get(alt).name}" is retired`)
  }

  return audited
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

/** Sign in and hand back the catalog doc ref — layer 2 needs the same connection. */
export async function catalogRef() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  return doc(getFirestore(app), 'app', 'gymCatalog')
}

/**
 * The whole of layer 1, as a function. Returns every finding plus the set of
 * exercise ids that came through clean — that set is what layer 2 is allowed to
 * look at, because a row that fails here is a code problem, not a judgement call.
 */
export function auditLayer1(data) {
  findings = []
  const equipment = Array.isArray(data.equipment) ? data.equipment : []
  const exercises = Array.isArray(data.exercises) ? data.exercises : []

  const ownedIds = checkEquipment(equipment)
  const retiredEquip = new Set(equipment.filter((e) => e.retired).map((e) => e.id))
  const allIds = new Map(exercises.filter((e) => e?.id).map((e) => [e.id, e]))

  const seenIds = new Map()
  const seenNames = new Map()
  const auditedCount = { movementPattern: 0, primaryRole: 0, laterality: 0, progressionMode: 0, catalogStatus: 0 }

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
    const audited = checkExercise(e, i, ownedIds, retiredEquip, allIds) ?? {}
    for (const k of Object.keys(auditedCount)) if (audited[k]) auditedCount[k]++
  }

  const badIds = new Set(findings.filter((f) => f.level === 'error').map((f) => f.subject))
  const clean = exercises.filter((e) => e?.id && !e.retired && !badIds.has(e.name) && !badIds.has(e.id))

  return { findings: [...findings], equipment, exercises, auditedCount, clean }
}

async function main() {
  const snap = await getDoc(await catalogRef())
  if (!snap.exists()) throw new Error('app/gymCatalog does not exist')

  const data = snap.data() ?? {}
  const { findings: found, equipment, exercises, auditedCount } = auditLayer1(data)
  findings = found

  if (!JSON_OUT) console.log(`\n🔍 Layer 1 — deterministic validation\n   ${equipment.length} equipment · ${exercises.length} exercises\n`)

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

  // layer 2 progress — how much of §12's metadata actually exists yet
  if (!QUIET) {
    const live = exercises.filter((e) => !e.retired).length
    console.log(`\n📋 Layer 2 metadata (${live} live exercises):`)
    for (const [field, n] of Object.entries(auditedCount)) {
      const bar = '█'.repeat(Math.round((n / Math.max(live, 1)) * 20)).padEnd(20, '░')
      console.log(`   ${field.padEnd(16)} ${bar} ${n}/${live}`)
    }
    const ready = auditedCount.catalogStatus === live
    console.log(`\n${ready ? '✅' : '⏳'} gym:program is ${ready ? 'unblocked' : 'BLOCKED until layer 2 has run'}.`)
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
