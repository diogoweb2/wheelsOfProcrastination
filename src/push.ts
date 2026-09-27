// Web push (Firebase Cloud Messaging) — the crew's cross-device pings: Ben asks
// Dad for a free freeze, Dad grants one, a sticker trade lands. The in-app
// banners still work without this; FCM is what reaches a CLOSED app.
//
// enablePush() asks for notification permission and returns an FCM device
// token; the store saves it on the profile (data.pushTokens) so the Cloud
// Function can notify every device that profile has registered.
//
// The FCM service worker (public/firebase-messaging-sw.js) registers on its own
// scope so it coexists with the Workbox PWA service worker at '/'.
//
// Inside the Android shell (android/) none of that exists — a WebView has no
// service worker push and no Notification API — so the token comes from native
// FCM through window.WheelsShell instead. Everything downstream (the store, the
// profile's pushTokens, the Cloud Function) treats the two the same.
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { app } from './lib/firebase'

// Public "Web Push certificate" from Firebase console → Project settings →
// Cloud Messaging → Web configuration. Safe to ship (it's the public half).
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY ?? ''
const FCM_SCOPE = '/firebase-cloud-messaging-push-scope'

/** The Android shell's bridge (android/.../PushBridge.java), when we're in it. */
interface ShellBridge {
  isShell(): boolean
  pushToken(): string | null
  notificationsAllowed(): boolean
  requestPush(): void
}

declare global {
  interface Window {
    WheelsShell?: ShellBridge
    __wheelsShellPush?: (token: string | null, error: string | null) => void
  }
}

export function inShell(): ShellBridge | null {
  const bridge = typeof window === 'undefined' ? undefined : window.WheelsShell
  return bridge?.isShell?.() ? bridge : null
}

export async function pushSupported(): Promise<boolean> {
  if (inShell()) return true
  return isSupported().catch(() => false)
}

/**
 * Hands the request to the shell and waits for it to call back. Native asks
 * Android for permission if it needs to, so this can sit on a dialog for a
 * while; it gives up rather than leaving the Settings button spinning forever.
 */
function enableShellPush(bridge: ShellBridge): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      delete window.__wheelsShellPush
      reject(new Error('The app didn’t answer. Try again.'))
    }, 60_000)
    window.__wheelsShellPush = (token, error) => {
      window.clearTimeout(timer)
      delete window.__wheelsShellPush
      if (token) resolve(token)
      else reject(new Error(error ?? 'Could not turn on push notifications.'))
    }
    bridge.requestPush()
  })
}

/**
 * Requests permission and returns this device's FCM token, or throws a
 * user-readable error. iOS only allows this in a Home-Screen-installed PWA.
 */
export async function enablePush(): Promise<string> {
  const bridge = inShell()
  if (bridge) return enableShellPush(bridge)
  if (!VAPID_KEY) throw new Error('Push isn’t configured yet (missing VITE_FCM_VAPID_KEY).')
  if (!(await isSupported())) throw new Error('This browser can’t do push notifications.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings.')
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: FCM_SCOPE })
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
  if (!token) throw new Error('Couldn’t get a device token. Try again.')
  return token
}
