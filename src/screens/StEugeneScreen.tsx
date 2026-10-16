// 🏫 St. Eugene 7 (§24) — his actual school year, as an app.
//
// Five pages, each its own URL (§1c):
//   /steugene7/subjects  the year, in the order his class walks it
//   /steugene7/finder    "what are you learning right now?" — by sight, not by name
//   /steugene7/lesson    the lesson in flight
//   /steugene7/report    where he is strong, and where he needs me
//   /steugene7/desk      (Dad) approve content, unlock mistakes, read the misses
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import { sfx } from '../audio'
import {
  CURRENT_SUBTOPIC,
  SE_SUBJECTS,
  TERM_LABEL,
  seFind,
  seSubtopicsOf,
  type SeSubTopic,
  type SeSubject,
  type SeTerm,
} from '../logic/steugene'
import { packFor, writtenSubtopics } from '../steugene/packs'
import { SE_LENGTHS } from '../logic/steugeneLesson'
import { LessonPlayer } from '../components/steugene/LessonPlayer'
import { speak } from '../lib/speak'
import { dayKey, prettyDay } from '../logic/dates'
import type { AppData, SeAnswer, SeStat } from '../types'

export function StEugeneScreen({ tab, setTab }: { tab: string; setTab: (tab: string) => void }) {
  const { activeProfileId } = useStore()
  const isAdmin = activeProfileId === PARENT_ID

  return (
    <div className="screen">
      {tab === 'subjects' && <SubjectsTab setTab={setTab} />}
      {tab === 'finder' && <FinderTab setTab={setTab} />}
      {tab === 'lesson' && <LessonTab setTab={setTab} />}
      {tab === 'report' && <ReportTab admin={isAdmin} />}
      {tab === 'desk' && <DeskTab />}
    </div>
  )
}

// --- the year ------------------------------------------------------------------

const TERMS: SeTerm[] = ['term1', 'general', 'term2']

function SubjectsTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data } = useStore()
  const [open, setOpen] = useState<string | null>(seFind(CURRENT_SUBTOPIC)?.subject.id ?? 'math')
  const [picked, setPicked] = useState<string | null>(null)

  return (
    <>
      <div className="h1">🏫 St. Eugene 7</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Your whole year, in the order your class does it. Tap a topic to start.
      </p>

      {data.steugene.run && (
        <button className="btn btn--blue" style={{ marginBottom: 12 }} onClick={() => setTab('lesson')}>
          ▶️ Carry on with {seFind(data.steugene.run.subtopicId)?.subtopic.title}
        </button>
      )}

      {TERMS.map((term) => {
        const subjects = SE_SUBJECTS.filter((s) => s.term === term)
        if (!subjects.length) return null
        return (
          <div key={term} className="se-term">
            <div className="se-term__label">{TERM_LABEL[term]}</div>
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                open={open === subject.id}
                onToggle={() => {
                  sfx.click()
                  setOpen(open === subject.id ? null : subject.id)
                }}
                onPick={setPicked}
              />
            ))}
          </div>
        )
      })}

      {picked && <TopicSheet subtopicId={picked} onClose={() => setPicked(null)} setTab={setTab} />}
    </>
  )
}

