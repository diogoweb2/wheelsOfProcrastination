// 👀 Quiz Watch (§14e) — Ben's quizzes from Dad's side, one URL per page:
//   /watch/live      the quiz he is in right now, answer by answer
//   /watch/answers   every sitting, with what he actually answered
//   /watch/mistakes  the questions and quizzes he misses most, as a %
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { subscribeQuizSessions } from '../store/cloud'
import { correctAnswerText, topicById } from '../logic/quiz'
import { dayKey } from '../logic/dates'
import { KIND_LABEL, isLive, missRows, overallMiss, quizMissRows, sessionTally, sessionTitle, type MissRow } from '../logic/quizReport'
import type { QuizLogAnswer, QuizSessionLog } from '../types'
import { sfx } from '../audio'

export function QuizWatchScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      {tab === 'live' && <LivePage />}
      {tab === 'answers' && <AnswersPage />}
      {tab === 'mistakes' && <MistakesPage />}
    </div>
  )
}

function useSessions(max: number): QuizSessionLog[] | null {
  const [sessions, setSessions] = useState<QuizSessionLog[] | null>(null)
  useEffect(() => subscribeQuizSessions(max, setSessions), [max])
  return sessions
}

const seconds = (ms: number) => `${Math.max(0, Math.round(ms / 1000))}s`
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function dayLabel(iso: string): string {
  const key = dayKey(new Date(iso))
  if (key === dayKey()) return 'Today'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (key === dayKey(y)) return 'Yesterday'
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

// --- shared rows -------------------------------------------------------------

function AnswerRow({ a, n }: { a: QuizLogAnswer; n: number }) {
  return (
    <div className="card" style={{ marginBottom: 8, borderColor: a.correct ? 'var(--line)' : 'var(--red)' }}>
      <div style={{ display: 'flex', gap: 8, fontWeight: 800, fontSize: 14 }}>
        <span>{a.correct ? '✅' : '❌'}</span>
        <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          {n}. {a.prompt}
        </span>
        <span className="muted" style={{ fontSize: 12, flexShrink: 0 }}>{seconds(a.timeMs)}</span>
      </div>
      {!a.correct && (
        <div style={{ marginTop: 6, fontSize: 13, overflowWrap: 'anywhere' }}>
          <div>
            <span className="muted" style={{ fontSize: 13 }}>He said: </span>
            <strong>{a.given || '(nothing recorded)'}</strong>
          </div>
          <div>
            <span className="muted" style={{ fontSize: 13 }}>Right answer: </span>
            <strong>{a.rightAnswer}</strong>
          </div>
        </div>
      )}
      {a.correct && a.given && (
        <div className="muted" style={{ marginTop: 4, fontSize: 13, overflowWrap: 'anywhere' }}>
          {a.given}
          {a.nearMiss ? ` · misspelled, it’s “${a.rightAnswer}”` : ''}
        </div>
      )}
    </div>
  )
}

function verdict(s: QuizSessionLog): string {
  const { right, pct } = sessionTally(s)
  const score = `${right}/${s.answers.length} · ${s.scorePct ?? pct}%`
  if (s.passed === true) return `${score} · passed`
  if (s.passed === false) return `${score} · failed`
  if (s.kind === 'training') return score
  return `${score} · ${s.outcome === 'left' ? 'left early' : 'not finished'}`
}

function SessionCard({ s, open }: { s: QuizSessionLog; open?: boolean }) {
  const { wrong } = sessionTally(s)
  return (
    <details className="card" style={{ marginBottom: 10 }} open={open}>
      <summary style={{ cursor: 'pointer' }}>
        <span style={{ fontWeight: 900 }}>{sessionTitle(s)}</span>
        <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
          {clock(s.startedAt)} · {KIND_LABEL[s.kind]} · {verdict(s)}
          {wrong > 0 ? ` · ${wrong} wrong` : ''}
        </div>
      </summary>
      <div style={{ marginTop: 10 }}>
        {s.answers.map((a, i) => (
          <AnswerRow key={i} a={a} n={i + 1} />
        ))}
      </div>
    </details>
  )
}

// --- /watch/live -------------------------------------------------------------

function LivePage() {
  const sessions = useSessions(10)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  if (!sessions) return <p className="muted">Looking for Ben…</p>

  const live = sessions.filter((s) => isLive(s, now))
  if (live.length === 0) {
    return (
      <>
        <div className="card" style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 40 }}>💤</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>Ben isn’t in a quiz right now</div>
          <p className="muted" style={{ marginTop: 4 }}>Leave this page open. His next quiz appears here by itself.</p>
        </div>
        {sessions[0] && (
          <>
            <div className="h2">Last quiz · {dayLabel(sessions[0].startedAt)}</div>
            <SessionCard s={sessions[0]} open />
          </>
        )}
      </>
    )
  }

  return (
    <>
      {live.map((s) => (
        <LiveSession key={s.id} s={s} now={now} />
      ))}
    </>
  )
}

