const EventEmitter = require('events');

// Mock the logger before requiring queryLogger
jest.mock('../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const queryLogger = require('../middleware/queryLogger');
const { logger } = require('../utils/logger');

function createMockKnex() {
  return new EventEmitter();
}

describe('queryLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log a warning for queries exceeding the slow query threshold', () => {
    const knex = createMockKnex();
    queryLogger(knex);

    const queryObj = {
      sql: 'SELECT * FROM transactions WHERE store_id = ?',
      bindings: ['store-123'],
    };

    // Simulate query start
    knex.emit('query', queryObj);

    // Simulate time passing beyond the threshold (200ms)
    queryObj.__startTime = Date.now() - 300;

    // Simulate query response
    knex.emit('query-response', [], queryObj);

    expect(logger.warn).toHaveBeenCalledWith('Slow query detected', {
      sql: queryObj.sql,
      bindings: queryObj.bindings,
      duration_ms: expect.any(Number),
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('should not log a warning for queries within the threshold', () => {
    const knex = createMockKnex();
    queryLogger(knex);

    const queryObj = {
      sql: 'SELECT * FROM users WHERE user_id = ?',
      bindings: ['user-456'],
    };

    // Simulate query start
    knex.emit('query', queryObj);

    // __startTime is set to Date.now() by the query handler,
    // and the response fires immediately, so duration is ~0ms
    knex.emit('query-response', [], queryObj);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should set __startTime on the query object when a query event fires', () => {
    const knex = createMockKnex();
    queryLogger(knex);

    const queryObj = { sql: 'SELECT 1', bindings: [] };
    const beforeTime = Date.now();

    knex.emit('query', queryObj);

    const afterTime = Date.now();

    expect(queryObj.__startTime).toBeDefined();
    expect(queryObj.__startTime).toBeGreaterThanOrEqual(beforeTime);
    expect(queryObj.__startTime).toBeLessThanOrEqual(afterTime);
  });

  it('should return the knex instance for chaining', () => {
    const knex = createMockKnex();
    const result = queryLogger(knex);

    expect(result).toBe(knex);
  });

  it('should include duration_ms greater than threshold in the log for slow queries', () => {
    const knex = createMockKnex();
    queryLogger(knex);

    const queryObj = {
      sql: 'SELECT * FROM forecast_results',
      bindings: [],
    };

    // Simulate query start
    knex.emit('query', queryObj);

    // Force __startTime to be 500ms ago
    queryObj.__startTime = Date.now() - 500;

    knex.emit('query-response', [], queryObj);

    const logCall = logger.warn.mock.calls[0];
    expect(logCall[1].duration_ms).toBeGreaterThan(200);
  });
});
