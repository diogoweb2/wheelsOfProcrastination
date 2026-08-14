// 🔤 My Words — the spelling list made entirely of his own mistakes.
//
// Every word the proofreader catches lands here with the right spelling and six
// near-identical wrong ones. The list never closes and the test can be taken as
// often as he likes; a word only pays the FIRST time he gets it right in a final
// test, so a retake is practice rather than a Berry tap.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { EssayWord } from '../../types'
import { PRACTICE_SIZE, WORD_COIN, practiceSet, shuffle, shakyWords, wordsAddedSince } from '../../logic/essay'
import { sfx } from '../../audio'

export function WordsPanel({ readOnly }: { readOnly?: boolean }) {
  const { essayWords: allWords, essayWordTests, essayDeleteWord, activeProfileId } = useStore()
  const [run, setRun] = useState<{ words: EssayWord[]; final: boolean } | null>(null)

  // Your own mistakes only. The reviewer's view shows the whole family's.
  const essayWords = useMemo(
    () => (readOnly ? allWords : allWords.filter((w) => w.authorId === activeProfileId)),
    [allWords, readOnly, activeProfileId],
  )
  const fresh = wordsAddedSince(essayWords, essayWordTests)
  const shaky = shakyWords(essayWords)
  const lastTest = essayWordTests[essayWordTests.length - 1]

  if (run) return <WordQuiz words={run.words} final={run.final} onDone={() => setRun(null)} />

  if (essayWords.length === 0) {
    return (
      <>
        <div className="h2">🔤 My words</div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>🎉</div>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            No words in the bank yet. Every word you spell wrong in an essay lands here — so an empty list is good news.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="h2">🔤 My words — {essayWords.length}</div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{essayWords.length}</div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 800 }}>WORDS</div>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)' }}>{essayWords.length - shaky.length}</div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 800 }}>NAILED</div>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--orange)' }}>{shaky.length}</div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 800 }}>STILL SHAKY</div>
          </div>
        </div>
        {/* The line that makes the test worth reopening. */}
        <div className="chip" style={{ marginTop: 12, background: fresh.length ? 'var(--yellow)' : 'var(--card2)', color: fresh.length ? '#3a2000' : 'var(--muted)' }}>
          {lastTest
            ? fresh.length
              ? `🆕 ${fresh.length} new word${fresh.length === 1 ? '' : 's'} since your last test`
              : '✅ no new words since your last test'
            : '🆕 never tested yet'}
        </div>
      </div>

      {!readOnly && (
        <>
          <button
            className="btn btn--blue"
            onClick={() => { sfx.click(); setRun({ words: practiceSet(essayWords), final: false }) }}
          >
            🎯 Quick practice ({Math.min(PRACTICE_SIZE, essayWords.length)} words)
          </button>
          <button
            className="btn"
            style={{ marginTop: 10 }}
            onClick={() => { sfx.click(); setRun({ words: shuffle(essayWords), final: true }) }}
          >
            🏁 Final test (all {essayWords.length})
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
            The final test pays 🪙 {WORD_COIN} for each word you get right <strong>for the first time</strong>. Take it as
            many times as you like — the words you’ve already nailed don’t pay again.
          </p>
        </>
      )}

      <div className="h2">📋 The list</div>
      {essayWords
        .slice()
        .reverse()
        .map((w) => (
          <div className="card" key={w.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{w.masteredAt ? '✅' : '🔤'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Only the reviewer sees the right spelling — for him it stays the thing to work out. */}
              <div style={{ fontWeight: 900 }}>{readOnly ? w.correct : w.typed}</div>
              <div className="muted" style={{ fontSize: 11, fontWeight: 800, marginTop: 2 }}>
                {readOnly && `he wrote “${w.typed}” · `}
                {/* The count is the whole point of a bank made of his own mistakes:
                    a word missed five times gets asked five times as often. */}
                {(w.misses ?? 1) > 1 && `missed ${w.misses}× · `}
                {w.asked > 0 ? `${w.right}/${w.asked} right` : 'not tested yet'}
                {w.masteredAt ? ' · nailed' : ''}
              </div>
            </div>
            {readOnly && (
              <button
                className="btn btn--ghost btn--small"
                style={{ color: 'var(--red)' }}
                onClick={() => { sfx.click(); essayDeleteWord(w.id) }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
    </>
  )
}

/** One sitting: pick the right spelling, one word at a time, answer shown straight away. */
function WordQuiz({ words, final, onDone }: { words: EssayWord[]; final: boolean; onDone: () => void }) {
  const { essayFinishWordTest } = useStore()
  const [at, setAt] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [results, setResults] = useState<{ wordId: string; right: boolean }[]>([])
  const [earned, setEarned] = useState<number | null>(null)

  const word = words[at]
  // Re-shuffled per question, so the right answer never sits in the same slot.
  const options = useMemo(() => (word ? shuffle(word.options.length ? word.options : [word.correct, word.typed]) : []), [word])

  if (earned !== null) {
    const right = results.filter((r) => r.right).length
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>{right === words.length ? '🏆' : right >= words.length / 2 ? '💪' : '📖'}</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>
          {right} / {words.length} right
        </div>
        {final && (
          <div className="chip" style={{ background: 'var(--gold)', color: '#3a2000', marginTop: 10 }}>
            🪙 +{earned} Berries
          </div>
        )}
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          {right === words.length
            ? 'Every single one. Those words are yours now.'
            : 'The ones you missed stay on the list — come back and take them again.'}
        </p>
        <button className="btn" style={{ marginTop: 14 }} onClick={() => { sfx.click(); onDone() }}>
          Done
        </button>
      </div>
    )
  }

  function answer(choice: string) {
    if (picked) return
    const right = choice === word.correct
    if (right) sfx.gem()
    else sfx.error()
    setPicked(choice)
    setResults((r) => [...r, { wordId: word.id, right }])
  }

  function next() {
    const done = [...results]
    setPicked(null)
    if (at + 1 < words.length) {
      setAt(at + 1)
      return
    }
    setEarned(essayFinishWordTest(done, final))
  }

  return (
    <>
      <div className="h2">
        {final ? '🏁 Final test' : '🎯 Practice'} — {at + 1} of {words.length}
      </div>
      <div className="card">
        <p className="muted" style={{ fontSize: 13 }}>Which one is spelled right?</p>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((o) => {
            const isAnswer = o === word.correct
            const chosen = picked === o
            const tone = !picked ? '' : isAnswer ? ' word-opt--right' : chosen ? ' word-opt--wrong' : ''
            return (
              <button key={o} className={`word-opt${tone}`} onClick={() => answer(o)}>
                {o}
                {picked && isAnswer && ' ✓'}
                {picked && chosen && !isAnswer && ' ✕'}
              </button>
            )
          })}
        </div>
      </div>
      {picked && (
        <button className="btn" style={{ marginTop: 12 }} onClick={() => { sfx.click(); next() }}>
          {at + 1 < words.length ? 'Next word →' : 'See how I did'}
        </button>
      )}
    </>
  )
}
