// 🏫 St. Eugene 7 (§24c) — the app reads to him.
//
// He can do the maths. Reading the question is the part that stops him, and
// every minute he spends decoding a sentence is a minute he is not learning
// the thing the sentence is about. So every block can be read out loud, and
// the questions read themselves the moment they appear.
//
// It costs nothing per word: this is the device's own voice, not a model.
// Two engines, in this order:
//  1. The Android shell's native TextToSpeech (`window.WheelsShell.speak`).
//     Preferred inside the shell, because Android's WebView exposes a
//     `speechSynthesis` object that reports no voices and silently says
//     nothing — worse than not having it.
//  2. The browser's own `speechSynthesis`, which is what Chrome gives us.
import { inShell } from '../push'

/** Symbols a speech engine reads as punctuation, or skips entirely. */
const SAY: [RegExp, string | ((match: string) => string)][] = [
  [/−/g, ' minus '], // U+2212, the one the packs use
  [/(^|[\s(])-(\d)/g, '$1minus $2'], // a leading hyphen is a sign, not a dash
  [/√/g, ' the square root of '],
  [/²/g, ' squared'],
  [/³/g, ' cubed'],
  [/[⁴⁵⁶⁷⁸⁹]/g, (d) => ` to the power of ${'⁴⁵⁶⁷⁸⁹'.indexOf(d) + 4}`],
  [/(\d)½/g, '$1 and a half'], // 1½ pizzas
  [/(\d)¼/g, '$1 and a quarter'],
  [/(\d)¾/g, '$1 and three quarters'],
  [/(\d)⅓/g, '$1 and a third'],
  [/(\d)⅔/g, '$1 and two thirds'],
  [/½/g, ' one half'],
  [/¼/g, ' one quarter'],
  [/¾/g, ' three quarters'],
  [/(\d)\s:\s(\d)/g, '$1 to $2'], // a ratio, 3 : 5
  [/≈/g, ' about '],
  [/→/g, ' becomes '],
  [/÷/g, ' divided by '],
  [/×/g, ' times '],
  [/≥/g, ' is greater than or equal to '],
  [/≤/g, ' is less than or equal to '],
  [/</g, ' is less than '],
  [/>/g, ' is greater than '],
  [/(\d)\s*\/\s*(\d)/g, '$1 over $2'], // 3/4 → "three over four"
  [/%/g, ' percent'],
  [/°C/g, ' degrees Celsius'],
  [/π/g, ' pi '],
  [/…/g, ' and so on'],
  [/\|([^|]+)\|/g, ' the absolute value of $1 '], // |−20|
  [/\s+/g, ' '],
]

/** Turn a line of a lesson into something a speech engine says correctly. */
export function speakable(text: string): string {
  return SAY.reduce((out, [re, to]) => (typeof to === 'string' ? out.replace(re, to) : out.replace(re, to)), text).trim()
}

export function canSpeak(): boolean {
  const shell = inShell()
  if (shell?.speak) return shell.canSpeak?.() !== false
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** The clearest English voice this device has. Cached once the list arrives. */
let chosen: SpeechSynthesisVoice | null = null
function pickVoice(): SpeechSynthesisVoice | null {
  if (chosen) return chosen
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  if (!voices.length) return null
  const score = (v: SpeechSynthesisVoice) =>
    (/^en[-_]CA/i.test(v.lang) ? 4 : /^en[-_](US|GB)/i.test(v.lang) ? 3 : /^en/i.test(v.lang) ? 2 : 0) +
    // the neural voices are worth hunting for: he is listening to these for an
    // hour a day, and the old formant ones are exhausting
    (/google|natural|neural|samantha|aria|siri/i.test(v.name) ? 2 : 0)
  const best = [...voices].sort((a, b) => score(b) - score(a))[0]
  chosen = score(best) > 0 ? best : null
  return chosen
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // The voice list is empty on first call in every browser. This is the event
  // that says it has arrived.
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    chosen = null
    pickVoice()
  })
}

/** Roughly how long the voice takes to say it: ~2.5 words a second at rate 1, plus the engine's warm-up. */
function sayingMs(text: string, rate: number): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return 500 + (words / (2.5 * rate)) * 1000
}

/**
 * Say it. Anything already being said is cut off — the newest card wins.
 * `onDone` fires once, when the voice finishes. The Android shell has no
 * "finished" callback and Chrome sometimes never sends one, so a timer sized
 * to the sentence is the backstop — the game never waits on a silent engine.
 */
export function speak(text: string, rate = 0.9, onDone?: () => void): void {
  const clean = speakable(text)
  let fired = false
  const done = () => {
    if (fired) return
    fired = true
    onDone?.()
  }
  if (!clean) return done()
  const shell = inShell()
  if (shell?.speak) {
    shell.stopSpeaking?.()
    shell.speak(clean, rate)
    if (onDone) window.setTimeout(done, sayingMs(clean, rate))
    return
  }
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth) return done()
  synth.cancel()
  const u = new SpeechSynthesisUtterance(clean)
  if (onDone) {
    u.onend = done
    u.onerror = done
    window.setTimeout(done, sayingMs(clean, rate) + 1500)
  }
  u.rate = rate
  u.pitch = 1
  const voice = pickVoice()
  if (voice) {
    u.voice = voice
    u.lang = voice.lang
  } else {
    u.lang = 'en-CA'
  }
  synth.speak(u)
}

export function stopSpeaking(): void {
  inShell()?.stopSpeaking?.()
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
}
