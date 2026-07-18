// The quiz player. Three modes:
//  - training:    Ben practices; instant feedback, fun facts, Berries (once/question/day, half after first mastery)
//  - simulation:  Ben rehearses a final test; result only at the end, no rewards
//  - official:    parent-launched final test; counts for the topic checkmark + Devil Fruit
import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { KID_ID } from '../store/storage'
import type { QuizQuestion, QuizStat, QuizTestRecord } from '../types'
import {
  PASS_PCT,
  activeQuestions,
  buildFinalTest,
  checkWrite,
  correctAnswerText,
  isFresh,
  lastOfficialAttempt,
  nextTestQuestion,
  pickTraining,
  shuffle,
  topicById,
} from '../logic/quiz'
import { sfx } from '../audio'

export type QuizMode = 'training' | 'simulation' | 'official'

const CHEERS = ['Nice one!', 'Gomu Gomu no… CORRECT!', 'Navigator-level answer!', 'Even Nami is impressed!', 'SUPER!!', 'That’s the spirit of adventure!']
const OOPS = ['Not this time…', 'Even Luffy misses sometimes!', 'The Log Pose slipped…', 'So close! Check this out:']

interface Props {
  mode: QuizMode
  topicId: string
  /** Whose data this session reads/writes: the active profile, or Ben when the admin runs his official test. */
  targetId: string
  /** The target profile's per-question stats. */
  stats: Record<string, QuizStat>
  /** Admin trying out the training UI: nothing is recorded, no Berries move. */
  preview?: boolean
  onClose: () => void
}

