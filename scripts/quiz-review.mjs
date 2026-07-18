// Weekly AI-topic refresh: `npm run quiz:review` (scheduled via cron, Mondays 09:00).
//
// AI tooling changes constantly, so this script has Claude (sonnet — cheap and
// current enough for review work) re-read Diogo's AI-dev questions and:
//   - UPDATE questions that became outdated/wrong (same id, content replaced)
//   - ADD a few new questions covering things that recently changed/appeared
// Updated & added questions get `freshAt`, which the app turns into a ✨ NEW
// badge + training priority until they've been seen once. Additions go live
// immediately (status "active") — Diogo is the admin reviewing his own bank,
// and he can still remove them from the Captain's desk.
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

// Diogo's AI topics — the fast-moving ones worth a weekly pass.
const REVIEW_TOPICS = ['ai-software-dev', 'copilot-ai', 'claude-code-ai']
const MAX_ADDITIONS_PER_TOPIC = 5

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const bankRef = doc(db, 'app', 'quizBank')
  const snap = await getDoc(bankRef)
  const questions = snap.exists() ? (snap.data().questions ?? []) : []
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  let updated = 0
  let added = 0
  for (const topicId of REVIEW_TOPICS) {
    const active = questions.filter((q) => q.topicId === topicId && q.status === 'active')
    const removed = questions.filter((q) => q.topicId === topicId && q.status === 'removed')
    if (active.length === 0) continue
    console.log(`… reviewing ${topicId} (${active.length} active questions)`)

    const prompt = `Today is ${today}. You maintain a quiz bank teaching PRACTICAL AI-assisted development to a senior frontend developer (topic: ${topicId}). AI tooling changes fast — your job is to keep the bank current.

Here are the active questions as JSON:
${JSON.stringify(active.map(({ id, type, prompt: p, choices, answer, accept, pairs, sequence, funFact, weight, points }) => ({ id, type, prompt: p, choices, answer, accept, pairs, sequence, funFact, weight, points })))}

Questions the owner deleted (never recreate anything similar):
${removed.map((q) => `- ${q.prompt}`).join('\n') || '- (none)'}

Do TWO things:
1. UPDATES: find questions whose facts/commands/product names are outdated or wrong as of today, and rewrite them (keep the same "id", same "type"). Only include questions that genuinely need a change — an unchanged bank is a valid answer.
2. ADDITIONS: write up to ${MAX_ADDITIONS_PER_TOPIC} NEW questions about recent, important developments in this area that the bank doesn't cover yet (new features, renamed products, new best practices). Use types "choice" (4 options), "write" (1-2 word answers, "accept" array), "match" (3-4 pairs) or "order" (3-4 items). weight 2 / points 8 (10 for match/order); weight 1 / points 5 for nice-to-know. Every question gets a one-sentence practical "funFact" and a fitting "emoji".

Reply with ONLY this JSON object, no markdown fences, no commentary:
{"updates": [ {question objects incl. their original "id"} ], "additions": [ {new question objects, no "id"} ]}`

    const out = execFileSync('claude', ['--model', 'sonnet', '-p', prompt], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
    const start = out.indexOf('{')
    const end = out.lastIndexOf('}')
    if (start === -1 || end === -1) {
      console.error(`⚠ ${topicId}: no JSON found in claude output, skipping`)
      continue
    }
    let result
    try {
      result = JSON.parse(out.slice(start, end + 1))
    } catch (err) {
      console.error(`⚠ ${topicId}: could not parse claude output (${err.message}), skipping`)
      continue
    }

    for (const u of result.updates ?? []) {
      const target = questions.find((q) => q.id === u.id && q.topicId === topicId)
      if (!target || !u.prompt) continue
      Object.assign(target, u, { id: target.id, topicId, status: target.status, createdAt: target.createdAt, freshAt: now })
      updated += 1
    }
    for (const a of (result.additions ?? []).slice(0, MAX_ADDITIONS_PER_TOPIC)) {
      if (!a?.prompt || !a?.type) continue
      questions.push({ ...a, id: `ai-${randomUUID()}`, topicId, status: 'active', createdAt: now, freshAt: now })
      added += 1
    }
  }

  if (updated > 0 || added > 0) {
    await setDoc(bankRef, { questions })
    console.log(`✅ ${updated} updated, ${added} added — all flagged ✨ NEW (training will prioritize them).`)
  } else {
    console.log('✓ Bank is current — nothing changed this week.')
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('❌', err.message ?? err)
  process.exit(1)
})
