// The writer's side of the topic desk: ask for something you actually want to
// write about, then wait for Dad's answer.
//
// He can ask, and that is all he can do — an approved idea joins the normal
// list exactly like one Dad wrote, a turned-down one is simply gone. The point
// of the tab is that the answer is never a mystery: every ask he has ever sent
// is here with what happened to it.
//
// Plain inputs on purpose. §19d's no-autocorrect keyboard exists because the
// essay is where his spelling is supposed to be found out; a topic title is not
// marked, not graded, and making him thumb it out on <PenKeyboard> would just
// be friction in front of the one screen meant to be easy to use.
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { SUGGEST_CAP, canSuggestTopic, myTopicAsks } from '../../logic/essay'
import { sfx } from '../../audio'

export function AskTopicPanel() {
  const { essayTopics, activeProfileId, essayAskTopic, essayMarkTopicSeen } = useStore()
  const [form, setForm] = useState({ title: '', blurb: '', subject: '' })
  const [why, setWhy] = useState('')
  const [sent, setSent] = useState(false)

  const asks = myTopicAsks(essayTopics, activeProfileId)
  const waiting = asks.filter((t) => t.status === 'suggested')
  const answered = asks.filter((t) => t.status !== 'suggested')
  const room = canSuggestTopic(essayTopics, activeProfileId)

  function send() {
    sfx.click()
    const problem = essayAskTopic(form)
    setWhy(problem)
    if (!problem) {
      setForm({ title: '', blurb: '', subject: '' })
      setSent(true)
      sfx.gem()
    }
  }

  return (
    <>
      <div className="h2">💡 Ask for a topic</div>
      <div className="card">
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
          Got something you actually want to write about? Ask for it. Dad reads every one — if he says yes it goes
          straight onto your Write list.
        </p>
        <div className="field" style={{ marginTop: 10 }}>
          <label>What's it about?</label>
          <input
            type="text"
            value={form.title}
            maxLength={120}
            onChange={(e) => { setForm({ ...form, title: e.target.value }); setWhy(''); setSent(false) }}
            placeholder="e.g. Why goalies have the hardest job"
          />
        </div>
        <div className="field">
          <label>Why do you want to write it? (optional)</label>
          <input
            type="text"
            value={form.blurb}
            maxLength={240}
            onChange={(e) => setForm({ ...form, blurb: e.target.value })}
            placeholder="Tell Dad what you'd say"
          />
        </div>
        <div className="field">
          <label>Subject (optional)</label>
          <input
            type="text"
            value={form.subject}
            maxLength={40}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Sports"
          />
        </div>
        <button className="btn btn--blue" disabled={!form.title.trim() || !room.ok} onClick={send}>
          📨 Send it to Dad
        </button>
        {why && <p style={{ fontSize: 12, marginTop: 8, color: 'var(--red)', fontWeight: 800 }}>{why}</p>}
        {!why && !room.ok && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{room.why}</p>
        )}
        {sent && !why && (
          <p style={{ fontSize: 13, marginTop: 8, fontWeight: 800, color: 'var(--green)' }}>
            📨 Sent! Dad gets a ping — check back here for his answer.
          </p>
        )}
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          You can have {SUGGEST_CAP} ideas waiting at a time.
        </p>
      </div>

      {waiting.length > 0 && (
        <>
          <div className="h2">⏳ Waiting on Dad — {waiting.length}</div>
          {waiting.map((t) => (
            <div className="card" key={t.id} style={{ marginBottom: 10 }}>
              <span className="chip">{t.subject}</span>
              <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>{t.title}</div>
              {t.blurb && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t.blurb}</p>}
            </div>
          ))}
        </>
      )}

      {answered.length > 0 && (
        <>
          <div className="h2">📬 What Dad said</div>
          {answered.map((t) => {
            const yes = t.status === 'kept'
            return (
              <div
                className="card"
                key={t.id}
                style={{ marginBottom: 10, borderColor: yes ? 'var(--green)' : 'var(--line)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="chip" style={yes ? { background: 'var(--green)', color: '#042a12' } : undefined}>
                    {yes ? '✓ Approved' : '✕ Not this one'}
                  </span>
                  {!t.seenAt && <span className="chip" style={{ background: 'var(--gold)', color: '#3a2000' }}>NEW</span>}
                </div>
                <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>{t.title}</div>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {yes
                    ? t.enabled
                      ? "It's on your Write list — go and write it."
                      : "Approved, but Dad has it hidden for now."
                    : 'Not this one. Send him another idea — that one costs you nothing.'}
                </p>
                {!t.seenAt && (
                  <button
                    className="btn btn--ghost btn--small"
                    style={{ marginTop: 8 }}
                    onClick={() => { sfx.click(); essayMarkTopicSeen(t.id) }}
                  >
                    Got it
                  </button>
                )}
              </div>
            )
          })}
        </>
      )}
    </>
  )
}
