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
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { app } from './lib/firebase'

// Public "Web Push certificate" from Firebase console → Project settings →
// Cloud Messaging → Web configuration. Safe to ship (it's the public half).
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY ?? ''
const FCM_SCOPE = '/firebase-cloud-messaging-push-scope'

export function pushSupported(): Promise<boolean> {
  return isSupported().catch(() => false)
}

/**
 * Requests permission and returns this device's FCM token, or throws a
 * user-readable error. iOS only allows this in a Home-Screen-installed PWA.
 */
export async function enablePush(): Promise<string> {
  if (!VAPID_KEY) throw new Error('Push isn’t configured yet (missing VITE_FCM_VAPID_KEY).')
  if (!(await isSupported())) throw new Error('This browser can’t do push notifications.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings.')
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: FCM_SCOPE })
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
  if (!token) throw new Error('Couldn’t get a device token. Try again.')
  return token
}
