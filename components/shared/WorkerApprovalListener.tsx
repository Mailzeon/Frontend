'use client';
import { useEffect } from 'react';
import { onSocketReady, SOCKET_EVENTS } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/toast';

/**
 * Listens for the 'worker-approved' socket event (emitted by
 * admin.routes.ts when an admin approves a worker) and updates the
 * worker's own `isApproved` flag in authStore immediately.
 *
 * Without this, the backend event fired correctly but nothing on the
 * frontend was listening for it — so a freshly-approved worker's dashboard
 * kept showing "pending approval" until they manually logged out and back
 * in (which re-fetches a fresh user object from the login response). This
 * closes that gap so approval reflects live, the moment the socket event
 * arrives — no re-login needed.
 *
 * Uses onSocketReady() rather than getSocket() directly, since React fires
 * child-component effects before parent-component effects on mount — this
 * component (nested under WorkerLayout) could otherwise run before
 * SocketBootstrap (in the root layout) has actually created the socket.
 */
export function WorkerApprovalListener() {
  const updateUser = useAuthStore(s => s.updateUser);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    onSocketReady((socket) => {
      const handleApproved = () => {
        updateUser({ isApproved: true });
        toast.success('🎉 Your account has been approved! You can now accept orders.');
      };
      socket.on(SOCKET_EVENTS.WORKER_APPROVED, handleApproved);
      cleanup = () => socket.off(SOCKET_EVENTS.WORKER_APPROVED, handleApproved);
    });

    return () => cleanup?.();
  }, [updateUser]);

  return null;
}
