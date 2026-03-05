// Store event handlers so we can trigger them from tests
const eventHandlers = {};

const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  on: jest.fn((event, handler) => {
    eventHandlers[event] = handler;
    // Auto-trigger connect to simulate successful connection
    if (event === 'connect') {
      handler();
    }
    return mockRedisInstance;
  }),
};

jest.mock('ioredis', () => {
  return jest.fn(() => mockRedisInstance);
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const cache = require('../utils/cache');
const cacheMiddleware = require('../middleware/cacheMiddleware');

describe('Cache utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-register the auto-connect behavior after clearing mocks
    mockRedisInstance.on.mockImplementation((event, handler) => {
      eventHandlers[event] = handler;
      if (event === 'connect') {
        handler();
      }
      return mockRedisInstance;
    });
  });

  test('getCache returns null when key does not exist', async () => {
    mockRedisInstance.get.mockResolvedValue(null);

    const result = await cache.getCache('nonexistent-key');

    expect(result).toBeNull();
    expect(mockRedisInstance.get).toHaveBeenCalledWith('nonexistent-key');
  });

  test('setCache + getCache roundtrip works correctly', async () => {
    const testData = { name: 'test', value: 42 };
    mockRedisInstance.set.mockResolvedValue('OK');
    mockRedisInstance.get.mockResolvedValue(JSON.stringify(testData));

    await cache.setCache('test-key', testData, 300);
    const result = await cache.getCache('test-key');

    expect(mockRedisInstance.set).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify(testData),
      'EX',
      300
    );
    expect(result).toEqual(testData);
  });

  test('deleteCache removes the key', async () => {
    mockRedisInstance.del.mockResolvedValue(1);

    await cache.deleteCache('test-key');

    expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
  });

  test('deleteCachePattern removes matching keys', async () => {
    mockRedisInstance.keys.mockResolvedValue(['prefix:a', 'prefix:b', 'prefix:c']);
    mockRedisInstance.del.mockResolvedValue(3);

    await cache.deleteCachePattern('prefix:*');

    expect(mockRedisInstance.keys).toHaveBeenCalledWith('prefix:*');
    expect(mockRedisInstance.del).toHaveBeenCalledWith('prefix:a', 'prefix:b', 'prefix:c');
  });

  test('graceful degradation when Redis get throws an error', async () => {
    mockRedisInstance.get.mockRejectedValue(new Error('Connection refused'));

    const result = await cache.getCache('any-key');

    expect(result).toBeNull();
  });

  test('graceful degradation when Redis set throws an error', async () => {
    mockRedisInstance.set.mockRejectedValue(new Error('Connection refused'));

    // Should not throw
    await expect(cache.setCache('any-key', { data: 1 }, 300)).resolves.toBeUndefined();
  });

  test('getRedisClient returns a client instance', () => {
    const client = cache.getRedisClient();
    expect(client).toBeDefined();
    expect(client).toBe(mockRedisInstance);
  });
});

describe('cacheMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisInstance.on.mockImplementation((event, handler) => {
      eventHandlers[event] = handler;
      if (event === 'connect') {
        handler();
      }
      return mockRedisInstance;
    });
    req = { originalUrl: '/api/v1/analytics/test?period=30d' };
    next = jest.fn();
    res = {
      json: jest.fn().mockReturnValue(undefined),
    };
  });

  test('returns cached response when cache hit', async () => {
    const cachedData = { revenue: 50000, period: '30d' };
    mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));

    const middleware = cacheMiddleware('analytics', 300);
    await middleware(req, res, next);

    expect(mockRedisInstance.get).toHaveBeenCalledWith(
      'analytics:/api/v1/analytics/test?period=30d'
    );
    expect(res.json).toHaveBeenCalledWith(cachedData);
    expect(next).not.toHaveBeenCalled();
  });

  test('caches new response on cache miss and calls next', async () => {
    mockRedisInstance.get.mockResolvedValue(null);
    mockRedisInstance.set.mockResolvedValue('OK');

    const middleware = cacheMiddleware('analytics', 600);
    await middleware(req, res, next);

    // Should call next since no cache hit
    expect(next).toHaveBeenCalled();

    // Simulate the controller calling res.json
    const responseData = { revenue: 75000 };
    res.json(responseData);

    // The overridden res.json should have called setCache
    expect(mockRedisInstance.set).toHaveBeenCalledWith(
      'analytics:/api/v1/analytics/test?period=30d',
      JSON.stringify(responseData),
      'EX',
      600
    );
  });
});
