// All sounds synthesized with WebAudio — zero audio assets.
let ctx: AudioContext | null = null
let muted = false

export function setMuted(m: boolean) {
  muted = m
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
