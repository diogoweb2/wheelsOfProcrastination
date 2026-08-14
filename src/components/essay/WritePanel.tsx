// The writer's side of the essay app: pick a topic, write it, hand it in, fix
// what came back, collect the grade.
//
// One essay at a time, on purpose — a half-finished draft is not competition for
// a shiny new topic, and the loop only teaches anything if he finishes it.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Essay, EssayTopic } from '../../types'
import {
  GRADES,
  GRADE_COINS,
  ISSUE_EMOJI,
  ISSUE_LABEL,
  canSubmit,
  gradeTint,
  hasMark,
  isMachineNote,
  issueTint,
  liveRuleHits,
  openComments,
  openSpelling,
  partText,
  resendWaitMs,
  waitClock,
  writableTopics,
} from '../../logic/essay'
import type { RuleHit } from '../../logic/proofreader'
import { EssayEditor } from './EssayEditor'
import { MarkedEssay } from './MarkedEssay'
import { NoteCard } from './NoteCard'
import { FixSheet } from './FixSheet'
import { AiWaiting } from './AiWaiting'
import { sfx } from '../../audio'

export function WritePanel() {
  const { essays, essayTopics, activeProfileId, essayStart, essayMarkSeen } = useStore()
  const mine = essays.filter((e) => e.authorId === activeProfileId)
  const live = mine.find((e) => e.status !== 'graded')
  const fresh = mine.filter((e) => e.status === 'graded' && !e.seenAt).slice(-1)[0]
  const topics = writableTopics(essayTopics)

  // The grade lands as a celebration, once. After that it lives in History.
  if (fresh) {
    return (
      <>
        <div className="h2">🏅 Your grade is in!</div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="essay-grade" style={{ color: gradeTint(fresh.grade!) }}>{fresh.grade}</div>
          <div style={{ fontWeight: 900, marginTop: 2 }}>{fresh.title}</div>
          <div className="chip" style={{ background: 'var(--gold)', color: '#3a2000', marginTop: 8 }}>
            🪙 +{fresh.coins} Berries
          </div>
          {fresh.gradeGood && (
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.4 }}>
              <strong>⭐ What you did well:</strong> {fresh.gradeGood}
            </p>
          )}
          {fresh.gradeImprove && (
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.4 }}>
              <strong>🎯 Next time:</strong> {fresh.gradeImprove}
            </p>
          )}
          <button className="btn" style={{ marginTop: 14 }} onClick={() => { sfx.gem(); essayMarkSeen(fresh.id) }}>
            Let’s go! 🏴‍☠️
          </button>
        </div>
      </>
    )
  }

  if (live?.status === 'submitted') {
    return (
      <>
        <div className="h2">📬 Handed in</div>
        <div className="card">
          <div style={{ fontWeight: 900, fontSize: 17 }}>{live.title}</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Round {live.round} is on Dad’s desk. You’ll get a ping when the notes come back — then you fix them and send
            it again.
          </p>
        </div>
        <div className="h2">What you sent</div>
        <div className="card">
          <MarkedEssay essay={live} comments={[]} />
        </div>
      </>
    )
  }

  if (live?.status === 'returned') return <FixPhase key={`${live.id}:${live.round}`} essay={live} />
  if (live?.status === 'writing') {
    return <Draft key={live.id} essay={live} topic={essayTopics.find((t) => t.id === live.topicId)} />
  }

  return (
    <>
      <div className="h2">✍️ Pick something to write about</div>
      {topics.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>📭</div>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            No topics open yet. Got one of your own? Send it to Dad from the 💡 Ideas tab.
          </p>
        </div>
      )}
      {topics.map((t) => (
        <div className="card" key={t.id} style={{ marginBottom: 10 }}>
          <span className="chip">{t.subject}</span>
          <div style={{ fontWeight: 900, fontSize: 17, marginTop: 6 }}>{t.title}</div>
          {t.blurb && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t.blurb}</p>}
          <button
            className="btn btn--blue"
            style={{ marginTop: 10 }}
            onClick={() => { sfx.click(); essayStart(t.id) }}
          >
            ✍️ Write this one ({t.minWords}+ words)
          </button>
        </div>
      ))}

      <div className="h2">🪙 What each grade pays</div>
      <div className="card">
        <div className="essay-payline">
          {GRADES.map((g) => (
            <div key={g} className="essay-pay">
              <span style={{ color: gradeTint(g), fontWeight: 900 }}>{g}</span>
              <span className="muted" style={{ fontSize: 12, fontWeight: 800 }}>{GRADE_COINS[g]}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
          You always get to fix your mistakes before the grade is given — so the grade is about how good the writing
          ends up, not how many mistakes you made on the way.
        </p>
      </div>
    </>
  )
}

/** First draft: the editor, an honest word count, and one button that hands it in. */
function Draft({ essay, topic }: { essay: Essay; topic?: EssayTopic }) {
  const { essaySaveDraft, essaySubmitChecked, essayDelete } = useStore()
  const [title, setTitle] = useState(essay.title)
  const [paras, setParas] = useState(essay.paragraphs)
  // Set the first time the app's own rules turn him back, and never unset: once
  // he has seen the list it stays on screen and shrinks as he fixes things.
  const [gated, setGated] = useState(false)
  const minWords = topic?.minWords ?? 150

  // Autosave: the cloud copy trails his typing by a second, so closing the app
  // mid-sentence costs a sentence, never the essay.
  useEffect(() => {
    if (title === essay.title && paras.join(' ') === essay.paragraphs.join(' ')) return
    const t = setTimeout(() => essaySaveDraft(essay.id, { title, paragraphs: paras }), 900)
    return () => clearTimeout(t)
  }, [title, paras, essay.id, essay.title, essay.paragraphs, essaySaveDraft])

  const check = canSubmit({ ...essay, title, paragraphs: paras }, minWords)
  // Live, off the text in front of him rather than the saved copy — that's what
  // makes this feel like a spellchecker instead of a rejection.
  const hits = useMemo(() => liveRuleHits(essay, { title, paragraphs: paras }), [essay, title, paras])

  return (
    <>
      <div className="h2">✍️ {topic?.title ?? essay.topicTitle}</div>
      {topic?.blurb && <p className="muted" style={{ fontSize: 13, margin: '-4px 0 10px' }}>{topic.blurb}</p>}

      {gated && <RuleGate hits={hits} />}

      <div className="card">
        <EssayEditor
          title={title}
          paragraphs={paras}
          minWords={minWords}
          onTitle={setTitle}
          onParagraph={(i, v) => setParas((p) => p.map((x, j) => (j === i ? v : x)))}
          onAddParagraph={() => setParas((p) => [...p, ''])}
          onRemoveParagraph={(i) => setParas((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p))}
          renderNotes={gated ? (part) => <RuleHints hits={hits.filter((h) => h.para === part)} /> : undefined}
        />
      </div>

      <button
        className="btn"
        style={{ marginTop: 12 }}
        disabled={!check.ok}
        onClick={async () => {
          sfx.gem()
          essaySaveDraft(essay.id, { title, paragraphs: paras })
          if ((await essaySubmitChecked(essay.id)) === 'rules') setGated(true)
        }}
      >
        📬 Hand it in
      </button>
      {!check.ok && <p className="muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>{check.why}</p>}

      <button
        className="btn btn--ghost btn--small"
        style={{ margin: '14px auto 0', display: 'block', color: 'var(--red)' }}
        onClick={() => {
          if (confirm('Throw this draft away? Everything you wrote is gone.')) essayDelete(essay.id)
        }}
      >
        🗑️ Bin this draft
      </button>
    </>
  )
}

/**
 * Phase 2: the notes are back. He reads his own essay with the problems circled
 * on it, taps a circle, and fixes that one bit in a sheet (§19e-5) — the word
 * alone for a spelling, the sentence around it for anything else. Nothing here
 * tells him the answer; that's the deal.
 *
 * There is no "edit the whole thing" view any more, on purpose. Handing a
 * 12-year-old four paragraphs and a list of notes makes finding the words each
 * note is about *his* problem, and that is the part he gives up on.
 */
function FixPhase({ essay }: { essay: Essay }) {
  const {
    essaySaveDraft,
    essaySubmitChecked,
    essayBusy,
    essayCheck,
    essayClearCheck,
    essayAutoResolve,
    essayProofread,
    essayResolveComment,
  } = useStore()
  const [fixing, setFix] = useState<string | null>(null)
  // Set the moment the app's own rules turn a send back. It is a flash, not a
  // wall: the marks light up for five seconds so he can see *where* the app is
  // pointing, then everything goes quiet again and the circles speak for
  // themselves. A banner that stays on screen for the rest of the round only
  // adds noise to a page that is already covered in notes.
  const [gatedAt, setGatedAt] = useState(0)
  const [, tick] = useState(0)

  // The saved essay is the only copy here: every fix is committed the moment he
  // presses save in the sheet, so what is circled is always about text that has
  // actually been written down.
  const { title, paragraphs: paras } = essay
  const open = openComments(essay)
  const praise = essay.comments.filter((c) => c.issue === 'praise')
  const done = essay.comments.filter((c) => c.issue !== 'praise' && c.status === 'fixed').length
  const total = done + open.length
  const orphans = open.filter((c) => !hasMark(essay, c))

  // Tick once a second while the cooldown runs, so the button counts itself down.
  const wait = resendWaitMs(essay)
  useEffect(() => {
    if (wait <= 0) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [wait])

  const [gated, setGated] = useState(false)
  useEffect(() => {
    if (!gatedAt) return
    setGated(true)
    const t = setTimeout(() => setGated(false), 5000)
    return () => clearTimeout(t)
  }, [gatedAt])

  const note = essay.comments.find((c) => c.id === fixing) ?? null
  const stuck = openSpelling(essay).length
  // While the flash is up: every circle the app itself put there.
  const flashIds = gated ? open.filter((c) => c.source === 'app').map((c) => c.id) : undefined

  /**
   * One mark, dealt with. The fix is saved straight away rather than debounced —
   * he pressed a button that says "save", and the marks that redraw underneath
   * have to be about the text he can now see.
   *
   * The app then re-reads it for free: a machine note whose problem has gone
   * closes itself (§19e-3), and the built-in rules re-run over the new sentence.
   * A note a person wrote is settled right here instead — nothing can check
   * "clearer now?" by itself, and Dad sees the change next round anyway.
   */
  function saveFix(para: number, nextPart: string, noteId: string) {
    const patch =
      para === -1
        ? { title: nextPart, paragraphs: paras }
        : { title, paragraphs: paras.map((p, i) => (i === para ? nextPart : p)) }
    essaySaveDraft(essay.id, patch)
    const c = essay.comments.find((x) => x.id === noteId)
    if (c && !isMachineNote(c)) essayResolveComment(essay.id, noteId, true)
    essayAutoResolve(essay.id)
    essayProofread(essay.id)
  }

  return (
    <>
      <div className="h2">🔍 Round {essay.round} — your notes are back</div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 17 }}>{essay.title}</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
          {open.length === 0
            ? 'Everything is sorted — send it back and Dad will grade it.'
            : 'Tap anything circled and fix just that bit. Nobody will write it for you: read the note, work out what’s wrong, and change it yourself.'}
        </p>
        {total > 0 && (
          <div className="essay-meter">
            <div className="essay-meter-bar">
              <span style={{ width: `${Math.round((done / total) * 100)}%`, background: 'var(--green)' }} />
            </div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>{done} / {total} sorted</div>
          </div>
        )}
        {praise.length > 0 && (
          <p style={{ fontSize: 13, marginTop: 8 }}>
            ⭐ <strong>{praise[0].text}</strong>
          </p>
        )}
      </div>

      {gated && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--orange)' }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>🧰 The app found a few more — look at the flashing ones</div>
        </div>
      )}

      <div className="card">
        <MarkedEssay
          essay={essay}
          comments={essay.comments}
          selectedId={fixing}
          flashIds={flashIds}
          // a sorted mark (and every ⭐) is there to be read, not reopened
          onSelect={(id) => {
            if (!open.some((c) => c.id === id)) return
            sfx.click()
            setFix(id)
          }}
        />
      </div>

      {/* A note whose words he has already rewritten has nothing left to circle,
          so it would otherwise disappear off the screen while still counting
          against him. It gets a card, and a way to say he's done with it. */}
      {orphans.length > 0 && (
        <>
          <div className="h2">📝 Nothing left to circle for these</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orphans.map((c) => (
              <NoteCard key={c.id} note={c}>
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => { sfx.click(); essayResolveComment(essay.id, c.id, true) }}
                >
                  ✓ I’ve sorted this
                </button>
              </NoteCard>
            ))}
          </div>
        </>
      )}

      {note && (
        <FixSheet
          key={note.id}
          note={note}
          part={partText(essay, note.para)}
          onSave={(next) => saveFix(note.para, next, note.id)}
          onClose={() => setFix(null)}
        />
      )}

      {essayBusy === 'fixes' && (
        <div style={{ marginTop: 12 }}>
          <AiWaiting label="Checking your spelling" />
        </div>
      )}

      {/* The gate: the machine checks the spelling before Dad is bothered again.
          It only ever says WHICH words are still wrong — never what they should be. */}
      {essayCheck && !essayCheck.ok && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--red)' }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>
            🔤 {essayCheck.stillWrong} word{essayCheck.stillWrong === 1 ? ' is' : 's are'} still spelled wrong
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Look at the circles again — they’re the ones marked “still not fixed”. Sound the word out slowly.
          </p>
          <button className="btn btn--ghost btn--small" style={{ marginTop: 8 }} onClick={essayClearCheck}>
            OK, I’ll look
          </button>
        </div>
      )}

      <button
        className="btn"
        style={{ marginTop: 12 }}
        disabled={!!essayBusy || wait > 0}
        onClick={async () => {
          sfx.gem()
          if ((await essaySubmitChecked(essay.id)) === 'rules') setGatedAt(Date.now())
        }}
      >
        {essayBusy
          ? '🤖 Checking…'
          : wait > 0
            ? `⏳ Wait ${waitClock(wait)}`
            : open.length === 0
              ? '📬 Send it back to Dad'
              : `🤖 Check my fixes (${open.length} still circled)`}
      </button>
      <p className="muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 1.4 }}>
        {wait > 0
          ? 'Every check costs real money, so there’s a five-minute wait between tries. Use it to read your work again.'
          : open.length > 0
            ? 'Sort every circle first — that’s what sends it back to Dad.'
            : stuck > 0
              ? 'Your spelling gets checked before this goes back to Dad.'
              : 'Your spelling gets checked first — then it goes back to Dad.'}
      </p>
    </>
  )
}

