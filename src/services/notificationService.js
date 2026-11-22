/**
 * Real-Time In-App + Native Android Notification Engine
 *
 * Monitors:
 * 1. Incoming chat messages from friends (`useConversations` feed updates)
 * 2. Incoming emote reactions on the user's recent moments (direct Firestore read via `api.rF`)
 *
 * Delivers alerts through 3 coordinated channels:
 * - Sleek top floating in-app glassmorphic banner (`locket:in-app-notification` CustomEvent)
 * - Android Native System Notification (`window.LocketNativeWidget.showNotification`)
 * - Web Notification API fallback (when running in desktop/mobile browser with permission granted)
 * - Subtle synthesized Web Audio chime (zero external asset cost)
 */

import { useEffect, useRef } from 'react';
import { getNativeWidgetBridge } from './nativeWidgetBridge.js';

export const IN_APP_NOTIFICATION_EVENT = 'locket:in-app-notification';
const PREF_ENABLED_KEY = 'locket_notif_enabled';
const PREF_SOUND_KEY = 'locket_notif_sound';
const SEEN_PREFIX = 'locket_notif_seen_v1_';
const MAX_SEEN_KEYS = 320;
const REACTION_POLL_MS = 35000;

export function isNotificationsEnabled() {
  try {
    const v = localStorage.getItem(PREF_ENABLED_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setNotificationsEnabled(enabled) {
  try {
    localStorage.setItem(PREF_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // ignore storage errors
  }
  if (enabled) {
    requestNotificationPermissionIfNeeded();
  }
}

export function isNotificationSoundEnabled() {
  try {
    const v = localStorage.getItem(PREF_SOUND_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled) {
  try {
    localStorage.setItem(PREF_SOUND_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export function requestNotificationPermissionIfNeeded() {
  if (typeof window === 'undefined') return;
  try {
    const bridge = getNativeWidgetBridge();
    if (bridge && typeof bridge.requestNotificationPermission === 'function') {
      bridge.requestNotificationPermission();
      return;
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch {
    // ignore
  }
}

let audioCtxRef = null;
export function playNotificationChime(type = 'message') {
  if (!isNotificationSoundEnabled() || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef) audioCtxRef = new AudioCtx();
    if (audioCtxRef.state === 'suspended') {
      audioCtxRef.resume().catch(() => {});
    }
    const now = audioCtxRef.currentTime;
    const freqs = type === 'reaction' ? [660, 990] : [523.25, 783.99];
    freqs.forEach((freq, idx) => {
      const osc = audioCtxRef.createOscillator();
      const gain = audioCtxRef.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.085);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.085);
      gain.gain.exponentialRampToValueAtTime(0.065, now + idx * 0.085 + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.085 + 0.24);
      osc.connect(gain);
      gain.connect(audioCtxRef.destination);
      osc.start(now + idx * 0.085);
      osc.stop(now + idx * 0.085 + 0.26);
    });
  } catch {
    // Audio playback may be blocked until first user gesture
  }
}

function loadSeenSet(uid) {
  if (!uid) return new Set();
  try {
    const raw = localStorage.getItem(SEEN_PREFIX + uid);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeenSet(uid, set) {
  if (!uid) return;
  try {
    const arr = Array.from(set);
    const trimmed = arr.length > MAX_SEEN_KEYS ? arr.slice(arr.length - MAX_SEEN_KEYS) : arr;
    localStorage.setItem(SEEN_PREFIX + uid, JSON.stringify(trimmed));
  } catch {
    // ignore storage quota errors
  }
}

export function resolveDisplayName(profile, fallback = 'Bạn bè') {
  if (!profile) return fallback;
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return full || profile.displayName || profile.username || fallback;
}

export function emitAppNotification(payload) {
  if (!payload || !isNotificationsEnabled()) return;
  const item = {
    id: payload.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: payload.type || 'message', // 'reaction' | 'message'
    title: payload.title || 'Locket Photobooth',
    body: payload.body || '',
    emoji: payload.emoji || '',
    avatar: payload.avatar || '',
    peerUid: payload.peerUid || null,
    momentId: payload.momentId || null,
    createdAt: payload.createdAt || Date.now(),
  };

  // 1. In-app glassmorphic notification banner
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(IN_APP_NOTIFICATION_EVENT, { detail: item }));
  }

  // 2. Subtle sound chime
  playNotificationChime(item.type);

  // 3. Android Native System Notification (when inside APK)
  const bridge = getNativeWidgetBridge();
  if (bridge && typeof bridge.showNotification === 'function') {
    try {
      bridge.showNotification(item.title, item.body, item.type, item.id);
      return;
    } catch {
      // ignore
    }
  }

  // 4. Web Notification API fallback (when running in browser & tab hidden or permitted)
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted' &&
    document.visibilityState !== 'visible'
  ) {
    try {
      new Notification(item.title, {
        body: item.body,
        icon: item.avatar || '/icons/icon-192.png',
        tag: item.id,
      });
    } catch {
      // ignore
    }
  }
}

/**
 * React hook mounted in DashboardPage to detect incoming messages & moment emote reactions in real time.
 */
export function useLocketNotifications({
  meUid,
  conversations,
  chatUsers,
  ownMoments,
  momentUsers,
  fetchReactions,
  resolveProfiles,
}) {
  const seenRef = useRef(new Set());
  const msgBaselineReadyRef = useRef(false);
  const reactBaselineReadyRef = useRef(false);
  const uidRef = useRef(null);

  // Reset baselines cleanly when account switches
  useEffect(() => {
    if (uidRef.current !== meUid) {
      uidRef.current = meUid;
      seenRef.current = loadSeenSet(meUid);
      msgBaselineReadyRef.current = false;
      reactBaselineReadyRef.current = false;
    }
  }, [meUid]);

  // 1. Watch incoming chat messages
  useEffect(() => {
    if (!meUid || !Array.isArray(conversations)) return;

    const seen = seenRef.current;
    let changed = false;

    if (!msgBaselineReadyRef.current) {
      // Silent baseline on initial mount so existing unread threads don't spam
      for (const conv of conversations) {
        const latest = conv?.latest;
        if (!latest) continue;
        const key = `msg:${conv.id || conv.peer}:${latest.id || latest.created_at || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          changed = true;
        }
      }
      msgBaselineReadyRef.current = true;
      if (changed) saveSeenSet(meUid, seen);
      return;
    }

    if (!isNotificationsEnabled()) return;

    for (const conv of conversations) {
      const latest = conv?.latest;
      if (!latest) continue;
      if (latest.sender && latest.sender === meUid) continue;
      const isUnread = !conv.is_read || (conv.unread_count || 0) > 0;
      if (!isUnread) continue;

      const key = `msg:${conv.id || conv.peer}:${latest.id || latest.created_at || ''}`;
      if (seen.has(key)) continue;

      seen.add(key);
      changed = true;

      const peerProfile = (chatUsers && conv.peer && chatUsers[conv.peer]) || null;
      const senderName = resolveDisplayName(peerProfile, 'Bạn bè');
      const bodyText =
        (latest.body && String(latest.body).trim()) ||
        (latest.moment ? '📷 Đã gửi một khoảnh khắc' : '💬 Tin nhắn mới');

      emitAppNotification({
        id: key,
        type: 'message',
        title: `${senderName} đã nhắn tin`,
        body: bodyText,
        emoji: '💬',
        avatar: peerProfile?.profile_picture_url || '',
        peerUid: conv.peer || null,
      });
    }

    if (changed) saveSeenSet(meUid, seen);
  }, [meUid, conversations, chatUsers]);

  // 2. Watch incoming emote reactions on recent own moments
  const ownMomentIdsRef = useRef([]);
  const momentUsersRef = useRef(momentUsers);
  momentUsersRef.current = momentUsers;

  useEffect(() => {
    if (!meUid || !Array.isArray(ownMoments)) {
      ownMomentIdsRef.current = [];
      return;
    }
    ownMomentIdsRef.current = ownMoments
      .filter((m) => m && m.id && !m.local && !m.private && m.user === meUid)
      .slice(0, 4)
      .map((m) => m.id);
  }, [meUid, ownMoments]);

  useEffect(() => {
    if (!meUid || typeof fetchReactions !== 'function') return;
    let cancelled = false;
    let running = false;

    const pollReactions = async () => {
      if (cancelled || running) return;
      if (document.visibilityState !== 'visible') return;
      const ids = ownMomentIdsRef.current;
      if (!ids.length) return;

      running = true;
      try {
        const seen = seenRef.current;
        const isFirstScan = !reactBaselineReadyRef.current;
        const pendingEvents = [];
        let changed = false;

        for (const momentId of ids) {
          if (cancelled) return;
          const reactions = await fetchReactions(momentId).catch(() => []);
          if (!Array.isArray(reactions)) continue;

          for (const r of reactions) {
            if (!r?.user || !r.emoji || r.user === meUid) continue;
            const key = `react:${momentId}:${r.user}:${r.emoji}:${r.created_at || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            changed = true;
            if (!isFirstScan) {
              pendingEvents.push({ key, momentId, user: r.user, emoji: r.emoji });
            }
          }
        }

        reactBaselineReadyRef.current = true;
        if (changed) saveSeenSet(meUid, seen);

        if (!cancelled && pendingEvents.length > 0 && isNotificationsEnabled()) {
          // Resolve any unknown reactor profiles cleanly
          const missingUids = [
            ...new Set(
              pendingEvents
                .map((ev) => ev.user)
                .filter((u) => !(momentUsersRef.current && momentUsersRef.current[u]?.first_name))
            ),
          ];
          let fetchedMap = {};
          if (missingUids.length && typeof resolveProfiles === 'function') {
            fetchedMap = (await resolveProfiles(missingUids).catch(() => ({}))) || {};
          }

          // Emit up to 3 most recent notifications so burst reactions stay pleasant
          for (const ev of pendingEvents.slice(0, 3)) {
            const prof = fetchedMap[ev.user] || momentUsersRef.current?.[ev.user] || null;
            const name = resolveDisplayName(prof, 'Bạn bè');
            emitAppNotification({
              id: ev.key,
              type: 'reaction',
              title: `${name} đã thả ${ev.emoji}`,
              body: 'Vào khoảnh khắc gần đây của bạn',
              emoji: ev.emoji,
              avatar: prof?.profile_picture_url || '',
              momentId: ev.momentId,
            });
          }
        }
      } finally {
        running = false;
      }
    };

    // Delay first baseline scan slightly so startup camera/feed gets 100% priority
    const initTimer = setTimeout(pollReactions, 4500);
    const interval = setInterval(pollReactions, REACTION_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') pollReactions();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [meUid, fetchReactions, resolveProfiles]);
}
