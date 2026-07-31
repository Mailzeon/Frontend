'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { initSocket, getSocket } from '@/lib/socket';

/**
 * Ensures the Socket.IO connection exists on EVERY page load for an
 * already-authenticated session — not just the moment right after a
 * login/register form submits (which is the only place initSocket() was
 * previously called). Without this, refreshing the browser, opening the
 * app in a new tab, or closing and reopening it left a logged-in user with
 * no live socket connection at all for the rest of that session — meaning
 * every real-time feature (new-order alerts, notifications, worker
 * approval, dispute updates, etc.) silently stopped working until the next
 * manual login.
 *
 * Waits for the auth store to finish rehydrating from localStorage
 * (`_hasHydrated`) before checking, since `user`/`isAuthenticated` are both
 * momentarily null/false on first render otherwise.
 */
export function SocketBootstrap() {
  const hasHydrated     = useAuthStore(s => s._hasHydrated);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user            = useAuthStore(s => s.user);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !user) return;
    if (getSocket()?.connected) return;
    initSocket(user._id, user.role);
  }, [hasHydrated, isAuthenticated, user]);

  return null;
}
