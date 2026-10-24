/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { API_BASE_URL, CHAT_API_URL } from '../lib/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  hasPassword?: boolean;
  googleLinked?: boolean;
}

/** What the backend returns from login / register-verify / refresh. */
export interface Session {
  accessToken: string;
  expiresIn: number;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (session: Session) => void;
  logout: () => Promise<void>;
  /** A non-expired access token, refreshing first if needed (null when logged out). */
  getValidToken: () => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  getValidToken: async () => null,
});

// Separate instance so auth calls never pass through the interceptors below (no refresh loops)
const authHttp = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } });

const NO_AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout', '/api/auth/password/forgot', '/api/auth/password/reset', '/api/auth/config', '/api/auth/google'];
const isOurApi = (url = '') => url.startsWith(API_BASE_URL) || url.startsWith(CHAT_API_URL);
const needsAuth = (url = '') => isOurApi(url) && !NO_AUTH_PATHS.some(p => url.includes(p));

// Lets other tabs know about logout so they drop their in-memory token too
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('devos-auth') : null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs mirror state so interceptors (registered once) always see current values
  const tokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    expiresAtRef.current = 0;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setToken(null);
    setUser(null);
  }, []);

  // The timer calls through a ref so applySession and refresh don't depend on each other
  const refreshRef = useRef<() => Promise<string | null>>(async () => null);

  const applySession = useCallback((session: Session) => {
    tokenRef.current = session.accessToken;
    // Treat the token as expired a minute early so requests never race the expiry
    const lifetimeMs = Math.max(30, session.expiresIn - 60) * 1000;
    expiresAtRef.current = Date.now() + lifetimeMs;
    setToken(session.accessToken);
    setUser(session.user);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => { refreshRef.current(); }, lifetimeMs);
  }, []);

  const refresh = useCallback((): Promise<string | null> => {
    // Concurrent callers share one request (the refresh token rotates on every use)
    if (!refreshInFlight.current) {
      refreshInFlight.current = authHttp.post<Session>('/api/auth/refresh')
        .then(res => {
          applySession(res.data);
          return res.data.accessToken;
        })
        .catch(() => {
          clearSession();
          return null;
        })
        .finally(() => {
          refreshInFlight.current = null;
        });
    }
    return refreshInFlight.current;
  }, [applySession, clearSession]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const getValidToken = useCallback(async () => {
    if (tokenRef.current && Date.now() < expiresAtRef.current) return tokenRef.current;
    return refresh();
  }, [refresh]);

  const login = useCallback((session: Session) => {
    applySession(session);
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await authHttp.post('/api/auth/logout');
    } catch {
      // Clearing local state below is what matters; the server-side token expires anyway
    }
    clearSession();
    channel?.postMessage('logout');
  }, [clearSession]);

  // Restore the session from the httpOnly refresh cookie on page load
  useEffect(() => {
    try {
      localStorage.removeItem('userInfo'); // tokens used to be stored here; never again
    } catch {
      // storage unavailable
    }
    refresh().finally(() => setIsLoading(false));
    if (channel) {
      channel.onmessage = (e) => { if (e.data === 'logout') clearSession(); };
    }
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refresh, clearSession]);

  // Attach a fresh token to every call to our APIs, and retry once after refreshing on 401
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(async (config) => {
      if (needsAuth(config.url)) {
        const fresh = await getValidToken();
        if (fresh) config.headers.set('Authorization', `Bearer ${fresh}`);
      }
      return config;
    });
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
        if (error.response?.status === 401 && config && needsAuth(config.url) && !config._retried) {
          config._retried = true;
          const fresh = await refresh();
          if (fresh) {
            config.headers = { ...(config.headers || {}), Authorization: `Bearer ${fresh}` };
            return axios(config);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [getValidToken, refresh]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, getValidToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export { authHttp };
