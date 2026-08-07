// The voyage pages of the 🎡 Wheel app — "how is the daily loop going": streak,
// the island map, and the record (trophies, training log, lifetime numbers).
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import { FREEZE_COST, MAX_FREEZES, STREAK_GOAL_OPTIONS, heldStreak, streakGoalBonus } from '../logic/economy'
import { addDays, dayKey } from '../logic/dates'
import { MapSection } from '../components/MapSection'
import { HabitsSection } from '../components/HabitsSection'
import { sfx } from '../audio'

export function VoyageScreen({ tab, goSpin }: { tab: string; goSpin: () => void }) {
  return (
    <div className="screen">
      {tab === 'streak' && <StreakTab />}
      {tab === 'map' && <MapSection goSpin={goSpin} />}
      {tab === 'record' && (
        <>
          <TrophiesTab />
          <HabitsSection />
          <StatsTab />
        </>
      )}
    </div>
  )
}

function StreakTab() {
  const {
    data, buyFreeze, setStreakGoal, pushEvent, activeProfile,
    freezeRequests, askForFreeze, cancelFreezeRequest, activeProfileId,
  } = useStore()
  const [freezeReason, setFreezeReason] = useState('')
  const askedFreeze = freezeRequests.some((r) => r.status === 'pending' && r.fromId === activeProfileId)
  const me = activeProfile()
  // a dead streak waiting on Dad's answer still reads as alive
  const held = heldStreak(data.streak.deadStreak, freezeRequests, activeProfileId)
  const streakShown = held ?? data.streak.current
  const streakAlive = streakShown > 0

  const today = dayKey()
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6)
    return {
      day,
      done: data.completions.some((c) => c.day === day),
      frozen: data.frozenDays.some((f) => f.day === day),
      isToday: day === today,
    }
  })

  function onBuyFreeze() {
    if (buyFreeze()) {
      sfx.freeze()
      pushEvent({
        type: 'frozen',
        emoji: '🧊',
        title: 'Freeze acquired',
        description: 'One skipped day, pre-forgiven. Chopper\'s got your back!',
      })
    } else {
      sfx.error()
    }
  }

  return (
    <>
      <div className="card" style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>{held !== null ? '🔥⏳' : streakAlive ? '🔥' : '🪦'}</div>
        <div style={{ fontSize: 44, fontWeight: 900, color: streakAlive ? 'var(--orange)' : 'var(--muted)' }}>
          {streakShown}
        </div>
        <div className="muted" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
          day streak · best {data.streak.best}
        </div>
        {held !== null && (
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            On hold until Dad answers your ask 📨
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
          {week.map((d) => (
            <div key={d.day} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                {new Date(d.day + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
              </div>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  marginTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 14,
                  background: d.done ? 'var(--orange)' : d.frozen ? 'var(--ice)' : 'var(--bg2)',
                  color: d.done || d.frozen ? '#3a2000' : 'var(--muted)',
                  border: d.isToday ? '2px solid var(--text)' : '2px solid var(--line)',
                }}
              >
                {d.done ? '✓' : d.frozen ? '🧊' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontWeight: 900, flex: 1 }}>
            🎯 Streak goal — +🪙{streakGoalBonus(data.settings.streakGoal)} when you hit it
          </div>
          <img src="/nami.png" width={48} height={48} alt="Nami" draggable={false} style={{ objectFit: 'contain', flexShrink: 0 }} />
        </div>
        <div className="seg">
          {STREAK_GOAL_OPTIONS.map((g) => (
            <button
              key={g}
              className={data.settings.streakGoal === g ? 'on' : ''}
              style={data.settings.goalsReached.includes(g) ? { color: 'var(--green)' } : undefined}
              onClick={() => {
                sfx.click()
                setStreakGoal(g)
              }}
            >
              {data.settings.goalsReached.includes(g) ? `${g}✓` : g}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        <img src="/chopper.webp" width={54} height={66} alt="Chopper" draggable={false} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>Streak Freeze ({data.economy.freezes}/{MAX_FREEZES})</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Auto-saves your streak when you miss a day. Stock up BEFORE the storm, not after.
          </div>
        </div>
        <button
          className="btn btn--blue btn--small"
          disabled={data.economy.freezes >= MAX_FREEZES || data.economy.gems < FREEZE_COST}
          onClick={onBuyFreeze}
        >
          🪙{FREEZE_COST}
        </button>
      </div>

      {/* the kid can always ask Dad to cover a day he couldn't be here for */}
      {me?.id !== PARENT_ID && (
        <div className="card" style={{ marginBottom: 14 }}>
          {askedFreeze ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 26 }}>📨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900 }}>Dad got your message</div>
                <div className="muted" style={{ fontSize: 13 }}>He’ll send a freeze if it’s fair. Hang tight!</div>
              </div>
              <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); cancelFreezeRequest() }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="field">
              <label>Couldn’t be here? Ask Dad</label>
              <input
                type="text"
                value={freezeReason}
                maxLength={120}
                placeholder="I was on a trip and had no wifi…"
                onChange={(e) => setFreezeReason(e.target.value)}
                style={{ marginTop: 4 }}
              />
              <button
                className="btn btn--blue btn--small"
                style={{ marginTop: 8, alignSelf: 'flex-start' }}
                onClick={() => {
                  sfx.click()
                  askForFreeze(freezeReason)
                  setFreezeReason('')
                }}
              >
                🆘 Ask for a free freeze
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function TrophiesTab() {
  const { data } = useStore()
  return (
    <>
      <div className="h2">🏅 Trophy shelf — {data.badges.length} collected</div>
      {data.badges.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>🏝️</div>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Empty shelf. Very minimalist. Very sad. Go earn some badges!
          </p>
        </div>
      ) : (
        <div className="badge-shelf">
          {[...data.badges].reverse().map((b) => (
            <div key={b.id} className="badge-tile" title={b.description}>
              <div className="e">{b.emoji}</div>
              <div className="t">{b.title}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function StatsTab() {
  const { data } = useStore()
  const today = dayKey()
  // last 8 weeks of completions, oldest bar first
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(today, -7 * (7 - i))
    const start = addDays(end, -6)
    return {
      key: start,
      count: data.completions.filter((c) => c.day >= start && c.day <= end).length,
    }
  })
  const peak = Math.max(1, ...weeks.map((w) => w.count))

  return (
    <>
      <div className="h2">📈 Lifetime</div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>{data.completions.length}</div>
          <div className="muted" style={{ fontSize: 11 }}>tasks done</div>
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--blue)' }}>{data.economy.totalGemsEarned}</div>
          <div className="muted" style={{ fontSize: 11 }}>Berries earned</div>
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--orange)' }}>{data.streak.best}</div>
          <div className="muted" style={{ fontSize: 11 }}>best streak</div>
        </div>
      </div>

      <div className="h2">🗓️ Last 8 weeks</div>
      <div className="card">
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 110 }}>
          {weeks.map((w) => (
            <div key={w.key} style={{ flex: 1, textAlign: 'center' }}>
              <div
                title={`${w.count} done`}
                style={{
                  height: `${Math.round((w.count / peak) * 90)}px`,
                  minHeight: 3,
                  borderRadius: 6,
                  background: 'var(--blue)',
                  opacity: w.count === 0 ? 0.25 : 1,
                }}
              />
              <div className="muted" style={{ fontSize: 10, marginTop: 4, fontWeight: 800 }}>{w.count}</div>
            </div>
          ))}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
          quests cleared per week · newest on the right
        </div>
      </div>
    </>
  )
}
