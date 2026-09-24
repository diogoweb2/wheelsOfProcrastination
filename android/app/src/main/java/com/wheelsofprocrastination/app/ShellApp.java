package com.wheelsofprocrastination.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

/**
 * Exists for one reason: the notification channel has to be registered before
 * the first push lands, and a push can wake the process with no Activity in
 * sight. FCM starts the app process before delivering, so this runs in time.
 */
public class ShellApp extends Application {

    /** Also named in the manifest as FCM's default channel, for tray messages. */
    public static final String CHANNEL_ID = "crew_pings";

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, getString(R.string.channel_name), NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription(getString(R.string.channel_description));
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
}
