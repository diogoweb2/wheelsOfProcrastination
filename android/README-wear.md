# The watch app (`:wear`)

A **Pixel Watch 3** remote for a running workout. Unlike `:app` — a WebView with
no game logic in it — this is a real client: it reads and writes the same
`profiles/diogo` document the website does, over Wi-Fi/LTE, and **the phone does
not have to be awake**.

## Build and install

The watch has no USB data port of its own; pair it over Wi-Fi first.

```bash
# on the watch: Settings → System → About → tap Build number ×7,
# then Developer options → ADB debugging + Wireless debugging → Pair new device
adb pair <ip>:<pair-port> <6-digit code>
adb connect <ip>:<connect-port>        # both shown by: adb mdns services

cd android
./gradlew :wear:assembleDebug
adb -s <watch-id> install -r wear/build/outputs/apk/debug/wear-debug.apk
```

`adb devices -l` lists ids (the Pixel Watch 3 reports `model:Pixel_Watch_3`).
Signed with the local debug key, like the phone shell. Never published.

## What it shows

Three screens, and which one you get is decided by the session, because that is
what decides it in real life:

| | |
|---|---|
| no session | "Start it on your phone" + which one is next (S3 · Pickleball power) |
| nothing owed | 🏁 done — it ends the session and closes itself in 10 s |
| resting | the countdown, what is up next, **⏭ Skip rest** |
| otherwise | the set: name, weight, reps, bench angle, **▶ START** / **✓ DONE** |

Weight and reps are the only editable numbers, because they are the only two
reality ever disagrees with. Before a set starts, **✎ reps** / **✎ weight**
open a **screen of their own** — the numbers were always tappable, which on a
45 mm watch nobody can see, and ± you press under a dumbbell have to be the
biggest thing in front of you. **✕ cancel** puts back what was prescribed.
Weight steps along the **real rungs** of the dumbbell (`DUMBBELL_LB`) or the
**band colours**, never an arithmetic 2.5; a hold steps in fives.

## The two rules it lives by

**1. Reads are typed, writes are not.** A snapshot is parsed into `Session` for
the screen to draw, but every write starts from the raw `Map` that came off the
wire, changes the two or three keys it means to, and puts the whole thing back.
Deserialising into Kotlin data classes and writing *those* back would silently
drop every field the watch does not model — `how`, `why`, the ladder, the
warm-up, the block ids — and the phone would never know what it lost.

**2. One driver at a time** (§18aa). The website's `commit` writes the *whole*
`gym` object on any change, so two writers is last-write-wins over every
session, block and exercise memory. A running session therefore names its
driver, with a 30 s heartbeat and a 90 s staleness window — a flat watch battery
hands the session back on its own. Both sides have a **Take over** button, and
the watch will not re-claim a session the phone is actively holding.

## Versions are pinned on purpose

`compileSdk 36`, AGP 8.12, and androidx from the compileSdk-36 generation
(compose-bom 2025.12.01, wear-compose 1.5.6). Everything current demands AGP
9.1+ and compileSdk 37, which would mean dragging Gradle, AGP and the working
phone shell along with it. `targetSdk` is what decides runtime behaviour, and 36
is honest on a watch running 37.

## Known rough edges

- **The screen is pinned on** (`FLAG_KEEP_SCREEN_ON`), not Wear ambient mode.
  Ambient dims to a screen that cannot be tapped, which defeats the point. It
  costs battery; a workout is forty minutes.
- The debug APK is ~43 MB (Compose + Firestore, unminified). Fine on a watch
  with 32 GB, but `minifyEnabled` would cut it a lot if it ever matters.
- **Finishing** happens here, but the arithmetic does not. `finish()` writes
  `status: 'done'`, the instant and `finishedBy: "watch"`, and the website banks
  it — Berries, grade, records, ladders, rotation — the next time it opens
  (§18aa). Reimplementing `gymFinish` in Kotlin would be a second copy of the
  app's most subtle three hundred lines, wrong within a month.
