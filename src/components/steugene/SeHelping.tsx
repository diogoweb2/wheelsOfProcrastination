// 🏫 St. Eugene 7 (§24t) — 🤝 Helping him: the page Dad opens while sitting next to him.
//
// It shows the card Ben is on RIGHT NOW, with the answer key, the `why` and the
// whole walk-through open. That is the opposite of every other screen in this
// app, and it is deliberate: the person reading this is the one doing the
// explaining, and half the time he has to learn the method before he can teach
// it. Hiding the answer from the parent helps nobody.
//
// It needs no new plumbing. Ben's device already writes `steugene.run` on every
// card (`seAdvance`), and the parent session already live-syncs his whole world
// (`kidData`). So this is a pure READ: nothing here can mark an answer, end a
// lesson or unseal a miss. Those stay on the Desk (§24f).
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { seFind } from '../../logic/steugene'
import { ensurePack, packFor } from '../../steugene/packs'
import { SE_WARM_INTRO, seAvailable, seWithChecks } from '../../logic/steugeneLesson'
import { SeArtwork } from './SeArtwork'
import type { SeAnswer, SeRun } from '../../types'
import type { SeBlock, SeStep } from '../../steugene/types'

/**
 * A lesson he is actually sitting in front of, rather than one left open since
 * Tuesday. A run survives closing the app on purpose (§24d), so "there is a run"
 * is not the same question as "he is working".
 */
const SE_LIVE_MS = 45 * 60 * 1000

function lastSeenAt(run: SeRun): number {
  const last = run.answers[run.answers.length - 1]
  return last ? Math.max(run.startedAt, last.at) : run.startedAt
}

function seRunIsLive(run: SeRun, now: number = Date.now()): boolean {
  return now - lastSeenAt(run) < SE_LIVE_MS
}

/** His answer to one block, latest first — a video's questions are filed as `<id>-q<n>`. */
function answerFor(run: SeRun, id: string): SeAnswer | undefined {
  for (let i = run.answers.length - 1; i >= 0; i -= 1) {
    if (run.answers[i].id === id) return run.answers[i]
  }
  return undefined
}

/** How long ago, as a bare duration: "4 min", "2 h", "3 days". */
function since(at: number): string {
  const mins = Math.round((Date.now() - at) / 60_000)
  if (mins < 60) return `${Math.max(1, mins)} min`
  const hours = Math.round(mins / 60)
  return hours < 24 ? `${hours} h` : `${Math.round(hours / 24)} days`
}

function ago(at: number): string {
  return Date.now() - at < 60_000 ? 'just now' : `${since(at)} ago`
}

// --- the tab -----------------------------------------------------------------

