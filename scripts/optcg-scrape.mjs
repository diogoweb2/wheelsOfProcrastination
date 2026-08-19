// One-time (re-runnable) harvest of the official card list into
// scripts/data/optcg-official.json. The CSV in scripts/data/ has the art
// variants and the ban flag but not the three fields a rules engine cannot
// run without — card category (Leader/Character/Event/Stage), a Leader's Life
// and the attribute — so those come from the publisher's own pages.
//
// Runs on the machine, never in the browser: the result is committed, and the
// app ships the generated catalog rather than hitting this site.
import { writeFile } from 'node:fs/promises'

const LIST = 'https://en.onepiece-cardgame.com/cardlist/'
const OUT = new URL('./data/optcg-official.json', import.meta.url).pathname
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh) card-catalog-build' }

const strip = (s) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

const field = (block, cls) => {
  const m = block.match(new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`))
  if (!m) return ''
  return strip(m[1].replace(/<h3>[\s\S]*?<\/h3>/, ''))
}

async function seriesIds() {
  const html = await (await fetch(LIST, { headers: UA })).text()
  const ids = [...html.matchAll(/<option value="(\d{6})"/g)].map((m) => m[1])
  return [...new Set(ids)]
}

/** One card per code — parallel arts repeat the same data, so the first wins. */
function parse(html, out) {
  const blocks = html.split('<dl class="modalCol"').slice(1)
  for (const b of blocks) {
    const id = b.match(/id="([A-Z0-9]+-\d+)(_[pr]\d+)?"/)
    if (!id) continue
    const code = id[1]
    if (out[code]) continue
    const info = b.match(/<div class="infoCol">([\s\S]*?)<\/div>/)
    const parts = info ? [...info[1].matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1].trim()) : []
    const text = field(b, 'text')
    // "Trigger" lives inside the effect text on the site; the CSV splits it out.
    out[code] = {
      code,
      rarity: parts[1] ?? '',
      category: (parts[2] ?? '').toUpperCase(),
      name: strip(b.match(/<div class="cardName">([\s\S]*?)<\/div>/)?.[1] ?? ''),
      cost: field(b, 'cost'),
      attribute: field(b, 'attribute'),
      power: field(b, 'power'),
      counter: field(b, 'counter'),
      color: field(b, 'color'),
      types: field(b, 'feature'),
      effect: text,
    }
  }
}

const ids = await seriesIds()
const out = {}
for (const id of ids) {
  const html = await (await fetch(`${LIST}?series=${id}`, { headers: UA })).text()
  const before = Object.keys(out).length
  parse(html, out)
  console.log(`series ${id}: +${Object.keys(out).length - before}`)
}
await writeFile(OUT, JSON.stringify(out, null, 0))
console.log(`${Object.keys(out).length} cards → ${OUT}`)
