import axios from 'axios';

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

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear client-side auth state and redirect to login. The httpOnly
      // cookie itself is cleared server-side by /auth/logout (called from
      // the Sidebar sign-out handler) — if it's simply expired/invalid,
      // it'll keep failing auth checks harmlessly until it's overwritten by
      // a fresh login.
      localStorage.removeItem('mp_auth-storage'); // Zustand persist key
      document.cookie = 'mp_role=; path=/; max-age=0';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