export function SeHelping() {
  const { kidData, kidDataFresh, seDesk } = useStore()
  const run = kidData?.steugene.run ?? null
  const [ready, setReady] = useState(() => !run || !!packFor(run.subtopicId))

  // Dad's device has never loaded this pack — nothing on his side started the
  // lesson — so the chunk has to be fetched before the card can be drawn.
  useEffect(() => {
    if (!run) return
    if (packFor(run.subtopicId)) {
      setReady(true)
      return
    }
    setReady(false)
    let alive = true
    void ensurePack(run.subtopicId).then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [run?.subtopicId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Nothing on this page re-renders unless Ben's device writes, so "he last
  // answered 3 min ago" would freeze at 3 min for the rest of the evening.
  // A half-minute tick keeps the staleness line and the live dot honest.
  const [, tick] = useState(0)
  const running = !!run
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [running])

  const byId = useMemo(() => {
    if (!run || !ready) return new Map<string, SeBlock>()
    const generated = seDesk.generated.filter((g) => g.subtopicId === run.subtopicId).flatMap((g) => g.blocks)
    // Deliberately NOT run through `seForFix`: that shuffles a choice's options,
    // so the order here would not match his screen. Nothing below names a
    // position — the answer is always given as text — so order does not matter.
    const map = new Map(seWithChecks(seAvailable(packFor(run.subtopicId), generated)).map((b) => [b.id, b]))
    map.set(SE_WARM_INTRO.id, SE_WARM_INTRO)
    return map
  }, [run?.subtopicId, ready, seDesk.generated]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!kidData) return <div className="card">Loading Ben’s world from the cloud…</div>

  if (!run) return <Idle />

  const where = seFind(run.subtopicId)
  const cur = byId.get(run.blockIds[run.pos])
  const right = run.answers.filter((a) => a.right).length
  const live = seRunIsLive(run)

  return (
    <>
      <div className="h1">🤝 Helping him</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {where?.subtopic.emoji} {where?.subtopic.title}
        {run.fix && ' — mistakes to fix'} · card {run.pos + 1} of {run.blockIds.length} ·{' '}
        {run.answers.length ? `${right}/${run.answers.length} right so far` : 'nothing answered yet'}
      </p>

      {!live && (
        <p className="se-help__stale">
          ⏸ Nothing has moved for {since(lastSeenAt(run))}. This is the card he will come back to, not one he is
          looking at.
        </p>
      )}
      {!kidDataFresh && <p className="muted" style={{ marginBottom: 10 }}>Still catching up from the cloud…</p>}

      {!ready && <div className="card">Fetching the lesson he is in…</div>}
      {ready && !cur && (
        <div className="card muted">
          Card {run.pos + 1} is not in the pack on this device — it was most likely written for him by the AI desk and
          has not reached this phone yet.
        </div>
      )}
      {ready && cur && <HelpCard block={cur} given={answerFor(run, cur.id)} />}

      {run.answers.length > 0 && <SoFar answers={run.answers} />}
    </>
  )
}

function Idle() {
  const { kidData } = useStore()
  const recent = [...(kidData?.steugene.history ?? [])].reverse().slice(0, 6)
  return (
    <>
      <div className="h1">🤝 Helping him</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Ben is not in a lesson. Open this page while he is working and it shows the exact card on his screen — with the
        answer, the reason, and how to walk him through it.
      </p>
      {recent.length > 0 && (
        <div className="card">
          <div className="h1" style={{ fontSize: 18 }}>🕘 The last few he answered</div>
          {recent.map((a, i) => (
            <Line key={i} a={a} />
          ))}
        </div>
      )}
    </>
  )
}

function SoFar({ answers }: { answers: SeAnswer[] }) {
  return (
    <div className="card">
      <div className="h1" style={{ fontSize: 18 }}>📋 This lesson so far</div>
      {[...answers].reverse().slice(0, 10).map((a, i) => (
        <Line key={i} a={a} />
      ))}
    </div>
  )
}

function Line({ a }: { a: SeAnswer }) {
  return (
    <div className="se-miss">
      <div className="se-miss__q">
        {a.right ? '✅' : '❌'} {a.helped && '🤔 '}
        {a.prompt}
      </div>
      <div className="se-miss__a">
        {a.right ? (
          <span className="se-miss__right">{a.given}</span>
        ) : (
          <>
            <span className="se-miss__given">{a.given}</span>
            <span className="muted"> → </span>
            <span className="se-miss__right">{a.expected}</span>
          </>
        )}
        <span className="muted"> · {ago(a.at)}</span>
      </div>
    </div>
  )
}

// --- the card he is on -------------------------------------------------------

function HelpCard({ block, given }: { block: SeBlock; given?: SeAnswer }) {
  if (block.kind === 'explain') {
    return (
      <div className="card se-help">
        <div className="se-help__kind">📖 Something to read — nothing for him to answer</div>
        <div className="se-help__q">
          {block.emoji} {block.title}
        </div>
        {block.lines.map((l, i) => (
          <p key={i} className="se-help__line">
            {l}
          </p>
        ))}
        {block.art && <SeArtwork art={block.art} />}
        {block.callout && <p className="se-help__line"><strong>{block.callout.text}</strong></p>}
      </div>
    )
  }

  if (block.kind === 'choice') {
    return (
      <div className="card se-help">
        <div className="se-help__kind">❓ He picks one of three</div>
        <div className="se-help__q">{block.prompt}</div>
        {block.art && <SeArtwork art={block.art} />}
        <Options options={block.options} answer={block.answer} />
        <Key expected={block.options[block.answer]} why={block.why} steps={block.steps} given={given} />
      </div>
    )
  }

  if (block.kind === 'build') {
    return (
      <div className="card se-help">
        <div className="se-help__kind">⌨️ He builds the answer out of tiles</div>
        <div className="se-help__q">{block.prompt}</div>
        {block.art && <SeArtwork art={block.art} />}
        <Key expected={block.answer} why={block.why} steps={block.steps} given={given} />
      </div>
    )
  }

  if (block.kind === 'video') {
    return (
      <div className="card se-help">
        <div className="se-help__kind">
          ▶️ A video he cannot skip, then {block.checks.length} question{block.checks.length === 1 ? '' : 's'}
        </div>
        <div className="se-help__q">{block.title}</div>
        {block.by && <p className="se-help__line muted">{block.by}</p>}
        {block.watchFor && (
          <p className="se-help__line">
            <strong>He was told to listen for:</strong> {block.watchFor}
          </p>
        )}
        <p className="se-help__line muted">The questions come after it. Here they are, with their answers:</p>
        {block.checks.map((c, i) => (
          <div key={i} className="se-help__check">
            <div className="se-help__q" style={{ fontSize: 16 }}>
              {i + 1}. {c.prompt}
            </div>
            <Options options={c.options} answer={c.answer} />
            <Key expected={c.options[c.answer]} why={c.why} steps={c.steps} quiet />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card se-help">
      <div className="se-help__kind">🎮 A game he taps through</div>
      <div className="se-help__q">{block.title}</div>
      <div className="se-help__key">
        <div className="se-help__keylabel">✅ The order it wants</div>
        <div className="se-help__keyval" style={{ fontSize: 17 }}>
          {gameSolution(block.game)}
        </div>
      </div>
      {block.why && <p className="se-help__why">💡 {block.why}</p>}
    </div>
  )
}

/** What tapping it correctly looks like, in words — so Dad can see it without playing it. */
function gameSolution(game: Extract<SeBlock, { kind: 'game' }>['game']): string {
  if (game.mode === 'order') {
    return [...game.values]
      .sort((a, b) => a.value - b.value)
      .map((v) => v.label)
      .join('  →  ')
  }
  if (game.mode === 'pair') return game.pairs.map(([a, b]) => `${a} ↔ ${b}`).join(' · ')
  return game.targets.map((t) => `${t.label} → ${t.at}`).join(' · ')
}

function Options({ options, answer }: { options: string[]; answer: number }) {
  return (
    <ul className="se-help__opts">
      {options.map((o, i) => (
        <li key={i} className={i === answer ? 'is-key' : ''}>
          <span aria-hidden>{i === answer ? '✅' : '◦'}</span>
          <span>{o}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The answer, the reason, and the walk-through — all open.
 *
 * The walk-through is the same steps Ben is shown after a wrong answer, and it
 * is worked on DIFFERENT numbers by design (§24f). That makes it exactly the
 * right thing to read out while he still has the question in front of him: it
 * is the method, not the answer.
 */
function Key({
  expected,
  why,
  steps,
  given,
  quiet,
}: {
  expected: string
  why: string
  steps?: SeStep[]
  given?: SeAnswer
  quiet?: boolean
}) {
  return (
    <>
      <div className="se-help__key">
        <div className="se-help__keylabel">✅ The answer</div>
        <div className="se-help__keyval">{expected}</div>
      </div>
      <p className="se-help__why">💡 {why}</p>
      {steps && steps.length > 0 && (
        <div className="se-walk">
          <div className="se-walk__label se-help__walklabel">🪜 How to walk him through it — different numbers on purpose</div>
          {steps.map((s, i) => (
            <div key={i} className="se-walk__step">
              <span className="se-walk__n">{i + 1}</span>
              <div>
                <div>{s.text}</div>
                {s.art && <SeArtwork art={s.art} />}
              </div>
            </div>
          ))}
        </div>
      )}
      {given ? (
        <div className={`se-help__given ${given.right ? 'is-right' : 'is-wrong'}`}>
          {given.right ? '✅' : '❌'} He has already answered this one: <strong>{given.given}</strong>
          {given.helped && ' · after asking for a nudge'}
        </div>
      ) : (
        !quiet && (
          <div className="se-help__now">
            ⚠️ He has not answered yet. The moment he taps, it is final — explain it now, not after.
          </div>
        )
      )}
    </>
  )
}

// --- the Desk's live line ----------------------------------------------------

/** One tappable line on Dad's desk, only while a lesson is actually in flight. */
export function SeHelpingBanner({ onOpen }: { onOpen: () => void }) {
  const { kidData } = useStore()
  const run = kidData?.steugene.run
  if (!run || !seRunIsLive(run)) return null
  const where = seFind(run.subtopicId)
  return (
    <button className="card se-help-live" onClick={onOpen}>
      <span className="se-help-live__dot" aria-hidden />
      <span className="se-help-live__text">
        <strong>Ben is in a lesson right now</strong>
        <span className="muted">
          {' '}
          — {where?.subtopic.title ?? run.subtopicId}, card {run.pos + 1} of {run.blockIds.length}
        </span>
      </span>
      <span className="se-help-live__go" aria-hidden>
        →
      </span>
    </button>
  )
}
