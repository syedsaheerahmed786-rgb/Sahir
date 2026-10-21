package in.themerakievent.insiders;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.splashscreen.SplashScreen;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    // Pages on this host stay inside the app; everything else opens in the browser or its own app.
    private static final String HOST = "themerakievent.in";

    private WebView web;
    private SwipeRefreshLayout swipe;
    private ProgressBar progress;
    private View offline;
    private boolean firstPageLoaded;
    private ValueCallback<Uri[]> fileCallback;

    private final ActivityResultLauncher<Intent> filePicker = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(
                            WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData()));
                    fileCallback = null;
                }
            });

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        web = findViewById(R.id.web);
        swipe = findViewById(R.id.swipe);
        progress = findViewById(R.id.progress);
        offline = findViewById(R.id.offline);

        // Keep the splash up until the first page has drawn, so users never see a blank screen.
        splash.setKeepOnScreenCondition(() -> !firstPageLoaded);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());

        swipe.setColorSchemeResources(R.color.meraki_red);
        swipe.setOnRefreshListener(() -> web.reload());
        // Only pull-to-refresh when the page is scrolled to the very top.
        swipe.setOnChildScrollUpCallback((parent, child) -> web.getScrollY() > 0);

        findViewById(R.id.retry).setOnClickListener(v -> {
            offline.setVisibility(View.GONE);
            web.reload();
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (web.canGoBack()) {
                    web.goBack();
                } else {
                    finish();
                }
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
            firstPageLoaded = true;
        } else {
            Uri link = getIntent().getData();
            web.loadUrl(link != null && isInternal(link) ? link.toString() : getString(R.string.start_url));
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri link = intent.getData();
        if (link != null && isInternal(link)) {
            web.loadUrl(link.toString());
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    private static boolean isInternal(Uri uri) {
        String host = uri.getHost();
        String scheme = uri.getScheme();
        return host != null
                && ("https".equals(scheme) || "http".equals(scheme))
                && (host.equals(HOST) || host.endsWith("." + HOST));
    }

    private void openExternally(Uri uri) {
        Intent intent;
        try {
            intent = "intent".equals(uri.getScheme())
                    ? Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME)
                    : new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setComponent(null);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, R.string.no_app, Toast.LENGTH_SHORT).show();
        }
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isInternal(uri)) {
                return false;
            }
            openExternally(uri);
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            firstPageLoaded = true;
            swipe.setRefreshing(false);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                firstPageLoaded = true;
                swipe.setRefreshing(false);
                offline.setVisibility(View.VISIBLE);
            }
        }
    }

    private class Chrome extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progress.setProgress(newProgress);
            progress.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(null);
            }
            fileCallback = callback;
            try {
                filePicker.launch(params.createIntent());
            } catch (ActivityNotFoundException e) {
                fileCallback = null;
                return false;
            }
            return true;
        }
    }
}
