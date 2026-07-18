// Tiny DOM effects that don't belong in React state.

/**
 * Fly a handful of 🪙 from `from` (a card, a button…) to the topbar Berry
 * counter, then bump the counter. Purely cosmetic — the balance is already
 * committed by the time this runs.
 */
export function flyBerries(from: Element | null, earned: number): void {
  const target = document.querySelector('.stat--gem')
  if (!target) return
  const t = target.getBoundingClientRect()
  const f = (from ?? document.body).getBoundingClientRect()
  const coins = Math.min(Math.max(3, Math.ceil(earned / 2)), 8)
  for (let i = 0; i < coins; i++) {
    const el = document.createElement('span')
    el.textContent = '🪙'
    el.className = 'berry-fly'
    const sx = f.left + f.width / 2 + (Math.random() * 80 - 40)
    const sy = f.top + Math.min(f.height / 2, 140) + (Math.random() * 40 - 20)
    el.style.left = `${sx}px`
    el.style.top = `${sy}px`
    document.body.appendChild(el)
    const dx = t.left + t.width / 2 - sx
    const dy = t.top + t.height / 2 - sy
    const anim = el.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.3}px, ${dy * 0.25 - 50}px) scale(1.25)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0.9 },
      ],
      { duration: 620 + i * 60, delay: i * 55, easing: 'cubic-bezier(0.3, 0, 0.7, 1)', fill: 'forwards' },
    )
    anim.onfinish = () => {
      el.remove()
      target.classList.add('stat-bump')
      window.setTimeout(() => target.classList.remove('stat-bump'), 300)
    }
  }
}
