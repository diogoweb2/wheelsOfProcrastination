// Temporary: does every video in the hand-written packs actually embed, and is
// the stored title the real one?
import { readdirSync, readFileSync } from 'node:fs'
const DIR = 'src/steugene/packs/written'
const rows = []
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.ts'))) {
  const text = readFileSync(`${DIR}/${f}`, 'utf8')
  const re = /youtube:\s*'([\w-]{11})',\s*\n\s*title:\s*'([^']*)'/g
  let m
  while ((m = re.exec(text))) rows.push({ pack: f.replace('.ts', ''), id: m[1], title: m[2] })
  // titles written with double quotes or on another line
  const ids = [...text.matchAll(/youtube:\s*'([\w-]{11})'/g)].map((x) => x[1])
  for (const id of ids) if (!rows.some((r) => r.id === id && r.pack === f.replace('.ts', ''))) rows.push({ pack: f.replace('.ts', ''), id, title: '?' })
}
let bad = 0
for (const r of rows) {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${r.id}`)}`)
  if (!res.ok) {
    bad++
    console.log(`✗ ${r.pack.padEnd(17)} ${r.id}  ${res.status}  stored: "${r.title}"`)
    continue
  }
  const j = await res.json()
  const same = j.title.toLowerCase().slice(0, 18) === r.title.toLowerCase().slice(0, 18)
  if (!same) console.log(`~ ${r.pack.padEnd(17)} ${r.id}  stored "${r.title}"  ACTUAL "${j.title}" — ${j.author_name}`)
}
console.log(`\n${rows.length} videos · ${bad} will not embed`)
