import { useEffect, useState } from 'react'
import { STICKER_CREWS, spareCount, stickerUrl, type StickerDef } from '../logic/album'
import { sfx } from '../audio'
import type { AlbumState } from '../types'

/**
 * Full-size look at one card. Grows out of the thumbnail that was tapped
 * (`origin` = its on-screen rect) so the zoom feels physically connected to it,
 * then settles into the middle of the screen. Tap the backdrop, the ✕, or press
 * Escape to close.
 */
export function StickerDetail({
  sticker,
  album,
  mateAlbum,
  mateName,
  origin,
  onClose,
}: {
  sticker: StickerDef
  album: AlbumState
  mateAlbum: AlbumState | null
  mateName: string
  origin: DOMRect | null
  onClose: () => void
}) {
  // start at the thumbnail's position/scale, then flip to centered on the next frame
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const owned = album.counts[sticker.id] ?? 0
  const spare = spareCount(album, sticker.id)
  const crew = STICKER_CREWS.find((c) => c.id === sticker.crew)
  const mateSpare = mateAlbum ? spareCount(mateAlbum, sticker.id) : 0
  const mateNeeds = mateAlbum ? (mateAlbum.counts[sticker.id] ?? 0) === 0 : false

  // the transform that maps the centered card back onto the thumbnail it came from
  const fromThumb = origin
    ? {
        transform: `translate(${origin.left + origin.width / 2 - window.innerWidth / 2}px, ${
          origin.top + origin.height / 2 - window.innerHeight / 2
        }px) scale(${origin.width / 230})`,
        opacity: 0,
      }
    : { transform: 'scale(0.8)', opacity: 0 }

  const close = () => {
    sfx.click()
    onClose()
  }

  return (
    <div className={`detail-overlay ${open ? 'is-open' : ''}`} onClick={close}>
      <div
        className="detail-card"
        style={open ? undefined : fromThumb}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="detail-close" onClick={close} aria-label="Close">
          ✕
        </button>

        <div className={`detail-art sticker--${sticker.rarity} ${owned === 0 ? 'is-missing' : ''}`}>
          {owned > 0 ? (
            <img src={stickerUrl(sticker.id)} alt={sticker.name} draggable={false} />
          ) : (
            <span className="detail-ghost">?</span>
          )}
          {sticker.rarity === 'special' && owned > 0 && <span className="detail-shine" />}
        </div>

        <div className="detail-body">
          <div className="detail-name">{owned > 0 ? sticker.name : '???'}</div>
          <div className="detail-meta">
            {crew && (
              <span className="detail-chip">
                <img className="crew-flag" src={crew.flag} alt="" /> {crew.name}
              </span>
            )}
            <span className={`detail-chip ${sticker.rarity === 'special' ? 'is-special' : 'is-common'}`}>
              {sticker.rarity === 'special' ? '★ Legendary · worth 2' : 'Common · worth 1'}
            </span>
          </div>

          <div className="detail-status">
            {owned === 0 ? (
              mateSpare > 0 ? (
                <>🤝 You’re missing this — <b>{mateName} has a spare!</b></>
              ) : (
                <>Not in your album yet. Keep opening packs!</>
              )
            ) : spare > 0 ? (
              <>
                ✓ In your album · <b>{spare} spare{spare === 1 ? '' : 's'}</b> to trade
                {mateNeeds && <> · 🎯 {mateName} needs it!</>}
              </>
            ) : (
              <>✓ In your album · no spares yet</>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
