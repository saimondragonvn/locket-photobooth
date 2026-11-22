/**
 * Direct Locket API & Client-Side Profile Resolution Engine
 *
 * Background:
 * - Upstream backend `https://locket.elingo.app` migrated several endpoints off its relay server:
 *   1. `/locket/moment-activity`, `/locket/react-moment`, `/locket/mark-viewed`, `/locket/get-moment-views`,
 *      and `/locket/private-moments` now return HTTP 404.
 *   2. `/locket/feed` and `/locket/conversations` no longer embed full `users` profile objects.
 *   3. `/locket/friends` now returns `{ uids: [...], count }` instead of `{ friends: [...], me }`.
 *   4. `/locket/friend-requests` now returns raw UID arrays `{ incoming: [...], outgoing: [...] }`.
 *   5. `/locket/get-account-info` may place avatar/name under `user.profilePicture` when Firebase Auth
 *      `users[0].photoUrl` is empty (especially common on Android Locket accounts).
 *
 * This module implements:
 * - Direct Firebase Callable calls to `https://api.locketcamera.com/<fn>` (with automatic 401 token refresh)
 * - Direct Firestore reactions reader for moment activity
 * - Batched (`fetchUsers`, max 20 UIDs) + single fallback (`fetchUserV2`) profile resolution with
 *   persistent IndexedDB (`locket_profiles`) caching and reactive `locket:profiles-updated` events
 * - Full backward-compatible response hydration for Feed, Friends, Friend Requests, Conversations, and Self Profile
 */

export const PROFILES_UPDATED_EVENT = 'locket:profiles-updated';

const LOCKET_API_BASE = 'https://api.locketcamera.com';
const FIRESTORE_MOMENTS_BASE =
  'https://firestore.googleapis.com/v1/projects/locket-4252a/databases/(default)/documents/moments';

const LOCKET_CLIENT_HEADERS = Object.freeze({
  Accept: 'application/json',
  'Accept-Language': 'en-US',
  'X-Client-Version': 'iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS',
  'X-Firebase-GMPID': '1:641029076083:ios:cc8eb46290d69b234fa606',
  'X-Ios-Bundle-Identifier': 'com.locket.Locket',
  'X-Firebase-AppCheck':
    'eyJraWQiOiJNbjVDS1EiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjY0MTAyOTA3NjA4Mzppb3M6Y2M4ZWI0NjI5MGQ2OWIyMzRmYTYwNiIsImF1ZCI6WyJwcm9qZWN0c1wvNjQxMDI5MDc2MDgzIiwicHJvamVjdHNcL2xvY2tldC00MjUyYSJdLCJwcm92aWRlciI6ImRldmljZV9jaGVja19kZXZpY2VfaWRlbnRpZmljYXRpb24iLCJpc3MiOiJodHRwczpcL1wvZmlyZWJhc2VhcHBjaGVjay5nb29nbGVhcGlzLmNvbVwvNjQxMDI5MDc2MDgzIiwiZXhwIjoxNzIyMTY3ODk4LCJpYXQiOjE3MjIxNjQyOTgsImp0aSI6ImlHUGlsT1dDZGg4Mll3UTJXRC1neEpXeWY5TU9RRFhHcU5OR3AzTjFmRGcifQ.lqTOJfdoYLpZwYeeXtRliCdkVT7HMd7_Lj-d44BNTGuxSYPIa9yVAR4upu3vbZSh9mVHYS8kJGYtMqjP-L6YXsk_qsV_gzKC2IhVAV6KbPDRHdevMfBC6fRiOSVn7vt749GVFdZqAuDCXhCILsaMhvgDBgZoDilgAPtpNwyjz-VtRB7OdOUbuKTCqdoSOX0SJWVUMyuI8nH0-unY--YRctunK8JHZDxBaM_ahVggYPWBCpzxq9Yeq8VSPhadG_tGNaADStYPaeeUkZ7DajwWqH5ze6ESpuFNgAigwPxCM735_ZiPeD7zHYwppQA9uqTWszK9v9OvWtFCsgCEe22O8awbNbuEBTKJpDQ8xvZe8iEYyhfUPncER3S-b1CmuXR7tFCdTgQe5j7NGWjFvN_CnL7D2nudLwxWlpqwASCHvHyi8HBaJ5GpgriTLXAAinY48RukRDBi9HwEzpRecELX05KTD2lTOfQCjKyGpfG2VUHP5Xm36YbA3iqTDoDXWMvV',
  'X-Firebase-Client':
    'H4sIAAAAAAAAAKtWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA',
});

