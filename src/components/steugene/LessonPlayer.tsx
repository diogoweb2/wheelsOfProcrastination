// 🏫 St. Eugene 7 (§24d–f) — the lesson, running.
//
// One card at a time, and the card fills the screen. Everything that could be
// a second thing to look at has been taken off it: no clock, no score, no
// question counter. The only progress he can see is a ship sailing along the
// top, and the ship moves per card, not per minute, so there is nothing to
// game by sitting still.
//
// Three rules live in here and nowhere else:
//  - The clock only runs while he is doing something (§24d).
//  - A submitted answer is final (§24f). The buttons go dead the instant he
//    picks, and what follows is an explanation, not another go.
//  - That explanation is worked on a DIFFERENT number, so it teaches the move
//    rather than handing him the answer he just missed.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../../store/useStore'
import { sfx } from '../../audio'
import { seFind } from '../../logic/steugene'
import { packFor } from '../../steugene/packs'
import { seAvailable, seTiles, seWithChecks } from '../../logic/steugeneLesson'
import { speak, stopSpeaking, canSpeak } from '../../lib/speak'
import { SeArtwork } from './SeArtwork'
import { SeCalculator } from './SeCalculator'
import { SeVideoBlock } from './SeVideoBlock'
import type { SeBlock, SeChoice, SeBuild, SeExplain, SeGame, SeStep } from '../../steugene/types'

/** Idle longer than this and the clock stops counting (§24d). */
const IDLE_MS = 60_000
/** How often banked seconds are written to the cloud. Not every tick. */
const FLUSH_EVERY = 60

// --- the clock ---------------------------------------------------------------

/**
 * Counts only the seconds he was actually here for.
 *
 * "Here" means: the tab is visible AND something has happened in the last
 * minute. A tap, a key, a scroll — anything. Walk off mid-lesson and the
 * minutes simply do not accrue, which is the only honest way to promise "an
 * hour of work" without putting a timer on screen for him to outlast.
 */
function useActiveClock(enabled: boolean, flush: (seconds: number) => void) {
  const last = useRef(Date.now())
  const banked = useRef(0)
  const flushRef = useRef(flush)
  flushRef.current = flush

  useEffect(() => {
    if (!enabled) return
    const touch = () => {
      last.current = Date.now()
    }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const e of events) window.addEventListener(e, touch, { passive: true })

    const tick = setInterval(() => {
      if (document.hidden) return
      if (Date.now() - last.current > IDLE_MS) return
      banked.current += 1
      if (banked.current >= FLUSH_EVERY) {
        flushRef.current(banked.current)
        banked.current = 0
      }
    }, 1000)

    return () => {
      for (const e of events) window.removeEventListener(e, touch)
      clearInterval(tick)
      if (banked.current) flushRef.current(banked.current)
      banked.current = 0
    }
  }, [enabled])

  /** Count the pending seconds now — called on every card change. */
  return useCallback(() => {
    if (banked.current) {
      flushRef.current(banked.current)
      banked.current = 0
    }
  }, [])
}

// --- read-aloud --------------------------------------------------------------

/** Say a card out loud when it appears, if read-aloud is on. */
function useAutoRead(text: string, on: boolean, rate: number) {
  useEffect(() => {
    if (!on || !text) return
    const t = setTimeout(() => speak(text, rate), 250) // let the card paint first
    return () => {
      clearTimeout(t)
      stopSpeaking()
    }
  }, [text, on, rate])
}

function SpeakButton({ text, rate }: { text: string; rate: number }) {
  if (!canSpeak()) return null
  return (
    <button
      className="btn btn--ghost btn--small se-speak"
      onClick={() => speak(text, rate)}
      aria-label="Read this out loud"
      title="Read this out loud"
    >
      🔊
    </button>
  )
}

// --- the player --------------------------------------------------------------

