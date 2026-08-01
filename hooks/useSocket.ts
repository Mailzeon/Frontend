'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { initSocket, getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { Notification } from '@/types';
import { api } from '@/lib/api';

export function useSocket() {
  const { user, updateUser }    = useAuthStore();
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
    const refreshMe = async (fallback?: Partial<{ isApproved: boolean }>) => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.success && data.data) {
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