const PROFILES_DB_NAME = 'locket_profiles';
const PROFILES_STORE_NAME = 'profiles';
const PROFILE_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
const PROFILE_MAX_ENTRIES = 2000;
const PROFILE_REFRESH_INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 hours

const profileCache = new Map();
const refusedUids = new Set();
const viewedMoments = new Set();

let dbPromise = null;
let loadProfilesPromise = null;
let profilesLoaded = false;

let singleQueue = Promise.resolve();
let lastSingleAt = 0;
let singleBlockedUntil = 0;

let lastBatchAt = 0;
let batchBackoffMs = 0;
let batchBlockedUntil = 0;

const batchWaiters = new Map();
const inFlightProfiles = new Map();
let lastEnqueueAt = 0;
let batchDraining = false;
let selfIncludedInBatch = false;
let selfAccountPromise = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function openProfilesDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(PROFILES_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(PROFILES_STORE_NAME)) {
            db.createObjectStore(PROFILES_STORE_NAME, { keyPath: 'uid' });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          db.onversionchange = () => {
            db.close();
            dbPromise = null;
          };
          resolve(db);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    }).catch(() => {
      dbPromise = null;
      return null;
    });
  }
  return dbPromise;
}

async function runProfilesTx(mode, fn) {
  const db = await openProfilesDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(PROFILES_STORE_NAME, mode);
      const store = tx.objectStore(PROFILES_STORE_NAME);
      const req = fn(store);
      tx.oncomplete = () => resolve(req && 'result' in req ? req.result : null);
      tx.onerror = tx.onabort = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  }).catch(() => null);
}

export function initProfileCache() {
  if (!loadProfilesPromise) {
    loadProfilesPromise = runProfilesTx('readonly', (store) => store.getAll())
      .then((rows) => {
        const now = Date.now();
        const valid = (Array.isArray(rows) ? rows : [])
          .filter((r) => r?.uid && r.profile && now - (r.at || 0) < PROFILE_TTL_MS)
          .sort((a, b) => (b.at || 0) - (a.at || 0))
          .slice(0, PROFILE_MAX_ENTRIES);
        const keepSet = new Set(valid);
        for (const row of valid) {
          const existing = profileCache.get(row.uid);
          if (!existing || existing.at < row.at) {
            profileCache.set(row.uid, { profile: row.profile, at: row.at });
          }
        }
        const stale = (Array.isArray(rows) ? rows : []).filter((r) => r?.uid && !keepSet.has(r));
        if (stale.length) {
          runProfilesTx('readwrite', (store) => {
            stale.forEach((r) => store.delete(r.uid));
          });
        }
      })
      .catch(() => {})
      .then(() => {
        profilesLoaded = true;
      });
  }
  return loadProfilesPromise;
}

if (typeof window !== 'undefined') {
  initProfileCache();
}

export function hasRealProfileData(profile) {
  return Boolean(
    profile &&
      (profile.username ||
        profile.first_name ||
        profile.last_name ||
        profile.profile_picture_url)
  );
}

export function pickBetterProfile(prev, next) {
  if (hasRealProfileData(prev) && !hasRealProfileData(next)) return prev;
  if (hasRealProfileData(prev) && hasRealProfileData(next)) {
    return {
      ...prev,
      ...next,
      first_name: next.first_name || prev.first_name || '',
      last_name: next.last_name || prev.last_name || '',
      username: next.username || prev.username || '',
      profile_picture_url: next.profile_picture_url || prev.profile_picture_url || '',
      badge: next.badge || prev.badge || null,
      pending: false,
    };
  }
  return next || prev;
}

export function mergeProfileMaps(existingMap, incomingMap) {
  let out = existingMap || {};
  for (const [uid, prof] of Object.entries(incomingMap || {})) {
    const chosen = pickBetterProfile(out[uid], prof);
    if (chosen !== out[uid]) {
      if (out === existingMap) out = { ...existingMap };
      out[uid] = chosen;
    }
  }
  return out;
}

