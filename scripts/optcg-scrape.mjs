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

/**
 * The series picker, read straight off the page: each option carries the set's
 * real name and its printed code — "STARTER DECK -RED Monkey.D.Luffy- [ST-01]".
 * Both are harvested, so the Card Binder can name a shelf without anybody
 * hand-typing 59 set titles.
 */
/**
 * The series picker, read straight off the page: each option carries the set's
 * real name and its printed code — "STARTER DECK -RED Monkey.D.Luffy- [ST-01]".
 * Both are harvested, so the Card Binder can name a shelf without anybody
 * hand-typing 59 set titles.
 */
const SMALL = new Set(['of', 'the', 'in', 'on', 'a', 'an', 'and', 'to', 'at', 'for', 'his', 'her'])
const titleCase = (s) => {
  // The site shouts its set names ("ROMANCE DAWN"); a shelf label should not.
  if (s !== s.toUpperCase()) return s
  return s
    .toLowerCase()
    .replace(/(^|[\s("'-])([a-z])/g, (_, p, c) => p + c.toUpperCase())
    .split(' ')
    .map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join(' ')
}

async function seriesList() {
  const html = await (await fetch(LIST, { headers: UA })).text()
  const out = []
  for (const m of html.matchAll(/<option value="(\d{6})"[^>]*>([\s\S]*?)<\/option>/g)) {
    // strip() decodes the entities first — the label arrives with &lt;br&gt; in it
    const label = strip(m[2]).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    // "[OP-01]" → OP01, and a combined "[OP15-EB04]" names two sets at once
    const tail = label.match(/\[([^\]]+)\]\s*$/)
    const codes = tail
      ? tail[1].split('-').reduce((acc, part, i, arr) => {
          if (/^\d+$/.test(part)) return acc
          const num = /^\d+$/.test(arr[i + 1] ?? '') ? arr[i + 1] : ''
          const inline = part.match(/^([A-Z]+)(\d+)$/)
          if (inline) acc.push(`${inline[1]}${inline[2]}`)
          else if (num) acc.push(`${part}${num}`)
          return acc
        }, [])
      : []
    const name = titleCase(
      label
        .replace(/\[[^\]]*\]\s*$/, '')
        .replace(/^(BOOSTER PACK|STARTER DECK EX|STARTER DECK|EXTRA BOOSTER|PREMIUM BOOSTER|PROMOTION CARDS?)\s*/i, '')
        .trim()
        .replace(/^-+|-+$/g, '')
        .trim(),
    )
    out.push({ id: m[1], codes, name })
  }
  return out.filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
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

const series = await seriesList()
const out = {}
const setNames = {}
for (const s of series) {
  const html = await (await fetch(`${LIST}?series=${s.id}`, { headers: UA })).text()
  const before = Object.keys(out).length
  parse(html, out)
  for (const code of s.codes) if (s.name && !setNames[code]) setNames[code] = s.name
  console.log(`series ${s.id} ${s.codes.join('+') || '?'}: +${Object.keys(out).length - before}`)
}
await writeFile(OUT, JSON.stringify(out, null, 0))
console.log(`${Object.keys(out).length} cards → ${OUT}`)
const SETS_OUT = new URL('./data/optcg-sets.json', import.meta.url).pathname
await writeFile(SETS_OUT, JSON.stringify(setNames, null, 1))
console.log(`${Object.keys(setNames).length} set names → ${SETS_OUT}`)
