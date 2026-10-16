// 🏫 St. Eugene 7 (§24b) — the pixel sprites.
//
// Diamonds, hearts, pickaxes, V-Bucks: the things he counts in his own games,
// drawn as tiny pixel maps in code. No image files (CLAUDE.md — storage is
// tight), nothing to download, and they stay crisp at any size because every
// pixel is a rectangle.
//
// Each map is rows of characters; each character is a colour from that
// sprite's palette, and `.` is transparent. Runs of one colour are merged into
// one rectangle so a row of twenty diamonds stays cheap to draw.
import type { ReactNode } from 'react'
import type { SeIcon, SeTile } from '../../../steugene/types'
import { TILES } from './tiles'

interface SpriteDef {
  rows: string[]
  pal: Record<string, string>
}

const SPRITES: Record<SeIcon, SpriteDef> = {
  diamond: {
    rows: ['...kk...', '..kwdk..', '.kwddDk.', 'kwdddDDk', 'kddddDDk', '.kddDDk.', '..kdDk..', '...kk...'],
    pal: { k: '#0b3d3a', d: '#5df2e0', D: '#22a99f', w: '#e4fffb' },
  },
  emerald: {
    rows: ['...kk...', '..kwgk..', '.kwggGk.', '.kgggGk.', '.kgggGk.', '.kggGGk.', '..kgGk..', '...kk...'],
    pal: { k: '#073d1c', g: '#41d36d', G: '#17964a', w: '#c8ffd8' },
  },
  gold: {
    rows: ['........', '........', '..kkkkk.', '.kwyyyYk', 'kyyyyyYk', 'kYYYYYYk', 'kkkkkkkk', '........'],
    pal: { k: '#5a3d00', y: '#ffd83d', Y: '#d19a12', w: '#fff5b5' },
  },
  iron: {
    rows: ['........', '........', '..kkkkk.', '.kwyyyYk', 'kyyyyyYk', 'kYYYYYYk', 'kkkkkkkk', '........'],
    pal: { k: '#3a3a3a', y: '#e6e6e6', Y: '#a8a8a8', w: '#ffffff' },
  },
  coal: {
    rows: ['........', '..kkkk..', '.kcccCk.', 'kcwcccCk', 'kccccCCk', 'kcccCCk.', '.kkkkk..', '........'],
    pal: { k: '#0a0a0a', c: '#3c3c3c', C: '#1f1f1f', w: '#707070' },
  },
  redstone: {
    rows: ['........', '...r....', '..rRr.r.', '.rRrRrR.', 'rRrRrRrr', '.rrrrrr.', '........', '........'],
    pal: { r: '#ff2a2a', R: '#a30000' },
  },
  heart: {
    rows: ['.kk.kk.', 'krwkrrk', 'krrrrrk', 'krrrrRk', '.krrRk.', '..kRk..', '...k...'],
    pal: { k: '#2a0000', r: '#ff2a2a', R: '#b20000', w: '#ffb3b3' },
  },
  drumstick: {
    rows: ['....kkk.', '...kbbbk', '..kbbbbk', '..kbbbBk', '.kwkbBk.', 'kwwkkk..', 'kwk.....', '.k......'],
    pal: { k: '#3a1e05', b: '#c8762e', B: '#8a4a14', w: '#f4ead6' },
  },
  pickaxe: {
    rows: [
      '...kkkk...',
      '..kddddk..',
      '...kkkddk.',
      '.....kbkdk',
      '....kbk.dk',
      '...kbk..kk',
      '..kbk.....',
      '.kbk......',
      'kbk.......',
      '.k........',
    ],
    pal: { k: '#1a1a1a', d: '#5df2e0', b: '#8a5a2b' },
  },
  sword: {
    rows: [
      '........kk',
      '.......kwk',
      '......kdk.',
      '.....kdk..',
      '..k.kdk...',
      '..kkdk....',
      '...kk.....',
      '..kbkk....',
      '.kbk......',
      'kkk.......',
    ],
    pal: { k: '#0b3d3a', d: '#5df2e0', w: '#e4fffb', b: '#8a5a2b' },
  },
  grass: {
    rows: ['gggggggg', 'gGggGggg', 'dgdddgdd', 'dddDdddd', 'ddDddddD', 'dddddDdd', 'dDddddDd', 'dddDdddd'],
    pal: { g: '#6abf3c', G: '#4f9a2a', d: '#8b5a2b', D: '#6b4220' },
  },
  stone: {
    rows: ['ssssSsss', 'sSssssss', 'sssssSss', 'ssSsssss', 'ssssssSs', 'sSssssss', 'ssssSsss', 'Ssssssss'],
    pal: { s: '#8b8b8b', S: '#6d6d6d' },
  },
  plank: {
    rows: ['pppppppp', 'pPpppppp', 'kkkkkkkk', 'ppppPppp', 'pppppppp', 'kkkkkkkk', 'ppPppppp', 'pppppppP'],
    pal: { p: '#b38a52', P: '#9a733f', k: '#6e5230' },
  },
  tnt: {
    rows: ['rrrrrrrr', 'rRrrRrrR', 'wwwwwwww', 'wkwkkwkw', 'wwwwwwww', 'rrRrrrRr', 'rrrrrrrr', 'rRrrrRrr'],
    pal: { r: '#d93a2b', R: '#a82418', w: '#eeeeee', k: '#222222' },
  },
  chest: {
    rows: ['kkkkkkkk', 'kbbbbbbk', 'kbBbbBbk', 'kkkyykkk', 'kbbyybbk', 'kbBbbBbk', 'kbbbbbbk', 'kkkkkkkk'],
    pal: { k: '#3a2208', b: '#b07a32', B: '#8a5a1f', y: '#ffd83d' },
  },
  xp: {
    rows: ['..kkkk..', '.kgggGk.', 'kgwggGGk', 'kggyggGk', 'kgggyGGk', 'kGgggGGk', '.kGGGGk.', '..kkkk..'],
    pal: { k: '#2f4a00', g: '#b7ff3a', G: '#6fbf10', y: '#ffff8a', w: '#f2ffd0' },
  },
  apple: {
    rows: ['....k...', '...kgg..', '.kkrkk..', 'krwrrrk.', 'krrrrrrk', 'krrrrRrk', '.krrRRk.', '..kkkk..'],
    pal: { k: '#3a0505', g: '#41b33a', r: '#e8312a', R: '#a81d17', w: '#ffc2bd' },
  },
  cookie: {
    rows: ['..kkkk..', '.kbbbbk.', 'kbcbbcbk', 'kbbbbbbk', 'kbbcbbbk', 'kbbbbcbk', '.kbcbbk.', '..kkkk..'],
    pal: { k: '#6e4420', b: '#d9a35a', c: '#5a3214' },
  },
  egg: {
    rows: ['...kk...', '..kwwk..', '.kwwwwk.', '.kwwwwk.', 'kwwwwwsk', 'kwwwwssk', '.kwwssk.', '..kkkk..'],
    pal: { k: '#7a6a50', w: '#f4ead6', s: '#d7c7a6' },
  },
  pizza: {
    rows: ['kkkkkkkk', 'kcccccck', '.kyryyk.', '.kyyyrk.', '..kryk..', '..kyyk..', '...kk...', '........'],
    pal: { k: '#6a3a10', c: '#c98a3a', y: '#ffd24a', r: '#d1351b' },
  },
  ball: {
    rows: ['..kkkk..', '.kwwwwk.', 'kwwkkwwk', 'kwkkkkwk', 'kwwkkwwk', 'kkwwwwkk', '.kwkkwk.', '..kkkk..'],
    pal: { k: '#111111', w: '#f4f4f4' },
  },
  trophy: {
    rows: ['yyyyyyyy', 'yYyyyyyy', 'y.yyyy.y', '.yyyyyy.', '..yyyy..', '...yy...', '..yyyy..', '.kkkkkk.'],
    pal: { y: '#ffd83d', Y: '#fff1a0', k: '#5a3d00' },
  },
  vbuck: {
    rows: ['..kkkk..', '.kbbbbk.', 'kbwbbwbk', 'kbwbbwbk', 'kbbwwbbk', 'kbbwwbbk', '.kbbbbk.', '..kkkk..'],
    pal: { k: '#0a3a7a', b: '#3aa0ff', w: '#ffffff' },
  },
  robux: {
    rows: ['...kk...', '.kkggkk.', 'kgggggGk', 'kggkkgGk', 'kggkkgGk', 'kgggggGk', '.kkGGkk.', '...kk...'],
    pal: { k: '#0c3d16', g: '#39d353', G: '#1f8f33' },
  },
  pokeball: {
    rows: ['..kkkk..', '.krrrrk.', 'krwrrrrk', 'kkkwwkkk', 'kkkwwkkk', 'kwwwwwwk', '.kwwwwk.', '..kkkk..'],
    pal: { k: '#111111', r: '#e8312a', w: '#f4f4f4' },
  },
  potion: {
    rows: ['...kk...', '...ww...', '..kwwk..', '.kbbbbk.', 'kbwbbbbk', 'kbbbbbbk', 'kbbbbbBk', '.kkkkkk.'],
    pal: { k: '#0a2a5a', w: '#dff1ff', b: '#4aa8ff', B: '#1f6fd1' },
  },
  star: {
    rows: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'y......y'],
    pal: { y: '#ffd83d' },
  },
  skull: {
    rows: ['.wwwwww.', 'wwwwwwww', 'wkkwwkkw', 'wkkwwkkw', 'wwwkkwww', '.wwwwww.', '.wkwkwk.', '........'],
    pal: { w: '#e8e8e8', k: '#222222' },
  },
  torch: {
    rows: ['...yy...', '..yoyy..', '...oo...', '...bb...', '...bb...', '...bb...', '...bb...', '...bb...'],
    pal: { y: '#ffe34d', o: '#ff8a1f', b: '#8a5a2b' },
  },
  player: {
    rows: ['..hhhh..', '..hssh..', '..ewew..', '..ssss..', '.cccccc.', 's.cccc.s', '..bbbb..', '..b..b..'],
    pal: { h: '#5a3a1a', s: '#e0ac7e', e: '#3a2a8a', w: '#ffffff', c: '#2fa3c6', b: '#3a3a9a' },
  },
}

