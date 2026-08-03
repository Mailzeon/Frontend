'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

/**
 * Detects whether the site is currently running as an installed PWA
 * (standalone mode — home-screen icon, no browser address bar) and, if so,
 * pings the backend once per app-open so admin can see who's actually
 * using the installed app vs. the plain browser (see admin/users page).
 *
 * Not a perfect signal — there's no event for "just uninstalled" or
 * "installed but never reopened" — but reliably reflects recent installed
 * usage, which is what actually matters here (e.g. for judging whether the
 * install push is working, or whether a worker's push notifications are
 * likely to be reliable on iOS specifically).
 */
export function AppInstallDetector() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true; // iOS Safari's own flag

    if (isStandalone) {
      api.post('/users/mark-installed').catch(() => {}); // Non-critical, fire-and-forget
    }
  }, [isAuthenticated]);

  return null;
}
