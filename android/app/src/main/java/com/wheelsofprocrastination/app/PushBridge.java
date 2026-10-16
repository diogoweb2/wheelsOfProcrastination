package com.wheelsofprocrastination.app;

import android.webkit.JavascriptInterface;

/**
 * What the site can see of the shell: `window.WheelsShell` (see src/push.ts).
 *
 * Only the game's own origin is ever loaded in this WebView — anything else is
 * handed to Chrome — and interfaces are not injected into iframes, so this is
 * reachable only by the site itself.
 */
public class PushBridge {

    private final MainActivity activity;

    PushBridge(MainActivity activity) {
        this.activity = activity;
    }

    /** Lets the site tell "running in the shell" from "running in a browser". */
    @JavascriptInterface
    public boolean isShell() {
        return true;
    }

    /** The token FCM last gave us, or null if push was never turned on here. */
    @JavascriptInterface
    public String pushToken() {
        return PushService.cachedToken(activity);
    }

    /** True when Android would actually show a notification from this app. */
    @JavascriptInterface
    public boolean notificationsAllowed() {
        return activity.notificationsAllowed();
    }

    /**
     * 🏫 St. Eugene 7 (§24c) — read a lesson card out loud with Android's own
     * TextToSpeech engine.
     *
     * The site asks for this rather than using `speechSynthesis` because the
     * WebView ships that API as an object that exists, reports no voices and
     * says nothing at all: worse than missing, because feature detection
     * passes. Nothing here costs a token — it is the device's voice.
     */
    @JavascriptInterface
    public void speak(String text, double rate) {
        activity.runOnUiThread(() -> activity.speakAloud(text, (float) rate));
    }

    @JavascriptInterface
    public void stopSpeaking() {
        activity.runOnUiThread(activity::stopSpeaking);
    }

    /** True once the engine is up and has an English voice. */
    @JavascriptInterface
    public boolean canSpeak() {
        return activity.ttsReady();
    }

    /**
     * Asks Android for notification permission if needed, then fetches a token.
     * Answers back through window.__wheelsShellPush(token, error) — one of the
     * two is always null.
     */
    @JavascriptInterface
    public void requestPush() {
        activity.runOnUiThread(activity::startPushRequest);
    }
}
