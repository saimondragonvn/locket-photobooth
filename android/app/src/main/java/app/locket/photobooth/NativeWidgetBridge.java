package app.locket.photobooth;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONObject;

/**
 * Exposes window.LocketNativeWidget inside the Android WebView so the React web app
 * can sync auth tokens, push live friend moments to the Home Screen Widget,
 * post native Android system notifications for emote reactions & messages, and
 * trigger Android's native "Add to Home Screen" widget pinning sheet.
 */
public class NativeWidgetBridge {
    private static final String TAG = "NativeWidgetBridge";
    public static final String PREFS_NAME = "locket_widget_prefs";
    public static final String NOTIF_CHANNEL_ID = "locket_alerts";

    private final Context context;
    private final Activity hostActivity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public NativeWidgetBridge(Context context) {
        this.context = context.getApplicationContext();
        this.hostActivity = (context instanceof Activity) ? (Activity) context : null;
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

    @JavascriptInterface
    public void requestNotificationPermission() {
        if (hostActivity instanceof MainActivity) {
            mainHandler.post(() -> ((MainActivity) hostActivity).requestNotificationPermissionIfNeeded());
        }
    }

    @JavascriptInterface
    public void showNotification(String title, String body, String type, String tag) {
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                if (context.checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                        != PackageManager.PERMISSION_GRANTED) {
                    return;
                }
            }
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (nm.getNotificationChannel(NOTIF_CHANNEL_ID) == null) {
                    NotificationChannel ch = new NotificationChannel(
                            NOTIF_CHANNEL_ID,
                            "Thông báo Locket",
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    ch.enableVibration(true);
                    ch.setShowBadge(true);
                    nm.createNotificationChannel(ch);
                }
            }

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int pFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(context, 42, launchIntent, pFlags);

            Notification.Builder builder = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    ? new Notification.Builder(context, NOTIF_CHANNEL_ID)
                    : new Notification.Builder(context);

            builder.setSmallIcon(R.mipmap.ic_launcher)
                    .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher))
                    .setContentTitle(title != null && !title.isEmpty() ? title : "Locket Photobooth")
                    .setContentText(body != null ? body : "")
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .setWhen(System.currentTimeMillis())
                    .setShowWhen(true);

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                builder.setPriority(Notification.PRIORITY_HIGH);
                builder.setDefaults(Notification.DEFAULT_ALL);
            }

            int notifId = (tag != null && !tag.isEmpty())
                    ? (tag.hashCode() & 0x7fffffff)
                    : (int) (System.currentTimeMillis() & 0x7fffffff);
            nm.notify(notifId, builder.build());
        } catch (Exception e) {
            Log.w(TAG, "showNotification error: " + e.getMessage());
        }
    }
}

