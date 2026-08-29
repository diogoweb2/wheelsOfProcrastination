// 🐦 Shangri-La Frontier — the self-play harness. `npm run frontier:audit`
//
// The claim §22 makes is that the three hunts form a LADDER: Casual is where you
// learn the fight, Frontier is where the build starts to matter, and Unique
// Scenario is where almost nothing gets through. That claim is worth exactly as
// much as the thing that checks it, so this plays every boss at every grade with
// three different builds and asserts the things that must be true:
//
//   · **no fight ever fails to terminate** — a boss rush that can deadlock is a
//     boss rush that eats a save;
//   · **both clock failures actually fire** — Wezaemon's Grave Seal and the
//     other two hunts' plain timeout;
//   · **a blade carries its wear in and out** — a weapon with n swings left
//     snaps n swings in, and the wear filed afterwards equals what it had;
//   · **Casual is genuinely casual** — a bot that only reacts, and never once
//     uses the perfect-dodge reward, still clears every hunt there.
//
// It WRITES NOTHING and it touches no network. Exit 1 on a failure.
//
// Flags:  --runs=N   games per cell (default 25)
//         --quiet    the verdict only
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const RUNS = Number(args.find((a) => a.startsWith('--runs='))?.slice(7) ?? 25)
const QUIET = args.includes('--quiet')

// The engine is TypeScript and this is a plain node script, so bundle it once
// into a throwaway ESM file rather than teaching node about .ts.
const dir = mkdtempSync(join(tmpdir(), 'slf-'))
const out = join(dir, 'frontier.mjs')
execFileSync('npx', ['esbuild', 'src/logic/frontier.ts', '--bundle', '--format=esm', `--outfile=${out}`, '--log-level=error'], {
  stdio: 'inherit',
})
const { BOSSES, GRADES, newFight, noInput, settle, statsOf, step } = await import(pathToFileURL(out).href)

const DT = 1 / 60
const CAP = 60 * 400 // six and a half minutes of frames: far past any hunt's clock

/**
 * A bot that plays the way the game asks and no better: it reads a telegraph
 * about a tenth of a second out, rolls sideways through it, punishes a recovery
 * and stays off a lit vent. It does NOT chase perfect dodges, does not bait, and
 * does not learn a pattern — so whatever it clears, a person can clear.
 */
function play(bossId, grade, load) {
  const boss = BOSSES.find((b) => b.id === bossId)
  const g = GRADES[grade]
  const st = statsOf(load)
  let f = newFight({ boss, grade, load })
  let frames = 0
  while (f.phase !== 'won' && f.phase !== 'lost' && frames < CAP) {
    frames++
    const i = noInput()
    const h = f.hero
    let near = null
    let nd = Infinity
    for (const foe of f.foes) {
      const d = Math.hypot(foe.pos.x - h.pos.x, foe.pos.y - h.pos.y) - foe.size
      if (d < nd) {
        nd = d
        near = foe
      }
    }
    if (near) {
      const a = Math.atan2(near.pos.y - h.pos.y, near.pos.x - h.pos.x)
      let imminent = false
      let punish = false
      for (const x of f.foes) {
        if (!x.move) continue
        const tell = x.move.tell * g.tell
        const d = Math.hypot(x.pos.x - h.pos.x, x.pos.y - h.pos.y)
        if (x.beat === 'tell' && tell - x.t < 0.11 && d < x.move.reach + (x.move.travel ?? 0) + x.size) imminent = true
        if (x.beat === 'recover') punish = true
      }
      for (const v of f.vents) {
        if (v.state === 'cold') continue
        const d = Math.hypot(v.pos.x - h.pos.x, v.pos.y - h.pos.y)
        if (d < v.r + 3) {
          i.move = { x: (h.pos.x - v.pos.x) / (d || 1), y: (h.pos.y - v.pos.y) / (d || 1) }
          imminent = false
        }
      }
      if (imminent && h.dodgeCd <= 0 && h.stam >= st.dodgeCost) {
        i.dodge = true
        i.move = { x: Math.cos(a + Math.PI / 2), y: Math.sin(a + Math.PI / 2) }
      } else if (!i.move.x && !i.move.y) {
        const want = nd > st.reach * 0.75 ? 1 : nd < st.reach * 0.4 ? -0.5 : 0
        i.move = { x: Math.cos(a) * want, y: Math.sin(a) * want }
      }
      if (!imminent && nd < st.reach * 0.95 && h.stam > st.weapon.stam * 2.4 && h.gasp <= 0) {
        if (punish && h.act === 'idle' && h.stam > 55) i.heavy = true
        else i.light = true
      }
      if (h.act === 'heavy' && h.beat === 'tell' && h.charge < 0.55) i.heavy = true
      if (h.flasks > 0 && h.hp < h.maxHp * 0.35 && !imminent && h.act === 'idle') i.flask = true
      if (h.assist && f.foes.some((x) => x.kind === 'boss' && x.hp / x.maxHp < 0.35)) i.assist = true
    }
    f = step(f, i, DT)
  }
  return { fight: f, frames, result: settle(f) }
}

