import axios from 'axios';
import { getAuthToken, clearAuthToken } from './authToken';
import { isTelegramMiniApp } from './telegram';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// BUG FIX (Aug 2026): this used to be 15000ms — WAY too short for Render's
// free tier, which explicitly warns cold-starts can take "50 seconds or
// more" after ~15 minutes of inactivity. Every request that happened to
// land while the backend was asleep was getting aborted by axios itself
// after 15s, well before the server even finished waking up — showing up
// as "Failed to load X" everywhere, on both frontend domains (they share
// the same backend), for any user unlucky enough to hit a cold server.
// Logging out and back in "fixed" it only because enough time had passed
// for the server to finish waking up in the background by then — nothing
// about login itself was actually the fix.
const COLD_START_TIMEOUT_MS = 60000; // 60s — comfortably covers Render's stated worst case

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: COLD_START_TIMEOUT_MS,
});

// NOTE: no request interceptor needed anymore to attach a token — the real
// session token now lives in an httpOnly cookie (set by the backend on
// login/register), which the browser attaches automatically to every
// request because of `withCredentials: true` above. There is no JS-readable
// token to read from localStorage anymore (that was the XSS exposure this
// migration removes).

// NOTE: the primary session token lives in an httpOnly cookie (set by the
// backend on login/register), attached automatically via `withCredentials:
// true` above — no request interceptor needed for that. This one IS
// needed for the fallback: see lib/authToken.ts for why the cookie alone
// isn't always enough (Safari/Firefox/Brave block it as third-party) and
// attaches the fallback token as a Bearer header whenever one is held.
// Completely harmless to send even when the cookie worked fine — the
// backend just checks the cookie first and ignores this header entirely
// when it's already authenticated that way.
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle auth errors + cold-start retry ─────────────
// NEW: automatically retries ONCE on a timeout or network error (never on
// a real HTTP error response like 400/401/500 — those are genuine
// failures, retrying won't help and would be wrong for something like a
// duplicate POST). This is specifically for the Render-cold-start case:
// the FIRST request may have been what woke the server up in the first
// place, so a second attempt shortly after often just succeeds outright
// instead of the person needing to manually reload or re-login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isColdStartLikely = !error.response && (error.code === 'ECONNABORTED' || error.message === 'Network Error');

    if (isColdStartLikely && config && !config.__retriedAfterColdStart) {
      config.__retriedAfterColdStart = true;
      try {
        return await api(config);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }

    // BUG FIX (Aug 2026): this used to fire on ANY 401, app-wide — including
    // from login/register/telegram-link attempts THEMSELVES, where a 401
    // just means "wrong password" and is normal, expected, locally-handled
    // validation, not a sign the user's actual session died. That made a
    // wrong password on the Telegram in-app "link my account" form hard-
    // redirect the whole Telegram Mini App WebView to the full standalone
    // /login page — breaking out of the Mini App experience entirely,
    // right in the middle of what should have been a small inline retry.
    // Auth-attempt endpoints handle their own 401s locally (see each
    // page's own catch block) and must never trigger this global redirect.
    const AUTH_ATTEMPT_PATHS = [
      '/auth/login', '/auth/register',
      '/auth/telegram', '/auth/telegram/check', '/auth/telegram/link',
    ];
    const isAuthAttempt = AUTH_ATTEMPT_PATHS.some(p => (config?.url || '').includes(p));

    if (error.response?.status === 401 && typeof window !== 'undefined' && !isAuthAttempt) {
      // Clear client-side auth state and redirect to login. The httpOnly
      // cookie itself is cleared server-side by /auth/logout (called from
      // the Sidebar sign-out handler) — if it's simply expired/invalid,
      // it'll keep failing auth checks harmlessly until it's overwritten by
      // a fresh login.
      localStorage.removeItem('mp_auth-storage'); // Zustand persist key
      clearAuthToken(); // fallback Bearer token — see lib/authToken.ts
      document.cookie = 'mp_role=; path=/; max-age=0';
      // Inside the Telegram Mini App, /login is a dead end (nobody there
      // has a password they know) — send them back to /telegram instead,
      // which re-runs the initData flow. See Sidebar.tsx's logout handler
      // for the same isTelegramMiniApp() pattern.
      window.location.href = isTelegramMiniApp() ? '/telegram' : '/login';
    }
    return Promise.reject(error);
  }
);
