# Gym — the Structured Program (v3.2 — FROZEN, build from this)

**Status: NOT IN THE CODE YET.** This is the spec `npm run gym:program` and §18 of
BUSINESS_REQUIREMENTS.md get built from.

**The training design is frozen.** Four review rounds; rounds 3 and 4 asked for no changes to
the program itself, and round 4's verdict was *freeze and build*. Full log in §14.

**Nothing further gets added before it ships** — not RIR, pain automation, supersets, another
session, more exercises, more progression modes, or more recovery intelligence. The next
input is 8–12 weeks of real data.

**v3.2 changelog** — final tightenings, all from round 4:

- Recovery patterns split **anti-rotation out of `core`** (§8).
- Layer 2 of the audit validates **six relationships, not two** (§12a).
- The generator is handed a **slot spec**, not an open question (§13).
- Power sets: **full rest is mandatory**; still poor after it → end the exercise (§7d).
- Roman chair: **recommended vs optional made visually distinct** (§5a).
- §8e reworded to state the fact, not guess the cause. Kept, on the review's recommendation.
- The `repHigh` short-circuit now has a **pace sanity check** (§7a) — with an honest note on
  what the app can and cannot see.

**v3.1 changelog** — pre-implementation fixes:

- **A skipped exposure is not a dropped exercise** (§8c). v3's wording implied the program
  could quietly rewrite itself, which would rebuild the scorer inside the program.
- **The catalog audit is two layers** — deterministic code first, Claude second, a human
  resolves anything uncertain (§12).
- **`timeEstimate` is derived in code, never supplied by the model** (§12). v3 contradicted
  its own "never trusted with a number" rule.
- **"Failure" is defined exactly** (§7a), and exceeding `repHigh` short-circuits to a load
  bump.
- **The power quality cue is shown to you, not just encoded** (§7d).
- **A stall detector** — added by neither review (§8e).

**v3 changelog** — manual load override no longer resets target reps (§7b, v2 was wrong);
three strikes before stepping down (§7a); recovery cannot grant free progression (§8b);
recovery is volume-weighted and self-limiting (§8); catalog audit gates the generator (§12);
roman-chair volume cut to ~4–6 sets/cycle; warm-up adaptive; G2 goal language rewritten.

*v1 → v2 → v3 history is in git and in `GYM_PROGRAM_CHANGES.md`.*

---

## 1. What this replaces

Today the Gym app scores a pool of 199 exercises every time you press start — recovery,
variety, rating, mood, plus a random jitter — and optionally hands the same job to an AI
coach over OpenRouter. The repetition complaint is structural: a scorer drawing from a pool
with a small random term **will** repeat its high scorers, because "days since you last did
it" and "how much do you like it" are slow-moving numbers. It has no memory of a *plan*, so
there is nothing to progress along.

The fix is a **written program**: a fixed, ordered cycle of sessions, generated once against
your actual gear and goals, stored, and followed in order — with progression and recovery
logic layered on top. Boredom is handled by generating a *new* program, not by shuffling.

The architecture in one line:

> **AI generates the structure once. The program owns exercise selection. The progression
> algorithm owns load. Recovery owns dose. You own overrides. The runner stays simple.**

**Out, entirely:** the OpenRouter AI coach, the Coach tab, `aiConfig`, `gymCoach.ts`,
`aiOn`, "🧠 AI trainer / ⚙️ offline plan", `gymFellBack`, the readiness meter. (Item 7.)

**Unchanged:** the runner and its foot button, rest timer, wake lock, sound with the screen
off, per-exercise memory, weight ladder / dumbbell notches, ratings, Berries, Stats, Gear,
demos, the report and its grade. (Item 11.)

---

## 2. Your goals, as the program reads them

