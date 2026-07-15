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
- Streak-goal reached: +50 one-time bonus per goal reached.

Costs:
- **Streak Freeze**: 150 gems, may stock at most **2** at a time (like Duolingo). Auto-consumed on a missed day.
- Re-spin: 15 first/day (pre-completion), 60 after. A re-spin replaces that card on the plate.
- Manual pick of non-urgent task: ceil(reward × 1.5).
- Abandoned pick at end of day: −5 / −10 / −18 gems (low/med/high), per pick (see §3).

Calibration intent: a freeze ≈ 8–12 typical completions. Not too easy, not too hard.

## 6. Streak

- A day counts if **≥ 1 task completed** that calendar day (local time). Multiple tasks per day are fine (all pay gems).
- No completion by end of day ⇒ day is **skipped**:
  - If a freeze is stocked → freeze auto-consumed, streak survives (shown as frozen day).
  - Else → streak resets to 0. The sloth will have opinions.
- **Streak goal**: user picks a goal (7 / 14 / 30 / 50 / 100). Reaching it pays +50 gems and a celebration; then user is prompted to set the next one.
- Streak UI mimics Duolingo (flame, number, calendar of the week).

## 7. Map ("path of shame and glory")

- Duolingo-style vertical snaking path of **completed tasks**, newest at the top, grouped by day.
- Each node: circle with a checkmark, colored by effort (low = blue, medium = yellow, high = red), task name next to it.
- Urgent tasks get a special indicator (⚡ + glowing ring).
- Frozen days appear as ice nodes; today (if incomplete) is a pulsing "SPIN" node.

## 8. Badges

- Streak milestones: 3, 7, 14, 30, 50, 100, 200, 365 days.
- Per-habit milestones (repeating tasks only): 10, 30, 50, 100 completions (e.g. "10 reading days").
- Total completions: 10, 50, 100, 250.
- Badges are surfaced with a celebration modal + kept in a trophy shelf.

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
