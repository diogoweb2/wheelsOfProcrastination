// Original hand-drawn SVG busts of the Straw Hat crew — fan art in the app's chunky
// style (no official assets). Palette follows the One Piece Series scheme.
interface CrewProps {
  size?: number
  className?: string
}

/** Roronoa Zoro — green hair, three earrings, scarred eye, katana in his teeth. */
export function Zoro({ size = 80, className = '' }: CrewProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="Zoro">
      {/* shoulders — dark green */}
      <path d="M12 100 Q10 78 50 73 Q90 78 88 100 Z" fill="#2f5c2a" />
      <path d="M50 73 L44 100 L56 100 Z" fill="#244a20" opacity="0.6" />
      {/* neck */}
      <rect x="42" y="62" width="16" height="16" rx="4" fill="#f0b483" />
      {/* head */}
      <circle cx="50" cy="46" r="26" fill="#f0b483" />
      {/* ear + three gold earrings (viewer's right) */}
      <circle cx="75" cy="48" r="5" fill="#f0b483" />
      <g fill="#ffce00" stroke="#af6528" strokeWidth="0.6">
        <circle cx="78" cy="56" r="2.4" />
        <circle cx="78" cy="62" r="2.4" />
        <circle cx="78" cy="68" r="2.4" />
      </g>
      {/* green hair — short & spiky */}
      <path
        d="M24 46 Q22 18 50 18 Q78 18 76 46 Q71 33 63 33 l3 -8 -8 6 -1 -8 -6 8 -4 -7 -3 8 -7 -4 2 8 q-6 1 -12 4Z"
        fill="#5f9a4a"
      />
      <path d="M26 44 Q34 34 50 34 Q66 34 74 44" fill="none" stroke="#4a7c3f" strokeWidth="2" opacity="0.6" />
      {/* brows — serious */}
      <path d="M33 40 q7 -3 13 1" stroke="#3a2a1c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M55 41 q7 -4 13 -1" stroke="#3a2a1c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* left eye (open, sharp) */}
      <ellipse cx="40" cy="49" rx="4.4" ry="5.4" fill="#fff" />
      <circle cx="40" cy="50" r="3" fill="#2a1c12" />
      {/* right eye — closed, with the scar running over it */}
      <path d="M55 50 q6 3 12 0" stroke="#2a1c12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M62 38 l-3 22" stroke="#c26a4f" strokeWidth="2.4" strokeLinecap="round" />
      {/* katana held in his teeth */}
      <g>
        <rect x="4" y="69" width="46" height="5" rx="2" fill="#d7dde3" />
        <rect x="4" y="69" width="46" height="1.8" fill="#f2f6f9" />
        <rect x="49" y="66.5" width="4" height="10" rx="1.5" fill="#ffce00" stroke="#af6528" strokeWidth="0.6" />
        <rect x="53" y="68" width="32" height="7" rx="3" fill="#20401d" />
        <g stroke="#3f6b39" strokeWidth="1.3">
          <path d="M56 68.5 l4 6" />
          <path d="M62 68.5 l4 6" />
          <path d="M68 68.5 l4 6" />
          <path d="M74 68.5 l4 6" />
        </g>
      </g>
    </svg>
  )
}

