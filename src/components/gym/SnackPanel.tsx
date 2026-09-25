// 🍿 Snack — ten minutes at lunch, on purpose. See BUSINESS_REQUIREMENTS §18ab.
//
// The tab is a MENU and nothing else. Pick a theme, see why the app would pick
// it for you, start it — and from that moment on this screen is the Train tab,
// because a snack is an ordinary session in the ordinary slot and runs through
// the ordinary runner (`SessionFlow`). There is no second engine here and there
// must never be one.
//
// The recommendation is a LABEL, not a gate. Every routine is tappable, in any
// order, whatever the Body map says — the app's job is to have an opinion and
// say why, not to lock a door at 12:40 on a Tuesday.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { PART_LABEL, exerciseById, sessionSeconds } from '../../logic/gym'
import { slotLine } from '../../logic/gymBlock'
import { TONE_COLOR, toneFor } from '../../logic/gymBody'
import { SNACK_CAP_SEC, planSnackSession, rankSnacks, type SnackPick } from '../../logic/gymSnack'
import { primeGymAudio, sfx } from '../../audio'
import { ExerciseDemo } from './ExerciseDemo'
import { VideoButton } from './ExerciseVideo'
import { SessionFlow } from './TrainPanel'

export function SnackPanel() {
  return <SessionFlow idle={<Menu />} />
}

function Menu() {
  const { data, gymCatalog } = useStore()
  const gym = data.gym
  const picks = useMemo(() => rankSnacks(gym, gymCatalog), [gym, gymCatalog])

  return (
    <>
      <div className="h2">🍿 Exercise snacks</div>

      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
          Ten minutes, one theme, done at lunch.
        </p>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Not a short workout — a snack. One idea done three or four ways, bodyweight only, over before the kettle boils.
          It pays Berries, it counts towards the streak, and it lands on the Body map like any other work, so the session
          you do tonight already knows about it. It does <strong>not</strong> move your training block — the next session of the
          rotation is still exactly where you left it.
        </p>
      </div>

      {picks.map((p) => (
        <SnackCard key={p.routine.id} pick={p} />
      ))}

      <p className="muted" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
        ⭐ is the app’s opinion, read off the same recovery numbers as the Body tab — it can’t recommend something the
        body map calls red, because it is literally the same number. Ignore it freely; every one of them starts on a tap.
        The reps climb on their own: hit the number on every set and the next one asks for one more (§18d).
      </p>
    </>
  )
}

function SnackCard({ pick }: { pick: SnackPick }) {
  const { data, gymCatalog, gymPlanSnack } = useStore()
  const gym = data.gym
  const [open, setOpen] = useState(false)
  const { routine, ready, recommended, why, moves } = pick

  // Built for real, not estimated: the card's minutes are the minutes the
  // preview will show, because it is the same function that builds both.
  const built = useMemo(
    () => planSnackSession({ catalog: gymCatalog, gym, snackId: routine.id }),
    [gymCatalog, gym, routine.id],
  )
  const minutes = built ? Math.max(1, Math.round(sessionSeconds(built) / 60)) : 0
  const planned = built?.exercises ?? []
  const tone = toneFor(ready)
  const runnable = moves > 0 && planned.length > 0

  return (
    <div className={`card gym-snack ${recommended ? 'gym-snack--pick' : ''}`}>
      <div className="gym-snack-head">
        <span style={{ fontSize: 30 }}>{routine.emoji}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 900, fontSize: 16 }}>{routine.name}</span>
          <span className="muted" style={{ display: 'block', fontSize: 12, lineHeight: 1.4 }}>{routine.goal}</span>
        </span>
        {recommended && <span className="chip chip--test">⭐ Recommended</span>}
      </div>

      <div className="gym-chip-row gym-chip-row--wrap" style={{ marginTop: 8 }}>
        <span className="chip">
          {planned.length} move{planned.length === 1 ? '' : 's'}
        </span>
        <span className="chip">⏱ ~{minutes} min</span>
        <span className="chip" style={{ color: TONE_COLOR[tone] }}>
          {Math.round(ready * 100)}% recovered
        </span>
        {[...new Set(planned.flatMap((e) => e.parts))].slice(0, 2).map((part) => (
          <span className="chip" key={part}>{PART_LABEL[part]}</span>
        ))}
      </div>

      <div className="widget-bar" style={{ marginTop: 8 }}>
        <span style={{ width: `${Math.round(ready * 100)}%`, background: TONE_COLOR[tone] }} />
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>{why}</p>

      <button
        className="btn"
        style={{ marginTop: 10 }}
        disabled={!runnable}
        onClick={() => {
          sfx.fanfare()
          primeGymAudio() // first gesture of the session: unlock the alert clips
          if (!gymPlanSnack(routine.id)) sfx.error()
        }}
      >
        {runnable ? `▶️ ${routine.name} — ${minutes} min` : '— nothing in the catalog for this one'}
      </button>

      <button
        className="btn btn--ghost btn--small"
        style={{ width: '100%', marginTop: 8 }}
        onClick={() => {
          sfx.click()
          setOpen(!open)
        }}
      >
        {open ? '▾ Hide the moves' : `▸ What it will ask for (${planned.length})`}
      </button>

      {open && (
        <ul className="gym-block-list" style={{ marginTop: 8 }}>
          {routine.slots.map((s) => {
            const def = exerciseById(gymCatalog, s.exId)
            const on = planned.some((e) => e.exId === s.exId)
            return (
              <li key={s.exId} style={on ? undefined : { opacity: 0.45 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <ExerciseDemo demo={def?.demo} emoji={def?.emoji ?? '❓'} size={34} />
                  <span style={{ minWidth: 0 }}>{def ? def.name : 'not in the catalog'}</span>
                </span>
                <span className="muted">{on ? slotLine(s, gymCatalog, gym) : 'off today'}</span>
                {def && <VideoButton exId={def.id} name={def.name} />}
              </li>
            )
          })}
        </ul>
      )}

      {open && built && sessionSeconds(built) > SNACK_CAP_SEC * 0.9 && (
        <p className="muted" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.45 }}>
          This one has grown to the top of its fifteen minutes. The next rep it earns comes off the tail instead — the
          movement the snack is named for never goes.
        </p>
      )}
    </div>
  )
}
