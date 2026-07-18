# Wheels of Procrastination — Business Requirements

> Living document. Update this file whenever a rule changes. The code should always match this doc.
> Last updated: 2026-07-15

## 1. Concept

A mobile-first PWA habit builder + task manager. **Multi-user**: a small fixed set of profiles (currently **Diogo** and **Ben**) share the device, each with their own tasks, streak, economy, and badges (see §11).
Core loop, inspired by Duolingo's "one small thing every day":

1. Open app → spin the **Wheel of Fortune** → it picks one task for you.
2. Do the task → tap **Complete** → earn gems, keep your streak.
3. Come back tomorrow.

Theme: **One Piece** (personal/private app — original fan-art SVG, no official assets). **Monkey D. Luffy** is the main mascot ([src/components/Luffy.tsx](src/components/Luffy.tsx)): a loud, hungry, fearless hype-man who narrates, cheers, and celebrates ("Shishishi!"). Supporting crew each have their own SVG bust in [src/components/Crew.tsx](src/components/Crew.tsx) and appear where they fit: **Zoro** on the Training log (habits/grind), **Chopper** on the Streak Freeze card (he's the doctor), **Nami** on the Berry-reward goal card (she handles money). Colors follow the official **One Piece Series** palette (schemecolor.com): Waterfall `#60BFF5`, Azure Blue `#2E63A4`, Dark Bronze `#AF6528`, Dark Yellow `#FFCE00`, Glossy Red `#D70000`, Black `#000000` — a deep-azure sea with straw-gold & red accents. No green anywhere: the effort scale is Waterfall-blue (low) → gold (medium) → red (high), and success/"done" accents use Waterfall blue. Primary buttons are gold; the only non-palette accent kept is `--orange`, used solely as the streak "fire" tone beside the 🔥 emoji.
Sound, animation and personality are a feature, not a nice-to-have ("grand prize app competition" bar).

## 2. Tasks

Fields when creating a task:

| Field | Values | Notes |
|---|---|---|
| Name | text | e.g. "Read for 10 min", "30 pushups" |
| Repeats? | yes / no | Non-repeating tasks disappear forever once completed. Repeating tasks ("habits") can be completed once per day and reappear the next day. |
| Effort | low / medium / high | Drives gem rewards, wheel filtering, node colors |
| Priority | urgent+important / not-urgent+important | Nothing unimportant is tracked — if it's not important it doesn't get in. Default: **not-urgent**. |
| Due date | optional | As the date approaches, the task's effective urgency rises. Overdue or due ≤ 48h ⇒ treated as urgent. |
| Start date | optional | Task stays **off the wheel** (and off manual/eligible pools) until this local day arrives. Blank ⇒ available immediately. |
| Days | all / weekdays / weekends | Restricts which days the task can appear on the wheel. Weekdays = Mon–Fri, weekends = Sat/Sun (local). Default: **all**. |

## 3. The Wheel

- Only **eligible** tasks are in the pool: not archived, not already completed/on the plate today, past their start date (if any), and matching today's day scope (all / weekdays / weekends).
- Before spinning, user picks an effort filter: **Low / Medium / High / All** (you don't spin a High task when you have 10 minutes).
- The wheel is **weighted but fair**:
  - Base weight: urgent = 3, not-urgent = 1.
  - Due-date boost: weight × (1 + (7 − daysUntilDue)/7) when due within 7 days (min ×1, overdue ≈ ×2).
  - Fairness (anti-starvation): weight × (1 + 0.5 × spinsSinceLastPicked), capped at ×4. A task that keeps losing gets progressively luckier; repeats are still possible so it feels random.
- The spin has sound (ticks + fanfare), easing animation, and confetti on landing.
- **The plate (pending picks)**: a spun or hand-picked task lands on "today's plate". Choosing "Later" keeps it there until end of day. The plate holds at most **3** tasks (shown as a swipeable card stack); tasks on the plate leave the wheel pool until dealt with.
- **Abandoned-pick penalty**: each task still on the plate at end of day costs gems at rollover — **low −5, medium −10, high −18** (≈ half its base reward, each pick penalized separately). Gems floor at 0. This is separate from streak rules.
- **Re-spin ("the sloth shrugs")**: if you don't like the result you can pay gems to spin again.
  - First re-spin of the day, before any task is completed that day: **15 gems** (viable ~once/day).
  - Any further re-spin that day: **60 gems** (deliberately painful).

## 4. Manual pick ("I know what I want today")

- Urgent+important tasks (including date-escalated ones): picking manually is **free** — the app actively encourages ("do the scary thing").
- Not-urgent tasks: picking manually **costs 1.5× the task's reward** (rounded up), i.e. you always pay more than you earn. Freedom is a luxury; the sloth says so.

## 5. Economy (gems — displayed in-app as "Berries" 🪙; internal data field stays `gems`) — Duolingo-calibrated

Rewards per completion:

| Effort | Base gems |
|---|---|
| Low | 10 |
| Medium | 20 |
| High | 35 |

Modifiers:
- Urgent (or date-escalated urgent): × 1.5, rounded.
- First completion of the day: +5 bonus.
- Streak-goal reached: one-time bonus of **10 🪙 per goal day** (7→70, 14→140, 30→300, 50→500, 100→1000) — bigger goals visibly pay more.

Costs:
- **Streak Freeze**: 150 gems, may stock at most **2** at a time (like Duolingo). Auto-consumed on a missed day.
- Re-spin: 15 first/day (pre-completion), 60 after. A re-spin replaces that card on the plate.
- Manual pick of non-urgent task: ceil(reward × 1.5).
- Abandoned pick at end of day: −5 / −10 / −18 gems (low/med/high), per pick (see §3).
- **Mystery Background** (Store tab): **500 gems**. A SPECIAL luxury purchase — deliberately hard to afford. Buying one grants a **random** background the user doesn't own yet (gacha: the preview flashes through the whole catalog, slot-machine style, before revealing the prize). The catalog is generated from `public/backgrounds/`. The user **equips** one owned background at a time by tapping it in the Store collection (tap again to unequip); with nothing equipped the app shows the default solid color. Once all are owned the item is sold out.

Calibration intent: a freeze ≈ 8–12 typical completions. Not too easy, not too hard.

## 6. Streak

- A day counts if **≥ 1 task completed** that calendar day (local time). Multiple tasks per day are fine (all pay gems).
- No completion by end of day ⇒ day is **skipped**:
  - If a freeze is stocked → freeze auto-consumed, streak survives (shown as frozen day).
  - Else → streak resets to 0. The sloth will have opinions.
- **Streak goal**: user picks a goal (7 / 14 / 30 / 50 / 100). Reaching it pays **goal × 10 🪙** and a celebration. A **goal check-in modal** resurfaces the goal (with the bonus per option) every ~7 days, so it's no longer buried in the profile.
- **Streak repair**: if days were skipped and the streak died (no freezes left), the next app open shows a standing **repair offer**: revive the dead streak for **15 🪙 per lost day** (min 30, max 450). Repairing freezes the missed days; declining ("let it sink") clears the offer and the streak restarts from 0.
- Streak UI mimics Duolingo (flame, number, calendar of the week).

## 7. Map ("path of shame and glory")

- Lives as a collapsible section inside the **Me/Profile** screen (its former tab slot is now the Store).
- Duolingo-style vertical snaking path of **completed tasks**, newest at the top, grouped by day.
- Each node: circle with a checkmark, colored by effort (low = blue, medium = yellow, high = red), task name next to it.
- Urgent tasks get a special indicator (⚡ + glowing ring).
- Frozen days appear as ice nodes; today (if incomplete) is a pulsing "SPIN" node.

## 8. Badges

- Streak milestones: 3, 7, 14, 30, 50, 100, 200, 365 days.
- Per-habit milestones (repeating tasks only): 10, 30, 50, 100 completions (e.g. "10 reading days").
- Total completions: 10, 50, 100, 250.
- Badges are surfaced with a celebration modal + kept in a trophy shelf.
- The trophy shelf lives inside **Me → Voyage** (its former tab slot is now the Bank).

## 8b. Grand Line Bank (tab replaces Badges) — real CAD dollars

Goal: teach Ben (12, zero personal-finance background, loves One Piece) savings, investing and the power of compound interest. Replaces the paper sheet where Diogo adds $7 every Saturday. Luffy is the guide; animations keep it fun.

- **The bank lives in Ben's profile data** (`AppData.bank`). Ben sees the kid bank; Diogo's Bank tab is the **Banker's desk** (admin).
- **Chests (accounts)**, all in real dollars:
  - **Pocket Chest** (chequing) — default landing account, no interest.
  - **Treasure Vault** (savings) — Tangerine-style reference APR, admin-set, interest accrues daily, no losses.
  - **Merchant Ship** (XGRO) — medium risk. Admin updates the avg %/month from real XGRO ~monthly; the app simulates deterministic daily variance around it. Real MER (0.20%/yr) charged; buy/sell itself is free.
  - **Rocket Ship** (QQQ) — high risk, same mechanics with bigger daily swings; real MER 0.20%/yr.
  - **College Chest** — one-way: deposits are **automatically matched 1:1 by Dad**, money can never be taken out. Also shows Dad's real **RESP balance** (admin-updated manually, never matched) for motivation.
- **Allowance**: admin sets weekly amount (default $7) + payday (default Saturday). On payday the allowance auto-splits by Ben's **auto-split percentages** (savings/XGRO/QQQ/college; remainder → Pocket Chest). Ben edits the split freely in 5% steps.
- **Moving money**: chequing → any chest is instant. Leaving an investment requires **selling**: pick an amount, then a ~10s One Piece "making the deal" animation ends in a "DONE DEAL" stamp + coin rain; proceeds land in chequing. No sell/buy charges.
- **Pay Dad back** (Interac-style): from the Pocket Chest only, with an optional note. Diogo gets a banner (and best-effort local notification) until he taps "Got it".
- **Teaching UI**: every chest shows a 30-day sparkline plus a split bar of "money you put in" (blue) vs "money your money made" (gold). The **Treasure telescope** projects each chest at 1/2/3/5/10/20/50 years at the current pace (assumes allowance grows +$1/week every 6 months), splitting new money vs interest. Luffy quotes motivate saving.
- **Banker's desk (Diogo)**: pending paybacks, Ben's balances, bank rules (weekly amount, payday, savings APR, XGRO/QQQ monthly rates, RESP balance), manual adjustments (e.g. importing the paper-sheet money) and the **Captain's ledger** — a full log of every move Ben makes, for coaching.
- **Simulation** is deterministic per calendar day (seeded by date), so any device catching the bank up computes identical numbers; the parent's session also advances Ben's bank so it never falls behind.

## 9. Reports

- Page listing each **repeating** task (habit) with: total completions, current per-habit streak, best streak, last-30-day heatmap strip, completions-per-week mini chart.

## 10. Notifications

- Daily local reminder (user picks the hour) to do 1 task.
- If yesterday was missed: message motivates AND warns to buy a freeze before the streak dies.
- Current limitation (pre-Firebase): true scheduled push needs a server; until FCM is wired, reminders are best-effort local notifications (fire when the PWA/service worker is alive). FCM integration is planned with the Firebase setup.

## 11. Security / Access

- **Profiles**: a small fixed roster (currently Diogo & Ben), seeded in `src/store/storage.ts` (`SEED_PROFILES`). Each profile is an isolated world — its own tasks, streak, economy, badges, settings — stored under a per-profile localStorage key (`wheels-of-procrastination:v1:<id>`); the roster + active login live in `wheels-of-procrastination:profiles:v1`.
- **First launch**: pick a profile → set a 4-digit PIN (entered twice to confirm). Returning to a profile that already has a PIN asks for it once.
- **Login is once per device**: the active profile persists across app opens (no PIN prompt on every launch). Switch profiles / sign out from the **Me** screen ("Switch crewmate"), which returns to the profile picker.
- PINs are stored hashed (SHA-256 + salt) in Firestore, per profile — never in the repo or shipped JS. Because the hash lives in the cloud roster, a PIN set on one device works on any device. Security is intentionally light (2 trusted users); it gates access, it is not hardened against a determined attacker.
- **Migration**: any earlier local save (the pre-Firebase localStorage roster + per-profile blobs, incl. PIN hashes) is pushed up to Firestore once, on the first run that finds an empty cloud roster.

## 12. Tech

- React + Vite + TypeScript PWA (vite-plugin-pwa), mobile-first, installable on Android.
- State: zustand. **Persistence: Firebase Firestore** (project `spinningwheel-6ff51`), cloud-synced across devices:
  - `src/lib/firebase.ts` — SDK init, anonymous auth (`ensureAuth`), Firestore with offline IndexedDB cache.
  - `src/store/cloud.ts` — the data layer: `app/roster` doc holds the crew + PIN hashes; `profiles/{id}` docs each hold one crewmate's whole `AppData`. `onSnapshot` gives live cross-device sync; the Firestore offline cache makes it work without a connection (after the first online sign-in).
  - `src/store/storage.ts` — now local-only helpers: default/merge of an `AppData` blob, the seed roster, the per-device active login, and one-time readers for migrating an old localStorage save up to the cloud.
  - Auth is **anonymous** (`signInAnonymously`); Firestore rules (`firestore.rules`) require `request.auth != null`. Deploy config in `firebase.json` / `.firebaserc`.
- All art is original inline SVG (Luffy mascot with mood poses in `src/components/Luffy.tsx`; Zoro/Chopper/Nami busts in `src/components/Crew.tsx`; the Straw Hat Jolly Roger in the wheel hub in `src/components/JollyRoger.tsx`, which does a silly squash-and-wobble while the wheel spins); all sounds synthesized with WebAudio (no external assets). No official One Piece artwork is bundled — everything is hand-drawn fan art, fine for this private, unpublished app.
- FCM push notifications still planned but NOT wired yet (see §10).

## 13. Tone

Upbeat, hype-man energy, never mean about the user's actual life — Luffy roots for you, treats every task as an "adventure/quest", celebrates loudly, and shrugs off streak death with "we set sail again tomorrow". Examples live in `src/logic/crewLines.ts`.

## 14. Quiz — "Grand Line Academy" (tab replaces Tasks; Tasks live behind a floating "+" FAB)

**Each profile has its own academy.** The Quiz tab always shows the ACTIVE profile's topics; Diogo is additionally the **admin** (see §16). One Piece-themed presentation; the *content* is real learning material.

- **Topics** (registry in `src/logic/quiz.ts`, each with an `owner`):
  - **Ben** (born Feb 2014 — Ontario grade-6 level): Canada Geography (live, 50 questions), Science, Critical Thinking (scams/fake news), Logic — coming later, plus ~5 more Ontario grade-6 topics eventually.
  - **Diogo** (senior frontend dev; goal = practical AI-for-dev market edge, NO ML training theory): AI in Software Dev, GitHub Copilot, Claude Code (live, ~20 seed questions each, target 50 — `quiz:regen` tops them up).
  - On a profile's first login its own non-comingSoon topics auto-unlock once (`quiz.selfInit`); after that locks are fully admin-managed.
- **Question bank** lives in Firestore `app/quizBank` (seeded from `src/quiz/*Seed.ts` on first run; after that the cloud copy is the source of truth). Types: multiple choice, short write-in, tap-to-match pairs, put-in-order. `weight: 2` = core material, `weight: 1` = fun/nice-to-know.
- **Training (own profile)**: correct answers never interrupt the flow — Berries fly to the topbar counter (which counts up) with a small "+N 🪙" flash, and the next question appears immediately; only WRONG answers pause on a correction card (right answer + fun fact). Berries: full `points` on the first-ever correct answer, **half** on later correct answers, **at most once per question per day** (anti-farming). Adaptive picker favours unseen/weak questions and ✨ fresh ones (see weekly review, §16).
- **Final test**:
  - *Official (Ben)* — launched from **Diogo's Admin desk** (runs on the spot, hand Ben the device); recorded to Ben's data.
  - *Official (Diogo)* — self-serve from his own Quiz tab (admin approves his own tests).
  - *Mock Final Test* (labelled that way to contrast with "Train") — anyone, any unlocked topic, no rewards.
  - Size auto-chosen from real per-question answer times (10–14 questions, ≤ ~13 min budget).
  - Selection targets ~80%: ~60% strong + 40% weak/unseen, interleaved; live mercy rule = after 2 wrong in a row the next question is the strongest remaining ("possible to fail, but don't fail too hard").
  - Score revealed **only at the end**, with a mistakes review. Pass = **80%+** → "CONQUERED" stamp + **1 Devil Fruit 🍇** (once per topic, ever). Fail → retry another day with different questions (previous attempt's questions excluded).
- **Devil Fruits 🍇** = the diamond currency, per profile. Sources: first official topic pass + admin bonus grants. Shown in the topbar next to Berries (the admin sees Ben's count on his own topbar too).
- **Wheel integration**: every unlocked topic is auto-synced onto the owner's wheel as a daily habit ("<emoji> <topic> quiz training", medium effort, ⚡ high priority); locking archives the habit.

## 15. Store tabs & Treasures (prizes)

- Store tabs: **Backgrounds** (mystery gacha) and **🏴‍☠️ Treasures**. Each profile shops from its OWN catalog with its OWN 🍇 (`PRIZES` in `src/logic/quiz.ts`); prize logos live in `public/prizes/` and spin like the Luffy tab icon.
  - **Ben**: Roblox $10 (3 🍇), Dollarama candy (2 🍇), Costco Sushi (6 🍇).
  - **Diogo**: LCBO $10 (3 🍇).
- Limit **1 purchase per 30 days per profile** (store shows a days-left counter). Unpaid purchases **accumulate** — duplicates of the same item are fine, each is its own row; nothing blocks a new purchase except the 30-day window and the 🍇 balance.
- Buying creates an unpaid purchase on the buyer's data. **Diogo sees persistent banners** at the top of the app for every unsettled purchase (Ben's and his own) with a **Paid** button; they're also listed in the Admin desk under "Prizes to settle".

## 16. Admin (Diogo) — the "Captain's desk" in his Me tab

The Me screen is split into sub-tabs — **👤 Me** (streak, goal, freezes) · **🗺️ Voyage** (lifetime stats, map, habit log) · **⚙️ Settings** · **🛠️ Admin** (Diogo only, deliberately last: least-used feature). All management lives in the Admin tab (`src/components/AdminSection.tsx`):

- Manage BOTH academies (Ben's and his own): 🔒 lock/unlock any topic, **+1 🍇** bonus grants, per-topic question manager (view every Q&A, remove — flagged `status: "removed"` in the DB row so AI regen won't recreate it — and restore), Ben's official final-test launcher, ⚔️ preview of Ben's training (records nothing).
- Review queue: AI-regenerated questions arrive `status: "pending"` → approve/remove card at the top of the desk.
- Prize settlement: "Prizes to settle" list + topbar banners (see §15).
- **Scripts** (both talk to Firestore via the public web config + anonymous auth):
  - `npm run quiz:regen` (claude CLI, opus) — refills every live topic to its target after removals; new questions land `pending`.
  - `npm run quiz:review` (claude CLI, **sonnet**) — weekly refresh of Diogo's fast-moving AI topics: UPDATES outdated questions in place and ADDS up to 5/topic; both get `freshAt` → ✨ **NEW badge** + training priority until seen once. Scheduled via launchd: `~/Library/LaunchAgents/com.wheelsofprocrastination.quiz-review.plist`, Mondays 09:00, log at `~/Library/Logs/wop-quiz-review.log`.

> Keep this document in sync with any rule change — it is the canonical spec for the app's game rules.
