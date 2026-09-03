# Gym — how progression works, per exercise type

> **Status: current as of 2026-09-02.** This describes what the code actually does, not what
> we would like it to do. Canonical rules live in BUSINESS_REQUIREMENTS.md §18d (what it
> learns), §18e (the warm-up / ramp) and §18m (the training block). Code: `src/logic/gym.ts`
> and `src/logic/gymBlock.ts`.
>
> **If you are an AI reviewing this:** §9 is the standing review record — what an earlier
> review settled, and the two questions still open. Argue with the settled decisions if you
> think they are wrong, but read the reasoning there first. The training context is one 43-year-old recreational athlete, pickleball as the
> sport, a lower-back history, training in a home basement with one adjustable dumbbell
> pair (8.5–92 lb, fixed notches), a bar, bands and a bench. Sessions are 20–40 minutes,
> 2–5 times a week, unpredictable.

---

## 0. The app, in one page

**What it is.** A 💪 Gym sub-app inside *Wheels of Procrastination*, a small family PWA
(React + TypeScript + Firestore, installed on a phone, used at the rack). One athlete's data
lives on their own profile document; nothing is shared between profiles. Finishing work pays
the app's currency (Berries), which is the same currency the household's chores and quests
pay — the gym is one more place to earn it.

**Five tabs**, each at its own URL: **💪 Train** (do the session), **📋 Plan** (read the
programme), **🧱 Blocks** (the only editor), **🏋️ Gear** (equipment and the exercise
catalog), **📊 Stats**.

**No AI at run time.** There was an AI coach; it was removed. Everything in this document is
deterministic, offline TypeScript — no network, no key, no credits, no fallback path to
explain. The exercise catalog is hand-written JSON (61 movements over 11 pieces of gear, each with `kind`,
`loaded`, `perSide`, a default rest, a how-to line and a demo animation); the equipment list
was generated once from photos of the basement.

**The programme is a fixed rotation, not a generator.** The app used to invent a workout
every time, which is pleasant and useless: you never meet the same exercise under the same
conditions twice, so there is nothing to progress. Instead there is a **training block** —
six sessions you walk through in order:

| | Session | Focus |
|---|---|---|
| S1 | 🦵 Lower strength + core | Bulgarian split squat · hip thrust · side plank · calf raise · back extension |
| S2 | 🫸 Upper push + pull | DB bench · chest-supported row · pull-ups · dips · lateral raise · reverse fly |
| S3 | ⚡ Pickleball power + stability | split squat jump · lateral shuffle · KB swing · Copenhagen plank · Pallof press |
| S4 | 🦿 Lower unilateral + posterior chain | reverse lunge · goblet squat · single-leg glute bridge · leg curl · calf raise |
| S5 | 🧗 Upper pull + shoulder health | pull-ups · one-arm row · shoulder press · external rotation · wrist curls |
| S6 | 🏓 Full body + pickleball | step-up · incline press · lat pulldown · rotational press · farmer's carry · med-ball pass |

**The entire scheduling rule is "you do the next one."** No Monday/Wednesday/Friday: the
number of sessions in a week here is 2 to 5 and unpredictable, and every calendar programme
breaks on that. Train twice this week → S1, S2; next week picks up at S3. The rotation is
advanced only by finishing a session with something logged, never by the calendar. A block
is reviewed after **24 finished sessions** and retired at **42** — sessions done, not weeks
owned.

**A slot is a prescription, not a workout.** Each slot in a session says only: which
exercise, how many sets, and a **rep range** (`3 × 8–12`, or seconds for a hold). The low end
is what has to be there for the set to count; the high end is what you chase. Everything
underneath — the weight, the rest, how long a set takes *you*, and now the reps themselves —
is **learned from your own history**. That split is the whole design: **the programme is
fixed, the loading is learned.** This document is about the learned half.

**One question is asked before a session: 20, 30 or 40 minutes.** 30 is as written; 20 drops
exercises off the back (never below three, the main lift never goes); 40 adds one set to each
of the first two movements. It changes how much of the session you do, never which session.

**Running a session is three buttons.** GO → the set is live and the app times it → DONE →
rest counts down and ends itself → 15 s of setup → the next set is live. A set is never typed
in by hand: reps and weight are pre-armed from the prescription and you correct them only
when reality differs — and *that difference is the signal* everything here learns from. At the
end you get a letter grade (A+ … C-) comparing what the session cost you to what it was
supposed to, and the Berries.

