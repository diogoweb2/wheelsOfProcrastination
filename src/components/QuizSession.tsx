// The quiz player. Four modes:
//  - training:    Ben practices; instant feedback, fun facts, Berries (once/question/day, half after first mastery)
//  - simulation:  Ben rehearses a final test; result only at the end, no rewards
//  - official:    parent-launched final test; counts for the topic checkmark + Devil Fruit
//  - warmup:      Ben rehearses the WARM-UP ROUND alone (§14c), across every sea he has conquered
//
// An official test on someone who has already conquered topics opens with a
// WARM-UP REVIEW ROUND on that old material (see buildReviewTest): shorter,
// 70% to pass, and a miss ends the run before the new topic is ever sat — the
// point is that conquered seas stay fresh instead of fading away.
//
// `warmup` mode is that same round with no test behind it: same pool, same
// length, same pass mark, nothing at stake, and — unlike the gating round — it
// shows him every answer afterwards, because practice that hides the answer
// teaches nothing.
//
// A topic with a FIRST GOAL (§14f) trains in rounds: only those questions, up to
// ten at a time, until each has been right twice running. Then the rest opens.
import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { KID_ID } from '../store/storage'
import type { QuizQuestion, QuizStat, QuizTestRecord } from '../types'
import {
  DRILL_ROUND,
  FIRST_GOAL_STREAK,
  PASS_PCT,
  REVIEW_PASS_PCT,
  activeQuestions,
  buildReviewTest,
  buildTopicTest,
  correctAnswerText,
  firstGoalGaps,
  firstGoalProgress,
  gradeWrite,
  isFresh,
  lastOfficialAttempt,
  lastReviewAttempt,
  nextTestQuestion,
  pickChoiceOptions,
  pickTraining,
  reviewBreakdown,
  reviewTopicIds,
  sessionPool,
  shuffle,
  topicById,
  warmupAttempts,
  warmupTopicIds,
} from '../logic/quiz'
import { sfx } from '../audio'
import { lessonById } from '../quiz/lessons'
import { canSpeak, speak, stopSpeaking } from '../lib/speak'
import { LessonView } from './Lesson'
import { SeLessonButton } from './SeLessonButton'
import { QuizMissHelp } from './QuizMissHelp'
import { useQuizSessionLog } from './useQuizSessionLog'
import { holdFreshen } from '../lib/fresh'
import { MapBoard } from './MapBoard'
import { MAP_NAMES } from '../quiz/maps/names'

export type QuizMode = 'training' | 'simulation' | 'official' | 'warmup'

/** §14f — one round of first-goal drilling. */
const roundOf = (gaps: QuizQuestion[]): string[] => gaps.slice(0, DRILL_ROUND).map((q) => q.id)

/** What the player actually gave, so feedback can show it back to them. */
export interface Given {
  /** Their answer, rendered as text. Absent when there's nothing meaningful to echo. */
  text?: string
  /** Right answer, but misspelled — full points, gentle spelling nudge. */
  nearMiss?: boolean
  /** §14e — a match or order answer, spelled out for Dad's report. Kept apart from `text` so Ben's feedback card stays as it was. */
  logged?: string
  /** §14f — what he tapped on the map, so the correction can show it in red. */
  tapped?: string[]
}

interface Props {
  mode: QuizMode
  /** The topic being trained or tested. In `warmup` mode it is `WARMUP_TOPIC_ID`: the round spans every conquered sea, so no one topic owns it. */
  topicId: string
  /** Whose data this session reads/writes: the active profile, or Ben when the admin runs his official test. */
  targetId: string
  /** The target profile's per-question stats. */
  stats: Record<string, QuizStat>
  /** Admin trying out the training UI: nothing is recorded, no Berries move. */
  preview?: boolean
  /** Remote-authorised official test (see FinalTestAuth): the result is reported back to Dad's desk. */
  authId?: string
  onClose: () => void
}

