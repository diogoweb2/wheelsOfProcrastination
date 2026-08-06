// Chrome around every open app: a header that always offers the way back to the
// home screen, and the app's own bottom menu.
import type { ReactNode } from 'react'
import type { AppDef, AppTabDef } from '../apps/registry'
import { useStore } from '../store/useStore'
import { sfx } from '../audio'

export function AppHeader({ app, onHome }: { app: AppDef; onHome: () => void }) {
  const { data } = useStore()
  return (
    <div className="app-head">
      <button
        className="app-head-back"
        aria-label="Back to main"
        onClick={() => {
          sfx.click()
          onHome()
        }}
      >
        <span aria-hidden>⌂</span> Main
      </button>
      <div className="app-head-title">
        {app.img ? <img src={app.img} alt="" width={22} height={22} draggable={false} /> : <span>{app.icon}</span>}
        {app.name}
      </div>
      {/* Berries ride along in the header rather than in a row of their own —
          it's where earned coins fly to (logic/fx.ts targets .stat--gem). */}
      <div className="stat stat--gem app-head-berries" title="Berries">
        🪙 <span className="num">{data.economy.gems}</span>
      </div>
    </div>
  )
}

export function AppTabBar({
  tabs,
  tab,
  onTab,
  badges,
}: {
  tabs: AppTabDef[]
  tab: string
  onTab: (id: string) => void
  /** tab id → count shown as a red dot (0/undefined hides it) */
  badges?: Record<string, number>
}) {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={tab === t.id ? 'active' : ''}
          onClick={() => {
            sfx.click()
            onTab(t.id)
          }}
        >
          <span className="tab-icon">
            {t.icon}
            {!!badges?.[t.id] && <span className="tab-dot">{badges[t.id]}</span>}
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

/** Body wrapper so every app screen gets the same scroll padding. */
export function AppBody({ children }: { children: ReactNode }) {
  return <div className="screen">{children}</div>
}