export function LessonPlayer({ onLeave }: { onLeave: () => void }) {
  const { data, seDesk, seTick, seAdvance, seRecord, seFinish } = useStore()
  const run = data.steugene.run
  const speakOn = data.steugene.speak.on
  const rate = data.steugene.speak.rate

  const flushNow = useActiveClock(!!run, seTick)

  // Everything that could be dealt, by id — video questions on their own too,
  // which is how "mistakes to fix" deals one. Note this is NOT filtered by the
  // fix-lock: a block already in the queue stays playable even if a lock was
  // written mid-lesson.
  const byId = useMemo(() => {
    if (!run) return new Map<string, SeBlock>()
    const generated = seDesk.generated.filter((g) => g.subtopicId === run.subtopicId).flatMap((g) => g.blocks)
    return new Map(seWithChecks(seAvailable(packFor(run.subtopicId), generated)).map((b) => [b.id, b]))
  }, [run?.subtopicId, seDesk.generated]) // eslint-disable-line react-hooks/exhaustive-deps

  const [finished, setFinished] = useState(false)

  if (!run) return null
  const where = seFind(run.subtopicId)
  const block = byId.get(run.blockIds[run.pos] ?? '')
  const done = run.pos >= run.blockIds.length || !block

  const next = () => {
    flushNow()
    // Read the clock back AFTER banking the seconds this card took — `run` in
    // this closure is a render old.
    const fresh = useStore.getState().data.steugene.run ?? run
    // §24d — the CLOCK ends the lesson, at the end of a card. The queue is
    // dealt with headroom precisely so it is rarely what runs out first.
    // "Mistakes to fix" has no clock: it ends when the misses do.
    const timeUp = !fresh.fix && fresh.activeSeconds >= fresh.targetMinutes * 60
    if (timeUp || fresh.pos + 1 >= fresh.blockIds.length) {
      void confetti({ particleCount: 140, spread: 95, origin: { y: 0.5 } })
      sfx.fanfare()
      setFinished(true)
      return
    }
    seAdvance()
  }

  if (finished || done) {
    return (
      <LessonResult
        onClose={() => {
          seFinish()
          onLeave()
        }}
      />
    )
  }

  const total = run.blockIds.length
  const sailed = Math.round(((run.pos + 1) / total) * 100)

  return (
    <div className="se-lesson">
      <div className="se-lesson__top">
        {/* Leaving keeps his place: the lesson stays in flight and ▶️ Carry on
            picks it up here. The clock needs nothing — it only runs while
            this player is on screen (§24d). */}
        <button
          className="btn btn--ghost btn--small"
          title="Leave — your place is kept"
          onClick={() => {
            stopSpeaking()
            onLeave()
          }}
        >
          ✕
        </button>
        <div className="se-voyage" aria-hidden>
          <div className="se-voyage__sea" />
          <div className="se-voyage__ship" style={{ left: `calc(${sailed}% - 14px)` }}>
            ⛵
          </div>
        </div>
        <SpeakToggle />
      </div>

      <div className="se-lesson__where muted">
        {where?.subject.emoji} {where?.subtopic.title}
        {run.fix && ' — mistakes to fix'}
      </div>

      <div key={block.id} className="se-card-in">
        {block.kind === 'explain' && <ExplainCard block={block} speakOn={speakOn} rate={rate} onNext={next} />}
        {block.kind === 'choice' && (
          <ChoiceCard block={block} speakOn={speakOn} rate={rate} onNext={next} onRecord={seRecord} />
        )}
        {block.kind === 'build' && (
          <BuildCard block={block} speakOn={speakOn} rate={rate} onNext={next} onRecord={seRecord} />
        )}
        {block.kind === 'game' && <GameCard block={block} onNext={next} onRecord={seRecord} />}
        {block.kind === 'video' && (
          <VideoCard block={block} speakOn={speakOn} rate={rate} onNext={next} onRecord={seRecord} />
        )}
      </div>

      {/* §24o — maths only. Nothing in History is helped by a keypad, and an
          extra thing on the screen is a cost whenever it is not a help. */}
      {where?.subject.id === 'math' && <SeCalculator />}
    </div>
  )
}

function SpeakToggle() {
  const { data, seSetSpeak } = useStore()
  if (!canSpeak()) return null
  const on = data.steugene.speak.on
  return (
    <button
      className={`btn btn--small ${on ? 'btn--blue' : 'btn--ghost'}`}
      onClick={() => {
        sfx.click()
        stopSpeaking()
        seSetSpeak(!on)
      }}
      title={on ? 'Reading out loud' : 'Silent'}
    >
      {on ? '🔊' : '🔇'}
    </button>
  )
}

// --- explain -----------------------------------------------------------------

