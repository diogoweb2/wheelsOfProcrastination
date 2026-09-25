package com.wheelsofprocrastination.wear

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import kotlinx.coroutines.delay

// The Training Deck's palette, as far as a watch needs it. Black background is
// not a style choice on an OLED watch — unlit pixels are the battery.
private val Gold = Color(0xFFFFC53D)
private val Ink = Color(0xFF0B0B0F)
private val Dim = Color(0xFF8A8A96)
private val Card = Color(0xFF1A1A22)
private val Go = Color(0xFF2F9E44)

/**
 * Everything the watch shows, which is deliberately almost nothing.
 *
 * Three screens and no navigation between them — which one you get is decided
 * by the session itself, because that is the only thing that decides it in
 * real life. Resting? The countdown. Not resting? The set. No session? The one
 * line that tells you where to start it.
 */
@Composable
fun WearApp(repo: SessionRepo, alerts: Alerts, onClose: () -> Unit = {}) {
    val session by repo.session.collectAsStateWithLifecycle()
    val nextUp by repo.nextUp.collectAsStateWithLifecycle()
    val connected by repo.connected.collectAsStateWithLifecycle()

    // A second hand for everything on screen. One ticker, not one per screen.
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(250)
        }
    }

    // Hold the session while this app is in front, and let go when it isn't —
    // the phone must not be locked out of its own workout by a watch in a
    // drawer (§18aa).
    LaunchedEffect(session?.id) {
        if (session == null) return@LaunchedEffect
        while (true) {
            repo.claim()
            delay(SessionRepo.DRIVER_BEAT_MS)
        }
    }

    MaterialTheme {
        Box(
            Modifier.fillMaxSize().background(Ink).padding(horizontal = 14.dp),
            contentAlignment = Alignment.Center,
        ) {
            val s = session
            // `finish()` writes `status: 'done'`, the next snapshot is not a
            // RUNNING session, and `session` goes null — which would replace the
            // done screen with "start it on your phone" a second into its own
            // countdown. So once the finish is away this latch holds the screen
            // until it closes itself. One call site, or the countdown would
            // restart the moment the branch changed underneath it.
            var closing by remember { mutableStateOf(false) }
            val over = closing || (s != null && repo.mayDrive() && s.position().done)
            when {
                over -> Done(repo, alerts, onClose) { closing = true }
                s == null -> Idle(nextUp, connected)
                // The phone has it and is still beating. Not an error — it is
                // the same rule in reverse, and taking it back is one tap.
                !repo.mayDrive() -> PhoneHasIt(repo, alerts)
                (s.restLeftSec(now) ?: -1) > 0 -> Rest(s, repo, alerts, now)
                else -> SetScreen(s, repo, alerts, now)
            }
        }
    }
}

/** The phone is driving. One tap takes the session, exactly as the phone's button does. */
@Composable
private fun PhoneHasIt(repo: SessionRepo, alerts: Alerts) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Text("📱", fontSize = 30.sp)
        Spacer(Modifier.height(6.dp))
        Text(
            "Your phone has this one",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(10.dp))
        Button(
            onClick = { alerts.tick(); repo.claim(force = true) },
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Take over", fontSize = 15.sp, fontWeight = FontWeight.Bold) }
    }
}

/**
 * Every set is in. The watch ends it — the phone is not needed for this and
 * never was (§18aa).
 *
 * `repo.finish()` writes the one fact the watch actually knows: that is the end
 * of it, at this instant. The Berries, the grade and the ladders are banked by
 * the website the next time it opens, because that is where those three hundred
 * lines live and where there is a screen big enough to read the report on.
 *
 * **Then it closes itself.** Standing in the basement with a finished workout,
 * the correct amount of watch UI is none — so the screen says so, counts ten
 * seconds out loud, and goes. Ten seconds is long enough to read the line and
 * long enough to press **Stay open** if you want the screen back, which stops
 * the countdown for good rather than merely deferring it.
 */
