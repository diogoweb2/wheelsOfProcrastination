// The Question of the Day — one review question, One Piece style, that greets
// the crewmate when they open the app. Same question UI as the Academy, just a
// single question with win/lose Berry stakes. Reuses the Academy's QuestionCard.
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { correctAnswerText, qotdPenalty, qotdReward, topicById } from '../logic/quiz'
import { QuestionCard, type Given } from './QuizSession'
import { sfx } from '../audio'

export function QuestionOfTheDay() {
  const { data, quizBank, qotdOpen, openQotd, answerDailyQuiz, postponeDailyQuiz } = useStore()
  const daily = data.quiz.daily
  const q = daily ? quizBank.find((x) => x.id === daily.qid) : undefined
  const topic = q ? topicById(q.topicId) : undefined
  const startRef = useRef(Date.now())
  const [result, setResult] = useState<{ correct: boolean; delta: number; given: Given } | null>(null)

  // A fresh, unanswered question pops itself open the moment it appears.
  useEffect(() => {
    if (daily?.state === 'unseen') openQotd()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily?.state, daily?.qid])

  // reset the answer timer each time the modal (re)opens on a live question
  useEffect(() => {
    if (qotdOpen && daily && daily.state !== 'done') {
      startRef.current = Date.now()
      setResult(null)
    }
  }, [qotdOpen, daily?.qid, daily?.state])

  if (!qotdOpen || !daily || daily.state === 'done' || !q || !topic) return null

  function answer(correct: boolean, given: Given = {}) {
    const delta = answerDailyQuiz(correct, Date.now() - startRef.current)
    setResult({ correct, delta, given })
    if (correct) {
      sfx.bigWin()
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.55 } })
    } else {
      sfx.error()
    }
  }

  const win = qotdReward(q)
  const loss = qotdPenalty(q)

  return (
    <div className="overlay overlay--center">
      <div className="sheet qotd-sheet" onClick={(e) => e.stopPropagation()}>
        {/* One Piece flourish: spinning rays behind a big golden title */}
        <div className="qotd-hero">
          <div className="qotd-rays" aria-hidden />
          <div className="qotd-title">
            <div className="qotd-title-top">⭐ QUESTION OF THE DAY ⭐</div>
            <div className="qotd-title-sub">
              {topic.emoji} {topic.title}
            </div>
          </div>
        </div>

        {!result && (
          <>
            <p className="muted" style={{ textAlign: 'center', fontSize: 12, margin: '2px 0 12px' }}>
              Nail it for <b style={{ color: 'var(--gold)' }}>+{win} 🪙</b> · miss it and it’s{' '}
              <b style={{ color: 'var(--red)' }}>−{loss} 🪙</b>
            </p>
            <QuestionCard key={q.id} q={q} onAnswer={answer} instantMark />
            {daily.state === 'unseen' && (
              <button
                className="btn btn--ghost btn--small"
                style={{ marginTop: 10, width: '100%' }}
                onClick={() => {
                  sfx.click()
                  postponeDailyQuiz()
                }}
              >
                ⏳ Do it later
              </button>
            )}
            <p className="muted" style={{ textAlign: 'center', fontSize: 11, marginTop: 8 }}>
              “Later” keeps it on your Spin screen — but ignoring it until midnight costs 🪙{loss}.
            </p>
          </>
        )}

        {result && (
          <div className="card" style={{ textAlign: 'center', borderColor: result.correct ? 'var(--gold)' : 'var(--red)' }}>
            <div style={{ fontSize: 52 }}>{result.correct ? '🏴‍☠️🎉' : '💦'}</div>
            <div className="h1" style={{ margin: '4px 0', color: result.correct ? 'var(--gold)' : 'var(--red)' }}>
              {result.correct ? `+${result.delta} 🪙` : `${result.delta} 🪙`}
            </div>
            {result.correct ? (
              <p style={{ fontWeight: 800 }}>YOSH! Still sharp as a captain’s blade. {result.given.nearMiss ? `(it’s spelled “${correctAnswerText(q)}”)` : ''}</p>
            ) : (
              <>
                {result.given.text && (
                  <p className="muted" style={{ margin: '2px 0' }}>You said: ❌ {result.given.text}</p>
                )}
                <p style={{ fontWeight: 800 }}>
                  Right answer: <b style={{ color: 'var(--green)' }}>{correctAnswerText(q)}</b>
                </p>
              </>
            )}
            {q.funFact && (
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>💡 {q.funFact}</p>
            )}
            <button className="btn" style={{ marginTop: 14 }} onClick={() => useStore.getState().closeQotd()}>
              ⚓ Set sail
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
