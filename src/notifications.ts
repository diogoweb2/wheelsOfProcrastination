// Best-effort local reminders (pre-Firebase). True scheduled push arrives with FCM later.
import { dayKey, addDays } from './logic/dates'
import type { AppData } from './types'
import { pickToday } from './logic/today'

export async function ensurePermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

function reminderBody(data: AppData): { title: string; body: string } {
  const today = dayKey()
  const doneToday = data.completions.some((c) => c.day === today)
  const yesterday = addDays(today, -1)
  const missedYesterday =
    !data.completions.some((c) => c.day === yesterday) && !data.frozenDays.some((f) => f.day === yesterday)

  // §2b — on the Today card the reminder IS the cue, so it names the task. A
  // nudge that says "open the app and decide" is the part that doesn't happen.
  const todayMode = data.settings.dailyMode === 'today'

  if (doneToday) {
    return todayMode
      ? { title: '👒 That was the day', body: 'Quest cleared. Nothing else is asked of you — see you tomorrow!' }
      : { title: '👒 Nice one, nakama!', body: 'You already cleared a quest today. Another spin? Shishishi!' }
  }
  if (missedYesterday && data.streak.current > 0 && data.economy.freezes === 0) {
    return {
      title: '🚨 Your streak is on fire (the bad kind)',
      body: `${data.streak.current} days at risk! Do 1 task now — and buy a Streak Freeze, you have zero.`,
    }
  }
  if (todayMode) {
    const pick = pickToday(data.tasks, data.completions, data.week, today, data.today.passed)
    if (pick) return { title: `👒 ${pick.task.name}`, body: `${pick.reason} — press START, that's the whole ask.` }
    return { title: '👒 Nothing on the card', body: 'Everything available is done or resting. Enjoy it!' }
  }
  return { title: '👒 Adventure awaits!', body: 'One tiny quest. Spin the wheel and let\'s set sail!' }
}

let timer: number | undefined

/** Schedules today's (or tomorrow's) reminder while the app/SW is alive. */
export async function scheduleDailyReminder(data: AppData): Promise<void> {
  if (!(await ensurePermission())) return
  window.clearTimeout(timer)
  const now = new Date()
  const next = new Date(now)
  next.setHours(data.settings.reminderHour, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  timer = window.setTimeout(async () => {
    const { title, body } = reminderBody(data)
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (reg) await reg.showNotification(title, { body, icon: '/pwa-192.png', badge: '/pwa-192.png' })
      else new Notification(title, { body })
    } catch {
      /* notification blocked mid-session; nothing to do */
    }
  }, next.getTime() - now.getTime())
}
