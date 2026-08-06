// Shrink a camera photo in the browser, before it goes anywhere.
//
// The terminal script uses sharp; in the app there is no sharp, so this is a
// canvas. Same rule applies either way (CLAUDE.md): a 4 MB phone photo is never
// uploaded and never sent to a model. Two sizes come out of one shot —
//
//   • a 96px square THUMBNAIL (~4 KB) — the only thing stored, drawn at 48px
//     in the Gear tab, so 2× retina
//   • a 1024px data URL — handed to the vision model and then thrown away
//
// The full-size original never leaves the phone.

/** Longest edge for the copy the model looks at. Bigger buys no accuracy on gym gear. */
const VISION_PX = 1024

/** The stored thumbnail: 2× the 48px the Gear tab draws it at. */
const THUMB_PX = 96

/**
 * WebP everywhere it exists (roughly a third the size of JPEG here); JPEG only
 * where it doesn't, so an older browser degrades in size rather than breaking.
 */
function bestType(): 'image/webp' | 'image/jpeg' {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image.'))
    }
    img.src = url
  })
}

function draw(img: HTMLImageElement, width: number, height: number, sx: number, sy: number, sw: number, sh: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser will not give us a canvas to resize with.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not compress that photo.'))), type, quality),
  )
}

export interface ShrunkPhoto {
  /** Square 96px thumbnail — the only thing that gets stored. */
  thumb: Blob
  /** 1024px data URL for the vision model; never stored. */
  visionDataUrl: string
  /** Data URL of the thumbnail, for an instant on-screen preview. Nothing to revoke. */
  previewUrl: string
}

/** One camera shot → the two sizes we actually use. */
export async function shrinkPhoto(file: Blob): Promise<ShrunkPhoto> {
  const img = await loadImage(file)
  const type = bestType()

  // vision copy: whole frame, longest edge capped
  const scale = Math.min(1, VISION_PX / Math.max(img.width, img.height))
  const visionCanvas = draw(img, Math.round(img.width * scale), Math.round(img.height * scale), 0, 0, img.width, img.height)
  const visionDataUrl = visionCanvas.toDataURL(type, 0.8)

  // thumbnail: centre-cropped to a square so the grid stays tidy
  const side = Math.min(img.width, img.height)
  const thumbCanvas = draw(img, THUMB_PX, THUMB_PX, (img.width - side) / 2, (img.height - side) / 2, side, side)
  const thumb = await toBlob(thumbCanvas, type, 0.78)

  return { thumb, visionDataUrl, previewUrl: thumbCanvas.toDataURL(type, 0.78) }
}
