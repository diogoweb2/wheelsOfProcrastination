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
- **The roster** ([src/apps/registry.ts](src/apps/registry.ts)) is the single source of truth — one entry per app (name, artwork, tile colours, bottom-menu tabs, `adminOnly`, `gate`, `hidden`, `inheritSlotFrom`), plus one branch in `AppBodyRouter` ([src/App.tsx](src/App.tsx)). Adding an app touches nothing else.

**App names are deliberately plain.** The One Piece flavour lives in the artwork, the copy and the game content — never in the icon label. "Log Book", "Davy Back", "Captain" and "Log Pose" were unreadable as navigation: you cannot find the sticker album from a tile called Log Book. Each tile now says what the app *is*; the flavour name (Grand Line Academy, Nami's Black Market, Davy Back Fight) survives as a subtitle inside.

| App | Bottom menu |
|---|---|
| 📋 **Tasks** *(the wheel + the daily loop)* | Spin · Quests · Streak · Map · Record |
| 🎓 **Quiz** | Topics · Study · Progress |
| 🏦 **Bank** | *Ben:* Chests · Grow · Tools · Log — *Diogo:* Vault · Shock · Rules · Ledger |
| 🛒 **Shop** | Wallpapers · Treasures · Orders |
| 🎴 **One Piece Album** | Binder · Packs · Trade |
| 🖼️ **Stickers** *(hidden — still at `/album/*`)* | Album · Packs · Trade |
| 🃏 **Card Game** *(in 🎮 Games)* | Play · Deck · How to |
| ♟️ **Chess** *(in 🎮 Games)* | Play · Pieces · How to |
| 🔴 **Checkers** *(in 🎮 Games)* | Play · Pieces · How to |
| 🚢 **Sea Battle** *(in 🎮 Games)* | Play · Fleet · How to |
| 💪 **Gym** | Train · Stats · Gear · Coach |
| ✍️ **Essays** | *Ben:* Write · Ideas · Words · Marked — *Diogo:* Desk · Red pen · Topics · Words · Marked |
| 💡 **Ideas** | Open · Done · New |
| 🕐 **Clocks** | Clocks *(single page)* |
| ⚙️ **Settings** | Profile · Alerts · Sound · About |
| 👨‍👦 **Parent** (Diogo only) | Freezes · Limits · Quizzes · Prizes · Audit |

- **The Wheel app owns the whole daily loop.** Its **Streak** page (streak hero, goal, freeze shop, ask-Dad), **Map** page (§7) and **Record** page (trophy shelf §8 + training log + lifetime stats and the last-8-weeks bar chart) used to be a separate "Voyage" app; they belong beside the wheel that feeds them.
- **Folders.** An app may declare a `folder`, and every app naming the same one collapses into a single Dashboard tile that opens onto them — exactly what a phone does. **🎮 Games** holds ⚔️ Davy Back, ♟️ Chess, 🔴 Checkers and 🚢 Sea Battle; four games in a row of icons is four games' worth of noise. The folder tile carries a strip of the icons inside it and **one red badge summing everything waiting in there**, so nothing gets buried by being grouped. Dragging still works: the saved order (`settings.homeOrder`) holds tile ids, and a folder that has never been dragged inherits the earliest slot any app inside it held — which is why the Games folder appears where the Davy Back icon used to be rather than at the end.
- **Situational apps.** An app may declare a `gate` and then only appears on the home screen while that gate is open. **Clocks** (crew time zones) is gated on `converter` — it shows up only while **trip mode / the Brazil money converter** is switched on for Ben's bank (§8b), and disappears again when the trip is over.

App tile artwork is generated from art already in `public/` (see CLAUDE.md's image rules) into 128px webp files named `public/app-*.webp`. Apps without artwork fall back to their emoji on a coloured squircle.

## 1c. URLs — **every page has its own, always**

**Rule for all new features: a page you can open must be a page you can bookmark.** One sub-app must never share a URL with another. If a feature adds a screen, that screen gets a route — no exceptions, no "it's only a modal-ish thing".

- **The shape is `/<app>/<tab>`** — `/gym/train`, `/bank/chests`, `/essay/write`, `/chess/play`. The two segments are exactly the app id and tab id from the roster ([src/apps/registry.ts](src/apps/registry.ts)), so **adding an app or a tab adds its route for free** — there is nothing to register.
- **`/home`** is the Dashboard. **`/`** lands on the wheel (`/wheel/spin`) and rewrites itself there; it stays the PWA `start_url`.
- **Reload, bookmark, share** all land on the same page. Firebase Hosting rewrites `**` → `/index.html` (`firebase.json`), so a hard reload on a deep link serves the app instead of a 404.
- **Back button works.** Moving to a different app/tab pushes a history entry, so the phone's back gesture walks back through the apps you opened rather than leaving the app. A route that was merely cleaned up (unknown tab, `/`) *replaces* the entry instead, keeping junk out of the history.
- **The URL is not a way past a gate.** A path is only honoured once we're past the PIN, and it is re-checked against who is logged in: `/admin/...` in Ben's hands falls back to the landing page, as does any unknown app. `gate`d apps (Clocks) *are* reachable by URL — a gate hides an icon, it isn't a lock.
- Implementation: [src/lib/route.ts](src/lib/route.ts) (`pathToRoute` / `routeToPath`) plus the three sync effects in [src/App.tsx](src/App.tsx). No router library — the whole navigation state is `{app, tab}`, so the History API is enough.

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
- **A carried must-do needs a decision — ignoring it is not one.** Every scheduled must-do row (late or due today) carries a **⋯** button opening a decision sheet with exactly three ways out. Study quests are exempt (their 🏫 shortcut ticks them) and so are daily habits, which have nothing to carry.
  - **✓ Done it** — a normal completion, pays the flat must-do reward.
  - **⏳ Delay** — pick 1 / 3 / 7 / 14 days (`delayedUntil` = today + N). The quest leaves the checklist and the late list until that day, and rollover **doesn't fine it while it waits**. When it comes back it is exactly as late as it was — a delay buys time, it doesn't erase the debt. Meanwhile it shows up in the "＋ Do one of the other N today" picker as "⏳ delayed Nd", so it can always be pulled back early. Ticking it off clears the delay.
  - **✕ Won't do it** — writes off every occurrence up to today (`waivedThrough` = today), so the red carry stops and today itself isn't fined. **A repeating quest still comes back on its next scheduled day** — the waiver settles the past, not the future. A one-shot is archived for good. Berries already docked for the days it was missed are not refunded.
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
  - Sending needs a service-account key, which a browser can't hold, so the fan-out lives in **Cloud Functions** (`functions/index.js`): `onFreezeDeskWrite` watches `app/freezeRequests`, `onStickerTradeWrite` watches `app/stickerTrades`, `onFinalTestWrite` watches `app/finalTests` and `onEssaysWrite` watches `app/essays` (§19i). Each diffs before/after **by id**, so unrelated writes to the doc (e.g. marking a gift seen, or an essay draft autosaving) never re-send an old notification. Tokens FCM rejects as dead are pruned from the profile.
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
  - **Ben** (born Feb 2014 — Ontario grade-6 level): Canada Geography, Science, Critical Thinking (scams/fake news), Logic, Canada History — all live, 50 seed questions each. Written but held back behind `comingSoon` until Dad opens them: Canada Geography II (physical geography — mountains, rivers, regions), Ontario Geography (Great Lakes, the Shield, cities outside Toronto), Toronto Geography (the city he lives in). The three geography banks are deliberately non-overlapping: book I owns provinces/capitals/flags, book II owns the physical map, Ontario stays out of Toronto, and Toronto owns the city.
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

- Store pages: **🖼️ Wallpapers** (mystery gacha), **🍇 Treasures**, and **🧾 Orders** (every treasure ever ordered + its paid/pending status). Each profile shops from its OWN shelf with its OWN 🍇; prize logos live in `public/prizes/` and spin like the Luffy tab icon, and a prize **without** a logo spins its emoji instead.
- **The shelves are data, not code** — one shared doc `app/prizeCatalog`, live-synced, seeded once from `DEFAULT_PRIZES` in `src/logic/quiz.ts` and after that the cloud copy is the source of truth. Diogo **adds, edits and deletes** treasures from the Admin desk → **Prizes** (emoji, label, 🍇 price, limit), per profile. Deleting only takes it off the shelf: every order already placed carries its own label and cost, so the Orders log and the "to settle" list never lose a row.
  - Seed — **Ben**: Roblox $10 (3 🍇), Dollarama candy (2 🍇), Costco Sushi (6 🍇). **Diogo**: LCBO $10 (3 🍇). All seeded at 1 per 30 days.
- **The limit is per treasure**, counted over a rolling 30 days (`perMonth`, `prizeAllowance`), so candy can be a steady habit while sushi stays an event. **`perMonth: 0` = no limit** — the 🍇 balance is the only thing in the way. Each store card shows its own state ("2 of 3 left this month" / "Sold out — back in 9 days"); a treasure being sold out never blocks the others. Lowering a limit never claws back something already ordered. Unpaid purchases **accumulate** — duplicates of the same item are fine, each is its own row.
- Buying creates an unpaid purchase on the buyer's data. **Diogo sees persistent banners** at the top of the app for every unsettled purchase (Ben's and his own) with a **Paid** button; they're also listed in the Admin desk under "Prizes to settle".

## 15b. Sticker album — "Grand Line Log Book" (the 📖 Log Book app)

A Panini-style collection both crewmates fill and trade from. Rules live in `src/logic/album.ts`.

- **Packs** (`📖 Album → 🎁 Packs`): **70 🪙 for 7 stickers**, unlimited. Plus **one free pack per calendar day** ("Daily Delivery" from the News Coo) — `album.lastFreePackDay` throttles it — and any **Traded Pack** won in a swap, which sits sealed on the same shelf until it's opened.
- **Opening ceremony**: tap the sealed pack → cards come out one at a time, face-down, and flip on tap. New cards read **NEW!**, repeats read **SPARE** ("trade bait"), red rares fire confetti + `sfx.bigWin()`. Ends on a summary of the 7 with a new/to-trade tally.
- **Rarity comes from the source folder**, not the data: `assets/Album/` → **common (white border)**, `assets/Album/special stickers/` → **special (red border)**. Reds appear at `SPECIAL_CHANCE` (~6% per slot, so ~1 pack in 3 holds one) and are marked with a ★.
- **Repeats are deliberate and common** — trading is the point. `REPEAT_FLOOR` (40%) of every pack is forced to be a card you already own, from the very first pack. The remaining slots draw at true random from the whole pool, so the last few cards get genuinely hard and trading becomes the fastest way to finish (~40+ packs to complete a 65-card album).
- **Crews**: cards are grouped into 6 One Piece crews (Straw Hats, Emperors, Marines, Warlords, Worst Generation, Revolutionaries) shown as album sections with a `got/total` counter and a ★ COMPLETE marker. Assignment is a **stable hash of the sticker id, dealt round-robin** so crews stay evenly sized and **adding images never reshuffles cards anyone already owns**.
- **Trading** (`🤝 Trade`, shared `app/stickerTrades` doc, live-synced both ways):
  - Only **spares** (copies beyond the one glued in the album) can be offered.
  - **Card for card, value must balance: 1 red = 2 whites** (`TRADE_VALUE`); the Send button stays disabled until both sides are worth the same.
  - Flow: propose → the other crewmate gets a **topbar banner + notification** ("wants to trade!") and a badge on the Log Book icon → **🤝 Shake on it!** / **✕ No deal**. Accepting moves the cards in **both** albums (the accepter writes the other profile's doc; both sides are re-checked for the promised spares first, and the swap is cancelled if either no longer holds them). The proposer can withdraw while it's pending; one open offer per person at a time.
  - **Trade radar** always shows *"N cards {mate} can spare that you need"* and *"N of your spares that {mate} needs"* — so the answer to "can we trade?" is visible before asking. When neither holds anything the other needs, the screen says so instead of offering an impossible swap. 🎯 marks a spare the mate is missing; 🤝 marks an album gap the mate can fill.
  - **Nothing to trade? Pay for it.** The radar's dead end — *they* hold a card you need, *you* hold nothing they need — is the common case late in an album, and it used to end the conversation. On top of (or instead of) cards, an offer can carry **Berries** and **today's unopened free pack** (`giveGems` / `givePack`). The pack lands as a **sealed pack credit** (`album.packCredits`) on the Packs tab, so the receiver still gets the opening ceremony, and the giver's `lastFreePackDay` is spent — one free pack a day, whoever ends up opening it.
  - **Berries have no fixed price, on purpose.** The moment coins or a pack are on the table the fair-value gate is **off** — any amount can be offered. The ⚖️ scale only *hints* (`GEMS_PER_POINT` = 25 a point, a pack ≈ its 70 🪙 shelf price) and reads "😍 generous / 👍 about right / 🤏 a bit light". Enforcing a price would delete the negotiation, and the negotiation is the point.
  - **The haggle loop.** Whoever the offer is sitting with can **✕ No deal**, **🤝 Shake on it!**, or **💰 Ask more** — a Berry stepper that rewrites the amount, hands the decision straight back (`turn` flips, `round` +1) and leaves the cards on both sides untouched, so the offer card stays readable however long the loop runs. It bounces until somebody accepts or **refuses without a counter** — that refusal is the only thing that ends it. Every round is printed on the card as a chain (`40 → 65 → 50`) so neither side has to remember the last number, and each bounce fires a fresh push (`onStickerTradeWrite` keys on **id + round**, and pings whoever's court it's in — the proposer included).
  - A counter can never ask for **more Berries than the payer actually holds**, and Accept is disabled if the payer's purse has since dropped below the agreed amount — an impossible number would stall the loop forever. Settlement re-checks cards, Berries *and* the free pack before anything moves.

**Adding stickers later**: drop images into `assets/Album/` (or `assets/Album/special stickers/`) and run **`npm run stickers`** (also runs automatically before `dev`/`build`). It normalizes every image to one card ratio on a transparent canvas, compresses to webp (output in `public/stickers/`, originals untouched — they live outside `public/` so the full-size art never ships), regenerates `src/logic/stickerCatalog.generated.ts`, **and gives every card its Davy Back Fight battle stats** (§15c). Card names come from `scripts/sticker-names.json` — the script prints any sticker still using a guessed name so it can be curated.

## 15b-2. One Piece Album (the 🎴 One Piece Album app) — the second collection

**The same collecting game as §15b, over every card printed for the ONE PIECE Card Game** — 2 665 of them against the album's few dozen. Its own app, its own URL (`/binder/binder`, `/binder/packs`, `/binder/trade`), its own progress and its own swap table, so neither collection can disturb the other.

**The rules are not written twice.** Packs, the forced duplicates, the daily free pack, the sealed traded pack, the 1-rare-is-worth-2-commons swap, the haggle and the pack ceremony all live in [src/logic/collections.ts](src/logic/collections.ts) as a `CollectionKit` — a pile of cards plus its numbers. The sticker album is one kit ([src/logic/album.ts](src/logic/album.ts)), the binder is another ([src/logic/cardBinder.ts](src/logic/cardBinder.ts)), and the store's pack/trade actions, `<Sticker>`, `<StickerDetail>`, `<PackOpening>` and `<TradeOffer>` all take whichever kit they are handed. **A third collection would be one kit and one screen.**

- **Nothing is stored on our server.** Card pictures are the same hotlinked public mirrors the card game uses (§15g), primary plus fallback, falling back to the card's name if both fail.
- **Rarity is the printed rarity.** The rare shelf is **SR, SEC, SP CARD, TR and every Leader** — 473 cards. A slot rolls off it at **4%**, lower than the album's 6%, because the rare tiers are ~18% of this catalog and the album's are a handful: the same odds would make rares routine.
- **Packs cost the same 70 🪙 for 7 cards**, and the daily free pack works exactly as it does in the album. Completion is deliberately a long voyage — ~31% of the binder after 200 packs — which is what makes trading with the other crewmate the only sane way to finish.
- **Two ways to look at it**: **📚 By set** — one shelf at a time (`Romance Dawn — 41/220`, with a *missing only* filter) — and **🎴 My collection**, every card owned across every set on one page. Both stay cheap to render: the shelf draws one set, the collection draws only what is owned. The whole catalog on one page is thousands of hotlinked images, which no phone renders twice.
- **Cards are shown at reading size wherever they are meant to be read.** The pack reveal, the end-of-pack stack and the tap-to-zoom card all run at `min(300–340px, ~80vw)` rather than a thumbnail, and — because the mirrored scans have an **empty text box** — the binder prints the card's own cost/power/Counter and effect underneath.
- **The pack ends on a browsable stack, not a contact sheet.** After the seven flips, the haul is walked one full-size card at a time with **← Prev / Next →** and a dot pager, so a card pulled in a hurry can still be read. The new/to-trade tally and *Into the album →* sit under it.
- **Browsing is one SET at a time** (a `Romance Dawn — 41/220` picker, plus a *missing only* filter). **Set names are harvested, not typed**: `npm run optcg:scrape` reads them off the publisher's own series picker into `scripts/data/optcg-sets.json`, so all 59 shelves — starter decks and promos included — carry their printed title rather than a bare code. This is the one thing the binder does differently from the album, and it is forced by scale: the whole catalog on one page is thousands of hotlinked images, which no phone renders twice.
- **Swaps live in their own shared doc** (`app/cardTrades`), with the identical propose → haggle → shake-on-it loop, because a swap list mixing stickers and cards would be unreadable.
- **The catalog stays out of the main bundle.** The binder screen is lazily routed, and the store — which every screen loads — judges a swap's fairness from a tiny generated rare list (`cardBinderIndex.generated.ts`) instead of the ~1 MB catalog.

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
- **Training hall (solo)**: three crews dealt from power bands of the whole catalog — 🎯 **Training Dummy** · ⚓ **Marine Squad** · 👑 **Yonko Crew**. A Marine-strength deck beats them ~68% / ~54% / ~38% of the time, so the ladder is real at both ends. Pays **8 🪙 for the first 3 wins each day** — practice, not a Berry printer. **The hall opens a limited number of times a day: 2 by default, per crewmate, set by the captain in the Parent app (⏳ Limits, §16).** A match is counted the moment it **starts** — win, lose or quit — so backing out of a losing board is not a free retry, and the counter resets at local midnight (`duel.soloPlays` + `duel.soloDay`, cap in `settings.soloDuelLimit`). Set to 0 the hall is shut. **Live duels between the two crewmates are never capped** — those are the social ones, and they already cost the other person's time. The AI takes any knockout on offer, retreats a nearly-dead card, and holds a turn when the finisher is clearly worth waiting for; it deliberately does **not** plan further ahead, read the bench, or play around the weakness ring on defence.
- **The arena** animates off the board's own log, so a blow looks the same whether it was played here or arrived from the other phone: the attacker lunges, the defender flashes and shakes, the damage number leaps off the card (bigger and gold on a **WEAKNESS ×2**), and a knocked-out card spins away — the engine records `koId` precisely so the card that *fell* animates rather than the one that replaced it. - **Sound follows the card, never the app.** Two layers, so no pirate is ever heard shouting someone else's move: the **quick attack plays the card's element** (steel for ⚔️ Blade, a whoosh for 🔥 Flame, a thunderclap for ⚡ Storm, a splash for 🌊 Tide, a roar for 🐗 Beast, a wail for 👻 Spirit) — never a voice, so it can't be misattributed; the **finisher plays that character's own clip** when the card has one (`card.voice`), falling back to its element otherwise. **40 of the 87 cards are voiced by name** across 20 characters (all Luffy forms share Luffy's, Sogeking shares Usopp's, the Raid Suit shares Sanji's); the other 47 speak in their element. Clips are real One Piece audio in `public/duel/voices/`, trimmed to ≤2.4s and encoded to mono 22 kHz AAC (~450 KB for the whole pack, precached for offline).
- **⏱️ The move clock** (see §15e). **20 seconds a turn by default.** Treasures and the dice are free plays, so each one **buys a fresh clock** — spending one never costs you the turn you were thinking about. The clock is held while a blow is animating and while the chest ceremony is open, because the board doesn't take input then either. Time out and a **random turn-ending move** is played: an attack, a swap or Focus — never a treasure or the dice, which would hand the turn straight back to a clock that has already run out.
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

**⏱️ The move clock** (see §15e). **10 seconds a move by default.** Neither game lets you pass, so running out has to resolve to something: the board plays a **random legal move** for you, buzzes, and says so out loud — *"⏰ Out of time — the clock played a random move."* Deliberately not a clever move: anything that avoided hanging a piece or took the free capture would quietly play better than the kid does, and turn the clock into a reward. A checkers chain and a compulsory maximum capture are respected, because the random pick comes from the engine's own legal-move list. The clock is **held while the promotion picker is open** — the move is already chosen, and rolling a random one instead would throw away a decision that was made in time.

### 15e. The move clock (all four games)

One clock, one rule, shared by Chess, Checkers, Sea Battle and the card game ([src/components/MoveTimer.tsx](src/components/MoveTimer.tsx)): **how long one player gets to make one move.**

- **The captain sets it**, in the Parent app (⏳ Limits, §16): one dial for the board games and Sea Battle (default **10s**), one for the card game (default **20s**) — a card turn is a real read (energy, two attacks, the bench, a hand of treasure), a board move mostly isn't. **0 turns the clock off.**
- **Set for both crewmates at once**, not per person: a clock only means anything if both sides of the same board are playing to it.
- **A live match is stamped with the clock it was dealt** (`moveSeconds` on the shared doc, from the challenger's settings). Moving the dial never changes a game already in progress, and the two phones can never disagree about the time even mid-duel.
- **The clock belongs to whoever is holding the phone**: it only runs on your turn, on your device — which is also the only device allowed to write that move. No server keeps time, and nothing has to be reconciled. A clock that expired while the app was closed expires the moment the app is looked at again, which is what a clock means.
- **It is loud before it is fatal**: the bar drains green → gold at halfway → red, and the last five seconds tick audibly with the number pulsing.

## 15f. Sea Battle (the 🚢 app, inside the 🎮 Games folder)

**Official Battleship** — the Milton Bradley box, not a playground variant — fought as a cannon duel on the Grand Line. Rules live in [src/logic/seaBattle.ts](src/logic/seaBattle.ts) as pure JSON-only functions with no React and no Firestore, the same contract the other games follow, which is why one engine drives a match against the AI held in React state and a live one through a shared document.

- **10 × 10 sea, five ships: 5, 4, 3, 3 and 2 squares.** They lie across or down, never diagonally, never off the edge, never overlapping. **Touching is allowed** — that is the real game.
- **One shot per turn, and the turn passes whether you hit or miss.** "Hit and go again" is the playground rule; it turns the game into a runaway and it is not in the box.
- **You are told hit or miss and nothing more** — until a ship's last square goes, and then you are told *which ship* sank, by name. Sink all five to win.
- **Two taps to fire**: the first takes aim 🎯, the second shoots. On a 10 × 10 grid at phone size, a one-tap shot is a wasted turn waiting to happen.
- Covered by a self-play harness: 2 000 scattered fleets (fleet, art and three non-overlapping buried cards) asserted legal (straight, in bounds, non-overlapping, 17 squares), 800 full AI-vs-AI games asserting every shot is legal and no game ends with a ship still afloat, plus the refusals — the same square twice, a square off the board, any shot after the end — and the rule that a hit passes the turn.

**One Piece paint, never in place of the game.** The sizes are the box's sizes; only the nameplates change. 🐋 **Moby Dick** (5, Whitebeard's flagship) · ☀️ **Thousand Sunny** (4) · ⛵ **Red Force** (3, Shanks') · 🐑 **Going Merry** (3) · 🍳 **Baratie** (2, the sea restaurant). Both captains sail the identical fleet, so nobody starts ahead, and the **Fleet tab** is a straight lesson: each ship's real length and who it is.

**Setup runs in two acts: hide the fleet, then bury three cards.** Act one opens with a **legal fleet already scattered**, so there is no empty grid to stare at and Ready is never a trap. Moving a ship is **two taps, both of them on the board**, with no mode to set first:

1. **Tap the ship** — anywhere along it, or its chip in the strip. **↔️ Across / ↕️ Down pop up right beside it**, with the way it is currently lying already marked, and the ship itself outlined so "this one" is said on the board rather than in a label.
2. **Tap one of them.** The popover closes and **every square that ship could legally start on lights up** — the board answers "where does this fit?" rather than making a nine-year-old find out by failing. The next tap drops it there.

The orientation toggle used to be a pair of chips parked in the toolbar. That reads as a *setting* rather than as a *step*, so you turn it and nothing happens; anchoring it to the ship makes the turn part of moving the ship. Tapping open water puts the popover away, ✕ Never mind drops the ship back where it was, and 🎲 re-hides the whole fleet.

**Your ships are cards you actually own.** A ship square is not a brown block — it is a **transparent sticker out of the Grand Line album** (§14), so a 4-square ship is four different pirates lined up in the hull. The art is drawn from **the cards this profile owns** (`ownedIds`), falling back to the whole catalog for a brand-new album so nobody ever gets an unpainted fleet. Faces are dealt **per ship, not per square** (`dealFleetArt` → `paintFleet`), so dragging a ship around setup carries its crew with it instead of reshuffling under your thumb. It is **decoration and only decoration**: every rule in the engine reads `ships`, never `cards`, and a match saved before the art existed still plays.

### The three buried cards — the one house rule

Once the fleet is hidden, each captain is **dealt three special cards** (`logic/seaCards.ts`, fifteen of them, one effect each) and **buries each one on a square of their own sea**. You do not choose the hand, which is what makes burying a real decision rather than an optimisation. Nothing happens until **the enemy fires at that exact square**; then it springs, **both captains are shown the card** until they dismiss it, and the board changes.

- **💀 cards hurt the captain who buried them** — 🕰️ Ope Ope Room (lose your next turn) · 💣 Buster Call (a square of a random ship of yours is blown apart) · 👁️ Observation Haki *(rare)* (they see one of your squares for 2s) · 🔥 Marine Raid (one of your other buried cards is destroyed) · 🩺 Rumble Ball *(rare)* (they raise one of their own sunk ships) · 🌀 Coup de Burst (one of their untouched ships leaps elsewhere) · 🔫 Gum-Gum Gatling *(rare)* (they fire two more shots now) · 🧭 Log Pose (they are told which row hides most of your fleet).
- **🛡️ cards backfire on the captain who found them** — 💥 Nose Fancy Cannon (they lose their next turn) · 🌫️ Smoke Screen (their next shot lands wherever it likes) · 🍖 Doctor's Orders *(rare)* (you raise one of your own sunk ships) · 💰 Nami's Thievery (one of THEIR buried cards is destroyed) · 🐑 Merry's Escape (one of your untouched ships slips away) · ⚔️ Conqueror's Haki *(rare)* (you see one of their squares for 2s) · 🍱 Sanji's Bento (nothing happens).
- **At most one rare per hand**, so nobody opens with three board-flipping cards.
- A card may sit **on a ship square or on open water**, and **two cards never share a square** — one shot would spring both and the banner can only show one.
- **The card resolves after the shot**, so a Buster Call can finish the ship the shot just wounded. The win check runs **after everything is settled**, because a card can sink the last ship *and* a card can raise one back up.
- **"You lose a turn" and "I shoot again" are the same sentence read from opposite ends of the table**, so one counter (`owed`) does both directions and the turn rule stays a single `if`.
- A relocated ship must land clear of **every** shot, not just of other ships — otherwise it would hide under a square already crossed off and simply vanish.
- **A hand is DEALT, one card at a time.** Entering the burying screen opens the three cards **one after another**, each sitting there until it is read (`1 / 3`, `Next card →`). You cannot bury a card sensibly before you know what it does, and three cards appearing at once in a tray is not something a nine-year-old reads — it is something they skip.
- **The card face leads with the effect and nothing else.** The effect line is the biggest type on the card because it is the only line that changes what you do next; the name, the 💀/🛡️ and the One Piece flavour are colour around it. The small cards in the tray carry the same short line and no more.
- **A card on screen stops the clock on both phones.** Each side is reading the same banner, and neither should lose a turn to it (§15e). The Marines hold fire for the same reason.
- **A sprung card is OPENED, not shown.** The sealed foil rattles and catches the light for ~1 second before it tears — that beat is where *"what is it?"* lives, and taking it out would make the card a dialog box. Then the card bursts out at 1.12× and settles. A **rare** is a bigger event on purpose: the room flashes white, spinning golden rays come up behind the card, a ★ RARE ★ pulses over it, and the two-note common sting is replaced by a five-note rising fanfare that **outlasts the animation** (`seaSfx.rip` / `common` / `rare`). The 2-second reveal that follows gets its own prying sonar ping.
- **A ship going down takes the whole board with it.** It is the loudest thing that happens in Battleship and it used to be one grey line in the log; now the screen **shakes**, a green (theirs) or red (yours) banner says which ship by name, and `seaSfx.sink` runs four beats — the hull cracks, the magazine goes up, the timber groans over, and it slides under. Read off the position's own log, so a ship sunk on the other phone lands here too, and so **a ship finished off by a buried card counts exactly the same** as one finished off by a shot. The shake deliberately does **not** wrap the card modal: a transform on an ancestor turns `position: fixed` into `position: absolute` and the modal would ride along with it.
- **Every ship carries its length as a number** — *Going Merry (3)* — on both fleet strips and the Fleet tab. "How many squares am I still looking for?" is the question asked most often, and counting pips at phone size is not an answer.
- **The board answers every shot without a word**: a hit flashes to 3× brightness and snaps back, a miss ripples outwards, a wreck keeps burning for the rest of the game, a ship tips and fades out of the strip as it goes down, a buried card drops in from above, and the end-of-battle 🏆/😤 spins in. These key off the class landing on a *different* square each shot, so each animation restarts by itself with nothing re-keyed in React.
- **`prefers-reduced-motion` switches all of it off** and costs nothing: every animation here is decoration over information that is already in the text.
- **The banner is state, not React** (`SeaState.flash`), for the same reason the log is: the other phone never sees the shot, only the position that followed it. It carries its own `seq`, so each device shows one card exactly once, and the **2-second reveal starts when the banner is dismissed** rather than while it is covering the board. A sprung card gets its own three-note rising sting (`seaSfx.card`), deliberately unlike any other sound in the game, plus a card that scales and rocks in.
- Buried cards are **visible on your own boards and never on theirs** until they go off — enforced in `<SeaGrid>` alongside the ship-secrecy rule, in the same one place.
- Covered by the self-play harness: **1 500 full AI-vs-AI games** in which every one of the fifteen cards fired at least once, asserting no game fails to terminate, no fleet is ever corrupted by a relocation or a resurrection, and every shot stays legal.

**This is the one game here with an AI, and that is a rule about the game, not a change of heart** (§15d still stands for Chess and Checkers). Battleship hides information, so a solo match against the phone is a *real* game of Battleship; pass-and-play on one phone is not, because both fleets are on the screen. Three captains, and each only ever knows what your answers told it — none of them reads your grid:

- 🐣 **Coby** — fires at random. ~93 shots to clear a fleet.
- 🚬 **Smoker** — searches on **every second square** (the smallest ship is 2 long, so it cannot hide from a checkerboard) and hunts along a ship once he finds one. ~52 shots.
- 🌋 **Akainu** — counts, for every square, **how many ways a still-afloat ship could still cover it**, weighting placements that would explain a hit nobody has sunk yet, and fires where the most of them fit. That one count does the hunting and the finishing. ~45 shots, and he beats Smoker ~75% of the time.

**Berries.** Head-to-head pays the same **25 🪙** as the other games. A win over the AI pays **8 🪙 for the first 3 wins each day** (`games.seaDay` / `games.seaWins`) — practice, not a Berry printer. There is no daily play cap: unlike the card game's training hall, a Sea Battle costs nothing to deal.

**Live vs the other crewmate** (shared `app/seaBattles` doc, live-synced) — challenge → topbar banner, home-screen badge and a notification on the other phone → they accept and the shooting starts. The challenger fires first. One live battle at a time. **The setup phase is the one thing this game has that the board games don't**, and it is solved by never letting two devices hold the pen: **the challenger's fleet is written by the same tap that sends the challenge, and the accepter's by the same tap that accepts.** From then on only the side whose turn it is writes, so last-write-wins is safe by construction exactly as it is everywhere else. Both devices bank their own W/L off the same finished board, guarded by `games.seaSettled` locally and `paidAt` on the shared doc. Sea Battle **cannot draw**, so the record has two columns.

**Secrecy is by convention, not by cryptography** — the same trade the card duel makes with a player's hand (§15c). The shared document physically holds both fleets, because a wreck has to be drawable. The rule that a ship is never rendered until it has sunk lives in **one place** — `<SeaGrid mode="target">` — so no screen can leak a fleet by forgetting to check.

**Sound is synthesized** ([src/audio.ts](src/audio.ts) `seaSfx`) and carries the whole game without looking: the cannon fires, then either a short falling **splash**, a low **crack** of timber, or the long slide of a ship **going under**. Sounds fire off the position's own last log line, which is what makes them work for a shot that arrived from the other phone.

**⏱️ The shot clock** (see §15e), on the board-games dial. Run out and **the gunner fires blind** — a random square not yet tried. You cannot pass in Battleship, so a timeout has to resolve to something, and a blind shot is the version a nine-year-old can state before it happens.

## 15g. ONE PIECE Card Game (the 🏴‍☠️ app, inside the 🎮 Games folder)

**The real, printed card game** — not a house variant, and not the sticker album's Davy Back duel (§15c), which stays exactly as it is at `/duel`. Its own app, its own URL: `/optcg/play`, `/optcg/deck`, `/optcg/rules`.

- **Rules** live in [src/logic/optcg.ts](src/logic/optcg.ts), pure JSON-only functions with no React and no Firestore — the same contract the other games follow, which is why one engine drives a match against the AI held in React state and a live one against Ben through the shared `app/optcgMatches` doc.
- **What the engine enforces**: the turn (Refresh → Draw → DON!! → Main → End); 10 DON!!, two added a turn and one on the first player's first turn; resting DON!! to pay costs or *giving* one for +1000 power until end of turn; five Characters on the field with the sixth needing one trashed; one Stage; attacks only with an active card, never on the turn it was played unless it has **[Rush]**, and only against the Leader or a **rested** Character; **[Blocker]**, the Counter step, **[Double Attack]**, **[Banish]**; damage taking the top Life card into hand with its **[Trigger]** offered; decking out losing.
- **Deck legality**: a Leader plus **50 cards**, at most **4 copies** of a card, every card sharing a colour with the Leader, and nothing on the ban list.

**The card catalog is generated, and no art is ever stored here.** [scripts/optcg-scrape.mjs](scripts/optcg-scrape.mjs) harvests the publisher's own card list into `scripts/data/optcg-official.json` (category, Life, attribute, power, cost, counter, colours, types, effect); [scripts/optcg-catalog.mjs](scripts/optcg-catalog.mjs) merges it with the downloaded CSV dump (art variants, ban flags) into `src/logic/optcgCatalog.generated.ts` — **2 665 cards**. `npm run optcg:scrape` then `npm run optcg:cards` rebuilds it.

- **Images are hotlinked from public mirrors.** The publisher's own image host answers with `Cross-Origin-Resource-Policy: same-site`, so a browser refuses to paint its PNGs on our origin: an `<img>` pointed at it fails silently. Two mirrors send no such header, so every card carries a primary and a fallback and `<OptcgCardImg>` swaps on error, falling back to the printed name if both fail. **Nothing lands in `public/`** — this is the one place the image rule in CLAUDE.md is satisfied by not having an asset at all.
- **The catalog is ~1 MB and must never enter the main bundle.** `logic/optcg.ts` keeps an empty card index that [src/logic/optcgCards.ts](src/logic/optcgCards.ts) fills; only the card game screen imports that module, and the router loads the screen lazily. Anyone who never opens the game downloads none of it.

**Card text is scripted one card at a time.** The engine knows the keywords every card shares and nothing else; what a *particular* card does lives in [src/logic/optcgEffects.ts](src/logic/optcgEffects.ts), keyed by printed code. Today it covers the two starter decks in [src/logic/optcgDecks.ts](src/logic/optcgDecks.ts) — **ST-01 Straw Hat Crew (Red)** and **ST-02 Worst Generation (Green)** — and **this is meant to grow one deck at a time**: a new preset plus its entries is the whole job, with no engine or UI change. **Every other card is still buildable and playable**: the deckbuilder covers all 2 665, the board shows the card's text, and the players honour it — the way a table does with a card whose ruling nobody has memorised. A ⚙️ marks the cards the game plays for you.

**The AI** ([src/logic/optcgAi.ts](src/logic/optcgAi.ts)) is a heuristic player, not a search: this is a hidden-hand game and a shallow search over a hidden deck reads as random. It spends its DON!!, keeps the board wide, takes a free K.O. when one is on offer and swings at the Leader when it is not, blocks only when the blocker survives or the hit is lethal, and counters only to save something worth more than the counter. It plays every move through the engine's own public functions, so it can never do something a player could not.

**🎓 Learn to play (`/optcg/learn`)** — the tutorial is a **real game with a coach on top of it**, not a wall of text. Eleven steps ([src/logic/optcgTutorial.ts](src/logic/optcgTutorial.ts)), each naming **one tap**, over a **fixed deal** so "tap a card you can afford" is true the moment it is said. A step that teaches an action carries a `done(state)` test and **will not move on until the board satisfies it**; a step that is just being read advances on *Got it*. Because every step is tested against the position the engine produced, the tutorial can never teach a move the real game would refuse. The opponent answers a beat slower than the AI normally does — a move you didn't see happen is a move you didn't learn from.

**Berries.** Head-to-head pays the same **25 🪙** as the other games; a win over the AI pays **8 🪙 for the first 3 wins each day**.

**Live vs the other crewmate** (shared `app/optcgMatches` doc): challenge → they accept with their own deck → the game is dealt. Same single-writer safety as everywhere else — **the position names the side to act, and only that side writes**. One live game at a time, both devices bank their own W/L off the same finished position (`optcg.settled` locally, `paidAt` on the shared doc). **Secrecy is by convention, not by cryptography**, exactly as in §15c and §15f: the document holds both hands and both Life stacks, and the UI simply never renders the other side's.

## 16. Admin (Diogo) — the "Captain's desk" (🛠️ Captain app, Diogo only)

The Me screen is split into sub-tabs — **👤 Me** (streak, goal, freezes) · **🗺️ Voyage** (lifetime stats, map, habit log) · **⚙️ Settings** · **🛠️ Admin** (Diogo only, deliberately last: least-used feature). All management lives in the Admin tab (`src/components/AdminSection.tsx`):

- Manage BOTH academies (Ben's and his own): 🔒 lock/unlock any topic, **⚓ Mark conquered / ↩︎ Un-conquer** (stamps a topic passed by hand — a test sat off-app, or one the app failed to record; it also drops the topic off the wheel and opens the next one, exactly like a real pass, but hands out **no** 🍇 — use +1 🍇 for that. Un-conquering puts the topic back on the wheel), **+1 🍇** bonus grants, per-topic question manager (view every Q&A, remove — flagged `status: "removed"` in the DB row so AI regen won't recreate it — and restore), Ben's official final-test launcher (on the spot **or** 📡 allowed on his device with a code + note for a nearby grown-up, result reported back here), ⚔️ preview of Ben's training (records nothing).
- **⏳ Limits**: how many **training-hall card matches vs the AI** each crewmate may start per day (§13) — separate dials for Ben and Diogo, default **2**, 0 to shut the hall, 20 max, each row showing what has been played today and a one-tap reset to the default. Ben's dial is written into his world through the `kidData` subscription, so it only moves once his doc has arrived from the server. The same tab holds **⏱️ Move clock** — seconds per move for the board games and for the card game (§15e), 5-second steps up to 60, 0 to switch the clock off, written into **both** worlds at once because a clock only works if both sides of the board are on it.
- **🧊 Free freezes for Ben** (top of the desk): answer his freeze asks or gift unprompted — count + custom message, revives a dead streak for free. See §6.
- Review queue: AI-regenerated questions arrive `status: "pending"` → approve/remove card at the top of the desk.
- Prize settlement: "Prizes to settle" list + topbar banners, and the **treasure shelves** themselves — add/edit/delete a prize and set its 30-day limit, per profile (see §15).
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
2. **Preview, before you commit** — the whole session, with who built it (🧠 AI trainer / ⚙️ offline plan), the estimated real length including rest, and the coach's reason per exercise. Per exercise: **🔄 Not this one** (asks the coach for a replacement in the same body area) or **⚡ Offline** (the same thing from the offline planner — instant, free, no network). **Neither ever leaves a hole**: you asked for 30 minutes, so the slot gets refilled from your own history with something that fits what the rest of the session is working, and the card says so ("swapped in offline for X"). It only empties when there is genuinely nothing left to offer. Also **🎲 Plan a different one** and **🗑 Cancel**.
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

**One limb at a time gets said out loud (`perSide`).** For a single-arm row, a side plank or a side-lying rotation, the prescription is **per side**: "2 × 15" means fifteen left *and* fifteen right. The plan line reads `reps per side`, a ↔️ banner sits on the card while you work, and for a per-side hold the clock's target covers **both** sides before it beeps. You log the set **once, when both sides are done** — the app doubles it behind the scenes for session totals, body-part volume and lifetime reps, while `bestReps` stays per side so it is still comparable with history. `timed` / `cardio` are never doubled: their number is measured across the whole set and already covers both sides. The flag is set by the AI when an exercise is generated, backfilled once over the existing catalog by `npm run gym:per-side`, and **overridable by hand** — Gym → Gear → tap the exercise → ↔️. Anything that alternates *within* the count ("alternating lunges", dead bug) is **not** per-side; there the number is already the total.

**The one button is at the bottom, and it is huge.** GO / DONE / NEXT is pinned above the app's bottom menu, 78 px tall and full width, wherever the card above it has been scrolled to — because mid-set the phone is on the floor and the button gets pressed **with a foot**. Everything else on the runner (skip, next exercise, undo, leave) stays small and out of the way.

**Not tapping NEXT is how you ask for more rest.** There is no "+30 s" button any more: the rest timer counts past zero and what gets learned (§18d) is the moment you actually tapped NEXT. Rest longer, and the app plans longer rests; get back to work early, and it packs more in.

**Rest is when you go and set the next thing up, so rest shows you what it is.** Beside the countdown ring, the rest screen plays the **animation of what NEXT starts** — the same exercise if there are sets left, otherwise the next one — at 170 px, big enough to recognise the bench from across the room. Under it, the same thing in words with its full prescription, so it is never a blind tap.

#### 18c-1b. The session countdown

You said 20 minutes, so the app shows you 20 minutes: a small `⏳ 12:34 left of 20 min` rides above the foot button for the whole workout and is never scrolled away. **It does not stop at zero** — going over is allowed and expected; the clock just turns amber and counts `−2:10 over your 20 min`. It is information, not a buzzer: nothing about the session changes when it passes zero, and (since §18c-3) nothing about the grade does either. **⏭ Skip this one**, **Next exercise →**, **↩︎ Undo last set** and **🏁 Finish** are all still there; they are just out of the way of the loop.

#### 18c-2. Weights, bodyweight, or both

Asked on the setup screen and again on the report's "do more" card: **🔀 Mixed** (the default), **🏋️ Weights** or **🤸 Body only**. It filters the pool *before* the planner or the coach ever sees it, so it constrains both layers identically.

The split is by **load, not by gear** — `kind === 'weight'` is the weights half, everything else is bodyweight. A pull-up on a bar is bodyweight; it is equipment you hang from, not weight you add. If the filter leaves fewer than three usable exercises — asking for weights-only before a single item of gear has been catalogued — it **falls back to the full pool**, because a real session beats an empty one. The chosen mode is stored on the session and shown on the preview.

#### 18c-3. The report and the grade

**The grade is about the training, not the stopwatch.** It used to be one number — total time taken ÷ total time planned — and that punished the honest version of a good session: grinding a set slowly, going heavier than asked, squeezing out an extra rep all *take longer*. So the letter is now **three components worth 100 points**, and every one of them is shown with the sentence that earned it:

| | Out of | What moves it |
|---|---|---|
| 💪 **Work done** | 60 (+10) | Reps × load × how hard the movement is, **done ÷ asked for**. Doing the prescription is the full 60; beating it earns up to 10 more, so a big session can carry a long rest. |
| 🔥 **How hard it was** | 20 | The intensity of the moves themselves (light 1 → heavy 3), **plus** loading more than prescribed, **plus** 2 per completed 🏁 max test. A light day scores like a light day. |
| 😮‍💨 **Rest** | 20 | The only place the clock still counts. At or under the rest offered = full marks; **twice** the rest offered = zero. |

One set's worth of "work" = its reps (a hold counts ~6 s to the rep, a cardio minute ~8), doubled for a `perSide` move, × `1 + weight/40`, × `0.7 + intensity×0.3`. The exchange rates only need to be consistent, because every number in the grade is a ratio of *done ÷ asked*.

| Score | Grade |
|---|---|
| ≥ 92 | **A+** |
| ≥ 82 | **A** |
| ≥ 70 | **B** |
| ≥ 57 | **C** |
| ≥ 44 | **D** |
| below | **F** |

Time spent working is still measured and still shown ("time working: 8:20, planned 7:40") — as information, never as a score. **Slow, controlled reps are training, not dawdling.**

**An exercise you started is graded against its whole prescription; one you never touched isn't counted at all.** Stop at one set of three and that is a third of the work, and the letter says so — but walking out after two of six exercises grades those two properly instead of failing you for the four you never began. A short honest session is not a failed long one. A session with nothing logged gets no grade rather than a fake one.

Worked examples, same 3 × 10 @ 25 lb: doing it exactly, in the rest offered → **A** (91). Doing it exactly but with every rep twice as slow → **A** (91, *identical* — that is the whole point). Doing it exactly but resting double → **B** (71). 12 reps at 32 lb instead → **A+** (100). One set of the three → **D** (46).

Then: **➕ Do more exercises** for 5 / 10 / 15 / 20 more minutes, with the gear question asked again. The bonus block is **planned around the session that just ended** — its exercises are excluded outright, the muscles it hit are minutes old so recovery scoring buries them, and the coach is told in as many words that this is an extension of a workout already done, not a fresh one. It carries a **➕ Bonus block** chip on the preview.

### 18d. What it learns, and how

- **Rest** — `restLearned` is a rolling average (60/40) of the rest you actually took, not what was offered; the next offer is that blended 75/25 with the exercise's own default, clamped to 15–240 s. Take longer and the sessions get shorter and more honest; skip rest and it packs more work into the same minutes.
- **Weight** — you loaded **more** than asked → too light → next suggestion goes up **one notch**; **less** → too heavy → down one notch; the same → hold. First time on a loaded exercise there is no suggestion; whatever you type becomes the baseline.
- **The dumbbell has holes, not a dial.** The adjustable pair in the basement (TruLap, up to 90 lb) can only be set to `8.5 · 12 · 15.5 · 18.5 · 22 · 25 · 28.5 · 32 · 35.5 · 38.5 · 42 · 45.5 · 48.5 · 52 · 55.5 · 58.5 · 62 · 65 · 68.5 · 72 · 75 · 78.5 · 82 · 85.5 · 88.5 · 92` lb, so the app never asks for 20 lb. Every suggested weight — offline planner, AI coach, the 50%/75% warm-up ramp — is **snapped onto that ladder** (`DUMBBELL_LB`), and **+ / − in the runner walk it one notch at a time**. Typing a number by hand is still free-form, for a barbell or a machine, and a profile set to **kg** keeps the old free 2.5 steps.
- **Preference** — ratings score into the picker (`love` +45, `like` +25, `ok` 0, `dislike` −40, `hate` = excluded).
- **Recovery** — the planner reads the real timestamps of past sessions: chest/back/legs/glutes want ~48 h, shoulders/arms ~40 h, core ~24 h, cardio ~12 h. A part trained recently is heavily penalised, so the app spaces the body out on its own.
- **Variety** — days since last done adds up to +63; every repeat of a body part already in today's session costs −45; a small random jitter means no two sessions are identical.

### 18e. The natural warm-up

Diogo doesn't warm up, so there is **no warm-up block**. Instead the planner forces the first two moves to be light (intensity 1) and scales their prescribed weight to **50% then 75%** of the working suggestion. Order after that: hardest compound work while fresh, core and holds last. Toggle: Coach → "No warm-up block".

**The one exception: the roman chair opens every session.** A back extension before anything else is a standing instruction — it wakes the lower back up before the session asks it for a favour, which is the whole point of §18g's lower-back rule. Coach → **"Roman chair first, always"**, **ON by default** (a profile saved before the setting existed still gets it — it is read as `!== false`).

It is enforced on **both layers**, because that is the §18a rule: the coach is told about it in as many words as a HARD RULE with the exact exercise id, and then the app checks the answer — if the opener isn't first it is moved there, and if it isn't in the answer at all it is planned offline and pushed onto the front. The offline planner pins it at index 0 and ordering only shuffles what comes after it. The bench is found by name (`roman chair` / `back extension` / `hyperextension`) in the shared catalog; with no such bench catalogued the setting says so and does nothing. A **➕ bonus block** never re-opens with it — it is a continuation of a session, not a new one.

### 18f. Rep ladders

The motivating pattern from Diogo's old push-up app, for bodyweight staples (`ladder: true` — push-ups, pull-ups, dips, squats): five sets that creep up a rep at a time — `4 4 4 4 4` → `4 5 4 5 4` → `5 5 4 5 4` → … built from `round(max × 0.4)`. Every **6 cycles** the session prescribes a **🏁 max test** — one all-out set — and the whole ladder is rebuilt from that number. A ladder is seeded automatically from your first honest set of that exercise. The coach gets no vote on ladder reps.

### 18g. Body briefs

Free text the coach reads **verbatim** before every session, plus four hard rules the offline planner enforces too (it can't read prose):

- **Protect my lower back** — `backRisk` exercises are filtered out entirely.
- **No warm-up block** — see §18e.
- **Roman chair first, always** — see §18e. Default ON.
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

Every exercise can carry a **still image and a looping animation of the movement**, sourced from **three places, tried in order**. We take only the handful that match exercises we actually own and re-host those ourselves, so the app never depends on someone else's CDN and we never mirror a library we don't use.

1. **[ExerciseDB's free open endpoint](https://oss.exercisedb.dev/api/v1)** — 1,500 exercises, **no API key and no account required**, a real GIF of the movement.
2. **[free-exercise-db](https://github.com/yuhonas/free-exercise-db)** — 873 exercises, public domain (Unlicense), one static JSON file on GitHub, no key and no rate limit. It has **no GIFs**: every entry is two photos, the **start and the end** of the movement, which the script turns into a **two-frame animation** (1 s a frame). Less pretty than a GIF, but it covers basics the free ExerciseDB tier simply does not have — `superman`, `dead bug`, `arm circles`, `plank`, `glute bridge` — and a two-photo demo of the right movement beats an emoji.

3. **The open web** — a **Giphy search**, for the moves neither library has. Giphy because its search page is plain server-rendered HTML: an image-search page is JavaScript and has nothing to fetch, and Giphy's own API answers `403 BANNED` to the old public demo key.

**Each source only sees what the one before it could not match**, so nothing already animated is downgraded to a flip or a stranger's GIF. Source 2's rows are reshaped into ExerciseDB's field names (muscles → body parts, `body only` → `body weight`) so the scoring, the shortlist and the AI tie-breaker below work on it unchanged. `--no-photos` and `--no-web` skip sources 2 and 3.

**Source 3's results are mostly garbage, and that is the interesting part.** A search for *"bird dog exercise"* returns, in order: a beagle on a treadmill, an Angry Birds cartoon, a band called BirdDog — and, **eighth**, an actual demonstration. Titles cannot separate those (*"dogs bird GIF"* vs *"Bird Dog Calisthenics GIF"*) and no text score ever will. **So the model looks at them**: three frames of each of the top 6 are written to disk and the claude CLI is asked to *read the images* and name the one that shows the movement with correct form — or answer none, which it is told is the more common right answer. That is the §18l rule applied to a worse source, so **`--no-ai` disables source 3 completely** rather than falling back to a text guess: nothing from the open web is ever taken unseen. What it finds is a stranger's GIF re-hosted for one family's app; the source URL is recorded on the demo and Gear removes a bad one in a tap.

**Hand-picked GIFs are thinned to fit the budget.** The libraries ship ~30-frame line-art loops; a real phone video from the web is 77 frames and 3.4 MB, which converts to ~150 KB — seven times the budget for something the eye cannot tell from a sixth of the frames. So any source with more than 14 frames keeps every Nth and gives each survivor the airtime of the frames it replaced, preserving the true speed. Bird dog: 3.4 MB → **23 KB, 13 frames**.

⚠️ **Overwriting a file in Firebase Storage rotates its download token**, so a demo URL changes when it is re-run. The catalog always holds the current one; don't bookmark them.

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

**Coverage is partial, and that is a data limit rather than a matching bug.** Verified against the downloaded indexes: the free 1,500-row ExerciseDB tier contains **no** plain `plank`, `squat`, `glute bridge`, `wall sit`, `bird dog`, `jumping jack`, `arm circle` or `hollow hold` — source 2 covers `plank`, `superman`, `dead bug`, `arm circles` and `glute bridge`, and **neither** has `bird dog`, `hollow hold`, `wall sit` or `jumping jacks`. Gear exercises do much better than either — standard names like "dumbbell bench press" and "dumbbell lateral raise" hit exactly.

#### If coverage still isn't good enough — the remaining options, and what they actually buy

Not decided; recorded so the research isn't repeated. **Do nothing until the real basement catalog exists** — gear exercises match well already, so the gap may not be worth acting on.

| Option | Exercises | Media | Cost / friction |
|---|---|---|---|
| **ExerciseDB free tier** (source 1) | 1,500 | 180p GIF | none — no key, no account |
| **free-exercise-db** (source 2) | 873 | 2 static JPGs (start/end) | none — public domain, no key, no rate limit |
| **ExerciseDB v1 paid** | ~2,000 | GIF to 1080p, extra metadata | RapidAPI subscription |
| **ExerciseDB v2 paid** | 11,000+ | images + **MP4, no GIFs** | separate subscription; free tier is watermarked |

- **The v1 key is already supported in code**: set `EXERCISEDB_KEY` (or `--key=`) and the script switches host, adds the `X-RapidAPI-Key`/`X-RapidAPI-Host` headers, drops the request spacing and caches to a separate index file — same pagination, same response shape, nothing else to change. **But it is only ~500 more exercises**, so it is unlikely to contain the missing basics. (An earlier draft of this document claimed that key was the 11,000-exercise tier. It is not — that is v2, a different subscription.)
- **v2 is the only tier with the full library**, but it serves MP4 rather than GIF, so adopting it means changing the media pipeline (§18l's animated-WebP conversion assumes a GIF input) and its free tier watermarks the assets.
- **free-exercise-db is already in** (source 2 above), which was the cheapest way to close the specific gaps, and **the web search (source 3) covers what it missed** — `bird dog`, `wall sit` and `hollow body rock` all have real animations now, found and vision-checked automatically. `hollow hold`, `jumping jacks` and `skater jumps` are still emoji: the model looked at what came back and honestly answered "none of these".
- **`--gif=<ourId>:<url>` is the hand-picked door**, and it is deliberately manual. Scraping an image search is not an option — those pages are JavaScript, so there is nothing to fetch — and picking a demo that shows *correct form* is a judgement call, which is the same reason scoring never auto-accepts. You copy the image address, the script does the rest: GIF, WebP, PNG, JPG or SVG, resized to 180px and converted into the identical `anim` + `poster` pair a library match produces, recorded as `manual` with the host as its attribution. Bird dog currently uses [Birddog_exercise.svg](https://commons.wikimedia.org/wiki/File:Birddog_exercise.svg) (Pk0001, CC BY-SA 4.0) this way — a still drawing, not an animation. Check anything you paste is licensed for use.

The floor under all of this: an exercise with no honest demo keeps its emoji, which is a supported state, not a defect.

The 20 built-in bodyweight moves are covered too: they live in **`src/logic/gymStarters.json`**, imported by both `src/logic/gym.ts` and the script, so there is one list and no drift. A built-in that finds a demo is written back to the catalog as an override row — the same mechanism the Gear tab uses to edit one.

Re-runnable and idempotent: exercises that already have a demo are skipped unless `--refresh`. Flags: `--dry-run`, `--refresh`, `--reindex`, `--only=<id>`, `--pin=<ourId>:<theirId>` (force a specific ExerciseDB id), `--to=storage|public`, `--no-ai`, `--no-photos`, `--no-web`, `--gif=<ourId>:<url>`, `--key=`. In the app, **Gear → an exercise** plays its demo, names the library and the entry it came from, and offers a one-tap **"Wrong movement — remove it"**. Attribution is shown wherever demos appear.


## 19. Essays — "the red pen" (the ✍️ Essays app)

Ben writes essays; Diogo runs the desk. The AI does the reading and the marking, but it **never writes for him** and it **never has the last word** — every note is Diogo's to keep, reword or bin, and the grade only happens once Diogo says everything is fixed.

Code: `src/logic/essay.ts` (rules, grades, mark-up), `src/logic/essayAi.ts` (the four AI calls), `src/logic/openrouter.ts` (shared with the Gym coach), `src/screens/EssayScreen.tsx` + `src/components/essay/*` (the red pen is `FocusReview.tsx`), push in `functions/index.js` (`onEssaysWrite`).

### 19a. Who is writing

Born 2014, TCDSB (Toronto Catholic District School Board), Ontario. Every prompt carries that: the school grade is **derived from today's date** (it rolls over each September, so it is right next year without an edit), topics have to fit the Ontario curriculum and be fine for a Catholic school, and spelling is **Canadian English** (colour, favourite, centre).

### 19b. Data

| Where | What |
|---|---|
| `app/essays` (shared) | `topics[]` (the curated list), `essays[]` (every essay, capped at 40), `words[]` (the word bank, capped at 300) and `wordTests[]` (the last 40 sittings). Both crewmates read it live: an enabled topic appears on Ben's list, a submission appears on Diogo's desk. Each essay also carries `lastCheckAt`, which is what the five-minute resend cooldown is measured from. |
| `app/aiConfig` (shared) | The same OpenRouter key and model as the Gym coach (§18b). One key, one spend cap. |
| `profiles/{id}.economy` | Where the Berries land when an essay is graded. |

Last-write-wins on one doc is safe here for the same reason it is on the duel board: at any moment exactly one side is holding the essay.

### 19c. Topics — offered, judged, never repeated

1. Diogo taps **🤖 Ask for 6 ideas** (optionally steering it: "something about hockey").
2. Every idea he sees is judged: **✓ Keep** or **✕ Never again**. Both answers are stored, and **both lists are sent to the AI as "never offer these again"** — that is the whole reason batch ten is still worth reading.
3. A kept topic has a **switch**: Ben only ever sees the enabled ones. Dropping a topic hides it *and* records it as a rejection, so it can't come back through the front door.
4. Diogo can write topics by hand, and set each topic's **word target** (default 150).
5. **A topic is written once, then it's spent.** The moment an essay is graded the topic drops off Ben's list for good — being offered "✍️ Write this one" under the essay he just got a grade for reads as the app not having noticed he did it. The topic itself carries who has written it (`writtenBy`), not just the essay list, because that list is capped at 40 and a topic must not come back from the dead when his history rolls over. Deleting an unfinished draft *does* put the topic back; that is the one case where he hasn't written it. On Diogo's Topics tab a spent topic stays visible with a **✅ written** chip instead of its switch, and stops counting towards *"N open"* — a topic that vanishes with no explanation is worse than one that says what happened.

#### 19c-1. Ben suggests a topic — Diogo approves it

A topic he picked himself is the one he'll actually want to write, so the road in exists — it just goes past Dad.

1. Ben has his own **💡 Ideas** tab (its own tab, not a corner of the Write screen, so it's still reachable while an essay is in flight — which is exactly when the next idea turns up). Title, optionally why he wants it and a subject, then **📨 Send it to Dad**. Plain keyboard: a topic title is never marked or graded, so §19d's no-autocorrect rule doesn't apply to it.
2. The ask lands in the same `topics[]` list as everything else with status **`suggested`**, `source: 'kid'`, and who asked. Two consequences, both deliberate: the AI is told never to offer that title (it's already on the list), and **nothing appears on Ben's Write list** — `suggested` is inert until it's answered.
3. **Three asks may be waiting at once.** Not a punishment: a queue of thirty is how a good idea turns into something nobody answers. A duplicate title is refused on the spot.
4. Diogo's **Topics** tab shows his asks **first**, above everything else — they're the only thing on that screen someone is waiting on. **✓ Approve** → the topic becomes `kept` + enabled and **joins the normal flow exactly as if Diogo had written it** (same word target, same switch, same everything, with a chip saying whose idea it was). **✕ Turn down** → `rejected`, which also means the AI is told never to offer it.
5. **The answer always comes back.** Ben gets a push and a home-screen banner either way, and the Ideas tab keeps every ask he ever sent with what happened to it. An ask nobody answers is worse than no ask at all.

### 19d. Writing — our own keyboard

Every field in the editor is `inputMode="none"` with spellcheck, autocorrect and autocapitalise off, so **the Android keyboard never opens** and `<PenKeyboard>` is what he types on. This is not decoration: a keyboard that silently fixes "definately" means he never finds out he can't spell it, and an essay is exactly where that is supposed to be found out. The layout is the **standard US phone layout** key for key (letters / `?123` / `#+=`, shift with a double-tap caps lock), so nothing learned here has to be unlearned on a real keyboard. There are no word suggestions.

The editor gives him a **title** and one box per paragraph, plus **➕ Add paragraph** — a new paragraph is a deliberate button press, never an accidental Enter. A live word counter runs against the topic's target. The draft autosaves about a second behind his typing, so closing the app costs a sentence, never the essay. One essay at a time.

### 19e. The loop

1. **Hand it in — and the app checks its own rules before anyone else sees it** (§19e-4). Capitals, spacing, "I", stray articles: if any of those are open, the essay does not move. It comes straight back to Ben, instantly and for free, saying in as many words that *nobody has read it yet*. Only once the rules are clean does Diogo get a push and a banner.
2. **The same rules keep running** (§19e-2) — on every hand-in and every time the desk opens the essay. The AI never has to be asked about them.
3. **🤖 Mark it up — mechanics only.** The AI proofreads for exactly three things: **spelling**, **punctuation**, and **capital letters** (a lowercase "i", a sentence starting small, a name without its capital). It is told explicitly to say nothing about ideas, structure or clarity. Each note carries the **exact quote** to mark — quotes, not offsets, so a note survives him editing the sentence around it. A quote that doesn't match anything is simply not marked; the note still shows. "It found nothing" is a real answer and is said out loud, so it can't be mistaken for "it never ran".
4. **Everything about the writing itself is Diogo's, by hand** (§19e-1). Judging whether a 12-year-old's argument holds up is not a job for a cheap model, and pretending otherwise produces confident nonsense.
5. **Diogo has the last word on the machine's notes too**: ✏️ **Edit** (reword it — Ben reads exactly what Diogo wrote) or ✕ **Disagree** (it disappears; Ben never sees it).
6. **📬 Send the notes back** → **Phase 2** on Ben's side: a push, then his own text with the problems **marked where they are**. There is one view and it is the marked-up essay: he taps a circle and fixes that bit in a sheet (§19e-5). He fixes them himself.
7. **He sends it again — and the app closes what he fixed, by itself** (§19e-2). No button, no AI call: the app looks for the flagged text and, when it is gone, the note is done. **Diogo never reviews spelling.** For the leftovers, **🔁 Check his fixes** asks the AI for a verdict per note with a one-line reason.
8. **Round again, or grade.** The loop repeats until no note is open.

**🔎 Go to it.** Every note that still has something to point at carries a button that scrolls the essay back into view and pulses the mark for three seconds. A note naming a word is useless if finding that word across four paragraphs is the reader's problem.

**Two lists, not one.** The desk separates **🤖 the machine's marks** (spelling, punctuation, capitals — found by the AI, closed by the app, there only to be read or binned) from **✍️ my notes** (Diogo's own, with the full keep/reword/close controls). Sorted marks collapse behind a "show the N he already sorted" toggle, so the list is never a pile of things already dealt with. Writing a note of his own is one button away — 🖍️ **Mark it by hand**, which is the Red pen tab (§19e-1).

**It never hands him the answer.** A note is a *tip*, not a correction: point at the part of the word that's wrong, name the rule ("this one follows i-before-e"), or tell him what to do ("say it out loud slowly — one sound isn't written"). The prompt bans the corrected word four different ways, including spelling it out letter by letter, and **the app checks the output anyway**: any note containing the correct spelling is thrown away and replaced with a generic tip. One leak undoes the exercise — he only has to be handed a word once to stop working it out — and a blander note is a far smaller loss than a free answer. The same scrub runs on the fix-check verdicts. Canadian spellings are explicitly correct and never flagged.

#### 19e-1. Marking by hand — the 🖍️ Red pen (its own tab)

A hand-written note used to mean retyping his sentence into a text box character for character — and a quote that doesn't match exactly never gets marked, so the fiddliest part of reviewing was also the part most likely to fail silently. Instead: **tap the first word, then tap the last word**. The same word twice is a one-word note. A 📌 button takes the whole paragraph. The quote is sliced straight out of his text, so it always matches.

**It is a mode, not a corner of the desk** — `/essay/pen`, its own tab next to Desk. Reviewing by hand is the one thing on that screen that wants the whole screen, and it is built to be fast:

- **The text never leaves.** Nothing here navigates anywhere. The note form arrives as a **sheet from the bottom**, over his essay rather than instead of it; writing the note and closing it leaves you looking at the same paragraph with the new mark on it, ready for the next one.
- **Every mark already on the essay is visible while marking** — the AI's, the app's rules', and Diogo's own, in their issue colour. That is the whole point: knowing what has already been said is what stops the same thing being said twice.
- **Tapping an existing mark opens it** instead of starting a selection: what it says, who raised it, and the usual last word — ✏️ reword it, ✕ disagree, ✓ he fixed it, 🔎 find it. A tap anywhere else starts a new note, so one gesture does both jobs without a mode switch.
- **…and that popup can hand the words back**: ✍️ **New note here** closes it and makes the word he tapped the start of a fresh selection. One set of words can have two things wrong with it, and a mark he has already sorted must not lock those words up for good — otherwise the second problem in the same sentence is unmarkable.
- **A selection that lands on words that are already marked says so**, right in the form, above the box.
- The kind of problem is a **row of chips**, one tap, not a dropdown.
- **The written note is optional.** A circled word tagged 🔤 Spelling has already said what is wrong; making Diogo type "spelling" underneath it is a toll on the marks that need no words, and a toll paid often enough gets marks skipped. Leave the box empty and the note reads as the chip's own standard sentence ("Spelling — fix this word."), so Ben still gets a sentence to read on the fix sheet. Typing something replaces it.
- **The desk and the red pen hold the same essay.** Opening one on the Desk and stepping across to the pen keeps it; the pen's own list is only there for a cold start (a bookmark straight to `/essay/pen`).

**The marking is proportional.** A single word gets the teacher's red circle. A phrase gets a **quiet tinted underline** instead — ringing half a sentence reads as "all of this is wrong", which is both untrue and crushing.

#### 19e-1a. Rounds — what he changed, and what it looked like before

Round five reads exactly like round four: three hundred identical words, two of them different. Re-reading the whole essay to find the two is how reviewing stops happening — so the app finds them.

- **Every hand-in is snapshotted** (`essay.versions`, one per round, taken at submit). This already existed for the AI fix-check; the red pen now reads it too.
- **What he changed since the last hand-in is painted red** in the red pen, on by default, with a count — *🔴 4 words changed* — and a 🔎 that jumps to the first one. The diff is **word-level** (longest common subsequence over words) and compares the exact word, punctuation included: `again` → `again.` is precisely the fix that is otherwise invisible. Deletions are not painted — the reviewer is reading the text that exists, and a marker where a word used to be helps nobody.
- **Paragraphs are matched by position.** He rewrites in place and adds at the end, so this is right nearly always, and wrong in the safe direction when it isn't: a whole paragraph shown as new.
- **Earlier rounds can be read back** — ◀ / ▶ across the rounds, each one showing that draft with **the notes it got on that round**, and its own changes painted against the round before it. An old round is **read-only**: no tapping, no new marks, no 📌. History is not a place to leave notes.
- **Approval bins the history.** On 🏅 grade, `versions` is emptied: the snapshots existed to answer "what did he change?" while the loop was running, the loop has stopped, and every old draft is dead weight in a doc both crewmates sync live. The final essay is what's kept.

#### 19e-2. The rules that need no AI (`src/logic/proofreader.ts`)

"A sentence starts with a capital letter" and "the word I is always a capital" are not judgement calls. Waiting on a language model to notice them costs money, takes a minute, and sometimes just misses one — so the app decides them itself: instantly, offline, every time, free. These notes appear the moment he hands in, and again whenever the desk opens the essay; they carry a **📏 rule** chip so it's clear they're a rule, not an opinion.

| Rule | Catches |
|---|---|
| `lone-i` · `lone-i-contraction` | `i` and `i'm` / `i've` / `i'll` as lowercase |
| `sentence-capital` | a paragraph or a sentence starting lowercase (abbreviations like "Mr." excluded) |
| `space-after-punct` · `space-before-punct` | `inside.Everytime`, `also,make`, `roblox .` |
| `double-punct` | `!!`, `,,` |
| `end-stop` | a paragraph that never finishes its last sentence |
| `a-an` · `double-article` | "a app"; "a another" (which needs a word *deleted*, so it gets its own advice) |
| `repeated-word` | "the the" |
| `apostrophe` | `dont`, `didnt`, `thats`, `im`… — squashed contractions with no other meaning |

**Two spaces between words is deliberately not a rule.** It is invisible on the page, a phone keyboard puts one there by itself, and circling it spends Ben's attention on something no reader will ever notice.

**One note per rule per paragraph**, carrying the count ("there are 4 in this paragraph"), because a note is only useful while it still has something to point at — the mark simply moves to the next one as he fixes them. Rules must be **near-certain**: anything ambiguous ("a" before a `u`, a lowercase word after a comma) is deliberately left out rather than guessed at, since a false positive costs the reviewer a tap.

**The rules own their notes, and one pass keeps all three ends true** (`syncRuleNotes`): a rule that no longer fires **closes its note**, a rule that still fires **has its note's quote refreshed** so the mark moves on to the next offender, and a rule firing with no open note **gets one**. Closing on "does the rule still fire?" rather than "is the quoted text still there?" matters: fixing the one lowercase sentence-start a note pointed at used to leave that note open if any other paragraph happened to contain the same word — and with §19e-4 a note stuck open like that would be a locked door. Wording Diogo rewrote by hand is never overwritten: the rule owns the mark, the human owns the words.

**Disagreeing with a rule note settles it for good** (`dismissed`) rather than deleting it — the rules re-run on every open, so a deleted one would be back within the second. It is also the escape hatch from §19e-4: a rule that is somehow wrong about his text is one tap from being out of his way.

`scripts/essay-proofread.mts` runs the same rules over Firestore for essays written before the rules existed (`--write` to save; dry run by default). It imports `src/logic/proofreader.ts` directly, so there is no second copy to drift.

#### 19e-3. Closing a note without asking anyone

**The app settles the machine's notes itself, for free.** The test is deliberately literal: the flagged text is *gone from the paragraph it was flagged in* (whole-word — "realy" is not found inside "really"), and where the right spelling is known, it is *now present*.

**Scoped to that paragraph, because the marking is.** Checking the whole essay instead left a note open because the same slip appeared somewhere the note wasn't about — so the reviewer saw two notes and one circle. The invariant is: **an open machine note always has a visible mark**, and a note with nothing left to point at is done. A word he changed into a **different** wrong spelling therefore stays open, which is correct — he hasn't fixed it. Only the AI's own mechanical notes are eligible; a note Diogo wrote by hand is Diogo's to close. This runs when he sends, and again whenever Diogo opens the essay, so a stale list heals itself on sight.

**Whole-word matching is not a nicety.** A note quoting the single letter "i" once matched the **i inside "life"**, so the app drew a red circle around a perfectly good word and told a 12-year-old to fix it. Quotes only match where their own edges are letters butting against non-letters.

**An apostrophe counts as part of a word only when it sits between two letters.** Inside "that's" it is word glue; at either edge ("'s", "friends'") it isn't. Both halves of that rule are paid for. Treating an apostrophe as *never* part of a word let a quote start in the middle of one: the AI flagged the missing apostrophe in "thats roblox" with the quote `s roblox`, and once he fixed it to "that's roblox" that quote **still matched** — "s" looked like a word of its own. The note could never close, so a problem he had already fixed stayed circled forever and the essay could never be graded. Treating it as *always* part of a word breaks the other end, where a quote legitimately begins or ends against one.

**Then, and only then, the spelling gate.** If words are *still* misspelled after the free pass, his send button spends an AI call to check, and refuses to pass the essay on while any spelling note stands. He is told how many are wrong and pointed back at the marks — never told what the words should be. That call **locks the button for five minutes**: it costs real money, and "send" is otherwise a free spellchecker to mash. The button counts the wait down and says why. Most rounds never reach this point, and cost nothing. Diogo's own check button has no limit.

#### 19e-4. The rules gate — the app reads it before anybody else does

**Nothing leaves Ben's hands while the app's own rules have something open.** His send button — the very first hand-in included — runs §19e-2 before it runs anything else, and if the rules find something, the essay does not move: no push to Diogo, no AI call, no round number. It comes straight back to him.

The reasoning is the same as the rules' own: a missing capital has a right answer, so paying a model to find it and making a person carry it to the desk is absurd — and hearing about it two days later teaches nothing. It is also cheaper on the one resource that actually runs out, which is Diogo's evenings.

- **He is told plainly that this is not the review.** "Nobody has read your essay yet. This is just the app checking the rules that always have the same answer — capital letters, spaces, full stops. Fix these, send it again, and *then* it gets read properly." The word "review" is kept for the thing a person does.
- **The list is live, off the text in front of him** — not the saved copy. It shrinks as he types, and turns into "✅ All tidy — send it now" when it empties. That makes it feel like a spellchecker rather than a rejection.
- **Each item also sits under the box it belongs to**, so "paragraph 3" never has to be worked out.
- **Free, instant, offline, and unlimited.** There is no cooldown on it, because there is nothing to spend.
- **The escape hatch is Diogo's** — a rule note he disagrees with is `dismissed` and never blocks again (§19e-2).
- **In phase 2 the gate is a flash, not a wall.** When a send is turned back by the rules on the marked-up essay, the circles the app raised **pulse for five seconds**, and the first of them is scrolled into view — a mark pulsing below the fold is the same as no mark at all. That is the whole announcement. Then the page goes quiet and the circles speak for themselves. A banner that stayed up for the rest of the round only added noise to a page already covered in notes.

Because rule notes are raised before anyone has read the essay, **they don't count as "it has been marked"**: an essay carrying nothing but rule notes cannot be sent back or graded, and the desk says so.

#### 19e-5. Fixing it — one mark at a time (the writer's sheet)

**There is no "edit the whole essay" view in phase 2.** There was — a 📝 Fix it tab holding the full editor with the notes listed under each paragraph — and it was the worst screen in the app: four paragraphs, a pile of notes, and finding the words each note was about was *his* problem. That is exactly the step a 12-year-old abandons.

What replaces it: **his marked-up essay is the screen**, and every fix starts by tapping the thing that is circled.

- **The sheet opens over his text**, the same way the red pen's does, and it holds one note: what was said, the words it points at, a **Before** panel, and the box he types in. The box *is* the after — a third panel echoing his own typing back at him is a copy of the thing he is already looking at.
- **How much he gets to edit depends on what is wrong** (`editWindow`). A **spelling** or a **missing capital** opens **the word alone** — those have one right answer inside one word, and handing him the sentence invites him to rewrite around the problem instead of solving it. Everything else (clarity, punctuation, an idea that needs work) opens **the sentence the mark sits in**, capped at ten words either side: "hard to follow" on three words is almost never fixable inside those three words, and the words on either side usually have to move too.
- **Only the marked slice is spliced back in.** The rest of the paragraph cannot be touched from here, so a round of fixes can't quietly become a rewrite.
- **It is the same no-autocorrect keyboard** as the editor (§19d). A sheet that let Android's keyboard fix his spelling would undo the entire exercise.
- **Saving is immediate**, not the one-second autosave: he pressed a button that says save, and the marks that redraw underneath have to be about text that is actually written down. The app then re-reads it for free — a machine note whose problem has gone closes itself (§19e-3) and the built-in rules re-run over the new sentence.
- **A note a person wrote is closed by the save**, because nothing can check "is it clearer now?" by itself, and Diogo sees the change next round anyway.
- **A note with nothing left to circle gets a card of its own** under the essay, with a ✓ *I've sorted this*. Otherwise a note whose words he had already rewritten would vanish off the screen while still counting against him.
- **A sorted mark leaves the page.** Only what is still to do stays circled on his copy (⭐ praise stays too). A settled note used to hang around as a dashed circle it was pointless to tap, and by round three the essay was more old circles than new ones — the one thing left to fix was impossible to spot. It also cost the §19e-4 flash: where two notes' quotes overlap, the mark goes to whichever comes first in the list, so a settled note could quietly steal the circle off an open one. The count and the progress bar still remember them; Diogo's red pen still shows them all.
- **⭐ praise does not reopen on tap.** It is there to be read.
- **A progress bar counts what's sorted**, and the send button says what it is for: *🤖 Check my fixes (3 still circled)* while anything is open, *📬 Send it back to Dad* once nothing is. It is never disabled by the count — a spelling he has re-broken would otherwise be a locked door, and the spelling gate (§19e-3) is the thing that decides whether it moves.

### 19f. The word bank — "My Words" (the 🔤 tab)

**Every word he misspells is kept forever.** A word he got wrong once is a word he will get wrong again, and a spelling list made entirely of *his* mistakes beats any list off the internet.

When the proofreader flags a misspelling it also returns, in fields **he never sees**, the correct spelling and six plausible wrong ones — a doubled letter, two letters swapped, a missing vowel, ie/ei reversed. (If it returns too few, the app generates the near-misses itself with the same rules, so a lazy answer still makes a real question.) That becomes one multiple-choice question: **"Which one is spelled right?"**

- **Both pens fill the bank.** A misspelling the AI proofreader catches goes in with its correction attached. A word **Diogo circles by hand** as a spelling note goes in too: the note itself only carries the wrong word, so the app makes one small AI call in the background to fetch the right spelling and the near-misses. That call is silent and never blocks the marking — if there is no key, or the model doesn't answer, the note still stands and only the bank entry is missed.
- **The list never closes.** New words join it after every review; nothing is ever retired.
- **A repeat is counted, not ignored.** Misspelling a word that is already in the bank raises its **miss count** instead of adding a duplicate — and it stops being "nailed", so it can pay again. The count is what weights the practice draw: a word missed 4× is drawn 4× as often as one missed once (capped at 5×, so one word can't swallow every round). Diogo's side shows "missed 4×" on the word.
- **🎯 Quick practice** — 5 words, shaky ones first, drawn by miss count, no Berries, no record.
- **🏁 Final test** — every word in his bank, **retakable as often as he likes**.
- **A word pays 🪙 5 the FIRST time he gets it right in a final test, and never again.** That is what makes unlimited retakes safe: the second correct answer for a word is worth zero, so a retake is practice, not a Berry tap.
- **"🆕 4 new words since your last test"** sits on the card — the line that makes the test worth reopening.
- His side shows the word **as he wrote it** (working out the right spelling is the exercise). Diogo's side shows the correct spelling, what he actually typed, and per-word hit rate, and can delete a word.
- Each word belongs to whoever wrote the essay, so the two crewmates never share a list.

### 19g. The grade and the Berries

Once nothing is open, **🏅 Grade it**: a letter from **C- to A+**, plus two sentences written straight to him — what he genuinely did well, and the *one* thing to work on next time. Nothing below C- exists: he only reaches this point after fixing everything he was asked to fix, so the grade measures the writing, not his obedience.

| Grade | A+ | A | A- | B+ | B | B- | C+ | C | C- |
|---|---|---|---|---|---|---|---|---|---|
| 🪙 Berries | 200 | 170 | 150 | 130 | 110 | 95 | 80 | 65 | 50 |

**The table is shown to him before he starts**, on the topic-picking screen — the reward for trying harder has to be visible while he is deciding how hard to try. Calibrated against the rest of the economy (a hard quest pays 35, a Streak Freeze costs 150): an essay is days of work and a review loop, so even the bottom of the scale beats a quest.

**📚 Marked** keeps every graded essay: the letter, the Berries, the feedback, and the whole marked-up copy one tap away.

### 19h. When the model doesn't answer

Somebody is sitting there holding a phone, so the essay desk does **not** use the Gym coach's three-minute patience (§18):

- **60 seconds per model.** A model that hasn't answered in a minute is stuck, not thinking.
- **Then the next model in the queue** (`ESSAY_MODELS` in `src/logic/essayAi.ts`), automatically: **`qwen/qwen3.7-flash` → `z-ai/glm-4.7-flash` → `deepseek/deepseek-v4-flash`**. All cheap Chinese open-weight models on OpenRouter, and all of the "flash" tier on purpose: the job is "read 300 words and answer in small JSON", so what matters is answering fast and cheaply, not leaderboard position — a frontier model would cost 20× for no better marking. A timeout, a dead model id, a rate limit and a garbled reply all mean the same thing — move on.
- **A retired model id is the ordinary case, not an exception.** These ids get withdrawn from OpenRouter without notice, so the queue must survive one going dead — and the 60 seconds is a hard wall on the clock, not a request abort, because a half-read reply that never lands would otherwise hang the whole queue with a spinner that never moves.
- **The desk picks its own models**, deliberately ignoring `aiConfig.model` (which is the Gym coach's choice). Same key, same spend cap; different job, different size, and one having a slow day must not stall the other.
- **The wait is shown, not hidden**: which model is being asked, *model 2 of 3*, and a live countdown of its 60 seconds. A blank minute is indistinguishable from a hang, and the recovery is invisible unless it's said out loud. When the queue moves on, the card also says **why the last one was dropped** — a swap with no reason reads as the app losing interest.
- If the whole queue fails, the error names every model tried — and **nothing is invented**: a review that didn't happen never looks like one that found nothing wrong.

### 19i. Notifications

`onEssaysWrite` pushes to a closed app: Diogo when an essay is handed in, Ben when the notes come back, Ben when the grade lands, Ben once (never once per topic) when new topics go up, Diogo when Ben suggests a topic, and Ben when that suggestion is answered either way (§19c-1). Diffed by id + status, so the autosaving draft — which writes that doc every second while he types — stays silent.

> Keep this document in sync with any rule change — it is the canonical spec for the app's game rules.
