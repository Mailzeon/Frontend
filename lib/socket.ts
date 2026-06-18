import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

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

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const SOCKET_EVENTS = {
  NEW_ORDER:          'new-order',
  ORDER_ACCEPTED:     'order-accepted',
  CREDENTIALS_READY:  'credentials-ready',
  ORDER_COMPLETED:    'order-completed',
  ORDER_CANCELLED:    'order-cancelled',
  CODE_REQUESTED:     'code-requested',
  CODE_RECEIVED:      'code-received',
  NEW_CODE_REQUESTED: 'new-code-requested',
  WITHDRAWAL_DONE:    'withdrawal-done',
  WORKER_APPROVED:    'worker-approved',
  NOTIFICATION:       'notification',
} as const;