**The athlete.** One 43-year-old, pickleball as the sport, a lower-back history (heavy spinal
loading is filtered out), who does not warm up — hence §3's ramp being made of the real
movement rather than a separate warm-up block.

---

## 1. The taxonomy — what decides which ladder an exercise is on

Every exercise in the catalog carries a `kind` and two flags:

| Field | Values | Means |
|---|---|---|
| `kind` | `weight` · `bodyweight` · `timed` · `cardio` | How a set is **counted**: reps, reps, seconds, minutes |
| `loaded` | boolean | Whether there is **iron in your hands**. Redundant on `kind: 'weight'` (loaded by definition) |
| `perSide` | boolean | The number is **per side**: "2 × 15" is fifteen left *and* fifteen right |

`kind` and `loaded` are deliberately independent, because a farmer's carry is measured by
the clock **and** progressed by the dumbbells. The single predicate that matters everywhere
is `isLoaded(e) === (kind === 'weight' || loaded === true)`.

**The routing rule:**

| Exercise | Example | Progresses on | Function |
|---|---|---|---|
| Loaded, counted | DB bench press, one-arm row | **Weight** (+ a ramp-in) | `weightFor` / `rampToTop` |
| Unloaded, counted bodyweight | Pull-ups, dips, push-ups, single-leg glute bridge | **Reps** (2-phase ladder) | `repPlanFor` / `repProgression` |
| Unloaded, clocked | Side plank, Copenhagen plank, a run | **Time** | `holdFor` / `holdSuggestion` |
| Loaded **and** clocked | Farmer's carry, suitcase hold | **Both**, independently | both of the above |
| ⚡ Quality slot (`quality: true`) | Split squat jump, lateral shuffle, KB swing | **Nothing** — deliberately | — |

A movement is never put on two ladders at once. That is the core design rule: a pull-up
that gained a rep *and* a pound would tell you nothing about either.

---

## 2. Weight — for anything loaded

### 2.1 The ladder is the hardware

The basement dumbbell has holes, not a dial, so every suggested weight is snapped onto its
real notches (`DUMBBELL_LB`):

```
8.5 · 12 · 15.5 · 18.5 · 22 · 25 · 28.5 · 32 · 35.5 · 38.5 · 42 · 45.5 · 48.5 ·
52 · 55.5 · 58.5 · 62 · 65 · 68.5 · 72 · 75 · 78.5 · 82 · 85.5 · 88.5 · 92
```

The app never asks for 20 lb, because 20 lb does not exist here. `+`/`−` in the runner walk
one notch. A profile set to **kg** has no notch list and falls back to free 5 % steps of at
least 2.5.

### 2.2 What moves the number

The signal is **what you actually loaded**, compared against what was asked
(`learnFromExercise`):

**The reps say what the weight did, not the dumbbell you picked up.** "Loaded less than
asked" and "that was too heavy" are different statements, and only the second one should move
the number down. Three outcomes:

| What the sets say | Recorded as | Next session asks for |
|---|---|---|
| You didn't finish the exercise | — | unchanged: nothing is learned about the load |
| You did the work | `'same'` | **what you lifted** — whatever you chose, it was right |
| You did the work **and** loaded more than asked | `'up'` | **one notch above** what you lifted |
| You did the work **and** topped the rep range on every working set | `'up'` | **one notch above** what you lifted |
| A working set fell **below 70 %** of its ask | `'down'` | **one notch below** what you lifted |
| Short of the ask, but not by 70 % | `'same'` | the same weight, again |

So choosing 48.5 over an asked 52 and completing every set keeps 48.5 — it does not drop to
45.5 on the theory that you failed. A rep or two down is a day, not a verdict. And 70 % is
the same "that ask was wrong" line the rep and hold ladders use, so all three axes fall back
for the same reason at the same point.

`suggestedWeight` is always set to what you really lifted; `weightFor` then applies the
one-notch extrapolation above. So a single deliberate bump has momentum for exactly one
session, then settles:

```
asked 45.5 → you load 48.5   ('up')     → next asks 52
asked 52   → you load 52     ('same')   → next asks 52
asked 52   → you load 48.5   ('down')   → next asks 45.5
```

First time on a loaded exercise there is **no suggestion at all** — whatever you type
becomes the baseline.

### 2.3 Closing the loop (2026-09-02)

Until this change the weight was the only axis that would not move on its own: reps and
seconds climbed by themselves while the card printed *"add weight next time"* and waited to
be obeyed. Now **the top of the rep range buys the next notch**.

