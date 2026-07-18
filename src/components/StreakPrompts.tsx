// Two proactive streak modals, shown on app open (repair first, goal nudge second):
//  1. Streak repair — a streak died while the user was away; offer to buy it back.
//  2. Goal check-in — every GOAL_PROMPT_EVERY_DAYS days, resurface the streak
//     goal with the Berry bonus per option (it used to hide in the profile).
import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { GOAL_PROMPT_EVERY_DAYS, STREAK_GOAL_OPTIONS, streakGoalBonus, streakRepairCost } from '../logic/economy'
import { dayKey, daysUntil } from '../logic/dates'
import { Luffy } from './Luffy'
import { sfx } from '../audio'

export function StreakPrompts() {
  const { data, dataLoaded, activeProfileId, events, repairStreak, dismissStreakRepair, setStreakGoal, setSettings } = useStore()

  const dead = data.streak.deadStreak
  // throttle the goal nudge; never stack it on top of the repair offer or queued events
  const lastPrompt = data.settings.lastGoalPromptDay
  const goalDue = !lastPrompt || -daysUntil(lastPrompt) >= GOAL_PROMPT_EVERY_DAYS
  const showRepair = dataLoaded && !!activeProfileId && !!dead
  const showGoal = dataLoaded && !!activeProfileId && !dead && events.length === 0 && goalDue

  useEffect(() => {
    if (showRepair) sfx.sad()
  }, [showRepair])

  if (showRepair && dead) {
    const cost = streakRepairCost(dead.value)
    const canAfford = data.economy.gems >= cost
    return (
      <div className="overlay overlay--center">
        <div className="sheet" style={{ textAlign: 'center' }}>
          <Luffy mood="shocked" size={120} />
          <div style={{ fontSize: 48, margin: '6px 0' }}>💀🔥</div>
          <div className="h1">Your {dead.value}-day streak sank!</div>
          <p className="muted" style={{ margin: '8px 0 14px' }}>
            The sea took it while you were away… but Chopper can revive it — for a price.
          </p>
          <button
            className="btn"
            disabled={!canAfford}
            onClick={() => {
              if (repairStreak()) sfx.fanfare()
              else sfx.error()
            }}
          >
            ⛑️ Revive my streak · 🪙{cost}
          </button>
          {!canAfford && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              You have 🪙{data.economy.gems} — not enough this time.
            </p>
          )}
          <button
            className="btn btn--ghost"
            style={{ marginTop: 8 }}
            onClick={() => {
              sfx.click()
              dismissStreakRepair()
            }}
          >
            Let it sink — we start a new voyage 🌅
          </button>
        </div>
      </div>
    )
  }

  if (showGoal) {
    const dismiss = () => {
      sfx.click()
      setSettings({ lastGoalPromptDay: dayKey() })
    }
    return (
      <div className="overlay overlay--center" onClick={dismiss}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: 'center' }}>
            <Luffy mood="cool" size={110} />
            <div className="h1" style={{ marginTop: 4 }}>🎯 Captain’s check-in</div>
            <p className="muted" style={{ margin: '8px 0 4px' }}>
              Streak: <b style={{ color: 'var(--orange)' }}>🔥 {data.streak.current} day{data.streak.current === 1 ? '' : 's'}</b> · goal:{' '}
              <b>{data.settings.streakGoal} days</b>
            </p>
            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              Bigger goal, bigger bounty — pick your next target:
            </p>
          </div>
          {STREAK_GOAL_OPTIONS.map((g) => {
            const reached = data.settings.goalsReached.includes(g)
            const active = data.settings.streakGoal === g
            return (
              <button
                key={g}
                className={`btn btn--small ${active ? '' : 'btn--ghost'}`}
                style={{ width: '100%', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}
                disabled={reached}
                onClick={() => {
                  sfx.gem()
                  setStreakGoal(g)
                  setSettings({ lastGoalPromptDay: dayKey() })
                }}
              >
                <span>
                  {reached ? '✓ ' : ''}{g} days{active ? ' (current)' : ''}
                </span>
                <span style={{ color: reached ? 'inherit' : 'var(--gold)', fontWeight: 900 }}>+🪙{streakGoalBonus(g)}</span>
              </button>
            )
          })}
          <button className="btn btn--ghost" style={{ marginTop: 6 }} onClick={dismiss}>
            Keep course ⚓
          </button>
        </div>
      </div>
    )
  }

  return null
}
