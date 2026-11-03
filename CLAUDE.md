# Wheels of Procrastination

Rules for the game live in BUSINESS_REQUIREMENTS.md — that file is canonical.

## Routes (IMPORTANT)

Every new feature MUST be reachable at its own URL — `/<app>/<tab>`, matching the ids in `src/apps/registry.ts`. Two sub-apps never share a URL. See BUSINESS_REQUIREMENTS.md §1c.

## The OpenRouter key is the app's, not a tool (IMPORTANT)

The key in Firestore `app/aiConfig` pays for the **app's own runtime AI only** — above all Ben's "generate more explanation" button (§24h), which stops working when the balance runs out.

Content asked for in a session is **written in that session**, by hand, however many turns it takes. Never run `se:seed`, `se:verify` or `se:world`, and never write a new script that spends that key. Those three stay in the repo as documentation of how the year was first built (§24k, §24l, §24m); they are not a shortcut to reach for.

## Quiz questions come in several wordings (IMPORTANT)

Ben was passing on memory — he learned what a question *looked like*, not the fact. So every quiz question is written in **several wordings**, and the quiz rotates them on every showing (§14 "Same question, many wordings").

- **Whenever you write or add a quiz question, also write its variants** in `src/quiz/variants/<bank>.ts`, keyed by question id: at least **2 other `prompts`** (a genuinely different sentence asking the same thing, same answer) and, for choice questions, **2 other `answers`** (the same right answer said another way) wherever it can be reworded without standing out — a year, a name or a single word keeps its one wording, because "Cartier" beside "Samuel de Champlain" is a tell.
- An answer wording must read like the distractors — same length, grammar, level of detail (§14 no length tell) — and must never be true of a distractor.
- Write-ins put extra spellings in `accept`; match and order questions carry `prompts` only.
- Run `npm run quiz:variants` (reads code only, spends nothing) — it must pass, and it shows which banks still have single-wording questions.

## Images (IMPORTANT — low storage available)

Every image added to `public/` MUST be resized and compressed before use:

- Resize to the actual display size (at most 2× for retina). e.g. a 58px button icon → 128px asset, never a 320px+ original.
- Prefer webp output. `sharp` is already in node_modules; use it:
  `node -e "require('sharp')('in.png').resize(128,128).webp({quality:80}).toFile('public/out.webp')"`
- Give assets a descriptive name (e.g. `quest-log.webp`) and delete the raw/original file from `public/` afterwards.
