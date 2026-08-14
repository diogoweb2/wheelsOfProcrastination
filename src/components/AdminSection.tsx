// The Captain's desk — Diogo's admin app.
// Manage BOTH academies (Ben's and his own): locks, bonus 🍇, question
// curation, AI-question review, Ben's official final tests, and settling
// prize purchases ("Paid").
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { KID_ID, PARENT_ID } from '../store/storage'
import type { AppData, AuditCategory, QuizQuestion } from '../types'
import { activeQuestions, correctAnswerText, lastOfficialAttempt, topicsFor, type QuizTopic } from '../logic/quiz'
import { SOLO_PLAY_LIMIT_DEFAULT } from '../logic/cardGame'
import { QuizSession } from './QuizSession'
import { dayKey } from '../logic/dates'
import { sfx } from '../audio'

export function AdminSection({ tab = 'freezes' }: { tab?: string } = {}) {
  const { data, kidData, quizBank } = useStore()
  const [session, setSession] = useState<{ kind: 'ben-official' | 'ben-preview'; topicId: string } | null>(null)
  const [managing, setManaging] = useState<string | null>(null)

  const pending = quizBank.filter((q) => q.status === 'pending')

  if (session && kidData) {
    return (
      <QuizSession
        mode={session.kind === 'ben-official' ? 'official' : 'training'}
        preview={session.kind === 'ben-preview'}
        topicId={session.topicId}
        targetId={KID_ID}
        stats={kidData.quiz.stats}
        onClose={() => setSession(null)}
      />
    )
  }
  if (managing) {
    return <QuestionManager topicId={managing} onClose={() => setManaging(null)} />
  }

  return (
    <>
      <div className="h2">🛠️ Captain’s desk</div>

      {tab === 'freezes' && <FreezeDesk />}

      {tab === 'limits' && <ScreenLimits />}

      {tab === 'audit' && <AuditLog />}

      {tab === 'prizes' && (
        <>
          <PendingPrizes />
          {pending.length > 0 && <PendingReview pending={pending} />}
        </>
      )}

      {tab === 'academies' && (
        <>
          <div className="muted" style={{ fontSize: 12, margin: '10px 0 6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
            ⚔️ Ben’s academy
          </div>
          {!kidData && <p className="muted">Loading Ben’s log from the cloud…</p>}
          {topicsFor(KID_ID).map((t) => (
            <AdminTopicCard
              key={t.id}
              topic={t}
              targetId={KID_ID}
              targetData={kidData}
              onTest={() => setSession({ kind: 'ben-official', topicId: t.id })}
              onPreview={() => setSession({ kind: 'ben-preview', topicId: t.id })}
              onManage={() => setManaging(t.id)}
            />
          ))}

          <div className="muted" style={{ fontSize: 12, margin: '14px 0 6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
            🏴‍☠️ My academy
          </div>
          {topicsFor(PARENT_ID).map((t) => (
            <AdminTopicCard
              key={t.id}
              topic={t}
              targetId={PARENT_ID}
              targetData={data}
              onManage={() => setManaging(t.id)}
            />
          ))}
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Your own official final tests run from the Quiz app. <b>npm run quiz:regen</b> refills removed questions;{' '}
            <b>npm run quiz:review</b> (weekly, sonnet) refreshes your AI topics — updated questions show a ✨ NEW badge.
          </p>
        </>
      )}
    </>
  )
}

/**
 * How much of the card game each crewmate may play against the AI in a day.
 * Set per crewmate, because Ben and Diogo don't need the same leash. Live duels
 * between the two of them are deliberately NOT capped — those are the social
 * ones, and they cost the other person's time to start.
 */
function ScreenLimits() {
  const { data, kidData, kidDataFresh, setSettings, setSettingsFor } = useStore()
  const rows: { who: string; targetId: string; world: AppData | null; ready: boolean }[] = [
    { who: '⚔️ Ben', targetId: KID_ID, world: kidData, ready: !!kidData && kidDataFresh },
    { who: '🏴‍☠️ Me', targetId: PARENT_ID, world: data, ready: true },
  ]

  function setCap(targetId: string, next: number) {
    sfx.click()
    const capped = Math.max(0, Math.min(20, next))
    if (targetId === PARENT_ID) setSettings({ soloDuelLimit: capped })
    else setSettingsFor(targetId, { soloDuelLimit: capped })
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 4 }}>🃏 Card game vs the AI</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Training-hall matches allowed per day, each. A match counts when it starts, win, lose or quit — so backing out
        isn’t a free retry. Set 0 to shut the hall. Live duels between you two stay unlimited.
      </p>
      {rows.map(({ who, targetId, world, ready }) => {
        const cap = world?.settings.soloDuelLimit ?? SOLO_PLAY_LIMIT_DEFAULT
        const usedToday = world && world.duel.soloDay === dayKey() ? world.duel.soloPlays : 0
        return (
          <div
            key={targetId}
            style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--line)', padding: '10px 0' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{who}</div>
              <div className="muted" style={{ fontSize: 11 }}>
                {!ready ? 'loading from the cloud…' : `played ${usedToday} today · ${Math.max(0, cap - usedToday)} left`}
              </div>
            </div>
            <button className="btn btn--ghost btn--small" disabled={!ready || cap <= 0} onClick={() => setCap(targetId, cap - 1)}>
              −
            </button>
            <b style={{ minWidth: 26, textAlign: 'center', fontSize: 16 }}>{cap}</b>
            <button className="btn btn--ghost btn--small" disabled={!ready || cap >= 20} onClick={() => setCap(targetId, cap + 1)}>
              +
            </button>
            <button
              className="btn btn--small"
              disabled={!ready || cap === SOLO_PLAY_LIMIT_DEFAULT}
              title={`Back to the default ${SOLO_PLAY_LIMIT_DEFAULT} a day`}
              onClick={() => setCap(targetId, SOLO_PLAY_LIMIT_DEFAULT)}
            >
              ↩︎ {SOLO_PLAY_LIMIT_DEFAULT}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Unpaid purchases from both crewmates, each with a "Paid" settle button. */
/**
 * Free Streak Freezes for Ben. Shows his pending asks (with his reason) and an
 * always-open form so Diogo can gift one unprompted — e.g. he already knows Ben
 * was away on a trip. Granting also revives a streak that already sank.
 */
function FreezeDesk() {
  const { kidData, freezeRequests, grantFreeze, declineFreezeRequest } = useStore()
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(1)
  const [open, setOpen] = useState(false)

  const asks = freezeRequests.filter((r) => r.status === 'pending' && r.fromId === KID_ID)
  const dead = kidData?.streak.deadStreak
  const stock = kidData?.economy.freezes ?? 0

  function send(requestId?: string) {
    sfx.gem()
    grantFreeze(count, message || 'Dad’s got your back. Go get ’em! 👒', requestId)
    setMessage('')
    setCount(1)
    setOpen(false)
  }

  const showForm = open || asks.length > 0
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: asks.length > 0 ? 'var(--red)' : undefined }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>
        🧊 Free freezes for Ben {asks.length > 0 && <span style={{ color: 'var(--red)' }}>· {asks.length} asking!</span>}
      </div>

      {asks.map((r) => (
        <div key={r.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>🆘 {r.fromName} is asking for a freeze</div>
          {r.reason && <div className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>“{r.reason}”</div>}
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            asked {new Date(r.createdAt).toLocaleString()}
          </div>
          <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => { sfx.click(); declineFreezeRequest(r.id) }}>
            ✕ Not this time {dead ? '(resets his streak to 0)' : ''}
          </button>
        </div>
      ))}

      <div className="muted" style={{ fontSize: 12, borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 4 }}>
        Ben has 🧊{stock} stocked
        {dead
          ? ` · his ${dead.value}-day streak is ON HOLD while he waits — granting revives it free, declining zeroes it`
          : ' · streak is alive'}
      </div>

      {!showForm ? (
        <button className="btn btn--small" style={{ marginTop: 8 }} onClick={() => { sfx.click(); setOpen(true) }}>
          🎁 Give Ben a free freeze
        </button>
      ) : (
        <>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Message for Ben</label>
            <input
              type="text"
              value={message}
              maxLength={160}
              placeholder="Trips don’t break streaks. Proud of you!"
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>How many</span>
            <button className="btn btn--ghost btn--small" onClick={() => setCount((c) => Math.max(1, c - 1))}>−</button>
            <b style={{ minWidth: 18, textAlign: 'center' }}>{count}</b>
            <button className="btn btn--ghost btn--small" onClick={() => setCount((c) => Math.min(9, c + 1))}>+</button>
            <button
              className="btn btn--small"
              style={{ marginLeft: 'auto' }}
              disabled={!kidData}
              onClick={() => send(asks[0]?.id)}
            >
              🧊 Send {count} free
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// The audit trail: an append-only log of every change to a crewmate's album,
// money (Berries + real bank $), Devil Fruits, and task roster. Rows self-delete
// after ~7 days (Firestore TTL), so this is a "what changed recently" window,
// not a full history — enough to catch a bad write (e.g. an AI update).
const AUDIT_META: Record<AuditCategory, { icon: string; label: string }> = {
  gems: { icon: '🪙', label: 'Berries' },
  devilFruits: { icon: '🍇', label: 'Devil Fruits' },
  freezes: { icon: '🧊', label: 'Freezes' },
  bank: { icon: '💵', label: 'Bank $' },
  album: { icon: '🃏', label: 'Album' },
  tasks: { icon: '📋', label: 'Tasks' },
}
const AUDIT_FILTERS: (AuditCategory | 'all')[] = ['all', 'album', 'bank', 'gems', 'devilFruits', 'tasks']

function AuditLog() {
  const { audit, profiles } = useStore()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<AuditCategory | 'all'>('all')

  const nameFor = (id: string) => profiles.find((p) => p.id === id)?.name ?? id
  const rows = filter === 'all' ? audit : audit.filter((r) => r.category === filter)

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <button
        className="btn btn--ghost btn--small"
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => { sfx.click(); setOpen((o) => !o) }}
      >
        <span style={{ fontWeight: 900 }}>🕵️ Audit log</span>
        <span className="muted" style={{ fontSize: 12 }}>{audit.length} recent · {open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <p className="muted" style={{ fontSize: 11, margin: '8px 0' }}>
            Every change to album, money, Devil Fruits &amp; tasks. Entries auto-delete after 7 days.
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {AUDIT_FILTERS.map((f) => (
              <button
                key={f}
                className={`btn btn--small ${filter === f ? '' : 'btn--ghost'}`}
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={() => { sfx.click(); setFilter(f) }}
              >
                {f === 'all' ? 'All' : `${AUDIT_META[f].icon} ${AUDIT_META[f].label}`}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>Nothing logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {rows.map((r) => (
                <div key={r.id} style={{ fontSize: 12, lineHeight: 1.35, padding: '4px 0', borderBottom: '1px solid var(--line, rgba(255,255,255,0.08))' }}>
                  <span title={AUDIT_META[r.category].label}>{AUDIT_META[r.category].icon}</span>{' '}
                  <b>{nameFor(r.profileId)}</b>: {r.detail}
                  <div className="muted" style={{ fontSize: 10 }}>
                    {new Date(r.at).toLocaleString()}
                    {r.actor !== r.profileId && ` · by ${nameFor(r.actor)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PendingPrizes() {
  const { data, kidData, markGiftCardPaid } = useStore()
  const rows = [
    ...(kidData?.giftcards.filter((p) => !p.paidAt).map((p) => ({ who: 'Ben', targetId: KID_ID, p })) ?? []),
    ...data.giftcards.filter((p) => !p.paidAt).map((p) => ({ who: 'Me', targetId: PARENT_ID, p })),
  ]
  if (rows.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: 'var(--yellow)' }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>🎁 Prizes to settle</div>
      {rows.map(({ who, targetId, p }) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--line)', padding: '8px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{who}: {p.label}</div>
            <div className="muted" style={{ fontSize: 11 }}>ordered {p.day}{p.cost ? ` · 🍇${p.cost}` : ''}</div>
          </div>
          <button className="btn btn--small" onClick={() => { sfx.gem(); markGiftCardPaid(targetId, p.id) }}>
            ✓ Paid
          </button>
        </div>
      ))}
    </div>
  )
}

function PendingReview({ pending }: { pending: QuizQuestion[] }) {
  const { approveQuizQuestion, removeQuizQuestion } = useStore()
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: 'var(--orange)' }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>🔎 {pending.length} new AI question{pending.length > 1 ? 's' : ''} to review</div>
      {pending.map((q) => (
        <div key={q.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{q.emoji} {q.prompt}</div>
          <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>Answer: {correctAnswerText(q)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--small" onClick={() => { sfx.gem(); approveQuizQuestion(q.id) }}>✓ Approve</button>
            <button className="btn btn--ghost btn--small" style={{ color: 'var(--red)' }} onClick={() => { sfx.click(); removeQuizQuestion(q.id) }}>
              ✕ Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function AdminTopicCard({
  topic,
  targetId,
  targetData,
  onTest,
  onPreview,
  onManage,
}: {
  topic: QuizTopic
  targetId: string
  targetData: AppData | null
  onTest?: () => void // Ben only: launch his official test from here
  onPreview?: () => void // Ben only: try his training without recording
  onManage: () => void
}) {
  const { quizBank, setTopicUnlocked, setTopicPassed, grantDevilFruit, revokeDevilFruit, pushEvent } = useStore()
  const pool = activeQuestions(quizBank, topic.id)
  const unlocked = targetData?.quiz.unlockedTopics.includes(topic.id) ?? false
  const passed = targetData?.quiz.passedTopics.includes(topic.id) ?? false
  const last = targetData ? lastOfficialAttempt(targetData, topic.id) : null
  const failedToday = !!last && !last.passed && last.day === dayKey()
  const mastered = targetData ? pool.filter((q) => targetData.quiz.stats[q.id]?.everCorrect).length : 0

  return (
    <div className="card quiz-topic" style={{ marginBottom: 10 }}>
      {passed && <div className="quiz-stamp">⚓ CONQUERED ✔</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 30 }}>{topic.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>{topic.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {pool.length} questions · mastered {mastered}
            {last && <> · last official: {last.scorePct}% {last.passed ? '✓' : '✗'} ({last.day})</>}
          </div>
        </div>
        <button
          className={`btn btn--small ${unlocked ? 'btn--ghost' : 'btn--blue'}`}
          disabled={!targetData}
          onClick={() => { sfx.click(); setTopicUnlocked(targetId, topic.id, !unlocked) }}
        >
          {unlocked ? '🔓 Open' : '🔒 Locked'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {onTest && !passed && (
          <button className="btn btn--small" style={{ flex: 2 }} disabled={!targetData || pool.length === 0 || failedToday} onClick={() => { sfx.click(); onTest() }}>
            🎓 {failedToday ? 'Retry tomorrow' : 'Final Test (hand Ben the phone)'}
          </button>
        )}
        {onPreview && (
          <button className="btn btn--ghost btn--small" disabled={!targetData || pool.length === 0} onClick={() => { sfx.click(); onPreview() }}>
            ⚔️ Preview
          </button>
        )}
        <button
          className="btn btn--blue btn--small"
          style={{ flex: 1 }}
          disabled={!targetData}
          onClick={() => {
            sfx.gem()
            grantDevilFruit(targetId, topic.id)
            pushEvent({
              type: 'goal',
              emoji: '🍇',
              title: 'Bonus Devil Fruit granted',
              description: `${targetId === KID_ID ? 'Ben gets' : 'You get'} +1 🍇 for ${topic.title}. Captain’s orders.`,
            })
          }}
        >
          +1 🍇
        </button>
        <button
          className="btn btn--ghost btn--small"
          disabled={!targetData || (targetData?.economy.devilFruits ?? 0) <= 0}
          title="Undo a bonus Devil Fruit (mis-click safety)"
          onClick={() => {
            sfx.click()
            revokeDevilFruit(targetId, topic.id)
            pushEvent({
              type: 'goal',
              emoji: '🍇',
              title: 'Devil Fruit taken back',
              description: `${targetId === KID_ID ? 'Ben loses' : 'You lose'} −1 🍇 for ${topic.title}. Captain’s orders.`,
            })
          }}
        >
          −1 🍇
        </button>
        <button
          className="btn btn--ghost btn--small"
          disabled={!targetData}
          title={passed ? 'Take the CONQUERED stamp back and put the topic on the wheel again' : 'Stamp this topic CONQUERED without sitting the test'}
          onClick={() => {
            sfx.click()
            setTopicPassed(targetId, topic.id, !passed)
            pushEvent({
              type: 'goal',
              emoji: '⚓',
              title: passed ? 'Conquered stamp removed' : 'Topic marked conquered',
              description: `${topic.title} — captain’s orders.`,
            })
          }}
        >
          {passed ? '↩︎ Un-conquer' : '⚓ Mark conquered'}
        </button>
        <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); onManage() }}>
          📋 Questions
        </button>
      </div>

      {/* Ben only: let the test run on HIS device, with another grown-up invigilating */}
      {onTest && !passed && <RemoteTestDesk topic={topic} targetId={targetId} disabled={!targetData || pool.length === 0} />}
    </div>
  )
}

/**
 * "Let him take it over there": authorise ONE run of this final test on Ben's
 * own device. Diogo picks a 4-digit code and writes a note; the grown-up beside
 * Ben reads the note and types the code. The result comes straight back here.
 */
function RemoteTestDesk({ topic, targetId, disabled }: { topic: QuizTopic; targetId: string; disabled: boolean }) {
  const { finalTests, authorizeFinalTest, cancelFinalTest } = useStore()
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [note, setNote] = useState('')

  const live = finalTests.find(
    (t) => t.targetId === targetId && t.topicId === topic.id && (t.status === 'pending' || t.status === 'started'),
  )

  function send() {
    if (pin.length !== 4) return
    sfx.gem()
    authorizeFinalTest(targetId, topic.id, pin, note)
    setPin('')
    setNote('')
    setOpen(false)
  }

  if (live) {
    return (
      <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>
          📡 Allowed on Ben’s device · code <b style={{ color: 'var(--gold)', letterSpacing: 2 }}>{live.pin}</b>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          {live.status === 'started'
            ? `he started it ${live.startedAt ? new Date(live.startedAt).toLocaleString() : ''} — the result lands here`
            : live.postponed
              ? 'he tapped “later” — a banner is nagging him'
              : 'waiting for him to open it'}
          {live.note ? ` · “${live.note}”` : ''}
        </div>
        <button
          className="btn btn--ghost btn--small"
          style={{ marginTop: 6, color: 'var(--red)' }}
          onClick={() => { sfx.click(); cancelFinalTest(live.id) }}
        >
          ✕ {live.status === 'started' ? 'Call it off' : 'Withdraw'}
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        className="btn btn--ghost btn--small"
        style={{ marginTop: 8 }}
        disabled={disabled}
        onClick={() => { sfx.click(); setOpen(true) }}
      >
        📡 Allow on his device (grown-up nearby)
      </button>
    )
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 8 }}>
      <div className="field">
        <label>Code for the grown-up (4 digits)</label>
        <input
          type="text"
          inputMode="numeric"
          value={pin}
          placeholder="1234"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <label>Note for the grown-up</label>
        <input
          type="text"
          value={note}
          maxLength={200}
          placeholder="Hi Grandma! ~15 min, no help, no phone. Thanks!"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <p className="muted" style={{ fontSize: 11, margin: '6px 0 0' }}>
        One attempt only. Passing wins the 🍇 and opens his next topic — you’ll get a notification either way.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setOpen(false) }}>
          Cancel
        </button>
        <button className="btn btn--small" style={{ flex: 1 }} disabled={pin.length !== 4} onClick={send}>
          📡 Allow the test
        </button>
      </div>
    </div>
  )
}

function QuestionManager({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const { quizBank, removeQuizQuestion, approveQuizQuestion } = useStore()
  const topic = topicsFor(KID_ID).concat(topicsFor(PARENT_ID)).find((t) => t.id === topicId)
  const visible = quizBank.filter((q) => q.topicId === topicId && q.status !== 'removed')
  const removed = quizBank.filter((q) => q.topicId === topicId && q.status === 'removed')

  return (
    <div className="quiz-full">
      <div className="quiz-full-head">
        <div style={{ fontWeight: 900, flex: 1, fontSize: 15 }}>{topic?.emoji} {topic?.title} — question bank</div>
        <button className="btn btn--ghost btn--small" onClick={onClose}>✕ Close</button>
      </div>
      <div className="quiz-full-body">
        <p className="muted" style={{ marginBottom: 12 }}>
          {visible.length} in play · {removed.length} removed. Removing flags the question in the DB so the AI won’t regenerate it.
        </p>
        {visible.length === 0 && removed.length === 0 && (
          <p className="muted">No questions for this topic yet — they’ll appear here once generated.</p>
        )}
        {visible.map((q) => (
          <div key={q.id} className="card" style={{ marginBottom: 8, borderColor: q.status === 'pending' ? 'var(--orange)' : 'var(--line)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {q.emoji} {q.prompt} {q.status === 'pending' && <span className="chip chip--urgent">pending</span>}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {q.type} · weight {q.weight} · 🪙{q.points} — <b>{correctAnswerText(q)}</b>
                </div>
              </div>
              <button className="btn btn--ghost btn--small" style={{ color: 'var(--red)', alignSelf: 'center' }} onClick={() => { sfx.click(); removeQuizQuestion(q.id) }}>
                🗑
              </button>
            </div>
          </div>
        ))}

        {removed.length > 0 && (
          <>
            <div className="h2">🗑 Removed ({removed.length}) — the AI won’t recreate these</div>
            {removed.map((q) => (
              <div key={q.id} className="card" style={{ marginBottom: 8, opacity: 0.6 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{q.emoji} {q.prompt}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {q.type} · weight {q.weight} — <b>{correctAnswerText(q)}</b>
                    </div>
                  </div>
                  <button className="btn btn--ghost btn--small" style={{ alignSelf: 'center' }} onClick={() => { sfx.click(); approveQuizQuestion(q.id) }}>
                    ↩ Restore
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
