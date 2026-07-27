// Remote final tests — Dad authorises ONE official test to run on Ben's own
// device with any grown-up next to him.
//
// Ben's side: a popup the moment it lands ("now or later?"), a nagging top
// banner if he picks later, then a code screen he hands to the grown-up. The
// single attempt is burnt as soon as the code checks out.
//
// Dad's side: a top banner with the verdict once it's over, until he dismisses.
// (The push to a CLOSED app comes from functions/index.js.)
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import type { FinalTestAuth } from '../types'
import { reviewTopicIds, topicById } from '../logic/quiz'
import { QuizSession } from './QuizSession'
import { Luffy } from './Luffy'
import { sfx } from '../audio'

export function FinalTest() {
  return (
    <>
      <KidFinalTest />
      <AdminResultBanners />
    </>
  )
}

// --- Ben's side -------------------------------------------------------------

function KidFinalTest() {
  const { data, activeProfileId, finalTests, postponeFinalTest, startFinalTest, abandonFinalTest } = useStore()
  const [phase, setPhase] = useState<'idle' | 'code' | 'running'>('idle')
  const [authId, setAuthId] = useState<string | null>(null)

  const mine = finalTests.filter((t) => t.targetId === activeProfileId)
  const open = mine.find((t) => t.status === 'pending')
  const running = authId ? mine.find((t) => t.id === authId) : undefined
  const topic = topicById((running ?? open)?.topicId ?? '')

  function begin(auth: FinalTestAuth) {
    sfx.click()
    setAuthId(auth.id)
    setPhase('code')
  }

  // the code checked out — the attempt is spent from here on
  function unlocked() {
    if (!authId) return
    startFinalTest(authId)
    setPhase('running')
  }

  function closeSession() {
    // walked out before the last question: the attempt is gone, and Dad is told
    if (running?.status === 'started') abandonFinalTest(running.id)
    setAuthId(null)
    setPhase('idle')
  }

  if (phase === 'running' && running && topic) {
    return (
      <QuizSession
        mode="official"
        topicId={running.topicId}
        targetId={running.targetId}
        stats={data.quiz.stats}
        authId={running.id}
        onClose={closeSession}
      />
    )
  }

  if (phase === 'code') {
    const auth = mine.find((t) => t.id === authId)
    if (!auth || auth.status !== 'pending') return null
    return <CodeGate auth={auth} onPass={unlocked} onCancel={() => { setAuthId(null); setPhase('idle') }} />
  }

  if (!open || !topic) return null

  // he already said "later" — nag from the top instead of blocking the app
  if (open.postponed) {
    return (
      <div className="banner" style={{ background: 'var(--red)' }}>
        <span style={{ fontSize: 20 }}>🎓</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>Final test ready: {topic.title}</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>a grown-up needs to be with you · one shot only</div>
        </div>
        <button className="btn btn--small" onClick={() => begin(open)}>
          Start
        </button>
      </div>
    )
  }

  return (
    <div className="overlay overlay--center">
      <div className="sheet" style={{ textAlign: 'center' }}>
        <Luffy mood="cool" size={110} />
        <div style={{ fontSize: 44, margin: '6px 0' }}>🎓</div>
        <div className="h1">Final test unlocked!</div>
        <p style={{ margin: '8px 0', fontWeight: 800 }}>
          {topic.emoji} {topic.title}
        </p>
        <p className="muted" style={{ margin: '0 0 16px' }}>
          {open.fromName} opened your official final test. Sit next to a grown-up — they’ll have the code. You get{' '}
          <b>one shot</b>, so start it when you’re ready.
        </p>
        {reviewTopicIds(data, activeProfileId ?? '', open.topicId).length > 0 && (
          <p className="muted" style={{ margin: '0 0 16px' }}>
            🧠 It opens with a short <b>warm-up review</b> of the seas you already conquered — clear 70% of that and the
            real test begins.
          </p>
        )}
        <button className="btn" onClick={() => begin(open)}>
          ⚔️ Do it now
        </button>
        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => { sfx.click(); postponeFinalTest(open.id) }}>
          🕗 Later — remind me at the top
        </button>
      </div>
    </div>
  )
}

