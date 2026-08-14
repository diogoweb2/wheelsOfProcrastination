import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore'
import { PARENT_ID, KID_ID } from './store/storage'
import { PinLock } from './components/PinLock'
import { EventModal } from './components/EventModal'
import { StreakPrompts } from './components/StreakPrompts'
import { RequiredDeadline } from './components/RequiredDeadline'
import { QuestionOfTheDay } from './components/QuestionOfTheDay'
import { FinalTest } from './components/FinalTest'
import { AppHeader, AppTabBar } from './components/AppShell'
import { AdminSection } from './components/AdminSection'
import { HomeScreen } from './screens/HomeScreen'
import { SpinScreen } from './screens/SpinScreen'
import { StoreScreen } from './screens/StoreScreen'
import { AlbumScreen } from './screens/AlbumScreen'
import { DuelScreen } from './screens/DuelScreen'
import { BoardGameScreen } from './screens/BoardGameScreen'
import { TasksScreen } from './screens/TasksScreen'
import { QuizScreen } from './screens/QuizScreen'
import { BankScreen } from './screens/BankScreen'
import { VoyageScreen } from './screens/VoyageScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { IdeasScreen } from './screens/IdeasScreen'
import { GymScreen } from './screens/GymScreen'
import { EssayScreen } from './screens/EssayScreen'
import { LogPoseScreen } from './screens/LogPoseScreen'
import { appById, tabsFor } from './apps/registry'
import { scheduleDailyReminder } from './notifications'
import { backgroundUrl } from './logic/backgrounds'
import { sfx } from './audio'

/** Which app is open, and which of its bottom-menu tabs. `null` = home screen. */
type OpenApp = { app: string; tab: string } | null

/** Where the app lands on open: the wheel, not the dashboard. The dashboard is
    one tap away behind the header's "Apps" button. */
const LANDING: OpenApp = { app: 'wheel', tab: 'spin' }

