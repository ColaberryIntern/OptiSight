const app = require('./app');
const { logger } = require('@retail-insight/shared');

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3005;

app.listen(PORT, () => {
  logger.info(`notification_service running on port ${PORT}`);
});
