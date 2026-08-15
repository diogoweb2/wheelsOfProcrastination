// Every sound effect is synthesized with WebAudio; the only audio file in the
// build is the victory-party theme (see playLoop).
let ctx: AudioContext | null = null
let muted = false

export function setMuted(m: boolean) {
  muted = m
}

/**
 * Play an audio file once — used by the victory party, which runs for exactly
 * as long as its theme. `onEnded` fires when the clip finishes; call the
 * returned stop() to cut it short. Respects the mute toggle, and a browser that
 * blocks autoplay stays quiet rather than throwing (onEnded never fires, so
 * callers need their own fallback).
 */
export function playClip(src: string, volume = 0.7, onEnded?: () => void): () => void {
  if (muted) return () => {}
  const el = new Audio(src)
  el.volume = volume
  if (onEnded) el.addEventListener('ended', onEnded)
  void el.play().catch(() => {})
  return () => {
    if (onEnded) el.removeEventListener('ended', onEnded)
    el.pause()
    el.currentTime = 0
  }
}

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slideTo?: number) {
  if (muted) return
  const a = ac()
  const t0 = a.currentTime + when
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  gain.gain.setValueAtTime(vol, t0)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

export const sfx = {
  /** wheel pointer click while spinning */
  tick() {
    tone(1800, 0.03, 'square', 0.04)
  },
  click() {
    tone(600, 0.05, 'sine', 0.12)
  },
  gem() {
    tone(880, 0.09, 'sine', 0.18)
    tone(1320, 0.12, 'sine', 0.15, 0.07)
  },
  fanfare() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, i * 0.11))
    tone(1047, 0.5, 'triangle', 0.15, notes.length * 0.11)
  },
  bigWin() {
    const notes = [523, 659, 784, 880, 1047, 1319]
    notes.forEach((f, i) => {
      tone(f, 0.16, 'triangle', 0.2, i * 0.09)
      tone(f / 2, 0.16, 'sine', 0.1, i * 0.09)
    })
  },
  sad() {
    tone(300, 0.35, 'sawtooth', 0.12, 0, 150)
    tone(150, 0.5, 'sawtooth', 0.1, 0.3, 80)
  },
  freeze() {
    tone(2000, 0.4, 'sine', 0.1, 0, 400)
    tone(2500, 0.3, 'sine', 0.06, 0.1, 600)
  },
  spend() {
    tone(500, 0.08, 'square', 0.08, 0, 350)
  },
  error() {
    tone(220, 0.15, 'square', 0.1)
    tone(180, 0.2, 'square', 0.1, 0.12)
  },
}

// --- Davy Back Duel voices --------------------------------------------------
//
// The only sampled audio in the app besides the victory theme: real One Piece
// shouts make a card game land in a way synthesized blips never will. Every clip
// is a trimmed mono 22 kHz AAC in public/duel/ (~450 KB for the whole pack).
//
// Cards are voiced in two layers, so nothing ever sounds like the wrong pirate:
//   · the QUICK attack plays the card's ELEMENT — a slash, a fire whoosh, a
//     thunderclap. Never a voice, so it can't be attributed to anyone.
//   · the FINISHER plays that CHARACTER's own clip when we have one
//     (`card.voice`, curated in scripts/card-powers.json), and falls back to the
//     element otherwise. Zoro draws steel; Nami calls thunder; Luffy is the only
//     one who ever shouts Gum-Gum.
// `maxMs` cuts playback to the length of the animation it scores.

function sample(src: string, volume: number, maxMs: number) {
  const stop = playClip(src, volume)
  window.setTimeout(stop, maxMs)
}

const elementClip = (element: string) => `/duel/voices/el-${element}.m4a`

