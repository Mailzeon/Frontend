import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
});

// NOTE: no request interceptor needed anymore to attach a token — the real
// session token now lives in an httpOnly cookie (set by the backend on
// login/register), which the browser attaches automatically to every
// request because of `withCredentials: true` above. There is no JS-readable
// token to read from localStorage anymore (that was the XSS exposure this
// migration removes).

// ─── Response interceptor — handle auth errors ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
