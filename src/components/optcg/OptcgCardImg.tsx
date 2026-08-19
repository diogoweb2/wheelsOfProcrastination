// One card face. The art is hotlinked, never stored here.
//
// The publisher's own image host refuses cross-origin embedding
// (`Cross-Origin-Resource-Policy: same-site`), so we point at a public mirror
// and keep a second one in reserve: if the first 404s or is blocked, `onError`
// swaps the src once, and after that the card falls back to a printed name so a
// dead link never leaves a hole on the board.
import { useEffect, useState } from 'react'
import { artFallbackUrl, artUrl, card } from '../../logic/optcg'

export function OptcgCardImg({
  code,
  size = 'sm',
  rested = false,
  onClick,
  className = '',
  title,
}: {
  code: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  rested?: boolean
  onClick?: () => void
  className?: string
  title?: string
}) {
  const [step, setStep] = useState(0)
  // A new card in the same slot starts its own fallback chain.
  useEffect(() => setStep(0), [code])

  const c = card(code)
  const cls = `optcg-card optcg-card--${size}${rested ? ' optcg-card--rested' : ''}${onClick ? ' optcg-card--live' : ''} ${className}`

  if (step > 1) {
    return (
      <div className={`${cls} optcg-card--blank`} onClick={onClick} title={title ?? c.name}>
        <span>{c.name}</span>
        <small>{c.code}</small>
      </div>
    )
  }
  return (
    <img
      className={cls}
      src={step === 0 ? artUrl(code) : artFallbackUrl(code)}
      alt={c.name}
      title={title ?? `${c.name} — ${c.effect || 'no effect'}`}
      loading="lazy"
      onError={() => setStep((s) => s + 1)}
      onClick={onClick}
    />
  )
}

/** The back of a card: hands and Life stacks that must stay face down. */
export function OptcgCardBack({ size = 'sm', label }: { size?: 'xs' | 'sm' | 'md' | 'lg'; label?: string }) {
  return (
    <div className={`optcg-card optcg-card--${size} optcg-card--back`}>
      <span>{label ?? '🏴‍☠️'}</span>
    </div>
  )
}
