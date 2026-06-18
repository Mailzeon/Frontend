import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
});

// ─── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Read token from localStorage (set on login by authStore)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('mp_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle auth errors ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear all auth state and redirect to login
      localStorage.removeItem('mp_token');
      localStorage.removeItem('mp_auth-storage'); // Zustand persist key
      document.cookie = 'mp_token=; path=/; max-age=0';
      document.cookie = 'mp_role=; path=/; max-age=0';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
