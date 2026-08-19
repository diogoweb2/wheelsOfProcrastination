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
  /** Parent-only bottom menu; the same app looks different from the parent's side. */
  adminTabs?: AppTabDef[]
  adminOnly?: boolean
  /** Only on the home screen while this gate is open (see `Gates`). */
  gate?: keyof Gates
  /**
   * Home-screen folder this app lives in (see `FOLDERS`). The app still opens
   * and behaves exactly as it would on the top level — the folder is purely how
   * the Dashboard groups the icons, the way a phone does.
   */
  folder?: string
  /**
   * Off the home screen, but still routable at its own URL. The feature stays
   * built and reachable; it just isn't shown. See §1c.
   */
  hidden?: boolean
  /**
   * Take this (usually hidden) app's saved home-screen slot when the user's
   * order has never heard of us — how a replacement lands where the app it
   * replaced used to sit.
   */
  inheritSlotFrom?: string
}

/** A home-screen folder: one tile that opens onto the apps inside it. */
export interface FolderDef {
  id: string
  name: string
  icon: string
  tint: [string, string]
}

export const FOLDERS: FolderDef[] = [
  { id: 'games', name: 'Games', icon: '🎮', tint: ['#af6528', '#3a0000'] },
]

/** Conditions that make a situational app appear. */
export interface Gates {
  /** Trip mode / the Brazil money converter is switched on. */
  converter: boolean
}

export const APPS: AppDef[] = [
  {
    id: 'wheel',
    name: 'Tasks',
    icon: '📋',
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
    name: 'Quiz',
    icon: '🎓',
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
    name: 'Shop',
    icon: '🛒',
    img: '/app-store.webp',
    tint: ['#af6528', '#6b3a12'],
    tabs: [
      { id: 'walls', label: 'Wallpapers', icon: '🖼️' },
      { id: 'treasures', label: 'Treasures', icon: '🍇' },
      { id: 'orders', label: 'Orders', icon: '🧾' },
    ],
  },
  {
    // The One Piece Album: the same collecting game as the sticker album (§14),
    // over every card printed for the One Piece TCG. Its own app rather than a
    // tab on `album`, so each collection keeps its own progress and its own
    // swap table.
    id: 'binder',
    name: 'One Piece Album',
    inheritSlotFrom: 'album',
    icon: '🎴',
    tint: ['#c9302c', '#3a1a00'],
    tabs: [
      { id: 'binder', label: 'Binder', icon: '🎴' },
      { id: 'packs', label: 'Packs', icon: '🎁' },
      { id: 'trade', label: 'Trade', icon: '🤝' },
    ],
  },
  {
    // hidden for now: the One Piece Album took its place on the home screen.
    // The feature is untouched and still lives at /album/*.
    hidden: true,
    id: 'album',
    name: 'Stickers',
    icon: '🖼️',
    img: '/app-album.webp',
    tint: ['#60bff5', '#1d4f80'],
    tabs: [
      { id: 'album', label: 'Album', icon: '🖼️' },
      { id: 'packs', label: 'Packs', icon: '🎁' },
      { id: 'trade', label: 'Trade', icon: '🤝' },
    ],
  },
  {
    // the sticker album's cards, played as a TCG
    id: 'duel',
    name: 'Card Game',
    icon: '🃏',
    img: '/app-duel.webp',
    tint: ['#d70000', '#3a0000'],
    folder: 'games',
    tabs: [
      { id: 'fight', label: 'Play', icon: '⚔️' },
      { id: 'deck', label: 'Deck', icon: '🃏' },
      { id: 'rules', label: 'How to', icon: '📜' },
    ],
  },
  {
    // the REAL One Piece Card Game: the printed cards, the printed rules. Its
    // own app rather than a tab on `duel`, which is the sticker album's own
    // made-up TCG and stays exactly as it is.
    id: 'optcg',
    name: 'One Piece TCG',
    icon: '🏴‍☠️',
    tint: ['#c9302c', '#2b0b0b'],
    folder: 'games',
    tabs: [
      { id: 'play', label: 'Play', icon: '⚔️' },
      { id: 'learn', label: 'Learn', icon: '🎓' },
      { id: 'deck', label: 'Decks', icon: '🃏' },
      { id: 'rules', label: 'How to', icon: '📜' },
    ],
  },
  {
    // official chess, One Piece paint. Straw Hats vs Marines, head-to-head only.
    id: 'chess',
    name: 'Chess',
    icon: '♟️',
    tint: ['#8fb4dc', '#123252'],
    folder: 'games',
    tabs: [
      { id: 'play', label: 'Play', icon: '♟️' },
      { id: 'pieces', label: 'Pieces', icon: '👑' },
      { id: 'rules', label: 'How to', icon: '📜' },
    ],
  },
  {
    // Battleship, played on the Grand Line. The only game here with an AI —
    // hiding a fleet works on one phone in a way a chess board never does.
    id: 'seabattle',
    name: 'Sea Battle',
    icon: '🚢',
    tint: ['#2e63a4', '#0c2338'],
    folder: 'games',
    tabs: [
      { id: 'play', label: 'Play', icon: '🎯' },
      { id: 'fleet', label: 'Fleet', icon: '⛵' },
      { id: 'rules', label: 'How to', icon: '📜' },
    ],
  },
  {
    // official 8×8 English draughts — the checkers board everyone in Canada owns
    id: 'checkers',
    name: 'Checkers',
    icon: '🔴',
    tint: ['#ff9600', '#8c3d00'],
    folder: 'games',
    tabs: [
      { id: 'play', label: 'Play', icon: '🔴' },
      { id: 'pieces', label: 'Pieces', icon: '👑' },
      { id: 'rules', label: 'How to', icon: '📜' },
    ],
  },
  {
    // write an essay, get it marked up, fix it, get graded — the parent holds
    // the red pen and the AI does the reading
    id: 'essay',
    name: 'Essays',
    icon: '✍️',
    tint: ['#60bff5', '#123252'],
    tabs: [
      { id: 'write', label: 'Write', icon: '✍️' },
      // his own topic ideas: a tab of its own so it's reachable while an essay
      // is already in flight, which is exactly when the next idea turns up
      { id: 'ideas', label: 'Ideas', icon: '💡' },
      { id: 'words', label: 'Words', icon: '🔤' },
      { id: 'marked', label: 'Marked', icon: '📚' },
    ],
    adminTabs: [
      { id: 'desk', label: 'Desk', icon: '🖊️' },
      // marking by hand is a mode, not a corner of the desk: the text fills the
      // screen and every tap either writes a note or opens one
      { id: 'pen', label: 'Red pen', icon: '🖍️' },
      { id: 'topics', label: 'Topics', icon: '💡' },
      { id: 'words', label: 'Words', icon: '🔤' },
      { id: 'marked', label: 'Marked', icon: '📚' },
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
    name: 'Clocks',
    icon: '🕐',
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
    name: 'Parent',
    icon: '👨‍👦',
    img: '/app-admin.webp',
    tint: ['#d70000', '#5c0000'],
    adminOnly: true,
    tabs: [
      { id: 'freezes', label: 'Freezes', icon: '🧊' },
      { id: 'limits', label: 'Limits', icon: '⏳' },
      { id: 'academies', label: 'Quizzes', icon: '🎓' },
      { id: 'prizes', label: 'Prizes', icon: '🎁' },
      { id: 'audit', label: 'Audit', icon: '📜' },
    ],
  },
]

export function appById(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id)
}