/**
 * The app's own rules, standing between him and everybody else (§19e-4).
 *
 * A missing capital is not worth a minute of a model's time or a trip to Dad's
 * desk, and finding out about it two days later teaches nothing — so the app
 * says it now, itself, for free. The wording works hard to be clear that
 * **nobody has read this yet**: this is the machine tidying up, and the review
 * proper happens once he's done.
 */
function RuleGate({ hits }: { hits: RuleHit[] }) {
  if (hits.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 12, borderColor: 'var(--green)' }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>✅ All tidy — send it now</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>
          The app has nothing left to complain about. Tap send and it goes off to be read properly.
        </p>
      </div>
    )
  }
  return (
    <div className="card" style={{ marginBottom: 12, borderColor: 'var(--orange)' }}>
      <div style={{ fontWeight: 900, fontSize: 15 }}>
        🧰 {hits.length} quick {hits.length === 1 ? 'thing' : 'things'} to tidy up first
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>
        <strong>Nobody has read your essay yet.</strong> This is just the app checking the rules that always have the
        same answer — capital letters, spaces, full stops. Fix these, send it again, and <em>then</em> it gets read
        properly.
      </p>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hits.map((h) => (
          <RuleLine key={`${h.rule}:${h.para}`} hit={h} where />
        ))}
      </div>
    </div>
  )
}

/** The same rules, sitting under the box he has to change. */
function RuleHints({ hits }: { hits: RuleHit[] }) {
  if (!hits.length) return null
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {hits.map((h) => (
        <RuleLine key={`${h.rule}:${h.para}`} hit={h} />
      ))}
    </div>
  )
}

function RuleLine({ hit, where }: { hit: RuleHit; where?: boolean }) {
  return (
    <div className="essay-note" style={{ '--mark': issueTint(hit.issue) } as React.CSSProperties}>
      <div className="essay-note-head">
        <span className="chip" style={{ background: issueTint(hit.issue), color: '#10230a' }}>
          {ISSUE_EMOJI[hit.issue]} {ISSUE_LABEL[hit.issue]}
        </span>
        <span className="chip">📏 rule</span>
        {where && <span className="chip">{hit.para === -1 ? 'Title' : `Paragraph ${hit.para + 1}`}</span>}
      </div>
      <div className="essay-note-quote">“{hit.quote}”</div>
      <div className="essay-note-text">{hit.text}</div>
    </div>
  )
}