function ExplainCard({
  block,
  speakOn,
  rate,
  onNext,
}: {
  block: SeExplain
  speakOn: boolean
  rate: number
  onNext: () => void
}) {
  const spoken = `${block.title}. ${block.lines.join(' ')}${block.callout ? ` ${block.callout.text}` : ''}`
  useAutoRead(spoken, speakOn, rate)

  return (
    <div className="card se-card">
      <div className="se-card__head">
        <div className="h1" style={{ marginBottom: 0 }}>
          {block.emoji ?? '📘'} {block.title}
        </div>
        <SpeakButton text={spoken} rate={rate} />
      </div>

      {block.art && <SeArtwork art={block.art} />}

      <ul className="se-lines">
        {block.lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      {block.callout && <Callout callout={block.callout} />}

      <button className="btn btn--blue se-next" onClick={onNext}>
        Got it →
      </button>
    </div>
  )
}

const CALLOUT_ICON = { imagine: '🌊', gotcha: '⚠️', key: '🗝️', pirate: '🏴‍☠️' } as const

function Callout({ callout }: { callout: NonNullable<SeExplain['callout']> }) {
  return (
    <div className={`se-callout se-callout--${callout.flavour}`}>
      <span aria-hidden>{CALLOUT_ICON[callout.flavour]}</span>
      <span>{callout.text}</span>
    </div>
  )
}

// --- the verdict strip, shared by every question ------------------------------

type Record_ = (a: { id: string; right: boolean; prompt: string; given: string; expected: string }) => void

function Verdict({
  right,
  why,
  steps,
  rate,
  speakOn,
  onNext,
}: {
  right: boolean
  why: string
  steps?: SeStep[]
  rate: number
  speakOn: boolean
  onNext: () => void
}) {
  const [step, setStep] = useState(0)
  const walk = right ? [] : (steps ?? [])
  const spoken = right ? `Yes. ${why}` : `Not this time. ${why}`
  useAutoRead(spoken, speakOn, rate)

  return (
    <div className={`se-verdict ${right ? 'se-verdict--yes' : 'se-verdict--no'}`}>
      <div className="se-verdict__head">
        <strong>{right ? '✅ Yes' : '❌ Not this time'}</strong>
        <SpeakButton text={spoken} rate={rate} />
      </div>
      <p>{why}</p>

      {walk.length > 0 && (
        <div className="se-walk">
          <div className="muted se-walk__label">Same move, different number:</div>
          {walk.slice(0, step + 1).map((s, i) => (
            <div key={i} className="se-walk__step">
              <span className="se-walk__n">{i + 1}</span>
              <div>
                <div>{s.text}</div>
                {s.art && <SeArtwork art={s.art} />}
              </div>
            </div>
          ))}
          {step < walk.length - 1 && (
            <button
              className="btn btn--ghost btn--small"
              onClick={() => {
                sfx.click()
                const s = walk[step + 1]
                setStep(step + 1)
                if (speakOn) speak(s.text, rate)
              }}
            >
              Then what? ↓
            </button>
          )}
        </div>
      )}

      <button className="btn btn--blue se-next" onClick={onNext}>
        Next →
      </button>
    </div>
  )
}

// --- multiple choice ----------------------------------------------------------

function ChoiceCard({
  block,
  speakOn,
  rate,
  onNext,
  onRecord,
}: {
  block: SeChoice
  speakOn: boolean
  rate: number
  onNext: () => void
  onRecord: Record_
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const spoken = `${block.prompt}. ${block.options.map((o, i) => `${i + 1}. ${o}`).join('. ')}`
  useAutoRead(picked === null ? spoken : '', speakOn, rate)

  const choose = (i: number) => {
    if (picked !== null) return // §24f — one answer, and it is the one that counts
    setPicked(i)
    const right = i === block.answer
    if (right) {
      sfx.gem()
      void confetti({ particleCount: 36, spread: 55, startVelocity: 26, origin: { y: 0.65 }, ticks: 90 })
    } else {
      sfx.error()
    }
    onRecord({
      id: block.id,
      right,
      prompt: block.prompt,
      given: block.options[i],
      expected: block.options[block.answer],
    })
  }

  return (
    <div className="card se-card">
      <div className="se-card__head">
        <div className="se-prompt">{block.prompt}</div>
        <SpeakButton text={spoken} rate={rate} />
      </div>

      {block.art && <SeArtwork art={block.art} />}

      <div className="se-options">
        {block.options.map((o, i) => (
          <button
            key={i}
            className={`se-option${
              picked === null ? '' : i === block.answer ? ' se-option--right' : i === picked ? ' se-option--wrong' : ' se-option--dim'
            }`}
            disabled={picked !== null}
            onClick={() => choose(i)}
          >
            {o}
          </button>
        ))}
      </div>

      {picked !== null && (
        <Verdict
          right={picked === block.answer}
          why={block.why}
          steps={block.steps}
          rate={rate}
          speakOn={speakOn}
          onNext={onNext}
        />
      )}
    </div>
  )
}

// --- build-your-own answer ----------------------------------------------------

function BuildCard({
  block,
  speakOn,
  rate,
  onNext,
  onRecord,
}: {
  block: SeBuild
  speakOn: boolean
  rate: number
  onNext: () => void
  onRecord: Record_
}) {
  // The hand is dealt once per card, not on every keystroke.
  const tiles = useMemo(() => seTiles(block.answer, block.decoys), [block.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [used, setUsed] = useState<number[]>([])
  const [locked, setLocked] = useState<boolean | null>(null)

  const built = used.map((i) => tiles[i]).join('')
  useAutoRead(locked === null ? block.prompt : '', speakOn, rate)

  const check = () => {
    if (locked !== null || !built) return
    const right = built === block.answer
    setLocked(right)
    if (right) {
      sfx.gem()
      void confetti({ particleCount: 36, spread: 55, startVelocity: 26, origin: { y: 0.65 }, ticks: 90 })
    } else {
      sfx.error()
    }
    onRecord({ id: block.id, right, prompt: block.prompt, given: built, expected: block.answer })
  }

  return (
    <div className="card se-card">
      <div className="se-card__head">
        <div className="se-prompt">{block.prompt}</div>
        <SpeakButton text={block.prompt} rate={rate} />
      </div>

      {block.art && <SeArtwork art={block.art} />}

      <div className={`se-slot${locked === false ? ' se-slot--wrong' : locked ? ' se-slot--right' : ''}`}>
        {built || <span className="muted">tap the tiles below</span>}
      </div>

      <div className="se-tiles">
        {tiles.map((t, i) => (
          <button
            key={i}
            className="se-tile"
            disabled={locked !== null || used.includes(i)}
            onClick={() => {
              sfx.tick()
              setUsed([...used, i])
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {locked === null && (
        <div className="se-build__actions">
          <button
            className="btn btn--ghost btn--small"
            disabled={!used.length}
            onClick={() => {
              sfx.click()
              setUsed(used.slice(0, -1))
            }}
          >
            ⌫ Back
          </button>
          <button className="btn btn--blue" style={{ flex: 1 }} disabled={!built} onClick={check}>
            Check it
          </button>
        </div>
      )}

      {locked !== null && (
        <Verdict right={locked} why={block.why} steps={block.steps} rate={rate} speakOn={speakOn} onNext={onNext} />
      )}
    </div>
  )
}

// --- video + its questions -----------------------------------------------------

function VideoCard({
  block,
  speakOn,
  rate,
  onNext,
  onRecord,
}: {
  block: Extract<SeBlock, { kind: 'video' }>
  speakOn: boolean
  rate: number
  onNext: () => void
  onRecord: Record_
}) {
  const [watched, setWatched] = useState(false)
  const [q, setQ] = useState(0)
  const check = watched ? block.checks[q] : undefined

  // A video with no questions behind it is just a video: move on by itself
  // rather than parking him on an empty card.
  useEffect(() => {
    if (watched && !check) onNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched, check])

  if (!watched) {
    return (
      <div className="card se-card">
        <div className="se-prompt">🎬 Watch this, then answer two things about it.</div>
        <SeVideoBlock
          youtube={block.youtube}
          title={block.title}
          by={block.by}
          start={block.start}
          end={block.end}
          onFinished={(reason) => {
            // Broken → move on entirely. Ended OR let go after the two-minute
            // hold (§24g) → the questions, which is why the skip button says so.
            if (reason === 'broken') onNext()
            else setWatched(true)
          }}
        />
      </div>
    )
  }

  if (!check) return null
  return (
    <ChoiceCard
      key={`${block.id}-${q}`}
      block={{ ...check, kind: 'choice', id: `${block.id}-q${q}` }}
      speakOn={speakOn}
      rate={rate}
      onRecord={onRecord}
      onNext={() => (q + 1 < block.checks.length ? setQ(q + 1) : onNext())}
    />
  )
}

// --- the minigames --------------------------------------------------------------

function GameCard({ block, onNext, onRecord }: { block: SeGame; onNext: () => void; onRecord: Record_ }) {
  const [slips, setSlips] = useState(0)
  const [done, setDone] = useState(false)

  const finish = () => {
    if (done) return
    setDone(true)
    sfx.fanfare()
    void confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } })
    onRecord({
      id: block.id,
      right: slips === 0,
      prompt: block.title,
      given: slips === 0 ? 'clean run' : `${slips} wrong tap${slips > 1 ? 's' : ''}`,
      expected: 'clean run',
    })
  }

  return (
    <div className="card se-card">
      <div className="se-prompt">🎮 {block.title}</div>
      {block.game.mode === 'order' && <OrderGame game={block.game} onSlip={() => setSlips((n) => n + 1)} onWin={finish} />}
      {block.game.mode === 'pair' && <PairGame game={block.game} onSlip={() => setSlips((n) => n + 1)} onWin={finish} />}
      {block.game.mode === 'line' && <LineGame game={block.game} onSlip={() => setSlips((n) => n + 1)} onWin={finish} />}
      {done && (
        <>
          {block.why && <p className="muted" style={{ marginTop: 10 }}>{block.why}</p>}
          <button className="btn btn--blue se-next" onClick={onNext}>
            Next →
          </button>
        </>
      )}
    </div>
  )
}

function OrderGame({
  game,
  onSlip,
  onWin,
}: {
  game: Extract<SeGame['game'], { mode: 'order' }>
  onSlip: () => void
  onWin: () => void
}) {
  const sorted = useMemo(() => [...game.values].sort((a, b) => a.value - b.value), [game.values])
  const shuffled = useMemo(() => [...game.values].sort(() => Math.random() - 0.5), [game.values])
  const [placed, setPlaced] = useState<string[]>([])
  const [shake, setShake] = useState<string | null>(null)

  const tap = (label: string) => {
    if (placed.includes(label)) return
    if (sorted[placed.length].label === label) {
      sfx.tick()
      const next = [...placed, label]
      setPlaced(next)
      if (next.length === sorted.length) onWin()
    } else {
      sfx.error()
      onSlip()
      setShake(label)
      setTimeout(() => setShake(null), 400)
    }
  }

  return (
    <>
      <p className="muted">{game.hint ?? 'Tap them smallest first.'}</p>
      <div className="se-order__done">
        {placed.map((l) => (
          <span key={l} className="se-chip se-chip--done">
            {l}
          </span>
        ))}
      </div>
      <div className="se-order__pool">
        {shuffled.map((v) => (
          <button
            key={v.label}
            className={`se-chip${placed.includes(v.label) ? ' se-chip--gone' : ''}${shake === v.label ? ' se-shake' : ''}`}
            disabled={placed.includes(v.label)}
            onClick={() => tap(v.label)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </>
  )
}

function PairGame({
  game,
  onSlip,
  onWin,
}: {
  game: Extract<SeGame['game'], { mode: 'pair' }>
  onSlip: () => void
  onWin: () => void
}) {
  const rights = useMemo(() => game.pairs.map((p) => p[1]).sort(() => Math.random() - 0.5), [game.pairs])
  const [held, setHeld] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [shake, setShake] = useState<string | null>(null)

  const tapRight = (r: string) => {
    if (!held || matched.includes(r)) return
    const ok = game.pairs.some(([l, rr]) => l === held && rr === r)
    if (ok) {
      sfx.tick()
      const next = [...matched, held]
      setMatched(next)
      setHeld(null)
      if (next.length === game.pairs.length) onWin()
    } else {
      sfx.error()
      onSlip()
      setShake(r)
      setTimeout(() => setShake(null), 400)
    }
  }

  return (
    <>
      <p className="muted">Tap one on the left, then its twin on the right.</p>
      <div className="se-pairs">
        <div>
          {game.pairs.map(([l]) => (
            <button
              key={l}
              className={`se-chip${matched.includes(l) ? ' se-chip--done' : held === l ? ' se-chip--held' : ''}`}
              disabled={matched.includes(l)}
              onClick={() => {
                sfx.click()
                setHeld(l)
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div>
          {rights.map((r) => {
            const owner = game.pairs.find(([, rr]) => rr === r)?.[0]
            const taken = !!owner && matched.includes(owner)
            return (
              <button
                key={r}
                className={`se-chip${taken ? ' se-chip--done' : ''}${shake === r ? ' se-shake' : ''}`}
                disabled={taken}
                onClick={() => tapRight(r)}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function LineGame({
  game,
  onSlip,
  onWin,
}: {
  game: Extract<SeGame['game'], { mode: 'line' }>
  onSlip: () => void
  onWin: () => void
}) {
  const [i, setI] = useState(0)
  const [shake, setShake] = useState<number | null>(null)
  const spots: number[] = []
  for (let v = game.from; v <= game.to + 1e-9; v += game.step) spots.push(Number(v.toFixed(4)))
  const target = game.targets[i]

  const tap = (v: number) => {
    if (!target) return
    if (Math.abs(v - target.at) < 1e-6) {
      sfx.tick()
      if (i + 1 >= game.targets.length) onWin()
      else setI(i + 1)
    } else {
      sfx.error()
      onSlip()
      setShake(v)
      setTimeout(() => setShake(null), 400)
    }
  }

  return (
    <>
      <p className="muted">
        Where does <strong style={{ color: 'var(--yellow)', fontSize: 20 }}>{target?.label}</strong> go?
      </p>
      <div className="se-line">
        {spots.map((v) => (
          <button
            key={v}
            className={`se-line__spot${shake === v ? ' se-shake' : ''}`}
            onClick={() => tap(v)}
            aria-label={String(v)}
          >
            <span>{Number.isInteger(v) ? v : ''}</span>
          </button>
        ))}
      </div>
    </>
  )
}

// --- the end of the lesson -------------------------------------------------------

/**
 * What he sees at the end, and what he is meant to show Dad (§24f).
 *
 * Every mistake is listed with what he said and what it should have been —
 * and a line saying plainly that he cannot have another go at these until Dad
 * unlocks them. That sentence is doing real work: without it the screen reads
 * as a punishment rather than an appointment.
 */
function LessonResult({ onClose }: { onClose: () => void }) {
  const { data } = useStore()
  const run = data.steugene.run
  const where = run ? seFind(run.subtopicId) : null
  const answers = run?.answers ?? []
  const right = answers.filter((a) => a.right).length
  const wrong = answers.filter((a) => !a.right)
  const pct = answers.length ? Math.round((right / answers.length) * 100) : 100

  useEffect(() => {
    stopSpeaking()
  }, [])

  return (
    <div className="screen">
      <div className="card se-result">
        <div style={{ fontSize: 46 }}>{pct >= 80 ? '🏴‍☠️' : pct >= 50 ? '⚽' : '📘'}</div>
        <div className="h1">
          {right} / {answers.length} right
        </div>
        <p className="muted">
          {where?.subtopic.title}
          {run?.fix && ' — mistakes to fix'}
        </p>
        <div className="se-result__bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        <p style={{ marginTop: 10, fontWeight: 800 }}>
          {pct >= 80 ? 'That was a strong run.' : pct >= 50 ? 'Decent. The misses are the interesting part.' : 'Hard one. Now you know which bits to ask about.'}
        </p>
      </div>

      {wrong.length > 0 && (
        <div className="card">
          <div className="h1" style={{ fontSize: 18 }}>📋 Show Dad these</div>
          <p className="muted" style={{ marginBottom: 10 }}>
            You cannot have another go at these yet. Dad reads them first, then unlocks them.
          </p>
          {wrong.map((m, i) => (
            <div key={i} className="se-miss">
              <div className="se-miss__q">{m.prompt}</div>
              <div className="se-miss__a">
                <span className="se-miss__given">{m.given}</span>
                <span className="muted"> → </span>
                <span className="se-miss__right">{m.expected}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn--blue" onClick={onClose}>
        Done
      </button>
    </div>
  )
}