The bump fires only when all three hold:

1. The exercise is **loaded** and counted (a loaded hold progresses on the clock instead).
2. **Every set was logged** — walking away early proves nothing.
3. **Every working set** reached the **top of the rep range**.

"Working set" is doing real work in that last clause. A ramp's opening sets are *prescribed*
at the top of the range on a lighter dumbbell (§3), so counting them would ratchet the weight
up on a warm-up — and requiring them would let a skimped warm-up veto a top set you earned.
Only the sets at the working weight are read: all three of a plain `3 × 8–12`, and just the
last of a ramped one. The whole ramp then moves with the working weight, so
`42 → 45.5 → 48.5` becomes `45.5 → 48.5 → 52`.

**This is the one place in the system where the app asks for something you have not already
done.** Everything else only ever prescribes what you have proved. It is allowed to because
the reversal is one session deep and lands somewhere sane:

```
12·12·12 at 48.5           →  next asks 52        (topped the range)
52 asked, you do 8·8·8 at 48.5  →  next asks 48.5 (you did the work; that weight is right)
52 asked, you do 8·7·7 at 52    →  next asks 52   (short, but not by 70 %)
52 asked, you do 5·4·4 at 52    →  next asks 48.5 (that really was too much)
52 asked, two sets done         →  next asks 52   (nothing learned)
```

---

## 3. The ramp-in — how a loaded exercise opens (2026-09-02)

Before this change, a block session opened on the working weight: set one of the day was
the heaviest thing you would touch, cold. Now the sets climb to it.

**Who gets a ramp** — all three must hold:

1. The exercise is **loaded**, and a working weight is known.
2. Its **primary body part** (`parts[0]`) has not been worked yet in this session.
3. The slot has **3 or more sets** (a two-set accessory keeps both working sets).

⚡ quality slots are never ramped.

**The shape** (`rampToTop`): the last set is the working weight; every set before it steps
**one notch down the rack** and **one rep up**, floored at 55 % of the working weight.

```
DB bench, working 48.5 lb, slot 3 × 8–12
  set 1   42   × 10     groove the path
  set 2   45.5 ×  9     moderate
  set 3   48.5 ×  8     TOP SET
```

A clocked carry ramps on the dumbbells only — 30 s and 31 s are the same hold.

**Why it is per body part, not per exercise:** in S2 the bench ramps (chest, cold) and the
row ramps (back, cold), but the pull-ups after the row do not — the back is warm. Cost is
about one extra minute per warmed group, and no extra sets.

**Two invariants that protect the rest of the system:**

- `plan.weight` stays the **working** weight. Everything that reads one number — the grade,
  the personal records, the up/down-a-notch learning — keeps reading the number the session
  was really about. `plan.weights` (per set) is additive.
- **Walking away before the top set teaches nothing about the load.** An interrupted ramp
  leaves `suggestedWeight` where it was, instead of reading the 42 lb warm-up as
  "that was too heavy" and dropping the working weight a notch.

The runner arms each set with its own prescribed load. (Outside a ramp the rule is the
opposite and stays: whatever you loaded on the last set is armed for the next one, so a
bump you make yourself sticks.)

---

## 4. Reps — for counted bodyweight work (2026-09-02)

The gap this closed: a pull-up has no weight to add and no clock to beat, so `3 × 4–8`
was prescribed as **4 · 4 · 4 forever**. The reps are now the progression.

State is one row per exercise: `repPlan = { sets, total, phase }`. The **shape is derived,
not stored** — spare reps land on the earliest sets, so 14 over three sets is `5 · 5 · 4`.

### 4.1 Phase 1 — volume

- Hit the number on **every set** → the total goes up by **one rep** next session.
- Miss on any set → **the same ask comes back**, unchanged, for as many sessions as it takes.
- Fall below **70 %** of the ask on a set you *did* do → the ask drops to `sets × (worst set)`,
  floored at the slot's `sets × repLow`, so a bad number can never sit there unreachable.
- A set you **never got to** says nothing at all. Stopping a session early never costs you
  the ladder.
- The ceiling is `sets × repHigh` — every set at the top of the block's written range.

Real output, `bw-pullup` at `3 × 4–8`, meeting the ask every time:

```
s1  4·4·4 = 12      s6  6·6·5 = 17      s11  8·7·7 = 22
s2  5·4·4 = 13      s7  6·6·6 = 18      s12  8·8·7 = 23
s3  5·5·4 = 14      s8  7·6·6 = 19      s13  8·8·8 = 24   ← top of the range
s4  5·5·5 = 15      s9  7·7·6 = 20
s5  6·5·5 = 16      s10 7·7·7 = 21
```

