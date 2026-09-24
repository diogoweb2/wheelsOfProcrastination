package com.wheelsofprocrastination.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;

/**
 * A shell around https://spinningwheel-6ff51.web.app.
 *
 * The point of it being an app at all: an installed package is something
 * Family Link / Digital Wellbeing can put a schedule and a daily limit on. A
 * bookmark to the same site is not. So this holds no game logic — the site is
 * the app, and this only has to host it honestly: history back, fullscreen
 * video for the gym demos, file picks for gear photos, and a retry screen when
 * the wifi drops.
 */
public class MainActivity extends Activity {

    private static final String APP_HOST = "spinningwheel-6ff51.web.app";
    private static final String START_URL = "https://" + APP_HOST + "/";
    private static final int REQ_FILE_CHOOSER = 1;
    private static final String STATE_WEBVIEW = "webview";

    private WebView web;
    private View offline;
    private FrameLayout fullscreenHost;

    private ValueCallback<Uri[]> pendingFilePick;
    private WebChromeClient chromeClient;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private boolean loadFailed;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        web = findViewById(R.id.web);
        offline = findViewById(R.id.offline);
        fullscreenHost = findViewById(android.R.id.content);
        findViewById(R.id.retry).setOnClickListener(v -> retry());

        applySystemBarInsets(findViewById(R.id.root));

        // Spin timers, rest timers and the gym clock all want the screen awake
        // while the app is in front. It sleeps normally once it is not.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        configureWebView();

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState.getBundle(STATE_WEBVIEW));
        } else {
            web.loadUrl(START_URL);
        }

        // Android 16 ignores the legacy opt-out, so back has to be claimed
        // explicitly or the system just finishes the activity and eats the
        // site's own history.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage + IndexedDB (Firestore cache)
        s.setMediaPlaybackRequiresUserGesture(false); // gym demo loops, Luffy's laugh
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " WheelsOP/1.0");

        web.setBackgroundColor(getResources().getColor(R.color.brand_navy, getTheme()));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        web.setDownloadListener((url, userAgent, disposition, mime, size) -> openExternally(Uri.parse(url)));

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (staysInApp(uri)) return false;
                openExternally(uri);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                loadFailed = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!loadFailed) offline.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // Subresource failures are the service worker's problem, not ours.
                if (request.isForMainFrame()) {
                    loadFailed = true;
                    showOffline();
                }
            }
        });

        chromeClient = new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                fullscreenHost.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                web.setVisibility(View.GONE);
                setSystemBarsVisible(false);
                // A demo video is worth unlocking rotation for; portrait comes back on exit.
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR);
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;
                fullscreenHost.removeView(customView);
                customView = null;
                web.setVisibility(View.VISIBLE);
                setSystemBarsVisible(true);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (pendingFilePick != null) pendingFilePick.onReceiveValue(null);
                pendingFilePick = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE_CHOOSER);
                    return true;
                } catch (ActivityNotFoundException e) {
                    pendingFilePick = null;
                    return false;
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.deny(); // nothing on the site asks for camera or mic
            }
        };
        web.setWebChromeClient(chromeClient);
    }

    /** Links that belong to the game stay inside; everything else is the world's. */
    private boolean staysInApp(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equals("https") || scheme.equals("http"))) return false;
        String host = uri.getHost();
        if (host == null) return false;
        return host.equals(APP_HOST)
                || host.endsWith(".firebaseapp.com")
                || host.endsWith(".firebasestorage.app")
                || host.endsWith(".googleapis.com")
                || host.equals("accounts.google.com");
    }

    private void openExternally(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (ActivityNotFoundException ignored) {
            // No browser, no handler, nothing to do but stay put.
        }
    }

    private void showOffline() {
        offline.setVisibility(View.VISIBLE);
    }

    private void retry() {
        offline.setVisibility(View.GONE);
        loadFailed = false;
        String current = web.getUrl();
        if (current == null || current.startsWith("about:")) {
            web.loadUrl(START_URL);
        } else {
            web.reload();
        }
    }

    private void handleBack() {
        if (customView != null) {
            chromeClient.onHideCustomView();
            return;
        }
        if (web.canGoBack()) {
            web.goBack();
            return;
        }
        finish();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            handleBack();
        } else {
            super.onBackPressed();
        }
    }

    /**
     * Android 15+ draws every app edge to edge. The site's CSS reserves its own
     * safe areas, so the simplest honest answer is to keep the WebView inside
     * the bars and let the navy window background fill the strips.
     */
    private void applySystemBarInsets(View root) {
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(Math.max(bars.left, ime.left), Math.max(bars.top, ime.top),
                        Math.max(bars.right, ime.right), Math.max(bars.bottom, ime.bottom));
                return WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
    }

    @SuppressWarnings("deprecation")
    private void setSystemBarsVisible(boolean visible) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller == null) return;
            if (visible) {
                controller.show(WindowInsets.Type.systemBars());
            } else {
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(visible ? 0
                    : View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (pendingFilePick != null) {
                pendingFilePick.onReceiveValue(
                        WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                pendingFilePick = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        Bundle state = new Bundle();
        web.saveState(state);
        outState.putBundle(STATE_WEBVIEW, state);
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
