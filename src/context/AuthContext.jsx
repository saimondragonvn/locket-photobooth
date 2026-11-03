import React, { createContext, useEffect, useMemo, useState } from 'react';
import { registerModules, requireModule } from '../runtime/moduleRegistry.js';

export const AuthContext = createContext();

function extractLocalId(rawJson) {
  try {
    return JSON.parse(rawJson || 'null')?.localId || null;
  } catch {
    return null;
  }
}

/**
 * Purges any legacy offline/demo session ("isDemo" / "demo-local") so users
 * always authenticate with real Locket accounts cleanly.
 */
export function purgeLegacyDemoSession(storageMod) {
  try {
    const raw = localStorage.getItem('locket_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.isDemo || parsed?.localId === 'demo-local') {
        localStorage.removeItem('locket_user');
        storageMod?.Yj?.('user');
      }
    }
    const cookieRaw = storageMod?.Ri?.('user');
    if (cookieRaw) {
      const parsedCookie = typeof cookieRaw === 'string' ? JSON.parse(cookieRaw) : cookieRaw;
      if (parsedCookie?.isDemo || parsedCookie?.localId === 'demo-local') {
        storageMod?.Yj?.('user');
      }
    }
  } catch {
    // Ignore malformed storage entries
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storage = requireModule(8785);
      const api = requireModule(8406);
      purgeLegacyDemoSession(storage);

      const stored = api.$$() || storage.Ri('user');
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        setUser(parsed);
        setLoading(false);
        const refreshed = await api.y3();
        if (refreshed) setUser(refreshed);
      } else {
        try {
          const relogged = await api.Tc();
          if (relogged) setUser(relogged);
        } catch {
          // Silent fallback to login screen
        }
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const api = requireModule(8406);
    const toastMod = requireModule(3401);
    const cfgMod = requireModule(1016);

    const onExpired = () => {
      setUser(null);
      const msg = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
      toastMod.oR.error(msg, { ...cfgMod.A.toastSettings, toastId: msg });
    };

    const onStorage = (evt) => {
      if (evt.key === null) {
        window.location.replace('/');
        return;
      }
      if (evt.key !== 'locket_user') return;
      const prevId = extractLocalId(evt.oldValue);
      const nextId = extractLocalId(evt.newValue);
      if (prevId !== nextId) {
        if (nextId) window.location.replace('/dashboard');
        else setUser(null);
      }
    };

    window.addEventListener(api.gb, onExpired);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(api.gb, onExpired);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const localId = user?.localId;
  useEffect(() => {
    if (localId) {
      const accounts = requireModule(4891);
      accounts.uG();
    }
  }, [localId]);

  const ctxValue = useMemo(() => ({ user, setUser, loading }), [user, loading]);
  return <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>;
}

registerModules({
  5016: (_e, t, n) => {
    n.d(t, { O: () => AuthProvider, c: () => AuthContext });
  },
});
