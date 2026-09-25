package com.wheelsofprocrastination.wear

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent

/**
 * One activity, screen pinned on.
 *
 * `FLAG_KEEP_SCREEN_ON` rather than Wear's ambient mode, deliberately: ambient
 * dims to a low-power screen that cannot be tapped, and the whole point of this
 * app is that the next set is readable and the buttons are live without raising
 * your wrist and waiting. It costs battery. A workout is forty minutes.
 */
class MainActivity : ComponentActivity() {

    private lateinit var repo: SessionRepo
    private lateinit var alerts: Alerts

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        repo = SessionRepo()
        alerts = Alerts(this)
        repo.start()
        // The done screen closes the app when its countdown runs out (§18aa).
        // `finishAndRemoveTask` rather than `finish`: coming back to a finished
        // workout out of the recents list is a screen with nothing on it.
        setContent { WearApp(repo, alerts, onClose = { finishAndRemoveTask() }) }
    }

    override fun onDestroy() {
        repo.stop()
        super.onDestroy()
    }
}

/**
 * Sound and buzz. Both, always — the watch is on your wrist under a dumbbell,
 * and which of the two you actually notice is not something to guess at from
 * here. (Silence the beeps in the watch's own sound settings if the buzz turns
 * out to be enough; nothing in the app depends on either.)
 */
class Alerts(context: Context) {

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    private val tone: ToneGenerator? = try {
        ToneGenerator(AudioManager.STREAM_ALARM, 80)
    } catch (_: Exception) {
        null // a watch with no alarm stream still buzzes
    }

    /** A set went in the book. Short and unmistakable. */
    fun logged() = buzz(longArrayOf(0, 40), ToneGenerator.TONE_PROP_BEEP, 90)

    /** Ten seconds of rest left — get back to the bar. */
    fun warn() = buzz(longArrayOf(0, 30, 90, 30), ToneGenerator.TONE_PROP_BEEP, 120)

    /** Rest is done. Deliberately the loudest thing this app does. */
    fun go() = buzz(longArrayOf(0, 120, 80, 220), ToneGenerator.TONE_PROP_BEEP2, 400)

    /** A button did the thing. Barely there on purpose. */
    fun tick() = buzz(longArrayOf(0, 12), null, 0)

    private fun buzz(pattern: LongArray, toneType: Int?, toneMs: Int) {
        try {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } catch (_: Exception) {
        }
        if (toneType != null) {
            try {
                tone?.startTone(toneType, toneMs)
            } catch (_: Exception) {
            }
        }
    }
}
