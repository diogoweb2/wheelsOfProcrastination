// Refill the quiz bank after the parent removes questions: `npm run quiz:regen`.
//
// Reads app/quizBank from Firestore, and for every OPEN topic below its target
// count asks Claude (the `claude` CLI must be installed & logged in) to write
// replacement questions. Removed questions stay flagged in the bank and are fed
// to the model as "do not recreate", so removals are never regenerated.
// New questions land with status "pending" — Diogo approves/removes them in the
// app (Quiz tab → review banner).
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

// Same public web config as src/lib/firebase.ts (client configs are not secrets).
const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

// Mirrors QUIZ_TOPICS in src/logic/quiz.ts — only topics listed here get refilled.
const TOPICS = [
  {
    id: 'canada-geography',
    target: 50,
    brief:
      'Canada geography for a 12-year-old (born Feb 2014, Ontario grade 6): provinces, territories, capitals, official languages (weight 2 — the core), plus fun famous cities/landmarks/flags (weight 1). Fun tone, light One Piece flavor in funFact only (never in the question itself).',
  },
  {
    id: 'ai-software-dev',
    target: 50,
    brief:
      'Practical AI-assisted software development for a senior frontend developer who wants to out-skill the market: tokens & cost control, context windows, prompt engineering, prompt caching, RAG, MCP, agents & orchestration (planner/subagent patterns), headless/CI usage, verification habits. NO ML training theory. funFact = a concrete pro tip.',
  },
  {
    id: 'copilot-ai',
    target: 50,
    brief:
      'GitHub Copilot mastery for a senior frontend dev using it daily at work: inline completions, Copilot Chat, slash commands, chat participants (@workspace/@terminal), context variables (#file), custom instructions files, Copilot Edits, agent mode, coding agent on GitHub.com, model picker, CLI, code review, content exclusions. Current, practical, no fluff.',
  },
  {
    id: 'claude-code-ai',
    target: 50,
    brief:
      'Claude Code mastery for a senior frontend dev using it for personal projects: CLAUDE.md, /init, plan mode, subagents, hooks, MCP, headless -p and piping, /compact vs /clear, --continue/--resume, permissions allowlists, custom slash commands/skills, git worktrees, model selection, token-efficient workflows, extended thinking. funFact = a concrete pro tip.',
  },
  // When a new Ben topic goes live, add it here AND flip comingSoon in src/logic/quiz.ts:
  // { id: 'science-6', target: 50, brief: 'Ontario grade 6 science: space, electricity, flight, biodiversity…' },
]

const SCHEMA = `Each question is a JSON object:
{
  "type": "choice" | "write" | "match" | "order",
  "prompt": string,                     // the question, kid-friendly
  "emoji": string,                      // one fitting emoji
  "choices": string[],                  // choice only: the correct answer + 6 plausible wrong ones (7 total). The app shows 4 at a time, sampled at random, so every wrong option must be genuinely wrong and believable on its own.
  "answer": string,                     // choice only: the correct option (must be one of choices)
  "accept": string[],                   // write only: accepted answers, canonical first; answers must be 1-2 simple words
  "pairs": [{"left": string, "right": string}], // match only: 3-4 pairs
  "sequence": string[],                 // order only: 3-4 items in correct order; prompt must say the direction
  "weight": 1 | 2,                      // 2 = core curriculum material, 1 = fun extra
  "points": number,                     // weight 2 → 8 (10 for match/order); weight 1 → 5 (6 for match/order)
  "funFact": string                     // one fun educational sentence shown after answering
}`

async function main() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const bankRef = doc(db, 'app', 'quizBank')
  const snap = await getDoc(bankRef)
  const questions = snap.exists() ? (snap.data().questions ?? []) : []

  let added = 0
  for (const topic of TOPICS) {
    const mine = questions.filter((q) => q.topicId === topic.id)
    const alive = mine.filter((q) => q.status !== 'removed')
    const removed = mine.filter((q) => q.status === 'removed')
    const missing = topic.target - alive.length
    if (missing <= 0) {
      console.log(`✓ ${topic.id}: ${alive.length}/${topic.target} — nothing to do`)
      continue
    }
    console.log(`… ${topic.id}: ${alive.length}/${topic.target}, generating ${missing} (this calls the claude CLI)`)

    const prompt = `You write quiz questions for a kids' learning app. Topic: ${topic.brief}

${SCHEMA}

Existing questions (do NOT duplicate or near-duplicate any of these):
${alive.map((q) => `- ${q.prompt}`).join('\n')}

Questions the parent REMOVED (do NOT recreate these or anything similar):
${removed.map((q) => `- ${q.prompt}`).join('\n') || '- (none)'}

Write exactly ${missing} NEW questions following the schema. Facts must be correct. Reply with ONLY a JSON array, no markdown fences, no commentary.`

    const out = execFileSync('claude', ['--model', 'opus', '-p', prompt], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
    const start = out.indexOf('[')
    const end = out.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error(`Could not find a JSON array in claude output for ${topic.id}:\n${out.slice(0, 500)}`)
    const generated = JSON.parse(out.slice(start, end + 1))

    for (const g of generated) {
      if (!g?.prompt || !g?.type) continue
      questions.push({
        ...g,
        id: `ai-${randomUUID()}`,
        topicId: topic.id,
        status: 'pending', // parent reviews in the app before it goes live
        createdAt: new Date().toISOString(),
      })
      added += 1
    }
  }

  if (added > 0) {
    await setDoc(bankRef, { questions })
    console.log(`✅ Added ${added} question(s) as "pending". Review them in the app (Diogo → Quiz tab).`)
  } else {
    console.log('Nothing generated — bank already full.')
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('❌', err.message ?? err)
  process.exit(1)
})
