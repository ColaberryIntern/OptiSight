const app = require('./app');
const { logger } = require('@retail-insight/shared');

const PORT = process.env.RECOMMENDATION_SERVICE_PORT || 3004;

app.listen(PORT, () => {
  logger.info(`recommendation_service running on port ${PORT}`);
});
