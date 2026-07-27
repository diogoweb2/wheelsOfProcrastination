import { useEffect, useMemo } from 'react'
import confetti from 'canvas-confetti'
import { ALL_STICKER_IDS, stickerUrl } from '../logic/album'
import { playClip, sfx } from '../audio'

/** Kid Luffy cackling — the party lasts exactly as long as he does. */
const PARTY_THEME = '/kid-luffy-laugh.m4a'

/**
 * The clip's own length (~6.1s), used to time the confetti and as the backstop
 * that closes the party if the audio is muted or blocked and never reports back.
 */
export const PARTY_MS = 6200

const FLAIR = ['🏴‍☠️', '👒', '🍖', '⚓', '💰', '🌊', '⚔️', '🍊', '🦑', '🧭', '🥩', '🪙']

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Five seconds of confetti, staged so the screen never goes quiet. */
function fireworks() {
  const colors = ['#ffce00', '#d70000', '#60bff5', '#fff', '#af6528', '#ff9600']
  const timers: number[] = []

  // opening double-cannon from the bottom corners
  for (const delay of [0, 220, 460]) {
    timers.push(
      window.setTimeout(() => {
        for (const x of [0, 1]) {
          void confetti({
            particleCount: 90,
            angle: x === 0 ? 58 : 122,
            spread: 80,
            startVelocity: 68,
            origin: { x, y: 0.9 },
            colors,
            scalar: 1.2,
          })
        }
      }, delay),
    )
  }

  // then a random pop somewhere on screen every ~350ms for the rest of the party
  for (let t = 700; t < PARTY_MS - 400; t += 350) {
    timers.push(
      window.setTimeout(() => {
        void confetti({
          particleCount: 45,
          spread: rand(60, 130),
          startVelocity: rand(28, 50),
          origin: { x: rand(0.15, 0.85), y: rand(0.2, 0.7) },
          colors,
          scalar: rand(0.8, 1.3),
        })
      }, t),
    )
  }

  // and a slow golden curtain over the top of everything
  timers.push(
    window.setTimeout(() => {
      void confetti({
        particleCount: 160,
        spread: 140,
        startVelocity: 32,
        gravity: 0.5,
        decay: 0.94,
        origin: { y: 0.1 },
        colors: ['#ffce00', '#fff'],
        scalar: 1.4,
      })
    }, 900),
  )

  return () => timers.forEach((t) => window.clearTimeout(t))
}

/**
 * The victory party: the winner's icon on a spinning gold sunburst while the
 * whole sticker album bursts out of the middle of the screen, pirate flair
 * flies past and confetti never stops. Runs PARTY_MS, or until tapped.
 */
export function VictoryParty({
  name,
  emoji,
  onDone,
}: {
  name: string
  emoji: string
  onDone: () => void
}) {
  // one random cast of flying cards + flair per party
  const cards = useMemo(() => {
    const pool = [...ALL_STICKER_IDS].sort(() => Math.random() - 0.5).slice(0, 22)
    return pool.map((id) => ({
      id,
      dx: `${rand(-62, 62)}vw`,
      dy: `${rand(-58, 58)}vh`,
      rot: `${rand(-900, 900)}deg`,
      dur: `${rand(1.8, 3.2)}s`,
      delay: `${rand(0, 2.6)}s`,
    }))
  }, [])

  const flair = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        key: i,
        char: FLAIR[Math.floor(Math.random() * FLAIR.length)],
        left: `${rand(2, 94)}%`,
        dur: `${rand(2.2, 4)}s`,
        delay: `${rand(0, 3)}s`,
        size: `${rand(20, 42)}px`,
        drift: `${rand(-18, 18)}vw`,
      })),
    [],
  )

  useEffect(() => {
    sfx.fanfare()
    const stopTheme = playClip(PARTY_THEME, 0.8, onDone) // the laugh calls last orders
    const stopConfetti = fireworks()
    const end = window.setTimeout(onDone, PARTY_MS + 300) // backstop if the audio never plays
    return () => {
      stopTheme() // also cuts the laugh short when the party is tapped away
      stopConfetti()
      window.clearTimeout(end)
    }
  }, [onDone])

  return (
    <div className="party" onClick={onDone} role="presentation">
      <div className="party-rays" />

      {cards.map((c, i) => (
        <img
          key={`${c.id}-${i}`}
          className="party-card"
          src={stickerUrl(c.id)}
          alt=""
          draggable={false}
          style={
            {
              '--dx': c.dx,
              '--dy': c.dy,
              '--rot': c.rot,
              animationDuration: c.dur,
              animationDelay: c.delay,
            } as React.CSSProperties
          }
        />
      ))}

      {flair.map((f) => (
        <span
          key={f.key}
          className="party-flair"
          style={
            {
              '--drift': f.drift,
              left: f.left,
              fontSize: f.size,
              animationDuration: f.dur,
              animationDelay: f.delay,
            } as React.CSSProperties
          }
        >
          {f.char}
        </span>
      ))}

      <div className="party-stage">
        <div className="party-crown">👑</div>
        <div className="party-avatar">{emoji}</div>
        <div className="party-name">{name}</div>
        <div className="party-title">PIRATE KING OF THE LOG BOOK</div>
        <div className="party-sub">Album complete — every pirate on the seas! 🏴‍☠️</div>
      </div>

      <div className="party-skip">tap to close</div>
    </div>
  )
}