export function normalizeProfile(raw, fallbackUid = '') {
  if (!raw || typeof raw !== 'object') return null;
  const uid = raw.uid || raw.localId || fallbackUid || '';
  const displayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
  let firstName = raw.first_name || raw.firstName || '';
  let lastName = raw.last_name || raw.lastName || '';
  if (!firstName && !lastName && displayName) {
    const parts = displayName.split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ');
  }
  const avatar =
    raw.profile_picture_url ||
    raw.profilePicture ||
    raw.photoUrl ||
    raw.photo_url ||
    '';
  const username = raw.username || '';
  return {
    uid,
    username,
    first_name: firstName,
    last_name: lastName,
    profile_picture_url: avatar,
    badge: typeof raw.badge === 'string' && raw.badge ? raw.badge : null,
  };
}

function toCachedView(entry) {
  return { ...entry.profile, cached_at: entry.at };
}

export function getCachedProfile(uid) {
  if (!uid) return null;
  const entry = profileCache.get(uid);
  return entry ? toCachedView(entry) : null;
}

export function cacheProfile(uid, profile) {
  if (!uid || !profile) return null;
  const normalized = normalizeProfile(profile, uid);
  if (!normalized) return null;
  const prev = profileCache.get(uid)?.profile;
  const merged = pickBetterProfile(prev, normalized);
  const entry = { profile: merged, at: Date.now() };
  profileCache.set(uid, entry);
  runProfilesTx('readwrite', (store) => store.put({ uid, ...entry }));
  return entry;
}

export function emitProfilesUpdated(map) {
  if (typeof window === 'undefined' || !map || !Object.keys(map).length) return;
  window.dispatchEvent(new CustomEvent(PROFILES_UPDATED_EVENT, { detail: map }));
}

export function resetSelfProfileCache() {
  selfAccountPromise = null;
  selfIncludedInBatch = false;
}

export function int64Value(val) {
  return {
    '@type': 'type.googleapis.com/google.protobuf.Int64Value',
    value: String(val),
  };
}

function makeApiError(status, code, message) {
  return Object.assign(new Error(message), {
    response: {
      status,
      data: {
        error: { status, code, message },
      },
    },
  });
}

export function isMomentGoneError(err) {
  const code = err?.response?.data?.error?.code;
  return code === 'MOMENT_UNAVAILABLE' || code === 'MOMENT_GONE';
}

function parseTimestampIso(val) {
  if (typeof val === 'string') return val;
  if (val && typeof val._seconds === 'number') {
    return new Date(val._seconds * 1000 + Math.floor((val._nanoseconds || 0) / 1e6)).toISOString();
  }
  return null;
}

function parseMs(iso) {
  return Date.parse(iso) || 0;
}

/**
 * Invokes a Locket Firebase Callable endpoint directly at https://api.locketcamera.com/<fnName>.
 */
export async function callLocketFn(fnName, data, deps, { onMoment = false } = {}) {
  const { getFreshUser, refreshUser } = deps;
  let user = await getFreshUser();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!user?.idToken) {
      throw makeApiError(401, 'SESSION_ENDED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }

    let resp;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
      try {
        resp = await fetch(`${LOCKET_API_BASE}/${fnName}`, {
          method: 'POST',
          headers: {
            ...LOCKET_CLIENT_HEADERS,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.idToken}`,
          },
          body: JSON.stringify({ data }),
          signal: controller?.signal,
        });
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch (netErr) {
      throw netErr;
    }

    if (resp.status === 401 && attempt === 0) {
      user = (await refreshUser().catch(() => null)) || user;
      continue;
    }

    let json = null;
    try {
      json = await resp.json();
    } catch {
      json = null;
    }

    if (!resp.ok) {
      throw makeApiError(
        502,
        'LOCKET_UNAVAILABLE',
        `Locket không trả lời (${fnName}, lỗi ${resp.status})`
      );
    }

    const result = json?.result || {};
    const errors = Array.isArray(result.errors) ? result.errors : [];
    const resultStatus = Number(result.status) || 200;
    if (!errors.length && resultStatus < 400) {
      return result;
    }

    const msg = String(errors[0] || `Locket answered ${resultStatus}`);
    if (/^too many requests/i.test(msg)) {
      throw makeApiError(
        429,
        'LOCKET_RATE_LIMITED',
        'Locket đang tạm giới hạn vì thao tác quá nhanh. Đợi vài phút rồi thử lại'
      );
    }
    if (onMoment && (resultStatus === 404 || resultStatus === 401)) {
      throw makeApiError(404, 'MOMENT_UNAVAILABLE', 'Khoảnh khắc này không còn xem được');
    }
    throw makeApiError(
      resultStatus === 401 ? 403 : resultStatus >= 500 ? 502 : resultStatus,
      'LOCKET_REFUSED',
      msg
    );
  }

  throw makeApiError(401, 'SESSION_ENDED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
}

export async function fetchMomentReactionsFirestore(momentId, deps) {
  const user = await deps.getFreshUser();
  if (!user?.idToken) return [];
  try {
    const resp = await fetch(
      `${FIRESTORE_MOMENTS_BASE}/${encodeURIComponent(momentId)}/reactions?pageSize=300`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.idToken}`,
        },
      }
    );
    if (resp.status === 403 || resp.status === 404) return [];
    if (!resp.ok) return [];
    const data = await resp.json().catch(() => null);
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    return docs
      .map((doc) => {
        const f = doc?.fields || {};
        return {
          user: f.user?.stringValue || null,
          emoji: f.string?.stringValue || '',
          created_at: f.created_at?.timestampValue || doc.createTime || null,
        };
      })
      .filter((r) => r.user && r.emoji);
  } catch {
    return [];
  }
}

