// Find videos a lesson is allowed to show (§24g).
//
// Reads YouTube's own search page — the candidates are sitting in the page as
// JSON — then checks each one against the oEmbed endpoint, which doubles as
// the only test that matters: oEmbed answers 404 for anything that will refuse
// to play inside an iframe. No API key, because the Data API would need one
// and tells us nothing extra.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

const secondsOf = (t) => t.split(':').reverse().reduce((a, p, i) => a + Number(p) * 60 ** i, 0)

export async function searchYouTube(query) {
  const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-CA,en;q=0.9' },
  })
  if (!res.ok) return []
  const html = await res.text()
  const out = []
  const seen = new Set()
  for (const chunk of html.split('"videoRenderer":{"videoId":"').slice(1)) {
    const id = chunk.slice(0, 11)
    if (!/^[\w-]{11}$/.test(id) || seen.has(id)) continue
    seen.add(id)
    const blob = chunk.slice(11, 9000)
    const title = blob.match(/"title":\{"runs":\[\{"text":"([^"]+)"/)?.[1]
    const by = blob.match(/"(?:ownerText|longBylineText)":\{"runs":\[\{"text":"([^"]+)"/)?.[1]
    const length = blob.match(/"lengthText":\{[\s\S]{0,200}?"simpleText":"([\d:]+)"/)?.[1]
    if (!title || !length) continue // a live stream or a Short; neither is a lesson
    try {
      out.push({ id, title: JSON.parse(`"${title}"`), by: by ? JSON.parse(`"${by}"`) : '', seconds: secondsOf(length) })
    } catch {
      // a title we cannot unescape is a title we cannot print on a card
    }
  }
  return out
}

export async function embeddable(id) {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
  )
  return res.ok
}

/**
 * Up to `want` videos for one subtopic.
 *
 * Length rules: nothing under two minutes (a clip is not a lesson) and nothing
 * over twelve (he will not sit through it), with the 3–8 minute band preferred
 * because that is the length that still gets watched on a Tuesday.
 */
export async function pickVideos(query, want = 3) {
  const found = await searchYouTube(query)
  const ranked = found
    .filter((v) => v.seconds >= 120 && v.seconds <= 780)
    .sort((a, b) => score(b) - score(a))
  const out = []
  for (const v of ranked.slice(0, 10)) {
    if (out.length >= want) break
    if (await embeddable(v.id)) out.push(v)
  }
  return out
}

function score(v) {
  const len = v.seconds >= 180 && v.seconds <= 480 ? 3 : 1
  // Channels that already teach this age group well. Not a whitelist — just a
  // thumb on the scale, and anything else still gets through.
  const known = /math antics|mr\. ?j|khan|crash ?course|homeschool pop|free ?school|sci ?show|ted-ed|bozeman|amoeba/i
  return len + (known.test(v.by) ? 3 : 0) + (known.test(v.title) ? 1 : 0)
}
