// 🏫 St. Eugene 7 (§24) — his actual school year, as an app.
//
// Six pages, each its own URL (§1c):
//   /steugene7/subjects  the year, in the order his class walks it
//   /steugene7/finder    "what are you learning right now?" — by sight, not by name
//   /steugene7/lesson    the lesson in flight
//   /steugene7/review    his own mistakes, by chapter, whenever he wants
//   /steugene7/report    where he is strong, and where he needs me
//   /steugene7/desk      (Dad) approve content, unlock mistakes, read the misses
//   /steugene7/helping   (Dad) the card he is on this second, with the answer key
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import { sfx } from '../audio'
import {
  SE_CAN_MIN_ATTEMPTS,
  SE_SUBJECTS,
  TERM_LABEL,
  seCanDo,
  seFind,
  seNowBySubtopic,
  seOpenSubject,
  sePct,
  seAnsweredGroups,
  seReached,
  seRetired,
  seReviewGroups,
  seStuck,
  seSubtopicsOf,
  type SeReviewGroup,
  type SeSubTopic,
  type SeSubject,
  type SeTerm,
} from '../logic/steugene'
import { ensurePack, hasPack, packFor, writtenSubtopics } from '../steugene/packs'
import { SE_LENGTHS, seAvailable, seFixGroups, seLockLeft, seWithChecks } from '../logic/steugeneLesson'
import { LessonPlayer } from '../components/steugene/LessonPlayer'
import { SeHelping, SeHelpingBanner } from '../components/steugene/SeHelping'
import { speak } from '../lib/speak'
import { dayKey, prettyDay } from '../logic/dates'
import type { AppData, SeAnswer, SeFixLock, SeStat } from '../types'

export function StEugeneScreen({ tab, setTab }: { tab: string; setTab: (tab: string) => void }) {
  const { activeProfileId } = useStore()
  const isAdmin = activeProfileId === PARENT_ID

  return (
    <div className="screen">
      {tab === 'subjects' && <SubjectsTab setTab={setTab} />}
      {tab === 'finder' && <FinderTab setTab={setTab} />}
      {tab === 'lesson' && <LessonTab setTab={setTab} />}
      {tab === 'review' && <ReviewTab setTab={setTab} />}
      {tab === 'report' && <ReportTab admin={isAdmin} />}
      {tab === 'desk' && isAdmin && <DeskTab setTab={setTab} />}
      {tab === 'helping' && isAdmin && <SeHelping />}
    </div>
  )
}

// --- the year ------------------------------------------------------------------

const TERMS: SeTerm[] = ['term1', 'general', 'term2']

/** Stable empties, so the memos below do not re-run on every render. */
const NO_STATS: Record<string, SeStat> = {}
const NO_HISTORY: SeAnswer[] = []
const NO_LOCKS: SeFixLock[] = []

function SubjectsTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data, kidData, activeProfileId, seStartFix } = useStore()
  // Dad's copy of this page is "the year" — a map of Ben's progress, so it
  // reads Ben's world like the Report does. The buttons that START something
  // stay on whoever is logged in: Ben's sealed misses are his to redo (§24f).
  const admin = activeProfileId === PARENT_ID
  const world: AppData | null = admin ? kidData : data
  const stats = world?.steugene.stats ?? NO_STATS
  const history = world?.steugene.history ?? NO_HISTORY
  const locks = world?.steugene.locks ?? NO_LOCKS
  // §24u — the pin and the open card used to be the hand-set
  // `CURRENT_SUBTOPIC`, which could not know he had finished a chapter. They
  // are now read off his own record.
  const reached = useMemo(() => seReached(stats), [stats])
  const [open, setOpen] = useState<string | null | undefined>(undefined)
  const [picked, setPicked] = useState<string | null>(null)
  const [fixing, setFixing] = useState<string | null>(null)
  const fixes = seFixGroups((admin ? world : data)?.steugene.locks ?? [])
  // `undefined` means "nobody has tapped yet" — resolved here rather than in
  // the initialiser because on Dad's phone the stats arrive after the mount.
  const openId = open === undefined ? seOpenSubject(stats) : open

  const fix = async (subtopicId: string) => {
    const run = data.steugene.run
    if (!(run?.fix && run.subtopicId === subtopicId)) {
      sfx.fanfare()
      setFixing(subtopicId)
      await ensurePack(subtopicId)
      seStartFix(subtopicId)
    }
    walkIn()
    setTab('lesson')
  }

  if (admin && !world) return <div className="card">Loading Ben’s year from the cloud…</div>

  return (
    <>
      <div className="h1">🏫 St. Eugene 7</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {admin
          ? 'Ben’s whole year, in the order his class does it. 📍 is as far as he has got.'
          : 'Your whole year, in the order your class does it. Tap a topic to start.'}
      </p>

      <OpenLesson onIn={() => setTab('lesson')} />

      {fixes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {fixes.map((g) => (
            <button
              key={g.subtopicId}
              className="se-topic se-topic--fix"
              disabled={!!fixing || admin}
              onClick={() => void fix(g.subtopicId)}
            >
              <span className="se-topic__emoji">🔧</span>
              <span className="se-topic__body">
                <span className="se-topic__title">
                  {seFind(g.subtopicId)?.subtopic.title ?? g.subtopicId} — mistakes to fix
                </span>
                <span className="se-topic__sample">
                  {fixing === g.subtopicId
                    ? 'Getting it ready…'
                    : admin
                      ? 'Unlocked. Waiting for him to redo them.'
                      : 'Dad unlocked these. One more go at each.'}
                </span>
              </span>
              <span className="se-topic__score">{new Set(g.left.map((m) => m.id)).size}</span>
            </button>
          ))}
        </div>
      )}

      <CanDo stats={stats} history={history} locks={locks} admin={admin} />

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
                here={reached[subject.id]}
                stats={stats}
                history={history}
                locks={locks}
                open={openId === subject.id}
                onToggle={() => {
                  sfx.click()
                  setOpen(openId === subject.id ? null : subject.id)
                }}
                onPick={setPicked}
              />
            ))}
          </div>
        )
      })}

      {picked && (
        <TopicSheet
          subtopicId={picked}
          world={world}
          admin={admin}
          onClose={() => setPicked(null)}
          setTab={setTab}
        />
      )}
    </>
  )
}

/**
 * 💪 What I can do now (§24r).
 *
 * Four lines of it, newest first, with the rest behind a "+N more" — because
 * a list of twenty is a wall, and the only lines that carry any charge are
 * the ones he earned this week.
 *
 * It sits above the year on purpose: the screen he opens to pick today's work
 * should open with what he has already won, not with the fifteen topics he
 * has not touched.
 */
function CanDo({
  stats,
  history,
  locks,
  admin,
}: {
  stats: Record<string, SeStat>
  history: SeAnswer[]
  locks: SeFixLock[]
  /** Dad is reading it, so it is about him, not addressed to him. */
  admin: boolean
}) {
  const can = useMemo(() => seCanDo(stats, history, locks), [stats, history, locks])
  const [all, setAll] = useState(false)
  if (!can.length) return null
  const shown = all ? can : can.slice(0, 4)

  return (
    <div className="card se-can">
      <div className="se-can__head">
        <strong>💪 {admin ? 'What he can do now' : 'What I can do now'}</strong>
        <span className="se-can__count">{can.length}</span>
      </div>
      <ul className="se-can__list">
        {shown.map((c) => (
          <li key={c.subtopicId}>
            <span aria-hidden>{c.emoji}</span>
            <span>{c.can}</span>
          </li>
        ))}
      </ul>
      {can.length > 4 && (
        <button
          className="btn btn--ghost btn--small"
          onClick={() => {
            sfx.click()
            setAll(!all)
          }}
        >
          {all ? 'Show fewer' : `+${can.length - 4} more`}
        </button>
      )}
    </div>
  )
}

