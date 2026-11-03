package app.locket.photobooth;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONObject;

/**
 * Exposes window.LocketNativeWidget inside the Android WebView so the React web app
 * can sync auth tokens, push live friend moments to the Home Screen Widget, and
 * trigger Android's native "Add to Home Screen" widget pinning sheet.
 */
public class NativeWidgetBridge {
    private static final String TAG = "NativeWidgetBridge";
    public static final String PREFS_NAME = "locket_widget_prefs";

    private final Context context;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public NativeWidgetBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public boolean isNativeApp() {
        return true;
    }

    @JavascriptInterface
    public void syncSession(String sessionJson) {
        if (sessionJson == null || sessionJson.isEmpty()) return;
        try {
            JSONObject obj = new JSONObject(sessionJson);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putString("session_json", sessionJson)
                    .putString("id_token", obj.optString("idToken", ""))
                    .putString("refresh_token", obj.optString("refreshToken", ""))
                    .putString("local_id", obj.optString("localId", ""))
                    .putString("display_name", obj.optString("displayName", ""))
                    .apply();
            LocketWidgetProvider.triggerUpdateAll(context, true);
        } catch (Exception e) {
            Log.w(TAG, "syncSession error: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public void clearSession() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().clear().apply();
        LocketWidgetProvider.triggerUpdateAll(context, false);
    }

    @JavascriptInterface
    public void updateWidgetMoment(String momentJson) {
        if (momentJson == null || momentJson.isEmpty()) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString("moment_json", momentJson).apply();
            LocketWidgetProvider.triggerUpdateAll(context, false);
        } catch (Exception e) {
            Log.w(TAG, "updateWidgetMoment error: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public void refreshWidgetNow() {
        LocketWidgetProvider.triggerUpdateAll(context, true);
    }

    @JavascriptInterface
    public boolean requestPinWidget(String filterMode) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (filterMode != null && !filterMode.isEmpty()) {
                prefs.edit().putString("filter_mode", filterMode).apply();
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                ComponentName myProvider = new ComponentName(context, LocketWidgetProvider.class);
                if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                    Intent pinnedCallbackIntent = new Intent(context, LocketWidgetProvider.class);
                    pinnedCallbackIntent.setAction("app.locket.photobooth.ACTION_WIDGET_PINNED");
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        flags |= PendingIntent.FLAG_MUTABLE;
                    }
                    PendingIntent successCallback = PendingIntent.getBroadcast(context, 0, pinnedCallbackIntent, flags);
                    boolean requested = appWidgetManager.requestPinAppWidget(myProvider, null, successCallback);
                    if (requested) {
                        LocketWidgetProvider.triggerUpdateAll(context, true);
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "requestPinWidget error: " + e.getMessage());
        }

        mainHandler.post(() -> Toast.makeText(
                context,
                "Nhấn giữ Màn hình chính -> Tiện ích (Widgets) -> Chọn Locket (Your Friends)",
                Toast.LENGTH_LONG
        ).show());
        return false;
    }
}