export function QuizSession({ mode, topicId, targetId, stats, preview = false, onClose }: Props) {
  const { quizBank, data, activeProfileId, kidData, recordQuizAnswer, finishQuizTest } = useStore()
  const topic = topicById(topicId)
  const pool = useMemo(() => activeQuestions(quizBank, topicId), [quizBank, topicId])

  // the target's data from wherever we stand, for retry-exclusion
  const target = activeProfileId === targetId ? data : targetId === KID_ID ? kidData : null

  // ---- test plan (fixed once per session) ----
  const [plan] = useState<QuizQuestion[]>(() => {
    if (mode === 'training') return []
    const exclude = mode === 'official' && target ? (lastOfficialAttempt(target, topicId)?.results.map((r) => r.qid) ?? []) : []
    return buildFinalTest(pool, stats, exclude).questions
  })

  const [results, setResults] = useState<{ qid: string; correct: boolean }[]>([])
  const [recent, setRecent] = useState<string[]>([]) // training: recently shown, to avoid instant repeats
  const [sessionEarned, setSessionEarned] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [feedback, setFeedback] = useState<{ correct: boolean; earned: number; q: QuizQuestion } | null>(null)
  const [finished, setFinished] = useState<QuizTestRecord | null>(null)
  const [current, setCurrent] = useState<QuizQuestion | null>(() =>
    mode === 'training' ? pickTraining(pool, stats, []) : null,
  )
  const startRef = useRef(Date.now())

  // ---- test: serve next question (mercy rule: no 3 misses in a row) ----
  const remaining = useMemo(() => plan.filter((q) => !results.some((r) => r.qid === q.id)), [plan, results])
  const testCurrent = useMemo(() => {
    if (mode === 'training' || remaining.length === 0) return null
    const lastTwoWrong = results.length >= 2 && !results[results.length - 1].correct && !results[results.length - 2].correct
    return nextTestQuestion(remaining, stats, lastTwoWrong)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, results, mode])

  const question = mode === 'training' ? current : testCurrent

  useEffect(() => {
    startRef.current = Date.now()
  }, [question?.id])

  // ---- test: finish when all answered ----
  useEffect(() => {
    if (mode !== 'training' && !preview && plan.length > 0 && results.length === plan.length && !finished) {
      const record = finishQuizTest(targetId, topicId, mode === 'official', results)
      setFinished(record)
      if (record.passed) {
        sfx.bigWin()
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } })
      } else {
        sfx.sad()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length])

  function submit(correct: boolean) {
    if (!question) return
    const timeMs = Date.now() - startRef.current
    const earned = preview ? 0 : recordQuizAnswer(targetId, question.id, correct, timeMs, mode === 'training')
    setAnswered((n) => n + 1)
    if (mode === 'training') {
      if (correct) {
        setSessionEarned((t) => t + earned)
        sfx.gem()
        if (earned > 0) confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, scalar: 0.8 })
      } else {
        sfx.error()
      }
      setFeedback({ correct, earned, q: question })
    } else {
      sfx.click()
      setResults((r) => [...r, { qid: question.id, correct }])
    }
  }

  function nextTraining() {
    if (!feedback) return
    const shown = [...recent, feedback.q.id]
    setRecent(shown)
    setFeedback(null)
    setCurrent(pickTraining(pool, stats, shown))
  }

  // ---- guards ----
  if (!topic || pool.length === 0) {
    return (
      <Full onClose={onClose} title="Quiz">
        <p className="muted">No questions in this topic yet. The crew is still writing them!</p>
      </Full>
    )
  }
  if (mode !== 'training' && plan.length === 0) {
    return (
      <Full onClose={onClose} title="Final Test">
        <p className="muted">Couldn’t build a test — the question bank looks empty.</p>
      </Full>
    )
  }

  // ---- results screen (tests) ----
  if (finished) {
    return <TestResults record={finished} plan={plan} mode={mode} onClose={onClose} />
  }

  const header =
    mode === 'training'
      ? preview
        ? `${topic.emoji} Training (preview — nothing saved)`
        : `${topic.emoji} Training · +🪙${sessionEarned}`
      : `${mode === 'official' ? '🎓 FINAL TEST' : '🧪 Test practice'} · ${results.length + 1}/${plan.length}`

  return (
    <Full onClose={onClose} title={header} confirmClose={mode !== 'training' && results.length > 0}>
      {mode !== 'training' && (
        <div className="quiz-progress">
          {plan.map((_, i) => (
            <div key={i} className={`quiz-progress-dot ${i < results.length ? 'done' : ''}`} />
          ))}
        </div>
      )}
      {mode === 'training' && (
        <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
          Answered {answered} · earn Berries for right answers (first time pays double!)
        </p>
      )}

      {question && !feedback && (
        <QuestionCard key={question.id} q={question} fresh={isFresh(question, stats[question.id])} onAnswer={submit} instantMark={mode === 'training'} />
      )}

      {/* training feedback */}
      {feedback && (
        <div className="card quiz-feedback" style={{ borderColor: feedback.correct ? 'var(--green)' : 'var(--red)' }}>
          <div style={{ fontSize: 44, textAlign: 'center' }}>{feedback.correct ? '🎉' : '🙈'}</div>
          <div style={{ fontWeight: 900, fontSize: 18, textAlign: 'center' }}>
            {feedback.correct ? CHEERS[Math.floor(Math.random() * CHEERS.length)] : OOPS[Math.floor(Math.random() * OOPS.length)]}
          </div>
          {feedback.correct ? (
            <p style={{ textAlign: 'center', marginTop: 6 }}>
              {preview ? (
                <span className="muted">Preview mode — no Berries, no stats touched.</span>
              ) : feedback.earned > 0 ? (
                <span style={{ color: 'var(--gold)', fontWeight: 900 }}>+{feedback.earned} 🪙</span>
              ) : (
                <span className="muted">Already earned Berries for this one today — come back tomorrow!</span>
              )}
            </p>
          ) : (
            <p style={{ textAlign: 'center', marginTop: 6 }}>
              Right answer: <b>{correctAnswerText(feedback.q)}</b>
            </p>
          )}
          {feedback.q.funFact && (
            <p className="muted" style={{ fontSize: 13, marginTop: 10, textAlign: 'center' }}>
              💡 {feedback.q.funFact}
            </p>
          )}
          <button className="btn" style={{ marginTop: 12 }} onClick={nextTraining}>
            Next question ➜
          </button>
          <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={onClose}>
            {preview ? 'Done previewing' : `Done for now (+🪙${sessionEarned})`}
          </button>
        </div>
      )}

      {/* neutral test acknowledgement is implicit: next question just appears */}
    </Full>
  )
}

// --- results ---------------------------------------------------------------

