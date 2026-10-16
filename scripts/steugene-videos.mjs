// 🏫 St. Eugene 7 — find a video he is allowed to watch: `npm run se:videos "<search>"`
//
// Every video in a lesson pack is hand-picked, because the whole point of the
// video block is that he CANNOT wander off it (§24g). This script is the
// picking tool: it reads YouTube's own search page, pulls the candidates out of
// the embedded JSON, then checks each one against the oEmbed endpoint — which
// is also the single best test of the thing that actually matters, "will this
// play inside an iframe or will it say 'Watch on YouTube'".
//
// No API key. The Data API would need one and gives nothing extra here.
//
// Prints a ready-to-paste block for `src/steugene/packs/*.ts`.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

const query = process.argv.slice(2).join(' ')
if (!query) {
  console.error('usage: npm run se:videos "math antics negative numbers"')
  process.exit(1)
}

const html = await (
  await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-CA,en;q=0.9' },
  })
).text()

/** Every videoRenderer in the page, in the order YouTube ranked them. */
const found = []
const seen = new Set()
for (const chunk of html.split('"videoRenderer":{"videoId":"').slice(1)) {
  const id = chunk.slice(0, 11)
  const blob = chunk.slice(11, 9000)
  if (!/^[\w-]{11}$/.test(id)) continue
  if (seen.has(id)) continue
  seen.add(id)
  const title = blob.match(/"title":\{"runs":\[\{"text":"([^"]+)"/)?.[1]
  const by = blob.match(/"(?:ownerText|longBylineText)":\{"runs":\[\{"text":"([^"]+)"/)?.[1]
  const length = blob.match(/"lengthText":\{[\s\S]{0,200}?"simpleText":"([\d:]+)"/)?.[1]
  if (!title || !length) continue // a live stream or a Short — neither is a lesson
  found.push({ id, title: JSON.parse(`"${title}"`), by: by ? JSON.parse(`"${by}"`) : '?', length })
}

const secs = (t) =>
  t.split(':').reverse().reduce((a, p, i) => a + Number(p) * 60 ** i, 0)

console.log(`\n${found.length} candidates for "${query}" — shortest first, embeddable only\n`)

const rows = found.sort((a, b) => secs(a.length) - secs(b.length)).slice(0, 12)
for (const v of rows) {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v.id}`)}`,
  )
  if (!res.ok) {
    console.log(`  ✗ ${v.id}  ${v.length.padStart(6)}  ${v.title.slice(0, 60)}  — not embeddable (${res.status})`)
    continue
  }
  console.log(`  ✓ ${v.id}  ${v.length.padStart(6)}  ${v.by} — ${v.title.slice(0, 70)}`)
  console.log(
    `      { kind: 'video', id: '…', youtube: '${v.id}', title: ${JSON.stringify(v.title.slice(0, 70))}, by: ${JSON.stringify(v.by)}, seconds: ${secs(v.length)}, checks: [] },`,
  )
}
console.log('')
