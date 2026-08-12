'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';

/**
 * Live status for the dispute-strike penalty (see backend
 * user.service.ts applyStrike()). Only meaningful for workers.
 *
 * - Refetches the user's own profile on mount and whenever a 'dispute'
 *   notification arrives over the socket, so a strike applied while this
 *   tab is already open shows up without a manual refresh.
 * - Ticks a live countdown every second while locked.
 */
export function useLockStatus() {
  const { user, updateUser } = useAuthStore();
  const [now, setNow] = useState(() => Date.now());

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) updateUser(data.data);
    } catch {
      // Non-fatal — worst case the lock status is a bit stale until next refresh.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshUser();

    const socket = getSocket();
    if (!socket) return;
    const onNotification = (payload: { type?: string }) => {
      if (payload?.type === 'dispute') refreshUser();
    };
    socket.on(SOCKET_EVENTS.NOTIFICATION, onNotification);
    return () => { socket.off(SOCKET_EVENTS.NOTIFICATION, onNotification); };
  }, [refreshUser]);

  const lockedUntilMs = user?.lockedUntil ? new Date(user.lockedUntil).getTime() : 0;
  const isLocked = lockedUntilMs > now;
  // Mirrors backend utils/permanentLock.ts's PERMANENT_LOCK_DATE convention
  // (year 9999) — without this, a permanently banned worker saw a
  // nonsensical countdown like "69895344:00:00" instead of a clear
  // "permanently banned" message, since formattedTime just naively counted
  // down the raw milliseconds remaining until that far-future date.
  const isPermanent = isLocked && new Date(lockedUntilMs).getFullYear() > new Date().getFullYear() + 50;

  useEffect(() => {
    if (!isLocked || isPermanent) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isLocked, isPermanent]);

  const msRemaining = Math.max(0, lockedUntilMs - now);
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hh = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const mm = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');

  return {
    isLocked,
    isPermanent,
    strikeCount: user?.strikeCount ?? 0,
    formattedTime: isPermanent ? '' : `${hh}:${mm}:${ss}`,
  };
}