function SubjectCard({
  subject,
  here,
  stats,
  history,
  locks,
  open,
  onToggle,
  onPick,
}: {
  subject: SeSubject
  /** The furthest subtopic he has reached in this subject — the 📍 pin (§24u). */
  here?: string
  stats: Record<string, SeStat>
  history: SeAnswer[]
  locks: SeFixLock[]
  open: boolean
  onToggle: () => void
  onPick: (id: string) => void
}) {
  const written = writtenSubtopics()
  const all = seSubtopicsOf(subject.id)
  const touched = all.filter((s) => stats[s.id]?.attempts).length
  const nowBy = useMemo(() => seNowBySubtopic(history, locks), [history, locks])

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
              const now = nowBy[st.id]
              const pct = sePct(now, stats[st.id])
              // Nothing left that his latest answer gets wrong, and enough of
              // them to mean it — the chapter is standing up (§24u).
              const sound = !!now && now.broken === 0 && now.asked >= SE_CAN_MIN_ATTEMPTS
              return (
                <button
                  key={st.id}
                  className={`se-topic${st.id === here ? ' se-topic--here' : ''}`}
                  onClick={() => {
                    sfx.click()
                    onPick(st.id)
                  }}
                >
                  <span className="se-topic__emoji">{st.emoji}</span>
                  <span className="se-topic__body">
                    <span className="se-topic__title">
                      {st.title}
                      {st.id === here && <em> · 📍 you are here</em>}
                    </span>
                    <span className="se-topic__sample">
                      {now?.repaired ? `🔧 ${now.repaired} fixed · ${st.sample}` : st.sample}
                    </span>
                  </span>
                  <span className="se-topic__score">
                    {pct === null ? (written.has(st.id) ? '✍️' : '·') : sound ? `✅ ${pct}%` : `${pct}%`}
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
  world,
  admin,
  onClose,
  setTab,
}: {
  subtopicId: string
  /** Whose record is being READ — Ben's, even when Dad is the one tapping. */
  world: AppData | null
  admin: boolean
  onClose: () => void
  setTab: (tab: string) => void
}) {
  const { data, seDesk, seStart, seAskAi, seSetMinutes } = useStore()
  const [opening, setOpening] = useState(false)
  const where = seFind(subtopicId)
  const written = hasPack(subtopicId)
  const stat = world?.steugene.stats[subtopicId]
  const history = world?.steugene.history ?? NO_HISTORY
  const asks = seDesk.requests.filter((r) => r.subtopicId === subtopicId)
  const pending = asks.filter((r) => r.status === 'pending')
  const inFlight = data.steugene.run
  const resuming = inFlight?.subtopicId === subtopicId && !inFlight.fix

  const sheetLocks = world?.steugene.locks ?? NO_LOCKS
  const now = useMemo(() => seNowBySubtopic(history, sheetLocks)[subtopicId], [history, sheetLocks, subtopicId])

  /**
   * Where every question he still gets wrong is sitting.
   *
   * "Why is it 89% if he fixed all of them?" is a fair question and the page
   * could not answer it: a percentage says how many are wrong and nothing
   * about why they are still wrong, and in this app the usual reason is that
   * they are sealed and waiting on Dad (§24f) rather than anything about him.
   */
  const stuck = useMemo(
    () => seStuck(sheetLocks, subtopicId, now?.broken ?? 0),
    [sheetLocks, subtopicId, now?.broken],
  )

  if (!where) return null

  // The pack is its own chunk (see steugene/packs/generated), so it has to
  // arrive before the lesson can be dealt. On wifi this is a blink; on his
  // tablet's first run of a new unit it is a second, and saying so beats a
  // button that looks broken.
  const start = async () => {
    sfx.fanfare()
    setOpening(true)
    await ensurePack(subtopicId)
    seStart(subtopicId)
    walkIn()
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
          <div className="se-break">
            <div className="se-break__top">
              <strong className="se-break__pct">{sePct(now, stat)}%</strong>
              <span className="muted">
                {now
                  ? `${now.right} of ${now.asked} questions right on ${admin ? 'his' : 'your'} latest go`
                  : `${stat.right}/${stat.attempts} right`}
              </span>
            </div>
            <ul className="se-break__list">
              {now && now.repaired > 0 && (
                <li>🔧 {now.repaired} missed, then fixed — these count as right.</li>
              )}
              {now && now.retired > 0 && (
                <li className="muted">
                  🗑️ {now.retired} older {now.retired === 1 ? 'question' : 'questions'} {admin ? 'he' : 'you'} missed{' '}
                  {now.retired === 1 ? 'is' : 'are'} not in this lesson any more, so {now.retired === 1 ? 'it' : 'they'}{' '}
                  cannot be asked again. Not counted either way.
                </li>
              )}
              {now && now.broken > 0 && (
                <li className="se-break__blocked">
                  ❌ {now.broken} still wrong — {admin ? 'they are' : 'all of them are'} on the 🔁 Review pile for{' '}
                  {seFind(subtopicId)?.strand.title}, ready whenever {admin ? 'he wants' : 'you want'} another go.
                </li>
              )}
              {stuck.ready > 0 && (
                <li>🔧 {stuck.ready} also sitting in "mistakes to fix" on {admin ? 'his year' : 'My year'}.</li>
              )}
              {stuck.loose > 0 && (
                <li className="se-break__blocked">
                  ❓ {stuck.loose} wrong and in no list. {admin ? '' : 'Tell Dad — '}that should not happen.
                </li>
              )}
              <li className="muted">
                {stat.lessons} lesson{stat.lessons === 1 ? '' : 's'} · {Math.round(stat.seconds / 60)} min of work ·{' '}
                {stat.attempts} tr{stat.attempts === 1 ? 'y' : 'ies'} in total
              </li>
            </ul>
          </div>
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

        {resuming && (
          <button
            className="btn btn--blue"
            onClick={() => {
              sfx.click()
              walkIn()
              onClose()
              setTab('lesson')
            }}
          >
            ▶️ Resume
          </button>
        )}

        {written ? (
          <button
            className={`btn ${resuming ? 'btn--ghost' : 'btn--blue'}`}
            style={resuming ? { marginTop: 10 } : undefined}
            disabled={opening}
            onClick={() => void start()}
          >
            {opening ? 'Getting it ready…' : resuming ? '🔄 Start over' : '▶️ Start the lesson'}
          </button>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            Nothing written for this one yet. Ask Dad and he can have some made.
          </p>
        )}

        {written && inFlight && !resuming && (
          <p className="muted" style={{ marginTop: 10 }}>
            Starting this one finishes your {seFind(inFlight.subtopicId)?.subtopic.title}
            {inFlight.fix ? ' mistakes to fix' : ' lesson'}.
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
  const [opening, setOpening] = useState(false)
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
        disabled={!here || !hasPack(here.id) || opening}
        onClick={() => {
          if (!here) return
          sfx.fanfare()
          setOpening(true)
          void ensurePack(here.id).then(() => {
            seStart(here.id)
            walkIn()
            setTab('lesson')
          })
        }}
      >
        {!here || !hasPack(here.id)
          ? 'Nothing written for this one yet'
          : opening
            ? 'Getting it ready…'
            : '✅ That is the one — make me a lesson'}
      </button>
      {data.steugene.run && (
        <p className="muted" style={{ marginTop: 10 }}>
          Starting a new one finishes the lesson you already have open.
        </p>
      )}
    </>
  )
}

// --- the lesson --------------------------------------------------------------------

/**
 * The lesson this app session has already walked into, by its `startedAt`.
 * One that is open but is not this one — the app was closed mid-lesson, or he
 * came in by the 📘 tab — is asked about first: ▶️ Resume or 🔄 Start over.
 * Module state on purpose: it is forgotten exactly when the app is.
 */
let walkedInto: number | null = null
function walkIn() {
  walkedInto = useStore.getState().data.steugene.run?.startedAt ?? null
}

/** ⏸ The lesson still open: ▶️ Resume it, or 🔄 Start it over (§24d). */
function OpenLesson({ onIn }: { onIn: () => void }) {
  const { data, seStart, seStartFix } = useStore()
  const [opening, setOpening] = useState(false)
  const run = data.steugene.run
  if (!run) return null
  const { subtopicId, fix } = run

  return (
    <div className="card se-open">
      <div className="se-open__title">
        ⏸ {seFind(subtopicId)?.subtopic.title}
        {fix && ' — mistakes to fix'}
      </div>
      <p className="muted">You stopped in the middle of this one.</p>
      <div className="se-open__btns">
        <button
          className="btn btn--blue"
          disabled={opening}
          onClick={() => {
            sfx.click()
            walkIn()
            onIn()
          }}
        >
          ▶️ Resume
        </button>
        <button
          className="btn btn--ghost"
          disabled={opening}
          onClick={async () => {
            sfx.fanfare()
            setOpening(true)
            await ensurePack(subtopicId)
            if (fix) seStartFix(subtopicId)
            else seStart(subtopicId)
            walkIn()
            onIn()
          }}
        >
          {opening ? 'Getting it ready…' : '🔄 Start over'}
        </button>
      </div>
    </div>
  )
}

function LessonTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data, seResume } = useStore()
  const run = data.steugene.run
  const [, rerender] = useState(0)
  // A reload (or the app being killed) lands here with a lesson in flight and
  // nothing in memory to render it from, so fetch the chunk back first.
  const [ready, setReady] = useState(() => !run || !!packFor(run.subtopicId))
  useEffect(() => {
    if (!run || ready) return
    let alive = true
    void ensurePack(run.subtopicId).then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [run?.subtopicId, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Once per visit, and only after the pack is here (stepping on may need to
  // top the queue up from it): if he left with a card answered but not yet
  // ▶️ Next'd, he comes back to the card after it.
  const [resumed, setResumed] = useState(false)
  useEffect(() => {
    if (!run || !ready || resumed) return
    setResumed(true)
    seResume()
  }, [!!run, ready, resumed]) // eslint-disable-line react-hooks/exhaustive-deps

  if (run && !ready) return <div className="card">Opening your lesson…</div>
  if (run && walkedInto !== run.startedAt) return <OpenLesson onIn={() => rerender((n) => n + 1)} />
  if (run) return <LessonPlayer onLeave={() => setTab('subjects')} />
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

// --- 🔁 Review (§24v) -----------------------------------------------------------------

/**
 * His own mistakes, by chapter, on demand.
 *
 * This replaced the rule that a miss he got right on the same day did not
 * count and had to rest until tomorrow. The rule was not wrong about learning
 * — repeating an answer you were told an hour ago proves little — but it put a
 * locked door where the motivation was, and the page it produced said
 * "mistakes to fix" at a boy who had just fixed every one of them.
 *
 * So: no door. Everything he still gets wrong is here, grouped by the chapter
 * his class calls it ("Number Sense and Numeration", not "Comparing rational
 * numbers"), and he can have another go any time he likes. Sealed or not —
 * §24f still records every miss and still puts it on Dad's desk to explain,
 * but it no longer stands between him and a second attempt.
 */
function ReviewTab({ setTab }: { setTab: (tab: string) => void }) {
  const { data, seDesk, seStartReview, seStartCustomReview, seSetMinutes } = useStore()
  const [opening, setOpening] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])

  // Which of his answered questions still EXIST. Both lists count questions,
  // and a count is a promise — 11 of Ben's own answers are to cards that left
  // the pack when the maths year was rewritten (§24u), and a card offering
  // 54 questions that can only deal 43 is lying to him. So the packs he has
  // worked in are fetched up front and the lists are filtered by what is in
  // them. `ensurePack` is memoised, so this costs nothing after the first visit.
  const mine = useMemo(
    () => [...new Set(data.steugene.history.map((a) => a.subtopicId))].filter(hasPack),
    [data.steugene.history],
  )
  const [askable, setAskable] = useState<Set<string> | null>(null)
  useEffect(() => {
    let alive = true
    void Promise.all(mine.map((id) => ensurePack(id))).then(() => {
      if (!alive) return
      const ids = new Set<string>()
      for (const sub of mine) {
        const generated = seDesk.generated.filter((g) => g.subtopicId === sub).flatMap((g) => g.blocks)
        for (const b of seWithChecks(seAvailable(packFor(sub), generated))) ids.add(b.id)
      }
      setAskable(ids)
    })
    return () => {
      alive = false
    }
  }, [mine, seDesk.generated])

  const canAsk = useMemo(() => (askable ? (id: string) => askable.has(id) : undefined), [askable])
  const groups = useMemo(
    () => seReviewGroups(data.steugene.history, data.steugene.locks, canAsk),
    [data.steugene.history, data.steugene.locks, canAsk],
  )
  const answered = useMemo(
    () => seAnsweredGroups(data.steugene.history, data.steugene.locks, canAsk),
    [data.steugene.history, data.steugene.locks, canAsk],
  )
  const chosen = answered.filter((g) => picked.includes(g.strandId))
  const chosenQs = chosen.reduce((n, g) => n + g.seen.length, 0)

  const open = async (g: SeReviewGroup) => {
    sfx.fanfare()
    setOpening(g.strandId)
    // A strand is a dozen subtopics and each pack is its own chunk, so they
    // all have to be here before the queue can be dealt.
    await Promise.all(g.subtopicIds.map((id) => ensurePack(id)))
    seStartReview(g.strandId)
    walkIn()
    setTab('lesson')
  }

  const openCustom = async () => {
    if (!chosen.length) return
    sfx.fanfare()
    setOpening('custom')
    await Promise.all([...new Set(chosen.flatMap((g) => g.subtopicIds))].map((id) => ensurePack(id)))
    seStartCustomReview(chosen.map((g) => g.strandId))
    walkIn()
    setTab('lesson')
  }

  return (
    <>
      <div className="h1">🔁 Review</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Everything you have got wrong and not yet put right, by chapter — or build your own review further down. Have
        another go whenever you want; there is nothing to wait for.
      </p>

      {askable === null && mine.length > 0 && <div className="card">Working out what you have covered…</div>}

      {askable !== null && groups.length === 0 && (
        <div className="card">
          <div style={{ fontSize: 40 }}>🏴‍☠️</div>
          <div className="h1" style={{ fontSize: 19 }}>No mistakes to fix</div>
          <p className="muted">
            There is not a single question you are still getting wrong.
            {answered.length > 0 && ' You can still build your own review below.'}
          </p>
          {answered.length === 0 && (
            <button className="btn btn--blue" style={{ marginTop: 10 }} onClick={() => setTab('subjects')}>
              📚 Open my year
            </button>
          )}
        </div>
      )}

      {(groups.length > 0 || answered.length > 0) && (
        <div className="se-length" style={{ marginBottom: 12 }}>
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
      )}

      {groups.map((g) => {
        const topics = [...new Set(g.misses.map((m) => m.subtopicTitle))]
        return (
          <div key={g.strandId} className="card se-review">
            <div className="se-review__head">
              <span className="se-review__emoji" aria-hidden>
                {g.emoji}
              </span>
              <span className="se-review__body">
                <span className="se-review__title">{g.strandTitle}</span>
                <span className="muted se-review__sub">{g.subjectName}</span>
              </span>
              <span className="se-review__count">{g.misses.length}</span>
            </div>

            <p className="muted se-review__topics">
              {topics.slice(0, 3).join(' · ')}
              {topics.length > 3 && ` · +${topics.length - 3} more`}
            </p>

            <button className="btn btn--blue" disabled={!!opening} onClick={() => void open(g)}>
              {opening === g.strandId ? 'Building it…' : `🔁 Review these (${data.steugene.minutes} min)`}
            </button>
          </div>
        )
      })}

      {groups.length > 0 && (
        <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
          A review fills the {data.steugene.minutes} minutes you have set and starts with the ones you have left
          longest. Get one right and it comes off the pile for good.
        </p>
      )}

      {answered.length > 0 && (
        <div className="card se-custom">
          <div className="h1" style={{ fontSize: 18 }}>🎛️ Build your own review</div>
          <p className="muted" style={{ marginBottom: 10 }}>
            Pick the chapters. You only get questions you have already seen — nothing new, no reading you have not had.
          </p>

          {answered.map((g) => {
            const on = picked.includes(g.strandId)
            return (
              <button
                key={g.strandId}
                className={`se-custom__row${on ? ' is-on' : ''}`}
                onClick={() => {
                  sfx.click()
                  setPicked(on ? picked.filter((x) => x !== g.strandId) : [...picked, g.strandId])
                }}
              >
                <span className="se-custom__tick" aria-hidden>
                  {on ? '☑' : '☐'}
                </span>
                <span className="se-custom__body">
                  <span className="se-custom__title">
                    {g.emoji} {g.strandTitle}
                  </span>
                  <span className="muted se-custom__sub">
                    {g.seen.length} question{g.seen.length === 1 ? '' : 's'} you have seen
                    {g.wrong > 0 && ` · ${g.wrong} still wrong`}
                  </span>
                </span>
              </button>
            )
          })}

          <button className="btn btn--blue" disabled={!chosen.length || !!opening} onClick={() => void openCustom()}>
            {opening === 'custom'
              ? 'Building it…'
              : chosen.length
                ? `▶️ ${data.steugene.minutes} min from ${chosen.length} chapter${chosen.length === 1 ? '' : 's'}`
                : 'Pick a chapter first'}
          </button>
          {chosen.length > 0 && (
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              {chosenQs} question{chosenQs === 1 ? '' : 's'} to draw from. Anything you are getting wrong comes first,
              with the explanation; the rest are shuffled, so you never get the same review twice.
            </p>
          )}
        </div>
      )}
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

  // §24u — scored on his LATEST answer per question, so a chapter he has
  // repaired reads as repaired. Lifetime attempts stay on the meta line.
  const nowBy = seNowBySubtopic(world.steugene.history, world.steugene.locks)
  const rows = Object.entries(world.steugene.stats)
    .map(([id, stat]) => ({ id, stat, now: nowBy[id], pct: sePct(nowBy[id], stat) ?? 0, where: seFind(id) }))
    .filter((r) => r.where && r.stat.attempts > 0)
    .filter((r) => subject === 'all' || r.where!.subject.id === subject)
    .sort((a, b) => a.pct - b.pct)

  const minutes = Math.round(Object.values(world.steugene.stats).reduce((n, s: SeStat) => n + s.seconds, 0) / 60)
  // Only misses his latest answer still gets wrong. A question he has since
  // redone correctly is not something to sit down with him about, and leaving
  // it here was the Report telling me he still could not do what he had just
  // spent the evening fixing.
  const stillWrong = new Set<string>()
  for (const a of world.steugene.history) {
    if (a.right) stillWrong.delete(a.id)
    else stillWrong.add(a.id)
  }
  // ...and not a question that no longer exists (§24u). A card renamed out of
  // the pack leaves a wrong answer behind for ever: it cannot be asked, so it
  // cannot be fixed, and listing it told him to go and redo something that is
  // not there. The rows already ignore these, which is why one could read
  // 100% while this list underneath it showed seven misses.
  const retired = seRetired(world.steugene.locks, world.steugene.history)
  const recent = [...world.steugene.history]
    .reverse()
    .filter((a) => !a.right && stillWrong.has(a.id) && !retired.has(a.id))
    .filter((a, i, all) => all.findIndex((x) => x.id === a.id) === i)
    .slice(0, 12)
  const repaired = Object.values(nowBy).reduce((n, v) => n + v.repaired, 0)
  // Misses he CANNOT redo because nobody has unsealed them (§24f). Without
  // this the row says "4 still wrong" and reads as his problem, when the
  // thing standing between him and fixing them is a button on Dad's desk.
  const sealedBy: Record<string, Set<string>> = {}
  for (const lock of world.steugene.locks) {
    if (lock.allowedAt || lock.clearedAt) continue
    const set = (sealedBy[lock.subtopicId] ??= new Set())
    for (const miss of seLockLeft(lock)) set.add(miss.id)
  }
  const sealed = Object.values(sealedBy).reduce((n, v) => n + v.size, 0)

  return (
    <>
      <div className="h1">📊 {admin ? 'Ben’s report' : 'How you are doing'}</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {rows.length} topic{rows.length === 1 ? '' : 's'} started · {minutes} min of real work
        {repaired > 0 && ` · 🔧 ${repaired} question${repaired === 1 ? '' : 's'} missed then fixed`}
      </p>

      {admin && sealed > 0 && (
        <div className="card se-sealedcard">
          🔒 <strong>
            {sealed} mistake{sealed === 1 ? '' : 's'} {sealed === 1 ? 'is' : 'are'} sealed
          </strong>{' '}
          and he cannot touch {sealed === 1 ? 'it' : 'them'} until you unlock {sealed === 1 ? 'it' : 'them'}. Until you
          do, {sealed === 1 ? 'it keeps' : 'they keep'} counting against him on the rows below. The 🖊️ Desk tab has the
          button.
        </div>
      )}

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

      {rows.map(({ id, stat, now, pct, where }) => {
        const asked = now?.asked ?? stat.attempts
        const help = pct < 60 && asked >= SE_CAN_MIN_ATTEMPTS
        const nudged = stat.helped ?? 0
        // §24p — a topic he gets right but keeps asking for a start on is a
        // different problem from one he gets wrong, and it is invisible in a
        // percentage. It is worth naming, because it is nearly fixed.
        const started = !help && stat.attempts >= SE_CAN_MIN_ATTEMPTS && nudged / stat.attempts >= 0.4
        // Nothing left that he gets wrong — say so, because the percentage on
        // its own cannot distinguish "never missed one" from "fixed them all".
        const sound = !!now && now.broken === 0 && now.asked >= SE_CAN_MIN_ATTEMPTS
        const locked = sealedBy[id]?.size ?? 0
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
              {where!.subject.name} · {now ? `${now.right}/${now.asked} right now` : `${stat.right}/${stat.attempts} right`}
              {now && now.repaired > 0 && ` · 🔧 ${now.repaired} fixed`}
              {now && now.broken > 0 && ` · ❌ ${now.broken} still wrong`}
              {nudged > 0 && ` · 🤔 ${nudged} nudged`} · {stat.attempts} tr{stat.attempts === 1 ? 'y' : 'ies'} ·{' '}
              {Math.round(stat.seconds / 60)} min · {prettyDay(dayKey(new Date(stat.lastAt)))}
              {help && <strong className="se-row__flag"> · needs a hand</strong>}
              {started && <strong className="se-row__nudge"> · gets there with a nudge</strong>}
              {sound && !started && <strong className="se-row__sound"> · nothing left wrong</strong>}
              {locked > 0 && <strong className="se-row__sealed"> · 🔒 {locked} sealed, waiting for you</strong>}
            </div>
          </div>
        )
      })}

      {recent.length > 0 && (
        <div className="card">
          <div className="h1" style={{ fontSize: 18 }}>❌ Still getting these wrong</div>
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

function DeskTab({ setTab }: { setTab: (tab: string) => void }) {
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

      <SeHelpingBanner onOpen={() => setTab('helping')} />

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