export default function App() {
  const { data, activeProfileId, ready, cloudError, saveError, dismissSaveError, rollover, kidData, markGiftCardPaid, ackBankPayback, market, trades, duels, settleDuels, boardGames, settleBoardGames, freezeRequests, refreshDailyQuiz, dataLoaded, quizBankLoaded, registerPushDevice, essays } = useStore()
  const [open, setOpen] = useState<OpenApp>(LANDING)
  // topic a quiz quest card asked to jump into; consumed by the Quiz app on arrival
  const [trainTopic, setTrainTopic] = useState<string | null>(null)
  const unlocked = activeProfileId !== null

  /** Open an app (optionally on a given tab), falling back to its first tab. */
  function openApp(appId: string, tabId?: string) {
    const app = appById(appId)
    if (!app) return
    const tabs = tabsFor(app, activeProfileId)
    setOpen({ app: appId, tab: tabId && tabs.some((t) => t.id === tabId) ? tabId : tabs[0].id })
  }

  // switching crewmate drops you back on the landing page — the roster differs
  useEffect(() => {
    setOpen(LANDING)
  }, [activeProfileId])

  // process missed days on open and whenever the app regains focus (day may have flipped)
  useEffect(() => {
    rollover()
    const onVis = () => document.visibilityState === 'visible' && rollover()
    document.addEventListener('visibilitychange', onVis)
    const interval = window.setInterval(rollover, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // set up (or catch up) today's Question of the Day once data + question bank are loaded
  useEffect(() => {
    refreshDailyQuiz()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded, quizBankLoaded, data.quiz.daily?.day])

  // Ask for push on open, once we're past the PIN. 'default' means we've never
  // asked, so this is the browser prompt; 'granted' just refreshes the device
  // token (FCM rotates them) — registerPushDevice ignores one it already has.
  // 'denied' is left alone: the browser won't re-prompt, and Settings → Alerts
  // still has the manual button.
  const askedPush = useRef(false)
  useEffect(() => {
    if (!unlocked || askedPush.current) return
    if (!('Notification' in window) || Notification.permission === 'denied') return
    askedPush.current = true
    void registerPushDevice() // errors surface on the Settings screen's button instead
  }, [unlocked, registerPushDevice])

  useEffect(() => {
    if (unlocked && 'Notification' in window && Notification.permission === 'granted') {
      void scheduleDailyReminder(data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, data.settings.reminderHour, data.completions.length])

  // best-effort local ping when a new payback from Ben lands while Diogo's app is open
  const paybackCount =
    activeProfileId === PARENT_ID ? (kidData?.bank.txns.filter((t) => t.type === 'payback' && !t.ackAt).length ?? 0) : 0
  const prevPaybacks = useRef(paybackCount)
  useEffect(() => {
    if (paybackCount > prevPaybacks.current && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('📨 Ben paid you back!', { body: 'Open the Bank app to see it and tap “Got it”.' })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevPaybacks.current = paybackCount
  }, [paybackCount])

  // Duels: a finished board pays out and goes into the W/L record. Both phones
  // run this off the same shared doc and each one only banks its own side, so it
  // lands even if the loser never reopened the arena.
  useEffect(() => {
    settleDuels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duels, dataLoaded])

  // Chess/Checkers settle exactly like duels: both phones bank their own side
  // off the same finished board, so a result lands even if the loser never
  // reopened the game.
  useEffect(() => {
    settleBoardGames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardGames, dataLoaded])

  const boardCall = boardGames.find((m) => m.status === 'pending' && m.toId === activeProfileId)
  const myBoard = boardGames.find(
    (m) =>
      m.status === 'active' &&
      m.state &&
      !m.state.over &&
      (m.state.turn === 'w' ? m.fromId : m.toId) === activeProfileId,
  )

  const duelCall = duels.find((d) => d.status === 'pending' && d.toId === activeProfileId)
  const myDuel = duels.find(
    (d) => d.status === 'active' && d.state && !d.state.over && d.state.sides[d.state.turn]?.profileId === activeProfileId,
  )

  // Ping when the snail rings: a challenge, or the other captain handing the turn
  // back. Keyed on the turn number so every move gets its own ping — but only
  // while the app is in the background, since an open arena already shows it.
  const prevCall = useRef<string | null>(null)
  const duelPing = duelCall ? `call:${duelCall.id}` : myDuel ? `turn:${myDuel.id}:${myDuel.state?.turnNo}` : null
  useEffect(() => {
    if (
      duelPing &&
      duelPing !== prevCall.current &&
      document.visibilityState === 'hidden' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(duelCall ? '🃏 A card-game challenge!' : '🃏 Your move!', {
          body: duelCall ? `${duelCall.fromName} is calling you out.` : 'The card game is waiting on you.',
        })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevCall.current = duelPing
  }, [duelPing]) // eslint-disable-line react-hooks/exhaustive-deps

  // The same snail for the board games: a challenge, or the other captain
  // handing the turn back. Keyed on the position number so every move pings —
  // and only while the app is in the background, since an open board shows it.
  const prevBoard = useRef<string | null>(null)
  const boardPing = boardCall
    ? `call:${boardCall.id}`
    : myBoard
      ? `turn:${myBoard.id}:${myBoard.state?.seq}`
      : null
  useEffect(() => {
    if (
      boardPing &&
      boardPing !== prevBoard.current &&
      document.visibilityState === 'hidden' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const game = (boardCall ?? myBoard)!.kind === 'chess' ? 'Chess' : 'Checkers'
      try {
        new Notification(boardCall ? `♟️ A ${game} challenge!` : `♟️ Your move in ${game}!`, {
          body: boardCall ? `${boardCall.fromName} wants a game.` : 'The other captain is waiting on you.',
        })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevBoard.current = boardPing
  }, [boardPing]) // eslint-disable-line react-hooks/exhaustive-deps

  // ping when a sticker swap offer lands while the app is open
  const openTrades = trades.filter((t) => t.status === 'pending' && t.toId === activeProfileId)
  const prevTrades = useRef(openTrades.length)
  useEffect(() => {
    if (openTrades.length > prevTrades.current && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🤝 A trade offer!', { body: 'Someone wants to swap stickers. Open the Stickers app.' })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevTrades.current = openTrades.length
  }, [openTrades.length])

  // Essays: the parent hears about a submission, the writer hears about the
  // notes coming back. Both sides of the same loop, one effect each way.
  const essaysToMark = activeProfileId === PARENT_ID ? essays.filter((e) => e.status === 'submitted') : []
  const prevToMark = useRef(essaysToMark.length)
  useEffect(() => {
    if (essaysToMark.length > prevToMark.current && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('✍️ An essay landed on your desk!', { body: 'Open the Essays app to mark it up.' })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevToMark.current = essaysToMark.length
  }, [essaysToMark.length])

  const essaysToFix = essays.filter((e) => e.authorId === activeProfileId && e.status === 'returned')
  const prevToFix = useRef(essaysToFix.length)
  useEffect(() => {
    if (essaysToFix.length > prevToFix.current && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🔍 Your essay came back!', { body: 'Phase 2: see what’s circled and fix it.' })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevToFix.current = essaysToFix.length
  }, [essaysToFix.length])

  // ping Diogo when Ben asks for a free freeze (his streak is usually on the line)
  const freezeAsks =
    activeProfileId === PARENT_ID ? freezeRequests.filter((r) => r.status === 'pending' && r.fromId === KID_ID) : []
  const prevAsks = useRef(freezeAsks.length)
  useEffect(() => {
    if (freezeAsks.length > prevAsks.current && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🆘 Ben needs a Streak Freeze!', {
          body: 'His streak is on the line. Open the Parent app to send one.',
        })
      } catch {
        /* notifications unavailable; the in-app banner still shows */
      }
    }
    prevAsks.current = freezeAsks.length
  }, [freezeAsks.length])

  if (cloudError) {
    return (
      <div className="app" style={{ justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 48 }}>🌊🚫</div>
          <h1 className="h1" style={{ marginTop: 8 }}>Can’t reach the crew’s log</h1>
          <p className="muted" style={{ maxWidth: 320, margin: '8px auto' }}>
            Couldn’t connect to Firebase. Check your connection — and that the Firebase config, Firestore, and
            Anonymous sign-in are set up.
          </p>
          <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>{cloudError}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="app" style={{ justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <img src="/luffy-spinning.gif" alt="" className="float" style={{ width: 120, height: 120, objectFit: 'contain' }} />
          <p className="muted" style={{ marginTop: 12 }}>Hoisting the sails…</p>
        </div>
      </div>
    )
  }

  if (!unlocked) return <PinLock />

  // whichever background the user equipped in the Store; none = plain solid color
  const bg = data.backgrounds.active

  // admin-only: Ben's Interac-style paybacks waiting for a "Got it"
  const pendingPaybacks =
    activeProfileId === PARENT_ID ? (kidData?.bank.txns.filter((t) => t.type === 'payback' && !t.ackAt) ?? []) : []

  // admin-only persistent warning: unsettled prize purchases (Ben's and Diogo's own)
  const unpaidGifts =
    activeProfileId === PARENT_ID
      ? [
          ...(kidData?.giftcards.filter((p) => !p.paidAt).map((p) => ({ who: 'Ben', targetId: KID_ID, p })) ?? []),
          ...data.giftcards.filter((p) => !p.paidAt).map((p) => ({ who: 'You', targetId: PARENT_ID, p })),
        ]
      : []

  // red dots on the home screen icons — the reason to open an app right now
  const boardWaiting = (kind: 'chess' | 'checkers') =>
    (boardCall?.kind === kind ? 1 : 0) + (myBoard?.kind === kind ? 1 : 0)

  const homeBadges: Record<string, number> = {
    album: openTrades.length,
    duel: (duelCall ? 1 : 0) + (myDuel ? 1 : 0),
    chess: boardWaiting('chess'),
    checkers: boardWaiting('checkers'),
    admin: freezeAsks.length + unpaidGifts.length,
    bank: pendingPaybacks.length,
    essay: essaysToMark.length + essaysToFix.length,
  }

  const openDef = open ? appById(open.app) : undefined
  const openTabs = openDef ? tabsFor(openDef, activeProfileId) : []

  return (
    <div
      className="app"
      style={
        bg
          ? {
              background: `linear-gradient(rgb(12 35 56 / 35%), rgb(12 35 56 / 50%)), url(${backgroundUrl(bg)}) center / 420px repeat fixed var(--bg)`,
            }
          : undefined
      }
    >
      {/* A background write was rejected: the change is only in memory and will be
          lost on refresh. Silent failures here previously ate newly-added tasks. */}
      {saveError && (
        <div
          role="alert"
          onClick={dismissSaveError}
          style={{
            background: '#b3261e', color: '#fff', padding: '8px 12px', fontSize: 12,
            cursor: 'pointer', textAlign: 'center', lineHeight: 1.35,
          }}
        >
          <strong>Not saved to the cloud.</strong> Your last change is only on this device and will
          be lost if you refresh. {saveError} <em>(tap to dismiss)</em>
        </div>
      )}

      {/* Inside an app: the always-there way back to the home screen. The currency
          stats used to live up here on every screen; they're widgets on the
          Dashboard now, which buys back the vertical space. */}
      {openDef && (
        <div className="chrome">
          <AppHeader app={openDef} onHome={() => setOpen(null)} />
        </div>
      )}

      {activeProfileId === PARENT_ID && market?.status === 'failed' && (
        <div className="banner" style={{ background: 'var(--red)' }}>
          <span style={{ fontSize: 20 }}>📉</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>Market feed update failed</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              last try {market.lastAttemptDay ?? '—'} · retries daily · sim uses fallback rates meanwhile
            </div>
          </div>
        </div>
      )}

      {/* remote final tests: Ben's "start it" prompt, Dad's verdict banner */}
      <FinalTest />

      {freezeAsks.map((r) => (
        <div className="banner" key={r.id} style={{ background: 'var(--red)' }}>
          <span style={{ fontSize: 20 }}>🆘</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{r.fromName} needs a Streak Freeze!</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {r.reason ? `“${r.reason}”` : 'tap to send him one for free'}
            </div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.click(); openApp('admin', 'freezes') }}>
            Help him
          </button>
        </div>
      ))}

      {(duelCall || myDuel) && (
        <div className="banner" style={{ background: 'var(--red)' }}>
          <span style={{ fontSize: 20 }}>⚔️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>
              {duelCall ? `${duelCall.fromName} calls you out!` : 'Your move in the duel!'}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {duelCall ? 'Card game — winner takes the Berries' : 'The other captain is waiting on you'}
            </div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.click(); openApp('duel', 'fight') }}>
            {duelCall ? 'Answer' : 'Play'}
          </button>
        </div>
      )}

      {(boardCall || myBoard) && (
        <div className="banner" style={{ background: 'var(--red)' }}>
          <span style={{ fontSize: 20 }}>{(boardCall ?? myBoard)!.kind === 'chess' ? '♟️' : '🔴'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>
              {boardCall
                ? `${boardCall.fromName} wants a game of ${boardCall.kind === 'chess' ? 'Chess' : 'Checkers'}!`
                : `Your move in ${myBoard!.kind === 'chess' ? 'Chess' : 'Checkers'}!`}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {boardCall ? 'Winner takes the Berries' : 'The other captain is waiting on you'}
            </div>
          </div>
          <button
            className="btn btn--small"
            onClick={() => {
              sfx.click()
              openApp((boardCall ?? myBoard)!.kind, 'play')
            }}
          >
            {boardCall ? 'Answer' : 'Play'}
          </button>
        </div>
      )}

      {essaysToMark.map((e) => (
        <div className="banner" key={e.id}>
          <span style={{ fontSize: 20 }}>✍️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{e.authorName} handed in “{e.title || e.topicTitle}”</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>round {e.round} · waiting for your red pen</div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.click(); openApp('essay', 'desk') }}>
            Review
          </button>
        </div>
      ))}

      {essaysToFix.map((e) => (
        <div className="banner" key={e.id}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>Your essay came back!</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>“{e.title}” · fix what’s circled, then send it again</div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.click(); openApp('essay', 'write') }}>
            Fix it
          </button>
        </div>
      ))}

      {openTrades.map((t) => (
        <div className="banner" key={t.id} style={{ background: 'var(--red)' }}>
          <span style={{ fontSize: 20 }}>🤝</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{t.fromName} wants to trade stickers!</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {t.give.length} for {t.want.length} · tap to see the deal
            </div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.click(); openApp('album', 'trade') }}>
            See it
          </button>
        </div>
      ))}

      {pendingPaybacks.map((t) => (
        <div className="banner" key={t.id}>
          <span style={{ fontSize: 20 }}>📨</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>Ben paid you ${t.amount.toFixed(2)}{t.note ? ` — ${t.note}` : ''}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>sent {t.day} · straight from his Pocket Chest</div>
          </div>
          <button
            className="btn btn--small"
            onClick={() => {
              sfx.gem()
              ackBankPayback(t.id)
            }}
          >
            ✓ Got it
          </button>
        </div>
      ))}

      {unpaidGifts.map(({ who, targetId, p }) => (
        <div className="banner" key={p.id}>
          <span style={{ fontSize: 20 }}>🎁</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{who === 'You' ? 'You bought' : `${who} bought`}: {p.label}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>ordered {p.day} · get the real prize, then tap Paid</div>
          </div>
          <button
            className="btn btn--small"
            onClick={() => {
              sfx.gem()
              markGiftCardPaid(targetId, p.id)
            }}
          >
            ✓ Paid
          </button>
        </div>
      ))}

      {open === null ? (
        <HomeScreen onOpen={openApp} badges={homeBadges} />
      ) : (
        <AppBodyRouter
          open={open}
          trainTopic={trainTopic}
          onTrainOpened={() => setTrainTopic(null)}
          goTrain={(topicId) => {
            setTrainTopic(topicId)
            openApp('academy', 'topics')
          }}
          goSpin={() => openApp('wheel', 'spin')}
          setTab={(tab) => setOpen({ app: open.app, tab })}
        />
      )}

      {openDef && openTabs.length > 1 && (
        <AppTabBar
          tabs={openTabs}
          tab={open!.tab}
          onTab={(tab) => setOpen({ app: open!.app, tab })}
          badges={openDef.id === 'album' ? { trade: openTrades.length } : undefined}
        />
      )}

      <QuestionOfTheDay />
      <EventModal />
      <StreakPrompts />
      {/* mandatory decision — rendered last so it sits above the other prompts */}
      <RequiredDeadline />
    </div>
  )
}

/** Maps the open app + tab onto the screen that renders it. */
function AppBodyRouter({
  open,
  trainTopic,
  onTrainOpened,
  goTrain,
  goSpin,
  setTab,
}: {
  open: { app: string; tab: string }
  trainTopic: string | null
  onTrainOpened: () => void
  goTrain: (topicId: string) => void
  goSpin: () => void
  setTab: (tab: string) => void
}) {
  switch (open.app) {
    case 'wheel':
      if (open.tab === 'quests') return <TasksScreen goSpin={goSpin} />
      // streak/map/record are the voyage pages — same daily loop, same app
      if (open.tab === 'streak' || open.tab === 'map' || open.tab === 'record') {
        return <VoyageScreen tab={open.tab} goSpin={goSpin} />
      }
      return <SpinScreen goTrain={goTrain} />
    case 'academy':
      return <QuizScreen tab={open.tab} trainTopicId={trainTopic} onTrainOpened={onTrainOpened} />
    case 'bank':
      return <BankScreen tab={open.tab} />
    case 'store':
      return <StoreScreen tab={open.tab} />
    case 'album':
      return <AlbumScreen tab={open.tab} />
    case 'duel':
      return <DuelScreen tab={open.tab} />
    case 'chess':
      return <BoardGameScreen kind="chess" tab={open.tab} />
    case 'checkers':
      return <BoardGameScreen kind="checkers" tab={open.tab} />
    case 'gym':
      return <GymScreen tab={open.tab} />
    case 'essay':
      return <EssayScreen tab={open.tab} />
    case 'ideas':
      return <IdeasScreen tab={open.tab} onDone={() => setTab('open')} />
    case 'logpose':
      return <LogPoseScreen />
    case 'settings':
      return <SettingsScreen tab={open.tab} />
    case 'admin':
      return <div className="screen"><AdminSection tab={open.tab} /></div>
    default:
      return null
  }
}