/** Someone who never swings. Their hunts can only ever end on the clock. */
function coward(bossId) {
  const boss = BOSSES.find((b) => b.id === bossId)
  const load = { weapon: 'starter', plus: 0, worn: {}, scars: [], assist: false }
  let f = newFight({ boss, grade: 'casual', load })
  let frames = 0
  while (f.phase !== 'won' && f.phase !== 'lost' && frames < CAP) {
    frames++
    const i = noInput()
    const a = Math.atan2(f.hero.pos.y, f.hero.pos.x)
    i.move = { x: -Math.sin(a), y: Math.cos(a) }
    i.dodge = Math.random() < 0.05
    if (f.hero.flasks > 0 && f.hero.hp < f.hero.maxHp * 0.4) i.flask = true
    f = step(f, i, DT)
  }
  return f
}

const BUILDS = {
  'bare starter': { weapon: 'starter', plus: 0, worn: {}, scars: [], assist: false },
  'bare fangs +2': { weapon: 'fangs', plus: 2, worn: {}, scars: [], assist: false },
  'forged +3': {
    weapon: 'tombedge',
    plus: 3,
    worn: { head: 'helm', body: 'plate', arms: 'bracers', legs: 'greaves' },
    scars: [],
    assist: true,
  },
}

const fail = []
const note = (ok, msg) => {
  if (!ok) fail.push(msg)
  if (!QUIET) console.log(`${ok ? '  ok  ' : ' FAIL '} ${msg}`)
}

// --- the ladder --------------------------------------------------------------
if (!QUIET) console.log('\n⚔️  the ladder\n')
const table = []
let hung = 0
for (const grade of Object.keys(GRADES)) {
  for (const boss of BOSSES) {
    const row = { grade, boss: boss.id, cells: {} }
    for (const [name, load] of Object.entries(BUILDS)) {
      const runs = Array.from({ length: RUNS }, () => play(boss.id, grade, load))
      hung += runs.filter((r) => r.frames >= CAP).length
      row.cells[name] = {
        won: runs.filter((r) => r.fight.phase === 'won').length,
        secs: Math.round(runs.reduce((s, r) => s + r.result.seconds, 0) / runs.length),
        wear: Math.round(runs.reduce((s, r) => s + r.result.wear, 0) / runs.length),
      }
    }
    table.push(row)
    if (!QUIET) {
      const cells = Object.entries(row.cells)
        .map(([n, c]) => `${n} ${String(c.won).padStart(2)}/${RUNS} ${String(c.secs).padStart(3)}s −${String(c.wear).padStart(3)}`)
        .join('  |  ')
      console.log(`  ${grade.padEnd(9)} ${boss.id.padEnd(10)} ${cells}`)
    }
  }
}

if (!QUIET) console.log('')
note(hung === 0, `no fight ever failed to terminate (${hung} hung)`)

// Casual is the promise the app makes to a nine-year-old: this bot never once
// exploits a perfect dodge, and it still has to get through.
for (const row of table.filter((r) => r.grade === 'casual')) {
  const worst = Math.min(...Object.values(row.cells).map((c) => c.won))
  note(worst >= RUNS * 0.7, `casual/${row.boss}: a reactive bot clears it on every build (worst ${worst}/${RUNS})`)
}
// …and the grades have to actually differ, or the picker is a lie
for (const boss of BOSSES) {
  const at = (g) => table.find((r) => r.grade === g && r.boss === boss.id)
  const sum = (r) => Object.values(r.cells).reduce((s, c) => s + c.won, 0)
  note(sum(at('casual')) >= sum(at('frontier')) && sum(at('frontier')) >= sum(at('unique')), `${boss.id}: casual ≥ frontier ≥ unique`)
}

// --- the clocks --------------------------------------------------------------
if (!QUIET) console.log('\n⏳ the ways the clock kills you\n')
for (const boss of BOSSES) {
  const f = coward(boss.id)
  const how = f.how ?? (f.phase === 'won' ? 'slain' : 'none')
  const want = boss.seal ? 'sealed' : boss.pack ? ['timeout', 'slain'] : 'timeout'
  const ok = Array.isArray(want) ? want.includes(how) : how === want
  note(ok, `${boss.id}: a hunter who never swings ends on "${how}"`)
}

// --- the blade ---------------------------------------------------------------
if (!QUIET) console.log('\n🗡️  durability carries\n')
for (const start of [8, 40]) {
  const load = { weapon: 'starter', plus: 0, dur: start, worn: {}, scars: [], assist: false }
  const { fight, result } = play('hounds', 'casual', load)
  const broke = fight.hero.broken
  note(
    result.wear <= start && (!broke || result.wear === start),
    `a blade with ${start} swings left files ${result.wear} of wear${broke ? ' and snaps' : ''}`,
  )
}

rmSync(dir, { recursive: true, force: true })
console.log(fail.length ? `\n❌ ${fail.length} failure(s)` : '\n✅ frontier audit clean')
process.exit(fail.length ? 1 : 0)