function LiveSession({ s, now }: { s: QuizSessionLog; now: number }) {
  const { right, wrong, pct } = sessionTally(s)
  const n = s.answers.length
  return (
    <>
      <div className="card" style={{ marginBottom: 10, borderColor: 'var(--red)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="chip" style={{ background: 'var(--red)', color: '#fff' }}>🔴 LIVE</span>
          <span className="muted" style={{ fontSize: 13 }}>{KIND_LABEL[s.kind]}</span>
        </div>
        <div style={{ fontWeight: 900, fontSize: 17, marginTop: 6 }}>{sessionTitle(s)}</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>
          {s.total > 0 ? `${n}/${s.total} answered` : `${n} answered`} · ✅ {right} · ❌ {wrong}
          {n > 0 ? ` · ${pct}%` : ''}
        </div>
      </div>

      {s.current ? (
        <div className="card" style={{ marginBottom: 10, borderColor: 'var(--gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span className="muted" style={{ fontSize: 12, fontWeight: 800 }}>ON HIS SCREEN NOW</span>
            <span style={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{seconds(now - Date.parse(s.current.shownAt))}</span>
          </div>
          <div style={{ fontWeight: 900, marginTop: 6, overflowWrap: 'anywhere' }}>{s.current.prompt}</div>
          <div className="muted" style={{ marginTop: 4, overflowWrap: 'anywhere' }}>Answer: {s.current.rightAnswer}</div>
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: 10 }}>Between questions…</p>
      )}

      {n > 0 && <div className="h2">Newest first</div>}
      {s.answers
        .map((a, i) => ({ a, i }))
        .reverse()
        .map(({ a, i }) => (
          <AnswerRow key={i} a={a} n={i + 1} />
        ))}
    </>
  )
}

// --- /watch/answers ----------------------------------------------------------

function AnswersPage() {
  const sessions = useSessions(200)
  if (!sessions) return <p className="muted">Loading his answers…</p>
  if (sessions.length === 0) {
    return <p className="muted">Nothing yet. Every quiz Ben sits from now on lands here, with what he answered.</p>
  }

  const days: { label: string; rows: QuizSessionLog[] }[] = []
  for (const s of sessions) {
    const label = dayLabel(s.startedAt)
    const last = days.at(-1)
    if (last?.label === label) last.rows.push(s)
    else days.push({ label, rows: [s] })
  }

  return (
    <>
      {days.map((d) => (
        <div key={d.label}>
          <div className="h2">{d.label}</div>
          {d.rows.map((s) => (
            <SessionCard key={s.id} s={s} />
          ))}
        </div>
      ))}
    </>
  )
}

// --- /watch/mistakes ---------------------------------------------------------

const ROW_CAP = 100
const MIN_TRIES = [1, 2, 3]

function MissBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--line)', marginTop: 6, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--red)' }} />
    </div>
  )
}

