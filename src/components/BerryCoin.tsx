// A One Piece Berry coin — gold piece stamped with the Berry symbol (₿).
// Palette matches the app: Dark Yellow gold, Dark Bronze rim.
export function BerryCoin({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <circle cx="12" cy="12" r="11" fill="#ffce00" stroke="#af6528" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="#c9a200" strokeWidth="1.1" strokeDasharray="1.6 1.9" />
      {/* shine */}
      <path d="M5.5 8.5 A 7.5 7.5 0 0 1 9 5.2" fill="none" stroke="#fff3b0" strokeWidth="1.6" strokeLinecap="round" />
      <text
        x="12"
        y="16.6"
        textAnchor="middle"
        fontSize="13"
        fontWeight="900"
        fill="#7a4a12"
        fontFamily="Nunito, system-ui, sans-serif"
      >
        ₿
      </text>
    </svg>
  )
}
