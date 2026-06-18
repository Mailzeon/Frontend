'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/store/notificationStore';
import { ApiResponse, Notification } from '@/types';

export function useNotifications() {
  const { setNotifications, markAsRead, markAllAsRead, notifications, unreadCount } =
    useNotificationStore();

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get<ApiResponse<Notification[]>>('/notifications');
        if (data.success && data.data) {
          setNotifications(data.data);
        }
      } catch {
        // Notifications are non-critical — silently fail
      }
    };
    fetch();
  }, [setNotifications]);

  const handleMarkAsRead = async (id: string) => {
    markAsRead(id); // Optimistic update
    try { await api.patch(`/notifications/${id}/read`); } catch { /* ignore */ }
  };

  const handleMarkAllAsRead = async () => {
    markAllAsRead(); // Optimistic update
    try { await api.patch('/notifications/read-all'); } catch { /* ignore */ }
  };

  return { notifications, unreadCount, handleMarkAsRead, handleMarkAllAsRead };
}
