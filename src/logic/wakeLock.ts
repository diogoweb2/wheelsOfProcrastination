// Keep the screen on for the length of a workout.
//
// The Screen Wake Lock API is the clean answer to "the phone locks between sets
// and I lose the timer". It is dropped automatically whenever the page is
// hidden, so it has to be re-acquired on every visibilitychange — that
// re-acquisition is the part everyone forgets.
//
// Unsupported browsers (older iOS Safari) get a no-op: the rest timer still
// works, and the Gym's beeps are built to survive a locked screen anyway (see
// gymSfx in src/audio.ts).

interface WakeLockSentinelLike {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', fn: () => void) => void
}

type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }

let sentinel: WakeLockSentinelLike | null = null
let wanted = false

export function wakeLockSupported(): boolean {
  return 'wakeLock' in navigator
}

async function acquire() {
  const api = (navigator as WakeLockNavigator).wakeLock
  if (!wanted || sentinel || !api) return
  try {
    sentinel = await api.request('screen')
    sentinel.addEventListener('release', () => {
      sentinel = null
    })
  } catch {
    // denied (battery saver, no user gesture) — nothing to do, the app is fine
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') void acquire()
}

/** Hold the screen awake until called again with `false`. Safe to call repeatedly. */
export function keepScreenAwake(on: boolean): void {
  if (on === wanted) {
    if (on) void acquire() // re-arm after the OS quietly dropped it
    return
  }
  wanted = on
  if (on) {
    document.addEventListener('visibilitychange', onVisible)
    void acquire()
  } else {
    document.removeEventListener('visibilitychange', onVisible)
    void sentinel?.release().catch(() => {})
    sentinel = null
  }
}
