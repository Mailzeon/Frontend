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

    // FIX: When admin approves worker, update authStore immediately
    // Without this, the old cached isApproved:false stays until next login
    socket.on(SOCKET_EVENTS.WORKER_APPROVED, async () => {
      try {
        // Fetch fresh user data from server to get isApproved: true
        const { data } = await api.get('/auth/me');
        if (data.success && data.data) {
          updateUser({
            isApproved: true,
            level:       data.data.level,
            isOnline:    data.data.isOnline,
          });
        }
      } catch {
        // Fallback: just update the flag directly
        updateUser({ isApproved: true });
      }
    });

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION);
      socket.off(SOCKET_EVENTS.WORKER_APPROVED);
    };
  }, [user, updateUser, addNotification]);

  return getSocket();
}
