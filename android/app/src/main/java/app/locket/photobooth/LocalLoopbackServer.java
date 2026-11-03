package app.locket.photobooth;

import android.content.Context;
import android.content.res.AssetManager;
import android.util.Log;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Embedded HTTP loopback server on 127.0.0.1:<port> (loaded as http://localhost:<port> in WebView).
 *
 * Why http://localhost:<port>?
 * 1. Chromium treats http://localhost as a 100% Secure Context (window.isSecureContext === true),
 *    enabling navigator.mediaDevices.getUserMedia (Camera/Mic), crypto.subtle (RSA login encryption),
 *    Web Workers, OffscreenCanvas, and WebGL2 without self-signed TLS certificate warnings.
 * 2. Proxies /locket/* requests to https://locket.elingo.app/locket/* with
 *    Origin: https://locket-file.vercel.app so the upstream server never blocks with CORS 500.
 * 3. Proxies and caches /mediapipe/* WASM & FaceLandmarker models in the app cache directory
 *    so Beauty AI runs at 60 FPS with zero network lag after first load.
 */
public class LocalLoopbackServer {
    private static final String TAG = "LocalLoopbackServer";
    private static final String UPSTREAM_API = "https://locket.elingo.app";
    private static final String UPSTREAM_MEDIAPIPE = "https://locket-file.vercel.app";
    private static final String VERCEL_ORIGIN = "https://locket-file.vercel.app";

    private final Context appContext;
    private final AssetManager assetManager;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private ServerSocket serverSocket;
    private volatile boolean running = false;
    private int port = 0;

    public LocalLoopbackServer(Context context) {
        this.appContext = context.getApplicationContext();
        this.assetManager = this.appContext.getAssets();
    }

    public synchronized int start() throws IOException {
        if (running && serverSocket != null && !serverSocket.isClosed()) {
            return port;
        }
        try {
            serverSocket = new ServerSocket(19785, 64, InetAddress.getByName("127.0.0.1"));
        } catch (IOException e) {
            serverSocket = new ServerSocket(0, 64, InetAddress.getByName("127.0.0.1"));
        }
        port = serverSocket.getLocalPort();
        running = true;

        Thread acceptThread = new Thread(() -> {
            while (running && serverSocket != null && !serverSocket.isClosed()) {
                try {
                    final Socket client = serverSocket.accept();
                    executor.execute(() -> handleClient(client));
                } catch (IOException e) {
                    if (running) {
                        Log.w(TAG, "Accept error: " + e.getMessage());
                    }
                }
            }
        }, "LocketLoopbackAccept");
        acceptThread.setDaemon(true);
        acceptThread.start();
        Log.i(TAG, "Started LocalLoopbackServer on http://localhost:" + port);
        return port;
    }

    public synchronized void stop() {
        running = false;
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
            }
        }
    }

    private void handleClient(Socket socket) {
        try {
            socket.setSoTimeout(60000);
            socket.setTcpNoDelay(true);
            InputStream rawIn = new BufferedInputStream(socket.getInputStream());
            OutputStream out = socket.getOutputStream();

            String requestLine = readLine(rawIn);
            if (requestLine == null || requestLine.isEmpty()) {
                return;
            }
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                return;
            }
            String method = parts[0].toUpperCase(Locale.US);
            String fullPath = parts[1];
            String pathOnly = fullPath;
            int qIdx = fullPath.indexOf('?');
            if (qIdx >= 0) {
                pathOnly = fullPath.substring(0, qIdx);
            }

            Map<String, String> headers = new HashMap<>();
            String line;
            while ((line = readLine(rawIn)) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String k = line.substring(0, colon).trim().toLowerCase(Locale.US);
                    String v = line.substring(colon + 1).trim();
                    headers.put(k, v);
                }
            }

            int contentLength = 0;
            if (headers.containsKey("content-length")) {
                try {
                    contentLength = Integer.parseInt(headers.get("content-length"));
                } catch (NumberFormatException ignored) {
                }
            }

            byte[] body = null;
            if (contentLength > 0) {
                body = readExactBytes(rawIn, contentLength);
            }

            if ("OPTIONS".equals(method)) {
                sendOptionsOk(out);
                return;
            }

            if (pathOnly.startsWith("/locket/")) {
                proxyApiRequest(method, fullPath, headers, body, out);
                return;
            }

            if (pathOnly.startsWith("/mediapipe/")) {
                proxyAndCacheMediaPipe(pathOnly, fullPath, out);
                return;
            }

            serveAssetOrSpa(pathOnly, out);
        } catch (Exception e) {
            Log.w(TAG, "Client handling error: " + e.getMessage());
        } finally {
            try {
                socket.close();
            } catch (IOException ignored) {
            }
        }
    }

    private void sendOptionsOk(OutputStream out) throws IOException {
        String resp = "HTTP/1.1 204 No Content\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\r\n" +
                "Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Version\r\n" +
                "Content-Length: 0\r\n" +
                "Connection: close\r\n\r\n";
        out.write(resp.getBytes(StandardCharsets.UTF_8));
        out.flush();
    }

    private void proxyApiRequest(String method, String fullPath, Map<String, String> reqHeaders, byte[] body, OutputStream out) throws IOException {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(UPSTREAM_API + fullPath);
            conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(25000);
            conn.setReadTimeout(60000);
            conn.setRequestMethod(method);

            conn.setRequestProperty("Origin", VERCEL_ORIGIN);
            conn.setRequestProperty("Referer", VERCEL_ORIGIN + "/");
            conn.setRequestProperty("User-Agent", reqHeaders.getOrDefault("user-agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36"));

            String[] forwardHeaders = new String[]{"content-type", "authorization", "accept", "x-client-version"};
            for (String h : forwardHeaders) {
                if (reqHeaders.containsKey(h)) {
                    conn.setRequestProperty(h, reqHeaders.get(h));
                }
            }

            if (body != null && body.length > 0 && ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method))) {
                conn.setDoOutput(true);
                conn.setFixedLengthStreamingMode(body.length);
                try (OutputStream connOut = conn.getOutputStream()) {
                    connOut.write(body);
                    connOut.flush();
                }
            }

            int status = conn.getResponseCode();
            String contentType = conn.getContentType();
            if (contentType == null) {
                contentType = "application/json; charset=utf-8";
            }

            InputStream respIn = null;
            try {
                respIn = (status >= 400) ? conn.getErrorStream() : conn.getInputStream();
            } catch (IOException ignored) {
                respIn = conn.getErrorStream();
            }
            byte[] respBytes = (respIn != null) ? readAllBytes(respIn) : new byte[0];

            String headerBlock = "HTTP/1.1 " + status + " OK\r\n" +
                    "Content-Type: " + contentType + "\r\n" +
                    "Content-Length: " + respBytes.length + "\r\n" +
                    "Access-Control-Allow-Origin: *\r\n" +
                    "Cache-Control: no-store\r\n" +
                    "Connection: close\r\n\r\n";
            out.write(headerBlock.getBytes(StandardCharsets.UTF_8));
            out.write(respBytes);
            out.flush();
        } catch (Exception e) {
            String errJson = "{\"error\":{\"message\":\"" + e.getMessage().replace("\"", "'") + "\"}}";
            byte[] errBytes = errJson.getBytes(StandardCharsets.UTF_8);
            String headerBlock = "HTTP/1.1 502 Bad Gateway\r\n" +
                    "Content-Type: application/json; charset=utf-8\r\n" +
                    "Content-Length: " + errBytes.length + "\r\n" +
                    "Connection: close\r\n\r\n";
            out.write(headerBlock.getBytes(StandardCharsets.UTF_8));
            out.write(errBytes);
            out.flush();
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private void proxyAndCacheMediaPipe(String pathOnly, String fullPath, OutputStream out) throws IOException {
        String assetCandidate = "www" + pathOnly;
        try (InputStream assetIn = assetManager.open(assetCandidate)) {
            byte[] data = readAllBytes(assetIn);
            sendBytes(out, 200, guessMimeType(pathOnly), data, "public, max-age=31536000");
            return;
        } catch (IOException ignored) {
        }

        File cacheDir = new File(appContext.getCacheDir(), "mediapipe_cache");
        if (!cacheDir.exists()) {
            cacheDir.mkdirs();
        }
        String safeName = pathOnly.replaceFirst("^/mediapipe/", "").replaceAll("[^a-zA-Z0-9._-]", "_");
        File cachedFile = new File(cacheDir, safeName);
        if (cachedFile.exists() && cachedFile.length() > 128) {
            try (InputStream fis = new FileInputStream(cachedFile)) {
                byte[] data = readAllBytes(fis);
                sendBytes(out, 200, guessMimeType(pathOnly), data, "public, max-age=31536000");
                return;
            } catch (IOException ignored) {
            }
        }

        HttpURLConnection conn = null;
        try {
            URL url = new URL(UPSTREAM_MEDIAPIPE + fullPath);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(60000);
            conn.setRequestProperty("Origin", VERCEL_ORIGIN);
            conn.setRequestProperty("Referer", VERCEL_ORIGIN + "/");
            int status = conn.getResponseCode();
            if (status >= 200 && status < 300) {
                byte[] data = readAllBytes(conn.getInputStream());
                try (FileOutputStream fos = new FileOutputStream(cachedFile)) {
                    fos.write(data);
                } catch (IOException ignored) {
                }
                sendBytes(out, 200, guessMimeType(pathOnly), data, "public, max-age=31536000");
                return;
            }
        } catch (Exception e) {
            Log.w(TAG, "MediaPipe proxy failed: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }

        sendBytes(out, 404, "text/plain; charset=utf-8", "Not Found".getBytes(StandardCharsets.UTF_8), "no-store");
    }

    private void serveAssetOrSpa(String pathOnly, OutputStream out) throws IOException {
        String cleanPath = pathOnly;
        if (cleanPath.isEmpty() || "/".equals(cleanPath)) {
            cleanPath = "/index.html";
        }
        String assetPath = "www" + cleanPath;
        try (InputStream in = assetManager.open(assetPath)) {
            byte[] data = readAllBytes(in);
            String cacheCtrl = cleanPath.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
            sendBytes(out, 200, guessMimeType(cleanPath), data, cacheCtrl);
            return;
        } catch (IOException ignored) {
        }

        // SPA fallback to index.html for routes like /dashboard, /login, etc.
        if (!cleanPath.contains(".") || cleanPath.endsWith(".html")) {
            try (InputStream in = assetManager.open("www/index.html")) {
                byte[] data = readAllBytes(in);
                sendBytes(out, 200, "text/html; charset=utf-8", data, "no-cache");
                return;
            } catch (IOException ignored) {
            }
        }

        sendBytes(out, 404, "text/plain; charset=utf-8", "Not Found".getBytes(StandardCharsets.UTF_8), "no-store");
    }

    private void sendBytes(OutputStream out, int status, String contentType, byte[] data, String cacheControl) throws IOException {
        String header = "HTTP/1.1 " + status + " OK\r\n" +
                "Content-Type: " + contentType + "\r\n" +
                "Content-Length: " + data.length + "\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Cache-Control: " + cacheControl + "\r\n" +
                "Connection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.UTF_8));
        out.write(data);
        out.flush();
    }

    private String guessMimeType(String path) {
        String lower = path.toLowerCase(Locale.US);
        if (lower.endsWith(".html")) return "text/html; charset=utf-8";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript; charset=utf-8";
        if (lower.endsWith(".css")) return "text/css; charset=utf-8";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json; charset=utf-8";
        if (lower.endsWith(".wasm")) return "application/wasm";
        if (lower.endsWith(".task") || lower.endsWith(".tflite")) return "application/octet-stream";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".apk")) return "application/vnd.android.package-archive";
        return "application/octet-stream";
    }

    private static String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream(128);
        int b;
        boolean seenCr = false;
        while ((b = in.read()) != -1) {
            if (b == '\r') {
                seenCr = true;
            } else if (b == '\n') {
                break;
            } else {
                if (seenCr) {
                    bos.write('\r');
                    seenCr = false;
                }
                bos.write(b);
            }
        }
        if (b == -1 && bos.size() == 0) {
            return null;
        }
        return bos.toString("UTF-8");
    }

    private static byte[] readExactBytes(InputStream in, int length) throws IOException {
        byte[] buf = new byte[length];
        int offset = 0;
        while (offset < length) {
            int read = in.read(buf, offset, length - offset);
            if (read == -1) break;
            offset += read;
        }
        return buf;
    }

    private static byte[] readAllBytes(InputStream in) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream(8192);
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) {
            bos.write(buf, 0, n);
        }
        return bos.toByteArray();
    }
}

