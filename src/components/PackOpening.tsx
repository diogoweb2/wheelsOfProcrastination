import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { stickerById } from '../logic/album'
import { Sticker } from './Sticker'
import { sfx } from '../audio'

/** Big gold burst from both corners — reserved for a brand-new red rare. */
function legendaryBlast() {
  const shots = [0, 180, 380, 620]
  for (const delay of shots) {
    window.setTimeout(() => {
      for (const x of [0, 1]) {
        void confetti({
          particleCount: 70,
          angle: x === 0 ? 60 : 120,
          spread: 78,
          startVelocity: 62,
          origin: { x, y: 0.85 },
          colors: ['#ffce00', '#d70000', '#fff', '#af6528'],
          scalar: 1.15,
        })
      }
    }, delay)
  }
  // a slow golden drift over the top of it
  window.setTimeout(() => {
    void confetti({
      particleCount: 120,
      spread: 130,
      startVelocity: 30,
      gravity: 0.55,
      decay: 0.93,
      origin: { y: 0.2 },
      colors: ['#ffce00', '#fff'],
      scalar: 1.3,
    })
  }, 260)
}

/** Modest pop for an ordinary new card. */
function newCardPop() {
  void confetti({
    particleCount: 45,
    spread: 60,
    startVelocity: 34,
    origin: { y: 0.5 },
    colors: ['#60bff5', '#ffce00', '#fff'],
  })
}

/**
 * The pack ceremony:
 *   sealed  — a pack you shake and tear open
 *   cards   — each card rises face-down, wobbles with suspense (longer + brighter
 *             the rarer it is), then flips. Rares get a gold aura, a rising
 *             "something big is coming" glow, and a full confetti blast.
 *   summary — the whole haul with a new/spare tally.
 * Tapping anywhere advances; tapping during suspense skips straight to the flip.
 */