export const duelSfx = {
  /** A quick attack: the element's own sound. */
  attack(element: string) {
    sample(elementClip(element), 0.55, 1700)
    tone(320, 0.08, 'square', 0.05, 0, 180)
  },
  /** A finisher: this character's voice if they have one, else their element. */
  special(element: string, voice?: string) {
    sample(voice ? `/duel/voices/${voice}.m4a` : elementClip(element), 0.65, 2600)
    tone(180, 0.14, 'sawtooth', 0.07, 0, 70)
  },
  /** A card is knocked out. */
  ko() {
    sample('/duel/ko.m4a', 0.6, 1500)
  },
  /** A stun / effect rider fires. */
  haki() {
    sample('/duel/haki.m4a', 0.5, 2000)
  },
  /** The chest cracks open at the start of a duel. */
  chest() {
    sample('/duel/chest.m4a', 0.6, 1900)
  },
  /** The Davy Back Dice tumbles. */
  dice() {
    sample('/duel/dice.m4a', 0.6, 1500)
  },
  /**
   * A treasure card resolves. The noise scales with the rarity, which is the
   * whole point of rarities: a Legendary has to SOUND like one before anyone
   * reads what it does.
   */
  treasure(rarity: 'common' | 'rare' | 'epic' | 'legendary') {
    if (rarity === 'legendary') {
      sample('/duel/legendary.m4a', 0.75, 2600)
    } else if (rarity === 'epic') {
      sample('/duel/haki.m4a', 0.65, 2000)
    } else if (rarity === 'rare') {
      tone(880, 0.1, 'triangle', 0.16)
      tone(1320, 0.16, 'triangle', 0.14, 0.08)
    } else {
      tone(660, 0.08, 'sine', 0.13)
      tone(990, 0.1, 'sine', 0.1, 0.06)
    }
  },
  /** The transponder snail: a challenge just landed. */
  challenge() {
    sample('/duel/challenge.m4a', 0.55, 2600)
  },
  win() {
    sample('/duel/win.m4a', 0.7, 2400)
  },
  lose() {
    sample('/duel/lose.m4a', 0.5, 2600)
  },
}

// --- Chess & Checkers ------------------------------------------------------
//
// All synthesized, no files: a board game needs its sounds to be SHORT and
// instant (you hear four of them a minute), and a sampled clip that arrives
// 80ms late reads as lag. Each one is shaped so you can tell what happened
// without looking: a plain move is a dry wooden click, a capture cracks, check
// is an alarm you can't mistake for either.

export const boardSfx = {
  /** A piece is picked up — the quietest sound in the set, it fires constantly. */
  pick() {
    tone(900, 0.035, 'sine', 0.09)
  },
  /** Put back down with nothing played. */
  drop() {
    tone(420, 0.04, 'sine', 0.07)
  },
  /** A plain move: one dry knock on wood. */
  move() {
    tone(260, 0.05, 'square', 0.09, 0, 170)
    tone(140, 0.07, 'sine', 0.07)
  },
  /** A capture: the knock, plus the crack of the piece leaving the board. */
  capture() {
    tone(200, 0.06, 'sawtooth', 0.11, 0, 110)
    tone(700, 0.09, 'square', 0.07, 0.03, 260)
  },
  /** Castling: two knocks, because two pieces moved. */
  castle() {
    tone(300, 0.05, 'square', 0.08, 0, 190)
    tone(300, 0.05, 'square', 0.08, 0.11, 190)
  },
  /** Check — deliberately alarming, and unlike every other sound here. */
  check() {
    tone(1180, 0.12, 'triangle', 0.16)
    tone(880, 0.16, 'triangle', 0.14, 0.13)
  },
  /** A pawn becomes a Queen. */
  promote() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => tone(f, 0.14, 'triangle', 0.17, i * 0.07))
  },
  /** A checker reaches the far row and is crowned. */
  crown() {
    tone(784, 0.1, 'triangle', 0.16)
    tone(1047, 0.12, 'triangle', 0.15, 0.08)
    tone(1568, 0.18, 'sine', 0.12, 0.16)
  },
  /** Tapped a square that can't be played. */
  nope() {
    tone(180, 0.12, 'square', 0.08)
  },
  win() {
    const notes = [523, 659, 784, 1047, 1319]
    notes.forEach((f, i) => tone(f, 0.16, 'triangle', 0.19, i * 0.1))
  },
  lose() {
    tone(392, 0.3, 'sawtooth', 0.11, 0, 196)
    tone(196, 0.45, 'sawtooth', 0.09, 0.26, 98)
  },
  /** A draw is neither — two flat notes that resolve nowhere. */
  draw() {
    tone(523, 0.22, 'sine', 0.12)
    tone(523, 0.3, 'sine', 0.1, 0.24)
  },
}