### 4.2 Phase 2 — density

Reaching `8 · 8 · 8` triggers it automatically: the same work **spreads over more sets at
fewer reps each**, five sets being the ceiling, and rest is clamped to a strict
**120–180 s**. New total is `newSets × ceil(oldTotal / newSets)` — 24 over 5 sets becomes
`5 × 5 = 25`. Then the one-rep-a-session climb restarts.

### 4.3 Phase 3 — topped out

Density stops at **`sets × (repHigh − 2)`**, and the ladder freezes there for good.

```
s14  5·5·5·5·5 = 25   →   s19  6·6·6·6·6 = 30   ← frozen, ~19 sessions from 4·4·4
```

Forty pull-ups in a session is not strength any more, and the honest next step is **load or
a harder variation**, not more reps. So the card says exactly that ("🎓 Topped out on reps
— the next step is load or a harder variation") and the Plan tab marks the slot
`ready for load`. This keeps the one-ladder-at-a-time rule: the app does not quietly start
progressing something else instead.

### 4.4 Details that matter

- **Per-side counted moves** (single-leg glute bridge) compare the logged number to the ask
  **raw** — both are already per side. (Clocked per-side work halves it; counted does not.
  Getting this wrong walked the ladder to the floor and kept it there.)
- **The 40-minute session** adds a set to the first two movements. That set is logged like
  any other, but what was earned is reps **per set**: the total is rescaled by set count
  before it is asked for again, so one long Tuesday cannot inflate the prescription.
- **The written slot is the floor and its top is the ceiling.** Edit the slot up on the
  Blocks tab and the ladder is pulled up with it; edit it down and the ask comes down.
- Loaded bodyweight work (a weighted pull-up) is **excluded** — it progresses on the weight.

---

## 5. Time — for holds and runs

`suggestedHold` is the exact twin of `suggestedWeight`, in the exercise's own unit (seconds
for `timed`, minutes for `cardio`), and it is **per side**.

- The number that counts is the **minimum across the session's sets** (and across both
  sides), because a prescription has to be something you can repeat — not one heroic set.
- Meet or beat **the top of the range** on every set → `suggestedHold` becomes what you
  held, rounded to 5 s (whole minutes for a run). It only ever goes **up**…
- …except below **70 %** of the ask, which pulls it back down to reality.

In a block, the written range is a **floor, not a ceiling**: the whole range slides up
keeping its width, so `2 × 30–45 s` becomes `2 × 70–85 s` once you have held 70 on both
sides of every set (`holdRange`). The block says what the movement is; your history says
how long.

---

## 6. What gets no progression, on purpose

- **⚡ Quality slots** — split squat jumps, lateral shuffles, med-ball throws, KB swings.
  The set stops the moment height, speed or landing quality goes, whatever the count says.
  Chasing a number on those trains exactly the wrong thing. No rep ladder, no ramp.
- **Rest** is learned but is not progression: `restLearned` is a 60/40 rolling average of
  what you actually took, offered back blended 75/25 with the exercise's default, clamped
  to 15–240 s.
- **Set pace** (`setSecLearned`, `repSecLearned`, 70/30 rolling, trusted after 3 measured
  sets) only makes the session's time estimate yours instead of a formula's.

---

## 7. The other rep ladder — the free planner's game

Off-programme (`gym.ladders`, exercises flagged `ladder: true` — push-ups, pull-ups, dips,
squats) there is a second, older system: five sets that creep up a rep at a time from
`round(max × 0.4)`, `4 4 4 4 4` → `4 5 4 5 4` → `5 5 4 5 4` …, and every **6 cycles** a
🏁 max test — one all-out set — reseeds the whole thing.

**Inside a block session this game is neither read nor written** (fixed 2026-09-02): the
block's slot is the prescription, the ladder flags are stripped so a "max test" banner can
never appear over an ask for `5 · 5 · 4`, and block sets no longer advance `gym.ladders`.
Otherwise a free session months later would start from a rung that was never earned under
these rules.

---

## 8. Where it all lives

```
profiles/{id}.gym.ex[exerciseId] : ExerciseMemory
  suggestedWeight   number     what to put in front of you next (loaded)
  lastWeight        number     what you actually loaded last time
  lastAdjust        up|down|same   how the last suggestion landed
  suggestedHold     number     seconds/minutes to ask for (clocked), per side
  repPlan           {sets,total,phase}   the bodyweight rep ladder
  restLearned       number     rolling average rest actually taken
  setSecLearned / repSecLearned / timedSets    your real pace
  bestReps / bestWeight / timesDone / totalReps / rating
```

