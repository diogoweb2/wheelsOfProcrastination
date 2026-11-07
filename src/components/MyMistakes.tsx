// §14g — 🎯 My mistakes (`/academy/mistakes`): the report Dad reads on
// 👀 Quiz Watch → Mistakes (§14e), handed to Ben with the answers on it.
//
// Same arithmetic, same order, same source (`quizReport.ts` over his lifetime
// `quiz.stats`), so the two pages can never disagree about what he is getting
// wrong. What is different is that this one answers the question it raises:
// every row opens onto the right answer, the map or the flag it was about, and
// the idea behind it. A list of the things he gets wrong with no way to find
// out the answer is a scoreboard, not a study page.
//
// The answers start hidden, one tap away — a page that hands them over before
// he has tried to remember is read, not studied — and 👀 opens all of them at
// once for when he just wants to read down the list.
import { useMemo, useState } from 'react'
import { correctAnswerText, topicById } from '../logic/quiz'
import { missRows, overallMiss, quizMissRows, type MissRow } from '../logic/quizReport'
import { MapBoard } from './MapBoard'
import { QuizMissHelp } from './QuizMissHelp'
import { canSpeak, speak } from '../lib/speak'
import { sfx } from '../audio'
import type { AppData, QuizQuestion } from '../types'

/** The worst this page will ever draw at once. */
const ROW_CAP = 100
/** How many times a question has to have been asked to count as a problem. */
const MIN_TRIES = [1, 2, 3]

function MissBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--line)', marginTop: 6, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--red)' }} />
    </div>
  )
}

const quizName = (id: string) => {
  const t = topicById(id)
  return t ? `${t.emoji} ${t.title}` : id
}

export function MyMistakes({
  bank,
  data,
  onTrain,
}: {
  bank: QuizQuestion[]
  data: AppData
  onTrain: (topicId: string) => void
}) {
  const [view, setView] = useState<'questions' | 'quizzes'>('questions')
  const [topicId, setTopicId] = useState('all')
  const [minTries, setMinTries] = useState(2)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showAll, setShowAll] = useState(false)

  const stats = data.quiz.stats
  const all = useMemo(() => missRows(bank, stats), [bank, stats])
  const quizzes = useMemo(() => quizMissRows(all), [all])
  const rate = data.steugene?.speak?.rate ?? 0.9

  if (all.length === 0) {
    return (
      <>
        <div className="h2" style={{ marginBottom: 2 }}>🎯 My mistakes</div>
        <p className="muted">Answer some quiz questions first — then this page shows you the ones you keep missing, with the right answers.</p>
      </>
    )
  }

  const scoped = topicId === 'all' ? all : all.filter((r) => r.q.topicId === topicId)
  const overall = overallMiss(scoped)
  const rows = scoped.filter((r) => r.tries >= minTries && r.wrong > 0)
  const where = topicId === 'all' ? 'in every quiz' : `in ${quizName(topicId)}`

  return (
    <>
      <div className="h2" style={{ marginBottom: 2 }}>🎯 My mistakes</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        The questions you get wrong most, worst first. Tap one to see the right answer.
      </p>

      <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--yellow)' }}>{rows.length}</div>
        <div className="muted" style={{ fontWeight: 800 }}>
          question{rows.length === 1 ? '' : 's'} to go over {where}
        </div>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          You’ve answered {overall.tries} and got <strong style={{ color: 'var(--green)' }}>{100 - overall.pct}%</strong> of them right.
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
            <option value="all">All my quizzes</option>
            {quizzes.map((t) => (
              <option key={t.topicId} value={t.topicId}>
                {quizName(t.topicId)} · {t.pct}%
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
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
            <button
              className={`btn btn--small ${showAll ? '' : 'btn--ghost'}`}
              style={{ width: 'auto', padding: '4px 12px', marginLeft: 'auto' }}
              onClick={() => { sfx.click(); setShowAll(!showAll) }}
            >
              👀 {showAll ? 'Hide answers' : 'Show answers'}
            </button>
          </div>

          {/* the whole point of knowing what you get wrong is a go at fixing it */}
          {topicId !== 'all' && (
            <button
              className="btn btn--small"
              style={{ marginBottom: 12 }}
              onClick={() => { sfx.click(); onTrain(topicId) }}
            >
              ⚔️ Train {quizName(topicId)}
            </button>
          )}

          {rows.length === 0 && (
            <p className="muted">
              Nothing wrong here at {minTries}× or more. 🎉
            </p>
          )}
          {rows.slice(0, ROW_CAP).map((r) => (
            <MissCard
              key={r.q.id}
              r={r}
              showQuiz={topicId === 'all'}
              open={showAll || !!open[r.q.id]}
              onToggle={() => { sfx.click(); setOpen((o) => ({ ...o, [r.q.id]: !o[r.q.id] })) }}
              rate={rate}
            />
          ))}
          {rows.length > ROW_CAP && (
            <p className="muted" style={{ textAlign: 'center' }}>Showing your worst {ROW_CAP} of {rows.length}.</p>
          )}
        </>
      )}
    </>
  )
}

function MissCard({
  r,
  showQuiz,
  open,
  onToggle,
  rate,
}: {
  r: MissRow
  showQuiz: boolean
  open: boolean
  onToggle: () => void
  rate: number
}) {
  const q = r.q
  const answer = correctAnswerText(q)
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', gap: 8, fontWeight: 800, fontSize: 14 }}>
          <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
            {q.emoji && <span style={{ marginRight: 6 }}>{q.emoji}</span>}
            {q.prompt}
          </span>
          <span style={{ fontWeight: 900, color: 'var(--red)', flexShrink: 0 }}>{r.pct}%</span>
        </div>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Wrong {r.wrong} of {r.tries}
          {showQuiz ? ` · ${quizName(q.topicId)}` : ''} · {open ? 'tap to hide' : 'tap for the answer'}
        </div>
        <MissBar pct={r.pct} />
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {q.image && <img className="quiz-illus" src={q.image} alt="" draggable={false} />}
          {q.bigEmoji && <div className="quiz-flag">{q.bigEmoji}</div>}
          {q.map && <MapBoard spec={q.map} reveal />}
          <div className="quiz-answer quiz-answer--right" style={{ marginTop: 10 }}>
            <div className="quiz-answer-label">Right answer</div>
            <div className="quiz-answer-text quiz-answer-text--big" style={{ overflowWrap: 'anywhere' }}>✅ {answer}</div>
          </div>
          {canSpeak() && (
            <button
              className="btn btn--ghost btn--small"
              style={{ width: 'auto', marginTop: 8 }}
              onClick={() => { sfx.click(); speak(`${q.prompt} ${answer}`, rate) }}
            >
              🔊 Read it to me
            </button>
          )}
          {q.funFact && (
            <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>💡 {q.funFact}</p>
          )}
          {/* §14d — the idea behind a chapter-quiz question, and its video */}
          <QuizMissHelp q={q} />
        </div>
      )}
    </div>
  )
}
