# Android shell

A one-Activity WebView wrapped around <https://spinningwheel-6ff51.web.app>.

**Why it exists:** Family Link and Digital Wellbeing can put a schedule and a
daily limit on an *installed app*. They cannot do that to a Chrome bookmark or a
home-screen PWA. So the game stays where it is and this package is what the
tablet's parental controls get a handle on.

It holds no game logic. Nothing here needs updating when the site changes —
deploy the site and the app has it on the next launch.

## Build and install

```bash
cd android
./gradlew assembleRelease
adb -s <device-id> install -r app/build/outputs/apk/release/app-release.apk
```

`adb devices -l` lists device ids. The release APK is signed with the local
debug key (`~/.android/debug.keystore`), so updates install over each other as
long as they are built on the same machine. Never published to Play.

Bump `versionCode` / `versionName` in `app/build.gradle` when shipping a new one.

## What the shell handles

| | |
|---|---|
| Back button | walks the site's history, then exits |
| Gym demo videos | fullscreen, rotation unlocked while playing |
| Gear photos | file picker wired to `<input type="file">` |
| Off-site links | open in Chrome, not inside the app |
| No wifi | navy retry screen instead of Chrome's error page |
| Screen | stays awake while the app is in front (spin and rest timers) |

Locked to portrait, matching the PWA manifest. To allow landscape, drop
`android:screenOrientation` from `app/src/main/AndroidManifest.xml`.

## Known limit

Web push (FCM) does not work inside a WebView, so cross-device pings — Dad
granting a freeze, a sticker trade landing — will not reach the tablet through
this app. In-app banners still work while it is open. Push needs either the
installed PWA or a native FCM integration here.
