// 🔄 Always the build that is live.
//
// The Android shell is a WebView that loads the site ONCE and never navigates
// again (`MainActivity` only ever calls `web.onResume()`), and a service worker
// only looks for a new version when a page loads. Put together, Ben's tablet ran
// a build for two days after a deploy: Quiz Watch logged nothing, and his
// warm-up rounds were still being failed at the old 75% mark.
//
// Nothing outside the page can fix that, so the page keeps ITSELF current:
//
//   1. It asks for a new version every time it comes back to the front — which
//      in the shell is every time he opens the app — plus every 15 minutes while
//      it is left open, and on a cold start as usual.
//   2. When a newer build is ready it reloads immediately, UNLESS something is
//      open that a reload would destroy (a quiz sitting, a lesson). Then it
//      waits for that to end. This is the whole reason the worker is registered
//      in `prompt` mode rather than `autoUpdate`: `autoUpdate` reloads the
//      instant the new worker activates, and "the instant" can be question 19
//      of a final test.
//
// There are TWO ways a new build announces itself, and both have to be handled
// or a device can strand itself:
//
//   - `waiting` — the new worker is installed and asking permission. The page
//     grants it (`updateSW(true)`), which activates it and reloads.
//   - `controllerchange` — the new worker activated on its own (`skipWaiting` in
//     vite.config.ts) and took this page over. Nothing asked the page for
//     anything; it just found itself being served by a newer build. This is the
//     branch that rescues a device that is ALREADY stale, because a waiting
//     worker must be invited by the page it replaces, and a page old enough to
//     be the problem does not know how to invite it.
import { registerSW } from 'virtual:pwa-register'

/** While the app is just sitting open. The resume check is the one that matters. */
const CHECK_EVERY_MS = 15 * 60 * 1000

let updateSW: ((reload?: boolean) => Promise<void>) | null = null
/** How the new build announced itself, if it has. */
let ready: 'waiting' | 'claimed' | null = null
let holds = 0 // things open right now that a reload would cost him

/** Called once, from main.tsx, before the app renders. */
export function installFreshen(): void {
  const sw = navigator.serviceWorker
  // On a first-ever visit there is no controller yet, and the worker claiming
  // this page is the ordinary thing, not a replacement. Only a page that was
  // ALREADY being served by a worker is being replaced.
  const wasControlled = !!sw?.controller
  sw?.addEventListener('controllerchange', () => {
    if (!wasControlled) return
    ready = 'claimed'
    takeIt()
  })

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      ready = 'waiting'
      takeIt()
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const check = () => {
        void reg.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) return
        check() // he just opened the app: ask whether there is anything newer
        takeIt() // and if one was already waiting, take it now, before he starts
      })
      window.addEventListener('focus', check)
      setInterval(check, CHECK_EVERY_MS)
    },
  })
}

/**
 * "Do not reload me yet." Returns the release, so it is one line in an effect:
 * `useEffect(() => holdFreshen(), [])`. A waiting build is taken the moment the
 * last hold lets go.
 */
export function holdFreshen(): () => void {
  holds++
  let released = false
  return () => {
    if (released) return
    released = true
    holds = Math.max(0, holds - 1)
    takeIt()
  }
}

function takeIt(): void {
  if (!ready || holds > 0) return
  const how = ready
  ready = null
  // Claimed: the new worker is already in charge, so there is nothing to ask
  // for — the page simply has to be the one it is serving.
  if (how === 'claimed' || !updateSW) {
    window.location.reload()
    return
  }
  void updateSW(true) // activates the waiting worker, then reloads
}