export async function reactMomentDirect(momentUid, reaction, deps) {
  return callLocketFn(
    'reactToMoment',
    {
      moment_uid: momentUid,
      reaction,
      from_memory: false,
      intensity: int64Value('0'),
    },
    deps,
    { onMoment: true }
  );
}

export async function markMomentViewedDirect(momentUid, deps) {
  if (!momentUid || viewedMoments.has(momentUid)) return null;
  viewedMoments.add(momentUid);
  try {
    return await callLocketFn('markMomentAsViewed', { moment_uid: momentUid }, deps, {
      onMoment: true,
    });
  } catch (err) {
    if (!isMomentGoneError(err)) {
      viewedMoments.delete(momentUid);
    }
    throw err;
  }
}

export async function getLatestStreakDirect(deps) {
  const res = await callLocketFn('getLatestMomentV2', { fetch_streak: true }, deps);
  return res?.streak || null;
}

async function fetchUsersBatch(uids, deps) {
  if (Date.now() < batchBlockedUntil) return null;
  lastBatchAt = Date.now();
  try {
    const res = await callLocketFn('fetchUsers', { user_uids: uids }, deps);
    const list = res?.data;
    batchBackoffMs = 0;
    const out = {};
    if (Array.isArray(list)) {
      for (const raw of list) {
        if (raw?.uid) {
          const norm = normalizeProfile(raw, raw.uid);
          if (norm && hasRealProfileData(norm)) {
            out[norm.uid] = norm;
          }
        }
      }
    }
    return out;
  } catch (err) {
    const code = err?.response?.data?.error?.code;
    if (code === 'LOCKET_RATE_LIMITED') {
      batchBackoffMs = batchBackoffMs ? Math.min(batchBackoffMs * 2, 1200000) : 120000;
      batchBlockedUntil = Date.now() + batchBackoffMs;
    } else if (code === 'LOCKET_REFUSED') {
      batchBlockedUntil = Date.now() + 600000;
    }
    return null;
  }
}

async function fetchSingleUserV2(uid, deps) {
  const task = singleQueue.then(async () => {
    if (Date.now() < singleBlockedUntil || refusedUids.has(uid)) return null;
    const wait = lastSingleAt + 1200 - Date.now();
    if (wait > 0) await sleep(wait);
    if (Date.now() < singleBlockedUntil) return null;
    lastSingleAt = Date.now();
    try {
      const res = await callLocketFn('fetchUserV2', { user_uid: uid }, deps);
      const raw = res?.data || {};
      const norm = normalizeProfile(raw, uid);
      return norm && hasRealProfileData(norm) ? norm : null;
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (code === 'LOCKET_RATE_LIMITED' || !err?.response || code === 'LOCKET_UNAVAILABLE') {
        singleBlockedUntil = Date.now() + 120000;
      } else if (code === 'LOCKET_REFUSED') {
        refusedUids.add(uid);
      }
      return null;
    }
  });
  singleQueue = task.catch(() => {});
  const profile = await task;
  const cached = profile ? toCachedView(cacheProfile(uid, profile)) : null;
  if (cached) {
    emitProfilesUpdated({ [uid]: cached });
  } else if (!profileCache.has(uid)) {
    emitProfilesUpdated({ [uid]: { uid } });
  }
  return cached;
}

