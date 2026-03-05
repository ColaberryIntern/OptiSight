const http = require('http');

// Mock the shared logger
jest.mock('@retail-insight/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const socketManager = require('../../src/socketManager');

describe('socketManager', () => {
  afterEach(() => {
    socketManager.reset();
  });

  describe('getIO()', () => {
    it('should throw if not initialized', () => {
      expect(() => socketManager.getIO()).toThrow(
        'Socket.IO has not been initialized. Call init(httpServer) first.'
      );
    });
  });

  describe('init()', () => {
    it('should create a Socket.IO instance and return it', () => {
      const server = http.createServer();
      const io = socketManager.init(server);

      expect(io).toBeDefined();
      expect(typeof io.on).toBe('function');
      expect(typeof io.emit).toBe('function');

      server.close();
    });

    it('should allow getIO() after init', () => {
      const server = http.createServer();
      socketManager.init(server);

      const io = socketManager.getIO();
      expect(io).toBeDefined();
      expect(typeof io.emit).toBe('function');

      server.close();
    });
  });

  describe('emitToUser()', () => {
    it('should emit to a user-specific room', () => {
      const server = http.createServer();
      const io = socketManager.init(server);

      const toSpy = jest.fn().mockReturnValue({ emit: jest.fn() });
      io.to = toSpy;

      socketManager.emitToUser('user-123', 'test:event', { foo: 'bar' });

      expect(toSpy).toHaveBeenCalledWith('user:user-123');
      expect(toSpy().emit).toHaveBeenCalledWith('test:event', { foo: 'bar' });

      server.close();
    });

    it('should throw if not initialized', () => {
      expect(() => socketManager.emitToUser('user-1', 'evt', {})).toThrow(
        'Socket.IO has not been initialized'
      );
    });
  });

  describe('emitToAll()', () => {
    it('should broadcast to all connected clients', () => {
      const server = http.createServer();
      const io = socketManager.init(server);

      const emitSpy = jest.fn();
      io.emit = emitSpy;

      socketManager.emitToAll('global:event', { count: 5 });

      expect(emitSpy).toHaveBeenCalledWith('global:event', { count: 5 });

      server.close();
    });

    it('should throw if not initialized', () => {
      expect(() => socketManager.emitToAll('evt', {})).toThrow(
        'Socket.IO has not been initialized'
      );
    });
  });

  describe('reset()', () => {
    it('should clear the io instance', () => {
      const server = http.createServer();
      socketManager.init(server);

      expect(() => socketManager.getIO()).not.toThrow();

      socketManager.reset();

      expect(() => socketManager.getIO()).toThrow(
        'Socket.IO has not been initialized'
      );

      server.close();
    });
  });
});
