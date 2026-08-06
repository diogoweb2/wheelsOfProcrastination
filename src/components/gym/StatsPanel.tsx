// 📊 Stats — the "is this actually working" tab, and the motivation engine.
// Everything here reads the session log; nothing here can change it.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { BodyPart } from '../../types'
import { ALL_PARTS, PART_EMOJI, PART_LABEL, daysSince } from '../../logic/gym'
import { activityDots, exerciseProgress, partSplit, records, summarise, trainedExercises, weeklyVolume } from '../../logic/gymStats'
import { ActivityDots, ProgressLine, SplitBars, WeekBars } from './GymCharts'
import { sfx } from '../../audio'

export function StatsPanel() {
  const { data } = useStore()
  const gym = data.gym
  const unit = gym.brief.weightUnit ?? 'lb'
  const [part, setPart] = useState<BodyPart | 'all'>('all')
  const [exId, setExId] = useState<string | null>(null)

  const done = useMemo(() => gym.sessions.filter((s) => s.status === 'done'), [gym.sessions])
  const summary = useMemo(() => summarise(gym), [gym])
  const weeks = useMemo(() => weeklyVolume(done, part), [done, part])
  const split = useMemo(() => partSplit(done, 28), [done])
  const trained = useMemo(() => trainedExercises(done, part), [done, part])
  const dots = useMemo(() => activityDots(done), [done])
  const prs = useMemo(() => records(gym).slice(0, 8), [gym])

  const pickedId = exId && trained.some((t) => t.exId === exId) ? exId : (trained[0]?.exId ?? null)
  const picked = trained.find((t) => t.exId === pickedId) ?? null
  const progress = useMemo(() => (pickedId ? exerciseProgress(done, pickedId) : []), [done, pickedId])
  const progressUnit = progress.some((p) => p.topWeight > 0) ? unit : 'reps'

  if (done.length === 0) {
    return (
      <>
        <div className="h2">📊 Stats</div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>📈</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            No sessions logged yet. Do one workout and this page fills up — streaks, records, where your work is going, and
            whether the weight is actually moving.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="h2">📊 The numbers</div>

      <div className="widget-grid">
        <Tile emoji="🔥" big={String(summary.streak)} sub={`best ${summary.bestStreak}`} foot="DAY STREAK" />
        <Tile emoji="🏋️" big={String(summary.sessions)} sub={`${summary.thisWeek} this week`} foot="SESSIONS" />
        <Tile emoji="⏱️" big={String(summary.minutes)} sub={`${summary.reps.toLocaleString()} reps total`} foot="MINUTES" />
        <Tile emoji="🪙" big={String(summary.coins)} sub={summary.avgRating ? `avg ${summary.avgRating.toFixed(1)}★` : 'unrated'} foot="BERRIES EARNED" />
      </div>

      <div className="card">
        <div className="gym-card-head">
          <span>📅 Last 4 weeks</span>
          <span className="muted" style={{ fontSize: 11 }}>
            {summary.lastSessionDaysAgo === 0 ? 'trained today' : `last session ${summary.lastSessionDaysAgo}d ago`}
          </span>
        </div>
        <ActivityDots days={dots} />
      </div>

      <div className="h2">🎯 Filter by body part</div>
      <div className="gym-chip-row gym-chip-row--wrap">
        <button className={`chip chip--tap ${part === 'all' ? 'on' : ''}`} onClick={() => { sfx.click(); setPart('all') }}>
          All
        </button>
        {ALL_PARTS.filter((p) => split.some((s) => s.part === p) || trained.length === 0).map((p) => (
          <button key={p} className={`chip chip--tap ${part === p ? 'on' : ''}`} onClick={() => { sfx.click(); setPart(p) }}>
            {PART_EMOJI[p]} {PART_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="gym-card-head">
          <span>📊 Weekly work{part !== 'all' ? ` · ${PART_LABEL[part]}` : ''}</span>
        </div>
        <WeekBars
          items={weeks.map((w) => ({ label: w.label, value: w.volume, caption: `${w.sessions} session${w.sessions === 1 ? '' : 's'}` }))}
          unit="volume"
        />
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Volume = reps × weight (reps alone for bodyweight moves). It’s the honest “how much work did I do” number.
        </p>
      </div>

      <div className="card">
        <div className="gym-card-head">
          <span>🧍 Where the work went</span>
          <span className="muted" style={{ fontSize: 11 }}>last 28 days</span>
        </div>
        <SplitBars
          items={split.map((s) => ({ label: PART_LABEL[s.part], emoji: PART_EMOJI[s.part], value: s.sets, pct: s.pct }))}
          unit="sets"
        />
      </div>

      {trained.length > 0 && (
        <div className="card">
          <div className="gym-card-head">
            <span>📈 Am I getting stronger?</span>
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <select value={pickedId ?? ''} onChange={(e) => setExId(e.target.value)}>
              {trained.map((t) => (
                <option key={t.exId} value={t.exId}>
                  {t.name} ({t.times}×)
                </option>
              ))}
            </select>
          </div>
          <ProgressLine
            points={progress.map((p) => ({
              label: p.label,
              value: p.value,
              caption: p.topWeight > 0 ? `${p.topReps} reps top set` : `${p.reps} reps total`,
            }))}
            unit={progressUnit}
          />
          {picked && (
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              {picked.times} session{picked.times === 1 ? '' : 's'} · last one {daysSince(picked.lastDay)} days ago
            </p>
          )}
        </div>
      )}

      {prs.length > 0 && (
        <>
          <div className="h2">🏆 Personal records</div>
          <div className="card">
            {prs.map((r) => (
              <div key={r.exId} className="gym-pr-row">
                <span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 14 }}>{r.name}</span>
                <span style={{ fontWeight: 900, color: 'var(--gold)' }}>
                  {r.weight ? `${r.weight} ${unit}` : `${r.reps} reps`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {summary.favourite && (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 12 }}>
          Your most-done exercise: <strong>{summary.favourite.name}</strong> ({summary.favourite.times}×).
        </p>
      )}
    </>
  )
}

function Tile({ emoji, big, sub, foot }: { emoji: string; big: string; sub: string; foot: string }) {
  return (
    <div className="widget">
      <div className="widget-head">
        <span>{emoji}</span>
      </div>
      <div className="widget-big">{big}</div>
      <div className="widget-sub">{sub}</div>
      <div className="widget-foot">{foot}</div>
    </div>
  )
}
