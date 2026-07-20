// Two proactive streak modals, shown on app open (repair first, goal nudge second):
//  1. Streak repair — a streak died while the user was away; offer to buy it back.
//  2. Goal check-in — every GOAL_PROMPT_EVERY_DAYS days, resurface the streak
//     goal with the Berry bonus per option (it used to hide in the profile).
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID } from '../store/storage'
import { GOAL_PROMPT_EVERY_DAYS, STREAK_GOAL_OPTIONS, streakGoalBonus, streakRepairCost } from '../logic/economy'
import { dayKey, daysUntil } from '../logic/dates'
import { Luffy } from './Luffy'
import { sfx } from '../audio'

export function StreakPrompts() {
  const {
    data,
    dataLoaded,
    activeProfileId,
    events,
    repairStreak,
    dismissStreakRepair,
    setStreakGoal,
    setSettings,
    freezeRequests,
    askForFreeze,
    freezeGifts,
    markFreezeGiftSeen,
  } = useStore()
  const [askOpen, setAskOpen] = useState(false)
  const [reason, setReason] = useState('')

  const dead = data.streak.deadStreak
  // only the kid can ask Dad, and only while he has no ask already waiting
  const canAsk = activeProfileId === KID_ID
  const asked = freezeRequests.some((r) => r.status === 'pending' && r.fromId === activeProfileId)
  // throttle the goal nudge; never stack it on top of the repair offer or queued events
  const lastPrompt = data.settings.lastGoalPromptDay
  const goalDue = !lastPrompt || -daysUntil(lastPrompt) >= GOAL_PROMPT_EVERY_DAYS
  // a gift Dad sent that this session hasn't celebrated yet — takes priority
  // over the repair offer, since the gift is what resolves the dead streak
  const gift = freezeGifts.find((g) => g.toId === activeProfileId && !g.seenAt)
  const showGift = dataLoaded && !!activeProfileId && !!gift
  const showRepair = dataLoaded && !!activeProfileId && !!dead && !showGift
  const showGoal = dataLoaded && !!activeProfileId && !dead && events.length === 0 && goalDue

  useEffect(() => {
    if (showRepair) sfx.sad()
  }, [showRepair])

  useEffect(() => {
    if (showGift) sfx.fanfare()
  }, [showGift])

  if (showGift && gift) {
    return (
      <div className="overlay overlay--center">
        <div className="sheet" style={{ textAlign: 'center' }}>
          <img
            src="/chopper.webp"
            width={110}
            height={134}
            alt="Chopper"
            draggable={false}
            style={{ objectFit: 'contain' }}
          />
          <div style={{ fontSize: 44, margin: '6px 0' }}>🧊🎁</div>
          <div className="h1">
            {gift.fromName} sent you {gift.count === 1 ? 'a free Streak Freeze' : `${gift.count} free Streak Freezes`}!
          </div>
          {gift.revived !== null && (
            <p style={{ margin: '8px 0 0', fontWeight: 900, color: 'var(--orange)' }}>
              🔥 Your {gift.revived}-day streak is back from the deep!
            </p>
          )}
          {gift.message && (
            <p style={{ margin: '12px 0 0', fontStyle: 'italic', lineHeight: 1.45 }}>“{gift.message}”</p>
          )}
          <button
            className="btn"
            style={{ marginTop: 16 }}
            onClick={() => {
              sfx.click()
              markFreezeGiftSeen(gift.id)
            }}
          >
            Thanks Dad! Let’s sail 👒
          </button>
        </div>
      </div>
    )
  }

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
          {canAsk && (asked ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              📨 Dad got your message — hang tight, he might send Chopper over!
            </p>
          ) : askOpen ? (
            <div className="field" style={{ marginTop: 10, textAlign: 'left' }}>
              <label>Tell Dad what happened (optional)</label>
              <input
                type="text"
                autoFocus
                value={reason}
                maxLength={120}
                placeholder="I was on a trip and had no wifi…"
                onChange={(e) => setReason(e.target.value)}
                style={{ marginTop: 4 }}
              />
              <button
                className="btn btn--blue"
                style={{ marginTop: 8 }}
                onClick={() => {
                  sfx.click()
                  askForFreeze(reason)
                  setAskOpen(false)
                }}
              >
                📨 Send it to Dad
              </button>
            </div>
          ) : (
            <button
              className="btn btn--blue"
              style={{ marginTop: 8 }}
              onClick={() => {
                sfx.click()
                setAskOpen(true)
              }}
            >
              🆘 Ask Dad for a free freeze
            </button>
          ))}
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
