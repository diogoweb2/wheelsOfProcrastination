// 🌙 Night watch, as the screens see it (§23).
//
// The window belongs to the profile signed in on THIS device, and the captain's
// own profile is never on watch — he is the one who sets it. The clock is
// re-read every 30 seconds so 19:00 actually lands while the app is open, and
// the app doesn't need to be reopened to wake up at 07:00 either.
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import { appOpen, curfewActive, defaultCurfew, leftLabel, minutesLeft, opensAtLabel, type CurfewSettings } from '../logic/curfew'

export interface CurfewNow {
  /** The window as saved, whether or not it applies to whoever is looking. */
  curfew: CurfewSettings
  /** On watch right now — i.e. this profile is inside the window. */
  active: boolean
  /** May this app open right now? */
  isOpen: (appId: string) => boolean
  /** "07:00 tomorrow" — when everything comes back. */
  opensAt: string
  /** "2h 15m" left of the window. */
  left: string
}

export function useCurfew(): CurfewNow {
  const { data, activeProfileId } = useStore()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    const onVis = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const curfew = data.settings.curfew ?? defaultCurfew()
  // the captain sets the watch; he doesn't stand it
  const applies = activeProfileId !== PARENT_ID
  const active = applies && curfewActive(curfew, now)

  return {
    curfew,
    active,
    isOpen: (appId) => (applies ? appOpen(appId, curfew, now) : true),
    opensAt: opensAtLabel(curfew, now),
    left: leftLabel(minutesLeft(curfew, now)),
  }
}
