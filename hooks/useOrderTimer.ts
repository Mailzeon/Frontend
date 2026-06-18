'use client';

import { useEffect, useCallback } from 'react';
import { useOrderStore } from '@/store/orderStore';

/**
 * Drives the 10-minute credential submission countdown.
 * Call this inside the worker's active order page.
 * Returns { seconds, isExpired, formattedTime }
 */
export function useOrderTimer(timerExpiresAt?: string) {
  const { timerSeconds, timerRunning, setTimerSeconds, setTimerRunning } = useOrderStore();

  const calculateSeconds = useCallback((): number => {
    if (!timerExpiresAt) return 0;
    const diff = Math.floor((new Date(timerExpiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }, [timerExpiresAt]);

  useEffect(() => {
    if (!timerExpiresAt) return;

    const initial = calculateSeconds();
    setTimerSeconds(initial);
    setTimerRunning(initial > 0);

    if (initial <= 0) return;

    const interval = setInterval(() => {
      const remaining = calculateSeconds();
      setTimerSeconds(remaining);
      if (remaining <= 0) {
        setTimerRunning(false);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerExpiresAt, calculateSeconds, setTimerSeconds, setTimerRunning]);

  const mm = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const ss = (timerSeconds % 60).toString().padStart(2, '0');

  return {
    seconds:       timerSeconds,
    isExpired:     timerSeconds <= 0 && timerRunning === false,
    isWarning:     timerSeconds <= 120 && timerSeconds > 0, // red in last 2 minutes
    formattedTime: `${mm}:${ss}`,
  };
}