/**
 * Sea Battle. Three sounds carry the whole game, and the point is that you can
 * tell hit from miss from sinking WITHOUT looking — the shot that matters most
 * is the one that arrived from the other phone while you were looking away.
 */
export const seaSfx = {
  /** The cannon going off — every shot starts with this. */
  fire() {
    tone(320, 0.06, 'square', 0.09, 0, 90)
  },
  /** Into open water: a short falling plop, and nothing else. */
  splash() {
    tone(520, 0.16, 'sine', 0.11, 0.06, 150)
  },
  /** Timber. A low crack that is impossible to mistake for the splash. */
  hit() {
    tone(160, 0.22, 'sawtooth', 0.15, 0.06, 60)
    tone(760, 0.1, 'square', 0.09, 0.07, 220)
  },
  /** A ship goes down: the crack, then the long slide under. */
  sink() {
    tone(150, 0.3, 'sawtooth', 0.16, 0.06, 50)
    tone(400, 0.5, 'triangle', 0.13, 0.16, 80)
    tone(200, 0.6, 'sine', 0.1, 0.3, 60)
  },
  /** A square already fired at. */
  nope() {
    tone(180, 0.1, 'square', 0.07)
  },
  /** A card going into the water during setup — a small, soft thunk. */
  bury() {
    tone(300, 0.08, 'triangle', 0.09, 0, 180)
    tone(140, 0.12, 'sine', 0.08, 0.05)
  },
  /**
   * A buried card springing. Deliberately unlike every other sound in the game:
   * a rising three-note sting, so you know something happened that no ordinary
   * shot could have caused before you have read a single word.
   */
  card() {
    tone(440, 0.1, 'square', 0.1, 0)
    tone(660, 0.1, 'square', 0.1, 0.09)
    tone(880, 0.26, 'triangle', 0.13, 0.18, 1320)
    tone(220, 0.4, 'sawtooth', 0.08, 0.18, 110)
  },
}

// --- background-safe alerts (the Gym's rest timer) --------------------------
//
// Everything above runs through WebAudio, which the browser SUSPENDS the moment
// the tab is hidden — exactly when a rest-timer alert matters most (phone face
// down on the bench, screen off). HTMLAudioElement playback survives that, so
// the gym alerts are rendered to WAV data URIs at runtime and played through an
// <audio> element instead. Still no audio FILES in the build, which is the rule
// the rest of the app follows.
//
// The catch: a hidden page can only START playback if the audio session is
// already alive. `holdAudioSession(true)` keeps a silent loop running for the
// length of a rest, which is what buys us the right to beep later.

/** Render a mono 16-bit PCM WAV as a data: URI. `sample(t)` returns -1…1. */
function renderWav(seconds: number, sample: (t: number) => number, rate = 22050): string {
  const frames = Math.floor(seconds * rate)
  const bytes = new Uint8Array(44 + frames * 2)
  const view = new DataView(bytes.buffer)
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + frames * 2, true)
  ascii(8, 'WAVEfmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // format: PCM
  view.setUint16(22, 1, true) // channels
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  ascii(36, 'data')
  view.setUint32(40, frames * 2, true)
  for (let i = 0; i < frames; i++) {
    const v = Math.max(-1, Math.min(1, sample(i / rate)))
    view.setInt16(44 + i * 2, v * 32767, true)
  }
  let bin = ''
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return `data:audio/wav;base64,${btoa(bin)}`
}