export function PackOpening({
  drawn,
  ownedBefore,
  onDone,
}: {
  drawn: string[]
  ownedBefore: Set<string> // album contents BEFORE the pack — decides new vs. repeat
  onDone: () => void
}) {
  const [phase, setPhase] = useState<'sealed' | 'tearing' | 'cards' | 'summary'>('sealed')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [charging, setCharging] = useState(false) // suspense wobble before a flip
  const timers = useRef<number[]>([])

  // things already seen earlier in THIS pack count as repeats too
  const seen = new Set(ownedBefore)
  const marks = drawn.map((id) => {
    const isNew = !seen.has(id)
    seen.add(id)
    return isNew
  })

  const current = stickerById(drawn[index])
  const isNew = marks[index]
  const isRare = current?.rarity === 'special'
  const isBig = Boolean(isRare && isNew) // the moment worth a party

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }
  const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

  useEffect(() => clearTimers, [])

  // Suspense then reveal. Rares linger noticeably longer — the wait IS the thrill.
  useEffect(() => {
    if (phase !== 'cards') return
    clearTimers()
    setFlipped(false)
    setCharging(true)
    sfx.tick()

    const suspense = isRare ? 1500 : 620
    // a rising tick-tick-tick under the wobble
    if (isRare) {
      for (const t of [260, 520, 760, 960, 1120, 1250, 1360]) after(t, () => sfx.tick())
    } else {
      after(300, () => sfx.tick())
    }
    after(suspense, () => {
      setCharging(false)
      setFlipped(true)
      if (isBig) {
        sfx.bigWin()
        legendaryBlast()
      } else if (isNew) {
        sfx.fanfare()
        newCardPop()
      } else {
        sfx.spend()
      }
    })
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index])

  function advance() {
    if (phase === 'sealed') {
      sfx.click()
      setPhase('tearing')
      after(760, () => setPhase('cards'))
      return
    }
    if (phase !== 'cards') return
    if (!flipped) {
      // impatient tap — skip the suspense, but still pay off the reveal
      clearTimers()
      setCharging(false)
      setFlipped(true)
      if (isBig) {
        sfx.bigWin()
        legendaryBlast()
      } else if (isNew) {
        sfx.fanfare()
        newCardPop()
      } else {
        sfx.spend()
      }
      return
    }
    if (index + 1 < drawn.length) setIndex(index + 1)
    else {
      sfx.gem()
      setPhase('summary')
    }
  }

  const newCount = marks.filter(Boolean).length
  const dupeCount = drawn.length - newCount
  const rareCount = drawn.filter((id) => stickerById(id)?.rarity === 'special').length

  return (
    <div className="pack-overlay">
      {/* one full-screen tap target for the whole ceremony — no dead zones */}
      {phase !== 'summary' && <button className="pack-tap" onClick={advance} aria-label="Continue" />}

      {(phase === 'sealed' || phase === 'tearing') && (
        <div className="pack-stage pack-stage--sealed">
          <div className={`pack-wrap ${phase === 'tearing' ? 'is-tearing' : ''}`}>
            <div className="pack-shine" />
            <div className="pack-jolly">☠️</div>
            <div className="pack-title">STICKER PACK</div>
            <div className="pack-sub">{drawn.length} cards inside</div>
            {phase === 'tearing' && <div className="pack-burst" />}
          </div>
          <div className="pack-hint">{phase === 'sealed' ? 'Tap to tear it open!' : 'Here we go…'}</div>
        </div>
      )}

      {phase === 'cards' && current && (
        <div className="pack-stage">
          <div className="pack-counter">
            {index + 1} / {drawn.length}
          </div>

          <div className={`pack-flip-shell ${isBig && flipped ? 'is-legendary' : ''}`}>
            {/* aura behind the card: pulses during suspense, explodes on a rare */}
            {charging && <div className={`pack-aura ${isRare ? 'is-rare' : ''}`} />}
            {isBig && flipped && <div className="pack-rays" />}

            <div
              className={`pack-flip ${flipped ? 'is-flipped' : ''} ${charging ? 'is-charging' : ''} ${
                charging && isRare ? 'is-charging-rare' : ''
              }`}
              key={index}
            >
              <div className="pack-flip-inner">
                <div className="pack-face pack-face--back">
                  <div className="pack-jolly">☠️</div>
                </div>
                <div className="pack-face pack-face--front">
                  <Sticker sticker={current} state="reveal" size="lg" badge={isNew ? 'NEW!' : 'SPARE'} />
                </div>
              </div>
            </div>
          </div>

          {charging && isRare && <div className="pack-tease">something rare is coming…</div>}

          {flipped && (
            <div className={`pack-verdict ${isBig ? 'is-legendary' : isNew ? 'is-new' : 'is-dupe'}`}>
              {isBig
                ? '★ LEGENDARY! ★'
                : isRare
                  ? '★ Rare — but a spare ★'
                  : isNew
                    ? 'New for the album!'
                    : 'Repeat — trade bait 🤝'}
            </div>
          )}
          <div className="pack-hint">
            {flipped ? (index + 1 < drawn.length ? 'Tap for the next card' : 'Tap to finish') : 'Tap to reveal'}
          </div>
        </div>
      )}

      {phase === 'summary' && (
        <div className="pack-stage">
          <div className="pack-summary-title">Pack opened!</div>
          <div className="pack-summary-row">
            {drawn.map((id, i) => {
              const s = stickerById(id)
              return s ? (
                <Sticker key={`${id}-${i}`} sticker={s} size="sm" badge={marks[i] ? 'NEW' : undefined} />
              ) : null
            })}
          </div>
          <div className="pack-summary-stats">
            <span className="pack-stat pack-stat--new">{newCount} new</span>
            <span className="pack-stat pack-stat--dupe">{dupeCount} to trade</span>
            {rareCount > 0 && <span className="pack-stat pack-stat--rare">★ {rareCount} rare</span>}
          </div>
          <button className="btn" onClick={() => { sfx.click(); onDone() }}>
            Into the album →
          </button>
        </div>
      )}
    </div>
  )
}
