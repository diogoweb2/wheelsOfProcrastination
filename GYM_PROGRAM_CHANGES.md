# Gym Program — v3.1 → v3.2 delta (final)

Companion to `GYM_PROGRAM.md`, now **v3.2, FROZEN**. Section numbers refer to v3.2.
*(Earlier deltas are in git history.)*

Round 4's verdict was *freeze and build*. All five tightenings are in. One was accepted only
in the form the app can honestly deliver, and that limitation is stated rather than hidden.

**The design is closed.** Nothing further gets added before it ships — no RIR, pain
automation, supersets, extra sessions, extra exercises, extra progression modes, or extra
recovery intelligence.

---

## 1. The five

| # | Asked for | Status |
|---|---|---|
| 1 | Split `anti-rotation` out of `core` in recovery tracking | **In** — §8 |
| 2 | Layer 2 validates six relationships, not two | **In** — §12a |
| 3 | Generator gets a slot spec, not an open question | **In** — §13 |
| 4 | Power: full rest mandatory; still poor → end the exercise | **In** — §7d |
| 5 | Roman chair recommended-vs-optional visually distinct | **In** — §5a |

Plus: **§8e kept** on your recommendation, reworded as you suggested.

---

## 2. The one accepted in modified form

Round 4 asked that extra reps never trigger a load increase *"if form/quality wasn't
successfully logged."*

**The app has no form signal, and inventing one would be dishonest.** There is no field for
it, no way to observe it, and a rule that can never fire is worse than no rule — it reads as
a safeguard while doing nothing.

What does exist is **measured set time**, and `repSecLearned` — your own seconds-per-rep for
that exercise, learned after three logged sets. So the `repHigh` short-circuit is guarded by
pace instead:

> Twenty reps in the time ten normally take is a partial-range set, not a light weight. The
> set logs normally; it just doesn't trigger a load jump.

**Stated limit, in §7a rather than buried:** this is the only quality signal the app actually
has. A set of sloppy reps at an honest tempo will pass. No rule in this document should
pretend otherwise.

---

## 3. Layer 2 grew from two checks to six (§12a)

The most consequential change in v3.2. v3.1 asked only *"does the name match the movement,
given the equipment?"* — necessary, not sufficient.

| # | Relationship | The failure it catches |
|---|---|---|
| 1 | Name ↔ movement | The Pallof check |
| 2 | Equipment ↔ movement | Gear can't produce the movement |
| 3 | `movementPattern` ↔ movement | Mis-slots the exercise **and** corrupts recovery tracking |
| 4 | `primaryRole` ↔ exercise | Prehab tagged `strength` → loaded and progressed like a bench press |
| 5 | `progressionMode` ↔ exercise | External rotation tagged `load` → months of chasing a heavier cuff weight |
| 6 | `riskProfiles` ↔ exercise | Loaded spinal flexion tagged `back: low` — gates what you're *asked to do* |

**3–6 are dangerous precisely because they pass 1 and 2.** `Side-Lying Dumbbell External
Rotation` is a real exercise, correctly named, doable with a dumbbell — and with
`progressionMode: load`, `primaryRole: strength`, `shoulder: low` the generator does exactly
the wrong thing with it, deterministically, forever. That is a worse failure than the Pallof,
because nothing about the row looks wrong.

---

## 4. `anti-rotation` split out of `core` (§8)

Recovery patterns are now nine:

```
press · pull · squat/lunge · hinge · power · shoulder · anti-rotation · core · back-extension
```

A dead bug and a Copenhagen plank are not the same exposure, and it matters here specifically
— G2 is about the lower back, and the anti-rotation work is the part carrying real load.
`back-extension` was already separate for the same reason.

---

## 5. The generator asks a narrower question (§13)

Once §12 gives every row a canonical movement identity, the generator stops asking *"what
exercise would be good here?"* and starts asking:

> **"Fill `pull_horizontal` / `strength` / `back: low` / 4–6 min."**

Constrained lookup against approved metadata, not judgement. Which makes the model less
powerful — the objective, not a side effect.

---

## 6. Power rest, and the roman chair UI

**§7d** — the failure mode is turning a power exercise into conditioning:

> The prescribed rest is a **floor, not a target**. If quality is still poor *after* full
> rest, **end the exercise** — do not add rest and try again.

Two sets of good jumps beat four tired ones, and the grade ignores this exercise anyway, so
stopping early costs nothing.

**§5a** — "available every session" is not "prescribed every session", and the UI has to say
which, or optional quietly becomes required:

> **⭐ Recommended today** — Roman chair 2 × 12–15  *(A and C)*
> **Optional** — Roman chair 2 × 12–15  *(B and D, dimmed)*

---

## 7. §8e kept and reworded

Reworded exactly as suggested — state the fact, don't guess the cause:

> *"Incline press hasn't progressed in 4 appearances. Recovery reductions have prevented
> progression. Consider spacing pressing sessions farther apart."*

The app knows the reductions happened and that progression froze. It does not know why you
are not recovering, and should not imply it does.

---

## 8. The implementation warning, recorded as a constraint (§14)

Round 4's most useful contribution isn't on the list of five. It's this:

> **Do not let the recovery layer grow into a second exercise-selection algorithm.**

Recorded in §14 as a hard constraint on the build, with the hierarchy spelled out:

```
program      → what
recovery     → how much
progression  → next time
stall        → informs only
```

**None of the four may rewrite another.** That single rule is what separates this from the
199-exercise scorer, and it is the thing most likely to erode quietly during implementation —
every individual "just let recovery also pick a substitute" decision looks reasonable in
isolation.

---

## 9. Nothing outstanding

No questions back. Build order is §15; step 1 (`gym:audit` layer 1, pure code, no model) is
worth running regardless, since a clean catalog improves the app that exists today.

Then: bands → generate Court & Core → build → **run it unchanged for 8–12 weeks**. Agreed
that the real test isn't another review round — it's what the pickleball, the back and the
progression numbers say in December.
