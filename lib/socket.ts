import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;
const readyCallbacks: Array<() => void> = [];

export const initSocket = (userId: string, role: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials:     true,
    autoConnect:         true,
    reconnectionAttempts: 5,
    reconnectionDelay:   2000,
    // Use polling first, then upgrade to WebSocket
    // Required for Render free tier which may not support immediate WS upgrades
    transports: ['polling', 'websocket'],
  });

  socket.on('connect', () => {
    socket?.emit('join-room', userId);
    if (role === 'worker') socket?.emit('join-marketplace');
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  // Flush anything waiting on the socket to exist (see onSocketReady below) —
  // handles components that mounted and subscribed BEFORE initSocket() ran
  // (e.g. React fires child effects before parent effects on mount, so a
  // nested listener component can easily run before the root layout's
  // bootstrap effect that calls initSocket()).
  readyCallbacks.splice(0).forEach(cb => cb());

  return socket;
};

export const getSocket = (): Socket | null => socket;

/**
 * Calls `callback` once the socket exists — immediately if it already does,
 * otherwise as soon as initSocket() runs. Use this instead of getSocket()
 * directly in any component that needs to attach a listener on mount, since
 * mount order between the socket-bootstrapping component and any listener
 * component isn't guaranteed.
 */
export const onSocketReady = (callback: (s: Socket) => void): void => {
  if (socket) { callback(socket); return; }
  readyCallbacks.push(() => { if (socket) callback(socket); });
};

export const disconnectSocket = (): void => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const SOCKET_EVENTS = {
  NEW_ORDER:          'new-order',
  ORDER_ACCEPTED:     'order-accepted',
  CREDENTIALS_READY:  'credentials-ready',
  ORDER_COMPLETED:    'order-completed',
  ORDER_CANCELLED:    'order-cancelled',
  NUMBER_SUBMITTED:   'number-submitted',
  NUMBER_CONFIRMED:   'number-confirmed',
  WITHDRAWAL_DONE:    'withdrawal-done',
  WORKER_APPROVED:    'worker-approved',
  WORKER_SUSPENDED:   'worker-suspended',
  NOTIFICATION:       'notification',
} as const;
