'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { initSocket, getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { Notification } from '@/types';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';

export function useSocket() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const { addNotification }     = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    const socket = initSocket(user._id, user.role);

    // Generic notification push from server
    socket.on(SOCKET_EVENTS.NOTIFICATION, (notification: Notification) => {
      addNotification(notification);
    });

    // Fetches fresh user data from the server and applies it — shared by
    // both the approval/suspension handlers below AND the reconnect
    // resilience further down, so there's one place that knows how to
    // "get the truth" rather than each caller updating fields by hand.
    //
    // BUG FIX (Aug 2026): the real session cookie is scoped to the
    // BACKEND's own domain (see backend utils/cookies.ts), not to
    // whichever frontend domain/app the person is using — so logging into
    // a DIFFERENT account anywhere else on the SAME device/browser (even
    // a different tab, or an installed PWA that shares the browser's
    // cookie storage) silently overwrites it. The tab that was open
    // before that keeps showing its OLD cached user/role locally, but
    // every API call it makes now actually authenticates as whoever
    // logged in most recently — leading to "Failed to load" (403s from
    // hitting admin routes with a worker's token), or worse, one
    // account's page quietly showing a DIFFERENT account's real data.
    // This check catches that the moment it's detected (`_id` mismatch
    // between the cached user and what the session actually resolves to
    // right now) and forces a clean logout + explanation, instead of
    // silently rendering wrong/mixed-up data under the old page.
    const refreshMe = async (fallback?: Partial<{ isApproved: boolean }>) => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.success && data.data) {
          if (data.data._id !== user._id) {
            clearAuth();
            toast.error("You're now logged in as a different account in this browser. Please log in again.");
            window.location.href = '/login';
            return;
          }
          updateUser({
            isApproved: data.data.isApproved,
            level:      data.data.level,
            isOnline:   data.data.isOnline,
          });
          return;
        }
      } catch { /* fall through to the fallback below */ }
      if (fallback) updateUser(fallback);
    };

    // Run once immediately on mount too, not just on reconnect — catches
    // the mismatch right on a fresh page load, not only after a socket
    // drop/reconnect cycle.
    refreshMe();

    // FIX: When admin approves worker, update authStore immediately.
    // Without this, the old cached isApproved:false stays until next login.
    socket.on(SOCKET_EVENTS.WORKER_APPROVED, () => {
      refreshMe({ isApproved: true });
    });

    // FIX: suspension previously had no listener at all (and the backend
    // didn't even emit an event for it — see admin.routes.ts) — a
    // suspended worker's UI kept saying "approved" until they happened to
    // log out and back in.
    socket.on(SOCKET_EVENTS.WORKER_SUSPENDED, () => {
      updateUser({ isApproved: false });
    });

    // Resilience: a single real-time event can be missed if the socket
    // happened to be disconnected at that exact moment (e.g. Render's free
    // tier spins the backend down after inactivity, so a connection can
    // silently drop and take 50s+ to come back). Re-checking /auth/me on
    // every reconnect is a self-healing fallback so approval/suspension
    // status is never permanently stuck showing stale data — the next
    // reconnect always corrects it, no logout required.
    const onReconnect = () => refreshMe();
    socket.on('connect', onReconnect);

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION);
      socket.off(SOCKET_EVENTS.WORKER_APPROVED);
      socket.off(SOCKET_EVENTS.WORKER_SUSPENDED);
      socket.off('connect', onReconnect);
    };
  }, [user, updateUser, addNotification]);

  return getSocket();
}