/**
 * One sprite as SVG rectangles, run-length merged, positioned and sized.
 * `from` / `upto` (0–1) draw only that slice of its width — half a heart.
 */
export function Sprite({
  icon,
  x = 0,
  y = 0,
  size = 24,
  dim,
  from = 0,
  upto = 1,
}: {
  icon: SeIcon
  x?: number
  y?: number
  size?: number
  dim?: boolean
  from?: number
  upto?: number
}) {
  const def = SPRITES[icon]
  const w = Math.max(...def.rows.map((r) => r.length))
  const h = def.rows.length
  const px = size / Math.max(w, h)
  const ox = x + (size - w * px) / 2
  const oy = y + (size - h * px) / 2
  const c0 = Math.round(from * w)
  const c1 = Math.round(upto * w)
  const rects: ReactNode[] = []
  def.rows.forEach((row, r) => {
    let c = c0
    while (c < Math.min(row.length, c1)) {
      const ch = row[c]
      let run = 1
      while (c + run < Math.min(row.length, c1) && row[c + run] === ch) run++
      const fill = def.pal[ch]
      if (fill) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={ox + c * px}
            y={oy + r * px}
            width={run * px + 0.15}
            height={px + 0.15}
            fill={dim ? '#3b4a5c' : fill}
          />,
        )
      }
      c += run
    }
  })
  return (
    <g shapeRendering="crispEdges" opacity={dim ? 0.55 : 1}>
      {rects}
    </g>
  )
}

/** A sprite on its own, for HTML layouts (item rows, shop cards, slots). */
export function SpriteSvg({ icon, size = 24, dim }: { icon: SeIcon; size?: number; dim?: boolean }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ display: 'block' }}>
      <Sprite icon={icon} size={size} dim={dim} />
    </svg>
  )
}

/** One block seen from above, with a little texture so it reads as a block and not a square. */
export function TileRect({ tile, x, y, s }: { tile: SeTile; x: number; y: number; s: number }) {
  const [base, dark, light] = TILES[tile]
  const p = s / 8
  return (
    <g shapeRendering="crispEdges">
      <rect x={x} y={y} width={s} height={s} fill={base} />
      {s >= 9 && (
        <>
          <rect x={x + p} y={y + p} width={p * 2} height={p} fill={light} />
          <rect x={x + p * 5} y={y + p * 3} width={p} height={p * 2} fill={dark} />
          <rect x={x + p * 2} y={y + p * 6} width={p * 2} height={p} fill={dark} />
        </>
      )}
      <rect x={x} y={y} width={s} height={s} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth={0.8} />
    </g>
  )
}
