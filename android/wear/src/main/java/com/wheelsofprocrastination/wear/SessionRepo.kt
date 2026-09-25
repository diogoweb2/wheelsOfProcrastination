package com.wheelsofprocrastination.wear

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/**
 * The watch's half of the session, straight onto `profiles/diogo`.
 *
 * THE RULE THAT MATTERS: reads are typed, writes are not. A snapshot is parsed
 * into `Session` for the screen to draw, but every write starts from the raw
 * `Map` that came off the wire, changes the two or three keys it means to, and
 * puts the whole thing back. Deserialising into a Kotlin data class and writing
 * THAT back would silently drop every field the watch does not model — the
 * `how` text, the `why`, the ladder state, the warm-up, the block ids, the
 * demo — and the phone would never know what it lost.
 *
 * Writes go to the field path `gym.active`, not to `gym`: the website's own
 * `commit` sends the whole `gym` object on any change, and the smaller the
 * watch's write is, the less of that it can ever collide with (§18aa).
 */
class SessionRepo(private val profileId: String = "diogo") {

    private val db by lazy { FirebaseFirestore.getInstance() }
    private val ref by lazy { db.collection("profiles").document(profileId) }

    /** This watch, for as long as it is installed. Its claim on a session (§18aa). */
    val deviceId: String = "watch-" + UUID.randomUUID().toString().take(8)

    private val _session = MutableStateFlow<Session?>(null)
    val session: StateFlow<Session?> = _session

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected

    /** The next block session's name, for the idle screen ("S3 · Pickleball power"). */
    private val _nextUp = MutableStateFlow<String?>(null)
    val nextUp: StateFlow<String?> = _nextUp

    /** The raw `gym.active` map exactly as Firestore last served it. Every write starts here. */
    private var raw: MutableMap<String, Any?>? = null
    private var reg: ListenerRegistration? = null

    /**
     * Sign in FIRST, listen second.
     *
     * The rules are `allow read, write: if request.auth != null`, and
     * `signInAnonymously()` is asynchronous — attaching the listener in the
     * same breath earns a flat PERMISSION_DENIED, and Firestore does not retry
     * a listener it was refused. So the listener is only ever attached from
     * inside the auth callback, and an already-signed-in relaunch goes straight
     * through `currentUser`.
     */
    fun start() {
        val auth = FirebaseAuth.getInstance()
        if (auth.currentUser != null) {
            listen()
            return
        }
        // Same anonymous sign-in the website uses. The rules ask only that the
        // caller be signed in; the PIN is a per-profile UX lock, not a boundary.
        auth.signInAnonymously()
            .addOnSuccessListener { listen() }
            .addOnFailureListener {
                Log.e(TAG, "anonymous sign-in failed", it)
                _connected.value = false
            }
    }

    private fun listen() {
        if (reg != null) return
        reg = ref.addSnapshotListener { snap, err ->
            if (err != null) {
                Log.e(TAG, "snapshot failed", err)
                _connected.value = false
                return@addSnapshotListener
            }
            _connected.value = true
            apply(snap)
        }
    }

    fun stop() {
        reg?.remove()
        reg = null
    }

    @Suppress("UNCHECKED_CAST")
    private fun apply(snap: DocumentSnapshot?) {
        val gym = snap?.get("gym") as? Map<String, Any?>
        _nextUp.value = nextBlockSessionName(gym)
        val active = gym?.get("active") as? Map<String, Any?>
        if (active == null || active["status"] != "running") {
            raw = null
            _session.value = null
            return
        }
        raw = HashMap(active)
        _session.value = parse(active)
    }

    // --- writes ---------------------------------------------------------------

    /**
     * Log a set and drop straight into rest, in ONE write.
     *
     * Two separate writes would be two snapshots and a moment where the phone
     * can see a logged set with no rest running — and a rest that starts a
     * round-trip late is a rest that is short by a round-trip.
     */
    @Suppress("UNCHECKED_CAST")
    fun logSet(exId: String, reps: Int, weight: Double?, sec: Int?, restSec: Int) {
        val active = raw ?: return
        val list = (active["exercises"] as? List<Map<String, Any?>>)?.map { HashMap(it) } ?: return
        val ex = list.firstOrNull { it["exId"] == exId } ?: return

        val sets = ((ex["sets"] as? List<Map<String, Any?>>) ?: emptyList()).toMutableList()
        val one = HashMap<String, Any?>()
        one["reps"] = reps.toLong()
        if (weight != null && weight > 0) one["weight"] = weight
        if (sec != null && sec > 0) one["sec"] = sec.toLong()
        sets.add(one)
        ex["sets"] = sets
        ex["skipped"] = false

        // The session's own clocks, kept exactly as the website keeps them:
        // `workSec` is wall-clock reality, `workTargetSec` is what the plan
        // asked for, and the target only counts the sets actually done.
        if (sec != null && sec > 0) {
            active["workSec"] = num(active["workSec"]) + sec
            active["workTargetSec"] = num(active["workTargetSec"]) + plannedSetSeconds(ex, reps)
        }
        active["exercises"] = list
        // Rest is the gap BETWEEN two pieces of work. There is no gap after the
        // last set of the last exercise, and a 60-second countdown at the end
        // of a workout is a screen asking you to wait for nothing — so the rest
        // only starts when something is still owed.
        active["restUntil"] = if (owesWork(list)) iso(System.currentTimeMillis() + restSec * 1000L) else null
        push(active)
    }