function TestResults({ record, plan, mode, onClose }: { record: QuizTestRecord; plan: QuizQuestion[]; mode: QuizMode; onClose: () => void }) {
  const byId = new Map(plan.map((q) => [q.id, q]))
  const right = record.results.filter((r) => r.correct).length
  return (
    <Full onClose={onClose} title={mode === 'official' ? '🎓 Final Test — result' : '🧪 Practice — result'}>
      <div className="card" style={{ textAlign: 'center', marginBottom: 14, borderColor: record.passed ? 'var(--green)' : 'var(--orange)' }}>
        <div style={{ fontSize: 56 }}>{record.passed ? '🏴‍☠️' : '⛈️'}</div>
        <div style={{ fontSize: 44, fontWeight: 900, color: record.passed ? 'var(--green)' : 'var(--orange)' }}>{record.scorePct}%</div>
        <div className="muted" style={{ fontWeight: 800 }}>
          {right}/{record.results.length} correct · pass mark {PASS_PCT}%
        </div>
        <p style={{ marginTop: 10, fontWeight: 800 }}>
          {record.passed
            ? mode === 'official'
              ? 'PASSED! The topic is conquered — check your treasure! 🍇'
              : 'You would PASS the real one. Tell Dad you’re ready! 💪'
            : mode === 'official'
              ? 'Not this time — train a bit more and try again another day. Luffy lost to Crocodile twice, remember?'
              : 'Almost! A little more training and the flag is yours.'}
        </p>
      </div>

      <div className="h2">📋 Review — where the points escaped</div>
      {record.results.map((r) => {
        const q = byId.get(r.qid)
        if (!q) return null
        return (
          <div key={r.qid} className="card" style={{ marginBottom: 8, borderColor: r.correct ? 'var(--line)' : 'var(--red)', opacity: r.correct ? 0.75 : 1 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ fontSize: 18 }}>{r.correct ? '✅' : '❌'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{q.emoji} {q.prompt}</div>
                {!r.correct && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    Right answer: <b style={{ color: 'var(--green)' }}>{correctAnswerText(q)}</b>
                  </div>
                )}
                {!r.correct && q.funFact && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>💡 {q.funFact}</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <button className="btn" style={{ marginTop: 10 }} onClick={onClose}>
        Back to the Academy
      </button>
    </Full>
  )
}

// --- question renderers ----------------------------------------------------

function QuestionCard({ q, fresh, onAnswer, instantMark }: { q: QuizQuestion; fresh?: boolean; onAnswer: (correct: boolean) => void; instantMark: boolean }) {
  return (
    <div className="card">
      {fresh && (
        <span className="chip" style={{ background: 'var(--green)', color: '#06121f', marginBottom: 8, display: 'inline-block' }}>
          ✨ NEW
        </span>
      )}
      <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 10 }}>
        {q.emoji && <span style={{ marginRight: 6 }}>{q.emoji}</span>}
        {q.prompt}
      </div>
      {q.image && (
        <img
          src={q.image}
          alt="question illustration"
          draggable={false}
          style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 10, background: '#ffffff10', padding: 8, marginBottom: 12 }}
        />
      )}
      {q.type === 'choice' && <ChoiceQ q={q} onAnswer={onAnswer} instantMark={instantMark} />}
      {q.type === 'write' && <WriteQ q={q} onAnswer={onAnswer} />}
      {q.type === 'match' && <MatchQ q={q} onAnswer={onAnswer} />}
      {q.type === 'order' && <OrderQ q={q} onAnswer={onAnswer} />}
    </div>
  )
}

function ChoiceQ({ q, onAnswer, instantMark }: { q: QuizQuestion; onAnswer: (c: boolean) => void; instantMark: boolean }) {
  const options = useMemo(() => shuffle(q.choices ?? []), [q.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {options.map((opt) => {
        const isPicked = picked === opt
        const mark = instantMark && isPicked // brief color flash before feedback card takes over
        return (
          <button
            key={opt}
            className="quiz-opt"
            disabled={picked !== null}
            style={mark ? { borderColor: opt === q.answer ? 'var(--green)' : 'var(--red)' } : undefined}
            onClick={() => {
              setPicked(opt)
              window.setTimeout(() => onAnswer(opt === q.answer), instantMark ? 250 : 120)
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function WriteQ({ q, onAnswer }: { q: QuizQuestion; onAnswer: (c: boolean) => void }) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  function go() {
    if (done || !text.trim()) return
    setDone(true)
    onAnswer(checkWrite(q, text))
  }
  return (
    <div>
      <input
        type="text"
        value={text}
        autoFocus
        placeholder="Type your answer…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid var(--line)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 16, fontWeight: 700 }}
      />
      <button className="btn" style={{ marginTop: 10 }} disabled={!text.trim() || done} onClick={go}>
        Lock it in ⚓
      </button>
      <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Spelling small stuff (accents, capitals) doesn’t count against you.</p>
    </div>
  )
}

const PAIR_COLORS = ['#ffce00', '#60bff5', '#7ce87c', '#ff9bd0', '#ffa04d', '#b39dff']

function MatchQ({ q, onAnswer }: { q: QuizQuestion; onAnswer: (c: boolean) => void }) {
  const pairs = q.pairs ?? []
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), [q.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<string | null>(null) // selected left
  const [map, setMap] = useState<Record<string, string>>({}) // left → right
  const [done, setDone] = useState(false)

  const colorOf = (left: string) => PAIR_COLORS[pairs.findIndex((p) => p.left === left) % PAIR_COLORS.length]
  const usedRights = new Set(Object.values(map))
  const complete = Object.keys(map).length === pairs.length

  function tapLeft(left: string) {
    sfx.click()
    if (map[left]) {
      const m = { ...map }
      delete m[left]
      setMap(m)
    }
    setSel(left)
  }
  function tapRight(right: string) {
    if (!sel) return
    sfx.click()
    const m = { ...map }
    for (const k of Object.keys(m)) if (m[k] === right) delete m[k]
    m[sel] = right
    setMap(m)
    setSel(null)
  }
  function check() {
    if (done) return
    setDone(true)
    onAnswer(pairs.every((p) => map[p.left] === p.right))
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Tap one on the left, then its partner on the right.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          {pairs.map((p) => (
            <button
              key={p.left}
              className="quiz-opt quiz-opt--small"
              style={{
                borderColor: sel === p.left ? 'var(--yellow)' : map[p.left] ? colorOf(p.left) : 'var(--line)',
                boxShadow: sel === p.left ? '0 0 0 2px var(--yellow)' : undefined,
              }}
              onClick={() => tapLeft(p.left)}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          {rights.map((r) => {
            const owner = Object.keys(map).find((k) => map[k] === r)
            return (
              <button
                key={r}
                className="quiz-opt quiz-opt--small"
                style={{ borderColor: owner ? colorOf(owner) : 'var(--line)', opacity: usedRights.has(r) && !owner ? 0.5 : 1 }}
                onClick={() => tapRight(r)}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>
      <button className="btn" style={{ marginTop: 12 }} disabled={!complete || done} onClick={check}>
        {complete ? 'Check my matches ⚓' : `Match all ${pairs.length} first…`}
      </button>
    </div>
  )
}

function OrderQ({ q, onAnswer }: { q: QuizQuestion; onAnswer: (c: boolean) => void }) {
  const items = useMemo(() => shuffle(q.sequence ?? []), [q.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [chosen, setChosen] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const complete = chosen.length === items.length

  function tap(item: string) {
    if (chosen.includes(item) || done) return
    sfx.click()
    setChosen([...chosen, item])
  }
  function check() {
    if (done) return
    setDone(true)
    onAnswer((q.sequence ?? []).every((s, i) => chosen[i] === s))
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Tap them in order — numbers show your sequence.</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((item) => {
          const idx = chosen.indexOf(item)
          return (
            <button key={item} className="quiz-opt quiz-opt--small" style={{ borderColor: idx >= 0 ? 'var(--yellow)' : 'var(--line)' }} onClick={() => tap(item)}>
              {idx >= 0 && <span className="quiz-order-num">{idx + 1}</span>}
              {item}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn--ghost btn--small" onClick={() => { sfx.click(); setChosen([]) }} disabled={chosen.length === 0 || done}>
          ↺ Reset
        </button>
        <button className="btn btn--small" style={{ flex: 1 }} disabled={!complete || done} onClick={check}>
          {complete ? 'Check the order ⚓' : 'Keep tapping…'}
        </button>
      </div>
    </div>
  )
}

// --- full-screen shell -----------------------------------------------------

function Full({ title, onClose, confirmClose, children }: { title: string; onClose: () => void; confirmClose?: boolean; children: React.ReactNode }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="quiz-full">
      <div className="quiz-full-head">
        <div style={{ fontWeight: 900, flex: 1, fontSize: 15 }}>{title}</div>
        <button
          className="btn btn--ghost btn--small"
          onClick={() => {
            if (confirmClose && !confirming) {
              setConfirming(true)
              window.setTimeout(() => setConfirming(false), 2500)
              return
            }
            onClose()
          }}
        >
          {confirming ? 'Quit test?!' : '✕'}
        </button>
      </div>
      <div className="quiz-full-body">{children}</div>
    </div>
  )
}
