// Original hand-drawn SVG of Monkey D. Luffy — the crew's hype-man mascot.
// Fan art in the app's chunky style (no official assets). Moods change eyes/mouth/props.
export type LuffyMood = 'idle' | 'happy' | 'judging' | 'sleeping' | 'shocked' | 'cool'

// Back-compat alias so older imports keep working.
export type MascotMood = LuffyMood

interface Props {
  mood?: LuffyMood
  size?: number
  className?: string
}

export function Luffy({ mood = 'idle', size = 140, className = '' }: Props) {
  const asleep = mood === 'sleeping'
  return (
    <svg
      viewBox="0 0 200 210"
      width={size}
      height={size * 1.05}
      className={className}
      role="img"
      aria-label="Luffy"
    >
      <defs>
        <radialGradient id="luffySkin" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#ffd9ac" />
          <stop offset="100%" stopColor="#f0b483" />
        </radialGradient>
        <linearGradient id="luffyStraw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#e0a82e" />
        </linearGradient>
      </defs>

      {/* ---- shoulders / red vest ---- */}
      <path d="M34 210 Q30 158 62 150 Q100 168 138 150 Q170 158 166 210 Z" fill="#d70000" />
      <path d="M62 150 Q100 168 138 150 L120 210 L80 210 Z" fill="#a30000" opacity="0.55" />
      {/* chest skin in the V */}
      <path d="M84 150 Q100 176 116 150 Z" fill="url(#luffySkin)" />
      {/* neck */}
      <rect x="86" y="128" width="28" height="26" rx="10" fill="#f0b483" />

      {/* ---- hair behind head ---- */}
      <path
        d="M52 96 Q40 52 100 44 Q160 52 148 96 Q150 116 138 122 Q120 108 100 110 Q80 108 62 122 Q50 116 52 96Z"
        fill="#1c1613"
      />

      {/* ---- head ---- */}
      <g className={asleep ? '' : 'mascot-bob'}>
        <circle cx="100" cy="92" r="43" fill="url(#luffySkin)" />
        {/* ears */}
        <circle cx="58" cy="96" r="9" fill="#f0b483" />
        <circle cx="142" cy="96" r="9" fill="#f0b483" />
        <circle cx="58" cy="96" r="4" fill="#d99b6b" />
        <circle cx="142" cy="96" r="4" fill="#d99b6b" />

        {/* jagged bangs poking out under the brim */}
        <path
          d="M63 78 l6 12 5 -12 6 13 6 -13 6 13 6 -13 6 13 6 -12 5 12 6 -13 q-38 -10 -75 0Z"
          fill="#1c1613"
        />

        {/* ---- scar under Luffy's eye (two stitches) ---- */}
        <g stroke="#b8503b" strokeWidth="2.4" strokeLinecap="round">
          <path d="M120 106 v9" />
          <path d="M116 108 h8" />
          <path d="M116 113 h8" />
        </g>

        {/* ---- eyes ---- */}
        {asleep ? (
          <g stroke="#2a211c" strokeWidth="3.2" fill="none" strokeLinecap="round">
            <path d="M74 92 q8 6 16 0" />
            <path d="M110 92 q8 6 16 0" />
          </g>
        ) : mood === 'judging' ? (
          <g>
            <rect x="72" y="90" width="20" height="6" rx="3" fill="#2a211c" />
            <rect x="108" y="90" width="20" height="6" rx="3" fill="#2a211c" />
            <g stroke="#2a211c" strokeWidth="3.5" strokeLinecap="round">
              <path d="M72 82 q10 -3 20 1" />
              <path d="M108 83 q10 -4 20 -1" />
            </g>
          </g>
        ) : (
          <g className={mood === 'shocked' ? '' : 'mascot-blink'}>
            <ellipse cx="82" cy="90" rx={mood === 'shocked' ? 12 : 9} ry={mood === 'shocked' ? 15 : 12} fill="#fff" />
            <ellipse cx="118" cy="90" rx={mood === 'shocked' ? 12 : 9} ry={mood === 'shocked' ? 15 : 12} fill="#fff" />
            <circle cx="83" cy={mood === 'shocked' ? 93 : 92} r={mood === 'shocked' ? 5 : 6} fill="#241c18" />
            <circle cx="117" cy={mood === 'shocked' ? 93 : 92} r={mood === 'shocked' ? 5 : 6} fill="#241c18" />
            <circle cx="85" cy="89" r="1.9" fill="#fff" />
            <circle cx="119" cy="89" r="1.9" fill="#fff" />
          </g>
        )}

        {/* ---- mouth by mood ---- */}
        {mood === 'happy' ? (
          // huge open grin
          <g>
            <path d="M76 112 Q100 118 124 112 Q120 140 100 141 Q80 140 76 112Z" fill="#6e241f" />
            <path d="M78 113 Q100 118 122 113 L120 120 Q100 124 80 120Z" fill="#fff" />
            <path d="M88 138 Q100 132 112 138 Q100 143 88 138Z" fill="#e8756b" />
          </g>
        ) : mood === 'shocked' ? (
          <ellipse cx="100" cy="122" rx="12" ry="15" fill="#6e241f" />
        ) : mood === 'cool' ? (
          <path d="M80 116 Q100 130 120 114 Q112 124 100 124 Q88 124 80 116Z" fill="#6e241f" />
        ) : mood === 'sleeping' ? (
          <ellipse cx="100" cy="120" rx="8" ry="6" fill="#6e241f" />
        ) : (
          // idle — the classic wide grin
          <path d="M78 114 Q100 134 122 114 Q112 126 100 126 Q88 126 78 114Z" fill="#6e241f" />
        )}
      </g>

      {/* ---- straw hat (over the head) ---- */}
      <g>
        {/* brim */}
        <ellipse cx="100" cy="60" rx="90" ry="19" fill="url(#luffyStraw)" />
        <ellipse cx="100" cy="60" rx="90" ry="19" fill="none" stroke="#af6528" strokeWidth="2.5" />
        <path d="M14 60 q86 22 172 0" fill="none" stroke="#af6528" strokeWidth="2" opacity="0.6" />
        {/* crown */}
        <path d="M66 60 Q64 26 100 24 Q136 26 134 60 Z" fill="url(#luffyStraw)" />
        {/* straw weave lines */}
        <g stroke="#af6528" strokeWidth="1.6" fill="none" opacity="0.65">
          <path d="M70 52 q30 -8 60 0" />
          <path d="M69 44 q31 -8 62 0" />
          <path d="M71 36 q29 -7 58 0" />
        </g>
        {/* red band */}
        <path d="M65 56 Q100 66 135 56 L133 48 Q100 58 67 48 Z" fill="#d70000" />
        <path d="M65 56 Q100 66 135 56" fill="none" stroke="#a30000" strokeWidth="1.5" />
      </g>

      {/* sleeping snot bubble + zzz */}
      {asleep && (
        <>
          <circle cx="112" cy="118" r="7" fill="#bfe3ff" opacity="0.85" className="mascot-zzz" />
          <g className="mascot-zzz" fill="#9adcff" fontWeight="900">
            <text x="150" y="58" fontSize="18">z</text>
            <text x="162" y="42" fontSize="24">Z</text>
            <text x="176" y="24" fontSize="30">Z</text>
          </g>
        </>
      )}

      {/* sparkles when hyped */}
      {mood === 'happy' && (
        <g fill="#ffce00" className="mascot-sparkle">
          <path d="M36 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path d="M166 66 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" />
        </g>
      )}
    </svg>
  )
}
