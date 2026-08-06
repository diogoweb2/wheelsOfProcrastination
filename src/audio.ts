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