/** The bottom menu this profile sees for an app (the parent gets their own version). */
export function tabsFor(app: AppDef, profileId: string | null): AppTabDef[] {
  return profileId === PARENT_ID && app.adminTabs ? app.adminTabs : app.tabs
}

/** Apps this profile may open right now, in the user's saved home-screen order. */
export function appsFor(profileId: string | null, order: string[] | undefined, gates: Gates): AppDef[] {
  const allowed = APPS.filter(
    (a) => !a.hidden && (!a.adminOnly || profileId === PARENT_ID) && (!a.gate || gates[a.gate]),
  )
  if (!order?.length) return allowed
  const rank = new Map(order.map((id, i) => [id, i]))
  // apps the saved order never heard of (newly shipped) land at the end, in
  // registry order — unless they inherit the slot of the app they replaced
  const rankOf = (a: AppDef) =>
    rank.get(a.id) ?? (a.inheritSlotFrom ? rank.get(a.inheritSlotFrom) : undefined) ?? 1000 + APPS.indexOf(a)
  return [...allowed].sort((a, b) => rankOf(a) - rankOf(b))
}

/**
 * One icon on the Dashboard: either an app, or a folder standing in for the
 * apps inside it. Folders exist because three games in a row of nine icons is
 * three games' worth of noise; grouping them is what a phone would do.
 */
export interface HomeTile {
  /** App id, or `folder:<id>` — this is what the saved home order stores. */
  id: string
  name: string
  icon: string
  img?: string
  tint: [string, string]
  /** Present only on a folder tile: the apps it opens onto, in registry order. */
  apps?: AppDef[]
}

/**
 * The Dashboard's icons for this profile, in their saved order.
 *
 * The saved order ([settings.homeOrder]) holds tile ids, which may be app ids
 * OR `folder:<id>`. A folder that has never been dragged has no entry of its
 * own, so it inherits the best slot any of its members had — which is what
 * keeps the Games folder sitting where the Davy Back icon used to sit for
 * everyone who already had a layout.
 */
export function homeTiles(profileId: string | null, order: string[] | undefined, gates: Gates): HomeTile[] {
  const apps = appsFor(profileId, order, gates)
  const rank = new Map((order ?? []).map((id, i) => [id, i]))
  const tiles: HomeTile[] = []
  const placed = new Set<string>()

  for (const app of apps) {
    const folder = app.folder ? FOLDERS.find((f) => f.id === app.folder) : undefined
    if (!folder) {
      tiles.push({ id: app.id, name: app.name, icon: app.icon, img: app.img, tint: app.tint })
      continue
    }
    if (placed.has(folder.id)) continue
    placed.add(folder.id)
    tiles.push({
      id: `folder:${folder.id}`,
      name: folder.name,
      icon: folder.icon,
      tint: folder.tint,
      apps: apps.filter((a) => a.folder === folder.id),
    })
  }

  if (!order?.length) return tiles
  // one rank scale for everything: a tile's own saved slot, else the earliest
  // slot any app inside it holds, else the end (a newly shipped tile)
  const rankOf = (t: HomeTile, i: number) => {
    const own = rank.get(t.id)
    if (own !== undefined) return own
    const inner = (t.apps ?? []).map((a) => rank.get(a.id)).filter((n): n is number => n !== undefined)
    return inner.length ? Math.min(...inner) : 1000 + i
  }
  return tiles.map((t, i) => ({ t, r: rankOf(t, i), i })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.t)
}
