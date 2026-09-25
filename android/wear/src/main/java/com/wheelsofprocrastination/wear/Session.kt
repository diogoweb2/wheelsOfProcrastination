package com.wheelsofprocrastination.wear

/**
 * The running session, as the watch needs to READ it.
 *
 * Note what this is not: a model of `GymSession`. The watch never deserialises
 * the session into typed objects and writes those back, because every field it
 * failed to think of would be dropped on the next write — `how`, `why`,
 * `ladder`, `warmup`, the demo, the block ids. The raw `Map` from Firestore is
 * the document, it is what gets mutated, and it is what goes back (see
 * `SessionRepo`). These classes are a read-only VIEW over that map, built fresh
 * on every snapshot, and nothing here is ever the source of a write.
 */

/** One set already logged. */
data class LoggedSet(val reps: Int, val weight: Double?, val sec: Int?)

/** One exercise of the session, as the card needs it. */
data class Exercise(
    val exId: String,
    val name: String,
    val emoji: String,
    /** weight · bodyweight · timed · cardio. A clocked set is measured, never typed. */
    val kind: String,
    val perSide: Boolean,
    val loaded: Boolean,
    val loadPerSide: Boolean,
    /** "band" when the load is a colour rather than a number. */
    val loadKind: String?,
    val benchAngle: Int?,
    val maxHold: Boolean,
    val skipped: Boolean,
    /** The reps asked for, per set — its size IS the number of sets. */
    val planReps: List<Int>,
    val planWeight: Double?,
    /** Per-set weights when the exercise ramps (§18e); null when every set is the same. */
    val planWeights: List<Double>?,
    val restSec: Int,
    val sets: List<LoggedSet>,
) {
    val isClocked: Boolean get() = kind == "timed" || kind == "cardio"
    val setsOwed: Int get() = planReps.size - sets.size
}

/** The session in progress. `raw` is the document; everything else is a view of it. */
data class Session(
    val id: String,
    val minutes: Int,
    val blockSessionName: String?,
    val note: String?,
    val status: String,
    val restUntilMs: Long?,
    val driverId: String?,
    val driverAt: Long?,
    val exercises: List<Exercise>,
)

/**
 * Where the runner is — the Kotlin twin of `livePosition` in
 * `src/logic/gymLive.ts`. Same rule, deliberately the same words: the first
 * exercise that still owes sets, because a logged set is the only record of
 * progress either device has ever had. Nothing here is stored; it is all
 * derived, which is why two clients can never disagree about it.
 */
data class Position(
    val idx: Int,
    val exercise: Exercise?,
    val setNo: Int,
    val reps: Int,
    val weight: Double?,
    val benchAngle: Int?,
    val restSec: Int,
    val done: Boolean,
) {
    /** Human "3 of 4" for the set counter. */
    val setLabel: String get() = "${setNo + 1} of ${exercise?.planReps?.size ?: 1}"
}

fun Session.position(): Position {
    val found = exercises.indexOfFirst { !it.skipped && it.sets.size < it.planReps.size }
    val done = found == -1
    val idx = if (done) maxOf(0, exercises.size - 1) else found
    val ex = exercises.getOrNull(idx)
    val setNo = ex?.sets?.size ?: 0
    val reps = ex?.planReps?.getOrNull(minOf(setNo, ex.planReps.size - 1)) ?: 10

    // What you actually lifted last set beats what was planned: bump the bar up
    // once and every set after it starts there. A RAMP is the exception — it
    // prescribes a weight per set on purpose, and carrying the light one
    // forward would flatten the climb it exists to make.
    val ramped = ex?.planWeights != null && ex.planWeights.size > 1
    val planned = ex?.planWeights?.getOrNull(minOf(setNo, ex.planWeights.size - 1)) ?: ex?.planWeight
    val lastLogged = ex?.sets?.lastOrNull()?.weight
    val weight = if (ramped) planned else (lastLogged ?: planned)

    return Position(
        idx = idx,
        exercise = ex,
        setNo = setNo,
        reps = reps,
        weight = weight,
        benchAngle = ex?.benchAngle,
        restSec = ex?.restSec ?: 60,
        done = done,
    )
}

/** Seconds of rest still to run, or null when this session is not resting. */
fun Session.restLeftSec(now: Long = System.currentTimeMillis()): Int? =
    restUntilMs?.let { ((it - now) / 1000L).toInt() }

/**
 * The four loop bands in the basement, lightest first — mirrors `BANDS` in
 * `src/logic/gym.ts`. The COLOUR is the unit: nothing is printed on the rubber,
 * so a band load is never said without the colour in front of it.
 */
val BANDS = listOf(
    Triple("Yellow", 20.0, 0xFFE0B400.toInt()),
    Triple("Red", 35.0, 0xFFE03131.toInt()),
    Triple("Black", 65.0, 0xFF4A4A4A.toInt()),
    Triple("Purple", 85.0, 0xFF8B3FD1.toInt()),
    Triple("Green", 230.0, 0xFF2F9E44.toInt()),
)

/** The rungs the adjustable dumbbells actually have, in pounds (`DUMBBELL_LB`). */
val DUMBBELL_LB = listOf(
    8.5, 12.0, 15.5, 18.5, 22.0, 25.0, 28.5, 32.0, 35.5, 38.5, 42.0, 45.5, 48.5, 52.0,
    55.5, 58.5, 62.0, 65.0, 68.5, 72.0, 75.0, 78.5, 82.0, 85.5, 88.5, 92.0,
)

/**
 * One notch up or down the ladder this movement actually loads off — never an
 * arithmetic 2.5, because the rack cannot be set to 20 lb and the app never
 * asks for a weight the basement cannot produce.
 */
fun stepLoad(current: Double?, up: Boolean, band: Boolean): Double? {
    val ladder = if (band) BANDS.map { it.second } else DUMBBELL_LB
    if (current == null) return ladder.firstOrNull()
    val i = ladder.indexOfFirst { it >= current - 0.01 }
    val at = if (i == -1) ladder.size - 1 else i
    val next = if (up) at + 1 else at - 1
    return ladder.getOrNull(next.coerceIn(0, ladder.size - 1))
}

/** "Black · 65 lb", "32 lb EACH", "45.5 lb" — a load never said without its unit or its colour. */
fun loadLabel(weight: Double?, loadKind: String?, perSide: Boolean): String {
    if (weight == null) return "—"
    if (loadKind == "band") {
        val band = BANDS.minByOrNull { kotlin.math.abs(it.second - weight) }
        return band?.first ?: fmt(weight)
    }
    return fmt(weight) + " lb" + if (perSide) " EACH" else ""
}

fun fmt(n: Double): String = if (n % 1.0 == 0.0) n.toInt().toString() else n.toString()

/** mm:ss, and it does not stop at zero — going over is allowed and expected. */
fun mmss(seconds: Int): String {
    val s = kotlin.math.abs(seconds)
    return "%d:%02d".format(s / 60, s % 60)
}