/** Tony Tony Chopper — pink hat with an X, antlers, blue nose. Peak cuteness. */
export function Chopper({ size = 80, className = '' }: CrewProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="Chopper">
      {/* antlers */}
      <g fill="#c79a5a" stroke="#a97f43" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M31 30 q-13 -5 -17 -17 q-2 -7 4 -5 q1 9 11 13 q6 2 9 5z" />
        <path d="M69 30 q13 -5 17 -17 q2 -7 -4 -5 q-1 9 -11 13 q-6 2 -9 5z" />
      </g>
      <g stroke="#a97f43" strokeWidth="3" strokeLinecap="round">
        <path d="M20 15 q-5 -2 -8 -7" />
        <path d="M80 15 q5 -2 8 -7" />
      </g>
      {/* ears */}
      <ellipse cx="20" cy="52" rx="9" ry="7" fill="#e3b06a" transform="rotate(-22 20 52)" />
      <ellipse cx="80" cy="52" rx="9" ry="7" fill="#e3b06a" transform="rotate(22 80 52)" />
      {/* face fur */}
      <ellipse cx="50" cy="60" rx="31" ry="29" fill="#edc57e" />
      <ellipse cx="50" cy="70" rx="20" ry="15" fill="#f6ddab" />
      {/* hat crown + brim */}
      <path d="M18 44 Q20 15 50 13 Q80 15 82 44 Q66 33 50 33 Q34 33 18 44Z" fill="#d76b7f" />
      <path d="M13 46 Q50 33 87 46 L85 39 Q50 26 15 39Z" fill="#b8455c" />
      {/* white patch + X */}
      <circle cx="50" cy="27" r="9" fill="#f7f0ea" />
      <path d="M46 23 l8 8 M54 23 l-8 8" stroke="#b8455c" strokeWidth="2.6" strokeLinecap="round" />
      {/* eyes */}
      <ellipse cx="40" cy="59" rx="6" ry="8" fill="#3a2a1c" />
      <ellipse cx="60" cy="59" rx="6" ry="8" fill="#3a2a1c" />
      <circle cx="42" cy="56" r="2" fill="#fff" />
      <circle cx="62" cy="56" r="2" fill="#fff" />
      {/* blue nose */}
      <ellipse cx="50" cy="69" rx="7.5" ry="5.5" fill="#4f96de" />
      <ellipse cx="47.5" cy="67.5" rx="2.2" ry="1.4" fill="#bfe0ff" />
      {/* mouth */}
      <path d="M43 77 q7 5 14 0" stroke="#7a5a30" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Nami — orange hair, bright eyes, and one Berry coin. */
export function Nami({ size = 80, className = '' }: CrewProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="Nami">
      {/* hair behind */}
      <path d="M18 74 Q12 32 50 24 Q88 32 82 74 Q80 88 71 92 L66 58 Q50 50 34 58 L29 92 Q20 88 18 74Z" fill="#f5921f" />
      {/* shoulders — blue & white top */}
      <path d="M22 100 Q20 80 50 76 Q80 80 78 100 Z" fill="#2e63a4" />
      <path d="M40 78 h20 v22 h-20 Z" fill="#eaf4ff" opacity="0.85" />
      {/* neck */}
      <rect x="43" y="62" width="14" height="16" rx="4" fill="#f6c9a0" />
      {/* face */}
      <circle cx="50" cy="46" r="24" fill="#f6c9a0" />
      {/* bangs */}
      <path d="M26 46 Q24 22 50 21 Q76 22 74 46 Q66 31 57 33 l-7 5 -7 -5 Q42 31 34 33 Q30 38 26 46Z" fill="#f5921f" />
      {/* brows */}
      <path d="M35 40 q6 -2 11 0" stroke="#c9761a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M54 40 q6 -2 11 0" stroke="#c9761a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* eyes */}
      <ellipse cx="41" cy="48" rx="4.6" ry="6" fill="#fff" />
      <ellipse cx="59" cy="48" rx="4.6" ry="6" fill="#fff" />
      <circle cx="41" cy="49" r="3.2" fill="#5a3a1c" />
      <circle cx="59" cy="49" r="3.2" fill="#5a3a1c" />
      <circle cx="42.4" cy="47.4" r="1.1" fill="#fff" />
      <circle cx="60.4" cy="47.4" r="1.1" fill="#fff" />
      {/* smile */}
      <path d="M42 58 q8 6 16 0" stroke="#b06a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Berry coin */}
      <g transform="translate(74 74)">
        <circle r="12" fill="#ffce00" stroke="#af6528" strokeWidth="2" />
        <text x="0" y="4.5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#af6528" fontFamily="serif">฿</text>
      </g>
    </svg>
  )
}