    /** Is any exercise still owed sets? The Kotlin twin of `livePosition().done`. */
    @Suppress("UNCHECKED_CAST")
    private fun owesWork(list: List<Map<String, Any?>>): Boolean = list.any { e ->
        val planned = (e["plan"] as? Map<String, Any?>)?.get("reps") as? List<*>
        val done = (e["sets"] as? List<*>)?.size ?: 0
        e["skipped"] != true && done < (planned?.size ?: 0)
    }

    /**
     * End the session from the wrist (§18aa).
     *
     * It marks the session finished and NOTHING ELSE — no Berries, no grade, no
     * folding into the per-exercise memory. All of that is `gymFinish` in
     * `src/store/useStore.ts`: the rep ladders, the hold ladder, the load
     * verdict, the records, the streak and the block rotation are the most
     * carefully-argued three hundred lines in the app, and a second
     * implementation of them in Kotlin would be wrong within a month.
     *
     * So the watch writes the one fact it actually knows — *that is the end of
     * it, at this instant* — and the website banks it the next time it opens,
     * which is also when there is a screen big enough to show the report. The
     * timestamp means the Body map is already right in the meantime: a session
     * with `finishedAt` stops counting as work happening right now (§18t).
     *
     * The driver goes with it, so nothing has to wait out the 90-second
     * heartbeat before the phone can pick the finished session up.
     */
    fun finish() {
        val active = raw ?: return
        active["status"] = "done"
        active["finishedAt"] = iso(System.currentTimeMillis())
        active["finishedBy"] = "watch"
        active["restUntil"] = null
        active.remove("driver")
        push(active)
    }

    /** Rest is over — bank what it really cost and clear the countdown. */
    @Suppress("UNCHECKED_CAST")
    fun endRest(exId: String, restedSec: Int, targetSec: Int) {
        val active = raw ?: return
        val list = (active["exercises"] as? List<Map<String, Any?>>)?.map { HashMap(it) } ?: return
        val ex = list.firstOrNull { it["exId"] == exId }
        if (ex != null) {
            // several rests inside one exercise average out — what gets learned
            // is "how long does THIS move take him to recover from"
            val had = (ex["restSec"] as? Number)?.toInt()
            ex["restSec"] = if (had != null) Math.round((had + restedSec) / 2.0).toInt().toLong() else restedSec.toLong()
        }
        active["restTotalSec"] = num(active["restTotalSec"]) + restedSec
        active["restTargetSec"] = num(active["restTargetSec"]) + targetSec
        active["exercises"] = list
        active["restUntil"] = null
        push(active)
    }

    /**
     * Claim the session for this watch, or refresh a claim we already hold.
     *
     * `force` is what the phone's "Take over" is on this side: without it, a
     * watch that re-claimed every 30 s regardless would silently steal the
     * session back half a minute after you took it, and the phone's button
     * would look broken rather than merely outvoted.
     */
    fun claim(force: Boolean = false) {
        if (!force && !mayDrive()) return
        val active = raw ?: return
        val driver = mapOf(
            "device" to "watch",
            "id" to deviceId,
            "at" to iso(System.currentTimeMillis()),
        )
        active["driver"] = driver
        // The heartbeat alone goes by its own field path — dragging the whole
        // session up the wire every 30 seconds, from a watch, on battery, is
        // not a thing to do.
        ref.update("gym.active.driver", driver)
    }

    /** Put the session down so the phone can pick it up without waiting out the heartbeat. */
    fun release() {
        raw?.remove("driver")
        ref.update("gym.active.driver", null)
    }

    /** May this watch write right now, or is the phone holding the session? */
    fun mayDrive(): Boolean {
        val s = _session.value ?: return false
        val at = s.driverAt ?: return true
        if (s.driverId == deviceId) return true
        return System.currentTimeMillis() - at >= DRIVER_STALE_MS
    }

