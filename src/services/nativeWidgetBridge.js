/**
 * Native Android APK & Home Screen Widget Bridge (`window.LocketNativeWidget`)
 * - Detects whether the web app is running inside the Locket Photobooth Android APK WebView
 *   or a regular mobile/desktop browser.
 * - Automatically synchronizes the active Locket session (`idToken`, `refreshToken`, `localId`)
 *   and latest friend moment (`thumbnail_url`, author name, avatar, caption, timestamp)
 *   to the Android `LocketWidgetProvider` so the Home Screen Widget stays live 24/7.
 * - Triggers Android's native `AppWidgetManager.requestPinAppWidget` ("Thêm vào Màn hình nền").
 */

const WIDGET_CACHE_KEY = 'locket_latest_widget_moment';
const APK_DOWNLOAD_PATH = '/Locket-Photobooth.apk';

export function getNativeWidgetBridge() {
  if (typeof window === 'undefined') return null;
  return window.LocketNativeWidget || null;
}

export function isRunningInAndroidApk() {
  const bridge = getNativeWidgetBridge();
  if (bridge && typeof bridge.isNativeApp === 'function') {
    try {
      return Boolean(bridge.isNativeApp());
    } catch {
      return true;
    }
  }
  if (typeof navigator !== 'undefined' && /LocketPhotoboothAPK/i.test(navigator.userAgent || '')) {
    return true;
  }
  return Boolean(bridge);
}

export function syncSessionToNativeWidget(user) {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return false;
  try {
    if (!user || !user.idToken) {
      bridge.clearSession?.();
      return true;
    }
    const payload = JSON.stringify({
      localId: user.localId || '',
      idToken: user.idToken || '',
      refreshToken: user.refreshToken || '',
      displayName: user.displayName || '',
      email: user.email || '',
      syncedAt: Date.now(),
    });
    bridge.syncSession?.(payload);
    return true;
  } catch {
    return false;
  }
}

export function pickLatestWidgetMoment(items = [], users = {}, meUid = null, filterMode = 'friends') {
  if (!Array.isArray(items) || !items.length) return null;
  const candidate =
    filterMode === 'friends'
      ? items.find((m) => m && m.thumbnail_url && (!meUid || m.user !== meUid)) ||
        items.find((m) => m && m.thumbnail_url)
      : items.find((m) => m && m.thumbnail_url);

  if (!candidate) return null;
  const author = (candidate.user && users?.[candidate.user]) || {};
  const authorName =
    [author.first_name, author.last_name].filter(Boolean).join(' ').trim() ||
    author.username ||
    (candidate.user === meUid ? 'Bạn' : 'Bạn bè');

  return {
    id: candidate.id || '',
    user: candidate.user || '',
    imageUrl: candidate.thumbnail_url || '',
    authorName,
    authorAvatar: author.profile_picture_url || '',
    caption: candidate.caption || candidate.overlay?.text || '',
    date: candidate.date || new Date().toISOString(),
  };
}

export function getSavedWidgetMoment() {
  try {
    const raw = localStorage.getItem(WIDGET_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function syncMomentToNativeWidget(momentData) {
  if (!momentData || !momentData.imageUrl) return false;
  try {
    localStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(momentData));
  } catch {
    // ignore storage quota errors
  }

  const bridge = getNativeWidgetBridge();
  if (!bridge) return false;
  try {
    bridge.updateWidgetMoment?.(JSON.stringify(momentData));
    return true;
  } catch {
    return false;
  }
}

export function requestPinNativeWidget(filterMode = 'friends') {
  const bridge = getNativeWidgetBridge();
  if (!bridge) {
    return { ok: false, reason: 'not-apk' };
  }
  try {
    const res = bridge.requestPinWidget ? bridge.requestPinWidget(filterMode) : false;
    return { ok: Boolean(res), reason: res ? 'pinned' : 'unsupported-launcher' };
  } catch (err) {
    return { ok: false, reason: err?.message || 'error' };
  }
}

export function triggerNativeWidgetRefresh() {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return false;
  try {
    bridge.refreshWidgetNow?.();
    return true;
  } catch {
    return false;
  }
}

export function getApkDownloadUrl() {
  return APK_DOWNLOAD_PATH;
}

