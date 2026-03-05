import { io } from 'socket.io-client';

let socket = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

/**
 * Connect to the Socket.IO server.
 * @param {string} token - JWT auth token
 * @param {string} userId - User ID to join user-specific room
 * @returns {import('socket.io-client').Socket}
 */
export function connect(token, userId) {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    path: '/socket.io/',
    query: { userId },
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.info('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    // eslint-disable-next-line no-console
    console.error('[Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.info('[Socket] Disconnected:', reason);
  });

  return socket;
}

/**
 * Disconnect from the Socket.IO server.
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to a socket event.
 * @param {string} event
 * @param {Function} callback
 */
export function on(event, callback) {
  if (socket) {
    socket.on(event, callback);
  }
}

/**
 * Unsubscribe from a socket event.
 * @param {string} event
 * @param {Function} callback
 */
export function off(event, callback) {
  if (socket) {
    socket.off(event, callback);
  }
}

/**
 * Get current socket instance (for testing or advanced use).
 * @returns {import('socket.io-client').Socket | null}
 */
export function getSocket() {
  return socket;
}

/**
 * Check if currently connected.
 * @returns {boolean}
 */
export function isConnected() {
  return socket ? socket.connected : false;
}