    private fun push(active: Map<String, Any?>) {
        ref.update("gym.active", active).addOnFailureListener { Log.e(TAG, "write failed", it) }
    }

    // --- parsing --------------------------------------------------------------

    @Suppress("UNCHECKED_CAST")
    private fun parse(m: Map<String, Any?>): Session {
        val exercises = (m["exercises"] as? List<Map<String, Any?>> ?: emptyList()).map { e ->
            val plan = e["plan"] as? Map<String, Any?> ?: emptyMap()
            Exercise(
                exId = e["exId"] as? String ?: "",
                name = e["name"] as? String ?: "?",
                emoji = e["emoji"] as? String ?: "",
                kind = e["kind"] as? String ?: "weight",
                perSide = e["perSide"] == true,
                loaded = e["loaded"] == true || e["kind"] == "weight",
                loadPerSide = e["loadPerSide"] == true,
                loadKind = e["loadKind"] as? String,
                benchAngle = (e["benchAngle"] as? Number)?.toInt(),
                maxHold = e["maxHold"] == true,
                skipped = e["skipped"] == true,
                planReps = (plan["reps"] as? List<*>)?.mapNotNull { (it as? Number)?.toInt() } ?: emptyList(),
                planWeight = (plan["weight"] as? Number)?.toDouble(),
                planWeights = (plan["weights"] as? List<*>)?.mapNotNull { (it as? Number)?.toDouble() },
                restSec = (plan["restSec"] as? Number)?.toInt() ?: 60,
                sets = (e["sets"] as? List<Map<String, Any?>> ?: emptyList()).map { s ->
                    LoggedSet(
                        reps = (s["reps"] as? Number)?.toInt() ?: 0,
                        weight = (s["weight"] as? Number)?.toDouble(),
                        sec = (s["sec"] as? Number)?.toInt(),
                    )
                },
            )
        }
        val driver = m["driver"] as? Map<String, Any?>
        return Session(
            id = m["id"] as? String ?: "",
            minutes = (m["minutes"] as? Number)?.toInt() ?: 0,
            blockSessionName = m["blockSessionName"] as? String,
            note = m["note"] as? String,
            status = m["status"] as? String ?: "preview",
            restUntilMs = (m["restUntil"] as? String)?.let { parseIso(it) },
            driverId = driver?.get("id") as? String,
            driverAt = (driver?.get("at") as? String)?.let { parseIso(it) },
            exercises = exercises,
        )
    }

    /** "S3 · Pickleball power" for the idle screen — which one you are walking into. */
    @Suppress("UNCHECKED_CAST")
    private fun nextBlockSessionName(gym: Map<String, Any?>?): String? {
        val blocks = gym?.get("blocks") as? List<Map<String, Any?>> ?: return null
        val activeId = gym["activeBlockId"] as? String ?: return null
        val block = blocks.firstOrNull { it["id"] == activeId } ?: return null
        val sessions = block["sessions"] as? List<Map<String, Any?>> ?: return null
        if (sessions.isEmpty()) return null
        val pos = ((gym["blockPos"] as? Number)?.toInt() ?: 0).mod(sessions.size)
        val s = sessions[pos]
        return "S${pos + 1} · ${s["name"] as? String ?: ""}"
    }

    /** What the PLAN expected one set to take — the learned pace it was built on. */
    private fun plannedSetSeconds(ex: Map<String, Any?>, reps: Int): Int {
        val pace = (ex["paceSec"] as? Number)?.toInt()
        if (pace != null) return pace
        val kind = ex["kind"] as? String ?: "weight"
        val base = when (kind) {
            "timed" -> reps
            "cardio" -> reps * 60
            else -> Math.round(reps * 3.5).toInt()
        }
        return if (ex["perSide"] == true) base * 2 else base
    }

    private fun num(v: Any?): Int = (v as? Number)?.toInt() ?: 0

    companion object {
        private const val TAG = "SessionRepo"

        /** Mirrors DRIVER_STALE_MS in src/logic/gymLive.ts. */
        const val DRIVER_STALE_MS = 90_000L

        /** Mirrors DRIVER_BEAT_MS. Comfortably inside the staleness window. */
        const val DRIVER_BEAT_MS = 30_000L

        private val ISO = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }

        /** The same shape `new Date().toISOString()` writes, because the website parses it. */
        fun iso(ms: Long): String = synchronized(ISO) { ISO.format(Date(ms)) }

        fun parseIso(s: String): Long? = try {
            synchronized(ISO) { ISO.parse(s)?.time }
        } catch (_: Exception) {
            null
        }
    }
}
