// Luffy mascot — swaps between state images (public/luffy-*.png|gif|webp).
// `state` drives which image + animation shows; `mood` is kept in the API for
// compatibility with older call sites and only tweaks a subtle tint.
export type LuffyMood = 'idle' | 'happy' | 'judging' | 'sleeping' | 'shocked' | 'cool'

// Back-compat alias so older imports keep working.
export type MascotMood = LuffyMood

export type LuffyState = 'default' | 'spinning' | 'easy' | 'hard'

const IMAGE_BY_STATE: Record<LuffyState, string> = {
  default: '/luffy-default.png',
  spinning: '/luffy-spinning.gif',
  easy: '/luffy-easy.png',
  hard: '/luffy-hardTask.webp',
}

const ANIM_BY_STATE: Record<LuffyState, string> = {
  default: 'luffy-idle',
  spinning: 'luffy-nervous',
  easy: 'luffy-pop',
  hard: 'luffy-pop',
}

interface Props {
  mood?: LuffyMood
  state?: LuffyState
  size?: number
  className?: string
}

export function Luffy({ mood = 'idle', state = 'default', size = 140, className = '' }: Props) {
  return (
    <img
      // keying by state restarts the pop animation every time the state flips
      key={state}
      src={IMAGE_BY_STATE[state]}
      width={size}
      height={size}
      className={`${ANIM_BY_STATE[state]} ${className}`.trim()}
      alt="Luffy"
      draggable={false}
      style={{
        objectFit: 'contain',
        // dim + desaturate a touch while asleep so he reads as "resting"
        opacity: mood === 'sleeping' ? 0.75 : 1,
        filter: mood === 'sleeping' ? 'grayscale(0.35)' : 'none',
        userSelect: 'none',
      }}
    />
  )
}