export function QuizSession({ mode, topicId, targetId, stats, preview = false, authId, onClose }: Props) {
  const { quizBank, data, activeProfileId, kidData, recordQuizAnswer, finishQuizTest, finishReviewTest, finishWarmupTest } = useStore()
  const isWarmup = mode === 'warmup'
  const topic = topicById(topicId)
  const pool = useMemo(() => activeQuestions(quizBank, topicId), [quizBank, topicId])

  // the target's data from wherever we stand, for retry-exclusion
  const target = activeProfileId === targetId ? data : targetId === KID_ID ? kidData : null

  // ---- test plan (fixed once per session) ----
  const [testPlan] = useState<QuizQuestion[]>(() => {
    if (mode === 'training') return []
    // §14c — a standalone warm-up is the gating round with no test behind it:
    // the same builder over every conquered sea, minus last rehearsal's
    // questions, so running it twice in a row is two different rounds.
    if (isWarmup) {
      if (!target) return []
      const exclude = warmupAttempts(target).at(-1)?.results.map((r) => r.qid) ?? []
      return buildReviewTest(quizBank, stats, warmupTopicIds(target, targetId, quizBank), exclude)
    }
    const exclude = mode === 'official' && target ? (lastOfficialAttempt(target, topicId)?.results.map((r) => r.qid) ?? []) : []
    return buildTopicTest(topic, pool, stats, exclude)
  })

  // ---- warm-up review round on the topics he already conquered ----
  const [reviewPlan] = useState<QuizQuestion[]>(() => {
    if (mode !== 'official' || !target || preview) return []
    const topics = reviewTopicIds(target, targetId, topicId)
    const exclude = lastReviewAttempt(target, topicId)?.results.map((r) => r.qid) ?? []
    return buildReviewTest(quizBank, stats, topics, exclude)
  })
  const [stage, setStage] = useState<'review' | 'review-passed' | 'review-failed' | 'test'>(
    () => (reviewPlan.length > 0 ? 'review' : 'test'),
  )
  const [reviewRecord, setReviewRecord] = useState<QuizTestRecord | null>(null)
  // the review results stay paired with the review plan until he moves on
  const plan = stage === 'test' ? testPlan : reviewPlan

  const [results, setResults] = useState<{ qid: string; correct: boolean }[]>([])
  const [recent, setRecent] = useState<string[]>([]) // training: recently shown, to avoid instant repeats
  const [sessionCorrect, setSessionCorrect] = useState<string[]>([]) // training: answered right this session — never re-asked today's run
  const [sessionMissed, setSessionMissed] = useState<string[]>([]) // training: missed this session — retried as another version of the idea when there is one (§14d)
  const [trainingDone, setTrainingDone] = useState(false) // training: whole topic cleared this session
  const [sessionEarned, setSessionEarned] = useState(0)
  const [answered, setAnswered] = useState(0)
  // training: wrong answers pause on a correction card; right answers just flow on
  const [feedback, setFeedback] = useState<{ q: QuizQuestion; given: Given } | null>(null)
  const [flash, setFlash] = useState<{ text: string; muted: boolean; key: number } | null>(null)
  // the deep-dive lesson currently being read (opened from a wrong answer, or from the test review)
  const [reading, setReading] = useState<{ lessonId: string; then: 'advance' | 'back' } | null>(null)
  const [finished, setFinished] = useState<QuizTestRecord | null>(null)
  // training: true once he opts to keep practising past the spaced-repetition rest
  const [ignoreRest, setIgnoreRest] = useState(false)
  // §14f — the round of first-goal questions being drilled; empty once there are none left to learn.
  // A preview saves nothing, so a round could never end: Dad just sees the whole bank.
  const [drill, setDrill] = useState<string[]>(() =>
    mode === 'training' && !preview && topic?.firstGoal ? roundOf(firstGoalGaps(pool, stats)) : [],
  )
  const [drillEnded, setDrillEnded] = useState(false) // training: round over, between rounds
  const trainPool = useMemo(() => (drill.length > 0 ? pool.filter((q) => drill.includes(q.id)) : pool), [pool, drill])
  const [current, setCurrent] = useState<QuizQuestion | null>(() =>
    mode === 'training' ? pickTraining(trainPool, stats, [], drill.length > 0) : null,
  )
  const startRef = useRef(Date.now())

  // ---- test: serve next question (mercy rule: no 3 misses in a row) ----
  const remaining = useMemo(() => plan.filter((q) => !results.some((r) => r.qid === q.id)), [plan, results])
  const testCurrent = useMemo(() => {
    if (mode === 'training' || remaining.length === 0) return null
    const lastThreeWrong = results.length >= 3 && results.slice(-3).every((r) => !r.correct)
    return nextTestQuestion(remaining, stats, lastThreeWrong, !!topic?.firstGoal?.everyInTest)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, results, mode])

  const question = mode === 'training' ? current : testCurrent

  // §14e — Dad's live view and his report. Only Ben's sittings, never a preview.
  const log = useQuizSessionLog({
    enabled: targetId === KID_ID && !preview,
    targetId,
    topicId,
    kind: stage === 'review' ? 'review' : mode,
    total: mode === 'training' ? 0 : plan.length,
  })

  // A new build must not land in the middle of a sitting (src/lib/fresh.ts):
  // the reload would cost him the attempt. It is taken the moment he is out.
  useEffect(() => holdFreshen(), [])

  useEffect(() => {
    startRef.current = Date.now()
  }, [question?.id])

  useEffect(() => {
    if (question && !feedback) log.showing(question)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, feedback])

  // ---- test: finish when all answered ----
  useEffect(() => {
    if (mode === 'training' || preview || plan.length === 0 || results.length !== plan.length || finished) return

    // the warm-up round grades itself first — a fail stops the run here
    if (stage === 'review') {
      const record = finishReviewTest(targetId, topicId, results, authId)
      log.finish(record)
      setReviewRecord(record)
      setStage(record.passed ? 'review-passed' : 'review-failed')
      if (record.passed) sfx.gem()
      else sfx.sad()
      return
    }

    {
      const record = isWarmup
        ? finishWarmupTest(targetId, results)
        : finishQuizTest(targetId, topicId, mode === 'official', results, authId)
      log.finish(record)
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

  function advanceTraining(q: QuizQuestion, correctIds: string[], missedIds: string[] = sessionMissed) {
    // questions answered RIGHT this session don't come back (nor, §14d, do the
    // other versions of the same idea); wrong ones return, as another version
    // when the idea has one
    const remainingPool = sessionPool(trainPool, correctIds, missedIds)
    setFeedback(null)
    const shown = [...recent, q.id]
    // §14f — a first-goal round is a drill: it does not wait for a question's rest
    const next = pickTraining(remainingPool, stats, shown, ignoreRest || drill.length > 0, missedIds, pool)
    if (!next && drill.length > 0) {
      sfx.gem()
      setDrillEnded(true)
      return
    }
    if (!next) {
      // nothing left that's due today — the topic is clear (for now)
      setTrainingDone(true)
      sfx.bigWin()
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } })
      return
    }
    setRecent(shown)
    setCurrent(next)
  }

  /** §14f — the next round: what he still does not know, up to ten of it. */
  function nextRound() {
    sfx.click()
    const ids = roundOf(firstGoalGaps(pool, stats))
    setDrill(ids)
    setSessionCorrect([])
    setSessionMissed([])
    setRecent([])
    setDrillEnded(false)
    setCurrent(pickTraining(pool.filter((q) => ids.includes(q.id)), stats, [], true))
  }

  /** §14f — first goal met: the rest of the topic, still in this sitting. */
  function openTheRest() {
    sfx.click()
    const next = pickTraining(sessionPool(pool, sessionCorrect, sessionMissed), stats, [], ignoreRest, sessionMissed, pool)
    setDrill([])
    setDrillEnded(false)
    if (next) setCurrent(next)
    else setTrainingDone(true)
  }

  /** "Practice anyway" from the caught-up screen: drop the rest filter and keep going. */
  function practiceAnyway() {
    const next = pickTraining(sessionPool(pool, sessionCorrect, sessionMissed), stats, recent, true, sessionMissed, pool)
    if (!next) return
    setIgnoreRest(true)
    setTrainingDone(false)
    setCurrent(next)
  }

  function submit(correct: boolean, given: Given = {}) {
    if (!question) return
    const timeMs = Date.now() - startRef.current
    const earned = preview ? 0 : recordQuizAnswer(targetId, question.id, correct, timeMs, mode === 'training')
    log.answered(question, correct, given, timeMs)
    setAnswered((n) => n + 1)
    if (mode === 'training') {
      if (correct) {
        // no modal — the store animates the berries to the topbar; next question slides in
        setSessionEarned((t) => t + earned)
        sfx.gem()
        // a misspelled-but-right answer still pays, it just gets the spelling shown
        const base = preview ? '✓ Correct (preview)' : earned > 0 ? `+${earned} 🪙` : '✓ Correct — already earned today'
        setFlash({
          text: given.nearMiss ? `${base} · almost! it's “${correctAnswerText(question)}”` : base,
          muted: earned === 0,
          key: Date.now(),
        })
        const q = question
        const correctIds = [...sessionCorrect, q.id]
        setSessionCorrect(correctIds)
        window.setTimeout(() => advanceTraining(q, correctIds), 350)
      } else {
        sfx.error()
        setSessionMissed((m) => (m.includes(question.id) ? m : [...m, question.id]))
        setFeedback({ q: question, given })
      }
    } else {
      sfx.click()
      setResults((r) => [...r, { qid: question.id, correct }])
    }
  }

  // ---- guards ----
  // a warm-up belongs to no single topic, so neither guard below applies to it
  if (!isWarmup && (!topic || pool.length === 0)) {
    return (
      <Full onClose={onClose} title="Quiz">
        <p className="muted">No questions in this topic yet. The crew is still writing them!</p>
      </Full>
    )
  }
  if (mode !== 'training' && plan.length === 0) {
    return (
      <Full onClose={onClose} title={isWarmup ? '🧠 Warm-up rehearsal' : 'Final Test'}>
        <p className="muted">
          {isWarmup
            ? 'Nothing to warm up on yet — conquer a sea in a final test and it starts coming back here.'
            : 'Couldn’t build a test — the question bank looks empty.'}
        </p>
      </Full>
    )
  }

  // ---- the deep-dive lesson takes over the whole screen ----
  const readingLesson = lessonById(reading?.lessonId)
  if (reading && readingLesson) {
    return (
      <LessonView
        lesson={readingLesson}
        doneLabel={reading.then === 'advance' ? 'Got it — next question ➜' : 'Back to the review ➜'}
        onDone={() => {
          setReading(null)
          if (reading.then === 'advance' && feedback) advanceTraining(feedback.q, sessionCorrect)
        }}
      />
    )
  }

  // Below here `topic` is set for every mode but the §14c warm-up, which spans
  // every conquered sea and so belongs to no single one.
  const topicTitle = topic?.title ?? 'the old seas'
  const topicEmoji = topic?.emoji ?? '🧠'

  // ---- warm-up review verdict ----
  if (stage === 'review-passed' && reviewRecord) {
    return (
      <Full onClose={onClose} title="🧠 Warm-up review — cleared">
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--green)' }}>
          <div style={{ fontSize: 56 }}>🧠⚡</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--green)' }}>{reviewRecord.scorePct}%</div>
          <div className="muted" style={{ fontWeight: 800 }}>
            old seas still yours · pass mark {REVIEW_PASS_PCT}%
          </div>
          <p style={{ marginTop: 10, fontWeight: 800 }}>
            Memory intact! Now the new sea — pass mark {PASS_PCT}%, {testPlan.length} questions.
          </p>
          <button
            className="btn"
            style={{ marginTop: 14 }}
            onClick={() => {
              sfx.click()
              setResults([])
              setStage('test')
            }}
          >
            ⚔️ Start the {topicTitle} final test
          </button>
        </div>
      </Full>
    )
  }

  if (stage === 'review-failed' && reviewRecord) {
    return <ReviewFailed record={reviewRecord} bank={quizBank} topicTitle={topicTitle} onClose={onClose} />
  }

  // ---- results screen (tests) ----
  if (finished) {
    return (
      <TestResults
        record={finished}
        plan={plan}
        mode={mode}
        bank={quizBank}
        onClose={onClose}
        onRead={(id) => setReading({ lessonId: id, then: 'back' })}
      />
    )
  }

  // ---- training: a first-goal round just ended ----
  if (mode === 'training' && drillEnded && topic?.firstGoal) {
    const { one, many } = topic.firstGoal
    const { known, total } = firstGoalProgress(pool, stats)
    const done = known === total
    return (
      <Full onClose={onClose} title={`${topicEmoji} Training · +🪙${sessionEarned}`}>
        <div className="card quiz-feedback" style={{ textAlign: 'center', borderColor: done ? 'var(--green)' : 'var(--gold)' }}>
          <div style={{ fontSize: 56 }}>{done ? '🏆' : '🗺️'}</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>
            {done ? `ALL ${total} ${many.toUpperCase()} LOCKED IN!` : `${known} of ${total} ${many} locked in`}
          </div>
          <div className="quiz-bar" style={{ marginTop: 10 }}>
            <div className="quiz-bar-fill" style={{ width: `${Math.round((known / total) * 100)}%` }} />
          </div>
          <p style={{ marginTop: 10, fontWeight: 800 }}>
            {done
              ? 'First goal done. The rest of this quiz is open!'
              : `A ${one} locks in when you get it right ${FIRST_GOAL_STREAK} times in a row. The rest of the quiz opens when all ${total} are in.`}
          </p>
          <button className="btn" style={{ marginTop: 14 }} onClick={done ? openTheRest : nextRound}>
            {done ? 'Keep going ➜' : 'Next round ➜'}
          </button>
          <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={onClose}>
            {`Done for now (+🪙${sessionEarned})`}
          </button>
        </div>
      </Full>
    )
  }

  // ---- training: nothing due (cleared this session, or all resting) ----
  if (mode === 'training' && (trainingDone || !current)) {
    return (
      <Full onClose={onClose} title={`${topicEmoji} Training`}>
        <div className="card quiz-feedback" style={{ textAlign: 'center', borderColor: 'var(--gold)' }}>
          <div style={{ fontSize: 56 }}>🍖😴</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>NICE WORK, PIRATE!</div>
          <p style={{ marginTop: 8, fontWeight: 800 }}>
            {trainingDone
              ? 'You conquered every question on this sea! Even Luffy takes a nap after a great feast — give that brain a rest.'
              : 'All caught up! Every question here is resting — they come back later so you remember them for good.'}
          </p>
          {!preview && (
            <p style={{ marginTop: 8 }}>
              <span style={{ color: 'var(--gold)', fontWeight: 900 }}>+🪙{sessionEarned}</span>{' '}
              <span className="muted">earned this voyage.</span>
            </p>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Questions you nail rest a few days before returning; ones you miss come straight back. Repeats pay half Berries.
          </p>
          <button className="btn" style={{ marginTop: 14 }} onClick={onClose}>
            ⚓ Back to the ship
          </button>
          <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={practiceAnyway}>
            💪 Practice anyway
          </button>
        </div>
      </Full>
    )
  }

  const header =
    mode === 'training'
      ? preview
        ? `${topicEmoji} Training (preview — nothing saved)`
        : `${topicEmoji} Training · +🪙${sessionEarned}`
      : stage === 'review'
        ? `🧠 Warm-up review · ${results.length + 1}/${plan.length}`
        : isWarmup
          ? `🧠 Mock Warm-up · ${results.length + 1}/${plan.length}`
          : `${mode === 'official' ? '🎓 FINAL TEST' : '🧪 Mock Final Test'} · ${results.length + 1}/${plan.length}`

  return (
    <Full onClose={onClose} title={header} confirmClose={mode !== 'training' && results.length > 0}>
      {mode !== 'training' && (
        <div className="quiz-progress">
          {plan.map((_, i) => (
            <div key={i} className={`quiz-progress-dot ${i < results.length ? 'done' : ''}`} />
          ))}
        </div>
      )}
      {stage === 'review' && (
        <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
          Seas you already conquered — clear {REVIEW_PASS_PCT}% of these and the {topicTitle} final test opens.
        </p>
      )}
      {isWarmup && (
        <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
          Every sea you have conquered, mixed together. Nothing at stake — {REVIEW_PASS_PCT}% is what the real warm-up
          will want.
        </p>
      )}
      {mode === 'training' && drill.length === 0 && (
        <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
          Answered {answered} · earn Berries for right answers (first time pays double!)
        </p>
      )}
      {mode === 'training' && drill.length > 0 && topic?.firstGoal && (
        <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
          🎯 First goal: {firstGoalProgress(pool, stats).known} of {firstGoalProgress(pool, stats).total}{' '}
          {topic.firstGoal.many} locked in
        </p>
      )}
      {mode !== 'training' && stage === 'test' && topic?.firstGoal?.everyInTest && question && (
        <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
          {question.firstGoal
            ? `Part 1 — every ${topic.firstGoal.one}, one by one.`
            : 'Part 2 — everything else.'}
        </p>
      )}

      {question && !feedback && (
        <QuestionCard key={question.id} q={question} fresh={isFresh(question, stats[question.id])} onAnswer={submit} instantMark={mode === 'training'} />
      )}

      {/* training: only WRONG answers pause the flow, so the right answer sinks in */}
      {feedback && (
        <div className="card quiz-feedback" style={{ borderColor: 'var(--red)' }}>
          {feedback.given.text && (
            <div className="quiz-answer quiz-answer--wrong">
              <div className="quiz-answer-label">You said</div>
              <div className="quiz-answer-text">❌ {feedback.given.text}</div>
            </div>
          )}
          <div className="quiz-answer quiz-answer--right">
            <div className="quiz-answer-label">Right answer</div>
            <div className="quiz-answer-text quiz-answer-text--big">✅ {correctAnswerText(feedback.q)}</div>
          </div>
          {feedback.q.map && (
            <div style={{ marginTop: 10 }}>
              <MapBoard spec={feedback.q.map} reveal wrong={feedback.given.tapped} />
            </div>
          )}
          {feedback.q.funFact && (
            <p className="muted" style={{ fontSize: 13, marginTop: 10, textAlign: 'center' }}>
              💡 {feedback.q.funFact}
            </p>
          )}
          {/* a miss is the best moment to actually learn the thing — offer the long version */}
          {(() => {
            const lesson = lessonById(feedback.q.lessonId)
            if (!lesson) return null
            return (
              <button
                className="btn btn--blue"
                style={{ marginTop: 12 }}
                onClick={() => { sfx.click(); setReading({ lessonId: lesson.id, then: 'advance' }) }}
              >
                📖 Explain this properly · {lesson.minutes} min
              </button>
            )
          })()}
          {/* §14d — a chapter quiz's miss teaches: the idea in a few lines, and a video */}
          <QuizMissHelp q={feedback.q} />
          <SeLessonButton subtopicId={feedback.q.seSubtopic} />
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={() =>
              advanceTraining(
                feedback.q,
                sessionCorrect,
                sessionMissed.includes(feedback.q.id) ? sessionMissed : [...sessionMissed, feedback.q.id],
              )
            }
          >
            Next question ➜
          </button>
          <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={onClose}>
            {preview ? 'Done previewing' : `Done for now (+🪙${sessionEarned})`}
          </button>
        </div>
      )}

      {/* non-blocking result flash (training correct answers) */}
      {flash && (
        <div key={flash.key} className={`quiz-flash ${flash.muted ? 'quiz-flash--muted' : ''}`}>
          {flash.text}
        </div>
      )}

      {/* neutral test acknowledgement is implicit: next question just appears */}
    </Full>
  )
}

// --- warm-up review: the failure report ------------------------------------

/**
 * A missed warm-up shows NO answers on purpose — the material has to be earned
 * back from his own studying, not read off a review card. All he gets is which
 * seas leaked, weakest first.
 */
function ReviewFailed({ record, bank, topicTitle, onClose }: { record: QuizTestRecord; bank: QuizQuestion[]; topicTitle: string; onClose: () => void }) {
  const rows = reviewBreakdown(bank, record.results)
  return (
    <Full onClose={onClose} title="🧠 Warm-up review — result">
      <div className="card" style={{ textAlign: 'center', marginBottom: 14, borderColor: 'var(--orange)' }}>
        <div style={{ fontSize: 56 }}>🌫️</div>
        <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--orange)' }}>{record.scorePct}%</div>
        <div className="muted" style={{ fontWeight: 800 }}>warm-up pass mark {REVIEW_PASS_PCT}%</div>
        <p style={{ marginTop: 10, fontWeight: 800 }}>
          Some old seas went foggy, so the {topicTitle} final test stays shut this time. Sail them again in Training and
          come back — no answers here, that part is on you. 💪
        </p>
      </div>

      <div className="h2">🗺️ Where the fog is</div>
      {rows.map((r) => {
        const t = topicById(r.topicId)
        const pct = Math.round((r.right / r.total) * 100)
        const ok = pct >= REVIEW_PASS_PCT
        return (
          <div key={r.topicId} className="card" style={{ marginBottom: 8, borderColor: ok ? 'var(--green)' : 'var(--red)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 22 }}>{t?.emoji ?? '📘'}</div>
              <div style={{ flex: 1, fontWeight: 900, fontSize: 15 }}>{t?.title ?? r.topicId}</div>
              <div style={{ fontWeight: 900, color: ok ? 'var(--green)' : 'var(--red)' }}>
                {r.right}/{r.total} · {pct}%
              </div>
            </div>
          </div>
        )
      })}
      <button className="btn" style={{ marginTop: 10 }} onClick={onClose}>
        Back to the Quiz
      </button>
    </Full>
  )
}

// --- results ---------------------------------------------------------------

function TestResults({ record, plan, mode, bank, onClose, onRead }: { record: QuizTestRecord; plan: QuizQuestion[]; mode: QuizMode; bank: QuizQuestion[]; onClose: () => void; onRead: (lessonId: string) => void }) {
  const byId = new Map(plan.map((q) => [q.id, q]))
  const right = record.results.filter((r) => r.correct).length
  const isWarmup = mode === 'warmup'
  // §14c — the rehearsal's own verdict: which seas leaked, weakest first. The
  // gating round gives Dad this tally and gives Ben nothing; here it is his,
  // alongside every answer, because that is the whole point of a rehearsal.
  const fog = isWarmup ? reviewBreakdown(bank, record.results) : []
  return (
    <Full
      onClose={onClose}
      title={isWarmup ? '🧠 Mock Warm-up — result' : mode === 'official' ? '🎓 Final Test — result' : '🧪 Mock Final Test — result'}
    >
      <div className="card" style={{ textAlign: 'center', marginBottom: 14, borderColor: record.passed ? 'var(--green)' : 'var(--orange)' }}>
        <div style={{ fontSize: 56 }}>{record.passed ? (isWarmup ? '🧠⚡' : '🏴‍☠️') : isWarmup ? '🌫️' : '⛈️'}</div>
        <div style={{ fontSize: 44, fontWeight: 900, color: record.passed ? 'var(--green)' : 'var(--orange)' }}>{record.scorePct}%</div>
        <div className="muted" style={{ fontWeight: 800 }}>
          {right}/{record.results.length} correct · pass mark {isWarmup ? REVIEW_PASS_PCT : PASS_PCT}%
        </div>
        <p style={{ marginTop: 10, fontWeight: 800 }}>
          {record.passed
            ? isWarmup
              ? 'Old seas still yours! The warm-up before your next final test won’t catch you out. 🧠'
              : mode === 'official'
                ? 'PASSED! The topic is conquered — check your treasure! 🍇'
                : 'You would PASS the real one. Tell Dad you’re ready! 💪'
            : isWarmup
              ? 'Fog on some of the old seas — and better found here than in the real warm-up, where it shuts the final test. Train them and run this again. 💪'
              : mode === 'official'
                ? 'Not this time — train a bit more and try again another day. Luffy lost to Crocodile twice, remember?'
                : 'Almost! A little more training and the flag is yours.'}
        </p>
      </div>

      {fog.length > 0 && (
        <>
          <div className="h2">🗺️ Sea by sea</div>
          {fog.map((r) => {
            const t = topicById(r.topicId)
            const pct = Math.round((r.right / r.total) * 100)
            const ok = pct >= REVIEW_PASS_PCT
            return (
              <div key={r.topicId} className="card" style={{ marginBottom: 8, borderColor: ok ? 'var(--green)' : 'var(--red)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 22 }}>{t?.emoji ?? '📘'}</div>
                  <div style={{ flex: 1, fontWeight: 900, fontSize: 15 }}>{t?.title ?? r.topicId}</div>
                  <div style={{ fontWeight: 900, color: ok ? 'var(--green)' : 'var(--red)' }}>
                    {r.right}/{r.total} · {pct}%
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

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
                {!r.correct && q.map && (
                  <div style={{ marginTop: 8 }}>
                    <MapBoard spec={q.map} reveal />
                  </div>
                )}
                {!r.correct && q.funFact && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>💡 {q.funFact}</div>
                )}
                {!r.correct && lessonById(q.lessonId) && (
                  <button
                    className="btn btn--ghost btn--small"
                    style={{ marginTop: 8, width: 'auto' }}
                    onClick={() => { sfx.click(); onRead(q.lessonId!) }}
                  >
                    📖 Read the lesson · {lessonById(q.lessonId)!.minutes} min
                  </button>
                )}
                {!r.correct && <SeLessonButton subtopicId={q.seSubtopic} small />}
              </div>
            </div>
          </div>
        )
      })}
      <button className="btn" style={{ marginTop: 10 }} onClick={onClose}>
        Back to the Quiz
      </button>
    </Full>
  )
}

// --- question renderers ----------------------------------------------------

/**
 * What 🔊 says: the question, then what is on screen to pick from — reading is
 * the part that stops him (§24c), so the options are read too, in the order
 * they are drawn. A blank ("______") is said as "blank".
 */
function readAloudText(q: QuizQuestion, options: string[]): string {
  const prompt = q.prompt.replace(/_{2,}/g, ' blank ')
  if (q.type === 'choice') return `${prompt} Is it: ${options.join('? ')}?`
  if (q.type === 'order') return `${prompt} ${(q.sequence ?? []).join('. ')}.`
  if (q.type === 'match') return `${prompt} ${(q.pairs ?? []).map((p) => p.left).join('. ')}.`
  return prompt
}

export function QuestionCard({ q, fresh, onAnswer, instantMark }: { q: QuizQuestion; fresh?: boolean; onAnswer: (correct: boolean, given?: Given) => void; instantMark: boolean }) {
  // picked here, not in ChoiceQ, so 🔊 reads the options in the order they are drawn
  const options = useMemo(() => (q.type === 'choice' ? pickChoiceOptions(q) : []), [q.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const rate = useStore((s) => s.data.steugene?.speak?.rate ?? 0.9) // the same voice speed he chose in St. Eugene
  /**
   * §14 — a new question cuts the old one off mid-sentence (the card is keyed by
   * question id, so this runs on every advance). The ONE exception is the
   * read-back of the option he just tapped: that is deliberately still being
   * said as the next card arrives, and killing it here is what made every tap
   * wait a second and a half for the voice to get out of the way.
   */
  const keepTalking = useRef(false)
  useEffect(() => () => { if (!keepTalking.current) stopSpeaking() }, [])
  return (
    <div className="card">
      {fresh && (
        <span className="chip" style={{ background: 'var(--green)', color: '#06121f', marginBottom: 8, display: 'inline-block' }}>
          ✨ NEW
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 17, flex: 1 }}>
          {q.emoji && <span style={{ marginRight: 6 }}>{q.emoji}</span>}
          {q.prompt}
        </div>
        {canSpeak() && (
          <button
            className="btn btn--ghost btn--small"
            style={{ width: 'auto', flexShrink: 0, fontSize: 20, padding: '4px 10px' }}
            onClick={() => speak(readAloudText(q, options), rate)}
            aria-label="Read the question out loud"
            title="Read the question out loud"
          >
            🔊
          </button>
        )}
      </div>
      {q.image && (
        <img className="quiz-illus" src={q.image} alt="question illustration" draggable={false} />
      )}
      {q.bigEmoji && <div className="quiz-flag">{q.bigEmoji}</div>}
      {q.type === 'choice' && q.map && <MapBoard spec={q.map} />}
      {q.type === 'choice' && (
        <ChoiceQ
          q={q}
          options={options}
          onAnswer={onAnswer}
          instantMark={instantMark}
          rate={rate}
          onSpoke={() => { keepTalking.current = true }}
        />
      )}
      {q.type === 'write' && <WriteQ q={q} onAnswer={onAnswer} />}
      {q.type === 'match' && <MatchQ q={q} onAnswer={onAnswer} />}
      {q.type === 'order' && <OrderQ q={q} onAnswer={onAnswer} />}
      {q.type === 'map' && <MapQ q={q} onAnswer={onAnswer} instantMark={instantMark} />}
    </div>
  )
}

function ChoiceQ({ q, options, onAnswer, instantMark, rate, onSpoke }: { q: QuizQuestion; options: string[]; onAnswer: (c: boolean, given?: Given) => void; instantMark: boolean; rate: number; onSpoke?: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const gone = useRef(false) // closed mid-sentence: don't answer for him after he left
  useEffect(() => () => { gone.current = true }, [])
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
              const answer = () => { if (!gone.current) onAnswer(opt === q.answer, { text: opt }) }
              // §14 — the voice says the option he tapped WHILE the next card
              // comes, not in front of it. Waiting for it to finish cost 1.4 s
              // on a two-word answer and 2.7 s on a five-word one — and in the
              // Android shell, which has no "finished" signal, every tap paid
              // the full worst-case timer whether the voice spoke or not. Over
              // a 20-question test that is most of a minute spent watching a
              // dead screen. `speak` cancels whatever was playing, so a half-
              // read 🔊 question still gets cut off by the tap.
              if (canSpeak()) {
                speak(opt, rate)
                onSpoke?.()
              }
              window.setTimeout(answer, instantMark ? 250 : 120)
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function WriteQ({ q, onAnswer }: { q: QuizQuestion; onAnswer: (c: boolean, given?: Given) => void }) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  function go() {
    if (done || !text.trim()) return
    setDone(true)
    const verdict = gradeWrite(q, text)
    onAnswer(verdict !== 'wrong', { text: text.trim(), nearMiss: verdict === 'close' })
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

function MatchQ({ q, onAnswer }: { q: QuizQuestion; onAnswer: (c: boolean, given?: Given) => void }) {
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
    onAnswer(pairs.every((p) => map[p.left] === p.right), { logged: pairs.map((p) => `${p.left} → ${map[p.left]}`).join(' · ') })
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

function OrderQ({ q, onAnswer }: { q: QuizQuestion; onAnswer: (c: boolean, given?: Given) => void }) {
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
    onAnswer((q.sequence ?? []).every((s, i) => chosen[i] === s), { logged: chosen.join(' → ') })
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

/**
 * §14f — tap the map. In training one tap answers: a slip costs nothing, the
 * card just comes back. In a test a slip counts, so he picks, can change his
 * mind and locks it in. A question with several answers always locks in.
 */
function MapQ({ q, onAnswer, instantMark }: { q: QuizQuestion; onAnswer: (c: boolean, given?: Given) => void; instantMark: boolean }) {
  const spec = q.map!
  const targets = spec.targets ?? []
  const several = targets.length > 1
  const locks = several || !instantMark
  const [picked, setPicked] = useState<string[]>([])
  const [done, setDone] = useState(false)

  function finish(ids: string[]) {
    setDone(true)
    const right = ids.length === targets.length && ids.every((id) => targets.includes(id))
    onAnswer(right, { text: ids.map((id) => MAP_NAMES[spec.id][id] ?? id).join(' · '), tapped: ids })
  }
  function tap(id: string) {
    if (done) return
    sfx.click()
    if (!locks) {
      setPicked([id])
      finish([id])
    } else if (several) {
      setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    } else {
      setPicked([id])
    }
  }

  return (
    <div>
      <MapBoard spec={spec} selected={picked} onTap={tap} />
      {locks && (
        <button className="btn" disabled={picked.length === 0 || done} onClick={() => finish(picked)}>
          {picked.length === 0 ? 'Tap the map…' : 'Lock it in ⚓'}
        </button>
      )}
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
          style={{ whiteSpace: 'nowrap' }}
          onClick={() => {
            if (confirmClose && !confirming) {
              setConfirming(true)
              window.setTimeout(() => setConfirming(false), 2500)
              return
            }
            onClose()
          }}
        >
          {confirming ? '⛵ Abandon ship?!' : '⚓ Back to the ship'}
        </button>
      </div>
      <div className="quiz-full-body">{children}</div>
    </div>
  )
}