Sessions are capped at 220 in the profile doc; the per-exercise memory above is what
matters long-term and is never capped.

**Code map**

| Concern | Where |
|---|---|
| Weight suggestion, notches | `gym.ts` → `weightFor`, `snapLoad`, `stepLoad`, `DUMBBELL_LB` |
| Ramp-in | `gym.ts` → `rampToTop`, `plannedWeight`, `isRamped`; applied in `gymBlock.ts` → `planBlockSession` |
| Rep ladder | `gym.ts` → `repPlanFor`, `repShape`, `repProgression`, `progressesOnReps` |
| Hold ladder | `gym.ts` → `holdFor`, `holdSuggestion`; `gymBlock.ts` → `holdRange` |
| Folding a finished set back in | `gym.ts` → `learnFromExercise` (called per exercise in `useStore.ts`) |
| The block itself | `gymBlock.ts` → `BLOCK_1_SESSIONS`, `planBlockSession`, `fitToLength` |

---

## 9. Review status

An external review of §9's original eight questions came back on 2026-09-02. Five verdicts
were "keep what you have"; three became the changes above. What follows is the standing
record, so the next reviewer argues with decisions rather than re-deriving them.

### Settled — implemented

1. **Double progression is now closed** (§2.3). Topping the range on every working set bumps
   the weight one notch. The reviewer asked for a soft guard and two consecutive top-outs; we
   took the guard (every set logged, every working set at the top) and **declined the two
   consecutive top-outs** — an exercise recurs once per six-session rotation, so at 2–5
   sessions a week that is 3–6 weeks per notch.
2. **What the load did for you is read off the reps** (§2.2), after a second review round.
   The first attempt at stopping bump-and-fall oscillation was notch arithmetic — one notch
   under the ask counts as settling. The second reviewer pointed out that this conflates
   *"completed at a lighter weight"* with *"could not complete the prescribed work"*, and the
   app already has the sets to tell them apart. It now does: finish the work and the weight
   you chose is kept, fall below 70 % and it steps down, don't finish the exercise and
   nothing is learned.
3. **The bodyweight ladder tops out at `sets × (repHigh − 2)`** (§4.3) and says "ready for
   load or a harder variation" instead of climbing to forty pull-ups.
4. **Block sessions no longer feed the free-planner ladder** (§7).

### Settled — deliberately unchanged

5. **Ramp inside the set count** (§3), not an added warm-up set. A 20–40 minute session
   cannot afford an extra set on every compound, and the 40-minute option already adds one
   to the first two movements when there is time for it.
6. **+1 total rep per session** (§4.1), not +1 per set. Conservative suits variable recovery
   and short sessions; the 70 % floor already handles bad days. RPE/RIR was ruled out — it
   would add an input to a system whose whole premise is that you only correct what is wrong.
7. **Notch-based ramp steps with a 55 % floor** (§3), no per-step percentage minimum. The
   hardware is discrete; forcing textbook 20 % jumps would invent weights that do not exist.
8. **Per-side work stays one logged number** (§4.4). Splitting left/right costs UI and a
   decision every set; the weak side already limits what gets logged. Revisit only if a real
   left/right disparity shows up.

### Still open

9. **Nothing ever deloads.** There are no planned light weeks; the only ways down are missing
   the ask (weight) or falling below 70 % (reps and time), plus whatever rest an irregular
   2–5×/week schedule happens to provide. The reviewer's proposal — and the current plan — is
   *not* an automatic deload but a **voluntary lighter pass offered at the 24-session review
   point**: same rotation, one notch down on loaded work and ~85 % of rep and hold targets,
   for one trip round the block, then resume. Open sub-questions: is it offered or defaulted
   on? One rotation or two? And should it reuse the `lazy` mood the Train card already has
   (block sessions currently ignore mood entirely) rather than becoming a new mode?
10. **New, from closing the loop.** The weight bump is the only rule that prescribes an
   unproven load. It is guarded and reversible in one session — but it has never been run
   against a real training block, only simulated. Worth watching for a month: does it climb
   too slowly on the main lifts, where the range's top has to be reached on the one working
   set a ramp leaves? Both reviewers agreed the next useful input is real sessions, not more
   theory.