function enqueueProfileFetch(uid, deps) {
  if (!inFlightProfiles.has(uid)) {
    lastEnqueueAt = Date.now();
    const p = new Promise((resolve) => {
      batchWaiters.set(uid, resolve);
    }).finally(() => {
      inFlightProfiles.delete(uid);
    });
    inFlightProfiles.set(uid, p);

    if (!batchDraining) {
      batchDraining = true;
      (async () => {
        try {
          const started = Date.now();
          while (true) {
            const wait = Math.min(lastEnqueueAt + 120, started + 450) - Date.now();
            if (wait <= 0 || batchWaiters.size >= 20) break;
            await sleep(wait);
          }

          while (batchWaiters.size > 0) {
            const gap = lastBatchAt + 2500 - Date.now();
            if (gap > 0 && Date.now() >= batchBlockedUntil) {
              await sleep(gap);
            }
            const chunk = [...batchWaiters.entries()].slice(0, 20);
            chunk.forEach(([id]) => batchWaiters.delete(id));

            const meUid = deps.getStoredUser?.()?.localId || null;
            const addSelf = !selfIncludedInBatch && Boolean(meUid) && chunk.length < 20 && !chunk.some(([id]) => id === meUid);
            const requestUids = addSelf
              ? [...chunk.map(([id]) => id), meUid]
              : chunk.map(([id]) => id);

            const fetched = await fetchUsersBatch(requestUids, deps);
            if (!fetched) {
              chunk.forEach(([id, resolve]) => resolve(fetchSingleUserV2(id, deps)));
              continue;
            }

            const updates = {};
            if (addSelf) {
              selfIncludedInBatch = true;
              if (fetched[meUid]) {
                updates[meUid] = toCachedView(cacheProfile(meUid, fetched[meUid]));
              }
            }

            for (const [id, resolve] of chunk) {
              if (fetched[id]) {
                const view = toCachedView(cacheProfile(id, fetched[id]));
                updates[id] = view;
                resolve(view);
              } else {
                // Retry once via fetchUserV2 if batch omitted an Android/edge user
                resolve(fetchSingleUserV2(id, deps));
              }
            }
            emitProfilesUpdated(updates);
          }
        } finally {
          batchDraining = false;
        }
      })();
    }
  }
  return inFlightProfiles.get(uid);
}

/**
 * Extracts normalized self profile from `/locket/get-account-info` response
 * supporting both Firebase Auth (`users[0]`) and Locket (`user`) shapes.
 */
export function extractSelfFromAccountInfo(data, fallbackUid = '') {
  if (!data || typeof data !== 'object') return null;
  const fbUser = Array.isArray(data.users) ? data.users[0] : null;
  const locketUser = data.user && typeof data.user === 'object' ? data.user : null;

  const uid = locketUser?.uid || fbUser?.localId || fallbackUid || '';
  const mergedRaw = {
    uid,
    username: locketUser?.username || '',
    firstName: locketUser?.firstName || locketUser?.first_name || '',
    lastName: locketUser?.lastName || locketUser?.last_name || '',
    displayName: fbUser?.displayName || locketUser?.displayName || '',
    profilePicture:
      locketUser?.profilePicture ||
      locketUser?.profile_picture_url ||
      fbUser?.photoUrl ||
      '',
  };
  const norm = normalizeProfile(mergedRaw, uid);
  return norm && hasRealProfileData(norm) ? norm : null;
}

