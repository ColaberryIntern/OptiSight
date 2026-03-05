const axios = require('axios');
const jwt = require('jsonwebtoken');
const { logger, config } = require('@retail-insight/shared');
const analyticsService = require('./analyticsService');
const socketManager = require('../socketManager');

const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || 'http://notification_service:3005';

let intervalId = null;

/**
 * Generate a short-lived internal service JWT for service-to-service calls.
 * @returns {string}
 */
function generateServiceToken() {
  const secret = config.jwtSecret || process.env.JWT_SECRET || 'default-dev-secret';
  return jwt.sign(
    { userId: 'system', email: 'analytics@internal', role: 'service' },
    secret,
    { expiresIn: '5m' }
  );
}

/**
 * Check for revenue anomalies and notify via notification_service + WebSocket.
 */
async function checkAndNotify() {
  try {
    logger.info({ message: 'Running anomaly check' });

    const result = await analyticsService.detectRevenueAnomalies({ period: '30d' });
    const { anomalies } = result;

    if (!anomalies || anomalies.length === 0) {
      logger.info({ message: 'No anomalies detected' });
      return { notified: false, anomalyCount: 0 };
    }

    logger.info({ message: `Anomalies detected: ${anomalies.length}` });

    const serviceToken = generateServiceToken();

    // Create a notification for each anomaly via notification_service
    for (const anomaly of anomalies) {
      const direction = anomaly.deviationPercent > 0 ? 'above' : 'below';
      const message = `Revenue anomaly on ${anomaly.date}: $${anomaly.actualRevenue} (${Math.abs(anomaly.deviationPercent)}% ${direction} expected $${anomaly.expectedRevenue}). Severity: ${anomaly.severity}`;

      try {
        await axios.post(
          `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
          {
            userId: 'system',
            type: 'anomaly',
            title: `Revenue Anomaly Detected - ${anomaly.severity.toUpperCase()}`,
            message,
            metadata: anomaly,
          },
          {
            headers: {
              Authorization: `Bearer ${serviceToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );
      } catch (notifyError) {
        logger.error({
          message: 'Failed to create notification via notification_service',
          error: notifyError.message,
          anomalyDate: anomaly.date,
        });
      }
    }

    // Emit WebSocket event to all connected clients
    try {
      socketManager.emitToAll('anomaly:detected', {
        anomalies,
        detectedAt: new Date().toISOString(),
      });
    } catch (socketError) {
      logger.error({
        message: 'Failed to emit anomaly socket event',
        error: socketError.message,
      });
    }

    return { notified: true, anomalyCount: anomalies.length };
  } catch (error) {
    logger.error({
      message: 'Anomaly check failed',
      error: error.message,
    });
    return { notified: false, anomalyCount: 0, error: error.message };
  }
}

/**
 * Start periodic anomaly checks.
 * @param {number} intervalMs - Interval in milliseconds (default: 5 minutes)
 * @returns {NodeJS.Timeout}
 */
function startSchedule(intervalMs = 5 * 60 * 1000) {
  if (intervalId) {
    clearInterval(intervalId);
  }

  logger.info({ message: `Starting anomaly check schedule: every ${intervalMs}ms` });

  // Run first check after a short delay to let services initialize
  setTimeout(() => {
    checkAndNotify().catch((err) => {
      logger.error({ message: 'Initial anomaly check failed', error: err.message });
    });
  }, 10000);

  intervalId = setInterval(() => {
    checkAndNotify().catch((err) => {
      logger.error({ message: 'Scheduled anomaly check failed', error: err.message });
    });
  }, intervalMs);

  return intervalId;
}

/**
 * Stop the anomaly check schedule.
 */
function stopSchedule() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info({ message: 'Anomaly check schedule stopped' });
  }
}

module.exports = {
  checkAndNotify,
  startSchedule,
  stopSchedule,
  generateServiceToken,
};
