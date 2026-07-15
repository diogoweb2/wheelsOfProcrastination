// Original hand-drawn SVG of the Straw Hat Pirates' Jolly Roger — skull with straw
// hat and crossbones. Fan art in the app's style (no official asset). Palette colors.
interface Props {
  size?: number
  className?: string
  /** while true, the skull does a silly squash-and-wobble */
  spinning?: boolean
}

export function JollyRoger({ size = 66, className = '', spinning = false }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`jolly${spinning ? ' jolly--spin' : ''} ${className}`}
      role="img"
      aria-label="Straw Hat Jolly Roger"
    >
      {/* crossbones behind everything */}
      <g fill="#fff" stroke="#111" strokeWidth="2.4" strokeLinejoin="round">
        {[40, -40].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 50 52)`}>
            <rect x="14" y="49" width="72" height="6" rx="3" />
            <circle cx="15" cy="48" r="5.4" />
            <circle cx="15" cy="56" r="5.4" />
            <circle cx="85" cy="48" r="5.4" />
            <circle cx="85" cy="56" r="5.4" />
          </g>
        ))}
      </g>

      {/* skull: cranium + jaw */}
      <g fill="#fff" stroke="#111" strokeWidth="2.6" strokeLinejoin="round">
        <path d="M28 48 Q28 30 50 30 Q72 30 72 48 Q72 60 64 64 L36 64 Q28 60 28 48Z" />
        <path d="M37 62 h26 a3 3 0 0 1 3 3 v9 a5 5 0 0 1 -5 5 h-22 a5 5 0 0 1 -5 -5 v-9 a3 3 0 0 1 3 -3Z" />
      </g>

      {/* jaw grid (teeth) */}
      <g stroke="#111" strokeWidth="1.5" strokeLinecap="round">
        <line x1="37" y1="71" x2="66" y2="71" />
        <line x1="44" y1="62" x2="44" y2="79" />
        <line x1="50" y1="62" x2="50" y2="79" />
        <line x1="56" y1="62" x2="56" y2="79" />
      </g>

      {/* eyes + nose */}
      <g fill="#111">
        <ellipse cx="41" cy="49" rx="6.4" ry="8.4" transform="rotate(-8 41 49)" />
        <ellipse cx="59" cy="49" rx="6.4" ry="8.4" transform="rotate(8 59 49)" />
        <path d="M50 54 l4 6 h-8Z" />
      </g>

      {/* straw hat */}
      <g stroke="#111" strokeWidth="2.6" strokeLinejoin="round">
        {/* crown */}
        <path d="M31 32 Q31 13 50 13 Q69 13 69 32Z" fill="#ffce00" />
        {/* red band */}
        <path d="M31 31 Q50 37 69 31 L69 26 Q50 31 31 26Z" fill="#d70000" stroke="none" />
        {/* straw stitch lines */}
        <g stroke="#111" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M40 29 l3 -8" />
          <path d="M44 29 l2 -8" />
          <path d="M58 29 l-2 -8" />
          <path d="M62 29 l-3 -8" />
        </g>
        {/* brim */}
        <ellipse cx="50" cy="36" rx="42" ry="5.5" fill="#ffce00" />
      </g>
    </svg>
  )
}
