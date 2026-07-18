// The Gomu Gomu no Mi — replaces the old 🍇 emoji everywhere Devil Fruits show up.
export function DevilFruit({ size = 20 }: { size?: number }) {
  return (
    <img
      src="/devil-fruit.webp"
      alt="Devil Fruit"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size, objectFit: 'contain', verticalAlign: 'middle' }}
    />
  )
}
