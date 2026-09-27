package com.wheelsofprocrastination.app;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * FCM's side of the shell.
 *
 * Messages arrive as a notification payload, so Android draws the tray entry
 * itself while the app is closed — which is the whole point of the exercise.
 * onMessageReceived only fires when the app is already in front, and the site's
 * own in-app banners cover that case, so there is nothing to do there but stay
 * out of the way.
 *
 * The token is the part that matters here: it rotates on its own, and the copy
 * the site saved to Firestore goes stale when it does. Stashing every new token
 * where MainActivity can find it lets the site re-register on next open.
 */
public class PushService extends FirebaseMessagingService {

    private static final String PREFS = "shell";
    private static final String KEY_TOKEN = "fcm_token";

    @Override
    public void onNewToken(@NonNull String token) {
        saveToken(this, token);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        // App is in the foreground; the site is already showing its own banner.
    }

    static void saveToken(Context context, String token) {
        prefs(context).edit().putString(KEY_TOKEN, token).apply();
    }

    /** The last token FCM handed us, or null before the first one arrives. */
    static String cachedToken(Context context) {
        return prefs(context).getString(KEY_TOKEN, null);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
