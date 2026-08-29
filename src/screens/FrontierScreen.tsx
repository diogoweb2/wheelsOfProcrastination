// 🐦 Shangri-La Frontier (§22) — the desk around the hunt.
//
// Four pages, four URLs (§1c): pick a monster and go (`/frontier/hunt`), build
// the character (`/frontier/gear`), read what you have met (`/frontier/codex`),
// and learn the controls (`/frontier/rules`). The fight itself is
// <FrontierFight>, over the engine in logic/frontier.ts — nothing on this screen
// knows a single combat rule.
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'
import { FrontierFight } from '../components/FrontierFight'
import {
  ARMOUR,
  BOSSES,
  GRADES,
  MATERIALS,
  MAX_PLUS,
  PARTS,
  PART_NAMES,
  REPAIR_COST,
  SLF_SOLO_LIMIT,
  SLF_SOLO_REWARD,
  WEAPONS,
  armourById,
  canPay,
  loadoutOf,
  materialById,
  newFight,
  nextUpgrade,
  plusDurability,
  statsOf,
  weaponById,
  type BodyPart,
  type BossDef,
  type Fight,
  type Grade,
} from '../logic/frontier'

export function FrontierScreen({ tab, setTab }: { tab: string; setTab: (tab: string) => void }) {
  return (
    <>
      {tab === 'hunt' && <HuntTab setTab={setTab} />}
      {tab === 'gear' && <GearTab />}
      {tab === 'codex' && <CodexTab />}
      {tab === 'rules' && <RulesTab />}
    </>
  )
}

// --- Hunt --------------------------------------------------------------------

/**
 * The board: who is out there, how hard you want it, and the button that takes
 * over the screen. The three monsters unlock in order — the pack is a tutorial
 * with teeth and there is no version of this game where meeting Wezaemon first
 * teaches anybody anything.
 */
function HuntTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data, slfGrade, slfStart, slfFinish } = useStore()
  const f = data.frontier
  const [live, setLive] = useState<Fight | null>(null)
  const [paid, setPaid] = useState<number | null>(null)

  const load = loadoutOf(f)
  const st = statsOf(load)
  const full = Math.round(weaponById(f.weapon).dur * plusDurability(f.plus))
  const grade = (f.grade as Grade) in GRADES ? (f.grade as Grade) : 'casual'

  if (live) {
    return (
      <FrontierFight
        fight={live}
        onQuit={() => setLive(null)}
        onDone={(r) => {
          setPaid(slfFinish(r))
          setLive(null)
        }}
      />
    )
  }

  function hunt(boss: BossDef) {
    sfx.click()
    setPaid(null)
    slfStart()
    setLive(newFight({ boss, grade, load }))
  }

  const unlocked = (i: number) => i === 0 || !!f.kills[BOSSES[i - 1].id]

  return (
    <>
      {paid !== null && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'rgba(255,206,0,0.4)' }}>
          <div className="h3">{paid > 0 ? `🪙 +${paid} Berries` : '🩸 Nothing banked'}</div>
          <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
            {paid > 0
              ? 'Filed. Materials are in the bag over on Gear.'
              : `No Berries this one — a first kill pays its bounty, and after that it is ${SLF_SOLO_REWARD} a clear, ${SLF_SOLO_LIMIT} a day.`}
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 30 }}>{st.weapon.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>
              {st.weapon.name}{f.plus > 0 && ` +${f.plus}`}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {Math.round(st.maxHp)} HP · {st.def} def · {st.weight === 0 ? 'no armour at all' : `${st.weight.toFixed(1)} weight`}
            </div>
          </div>
          <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setTab('gear') }}>
            Gear
          </button>
        </div>
        <div className="slf-durrow">
          <div className="ops-bar" style={{ height: 10 }}>
            <i style={{ width: `${Math.max(0, (f.dur / full) * 100)}%`, background: f.dur <= 0 ? '#8a2020' : 'linear-gradient(90deg,#7a8ba8,#dfe7f5)' }} />
          </div>
          <span className="muted" style={{ fontSize: 11 }}>{f.dur <= 0 ? 'BROKEN' : `${f.dur}/${full}`}</span>
        </div>
        {f.dur <= 0 && (
          <p className="slf-warn">💔 Your blade is broken — it hits for a third of what it should. One 🦷 Hound Fang repairs it on the Gear page.</p>
        )}
        {f.scars.length > 0 && (
          <p className="slf-warn is-curse">
            🩸 Scarred: {f.scars.map((s) => PART_NAMES[s as BodyPart]).join(', ')} — those parts will never take armour again.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 6 }}>🎚️ How hard?</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(GRADES) as Grade[]).map((g) => (
            <button
              key={g}
              className={`btn btn--small ${grade === g ? 'btn--blue' : 'btn--ghost'}`}
              onClick={() => { sfx.click(); slfGrade(g) }}
            >
              {GRADES[g].label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>{GRADES[grade].what}</p>
      </div>

      {BOSSES.map((boss, i) => {
        const kill = f.kills[boss.id]
        const open = unlocked(i)
        return (
          <div key={boss.id} className={`card slf-boss-card ${open ? '' : 'is-locked'}`} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 34 }}>{open ? boss.emoji : '🔒'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900 }}>{boss.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>{boss.title}</div>
              </div>
              {kill && <span className="slf-kill">☠️ ×{kill.runs}</span>}
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '8px 0 10px' }}>
              {open ? boss.what : `Beat ${BOSSES[i - 1].name} first. This one will not teach you anything you have not already learned.`}
            </p>
            <div className="slf-facts">
              <span>⏱️ {boss.limit}s{boss.seal ? ' · then the seal' : ''}</span>
              <span>🪙 {boss.bounty} first kill</span>
              {kill && <span>🏁 best {kill.best}s</span>}
            </div>
            {open && (
              <button className="btn btn--blue" style={{ width: '100%', marginTop: 10 }} onClick={() => hunt(boss)}>
                Hunt {boss.name}
              </button>
            )}
          </div>
        )
      })}
    </>
  )
}

// --- Gear --------------------------------------------------------------------

/**
 * The build. Everything here is one trade said out loud: **armour buys you a
 * few points of damage reduction and sells you the thing this game is actually
 * about**, which is being somewhere else when the attack lands.
 */
