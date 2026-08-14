// The parent's topic desk: ask the AI for ideas, keep the good ones, bin the
// rest — and a binned one is never offered again, which is the only reason the
// tenth batch is still worth reading.
//
// Keeping a topic is not the same as opening it: kept topics have a switch, and
// Ben only ever sees the ones that are on.
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { TOPIC_BATCH } from '../../logic/essay'
import { ESSAY_MODEL_NOTE, manualTopic, type TopicOffer } from '../../logic/essayAi'
import { sfx } from '../../audio'

export function TopicsPanel() {
  const {
    essayTopics,
    essayBusy,
    essayError,
    essayClearError,
    essaySuggestTopics,
    essayJudgeTopic,
    essaySetTopicEnabled,
    essaySetTopicWords,
    essayDeleteTopic,
    aiConfig,
  } = useStore()

  const [offers, setOffers] = useState<TopicOffer[]>([])
  const [steer, setSteer] = useState('')
  const [manual, setManual] = useState({ title: '', blurb: '', subject: '' })
  const kept = essayTopics.filter((t) => t.status === 'kept')
  const binned = essayTopics.filter((t) => t.status === 'rejected')

  async function ask() {
    sfx.click()
    essayClearError()
    const got = await essaySuggestTopics(TOPIC_BATCH, steer)
    setOffers(got)
  }

  function judge(offer: TopicOffer, keep: boolean) {
    sfx.click()
    essayJudgeTopic(offer, keep)
    setOffers((list) => list.filter((o) => o.title !== offer.title))
  }

  return (
    <>
      <div className="h2">💡 New topics</div>
      <div className="card">
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Steer it (optional)</label>
          <input
            type="text"
            value={steer}
            onChange={(e) => setSteer(e.target.value)}
            placeholder="e.g. science, or something about hockey"
          />
        </div>
        <button className="btn btn--blue" disabled={!!essayBusy} onClick={ask}>
          {essayBusy === 'topics' ? '🤖 Thinking…' : `🤖 Ask for ${TOPIC_BATCH} ideas`}
        </button>
        <p className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.4 }}>
          {aiConfig?.openrouterKey ? ESSAY_MODEL_NOTE : `No OpenRouter key set — ${ESSAY_MODEL_NOTE}`}
        </p>
      </div>

      {essayError && (
        <div className="card" style={{ marginTop: 10, borderColor: 'var(--red)' }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>🤖 That didn’t work</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{essayError}</p>
          <button className="btn btn--ghost btn--small" style={{ marginTop: 8 }} onClick={essayClearError}>Dismiss</button>
        </div>
      )}

      {offers.length > 0 && (
        <>
          <div className="h2">Pick the ones you like</div>
          {offers.map((o) => (
            <div className="card" key={o.title} style={{ marginBottom: 10 }}>
              <span className="chip">{o.subject}</span>
              <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>{o.title}</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{o.blurb}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn--small" style={{ flex: 1 }} onClick={() => judge(o, true)}>✓ Keep</button>
                <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={() => judge(o, false)}>
                  ✕ Never again
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="h2">📋 On Ben’s list — {kept.filter((t) => t.enabled).length} open</div>
      {kept.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nothing kept yet.</p>}
      {kept.map((t) => (
        <div className="card" key={t.id} style={{ marginBottom: 10, opacity: t.enabled ? 1 : 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="chip">{t.subject}</span>
            {t.source === 'parent' && <span className="chip">✍️ yours</span>}
            <button
              className={`btn btn--small ${t.enabled ? '' : 'btn--ghost'}`}
              style={{ marginLeft: 'auto' }}
              onClick={() => { sfx.click(); essaySetTopicEnabled(t.id, !t.enabled) }}
            >
              {t.enabled ? '👁️ Open' : '🚫 Hidden'}
            </button>
          </div>
          <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>{t.title}</div>
          {t.blurb && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t.blurb}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <label className="muted" style={{ fontSize: 12, fontWeight: 800 }}>Min words</label>
            <input
              type="number"
              value={t.minWords}
              min={30}
              max={600}
              step={10}
              onChange={(e) => essaySetTopicWords(t.id, Number(e.target.value))}
              style={{ width: 80, padding: '6px 8px', borderRadius: 10, border: '2px solid var(--line)', background: 'var(--bg2)', color: 'var(--text)' }}
            />
            <button
              className="btn btn--ghost btn--small"
              style={{ marginLeft: 'auto', color: 'var(--red)' }}
              onClick={() => { sfx.click(); essayDeleteTopic(t.id) }}
            >
              🗑️ Drop
            </button>
          </div>
        </div>
      ))}

      <div className="h2">✍️ Write your own</div>
      <div className="card">
        <div className="field">
          <label>Title</label>
          <input type="text" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} />
        </div>
        <div className="field">
          <label>What it should cover</label>
          <input type="text" value={manual.blurb} onChange={(e) => setManual({ ...manual, blurb: e.target.value })} />
        </div>
        <div className="field">
          <label>Subject</label>
          <input type="text" value={manual.subject} onChange={(e) => setManual({ ...manual, subject: e.target.value })} placeholder="Science" />
        </div>
        <button
          className="btn btn--blue"
          disabled={!manual.title.trim()}
          onClick={() => {
            sfx.click()
            essayJudgeTopic(manualTopic(manual.title, manual.blurb, manual.subject), true, 'parent')
            setManual({ title: '', blurb: '', subject: '' })
          }}
        >
          ➕ Add topic
        </button>
      </div>

      {binned.length > 0 && (
        <>
          <div className="h2">🚫 Never offer again — {binned.length}</div>
          <div className="card">
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              {binned.map((t) => t.title).join(' · ')}
            </p>
          </div>
        </>
      )}
    </>
  )
}