async function resolveSelfProfile(meUid, deps) {
  if (!meUid) return null;
  if (selfAccountPromise?.uid === meUid) return selfAccountPromise.promise;

  const holder = { uid: meUid, promise: null };
  holder.promise = (async () => {
    let profile = null;
    try {
      const info = await deps.getAccountInfo();
      profile = extractSelfFromAccountInfo(info, meUid);
    } catch {
      // ignore and fall back to fetchUsers
    }

    // If account-info didn't have avatar or username (common on Android Locket accounts),
    // also query Locket directly via fetchUsers / fetchUserV2!
    if (!profile?.profile_picture_url || !profile?.first_name) {
      const directMap = await fetchUsersBatch([meUid], deps).catch(() => null);
      const directProfile = directMap?.[meUid] || (await fetchSingleUserV2(meUid, deps).catch(() => null));
      if (directProfile) {
        profile = pickBetterProfile(profile, directProfile);
      }
    }

    if (profile && hasRealProfileData(profile)) {
      const cached = toCachedView(cacheProfile(meUid, profile));
      emitProfilesUpdated({ [meUid]: cached });
      return cached;
    }
    return getCachedProfile(meUid);
  })().catch(() => {
    if (selfAccountPromise === holder) selfAccountPromise = null;
    return getCachedProfile(meUid);
  });

  selfAccountPromise = holder;
  return holder.promise;
}

/**
 * Resolves a list of Locket UIDs into full profile objects `{ uid, first_name, last_name, username, profile_picture_url }`.
 */
export async function resolveProfiles(uids, deps, { refresh = false } = {}) {
  const wasUnloaded = !profilesLoaded;
  await initProfileCache();

  const meUid = deps.getStoredUser?.()?.localId || null;
  const now = Date.now();
  const immediateCached = {};
  const uniqueUids = [...new Set((uids || []).filter(Boolean))];

  const promises = uniqueUids.map((uid) => {
    if (uid === meUid) {
      return resolveSelfProfile(meUid, deps).then((prof) => [uid, prof]);
    }
    const cached = getCachedProfile(uid);
    if (cached && (!refresh || now - (cached.cached_at || 0) < PROFILE_REFRESH_INTERVAL_MS || refusedUids.has(uid))) {
      immediateCached[uid] = cached;
      return Promise.resolve([uid, cached]);
    }
    if (refusedUids.has(uid)) {
      return Promise.resolve([uid, cached || null]);
    }
    return enqueueProfileFetch(uid, deps).then((prof) => [uid, prof || cached || null]);
  });

  if (wasUnloaded && Object.keys(immediateCached).length) {
    emitProfilesUpdated(immediateCached);
  }

  const pairs = await Promise.all(promises);
  return Object.fromEntries(pairs.filter(([, prof]) => Boolean(prof)));
}

export async function getMomentActivityDirect(momentId, deps) {
  const meUid = deps.getStoredUser?.()?.localId || null;
  const [viewsRes, reactions] = await Promise.all([
    callLocketFn('getMomentViews', { moment_uid: momentId }, deps, { onMoment: true }),
    fetchMomentReactionsFirestore(momentId, deps),
  ]);

  const data = viewsRes?.data || {};
  const peopleMap = new Map();
  const ensure = (uid) => {
    if (!peopleMap.has(uid)) {
      peopleMap.set(uid, { user: uid, viewed_at: null, reactions: [] });
    }
    return peopleMap.get(uid);
  };

  for (const v of data.moment_views || []) {
    if (v?.user && v.user !== meUid) {
      ensure(v.user).viewed_at = parseTimestampIso(v.viewed_at);
    }
  }

  const otherReactions = reactions.filter((r) => r.user !== meUid);
  for (const r of otherReactions) {
    ensure(r.user).reactions.push({ emoji: r.emoji, created_at: r.created_at });
  }

  const people = [...peopleMap.values()].map((p) => {
    p.reactions.sort((a, b) => parseMs(a.created_at) - parseMs(b.created_at));
    const timestamps = [p.viewed_at, ...p.reactions.map((r) => r.created_at)].filter(Boolean);
    const lastAt = timestamps.sort((a, b) => parseMs(a) - parseMs(b)).pop() || null;
    return { ...p, last_at: lastAt };
  });
  people.sort((a, b) => parseMs(b.last_at) - parseMs(a.last_at));

  const users = await resolveProfiles(
    people.map((p) => p.user),
    deps
  );

  return {
    views: Number(data.count ?? people.filter((p) => p.viewed_at).length) || 0,
    reactions: otherReactions.length,
    people,
    users,
  };
}

/**
 * Hydrates `/locket/friends` response so BOTH legacy `{ friends, me }` and new `{ uids, count }`
 * formats return full `{ uids, count, friends: [...], me }` objects!
 */