function SubjectCard({
  subject,
  open,
  onToggle,
  onPick,
}: {
  subject: SeSubject
  open: boolean
  onToggle: () => void
  onPick: (id: string) => void
}) {
  const { data } = useStore()
  const written = writtenSubtopics()
  const all = seSubtopicsOf(subject.id)
  const touched = all.filter((s) => data.steugene.stats[s.id]?.attempts).length

  return (
    <div className="se-subject">
      <button
        className="se-subject__head"
        style={{ background: `linear-gradient(135deg, ${subject.tint[0]}, ${subject.tint[1]})` }}
        onClick={onToggle}
      >
        <span className="se-subject__emoji">{subject.emoji}</span>
        <span className="se-subject__name">
          {subject.name}
          <small>
            {touched}/{all.length} started
          </small>
        </span>
        <span className="se-subject__chev">{open ? '▾' : '▸'}</span>
      </button>

      {open &&
        subject.strands.map((strand) => (
          <div key={strand.id} className="se-strand">
            <div className="se-strand__title">{strand.title}</div>
            {strand.subtopics.map((st) => {
              const stat = data.steugene.stats[st.id]
              const pct = stat?.attempts ? Math.round((stat.right / stat.attempts) * 100) : null
              return (
                <button
                  key={st.id}
                  className={`se-topic${st.id === CURRENT_SUBTOPIC ? ' se-topic--here' : ''}`}
                  onClick={() => {
                    sfx.click()
                    onPick(st.id)
                  }}
                >
                  <span className="se-topic__emoji">{st.emoji}</span>
                  <span className="se-topic__body">
                    <span className="se-topic__title">
                      {st.title}
                      {st.id === CURRENT_SUBTOPIC && <em> · 📍 you are here</em>}
                    </span>
                    <span className="se-topic__sample">{st.sample}</span>
                  </span>
                  <span className="se-topic__score">
                    {pct === null ? (written.has(st.id) ? '✍️' : '·') : `${pct}%`}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
    </div>
  )
}

/** The sheet that opens on a topic: start it, or ask Dad for more of it. */
function TopicSheet({
  subtopicId,
  onClose,
  setTab,
}: {
  subtopicId: string
  onClose: () => void
  setTab: (tab: string) => void
}) {
  const { data, seDesk, seStart, seAskAi, seSetMinutes } = useStore()
  const where = seFind(subtopicId)
  const pack = packFor(subtopicId)
  const stat = data.steugene.stats[subtopicId]
  const asks = seDesk.requests.filter((r) => r.subtopicId === subtopicId)
  const pending = asks.filter((r) => r.status === 'pending')
  const locked = data.steugene.locks.filter((l) => l.subtopicId === subtopicId && !l.allowedAt)
  if (!where) return null

  const start = () => {
    sfx.fanfare()
    seStart(subtopicId)
    onClose()
    setTab('lesson')
  }

  return (
    <div className="se-sheet" role="dialog" onClick={onClose}>
      <div className="se-sheet__body card" onClick={(e) => e.stopPropagation()}>
        <div className="se-card__head">
          <div className="h1" style={{ marginBottom: 0 }}>
            {where.subtopic.emoji} {where.subtopic.title}
          </div>
          <button className="btn btn--ghost btn--small" onClick={() => speak(where.subtopic.plain)}>
            🔊
          </button>
        </div>
        <p className="muted">{where.subtopic.plain}</p>
        <div className="se-sample">{where.subtopic.sample}</div>

        {stat?.attempts ? (
          <p className="muted" style={{ marginTop: 10 }}>
            {stat.right}/{stat.attempts} right · {stat.lessons} lesson{stat.lessons === 1 ? '' : 's'} ·{' '}
            {Math.round(stat.seconds / 60)} min of work
          </p>
        ) : null}

        <div className="se-length">
          <span className="muted">How long?</span>
          {SE_LENGTHS.map((m) => (
            <button
              key={m}
              className={`btn btn--small ${data.steugene.minutes === m ? 'btn--blue' : 'btn--ghost'}`}
              onClick={() => {
                sfx.click()
                seSetMinutes(m)
              }}
            >
              {m} min
            </button>
          ))}
        </div>

        {pack ? (
          <button className="btn btn--blue" onClick={start}>
            ▶️ Start the lesson
          </button>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            Nothing written for this one yet. Ask Dad and he can have some made.
          </p>
        )}

        {locked.length > 0 && (
          <p className="muted" style={{ marginTop: 10 }}>
            🔒 {locked.reduce((n, l) => n + l.mistakes.length, 0)} question
            {locked.reduce((n, l) => n + l.mistakes.length, 0) === 1 ? '' : 's'} are sealed until Dad unlocks them.
          </p>
        )}

        <div className="se-ask">
          {(['questions', 'explain'] as const).map((want) => {
            const open = pending.some((r) => r.want === want)
            return (
              <button
                key={want}
                className="btn btn--ghost btn--small"
                disabled={open}
                onClick={() => {
                  sfx.click()
                  seAskAi(subtopicId, want)
                }}
              >
                {open ? '⏳ Asked Dad' : want === 'questions' ? '➕ More questions' : '💡 Explain it differently'}
              </button>
            )
          })}
        </div>

        <Verdicts subtopicId={subtopicId} />

        <button className="btn btn--ghost btn--small" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

/** Dad answered an earlier ask and Ben has not seen it yet. */
function Verdicts({ subtopicId }: { subtopicId: string }) {
  const { seDesk, seSeenVerdict } = useStore()
  const news = seDesk.requests.filter((r) => r.subtopicId === subtopicId && r.status !== 'pending' && !r.seen)
  if (!news.length) return null
  return (
    <div className="se-verdicts">
      {news.map((r) => (
        <button key={r.id} className="se-verdicts__row" onClick={() => seSeenVerdict(r.id)}>
          {r.status === 'approved' && `✅ Dad said yes — ${r.made} new card${r.made === 1 ? '' : 's'} added.`}
          {r.status === 'denied' && '🚫 Dad said not right now.'}
          {r.status === 'failed' && `⚠️ It did not work: ${r.error ?? 'unknown'}`}
        </button>
      ))}
    </div>
  )
}

// --- the Finder ------------------------------------------------------------------

/**
 * §24e — "What are you learning right now?"
 *
 * He cannot answer "rational numbers?" and he should not have to. He CAN
 * answer `|−20| = 20`, because that is what was on the board. So the Finder
 * shows one example at a time, big, and he slides until one looks like today.
 */
function FinderTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data, seStart } = useStore()
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [i, setI] = useState(0)
  const list: SeSubTopic[] = useMemo(() => (subjectId ? seSubtopicsOf(subjectId) : []), [subjectId])
  const here = list[i]

  if (!subjectId) {
    return (
      <>
        <div className="h1">🔍 What are you doing today?</div>
        <p className="muted" style={{ marginBottom: 12 }}>
          Pick the class first. Then slide until you see something you recognise from the board.
        </p>
        <div className="se-pickgrid">
          {SE_SUBJECTS.map((s) => (
            <button
              key={s.id}
              className="se-pick"
              style={{ background: `linear-gradient(135deg, ${s.tint[0]}, ${s.tint[1]})` }}
              onClick={() => {
                sfx.click()
                setSubjectId(s.id)
                setI(0)
              }}
            >
              <span style={{ fontSize: 34 }}>{s.emoji}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <button className="btn btn--ghost btn--small" onClick={() => setSubjectId(null)}>
        ← another class
      </button>
      <p className="muted" style={{ margin: '12px 0 8px' }}>
        Does this look like what you are doing?
      </p>

      <div className="card se-finder">
        <div className="se-finder__emoji">{here?.emoji}</div>
        <div className="se-finder__sample">{here?.sample}</div>
        <div className="se-finder__plain">{here?.plain}</div>
        <button className="btn btn--ghost btn--small" onClick={() => speak(`${here?.sample}. ${here?.plain}`)}>
          🔊 Read it to me
        </button>
      </div>

      <div className="se-finder__nav">
        <button
          className="btn btn--ghost"
          disabled={i === 0}
          onClick={() => {
            sfx.click()
            setI(i - 1)
          }}
        >
          ← Before
        </button>
        <span className="muted">
          {i + 1} / {list.length}
        </span>
        <button
          className="btn btn--ghost"
          disabled={i >= list.length - 1}
          onClick={() => {
            sfx.click()
            setI(i + 1)
          }}
        >
          After →
        </button>
      </div>

      <button
        className="btn btn--blue"
        style={{ marginTop: 14 }}
        disabled={!here || !packFor(here.id)}
        onClick={() => {
          if (!here) return
          sfx.fanfare()
          seStart(here.id)
          setTab('lesson')
        }}
      >
        {here && packFor(here.id) ? '✅ That is the one — make me a lesson' : 'Nothing written for this one yet'}
      </button>
      {data.steugene.run && (
        <p className="muted" style={{ marginTop: 10 }}>
          Starting a new one drops the lesson you already have open.
        </p>
      )}
    </>
  )
}

// --- the lesson --------------------------------------------------------------------

function LessonTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data } = useStore()
  if (data.steugene.run) return <LessonPlayer onLeave={() => setTab('subjects')} />
  return (
    <>
      <div className="h1">📘 No lesson running</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Pick a topic from your year, or let the Finder work out what you are on.
      </p>
      <button className="btn btn--blue" onClick={() => setTab('subjects')}>
        📚 Open my year
      </button>
      <button className="btn btn--ghost" style={{ marginTop: 10 }} onClick={() => setTab('finder')}>
        🔍 Work out what I am learning
      </button>
    </>
  )
}

// --- the report -----------------------------------------------------------------------

/**
 * §24i — the page I actually open.
 *
 * Not a leaderboard. A list of what he is getting wrong, worst first, so the
 * ten minutes I have with him go on the right thing. Anything under 60% with
 * real attempts behind it is flagged, because that is the line where "he is
 * guessing" starts.
 */
function ReportTab({ admin }: { admin: boolean }) {
  const { data, kidData } = useStore()
  const world: AppData | null = admin ? kidData : data
  const [subject, setSubject] = useState<string | 'all'>('all')

  if (admin && !kidData) return <div className="card">Loading Ben’s year from the cloud…</div>
  if (!world) return null

  const rows = Object.entries(world.steugene.stats)
    .map(([id, stat]) => ({ id, stat, where: seFind(id) }))
    .filter((r) => r.where && r.stat.attempts > 0)
    .filter((r) => subject === 'all' || r.where!.subject.id === subject)
    .sort((a, b) => a.stat.right / a.stat.attempts - b.stat.right / b.stat.attempts)

  const minutes = Math.round(Object.values(world.steugene.stats).reduce((n, s: SeStat) => n + s.seconds, 0) / 60)
  const recent = [...world.steugene.history].reverse().filter((a) => !a.right).slice(0, 12)

  return (
    <>
      <div className="h1">📊 {admin ? 'Ben’s report' : 'How you are doing'}</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {rows.length} topic{rows.length === 1 ? '' : 's'} started · {minutes} min of real work
      </p>

      <div className="se-filter">
        <button className={`btn btn--small ${subject === 'all' ? 'btn--blue' : 'btn--ghost'}`} onClick={() => setSubject('all')}>
          All
        </button>
        {SE_SUBJECTS.map((s) => (
          <button
            key={s.id}
            className={`btn btn--small ${subject === s.id ? 'btn--blue' : 'btn--ghost'}`}
            onClick={() => setSubject(s.id)}
          >
            {s.emoji}
          </button>
        ))}
      </div>

      {rows.length === 0 && <div className="card muted">Nothing here yet — finish a lesson and it fills in.</div>}

      {rows.map(({ id, stat, where }) => {
        const pct = Math.round((stat.right / stat.attempts) * 100)
        const help = pct < 60 && stat.attempts >= 4
        return (
          <div key={id} className={`card se-row${help ? ' se-row--help' : ''}`}>
            <div className="se-row__top">
              <strong>
                {where!.subtopic.emoji} {where!.subtopic.title}
              </strong>
              <span className={pct < 60 ? 'se-row__bad' : pct < 80 ? 'se-row__mid' : 'se-row__good'}>{pct}%</span>
            </div>
            <div className="se-row__bar">
              <div style={{ width: `${pct}%` }} className={pct < 60 ? 'bad' : pct < 80 ? 'mid' : 'good'} />
            </div>
            <div className="muted se-row__meta">
              {where!.subject.name} · {stat.right}/{stat.attempts} right · {Math.round(stat.seconds / 60)} min ·{' '}
              {prettyDay(dayKey(new Date(stat.lastAt)))}
              {help && <strong className="se-row__flag"> · needs a hand</strong>}
            </div>
          </div>
        )
      })}

      {recent.length > 0 && (
        <div className="card">
          <div className="h1" style={{ fontSize: 18 }}>❌ Latest misses</div>
          {recent.map((m, i) => (
            <Miss key={i} miss={m} />
          ))}
        </div>
      )}
    </>
  )
}

function Miss({ miss }: { miss: SeAnswer }) {
  return (
    <div className="se-miss">
      <div className="se-miss__q">{miss.prompt}</div>
      <div className="se-miss__a">
        <span className="se-miss__given">{miss.given}</span>
        <span className="muted"> → </span>
        <span className="se-miss__right">{miss.expected}</span>
        <span className="muted"> · {seFind(miss.subtopicId)?.subtopic.title}</span>
      </div>
    </div>
  )
}

// --- Dad's desk ---------------------------------------------------------------------

function DeskTab() {
  const { seDesk, seBusy, seDecideAi, seAllowFix, kidData, kidDataFresh, aiConfig } = useStore()
  const pending = seDesk.requests.filter((r) => r.status === 'pending')
  const locks = (kidData?.steugene.locks ?? []).filter((l) => !l.allowedAt).sort((a, b) => b.at - a.at)
  const [said, setSaid] = useState<string | null>(null)

  return (
    <>
      <div className="h1">🖊️ St. Eugene desk</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        What Ben asked for, and the mistakes he is not allowed to retry yet.
      </p>

      <div className="card">
        <div className="h1" style={{ fontSize: 18 }}>🔔 Asks ({pending.length})</div>
        {!pending.length && <p className="muted">Nothing waiting.</p>}
        {!aiConfig?.openrouterKey && pending.length > 0 && (
          <p className="muted">No OpenRouter key set — Settings → API key, or these will fail.</p>
        )}
        {pending.map((r) => (
          <div key={r.id} className="se-ask__row">
            <div>
              <strong>{r.subtopicTitle}</strong>
              <div className="muted">
                {r.want === 'questions' ? 'more questions' : 'a different explanation'} ·{' '}
                {new Date(r.at).toLocaleString('en-CA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </div>
            </div>
            <div className="se-ask__btns">
              <button
                className="btn btn--small btn--ghost"
                disabled={!!seBusy}
                onClick={() => void seDecideAi(r.id, false)}
              >
                Deny
              </button>
              <button
                className="btn btn--small btn--blue"
                disabled={!!seBusy}
                onClick={() => void seDecideAi(r.id, true)}
              >
                {seBusy === r.id ? 'Writing…' : 'Allow'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="h1" style={{ fontSize: 18 }}>🔒 Sealed mistakes ({locks.length})</div>
        {!kidData && <p className="muted">Loading Ben’s world…</p>}
        {kidData && !locks.length && <p className="muted">Nothing sealed. He has not missed anything since the last unlock.</p>}
        {locks.map((lock) => (
          <div key={lock.id} className="se-lock">
            <div className="se-lock__head">
              <strong>{seFind(lock.subtopicId)?.subtopic.title ?? lock.subtopicId}</strong>
              <span className="muted">
                {lock.mistakes.length} miss{lock.mistakes.length === 1 ? '' : 'es'} ·{' '}
                {prettyDay(dayKey(new Date(lock.at)))}
              </span>
            </div>
            {lock.mistakes.map((m, i) => (
              <Miss key={i} miss={m} />
            ))}
            <button
              className="btn btn--small btn--blue"
              disabled={!kidDataFresh}
              onClick={() => {
                sfx.click()
                setSaid(seAllowFix(lock.id) ? lock.id : null)
              }}
            >
              {said === lock.id ? '✅ Unlocked' : 'Allow Ben to fix these'}
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="h1" style={{ fontSize: 18 }}>🗂️ Decided</div>
        {seDesk.requests
          .filter((r) => r.status !== 'pending')
          .slice(-8)
          .reverse()
          .map((r) => (
            <div key={r.id} className="muted se-decided">
              {r.status === 'approved' ? '✅' : r.status === 'denied' ? '🚫' : '⚠️'} {r.subtopicTitle} ·{' '}
              {r.status === 'approved' ? `${r.made} cards` : (r.error ?? r.status)}
            </div>
          ))}
      </div>
    </>
  )
}
