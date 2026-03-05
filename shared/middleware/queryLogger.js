const { logger } = require('../utils/logger');

const SLOW_QUERY_THRESHOLD_MS = 200;

function queryLogger(knexInstance) {
  knexInstance.on('query-response', (response, queryObj) => {
    const duration = Date.now() - queryObj.__startTime;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow query detected', {
        sql: queryObj.sql,
        bindings: queryObj.bindings,
        duration_ms: duration,
      });
    }
  });

  knexInstance.on('query', (queryObj) => {
    queryObj.__startTime = Date.now();
  });

  return knexInstance;
}

module.exports = queryLogger;