export async function hydrateFriendsResponse(raw, deps, { refresh = false } = {}) {
  if (!raw || typeof raw !== 'object' || raw.unavailable) return raw;

  const meUid = deps.getStoredUser?.()?.localId || null;

  // Cache any profiles already returned by server (legacy shape)
  if (Array.isArray(raw.friends)) {
    const serverUpdates = {};
    for (const f of raw.friends) {
      if (f?.uid && hasRealProfileData(f)) {
        const view = toCachedView(cacheProfile(f.uid, f));
        serverUpdates[f.uid] = view;
      }
    }
    if (raw.me?.uid && hasRealProfileData(raw.me)) {
      const view = toCachedView(cacheProfile(raw.me.uid, raw.me));
      serverUpdates[raw.me.uid] = view;
    }
    emitProfilesUpdated(serverUpdates);
  }

  // Extract UIDs from either `raw.uids` (new server format) or `raw.friends` (legacy format)
  const uids = Array.isArray(raw.uids)
    ? raw.uids.filter(Boolean)
    : Array.isArray(raw.friends)
      ? raw.friends.map((f) => (typeof f === 'string' ? f : f?.uid)).filter(Boolean)
      : [];

  const existingByUid = new Map();
  if (Array.isArray(raw.friends)) {
    for (const f of raw.friends) {
      if (f && typeof f === 'object' && f.uid) {
        existingByUid.set(f.uid, f);
      }
    }
  }

  // Resolve profiles for first 40 friends + self immediately (and schedule remaining in background)
  const immediateUids = [...uids.slice(0, 40), ...(meUid ? [meUid] : [])];
  const resolvedMap = await resolveProfiles(immediateUids, deps, { refresh });

  if (uids.length > 40) {
    resolveProfiles(uids.slice(40), deps, { refresh }).catch(() => {});
  }

  const friends = uids.map((uid) => {
    const existing = existingByUid.get(uid);
    const resolved = resolvedMap[uid] || getCachedProfile(uid);
    const merged = pickBetterProfile(existing, resolved);
    return merged && hasRealProfileData(merged) ? merged : { uid, pending: !resolved };
  });

  const me =
    pickBetterProfile(raw.me, meUid ? resolvedMap[meUid] || getCachedProfile(meUid) : null) ||
    raw.me ||
    null;

  return {
    ...raw,
    uids,
    count: raw.count ?? uids.length,
    friends,
    me,
  };
}

/**
 * Hydrates `/locket/friend-requests` response so raw UID strings in `incoming` / `outgoing`
 * are converted into full user profile objects.
 */
export async function hydrateFriendRequestsResponse(raw, deps) {
  if (!raw || typeof raw !== 'object') return raw;
  const rawIncoming = Array.isArray(raw.incoming) ? raw.incoming : [];
  const rawOutgoing = Array.isArray(raw.outgoing) ? raw.outgoing : [];

  const toUid = (item) => (typeof item === 'string' ? item : item?.uid || null);
  const allUids = [...rawIncoming.map(toUid), ...rawOutgoing.map(toUid)].filter(Boolean);
  const resolved = allUids.length ? await resolveProfiles(allUids, deps) : {};

  const mapItem = (item) => {
    if (typeof item === 'string') {
      return resolved[item] || getCachedProfile(item) || { uid: item };
    }
    if (item?.uid) {
      return pickBetterProfile(item, resolved[item.uid] || getCachedProfile(item.uid)) || item;
    }
    return item;
  };

  return {
    ...raw,
    incoming: rawIncoming.map(mapItem),
    outgoing: rawOutgoing.map(mapItem),
  };
}

/**
 * Hydrates feed or conversation response users map from cache and kicks off background profile fetch.
 */
export function hydrateUsersFromUids(existingUsers, uids, deps) {
  const meUid = deps.getStoredUser?.()?.localId || null;
  const uniqueUids = [...new Set((uids || []).filter((u) => u && u !== meUid))];
  const out = { ...(existingUsers || {}) };
  const needFetch = [];

  for (const uid of uniqueUids) {
    const cached = getCachedProfile(uid);
    const merged = pickBetterProfile(out[uid], cached);
    if (merged && hasRealProfileData(merged)) {
      out[uid] = merged;
      if (out[uid] && !cached) {
        cacheProfile(uid, out[uid]);
      }
    } else {
      out[uid] = out[uid] || { uid, pending: true };
      needFetch.push(uid);
    }
  }

  if (needFetch.length) {
    resolveProfiles(needFetch, deps).catch(() => {});
  }
  return out;
}
