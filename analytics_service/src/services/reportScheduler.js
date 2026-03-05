const { logger } = require('@retail-insight/shared');
const reportGenerator = require('./reportGenerator');

let scheduleInterval = null;

const reportScheduler = {
  /**
   * Start the weekly report schedule.
   * Default: runs every Sunday at 8:00 AM (configurable via env vars).
   */
  start() {
    const intervalMs = parseInt(process.env.REPORT_INTERVAL_MS, 10) || 7 * 24 * 60 * 60 * 1000; // 1 week default

    // For development, allow short intervals
    const effectiveInterval = process.env.NODE_ENV === 'development'
      ? Math.min(intervalMs, 60 * 60 * 1000) // Max 1 hour in dev
      : intervalMs;

    logger.info({ message: 'Report scheduler started', intervalMs: effectiveInterval });

    scheduleInterval = setInterval(async () => {
      try {
        logger.info({ message: 'Generating scheduled weekly digest' });
        await reportGenerator.generateWeeklyDigest(null); // No specific email, log-only
      } catch (err) {
        logger.error({ message: 'Scheduled report failed', error: err.message });
      }
    }, effectiveInterval);
  },

  stop() {
    if (scheduleInterval) {
      clearInterval(scheduleInterval);
      scheduleInterval = null;
      logger.info({ message: 'Report scheduler stopped' });
    }
  },
};

module.exports = reportScheduler;
