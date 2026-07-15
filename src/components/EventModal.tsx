import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { Luffy, type LuffyMood } from '../components/Luffy'
import { sfx } from '../audio'

const MOOD_BY_TYPE: Record<string, LuffyMood> = {
  badge: 'happy',
  goal: 'happy',
  streakDead: 'shocked',
  frozen: 'cool',
  penalty: 'judging',
}

/** Displays queued store events (badges, goals, streak deaths, freezes) one at a time. */
export function EventModal() {
  const { events, popEvent } = useStore()
  const event = events[0]

  useEffect(() => {
    if (!event) return
    if (event.type === 'badge' || event.type === 'goal') {
      sfx.fanfare()
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 } })
    } else if (event.type === 'streakDead' || event.type === 'penalty') {
      sfx.sad()
    } else if (event.type === 'frozen') {
      sfx.freeze()
    }
  }, [event])

  if (!event) return null

  return (
    <div className="overlay overlay--center" onClick={popEvent}>
      <div className="sheet" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <Luffy mood={MOOD_BY_TYPE[event.type] ?? 'idle'} size={120} />
        <div style={{ fontSize: 48, margin: '6px 0' }}>{event.emoji}</div>
        <div className="h1">{event.title}</div>
        <p className="muted" style={{ margin: '8px 0 18px' }}>
          {event.description}
        </p>
        <button className="btn" onClick={popEvent}>
          {event.type === 'streakDead' ? 'We set sail again!' : event.type === 'penalty' ? 'Nami’s scary. Understood.' : 'Yosh!'}
        </button>
      </div>
    </div>
  )
}