/** A short beep pattern: [frequency Hz, duration s] pairs, silence for freq 0. */
function beeps(pattern: [number, number][]): string {
  const total = pattern.reduce((n, [, d]) => n + d, 0)
  return renderWav(total, (t) => {
    let at = 0
    for (const [freq, dur] of pattern) {
      if (t < at + dur) {
        if (freq === 0) return 0
        const local = t - at
        // quick attack, exponential decay — reads as a "blip", not a buzz
        const env = Math.min(1, local * 60) * Math.exp(-local * 4)
        return Math.sin(2 * Math.PI * freq * local) * 0.55 * env
      }
      at += dur
    }
    return 0
  })
}

const cache = new Map<string, HTMLAudioElement>()

function clip(id: string, build: () => string, volume: number): HTMLAudioElement {
  let el = cache.get(id)
  if (!el) {
    el = new Audio(build())
    el.preload = 'auto'
    cache.set(id, el)
  }
  el.volume = volume
  return el
}

function fire(el: HTMLAudioElement) {
  if (muted) return
  el.currentTime = 0
  void el.play().catch(() => {
    /* autoplay blocked (no gesture yet) — the on-screen timer is still correct */
  })
}

/** Rest-timer alerts. These keep working with the screen off; `sfx` above does not. */
export const gymSfx = {
  /** Rest is nearly over — get back to the bar. */
  warn() {
    fire(clip('gym-warn', () => beeps([[880, 0.12], [0, 0.1], [880, 0.12]]), 0.7))
  },
  /** Rest is done. Deliberately the loudest thing the app plays. */
  go() {
    fire(clip('gym-go', () => beeps([[660, 0.14], [0, 0.05], [990, 0.14], [0, 0.05], [1320, 0.35]]), 0.9))
  },
  /** A set is in the book. */
  logged() {
    fire(clip('gym-logged', () => beeps([[1046, 0.08], [0, 0.03], [1568, 0.12]]), 0.5))
  },
  /** Session finished / personal record. */
  win() {
    fire(clip('gym-win', () => beeps([[523, 0.13], [659, 0.13], [784, 0.13], [1047, 0.4]]), 0.8))
  },
}

/** Warm the clips up on the first user gesture, so the first real beep isn't the one that gets blocked. */
export function primeGymAudio() {
  if (muted) return
  for (const el of [
    clip('gym-warn', () => beeps([[880, 0.12], [0, 0.1], [880, 0.12]]), 0),
    clip('gym-go', () => beeps([[660, 0.14], [0, 0.05], [990, 0.14], [0, 0.05], [1320, 0.35]]), 0),
    clip('gym-logged', () => beeps([[1046, 0.08], [0, 0.03], [1568, 0.12]]), 0),
    clip('gym-win', () => beeps([[523, 0.13], [659, 0.13], [784, 0.13], [1047, 0.4]]), 0),
  ]) {
    void el.play().then(() => {
      el.pause()
      el.currentTime = 0
    }).catch(() => {})
  }
}

let keeper: HTMLAudioElement | null = null

/**
 * Hold the audio session open so a beep can still fire once the page is hidden.
 * Called for the duration of a rest countdown. The loop is a very quiet low tone
 * rather than pure digital silence — some browsers stop scheduling a track that
 * is entirely zeroes.
 */
export function holdAudioSession(on: boolean) {
  if (!on) {
    keeper?.pause()
    return
  }
  if (muted) return
  if (!keeper) {
    keeper = new Audio(renderWav(2, (t) => Math.sin(2 * Math.PI * 60 * t) * 0.0015, 8000))
    keeper.loop = true
    keeper.volume = 0.02
  }
  void keeper.play().catch(() => {})
}