@Composable
private fun Done(repo: SessionRepo, alerts: Alerts, onClose: () -> Unit, onFinished: () -> Unit) {
    var left by remember { mutableIntStateOf(CLOSE_SEC) }
    var auto by remember { mutableStateOf(true) }

    // Banked once, on arrival, not when the clock runs out — a watch that dies
    // in those ten seconds must still have ended the session.
    LaunchedEffect(Unit) {
        alerts.logged()
        repo.finish()
        onFinished()
    }

    LaunchedEffect(auto) {
        if (!auto) return@LaunchedEffect
        while (left > 0) {
            delay(1000)
            left -= 1
        }
        onClose()
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Text("🏁", fontSize = 30.sp)
        Text("Session done", color = Gold, fontSize = 17.sp, fontWeight = FontWeight.Black)
        Text(
            "Berries and your grade land when you open the app.",
            color = Dim,
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        if (auto) {
            Text("closing in $left", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Button(
                onClick = { alerts.tick(); auto = false },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Stay open", fontSize = 14.sp, fontWeight = FontWeight.Bold) }
        } else {
            Button(
                onClick = { alerts.tick(); onClose() },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("✓  Close", fontSize = 15.sp, fontWeight = FontWeight.Black) }
        }
    }
}

/** No session running. One line, and which one you are walking into. */
@Composable
private fun Idle(nextUp: String?, connected: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("💪", fontSize = 34.sp)
        Spacer(Modifier.height(8.dp))
        Text(
            if (connected) "Start it on your phone" else "Looking for your session…",
            color = Dim,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )
        if (nextUp != null) {
            Spacer(Modifier.height(10.dp))
            Text(
                nextUp,
                color = Gold,
                fontSize = 15.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/**
 * Rest. The clock is the screen.
 *
 * It does not stop at zero — going over is allowed and expected, so it turns
 * gold and counts the other way, exactly as the phone does. Rest ending fires
 * the alert and clears itself; nothing has to be pressed for the session to
 * carry on.
 */
@Composable
private fun Rest(s: Session, repo: SessionRepo, alerts: Alerts, now: Long) {
    val left = s.restLeftSec(now) ?: 0
    val pos = s.position()
    val ex = pos.exercise

    // One warn at ten seconds, one go at zero, each fired once per rest.
    var warned by remember(s.restUntilMs) { mutableStateOf(false) }
    var went by remember(s.restUntilMs) { mutableStateOf(false) }
    LaunchedEffect(left) {
        if (left in 1..10 && !warned) { warned = true; alerts.warn() }
        if (left <= 0 && !went) {
            went = true
            alerts.go()
            ex?.let { repo.endRest(it.exId, it.restSec, it.restSec) }
        }
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Text("REST", color = Dim, fontSize = 11.sp, fontWeight = FontWeight.Black)
        Text(
            mmss(left),
            color = if (left <= 10) Gold else Color.White,
            fontSize = 52.sp,
            fontWeight = FontWeight.Black,
        )
        Spacer(Modifier.height(4.dp))
        if (ex != null) {
            Text(
                "${ex.emoji} ${ex.name}",
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                "${loadLabel(pos.weight, ex.loadKind, ex.loadPerSide)}  ·  ${repsLabel(ex, pos.reps)}",
                color = Dim,
                fontSize = 12.sp,
            )
        }
        Spacer(Modifier.height(10.dp))
        Button(
            onClick = {
                alerts.tick()
                val rested = ((ex?.restSec ?: 60) - left).coerceAtLeast(1)
                ex?.let { repo.endRest(it.exId, rested, it.restSec) }
            },
            modifier = Modifier.fillMaxWidth(),
        ) { Text("⏭  Skip rest", fontSize = 15.sp, fontWeight = FontWeight.Bold) }
    }
}

/**
 * The set you are about to do, or the one you are in.
 *
 * Four things and nothing else: what it is, what goes on the bar, how many, and
 * the one button. The weight and the reps are the only editable numbers on the
 * watch, because they are the only two that reality ever disagrees with.
 */
@Composable
private fun SetScreen(s: Session, repo: SessionRepo, alerts: Alerts, now: Long) {
    val pos = s.position()
    val ex = pos.exercise ?: return

    // Re-armed whenever the exercise or the set number changes: you touch these
    // only when reality differs from the ask, and that difference is the signal.
    var reps by remember(ex.exId, pos.setNo) { mutableIntStateOf(pos.reps) }
    var weight by remember(ex.exId, pos.setNo) { mutableStateOf(pos.weight) }
    var startedAt by remember(ex.exId, pos.setNo) { mutableLongStateOf(0L) }
    var editing by remember(ex.exId, pos.setNo) { mutableStateOf<String?>(null) }

    val working = startedAt > 0L
    val elapsed = if (working) ((now - startedAt) / 1000L).toInt() else 0

    // A clocked hold IS its own duration, so it beeps when it passes the target
    // and keeps counting — hold a 30 s plank for a minute and the minute is
    // what gets logged. The target is the number on THIS screen, not the one
    // the plan asked for: an edited hold whose bell still rang at the old
    // number would be an editor that does nothing.
    var passed by remember(ex.exId, pos.setNo) { mutableStateOf(false) }
    LaunchedEffect(elapsed, reps) {
        if (working && ex.isClocked && !passed && elapsed >= reps) { passed = true; alerts.warn() }
    }

    // A number you are changing gets the WHOLE screen, not a corner of this one.
    // A 45 mm watch has room for one question at a time, and the previous
    // version asked it underneath the exercise name, the set line and a chip
    // row — the ± were the smallest things on a screen you press with a
    // sweaty thumb.
    when (editing) {
        "reps" -> {
            EditScreen(
                title = "${ex.emoji} ${ex.name}",
                subtitle = "set ${pos.setLabel}",
                caption = repsCaption(ex).uppercase(),
                value = repsValue(ex, reps),
                onDown = { alerts.tick(); reps = (reps - stepFor(ex)).coerceAtLeast(1) },
                onUp = { alerts.tick(); reps += stepFor(ex) },
                onSave = { alerts.logged(); editing = null },
                onCancel = { alerts.tick(); reps = pos.reps; editing = null },
            )
            return
        }
        "weight" -> {
            EditScreen(
                title = "${ex.emoji} ${ex.name}",
                subtitle = "set ${pos.setLabel}",
                caption = if (ex.loadKind == "band") "BAND" else "WEIGHT",
                value = loadLabel(weight, ex.loadKind, ex.loadPerSide),
                onDown = { alerts.tick(); weight = stepLoad(weight, false, ex.loadKind == "band") },
                onUp = { alerts.tick(); weight = stepLoad(weight, true, ex.loadKind == "band") },
                onSave = { alerts.logged(); editing = null },
                onCancel = { alerts.tick(); weight = pos.weight; editing = null },
            )
            return
        }
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            "${ex.emoji} ${ex.name}",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            buildString {
                append("set ").append(pos.setLabel)
                ex.benchAngle?.let { append("  ·  🪑 ").append(it).append("°") }
                if (ex.perSide) append("  ·  ↔ each side")
            },
            color = Dim,
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(6.dp))

        when {
            working && ex.isClocked -> Text(
                mmss(elapsed),
                color = if (passed) Go else Color.White,
                fontSize = 46.sp,
                fontWeight = FontWeight.Black,
            )

            else -> Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (ex.loaded) {
                    Cell(
                        value = loadLabel(weight, ex.loadKind, ex.loadPerSide),
                        caption = if (ex.loadKind == "band") "band" else "weight",
                        modifier = Modifier.weight(1f),
                    ) { editing = "weight" }
                }
                Cell(
                    value = if (ex.maxHold) "MAX" else repsValue(ex, reps),
                    caption = repsCaption(ex),
                    modifier = Modifier.weight(1f),
                ) { if (!ex.maxHold) editing = "reps" }
            }
        }

        // The numbers above are tappable and always were — which nobody can see
        // on a watch. So before the set starts, the way to change them is a
        // button that says so. It is gone once the clock is running: mid-set is
        // not when you re-plan the set, it is when you do it.
        if (!working && !ex.maxHold) {
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (ex.loaded) {
                    Pill("✎ ${if (ex.loadKind == "band") "band" else "weight"}", Modifier.weight(1f)) {
                        alerts.tick(); editing = "weight"
                    }
                }
                Pill("✎ ${repsCaption(ex)}", Modifier.weight(1f)) { alerts.tick(); editing = "reps" }
            }
        }

        Spacer(Modifier.height(8.dp))

        Button(
            onClick = {
                if (working) {
                    alerts.logged()
                    val logged = when (ex.kind) {
                        "timed" -> elapsed
                        "cardio" -> maxOf(1, Math.round(elapsed / 60.0).toInt())
                        else -> reps
                    }
                    repo.logSet(ex.exId, logged, weight, elapsed, ex.restSec)
                    startedAt = 0L
                } else {
                    alerts.tick()
                    startedAt = System.currentTimeMillis()
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                if (working) "✓  DONE" else "▶  START",
                fontSize = 17.sp,
                fontWeight = FontWeight.Black,
            )
        }
    }
}

/** One big tappable number with its name under it. */
@Composable
private fun Cell(value: String, caption: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Card)
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            value,
            color = Gold,
            fontSize = 26.sp,
            fontWeight = FontWeight.Black,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(caption, color = Dim, fontSize = 10.sp)
    }
}

/**
 * One number, alone on the screen: what it belongs to, what it is, − and +
 * either side of it, and two ways out.
 *
 * It is a screen rather than a row because the watch has room for exactly one
 * question, and because ± that you press with a thumb under a dumbbell have to
 * be the biggest things in front of you. **Cancel puts back what was
 * prescribed** — an edit you did not mean should cost nothing, and on a wrist
 * it is one bump away.
 */
@Composable
private fun EditScreen(
    title: String,
    subtitle: String,
    caption: String,
    value: String,
    onDown: () -> Unit,
    onUp: () -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Text(
            title,
            color = Dim,
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text("$subtitle  ·  $caption", color = Dim, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Round("−", onDown)
            Text(
                value,
                color = Gold,
                fontSize = 30.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                maxLines = 1,
                modifier = Modifier.weight(1f),
            )
            Round("+", onUp)
        }
        Spacer(Modifier.height(8.dp))
        Button(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
            Text("✓  Save", fontSize = 15.sp, fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "✕ cancel",
            color = Dim,
            fontSize = 12.sp,
            modifier = Modifier
                .clip(RoundedCornerShape(10.dp))
                .clickable(onClick = onCancel)
                .padding(horizontal = 16.dp, vertical = 4.dp),
        )
    }
}

/** A small labelled button. Says out loud what tapping a number already did. */
@Composable
private fun Pill(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Text(
        label,
        color = Color.White,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Card)
            .clickable(onClick = onClick)
            .padding(vertical = 7.dp),
    )
}

@Composable
private fun Round(glyph: String, onClick: () -> Unit) {
    Box(
        Modifier
            .size(46.dp)
            .clip(RoundedCornerShape(23.dp))
            .background(Card)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(glyph, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black) }
}

// --- words --------------------------------------------------------------------

/** How long the done screen waits before it takes itself off your wrist. */
private const val CLOSE_SEC = 10

/**
 * How much one press moves the number. A rep is a rep; a hold is argued about
 * in fives, because nobody has ever wanted a 31-second plank.
 */
private fun stepFor(ex: Exercise): Int = if (ex.kind == "timed") 5 else 1


private fun repsValue(ex: Exercise, reps: Int): String = when (ex.kind) {
    "timed" -> "${reps}s"
    "cardio" -> "$reps"
    else -> "$reps"
}

private fun repsCaption(ex: Exercise): String = when (ex.kind) {
    "timed" -> "hold"
    "cardio" -> "minutes"
    else -> "reps"
}

private fun repsLabel(ex: Exercise, reps: Int): String = when (ex.kind) {
    "timed" -> "${reps}s hold"
    "cardio" -> "$reps min"
    else -> "$reps reps"
}

