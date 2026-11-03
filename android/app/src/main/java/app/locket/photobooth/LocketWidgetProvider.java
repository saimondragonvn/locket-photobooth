package app.locket.photobooth;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Home Screen Widget Provider for Locket Photobooth ("Your Friends" live photo widget).
 *
 * Supports two visual states:
 * 1. Default / Empty State: Dark rounded card with gold-bordered circle, white heart icon,
 *    and "Your Friends" label (matching the Locket widget picker preview).
 * 2. Live Friend Photo State: Rounded square friend photo with circular friend avatar badge,
 *    friend display name, optional caption pill, and one-tap refresh button.
 */
public class LocketWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "LocketWidgetProvider";
    private static final String ACTION_REFRESH = "app.locket.photobooth.ACTION_REFRESH_WIDGET";
    private static final String ACTION_PINNED = "app.locket.photobooth.ACTION_WIDGET_PINNED";
    private static final String UPSTREAM_API = "https://locket.elingo.app";
    private static final String VERCEL_ORIGIN = "https://locket-file.vercel.app";

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        triggerUpdateAll(context, true);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        if (ACTION_REFRESH.equals(action)) {
            Toast.makeText(context, "Đang làm mới ảnh bạn bè trên Locket...", Toast.LENGTH_SHORT).show();
            triggerUpdateAll(context, true);
        } else if (ACTION_PINNED.equals(action)) {
            Toast.makeText(context, "Đã thêm tiện ích Locket vào Màn hình nền!", Toast.LENGTH_SHORT).show();
            triggerUpdateAll(context, true);
        }
    }

    public static void triggerUpdateAll(final Context context, final boolean fetchNetwork) {
        final Context appCtx = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            try {
                if (fetchNetwork) {
                    fetchLatestFeedMomentIfPossible(appCtx);
                }
                renderAllWidgets(appCtx);
            } catch (Exception e) {
                Log.w(TAG, "triggerUpdateAll failed: " + e.getMessage());
            }
        });
    }

    private static void renderAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (manager == null) return;
        ComponentName provider = new ComponentName(context, LocketWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids == null || ids.length == 0) return;

        SharedPreferences prefs = context.getSharedPreferences(NativeWidgetBridge.PREFS_NAME, Context.MODE_PRIVATE);
        String momentJsonStr = prefs.getString("moment_json", null);

        Bitmap photoBitmap = null;
        Bitmap avatarBitmap = null;
        String authorName = "Your Friends";
        String caption = "";

        if (momentJsonStr != null && !momentJsonStr.isEmpty()) {
            try {
                JSONObject moment = new JSONObject(momentJsonStr);
                String imageUrl = moment.optString("imageUrl", "");
                String avatarUrl = moment.optString("authorAvatar", "");
                authorName = moment.optString("authorName", "Your Friends");
                caption = moment.optString("caption", "");

                if (!imageUrl.isEmpty()) {
                    Bitmap rawPhoto = loadOrDownloadBitmap(context, imageUrl, "widget_latest_photo.jpg", 640);
                    if (rawPhoto != null) {
                        photoBitmap = makeRoundedSquareBitmap(rawPhoto, 512, 72f);
                    }
                }
                if (!avatarUrl.isEmpty()) {
                    Bitmap rawAvatar = loadOrDownloadBitmap(context, avatarUrl, "widget_latest_avatar.jpg", 128);
                    if (rawAvatar != null) {
                        avatarBitmap = makeCircularBitmap(rawAvatar, 64);
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed parsing moment_json: " + e.getMessage());
            }
        }

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent launchPending = PendingIntent.getActivity(context, 100, launchIntent, piFlags);

        Intent refreshIntent = new Intent(context, LocketWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPending = PendingIntent.getBroadcast(context, 101, refreshIntent, piFlags);

        for (int widgetId : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.locket_widget);
            views.setOnClickPendingIntent(R.id.widget_root, launchPending);
            views.setOnClickPendingIntent(R.id.widget_refresh_btn, refreshPending);

            if (photoBitmap != null) {
                views.setViewVisibility(R.id.widget_empty_box, View.GONE);
                views.setViewVisibility(R.id.widget_photo, View.VISIBLE);
                views.setImageViewBitmap(R.id.widget_photo, photoBitmap);

                views.setViewVisibility(R.id.widget_author_pill, View.VISIBLE);
                views.setTextViewText(R.id.widget_author_name, authorName);

                if (avatarBitmap != null) {
                    views.setViewVisibility(R.id.widget_author_avatar, View.VISIBLE);
                    views.setImageViewBitmap(R.id.widget_author_avatar, avatarBitmap);
                } else {
                    views.setViewVisibility(R.id.widget_author_avatar, View.GONE);
                }

                if (caption != null && !caption.trim().isEmpty()) {
                    views.setViewVisibility(R.id.widget_caption, View.VISIBLE);
                    views.setTextViewText(R.id.widget_caption, caption.trim());
                } else {
                    views.setViewVisibility(R.id.widget_caption, View.GONE);
                }
            } else {
                views.setViewVisibility(R.id.widget_photo, View.GONE);
                views.setViewVisibility(R.id.widget_author_pill, View.GONE);
                views.setViewVisibility(R.id.widget_caption, View.GONE);
                views.setViewVisibility(R.id.widget_empty_box, View.VISIBLE);
                views.setTextViewText(R.id.widget_empty_title, "Your Friends");
            }

            manager.updateAppWidget(widgetId, views);
        }
    }

    private static void fetchLatestFeedMomentIfPossible(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(NativeWidgetBridge.PREFS_NAME, Context.MODE_PRIVATE);
        String idToken = prefs.getString("id_token", "");
        String refreshToken = prefs.getString("refresh_token", "");
        String meUid = prefs.getString("local_id", "");
        String filterMode = prefs.getString("filter_mode", "friends");

        if ((idToken == null || idToken.isEmpty()) && (refreshToken == null || refreshToken.isEmpty())) {
            return;
        }

        try {
            JSONObject feedResp = postJson(UPSTREAM_API + "/locket/feed", new JSONObject().put("limit", 20), idToken);
            if (feedResp == null && refreshToken != null && !refreshToken.isEmpty()) {
                JSONObject refreshed = postJson(
                        UPSTREAM_API + "/locket/refresh",
                        new JSONObject().put("refreshToken", refreshToken),
                        null
                );
                if (refreshed != null) {
                    String newToken = refreshed.optString("id_token", refreshed.optString("idToken", ""));
                    String newRefresh = refreshed.optString("refresh_token", refreshed.optString("refreshToken", refreshToken));
                    if (!newToken.isEmpty()) {
                        idToken = newToken;
                        prefs.edit()
                                .putString("id_token", newToken)
                                .putString("refresh_token", newRefresh)
                                .apply();
                        feedResp = postJson(UPSTREAM_API + "/locket/feed", new JSONObject().put("limit", 20), idToken);
                    }
                }
            }

            if (feedResp == null) return;
            JSONArray items = feedResp.optJSONArray("items");
            JSONObject users = feedResp.optJSONObject("users");
            if (items == null || items.length() == 0) return;

            JSONObject chosen = null;
            if ("friends".equals(filterMode) && meUid != null && !meUid.isEmpty()) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject it = items.optJSONObject(i);
                    if (it != null && !it.optString("thumbnail_url", "").isEmpty()) {
                        String u = it.optString("user", "");
                        if (!u.isEmpty() && !u.equals(meUid)) {
                            chosen = it;
                            break;
                        }
                    }
                }
            }
            if (chosen == null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject it = items.optJSONObject(i);
                    if (it != null && !it.optString("thumbnail_url", "").isEmpty()) {
                        chosen = it;
                        break;
                    }
                }
            }
            if (chosen == null) return;

            String uid = chosen.optString("user", "");
            String authorName = "Your Friends";
            String authorAvatar = "";
            if (users != null && !uid.isEmpty()) {
                JSONObject uObj = users.optJSONObject(uid);
                if (uObj != null) {
                    String first = uObj.optString("first_name", "").trim();
                    String last = uObj.optString("last_name", "").trim();
                    String combined = (first + " " + last).trim();
                    authorName = !combined.isEmpty() ? combined : uObj.optString("username", "Your Friends");
                    authorAvatar = uObj.optString("profile_picture_url", "");
                }
            }
            if (uid.equals(meUid) && "Your Friends".equals(authorName)) {
                authorName = "Bạn";
            }

            JSONObject momentPayload = new JSONObject();
            momentPayload.put("id", chosen.optString("id", ""));
            momentPayload.put("user", uid);
            momentPayload.put("imageUrl", chosen.optString("thumbnail_url", ""));
            momentPayload.put("videoUrl", chosen.optString("video_url", ""));
            momentPayload.put("caption", chosen.optString("caption", ""));
            momentPayload.put("date", chosen.optLong("date", 0L));
            momentPayload.put("authorName", authorName);
            momentPayload.put("authorAvatar", authorAvatar);
            momentPayload.put("updatedAt", System.currentTimeMillis());

            prefs.edit().putString("moment_json", momentPayload.toString()).apply();
        } catch (Exception e) {
            Log.w(TAG, "fetchLatestFeedMomentIfPossible error: " + e.getMessage());
        }
    }

    private static JSONObject postJson(String urlStr, JSONObject payload, String bearerToken) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Origin", VERCEL_ORIGIN);
            conn.setRequestProperty("Referer", VERCEL_ORIGIN + "/");
            conn.setRequestProperty("Content-Type", "application/json");
            if (bearerToken != null && !bearerToken.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + bearerToken);
            }
            conn.setDoOutput(true);
            byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body);
                os.flush();
            }
            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                try (InputStream in = conn.getInputStream()) {
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        bos.write(buf, 0, n);
                    }
                    return new JSONObject(bos.toString("UTF-8"));
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "postJson failed for " + urlStr + ": " + e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
        return null;
    }

    private static Bitmap loadOrDownloadBitmap(Context context, String urlStr, String cacheFileName, int maxDim) {
        File cacheDir = new File(context.getCacheDir(), "widget_img_cache");
        if (!cacheDir.exists()) cacheDir.mkdirs();

        String urlKey = Integer.toHexString(urlStr.hashCode()) + "_" + cacheFileName;
        File cachedFile = new File(cacheDir, urlKey);

        if (!cachedFile.exists() || cachedFile.length() < 64) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(20000);
                conn.setInstanceFollowRedirects(true);
                if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                    try (InputStream in = conn.getInputStream();
                         FileOutputStream fos = new FileOutputStream(cachedFile)) {
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = in.read(buf)) != -1) {
                            fos.write(buf, 0, n);
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Download image failed: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }

        if (!cachedFile.exists() || cachedFile.length() < 64) return null;

        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            try (FileInputStream fis = new FileInputStream(cachedFile)) {
                BitmapFactory.decodeStream(fis, null, bounds);
            }
            int sample = 1;
            while (bounds.outWidth / sample > maxDim * 2 || bounds.outHeight / sample > maxDim * 2) {
                sample *= 2;
            }
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inSampleSize = sample;
            try (FileInputStream fis = new FileInputStream(cachedFile)) {
                return BitmapFactory.decodeStream(fis, null, opts);
            }
        } catch (Exception e) {
            return null;
        }
    }

    private static Bitmap makeRoundedSquareBitmap(Bitmap src, int targetSize, float cornerRadiusPx) {
        int minSide = Math.min(src.getWidth(), src.getHeight());
        int x = (src.getWidth() - minSide) / 2;
        int y = (src.getHeight() - minSide) / 2;
        Bitmap cropped = Bitmap.createBitmap(src, x, y, minSide, minSide);
        Bitmap scaled = Bitmap.createScaledBitmap(cropped, targetSize, targetSize, true);

        Bitmap output = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setShader(new BitmapShader(scaled, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));

        RectF rect = new RectF(0f, 0f, targetSize, targetSize);
        canvas.drawRoundRect(rect, cornerRadiusPx, cornerRadiusPx, paint);

        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(4f);
        borderPaint.setColor(0x38FFFFFF);
        RectF borderRect = new RectF(2f, 2f, targetSize - 2f, targetSize - 2f);
        canvas.drawRoundRect(borderRect, cornerRadiusPx, cornerRadiusPx, borderPaint);

        return output;
    }

    private static Bitmap makeCircularBitmap(Bitmap src, int size) {
        int minSide = Math.min(src.getWidth(), src.getHeight());
        int x = (src.getWidth() - minSide) / 2;
        int y = (src.getHeight() - minSide) / 2;
        Bitmap cropped = Bitmap.createBitmap(src, x, y, minSide, minSide);
        Bitmap scaled = Bitmap.createScaledBitmap(cropped, size, size, true);

        Bitmap output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setShader(new BitmapShader(scaled, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));

        float r = size / 2f;
        canvas.drawCircle(r, r, r, paint);
        return output;
    }
}