function GearTab() {
  const { data, slfEquip, slfUpgrade, slfForge, slfRepair } = useStore()
  const f = data.frontier
  const st = statsOf(loadoutOf(f))
  const full = Math.round(weaponById(f.weapon).dur * plusDurability(f.plus))
  const up = nextUpgrade(f.plus)
  const has = (id: string) => f.mats[id] ?? 0

  const equip = (weapon: string, worn = f.worn) => {
    sfx.click()
    slfEquip(weapon, worn)
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3">📊 The build</div>
        <div className="slf-stats">
          <span><b>{Math.round(st.maxHp)}</b>Health</span>
          <span><b>{st.speed.toFixed(1)}</b>Speed</span>
          <span><b>{st.def}</b>Defence</span>
          <span><b>{st.weight.toFixed(1)}</b>Weight</span>
          <span><b>{Math.round(st.dmg)}</b>Damage</span>
          <span><b>{Math.round(st.crit)}%</b>Crit</span>
        </div>
        <div className="slf-hidden">
          <div className="slf-hidden-head">🕶️ Hidden parameters</div>
          <span>
            🍀 Luck <b>{f.found.includes('luck') ? Math.round(st.luck) : '???'}</b>
            <i>{f.found.includes('luck') ? 'climbs as the armour comes off. Moves crits and rare drops.' : 'Something is deciding your rare drops. Keep hunting.'}</i>
          </span>
          <span>
            🩸 Curse resistance <b>{f.found.includes('curse') ? `${Math.round(st.curseRes)}%` : '???'}</b>
            <i>{f.found.includes('curse') ? 'bought with armour, and only armour. It is the odds the Fang fails to mark you.' : 'You have not been scarred yet. You will find out then.'}</i>
          </span>
          <span>
            👁️ Aggro <b>{f.found.includes('aggro') ? 'live' : '???'}</b>
            <i>{f.found.includes('aggro') ? 'rises as you attack, falls when you back off. High and they come at YOU; low and they throw the arena instead.' : 'Something changes what they pick. You have not worked out what.'}</i>
          </span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 6 }}>🗡️ The blade</div>
        <div className="slf-durrow" style={{ marginBottom: 10 }}>
          <div className="ops-bar" style={{ height: 12 }}>
            <i style={{ width: `${Math.max(0, (f.dur / full) * 100)}%`, background: f.dur <= 0 ? '#8a2020' : 'linear-gradient(90deg,#7a8ba8,#dfe7f5)' }} />
          </div>
          <span className="muted" style={{ fontSize: 11 }}>{f.dur <= 0 ? 'BROKEN' : `${f.dur}/${full}`}</span>
          <button
            className="btn btn--small btn--ghost"
            disabled={f.dur >= full || !canPay(f.mats, REPAIR_COST)}
            onClick={() => { sfx.click(); slfRepair() }}
          >
            Repair 🦷1
          </button>
        </div>

        {WEAPONS.map((w) => {
          const locked = !!w.cost && !f.forged.includes(w.id)
          const canForge = !!w.cost && (!w.needs || !!f.kills[w.needs]) && canPay(f.mats, w.cost)
          const on = f.weapon === w.id
          return (
            <div key={w.id} className={`slf-row ${on ? 'is-on' : ''} ${locked && !canForge ? 'is-locked' : ''}`}>
              <div className="slf-row-head">
                <b>{w.emoji} {w.name}{on && f.plus > 0 ? ` +${f.plus}` : ''}</b>
                {on ? (
                  <span className="slf-tag">equipped</span>
                ) : locked ? (
                  <button
                    className="btn btn--small btn--ghost"
                    disabled={!canForge}
                    onClick={() => { sfx.click(); slfForge(w.id, 'weapon') }}
                  >
                    Forge
                  </button>
                ) : (
                  <button className="btn btn--small btn--ghost" onClick={() => equip(w.id)}>Equip</button>
                )}
              </div>
              <p className="muted" style={{ fontSize: 11, margin: '3px 0 0' }}>{w.what}</p>
              <div className="slf-facts">
                <span>⚔️ {w.dmg}</span>
                <span>📏 {w.reach}</span>
                <span>⏱️ {w.wind < 1 ? 'fast' : w.wind > 1.2 ? 'slow' : 'even'}</span>
                <span>🎯 {w.crit >= 0 ? '+' : ''}{w.crit}%</span>
                <span>🛠️ {w.dur}</span>
              </div>
              {locked && <Bill cost={w.cost} mats={f.mats} needs={w.needs} beaten={!!(w.needs && f.kills[w.needs])} />}
            </div>
          )
        })}

        <div className="slf-forge">
          <div>
            <b>Reforge — {f.plus < MAX_PLUS ? `+${f.plus} → +${f.plus + 1}` : 'finished'}</b>
            <p className="muted" style={{ fontSize: 11, margin: '2px 0 0' }}>
              {up ? 'Each step is +14% damage and +30% life in the blade — and it comes back whole.' : 'This blade cannot be taken any further.'}
            </p>
            {up && <Bill cost={up} mats={f.mats} />}
          </div>
          <button
            className="btn btn--blue btn--small"
            disabled={!up || !canPay(f.mats, up)}
            onClick={() => { sfx.click(); slfUpgrade() }}
          >
            Reforge
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 2 }}>🛡️ Armour</div>
        <p className="muted" style={{ fontSize: 11, margin: '0 0 8px' }}>
          Every piece is a trade: a little damage reduction for legs that are a little slower and a roll that costs a
          little more. Wearing nothing is a real build here, and it is the one with the luck.
        </p>
        {PARTS.map((part) => {
          const scarred = f.scars.includes(part)
          const wornId = f.worn[part] ?? null
          const options = ARMOUR.filter((a) => a.part === part)
          return (
            <div key={part} className={`slf-slot ${scarred ? 'is-scarred' : ''}`}>
              <div className="slf-slot-head">
                <b>{PART_NAMES[part]}</b>
                {scarred ? <span className="slf-tag is-curse">🩸 scarred — permanent</span> : <span className="muted" style={{ fontSize: 11 }}>{armourById(wornId)?.name ?? 'bare'}</span>}
              </div>
              {scarred ? (
                <p className="muted" style={{ fontSize: 11, margin: '4px 0 0' }}>
                  Lycaon’s Night-Slaying Fang went through here. Nothing will ever cover it again.
                </p>
              ) : (
                <div className="slf-chipsrow">
                  <button
                    className={`btn btn--small ${!wornId ? 'btn--blue' : 'btn--ghost'}`}
                    onClick={() => equip(f.weapon, { ...f.worn, [part]: null })}
                  >
                    Bare
                  </button>
                  {options.map((a) => {
                    const locked = !!a.cost && !f.owned.includes(a.id)
                    const canForge = !!a.cost && (!a.needs || !!f.kills[a.needs]) && canPay(f.mats, a.cost)
                    return locked ? (
                      <button
                        key={a.id}
                        className="btn btn--small btn--ghost"
                        disabled={!canForge}
                        onClick={() => { sfx.click(); slfForge(a.id, 'armour') }}
                        title={a.what}
                      >
                        🔒 {a.emoji} {a.name}
                      </button>
                    ) : (
                      <button
                        key={a.id}
                        className={`btn btn--small ${wornId === a.id ? 'btn--blue' : 'btn--ghost'}`}
                        onClick={() => equip(f.weapon, { ...f.worn, [part]: a.id })}
                        title={a.what}
                      >
                        {a.emoji} {a.name} <i style={{ opacity: 0.6, fontStyle: 'normal' }}>+{a.def}/−{a.weight}</i>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="h3" style={{ marginBottom: 6 }}>🎒 The bag</div>
        {MATERIALS.every((m) => !f.mats[m.id]) ? (
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>Empty. Monsters drop it; nothing else does.</p>
        ) : (
          MATERIALS.filter((m) => f.mats[m.id]).map((m) => (
            <div key={m.id} className="slf-mat">
              <b>{m.emoji} {m.name}{m.rare && <i className="slf-rare"> rare</i>}</b>
              <span>×{has(m.id)}</span>
              <p className="muted" style={{ fontSize: 11, margin: '2px 0 0', gridColumn: '1 / -1' }}>{m.what}</p>
            </div>
          ))
        )}
      </div>
    </>
  )
}

/** A material bill, with what you are short of said in red. */
function Bill({
  cost,
  mats,
  needs,
  beaten,
}: {
  cost: Partial<Record<string, number>> | undefined
  mats: Record<string, number>
  needs?: string
  beaten?: boolean
}) {
  if (!cost) return null
  return (
    <div className="slf-bill">
      {needs && !beaten && <span className="is-short">needs {needs} down</span>}
      {Object.entries(cost).map(([id, n]) => {
        const have = mats[id] ?? 0
        const m = materialById(id)
        return (
          <span key={id} className={have >= (n ?? 0) ? '' : 'is-short'}>
            {m?.emoji} {have}/{n}
          </span>
        )
      })}
    </div>
  )
}

// --- Codex -------------------------------------------------------------------

/**
 * The bestiary and the people. Monsters stay blank until you have actually
 * fought them, because a wiki you read before the fight is a fight you did not
 * have to learn — and learning the fight is the entire game.
 */
function CodexTab() {
  const { data } = useStore()
  const f = data.frontier

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3">🌐 Shangri-La Frontier</div>
        <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
          A thirty-million-player VRMMO with real physics and no hand-holding: high fantasy laid over lost machine
          technology, and a difficulty curve that most of its players never climb. The base splits into two crowds — the
          people playing it as a game, and the hunters chasing <b>Unique Scenarios</b>, one-off stories that only open for
          whoever gets there first. This is the second crowd.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 8 }}>👥 Who you have met</div>
        <Person
          emoji="🐦"
          name="Sunraku"
          real="Rakuro Hizutome"
          what="A connoisseur of terrible games, which is exactly the training this one rewards. Fights in a bird mask and almost nothing else: maximum agility, maximum crit, and a defence stat he has plainly decided is somebody else's problem. He does not out-stat anything. He simply does not get hit."
          known
        />
        <Person
          emoji="🐰"
          name="Emul"
          real="Vorpal Rabbit of Rabituza"
          what="An NPC who is far more of a person than the label suggests. She follows you into the hunt, calls the phase changes and shouts the thing you needed to know half a second before you needed it — and she reacts to what is actually happening rather than reading a script."
          known
        />
        <Person
          emoji="🛡️"
          name="Psyger-0"
          real="Top-ranked player"
          what="The number one on the board, and built like it: a tank that also does the damage. Once you have put the Tombguard down you have done what they have done, and they will answer a call — one burst of covering fire per hunt."
          known={f.assist}
          lock="Beat Wezaemon and they will take your call."
        />
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 8 }}>📖 Bestiary</div>
        {BOSSES.map((b) => {
          const met = !!f.kills[b.id] || f.runs > 0
          const slain = !!f.kills[b.id]
          return (
            <div key={b.id} className={`slf-lore ${slain ? 'is-slain' : ''}`}>
              <div className="slf-lore-head">
                <b>{b.emoji} {b.name}</b>
                <span className="muted" style={{ fontSize: 11 }}>{b.title}</span>
              </div>
              <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
                {met ? b.lore : 'You have not been out there yet. Go and find out.'}
              </p>
              {slain && (
                <div className="slf-facts" style={{ marginTop: 6 }}>
                  <span>☠️ {f.kills[b.id].runs} clear{f.kills[b.id].runs === 1 ? '' : 's'}</span>
                  <span>🏁 best {f.kills[b.id].best}s</span>
                  <span>🎚️ {GRADES[(f.kills[b.id].grade as Grade) in GRADES ? (f.kills[b.id].grade as Grade) : 'frontier'].label}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="h3" style={{ marginBottom: 6 }}>🕶️ Hidden parameters</div>
        <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
          Numbers the game runs on and never prints. You do not unlock these by paying for them — you work them out by
          playing, and then they turn up here.
        </p>
        <Found on={f.found.includes('luck')} emoji="🍀" name="Luck" what="Nudges your crit rate and decides whether a rare material ever falls. It goes UP as your armour comes off, which is the joke this game keeps making: fortune favours the reckless." hint="Found after a few hunts." />
        <Found on={f.found.includes('curse')} emoji="🩸" name="Curse resistance" what="The odds a Night-Slaying Fang fails to leave a mark. Bought with armour and with nothing else — so the fast build is the one that gets scarred." hint="Found the first time something scars you." />
        <Found on={f.found.includes('aggro')} emoji="👁️" name="Aggro" what="How much attention you are drawing. It climbs while you attack and bleeds away while you do not, and the monster reads it: high, and it comes straight at you; low, and it starts throwing the whole arena around instead. Backing off is a real move because of this number." hint="Found once you have put something big down." />
      </div>
    </>
  )
}

function Person({
  emoji,
  name,
  real,
  what,
  known,
  lock,
}: {
  emoji: string
  name: string
  real: string
  what: string
  known: boolean
  lock?: string
}) {
  return (
    <div className={`slf-person ${known ? '' : 'is-locked'}`}>
      <div style={{ fontSize: 26 }}>{known ? emoji : '❔'}</div>
      <div style={{ minWidth: 0 }}>
        <b>{known ? name : '???'}</b>
        <i className="muted" style={{ fontSize: 11, display: 'block', fontStyle: 'normal' }}>{known ? real : 'not met'}</i>
        <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>{known ? what : lock}</p>
      </div>
    </div>
  )
}

function Found({ on, emoji, name, what, hint }: { on: boolean; emoji: string; name: string; what: string; hint: string }) {
  return (
    <div className={`slf-found ${on ? 'is-on' : ''}`}>
      <b>{on ? emoji : '❔'} {on ? name : '???'}</b>
      <p className="muted" style={{ fontSize: 12, margin: '3px 0 0' }}>{on ? what : hint}</p>
    </div>
  )
}

// --- How to ------------------------------------------------------------------

function RulesTab() {
  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3">🐦 The one rule</div>
        <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
          <b>Spacing and reflexes beat numbers.</b> Nothing on this screen will save you from a monster you have not
          learned. Every attack is painted on the floor before it lands and it fills up as the wind-up runs — when the
          shape goes solid white, it is already happening. Read it, then move.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 6 }}>🎮 The controls</div>
        <ul className="slf-list">
          <li><b>Stick / WASD</b> — move, and <i>aim</i>. There is no lock-on: the sword goes where you were facing, so a swing thrown at nothing is a swing thrown at nothing.</li>
          <li><b>Slash (J)</b> — quick, cheap, chains three times. The third one hits hardest.</li>
          <li><b>Heavy (K)</b> — <i>hold</i> to charge, release to swing. Slow, huge, and it can knock a wind-up clean off a small monster.</li>
          <li><b>Dodge (Space)</b> — a roll with real invincibility frames, and the only honest way to get any.</li>
          <li><b>Flask (H)</b> — three a hunt. You stand still for a second while you drink it, so pick your moment.</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ marginBottom: 6 }}>⚡ The perfect dodge</div>
        <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
          Roll <i>into</i> an attack so that the hitbox catches you while your invincibility is still up. The world drops
          into slow motion, your stamina comes back, and you get <b>Overclock</b> — three seconds of more damage, faster
          swings and quicker legs. This is where the whole game lives. Running away is survival; rolling through it is
          how you actually win.
        </p>
        <div className="h3" style={{ marginBottom: 6 }}>🧠 They adapt</div>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Hit a monster with the same attack over and over and it stops working — the damage falls off, and it starts
          reading you. It bleeds away when you stop, so <b>mix your two attacks</b>. The pack in Rabituza does it hardest:
          every one you kill with the blade teaches the survivors, and the ley-vents in the floor teach them nothing at
          all. That is not a hint. That is the solution.
        </p>
      </div>

      <div className="card">
        <div className="h3" style={{ marginBottom: 6 }}>💀 The ways to lose</div>
        <ul className="slf-list">
          <li><b>You died.</b> Health to zero. Nothing drops, and the wear stays on your blade.</li>
          <li><b>Grave Seal.</b> Wezaemon’s countdown reaches zero. It does not attack you — it simply ends the run, mid-fight, with plenty of health left. When the plate comes off, that clock runs at double speed.</li>
          <li><b>Out of breath.</b> Empty the stamina bar and you stand there gasping for a second, unable to do anything. More players die here than to any single attack.</li>
          <li><b>Your weapon breaks.</b> Not the end of the hunt, but you now hit for a third of what you did, and it stays broken until a smith sees it.</li>
          <li><b>Scarred.</b> Lycaon’s Night-Slaying Fang lands and that part of you is marked for good. It never wears armour again. There is no screen anywhere in this app that undoes it.</li>
        </ul>
      </div>
    </>
  )
}
