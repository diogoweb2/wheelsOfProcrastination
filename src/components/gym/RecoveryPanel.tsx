// 🩹 Body — what is recovered and what still hurts, on a picture of you.
//
// The planner has always scored recovery; this is the same number with a face
// on it. Green means "train this today"; red means the planner is going to keep
// steering you away from it, and now you can see why.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { BodyPart } from '../../types'
import { PART_EMOJI, PART_LABEL } from '../../logic/gym'
import { TONE_COLOR, TONE_LABEL, partRecovery, readyIn, toneFor, type Tone } from '../../logic/gymBody'
import { FULL_DOSE, IGNORE_DOSE } from '../../logic/gymEffort'
import { BodyMap, OFF_BODY } from './BodyMap'
import { sfx } from '../../audio'

const TONES: Tone[] = ['fresh', 'sore', 'coming', 'ready']

export function RecoveryPanel() {
  const { data } = useStore()
  const gym = data.gym
  const [selected, setSelected] = useState<BodyPart | null>(null)
  // recovery is a function of the clock, so the page has to tick on its own —
  // leave it open through a rest and the bars really do move
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const recovery = useMemo(() => partRecovery(gym, now), [gym, now])
  const onBody = recovery.filter((r) => !OFF_BODY.includes(r.part))
  const offBody = recovery.filter((r) => OFF_BODY.includes(r.part))
  const sore = onBody.filter((r) => r.pct < 1)
  const pick = selected ? recovery.find((r) => r.part === selected) : null

  return (
    <>
      <div className="h2">🩹 Body</div>

      <div className="card">
        {sore.length === 0 ? (
          <p style={{ fontSize: 14, fontWeight: 800 }}>
            ✅ Everything is recovered. Anything on the menu is fair game today.
          </p>
        ) : (
          <p style={{ fontSize: 14, fontWeight: 800 }}>
            {sore.length} {sore.length === 1 ? 'area is' : 'areas are'} still coming back.{' '}
            <span style={{ color: TONE_COLOR[toneFor(sore[0].pct)] }}>
              {PART_LABEL[sore[0].part]}
            </span>{' '}
            is the sorest — ready in {readyIn(sore[0].left)}.
          </p>
        )}
        <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          How much work this muscle actually took, and how long ago. Every exercise splits its effort by how much each
          muscle really does, and that dose sets both <em>how deep</em> the hole is and how long it takes to fill — so
          red means you genuinely trained it, not that it was listed on something you did. It is the same number the
          planner scores on, so the map and your next session can never disagree.
        </p>
      </div>

      <BodyMap
        recovery={recovery}
        selected={selected}
        onPick={(p) => {
          sfx.click()
          setSelected(p === selected ? null : p)
        }}
      />

      <div className="gym-legend">
        {TONES.map((t) => (
          <span key={t} className="gym-legend-item">
            <i style={{ background: TONE_COLOR[t] }} />
            {TONE_LABEL[t]}
          </span>
        ))}
      </div>

      {pick && (
        <div className="card">
          <div className="gym-card-head">
            <span>
              {PART_EMOJI[pick.part]} {PART_LABEL[pick.part]}
            </span>
            <span className="chip" style={{ color: TONE_COLOR[toneFor(pick.pct)] }}>
              {Math.round(pick.pct * 100)}%
            </span>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {!Number.isFinite(pick.since)
              ? `Never trained — fully rested, and the planner would love to give it to you.`
              : pick.pct >= 1
                ? `Last worked ${readyIn(pick.since)} ago. Fully recovered.`
                : `Last worked ${readyIn(pick.since)} ago. It wants ${Math.round(pick.need)}h after that much work, so it is yours again in ${readyIn(pick.left)}.`}
          </p>
          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            {pick.dose > 0 ? (
              <>
                That session dropped <strong>{pick.dose.toFixed(1)}</strong> effort units here —{' '}
                {pick.dose >= FULL_DOSE
                  ? `a full dose, so it goes all the way down and takes the whole ${pick.fullNeed}h.`
                  : `${Math.round((pick.dose / FULL_DOSE) * 100)}% of a full dose, so it goes that far down and no further.`}
              </>
            ) : Number.isFinite(pick.since) ? (
              <>
                You did touch it {readyIn(pick.since)} ago, but under <strong>{IGNORE_DOSE}</strong> effort units — that
                is arithmetic, not training, so it doesn’t open a recovery window.
              </>
            ) : null}
          </p>
        </div>
      )}

      <div className="card">
        <div className="gym-card-head"><span>📋 Every area</span></div>
        {onBody.map((r) => (
          <PartRow key={r.part} r={r} onPick={() => { sfx.click(); setSelected(r.part === selected ? null : r.part) }} selected={selected === r.part} />
        ))}
      </div>

      <div className="card">
        <div className="gym-card-head"><span>🌀 Not a muscle</span></div>
        <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
          Full-body, power and cardio work everything a bit. They have no place on the drawing, but the planner still
          rests them.
        </p>
        {offBody.map((r) => (
          <PartRow key={r.part} r={r} onPick={() => {}} selected={false} />
        ))}
      </div>
    </>
  )
}

function PartRow({ r, selected, onPick }: { r: ReturnType<typeof partRecovery>[number]; selected: boolean; onPick: () => void }) {
  const tone = toneFor(r.pct)
  return (
    <button className={`gym-part-row ${selected ? 'is-on' : ''}`} onClick={onPick}>
      <span className="gym-part-name">
        {PART_EMOJI[r.part]} {PART_LABEL[r.part]}
      </span>
      <span className="gym-part-bar">
        <i style={{ width: `${Math.round(r.pct * 100)}%`, background: TONE_COLOR[tone] }} />
      </span>
      <span className="gym-part-val" style={{ color: TONE_COLOR[tone] }}>
        {r.pct >= 1 ? 'READY' : readyIn(r.left)}
      </span>
    </button>
  )
}
