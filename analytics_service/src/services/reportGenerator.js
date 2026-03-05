const { logger } = require('@retail-insight/shared');
const analyticsService = require('./analyticsService');
const inventoryService = require('./inventoryService');
const forecastService = require('./forecastService');
const axios = require('axios');

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification_service:3005';

const reportGenerator = {
  /**
   * Generate a weekly performance digest for all users (or specific user).
   * Aggregates key metrics and sends via notification_service email.
   */
  async generateWeeklyDigest(targetEmail) {
    try {
      // Gather metrics
      const [anomalies, inventory, forecast] = await Promise.allSettled([
        analyticsService.detectRevenueAnomalies({ period: '7d' }),
        inventoryService.getInventoryOptimization(null),
        forecastService.getSalesForecast(null, 7),
      ]);

      const items = [];

      if (anomalies.status === 'fulfilled') {
        const anomalyCount = anomalies.value?.anomalies?.length || 0;
        items.push(`${anomalyCount} revenue anomal${anomalyCount === 1 ? 'y' : 'ies'} detected this week`);
      }

      if (inventory.status === 'fulfilled') {
        const reorderCount = inventory.value?.recommendations?.filter(r => r.action === 'reorder')?.length || 0;
        items.push(`${reorderCount} product${reorderCount === 1 ? '' : 's'} need reordering`);
      }

      if (forecast.status === 'fulfilled') {
        const trend = forecast.value?.trend || 'stable';
        items.push(`Sales trend: ${trend}`);
      }

      const reportData = {
        type: 'weeklyDigest',
        title: 'Weekly Performance Digest',
        message: `Performance summary for the week ending ${new Date().toLocaleDateString()}`,
        metadata: { items, email: targetEmail },
      };

      // If targetEmail provided, send direct email via notification service
      if (targetEmail) {
        try {
          await axios.post(`${NOTIFICATION_URL}/api/v1/notifications/send-email`, {
            email: targetEmail,
            ...reportData,
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          });
          logger.info({ message: 'Weekly digest sent', email: targetEmail });
        } catch (err) {
          logger.error({ message: 'Failed to send weekly digest email', error: err.message });
        }
      }

      return reportData;
    } catch (err) {
      logger.error({ message: 'Failed to generate weekly digest', error: err.message });
      throw err;
    }
  },
};

module.exports = reportGenerator;
