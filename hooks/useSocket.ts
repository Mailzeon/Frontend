'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { initSocket, getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { Notification } from '@/types';

export function useSocket() {
  const { user }            = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    const socket = initSocket(user._id, user.role);

    socket.on(SOCKET_EVENTS.NOTIFICATION, (notification: Notification) => {
      addNotification(notification);
    });

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION);
    };
  }, [user, addNotification]);

  return getSocket();
}