/** The invigilator screen: Dad's note for the grown-up, and their 4-digit code. */
function CodeGate({ auth, onPass, onCancel }: { auth: FinalTestAuth; onPass: () => void; onCancel: () => void }) {
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)
  const topic = topicById(auth.topicId)

  function press(d: string) {
    sfx.click()
    const next = entry + d
    setEntry(next)
    if (next.length < 4) return
    if (next === auth.pin) {
      sfx.gem()
      onPass()
      return
    }
    setError(true)
    sfx.error()
    setEntry('')
    window.setTimeout(() => setError(false), 500)
  }

  return (
    <div className="quiz-full">
      <div className="quiz-full-head">
        <div style={{ fontWeight: 900, flex: 1, fontSize: 15 }}>🎓 Final test — {topic?.title}</div>
        <button className="btn btn--ghost btn--small" style={{ whiteSpace: 'nowrap' }} onClick={() => { sfx.click(); onCancel() }}>
          ⚓ Not yet
        </button>
      </div>
      <div className="quiz-full-body" style={{ textAlign: 'center' }}>
        <div className="card" style={{ borderColor: 'var(--gold)', textAlign: 'left', marginBottom: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>👋 For the grown-up</div>
          <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
            {auth.note || `${auth.fromName} asked you to supervise this test.`}
          </p>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            {auth.fromName} gave you a 4-digit code. Type it in to start — Ben gets <b>one attempt only</b>, and{' '}
            {auth.fromName} is told the result either way.
          </p>
        </div>
        <div className={`pin-dots ${error ? 'shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot ${i < entry.length ? 'on' : ''}`} />
          ))}
        </div>
        <div className="pinpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
            k === '' ? (
              <div key={i} />
            ) : (
              <button key={i} onClick={() => (k === '⌫' ? setEntry(entry.slice(0, -1)) : entry.length < 4 && press(k))}>
                {k}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

// --- Dad's side: the verdict banner ----------------------------------------

function AdminResultBanners() {
  const { activeProfileId, finalTests, ackFinalTest } = useStore()
  if (activeProfileId !== PARENT_ID) return null

  const done = finalTests.filter((t) => (t.status === 'done' || t.status === 'abandoned') && !t.ackAt)
  return (
    <>
      {done.map((t) => {
        const topic = topicById(t.topicId)
        const unlocked = t.unlockedTopicId ? topicById(t.unlockedTopicId) : undefined
        const good = t.status === 'done' && t.passed
        return (
          <div key={t.id} className="banner" style={{ background: good ? 'var(--green)' : 'var(--red)' }}>
            <span style={{ fontSize: 20 }}>{t.status === 'abandoned' ? '🚪' : good ? '🏴‍☠️' : '⛈️'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 13 }}>
                {t.status === 'abandoned'
                  ? `Ben walked out of the ${topic?.title} final test`
                  : t.reviewFailed
                    ? `Ben missed the warm-up review — ${t.scorePct}% — no ${topic?.title} test`
                    : `Ben ${t.passed ? 'PASSED' : 'failed'} the ${topic?.title} final test — ${t.scorePct}%`}
              </div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>
                {t.status === 'abandoned'
                  ? 'his attempt is spent — authorise a new one if it was an accident'
                  : t.reviewFailed
                    ? (t.reviewBreakdown ?? [])
                        .map((r) => `${topicById(r.topicId)?.title ?? r.topicId} ${Math.round((r.right / r.total) * 100)}%`)
                        .join(' · ') || 'old topics need another pass'
                    : unlocked
                    ? `${unlocked.emoji} ${unlocked.title} opened up for him`
                    : t.passed
                      ? 'Devil Fruit awarded 🍇'
                      : 'he can retry another day'}
              </div>
            </div>
            <button className="btn btn--small" onClick={() => { sfx.click(); ackFinalTest(t.id) }}>
              ✓ Got it
            </button>
          </div>
        )
      })}
    </>
  )
}
