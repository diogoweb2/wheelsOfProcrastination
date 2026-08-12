# Wheels of Procrastination — Business Requirements

> Living document. Update this file whenever a rule changes. The code should always match this doc.
> Last updated: 2026-08-06

## 1. Concept

A mobile-first PWA habit builder + task manager. **Multi-user**: a small fixed set of profiles (currently **Diogo** and **Ben**) share the device, each with their own tasks, streak, economy, and badges (see §11).
Core loop, inspired by Duolingo's "one small thing every day":

1. Open app → spin the **Wheel of Fortune** → it picks one task for you.
2. Do the task → tap **Complete** → earn gems, keep your streak.
3. Come back tomorrow.

Theme: **One Piece** (personal/private app — original fan-art SVG, no official assets). **Monkey D. Luffy** is the main mascot ([src/components/Luffy.tsx](src/components/Luffy.tsx)): a loud, hungry, fearless hype-man who narrates, cheers, and celebrates ("Shishishi!"). Supporting crew each have their own SVG bust in [src/components/Crew.tsx](src/components/Crew.tsx) and appear where they fit: **Zoro** on the Training log (habits/grind), **Chopper** on the Streak Freeze card (he's the doctor), **Nami** on the Berry-reward goal card (she handles money). Colors follow the official **One Piece Series** palette (schemecolor.com): Waterfall `#60BFF5`, Azure Blue `#2E63A4`, Dark Bronze `#AF6528`, Dark Yellow `#FFCE00`, Glossy Red `#D70000`, Black `#000000` — a deep-azure sea with straw-gold & red accents. No green anywhere: the effort scale is Waterfall-blue (low) → gold (medium) → red (high), and success/"done" accents use Waterfall blue. Primary buttons are gold; the only non-palette accent kept is `--orange`, used solely as the streak "fire" tone beside the 🔥 emoji.
Sound, animation and personality are a feature, not a nice-to-have ("grand prize app competition" bar).

## 1b. Navigation — home screen + apps

The app is organised like a phone, not like a tab bar. There is **no global tab bar and no always-on stat bar** — the numbers that used to sit at the top of every screen are widgets on the Dashboard, which buys back the vertical space.

- **Dashboard (home screen)** — the landing screen after the PIN: a greeting, six **widgets**, then the app icons.
  - **Widgets** (2-up on phones, 3-up on wide screens), each a shortcut into its app:
    **📋 Today** (quests on the plate · done today) · **🔥 Streak** (current, best, freezes, last 7 days) ·
    **🪙 Berries** (Berries + Devil Fruits) · **🏦 Treasure** (bank total; the parent's watches Ben's chests) ·
    **📖 Log Book** (stickers owned / total) · **🏫 Academy** (questions due today · topics conquered).
  - **Reordering icons**: tap **✥ Arrange** (or press and hold any icon for ~0.3s) to enter edit mode — the grid jiggles and a plain drag moves an icon into a new slot; tap **✓ Done** to leave. The order is saved to `settings.homeOrder` (per profile, synced). Newly shipped apps append at the end; "Reset icon layout" lives in Settings → About.
  - Icons carry an iOS-style **red badge** when something needs attention (incoming sticker trades, freeze asks + unpaid prizes on the Captain app, unacknowledged paybacks on the Bank).
- **Inside an app**: one sticky header row holds the **`⌂ Main` button**, the app name, and the **🪙 Berry counter** (it lives here because earned coins fly to it — `logic/fx.ts` targets `.stat--gem`). Below that, each app has **its own bottom menu**. An app with a single page shows no menu.
- **The roster** ([src/apps/registry.ts](src/apps/registry.ts)) is the single source of truth — one entry per app (name, artwork, tile colours, bottom-menu tabs, `adminOnly`, `gate`), plus one branch in `AppBodyRouter` ([src/App.tsx](src/App.tsx)). Adding an app touches nothing else.

**App names are deliberately plain.** The One Piece flavour lives in the artwork, the copy and the game content — never in the icon label. "Log Book", "Davy Back", "Captain" and "Log Pose" were unreadable as navigation: you cannot find the sticker album from a tile called Log Book. Each tile now says what the app *is*; the flavour name (Grand Line Academy, Nami's Black Market, Davy Back Fight) survives as a subtitle inside.

| App | Bottom menu |
|---|---|
| 📋 **Tasks** *(the wheel + the daily loop)* | Spin · Quests · Streak · Map · Record |
| 🎓 **Quiz** | Topics · Study · Progress |
| 🏦 **Bank** | *Ben:* Chests · Grow · Tools · Log — *Diogo:* Vault · Shock · Rules · Ledger |
| 🛒 **Shop** | Wallpapers · Treasures · Orders |
| 🖼️ **Stickers** | Album · Packs · Trade |
| 🃏 **Card Game** *(in 🎮 Games)* | Play · Deck · How to |
| ♟️ **Chess** *(in 🎮 Games)* | Play · Pieces · How to |
| 🔴 **Checkers** *(in 🎮 Games)* | Play · Pieces · How to |
| 💪 **Gym** | Train · Stats · Gear · Coach |
| 💡 **Ideas** | Open · Done · New |
| 🕐 **Clocks** | Clocks *(single page)* |
| ⚙️ **Settings** | Profile · Alerts · Sound · About |
| 👨‍👦 **Parent** (Diogo only) | Freezes · Quizzes · Prizes · Audit |

- **The Wheel app owns the whole daily loop.** Its **Streak** page (streak hero, goal, freeze shop, ask-Dad), **Map** page (§7) and **Record** page (trophy shelf §8 + training log + lifetime stats and the last-8-weeks bar chart) used to be a separate "Voyage" app; they belong beside the wheel that feeds them.
- **Folders.** An app may declare a `folder`, and every app naming the same one collapses into a single Dashboard tile that opens onto them — exactly what a phone does. **🎮 Games** holds ⚔️ Davy Back, ♟️ Chess and 🔴 Checkers; three games in a row of icons is three games' worth of noise. The folder tile carries a strip of the icons inside it and **one red badge summing everything waiting in there**, so nothing gets buried by being grouped. Dragging still works: the saved order (`settings.homeOrder`) holds tile ids, and a folder that has never been dragged inherits the earliest slot any app inside it held — which is why the Games folder appears where the Davy Back icon used to be rather than at the end.
- **Situational apps.** An app may declare a `gate` and then only appears on the home screen while that gate is open. **Clocks** (crew time zones) is gated on `converter` — it shows up only while **trip mode / the Brazil money converter** is switched on for Ben's bank (§8b), and disappears again when the trip is over.

App tile artwork is generated from art already in `public/` (see CLAUDE.md's image rules) into 128px webp files named `public/app-*.webp`. Apps without artwork fall back to their emoji on a coloured squircle.

## 2. Tasks

Fields when creating a task:

| Field | Values | Notes |
|---|---|---|
| Name | text | e.g. "Read for 10 min", "30 pushups" |
| Repeats? | one-shot / repeat / repeat until done | **One-shot** tasks disappear forever once completed. **Repeat** ("habits") can be completed once per day and reappear the next day. **Repeat until done** (`untilDone`) keeps coming back like a habit — respecting every other filter (days, seasons, start date, required window, unlock-after) — but the **first tick retires it for good**, and a day it isn't done costs **no Berries**, even as a must-do. For jobs that wait on somebody else ("ask Dad if the form went in"): you can't fail them, you're just not done yet. They don't count towards habit streaks or the training log. |
| Effort | low / medium / high | Drives gem rewards, wheel filtering, node colors |
| Priority | urgent+important / not-urgent+important | Nothing unimportant is tracked — if it's not important it doesn't get in. Default: **not-urgent**. |
| Due date | optional | As the date approaches, the task's effective urgency rises. Overdue or due ≤ 48h ⇒ treated as urgent. |
| Start date | optional | Task stays **off the wheel** (and off manual/eligible pools) until this local day arrives. Blank ⇒ available immediately. |
| Days | all / weekdays / weekends / pick days / day of month | Restricts which days the task is live (wheel **and** must-do checklist). Weekdays = Mon–Fri, weekends = Sat/Sun (local). **Pick days** = hand-picked days of the week (e.g. Mon/Wed/Fri → `weekDays: [1,3,5]`, 0 = Sunday). **Day of month** = hand-picked calendar days (e.g. the 11th of every month → `monthDays: [11]`, 1–31); a picked day that a short month doesn't have (the 31st in February) fires on that month's **last day**, so it never skips a month. An empty pick list (either kind) means no restriction. Default: **all**. |
| Must-do | yes / no | A non-negotiable: leaves the wheel and lives in the daily checklist beside the wheel. |
| Seasons | winter / spring / summer / fall (multi-select) | Restricts the quest to the seasons you tick (`seasons`), on top of the day scope — so "every day, but only in summer" works. Northern hemisphere, by month: Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov fall. None ticked (or all four) = all year round. Default: **all year**. |
| Also on the wheel | must-dos only | A must-do can opt back **onto** the wheel (`onWheel`): it stays on the checklist AND can be spun/hand-picked, paying the full wheel reward. Off by default. |
| Unlock after | optional, another task | The task is hidden from **both** the wheel and the must-do checklist until the chosen task has been completed at least once. If the prerequisite is later deleted, the gate is treated as satisfied (a chain never gets stuck). |
| Split into parts | optional, new one-shot quests only | A big job broken into N sessions ("cut trees" → 6 parts). Creates N quests named `<name> (1/N)`…`(N/N)`, each **locked until the previous part is done** (`afterTaskId` chain), all sharing a `seriesId`. Max 20. |
| Rest days | optional, plain repeating tasks only (not "until done") | After a completion the task disappears for N days and only comes back on day N after the last time it was done (e.g. "cut the grass" with 15). Blank/0 ⇒ available again the next day. While resting it is off the wheel, off the checklist, and **not** penalised as a missed must-do. |

**Form layout**: the everyday path is short — name (with 🎤 dictation), must-do, repeats, effort, priority. Everything else (locked-until, split into parts, dates, which days) lives behind one **⚙️ Advanced** drawer, which opens itself when the quest being edited already uses any of those fields.

**Finishing a split early**: once any part of a split quest is done, its next remaining part shows a **🏁** button in the quest log. Tapping it deletes every part that hasn't been completed yet (history of the finished parts stays) — "I only needed 4 of the 6 sessions".

**Search**: the quest log shows a 🔍 search box once there are more than 4 active quests; it filters the list by name.

## 3. The Wheel

- Must-dos are off the wheel unless they set **also on the wheel** (`onWheel`), in which case they sit in both places.
- Only **eligible** tasks are in the pool: not archived, not already completed/on the plate today, past their start date (if any), matching today's day scope (all / weekdays / weekends / hand-picked days) and season, unlocked (their prerequisite task is done), and not resting out a cooldown.
- Before spinning, user picks an effort filter: **Low / Medium / High / All** (you don't spin a High task when you have 10 minutes).
- The wheel is **weighted but fair**:
  - Base weight: urgent = 3, not-urgent = 1.
  - Due-date boost: weight × (1 + (7 − daysUntilDue)/7) when due within 7 days (min ×1, overdue ≈ ×2).
  - Fairness (anti-starvation): weight × (1 + 0.5 × spinsSinceLastPicked), capped at ×4. A task that keeps losing gets progressively luckier; repeats are still possible so it feels random.
- The spin has sound (ticks + fanfare), easing animation, and confetti on landing.
- **The plate (pending picks)**: a spun or hand-picked task lands on "today's plate". Choosing "Later" keeps it there until end of day. The plate holds at most **3** tasks (shown as a swipeable card stack); tasks on the plate leave the wheel pool until dealt with.
- **Quiz quests are must-dos, not wheel picks** (see §14): studying isn't left to luck, so every unlocked topic lands on the daily must-do checklist. The checklist row carries a **🏫** shortcut that switches to the Academy app and opens that topic's training round directly; a quiz card still on the plate from before the change keeps its **🏫 Start training →** button.
- **A ticked must-do leaves the checklist**, so what's on screen is only what's still to do. The row holds its place for a short celebration beat (green ✓, struck through, berries paid) and then drops off. The header count still reads **done/total for the whole day** ("3/5"), so nothing ticked is forgotten. A tick that changes the task underneath — a one-shot archiving itself, a rest-days quest starting its rest — must still not let it turn up in the "do one of the other N today" picker the same day.
- **The checklist is two panels, scheduled first**:
  - **🗓️ Scheduled must-dos** — anything with a schedule of its own: a day scope other than "all" (weekdays / weekends / pick days / day of month), rest days, a season, a `requiredFrom`/`requiredUntil` window, or a start date.
  - **🔁 Every day** — the plain daily habits (floss, read), which have no schedule to miss.
  - Each panel keeps its own done/total count for the day ("4/6"). A panel disappears the moment it has no rows left to show — nothing required in it today, or everything in it ticked. Once both are empty the checklist is a single **🎉 All must-dos cleared!** line.
- **A missed scheduled must-do is carried, in red, until it's done.** If its day passes unticked it stays on the checklist (top of the Scheduled panel, most overdue first) with a **⚠️ MISSED — due <day>, N days late** badge, a red row, and a red panel with a pulsing "N scheduled must-dos are LATE" banner. Rules:
  - Only **scheduled** must-dos carry. A daily habit missed yesterday is gone — yesterday's floss can't be done today.
  - Lateness is the earliest day in the **current unbroken run** of missed occurrences, looking back at most 90 days and never before the quest was created. Ticking it off ends the run.
  - A must-do whose schedule says **today** is due, never late — the live occurrence supersedes older ones.
  - A carried item can be ticked off exactly like a live one (and pays the same), and it never shows up in the "do one of the other N today" picker, since it's already on the list.
  - Carrying is display only: the daily miss penalty at rollover is unchanged.
- **"Do it today anyway"** (`doTodayDay`): under the must-do checklist sits **＋ Do one of the other N today**, listing every must-do that exists but isn't being asked for today — resting out its rest days, waiting for its `requiredFrom`/start date, or scoped to other weekdays — each with the reason it's dormant ("back in 3d", "starts 2026-08-20", "not scheduled today"). Tapping one pins it to **today only**; the row gets a **↩** to take it back off. Rules:
  - It bypasses the required window, the day scope and the rest-day cooldown for that one day, nothing else — a chained quest whose prerequisite is unmet, an archived quest, or one whose `requiredUntil` has already passed never appears in the picker.
  - Skipping a volunteered day costs **nothing**: it was offered, not demanded, so rollover never penalises it.
  - The same goes for a **repeat-until-done** must-do (`untilDone`): it stays on the checklist every day it's scheduled, its row reads "stays until done" instead of a fine, rollover docks nothing for it, and the first tick pays the flat must-do reward and archives it for good.
  - Ticking it off is a normal completion, so a rest-day quest **restarts its full cooldown from today** — "cut the grass" (15 days) done 3 days early is next due 15 days from now, not 12.
- **Abandoned-pick penalty**: each task still on the plate at end of day costs gems at rollover — **low −5, medium −10, high −18** (≈ half its base reward, each pick penalized separately). Gems floor at 0. This is separate from streak rules.
- **Re-spin ("the sloth shrugs")**: if you don't like the result you can pay gems to spin again.
  - First re-spin of the day, before any task is completed that day: **15 gems** (viable ~once/day).
  - Any further re-spin that day: **60 gems** (deliberately painful).

## 4. Manual pick ("I know what I want today")

- **Hand-picking any task is free**, urgent or not. Deciding to work is never taxed — the only limit is the plate cap of **3** pending tasks (§3), which is what keeps a day honest.
- Urgent+important tasks (including date-escalated ones) are still surfaced first and nudged hardest ("do the scary thing").

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
- **Mystery Background** (Store → Wallpapers): **500 gems**. A SPECIAL luxury purchase — deliberately hard to afford. Buying one grants a **random** background the user doesn't own yet (gacha: the preview flashes through the whole catalog, slot-machine style, before revealing the prize). The catalog is generated from `public/backgrounds/`. The user **equips** one owned background at a time by tapping it in the Store collection (tap again to unequip); with nothing equipped the app shows the default solid color. Once all are owned the item is sold out.

Calibration intent: a freeze ≈ 8–12 typical completions. Not too easy, not too hard.

## 6. Streak

- A day counts if **≥ 1 task completed** that calendar day (local time). Multiple tasks per day are fine (all pay gems).
- No completion by end of day ⇒ day is **skipped**:
  - If a freeze is stocked → freeze auto-consumed, streak survives (shown as frozen day).
  - Else → streak resets to 0. The sloth will have opinions.
- **Streak goal**: user picks a goal (7 / 14 / 30 / 50 / 100). Reaching it pays **goal × 10 🪙** and a celebration. A **goal check-in modal** resurfaces the goal (with the bonus per option) every ~7 days, so it's no longer buried in the profile.
- **Streak repair**: if days were skipped and the streak died (no freezes left), the next app open shows a standing **repair offer**: revive the dead streak for **15 🪙 per lost day** (min 30, max 450). Repairing freezes the missed days; declining ("let it sink") clears the offer and the streak restarts from 0.
- **Free freeze from Dad**: real life (trips, illness) shouldn't cost a streak, so Ben can ask Diogo to cover a day instead of paying the repair cost.
  - Ben taps **🆘 Ask Dad for a free freeze** — on the streak-death modal, and on the freeze card in Wheel → Streak (available any time, not just after a death) — with an optional one-line reason. One open ask at a time; he can cancel it.
  - Diogo gets a **topbar banner + phone notification** ("Ben needs a Streak Freeze!", showing the reason) and answers from the **Admin desk** (`FreezeDesk` in `src/components/AdminSection.tsx`): pick how many freezes (1–9) and write a **custom message**. He can also gift unprompted, with no ask pending.
  - Granting adds the freezes to Ben's stock — **deliberately bypassing the `MAX_FREEZES` shop cap**, since Dad is overriding it — and, if his streak is currently dead, **revives it and freezes the missed days for free** (same effect as `repairStreak`, no Berries charged).
  - **The ask puts the streak ON HOLD, it never blocks the app.** While an ask is pending the repair modal disappears (Ben carries on playing) and the streak number keeps showing its pre-death value with a ⏳ "on hold — waiting for Dad" note, on the Home widget and the Streak page.
  - **Dad's answer decides it**: granting revives the streak (below); **declining zeroes it** — the dead streak is cleared and Ben's next app open shows a one-time *"Dad said no this time"* modal (`seenAt` on the request). Cancelling his own ask just brings the normal repair offer back.
  - Ben's next app open shows a Chopper celebration: *"Dad sent you a free Streak Freeze!"* + Dad's message verbatim + the revived streak value. Shown once (`seenAt`), and it takes priority over the repair offer.
  - Asks and gifts live in the shared Firestore doc **`app/freezeRequests`** (`{ requests: FreezeRequest[], gifts: FreezeGift[] }`), live-synced to both sides like sticker trades.
- Streak UI mimics Duolingo (flame, number, calendar of the week).

## 7. Map ("path of shame and glory")

- Lives in the **Wheel** app, on its **🗺️ Map** page.
- Duolingo-style vertical snaking path of **completed tasks**, newest at the top, grouped by day.
- Each node: circle with a checkmark, colored by effort (low = blue, medium = yellow, high = red), task name next to it.
- Urgent tasks get a special indicator (⚡ + glowing ring).
- Frozen days appear as ice nodes; today (if incomplete) is a pulsing "SPIN" node.

## 8. Badges

- Streak milestones: 3, 7, 14, 30, 50, 100, 200, 365 days.
- Per-habit milestones (repeating tasks only): 10, 30, 50, 100 completions (e.g. "10 reading days").
- Total completions: 10, 50, 100, 250.
- Badges are surfaced with a celebration modal + kept in a trophy shelf.
- The trophy shelf lives in **Wheel → 🏅 Record**, above the training log and the lifetime stats.

## 8b. Grand Line Bank (the 🏦 Bank app) — real CAD dollars

Goal: teach Ben (12, zero personal-finance background, loves One Piece) savings, investing and the power of compound interest. Replaces the paper sheet where Diogo adds $7 every Saturday. Luffy is the guide; animations keep it fun.

Design principle: **Ben decides every dollar himself — no auto-invest, no auto-split.** The point is to build the habit of making a choice each week.

- **The bank lives in Ben's profile data** (`AppData.bank`). Ben sees the kid bank; Diogo's Bank app is the **Banker's desk** (admin): Vault · Shock · Rules · Ledger.
- **Chests (accounts)** — three real ones plus College (no more Savings account):
  - **Pocket Chest** (chequing) — everyday money, no growth.
  - **Merchant Ship** (XGRO) — medium risk. Real MER (0.20%/yr) charged; buy/sell is free.
  - **Rocket Ship** (QQQ) — high risk, bigger swings; real MER 0.20%/yr.
  - **College Chest / RESP** — deposits are **matched 1:1 by Dad**. He *can* withdraw, but only **his own contributions**, and every dollar he pulls out **burns an equal dollar of Dad's match forever** (panic Luffy). Also shows Dad's real **RESP balance** (admin-updated, never his to move) for motivation.
- **Real market moves**: `npm run bank:market` (monthly cron, Claude sonnet) fetches ~30 days of real XGRO/QQQ daily % returns into Firestore `app/marketData`; the sim replays them for the next ~30 days (looping if the next fetch is late). On failure it flags `status:"failed"` (keeping the last good series), retries daily, and the app shows a **red banner on Diogo's dashboard + Banker's desk**. When no series is available the sim falls back to the admin's monthly-rate estimates.
- **Allowance / payday**: admin sets weekly amount (default $7) + payday (default Saturday). On payday the money drops into a **pending pool** (accumulates across missed weeks) and a big **🎉 PAYDAY event** fires. On his next Bank visit a **mandatory allocation modal** makes him place every dollar across the chests — "all to Pocket Chest" is a valid choice, but doing nothing is not an option (no dismiss until allocated).
- **Moving money is fully free**: chequing → any chest is instant. Leaving an investment = **Sell**: a concerned-Luffy warning (shows growth earned + projected next-month growth he'd give up), then the ~10s One Piece "making the deal" animation → "DONE DEAL" stamp + coin rain → proceeds land in chequing.
- **Pay Dad back** (Interac-style): from the Pocket Chest only, optional note. Diogo gets a banner + best-effort local notification until he taps "Got it".
- **The Shock Test** (QQQ only, manual — no auto-crash): Diogo's desk has a crash lever + "days without a crash" counter from the start; −20% overnight; PANIC SELL (loss locked in) vs HOLD THE LINE. **On HOLD, Ben is told roughly how many days to full recovery**, and during that window the sim **ignores the market series and uses random realistic up/down moves** trending back to ~6% above the pre-crash value.
- **Teaching UI**: every chest shows a 30-day sparkline + a blue/gold "money you put in vs money your money made" bar. The **Treasure telescope** projects any chest at 1/2/3/5/10/20/50 years with a kid-adjustable "add $X/week" habit dial (College doubles it), splitting new money vs growth. Luffy quotes motivate saving.
- **Banker's desk (Diogo)**: market-feed health, pending paybacks, Shock Test control, Ben's balances (+ pending allowance), bank rules (weekly amount, payday, XGRO/QQQ fallback rates, RESP balance), manual adjustments (e.g. importing the paper-sheet money) and the **Captain's ledger** — every move Ben makes, for coaching.
- **Simulation** is deterministic per calendar day (seeded by date), so any device catching the bank up computes identical numbers; the parent's session also advances Ben's bank so it never falls behind. Crashes/recoveries appear in the ledger as 📉/📈 entries.

## 9. Reports

- Page listing each **repeating** task (habit) with: total completions, current per-habit streak, best streak, last-30-day heatmap strip, completions-per-week mini chart.

## 10. Notifications

- Daily local reminder (user picks the hour) to do 1 task.
- If yesterday was missed: message motivates AND warns to buy a freeze before the streak dies.
- The **daily reminder** is still a best-effort local notification: it fires only while the PWA/service worker is alive (there's no scheduled server-side send).
- **Web push (FCM)** covers the cross-crew pings that must reach a **closed** app — Ben's freeze ask, Dad's grant, sticker trade offers:
  - Each crewmate turns it on per device in **Me → Settings → 📲 Push to this device**. That asks permission, registers `public/firebase-messaging-sw.js` on its own scope (`/firebase-cloud-messaging-push-scope`, so it coexists with the Workbox PWA worker), and saves the FCM token to `profiles/{id}.pushTokens`. iOS only allows this once the app is added to the Home Screen.
  - Sending needs a service-account key, which a browser can't hold, so the fan-out lives in **Cloud Functions** (`functions/index.js`): `onFreezeDeskWrite` watches `app/freezeRequests` and `onStickerTradeWrite` watches `app/stickerTrades`. Each diffs before/after **by id**, so unrelated writes to the doc (e.g. marking a gift seen) never re-send an old notification. Tokens FCM rejects as dead are pruned from the profile.
- **9:30pm last call** (`nightlyLastCall`, scheduled `30 21 * * *` America/Toronto) — fires before the midnight rollover that burns freezes and penalizes abandoned picks:
  - Each crewmate gets **their own** count of what's still open today: unticked **required** checklist items + tasks still on the plate (`daily.pendingPicks`, counted only while `daily.day` is actually today, so yesterday's leftovers never inflate it). Phrased "2 must-dos + 1 on the plate", naming up to 3.
  - **Diogo gets a second, separate push about Ben's** leftovers ("👦 Ben still has 2 must-dos") so he can remind him before bed.
  - **Silent when nothing is outstanding** — a clean day never buzzes, so the ping keeps meaning something.
  - The function mirrors `isAvailableOn`/`isRequiredOn` from `src/logic/wheel.ts` in plain JS (kept in sync by hand — changing the required-window or dayScope rules means updating both).
  - The public VAPID key comes from `VITE_FCM_VAPID_KEY` (see `.env.example`); it ships in the client bundle by design. Deploy the senders with `firebase deploy --only functions` (requires the Blaze plan).

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
- FCM web push is wired for the cross-crew pings (freeze asks/grants, trade offers) via Cloud Functions in `functions/` — see §10. The daily reminder remains local-only.

## 13. Tone

Upbeat, hype-man energy, never mean about the user's actual life — Luffy roots for you, treats every task as an "adventure/quest", celebrates loudly, and shrugs off streak death with "we set sail again tomorrow". Examples live in `src/logic/crewLines.ts`.

## 14. Quiz — "Grand Line Academy" (the 🏫 Academy app)

**Each profile has its own academy.** The Academy app always shows the ACTIVE profile's topics; Diogo is additionally the **admin** (see §16). One Piece-themed presentation; the *content* is real learning material.

- **Topics** (registry in `src/logic/quiz.ts`, each with an `owner`):
  - **Ben** (born Feb 2014 — Ontario grade-6 level): Canada Geography (live, 50 questions), Science, Critical Thinking (scams/fake news), Logic — coming later, plus ~5 more Ontario grade-6 topics eventually.
  - **Diogo** (senior frontend dev; goal = practical AI-for-dev market edge, NO ML training theory). Two tracks (`QUIZ_TRACKS`, shown as sections):
    - **🛠️ The Agent Engineer Path** — six gated levels, deliberately **vendor-neutral** (no provider names: APIs churn, the ideas don't), each explained through his React/frontend background. L1 What a model actually is · L2 Talking to models on purpose · L3 Tools & the agent loop · L4 Context engineering & memory · L5 Agent architectures · L6 Shipping agents for real. 105 seed questions (`src/quiz/agentsSeed.ts`).
    - **🧰 Tooling & day job** — the products that *do* churn: AI in Software Dev, GitHub Copilot, Claude Code (~20 seed questions each, target 50 — `quiz:regen` tops them up).
- **Curriculum ladder** (`syncTopicUnlocks`): a topic with no `unlockAfter` is an entry point and opens itself; one with `unlockAfter` stays locked until that prerequisite is **officially passed** (passing L2 pops a "LEVEL 3 UNLOCKED" event). Every id the ladder has ever auto-opened is recorded in `quiz.autoUnlocked`, so a topic the admin deliberately re-locks stays locked and a newly added topic opens exactly once. Admin locks still win at any time.
- **Lessons** (`src/quiz/lessons/`, rendered by `src/components/Lesson.tsx`): each question may carry a `lessonId` pointing at a 2–5 min illustrated deep-dive (37 lessons, ~150 min total). Offered as "📖 Explain this properly" on a **wrong** training answer, in the final-test mistakes review, and after a missed Question of the Day; also browsable per topic via "📖 Study the lessons". Built from typed blocks so they can *draw* — flow diagrams, side-by-side comparisons, layer stacks, proportional bars, tables, code — plus four callout flavours: 🌊 "Imagine that…", ⚛️ React bridge, ⚠️ gotcha, 🗝️ takeaway. They live in **code, not the Firestore bank** (long, shared by several questions, and the bank is one document with a 1MB ceiling).
- **Question bank** lives in Firestore `app/quizBank` (seeded from `src/quiz/*Seed.ts` on first run; after that the cloud copy is the source of truth). Types: multiple choice, short write-in, tap-to-match pairs, put-in-order. `weight: 2` = core material, `weight: 1` = fun/nice-to-know.
- **No length tell**: a choice question carries the answer plus ~6 distractors and shows 4 at a time, so every option must read at the same length, grammar and level of detail — the correct one must never be the longest or the most qualified, or it can be guessed without knowing the topic. Both AI scripts (`quiz:regen`, `quiz:review`) are instructed on this, and `pickChoiceOptions` swaps in a longer distractor if a sample would still leave the answer towering over the rest.
- **Training (own profile)**: correct answers never interrupt the flow — Berries fly to the topbar counter (which counts up) with a small "+N 🪙" flash, and the next question appears immediately; only WRONG answers pause on a correction card (right answer + fun fact). Berries: full `points` on the first-ever correct answer, **half** on later correct answers, **at most once per question per day** (anti-farming). Adaptive picker favours unseen/weak questions and ✨ fresh ones (see weekly review, §16).
- **Final test**:
  - *Official (Ben)* — launched from **Diogo's Admin desk**: either on the spot (hand Ben the device), or **remotely on Ben's own device** when Diogo isn't there (see below). Recorded to Ben's data either way.
  - *Official (Diogo)* — self-serve from his own Academy app (admin approves his own tests).
  - *Mock Final Test* (labelled that way to contrast with "Train") — anyone, any unlocked topic, no rewards.
  - Size auto-chosen from real per-question answer times (10–14 questions, ≤ ~13 min budget).
  - Selection targets ~80%: ~60% strong + 40% weak/unseen, interleaved; live mercy rule = after 2 wrong in a row the next question is the strongest remaining ("possible to fail, but don't fail too hard").
  - Score revealed **only at the end**, with a mistakes review. Pass = **80%+** → "CONQUERED" stamp + **1 Devil Fruit 🍇** (once per topic, ever). Fail → retry another day with different questions (previous attempt's questions excluded).
- **Warm-up review round** (every OFFICIAL test, once at least one topic is conquered — mock tests skip it): old material must stay fresh, so a new topic is earned only by proving the old ones didn't fade.
  - **Length** — 10 questions for the first conquered topic, then half again for each extra one (10 + 5 + 2.5 + …), rounded up: 1 topic → 10, 2 → 15, 3 → 18. Split as evenly as the banks allow and interleaved topic by topic.
  - **Mix** — ~75% questions he's strong at + ~25% weak ones: some real bite, but the goal is that he passes. Last round's questions are excluded.
  - **Pass = 70%.** Clear it and the real final test starts right after. **Miss it and the run ends there** — the new topic is never sat, and the single authorisation is spent.
  - A miss shows **no answers** — only a per-topic tally, weakest first (`Canada Geography 4/8 · 50%`), i.e. what to go study. Dad gets the same tally in his banner + push.
  - A **conquered topic stays trainable in the Academy** (it only leaves the wheel), so there's always a way to blow the fog off before the next test.
- **Remote final test (a grown-up beside him, not Dad)** — shared `app/finalTests` doc, live-synced both ways:
  - Diogo authorises ONE run from the Admin desk: he picks a **4-digit code** and writes a **note for the grown-up** ("~15 min, no help, no phone"). Only one open authorisation per topic — a new one replaces it. He can withdraw it while it's unused.
  - Ben's device pops it up immediately: **do it now**, or **later** → a red top banner with **Start** nags until he does. Push notification reaches a closed app.
  - Tapping Start shows the note + a PIN pad: Ben hands the phone over, the grown-up types the code. **The single attempt is burnt the moment the code checks out** — closing the app doesn't buy a second run. Walking out mid-test ends it as *abandoned*.
  - Diogo is told the verdict (**push + a top banner with a dismiss button**) whether Ben passed, failed, or walked out.
  - **A pass automatically opens his next topic**: the ladder's successor where there is one, otherwise the first still-locked topic in his catalog. Plus the usual 🍇 and CONQUERED stamp.
- **Devil Fruits 🍇** = the diamond currency, per profile. Sources: first official topic pass + admin bonus grants. Shown in the topbar next to Berries (the admin sees Ben's count on his own topbar too).
- **Must-do integration**: every unlocked topic is auto-synced into the owner's **daily must-do checklist** ("<emoji> <topic> quiz training", medium effort, ⚡ high priority, `required: true`) — never a wheel segment, since study shouldn't depend on a spin. The checklist row gets a **🏫** button straight into that topic's training. Locking archives the habit. Quiz habits created before this rule are promoted to must-dos on the next sync.

## 15. Store pages & Treasures (prizes)

- Store pages: **🖼️ Wallpapers** (mystery gacha), **🍇 Treasures**, and **🧾 Orders** (every treasure ever ordered + its paid/pending status). Each profile shops from its OWN catalog with its OWN 🍇 (`PRIZES` in `src/logic/quiz.ts`); prize logos live in `public/prizes/` and spin like the Luffy tab icon.
  - **Ben**: Roblox $10 (3 🍇), Dollarama candy (2 🍇), Costco Sushi (6 🍇).
  - **Diogo**: LCBO $10 (3 🍇).
- Limit **1 purchase per 30 days per profile** (store shows a days-left counter). Unpaid purchases **accumulate** — duplicates of the same item are fine, each is its own row; nothing blocks a new purchase except the 30-day window and the 🍇 balance.
- Buying creates an unpaid purchase on the buyer's data. **Diogo sees persistent banners** at the top of the app for every unsettled purchase (Ben's and his own) with a **Paid** button; they're also listed in the Admin desk under "Prizes to settle".

## 15b. Sticker album — "Grand Line Log Book" (the 📖 Log Book app)

A Panini-style collection both crewmates fill and trade from. Rules live in `src/logic/album.ts`.

- **Packs** (`📖 Album → 🎁 Packs`): **70 🪙 for 7 stickers**, unlimited. Plus **one free pack per calendar day** ("Daily Delivery" from the News Coo) — `album.lastFreePackDay` throttles it.
- **Opening ceremony**: tap the sealed pack → cards come out one at a time, face-down, and flip on tap. New cards read **NEW!**, repeats read **SPARE** ("trade bait"), red rares fire confetti + `sfx.bigWin()`. Ends on a summary of the 7 with a new/to-trade tally.
- **Rarity comes from the source folder**, not the data: `assets/Album/` → **common (white border)**, `assets/Album/special stickers/` → **special (red border)**. Reds appear at `SPECIAL_CHANCE` (~6% per slot, so ~1 pack in 3 holds one) and are marked with a ★.
- **Repeats are deliberate and common** — trading is the point. `REPEAT_FLOOR` (40%) of every pack is forced to be a card you already own, from the very first pack. The remaining slots draw at true random from the whole pool, so the last few cards get genuinely hard and trading becomes the fastest way to finish (~40+ packs to complete a 65-card album).
- **Crews**: cards are grouped into 6 One Piece crews (Straw Hats, Emperors, Marines, Warlords, Worst Generation, Revolutionaries) shown as album sections with a `got/total` counter and a ★ COMPLETE marker. Assignment is a **stable hash of the sticker id, dealt round-robin** so crews stay evenly sized and **adding images never reshuffles cards anyone already owns**.
- **Trading** (`🤝 Trade`, shared `app/stickerTrades` doc, live-synced both ways):
  - Only **spares** (copies beyond the one glued in the album) can be offered.
  - **Value must balance: 1 red = 2 whites** (`TRADE_VALUE`); the Send button stays disabled until both sides are worth the same.
  - Flow: propose → the other crewmate gets a **topbar banner + notification** ("wants to trade!") and a badge on the Log Book icon → **🤝 Shake on it!** / **✕ No deal**. Accepting moves the cards in **both** albums (the accepter writes the other profile's doc; both sides are re-checked for the promised spares first, and the swap is cancelled if either no longer holds them). The proposer can withdraw while it's pending; one open offer per person at a time.
  - **Trade radar** always shows *"N cards {mate} can spare that you need"* and *"N of your spares that {mate} needs"* — so the answer to "can we trade?" is visible before asking. When neither holds anything the other needs, the screen says so instead of offering an impossible swap. 🎯 marks a spare the mate is missing; 🤝 marks an album gap the mate can fill.

**Adding stickers later**: drop images into `assets/Album/` (or `assets/Album/special stickers/`) and run **`npm run stickers`** (also runs automatically before `dev`/`build`). It normalizes every image to one card ratio on a transparent canvas, compresses to webp (output in `public/stickers/`, originals untouched — they live outside `public/` so the full-size art never ships), regenerates `src/logic/stickerCatalog.generated.ts`, **and gives every card its Davy Back Fight battle stats** (§15c). Card names come from `scripts/sticker-names.json` — the script prints any sticker still using a guessed name so it can be curated.

## 15c. Card game — "Davy Back Fight" (the ⚔️ Davy Back app)

A Pokémon-TCG-style duel played with the cards from the Log Book. **You can only field cards you actually own**, which makes the album worth completing twice over. Rules live in [src/logic/cardGame.ts](src/logic/cardGame.ts) — pure, JSON-only functions with no React and no Firestore, which is what lets the identical engine drive a solo match in React state and a live one through a shared Firestore doc.

**Every card has stats, generated — never hand-written.** `scripts/stickers.mjs` derives them from the **stable hash of the sticker id**, so new album art is battle-ready the moment it lands and an existing card's numbers never drift:

- **Element** — one of six, in a **weakness ring** where each beats the next: 🔥 Flame → 🐗 Beast → ⚔️ Blade → 👻 Spirit → ⚡ Storm → 🌊 Tide → 🔥. Attacking with the element that beats the defender's does **double damage**.
- **Archetype** — the balance lever. **Guardian** (120–150 HP, small hits, finisher heals 20) · **Bruiser** (105–135, finisher gives the next attack +20) · **Striker** (80–110, hits hardest, no rider) · **Trickster** (90–120, finisher stuns for a turn). The hash only picks *where inside a narrow band* a card lands, so no roll can produce a broken card.
- **Two attacks** — a **quick** move (⚡1) and a **finisher** (⚡2, or ⚡3 for red rares). A finisher is worth ~2.6 quick attacks for twice the energy, so **hoarding a turn genuinely beats swinging every turn** — that trade-off is the decision the game asks a player to make, and it's why matches don't drag.
- **Red rares** get +20 HP and +5/+10 damage, and pay for it with the 3-energy finisher.
- **Named characters get hand-written identities** from `scripts/card-powers.json` (Luffy's Gum-Gum Red Roc, Zoro's Three Sword Style, Katakuri's Mochi Spear…) — element, archetype, both move names and a **voice**. Keys match as substrings of the card's display name, longest first, so `Luffy · Gear 5` takes the Gear 5 entry over the plain Luffy one. Anything unrecognised gets an element-flavoured move name from a pool.

**A match**: each captain fields **4 cards** (first = front line, three on the bench) and opens a **treasure chest** · **+⚡1 at the start of your turn**, capped at 5 · **one action per turn** — attack, send out a bench card (costs the front-liner's retreat), or **Focus** (+⚡1 and heal 10) — **plus one treasure card, free** · **knock out 3 of their cards and you win**. A fallen card is replaced automatically by the next in line. Simulated over 600 AI-vs-AI matches: median **23 turns / 31 taps**, longest 39 turns, none hitting the 60-turn backstop, wins split 50/50.

**Three rules exist purely to stop it being a button-mashing race**, and they're the difference between a TCG and a toy:

- **💎 Treasure cards ([src/logic/treasures.ts](src/logic/treasures.ts)) — the loot box.** Every duel opens with a chest of **3 secret cards** the other captain never sees, and playing one is **FREE — it does not use your action**. That single rule is what makes a turn a decision ("what do I spend, and when?") instead of a tap. There are **30**, built from a shared set of primitives so a new card is a data change and never an engine change: **12 common** (Sea King Feast heals 40, Cola Barrel gives ⚡⚡, Rubber Guard softens the next hit), **10 rare** (Armament Haki doubles your damage this turn, Soul Solid stuns, Sea-Prism Cuffs empties their energy, Mirror Coating turns their next attack back on them), **5 epic** (Gear Fifth, Conqueror's Haki, Time Skip for an extra turn, Sunny Broadside, Doctor's Miracle) and **3 legendary** (**Phoenix Flames revives a fallen crewmate**, Will of the Pirate King triples damage, Buster Call hits their whole crew for 55). Draw odds are 58 / 28 / 11 / **3%**. Rarity drives colour, glow, confetti and sound together, so a Legendary is recognisable before a word of it is read.
- **🎲 The Davy Back Dice — the comeback rule.** When **one more knockout would finish you**, a free roll appears, once a match. It unlocks on the opponent's knockout count, not on cards remaining — with a 4-card deck and 3 knockouts to win, "down to your last card" is a position that never exists, because the match ends on the knockout that gets you there. **No face is bad, and no face can be wasted**: every one carries at least one effect that cannot be a no-op (a boost, a free swap, a shield, a stun, Iron Body, a damage multiplier), because heals, energy and draws all quietly do nothing on the wrong board — full HP, energy at the cap, a full hand — and a once-a-match comeback roll that visibly does nothing is worse than not having one. The die **tumbles through faces before it lands**: a result that simply appears reads as "nothing happened".
- **⛈️ The Grand Line storm.** From **turn 24** every hit does **double damage**, for both sides. It is the hard guarantee that no duel outlasts a kid's patience, and it turns the late game into a shootout where any treasure card can steal it. The arena counts it down from 6 turns out, so it never arrives as a surprise.

**Every play reports what it ACTUALLY did, not what the card claims.** The engine records the real outcome of each treasure and dice roll (`gains` on the log entry — "+40 HP", "+2 ⚡", "drew 2 treasure", "Ben is stunned 💫") and the reveal shows them as chips. Crucially it also reports the *nothing*: a heal at full HP says **"already at full HP"** in grey rather than resolving in silence, because silence is indistinguishable from a bug to whoever just spent the card. A simulation asserts that no free play can ever resolve without a report, and that the dice specifically can never resolve to nothing at all.

**Secrecy is by convention, not by cryptography**: a live duel's whole state lives in one shared document, so the opponent's device physically holds your hand — the UI simply never renders it, and shows only how many cards you're holding. That is the right trade for a two-person family app; a real hidden-information game would need the state split server-side.

- **Live duel vs the other crewmate** (shared `app/cardDuels` doc, live-synced): challenge → the other phone gets a **📞 transponder-snail ring, a topbar banner, a home-screen badge and a notification** → they accept with their own crew and **move first**. Each device writes only the position it is legally allowed to reach (its own move), so last-write-wins is safe by construction: there is no window where both sides hold the move. One duel on the board at a time. **Winner takes 25 🪙**; both devices bank their own W/L off the same board, guarded by `duel.settled` locally and `paidAt` on the shared doc so nothing is counted twice.
- **Training hall (solo)**: three crews dealt from power bands of the whole catalog — 🎯 **Training Dummy** · ⚓ **Marine Squad** · 👑 **Yonko Crew**. A Marine-strength deck beats them ~68% / ~54% / ~38% of the time, so the ladder is real at both ends. Pays **8 🪙 for the first 3 wins each day** — practice, not a Berry printer. The AI takes any knockout on offer, retreats a nearly-dead card, and holds a turn when the finisher is clearly worth waiting for; it deliberately does **not** plan further ahead, read the bench, or play around the weakness ring on defence.
- **The arena** animates off the board's own log, so a blow looks the same whether it was played here or arrived from the other phone: the attacker lunges, the defender flashes and shakes, the damage number leaps off the card (bigger and gold on a **WEAKNESS ×2**), and a knocked-out card spins away — the engine records `koId` precisely so the card that *fell* animates rather than the one that replaced it. - **Sound follows the card, never the app.** Two layers, so no pirate is ever heard shouting someone else's move: the **quick attack plays the card's element** (steel for ⚔️ Blade, a whoosh for 🔥 Flame, a thunderclap for ⚡ Storm, a splash for 🌊 Tide, a roar for 🐗 Beast, a wail for 👻 Spirit) — never a voice, so it can't be misattributed; the **finisher plays that character's own clip** when the card has one (`card.voice`), falling back to its element otherwise. **40 of the 87 cards are voiced by name** across 20 characters (all Luffy forms share Luffy's, Sogeking shares Usopp's, the Raid Suit shares Sanji's); the other 47 speak in their element. Clips are real One Piece audio in `public/duel/voices/`, trimmed to ≤2.4s and encoded to mono 22 kHz AAC (~450 KB for the whole pack, precached for offline).
- **Crew tab**: pick and order your 4, **Auto-pick** builds the strongest legal team, and holding any card reads its full face. A deck that references a card traded away since is repaired automatically, so there is always a legal team.
- **Tapping a card never costs you a move.** One rule, everywhere: a tap on any card — yours, theirs, front line or bench — opens the **crew sheet** focused on that card. Swapping is an explicit *🔄 Send … out* button inside it, so a tap meant as "what does this one do?" can never spend your turn. A 60px thumbnail cannot answer "should I switch?", so the sheet lays out both crews with HP, element, weakness, archetype and both attacks — and prints what each attack would do **against the defender currently facing you** rather than its raw stat, because that is the comparison the decision actually turns on. Their attacks are shown too (card faces are public in a TCG), scored against *your* front-liner. Tapping the artwork opens the full card face. The bench's gold `SWAP ⚡⚡` strip reports the cost; it isn't a button.

## 15d. Chess & Checkers (the ♟️ and 🔴 apps, inside the 🎮 Games folder)

Two **real** board games, played **head-to-head only** — there is no AI opponent and there is not meant to be one. The point is Diogo and Ben playing each other.

**The rules are the official ones, no house edits.** They live in [src/logic/chess.ts](src/logic/chess.ts) and [src/logic/checkers.ts](src/logic/checkers.ts) as pure JSON-only functions with no React and no Firestore — the same contract `cardGame.ts` follows, and the reason one engine can drive both a pass-and-play match in React state and a live one through a shared document.

- **Chess** — full FIDE: castling (including "not out of, through, or into check"), en passant, under-promotion, and every draw the rules name — stalemate, the fifty-move rule, threefold repetition and insufficient material. Moves are recorded in real **SAN** (`Qxf7#`, `O-O`, `exd5`) with disambiguation, *alongside* a plain-English line a nine-year-old can read.
- **Checkers** — **Brazilian Draughts** (Jogo de Damas Brasileiro), FMJD-recognised International Draughts rules on an 8×8 board. **Capturing is compulsory, and only the biggest capture is legal** — if one piece can take 3 and another can only take 1, the 3-capture is the only legal move. **Jumps chain** and the turn doesn't pass until the chain is out. Men move forward only but **capture in any of the four diagonal directions**, including backwards. **Kings fly** — any distance along an empty diagonal, landing anywhere past a captured piece. **Crowning ends the turn** even if more jumps were on offer. A player with no legal move **loses** — being blocked is a real way to lose. Forty moves each with no capture is a draw.
- Both engines are covered by a self-play harness: 300 random games each, asserting every generated move is legal, no King ever vanishes, no side is ever left in check, and no non-finished position is ever moveless.

**One Piece paint, never in place of the game.** The glyph is always the real chess glyph and the name is always the real name — **King, Queen, Rook, Bishop, Knight, Pawn** — because a kid learning this has to be learning *the* game. The character rides alongside as flavour: 👒 Luffy is the King, ⚔️ Zoro the Queen, 🚢 the Thousand Sunny is the Rook, 🧭 Nami the Bishop, 🦌 Chopper the Knight (the piece that jumps), against the **Marines** — 🌋 Akainu, ⭐ Kizaru, ⛴️ a warship, 🕊️ Tsuru, 💨 Smoker. The **Pieces tab** is a straight lesson: each piece's real name, what it's worth, how it moves, and who it is.

**🧑‍🏫 The Helper — the whole reason a kid can play this unaided.** On by default; one chip turns it off.

- **Every square the tapped piece may legally go to is marked** — a dot for a quiet move, a ring for a capture. This part is always on, helper or not: it *is* the interaction.
- **⚠️ on a landing square the other side attacks**, so "if I go there it gets taken" is visible before the move, not after it.
- **A dashed red ring on every one of your pieces currently under attack**, and a **flashing red square on a King in check**.
- **Each piece's letter (K/Q/R/B/N/P) printed on it**, which is the answer to "which one is the Queen again?".
- With nothing selected, **every piece that has somewhere to go glows** — so a kid staring at a board never has "I don't know where to start".
- **Tapping any piece — yours or theirs — says what it is and how it moves, and never costs a turn.** The same rule the card duel follows, for the same reason.

**Sound is synthesized, not sampled** ([src/audio.ts](src/audio.ts) `boardSfx`): you hear four of these a minute, and a clip arriving 80ms late reads as lag. Each is shaped so you can tell what happened without looking — a plain move is a dry wooden knock, a capture cracks, castling knocks twice because two pieces moved, **check is an alarm unlike anything else in the set**, promotion and crowning are rising fanfares. Sounds fire off the **move's own log line**, which is what makes them work for a move that arrived from the other phone: the receiving device never sees the move, only the position that followed it.

**Two ways to play:**

- **Live vs the other crewmate** (shared `app/boardGames` doc, live-synced) — challenge → the other phone gets a topbar banner, a home-screen badge and a notification → they accept and the board is dealt. The **challenger plays the light pieces**, which in chess is also who moves first. One live match **per game** (a chess and a checkers board can both be running). Each device writes only the position it is legally allowed to reach, so last-write-wins is safe by construction. **Winner takes 25 🪙**; both devices bank their own W/L off the same board, guarded by `games.settled` locally and `paidAt` on the shared doc. Unlike the card duel these games can **draw**, so the record has a third column and `winnerId` is genuinely absent rather than always set.
- **Pass & play on one phone** — the board flips to whoever is about to move so nobody plays upside down, with a manual 🔄 Flip. Pays nothing and records nothing; it's for sitting on the couch together.

## 16. Admin (Diogo) — the "Captain's desk" (🛠️ Captain app, Diogo only)

The Me screen is split into sub-tabs — **👤 Me** (streak, goal, freezes) · **🗺️ Voyage** (lifetime stats, map, habit log) · **⚙️ Settings** · **🛠️ Admin** (Diogo only, deliberately last: least-used feature). All management lives in the Admin tab (`src/components/AdminSection.tsx`):

- Manage BOTH academies (Ben's and his own): 🔒 lock/unlock any topic, **+1 🍇** bonus grants, per-topic question manager (view every Q&A, remove — flagged `status: "removed"` in the DB row so AI regen won't recreate it — and restore), Ben's official final-test launcher (on the spot **or** 📡 allowed on his device with a code + note for a nearby grown-up, result reported back here), ⚔️ preview of Ben's training (records nothing).
- **🧊 Free freezes for Ben** (top of the desk): answer his freeze asks or gift unprompted — count + custom message, revives a dead streak for free. See §6.
- Review queue: AI-regenerated questions arrive `status: "pending"` → approve/remove card at the top of the desk.
- Prize settlement: "Prizes to settle" list + topbar banners (see §15).
- **Scripts** (both talk to Firestore via the public web config + anonymous auth):
  - `npm run quiz:regen` (claude CLI, opus) — refills every live topic to its target after removals; new questions land `pending`.
  - `npm run gym:equipment` (claude CLI, **opus**, vision) — turns basement photos into gear + exercises; deletes the photos afterwards (§18k).
  - `npm run gym:demos` (ExerciseDB + claude CLI for ambiguous matches) — animation + still for each exercise (§18l).
  - `npm run quiz:review` (claude CLI, **sonnet**) — weekly refresh of Diogo's fast-moving AI topics: UPDATES outdated questions in place and ADDS up to 5/topic; both get `freshAt` → ✨ **NEW badge** + training priority until seen once. Scheduled via launchd: `~/Library/LaunchAgents/com.wheelsofprocrastination.quiz-review.plist`, Mondays 09:00, log at `~/Library/Logs/wop-quiz-review.log`.

## 17. Question of the Day

One review question, per profile, resurfaced when the app opens — a light daily "keep it fresh" loop layered on top of the Academy (`src/components/QuestionOfTheDay.tsx`, state in `AppData.quiz.daily`, logic in `src/logic/quiz.ts`).

- **What it asks**: drawn ONLY from questions this profile has **already answered correctly at least once** (`stat.everCorrect`) in an unlocked, active topic — never brand-new material. A **passed/conquered topic still counts** (passing a final test doesn't lock the topic, so its questions keep resurfacing). Selection favours the **old + hard**: weight rises with days since last seen (up to ~×5 at ~2 months) and with a weak success rate. Chosen once per local day and frozen (`quiz.daily.qid`).
- **Same UI as the Academy, just one question** — reuses the `QuestionCard` renderer — wrapped in a big animated One-Piece-style "⭐ QUESTION OF THE DAY ⭐" hero (spinning golden rays).
- **Auto-opens** on app open while `state: 'unseen'`. Three choices:
  1. **Do it later** → `state: 'later'`; a gold card link appears on the Spin screen (below Today's quest) that reopens the modal.
  2. **Answer correct** → win the question's full `points` 🪙.
  3. **Answer wrong** → lose `qotdPenalty` = `ceil(points/2)` 🪙 (Berries floor at 0).
- **Ignored all day**: a question still `unseen`/`later` at midnight costs `qotdPenalty` 🪙 at the next rollover/open, shown as a 🕰️ penalty event, then a fresh question is picked.
- Answering also updates the training stat (it's a real review) but pays **no** training Berries — the win/lose Berries are the only economy effect. No Devil Fruits involved.
- Only exists once the profile has answered at least one question correctly; until then there's no Question of the Day.

## 18. Gym — "Training Deck" (the 💪 Gym app)

An AI personal trainer **designed to make itself redundant**. Everything it decides is written down in a form the app can reproduce on its own, so the AI can be switched off later without losing the training.

Code: `src/logic/gym.ts` (the offline brain), `src/logic/gymCoach.ts` (the AI layer), `src/logic/gymStats.ts` (aggregations), `src/logic/wakeLock.ts`, `src/screens/GymScreen.tsx` + `src/components/gym/*`, script `scripts/gym-equipment.mjs`.

### 18a. The two-layer rule (the whole design)

- **Layer 1 — the offline planner** (`planSession`) always works: no network, no key, no credits. It reads the catalog, the profile brief and the per-exercise memory and produces a complete, ordered, time-budgeted session.
- **Layer 2 — the AI coach** (`coachPlan`) is optional. It gets the same inputs, answers in the **same shape**, and is validated against the same catalog. **Every** failure path — AI switched off, no key, no network, timeout, malformed JSON, invented exercise ids, too few usable exercises — falls through to layer 1, and the preview screen says so out loud (`gymFellBack`).
- The model is **never trusted** with an id, a rep count, a rest time or a rep-ladder rung. Unknown ids are dropped; out-of-range numbers are replaced with what layer 1 would have used; ladders own their own progression regardless of what the coach says.
- Coach → "Independence from the AI" shows a readiness % (sessions logged + share of exercises tried). Past ~70% the offline planner is genuinely good, and the AI toggle can go off for good.

### 18b. Data

| Where | What |
|---|---|
| `app/gymCatalog` (shared) | `equipment[]` + `exercises[]` — one basement, both crewmates. Written by the photo script and by the Gear tab. |
| `app/aiConfig` (shared, admin-writes) | OpenRouter `openrouterKey` + `model`. **Never in the repo or the bundle** so it rotates without a rebuild — same arrangement as the Smart Price project. Anyone who can sign into the Firebase project can read it, so it needs a spend cap on the OpenRouter dashboard. |
| `profiles/{id}.gym` (personal) | `brief`, `ex` (per-exercise memory), `ladders`, `sessions` (capped at 220), `active`, `streak`, `totals`, and the `aiOn` / `soundOn` / `keepAwake` switches. |

**`gym.ex[exerciseId]` is the memory that replaces the AI** — small, permanent, and exactly what a good trainer would remember: your rating, times done, last/suggested weight, whether you corrected the last suggestion up or down, the rest you *actually* take, best reps, best weight, your own note. The raw session log is capped; this is not.

**Built-in exercises.** ~20 gear-free moves ship in code (`STARTER_EXERCISES`), so the app is usable before a single photo is processed. A stored catalog entry with the same id overrides the built-in one — that is how editing or retiring a built-in move sticks.

### 18c. The session loop

1. **Set up** — how many minutes (5/10/15/20/25/30/45/60), how you feel (**🥱 lazy · 🙂 normal · 🔥 fired up**, default normal) and **what you want to use** (§18c-2). Mood changes set counts, rep targets and how hard the planner leans.
2. **Preview, before you commit** — the whole session, with who built it (🧠 AI trainer / ⚙️ offline plan), the estimated real length including rest, and the coach's reason per exercise. Per exercise: **🔄 Not this one** (asks for a replacement in the same body area) or **✕** to drop it. Also **🎲 Plan a different one** and **🗑 Cancel**.
3. **Train — three buttons, never more** (§18c-1).
4. **Rate a new exercise** — 🤢 Hate it · 😕 Don't like · 😐 OK · 🙂 Like it · 🤩 Great, asked only the first time you meet one. Editable forever in the Gear tab. **Hate is a hard filter** — it is never prescribed again.
5. **Finish** — 1–5 stars plus optional free text for the trainer, then Berries are paid and everything is folded into memory. Leaving early keeps whatever you logged (and pays for it); a session with nothing logged is thrown away rather than polluting the history.
6. **The report** (§18c-3) — what the session actually cost you against what it was supposed to, one letter grade, and the offer of **➕ more**.

The session in progress lives in `gym.active` and is synced, so a refresh — or a different device — picks the workout back up mid-set.

#### 18c-1. GO → DONE → NEXT

Once you are training there is exactly one button on screen at a time, and the loop never changes:

| Button | What it does |
|---|---|
| **▶️ GO** | Starts the set in front of you and starts the clock. Shown on the first set of an exercise you arrived at by hand (start of session, after a skip, after "Next exercise"). |
| **✓ DONE** | "I've finished this set." Logs it with the **measured** time, and the app drops straight into rest on its own. |
| **▶️ NEXT** | Ends the rest and starts the next set — or the next exercise — immediately. No second GO. |

**A set is timed, not typed.** The wall clock runs from GO/NEXT to DONE and that measurement is the only source for the pace grade. What you type is only ever the *result*:

- **Reps** — a stepper pre-filled with what was prescribed, exactly as before. You touch it only when reality differs, and that difference is the signal.
- **Weight** — the same, for `weight` exercises.
- **Holds and runs** (`timed` / `cardio`) — **nothing to type**. A big count-up clock replaces the stepper, beeps when it passes the target, and **keeps counting**. Asked for a 30 s plank and held it for a minute? DONE at 1:00 logs 60 seconds, and the next session is planned from that.

**Not tapping NEXT is how you ask for more rest.** There is no "+30 s" button any more: the rest timer counts past zero and what gets learned (§18d) is the moment you actually tapped NEXT. Rest longer, and the app plans longer rests; get back to work early, and it packs more in.

While you rest, the card says what NEXT will start — the next set, or the next exercise with its full prescription — so it is never a blind tap. **⏭ Skip this one**, **Next exercise →**, **↩︎ Undo last set** and **🏁 Finish** are all still there; they are just out of the way of the loop.

#### 18c-2. Weights, bodyweight, or both

Asked on the setup screen and again on the report's "do more" card: **🔀 Mixed** (the default), **🏋️ Weights** or **🤸 Body only**. It filters the pool *before* the planner or the coach ever sees it, so it constrains both layers identically.

The split is by **load, not by gear** — `kind === 'weight'` is the weights half, everything else is bodyweight. A pull-up on a bar is bodyweight; it is equipment you hang from, not weight you add. If the filter leaves fewer than three usable exercises — asking for weights-only before a single item of gear has been catalogued — it **falls back to the full pool**, because a real session beats an empty one. The chosen mode is stored on the session and shown on the preview.

#### 18c-3. The report and the grade

Every finished session ends on a scorecard with two honest comparisons and one letter:

| | Measured | Target |
|---|---|---|
| 🏋️ **Working** | wall clock, GO/NEXT → DONE, summed | what the plan asked those sets to take |
| 😮‍💨 **Resting** | wall clock, DONE → NEXT, summed | the rest that was offered |

**Grade** = total time taken ÷ total time asked for. Under 1 means you were quicker than the plan:

| Ratio | Grade |
|---|---|
| < 0.80 | **A+** — way quicker than the plan |
| < 0.95 | **A** — ahead of it |
| ≤ 1.10 | **B** — right around target |
| ≤ 1.30 | **C** — a bit slower |
| ≤ 1.60 | **D** — a lot of it wasn't training |
| above | **F** — more time resting than working |

**The targets are accumulated per set, as you do it** — never from the whole plan. Skip half the session and only the half you did is graded, so a good letter cannot be bought by walking out early. A session with nothing timed gets no grade rather than a fake one.

Then: **➕ Do more exercises** for 5 / 10 / 15 / 20 more minutes, with the gear question asked again. The bonus block is **planned around the session that just ended** — its exercises are excluded outright, the muscles it hit are minutes old so recovery scoring buries them, and the coach is told in as many words that this is an extension of a workout already done, not a fresh one. It carries a **➕ Bonus block** chip on the preview.

### 18d. What it learns, and how

- **Rest** — `restLearned` is a rolling average (60/40) of the rest you actually took, not what was offered; the next offer is that blended 75/25 with the exercise's own default, clamped to 15–240 s. Take longer and the sessions get shorter and more honest; skip rest and it packs more work into the same minutes.
- **Weight** — you loaded **more** than asked → too light → next suggestion goes up a step (5%, min 2.5); **less** → too heavy → down a step; the same → hold. First time on a loaded exercise there is no suggestion; whatever you type becomes the baseline.
- **Preference** — ratings score into the picker (`love` +45, `like` +25, `ok` 0, `dislike` −40, `hate` = excluded).
- **Recovery** — the planner reads the real timestamps of past sessions: chest/back/legs/glutes want ~48 h, shoulders/arms ~40 h, core ~24 h, cardio ~12 h. A part trained recently is heavily penalised, so the app spaces the body out on its own.
- **Variety** — days since last done adds up to +63; every repeat of a body part already in today's session costs −45; a small random jitter means no two sessions are identical.

### 18e. The natural warm-up

Diogo doesn't warm up, so there is **no warm-up block**. Instead the planner forces the first two moves to be light (intensity 1) and scales their prescribed weight to **50% then 75%** of the working suggestion. Order after that: hardest compound work while fresh, core and holds last. Toggle: Coach → "No warm-up block".

### 18f. Rep ladders

The motivating pattern from Diogo's old push-up app, for bodyweight staples (`ladder: true` — push-ups, pull-ups, dips, squats): five sets that creep up a rep at a time — `4 4 4 4 4` → `4 5 4 5 4` → `5 5 4 5 4` → … built from `round(max × 0.4)`. Every **6 cycles** the session prescribes a **🏁 max test** — one all-out set — and the whole ladder is rebuilt from that number. A ladder is seeded automatically from your first honest set of that exercise. The coach gets no vote on ladder reps.

### 18g. Body briefs

Free text the coach reads **verbatim** before every session, plus three hard rules the offline planner enforces too (it can't read prose):

- **Protect my lower back** — `backRisk` exercises are filtered out entirely.
- **No warm-up block** — see §18e.
- **Kid mode** — bodyweight first, nothing heavy; non-`kidSafe` exercises are filtered out.

Seeded per profile on first login (`seedBrief`) and then fully editable — **Diogo**: 43, pickleball is his cardio, core + lower back are the priority, wants a good chest, likes high-rep dynamic sets and rep ladders. **Ben**: 12, kid mode, the goal is enjoying it and building the habit.

### 18h. Berries

Per exercise: `3 + intensity×2 + sets` (nothing logged pays nothing), **+15** for a personal record, **+20** for completing a max test. Closing bonus: `(minutes/5)×2`, **+6** for finishing everything, **+2 per star**. Calibrated against §5 — one exercise is worth about half a low-effort quest, a full 30-minute session lands north of a high-effort one, and a workout can never out-earn a whole day of quests.

### 18i. Sound with the screen off

The rest timer is driven by **wall-clock time**, never a tick counter, so a throttled background tab can't make it drift. The alerts (10 s warning, rest-over tone) do **not** use the app's WebAudio `sfx` — the browser suspends WebAudio the moment the page is hidden, which is exactly when the beep matters. Instead `gymSfx` renders short WAVs to data URIs at runtime and plays them through an `<audio>` element, and `holdAudioSession` keeps a near-silent loop running for the length of the rest so a hidden page is still allowed to make noise. **Still no audio files in the build.** On top of that a **Screen Wake Lock** (`src/logic/wakeLock.ts`, re-acquired on every `visibilitychange`) keeps the screen on for the whole session. Honest limits: screen on → alerts are exact; screen off → they still fire, but a heavily throttled browser may run them a few seconds late.

### 18j. Stats

Tiles (streak · sessions · minutes · Berries), a 28-day activity strip, weekly volume bars, where the work went by body part, a per-exercise progression line, and personal records. A **body-part filter** drives the whole page.

Every chart is deliberately **single-series**: running the dataviz validator over the app's palette, gold↔orange separate by only ΔE 13.4 (below the 15 floor for normal vision) and bronze misses 3:1 contrast on the card surface — it is a brand palette, not a categorical one. So colour never carries identity here; the filter and direct labels do, and every value is also readable as text.

### 18k. Filling the catalog — the three steps

| Step | What | Where |
|---|---|---|
| **1. Equipment** | what you own, described well | app camera **or** `npm run gym:equipment` |
| **2. Exercises** | the library, from the whole inventory | `npm run gym:exercises` |
| **3. Demos** | animation + still per exercise | run automatically at the end of step 2 (`npm run gym:demos` on its own) |

**Why exercises are their own pass.** They depend on the WHOLE inventory at once. A bench alone is worth almost nothing; a bench *plus* dumbbells is incline press, chest-supported row and step-ups. A per-item or per-photo pass structurally cannot see those combinations, so step 1 only ever describes gear — it is explicitly told not to list exercises — and step 2 is given the full list, the room notes (§18k below) and **both athletes' briefs**.

That last input is what makes the no-equipment half of the library personal: step 2 adds bodyweight exercises only where it can say *why they belong to Diogo or to Ben*, reading their actual briefs (core/lower-back priority, kid mode) rather than emitting a generic list. It is also told to prefer standard exercise names, because step 3 has to find each one in a demo library and an invented name never matches.

`npm run gym:exercises` is idempotent — existing exercises are never duplicated or overwritten, so re-run it after adding gear and you get only what's new. It reports what it added grouped by single-item / combination / bodyweight, and skips anything referencing gear you don't own. Flags: `--dry-run`, `--no-demos`, `--model=`, `--effort=`.

#### Cataloguing the basement — `npm run gym:equipment`

There are two ways to get gear into the catalog, and they produce the same thing:

**In the app (phone, one item at a time).** Gear → **➕ Add equipment** → **📷 Take a photo**. The shot is shrunk *in the browser* first (canvas, `src/logic/photo.ts`) so the full-size original never leaves the phone — a 1024px copy goes to the vision model and is thrown away, and only a **96px square thumbnail** is stored (Firebase Storage, `gym/equipment/`). With an OpenRouter key set (the same one the coach uses) the model names the item, writes its notes and proposes the exercises it unlocks, each with a tick box; without a key the camera still works and you just get the picture plus fields you fill in yourself. **Nothing is written until you press Save** and every field stays editable — a vision model reading a dim basement will sometimes be wrong, and being wrong has to cost a tap, not a bad catalog entry. Anything already typed is never overwritten by the model, and the **notes field is sent as a hint** the model is told to trust over the picture. Code: `src/logic/gymVision.ts`.

**From the terminal (whole basement at once).** Photograph everything, drop the photos in `gym-photos/` (gitignored), run the script. It shrinks each photo to 1024px webp in `.gym-work/`, asks the **claude CLI (`--model opus --effort medium`)** to identify every distinct piece of equipment and **describe it thoroughly** — that description is all step 2 ever sees, so it carries the weight ranges, increments and adjustment limits — writes a **96px webp thumbnail** per item into `public/gym/`, and merges into `app/gymCatalog`. It writes no exercises.

The app's camera does still propose exercises for the item in front of it, as a fast path; step 2 dedups by name, so using both is safe.

**Your comments on the photos.** A photo can't tell you a dumbbell adjusts from 5 to 52 lb, so three ways to say so are read, and all of them are merged into what the model sees for that photo:

1. **The photo's own caption** — type it in the Photos app when you take the shot. Read straight from EXIF `ImageDescription`; nothing else to manage.
2. **`gym-photos/notes.txt`** — `dumbbells.jpg: adjustable, 5 to 52 lb in 2.5 lb steps`. The script writes a commented template here on the first run so the option is discoverable. Any line **without** a filename describes the **room** instead.
3. **A sidecar file** next to the photo (`dumbbells.jpg.txt`).

The model is told to trust your comment over what it thinks it sees, fold it into that item's `notes`, and let it constrain the exercise list. Room-level notes are stored on the catalog as `GymCatalog.notes` and read by the **AI trainer before every session** — "ceiling is low, no standing overhead work with a bar" should change what gets prescribed — and are editable any time in **Gear → About the room** without re-running the script. `notes.txt` and sidecars are never deleted.

**Nothing large survives the run.** A photo's whole job is to become a row in the database, so once the catalog is saved the script **deletes the originals in `gym-photos/` and the shrunk working copies**, reporting the space freed. The only image left anywhere — and the only one that ever reaches the host — is the 96px webp thumbnail (~4 KB), which is exactly 2× the 48px the Gear tab draws it at, per CLAUDE.md's image rule. `--keep-photos` opts out of the deletion; `--dry-run` writes nothing and deletes nothing.

Ids are slugs of the name, so **re-running is idempotent** — existing items are updated, never duplicated, and edits made in the Gear tab survive. No catalog entry is ever deleted by the script. Exercises referencing equipment that isn't in the catalog are skipped and reported. `--photos=` / `--model=` / `--effort=` override the defaults. Everything it produces is editable by hand in Gear, which also supports adding gear and exercises from scratch.

### 18l. Exercise demos — `npm run gym:demos`

Every exercise can carry a **still image and a looping animation of the movement**, sourced from [ExerciseDB's free open endpoint](https://oss.exercisedb.dev/api/v1) — 1,500 exercises, **no API key and no account required**. We take only the handful that match exercises we actually own and re-host those ourselves, so the app never depends on their CDN and we never mirror a library we don't use.

**Two files per exercise, and the split is the data budget.** Their GIFs are 180×180 / ~67 KB; we store a **~21 KB animated WebP** (the movement) plus a **~2 KB still** (one frame). A list of ten exercises renders only stills (~20 KB); the animation is fetched when you are actually looking at that one movement. The service worker then caches both **CacheFirst for a year** (`gym-demos` cache, see `vite.config.ts`), so a second view transfers nothing and works with no signal at all. ~120 exercises ≈ 2.7 MB total.

Media lands in **Firebase Storage** under `gym/moves/` (`storage.rules`: signed-in read/write on that path, everything else denied) so new demos appear without redeploying the app. `--to=public` writes to `public/gym/moves/` instead, for when Storage isn't provisioned.

**Matching is the hard part, not the download.** The whole library index is pulled **once** and cached on disk (`scripts/.exercisedb-index.json`, gitignored); every match after that is offline, instant and reproducible.

- **Pagination is `after=<meta.nextCursor>`.** `offset`, `page` and `cursor` are all silently ignored and return page 1 forever — misreading that is what made an earlier version fire ~10 narrowing queries per exercise instead of one crawl.
- **Their own ranking is not usable** (asking for `push-up` returns *"push-up inside leg kick"* first), so every row is scored locally: folded plurals and hyphens, token overlap, body-part and equipment agreement, minus a penalty for every word they add that we didn't ask for.
- **The free tier throttles** (Cloudflare 1015 after ~150 requests, clearing in ~30 s). Requests are spaced, a 429 is waited out rather than swallowed, and the crawl saves as it goes.

**A wrong animation is worse than none** — it teaches bad form. So scoring only *ranks*; it never accepts. Three outcomes:

| Outcome | Meaning |
|---|---|
| **exact** | Same name after folding plurals/hyphens/filler **and** the same equipment. Auto-accepted. |
| **ai** / **close** | Everything else goes to the claude CLI with the top candidates. It answers `same`, `close`, or **null**. A `close` demo gets an **≈ badge** and a caption naming what it actually is — the written instructions stay the authority on form. |
| *(nothing)* | No honest match — the exercise keeps its emoji. A normal state, see the coverage note below. |

Two bugs this design exists to prevent, both of which shipped in earlier drafts and were caught by running it:

- A numeric accept-threshold matched **"Wall sit" → *"march sit (wall)"*** and **"Pike push-ups" → *"side push-up"***. The scored auto-accept is gone.
- Treating `weighted` as a filler word matched **"Pull-ups" → *"weighted pull-up"*** and **"Bodyweight squats" → *"weighted squat"*** — loaded movements prescribed as bodyweight ones. `weighted` is now significant, and the exact-name shortcut also requires equipment agreement.

**Coverage is partial, and that is a data limit rather than a matching bug.** Verified against the downloaded index: the free 1,500-row tier contains **no** plain `plank`, `squat`, `glute bridge`, `wall sit`, `bird dog`, `jumping jack`, `arm circle` or `hollow hold`. On the 20 built-in bodyweight moves it matches **12** (4 of them flagged approximate). Gear exercises do much better — standard names like "dumbbell bench press" and "dumbbell lateral raise" hit exactly.

#### If coverage isn't good enough — the options, and what they actually buy

Not decided; recorded so the research isn't repeated. **Do nothing until the real basement catalog exists** — gear exercises match well already, so the gap may not be worth acting on.

| Option | Exercises | Media | Cost / friction |
|---|---|---|---|
| **Free tier** (current) | 1,500 | 180p GIF | none — no key, no account |
| **ExerciseDB v1 paid** | ~2,000 | GIF to 1080p, extra metadata | RapidAPI subscription |
| **ExerciseDB v2 paid** | 11,000+ | images + **MP4, no GIFs** | separate subscription; free tier is watermarked |
| **free-exercise-db** | 873 | 2 static JPGs (start/end) | none — public domain, no key, no rate limit |

- **The v1 key is already supported in code**: set `EXERCISEDB_KEY` (or `--key=`) and the script switches host, adds the `X-RapidAPI-Key`/`X-RapidAPI-Host` headers, drops the request spacing and caches to a separate index file — same pagination, same response shape, nothing else to change. **But it is only ~500 more exercises**, so it is unlikely to contain the missing basics. (An earlier draft of this document claimed that key was the 11,000-exercise tier. It is not — that is v2, a different subscription.)
- **v2 is the only tier with the full library**, but it serves MP4 rather than GIF, so adopting it means changing the media pipeline (§18l's animated-WebP conversion assumes a GIF input) and its free tier watermarks the assets.
- **[yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) is the cheapest way to close the specific gaps.** Public domain, one static JSON file, no key and no rate limit. Checked against our actual misses: it **has** `plank`, `arm circles`, `superman` and `glute bridge` — four of the eight — and still lacks `wall sit`, `bird dog`, `jumping jack` and `hollow hold`. It ships two photos per exercise (start and end position) instead of an animation; alternating those two frames reads as a movement demo. It would slot in as a **secondary source consulted only for exercises the primary can't cover**, reusing the same scoring, the same `ExerciseDemo` record and the same `close`/null honesty rules.

The floor under all of this: an exercise with no honest demo keeps its emoji, which is a supported state, not a defect.

The 20 built-in bodyweight moves are covered too: they live in **`src/logic/gymStarters.json`**, imported by both `src/logic/gym.ts` and the script, so there is one list and no drift. A built-in that finds a demo is written back to the catalog as an override row — the same mechanism the Gear tab uses to edit one.

Re-runnable and idempotent: exercises that already have a demo are skipped unless `--refresh`. Flags: `--dry-run`, `--refresh`, `--reindex`, `--only=<id>`, `--pin=<ourId>:<theirId>` (force a specific ExerciseDB id), `--to=storage|public`, `--no-ai`, `--key=`. In the app, **Gear → an exercise** plays its demo, names the ExerciseDB entry it came from, and offers a one-tap **"Wrong movement — remove it"**. Attribution is shown wherever demos appear.

> Keep this document in sync with any rule change — it is the canonical spec for the app's game rules.