function MistakesPage() {
  const { kidData, quizBank } = useStore()
  const [view, setView] = useState<'questions' | 'quizzes'>('questions')
  const [topicId, setTopicId] = useState('all')
  const [minTries, setMinTries] = useState(2)

  const all = useMemo(() => missRows(quizBank, kidData?.quiz.stats ?? {}), [quizBank, kidData])
  const quizzes = useMemo(() => quizMissRows(all), [all])

  if (!kidData) return <p className="muted">Loading Ben’s log from the cloud…</p>
  if (all.length === 0) return <p className="muted">Ben hasn’t answered any questions yet.</p>

  const scoped = topicId === 'all' ? all : all.filter((r) => r.q.topicId === topicId)
  const overall = overallMiss(scoped)
  const rows = scoped.filter((r) => r.tries >= minTries && r.wrong > 0)
  const quizName = (id: string) => {
    const t = topicById(id)
    return t ? `${t.emoji} ${t.title}` : id
  }

  return (
    <>
      <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--red)' }}>{overall.pct}%</div>
        <div className="muted" style={{ fontWeight: 800 }}>
          wrong · {overall.wrong} of {overall.tries} answers{topicId === 'all' ? ', all quizzes' : ` in ${quizName(topicId)}`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['questions', 'quizzes'] as const).map((v) => (
          <button
            key={v}
            className={`btn btn--small ${view === v ? '' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { sfx.click(); setView(v) }}
          >
            {v === 'questions' ? 'By question' : 'By quiz'}
          </button>
        ))}
      </div>

      {view === 'quizzes' &&
        quizzes.map((t) => (
          <button
            key={t.topicId}
            className="card"
            style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
            onClick={() => { sfx.click(); setTopicId(t.topicId); setView('questions') }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 900 }}>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{quizName(t.topicId)}</span>
              <span style={{ color: 'var(--red)', flexShrink: 0 }}>{t.pct}%</span>
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {t.wrong} wrong of {t.tries} answers · {t.questions} questions asked
            </div>
            <MissBar pct={t.pct} />
          </button>
        ))}

      {view === 'questions' && (
        <>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            aria-label="Which quiz"
            style={{ width: '100%', padding: 10, borderRadius: 10, marginBottom: 10, fontSize: 16 }}
          >
            <option value="all">All quizzes</option>
            {quizzes.map((t) => (
              <option key={t.topicId} value={t.topicId}>
                {quizName(t.topicId)} · {t.pct}%
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: 13 }}>Asked at least</span>
            {MIN_TRIES.map((n) => (
              <button
                key={n}
                className={`btn btn--small ${minTries === n ? '' : 'btn--ghost'}`}
                style={{ width: 'auto', padding: '4px 12px' }}
                onClick={() => { sfx.click(); setMinTries(n) }}
              >
                {n}×
              </button>
            ))}
          </div>

          {rows.length === 0 && <p className="muted">No misses here at {minTries}× or more.</p>}
          {rows.slice(0, ROW_CAP).map((r) => (
            <MissQuestion key={r.q.id} r={r} showQuiz={topicId === 'all'} quizName={quizName} />
          ))}
          {rows.length > ROW_CAP && (
            <p className="muted" style={{ textAlign: 'center' }}>Showing the worst {ROW_CAP} of {rows.length}.</p>
          )}
        </>
      )}
    </>
  )
}

function MissQuestion({ r, showQuiz, quizName }: { r: MissRow; showQuiz: boolean; quizName: (id: string) => string }) {
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, fontWeight: 800, fontSize: 14 }}>
        <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{r.q.prompt}</span>
        <span style={{ fontWeight: 900, color: 'var(--red)', flexShrink: 0 }}>{r.pct}%</span>
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 4, overflowWrap: 'anywhere' }}>
        Answer: {correctAnswerText(r.q)}
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
        Wrong {r.wrong} of {r.tries}
        {showQuiz ? ` · ${quizName(r.q.topicId)}` : ''}
      </div>
      <MissBar pct={r.pct} />
    </div>
  )
}
