/**
 * Native Android APK, Home Screen Widget & Custom App Icon Bridge (`window.LocketNativeWidget`)
 * - Synchronizes session tokens, latest friend moment + live 🔥 streak count,
 *   and custom widget border style to `LocketWidgetProvider`.
 * - Triggers native Android "Add to Home Screen" widget pinning (`requestPinAppWidget`).
 * - Switches the real Android Home Screen Launcher App Icon via `<activity-alias>` (`setAppIcon`).
 */

const WIDGET_CACHE_KEY = 'locket_latest_widget_moment';
const WIDGET_CONFIG_KEY = 'locket_widget_config_v1';
const APP_ICON_KEY = 'locket_app_icon_id';
const APK_DOWNLOAD_PATH = '/Locket-Photobooth.apk';

export const WIDGET_BORDER_STYLES = [
  {
    id: 'gold',
    name: 'Vàng Gold',
    cssBorder: 'linear-gradient(135deg, #ffe98a, #f6c453, #ff9500)',
  },
  {
    id: 'rainbow',
    name: 'Cầu vồng',
    cssBorder: 'linear-gradient(135deg, #ff5f9e, #ffd666, #4df6ff, #a855f7)',
  },
  {
    id: 'pink',
    name: 'Hồng Y2K',
    cssBorder: 'linear-gradient(135deg, #ffd6ec, #ff72b6, #ff4d94)',
  },
  {
    id: 'neon',
    name: 'Neon Đêm',
    cssBorder: 'linear-gradient(135deg, #00f5ff, #7c3aed, #ff2bd6)',
  },
  {
    id: 'white',
    name: 'Trắng tinh tế',
    cssBorder: 'linear-gradient(135deg, #ffffff, #d1d5db, #ffffff)',
  },
  {
    id: 'none',
    name: 'Không viền',
    cssBorder: 'transparent',
  },
];

export const APP_ICON_OPTIONS = [
  {
    id: 'default',
    name: 'Vàng cổ điển',
    desc: 'Biểu tượng Locket mặc định',
    bg: 'linear-gradient(145deg, #ffd95e, #f5a623)',
    ring: 'rgba(255,255,255,0.45)',
    heart: '#1c1c1e',
  },
  {
    id: 'gold',
    name: 'Locket Gold Đen',
    desc: 'Đen Obsidian viền vàng 24K',
    bg: 'linear-gradient(145deg, #25211a, #0b0a08)',
    ring: '#f6c453',
    heart: '#ffd86b',
  },
  {
    id: 'pink',
    name: 'Y2K Hồng',
    desc: 'Hồng pastel lấp lánh',
    bg: 'linear-gradient(145deg, #ffc2e2, #ff72b2)',
    ring: 'rgba(255,255,255,0.8)',
    heart: '#ffffff',
  },
  {
    id: 'sky',
    name: 'Xanh Thiên Thanh',
    desc: 'Xanh trời dịu mắt',
    bg: 'linear-gradient(145deg, #a4e0ff, #4292ee)',
    ring: 'rgba(255,255,255,0.72)',
    heart: '#ffffff',
  },
  {
    id: 'neon',
    name: 'Cyber Neon',
    desc: 'Tím đêm viền Neon Cyan',
    bg: 'linear-gradient(145deg, #1b1042, #09061a)',
    ring: '#00f5ff',
    heart: '#ff4fd8',
  },
  {
    id: 'matcha',
    name: 'Matcha Kem',
    desc: 'Xanh matcha nhẹ nhàng',
    bg: 'linear-gradient(145deg, #dcecca, #7aa666)',
    ring: '#fcf8eb',
    heart: '#fffcf0',
  },
];

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

export function getWidgetConfig() {
  try {
    const raw = localStorage.getItem(WIDGET_CONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      borderStyle: parsed.borderStyle || 'gold',
      showStreak: parsed.showStreak !== false,
      streakCount: Number.isFinite(parsed.streakCount) ? parsed.streakCount : 0,
    };
  } catch {
    return { borderStyle: 'gold', showStreak: true, streakCount: 0 };
  }
}

export function saveAndSyncWidgetConfig(patch = {}) {
  const next = { ...getWidgetConfig(), ...patch };
  try {
    localStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  const bridge = getNativeWidgetBridge();
  if (bridge && typeof bridge.updateWidgetConfig === 'function') {
    try {
      bridge.updateWidgetConfig(JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}

export function getActiveAppIcon() {
  const bridge = getNativeWidgetBridge();
  if (bridge && typeof bridge.getAppIcon === 'function') {
    try {
      const id = bridge.getAppIcon();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  try {
    return localStorage.getItem(APP_ICON_KEY) || 'default';
  } catch {
    return 'default';
  }
}

export function setNativeAppIcon(iconId) {
  const id = APP_ICON_OPTIONS.some((x) => x.id === iconId) ? iconId : 'default';
  try {
    localStorage.setItem(APP_ICON_KEY, id);
  } catch {
    // ignore
  }

  const bridge = getNativeWidgetBridge();
  if (bridge && typeof bridge.setAppIcon === 'function') {
    try {
      const ok = Boolean(bridge.setAppIcon(id));
      return { ok, native: true };
    } catch (err) {
      return { ok: false, native: true, error: err?.message };
    }
  }
  return { ok: true, native: false };
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

export function pickLatestWidgetMoment(
  items = [],
  users = {},
  meUid = null,
  filterMode = 'friends',
  streakCount = 0
) {
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
    streakCount: Number.isFinite(streakCount) && streakCount > 0 ? streakCount : 0,
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
