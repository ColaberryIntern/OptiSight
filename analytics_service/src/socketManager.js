const { Server } = require('socket.io');
const { logger } = require('@retail-insight/shared');

let io = null;

/**
 * Initialize Socket.IO server on the given HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    logger.info({ message: 'Socket connected', socketId: socket.id, userId });

    if (userId) {
      socket.join(`user:${userId}`);
      logger.info({ message: 'Socket joined user room', socketId: socket.id, room: `user:${userId}` });
    }

    socket.on('disconnect', (reason) => {
      logger.info({ message: 'Socket disconnected', socketId: socket.id, userId, reason });
    });
  });

  logger.info({ message: 'Socket.IO server initialized' });
  return io;
}

/**
 * Get the Socket.IO server instance.
 * @returns {import('socket.io').Server}
 * @throws {Error} if not initialized
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call init(httpServer) first.');
  }
  return io;
}

/**
 * Emit an event to a specific user room.
 * @param {string} userId
 * @param {string} event
 * @param {*} data
 */
function emitToUser(userId, event, data) {
  const server = getIO();
  server.to(`user:${userId}`).emit(event, data);
  logger.info({ message: 'Emitted to user', userId, event });
}

/**
 * Broadcast an event to all connected clients.
 * @param {string} event
 * @param {*} data
 */
function emitToAll(event, data) {
  const server = getIO();
  server.emit(event, data);
  logger.info({ message: 'Emitted to all clients', event });
}

/**
 * Reset the io instance (used for testing).
 */
function reset() {
  io = null;
}

module.exports = {
  init,
  getIO,
  emitToUser,
  emitToAll,
  reset,
};
