// The app roster. The Dashboard is a home screen of icons; each entry here is
// one "app" the user can open, and each app owns its own bottom menu.
//
// Adding a new app = one entry here + one branch in <AppRouter>. Everything else
// (home icon, drag ordering, bottom menu, back-to-main chrome) comes for free.
import { PARENT_ID } from '../store/storage'

export interface AppTabDef {
  id: string
  label: string
  icon: string // emoji — the bottom menu renders it directly
}

export interface AppDef {
  id: string
  name: string // shown under the home icon and in the app header
  icon: string // emoji fallback / badge
  img?: string // artwork in public/, preferred over the emoji when present
  /** Two CSS colors — the icon tile's gradient. */
  tint: [string, string]
  tabs: AppTabDef[]
  /** Parent-only bottom menu; the same app looks different from the captain's chair. */
  adminTabs?: AppTabDef[]
  adminOnly?: boolean
  /** Only on the home screen while this gate is open (see `Gates`). */
  gate?: keyof Gates
}

/** Conditions that make a situational app appear. */
export interface Gates {
  /** Trip mode / the Brazil money converter is switched on. */
  converter: boolean
}

export const APPS: AppDef[] = [
  {
    id: 'wheel',
    name: 'Wheel',
    icon: '🎡',
    img: '/app-wheel.webp',
    tint: ['#d70000', '#8c0000'],
    // the voyage pages (streak, map, record) live here: they're all about the
    // wheel's daily loop, so they belong in the same app
    tabs: [
      { id: 'spin', label: 'Spin', icon: '🎡' },
      { id: 'quests', label: 'Quests', icon: '📋' },
      { id: 'streak', label: 'Streak', icon: '🔥' },
      { id: 'map', label: 'Map', icon: '🗺️' },
      { id: 'record', label: 'Record', icon: '🏅' },
    ],
  },
  {
    id: 'academy',
    name: 'Academy',
    icon: '🏫',
    img: '/app-academy.webp',
    tint: ['#2e63a4', '#12315a'],
    tabs: [
      { id: 'topics', label: 'Topics', icon: '🏫' },
      { id: 'study', label: 'Study', icon: '📖' },
      { id: 'progress', label: 'Progress', icon: '📊' },
    ],
  },
  {
    id: 'bank',
    name: 'Bank',
    icon: '🏦',
    img: '/app-bank.webp',
    tint: ['#ffce00', '#c9820c'],
    tabs: [
      { id: 'chests', label: 'Chests', icon: '💰' },
      { id: 'grow', label: 'Grow', icon: '📈' },
      { id: 'tools', label: 'Tools', icon: '🧮' },
      { id: 'log', label: 'Log', icon: '🧾' },
    ],
    adminTabs: [
      { id: 'vault', label: 'Vault', icon: '💰' },
      { id: 'shock', label: 'Shock', icon: '📉' },
      { id: 'rules', label: 'Rules', icon: '⚙️' },
      { id: 'ledger', label: 'Ledger', icon: '🧾' },
    ],
  },
  {
    id: 'store',
    name: 'Store',
    icon: '🪙',
    img: '/app-store.webp',
    tint: ['#af6528', '#6b3a12'],
    tabs: [
      { id: 'walls', label: 'Wallpapers', icon: '🖼️' },
      { id: 'treasures', label: 'Treasures', icon: '🍇' },
      { id: 'orders', label: 'Orders', icon: '🧾' },
    ],
  },
  {
    id: 'album',
    name: 'Log Book',
    icon: '📖',
    img: '/app-album.webp',
    tint: ['#60bff5', '#1d4f80'],
    tabs: [
      { id: 'album', label: 'Album', icon: '📖' },
      { id: 'packs', label: 'Packs', icon: '🎁' },
      { id: 'trade', label: 'Trade', icon: '🤝' },
    ],
  },
  {
    // the album's cards, played as a TCG — lives next to the Log Book on purpose
    id: 'duel',
    name: 'Davy Back',
    icon: '⚔️',
    img: '/app-duel.webp',
    tint: ['#d70000', '#3a0000'],
    tabs: [
      { id: 'fight', label: 'Fight', icon: '⚔️' },
      { id: 'deck', label: 'Crew', icon: '🃏' },
      { id: 'rules', label: 'How to', icon: '📜' },
    ],
  },
  {
    id: 'gym',
    name: 'Gym',
    icon: '💪',
    tint: ['#ff9600', '#8c3d00'],
    tabs: [
      { id: 'train', label: 'Train', icon: '💪' },
      { id: 'stats', label: 'Stats', icon: '📊' },
      { id: 'gear', label: 'Gear', icon: '🏋️' },
      { id: 'coach', label: 'Coach', icon: '🧠' },
    ],
  },
  {
    id: 'ideas',
    name: 'Ideas',
    icon: '💡',
    tint: ['#ffce00', '#af6528'],
    tabs: [
      { id: 'open', label: 'Open', icon: '💡' },
      { id: 'done', label: 'Done', icon: '✅' },
      { id: 'new', label: 'New', icon: '➕' },
    ],
  },
  {
    // travel-only: it appears while trip mode (the Brazil money converter) is on
    id: 'logpose',
    name: 'Log Pose',
    icon: '🧭',
    tint: ['#60bff5', '#2e63a4'],
    gate: 'converter',
    tabs: [{ id: 'clocks', label: 'Clocks', icon: '🕐' }],
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: '⚙️',
    tint: ['#2e63a4', '#0c2338'],
    tabs: [
      { id: 'profile', label: 'Profile', icon: '👤' },
      { id: 'alerts', label: 'Alerts', icon: '🔔' },
      { id: 'sound', label: 'Sound', icon: '🔊' },
      { id: 'about', label: 'About', icon: 'ℹ️' },
    ],
  },
  {
    id: 'admin',
    name: 'Captain',
    icon: '🛠️',
    img: '/app-admin.webp',
    tint: ['#d70000', '#5c0000'],
    adminOnly: true,
    tabs: [
      { id: 'freezes', label: 'Freezes', icon: '🧊' },
      { id: 'academies', label: 'Academies', icon: '🏫' },
      { id: 'prizes', label: 'Prizes', icon: '🎁' },
      { id: 'audit', label: 'Audit', icon: '📜' },
    ],
  },
]

export function appById(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id)
}

/** The bottom menu this profile sees for an app (admins get the captain's version). */
export function tabsFor(app: AppDef, profileId: string | null): AppTabDef[] {
  return profileId === PARENT_ID && app.adminTabs ? app.adminTabs : app.tabs
}

/** Apps this profile may open right now, in the user's saved home-screen order. */
export function appsFor(profileId: string | null, order: string[] | undefined, gates: Gates): AppDef[] {
  const allowed = APPS.filter(
    (a) => (!a.adminOnly || profileId === PARENT_ID) && (!a.gate || gates[a.gate]),
  )
  if (!order?.length) return allowed
  const rank = new Map(order.map((id, i) => [id, i]))
  // apps the saved order never heard of (newly shipped) land at the end, in registry order
  return [...allowed].sort(
    (a, b) => (rank.get(a.id) ?? 1000 + APPS.indexOf(a)) - (rank.get(b.id) ?? 1000 + APPS.indexOf(b)),
  )
}
