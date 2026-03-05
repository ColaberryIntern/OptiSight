const app = require('./app');
const { logger } = require('@retail-insight/shared');

const PORT = process.env.DATA_INGESTION_SERVICE_PORT || 3002;

app.listen(PORT, () => {
  logger.info(`data_ingestion_service running on port ${PORT}`);
});