| # | Goal | What it buys in the program |
|---|---|---|
| G1 | **Advanced pickleball** | Anti-rotation core strength, single-leg and lateral lower body, rotator-cuff and scapular health, adductors, reactive power, grip. |
| G2 | **Trunk and lumbar endurance plus hip strength, with unnecessary lumbar loading minimised** | Glutes, anti-extension and anti-rotation core, McGill-style spine-sparing work, and back-extension training as an optional finisher. |
| G3 | **Nice chest and abs** | A press at full priority in three of four sessions (a fourth, lighter one when there's time), and a direct core slot in every session. |

**G2's wording changed in v3.** "Stronger lower back support" quietly implies *more back
extensions*, which is not what the evidence says and not what this program does. The goal is
endurance and hip strength while keeping unnecessary load off the lumbar spine.

**No aerobic block** — pickleball is the conditioning (item 9). Jumps are *power*: low reps,
full rest, ended on quality.

---

## 3. The research this is built on

### 3a. Pickleball

The sport is **rotational, lateral and overhead**, and the injuries are shoulder, elbow and
lower back.

- **Rotational power originates at the hips and core and is expressed through the arm.** A
  trunk that can't resist rotation forces the shoulder and elbow to make up the difference.
  That argues for *anti-rotation* work over trunk-twisting volume — a reasonable inference
  from the injury pattern, not a proven mechanism.
- **Multi-planar, single-leg, lateral.** The 2026 systematic review of adult pickleball
  lower-extremity injuries points at rapid directional change and falls, and recommends
  dynamic warm-up and proprioceptive work.
- **Shoulder health is programmed, not hoped for.** External rotation, scaption, prone Y/T
  raises, face pulls, rows. A 2026 meta-analysis supports strengthening for external-rotation
  strength in rotator-cuff-related shoulder pain.
- **Midback mobility and glute activation** are what trainers flag first.
- **Push, pull, hinge, squat, twist, carry** — the patterns a cycle should cover.

### 3b. Lower back (G2)

McGill's Big 3 (curl-up, side plank, bird dog) build spinal stiffness and **endurance** at
far lower lumbar compression than sit-ups or loaded twisting. A 2025 meta-analysis on
isolated lumbar-extension training supports back-extension work for nonspecific low back
pain — which is why the roman chair stays in the program.

**But supporting evidence is not a dose.** That the training helps does not mean 8 sets a
cycle are needed, especially alongside split squats, hip thrusts, lunges, goblet squats,
jumps and pickleball itself. v3 targets **~4–6 sets/cycle** (§5a).

**Consequence:** `Russian Twist`, `Decline Sit-up` and `Dumbbell Side Bend` are flagged
`backRisk` and are **not** used here.

### 3c. Item 6 — cut exercises, or cut sets?

**Answer: cut exercises, keep the sets.**

The 2026 ACSM position stand describes a **dose-response relationship**, not a threshold:
more weekly volume generally produces more hypertrophy up to a point, with benefits around
≥10 sets/week per muscle; strength responds to heavier loads, 2–3 sets, at least twice
weekly. There is no magic minimum. *(v1 asserted a hard 4-set floor. Withdrawn.)*

The operating principle:

> **Use the smallest number of exercises that still allows sufficient weekly volume and
> progression. Do not spread volume thinly across many low-dose exercises.**

**Noted, out of scope:** supersets / antagonist pairing roughly halve session time at equal
volume. The runner is architecturally one-exercise-at-a-time, so this is a UI change, not a
config flag.

---

## 4. Your equipment (item 13)

Read live from Firestore `app/gymCatalog` on 2026-08-23.

| id | Item | Notes as catalogued |
|---|---|---|
| `eq-ea11007d` | 🏋 **Adjustable weight bench** | Bench1000 PRO FITNESS. Backrest and seat independently adjustable; leg attachment with padded rollers. |
| `eq-dec18228` | 🏋 **Flat weight bench** | CAP, flat, stable H-base. |
| `eq-6b040b1d` | 🏋 **Hyperextension bench / roman chair** | Adjustable pad height, fixed foot rollers, fixed decline angle. |
| `eq-7e29076d` | 🏋 **Adjustable dumbbells (pair)** | TRULAP, **8.5 → 92 lb**, notched. |
| `eq-11c7fb07` | 🏋 **Kettlebell** | 37.5 lb, single. |
| `eq-b600e5ea` | 🏀 **Medicine ball** | 10 lb. |
| `eq-fd35329b` | 🏋 **Parallel dip bars** | Yellow, fixed height, foam grips. |
| `eq-9fc3b4f7` | 🏋️ **Pull-up bar** | No notes recorded. |
| **`eq-bands`** | 🎗️ **Resistance bands + door anchor** | **ON ORDER.** First-class equipment as of v3 — see §4b. |

**Still open: the phantom machine.** Five exercises reference `eq-b8a8b13d`, which is not in
the equipment list. The program avoids all five; the §12 audit will resolve it.

### 4a. Why the dumbbell Pallof press was removed

`mv-dumbbell-pallof-press` and `mv-standing-pallof-hold` list only dumbbells. **Neither is a
Pallof press.** The exercise works by resisting a resistance vector anchored *laterally*; a
dumbbell held at the chest produces no lateral moment, so there is nothing to resist. These
are bad rows from the old AI pass. Both are excluded and both are `catalogStatus: retired`
candidates in the §12 audit.

Real anti-rotation with dumbbells means **offset loading** — one side heavier, so gravity
creates the moment the trunk fights: `Bird Dog Row`, `Single-Arm DB Floor Press` and
`Suitcase Hold`. *(`Renegade Row` was the obvious fourth and was retired in the review round:
the TRULAP dumbbells are round-bodied and roll under a plank, so the base is unsafe.)*

### 4b. Bands are first-class equipment (v3)

Two hard gaps, closed for ~$25:

1. **8.5 lb is the floor, not a light weight.** For a side-lying external rotation it is a
   lot — tiny leverage. You *cannot* go lighter with dumbbells. Bands give genuinely light,
   with resistance that rises through range, which suits the cuff.
2. **No anchored lateral resistance at all**, which is what a real Pallof press needs.

Promoted into the approved exercise families (§13): **band Pallof press**, **band Pallof
hold**, **band external rotation**, **band face pull**, **band lateral walk** (glute medius —
directly relevant to lateral court movement).

**Until they are catalogued**, every band slot names a dumbbell fallback, so the program is
runnable today. On arrival: `gym:equipment` → `gym:exercises` → `gym:audit` → `gym:program`.

---

## 5. The program — "Court & Core", a 4-session cycle

### 5a. How it runs (item 12)

**No weekdays.** A loop of 4 sessions in fixed order.

```
… → A → B → C → D → A → B → C → D → …
```

Each session is deliberately **near-full-body**, because your training days are
unpredictable: if you only get in twice this week, a classic split would leave your legs
untrained, whereas here every session hit press-or-pull, lower body and core.

**Session shape:**

```
🔥 warm-up (~2 min, session-specific, in the budget)
   → 5 working exercises (~26 min)
   → 🎁 roman chair bonus (optional, outside the budget)
```

#### The roman chair is a bonus finisher, not the warm-up

**2 × 15 back extensions are working sets, not a warm-up.** Doing them first meant every
squat, hip thrust, lunge and press afterwards ran on pre-fatigued spinal extensors — exactly
the muscles G2 is trying to protect. Moving them to the end removes the problem entirely
rather than shrinking it, and keeps the training effect the 2025 meta-analysis supports.

**In the app:** when the last working exercise is DONE, the finish screen offers
**🎁 Roman chair — 2 × 12–15** before the report. Taking it pays Berries and logs normally;
skipping is not a penalty and does not affect the grade.

**"Available every session" is not "prescribed every session"**, and the UI has to say which
it is, or optional quietly becomes required (v3.2):

> **⭐ Recommended today** — 🎁 Roman chair — 2 × 12–15   *(sessions A and C)*
>
> **Optional** — 🎁 Roman chair — 2 × 12–15   *(sessions B and D, dimmed)*

**Dose changed in v3.** The button appears after **every** session, as you asked — but the
program *targets* ~4–6 sets a cycle, not 8:

- Prescription cut to **2 × 12–15**.
- Two sessions per cycle mark it **recommended** (highlighted); on the other two it is
  present but dimmed.
- Back extension is a recovery-tracked pattern (§8), so taking it on consecutive days dims
  it automatically.

If your back responds well over a few cycles, raise it. Starting at the top of the range
because a meta-analysis exists is not a reason.

**This retires §18e's "Roman chair first, always"** and inverts it to "Roman chair bonus at
the end", ON by default.

### 5b. The warm-up (~2 min, in the budget, adaptive)

**2–4 movements**, one set each, no rest, chosen for what the session is about to ask for.
Roughly 2 minutes; shrinks to ~1 min at the 5 and 10 minute tiers and is never dropped.

**Hard rule: no stretching to fatigue.** The warm-up must leave you feeling better, not
tired. Nothing here counts toward volume, and none of it is graded.

| Session | Warm-up |
|---|---|
| **A** — pressing, rowing | Thoracic rotation · hip mobility · shoulder circles |
| **B** — hinging, lunging | Hip hinge · glute activation · shoulder mobility |
| **C** — jumping | Ankle rocks · calf raises · lateral movement · squat-to-stand |
| **D** — scapular, squatting | Thoracic rotation · scapular activation · hip mobility |

C gets four because it is the session with jumping in it, and the Cureus review is
specifically about rapid directional change.

### 5c. Reading the tables

- **P** = priority; drives the time-scaler (§6). **P1** survives longest, **P3** goes first.
- **Reps are ranges** — that is the progression mechanism (§7).
- `/side` = the app's `perSide` flag: that many *each* side, logged once when both are done.
- **≈** = the app's estimate from `exerciseSeconds()`, replaced by *your measured* pace after
  three logged sets (§9).
- 🎗️ = needs the bands; the fallback runs until they are catalogued.

---

### Session A — Incline press · horizontal pull · unilateral leg

**🔥 Warm-up:** Thoracic rotation → Hip mobility → Shoulder circles

| P | Exercise | id | Sets × reps | Rest | ≈ | Why it's here |
|---|---|---|---|---|---|---|
| 1 | Incline Dumbbell Bench Press | `mv-incline-dumbbell-bench-press` | 3 × 8–12 | 90 s | 5:35 | **G3.** The upper-chest angle is what fills out a chest. Heaviest press of the cycle, done first while you're fresh. |
| 1 | Chest-Supported Dumbbell Row | `mv-chest-supported-dumbbell-row` | 3 × 10–12 | 75 s | 5:30 | **G1 + G3.** Chest on the pad means zero lower-back load, so you get scapular retraction and midback strength without paying for it. Balances the pressing so your shoulders don't roll forward. |
| 1 | 🎗️ Band Pallof Press *(fb: Single-Arm DB Floor Press)* | *pending* / `mv-single-arm-dumbbell-floor-press` | 2 × 10–15 /side | 60 s | 4:30 | **G1 + G2.** Real anti-rotation — the trunk stiffness that lets hip power reach the paddle instead of leaking into your shoulder and elbow. |
| 2 | Dumbbell Bulgarian Split Squat | `mv-dumbbell-bulgarian-split-squat` | 3 × 8–10 /side | 90 s | 7:50 | **G1.** Pickleball is played on one leg. The strength that lets you lunge to a dink and get back, and it exposes the left/right gap a two-leg squat hides. |
| 3 | Dead Bug → Hollow Hold *(staged, §7c)* | `bw-dead-bug` → `mv-hollow-body-hold` | 2 × 12 /side | 45 s | 3:20 | **G2 + G3.** Anti-extension. Builds visible abs and the bracing that stops your lumbar spine hyperextending on an overhead. |

**≈ 29 min.** **🎁 Bonus:** Back Extension 2 × 12–15 — *recommended*

---

### Session B — Flat press · glutes · lateral · rotator cuff

**🔥 Warm-up:** Hip hinge → Glute activation → Shoulder mobility

| P | Exercise | id | Sets × reps | Rest | ≈ | Why it's here |
|---|---|---|---|---|---|---|
| 1 | Dumbbell Bench Press | `mv-dumbbell-bench-press` | 3 × 8–12 | 90 s | 5:35 | **G3.** The flat-press angle, the other half of a complete chest. Dumbbells let each side work independently, which suits a rotational athlete. |
| 1 | Bench Hip Thrust | `mv-bench-hip-thrust` | 3 × 10–15 | 90 s | 6:15 | **G2.** Weak glutes are the most common reason a lower back overworks. Loads them hard with the spine neutral and supported — glute strength with none of a deadlift's back tax. |
| 1 | 🎗️ Band External Rotation *(fb: Side-Lying DB ER)* | *pending* / `mv-side-lying-dumbbell-external-rotation` | 2 × 12–20 /side | 30 s | 3:20 | **G1, insurance.** Direct rotator cuff, and the reason bands were worth buying: your lightest dumbbell is 8.5 lb, which is heavy here. Strict tempo, never near failure. |
| 2 | Dumbbell Lateral Lunge | `mv-dumbbell-lateral-lunge` | 3 × 8–10 /side | 75 s | 6:20 | **G1.** The frontal plane — the direction pickleball actually moves. Loads the adductors and glute medius that decelerate a lateral push-off, where the court injuries happen. |
| 3 | Dip Bar Knee Raise | `mv-dip-bar-knee-raise` | 2 × 10–15 | 60 s | 3:20 | **G3.** Lower abs from a supported hang — no loaded spinal flexion, so it builds the six-pack without the lumbar cost of sit-ups. |

**≈ 27 min.** **🎁 Bonus:** Back Extension 2 × 12–15 — *available*

---

### Session C — Dips · vertical pull · power · adductors

**🔥 Warm-up:** Ankle rocks → Calf raises → Lateral movement → Squat-to-stand

| P | Exercise | id | Sets × reps | Rest | ≈ | Why it's here |
|---|---|---|---|---|---|---|
| 1 | Dips | `mv-dips` | 3 × 6–10 | 90 s | 4:35 | **G3.** The bodyweight chest builder, and the lower-chest/triceps angle the bench sessions don't reach. Ladder-eligible, so it plugs into the rep-ladder game you already like. |
| 1 | Chin-up | `mv-chin-up` | 3 × 5–8 | 120 s | 5:40 | **G1 + G3.** Vertical pull for lats and grip. Grip endurance is quietly a pickleball skill — a tired hand is a loose paddle face. Starts at `mv-negative-pull-up` if the reps aren't there (§7c). |
| 2 | Split Squat Jump | `mv-split-squat-jump` | 3 × 6 *(3/side)* | 90 s | 3:50 | **G1, power — not conditioning.** Fast first step and reactive stiffness. **Ends when height or speed drops, not when the count is reached** (§7d). |
| 2 | Copenhagen Plank *(staged, §7c)* | `mv-copenhagen-plank` | 2 × 15–20 s /side | 60 s | 3:00 | **G1.** Isometric adductor strength — the best-supported single exercise against groin injury in lateral-cutting sport, and pickleball's wide defensive stretch is exactly that. **Starts bent-knee.** |
| 3 | Bird Dog | `bw-bird-dog` | 2 × 6–8 /side | 40 s | 2:50 | **G2.** Straight out of McGill's Big 3. Extensors and glutes firing while the spine stays still — the exact skill your lower back needs. |

**≈ 22 min.** **🎁 Bonus:** Back Extension 2 × 12–15 — *recommended* (most room for it here)

---

### Session D — Scapular health · anti-rotation pull · squat

**🔥 Warm-up:** Thoracic rotation → Scapular activation → Hip mobility

| P | Exercise | id | Sets × reps | Rest | ≈ | Why it's here |
|---|---|---|---|---|---|---|
| 1 | 🎗️ Band Face Pull *(fb: Chest-Supported DB Reverse Fly)* | *pending* / `mv-chest-supported-dumbbell-reverse-fly` | 3 × 12–15 | 60 s | 4:20 | **G1.** The shoulder-health slot promoted into the main program. Rear delts, lower traps and scapular control are what keep an overhead-heavy sport from grinding your cuff down. |
| 1 | Bird Dog Row | `mv-bird-dog-row` | 3 × 8–10 /side | 60 s | 5:40 | **G1 + G2.** Anti-rotation *and* a pull at once — row one arm while refusing to let your hips twist. The closest thing in your catalog to what a forehand asks of your trunk. |
| 2 | Goblet Squat | `mv-goblet-squat` | 3 × 10–15 | 75 s | 6:00 | **G1.** The cycle's two-leg squat. Front-loading forces an upright torso and braced core, so it doubles as trunk work — and depth here is what the low ready-stance is made of. |
| 2 | Dumbbell Floor Press | `mv-dumbbell-floor-press` | 2–3 × 8–12 | 90 s | 5:00 | **G3, deliberately the cycle's optional press.** Shortest range of the four — the floor stops the elbow before the shoulder is stretched, so it is kindest to a cuff that already works hard on court. First cut when time is short. |
| 3 | Side Plank with Leg Raise | `mv-side-plank-with-leg-raise` | 2 × 8–12 /side | 60 s | 3:20 | **G2 + G1.** McGill Big 3 side plank plus glute medius. Lateral trunk stiffness keeps your hips level when you push off sideways. |

**≈ 26 min.** **🎁 Bonus:** Back Extension 2 × 12–15 — *available*

**Why D has no priority press.** Pressing is P1 in A, B and C, and P2 here — so a full
30-minute D gives **up to** four press exposures a cycle, and any shorter D gives three plus
the scapular work. *"Up to"* is precise: recovery-aware dosing (§8) can and should reduce it
further. The program guarantees the **slot**, not the dose. That is a feature.

---

## 6. Time scaling (items 6 and 18)

**Baseline is 30 min.** Picking another number **rewrites the same session** — it never goes
back to the pool. Rule from §3c: **drop exercises from the bottom of the priority list; only
touch sets when there is nothing left to drop.**

| You pick | What runs |
|---|---|
| **45 / 60 min** | Warm-up + all 5, **+1 set** on every P1. At 60, a bonus-pool exercise (§6a) is appended. |
| **30 min** *(default)* | Warm-up + all 5, as written. |
| **25 min** | Warm-up + 4 — drop the P3 finisher. |
| **20 min** | Warm-up + 3 — drop P3 and the lower-ranked P2. |
| **15 min** | Warm-up + the three P1s. |
| **10 min** | Warm-up (1 min) + the two top P1s. |
| **5 min** | Warm-up (1 min) + the top P1 at 2 sets. |

Invariants:

1. **The warm-up is never dropped**, only shortened.
2. **No exercise ever goes below 2 working sets.** A single set is not training; better to
   remove the exercise and give the time to one that keeps its volume.
3. **The roman chair bonus is offered at every tier** — it lives outside the budget.

Which P2 goes first is written into the program per session, so it is deterministic.

### 6a. The bonus pool

"➕ Do more" pulls from a pool attached to the program instead of re-scoring the catalog:
`mv-seated-dumbbell-shoulder-press` (demoted from D — pickleball already supplies overhead
volume), `mv-90-90-hip-switch`, `mv-cossack-squat`, `mv-prone-dumbbell-y-raise`,
`mv-farmer-s-walk`, `mv-dead-hang`, `mv-medicine-ball-chest-pass`, band lateral walk.

---

## 7. Progression

The app already progresses **load** reactively (§18d) and **bodyweight staples** via rep
ladders. What it lacked was progression along the *plan*. That is what rep ranges are for.

### 7a. Double progression, inferred with no new taps

Every loaded and bodyweight exercise stores `repLow`–`repHigh`; per-exercise memory gains
`targetReps`, starting at `repLow`.

**What counts as success (v3.1 — defined exactly):**

> **A session succeeds for an exercise when *every* prescribed working set reaches
> `targetReps`.** Anything else is a failure. A recovery-reduced session (§8b) is **neither**.

So target 10 with sets of 10/10/10 succeeds; 10/10/8 fails; 10/9/9 fails. No partial credit,
no averaging — the rule has to be something you can predict in your head.

1. **Success** → next session `targetReps + 1`. *(8 → 9 → 10 → 11 → 12 → load up, back to 8.)*
2. **`targetReps` passes `repHigh`** → **load up one dumbbell notch**, `targetReps` resets to
   `repLow`. **Short-circuit:** if every set reached `repHigh` or beyond, skip the remaining
   rungs and take the load bump now — grinding out 15 when you were asked for 10 is evidence
   the weight is light, and walking up one rep at a time would waste three sessions.

   **Guarded by pace (v3.2).** The short-circuit is suppressed when the measured set time
   implies reps far faster than your own learned pace for that exercise (`repSecLearned`,
   §18d) — twenty reps in the time ten normally take is a partial-range set, not a light
   weight. It logs normally; it just doesn't trigger a jump. **Honest limit:** this is the
   only quality signal the app actually has. It cannot see your form, and no rule here should
   pretend otherwise — a set of sloppy full-speed reps at an honest tempo will pass.
3. **Failure** → **repeat the same target next session.** Fail again → repeat once more.
   **Third consecutive failure** → `targetReps − 1`; if already at `repLow`, load down one
   notch instead.

**Rule 3 is three strikes, not two.** The app cannot see *why* you missed — bad sleep,
pickleball yesterday, a sore shoulder, or genuinely too much weight all look identical. Two
repeat steps before any reduction stop one bad day from unwinding real progress.

`targetReps` is **per side** on a `perSide` exercise, matching how the runner already logs it.

Everything is inferred from reps and weight the runner already logs. **No effort rating is
asked and no button is added.** The trade — accepted deliberately — is reacting a session or
two slower than an RIR scheme, which is the right price on a runner operated with a foot.

### 7b. Manual override — corrected in v3

**v2 said a hand-set load change resets `targetReps` to `repLow`. That was wrong** and is
withdrawn: it discards real information for no benefit.

> **A manual weight change sets a new baseline load. `targetReps` is unchanged.**

Load 35 lb when the app asked for 30 at × 10, and next session is **35 lb × 10**. Make it and
progression continues from there; miss it and rule 3 handles it. The existing "you corrected
me" nudge from §18d is replaced by this — the two no longer compete for ownership of the
load.

### 7c. Staged exercises

Some exercises progress by **difficulty**. The program stores an ordered stage list:

| Exercise | Stages |
|---|---|
| Copenhagen Plank | bent-knee → mid-shin support → straight-leg |
| Dead Bug → Hollow | dead bug → hollow hold → hollow rock |
| Chin-up | negative → chin-up → weighted |

Advancing requires the top of the range **with no pain and a stable position**, which the app
cannot see — so it *offers* the next stage and you accept. One tap every few weeks.

### 7d. Power exercises are a different animal

Split squat jumps and box jumps carry `progressionMode: quality` and are exempt from
everything above:

- **No double progression.** No rep or load ladder.
- **No fatigue-based volume progression.**
- **No pace grade** and no contribution to the session's time score.
- **Terminated on quality**, whatever the count.
- **Full rest. Never taken near failure.**

**The quality cue is shown to you, not just encoded (v3.1).** "Quality-terminated" is a
useful internal concept and a useless instruction — the app cannot see your jump height, so
you are the sensor. The card reads, in place of a rep target:

> **Stop the set when jump height, landing control, or speed noticeably drops — even at 2 reps.**

Whatever you log is logged without judgement. Progression is height or load, by manual
override only.

**Rest is not the escape hatch (v3.2).** The failure mode is turning a power exercise into a
conditioning one by shortening rest to "get through it", or by stretching rest indefinitely
to chase a rep count.

> **The prescribed rest is a floor, not a target.** If quality is still poor *after* full
> rest, **end the exercise** — do not add rest and try again.

Two sets of good jumps beat four sets of tired ones, and the grade already ignores this
exercise entirely, so stopping early costs nothing.

---

## 8. Recovery-aware dosing

A fixed program's real weakness is not knowing what happened yesterday. `partFatigue()` and
`RECOVERY_HOURS` already exist in [src/logic/gym.ts](src/logic/gym.ts), so this is cheap.

Tracked per **movement pattern**, not body part:

```
press · pull · squat/lunge · hinge · power · shoulder · anti-rotation · core · back-extension
```

**`anti-rotation` split out of `core` in v3.2.** One giant core bucket treats a dead bug and a
Copenhagen plank as the same exposure, which they are not — and it matters here specifically,
because G2 is about the lower back and the anti-rotation work is the part carrying real
load. `back-extension` was already separate for the same reason.

### 8a. The states

**Weighted by volume, not just recency (v3).** Three sets of heavy incline press is not the
same exposure as two sets of floor press, so the score is *sets actually logged* decayed over
`RECOVERY_HOURS`, rather than a bare timestamp.

| State | When | What happens |
|---|---|---|
| 🟢 Green | Recovered | Run as written. |
| 🟡 Yellow | Moderate recent load | **−1 set**; the preview says why. |
| 🔴 Red | Heavy recent load | Drops to **2 sets**, load holds. |

### 8b. Reduced sets never earn a progression step (v3 — my catch, not the reviews')

There is a bug in the naive combination of §7a and §8: if recovery removes a set, then
"all sets completed at `targetReps`" becomes **easier** to satisfy — two sets instead of
three — so a reduced session could trigger a progression step it did not earn, and you would
ratchet up load fastest exactly when you are most fatigued.

> **Any session where recovery reduced an exercise's sets takes no progression step for that
> exercise.** Not up, not down; load unchanged, `targetReps` unchanged. The session logs
> normally and pays normally; it is simply not evidence about whether the prescription got
> easier.

This is what lets the system tell *"I failed the prescription"* apart from *"the app
changed the prescription."* They look identical in the raw log and mean opposite things.

### 8c. A skipped exposure is not a dropped exercise (clarified in v3.1)

Repeatedly training a pattern that never recovers produces junk volume: a 2-set-forever
exercise that fatigues without progressing.

> **If a pattern would be Yellow or Red for a third consecutive session, that exercise is
> skipped *for that session*.** The freed time goes to the next-priority exercise in a
> recovered pattern, or the session is simply shorter — an honest outcome.

**It is skipped, never removed.** The slot is still in the program and comes back at its
normal place next cycle. v3's wording said "dropped", which read as if the program could
quietly rewrite itself — and a program that rewrites itself under load is the exercise
scorer again, wearing a different hat. The written plan stays deterministic: A→B→C→D is
always A→B→C→D, and only the *dose on the day* moves.

The preview says so in words: *"Pressing three sessions running — sitting this one out."*

### 8d. Limits

Never blocks a session, never silently swaps an exercise, never edits the program, and
always shows the full plan plus the reason for any missing set.

### 8e. The stall detector (added by neither review)

§8b and §8c interact in a way worth naming: someone training much faster than they recover
can reach a state where an exercise is *perpetually* reduced or skipped, and therefore
**never takes a progression step at all**. Nothing is broken, no rule misfires — and no
progress happens either, silently.

> **If an exercise has taken no progression step for four consecutive appearances, the Plan
> tab says so:** *"Incline press hasn't progressed in 4 appearances. Recovery reductions have
> prevented progression. Consider spacing pressing sessions farther apart."*

**Reworded in v3.2 to state the fact rather than guess the cause.** The earlier version said
"you're training it faster than you're recovering", which is an inference the app cannot
support — it knows the reductions happened and that progression was frozen, and that is all
it should claim.

Deliberately a **message, not machinery** — no auto-deload, no auto-reschedule. The fix is a
scheduling decision only you can make, and the app's job is to make the stall visible rather
than to paper over it.

---

## 9. What the app learns about time (item 17)

Already there: every set logs **measured wall-clock seconds**, and after three measured sets
the app predicts your pace per rep rather than using a formula.

**New:** the program stores, per session in the cycle, **how long it actually took you** —
total and per exercise.

- After **two** complete runs of Session A, "≈ 29 min" is replaced by *your* number.
- The §6 scaler then cuts against reality, so "give me 20 minutes" becomes honest.
- The Plan tab shows planned vs. actual beside every session.
- A session consistently running >20% over target gets flagged, with an offer to permanently
  drop its P3 slot.

---

## 10. What changes in the app

| Item | Change |
|---|---|
| **1** | Sessions built from `app/gymCatalog.equipment`; no exercise whose gear you don't own or that is retired. |
| **2** | 🔄 **Not this one** stops calling OpenRouter. Every exercise carries **2–3 pre-generated alternatives** (§11) — instant, offline, on-goal. |
| **3** | New tab **📋 Plan** at `/gym/plan` — every program generated, current first, expandable to sessions, exercises, stages and planned-vs-actual times. Replaces 🧠 Coach. |
| **4** | A new program **archives** the old one, never deletes it; any archived program is restorable in one tap. |
| **7** | Delete `gymCoach.ts`, `CoachPanel.tsx`, `app/aiConfig`, `aiOn`, `gymFellBack`, the readiness meter, and the OpenRouter key from the Gear camera flow. |
| **16** | `npm run gym:program` (§13), gated behind `npm run gym:audit` (§12). |
| **17** | Per-session actual-duration logging and planned-vs-actual display. |
| **new** | Warm-up block (§5b), roman-chair bonus button (§5a), double progression (§7), recovery-aware dosing (§8), catalog audit + schema (§12). |
| **11** | Everything else untouched. |

**Routing (CLAUDE.md):** the Plan tab is its own URL, `/gym/plan`; the `coach` tab id is
retired from [src/apps/registry.ts](src/apps/registry.ts).

**§18e is rewritten**: "Roman chair first, always" → "Roman chair bonus at the end", ON by
default; "no warm-up block" → the 2-minute session-specific warm-up.

---

## 11. Replacements (item 2)

Alternatives are generated **with** the program and matched on
**role → movement pattern → target → equipment → risk → time** — not just muscle. That is why
band Pallof falls back to bird dog row: different muscles on paper, same anti-rotation *role*.

| Instead of | Swap to |
|---|---|
| Incline DB Press | Low-Incline DB Press · DB Squeeze Press · Feet-Elevated Push-up |
| Chest-Supported Row | Seal Row · One-Arm DB Row · Inverted Row |
| Band Pallof Press | Bird Dog Row · Single-Arm DB Floor Press · Suitcase Hold |
| Bulgarian Split Squat | DB Split Squat · DB Step-up · Bench Bulgarian Split Squat |
| Dead Bug / Hollow | Bench Knee Tuck · Reverse Crunch · Bird Dog |
| DB Bench Press | Bench Press Neutral Grip · Push-up on Dumbbells · DB Floor Press |
| Bench Hip Thrust | Feet-Elevated Glute Bridge · Single-Leg Glute Bridge · Glute Bridge March |
| Band External Rotation | Prone DB External Rotation · DB Cuban Press · Prone DB W-Raise |
| DB Lateral Lunge | Cossack Squat · DB Curtsy Lunge · Band Lateral Walk |
| Dip Bar Knee Raise | Hanging Knee Raise · Lying Leg Raise · Reverse Crunch |
| Dips | Straight Bar Dip · Feet-Supported Dip · Diamond Push-up |
| Chin-up | Negative Pull-up · Scapular Pull-up · Feet-Elevated Inverted Row |
| Split Squat Jump | Box Jump · Squat Jump · Tuck Jump |
| Copenhagen Plank | Side Plank · Hip Dip Side Plank · Cossack Squat |
| Band Face Pull | Chest-Supported DB Reverse Fly · Prone DB Y-Raise · Seated DB Rear Delt Raise |
| Bird Dog Row | KB Single-Arm Row · Single-Arm DB Floor Press · Suitcase Hold |
| Goblet Squat | KB Goblet Squat · DB Sumo Squat · DB Zercher Squat |
| DB Floor Press | Single-Arm DB Floor Press · DB Squeeze Press · Push-up on Dumbbells |
| Side Plank + Leg Raise | Side Plank · Hip Dip Side Plank · Copenhagen Plank |
| Back Extension *(bonus)* | Single-Leg Back Extension · Superman Hold · Glute Bridge March |

---

## 12. The catalog audit — `npm run gym:audit` (new in v3, and a hard prerequisite)

**The catalog cannot currently be treated as ground truth.** The Pallof discovery proves it:
two rows describe an exercise that is physically impossible with the listed equipment. Since
the generator is *constrained* to the catalog, a bad catalog produces a deterministically bad
program — which is worse than the old random one, because it will be wrong the same way every
time.

**So the audit gates the generator.** `gym:program` refuses to run while any exercise it would
draw on is still `catalogStatus: review`.

### 12a. Two layers, and only one of them is a model

Splitting these matters, because this is **Claude policing Claude-generated historical
data**. If the model both writes and approves, "audited" means nothing.

**Layer 1 — deterministic validation. No model involved.** These are code problems with
right answers, and a model can only add noise:

- exercise ids unique and well-formed; no duplicates
- every referenced equipment id **exists**, is **owned**, is **not retired**
  *(this is the `eq-b8a8b13d` check — pure code, no judgement)*
- every enum value legal: `movementPattern`, `primaryRole`, `laterality`, `progressionMode`,
  `riskProfiles`
- `repLow < repHigh`; rest inside `REST_MIN`–`REST_MAX`; sets ≥ 1
- no impossible combinations — e.g. `perSide` on a `cardio` row, `progressionMode: load` on a
  `bodyweight` row with no loading option
- a `retired` exercise is never referenced as an alternative

Layer 1 failures are **errors**, fixed in code or by hand. They never reach the model.

**Built and run — `scripts/gym-audit.mjs`, `npm run gym:audit`.** It writes nothing: a
validator that repairs things is a validator you stop trusting. First run over the live
catalog (8 equipment, 199 exercises) returned **5 errors and 2 warnings**, and resolved the
phantom machine — see §12d.

**Two spec gaps the audit exposed**, both in `movementPattern`, both found by running it
rather than by reading it:

1. **`anti-rotation` and `back-extension` were missing** (layer 1). §8 tracks recovery on
   both, so there was no way to *derive* an exercise's recovery pattern from its metadata.
2. **`isolation` was missing** (layer 2). A leg extension, a leg curl and a wrist curl fit
   none of the compound patterns, and the model correctly refused to force them — tagging a
   wrist curl `pull` would charge it against the same recovery budget as chin-ups. It flagged
   all three for review rather than guessing, which is the behaviour §12a asks for, and
   adding the value dropped the review rate on the sample from 6/8 to 3/8.

All three are legal values above.

**Layer 2 — semantic audit. This is what a model is for.** It checks **six relationships**,
not two — v3.1 only asked the first two, which is necessary but not sufficient. A row can be
a real exercise, with the right equipment, and still carry metadata that quietly poisons the
generator:

| # | Does it hold? | The failure it catches |
|---|---|---|
| 1 | **Name ↔ physical movement** | *The Pallof check.* The name describes something the body isn't doing. |
| 2 | **Equipment ↔ physical movement** | The listed gear cannot produce the movement. |
| 3 | **`movementPattern` ↔ movement** | A row tagged `pull` that is really a carry — mis-slots it, and corrupts recovery tracking (§8). |
| 4 | **`primaryRole` ↔ exercise** | Prehab work tagged `strength`, so it gets loaded and progressed like a bench press. |
| 5 | **`progressionMode` ↔ exercise** | Side-lying external rotation tagged `load` → the app spends months telling you to chase a heavier cuff weight. |
| 6 | **`riskProfiles` ↔ exercise** | A loaded spinal-flexion move tagged `back: low` — this one gates what you are *asked to do*, so it is the most expensive to get wrong. |

Rows 3–6 are the dangerous ones precisely because they *pass* 1 and 2. `Side-Lying Dumbbell
External Rotation` is a real exercise, correctly named, doable with a dumbbell — and if its
metadata says `progressionMode: load`, `primaryRole: strength`, `shoulder: low`, the
generator will do exactly the wrong thing with it, deterministically, forever.

Output per row:

| Field | Values |
|---|---|
| `catalogStatus` | **approved · review · retired** |
| `auditConfidence` | high · medium · low |
| `auditReason` | free text — *"Pallof press requires laterally anchored resistance; no such source exists in the listed equipment."* |
| `movementPattern` | push · pull · squat · hinge · lunge · lateral · carry · core · **anti-rotation** · **back-extension** · power · mobility · shoulder · **isolation** |
| `primaryRole` | strength · hypertrophy · power · stability · mobility · prehab |
| `riskProfiles` | `{ back, shoulder, knee }` each `low \| moderate \| high` |
| `laterality` | bilateral · unilateral · perSide |
| `progressionMode` | load · reps · duration · difficulty · quality · none |

**A human resolves `review`.** Anything the model marks `review`, or approves at
`confidence: low`, lands in a queue in the Gear tab — name, reason, and three buttons:
approve · retire · edit. Nothing becomes production because a model said so.

**`timeEstimate` is not on that list, deliberately (v3.1).** v3 asked the model for it, which
contradicts this document's own rule that the model is never trusted with a number.
`exerciseSeconds()` already derives duration from sets, reps, rest and kind, and measured
history overrides it after three logged sets (§9). The model supplies the *inputs*; the code
computes the number. Extended as a principle:

> **Claude may suggest metadata. Code owns every number that affects execution** — duration,
> recovery hours, load, progression steps, and any safety flag that gates what you are asked
> to do.

### 12b. The families to scrutinise hardest

The Pallof failure has a shape: exercises whose **defining characteristic is the direction or
source of external resistance**, rather than a body position. A model can describe those
plausibly and wrongly. In priority order:

1. **Anti-rotation** — Pallof press/hold, anti-rotation press, carries. The *direction of
   resistance* is the exercise. Two known bad rows already.
2. **Cable exercises** — fly, row, rotation, face pull, chop, lift. Check none were mapped to
   dumbbells or bands because the movement superficially resembles them.
3. **Machine exercises** — leg extension, leg curl, seated row, lat pulldown, pec deck. The
   phantom `eq-b8a8b13d` sits squarely in this family.
4. **Named shoulder exercises** — Cuban press, Y/T/W raises, scaption, face pull,
   external/internal rotation, Arnold press. Easy to describe plausibly and incorrectly.
5. **Power** — medicine-ball rotational throw, slam, chest pass, bounds, plyo push-up.
   Also verify the **10 lb** medicine ball is appropriate for each; several of these assume a
   heavier, slam-rated ball.

### 12d. What the first layer 1 run found

**5 errors, one root cause. `eq-b8a8b13d` is the adjustable weight bench under a dead id.**

Five exercises — `Leg Extension (seated)`, `Leg Curl (prone)`, `Crunches (decline)`,
`Bench Dips`, `Incline Push-ups` — were created at `2026-08-06T19:14:13`, **eleven minutes
before** `eq-ea11007d` *Adjustable Weight Bench* at `19:25:19`. That is the in-app camera flow
(§18k) minting a provisional id for the bench in front of it, and `npm run gym:equipment`
later re-slugging the same bench from its photo — orphaning the five. Every `how` text says
"the bench", and three describe the padded leg rollers the bench's own notes advertise.

Resolution, by row rather than in bulk — two of the five are duplicates, not orphans:

| Exercise | Action | Why |
|---|---|---|
| Leg Extension (seated) | **repoint** → `eq-ea11007d` | Nothing else in the catalog covers knee extension. |
| Leg Curl (prone) | **repoint** → `eq-ea11007d` | Same — the only hamstring curl you own. |
| Crunches (decline) | **repoint**, then flag to layer 2 | Loaded spinal flexion; `mv-decline-sit-up` is already `backRisk` and this is the same pattern unflagged. A relationship-6 failure (§12a) waiting to happen. |
| Bench Dips | **retire** | Same movement as `bw-dip-chair` (Chair dips). |
| Incline Push-ups | **retire** | Triplicate — `bw-incline-pushup` and `mv-bench-incline-push-up-ladder` both exist. Layer 1's `exercise.sameName` warning caught this independently. |

**2 warnings:** the pull-up bar has no notes, so the exercise generator sees nothing but its
name (§18k — notes are the only thing it reads about gear); and the `Incline push-ups` /
`Incline Push-ups` name collision above, which matters because the generator dedups by name
and would silently drop one.

### 12c. Two schema decisions worth calling out

**`progressionMode` is what makes the generator safe.** Without it nothing stops a model
prescribing "add weight weekly" to a split squat jump, "12 reps" to a Copenhagen plank, or
"chase maximum load" on an external rotation. With it, each slot in §13's template demands a
matching mode and the mismatch is a validation failure, not a judgement call.

**`riskProfiles` replaces the `backRisk` boolean** — graded, and extensible to shoulder and
knee. v1 of the code only needs `back: high` to reproduce today's filter, but the data model
is then ready for the deferred pain-response rule (§14) without a second migration. The
existing `backRisk` field stays as a derived read for one release so nothing breaks.

**Nothing is deleted.** A bad row becomes `retired`, not gone — the audit trail matters, and
a retired exercise still has history attached to it.

---

## 13. `npm run gym:program` (item 16)

```
npm run gym:program                 # generate a new program, make it current
npm run gym:program --dry-run       # print it, write nothing
npm run gym:program --sessions=5    # cycle length (default 4)
npm run gym:program --minutes=30    # baseline (default 30)
npm run gym:program --keep-current  # generate and archive, don't switch
```

1. **Reads `app/gymCatalog`** — equipment, room notes, exercise library. **Refuses to run if
   the §12 audit is incomplete.**
2. **Diffs equipment against the current program.** New gear is named explicitly and must be
   used; retired gear invalidates anything depending on it. (Item 16's "check if I have new
   equipment.")
3. **Reads your goals** from §2 — changing goals means editing one table.
4. **Hands Claude a slot spec, not an open question (sharpened in v3.2).** Once §12 has given
   every row a canonical movement identity, the generator stops asking *"what exercise would
   be good here?"* and starts asking:

   > **"Fill `pull_horizontal` / `strength` / `back: low` / 4–6 min."**

   The model is doing a constrained lookup against approved metadata, not exercising
   judgement — which is the whole point. Every slot below carries that full spec; the
   abbreviated form here shows the shape:

   ```
   warm-up  : 2–4 × { mobility | activation }, matched to the session   [mode: none]
   P1 press : incline press | horizontal press | dip        (A, B, C)   [mode: reps/load]
   P1 pull  : horizontal row | vertical pull | scapular     (all)       [mode: reps/load]
   P1 core  : anti-rotation                                 (A, D)      [mode: reps/duration]
   P2 lower : unilateral squat | lateral lunge | bilateral squat | hip thrust
   P2 other : power [mode: quality] | adductor [difficulty] | optional press
   P3 core  : anti-extension | lateral stability            [duration/difficulty]
   bonus    : back extension
   ```

5. **Validates hard.** Every id exists and is `approved`; every equipment id is owned and not
   retired; no `riskProfiles.back: high` while that brief flag is on; every slot filled from
   its allowed family with a matching `progressionMode`; `repLow < repHigh`; a `why` and 2–3
   alternatives per exercise; estimated duration within ±15% of baseline. Failures are
   repaired deterministically or the run aborts. **The model is never trusted with a number.**
6. **Writes** `app/gymPrograms/{id}`, sets it current, archives the previous.
7. **Prints** the program plus a diff against the old one.

---

## 14. Review log

Two rounds of external review. All PubMed citations offered were verified against NCBI
E-utilities and are real, including the 2026 ACSM position stand and the 2026 pickleball
lower-extremity systematic review — both better sources than v1 used. *(The pickleball review
is in Cureus, which is lightly peer-reviewed; treated as a useful summary, not strong
evidence.)*

**Round 1 → v2.** Accepted: the Pallof invalidation; overstated volume claims; "contrast
training" misused; split squat jump reps; Copenhagen staging; alternatives keyed on role;
generator fills a template; recovery adjusts dose rather than warning; progression needs an
algorithm; back extensions are working sets, not a warm-up. Modified: D's press demoted
rather than deleted; "there is no progression" overstated, since reactive load-stepping and
rep ladders already existed. Superseded: the dynamic-warm-up recommendation, by moving the
roman chair to the end entirely.

**Round 4 → v3.2. Verdict: freeze and build.** No changes to the training program. Accepted,
all five: `anti-rotation` split out of `core` in recovery tracking (§8); Layer 2 validates six
relationships rather than two (§12a); the generator gets a slot spec rather than an open
question (§13); power sets get mandatory full rest with "still poor → end the exercise"
(§7d); roman chair's recommended-vs-optional made visually distinct (§5a). §8e **kept** on
the review's recommendation and reworded to state the fact instead of guessing the cause.

**One item accepted only in the form the app can honour.** Round 4 asked that extra reps
never trigger a load increase "if form/quality wasn't successfully logged". The app has no
form signal and inventing one would be dishonest — so the `repHigh` short-circuit is instead
guarded by **measured pace** against `repSecLearned` (§7a), which is the one quality proxy
that genuinely exists. The limitation is stated in §7a rather than hidden.

**Round 4's implementation warning, recorded because it is the real risk:** do not let the
recovery layer grow into a second exercise-selection algorithm. The hierarchy is strict —
*program decides what · recovery decides how much · progression decides next time · stall
detection only informs* — and none of the four may rewrite another.

**Round 3 → v3.1.** No changes requested to the training program — round 3 was entirely about
preventing subtle bugs and bad catalog data. Accepted, all five: a third Yellow/Red **skips
the exposure, it does not remove the exercise** (§8c); the audit splits into deterministic
validation and semantic review with human resolution (§12a); **`timeEstimate` is derived in
code, not supplied by the model** (§12a — this one caught a contradiction with this
document's own rule); "failure" defined exactly (§7a); the power quality criterion made
user-visible (§7d). Confirmed: `progressionMode` stays per-exercise; §8b is correct as
written; no RIR, no pain-response automation, no supersets, no extra sessions.

**Added by neither review:** §8e, the stall detector — §8b and §8c can combine into an
exercise that never progresses and never complains. Also §7a's `repHigh` short-circuit.

**Round 3's closing advice, recorded because it is right:** run this unchanged for **8–12
weeks**, collect real performance, pain and recovery data, and let that drive v4. Further
sophistication now is more likely to add complexity than training value.

**Round 2 → v3.** Accepted: roman-chair volume cut to ~4–6 sets/cycle (§5a); three strikes
before a progression step down (§7a); **manual override should not reset target reps — v2 was
wrong** (§7b); recovery must be volume-weighted and must not accumulate reduced work forever
(§8a, §8c); bands promoted to first-class equipment (§4b); "up to 4 press exposures" is the
precise claim (§D); power-exercise rules hardened (§7d); warm-up made adaptive with a
no-stretching-to-fatigue rule (§5b); **the catalog audit gates the generator** (§12);
`progressionMode` added (§12); `riskProfiles` replaces the `backRisk` boolean (§12); G2's goal
language rewritten (§2). Confirmed: no RIR in v1.

**Added in v3 by neither review:** §8b — recovery-reduced sets must not earn a progression
step.

**Deferred, and staying deferred:** the pain-response rule ("this hurt my back" retires the
whole movement family) — the §12 schema is built for it, the behaviour waits. RIR. Supersets.
More sessions, more exercises, more elaborate recovery mathematics. All three review rounds
now agree the design is done; the next input should be 8–12 weeks of your own data.

---

## 15. Build order

The audit gates everything, so there is only one legal sequence:

1. **`npm run gym:audit` layer 1** — deterministic validation. Fix what it errors on
   (`eq-b8a8b13d` resolves here).
2. **`npm run gym:audit` layer 2** — semantic pass, then clear the `review` queue by hand.
   §12b says where to look first.
3. **Bands** → `gym:equipment` → `gym:exercises` → re-audit the new rows.
4. **`npm run gym:program`** — generate "Court & Core" from §5.
5. **App changes** (§10) — Plan tab, progression, recovery dosing, warm-up block, roman-chair
   bonus button, and the AI-coach removal.

Steps 1–2 are worth doing even if the rest slips: a clean catalog improves the app that
exists today.

---

## 16. Open questions

1. **Which bands did you order?** Tube-with-handles + door anchor is what the program assumes.
   Flat loop bands work for pull-aparts, external rotation and lateral walks but are awkward
   for a Pallof press without an anchor.
2. **How many chin-ups can you do right now?** Session C prescribes 3 × 5–8; if that's not
   there it starts at negatives and §7c handles the rest.
3. **Which two sessions should mark the roman chair "recommended"?** A and C as written —
   C has the most time spare.
4. **Is `eq-b8a8b13d` real?** The §12 audit will flag it, but you'll know faster than a model
   will.

---

## 17. Sources

- [ACSM Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults — An Overview of Reviews (*Med Sci Sports Exerc*, Apr 2026)](https://pubmed.ncbi.nlm.nih.gov/41843416/)
- [Time-efficient resistance training: a narrative review (Iversen et al., *Sports Medicine* 2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8449772/)
- [Lower Extremity Injuries in Adult Pickleball Players: A Systematic Review (*Cureus*, May 2026)](https://pubmed.ncbi.nlm.nih.gov/42291932/)
- [Isolated lumbar extension strength training for nonspecific low back pain (*Scientific Reports*, Feb 2025)](https://pubmed.ncbi.nlm.nih.gov/39984628/)
- [Addressing Shoulder Weakness in Rotator Cuff-Related Shoulder Pain: Systematic Review with Meta-analysis (2026)](https://pubmed.ncbi.nlm.nih.gov/41620837/)
- [Resistance training frequency and hypertrophy: systematic review and meta-analysis](https://pubmed.ncbi.nlm.nih.gov/30558493/)
- [ACE — Low back exercises: Stuart McGill's Big Three](https://www.acefitness.org/resources/pros/expert-articles/7077/low-back-exercises-stuart-mcgill-s-big-three/)
- [Atlantic PT — Essential exercises for the overhead athlete](https://aptphilly.com/2023/06/19/essential-exercises-for-the-overhead-athlete-prepare-your-shoulder-for-tennis-pickleball-volleyball-baseball-and-softball)
