// The URL is the open app. `/gym/train`, `/bank/chests`, `/home` for the
// Dashboard — so a page can be bookmarked, reloaded, or shared, and the phone's
// back button walks back through the apps you opened.
//
// No router library: the app's whole navigation state is already {app, tab}, so
// it maps onto two path segments and the History API does the rest. Firebase
// Hosting rewrites ** → /index.html (firebase.json), so a hard reload on a deep
// link serves the app rather than a 404.
import { appById, tabsFor } from '../apps/registry'
import { PARENT_ID } from '../store/storage'

/** Which app is open, and which of its bottom-menu tabs. `null` = Dashboard. */
export type OpenApp = { app: string; tab: string } | null

/** Where the app lands on open: the wheel, not the Dashboard. */
export const LANDING: OpenApp = { app: 'wheel', tab: 'spin' }

/** The Dashboard's own path — `/` lands on [LANDING] instead. */
const HOME_PATH = '/home'

export function routeToPath(open: OpenApp): string {
  return open ? `/${open.app}/${open.tab}` : HOME_PATH
}

/**
 * Read a path back into an open app, keeping only what this profile may see:
 * an unknown app, or the parent's app in the kid's hands, falls back to the
 * landing page rather than rendering a blank screen.
 *
 * Gated apps (the trip-mode clocks) are let through on purpose — the gate hides
 * an icon from the Dashboard, it isn't a lock.
 */
export function pathToRoute(pathname: string, profileId: string | null): OpenApp {
  const [appId, tabId] = pathname.split('/').filter(Boolean)
  if (!appId) return LANDING
  if (`/${appId}` === HOME_PATH) return null

  const app = appById(appId)
  if (!app || (app.adminOnly && profileId !== PARENT_ID)) return LANDING

  const tabs = tabsFor(app, profileId)
  return { app: app.id, tab: tabs.some((t) => t.id === tabId) ? tabId : tabs[0].id }
}

export function sameRoute(a: OpenApp, b: OpenApp): boolean {
  return a === null || b === null ? a === b : a.app === b.app && a.tab === b.tab
}
