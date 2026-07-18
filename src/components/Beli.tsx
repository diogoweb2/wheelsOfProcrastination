// Beli — the real-CAD bank money marker (distinct from the 🪙 Berries reward currency).
export function Beli({ size = 18 }: { size?: number }) {
  return (
    <img
      src="/Beli.webp"
      alt="Beli"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size, objectFit: 'contain', verticalAlign: 'middle' }}
    />
  )
}
